const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class BrowserHarness {
  async start() {
    this.pending = new Map(); this.nextId = 0; this.errors = [];
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ipbridge-e2e-browser-'));
    const executable = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(file => fs.existsSync(file));
    if (!executable) throw new Error('Local Edge/Chrome is required.');
    this.process = spawn(executable, ['--headless=new', '--disable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
    const filename = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; !fs.existsSync(filename) && i < 100; i++) await sleep(100);
    if (!fs.existsSync(filename)) throw new Error('Browser failed to start.');
    const port = fs.readFileSync(filename, 'utf8').split('\n')[0];
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    this.ws = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
    await new Promise(resolve => this.ws.addEventListener('open', resolve, { once: true }));
    this.ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') this.errors.push(message.params.exceptionDetails.text);
      const callback = this.pending.get(message.id);
      if (callback) { this.pending.delete(message.id); callback(message); }
    });
    await this.send('Page.enable'); await this.send('Runtime.enable');
    await this.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, mobile: false, deviceScaleFactor: 1 });
  }
  send(method, params = {}) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Browser timeout: ${method}`)); }, 15000);
      this.pending.set(id, message => { clearTimeout(timer); if (message.error) reject(new Error(message.error.message)); else resolve(message.result); });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result?.value;
  }
  async until(expression) {
    for (let i = 0; i < 150; i++) { if (await this.evaluate(`Boolean(${expression})`)) return; await sleep(100); }
    throw new Error(`UI timeout: ${expression}\n${await this.evaluate('document.body.innerText.slice(0,4200)')}`);
  }
  async go(url) {
    const loaded = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.ws.removeEventListener('message', listener); reject(new Error('Page load timeout')); }, 15000);
      const listener = event => {
        if (JSON.parse(event.data).method === 'Page.loadEventFired') { clearTimeout(timer); this.ws.removeEventListener('message', listener); resolve(); }
      };
      this.ws.addEventListener('message', listener);
    });
    await this.send('Page.navigate', { url });
    await loaded;
  }
  async click(text) {
    await this.evaluate(`(() => { const buttons = Array.from(document.querySelectorAll('button')).filter(node => node.textContent.trim() === ${JSON.stringify(text)}); const button = buttons.find(node => node.type === 'submit' && node.closest('form')) || buttons.at(-1); if (!button || button.disabled) throw new Error('Button unavailable: ' + ${JSON.stringify(text)}); button.focus(); button.click(); })()`);
  }
  async fill(label, value) {
    await this.evaluate(`(() => { const label = Array.from(document.querySelectorAll('label')).find(node => node.textContent.trim().startsWith(${JSON.stringify(label)})); const input = label?.htmlFor ? document.getElementById(label.htmlFor) : label?.parentElement.querySelector('input,textarea'); if (!input) throw new Error('Field unavailable'); const prototype = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype,'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  }
  async choose(selector, value) {
    await this.evaluate(`(() => { const select = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select, ${JSON.stringify(value)}); select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  }
  async screenshot(filename) { const result = await this.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(filename, Buffer.from(result.data, 'base64')); }
  async close() { if (this.ws) { await this.send('Browser.close').catch(() => {}); this.ws.close(); } this.process?.kill(); }
}
module.exports = { BrowserHarness };
