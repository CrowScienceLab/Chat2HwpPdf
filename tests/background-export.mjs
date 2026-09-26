import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const data = {};
let listener, port, connections = 0;
const event = () => ({ addListener(fn) { this.fn = fn; } });
const chrome = {
  tabs: { async create(value) { data.tab = value; } },
  storage: { local: {
    async get() { return structuredClone(data); },
    async set(value) { Object.assign(data, structuredClone(value)); }
  } },
  runtime: {
    onInstalled: { addListener() {} },
    id: 'test', getURL: p => 'chrome-extension://test/' + p,
    onMessage: { addListener(fn) { listener = fn; } },
    connectNative() {
      connections++;
      port = { onMessage: event(), onDisconnect: event(), messages: [], closed: false,
        postMessage(m) { this.messages.push(m); },
        disconnect() { this.closed = true; this.onDisconnect.fn(); } };
      return port;
    }
  }
};
const context = { chrome };
vm.runInNewContext(fs.readFileSync(new URL('../background.js', import.meta.url), 'utf8'), { ...context });
const send = message => new Promise(resolve => listener(message,
  { id: 'test', url: chrome.runtime.getURL('popup/popup.html') }, resolve));
const tick = () => new Promise(resolve => setImmediate(resolve));
const payload = { html: 'x'.repeat(500000), equations: [{ script: 'a over b' }], diagnostics: { omittedEquations: [{number: 31, reason: 'unsupported test command'}] } };
assert.equal((await send({ type: 'START_HWP_EXPORT', requestId: 'one', payload })).ok, true);
assert.equal(port.messages.filter(m => m.type === 'chunk').length, 3);
assert.equal(JSON.parse(port.messages.filter(m => m.type === 'chunk').map(m => m.data).join('')).html, payload.html);
// No popup callback is kept alive while the native host waits for access approval.
assert.equal(port.closed, false);
assert.equal(data.hwpExportJob.state, 'running');
assert.equal(JSON.stringify(data).includes(payload.html), false);
assert.equal((await send({ type: 'START_HWP_EXPORT', requestId: 'two', payload })).ok, false);
assert.equal(connections, 1);
port.onMessage.fn({ requestId: 'wrong', ok: true });
await tick(); assert.equal(data.hwpExportJob.state, 'running');
port.onMessage.fn({ requestId: 'one', ok: true, outputPath: 'saved.hwpx', openWarning: 'open failed' });
await tick();
assert.equal(port.closed, true);
assert.equal((await send({ type: 'GET_HWP_EXPORT' })).hwpExportJob.outputPath, 'saved.hwpx');
assert.equal(data.hwpExportJob.openWarning, 'open failed');
assert.equal(data.hwpExportJob.omittedEquationCount, 1);
assert.match(data.hwpExportJob.omissionSummary, /31번: unsupported/);
await send({ type: 'START_HWP_EXPORT', requestId: 'three', payload });
chrome.runtime.lastError = { message: 'host exited' };
port.onDisconnect.fn(); await tick();
assert.equal(data.hwpExportJob.state, 'error');
assert.equal(data.hwpExportJob.error, 'host exited');
data.hwpExportJob.state = 'running';
vm.runInNewContext(fs.readFileSync(new URL('../background.js', import.meta.url), 'utf8'), { ...context });
assert.equal((await send({ type: 'GET_HWP_EXPORT' })).hwpExportJob.state, 'error');
console.log('Worker export: chunking, popup-independent completion, duplicate rejection, disconnect, restart recovery passed.');
