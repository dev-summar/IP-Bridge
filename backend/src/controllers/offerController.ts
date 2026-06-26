import { Request, Response } from 'express';
import { dbStore } from '../services/dbStore';
import { IAuthRequest } from '../middleware/auth';
import { createEscrowTransaction } from './transactionController';

// Create Offer (Buyer only)
export async function createOffer(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { patentId, price, type, notes, milestones } = req.body;

    if (!patentId || !price || !type) {
      return res.status(400).json({ message: 'Patent ID, price, and offer type are required.' });
    }

    if (!['sale', 'license'].includes(type)) {
      return res.status(400).json({ message: 'Offer type must be sale or license.' });
    }

    const patent = await dbStore.patents.findById(patentId);
    if (!patent) {
      return res.status(404).json({ message: 'Patent not found.' });
    }

    // Prevent buyers making offers to their own patents
    if (patent.ownerId === authReq.user!.id) {
      return res.status(400).json({ message: 'You cannot make an offer on your own patent.' });
    }

    // Ensure buyer has scheduled and completed (accepted) a meeting
    const meetings = await dbStore.meetingRequests.find({ patentId, buyerId: authReq.user!.id, status: 'accepted' });
    if (meetings.length === 0 && authReq.user!.role !== 'admin') {
      return res.status(400).json({ message: 'You must have an accepted/completed meeting request before you can acquire or license this patent.' });
    }

    const offer = await dbStore.offers.create({
      patentId,
      buyerId: authReq.user!.id,
      ownerId: patent.ownerId,
      price: Number(price),
      type,
      notes,
      milestones: Array.isArray(milestones) ? milestones : [],
      status: 'pending'
    });

    // Write audit log
    await dbStore.auditLogs.create({
      userId: authReq.user!.id,
      action: 'OFFER_CREATION',
      details: `Created pending offer of ₹${Number(price).toLocaleString()} on patent ${patent.patentNumber}`
    });

    return res.status(201).json({
      message: 'Offer submitted successfully.',
      offer
    });

  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create offer.', error: error.message });
  }
}

// Fetch Offers
export async function getOffers(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { role, id: userId } = authReq.user!;

    let filter = {};
    if (role === 'owner') {
      filter = { ownerId: userId };
    } else if (role === 'buyer') {
      filter = { buyerId: userId };
    } else if (role === 'admin') {
      filter = {};
    }

    const offers = await dbStore.offers.find(filter);

    // Enrich offers with patent metadata and counter-party information
    const enriched = [];
    for (const o of offers) {
      const p = await dbStore.patents.findById(o.patentId);
      
      let counterParty = '';
      if (role === 'owner') {
        const buyer = await dbStore.users.findById(o.buyerId);
        counterParty = buyer ? `${buyer.name} (${buyer.organization || 'Independent'})` : 'Buyer';
      } else {
        const owner = await dbStore.users.findById(o.ownerId);
        counterParty = owner ? `${owner.name} (${owner.organization || 'Independent'})` : 'Inventor';
      }

      enriched.push({
        ...o,
        patentTitle: p ? p.title : 'Deleted Patent',
        patentNumber: p ? p.patentNumber : 'N/A',
        counterParty
      });
    }

    return res.json(enriched);

  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to retrieve offers.', error: error.message });
  }
}

// Update Offer Status (Accept, Decline, Counter)
export async function updateOfferStatus(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { id } = req.params;
    const { status, counterPrice } = req.body; // 'accepted' | 'declined' | 'countered'

    if (!['accepted', 'declined', 'countered'].includes(status)) {
      return res.status(400).json({ message: 'Invalid offer status.' });
    }

    const offer = await dbStore.offers.findById(id);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found.' });
    }

    const patent = await dbStore.patents.findById(offer.patentId);

    // Authorization & Flow logic:
    // If status is 'countered', it must be the owner counter-offering to the buyer.
    if (status === 'countered') {
      if (authReq.user!.id !== offer.ownerId && authReq.user!.role !== 'admin') {
        return res.status(403).json({ message: 'Only the patent owner can make a counter-offer.' });
      }
      if (!counterPrice) {
        return res.status(400).json({ message: 'Counter price is required.' });
      }
    }

    // If accepting/declining:
    if (status === 'accepted' || status === 'declined') {
      // If the current status is 'countered', the buyer must accept/decline.
      if (offer.status === 'countered') {
        if (authReq.user!.id !== offer.buyerId && authReq.user!.role !== 'admin') {
          return res.status(403).json({ message: 'Only the buyer can accept or decline a counter-offer.' });
        }
      } else {
        // Otherwise, it was 'pending' and the owner must accept/decline.
        if (authReq.user!.id !== offer.ownerId && authReq.user!.role !== 'admin') {
          return res.status(403).json({ message: 'Only the patent owner can accept or decline this offer.' });
        }
      }
    }

    const updateData: any = { status };
    if (status === 'countered') {
      updateData.counterPrice = Number(counterPrice);
    } else if (status === 'accepted' && offer.status === 'countered') {
      updateData.price = offer.counterPrice;
    }

    const updated = await dbStore.offers.update(id, updateData);

    // Create escrow transaction if offer is accepted
    if (status === 'accepted') {
      await createEscrowTransaction(updated);
    }

    // Log the change
    let logDetails = `Offer ID ${id} status updated to ${status}`;
    if (status === 'countered') logDetails += ` with counter price of ₹${Number(counterPrice).toLocaleString()}`;
    if (patent) logDetails += ` on patent ${patent.patentNumber}`;

    await dbStore.auditLogs.create({
      userId: authReq.user!.id,
      action: `OFFER_STATUS_${status.toUpperCase()}`,
      details: logDetails
    });

    return res.json({
      message: `Offer ${status} successfully.`,
      offer: updated
    });

  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update offer status.', error: error.message });
  }
}
