// Run against the built frontend with isolated HTTP fixtures; never connects to MongoDB.
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');
const assert = require('assert/strict');

const root = path.resolve(__dirname, '../..');
const dist = path.join(root, 'frontend/dist');
const screenshots = path.join(root, 'artifacts/ui-preview');
const now = new Date().toISOString();
const users = Object.fromEntries(['admin', 'owner', 'buyer'].map(role => [role, { id: role, role, name: `${role[0].toUpperCase() + role.slice(1)} Preview`, organization: 'Preview Research Institute', email: `${role}@example.org`, savedPatents: [] }]));
const listings = ['pending', 'changes_requested', 'approved', 'approved', 'approved'].map((status, index) => ({
  _id: `listing-${index}`, ownerId: 'owner', ownerName: 'Inventor Preview', ownerOrganization: 'Preview Research Institute',
  title: ['Low-power sensor for industrial monitoring', 'Battery materials for efficient energy storage', 'Portable system for water quality testing', 'Low-power sensor for industrial monitoring', 'Battery materials for efficient energy storage'][index],
  patentNumber: `IN-PREVIEW-${index}`, abstract: 'A compact technology designed to improve measurement accuracy and reduce maintenance costs in practical field applications.',
  status, accessStatus: 'approved', askingPrice: 1200000, isForSale: true, isForLicense: true, trlLevel: 6, createdAt: now, updatedAt: now,
  ipType: ['utility_patent', 'design', 'utility_patent', 'design', 'other'][index],
  otherIpType: index === 4 ? 'Plant Patent' : '', registrationStatus: [1, 3].includes(index) ? 'registered' : 'granted',
  grantConfirmed: true, pdfUrl: 'https://example.org/official-grant.pdf',
  analysis: { commercialPotentialScore: 78, industryClassification: ['Industrial technology'], summary: { description: 'Technology summary', problemSolved: 'Reduces manual inspection and improves monitoring reliability.' } },
  reviewHistory: status === 'changes_requested' ? [{ status, notes: 'Add prototype validation results.', reviewerId: 'admin', reviewerName: 'Admin Preview', reviewedAt: now }] : [],
}));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let server, browser, ws;
let nextId = 0;
const pending = new Map();
async function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result?.value;
}
async function until(expression) {
  for (let attempt = 0; attempt < 80; attempt++) { if (await evaluate(expression)) return; await sleep(100); }
  console.error('Page state:', await evaluate("JSON.stringify({url:location.href,text:document.body.innerText.slice(0,2000),savedUser:localStorage.getItem('pb_user')})"));
  await screenshot('failure');
  throw new Error(`UI condition timed out: ${expression}`);
}
const click = text => evaluate(`(() => { const button = Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === ${JSON.stringify(text)}); button?.focus(); button?.click(); })()`);
async function screenshot(name) {
  await sleep(300);
  const result = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(screenshots, `${name}.png`), Buffer.from(result.data, 'base64'));
}
async function main() {
  fs.mkdirSync(screenshots, { recursive: true });
  server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      const role = (request.headers.authorization || '').replace('Bearer preview-', '') || 'buyer';
      let result = [];
      if (url.pathname === '/api/auth/me') result = users[role] || users.buyer;
      else if (url.pathname === '/api/patents/reviews') result = listings;
      else if (url.pathname === '/api/patents/my-portfolio') result = listings;
      else if (url.pathname.endsWith('/review') && request.method === 'PUT') {
        let body = ''; for await (const chunk of request) body += chunk;
        const input = JSON.parse(body); const listing = listings.find(p => url.pathname.includes(p._id));
        listing.status = input.status; listing.reviewHistory.push({ ...input, reviewerName: users.admin.name, reviewerId: 'admin', reviewedAt: now });
        result = { patent: listing };
      } else if (url.pathname === '/api/patents/featured') result = { patents: listings.filter(p => p.status === 'approved'), personalized: false };
      else if (url.pathname === '/api/analytics/dashboard') result = { role, stats: [], activitySeries: [], recommendedPatents: [], portfolioPatents: [], recentLeads: [], upcomingMeetings: [], recentRequests: [], recentDeals: [] };
      response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(result)); return;
    }
    const resolved = path.resolve(dist, `.${decodeURIComponent(url.pathname)}`);
    if (!resolved.startsWith(dist + path.sep) && resolved !== dist) { response.writeHead(403); response.end(); return; }
    const filename = fs.existsSync(resolved) && fs.statSync(resolved).isFile() ? resolved : path.join(dist, 'index.html');
    const mime = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.html': 'text/html' }[path.extname(filename)] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': mime }); fs.createReadStream(filename).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ipbridge-ui-browser-'));
  const executable = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(file => fs.existsSync(file));
  if (!executable) throw new Error('A local Edge or Chrome installation is required.');
  browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let attempt = 0; !fs.existsSync(portFile) && attempt < 100; attempt++) await sleep(100);
  if (!fs.existsSync(portFile)) throw new Error('Browser debugger did not start.');
  const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  ws.addEventListener('message', event => { const message = JSON.parse(event.data); const callback = pending.get(message.id); if (callback) { pending.delete(message.id); if (message.error) callback.reject(new Error(message.error.message)); else callback.resolve(message.result); } });
  await send('Page.enable');
  await send('Runtime.enable');
  ws.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.method === 'Runtime.exceptionThrown') console.error('Browser exception:', JSON.stringify(message.params.exceptionDetails)); });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${origin}/discover` });
  await until("document.querySelectorAll('article').length > 0");
  assert.equal(await evaluate("document.body.innerText.includes('Asking price')"), true);
  for (const label of ['Utility Patent', 'Design', 'Other · Plant Patent']) assert.equal(await evaluate(`Array.from(document.querySelectorAll('article')).some(card => card.textContent.includes(${JSON.stringify(label)}))`), true);
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  await screenshot('marketplace-desktop');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(200);
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  await screenshot('marketplace-mobile');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate("document.querySelector('[aria-label=\"list view\"]').click()");
  assert.equal(await evaluate("document.querySelector('[aria-label=\"list view\"]').getAttribute('aria-pressed')"), 'true');
  await send('Page.navigate', { url: `${origin}/` });
  await until("document.querySelector('h1')?.textContent.includes('Commercialize')");
  assert.equal(await evaluate("/87\\+|What teams are saying|Priya Nair|commercialPotentialScore/.test(document.body.innerText)"), false);
  await screenshot('homepage-desktop');
  for (const role of ['admin', 'owner', 'buyer']) {
    await evaluate(`localStorage.setItem('pb_token', 'preview-${role}'); localStorage.setItem('pb_user', ${JSON.stringify(JSON.stringify(users[role]))})`);
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await send('Page.navigate', { url: `${origin}/dashboard/profile` });
    await until("Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'More')");
    await click('More'); await until("document.querySelector('[role=dialog]') !== null");
    assert.equal(await evaluate("document.querySelector('[role=dialog]').innerText.includes('Profile')"), true);
    assert.equal(await evaluate("document.querySelector('[role=dialog]').innerText.includes('Sign out')"), true);
    assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
    await screenshot(`mobile-menu-${role}`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await until("document.querySelector('[role=dialog]') === null");
    assert.equal(await evaluate("document.activeElement.textContent.trim()"), 'More');
  }
  await evaluate(`localStorage.setItem('pb_token', 'preview-admin'); localStorage.setItem('pb_user', ${JSON.stringify(JSON.stringify(users.admin))})`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${origin}/dashboard/listings` });
  await until("document.querySelector('#review-notes') !== null");
  assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Approve and publish').disabled"), true);
  await evaluate("document.querySelector('#review-grant-verification').click()");
  await until("!Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Approve and publish').disabled");
  await screenshot('admin-review-desktop');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(200);
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  await screenshot('admin-review-mobile');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Request changes').disabled"), true);
  await evaluate("const input = document.querySelector('#review-notes'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input, 'Clarify prototype validation.'); input.dispatchEvent(new Event('input', {bubbles:true}));");
  await until("!Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === 'Request changes').disabled");
  await click('Request changes'); await click('Confirm decision');
  await until("document.body.innerText.includes('Feedback sent to the inventor')");
  await evaluate(`localStorage.setItem('pb_token', 'preview-owner'); localStorage.setItem('pb_user', ${JSON.stringify(JSON.stringify(users.owner))})`);
  await send('Page.navigate', { url: `${origin}/dashboard/assets` });
  await until("document.body.innerText.includes('Clarify prototype validation.')");
  await click('Revise and resubmit');
  await until("document.querySelector('[role=dialog]')?.innerText.includes('Revise your listing')");
  assert.equal(await evaluate("document.querySelector('[role=dialog] input').disabled"), true);
  assert.equal(await evaluate("document.querySelector('[role=dialog] input[type=url]').required"), true);
  assert.equal(await evaluate("document.querySelector('#listing-ip-type').value"), 'utility_patent');
  assert.equal(await evaluate("document.querySelector('#listing-registration-status').value"), 'granted');
  await screenshot('inventor-revision-desktop');
  await evaluate("document.querySelector('[aria-label=\"Close dialog\"]').click()");
  await click('List IP');
  await until("document.querySelector('#listing-ip-type') !== null");
  assert.equal(await evaluate("document.querySelector('#listing-ip-type').required && document.querySelector('#listing-ip-type').value === ''"), true);
  assert.equal(await evaluate("document.querySelector('[role=dialog] input[type=url]').checkValidity()"), false);
  await evaluate("const select = document.querySelector('#listing-ip-type'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select, 'other'); select.dispatchEvent(new Event('change', {bubbles:true}));");
  await until("Array.from(document.querySelectorAll('label')).some(label => label.textContent.trim() === 'Other IP type')");
  assert.equal(await evaluate("Array.from(document.querySelectorAll('label')).find(label => label.textContent.trim() === 'Other IP type').parentElement.querySelector('input').required"), true);
  assert.equal(await evaluate("Array.from(document.querySelector('#listing-registration-status').options).some(option => ['pending','published'].includes(option.value))"), false);
  await screenshot('new-listing-requirements');
  console.log('Passed: IP type tags, mandatory document/type fields, approval document confirmation, marketplace layouts, mobile menus, admin review, and inventor revision.');
  console.log(`Screenshots: ${screenshots}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (ws) { await send('Browser.close').catch(() => {}); ws.close(); }
  if (browser) browser.kill();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
