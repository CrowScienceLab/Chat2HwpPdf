import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const root=process.cwd();const release=JSON.parse(fs.readFileSync('release.json','utf8'));
fs.mkdirSync('tmp/ui', {recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const context=await browser.newContext({viewport:{width:960,height:950}});
 await context.route('http://127.0.0.1:18997/**',async route=>{
  const relative=new URL(route.request().url()).pathname.slice(1);const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){await route.fulfill({status:404,body:''});return;}
  const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png'};
  await route.fulfill({contentType:mime[path.extname(file)]||'text/plain',body:fs.readFileSync(file)});
 });
 await context.addInitScript(({version,id})=>{
  globalThis.permissionGranted=false;
  globalThis.calls={permissions:0,native:0,extract:0,tabs:[]};
  globalThis.chrome={permissions:{contains:async()=>permissionGranted,request:async()=>{calls.permissions++;permissionGranted=true;return true}},runtime:{id,getManifest:()=>({version}),getURL:p=>'/chrome-extension/'+p,sendMessage:async()=>({}),connectNative(){calls.native++;throw new Error('Specified native messaging host not found.')}},storage:{local:{get:async()=>({}),set:async()=>{}},onChanged:{addListener(){}}},tabs:{query:async()=>[{id:1,url:'https://chatgpt.com/'}],create:async obj=>calls.tabs.push(obj.url),sendMessage:async()=>({ok:true})},scripting:{executeScript:async()=>{calls.extract++}}};
 },{version:release.version,id:release.extensionId});
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:18997/chrome-extension/setup/setup.html');
 await page.locator('#app-version').waitFor();assert.equal(await page.locator('#app-version').textContent(),release.version);
 assert.equal(await page.locator('#advanced-settings').getAttribute('open'),null);
 await page.screenshot({path:'tmp/ui/setup.png',fullPage:true});
 await page.setViewportSize({width:450,height:820});
 await page.goto('http://127.0.0.1:18997/chrome-extension/popup/popup.html');
 await page.locator('#actions').waitFor({state:'visible'});
 await page.locator('[data-mode="current"]').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('완료'));
 assert.deepEqual(await page.evaluate(()=>[calls.permissions,calls.native]),[0,0],'PDF never asks for native permission');
 await page.screenshot({path:'tmp/ui/popup.png',fullPage:true});
 await page.locator('[data-hwp-mode="current"]').click();
 await page.waitForFunction(()=>calls.tabs.length>0);
 assert.deepEqual(await page.evaluate(()=>[calls.permissions,calls.native,calls.extract]),[1,1,1],'missing helper opens setup before HWP extraction');
 assert.match(await page.locator('#status').textContent(),/설치/);
 assert.deepEqual(errors,[]);
 console.log('PASS: Chrome setup/popup render without script errors; PDF works without helper; missing HWP helper opens install guide before extraction.');
 await context.close();
} finally {await browser.close();}
