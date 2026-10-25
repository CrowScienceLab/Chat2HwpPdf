import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const engine=fs.readFileSync('chrome-extension/content/exporter/print-engine.js','utf8');
const css=fs.readFileSync('chrome-extension/styles/print.css','utf8');
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=','base64');
for(const channel of (process.env.AICE_BROWSER_CHANNELS||'chrome').split(',')){
 const browser=await chromium.launch({channel,headless:true});
 try{
  const page=await browser.newPage();const errors=[];
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('https://chatgpt.com/**',route=>route.request().url().endsWith('.png')
   ?route.fulfill({contentType:'image/png',body:pixel})
   :route.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':"base-uri 'none'"},body:'<!doctype html><body></body>'}));
  await page.goto('https://chatgpt.com/c/test-conversation');
  await page.evaluate(()=>{
   window.violations=[];window.printCalls=0;
   window.AIChatExporter={mathPreserver:{findMath:()=>[]},imageHandler:{waitForImages:async root=>{await Promise.all([...root.querySelectorAll('img')].map(img=>img.decode()));}}};
   const append=document.body.append.bind(document.body);
   document.body.append=(...nodes)=>{append(...nodes);for(const n of nodes)if(n.tagName==='IFRAME'){
    n.contentDocument.addEventListener('securitypolicyviolation',e=>violations.push(e.violatedDirective));
    n.contentWindow.print=()=>{printCalls++;};
   }};
  });
  await page.addScriptTag({content:engine});
  await page.evaluate(async css=>{
   const content=document.createElement('div');
   content.innerHTML='<h2>보안 정책 검증</h2><p><a href="../help/topic">상대 링크</a><a href="#formula">문서 안 링크</a></p><img src="../media/pixel.png"><svg><defs><path id="formula" d="M0 0H10V10Z"/></defs><use href="#formula"/></svg>';
   await AIChatExporter.printEngine.print({content,title:'CSP test',siteLabel:'ChatGPT',settings:{includeTitle:true,wrapCode:true},mathCount:0,printCss:css});
  },css);
  await page.waitForTimeout(100);
  const observed=await page.evaluate(()=>{
   const frame=document.querySelector('#ai-chat-exporter-print-frame'),doc=frame.contentDocument;
   return {violations,printCalls,bases:doc.querySelectorAll('base').length,image:doc.querySelector('img').src,imageLoaded:doc.querySelector('img').naturalWidth,link:doc.querySelector('a').href,fragment:doc.querySelectorAll('a')[1].getAttribute('href'),svg:doc.querySelector('use').getAttribute('href')};
  });
  assert.deepEqual(observed.violations,[],`${channel}: no CSP violation`);
  assert.deepEqual(errors,[],`${channel}: no browser console errors`);
  assert.equal(observed.bases,0);assert.equal(observed.printCalls,1);
  assert.equal(observed.image,'https://chatgpt.com/media/pixel.png');assert.equal(observed.imageLoaded,1);
  assert.equal(observed.link,'https://chatgpt.com/help/topic');assert.equal(observed.fragment,'#formula');assert.equal(observed.svg,'#formula');
  console.log(`PASS: ${channel} base-uri none: no violations/console errors; relative image/link and SVG fragment preserved; print invoked.`);
 }finally{await browser.close();}
}
