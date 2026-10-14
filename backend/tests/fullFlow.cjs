// Browser -> production React build -> real Express routes -> isolated JSON persistence.
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert/strict');
const express = require('express');
const bcrypt = require('bcryptjs');
const { BrowserHarness } = require('./browserHarness.cjs');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'artifacts/e2e');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ipbridge-full-flow-'));
const database = path.join(directory, 'db.json');
const workspaceDb = path.join(root, 'backend/data/db.json');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const originalHash = hash(workspaceDb);
const cases = [];
let server;
const browser = new BrowserHarness();
const password = 'LocalFlowTest123!';
const actors = {
  owner: { name: 'Inventor E2E', email: 'inventor.e2e@example.test', organization: 'E2E Research', role: 'owner' },
  buyer: { name: 'Buyer E2E', email: 'buyer.e2e@example.test', organization: 'E2E Buyer Company', role: 'buyer' },
  admin: { name: 'Admin E2E', email: 'admin.e2e@example.test', organization: 'E2E Administration', role: 'admin' },
};
const abstract = 'This granted technology uses an industrial sensor network with a low-power microcontroller, calibrated pressure sensors and a local wireless gateway to monitor machine vibration and temperature. Measurements are synchronized and processed at the edge to identify abnormal operating conditions. The controller compares observed patterns against equipment-specific baselines and issues maintenance alerts without transmitting confidential production data to an external cloud. The device supports factory monitoring, energy optimization, predictive maintenance and licensing to industrial automation manufacturers. The architecture reduces inspection effort, preserves local control of operational data and provides repeatable calibration for deployment across multiple facilities.';

async function main() {
  fs.mkdirSync(output, { recursive: true });
  // Fail closed if the new isolated storage path has not been compiled yet.
  assert.ok(fs.readFileSync(path.join(root, 'backend/dist/services/dbStore.js'), 'utf8').includes('resolve(process.env.JSON_DB_PATH'), 'Rebuild the backend before running the full flow.');
  process.env.JSON_DB_PATH = database;
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  for (const key of ['GEMINI_API_KEY', 'LLM_API_KEY', 'MONGODB_URI', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_KEY_ID']) delete process.env[key];
  fs.writeFileSync(database, JSON.stringify(Object.fromEntries(['users','patents','patentAnalysis','interestRequests','meetingRequests','auditLogs','offers','ndaSignatures','transactions','accessRequests','searchHistory'].map(key => [key, []]))));
  const { dbStore, setUseMongo } = require('../dist/services/dbStore');
  setUseMongo(false);
  await dbStore.users.create({ ...actors.admin, passwordHash: await bcrypt.hash(password, 10) });
  assert.equal(JSON.parse(fs.readFileSync(database)).users.length, 1, 'The administrator must be persisted only to the isolated database.');
  const app = express(); app.use(express.json());
  app.use('/api', require('../dist/routes/api').default);
  app.get('/fixtures/grant.pdf', (_req, res) => res.type('application/pdf').send('%PDF-1.4\n1 0 obj <</Type/Catalog/Pages 2 0 R>> endobj\n2 0 obj <</Type/Pages/Kids[3 0 R]/Count 1>> endobj\n3 0 obj <</Type/Page/Parent 2 0 R/MediaBox[0 0 400 400]>> endobj\ntrailer <</Root 1 0 R>>\n%%EOF'));
  app.use(express.static(path.join(root, 'frontend/dist')));
  app.get('*', (_req, res) => res.sendFile(path.join(root, 'frontend/dist/index.html')));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const tokens = {};
  const api = async (role, endpoint, method = 'GET', body) => {
    const response = await fetch(`${origin}/api${endpoint}`, { method, headers: { 'Content-Type': 'application/json', ...(tokens[role] ? { Authorization: `Bearer ${tokens[role]}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  for (const role of ['owner', 'buyer']) {
    const result = await api('', '/auth/register', 'POST', { ...actors[role], password });
    assert.equal(result.status, 201); tokens[role] = result.body.token;
  }
  tokens.admin = (await api('', '/auth/login', 'POST', { email: actors.admin.email, password })).body.token;
  for (const account of JSON.parse(fs.readFileSync(database)).users) {
    assert.notEqual(account.passwordHash, password);
    assert.equal(await bcrypt.compare(password, account.passwordHash), true);
  }
  cases.push('Real account registration, hashed password persistence, and login');
  await browser.start();
  const login = async role => {
    await browser.go(`${origin}/auth`);
    await browser.until("document.readyState === 'complete' && (document.querySelector('input[type=password]') || location.pathname.startsWith('/dashboard') || document.body.innerText.includes('Get started'))");
    if (await browser.evaluate("location.pathname.startsWith('/dashboard')")) {
      await browser.click('Sign out');
      await browser.until("localStorage.getItem('pb_token') === null && !location.pathname.startsWith('/dashboard')");
      await browser.go(`${origin}/auth`);
      await browser.until("document.body.innerText.includes('Get started')");
    }
    if (!(await browser.evaluate("document.querySelector('input[type=password]') !== null"))) await browser.click('Sign in');
    await browser.until("document.querySelector('input[type=password]') !== null");
    await browser.fill('Email address', actors[role].email); await browser.fill('Password', password);
    await browser.click('Sign in'); await browser.until("location.pathname === '/dashboard' && document.body.innerText.includes('Welcome back')");
    assert.equal(await browser.evaluate("JSON.parse(localStorage.getItem('pb_user')).role"), role);
  };
  await login('owner');
  const created = [];
  for (const [index, type] of ['utility_patent','design','other'].entries()) {
    await browser.go(`${origin}/dashboard/assets?new=1`);
    await browser.until("document.querySelector('#listing-ip-type') !== null");
    await browser.fill('Patent or registration number', `E2E-GRANT-${index}`);
    await browser.fill('IP title', `Granted industrial monitoring ${type}`);
    await browser.choose('#listing-ip-type', type);
    if (type === 'other') { await browser.fill('Other IP type', 'Plant Patent'); await browser.choose('#listing-registration-status', 'granted'); }
    await browser.fill('Description / abstract', abstract);
    await browser.fill('Asking price', '1200000');
    assert.equal(await browser.evaluate("document.querySelector('[role=dialog] form').checkValidity()"), false, 'Empty PDF/confirmation must block submission.');
    await browser.fill('Official grant / registration PDF link', `${origin}/fixtures/grant.pdf`);
    await browser.evaluate("Array.from(document.querySelectorAll('label')).find(label => label.textContent.includes('I confirm that this IP')).querySelector('input').click()");
    await browser.click('Submit for review');
    await browser.until("document.querySelector('[role=dialog]') === null");
    const record = JSON.parse(fs.readFileSync(database)).patents.find(p => p.patentNumber === `E2E-GRANT-${index}`);
    assert.equal(record.ipType, type); assert.equal(record.status, 'pending'); assert.equal(record.pdfUrl, `${origin}/fixtures/grant.pdf`);
    created.push(record);
  }
  cases.push('Browser submissions of Utility Patent, Design, and Other, including mandatory PDF and declaration');
  assert.equal((await api('', '/patents')).body.length, 0);
  // These checks also catch API shortcuts that bypass the browser.
  assert.equal((await api('', '/patents?status=pending')).body.length, 0, 'Unreviewed submissions must not be publicly discoverable.');
  assert.equal((await api('buyer', '/patents/reviews?status=all')).status, 403);
  const invalid = { ...created[0], patentNumber: 'E2E-INVALID', registrationStatus: 'published' };
  assert.equal((await api('owner', '/patents', 'POST', invalid)).status, 400);
  const illegalAdmin = await api('', '/auth/register', 'POST', { name: 'Unauthorized Admin', email: 'outsider@example.test', password, role: 'admin' });
  assert.equal(illegalAdmin.status, 403, 'Public signup must not create administrator accounts.');
  cases.push('Missing PDF/ungranted and unauthorized-role rejection; pending listings hidden from public discovery');
  await login('admin'); await browser.go(`${origin}/dashboard/listings`);
  await browser.until("document.querySelector('#review-notes') !== null");
  await browser.choose('select[aria-label="Filter review status"]', 'pending');
  // Select the utility submission by its official number.
  await browser.evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes('E2E-GRANT-0')).click()");
  await browser.fill('Feedback for the inventor', 'Clarify the calibration procedure.');
  await browser.click('Request changes'); await browser.click('Confirm decision');
  await browser.until("document.body.innerText.includes('Feedback sent to the inventor')");
  await login('owner'); await browser.go(`${origin}/dashboard/assets`);
  await browser.until("document.body.innerText.includes('Clarify the calibration procedure.')");
  await browser.click('Revise and resubmit'); await browser.until("document.querySelector('#listing-ip-type') !== null");
  await browser.fill('Description / abstract', `${abstract} The calibration procedure uses three measured reference points before deployment.`);
  await browser.evaluate("Array.from(document.querySelectorAll('label')).find(label => label.textContent.includes('I confirm that this IP')).querySelector('input').click()");
  await browser.click('Submit for review'); await browser.until("document.querySelector('[role=dialog]') === null");
  cases.push('Admin requests changes; inventor sees feedback and resubmits through the browser');
  await login('admin'); await browser.go(`${origin}/dashboard/listings`);
  await browser.until("document.querySelector('#review-grant-verification') !== null");
  for (const record of created) {
    await browser.evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.includes(${JSON.stringify(record.patentNumber)})).click()`);
    assert.equal(await browser.evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Approve and publish').disabled"), true);
    await browser.evaluate("document.querySelector('#review-grant-verification').click()");
    await browser.click('Approve and publish'); await browser.click('Confirm decision');
    await browser.until("document.body.innerText.includes('Listing approved and published.')");
    const stored = JSON.parse(fs.readFileSync(database)).patents.find(p => p._id === record._id);
    assert.equal(stored.status, 'approved'); assert.ok(stored.grantReviewedAt);
  }
  await browser.screenshot(path.join(output, 'review-complete.png'));
  await login('buyer'); await browser.go(`${origin}/discover`);
  await browser.until("document.querySelectorAll('article').length >= 3");
  for (const type of ['Utility Patent','Design','Other · Plant Patent']) assert.equal(await browser.evaluate(`document.body.innerText.includes(${JSON.stringify(type)})`), true);
  cases.push('All three approved IP types appear in the real marketplace after review');
  const locked = await api('buyer', `/patents/${created[0]._id}`);
  assert.equal(locked.body.accessStatus, 'none'); assert.equal(locked.body.pdfUrl, undefined);
  await browser.go(`${origin}/marketplace/${created[0]._id}`);
  await browser.until("Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'Unlock details')");
  await browser.click('Unlock details'); await browser.until("document.querySelector('[role=dialog]') !== null");
  await browser.fill('Message', 'Evaluate licensing this technology for factory monitoring.');
  await browser.click('Continue to NDA'); await browser.until("document.body.innerText.toLowerCase().includes('full legal name')");
  await browser.evaluate("Array.from(document.querySelectorAll('label')).find(label => label.textContent.includes('I have read the NDA')).querySelector('input').click()");
  await browser.click('Accept NDA'); await browser.until("document.body.innerText.includes('Review unlock request')");
  await browser.click('Submit unlock request'); await browser.until("document.body.innerText.includes('Awaiting inventor approval')");
  let stored = JSON.parse(fs.readFileSync(database));
  assert.equal(stored.ndaSignatures.length, 1); assert.equal(stored.accessRequests.length, 1); assert.equal(stored.ndaSignatures[0].acceptanceMethod, 'typed_name');
  await login('owner'); await browser.go(`${origin}/dashboard/access-requests`);
  await browser.until("document.body.innerText.includes('Buyer E2E')"); await browser.click('Approve access');
  await browser.until("!Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'Approve access')");
  assert.equal(JSON.parse(fs.readFileSync(database)).accessRequests[0].status, 'approved');
  await login('buyer'); await browser.go(`${origin}/marketplace/${created[0]._id}`);
  await browser.until("document.body.innerText.includes('Granted industrial monitoring utility_patent')");
  const unlocked = await api('buyer', `/patents/${created[0]._id}`);
  assert.equal(unlocked.body.accessStatus, 'approved'); assert.equal(unlocked.body.pdfUrl, `${origin}/fixtures/grant.pdf`);
  await browser.click('Technical');
  await browser.until("document.body.innerText.includes('Download PDF')");
  assert.equal(await browser.evaluate(`Array.from(document.querySelectorAll('a')).some(link => link.href === ${JSON.stringify(`${origin}/fixtures/grant.pdf`)})`), true);
  await browser.screenshot(path.join(output, 'buyer-unlocked.png'));
  cases.push('Buyer NDA acceptance and unlock request; inventor approves; buyer sees details and PDF');
  stored = JSON.parse(fs.readFileSync(database));
  assert.equal(stored.patents[0].reviewHistory.length, 2);
  assert.equal(stored.patents.every(record => record.status === 'approved'), true);
  assert.equal(hash(workspaceDb), originalHash); assert.equal(browser.errors.length, 0, browser.errors.join('\n'));
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ passed: true, testedAt: new Date().toISOString(), cases, storage: 'Isolated JSON database', externalAI: 'Real local fallback; external providers not contacted', productionDatabaseUnchanged: true }, null, 2));
  console.log(JSON.stringify({ passed: true, cases, storage: 'Isolated JSON database', report: path.join(output, 'report.json') }, null, 2));
}
main().catch(async error => {
  console.error(error.stack || error.message); process.exitCode = 1;
  if (browser.ws) await browser.screenshot(path.join(output, 'failure.png')).catch(() => {});
  fs.mkdirSync(output, { recursive: true }); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ passed: false, completed: cases, error: error.message }, null, 2));
}).finally(async () => {
  await browser.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  assert.equal(hash(workspaceDb), originalHash, 'Workspace database was unexpectedly modified.');
});
