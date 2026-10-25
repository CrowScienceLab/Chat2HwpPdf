import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
fs.mkdirSync('tmp/document-format',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage();await page.setContent('<!doctype html><body></body>');
 await page.evaluate(()=>{
  window.AIChatExporter={mathPreserver:{findMath:()=>[]},imageHandler:{waitForImages:async()=>{}}};
  const append=document.body.append.bind(document.body);
  document.body.append=(...nodes)=>{append(...nodes);for(const n of nodes)if(n.tagName==='IFRAME')n.contentWindow.print=()=>{};};
 });
 await page.addScriptTag({content:fs.readFileSync('chrome-extension/content/exporter/print-engine.js','utf8')});
 await page.evaluate(async css=>{
  const content=document.createElement('div');
  content.innerHTML='<h1>답변 제목</h1><p>본문 11pt, 줄간격 150%</p><h2>중간제목</h2><p>중간제목 위에 빈 줄 한 행</p><table><tr><td>표 안 본문</td><td>11pt</td></tr></table>';
  await AIChatExporter.printEngine.print({content,title:'문서 전체 제목',siteLabel:'ChatGPT',settings:{includeTitle:true,includeDate:true,wrapCode:true},mathCount:0,printCss:css});
 },fs.readFileSync('chrome-extension/styles/print.css','utf8'));
 await page.emulateMedia({media:'print'});
 const observed=await page.evaluate(()=>{
  const doc=document.querySelector('iframe').contentDocument, root=doc.querySelector('#ai-chat-exporter-print-root');
  const style=n=>{const s=doc.defaultView.getComputedStyle(n);return {font:s.fontSize,line:s.lineHeight};};
  return {title:style(root.querySelector('header h1')),heading:style(root.querySelector('div>h1')),body:style(root.querySelector('div>p:not(.aice-heading-gap)')),cell:style(root.querySelector('td')),gaps:[...root.querySelectorAll('div>h1,div>h2')].map(h=>h.previousElementSibling.className),css:doc.querySelector('style').textContent,html:doc.documentElement.outerHTML};
 });
 assert.equal(observed.title.font,'26.6667px');assert.equal(observed.heading.font,'20px');
 assert.equal(observed.body.font,'14.6667px');assert.equal(observed.body.line,'22px');assert.equal(observed.cell.font,'14.6667px');
 assert.deepEqual(observed.gaps,['aice-heading-gap','aice-heading-gap']);assert.match(observed.css,/margin: 15mm 20mm/);
 await page.setContent(observed.html);await page.pdf({path:'tmp/document-format/chrome-preview.pdf',preferCSSPageSize:true,printBackground:true});
 console.log('PASS: Chrome print document computed sizes 11/15/20pt, body 150%, heading blank lines and 15/20mm margins.');
}finally{await browser.close();}
