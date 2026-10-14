const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { dbStore } = require('../dist/services/dbStore');
const ai = require('../dist/services/aiParser');
const { JWT_SECRET } = require('../dist/middleware/auth');
const router = require('../dist/routes/api').default;

test('review API enforces roles, records feedback, handles revisions, and removes simulated verification', async () => {
  const restores = [];
  const stub = (object, key, replacement) => { const old = object[key]; object[key] = replacement; restores.push(() => { object[key] = old; }); };
  const users = ['admin', 'owner', 'buyer'].map(role => ({ _id: role, role, email: `${role}@example.org`, name: role, organization: 'Test institution' }));
  users.push({ _id: 'other-owner', role: 'owner', email: 'other@example.org', name: 'Other', organization: 'Other institution' });
  const evidence = { pdfUrl: 'https://example.org/grant.pdf', ipType: 'utility_patent', registrationStatus: 'granted', grantConfirmed: true };
  const patents = [{ _id: 'patent', ownerId: 'owner', patentNumber: 'IN-TEST', status: 'pending', title: 'Technology', abstract: 'A technology summary', createdAt: new Date(), ...evidence }];
  const logs = [];
  const signatures = [];
  let analysisWrites = 0;
  stub(dbStore.users, 'findById', async id => users.find(user => user._id === id) || null);
  stub(dbStore.users, 'find', async () => users);
  stub(dbStore.patents, 'find', async (filter = {}) => patents.filter(p => Object.entries(filter).every(([key, value]) => p[key] === value)));
  stub(dbStore.patents, 'findById', async id => patents.find(p => p._id === id) || null);
  stub(dbStore.patents, 'updateIfStatus', async (id, status, updates) => {
    const patent = patents.find(p => p._id === id && p.status === status);
    if (!patent) return null;
    Object.assign(patent, updates); return { ...patent };
  });
  stub(dbStore.patentAnalysis, 'findOne', async () => null);
  stub(dbStore.patentAnalysis, 'upsert', async () => { analysisWrites++; });
  stub(ai, 'analyzePatentWithAI', async () => ({ commercialPotentialScore: 75, summary: { description: 'Updated analysis' } }));
  stub(dbStore.auditLogs, 'create', async data => { logs.push(data); return data; });
  stub(dbStore.auditLogs, 'find', async () => logs);
  for (const repository of ['interestRequests', 'meetingRequests', 'offers', 'transactions']) stub(dbStore[repository], 'find', async () => []);
  stub(dbStore.ndaSignatures, 'findOne', async ({ patentId, buyerId }) => signatures.find(s => s.patentId === patentId && s.buyerId === buyerId) || null);
  stub(dbStore.ndaSignatures, 'create', async data => { signatures.push(data); return data; });
  stub(dbStore.accessRequests, 'findOne', async () => null);
  const app = express(); app.use(express.json()); app.use('/api', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const request = async (role, url, method = 'GET', body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${url}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign({ id: role, role }, JWT_SECRET)}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  try {
    assert.equal((await request('buyer', '/patents/reviews?status=all')).status, 403);
    assert.equal((await request('owner', '/patents/patent/review', 'PUT', { status: 'approved' })).status, 403);
    assert.equal((await request('admin', '/patents/patent/review', 'PUT', { status: 'changes_requested' })).status, 400);
    let result = await request('admin', '/patents/patent/review', 'PUT', { status: 'changes_requested', notes: 'Clarify the prototype results.' });
    assert.equal(result.status, 200);
    assert.equal(result.body.patent.reviewHistory[0].notes, 'Clarify the prototype results.');
    assert.equal(result.body.patent.reviewHistory[0].reviewerId, 'admin');
    assert.equal((await request('admin', '/patents/patent/review', 'PUT', { status: 'approved' })).status, 409);
    result = await request('owner', '/patents/my-portfolio');
    assert.equal(result.body[0].status, 'changes_requested');
    assert.equal(result.body[0].reviewHistory.length, 1);
    assert.equal((await request('buyer', '/patents/patent/resubmit', 'POST', {})).status, 403);
    assert.equal((await request('other-owner', '/patents/patent/resubmit', 'POST', {})).status, 403);
    assert.equal((await request('buyer', '/patents/patent')).status, 404);
    assert.equal((await request('owner', '/patents/patent/resubmit', 'POST', { title: 'Revised', abstract: 'Updated', askingPrice: -1, isForLicense: true })).status, 400);
    assert.equal((await request('owner', '/patents/patent/resubmit', 'POST', { title: 'Revised title', abstract: 'Updated', askingPrice: 120000, isForLicense: true })).status, 400);
    result = await request('owner', '/patents/patent/resubmit', 'POST', { title: 'Revised title', abstract: 'Added prototype results.', askingPrice: 120000, isForLicense: true, ...evidence });
    assert.equal(result.status, 200);
    assert.equal(result.body.patent.status, 'pending');
    assert.equal(result.body.patent.ownerId, 'owner');
    assert.equal(result.body.patent.reviewHistory.length, 1);
    assert.equal(analysisWrites, 1);
    assert.equal((await request('admin', '/patents/reviews?status=pending')).body.length, 1);
    assert.equal((await request('admin', '/patents/patent/review', 'PUT', { status: 'approved' })).status, 400);
    assert.equal((await request('admin', '/patents/patent/review', 'PUT', { status: 'approved', grantVerified: true, reviewedPdfUrl: 'https://example.org/old.pdf' })).status, 409);
    result = await request('admin', '/patents/patent/review', 'PUT', { status: 'approved', notes: 'Ready to publish.', grantVerified: true, reviewedPdfUrl: evidence.pdfUrl });
    assert.equal(result.status, 200);
    assert.equal(result.body.patent.reviewHistory.length, 2);
    assert.equal(result.body.patent.grantReviewedBy, 'admin');
    assert.equal(result.body.patent.grantReviewedPdfUrl, evidence.pdfUrl);
    assert.equal((await request('buyer', '/patents/patent')).body.reviewHistory, undefined);
    assert.equal((await request('buyer', '/patents/patent')).body.grantReviewedPdfUrl, undefined);
    assert.equal((await request('deleted-admin', '/patents/patent')).body.reviewHistory, undefined);
    assert.equal((await request('owner', '/patents/patent/resubmit', 'POST', {})).status, 409);
    assert.equal((await request('buyer', '/patents/patent/nda/sign', 'POST', { fullName: 'Test Buyer', aadhaarNumber: '123456789012' })).status, 400);
    result = await request('buyer', '/patents/patent/nda/sign', 'POST', { fullName: 'Test Buyer', accepted: true });
    assert.equal(result.status, 201);
    assert.equal(result.body.signature.acceptanceMethod, 'typed_name');
    assert.equal(result.body.signature.aadhaarNumber, undefined);
    const before = logs.length;
    assert.equal((await request('buyer', '/transactions/unused/fund', 'POST', {})).status, 410);
    assert.equal(logs.length, before);
    result = await request('admin', '/analytics/dashboard');
    assert.equal(result.status, 200);
    assert.equal(result.body.treasury.gmv, 0);
    assert.equal(result.body.treasury.subscriptionRevenue, null);
    assert.equal(result.body.treasury.timeSeries.every(month => month.gmv === 0 && month.commissions === 0), true);
    assert.equal(result.body.activitySeries.reduce((total, month) => total + month.submissions, 0), 1);
  } finally {
    await new Promise(resolve => server.close(resolve));
    restores.reverse().forEach(restore => restore());
  }
});
