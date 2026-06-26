import { Request, Response } from 'express';
import { dbStore } from '../services/dbStore';
import { IAuthRequest } from '../middleware/auth';
import crypto from 'crypto';
import { createRazorpayOrder, getRazorpayKeyId, buildRazorpayReceipt } from '../services/razorpayClient';
import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType 
} from 'docx';

// Helper to generate unique ID
function generatePaymentId(): string {
  return 'PAY-' + Math.random().toString(36).substring(2, 9).toUpperCase();
}

// Helper to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Fetch all transactions for authenticated user
export async function getTransactions(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const userId = authReq.user!.id;
    const userRole = authReq.user!.role;

    let filter = {};
    if (userRole === 'buyer') {
      filter = { buyerId: userId };
    } else if (userRole === 'owner') {
      filter = { ownerId: userId };
    } else if (userRole === 'admin') {
      filter = {};
    }

    const transactions = await dbStore.transactions.find(filter);

    // Enrich with Patent and User info
    const enriched = [];
    for (const t of transactions) {
      const patent = await dbStore.patents.findById(t.patentId);
      const buyer = await dbStore.users.findById(t.buyerId);
      const owner = await dbStore.users.findById(t.ownerId);

      enriched.push({
        ...t,
        patentTitle: patent ? patent.title : 'Deleted Patent',
        patentNumber: patent ? patent.patentNumber : 'N/A',
        buyerName: buyer ? buyer.name : 'Unknown Buyer',
        buyerOrg: buyer?.organization || 'Independent Acquirer',
        ownerName: owner ? owner.name : 'Unknown Owner',
        ownerOrg: owner?.organization || 'Independent Inventor'
      });
    }

    return res.json(enriched);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to retrieve transactions.', error: error.message });
  }
}

// Helper: Auto-create Transaction when an offer is accepted
export async function createEscrowTransaction(offer: any) {
  // Construct milestones
  const milestones = offer.milestones && offer.milestones.length > 0
    ? offer.milestones.map((desc: string) => ({
        description: desc,
        percentage: Math.round(100 / offer.milestones.length),
        amount: Math.round(offer.price / offer.milestones.length),
        status: 'pending' as const
      }))
    : [
        { description: 'Initial Escrow Deposit & Deed Verification', percentage: 25, amount: Math.round(offer.price * 0.25), status: 'pending' as const },
        { description: 'IP Transfer Execution Signatures', percentage: 50, amount: Math.round(offer.price * 0.50), status: 'pending' as const },
        { description: 'Final Indian Patent Office Registry Update', percentage: 25, amount: Math.round(offer.price * 0.25), status: 'pending' as const }
      ];

  const amount = offer.price;
  const commissionAmount = Math.round(amount * 0.05); // 5% success fee
  const netPayout = amount - commissionAmount;

  const transaction = await dbStore.transactions.create({
    offerId: offer._id,
    patentId: offer.patentId,
    buyerId: offer.buyerId,
    ownerId: offer.ownerId,
    amount,
    commissionAmount,
    netPayout,
    status: 'escrow_pending',
    milestones
  });

  return transaction;
}

// Fund the Escrow (Buyer checkout checkout simulation)
export async function fundTransaction(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { id } = req.params;
    const buyerId = authReq.user!.id;

    const transaction = await dbStore.transactions.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Escrow transaction record not found.' });
    }

    if (String(transaction.buyerId) !== String(buyerId) && authReq.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized. You are not the buyer in this transaction.' });
    }

    if (transaction.status !== 'escrow_pending') {
      return res.status(400).json({ message: `Transaction cannot be funded. Current status: ${transaction.status}` });
    }

    const paymentId = generatePaymentId();
    const updated = await dbStore.transactions.update(id, {
      status: 'escrow_funded',
      paymentId
    });

    const patent = await dbStore.patents.findById(transaction.patentId);

    // Log security audits
    await dbStore.auditLogs.create({
      userId: buyerId,
      action: 'ESCROW_FUNDED',
      details: `Buyer ${authReq.user!.name} funded escrow account for patent ${patent?.patentNumber || 'N/A'} (Offer: ${formatCurrency(transaction.amount)}). Payment Ref: ${paymentId}`
    });

    return res.json({
      message: 'Escrow funded successfully via simulated payment gateway.',
      transaction: updated
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to process escrow funding.', error: error.message });
  }
}

// Create Razorpay Order for Escrow Funding
export async function createRazorpayOrder(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { id } = req.params;
    const buyerId = authReq.user!.id;

    const transaction = await dbStore.transactions.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Escrow transaction record not found.' });
    }

    if (String(transaction.buyerId) !== String(buyerId) && authReq.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    if (transaction.status !== 'escrow_pending') {
      return res.status(400).json({ message: 'Transaction is already funded or completed.' });
    }

    // Create Order with Razorpay (Amount in paisa)
    const amountInPaisa = transaction.amount * 100;

    const options = {
      amount: amountInPaisa,
      currency: 'INR',
      receipt: buildRazorpayReceipt(String(transaction._id)),
      payment_capture: 1
    };

    const order = await createRazorpayOrder(options);

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getRazorpayKeyId()
    });

  } catch (error: any) {
    const detail =
      error?.response?.data?.error?.description ||
      error?.response?.data?.error?.reason ||
      error?.message ||
      'Unknown Razorpay error';
    const isNetwork =
      detail.includes("reading 'status'") ||
      error?.code === 'ENOTFOUND' ||
      error?.code === 'EAI_AGAIN' ||
      error?.code === 'ECONNREFUSED' ||
      error?.code === 'ETIMEDOUT';

    return res.status(500).json({
      message: isNetwork
        ? 'Cannot reach Razorpay API. Check your internet connection, DNS, or firewall (api.razorpay.com must be accessible).'
        : 'Failed to create Razorpay order.',
      error: detail
    });
  }
}

// Verify Razorpay Payment Signature and Fund Escrow
export async function verifyRazorpayPayment(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { id } = req.params;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const buyerId = authReq.user!.id;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment signature verification fields.' });
    }

    const transaction = await dbStore.transactions.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Escrow transaction record not found.' });
    }

    if (String(transaction.buyerId) !== String(buyerId) && authReq.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    // Verify signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '2w4vrpAImNMnt0lUmGY78Apm';
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed. Invalid signature match.' });
    }

    // Signature is valid! Update status and transaction payment reference
    const updated = await dbStore.transactions.update(id, {
      status: 'escrow_funded',
      paymentId: razorpay_payment_id
    });

    const patent = await dbStore.patents.findById(transaction.patentId);

    // Write audit log
    await dbStore.auditLogs.create({
      userId: buyerId,
      action: 'ESCROW_FUNDED',
      details: `Buyer ${authReq.user!.name} funded escrow account securely via Razorpay for patent ${patent?.patentNumber || 'N/A'} (Reference: ${razorpay_payment_id}). Order Ref: ${razorpay_order_id}`
    });

    return res.json({
      message: 'Razorpay payment verified & escrow vault successfully funded.',
      transaction: updated
    });

  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to verify Razorpay signature.', error: error.message });
  }
}

// Release Funds for a Specific Milestone (Platform admin custodian only)
export async function releaseMilestone(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { id, index } = req.params;
    const actorId = authReq.user!.id;
    const idx = parseInt(index, 10);

    const transaction = await dbStore.transactions.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Escrow transaction record not found.' });
    }

    if (authReq.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Only the PatentBridge escrow custodian (admin) can release milestone payouts.' });
    }

    if (transaction.status !== 'escrow_funded') {
      return res.status(400).json({ message: 'Funds can only be released on fully funded escrow vaults.' });
    }

    if (idx < 0 || idx >= transaction.milestones.length) {
      return res.status(400).json({ message: 'Invalid milestone index.' });
    }

    if (transaction.milestones[idx].status === 'released') {
      return res.status(400).json({ message: 'Milestone funds have already been released.' });
    }

    // Update milestones
    const updatedMilestones = [...transaction.milestones];
    updatedMilestones[idx] = {
      ...updatedMilestones[idx],
      status: 'released',
      releasedAt: new Date()
    };

    // Check if all are released now
    const allReleased = updatedMilestones.every(m => m.status === 'released');
    const status = allReleased ? 'completed' : 'escrow_funded';

    const updated = await dbStore.transactions.update(id, {
      status,
      milestones: updatedMilestones
    });

    const patent = await dbStore.patents.findById(transaction.patentId);

    // Create audit log
    await dbStore.auditLogs.create({
      userId: actorId,
      action: allReleased ? 'TRANSACTION_COMPLETED' : 'MILESTONE_RELEASED',
      details: allReleased 
        ? `Transaction completed. All milestone payouts released for patent ${patent?.patentNumber || 'N/A'}.`
        : `Escrow custodian released milestone ${idx + 1} payout (${formatCurrency(transaction.milestones[idx].amount)}) for patent ${patent?.patentNumber || 'N/A'}.`
    });

    return res.json({
      message: allReleased 
        ? 'Final milestone released. Deal completed successfully.'
        : `Milestone ${idx + 1} funds released to inventor.`,
      transaction: updated
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to release milestone funds.', error: error.message });
  }
}

// Download final IP Assignment Deed as .docx Word document
export async function downloadDeedDocx(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { id } = req.params;
    const userId = authReq.user!.id;
    const userRole = authReq.user!.role;

    const transaction = await dbStore.transactions.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Escrow transaction record not found.' });
    }

    // Security check: Only buyer, owner, or admin can download
    if (String(transaction.buyerId) !== String(userId) && String(transaction.ownerId) !== String(userId) && userRole !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access to assignment deed.' });
    }

    if (transaction.status !== 'completed' && userRole !== 'admin') {
      return res.status(400).json({ message: 'Deed is only generated upon successful transaction completion.' });
    }

    const patent = await dbStore.patents.findById(transaction.patentId);
    if (!patent) {
      return res.status(404).json({ message: 'Patent not found.' });
    }

    const owner = await dbStore.users.findById(transaction.ownerId);
    const buyer = await dbStore.users.findById(transaction.buyerId);

    const ownerName = owner ? owner.name : 'Inventor Owner';
    const ownerOrg = owner?.organization || 'Independent Inventor';
    const buyerName = buyer ? buyer.name : 'Acquirer Buyer';
    const buyerOrg = buyer?.organization || 'Independent Acquirer';

    const completedDate = transaction.updatedAt || new Date();
    const dateStr = new Date(completedDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
    const tableBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

    // Compile the assignment deed word document
    const doc = new Document({
      sections: [{
        children: [
          // Letterhead title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "PATENTBRIDGE IP ASSIGNMENT DEED",
                bold: true,
                size: 20,
                font: "Times New Roman",
                color: "555555"
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 360 },
            children: [
              new TextRun({
                text: "__________________________________________________________________",
                color: "CCCCCC"
              })
            ]
          }),

          // Deed Title
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 240 },
            children: [
              new TextRun({
                text: "DEED OF PATENT ASSIGNMENT & TRANSFER",
                bold: true,
                size: 28,
                font: "Times New Roman",
                color: "1F3864"
              })
            ]
          }),

          // Preamble
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 120, after: 120, line: 360 },
            children: [
              new TextRun({
                text: `This Deed of Patent Assignment (the "Deed") is executed on this ${dateStr} at the PatentBridge online repository portal, by and between:`,
                font: "Times New Roman",
                size: 24
              })
            ]
          }),

          // Parties
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 120, after: 60, line: 360 },
            indent: { left: 720 },
            children: [
              new TextRun({
                text: "THE ASSIGNOR: ",
                bold: true,
                font: "Times New Roman",
                size: 24
              }),
              new TextRun({
                text: `${ownerName}, affiliated with ${ownerOrg} (hereinafter referred to as the "Assignor", which expression shall include legal heirs and successors).`,
                font: "Times New Roman",
                size: 24
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 60, after: 120, line: 360 },
            indent: { left: 720 },
            children: [
              new TextRun({
                text: "THE ASSIGNEE: ",
                bold: true,
                font: "Times New Roman",
                size: 24
              }),
              new TextRun({
                text: `${buyerName}, representing ${buyerOrg} (hereinafter referred to as the "Assignee", which expression shall include corporate successors and assignees).`,
                font: "Times New Roman",
                size: 24
              })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 120, after: 120, line: 360 },
            children: [
              new TextRun({
                text: "WHEREAS, the Assignor is the absolute owner of the intellectual property, namely Indian Patent Application/Grant Number: ",
                font: "Times New Roman",
                size: 24
              }),
              new TextRun({
                text: patent.patentNumber,
                bold: true,
                font: "Times New Roman",
                size: 24
              }),
              new TextRun({
                text: `, titled "`,
                font: "Times New Roman",
                size: 24
              }),
              new TextRun({
                text: patent.title,
                italics: true,
                bold: true,
                font: "Times New Roman",
                size: 24
              }),
              new TextRun({
                text: `" (the "Patent Rights"); and`,
                font: "Times New Roman",
                size: 24
              })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 120, after: 120, line: 360 },
            children: [
              new TextRun({
                text: `WHEREAS, the Assignee has agreed to acquire full right, title, and interest in the Patent Rights for a total consideration of `,
                font: "Times New Roman",
                size: 24
              }),
              new TextRun({
                text: `${formatCurrency(transaction.amount)}`,
                bold: true,
                font: "Times New Roman",
                size: 24
              }),
              new TextRun({
                text: `, and the Assignee has deposited the funds in the PatentBridge platform Escrow Vault, which have been successfully released in full to the Assignor according to the scheduled milestones;`,
                font: "Times New Roman",
                size: 24
              })
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 120, after: 120, line: 360 },
            children: [
              new TextRun({
                text: "NOW, THEREFORE, THIS DEED WITNESSETH AS FOLLOWS:",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),

          // Clauses
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 60 },
            children: [
              new TextRun({
                text: "1. Assignment and Transfer",
                bold: true,
                font: "Times New Roman",
                size: 24,
                color: "1F3864"
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 60, after: 120, line: 360 },
            children: [
              new TextRun({
                text: `The Assignor hereby sells, assigns, and transfers unto the Assignee the entire right, title, and interest in and to Indian Patent Number ${patent.patentNumber}, including all associated claims, priorities, licensing rights, and the right to sue for past infringements. The transfer shall be effective globally from the date of completion.`,
                font: "Times New Roman",
                size: 24
              })
            ]
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 60 },
            children: [
              new TextRun({
                text: "2. Escrow Settlement and Consideration Receipt",
                bold: true,
                font: "Times New Roman",
                size: 24,
                color: "1F3864"
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 60, after: 120, line: 360 },
            children: [
              new TextRun({
                text: `The Assignor acknowledges receipt of the consideration amount of ${formatCurrency(transaction.amount)} (minus platform commission fees) via the secure milestone releases of Escrow Transaction ID: ${transaction.paymentId || 'N/A'}. The Assignor declares that they no longer have any claim over the Patent Rights.`,
                font: "Times New Roman",
                size: 24
              })
            ]
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 60 },
            children: [
              new TextRun({
                text: "3. Legal Execution & Signatures",
                bold: true,
                font: "Times New Roman",
                size: 24,
                color: "1F3864"
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 60, after: 240, line: 360 },
            children: [
              new TextRun({
                text: "This Deed is executed electronically via the PatentBridge platform, utilizing e-signing workflows and secure vault allocations, which is fully valid and admissible in a court of law under Section 4 of the Indian Information Technology Act, 2000.",
                font: "Times New Roman",
                size: 24
              })
            ]
          }),

          // Signatures Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: tableBorders,
                    shading: { fill: "F5F5F5" },
                    children: [
                      new Paragraph({
                        spacing: { before: 60, after: 60 },
                        children: [new TextRun({ text: "THE ASSIGNOR (INVENTOR)", bold: true, font: "Times New Roman", size: 20, color: "1F3864" })]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: tableBorders,
                    shading: { fill: "F5F5F5" },
                    children: [
                      new Paragraph({
                        spacing: { before: 60, after: 60 },
                        children: [new TextRun({ text: "THE ASSIGNEE (BUYER)", bold: true, font: "Times New Roman", size: 20, color: "1F3864" })]
                      })
                    ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: tableBorders,
                    children: [
                      new Paragraph({
                        spacing: { before: 120, after: 60 },
                        children: [new TextRun({ text: `Organization: ${ownerOrg}`, font: "Times New Roman", size: 22 })]
                      }),
                      new Paragraph({
                        spacing: { before: 60, after: 60 },
                        children: [new TextRun({ text: `Name: ${ownerName}`, font: "Times New Roman", size: 22 })]
                      }),
                      new Paragraph({
                        spacing: { before: 60, after: 60 },
                        children: [
                          new TextRun({ text: "Signature: ", font: "Times New Roman", size: 22 }),
                          new TextRun({ text: `/${ownerName.replace(/\s+/g, '')}/`, italics: true, bold: true, color: "1F3864" })
                        ]
                      }),
                      new Paragraph({
                        spacing: { before: 60, after: 120 },
                        children: [new TextRun({ text: "eSign Status: Verified by platform", font: "Times New Roman", size: 18, color: "2E7D32", bold: true })]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: tableBorders,
                    children: [
                      new Paragraph({
                        spacing: { before: 120, after: 60 },
                        children: [new TextRun({ text: `Organization: ${buyerOrg}`, font: "Times New Roman", size: 22 })]
                      }),
                      new Paragraph({
                        spacing: { before: 60, after: 60 },
                        children: [new TextRun({ text: `Name: ${buyerName}`, font: "Times New Roman", size: 22 })]
                      }),
                      new Paragraph({
                        spacing: { before: 60, after: 60 },
                        children: [
                          new TextRun({ text: "Signature: ", font: "Times New Roman", size: 22 }),
                          new TextRun({ text: `/${buyerName.replace(/\s+/g, '')}/`, italics: true, bold: true, color: "1F3864" })
                        ]
                      }),
                      new Paragraph({
                        spacing: { before: 60, after: 120 },
                        children: [new TextRun({ text: "eSign Status: Verified by platform", font: "Times New Roman", size: 18, color: "2E7D32", bold: true })]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          // Footer Notice
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 360 },
            children: [
              new TextRun({
                text: "This document is electronically managed and secured by PatentBridge.",
                font: "Times New Roman",
                size: 18,
                color: "999999",
                italics: true
              })
            ]
          })
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=Deed_Assignment_${patent.patentNumber}.docx`);
    res.send(buffer);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to generate Assignment Deed document.', error: error.message });
  }
}
