"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInterestRequest = createInterestRequest;
exports.createMeetingRequest = createMeetingRequest;
exports.getLeads = getLeads;
exports.getMeetings = getMeetings;
exports.updateLeadStatus = updateLeadStatus;
exports.updateMeetingStatus = updateMeetingStatus;
exports.createAccessRequest = createAccessRequest;
exports.getAccessStatus = getAccessStatus;
exports.getAccessRequests = getAccessRequests;
exports.updateAccessRequestStatus = updateAccessRequestStatus;
const dbStore_1 = require("../services/dbStore");
// Create Interest Request (Buyer only)
async function createInterestRequest(req, res) {
    try {
        const authReq = req;
        const { id: patentId } = req.params;
        const { name, organization, email, purpose, message } = req.body;
        if (!name || !organization || !email || !purpose || !message) {
            return res.status(400).json({ message: 'Missing required interest request details.' });
        }
        const patent = await dbStore_1.dbStore.patents.findById(patentId);
        if (!patent) {
            return res.status(404).json({ message: 'Patent not found.' });
        }
        const lead = await dbStore_1.dbStore.interestRequests.create({
            patentId,
            buyerId: authReq.user.id,
            ownerId: patent.ownerId,
            name,
            organization,
            email,
            purpose,
            message,
            status: 'new'
        });
        return res.status(201).json({
            message: 'Interest request submitted successfully. The patent owner has been notified.',
            lead
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to submit interest request.', error: error.message });
    }
}
// Create Meeting Request (Buyer only)
async function createMeetingRequest(req, res) {
    try {
        const authReq = req;
        const { id: patentId } = req.params;
        const { preferredDate, preferredTime, notes } = req.body;
        if (!preferredDate || !preferredTime) {
            return res.status(400).json({ message: 'Preferred date and time are required.' });
        }
        const patent = await dbStore_1.dbStore.patents.findById(patentId);
        if (!patent) {
            return res.status(404).json({ message: 'Patent not found.' });
        }
        // Ensure access request is approved
        const accessReq = await dbStore_1.dbStore.accessRequests.findOne({ patentId, buyerId: authReq.user.id });
        if ((!accessReq || accessReq.status !== 'approved') && authReq.user.role !== 'admin' && patent.ownerId !== authReq.user.id) {
            return res.status(403).json({ message: 'You must have approved detailed access to book a meeting.' });
        }
        const meeting = await dbStore_1.dbStore.meetingRequests.create({
            patentId,
            buyerId: authReq.user.id,
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
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to request meeting.', error: error.message });
    }
}
// Fetch Leads (Interest Requests)
async function getLeads(req, res) {
    try {
        const authReq = req;
        const { role, id: userId } = authReq.user;
        let filter = {};
        if (role === 'owner') {
            filter = { ownerId: userId };
        }
        else if (role === 'buyer') {
            filter = { buyerId: userId };
        }
        else if (role === 'admin') {
            // Admins see everything
            filter = {};
        }
        const leads = await dbStore_1.dbStore.interestRequests.find(filter);
        // Enrich with Patent title
        const enriched = [];
        for (const l of leads) {
            const p = await dbStore_1.dbStore.patents.findById(l.patentId);
            enriched.push({
                ...l,
                patentTitle: p ? p.title : 'Deleted Patent',
                patentNumber: p ? p.patentNumber : 'N/A'
            });
        }
        return res.json(enriched);
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to retrieve interest requests.', error: error.message });
    }
}
// Fetch Meetings
async function getMeetings(req, res) {
    try {
        const authReq = req;
        const { role, id: userId } = authReq.user;
        let filter = {};
        if (role === 'owner') {
            filter = { ownerId: userId };
        }
        else if (role === 'buyer') {
            filter = { buyerId: userId };
        }
        else if (role === 'admin') {
            filter = {};
        }
        const meetings = await dbStore_1.dbStore.meetingRequests.find(filter);
        // Enrich with Patent title and counter-party information
        const enriched = [];
        for (const m of meetings) {
            const p = await dbStore_1.dbStore.patents.findById(m.patentId);
            let counterParty = '';
            if (role === 'owner') {
                const buyer = await dbStore_1.dbStore.users.findById(m.buyerId);
                counterParty = buyer ? `${buyer.name} (${buyer.organization || 'Independent'})` : 'Buyer';
            }
            else {
                const owner = await dbStore_1.dbStore.users.findById(m.ownerId);
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
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to retrieve meeting requests.', error: error.message });
    }
}
// Update Interest Request Status (Owner only)
async function updateLeadStatus(req, res) {
    try {
        const authReq = req;
        const { id } = req.params;
        const { status } = req.body; // 'new' | 'reviewed' | 'contacted'
        if (!['new', 'reviewed', 'contacted'].includes(status)) {
            return res.status(400).json({ message: 'Invalid lead status.' });
        }
        const lead = await dbStore_1.dbStore.interestRequests.findById(id);
        if (!lead) {
            return res.status(404).json({ message: 'Lead request not found.' });
        }
        // Security check: Make sure this owner is the recipient
        if (lead.ownerId !== authReq.user.id && authReq.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized. You do not own this lead.' });
        }
        const updated = await dbStore_1.dbStore.interestRequests.update(id, { status });
        return res.json({
            message: `Lead status updated to ${status}.`,
            lead: updated
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to update lead status.', error: error.message });
    }
}
// Update Meeting Request Status (Owner only)
async function updateMeetingStatus(req, res) {
    try {
        const authReq = req;
        const { id } = req.params;
        const { status } = req.body; // 'pending' | 'accepted' | 'declined'
        if (!['pending', 'accepted', 'declined'].includes(status)) {
            return res.status(400).json({ message: 'Invalid meeting status.' });
        }
        const meeting = await dbStore_1.dbStore.meetingRequests.findById(id);
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting request not found.' });
        }
        // Security check: Make sure this owner is the recipient
        if (meeting.ownerId !== authReq.user.id && authReq.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized. You are not the requested organizer.' });
        }
        const updateData = { status };
        if (status === 'accepted') {
            // Generate unique Jitsi video link
            updateData.videoCallLink = `https://meet.jit.si/PatentBridge-Meeting-${id}`;
        }
        const updated = await dbStore_1.dbStore.meetingRequests.update(id, updateData);
        // Create audit log
        await dbStore_1.dbStore.auditLogs.create({
            userId: authReq.user.id,
            action: 'MEETING_STATUS_UPDATE',
            details: `Meeting request ${id} updated to ${status}. ${status === 'accepted' ? 'Virtual Jitsi room generated.' : ''}`
        });
        return res.json({
            message: `Meeting request ${status}.`,
            meeting: updated
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to update meeting status.', error: error.message });
    }
}
// Create Access Request (Buyer only)
async function createAccessRequest(req, res) {
    try {
        const authReq = req;
        const { id: patentId } = req.params;
        const buyerId = authReq.user.id;
        // Check if patent exists
        const patent = await dbStore_1.dbStore.patents.findById(patentId);
        if (!patent) {
            return res.status(404).json({ message: 'Patent not found.' });
        }
        // Ensure interest has been expressed
        const interests = await dbStore_1.dbStore.interestRequests.find({ patentId, buyerId });
        if (interests.length === 0 && authReq.user.role !== 'admin') {
            return res.status(400).json({ message: 'You must express interest in this patent before requesting access.' });
        }
        // Check if already requested
        const existing = await dbStore_1.dbStore.accessRequests.findOne({ patentId, buyerId });
        if (existing) {
            return res.status(400).json({ message: 'Access request already exists.', request: existing });
        }
        const request = await dbStore_1.dbStore.accessRequests.create({
            patentId,
            buyerId,
            ownerId: patent.ownerId,
            status: 'pending'
        });
        // Create audit log
        await dbStore_1.dbStore.auditLogs.create({
            userId: buyerId,
            action: 'ACCESS_REQUESTED',
            details: `Buyer ${authReq.user.name} requested access to patent ${patent.patentNumber} (${patent.title}).`
        });
        return res.status(201).json({
            message: 'Access request submitted successfully to the inventor.',
            request
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to request access.', error: error.message });
    }
}
// Check Access Status for a patent
async function getAccessStatus(req, res) {
    try {
        const authReq = req;
        const { id: patentId } = req.params;
        const buyerId = authReq.user?.id;
        if (!buyerId) {
            return res.json({ status: 'none' });
        }
        // Check if patent exists
        const patent = await dbStore_1.dbStore.patents.findById(patentId);
        if (!patent) {
            return res.status(404).json({ message: 'Patent not found.' });
        }
        // Inventor and Admin have full access automatically
        if (patent.ownerId === buyerId || authReq.user?.role === 'admin') {
            return res.json({ status: 'approved' });
        }
        const request = await dbStore_1.dbStore.accessRequests.findOne({ patentId, buyerId });
        return res.json({ status: request ? request.status : 'none', requestDate: request ? request.createdAt : null });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to verify access status.', error: error.message });
    }
}
// Fetch Access Requests (Owner & Admin)
async function getAccessRequests(req, res) {
    try {
        const authReq = req;
        const { role, id: userId } = authReq.user;
        let filter = {};
        if (role === 'owner') {
            filter = { ownerId: userId };
        }
        else if (role === 'buyer') {
            filter = { buyerId: userId };
        }
        else if (role === 'admin') {
            filter = {};
        }
        const requests = await dbStore_1.dbStore.accessRequests.find(filter);
        // Enrich with Patent and Buyer details
        const enriched = [];
        for (const r of requests) {
            const p = await dbStore_1.dbStore.patents.findById(r.patentId);
            const buyer = await dbStore_1.dbStore.users.findById(r.buyerId);
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
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to retrieve access requests.', error: error.message });
    }
}
// Update Access Request Status (Owner only)
async function updateAccessRequestStatus(req, res) {
    try {
        const authReq = req;
        const { id } = req.params;
        const { status } = req.body; // 'approved' | 'rejected'
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid access request status.' });
        }
        const request = await dbStore_1.dbStore.accessRequests.findById(id);
        if (!request) {
            return res.status(404).json({ message: 'Access request not found.' });
        }
        // Security check: Make sure this owner is the recipient
        if (request.ownerId !== authReq.user.id && authReq.user.role !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized. You do not own this patent.' });
        }
        const updated = await dbStore_1.dbStore.accessRequests.update(id, { status });
        // Create audit log
        await dbStore_1.dbStore.auditLogs.create({
            userId: authReq.user.id,
            action: `ACCESS_REQUEST_${status.toUpperCase()}`,
            details: `Inventor ${authReq.user.name} ${status} access request for patent ${request.patentId} by buyer ${request.buyerId}.`
        });
        return res.json({
            message: `Access request status updated to ${status}.`,
            request: updated
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to update access request status.', error: error.message });
    }
}
