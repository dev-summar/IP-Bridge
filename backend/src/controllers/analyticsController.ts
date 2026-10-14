import { Request, Response } from 'express';
import { dbStore } from '../services/dbStore';
import { IAuthRequest } from '../middleware/auth';

export async function getDashboardAnalytics(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { role, id: userId } = authReq.user!;
    
    // Fetch base datasets
    const users = await dbStore.users.find();
    const patents = await dbStore.patents.find();
    const leads = await dbStore.interestRequests.find();
    const meetings = await dbStore.meetingRequests.find();
    const logs = await dbStore.auditLogs.find();
    const offers = await dbStore.offers.find();
    const transactions = await dbStore.transactions.find();

    // Monthly counts from stored records; no fabricated views, revenue, or market index.
    const activitySeries = Array.from({ length: 6 }, (_, index) => {
      const now = new Date();
      const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const inMonth = (record: any) => {
        const date = new Date(record.createdAt);
        return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
      };
      return {
        month: month.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        submissions: patents.filter(p => (role === 'admin' || p.ownerId === userId) && inMonth(p)).length,
        inquiries: leads.filter(l => (role === 'admin' || (role === 'buyer' ? l.buyerId === userId : l.ownerId === userId)) && inMonth(l)).length,
      };
    });

    // 1. ADMIN ANALYTICS
    if (role === 'admin') {
      const totalUsers = users.length;
      const totalPatents = patents.length;
      const pendingReviews = patents.filter(p => p.status === 'pending').length;
      const publishedPatents = patents.filter(p => p.status === 'approved').length;
      const totalLeads = leads.length;
      
      // Calculate industry breakdown for charts
      const industryMap: Record<string, number> = {};
      for (const p of patents) {
        const analysis = await dbStore.patentAnalysis.findOne({ patentId: p._id });
        if (analysis && analysis.industryClassification) {
          analysis.industryClassification.forEach((ind: string) => {
            industryMap[ind] = (industryMap[ind] || 0) + 1;
          });
        }
      }
      
      const industryStats = Object.keys(industryMap).map(name => ({
        name,
        value: industryMap[name]
      }));

      // Top 5 recent audit logs
      const recentLogs = logs.slice(0, 8).map(l => {
        const u = users.find(usr => usr._id === l.userId);
        return {
          id: l._id,
          action: l.action,
          details: l.details,
          userName: u ? u.name : 'System',
          createdAt: l.createdAt
        };
      });

      // Calculate financial metrics for treasury
      let gmv = 0;
      let commissions = 0;
      let activeEscrow = 0;

      for (const t of transactions) {
        if (t.status === 'escrow_funded' || t.status === 'completed') {
          gmv += t.amount;
          commissions += t.commissionAmount;
        }
        if (t.status === 'escrow_funded') {
          const unreleasedMilestones = t.milestones.filter((m: any) => m.status === 'pending');
          const tActiveEscrow = unreleasedMilestones.reduce((sum: number, m: any) => sum + m.amount, 0);
          activeEscrow += tActiveEscrow;
        }
      }

      const subscriptionRevenue = null;

      // Generate last 6 months time series data for the area chart
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const timeSeries = [];
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mName = months[d.getMonth()];
        const year = d.getFullYear();
        const label = `${mName} ${year}`;
        
        let monthGmv = 0;
        let monthCommissions = 0;
        for (const t of transactions) {
          const tDate = new Date(t.createdAt || t.updatedAt);
          if (tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear()) {
            if (t.status === 'escrow_funded' || t.status === 'completed') {
              monthGmv += t.amount;
              monthCommissions += t.commissionAmount;
            }
          }
        }
        
        const baseGmv = monthGmv;
        const baseComm = monthCommissions;
        const baseSubs = subscriptionRevenue;

        timeSeries.push({
          month: label,
          gmv: baseGmv,
          commissions: baseComm,
          subscriptions: baseSubs
        });
      }

      return res.json({
        role,
        activitySeries,
        stats: [
          { label: 'Total Platform Users', value: totalUsers, change: 'Registered accounts', type: 'users' },
          { label: 'Total Patents Filed', value: totalPatents, change: 'Submitted listings', type: 'patents' },
          { label: 'Pending Reviews', value: pendingReviews, change: 'Requires action', type: 'pending', urgent: pendingReviews > 0 },
          { label: 'Approved & Listed', value: publishedPatents, change: 'Active in market', type: 'approved' },
          { label: 'Commercial Enquiries', value: totalLeads, change: 'Qualified leads generated', type: 'leads' }
        ],
        treasury: {
          gmv,
          commissions,
          activeEscrow,
          subscriptionRevenue,
          timeSeries
        },
        industryStats,
        recentLogs
      });
    }

    // 2. OWNER PORTFOLIO ANALYTICS (+ institution benchmarking / ranking)
    if (role === 'owner') {
      const me = users.find(u => u._id === userId || String(u._id) === String(userId));
      const myOrg = (me?.organization || '').trim();
      const myPatents = patents.filter(p => p.ownerId === userId);
      const myPublished = myPatents.filter(p => p.status === 'approved');
      const myPending = myPatents.filter(p => p.status === 'pending');
      const myLeads = leads.filter(l => l.ownerId === userId);
      const myMeetings = meetings.filter(m => m.ownerId === userId);

      // Average commercial potential score for owner's portfolio
      let totalScore = 0;
      let scoreCount = 0;
      let totalReadiness = 0;
      let readinessCount = 0;
      let prototypeCount = 0;
      let productCount = 0;
      const myPatentRows: any[] = [];

      for (const p of myPatents) {
        const analysis = await dbStore.patentAnalysis.findOne({ patentId: p._id });
        if (analysis) {
          totalScore += analysis.commercialPotentialScore;
          scoreCount++;
        }
        if (typeof p.readinessScore === 'number') {
          totalReadiness += p.readinessScore;
          readinessCount++;
        }
        if (p.hasPrototype) prototypeCount++;
        if (p.hasProduct) productCount++;
        myPatentRows.push({
          ipType: p.ipType, otherIpType: p.otherIpType,
          id: p._id,
          title: p.title,
          status: p.status,
          commercialPotentialScore: analysis?.commercialPotentialScore ?? null,
          trlLevel: p.trlLevel ?? analysis?.readinessAssessment?.trlLevel ?? null,
          readinessScore: p.readinessScore ?? null,
          hasPrototype: !!p.hasPrototype,
          hasProduct: !!p.hasProduct,
          askingPrice: p.askingPrice || 0,
          suggestedSaleMaxInr: analysis?.pricingGuidance?.suggestedSaleMaxInr ?? null,
        });
      }
      const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
      const avgReadiness = readinessCount > 0 ? Math.round(totalReadiness / readinessCount) : 0;

      // --- Institution benchmarking & individual ranking ---
      const owners = users.filter(u => u.role === 'owner');
      const ownerMetrics: {
        userId: string;
        name: string;
        organization: string;
        patentCount: number;
        publishedCount: number;
        avgCommercialScore: number;
        leadCount: number;
        dealCount: number;
        rankScore: number;
      }[] = [];

      for (const owner of owners) {
        const oPatents = patents.filter(p => String(p.ownerId) === String(owner._id));
        let oScoreSum = 0;
        let oScoreN = 0;
        for (const p of oPatents) {
          const a = await dbStore.patentAnalysis.findOne({ patentId: p._id });
          if (a) {
            oScoreSum += a.commercialPotentialScore;
            oScoreN++;
          }
        }
        const oAvg = oScoreN > 0 ? oScoreSum / oScoreN : 0;
        const oLeads = leads.filter(l => String(l.ownerId) === String(owner._id)).length;
        const oDeals = offers.filter(o => String(o.ownerId) === String(owner._id)).length;
        const published = oPatents.filter(p => p.status === 'approved').length;
        // Composite rank: portfolio size, quality, engagement
        const rankScore =
          published * 12 +
          oAvg * 0.45 +
          oLeads * 4 +
          oDeals * 8 +
          oPatents.filter((p: any) => p.hasPrototype || p.hasProduct).length * 5;

        ownerMetrics.push({
          userId: String(owner._id),
          name: owner.name,
          organization: owner.organization || 'Independent',
          patentCount: oPatents.length,
          publishedCount: published,
          avgCommercialScore: Math.round(oAvg),
          leadCount: oLeads,
          dealCount: oDeals,
          rankScore: Math.round(rankScore),
        });
      }

      ownerMetrics.sort((a, b) => b.rankScore - a.rankScore);
      const myRankIndex = ownerMetrics.findIndex(o => o.userId === String(userId));
      const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;
      const platformOwnerCount = ownerMetrics.length;

      // Org peer set
      const orgPeers = myOrg
        ? ownerMetrics.filter(o => o.organization.toLowerCase() === myOrg.toLowerCase())
        : [];
      const orgPeerRankIndex = orgPeers.findIndex(o => o.userId === String(userId));
      const orgAvgCommercial =
        orgPeers.length > 0
          ? Math.round(
              orgPeers.reduce((s, o) => s + o.avgCommercialScore, 0) / orgPeers.length
            )
          : null;
      const orgAvgPatents =
        orgPeers.length > 0
          ? Math.round(
              (orgPeers.reduce((s, o) => s + o.patentCount, 0) / orgPeers.length) * 10
            ) / 10
          : null;

      // Institution leaderboard (aggregate by organization)
      const orgMap = new Map<string, {
        organization: string;
        inventors: number;
        patents: number;
        published: number;
        avgCommercialScore: number;
        leads: number;
        scoreSum: number;
        scoreN: number;
      }>();

      for (const m of ownerMetrics) {
        const key = m.organization.toLowerCase();
        const cur = orgMap.get(key) || {
          organization: m.organization,
          inventors: 0,
          patents: 0,
          published: 0,
          avgCommercialScore: 0,
          leads: 0,
          scoreSum: 0,
          scoreN: 0,
        };
        cur.inventors += 1;
        cur.patents += m.patentCount;
        cur.published += m.publishedCount;
        cur.leads += m.leadCount;
        if (m.avgCommercialScore > 0) {
          cur.scoreSum += m.avgCommercialScore;
          cur.scoreN += 1;
        }
        orgMap.set(key, cur);
      }

      const institutionLeaderboard = [...orgMap.values()]
        .map(o => ({
          organization: o.organization,
          inventors: o.inventors,
          patents: o.patents,
          published: o.published,
          leads: o.leads,
          avgCommercialScore: o.scoreN > 0 ? Math.round(o.scoreSum / o.scoreN) : 0,
          benchmarkScore: Math.round(
            o.published * 10 +
              (o.scoreN > 0 ? o.scoreSum / o.scoreN : 0) * 0.5 +
              o.leads * 3 +
              o.inventors * 5
          ),
        }))
        .sort((a, b) => b.benchmarkScore - a.benchmarkScore);

      const myInstitutionRank = myOrg
        ? institutionLeaderboard.findIndex(
            i => i.organization.toLowerCase() === myOrg.toLowerCase()
          ) + 1 || null
        : null;

      // Active leads info
      const recentLeads = myLeads.slice(0, 5).map(l => {
        const p = myPatents.find(pat => pat._id === l.patentId);
        return {
          id: l._id,
          buyerName: l.name,
          buyerOrg: l.organization,
          patentTitle: p ? p.title : 'My Patent',
          status: l.status,
          createdAt: l.createdAt
        };
      });

      return res.json({
        role,
        activitySeries,
        stats: [
          { label: 'Portfolio Size', value: myPatents.length, change: 'Total patents registered', type: 'patents' },
          { label: 'Published Listings', value: myPublished.length, change: 'Active in marketplace', type: 'published' },
          { label: 'Under AI/Admin Review', value: myPending.length, change: 'Awaiting verification', type: 'pending' },
          { label: 'Changes Requested', value: myPatents.filter(p => p.status === 'changes_requested').length, change: 'Review feedback in your portfolio', type: 'pending', urgent: myPatents.some(p => p.status === 'changes_requested') },
          { label: 'Commercial Leads', value: myLeads.length, change: `${myLeads.filter(l => l.status === 'new').length} new enquiries`, type: 'leads' },
          { label: 'Meeting Invites', value: myMeetings.length, change: `${myMeetings.filter(m => m.status === 'pending').length} pending approval`, type: 'meetings' },
          { label: 'Active Deals', value: offers.filter(o => o.ownerId === userId && ['pending', 'countered'].includes(o.status)).length, change: 'Offers pending review', type: 'deals' },
          { label: 'Avg Portfolio Score', value: `${avgScore}/100`, change: 'Based on AI analysis', type: 'score' },
          { label: 'Avg Readiness', value: readinessCount ? `${avgReadiness}/100` : '—', change: `${prototypeCount} prototypes · ${productCount} products`, type: 'readiness' },
          { label: 'Platform Rank', value: myRank ? `#${myRank} of ${platformOwnerCount}` : '—', change: 'Among individual inventors', type: 'rank' },
        ],
        recentLeads,
        upcomingMeetingsCount: myMeetings.filter(m => m.status === 'accepted').length,
        portfolioPatents: myPatentRows.sort(
          (a, b) => (b.commercialPotentialScore || 0) - (a.commercialPotentialScore || 0)
        ),
        benchmarking: {
          organization: myOrg || null,
          individual: {
            platformRank: myRank,
            platformInventors: platformOwnerCount,
            percentile:
              myRank && platformOwnerCount
                ? Math.round(((platformOwnerCount - myRank + 1) / platformOwnerCount) * 100)
                : null,
            avgCommercialScore: avgScore,
            orgPeerRank: orgPeerRankIndex >= 0 ? orgPeerRankIndex + 1 : null,
            orgPeerCount: orgPeers.length,
          },
          institution: {
            rank: myInstitutionRank,
            totalInstitutions: institutionLeaderboard.length,
            peerAvgCommercialScore: orgAvgCommercial,
            peerAvgPatents: orgAvgPatents,
            vsOrgCommercialDelta:
              orgAvgCommercial != null ? avgScore - orgAvgCommercial : null,
          },
          topIndividuals: ownerMetrics.slice(0, 10).map((o, idx) => ({
            rank: idx + 1,
            name: o.name,
            organization: o.organization,
            publishedCount: o.publishedCount,
            avgCommercialScore: o.avgCommercialScore,
            isYou: o.userId === String(userId),
          })),
          institutionLeaderboard: institutionLeaderboard.slice(0, 10).map((o, idx) => ({
            rank: idx + 1,
            ...o,
            isYourOrg: myOrg
              ? o.organization.toLowerCase() === myOrg.toLowerCase()
              : false,
          })),
        },
      });
    }

    // 3. BUYER EXPLORATION ANALYTICS
    if (role === 'buyer') {
      const user = users.find(u => u._id === userId);
      const savedCount = user ? (user.savedPatents || []).length : 0;
      const mySentLeads = leads.filter(l => l.buyerId === userId);
      const mySentMeetings = meetings.filter(m => m.buyerId === userId);

      // Latest high scoring patents in market
      const approvedPatents = patents.filter(p => p.status === 'approved');
      const approvedWithAnalysis = [];
      for (const p of approvedPatents) {
        const analysis = await dbStore.patentAnalysis.findOne({ patentId: p._id });
        approvedWithAnalysis.push({
          ipType: p.ipType, otherIpType: p.otherIpType,
          id: p._id,
          title: p.title,
          patentNumber: p.patentNumber,
          score: analysis ? analysis.commercialPotentialScore : 0,
          industries: analysis ? analysis.industryClassification : []
        });
      }

      // Sort by score descending and take top 3
      const recommendedPatents = approvedWithAnalysis
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);

      const myOffers = offers.filter(o => o.buyerId === userId);
      const myTransactions = transactions.filter(t => {
        const offer = myOffers.find(o => o._id === t.offerId);
        return !!offer;
      });

      const recentDeals = myOffers
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 6)
        .map(o => {
          const p = patents.find(pat => pat._id === o.patentId);
          const tx = transactions.find(t => t.offerId === o._id);
          return {
            id: o._id,
            patentTitle: p ? p.title : 'IP Asset',
            price: o.price,
            status: o.status,
            escrowStatus: tx?.status || null,
            createdAt: o.createdAt,
          };
        });

      const recentRequests = mySentLeads
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 5)
        .map(l => {
          const p = patents.find(pat => pat._id === l.patentId);
          return {
            id: l._id,
            patentTitle: p ? p.title : 'IP Asset',
            status: l.status,
            createdAt: l.createdAt,
          };
        });

      return res.json({
        role,
        activitySeries,
        stats: [
          { label: 'Saved Patents', value: savedCount, change: 'Monitored opportunities', type: 'saved' },
          { label: 'Unlock Requests', value: mySentLeads.length, change: 'Interest & access submissions', type: 'leads' },
          { label: 'Meetings', value: mySentMeetings.length, change: 'Scheduled with inventors', type: 'meetings' },
          { label: 'Active Offers', value: myOffers.filter(o => ['pending', 'countered', 'accepted'].includes(o.status)).length, change: 'In negotiation or escrow', type: 'deals' },
          { label: 'In Escrow', value: myTransactions.filter(t => t.status === 'escrow_funded').length, change: 'Funded transactions', type: 'escrow' },
          { label: 'Completed', value: myTransactions.filter(t => t.status === 'completed').length, change: 'Successfully closed', type: 'completed' },
        ],
        recommendedPatents,
        activeSchedules: mySentMeetings.map(m => {
          const p = patents.find(pat => pat._id === m.patentId);
          return {
            id: m._id,
            patentTitle: p ? p.title : 'Patent Opportunity',
            date: m.preferredDate,
            time: m.preferredTime,
            status: m.status
          };
        }),
        recentDeals,
        recentRequests,
      });
    }

    return res.status(400).json({ message: 'Unknown role or unauthorized.' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to retrieve dashboard analytics.', error: error.message });
  }
}
