import { Request, Response } from 'express';
import { dbStore } from '../services/dbStore';
import { IAuthRequest } from '../middleware/auth';

// Create Interest Request (Buyer only)
export async function createInterestRequest(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { id: patentId } = req.params;
    const { name, organization, email, purpose, message } = req.body;

    if (!name || !organization || !email || !purpose || !message) {
      return res.status(400).json({ message: 'Missing required interest request details.' });
    }

    const patent = await dbStore.patents.findById(patentId);
    if (!patent) {
      return res.status(404).json({ message: 'Patent not found.' });
    }

    const buyerId = authReq.user!.id;

    const existingInterests = await dbStore.interestRequests.find({ patentId, buyerId });
    let lead = existingInterests[0];
    if (!lead) {
      lead = await dbStore.interestRequests.create({
        patentId,
        buyerId,
        ownerId: patent.ownerId,
        name,
        organization,
        email,
        purpose,
        message,
        status: 'new'
      });
    }

    let accessRequest = await dbStore.accessRequests.findOne({ patentId, buyerId });
    if (!accessRequest) {
      accessRequest = await dbStore.accessRequests.create({
        patentId,
        buyerId,
        ownerId: patent.ownerId,
        status: 'pending'
      });

      await dbStore.auditLogs.create({
        userId: buyerId,
        action: 'ACCESS_REQUESTED',
        details: `Buyer ${authReq.user!.name} requested access to patent ${patent.patentNumber} (${patent.title}).`
      });
    }

    return res.status(201).json({
      message: 'Interest submitted and unlock request sent to the inventor.',
      lead,
      accessRequest
    });

  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to submit interest request.', error: error.message });
  }
}

// Create Meeting Request (Buyer only)
export async function createMeetingRequest(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { id: patentId } = req.params;
    const { preferredDate, preferredTime, notes } = req.body;

    if (!preferredDate || !preferredTime) {
      return res.status(400).json({ message: 'Preferred date and time are required.' });
    }

    const patent = await dbStore.patents.findById(patentId);
    if (!patent) {
      return res.status(404).json({ message: 'Patent not found.' });
    }

    // Ensure access request is approved
    const accessReq = await dbStore.accessRequests.findOne({ patentId, buyerId: authReq.user!.id });
    if ((!accessReq || accessReq.status !== 'approved') && authReq.user!.role !== 'admin' && patent.ownerId !== authReq.user!.id) {
      return res.status(403).json({ message: 'You must have approved detailed access to book a meeting.' });
    }

    const meeting = await dbStore.meetingRequests.create({
      patentId,
      buyerId: authReq.user!.id,
      ownerId: patent.ownerId,
      preferredDate,
      preferredTime,
      notes,
      status: 'pending'
    });

    return res.status(201).json({
      message: 'Meeting request scheduled successfully.',
      meeting
    });

  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to request meeting.', error: error.message });
  }
}

// Fetch Leads (Interest Requests)
export async function getLeads(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { role, id: userId } = authReq.user!;
    
    let filter = {};
    if (role === 'owner') {
      filter = { ownerId: userId };
    } else if (role === 'buyer') {
      filter = { buyerId: userId };
    } else if (role === 'admin') {
      // Admins see everything
      filter = {};
    }

    const leads = await dbStore.interestRequests.find(filter);
    
    // Enrich with Patent title
    const enriched = [];
    for (const l of leads) {
      const p = await dbStore.patents.findById(l.patentId);
      enriched.push({
        ...l,
        patentTitle: p ? p.title : 'Deleted Patent',
        patentNumber: p ? p.patentNumber : 'N/A'
      });
    }

    return res.json(enriched);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to retrieve interest requests.', error: error.message });
  }
}

// Fetch Meetings
export async function getMeetings(req: Request, res: Response) {
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

    const meetings = await dbStore.meetingRequests.find(filter);

    // Enrich with Patent title and counter-party information
    const enriched = [];
    for (const m of meetings) {
      const p = await dbStore.patents.findById(m.patentId);
      
      let counterParty = '';
      if (role === 'owner') {
        const buyer = await dbStore.users.findById(m.buyerId);
        counterParty = buyer ? `${buyer.name} (${buyer.organization || 'Independent'})` : 'Buyer';
      } else {
        const owner = await dbStore.users.findById(m.ownerId);
        counterParty = owner ? `${owner.name} (${owner.organization || 'Independent'})` : 'Inventor';
      }

      enriched.push({
        ...m,
        patentTitle: p ? p.title : 'Deleted Patent',
        patentNumber: p ? p.patentNumber : 'N/A',
        counterParty
      });
    }

    return res.json(enriched);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to retrieve meeting requests.', error: error.message });
  }
}

// Update Interest Request Status (Owner only)
export async function updateLeadStatus(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { id } = req.params;
    const { status } = req.body; // 'new' | 'reviewed' | 'contacted'

    if (!['new', 'reviewed', 'contacted'].includes(status)) {
      return res.status(400).json({ message: 'Invalid lead status.' });
    }

    const lead = await dbStore.interestRequests.findById(id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead request not found.' });
    }

    // Security check: Make sure this owner is the recipient
    if (lead.ownerId !== authReq.user!.id && authReq.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized. You do not own this lead.' });
    }

    const updated = await dbStore.interestRequests.update(id, { status });

    return res.json({
      message: `Lead status updated to ${status}.`,
      lead: updated
    });

  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update lead status.', error: error.message });
  }
}

// Update Meeting Request Status (Owner only)
export async function updateMeetingStatus(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { id } = req.params;
    const { status } = req.body; // 'pending' | 'accepted' | 'declined'

    if (!['pending', 'accepted', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Invalid meeting status.' });
    }

    const meeting = await dbStore.meetingRequests.findById(id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting request not found.' });
    }

    // Security check: Make sure this owner is the recipient
    if (meeting.ownerId !== authReq.user!.id && authReq.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized. You are not the requested organizer.' });
    }

    const updateData: any = { status };
    if (status === 'accepted') {
      // Generate unique Jitsi video link
      updateData.videoCallLink = `https://meet.jit.si/PatentBridge-Meeting-${id}`;
    }

    const updated = await dbStore.meetingRequests.update(id, updateData);

    // Create audit log
    await dbStore.auditLogs.create({
      userId: authReq.user!.id,
      action: 'MEETING_STATUS_UPDATE',
      details: `Meeting request ${id} updated to ${status}. ${status === 'accepted' ? 'Virtual Jitsi room generated.' : ''}`
    });

    return res.json({
      message: `Meeting request ${status}.`,
      meeting: updated
    });

  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update meeting status.', error: error.message });
  }
}

// Create Access Request (Buyer only)
export async function createAccessRequest(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { id: patentId } = req.params;
    const buyerId = authReq.user!.id;

    // Check if patent exists
    const patent = await dbStore.patents.findById(patentId);
    if (!patent) {
      return res.status(404).json({ message: 'Patent not found.' });
    }

    // Ensure interest has been expressed (unless admin — interest+access are submitted together)
    const interests = await dbStore.interestRequests.find({ patentId, buyerId });
    if (interests.length === 0 && authReq.user!.role !== 'admin') {
      return res.status(400).json({ message: 'Express interest first to request patent access.' });
    }

    // Check if already requested
    const existing = await dbStore.accessRequests.findOne({ patentId, buyerId });
    if (existing) {
      return res.status(200).json({ message: 'Access request already submitted.', request: existing });
    }

    const request = await dbStore.accessRequests.create({
      patentId,
      buyerId,
      ownerId: patent.ownerId,
      status: 'pending'
    });

    // Create audit log
    await dbStore.auditLogs.create({
      userId: buyerId,
      action: 'ACCESS_REQUESTED',
      details: `Buyer ${authReq.user!.name} requested access to patent ${patent.patentNumber} (${patent.title}).`
    });

    return res.status(201).json({
      message: 'Access request submitted successfully to the inventor.',
      request
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to request access.', error: error.message });
  }
}

// Check Access Status for a patent
export async function getAccessStatus(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { id: patentId } = req.params;
    const buyerId = authReq.user?.id;

    if (!buyerId) {
      return res.json({ status: 'none' });
    }

    // Check if patent exists
    const patent = await dbStore.patents.findById(patentId);
    if (!patent) {
      return res.status(404).json({ message: 'Patent not found.' });
    }

    // Inventor and Admin have full access automatically
    if (patent.ownerId === buyerId || authReq.user?.role === 'admin') {
      return res.json({ status: 'approved' });
    }

    const request = await dbStore.accessRequests.findOne({ patentId, buyerId });
    return res.json({ status: request ? request.status : 'none', requestDate: request ? request.createdAt : null });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to verify access status.', error: error.message });
  }
}

// Fetch Access Requests (Owner & Admin)
export async function getAccessRequests(req: Request, res: Response) {
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

    const requests = await dbStore.accessRequests.find(filter);

    // Enrich with Patent and Buyer details
    const enriched = [];
    for (const r of requests) {
      const p = await dbStore.patents.findById(r.patentId);
      const buyer = await dbStore.users.findById(r.buyerId);
      enriched.push({
        ...r,
        patentTitle: p ? p.title : 'Deleted Patent',
        patentNumber: p ? p.patentNumber : 'N/A',
        buyerName: buyer ? buyer.name : 'Unknown Buyer',
        buyerEmail: buyer ? buyer.email : 'N/A',
        buyerOrganization: buyer?.organization || 'Independent'
      });
    }

    return res.json(enriched);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to retrieve access requests.', error: error.message });
  }
}

// Update Access Request Status (Owner only)
export async function updateAccessRequestStatus(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { id } = req.params;
    const { status } = req.body; // 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid access request status.' });
    }

    const request = await dbStore.accessRequests.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Access request not found.' });
    }

    // Security check: Make sure this owner is the recipient
    if (request.ownerId !== authReq.user!.id && authReq.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized. You do not own this patent.' });
    }

    const updated = await dbStore.accessRequests.update(id, { status });

    // Create audit log
    await dbStore.auditLogs.create({
      userId: authReq.user!.id,
      action: `ACCESS_REQUEST_${status.toUpperCase()}`,
      details: `Inventor ${authReq.user!.name} ${status} access request for patent ${request.patentId} by buyer ${request.buyerId}.`
    });

    return res.json({
      message: `Access request status updated to ${status}.`,
      request: updated
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update access request status.', error: error.message });
  }
}
