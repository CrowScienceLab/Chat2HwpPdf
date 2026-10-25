import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
// Run the native host with document-format.mjs's fixture, then extract its
// Contents/header.xml and section0.xml into the directory supplied here.
const directory=process.argv[2] || 'tmp/document-format';
const parse=name=>new JSDOM(fs.readFileSync(path.join(directory,name),'utf8'),{contentType:'application/xml'}).window.document;
const header=parse('header.xml'),section=parse('section0.xml');
const all=(node,name)=>[...node.getElementsByTagNameNS('*',name)];
const chars=Object.fromEntries(all(header,'charPr').map(n=>[n.getAttribute('id'),n.getAttribute('height')]));
const paras=Object.fromEntries(all(header,'paraPr').map(n=>[n.getAttribute('id'),all(n,'lineSpacing')]));
const paragraphs=all(section,'p').map(n=>{
 const runs=[...n.children].filter(c=>c.localName==='run');
 return {text:runs.flatMap(r=>[...r.children].filter(c=>c.localName==='t').map(c=>c.textContent)).join(''),sizes:runs.map(r=>chars[r.getAttribute('charPrIDRef')]),spacing:paras[n.getAttribute('paraPrIDRef')]};
});
const expected={'문서 전체 제목':'2000','답변 제목':'1500','중간제목 A':'1500','중간제목 B':'1500','본문 A 가나다 ABC 123':'1100','본문 B':'1100','본문 C':'1100','표 제목':'1100','값':'1100','표 본문':'1100','42':'1100'};
for(const [text,size] of Object.entries(expected)){
 const index=paragraphs.findIndex(p=>p.text===text); assert.ok(index>=0,`Missing ${text}`);
 const paragraph=paragraphs[index];assert.ok(paragraph.sizes.length>0);assert.ok(paragraph.sizes.every(s=>s===size),`${text}: ${paragraph.sizes}`);
 assert.ok(paragraph.spacing.length>0);assert.ok(paragraph.spacing.every(n=>n.getAttribute('type')==='PERCENT'&&n.getAttribute('value')==='150'),`${text}: spacing`);
 if(size==='1500')assert.equal(paragraphs[index-1].text,'',`${text}: preceding blank paragraph`);
}
const margin=all(section,'margin')[0];
for(const [name,value] of Object.entries({top:4251,bottom:4251,left:5669,right:5669,header:2834,footer:2834}))assert.equal(Number(margin.getAttribute(name)),value,name);
assert.ok(paragraphs.every(p=>!p.text.includes('AICEHD')),'No heading markers remain');
console.log('PASS: native HWPX body/table 11pt, title 20pt, headings 15pt + blank paragraph, 150% spacing, all six margins.');
