const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { planRetirement, retireDemoAccounts } = require('../retireDemoAccounts');
const { dbStore } = require('../dist/services/dbStore');
const { authenticateToken, JWT_SECRET } = require('../dist/middleware/auth');

const email = 'inventor@example.org';
function fixture() {
  return {
    users: [
      { _id: 'admin-1', email: 'admin@patentbridge.com', role: 'admin' },
      { _id: 'admin-2', email: 'admin@patentbridge.com', role: 'admin' },
      { _id: 'owner-demo', email: 'owner@patentbridge.com', role: 'owner' },
      { _id: 'buyer-demo', email: 'buyer@patentbridge.com', role: 'buyer' },
      { _id: 'buyer-real', email: 'real@example.org', role: 'buyer' },
    ],
    patents: [
      { _id: 'demo-patent', ownerId: 'owner-demo', title: 'Keep this listing' },
      { _id: 'real-patent', ownerId: 'real-owner', title: 'Unrelated listing' },
    ],
    offers: [{ _id: 'offer', ownerId: 'owner-demo', buyerId: 'buyer-real' }],
    transactions: [{ _id: 'transaction', ownerId: 'owner-demo', buyerId: 'buyer-demo' }],
    patentAnalysis: [{ patentId: 'demo-patent', score: 90 }],
    auditLogs: [{ userId: 'buyer-demo', action: 'Historic action' }],
  };
}

test('preview identifies duplicate demo admins and only demo owner references', () => {
  const data = fixture();
  const before = JSON.stringify(data);
  const plan = planRetirement(data, email);
  assert.equal(plan.demoUsers.length, 4);
  assert.deepEqual(plan.transfers.patents.map(record => record._id), ['demo-patent']);
  assert.equal(plan.transfers.offers.length, 1);
  assert.equal(JSON.stringify(data), before);
});

test('rejects demo destinations, duplicate destinations, and non-inventor accounts', () => {
  assert.throws(() => planRetirement(fixture(), 'owner@patentbridge.com'), /real inventor/);
  assert.throws(() => planRetirement(fixture(), 'real@example.org'), /owner role/);
  const data = fixture();
  data.users.push({ email, role: 'owner' }, { email, role: 'owner' });
  assert.throws(() => planRetirement(data, email), /Multiple accounts/);
});

test('JSON cleanup transfers listings and deal ownership while preserving real users and history', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ipbridge-retirement-'));
  const jsonPath = path.join(directory, 'db.json');
  const original = fixture();
  fs.writeFileSync(jsonPath, JSON.stringify(original));
  await retireDemoAccounts({ store: 'json', email, apply: false, jsonPath });
  assert.deepEqual(JSON.parse(fs.readFileSync(jsonPath)), original);
  await assert.rejects(retireDemoAccounts({ store: 'json', email, apply: true, jsonPath }), /OWNER_PASSWORD/);
  assert.deepEqual(JSON.parse(fs.readFileSync(jsonPath)), original);
  await retireDemoAccounts({ store: 'json', email, apply: true, jsonPath, password: 'TestPass123' });
  const after = JSON.parse(fs.readFileSync(jsonPath));
  assert.equal(after.users.length, 2);
  const owner = after.users.find(user => user.email === email);
  assert.equal(owner.role, 'owner');
  assert.equal(await bcrypt.compare('TestPass123', owner.passwordHash), true);
  assert.equal(after.patents[0].ownerId, owner._id);
  assert.equal(after.offers[0].ownerId, owner._id);
  assert.equal(after.transactions[0].ownerId, owner._id);
  assert.equal(after.transactions[0].buyerId, 'buyer-demo');
  assert.deepEqual(after.patents[1], original.patents[1]);
  assert.deepEqual(after.patentAnalysis, original.patentAnalysis);
  assert.deepEqual(after.auditLogs, original.auditLogs);
  const saved = fs.readFileSync(jsonPath, 'utf8');
  await retireDemoAccounts({ store: 'json', email, apply: true, jsonPath });
  assert.equal(fs.readFileSync(jsonPath, 'utf8'), saved);
});

test('existing inventor is reused without creating a duplicate', () => {
  const data = fixture();
  data.users.push({ _id: 'existing-owner', email, role: 'owner' });
  assert.equal(planRetirement(data, email).target._id, 'existing-owner');
});

test('deleted accounts lose access with a previously valid token', async () => {
  const findById = dbStore.users.findById;
  dbStore.users.findById = async () => null;
  try {
    const req = { headers: { authorization: `Bearer ${jwt.sign({ id: 'deleted-owner', role: 'owner' }, JWT_SECRET)}` } };
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    let called = false;
    await authenticateToken(req, res, () => { called = true; });
    assert.equal(res.code, 401);
    assert.equal(called, false);
  } finally {
    dbStore.users.findById = findById;
  }
});

test('active sessions use the current account role instead of stale token claims', async () => {
  const findById = dbStore.users.findById;
  dbStore.users.findById = async () => ({ _id: 'active', role: 'buyer', email: 'active@example.org', name: 'Active' });
  try {
    const req = { headers: { authorization: `Bearer ${jwt.sign({ id: 'active', role: 'admin' }, JWT_SECRET)}` } };
    const res = { status() { assert.fail('Active account should authenticate'); } };
    let called = false;
    await authenticateToken(req, res, () => { called = true; });
    assert.equal(called, true);
    assert.equal(req.user.role, 'buyer');
  } finally {
    dbStore.users.findById = findById;
  }
});
