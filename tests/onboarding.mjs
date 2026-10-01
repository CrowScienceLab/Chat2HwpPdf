import fs from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const release = JSON.parse(fs.readFileSync('release.json', 'utf8'));
const flush = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };
function page({ permission = true, hostVersion = release.version, id = release.extensionId, missing = false, timeout = false } = {}) {
  const dom = new JSDOM(fs.readFileSync('chrome-extension/setup/setup.html', 'utf8'), { url: `chrome-extension://${id}/setup/setup.html`, runScripts: 'outside-only' });
  const w = dom.window;
  let connections = 0;
  const timers = new Map(); let next = 0;
  w.setTimeout = (fn, ms) => { const key = ++next; timers.set(key, { fn, ms }); return key; };
  w.clearTimeout = key => timers.delete(key);
  w.chrome = { permissions: { async contains() { return permission; }, async request() { return permission; } }, runtime: {
    id, getManifest: () => ({ version: release.version }),
    connectNative() {
      connections++;
      let onMessage, onDisconnect;
      return {
        onMessage: { addListener(fn) { onMessage = fn; } }, onDisconnect: { addListener(fn) { onDisconnect = fn; } },
        disconnect() { onDisconnect(); },
        postMessage(message) {
          if (timeout) return;
          queueMicrotask(() => {
            if (missing) { w.chrome.runtime.lastError = { message: 'Specified native messaging host not found.' }; onDisconnect(); delete w.chrome.runtime.lastError; }
            else onMessage({ requestId: message.requestId, ok: true, hostVersion, outputDirectory: message.type === 'choose-folder' ? 'D:\\Saved' : 'C:\\Documents' });
          });
        }
      };
    }
  } };
  for (const file of ['release-config.js', 'helper-client.js', 'setup/setup.js']) w.eval(fs.readFileSync(`chrome-extension/${file}`, 'utf8'));
  return { w, dom, timers, get connections() { return connections; }, $: id => w.document.getElementById(id) };
}
let p = page(); await flush();
assert.equal(p.$('download-helper').href, `https://github.com/${release.repository}/releases/download/v${release.version}/Chat2HwpPdf-Setup.exe`);
assert.match(p.$('status').textContent, new RegExp(`확장 앱 ${release.version} · 도우미 ${release.version}`));
assert.equal(p.$('advanced-settings').open, false);
assert.equal(p.timers.size, 0, 'successful request clears timeout');
p.$('folder').click(); await flush(); assert.equal(p.$('folder-path').textContent, 'D:\\Saved'); p.dom.window.close();
p = page({ hostVersion: '0.4.1' }); await flush(); assert.match(p.$('status').textContent, /버전 확인 필요/); p.dom.window.close();
p = page({ permission: false }); await flush(); assert.equal(p.connections, 0);
p.$('connect').click(); await flush(); assert.match(p.$('status').textContent, /권한/);
assert.match(p.w.document.body.textContent, /PDF는 바로/); p.dom.window.close();
p = page({ missing: true }); await flush(); p.$('connect').click(); await flush();
assert.match(p.$('status').textContent, /도우미 설치 후/); assert.equal(p.$('connect').disabled, false);
p.$('download-helper').addEventListener('click', e => e.preventDefault());
p.$('download-helper').click(); await flush();
assert.ok([...p.timers.values()].some(t => t.ms === 3000), 'download starts bounded connection watcher');
p.w.dispatchEvent(new p.w.Event('pagehide')); assert.equal(p.timers.size, 0, 'watcher stopped on exit'); p.dom.window.close();
p = page({ id: 'a'.repeat(32), timeout: true }); await flush();
assert.equal(p.$('advanced-settings').open, true);
for (const timer of [...p.timers.values()]) if (timer.ms === 10000) timer.fn(); await flush();
assert.equal(p.$('connect').disabled, false, 'no response unlocks buttons'); p.dom.window.close();
const manifest = JSON.parse(fs.readFileSync('chrome-extension/manifest.json', 'utf8'));
assert.equal(manifest.version, release.version);
assert.match(fs.readFileSync('windows-helper/src/ReleaseInfo.cs', 'utf8'), new RegExp(`Version = "${release.version}"`));
console.log('PASS: direct download, official/developer IDs, matching/mismatched versions, optional permission, missing host, timeout, automatic checks and folder selection.');
