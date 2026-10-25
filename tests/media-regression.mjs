import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { Resvg } from '@resvg/resvg-js';
const png = new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#f6c73b"/><rect x="160" width="160" height="180" fill="#2864af"/><text x="20" y="100" font-size="36">FIGURE</text></svg>').render().asPng();
const scripts = ['utils/dom-utils','utils/site-detector','adapters/base','adapters/chatgpt','adapters/gemini','adapters/claude','adapters/notebooklm','exporter/math-preserver','exporter/image-handler','exporter/content-cleaner','exporter/dom-cloner','exporter/hwp-equations','exporter/text-math','exporter/hwp-package','exporter/print-engine','main'].map(p=>fs.readFileSync('chrome-extension/content/'+p+'.js','utf8'));
const output='tmp/media-regression'; fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const records=[];
try {
 const context=await browser.newContext({viewport:{width:1100,height:800},deviceScaleFactor:1.5});
 await context.route('https://media.example/**',r=>r.fulfill({contentType:'image/png',body:png}));
 await context.route('https://figure.example/**',r=>r.fulfill({contentType:'text/html',body:'<body style="margin:0;background:#f6c73b"><svg width="320" height="180"><circle cx="160" cy="90" r="70" fill="#2864af"/></svg></body>'}));
 const fixtures=[
  {name:'chatgpt',host:'chatgpt.com',html:'<article><div data-message-author-role="assistant"><h2>Image answer</h2><img width="320" height="180" src="https://media.example/pic.png" alt="generated picture"><p><math><mi>x</mi><mo>+</mo><mn>1</mn></math></p></div></article>',mode:'current'},
  {name:'gemini',host:'gemini.google.com',html:'<model-response><p>Image answer</p><button><img width="320" height="180" src="https://media.example/pic.png" alt="orbit"></button><math><mi>x</mi><mo>+</mo><mn>1</mn></math></model-response>',mode:'current'},
  {name:'claude',host:'claude.ai',html:'<main><div class="font-claude-message"><p>Interactive figure</p><iframe title="visualize: orbit" width="320" height="180" src="https://figure.example/graph"></iframe><math><mi>x</mi><mo>+</mo><mn>1</mn></math></div></main>',mode:'current'},
  {name:'notebook',host:'notebook.google.com',html:'<artifact-viewer><input aria-label="아티팩트 제목" value="Infographic"><div class="artifact-content"><svg width="320" height="180"><foreignObject width="320" height="180"><img width="320" height="180" src="https://media.example/pic.png" alt="infographic"></foreignObject></svg></div></artifact-viewer>',mode:'note'},
  {name:'same-origin',host:'chatgpt.com',html:'<article><div data-message-author-role="assistant"><img width="320" height="180" src="data:image/png;base64,'+png.toString('base64')+'" alt="original pixels"></div></article>',mode:'current'},
  {name:'tall-iframe',host:'claude.ai',html:'<main><div class="font-claude-message"><iframe title="visualize: tall" width="320" height="1400" src="https://figure.example/tall"></iframe></div></main>',mode:'current'},
  {name:'nested-iframe',host:'claude.ai',html:'<main><div class="font-claude-message"><div style="height:400px;width:400px;overflow:auto"><iframe title="visualize: nested" width="320" height="1400" src="https://figure.example/nested"></iframe></div></div></main>',mode:'current'},
  {name:'clipped-iframe',host:'claude.ai',html:'<main><div class="font-claude-message"><div style="width:200px;overflow:hidden"><iframe title="visualize: clipped" width="700" height="180" src="https://figure.example/clipped"></iframe></div></div></main>',mode:'current',expectOmit:true},
  {name:'lazy-image',host:'chatgpt.com',html:'<article><div data-message-author-role="assistant"><p style="height:6000px">Lazy image below</p><img loading="lazy" width="320" height="180" src="https://media.example/lazy.png" alt="lazy"></div></article>',mode:'current'},
  {name:'selection-svg',host:'gemini.google.com',html:'<model-response><svg width="320" height="180"><foreignObject width="320" height="180"><img width="320" height="180" src="https://media.example/pic.png" alt="selected nested"></foreignObject></svg></model-response>',mode:'selection',selectionRoot:'foreignObject'},
  {name:'selection',host:'gemini.google.com',html:'<model-response><p>Selected image</p><button><img width="320" height="180" src="https://media.example/pic.png" alt="selected"></button></model-response>',mode:'selection'}
 ];
 for(const fixture of fixtures){
  await context.route('https://'+fixture.host+'/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>'+fixture.name+'</title><style>body{margin:24px;font:16px Arial}button{padding:0;border:0}img{display:block}iframe{border:0}math{font-size:24px}</style>'+fixture.html}));
  const page=await context.newPage(); const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  let captures=0;
  await page.exposeFunction('captureForTest',async()=>{captures++;return 'data:image/png;base64,'+(await page.screenshot()).toString('base64');});
  await page.goto('https://'+fixture.host+'/media-fixture');await page.waitForLoadState('networkidle');
  await page.evaluate(scale=>{document.body.style.zoom=String(scale)},Number(process.env.AICE_MEDIA_SCALE||1));
  await page.evaluate(()=>{
   window.chrome={runtime:{onMessage:{addListener(fn){window.exportListener=fn;}},sendMessage:async m=>m.type==='CAPTURE_EXPORT_VIEW'?{ok:true,dataUrl:await window.captureForTest()}:{ok:true}}};
   const append=document.body.append.bind(document.body);
   document.body.append=(...nodes)=>{append(...nodes);for(const n of nodes)if(n.id==='ai-chat-exporter-print-frame'){n.contentWindow.focus=()=>{};n.contentWindow.print=()=>n.contentWindow.dispatchEvent(new Event('afterprint'));}};
  });
  for(const source of scripts)await page.addScriptTag({content:source});
  if(fixture.mode==='selection')await page.evaluate(selector=>{const range=document.createRange();range.selectNodeContents(document.querySelector(selector));getSelection().removeAllRanges();getSelection().addRange(range);},fixture.selectionRoot||'model-response');
  const before=await page.evaluate(()=>({html:document.body.innerHTML,scroll:scrollY}));
  for(const includeImages of [true,false])for(const format of ['hwpx','pdf']){
   const capturesBefore=captures;
   const result=await page.evaluate(({mode,includeImages,format,css})=>new Promise(resolve=>window.exportListener({type:'AI_CHAT_EXPORTER_EXPORT_V2',exportId:'test-session',mode,target:format==='hwpx'?'hwpx':undefined,settings:{includeImages,includeUser:true,includeAssistant:true},printCss:css},null,resolve)),{mode:fixture.mode,includeImages,format,css:fs.readFileSync('chrome-extension/styles/print.css','utf8')});
   assert.equal(result.ok,true,JSON.stringify(result));
   if(!includeImages)assert.equal(captures,capturesBefore,'exclude must not capture screenshots');
   const doc= format==='hwpx'?result.package.html:await page.locator('#ai-chat-exporter-print-frame').evaluate(frame=>frame.contentDocument.body.innerHTML);
   const count=(doc.match(/<img\b/g)||[]).length;
   assert.equal(count,includeImages&&!fixture.expectOmit?1:0,fixture.name+' '+format+' include='+includeImages+' '+JSON.stringify(result.package?.diagnostics));
   assert.doesNotMatch(doc,/<iframe|<button/);
   if(includeImages&&fixture.expectOmit)assert.match(doc,/그림 생략/);
   if(includeImages&&!fixture.expectOmit)assert.match(doc,/src="data:image\/png;base64,/);
   if(format==='pdf'&&includeImages&&['chatgpt','gemini','claude','notebook'].includes(fixture.name)) {
    const html=await page.locator('#ai-chat-exporter-print-frame').evaluate(frame=>frame.contentDocument.documentElement.outerHTML);
    const proof=await context.newPage();await proof.setContent('<!doctype html>'+html);await proof.pdf({path:output+'/'+fixture.name+'.pdf',printBackground:true,preferCSSPageSize:true});await proof.close();
   }
   if(format==='hwpx'&&includeImages&&!fixture.expectOmit){
    const uri=doc.match(/<img[^>]+src="([^"]+)"/)[1];
    const rendered=new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><image width="100" height="100" href="'+uri+'" preserveAspectRatio="none"/></svg>').render();
    for(let y=1;y<99;y++)assert.equal(rendered.pixels[(y*100+50)*4+3],255,'image must not have uncaptured horizontal gaps');
    fs.writeFileSync(output+'/'+fixture.name+'.json',JSON.stringify({...result.package,format:'HWPX'},null,2));}
   if(format==='hwpx' && ['chatgpt','gemini','claude'].includes(fixture.name))assert.equal(result.package.equations.length,1,'equations stay editable');
   const currentScroll=await page.evaluate(()=>scrollY);assert.equal(currentScroll,before.scroll,'scroll restored');
   records.push({site:fixture.name,format,includeImages,count});
  }
  assert.equal(pageErrors.length,0,pageErrors.join('\n'));
  if(fixture.name==='same-origin')assert.equal(captures,0,'original pixels need no screenshot');
  else if(!fixture.expectOmit) assert.ok(captures>=1,'foreign media must take screenshot fallback');
  await page.close();
 }
 fs.writeFileSync(output+'/results.json',JSON.stringify(records,null,2));
 console.log('PASS: '+records.length+' real browser media cases: external images, button containers, cross-origin iframes, long figures, Notebook SVG, selection; include/exclude; PDF/HWPX; editable equations; scroll restoration.');
 await context.close();
}finally{await browser.close();}
