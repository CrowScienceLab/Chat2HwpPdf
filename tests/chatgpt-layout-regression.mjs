import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

// Structural fixture from the 2026-11-09 rendered ChatGPT page. No account
// identifiers, private conversation content or generated CSS names are stored.
const heading=(role,label,attribute=true)=>`<h4 class="sr-only" ${attribute?`data-conversation-role="${role}"`:''}><span>${label}</span><span class="hidden" aria-hidden="true">${role==='user'?'나':'ChatGPT'}</span></h4>`;
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
const answer=(id)=>`<p>답변${id} 본문 <math><mi>x</mi><mo>+</mo><mn>${id}</mn></math></p><h4>일반 소제목</h4><table><tr><td>표${id}</td></tr></table><img src="${image}" alt="그림${id}">`;
const modern=(id,labels=['내가 한 말:','ChatGPT 답변:'],attribute=true)=>`<div data-turn-key="synthetic-${id}"><div data-content-search-turn-key="turn-${id}"><div class="group" data-talvt-turn-state="complete"><div class="turn-blocks"><div class="message-block">${heading('user',labels[0],attribute)}<div data-chatgpt-search-unit-key="turn-${id}:0:user"><p>질문${id}</p><button>메시지 복사</button></div></div><div><button>처리 시간</button></div><div class="message-block"><div data-content-search-unit-key="turn-${id}:2:assistant">${heading('assistant',labels[1],attribute)}<div>${answer(id)}</div></div></div></div><div role="toolbar"><button>공유</button></div></div></div></div>`;
const old=(id)=>`<article><div data-message-author-role="user"><p>질문${id}</p></div></article><article><div data-message-author-role="assistant">${answer(id)}</div></article>`;
const fixtures=[
 {name:'current-role-attribute',html:modern(1)+modern(2)},
 {name:'hidden-print-label-without-role-attribute',html:modern(1,undefined,false)+modern(2,undefined,false)},
 {name:'translated-role-labels',html:modern(1,['Du:','ChatGPT:'])+modern(2,['Du:','ChatGPT:'])},
 {name:'legacy-explicit-roles',html:old(1)+old(2)},
 {name:'mixed-old-new',html:old(1)+modern(2)},
 {name:'old-semantic-headings',html:[1,2].map(id=>`<div><section><h4>You said:</h4><p>질문${id}</p></section><section><h4>ChatGPT said:</h4>${answer(id)}</section></div>`).join('')},
 {name:'hidden-explicit-copy',html:modern(1)+modern(2)+`<div hidden>${old(9)}</div>`}
];
const scripts=['utils/dom-utils','utils/site-detector','adapters/base','adapters/chatgpt','exporter/math-preserver','exporter/image-handler','exporter/content-cleaner','exporter/dom-cloner','exporter/hwp-equations','exporter/text-math','exporter/hwp-package','exporter/print-engine','main'].map(name=>fs.readFileSync(`chrome-extension/content/${name}.js`,'utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
fs.mkdirSync('tmp/chatgpt-layout',{recursive:true});
const failures=[];let passed=0;
try{
 const context=await browser.newContext();
 for(const fixture of fixtures){
  const page=await context.newPage();
  await page.route('https://chatgpt.com/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',headers:{'Content-Security-Policy':"base-uri 'none'"},body:`<!doctype html><meta charset="utf-8"><title>시험 대화</title><style>.sr-only{position:absolute;width:1px;height:1px;overflow:hidden}.hidden,[hidden]{display:none!important}</style><nav>대화 목록 제외</nav><div role="main">${fixture.html}<footer>화면 안내 제외</footer><h4>최신 응답</h4><form><textarea>입력창 제외</textarea></form></div>`}));
  await page.goto('https://chatgpt.com/c/layout-fixture');
  await page.evaluate(()=>{
   window.chrome={runtime:{onMessage:{addListener(fn){window.exportListener=fn;}}}};
   const append=document.body.append.bind(document.body);
   document.body.append=(...nodes)=>{append(...nodes);for(const n of nodes)if(n.tagName==='IFRAME')n.contentWindow.print=()=>{};};
  });
  for(const source of scripts)await page.addScriptTag({content:source});
  const original=await page.locator('[role="main"]').innerHTML();
  for(const mode of ['current','conversation'])for(const target of ['hwpx','pdf']){
   try{
    const response=await page.evaluate(({mode,target,css})=>new Promise(resolve=>exportListener({type:'AI_CHAT_EXPORTER_EXPORT_V2',mode,target,settings:{includeImages:true,includeTitle:true,includeUser:true,includeAssistant:true,wrapCode:true},printCss:css},{},resolve)),{mode,target,css:fs.readFileSync('chrome-extension/styles/print.css','utf8')});
    assert.equal(response.ok,true,`${fixture.name}/${mode}/${target}: ${response.error}`);
    const observed=await page.evaluate(({target,response})=>{
     const doc=target==='hwpx'?new DOMParser().parseFromString(response.package.html,'text/html'):document.querySelector('#ai-chat-exporter-print-frame').contentDocument;
     return {text:doc.body.textContent,images:doc.querySelectorAll('img').length,roles:[...doc.querySelectorAll('.aice-role-label')].map(n=>n.textContent),headings:doc.querySelectorAll('h4[data-conversation-role]').length};
    },{target,response});
    assert.match(observed.text,/답변2 본문/);
    assert.doesNotMatch(observed.text,/대화 목록 제외|화면 안내 제외|입력창 제외|최신 응답|질문9|답변9|메시지 복사|처리 시간/);
    assert.equal(observed.images,mode==='current'?1:2);
    assert.equal(observed.headings,0,'site role headings must not become document headings');
    if(mode==='current'){assert.doesNotMatch(observed.text,/질문[12]|답변1/);}else{
     if(target==='pdf')assert.deepEqual(observed.roles,['질문','답변','질문','답변']);
     assert.match(observed.text,/질문1[\s\S]*답변1[\s\S]*질문2[\s\S]*답변2/);
    }
    if(target==='hwpx')assert.equal(response.package.equations.length,mode==='current'?1:2);
    assert.equal(await page.locator('[role="main"]').innerHTML(),original,'export must not change the live conversation');
    if(fixture.name==='current-role-attribute'&&target==='hwpx')fs.writeFileSync(`tmp/chatgpt-layout/${mode}.json`,JSON.stringify({...response.package,format:'HWPX'},null,2));
    if(fixture.name==='current-role-attribute'&&target==='pdf'&&process.argv.includes('--render')){
     const html=await page.evaluate(()=>document.querySelector('#ai-chat-exporter-print-frame').contentDocument.documentElement.outerHTML);
     const preview=await context.newPage();await preview.setContent(html);
     await preview.pdf({path:`tmp/chatgpt-layout/${mode}.pdf`,preferCSSPageSize:true,printBackground:true});await preview.close();
    }
    passed++;
   }catch(error){failures.push(`${fixture.name}/${mode}/${target}: ${error.message}`);}
   await page.evaluate(()=>document.querySelector('#ai-chat-exporter-print-frame')?.contentWindow.dispatchEvent(new Event('afterprint')));
  }
  await page.close();
 }
}finally{await browser.close();}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log(`PASS: ${passed} ChatGPT current/conversation PDF/HWPX cases; old/new/localized role headings, hidden duplicates, images, editable equations and message boundaries.`);
