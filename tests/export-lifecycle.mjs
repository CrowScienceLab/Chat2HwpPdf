import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<body><main>원문</main></body>', { url: 'https://chatgpt.com', runScripts: 'outside-only' });
const w = dom.window;
const api = w.AIChatExporter = {
  imageHandler: { async waitForImages() {} }, mathPreserver: { findMath() { return []; } }
};
const timers = new Map();
let timerId = 0;
w.setTimeout = (fn, ms) => { const id = ++timerId; timers.set(id, { fn, ms }); return id; };
w.clearTimeout = id => timers.delete(id);
const tick = () => new Promise(resolve => setImmediate(resolve));
const fire = ms => {
  for (const [id, timer] of timers) if (timer.ms === ms) { timers.delete(id); timer.fn(); }
};
const append = w.document.body.append.bind(w.document.body);
w.document.body.append = (...nodes) => {
  append(...nodes);
  for (const node of nodes) if (node.id === 'ai-chat-exporter-print-frame') {
    node.contentWindow.print = () => w.print();
    node.contentWindow.focus = () => {};
  }
};
const frame = () => w.document.getElementById('ai-chat-exporter-print-frame');
const afterprint = () => { const win = frame().contentWindow; win.dispatchEvent(new win.Event('afterprint')); };
vm.runInContext(fs.readFileSync('chrome-extension/content/exporter/print-engine.js', 'utf8'), dom.getInternalVMContext());
const request = () => ({ content: w.document.createElement('div'), title: '검증', siteLabel: 'fixture',
  settings: {}, printCss: fs.readFileSync('chrome-extension/styles/print.css', 'utf8') });
w.print = () => {};
let job = api.printEngine.print(request());
await tick();
await assert.rejects(api.printEngine.print(request()), /인쇄 창/);
fire(80); await job;
assert.equal([...timers.values()].filter(t => t.ms === 120000).length, 1);
afterprint();
assert.equal(timers.size, 0, 'completed job must cancel its fallback timer');
assert.equal(w.document.querySelector('#ai-chat-exporter-print-root'), null);
assert.ok(frame().contentDocument.querySelector('#ai-chat-exporter-print-root'), 'print document remains available after afterprint');

w.print = () => { throw new Error('print unavailable'); };
job = api.printEngine.print(request());
const rejected = assert.rejects(job, /print unavailable/);
await tick(); fire(80); await rejected;
assert.equal(w.document.querySelector('#ai-chat-exporter-print-root'), null);
assert.equal(timers.size, 0);

api.imageHandler.waitForImages = async () => { throw new Error('image failed'); };
await assert.rejects(api.printEngine.print(request()), /image failed/);
assert.equal(w.document.querySelector('#ai-chat-exporter-print-root'), null);
api.imageHandler.waitForImages = async () => {};
w.print = afterprint;
job = api.printEngine.print(request());
await tick(); fire(80); await job;
assert.equal(timers.size, 0, 'synchronous afterprint must not leave a timer');

// Images must be drawn from the instance that actually loaded, and stalled
// image requests must resolve to an omission rather than blocking the export.
vm.runInContext(fs.readFileSync('chrome-extension/content/exporter/hwp-package.js', 'utf8'), dom.getInternalVMContext());
api.textMath = { materialize() {} };
api.hwpEquations = {};
let drawn;
w.HTMLCanvasElement.prototype.getContext = () => ({ drawImage(image) { drawn = image; } });
w.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,AA==';
let loaded;
w.Image = class {
  constructor() { loaded = this; this.naturalWidth = 30; this.naturalHeight = 20; }
  set src(value) { this.url = value; if (value) queueMicrotask(() => this.onload?.()); }
};
function imageRequest() {
  const content = w.document.createElement('div');
  content.innerHTML = '<p>앞 문단</p><img src="https://example.com/image.png" alt="검증"><p>끝 문단</p>';
  return { content, title: '', siteLabel: 'fixture', settings: {}, mathCount: 0 };
}
let result = await api.hwpPackage.create(imageRequest());
assert.equal(drawn, loaded);
assert.equal(result.diagnostics.omittedImages, 0);
assert.equal(timers.size, 0);
w.Image = class { set src(value) {} };
job = api.hwpPackage.create(imageRequest());
await tick(); fire(4500); result = await job;
assert.equal(result.diagnostics.omittedImages, 1);
assert.match(result.html, /앞 문단.*이미지 생략.*끝 문단/);
assert.equal(w.document.querySelector('.aice-hwp-document'), null);
dom.window.close();
console.log('PASS: concurrent print rejection, timer cancellation, failure cleanup, loaded image identity, image timeout and omission.');
