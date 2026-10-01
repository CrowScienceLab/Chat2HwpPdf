import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const allowed = ['chrome-extension/popup/', 'chrome-extension/icons/', 'chrome-extension/setup/', 'chrome-extension/release-config.js', 'chrome-extension/helper-client.js'];
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:18767');
  const relative = decodeURIComponent(url.pathname).replace(/^\//, '');
  if (req.method !== 'GET' || relative.includes('..') || relative.includes('\\')) { res.writeHead(404).end(); return; }
  if (relative === 'preview.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(`globalThis.chrome={permissions:{contains:async()=>false,request:async()=>false},runtime:{getManifest:()=>({version:'0.4.7'}),id:'preview',getURL:p=>'/chrome-extension/'+p,sendMessage:async()=>({}),onMessage:{addListener(){}}},storage:{local:{get:async()=>({}),set:async()=>{}},onChanged:{addListener(){}}},tabs:{query:async()=>[{id:1,url:'https://chatgpt.com/'}],create:async()=>{} }};`); return;
  }
  if (!allowed.some(prefix => relative.startsWith(prefix))) { res.writeHead(404).end(); return; }
  const file = path.join(root, relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  let bytes = fs.readFileSync(file);
  if (relative === 'chrome-extension/popup/popup.html' || relative === 'chrome-extension/setup/setup.html') bytes = Buffer.from(bytes.toString().replace('<script src="../release-config.js">', '<script src="/preview.js"></script><script src="../release-config.js">'));
  res.end(bytes);
}).listen(18767, '127.0.0.1', () => console.log('UI preview only: http://127.0.0.1:18767/chrome-extension/popup/popup.html'));
