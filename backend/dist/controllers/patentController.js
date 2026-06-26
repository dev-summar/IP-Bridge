"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedInitialPatents = seedInitialPatents;
exports.getMarketplacePatents = getMarketplacePatents;
exports.getAIMatchedPatents = getAIMatchedPatents;
exports.registerPatent = registerPatent;
exports.getMyPortfolio = getMyPortfolio;
exports.getPendingPatents = getPendingPatents;
exports.getPatentById = getPatentById;
exports.reviewPatent = reviewPatent;
exports.toggleSavePatent = toggleSavePatent;
exports.getSavedPatents = getSavedPatents;
const dbStore_1 = require("../services/dbStore");
const aiParser_1 = require("../services/aiParser");
const schemas_1 = require("../models/schemas");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../middleware/auth");
async function checkAccessAndEnrich(p, userId, userRole) {
    const analysis = await dbStore_1.dbStore.patentAnalysis.findOne({ patentId: p._id });
    const owner = await dbStore_1.dbStore.users.findById(p.ownerId);
    let accessStatus = 'none';
    let hasAccess = false;
    let hasExpressedInterest = false;
    let hasMeetingDone = false;
    if (userId) {
        if (p.ownerId === userId || userRole === 'admin') {
            hasAccess = true;
            accessStatus = 'approved';
            hasExpressedInterest = true;
            hasMeetingDone = true;
        }
        else {
            const request = await dbStore_1.dbStore.accessRequests.findOne({ patentId: p._id.toString(), buyerId: userId });
            if (request) {
                accessStatus = request.status;
                if (request.status === 'approved') {
                    hasAccess = true;
                }
            }
            const interests = await dbStore_1.dbStore.interestRequests.find({ patentId: p._id.toString(), buyerId: userId });
            hasExpressedInterest = interests.length > 0;
            const meetings = await dbStore_1.dbStore.meetingRequests.find({ patentId: p._id.toString(), buyerId: userId, status: 'accepted' });
            hasMeetingDone = meetings.length > 0;
        }
    }
    const enrichedPatent = {
        ...p,
        ownerName: owner ? owner.name : 'Unknown Owner',
        ownerOrganization: owner ? owner.organization : 'N/A',
        accessStatus,
        hasExpressedInterest,
        hasMeetingDone
    };
    if (hasAccess) {
        const cleanAbstract = p.abstract.replace(/\s*\(\d+[-a-zA-Z0-9]*\)/g, '').replace(/\s{2,}/g, ' ').trim();
        enrichedPatent.abstract = cleanAbstract;
        if (analysis) {
            const cleanDesc = analysis.summary.description.replace(/\s*\(\d+[-a-zA-Z0-9]*\)/g, '').replace(/\s{2,}/g, ' ').trim();
            enrichedPatent.analysis = {
                ...analysis,
                summary: {
                    ...analysis.summary,
                    description: cleanDesc
                }
            };
        }
        else {
            enrichedPatent.analysis = null;
        }
    }
    else {
        // Mask details
        const domainText = (analysis?.industryClassification?.[0] || 'Technology').trim();
        enrichedPatent.title = `Confidential ${domainText} Innovation`;
        enrichedPatent.patentNumber = 'Restricted';
        const rawDesc = analysis?.summary?.description || p.abstract || '';
        const cleanDescription = rawDesc
            .replace(/\s*\(\d+[-a-zA-Z0-9]*\)/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        enrichedPatent.abstract = cleanDescription.length > 150
            ? cleanDescription.substring(0, 150) + '...'
            : cleanDescription;
        enrichedPatent.pdfUrl = undefined;
        enrichedPatent.analysis = {
            patentId: p._id,
            summary: {
                description: cleanDescription,
                problemSolved: 'Locked. Request access to unlock.',
                commercialValue: 'Locked. Request access to unlock.',
                keyInnovation: 'Locked. Request access to unlock.'
            },
            industryClassification: analysis ? analysis.industryClassification : ['Technology'],
            keywords: analysis ? analysis.keywords : [],
            commercialApplications: {
                potentialIndustries: [],
                useCases: [],
                adoptionOpportunities: []
            },
            commercialPotentialScore: analysis ? analysis.commercialPotentialScore : 50
        };
    }
    return enrichedPatent;
}
// Seed initial patents if empty
async function seedInitialPatents() {
    try {
        const existing = await dbStore_1.dbStore.patents.find();
        const hasDummies = existing.some(p => p.patentNumber.startsWith('US-'));
        if (hasDummies || existing.length === 0) {
            console.log('[Patent] Resetting patents database to clear dummy patents...');
            // Clear all existing patents
            for (const p of existing) {
                await dbStore_1.dbStore.patents.delete(p._id);
            }
            // If MongoDB, clean up other collections
            if ((0, dbStore_1.getUseMongo)()) {
                await schemas_1.PatentAnalysisModel.deleteMany({});
                await schemas_1.InterestRequestModel.deleteMany({});
                await schemas_1.MeetingRequestModel.deleteMany({});
                await schemas_1.AccessRequestModel.deleteMany({});
            }
            console.log('[Patent] Seeding initial Indian patents and analyses...');
            const owners = await dbStore_1.dbStore.users.find({ role: 'owner' });
            const ownerId = owners.length > 0 ? owners[0]._id : 'system-owner';
            const mockPatents = [
                {
                    patentNumber: 'IN-202611064342',
                    title: 'SYSTEM AND METHOD FOR BIOMECHANICAL MONITORING AND STRUCTURAL ANALYSIS OF FOOTWEAR',
                    abstract: 'A system (100) and method (200) for biomechanical monitoring and structural analysis in footwear are disclosed. A sole (102) integrates pressure sensors (104) distributed across heel, midfoot, forefoot, and hallux regions to generate plantar force data including vertical ground reaction forces and center of pressure coordinates. An upper member (106) incorporates dorsal sensors (108), strain sensors (110), and shear force sensors (110) to capture impact, friction, ankle strain, and lateral containment data. An inertial measurement unit (112) generates motion data including acceleration, angular velocity, and orientation. A processing unit (116) receives and temporally synchronises multi-source data, correlates the data to generate volumetric biomechanical data, and evaluates biomechanical parameters. The processing unit (116) determines movement events, computes an ankle stability ratio, and identifies instability, drag, impact, or containment degradation events. A wireless communication unit (122) transmits aggregated data to a server (120) for analytical processing and feedback generation.',
                    pdfUrl: 'https://ipindiaservices.gov.in/publicsearch',
                    status: 'approved',
                    askingPrice: 12500000,
                    isForSale: true,
                    isForLicense: true
                },
                {
                    patentNumber: 'IN-202611042595',
                    title: 'SYSTEM AND METHOD FOR DATA SOVEREIGNTY AND FUNCTIONAL INTEGRITY ENFORCEMENT IN SMART HOME DEVICES',
                    abstract: 'A system (100) and a method (200) for enforcing data sovereignty and functional integrity within a predefined premises are disclosed. The system (100) includes a privacy gateway apparatus (102) communicatively interposed between devices (104) and an external Wide Area Network (WAN), a network segmentation module configured to isolate the devices (104) within a restricted Local Area Network (LAN) segment, and a Power Line Communication (PLC) controller (106) operatively coupled to electrical supply sockets (108). At least one processor (110), intercepts outbound network traffic, identifies user-contextual data, and selectively blocks transmission to external cloud servers (130) in accordance with a predefined privacy enforcement policy. Electrical power consumption signatures and radio frequency (RF) transmissions are monitored and correlated to detect unauthorized communication attempts. Upon detection, the PLC controller (106) discontinues electrical power supply to a corresponding device (104), thereby maintaining controlled operation and preventing unauthorized data exfiltration within the predefined premises.',
                    pdfUrl: 'https://ipindiaservices.gov.in/publicsearch',
                    status: 'approved',
                    askingPrice: 8500000,
                    isForSale: false,
                    isForLicense: true
                },
                {
                    patentNumber: 'IN-202511116646',
                    title: 'INTEGRATED EDGE COMPUTING DEVICE FOR EXPLAINABLE MEDICAL IMAGING ADJUSTMENT',
                    abstract: 'The present disclosure provides an integrated edge computing device (100) for secure and explainable adjustment of medical imaging parameters. The device includes a housing (102) containing a processing unit (104) with graphics processing unit (104-2) and central processing unit (104-4), a security chip (106), encrypted storage (108), and a sensor interface (110) coordinated to receive imaging data from an imaging scanner (122). An inference circuit (112) analyzes imaging data and user information to generate parameter recommendations, while an explainability circuit (114) creates visual justifications including overlay maps (114-2A) for operator verification. A blockchain interface (116) manages secure data transactions with a distributed ledger network (120), and a communication interface (118) transmits adjustments to an operator workstation (128). Unlike conventional imaging systems operating in isolation, this approach enables secure cross-institutional data access while providing transparent recommendations and comprehensive radiation dose monitoring.',
                    pdfUrl: 'https://ipindiaservices.gov.in/publicsearch',
                    status: 'approved',
                    askingPrice: 18000000,
                    isForSale: true,
                    isForLicense: false
                },
                {
                    patentNumber: 'IN-202511088594',
                    title: 'HEALTH MONITORING AND EVACUATION COORDINATION SYSTEM AND METHOD THEREOF',
                    abstract: 'The present disclosure relates to a health monitoring and evacuation coordination system (102) and method (200) are disclosed for real-time monitoring of entities in high-risk environments. The system (102) includes a Body Area Network (BAN) device (104) worn by entities to collect biometric and geolocation data and generate zero-knowledge proofs (ZKPs) representing health conditions without transmitting raw biometric data. A secure peer-to-peer (P2P) mesh network (106), with unmanned aerial vehicles (UAVs) (108) and autonomous ground vehicles (110) as super nodes, maintains connectivity and relays information. A processor (112) analyzes ZKPs, determines urgency and type of response, and computes routes using multi-agent reinforcement learning (MARL) models, and assigns roles to UAVs (108) or vehicles (110) for tasks including condition confirmation, medical supply delivery, escort, or extraction. Further, an artificial intelligence (AI) module (132) logs all decisions using verifiable computation with Merkle Tree- based audit trails, provides operational recommendations, and supports human- in-the-loop approval.',
                    pdfUrl: 'https://ipindiaservices.gov.in/publicsearch',
                    status: 'pending',
                    askingPrice: 22000000,
                    isForSale: true,
                    isForLicense: true
                }
            ];
            for (const item of mockPatents) {
                const patent = await dbStore_1.dbStore.patents.create({
                    patentNumber: item.patentNumber,
                    title: item.title,
                    abstract: item.abstract,
                    pdfUrl: item.pdfUrl,
                    ownerId: ownerId,
                    status: item.status,
                    askingPrice: item.askingPrice,
                    isForSale: item.isForSale,
                    isForLicense: item.isForLicense
                });
                // Generate and save AI analysis
                const analysis = await (0, aiParser_1.analyzePatentWithAI)(item.title, item.abstract);
                await dbStore_1.dbStore.patentAnalysis.create({
                    patentId: patent._id,
                    ...analysis
                });
            }
            console.log(`[Patent] Successfully seeded ${mockPatents.length} patents with analyses.`);
        }
    }
    catch (err) {
        console.error('[Patent] Error seeding patents:', err);
    }
}
// Get all approved patents for marketplace
async function getMarketplacePatents(req, res) {
    try {
        const { query, industry, status } = req.query;
        // Fetch all patents
        let patents = await dbStore_1.dbStore.patents.find();
        // Decode token if present
        let userId = '';
        let userRole = '';
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const verified = jsonwebtoken_1.default.verify(token, auth_1.JWT_SECRET);
                userId = verified.id;
                userRole = verified.role;
            }
            catch (err) { }
        }
        // Attach analysis details to each patent
        const patentsWithAnalysis = [];
        for (const p of patents) {
            const enriched = await checkAccessAndEnrich(p, userId, userRole);
            patentsWithAnalysis.push(enriched);
        }
        // Filter results
        let filtered = patentsWithAnalysis;
        // Filter: By default, normal users see approved. Admin/Owners see more on specific routes
        const role = req.user?.role;
        if (status) {
            filtered = filtered.filter(p => p.status === status);
        }
        else {
            // General marketplace shows approved patents
            filtered = filtered.filter(p => p.status === 'approved');
        }
        if (industry) {
            filtered = filtered.filter(p => p.analysis?.industryClassification.some((i) => i.toLowerCase() === industry.toLowerCase()));
        }
        if (query) {
            const q = query.toLowerCase();
            // Clean query tokens (ignore common stop words)
            const stopWords = new Set(['the', 'and', 'for', 'with', 'system', 'method', 'device', 'apparatus', 'processing', 'about', 'from', 'this', 'that', 'new']);
            const queryTokens = q.split(/[\s,\.\-\/]+/).map(t => t.trim()).filter(t => t.length > 2 && !stopWords.has(t));
            const scoredResults = filtered.map(p => {
                let score = 0;
                if (queryTokens.length === 0) {
                    // Fallback if query only contains short words
                    if (p.title.toLowerCase().includes(q) || p.abstract.toLowerCase().includes(q)) {
                        score = 65;
                    }
                }
                else {
                    let totalPoints = 0;
                    queryTokens.forEach(token => {
                        if (p.title.toLowerCase().includes(token))
                            totalPoints += 35;
                        if (p.analysis?.keywords.some((kw) => kw.toLowerCase().includes(token)))
                            totalPoints += 25;
                        if (p.abstract.toLowerCase().includes(token))
                            totalPoints += 15;
                        if (p.analysis?.industryClassification.some((ind) => ind.toLowerCase().includes(token)))
                            totalPoints += 20;
                    });
                    if (totalPoints > 0) {
                        // Map total points to percentage scale (starting at 45% base, capped at 99%)
                        score = Math.min(99, Math.round(45 + (totalPoints / (queryTokens.length * 35)) * 54));
                    }
                }
                return {
                    ...p,
                    matchPercentage: score
                };
            });
            // Only keep hits with > 0 matching score, and sort by score descending
            filtered = scoredResults
                .filter(r => r.matchPercentage > 0)
                .sort((a, b) => b.matchPercentage - a.matchPercentage);
        }
        return res.json(filtered);
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to retrieve marketplace patents.', error: error.message });
    }
}
// Semantic AI patent matching using the Qwen LLM from environment variables
async function getAIMatchedPatents(req, res) {
    try {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ message: 'Matching query is required.' });
        }
        // Decode token if present
        let userId = '';
        let userRole = '';
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const verified = jsonwebtoken_1.default.verify(token, auth_1.JWT_SECRET);
                userId = verified.id;
                userRole = verified.role;
            }
            catch (err) { }
        }
        // Fetch all approved patents
        const patents = await dbStore_1.dbStore.patents.find({ status: 'approved' });
        // Attach analysis details to each patent
        const patentsWithAnalysis = [];
        for (const p of patents) {
            const enriched = await checkAccessAndEnrich(p, userId, userRole);
            patentsWithAnalysis.push({
                ...enriched,
                matchPercentage: 0,
                matchReason: ''
            });
        }
        if (patentsWithAnalysis.length === 0) {
            return res.json([]);
        }
        const apiKey = process.env.LLM_API_KEY;
        const endpoint = process.env.LLM_API_ENDPOINT || 'https://ai-services.mietjmu.in/gateway/llm/chat';
        const modelName = process.env.LLM_MODEL || 'qwen3:latest';
        // Local diagnostic fallback
        const getLocalHeuristicMatches = () => {
            const q = query.toLowerCase();
            const stopWords = new Set(['the', 'and', 'for', 'with', 'system', 'method', 'device', 'apparatus', 'processing', 'about', 'from', 'this', 'that', 'new']);
            const queryTokens = q.split(/[\s,\.\-\/]+/).map((t) => t.trim()).filter((t) => t.length > 2 && !stopWords.has(t));
            return patentsWithAnalysis.map(p => {
                let score = 0;
                let matchedTokens = [];
                if (queryTokens.length === 0) {
                    if (p.title.toLowerCase().includes(q) || p.abstract.toLowerCase().includes(q)) {
                        score = 65;
                        matchedTokens.push(q);
                    }
                }
                else {
                    queryTokens.forEach((token) => {
                        let hit = false;
                        if (p.title.toLowerCase().includes(token)) {
                            score += 35;
                            hit = true;
                        }
                        if (p.analysis?.keywords.some((kw) => kw.toLowerCase().includes(token))) {
                            score += 25;
                            hit = true;
                        }
                        if (p.abstract.toLowerCase().includes(token)) {
                            score += 15;
                            hit = true;
                        }
                        if (p.analysis?.industryClassification.some((ind) => ind.toLowerCase().includes(token))) {
                            score += 20;
                            hit = true;
                        }
                        if (hit)
                            matchedTokens.push(token);
                    });
                }
                const finalScore = score > 0 ? Math.min(99, Math.round(45 + (score / (Math.max(1, queryTokens.length) * 35)) * 54)) : 0;
                const reason = finalScore > 0
                    ? `Matched search keywords: [${matchedTokens.join(', ')}] with ${finalScore}% relevance to your target technical needs.`
                    : `No direct keyword overlap found with your query.`;
                return {
                    ...p,
                    matchPercentage: finalScore,
                    matchReason: reason
                };
            }).filter(p => p.matchPercentage > 0).sort((a, b) => b.matchPercentage - a.matchPercentage);
        };
        if (!apiKey) {
            console.log('[AI Match] No API key. Using local heuristic matching.');
            return res.json(getLocalHeuristicMatches());
        }
        // Prepare clean patent summary list for LLM context
        const patentPrompts = patentsWithAnalysis.map(p => ({
            id: p._id,
            title: p.title,
            abstract: p.abstract,
            keywords: p.analysis?.keywords || []
        }));
        const prompt = `You are a state-of-the-art patent matching AI. 
The user is looking for technologies that fit this need: "${query}".

Here is the list of available patents:
${JSON.stringify(patentPrompts, null, 2)}

Analyze how well each patent matches the user's need. Compute a match relevance score from 0 to 100 for each patent. Provide a short 1-2 sentence commercial explanation of how this patent matches their need.

You MUST return ONLY a valid JSON array of objects, matching this TypeScript type:
Array<{
  patentId: string;
  matchPercentage: number; // Integer between 0 and 100. Set 0 if it is completely irrelevant.
  reason: string; // 1-2 sentence explanation of the match or lack thereof.
}>

IMPORTANT: Return ONLY the raw JSON string starting with "[" and ending with "]". Do NOT wrap the JSON inside markdown code blocks. Do NOT include any introductory or wrap-up text.`;
        console.log(`[AI Match] Querying LLM for patent matching...`);
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.1
                }),
                signal: AbortSignal.timeout(25000)
            });
            if (!response.ok) {
                throw new Error(`Gateway returned HTTP status ${response.status}`);
            }
            const data = await response.json();
            const rawContent = data.choices?.[0]?.message?.content || data.message?.content || '';
            if (!rawContent) {
                throw new Error('LLM response returned empty content.');
            }
            let cleanJson = rawContent.trim();
            if (cleanJson.startsWith('```')) {
                cleanJson = cleanJson.replace(/^```(json)?/, '').replace(/```$/, '').trim();
            }
            const matchesList = JSON.parse(cleanJson);
            // Map back to patents list
            const matchedPatents = patentsWithAnalysis.map(p => {
                const matchInfo = matchesList.find(m => m.patentId === p._id.toString());
                return {
                    ...p,
                    matchPercentage: matchInfo ? matchInfo.matchPercentage : 0,
                    matchReason: matchInfo ? matchInfo.reason : 'No matching metrics provided by AI.'
                };
            }).filter(p => p.matchPercentage > 20) // Only keep items with a meaningful match
                .sort((a, b) => b.matchPercentage - a.matchPercentage);
            return res.json(matchedPatents);
        }
        catch (err) {
            console.warn(`[AI Match] Live match query failed (${err.message}).`);
            // Attempt Gemini Fallback
            const geminiApiKey = process.env.GEMINI_API_KEY;
            if (geminiApiKey) {
                try {
                    console.log('[AI Match] Attempting fallback to Google Gemini (gemini-1.5-flash)...');
                    const matchesList = await (0, aiParser_1.queryGeminiLLM)(prompt, geminiApiKey);
                    const matchedPatents = patentsWithAnalysis.map(p => {
                        const matchInfo = matchesList.find(m => m.patentId === p._id.toString());
                        return {
                            ...p,
                            matchPercentage: matchInfo ? matchInfo.matchPercentage : 0,
                            matchReason: matchInfo ? matchInfo.reason : 'No matching metrics provided by AI.'
                        };
                    }).filter(p => p.matchPercentage > 20)
                        .sort((a, b) => b.matchPercentage - a.matchPercentage);
                    console.log('[AI Match] Successfully generated matches from Google Gemini.');
                    return res.json(matchedPatents);
                }
                catch (geminiErr) {
                    console.warn(`[AI Match] Google Gemini fallback failed (${geminiErr.message}).`);
                }
            }
            console.log('[AI Match] Falling back to local heuristics.');
            return res.json(getLocalHeuristicMatches());
        }
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to process AI matching.', error: error.message });
    }
}
// Register a new patent (Owner only)
async function registerPatent(req, res) {
    try {
        const authReq = req;
        const { patentNumber, title, abstract, pdfUrl, askingPrice, isForSale, isForLicense } = req.body;
        if (!patentNumber || !title || !abstract) {
            return res.status(400).json({ message: 'Patent number, title, and abstract are required.' });
        }
        // Check duplicate patent number
        const existing = await dbStore_1.dbStore.patents.find();
        if (existing.some(p => p.patentNumber.toLowerCase() === patentNumber.toLowerCase())) {
            return res.status(400).json({ message: 'A patent with this patent number is already registered.' });
        }
        // Create Patent
        const newPatent = await dbStore_1.dbStore.patents.create({
            patentNumber,
            title,
            abstract,
            pdfUrl,
            askingPrice: askingPrice ? Number(askingPrice) : 0,
            isForSale: isForSale !== undefined ? Boolean(isForSale) : true,
            isForLicense: isForLicense !== undefined ? Boolean(isForLicense) : true,
            ownerId: authReq.user.id,
            status: 'pending' // Admin must review
        });
        // Run AI analysis automatically
        const aiAnalysis = await (0, aiParser_1.analyzePatentWithAI)(title, abstract);
        const analysis = await dbStore_1.dbStore.patentAnalysis.create({
            patentId: newPatent._id,
            ...aiAnalysis
        });
        // Write audit log
        await dbStore_1.dbStore.auditLogs.create({
            userId: authReq.user.id,
            action: 'PATENT_REGISTRATION',
            details: `Registered pending patent ${patentNumber}: "${title}"`
        });
        return res.status(201).json({
            message: 'Patent registered successfully and sent for AI/Admin review.',
            patent: newPatent,
            analysis
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to register patent.', error: error.message });
    }
}
// Get Owner Portfolio
async function getMyPortfolio(req, res) {
    try {
        const authReq = req;
        const patents = await dbStore_1.dbStore.patents.find({ ownerId: authReq.user.id });
        const patentsWithAnalysis = [];
        for (const p of patents) {
            const analysis = await dbStore_1.dbStore.patentAnalysis.findOne({ patentId: p._id });
            patentsWithAnalysis.push({
                ...p,
                analysis
            });
        }
        return res.json(patentsWithAnalysis);
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to fetch portfolio.', error: error.message });
    }
}
// Get Pending Reviews (Admin only)
async function getPendingPatents(req, res) {
    try {
        const patents = await dbStore_1.dbStore.patents.find({ status: 'pending' });
        const patentsWithAnalysis = [];
        for (const p of patents) {
            const analysis = await dbStore_1.dbStore.patentAnalysis.findOne({ patentId: p._id });
            const owner = await dbStore_1.dbStore.users.findById(p.ownerId);
            patentsWithAnalysis.push({
                ...p,
                analysis,
                ownerName: owner ? owner.name : 'Unknown Owner',
                ownerOrganization: owner ? owner.organization : 'N/A'
            });
        }
        return res.json(patentsWithAnalysis);
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to fetch pending patents.', error: error.message });
    }
}
// Get Single Patent Details
async function getPatentById(req, res) {
    try {
        const { id } = req.params;
        const patent = await dbStore_1.dbStore.patents.findById(id);
        if (!patent) {
            return res.status(404).json({ message: 'Patent not found.' });
        }
        // Decode token if present
        let userId = '';
        let userRole = '';
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                const verified = jsonwebtoken_1.default.verify(token, auth_1.JWT_SECRET);
                userId = verified.id;
                userRole = verified.role;
            }
            catch (err) { }
        }
        const enriched = await checkAccessAndEnrich(patent, userId, userRole);
        return res.json(enriched);
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to fetch patent details.', error: error.message });
    }
}
// Review Patent (Admin only)
async function reviewPatent(req, res) {
    try {
        const authReq = req;
        const { id } = req.params;
        const { status } = req.body; // 'approved' | 'rejected'
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid review status.' });
        }
        const patent = await dbStore_1.dbStore.patents.findById(id);
        if (!patent) {
            return res.status(404).json({ message: 'Patent not found.' });
        }
        const updated = await dbStore_1.dbStore.patents.update(id, { status });
        await dbStore_1.dbStore.auditLogs.create({
            userId: authReq.user.id,
            action: `PATENT_REVIEW_${status.toUpperCase()}`,
            details: `Admin reviewed patent ${patent.patentNumber}: status set to ${status}`
        });
        return res.json({
            message: `Patent status updated to ${status}.`,
            patent: updated
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Patent review failed.', error: error.message });
    }
}
// Toggle Save Patent (Buyer only)
async function toggleSavePatent(req, res) {
    try {
        const authReq = req;
        const { id } = req.params;
        const patent = await dbStore_1.dbStore.patents.findById(id);
        if (!patent) {
            return res.status(404).json({ message: 'Patent not found.' });
        }
        const user = await dbStore_1.dbStore.users.findById(authReq.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        let saved = user.savedPatents || [];
        let isSavedNow = false;
        if (saved.includes(id)) {
            saved = saved.filter((pid) => pid !== id);
        }
        else {
            saved.push(id);
            isSavedNow = true;
        }
        await dbStore_1.dbStore.users.update(authReq.user.id, { savedPatents: saved });
        return res.json({
            message: isSavedNow ? 'Patent saved to bookmarks.' : 'Patent removed from bookmarks.',
            isSaved: isSavedNow,
            savedPatents: saved
        });
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to bookmark patent.', error: error.message });
    }
}
// Get Saved Patents (Buyer only)
async function getSavedPatents(req, res) {
    try {
        const authReq = req;
        const user = await dbStore_1.dbStore.users.findById(authReq.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const savedIds = user.savedPatents || [];
        const list = [];
        for (const pid of savedIds) {
            const p = await dbStore_1.dbStore.patents.findById(pid);
            if (p && p.status === 'approved') {
                const analysis = await dbStore_1.dbStore.patentAnalysis.findOne({ patentId: p._id });
                const owner = await dbStore_1.dbStore.users.findById(p.ownerId);
                list.push({
                    ...p,
                    analysis,
                    ownerName: owner ? owner.name : 'Unknown Owner',
                    ownerOrganization: owner ? owner.organization : 'N/A'
                });
            }
        }
        return res.json(list);
    }
    catch (error) {
        return res.status(500).json({ message: 'Failed to fetch bookmarked patents.', error: error.message });
    }
}
