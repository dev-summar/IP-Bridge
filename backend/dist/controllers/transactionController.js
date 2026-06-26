"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactions = getTransactions;
exports.createEscrowTransaction = createEscrowTransaction;
exports.fundTransaction = fundTransaction;
exports.createRazorpayOrder = createRazorpayOrder;
exports.verifyRazorpayPayment = verifyRazorpayPayment;
exports.releaseMilestone = releaseMilestone;
exports.downloadDeedDocx = downloadDeedDocx;
const dbStore_1 = require("../services/dbStore");
const crypto_1 = __importDefault(require("crypto"));
// @ts-ignore
const razorpay_1 = __importDefault(require("razorpay"));
let razorpayInstance = null;
function getRazorpay() {
    if (!razorpayInstance) {
        razorpayInstance = new razorpay_1.default({
            key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_T1ox9Zd2QpcO6M',
            key_secret: process.env.RAZORPAY_KEY_SECRET || '2w4vrpAImNMnt0lUmGY78Apm'
        });
    }
    return razorpayInstance;
}
const docx_1 = require("docx");
// Helper to generate unique ID
function generatePaymentId() {
    return 'PAY-' + Math.random().toString(36).substring(2, 9).toUpperCase();
}
// Helper to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}
// Fetch all transactions for authenticated user
async function getTransactions(req, res) {
    try {
        const authReq = req;
        const userId = authReq.user.id;
        const userRole = authReq.user.role;
        let filter = {};
        if (userRole === 'buyer') {
            filter = { buyerId: userId };
        }
        else if (userRole === 'owner') {
            filter = { ownerId: userId };
        }
        else if (userRole === 'admin') {
            filter = {};
        }
        const transactions = await dbStore_1.dbStore.transactions.find(filter);
        // Enrich with Patent and User info
        const enriched = [];
        for (const t of transactions) {
            const patent = await dbStore_1.dbStore.patents.findById(t.patentId);
            const buyer = await dbStore_1.dbStore.users.findById(t.buyerId);
            const owner = await dbStore_1.dbStore.users.findById(t.ownerId);
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
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to retrieve transactions.', error: error.message });
    }
}
// Helper: Auto-create Transaction when an offer is accepted
async function createEscrowTransaction(offer) {
    // Construct milestones
    const milestones = offer.milestones && offer.milestones.length > 0
        ? offer.milestones.map((desc) => ({
            description: desc,
            percentage: Math.round(100 / offer.milestones.length),
            amount: Math.round(offer.price / offer.milestones.length),
            status: 'pending'
        }))
        : [
            { description: 'Initial Escrow Deposit & Deed Verification', percentage: 25, amount: Math.round(offer.price * 0.25), status: 'pending' },
            { description: 'IP Transfer Execution Signatures', percentage: 50, amount: Math.round(offer.price * 0.50), status: 'pending' },
            { description: 'Final Indian Patent Office Registry Update', percentage: 25, amount: Math.round(offer.price * 0.25), status: 'pending' }
        ];
    const amount = offer.price;
    const commissionAmount = Math.round(amount * 0.05); // 5% success fee
    const netPayout = amount - commissionAmount;
    const transaction = await dbStore_1.dbStore.transactions.create({
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
async function fundTransaction(req, res) {
    try {
        const authReq = req;
        const { id } = req.params;
        const buyerId = authReq.user.id;
        const transaction = await dbStore_1.dbStore.transactions.findById(id);
        if (!transaction) {
            return res.status(404).json({ message: 'Escrow transaction record not found.' });
        }
        if (transaction.buyerId !== buyerId && authReq.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized. You are not the buyer in this transaction.' });
        }
        if (transaction.status !== 'escrow_pending') {
            return res.status(400).json({ message: `Transaction cannot be funded. Current status: ${transaction.status}` });
        }
        const paymentId = generatePaymentId();
        const updated = await dbStore_1.dbStore.transactions.update(id, {
            status: 'escrow_funded',
            paymentId
        });
        const patent = await dbStore_1.dbStore.patents.findById(transaction.patentId);
        // Log security audits
        await dbStore_1.dbStore.auditLogs.create({
            userId: buyerId,
            action: 'ESCROW_FUNDED',
            details: `Buyer ${authReq.user.name} funded escrow account for patent ${patent?.patentNumber || 'N/A'} (Offer: ${formatCurrency(transaction.amount)}). Payment Ref: ${paymentId}`
        });
        return res.json({
            message: 'Escrow funded successfully via simulated payment gateway.',
            transaction: updated
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to process escrow funding.', error: error.message });
    }
}
// Create Razorpay Order for Escrow Funding
async function createRazorpayOrder(req, res) {
    try {
        const authReq = req;
        const { id } = req.params;
        const buyerId = authReq.user.id;
        const transaction = await dbStore_1.dbStore.transactions.findById(id);
        if (!transaction) {
            return res.status(404).json({ message: 'Escrow transaction record not found.' });
        }
        if (transaction.buyerId !== buyerId && authReq.user.role !== 'admin') {
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
            receipt: String(transaction._id),
            payment_capture: 1
        };
        const order = await getRazorpay().orders.create(options);
        return res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_T1ox9Zd2QpcO6M'
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to create Razorpay order.', error: error.message });
    }
}
// Verify Razorpay Payment Signature and Fund Escrow
async function verifyRazorpayPayment(req, res) {
    try {
        const authReq = req;
        const { id } = req.params;
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
        const buyerId = authReq.user.id;
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return res.status(400).json({ message: 'Missing payment signature verification fields.' });
        }
        const transaction = await dbStore_1.dbStore.transactions.findById(id);
        if (!transaction) {
            return res.status(404).json({ message: 'Escrow transaction record not found.' });
        }
        if (transaction.buyerId !== buyerId && authReq.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized.' });
        }
        // Verify signature
        const keySecret = process.env.RAZORPAY_KEY_SECRET || '2w4vrpAImNMnt0lUmGY78Apm';
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto_1.default
            .createHmac('sha256', keySecret)
            .update(body.toString())
            .digest('hex');
        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: 'Payment verification failed. Invalid signature match.' });
        }
        // Signature is valid! Update status and transaction payment reference
        const updated = await dbStore_1.dbStore.transactions.update(id, {
            status: 'escrow_funded',
            paymentId: razorpay_payment_id
        });
        const patent = await dbStore_1.dbStore.patents.findById(transaction.patentId);
        // Write audit log
        await dbStore_1.dbStore.auditLogs.create({
            userId: buyerId,
            action: 'ESCROW_FUNDED',
            details: `Buyer ${authReq.user.name} funded escrow account securely via Razorpay for patent ${patent?.patentNumber || 'N/A'} (Reference: ${razorpay_payment_id}). Order Ref: ${razorpay_order_id}`
        });
        return res.json({
            message: 'Razorpay payment verified & escrow vault successfully funded.',
            transaction: updated
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to verify Razorpay signature.', error: error.message });
    }
}
// Release Funds for a Specific Milestone (Buyer only)
async function releaseMilestone(req, res) {
    try {
        const authReq = req;
        const { id, index } = req.params;
        const buyerId = authReq.user.id;
        const idx = parseInt(index, 10);
        const transaction = await dbStore_1.dbStore.transactions.findById(id);
        if (!transaction) {
            return res.status(404).json({ message: 'Escrow transaction record not found.' });
        }
        if (transaction.buyerId !== buyerId && authReq.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized. You are not authorized to release milestone funds.' });
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
        const updated = await dbStore_1.dbStore.transactions.update(id, {
            status,
            milestones: updatedMilestones
        });
        const patent = await dbStore_1.dbStore.patents.findById(transaction.patentId);
        // Create audit log
        await dbStore_1.dbStore.auditLogs.create({
            userId: buyerId,
            action: allReleased ? 'TRANSACTION_COMPLETED' : 'MILESTONE_RELEASED',
            details: allReleased
                ? `Transaction completed. All milestone payouts released for patent ${patent?.patentNumber || 'N/A'}.`
                : `Buyer released milestone ${idx + 1} payout (${formatCurrency(transaction.milestones[idx].amount)}) for patent ${patent?.patentNumber || 'N/A'}.`
        });
        return res.json({
            message: allReleased
                ? 'Final milestone released. Deal completed successfully.'
                : `Milestone ${idx + 1} funds released to inventor.`,
            transaction: updated
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to release milestone funds.', error: error.message });
    }
}
// Download final IP Assignment Deed as .docx Word document
async function downloadDeedDocx(req, res) {
    try {
        const authReq = req;
        const { id } = req.params;
        const userId = authReq.user.id;
        const userRole = authReq.user.role;
        const transaction = await dbStore_1.dbStore.transactions.findById(id);
        if (!transaction) {
            return res.status(404).json({ message: 'Escrow transaction record not found.' });
        }
        // Security check: Only buyer, owner, or admin can download
        if (transaction.buyerId !== userId && transaction.ownerId !== userId && userRole !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized access to assignment deed.' });
        }
        if (transaction.status !== 'completed' && userRole !== 'admin') {
            return res.status(400).json({ message: 'Deed is only generated upon successful transaction completion.' });
        }
        const patent = await dbStore_1.dbStore.patents.findById(transaction.patentId);
        if (!patent) {
            return res.status(404).json({ message: 'Patent not found.' });
        }
        const owner = await dbStore_1.dbStore.users.findById(transaction.ownerId);
        const buyer = await dbStore_1.dbStore.users.findById(transaction.buyerId);
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
        const thinBorder = { style: docx_1.BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
        const tableBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
        // Compile the assignment deed word document
        const doc = new docx_1.Document({
            sections: [{
                    children: [
                        // Letterhead title
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.CENTER,
                            spacing: { after: 120 },
                            children: [
                                new docx_1.TextRun({
                                    text: "PATENTBRIDGE IP ASSIGNMENT DEED",
                                    bold: true,
                                    size: 20,
                                    font: "Times New Roman",
                                    color: "555555"
                                })
                            ]
                        }),
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.CENTER,
                            spacing: { after: 360 },
                            children: [
                                new docx_1.TextRun({
                                    text: "__________________________________________________________________",
                                    color: "CCCCCC"
                                })
                            ]
                        }),
                        // Deed Title
                        new docx_1.Paragraph({
                            heading: docx_1.HeadingLevel.HEADING_1,
                            alignment: docx_1.AlignmentType.CENTER,
                            spacing: { before: 240, after: 240 },
                            children: [
                                new docx_1.TextRun({
                                    text: "DEED OF PATENT ASSIGNMENT & TRANSFER",
                                    bold: true,
                                    size: 28,
                                    font: "Times New Roman",
                                    color: "1F3864"
                                })
                            ]
                        }),
                        // Preamble
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.JUSTIFIED,
                            spacing: { before: 120, after: 120, line: 360 },
                            children: [
                                new docx_1.TextRun({
                                    text: `This Deed of Patent Assignment (the "Deed") is executed on this ${dateStr} at the PatentBridge online repository portal, by and between:`,
                                    font: "Times New Roman",
                                    size: 24
                                })
                            ]
                        }),
                        // Parties
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.JUSTIFIED,
                            spacing: { before: 120, after: 60, line: 360 },
                            indent: { left: 720 },
                            children: [
                                new docx_1.TextRun({
                                    text: "THE ASSIGNOR: ",
                                    bold: true,
                                    font: "Times New Roman",
                                    size: 24
                                }),
                                new docx_1.TextRun({
                                    text: `${ownerName}, affiliated with ${ownerOrg} (hereinafter referred to as the "Assignor", which expression shall include legal heirs and successors).`,
                                    font: "Times New Roman",
                                    size: 24
                                })
                            ]
                        }),
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.JUSTIFIED,
                            spacing: { before: 60, after: 120, line: 360 },
                            indent: { left: 720 },
                            children: [
                                new docx_1.TextRun({
                                    text: "THE ASSIGNEE: ",
                                    bold: true,
                                    font: "Times New Roman",
                                    size: 24
                                }),
                                new docx_1.TextRun({
                                    text: `${buyerName}, representing ${buyerOrg} (hereinafter referred to as the "Assignee", which expression shall include corporate successors and assignees).`,
                                    font: "Times New Roman",
                                    size: 24
                                })
                            ]
                        }),
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.JUSTIFIED,
                            spacing: { before: 120, after: 120, line: 360 },
                            children: [
                                new docx_1.TextRun({
                                    text: "WHEREAS, the Assignor is the absolute owner of the intellectual property, namely Indian Patent Application/Grant Number: ",
                                    font: "Times New Roman",
                                    size: 24
                                }),
                                new docx_1.TextRun({
                                    text: patent.patentNumber,
                                    bold: true,
                                    font: "Times New Roman",
                                    size: 24
                                }),
                                new docx_1.TextRun({
                                    text: `, titled "`,
                                    font: "Times New Roman",
                                    size: 24
                                }),
                                new docx_1.TextRun({
                                    text: patent.title,
                                    italics: true,
                                    bold: true,
                                    font: "Times New Roman",
                                    size: 24
                                }),
                                new docx_1.TextRun({
                                    text: `" (the "Patent Rights"); and`,
                                    font: "Times New Roman",
                                    size: 24
                                })
                            ]
                        }),
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.JUSTIFIED,
                            spacing: { before: 120, after: 120, line: 360 },
                            children: [
                                new docx_1.TextRun({
                                    text: `WHEREAS, the Assignee has agreed to acquire full right, title, and interest in the Patent Rights for a total consideration of `,
                                    font: "Times New Roman",
                                    size: 24
                                }),
                                new docx_1.TextRun({
                                    text: `${formatCurrency(transaction.amount)}`,
                                    bold: true,
                                    font: "Times New Roman",
                                    size: 24
                                }),
                                new docx_1.TextRun({
                                    text: `, and the Assignee has deposited the funds in the PatentBridge platform Escrow Vault, which have been successfully released in full to the Assignor according to the scheduled milestones;`,
                                    font: "Times New Roman",
                                    size: 24
                                })
                            ]
                        }),
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.JUSTIFIED,
                            spacing: { before: 120, after: 120, line: 360 },
                            children: [
                                new docx_1.TextRun({
                                    text: "NOW, THEREFORE, THIS DEED WITNESSETH AS FOLLOWS:",
                                    font: "Times New Roman",
                                    size: 24
                                })
                            ]
                        }),
                        // Clauses
                        new docx_1.Paragraph({
                            heading: docx_1.HeadingLevel.HEADING_2,
                            spacing: { before: 240, after: 60 },
                            children: [
                                new docx_1.TextRun({
                                    text: "1. Assignment and Transfer",
                                    bold: true,
                                    font: "Times New Roman",
                                    size: 24,
                                    color: "1F3864"
                                })
                            ]
                        }),
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.JUSTIFIED,
                            spacing: { before: 60, after: 120, line: 360 },
                            children: [
                                new docx_1.TextRun({
                                    text: `The Assignor hereby sells, assigns, and transfers unto the Assignee the entire right, title, and interest in and to Indian Patent Number ${patent.patentNumber}, including all associated claims, priorities, licensing rights, and the right to sue for past infringements. The transfer shall be effective globally from the date of completion.`,
                                    font: "Times New Roman",
                                    size: 24
                                })
                            ]
                        }),
                        new docx_1.Paragraph({
                            heading: docx_1.HeadingLevel.HEADING_2,
                            spacing: { before: 240, after: 60 },
                            children: [
                                new docx_1.TextRun({
                                    text: "2. Escrow Settlement and Consideration Receipt",
                                    bold: true,
                                    font: "Times New Roman",
                                    size: 24,
                                    color: "1F3864"
                                })
                            ]
                        }),
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.JUSTIFIED,
                            spacing: { before: 60, after: 120, line: 360 },
                            children: [
                                new docx_1.TextRun({
                                    text: `The Assignor acknowledges receipt of the consideration amount of ${formatCurrency(transaction.amount)} (minus platform commission fees) via the secure milestone releases of Escrow Transaction ID: ${transaction.paymentId || 'N/A'}. The Assignor declares that they no longer have any claim over the Patent Rights.`,
                                    font: "Times New Roman",
                                    size: 24
                                })
                            ]
                        }),
                        new docx_1.Paragraph({
                            heading: docx_1.HeadingLevel.HEADING_2,
                            spacing: { before: 240, after: 60 },
                            children: [
                                new docx_1.TextRun({
                                    text: "3. Legal Execution & Signatures",
                                    bold: true,
                                    font: "Times New Roman",
                                    size: 24,
                                    color: "1F3864"
                                })
                            ]
                        }),
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.JUSTIFIED,
                            spacing: { before: 60, after: 240, line: 360 },
                            children: [
                                new docx_1.TextRun({
                                    text: "This Deed is executed electronically via the PatentBridge platform, utilizing e-signing workflows and secure vault allocations, which is fully valid and admissible in a court of law under Section 4 of the Indian Information Technology Act, 2000.",
                                    font: "Times New Roman",
                                    size: 24
                                })
                            ]
                        }),
                        // Signatures Table
                        new docx_1.Table({
                            width: { size: 100, type: docx_1.WidthType.PERCENTAGE },
                            rows: [
                                new docx_1.TableRow({
                                    children: [
                                        new docx_1.TableCell({
                                            width: { size: 50, type: docx_1.WidthType.PERCENTAGE },
                                            borders: tableBorders,
                                            shading: { fill: "F5F5F5" },
                                            children: [
                                                new docx_1.Paragraph({
                                                    spacing: { before: 60, after: 60 },
                                                    children: [new docx_1.TextRun({ text: "THE ASSIGNOR (INVENTOR)", bold: true, font: "Times New Roman", size: 20, color: "1F3864" })]
                                                })
                                            ]
                                        }),
                                        new docx_1.TableCell({
                                            width: { size: 50, type: docx_1.WidthType.PERCENTAGE },
                                            borders: tableBorders,
                                            shading: { fill: "F5F5F5" },
                                            children: [
                                                new docx_1.Paragraph({
                                                    spacing: { before: 60, after: 60 },
                                                    children: [new docx_1.TextRun({ text: "THE ASSIGNEE (BUYER)", bold: true, font: "Times New Roman", size: 20, color: "1F3864" })]
                                                })
                                            ]
                                        })
                                    ]
                                }),
                                new docx_1.TableRow({
                                    children: [
                                        new docx_1.TableCell({
                                            width: { size: 50, type: docx_1.WidthType.PERCENTAGE },
                                            borders: tableBorders,
                                            children: [
                                                new docx_1.Paragraph({
                                                    spacing: { before: 120, after: 60 },
                                                    children: [new docx_1.TextRun({ text: `Organization: ${ownerOrg}`, font: "Times New Roman", size: 22 })]
                                                }),
                                                new docx_1.Paragraph({
                                                    spacing: { before: 60, after: 60 },
                                                    children: [new docx_1.TextRun({ text: `Name: ${ownerName}`, font: "Times New Roman", size: 22 })]
                                                }),
                                                new docx_1.Paragraph({
                                                    spacing: { before: 60, after: 60 },
                                                    children: [
                                                        new docx_1.TextRun({ text: "Signature: ", font: "Times New Roman", size: 22 }),
                                                        new docx_1.TextRun({ text: `/${ownerName.replace(/\s+/g, '')}/`, italics: true, bold: true, color: "1F3864" })
                                                    ]
                                                }),
                                                new docx_1.Paragraph({
                                                    spacing: { before: 60, after: 120 },
                                                    children: [new docx_1.TextRun({ text: "eSign Status: Verified by platform", font: "Times New Roman", size: 18, color: "2E7D32", bold: true })]
                                                })
                                            ]
                                        }),
                                        new docx_1.TableCell({
                                            width: { size: 50, type: docx_1.WidthType.PERCENTAGE },
                                            borders: tableBorders,
                                            children: [
                                                new docx_1.Paragraph({
                                                    spacing: { before: 120, after: 60 },
                                                    children: [new docx_1.TextRun({ text: `Organization: ${buyerOrg}`, font: "Times New Roman", size: 22 })]
                                                }),
                                                new docx_1.Paragraph({
                                                    spacing: { before: 60, after: 60 },
                                                    children: [new docx_1.TextRun({ text: `Name: ${buyerName}`, font: "Times New Roman", size: 22 })]
                                                }),
                                                new docx_1.Paragraph({
                                                    spacing: { before: 60, after: 60 },
                                                    children: [
                                                        new docx_1.TextRun({ text: "Signature: ", font: "Times New Roman", size: 22 }),
                                                        new docx_1.TextRun({ text: `/${buyerName.replace(/\s+/g, '')}/`, italics: true, bold: true, color: "1F3864" })
                                                    ]
                                                }),
                                                new docx_1.Paragraph({
                                                    spacing: { before: 60, after: 120 },
                                                    children: [new docx_1.TextRun({ text: "eSign Status: Verified by platform", font: "Times New Roman", size: 18, color: "2E7D32", bold: true })]
                                                })
                                            ]
                                        })
                                    ]
                                })
                            ]
                        }),
                        // Footer Notice
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.CENTER,
                            spacing: { before: 360 },
                            children: [
                                new docx_1.TextRun({
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
        const buffer = await docx_1.Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=Deed_Assignment_${patent.patentNumber}.docx`);
        res.send(buffer);
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to generate Assignment Deed document.', error: error.message });
    }
}
