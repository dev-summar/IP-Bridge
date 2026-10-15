// Built-frontend browser regression: isolated fixtures, no database access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { BrowserHarness } = require('./browserHarness.cjs');
const browser = new BrowserHarness();
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'artifacts/ui-preview');
let server;

async function tap(selector) {
  const point = await browser.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await browser.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await browser.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const app = express();
  app.use('/api', (req, res) => {
    const role = req.headers.authorization?.replace('Bearer menu-', '') || 'buyer';
    if (req.path === '/auth/me') return res.json({ id: role, role, name: 'Menu Test', organization: 'Test Institute', email: 'menu@example.test', savedPatents: [] });
    if (req.path === '/analytics/dashboard') return res.json({ stats: [], activitySeries: [], portfolioPatents: [], recentDeals: [], recentRequests: [], activeSchedules: [], recentLogs: [], industryStats: [] });
    if (req.path === '/patents/featured') return res.json({ patents: [] });
    return res.json([]);
  });
  app.use(express.static(path.join(root, 'frontend/dist')));
  app.get('*', (_req, res) => res.sendFile(path.join(root, 'frontend/dist/index.html')));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  await browser.start();
  await browser.go(origin);
  for (const role of ['buyer', 'owner', 'admin']) {
    await browser.evaluate(`localStorage.setItem('pb_token', ${JSON.stringify('menu-' + role)})`);
    await browser.evaluate(`localStorage.setItem('pb_user', ${JSON.stringify(JSON.stringify({ id: role, role, name: 'Menu Test', organization: 'Test Institute', email: 'menu@example.test', savedPatents: [] }))})`);
    await browser.go(origin + '/dashboard');
    await browser.until("document.querySelector('[aria-label=\"Key metrics\"]')");
    for (const [width, height] of [[390, 844], [320, 480], [740, 360]]) {
      await browser.send('Emulation.setDeviceMetricsOverride', { width, height, mobile: true, deviceScaleFactor: 1 });
      await browser.click('More');
      await browser.until("document.querySelector('[role=dialog]')");
      const state = await browser.evaluate(`(() => {
        const dialog = document.querySelector('[role=dialog]');
        const r = dialog.getBoundingClientRect();
        return { count: document.querySelectorAll('[role=dialog]').length, fits: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, portal: dialog.parentElement.parentElement === document.body, locked: document.body.style.overflow === 'hidden' };
      })()`);
      assert.deepEqual(state, { count: 1, fits: true, portal: true, locked: true }, `${role} ${width}x${height}`);
      if (height === 844) await browser.screenshot(path.join(output, `mobile-menu-${role}-fixed.png`));
      await browser.evaluate("document.querySelector('[role=dialog] button').focus()");
      await browser.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 });
      assert.equal(await browser.evaluate("document.activeElement.textContent.trim()"), 'Sign out');
      await browser.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await browser.until("!document.querySelector('[role=dialog]')");
      assert.equal(await browser.evaluate("document.activeElement.textContent.trim()"), 'More');
      assert.equal(await browser.evaluate("document.body.style.overflow"), '');

      await browser.click('More');
      await browser.until("document.querySelector('[role=dialog]')");
      await browser.evaluate("document.querySelector('[role=dialog] a[href=\"/dashboard/profile\"]').scrollIntoView({block:'center'})");
      await tap('[role=dialog] a[href="/dashboard/profile"]');
      await browser.until("location.pathname === '/dashboard/profile' && !document.querySelector('[role=dialog]')");
      await browser.click('More');
      await tap('[aria-label="Close dialog"]');
      await browser.until("!document.querySelector('[role=dialog]')");
      await browser.go(origin + '/dashboard');
      await browser.until("document.querySelector('[aria-label=\"Key metrics\"]')");
    }
  }
  assert.deepEqual(browser.errors, []);
  console.log('Mobile menus passed: all roles; phone, short phone, landscape; viewport bounds, scroll-to-profile navigation, close button, Escape, focus trap/restore, scroll lock.');
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  await browser.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
