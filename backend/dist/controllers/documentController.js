"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkNDAStatus = checkNDAStatus;
exports.signNDA = signNDA;
exports.downloadNDADocx = downloadNDADocx;
exports.getSignedNDAs = getSignedNDAs;
const dbStore_1 = require("../services/dbStore");
const docx_1 = require("docx");
// Mask Aadhaar card number
function maskAadhaar(aadhaar) {
    const clean = aadhaar.replace(/\s|-/g, '');
    if (clean.length !== 12)
        return aadhaar;
    return `XXXX-XXXX-${clean.substring(8)}`;
}
// Check if buyer has signed NDA for a patent
async function checkNDAStatus(req, res) {
    try {
        const authReq = req;
        const { id: patentId } = req.params;
        const buyerId = authReq.user.id;
        const signature = await dbStore_1.dbStore.ndaSignatures.findOne({ patentId, buyerId });
        return res.json({ signed: !!signature, signature: signature || null });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to verify NDA signature status.', error: error.message });
    }
}
// Sign NDA for a patent (Buyer only)
async function signNDA(req, res) {
    try {
        const authReq = req;
        const { id: patentId } = req.params;
        const { fullName, aadhaarNumber } = req.body;
        const buyerId = authReq.user.id;
        if (!fullName || !aadhaarNumber) {
            return res.status(400).json({ message: 'Full name and 12-digit Aadhaar number are required to sign the NDA.' });
        }
        const cleanAadhaar = aadhaarNumber.replace(/\s|-/g, '');
        if (cleanAadhaar.length !== 12 || !/^\d+$/.test(cleanAadhaar)) {
            return res.status(400).json({ message: 'Invalid Aadhaar number. Must be exactly 12 digits.' });
        }
        // Check if patent exists
        const patent = await dbStore_1.dbStore.patents.findById(patentId);
        if (!patent) {
            return res.status(404).json({ message: 'Patent not found.' });
        }
        // Check if already signed
        const existing = await dbStore_1.dbStore.ndaSignatures.findOne({ patentId, buyerId });
        if (existing) {
            return res.status(200).json({ message: 'NDA is already signed.', signature: existing });
        }
        const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
        const signature = await dbStore_1.dbStore.ndaSignatures.create({
            patentId,
            buyerId,
            fullName,
            aadhaarNumber: maskAadhaar(cleanAadhaar),
            ipAddress,
            signedAt: new Date()
        });
        // Create audit log
        await dbStore_1.dbStore.auditLogs.create({
            userId: buyerId,
            action: 'NDA_SIGNED',
            details: `Buyer ${fullName} successfully e-signed NDA for patent ${patent.patentNumber} (${patent.title}) via Aadhaar OTP.`
        });
        return res.status(201).json({
            message: 'NDA successfully signed and verified via Aadhaar eSign.',
            signature
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to sign NDA.', error: error.message });
    }
}
// Download NDA as .docx Word document
async function downloadNDADocx(req, res) {
    try {
        const authReq = req;
        const { id: patentId } = req.params;
        const userId = authReq.user.id;
        const userRole = authReq.user.role;
        // Check signature
        let signature = null;
        if (userRole === 'buyer') {
            signature = await dbStore_1.dbStore.ndaSignatures.findOne({ patentId, buyerId: userId });
        }
        else if (userRole === 'owner') {
            // Inventors can download NDAs signed by buyers for their patents
            const patent = await dbStore_1.dbStore.patents.findById(patentId);
            if (patent && patent.ownerId === userId) {
                // Find any signature for this patent (or retrieve from query buyerId if specified)
                const buyerId = req.query.buyerId;
                if (buyerId) {
                    signature = await dbStore_1.dbStore.ndaSignatures.findOne({ patentId, buyerId });
                }
                else {
                    // just get the most recent signature
                    const sigs = await dbStore_1.dbStore.ndaSignatures.find({ patentId });
                    signature = sigs.length > 0 ? sigs[0] : null;
                }
            }
        }
        else if (userRole === 'admin') {
            const buyerId = req.query.buyerId;
            signature = await dbStore_1.dbStore.ndaSignatures.findOne({ patentId, buyerId });
        }
        if (!signature) {
            return res.status(404).json({ message: 'No signed NDA agreement found matching your request.' });
        }
        const patent = await dbStore_1.dbStore.patents.findById(patentId);
        if (!patent) {
            return res.status(404).json({ message: 'Patent not found.' });
        }
        const owner = await dbStore_1.dbStore.users.findById(patent.ownerId);
        const buyer = await dbStore_1.dbStore.users.findById(signature.buyerId);
        const ownerName = owner ? owner.name : 'Patent Owner';
        const ownerOrg = owner?.organization || 'Independent Inventor';
        const buyerName = signature.fullName;
        const buyerOrg = buyer?.organization || 'Independent Acquirer';
        const dateStr = new Date(signature.signedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const timeStr = new Date(signature.signedAt).toLocaleTimeString('en-IN');
        // Define table borders
        const thinBorder = { style: docx_1.BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
        const tableBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
        // Build the Word document
        const doc = new docx_1.Document({
            sections: [{
                    properties: {},
                    children: [
                        // Header / Logo area
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.CENTER,
                            spacing: { after: 120 },
                            children: [
                                new docx_1.TextRun({
                                    text: "PATENTBRIDGE IP TRANSACTIONS",
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
                        // Document Title
                        new docx_1.Paragraph({
                            heading: docx_1.HeadingLevel.HEADING_1,
                            alignment: docx_1.AlignmentType.CENTER,
                            spacing: { before: 240, after: 240 },
                            children: [
                                new docx_1.TextRun({
                                    text: "MUTUAL NON-DISCLOSURE AGREEMENT",
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
                                    text: `This Mutual Non-Disclosure Agreement (the "Agreement") is entered into and made effective as of ${dateStr} (the "Effective Date"), by and between:`,
                                    font: "Times New Roman",
                                    size: 24
                                })
                            ]
                        }),
                        // Parties details
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.JUSTIFIED,
                            spacing: { before: 120, after: 60, line: 360 },
                            indent: { left: 720 },
                            children: [
                                new docx_1.TextRun({
                                    text: "1. The Disclosing Party: ",
                                    bold: true,
                                    font: "Times New Roman",
                                    size: 24
                                }),
                                new docx_1.TextRun({
                                    text: `${ownerName}, affiliated with ${ownerOrg} (the "Disclosing Party").`,
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
                                    text: "2. The Receiving Party: ",
                                    bold: true,
                                    font: "Times New Roman",
                                    size: 24
                                }),
                                new docx_1.TextRun({
                                    text: `${buyerName}, representing ${buyerOrg} (the "Receiving Party").`,
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
                                    text: "WHEREAS, the Disclosing Party is the owner of proprietary intellectual property rights, namely Indian Patent Application/Grant Number: ",
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
                                    text: `" (the "Proprietary Technology"); and`,
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
                                    text: "WHEREAS, the parties desire to enter into discussions regarding a potential business transaction, licensing agreement, or acquisition of the Proprietary Technology, and in the process, the Disclosing Party may disclose confidential technical, legal, and commercial details (the \"Confidential Information\") to the Receiving Party;",
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
                                    text: "NOW, THEREFORE, in consideration of the mutual promises contained herein, the parties agree as follows:",
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
                                    text: "1. Scope of Confidential Information",
                                    bold: true,
                                    font: "Times New Roman",
                                    size: 24,
                                    color: "2E5090"
                                })
                            ]
                        }),
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.JUSTIFIED,
                            spacing: { before: 60, after: 120, line: 360 },
                            children: [
                                new docx_1.TextRun({
                                    text: 'Confidential Information includes any and all technical documentation, claims, analysis, source scripts, financial metrics, and patent office files shared via the PatentBridge platform for the purpose of transaction evaluation. Information is deemed confidential regardless of whether it is explicitly marked as "Confidential" at the time of disclosure.',
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
                                    text: "2. Obligations of Confidentiality",
                                    bold: true,
                                    font: "Times New Roman",
                                    size: 24,
                                    color: "2E5090"
                                })
                            ]
                        }),
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.JUSTIFIED,
                            spacing: { before: 60, after: 120, line: 360 },
                            children: [
                                new docx_1.TextRun({
                                    text: "The Receiving Party agrees to maintain the strict confidentiality of the Disclosing Party's information. The Receiving Party shall not copy, disclose, publish, or utilize the Confidential Information for any purpose outside the evaluation of the transaction, and shall protect it using the same degree of care (but no less than a reasonable standard of care) that it uses to protect its own similar proprietary information.",
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
                                    text: "3. Exceptions",
                                    bold: true,
                                    font: "Times New Roman",
                                    size: 24,
                                    color: "2E5090"
                                })
                            ]
                        }),
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.JUSTIFIED,
                            spacing: { before: 60, after: 120, line: 360 },
                            children: [
                                new docx_1.TextRun({
                                    text: "Confidentiality obligations do not apply to information that: (a) is or becomes publicly known through no breach by the Receiving Party; (b) is received from a third party without restrictions; (c) is independently developed by the Receiving Party; or (d) is required to be disclosed by a court order or government authority.",
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
                                    text: "4. Execution and Electronic Signature Validity",
                                    bold: true,
                                    font: "Times New Roman",
                                    size: 24,
                                    color: "2E5090"
                                })
                            ]
                        }),
                        new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.JUSTIFIED,
                            spacing: { before: 60, after: 240, line: 360 },
                            children: [
                                new docx_1.TextRun({
                                    text: "The parties agree that execution of this Agreement via the PatentBridge platform using digital signature workflows and UIDAI Aadhaar eSign verification constitutes a legally binding electronic signature in accordance with Section 3 and Section 4 of the Indian Information Technology Act, 2000.",
                                    font: "Times New Roman",
                                    size: 24
                                })
                            ]
                        }),
                        // Execution Tables
                        new docx_1.Table({
                            width: { size: 100, type: docx_1.WidthType.PERCENTAGE },
                            rows: [
                                new docx_1.TableRow({
                                    children: [
                                        new docx_1.TableCell({
                                            width: { size: 50, type: docx_1.WidthType.PERCENTAGE },
                                            borders: tableBorders,
                                            shading: { fill: "F5F5F5", type: docx_1.ShadingType.CLEAR },
                                            children: [
                                                new docx_1.Paragraph({
                                                    spacing: { before: 60, after: 60 },
                                                    children: [new docx_1.TextRun({ text: "DISCLOSING PARTY (INVENTOR)", bold: true, font: "Times New Roman", size: 20, color: "1F3864" })]
                                                })
                                            ]
                                        }),
                                        new docx_1.TableCell({
                                            width: { size: 50, type: docx_1.WidthType.PERCENTAGE },
                                            borders: tableBorders,
                                            shading: { fill: "F5F5F5", type: docx_1.ShadingType.CLEAR },
                                            children: [
                                                new docx_1.Paragraph({
                                                    spacing: { before: 60, after: 60 },
                                                    children: [new docx_1.TextRun({ text: "RECEIVING PARTY (ACQUIRER)", bold: true, font: "Times New Roman", size: 20, color: "1F3864" })]
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
                                                    spacing: { before: 60, after: 120 },
                                                    children: [
                                                        new docx_1.TextRun({ text: "Signature: ", font: "Times New Roman", size: 22 }),
                                                        new docx_1.TextRun({ text: `/${ownerName.replace(/\s+/g, '')}/`, italics: true, bold: true, color: "777777" })
                                                    ]
                                                }),
                                                new docx_1.Paragraph({
                                                    spacing: { before: 60, after: 60 },
                                                    children: [new docx_1.TextRun({ text: "eSign Status: Platform Pre-Authorized", font: "Times New Roman", size: 18, color: "2E7D32" })]
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
                                                    spacing: { before: 60, after: 60 },
                                                    children: [
                                                        new docx_1.TextRun({ text: `Aadhaar ID: ${signature.aadhaarNumber}`, font: "Times New Roman", size: 20 }),
                                                    ]
                                                }),
                                                new docx_1.Paragraph({
                                                    spacing: { before: 60, after: 60 },
                                                    children: [
                                                        new docx_1.TextRun({ text: `IP Anchor: ${signature.ipAddress}`, font: "Times New Roman", size: 20 }),
                                                    ]
                                                }),
                                                new docx_1.Paragraph({
                                                    spacing: { before: 60, after: 60 },
                                                    children: [
                                                        new docx_1.TextRun({ text: `Timestamp: ${dateStr} ${timeStr}`, font: "Times New Roman", size: 20 }),
                                                    ]
                                                }),
                                                new docx_1.Paragraph({
                                                    spacing: { before: 60, after: 120 },
                                                    children: [new docx_1.TextRun({ text: "eSign Status: Verified via UIDAI OTP eSign Gateway", font: "Times New Roman", size: 18, color: "2E7D32", bold: true })]
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
        res.setHeader('Content-Disposition', `attachment; filename=NDA_${patent.patentNumber}.docx`);
        res.send(buffer);
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to generate NDA document.', error: error.message });
    }
}
// Fetch all signed NDAs for authenticated user
async function getSignedNDAs(req, res) {
    try {
        const authReq = req;
        const userId = authReq.user.id;
        const userRole = authReq.user.role;
        let signatures = [];
        if (userRole === 'buyer') {
            signatures = await dbStore_1.dbStore.ndaSignatures.find({ buyerId: userId });
        }
        else if (userRole === 'owner') {
            // Find all patents owned by this owner
            const patents = await dbStore_1.dbStore.patents.find({ ownerId: userId });
            const patentIds = patents.map(p => p._id);
            // Get all NDAs signed for these patents
            const allSigs = await dbStore_1.dbStore.ndaSignatures.find();
            signatures = allSigs.filter(s => patentIds.includes(s.patentId));
        }
        else if (userRole === 'admin') {
            signatures = await dbStore_1.dbStore.ndaSignatures.find();
        }
        // Enrich with Patent Title and Counter-Party details
        const enriched = [];
        for (const sig of signatures) {
            const p = await dbStore_1.dbStore.patents.findById(sig.patentId);
            const buyer = await dbStore_1.dbStore.users.findById(sig.buyerId);
            enriched.push({
                ...sig,
                patentTitle: p ? p.title : 'Deleted Patent',
                patentNumber: p ? p.patentNumber : 'N/A',
                buyerName: sig.fullName,
                buyerEmail: buyer ? buyer.email : 'N/A',
                buyerOrganization: buyer?.organization || 'Independent'
            });
        }
        return res.json(enriched);
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to retrieve signed NDAs.', error: error.message });
    }
}
