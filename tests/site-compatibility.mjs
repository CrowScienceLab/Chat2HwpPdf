import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const scripts = [
  'content/utils/dom-utils.js', 'content/utils/site-detector.js', 'content/adapters/base.js',
  'content/adapters/gemini.js', 'content/adapters/notebooklm.js', 'content/adapters/claude.js', 'content/adapters/generic.js',
  'content/exporter/math-preserver.js', 'content/exporter/hwp-equations.js', 'content/exporter/text-math.js',
  'content/exporter/content-cleaner.js', 'content/exporter/dom-cloner.js', 'content/exporter/hwp-package.js'
];
function page(host, html) {
  const dom = new JSDOM(html, { url: `https://${host}/`, runScripts: 'outside-only', pretendToBeVisual: true });
  // jsdom has no layout engine; give actual nodes a visible rectangle for adapter selection.
  dom.window.Element.prototype.getBoundingClientRect = () => ({ width: 500, height: 50 });
  // jsdom does not implement MathML CSS declarations; provide only the missing
  // style surface so source extraction can run through the normal clone path.
  const styles = new WeakMap();
  Object.defineProperty(dom.window.Element.prototype, 'style', { get() {
    if (!styles.has(this)) styles.set(this, dom.window.document.createElement('span').style);
    return styles.get(this);
  } });
  const computedStyle = dom.window.getComputedStyle.bind(dom.window);
  dom.window.getComputedStyle = element => element.namespaceURI === 'http://www.w3.org/1998/Math/MathML'
    ? element.style : computedStyle(element);
  dom.window.AIChatExporter = { imageHandler: { copyCanvas() {} } };
  for (const script of scripts) vm.runInContext(fs.readFileSync(script, 'utf8'), dom.getInternalVMContext());
  return dom;
}
async function packageNode(dom, node, adapter, settings = {}) {
  const api = dom.window.AIChatExporter;
  const original = node.outerHTML;
  const { clone, mathCount } = api.domCloner.cloneNode(node, adapter);
  const payload = await api.hwpPackage.create({ content: clone, title: adapter.getTitle(), siteLabel: adapter.label, settings, mathCount });
  assert.equal(node.outerHTML, original, 'export must not mutate the source');
  for (const eq of payload.equations) assert.equal(payload.html.split(eq.marker).length, 2, 'one placeholder per equation');
  return payload;
}
const gemini = page('gemini.google.com', String.raw`<title>Gemini</title><main>
  <user-query><p>질문</p></user-query><model-response><p>첫 답변</p></model-response>
  <user-query><p>두 번째 질문</p></user-query><model-response>
    <p><span class="math-inline" data-math="dm"><span class="katex"><span class="katex-html">dm</span></span></span></p>
    <div class="math-block" data-math="2s\,ds=2Rr\sin\theta\,d\theta\implies ds=\frac{Rr}{s}\sin\theta\,d\theta"><span class="katex">rendered</span></div>
    <p>원문 $\sigma=\frac{M}{4\pi R^2}$ 와 일반 문장.</p>
    <p>가격 $5 and $10. 코드 <code>$x^2$</code></p><button>복사</button>
  </model-response></main>`);
const ga = gemini.window.AIChatExporter.adapters.gemini;
assert.deepEqual(Array.from(ga.getMessages(), m => m.role), ['user', 'assistant', 'user', 'assistant']);
const gp = await packageNode(gemini, ga.getLatestAssistantMessage(), ga);
assert.equal(gp.equations.length, 3);
assert.equal(gp.equations[0].script, 'd m');
assert.match(gp.equations[1].script, /RARROW/);
assert.equal(gp.equations[1].display, true);
assert.match(gp.html, /가격 \$5 and \$10/);
assert.match(gp.html, /<code>\$x\^2\$<\/code>/);
assert.doesNotMatch(gp.html, /<button|rendered/);

const notebook = page('notebook.google.com', String.raw`<title>Gemini Notebook</title>
  <note-editor><input aria-label="노트 제목 수정 가능" value="수식 메모"><labs-tailwind-doc-viewer class="note-editor">
    <p><bdi class="math-element"><span data-math="v_0"><span class="katex">v0</span></span></bdi> 속도</p>
    <div><bdi class="math-element"><span data-math="y=\frac{1}{2}gt^2\quad\text{--- (식 2)}"><span class="katex-display"><span class="katex">rendered</span></span></span></bdi></div>
    <p><bdi class="math-element"><span data-math="\vec{F}=-mg\hat{j}"><span class="katex">rendered</span></span></bdi></p>
  </labs-tailwind-doc-viewer></note-editor>`);
const na = notebook.window.AIChatExporter.adapters.notebooklm;
assert.equal(na.detect(), true);
assert.equal(na.getTitle(), '수식 메모');
const np = await packageNode(notebook, na.getCurrentNote(), na);
assert.equal(np.equations.length, 3);
assert.equal(np.equations[1].display, true);
assert.match(np.equations[1].script, /식 2/);
assert.match(np.equations[2].script, /vec.*hat/);

const claude = page('claude.ai', String.raw`<title>조화법칙 - Claude</title><aside>대화 목록 제외</aside><main><div role="feed">
  <div role="article"><h2 data-find-omitted="" class="sr-only">보낸 메시지: 질문</h2><div data-testid="user-message"><p>질문</p></div><div role="toolbar">작업</div></div>
  <div role="article"><h2 data-find-omitted="" class="sr-only">Claude 응답: 설명</h2><div data-testid="assistant-message"><div class="font-claude-message">
    <p>궤도 <span class="katex" role="math"><span class="katex-mathml"><math><semantics><mrow><msup><mi>T</mi><mn>2</mn></msup><mo>∝</mo><msup><mi>r</mi><mn>3</mn></msup></mrow><annotation encoding="application/x-tex">T^2\propto r^3</annotation></semantics></math></span><span class="katex-html">duplicated visual</span></span></p>
    <span class="katex-display"><span class="katex" role="math"><math display="block"><msub><mi>F</mi><mtext>중력</mtext></msub><mo>=</mo><mi>G</mi><mfrac><mrow><mi>M</mi><mi>m</mi></mrow><msup><mi>r</mi><mn>2</mn></msup></mfrac></math><span class="katex-html">duplicated visual</span></span></span>
    </div><div role="toolbar"><button>복사</button></div></div></div>
</div></main>`);
const ca = claude.window.AIChatExporter.adapters.claude;
assert.equal(ca.detect(), true);
assert.equal(claude.window.AIChatExporter.siteDetector.detect(), 'claude');
assert.equal(ca.getTitle(), '조화법칙');
assert.deepEqual(Array.from(ca.getMessages(), m => m.role), ['user', 'assistant']);
const cp = await packageNode(claude, ca.getLatestAssistantMessage(), ca);
assert.equal(cp.equations.length, 2);
assert.equal(cp.equations[1].display, true);
assert.match(cp.equations[1].script, /중력/);
assert.doesNotMatch(cp.html, /duplicated visual|toolbar|대화 목록 제외|<button/);

// An entire selected formula keeps its source even when the site's semantic wrapper is absent.
const range = notebook.window.document.createRange();
range.selectNode(notebook.window.document.querySelector('[data-math]'));
notebook.window.getSelection().addRange(range);
const selected = notebook.window.AIChatExporter.domCloner.cloneSelection(na);
const sp = await notebook.window.AIChatExporter.hwpPackage.create({ content: selected.clone, title: '', siteLabel: 'synthetic-fixture', settings: {}, mathCount: selected.mathCount });
assert.equal(sp.equations.length, 1);

const generic = page('example.org', String.raw`<main><aside>제외</aside><div data-role="user">질문</div><div data-role="assistant"><p>앞 문단</p><span data-latex="x\gg y">visual</span><span data-latex="\unsupported{x}">bad visual</span><span data-latex="z\ll 1">visual</span><p>끝 문단</p></div></main>`);
const genericAdapter = generic.window.AIChatExporter.adapters.generic;
assert.equal(generic.window.AIChatExporter.siteDetector.detect(), 'generic');
assert.deepEqual(Array.from(genericAdapter.getMessages(), m => m.role), ['user', 'assistant']);
const partial = await packageNode(generic, genericAdapter.getLatestAssistantMessage(), genericAdapter);
assert.equal(partial.equations.length, 2);
assert.equal(partial.equations[0].script, 'x >> y');
assert.equal(partial.equations[1].script, 'z << 1');
assert.equal(partial.diagnostics.omittedEquations.length, 1);
assert.equal(partial.diagnostics.omittedEquations[0].number, 2);
assert.match(partial.html, /\[수식 2 생략\]/);
assert.match(partial.html, /앞 문단/);
assert.match(partial.html, /끝 문단/);
assert.doesNotMatch(partial.html, /bad visual|제외/);
const unknown = page('example.net', '<main><p>선택할 본문</p><span class="katex">원문 없음</span></main>');
const ua = unknown.window.AIChatExporter.adapters.generic;
assert.equal(ua.getMessages().length, 0);
assert.equal(ua.getLatestAssistantMessage(), null);
const allOmitted = await packageNode(unknown, unknown.window.document.querySelector('main'), ua);
assert.equal(allOmitted.equations.length, 0);
assert.equal(allOmitted.diagnostics.omittedEquations.length, 1);
assert.match(allOmitted.html, /선택할 본문/);

const notebookTags = page('notebook.google.com', String.raw`<chat-message><mat-card class="to-user-message-card-content" _ngcontent-ng-c790032417=""><mat-card-content><labs-tailwind-doc-viewer><element-list-renderer><thinking-chain-view>추론 제외</thinking-chain-view><labs-tailwind-structural-element-view-v2><paragraph-element-view><p>만유인력과 조화법칙</p><bdi class="math-element"><span data-math="T^2=\frac{4\pi^2}{GM}r^3"><span class="katex-display"><span class="katex">visual</span></span></span></bdi><p>끝 문단</p><table><tbody><tr><td>표 보존</td></tr></tbody></table></paragraph-element-view></labs-tailwind-structural-element-view-v2></element-list-renderer></labs-tailwind-doc-viewer></mat-card-content></mat-card></chat-message>`);
const nta = notebookTags.window.AIChatExporter.adapters.notebooklm;
const ntp = await packageNode(notebookTags, nta.getLatestAssistantMessage(), nta);
assert.equal(ntp.equations.length, 1);
assert.doesNotMatch(ntp.html, /<\/?(?:mat-|labs-|element-|paragraph-|bdi|main)|_ng|추론 제외|position:fixed/);
assert.match(ntp.html, /만유인력과 조화법칙/);
assert.match(ntp.html, /<table>/);
const partialRange = notebookTags.window.document.createRange();
const textNode = notebookTags.window.document.querySelector('.katex').firstChild;
partialRange.setStart(textNode, 1); partialRange.setEnd(textNode, 3);
notebookTags.window.getSelection().addRange(partialRange);
const partialSelection = notebookTags.window.AIChatExporter.domCloner.cloneSelection(nta);
assert.equal(partialSelection.clone.querySelector('[data-math]').getAttribute('data-math'), String.raw`T^2=\frac{4\pi^2}{GM}r^3`);
const preference = page('example.com', String.raw`<div data-role="assistant"><span class="katex" data-latex="y"><math><mi>x</mi></math></span></div>`);
const pa = preference.window.AIChatExporter.adapters.generic;
assert.equal((await packageNode(preference, pa.getLatestAssistantMessage(), pa, {mathSource:'latex'})).equations[0].script, 'y');
assert.equal((await packageNode(preference, pa.getLatestAssistantMessage(), pa, {mathSource:'mathml'})).equations[0].script, 'x');
preference.window.document.querySelector('[data-latex]').setAttribute('data-latex', String.raw`\unsupported{x}`);
assert.equal((await packageNode(preference, pa.getLatestAssistantMessage(), pa, {mathSource:'latex'})).equations[0].script, 'x');
for (const [host, html] of [
  ['grok.com','<div role="article" data-testid="user-message">질문</div><div role="article" data-testid="assistant-message"><div class="thinking-container">제외</div><p>답변</p></div>'],
  ['chat.deepseek.com','<div class="ds-markdown">답변</div>'],
  ['www.meta.ai','<div data-testid="assistant-response">답변</div>']
]) {
  const site = page(host, `<main>${html}</main>`);
  assert.equal(site.window.AIChatExporter.adapters.generic.getMessages().filter(m=>m.role==='assistant').length, 1);
  site.window.close();
}

if (process.argv.includes('--write-fixtures')) {
  fs.mkdirSync('tmp/site-compatibility', { recursive: true });
  for (const [name, payload] of [['gemini', gp], ['notebook', np], ['claude', cp], ['partial', partial], ['all-omitted', allOmitted], ['notebook-tags', ntp]]) {
    fs.writeFileSync(`tmp/site-compatibility/${name}.json`, JSON.stringify({ ...payload, source: 'synthetic-fixture' }, null, 2));
  }
}

for (const dom of [gemini, notebook, claude, generic, unknown, notebookTags, preference]) dom.window.close();
console.log('PASS: Gemini data-math/raw TeX, Notebook nested source, Claude roles/MathML, selection, duplicate removal; source and code/currency preserved.');
