import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Use a local Playwright installation or the desktop's bundled dependency.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.AICE_PLAYWRIGHT || 'playwright');
const output = path.resolve('tmp/print-regression');
fs.mkdirSync(output, { recursive: true });
const scripts = [
  'utils/dom-utils', 'utils/site-detector', 'adapters/base', 'adapters/chatgpt',
  'exporter/math-preserver', 'exporter/image-handler', 'exporter/content-cleaner',
  'exporter/dom-cloner', 'exporter/hwp-equations', 'exporter/text-math',
  'exporter/hwp-package', 'exporter/print-engine', 'main'
].map(name => fs.readFileSync(`chrome-extension/content/${name}.js`, 'utf8'));
const css = fs.readFileSync('chrome-extension/styles/print.css', 'utf8');
const fixture = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>PDF 선명도 회귀 검증</title><style>
body {font:16px Arial;background:white} .answer{width:680px}
.dark .answer{color:rgb(235,235,235);background:#222}
.faded .answer{opacity:.12!important;filter:blur(.7px);mask-image:linear-gradient(#0003,#0003)}
.faded .answer p{color:#eee!important;-webkit-text-fill-color:#eee!important}
.katex-mathml{position:absolute;clip:rect(1px,1px,1px,1px);width:1px;height:1px;overflow:hidden}
.katex-html{font-family:serif} .fraction{display:inline-flex;flex-direction:column;text-align:center;vertical-align:middle}
.fraction .top{border-bottom:1px solid currentColor}
</style></head><body><main>
<article><div data-message-author-role="user">질문: 에너지와 분수를 설명해 주세요.</div></article>
<article><div class="answer" data-message-author-role="assistant" onmouseenter="window.__unsafe=1">
<h2>본문 선명도 검증</h2><p>한글 본문과 English text 12345: 작은 글씨도 선명해야 합니다.</p>
<p>수식 <span class="katex"><span class="katex-mathml"><math><semantics><mfrac><mi>a</mi><mi>b</mi></mfrac><annotation encoding="application/x-tex">\\frac{a}{b}</annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span class="fraction"><span class="top">a</span><span>b</span></span></span></span> 와 <math><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><mn>1</mn></math></p>
<table><thead><tr><th>항목</th><th>값</th></tr></thead><tbody><tr><td>속도</td><td>3 m/s</td></tr></tbody></table>
<pre><code>const energy = mass * c ** 2;</code></pre>
<svg width="100" height="35" viewBox="0 0 100 35"><defs><path id="shape" d="M5 5H95V30H5Z"/></defs><use href="#shape" fill="#2463a0"/></svg>
<button>복사</button></div></article></main></body></html>`;

const records = [];
for (const channel of (process.env.AICE_BROWSER_CHANNELS || 'chrome').split(',')) {
  const browser = await chromium.launch({ channel, headless: true });
  try {
    for (const scale of [1, 1.25, 2]) {
      const context = await browser.newContext({ deviceScaleFactor: scale });
      await context.route('https://chatgpt.com/**', route => route.fulfill({ contentType: 'text/html', body: fixture }));
      const page = await context.newPage();
      for (const theme of ['light', 'dark', 'faded', 'host-print-hidden']) {
        for (const mode of ['current', 'conversation', 'selection']) {
          await page.emulateMedia({ media: 'screen' });
          await page.goto('https://chatgpt.com/test-fixture');
          await page.evaluate(({ theme, scale }) => {
            document.body.className = theme;
            document.body.style.zoom = String(scale);
            if (theme === 'host-print-hidden') {
              const style = document.createElement('style');
              style.textContent = '@media print{html,body{visibility:hidden!important;opacity:0!important}body>*{display:none!important}}';
              document.head.append(style);
            }
            window.chrome = { runtime: { onMessage: { addListener(fn) { window.exportListener = fn; } } } };
            const append = document.body.append.bind(document.body);
            document.body.append = (...nodes) => {
              append(...nodes);
              for (const node of nodes) if (node.id === 'ai-chat-exporter-print-frame') {
                const actualPrint = node.contentWindow.print.bind(node.contentWindow);
                node.contentWindow.print = () => { window.printCalls = (window.printCalls || 0) + 1; actualPrint(); };
              }
            };
            const range = document.createRange();
            range.selectNodeContents(document.querySelector('.answer'));
            getSelection().addRange(range);
          }, { theme, scale });
          for (const source of scripts) await page.addScriptTag({ content: source });
          const original = await page.locator('main').innerHTML();
          const response = await page.evaluate(({ mode, css, scale }) => new Promise(resolve => exportListener({
            type: 'AI_CHAT_EXPORTER_EXPORT', mode, target: 'pdf', printCss: css,
            settings: { includeTitle: true, includeDate: true, includeUser: true, includeAssistant: true,
              orientation: scale === 1.25 ? 'landscape' : 'portrait', margin: scale === 2 ? 'narrow' : 'normal', wrapCode: true }
          }, {}, resolve)), { mode, css, scale });
          assert.equal(response.ok, true, response.error);
          await page.emulateMedia({ media: 'print' });
          const appearance = await page.evaluate(() => {
            const root = document.querySelector('#ai-chat-exporter-print-frame').contentDocument.querySelector('#ai-chat-exporter-print-root');
            const p = root.querySelector('p:not(.aice-document-header p)');
            const chain = [];
            for (let n = p; n && n !== root.ownerDocument.body; n = n.parentElement) {
              const s = n.ownerDocument.defaultView.getComputedStyle(n);
              chain.push({ opacity: s.opacity, filter: s.filter, mask: s.maskImage });
            }
            const use = root.querySelector('use');
            return { color: getComputedStyle(p).color, fill: getComputedStyle(p).webkitTextFillColor,
              mathColor: getComputedStyle(root.querySelector('math')).color,
              chain, safe: !root.querySelector('[onmouseenter]'),
              svg: Boolean(root.querySelector(use.getAttribute('href'))), calls: window.printCalls,
              text: root.textContent };
          });
          assert.equal(appearance.color, 'rgb(23, 25, 31)');
          assert.equal(appearance.fill, 'rgb(23, 25, 31)');
          assert.equal(appearance.mathColor, 'rgb(23, 25, 31)');
          for (const s of appearance.chain) assert.deepEqual(s, { opacity: '1', filter: 'none', mask: 'none' });
          assert.equal(appearance.safe, true);
          assert.equal(appearance.svg, true);
          assert.equal(appearance.calls, 1);
          assert.equal(await page.locator('main').innerHTML(), original);
          assert.doesNotMatch(appearance.text, /복사/);
          if (channel === 'chrome' && scale === 1 && ['faded','host-print-hidden'].includes(theme)) {
            // Page.printToPDF targets a top-level page, not a subframe. Render
            // the exact retained print document separately for PDF inspection.
            const html = await page.evaluate(() => document.querySelector('#ai-chat-exporter-print-frame').contentDocument.documentElement.outerHTML);
            const preview = await context.newPage();
            await preview.setContent(html);
            await preview.pdf({ path: path.join(output, `${theme === 'faded' ? '' : 'isolated-'}${mode}.pdf`), preferCSSPageSize: true, printBackground: true });
            await preview.close();
          }
          await page.evaluate(() => {
            const frame = document.querySelector('#ai-chat-exporter-print-frame');
            frame.contentWindow.dispatchEvent(new frame.contentWindow.Event('afterprint'));
          });
          assert.equal(await page.locator('#ai-chat-exporter-print-frame').count(), 1, 'retain preview document until next export');
          assert.equal(await page.locator('#ai-chat-exporter-print-root').count(), 0);
          assert.equal(await page.locator('#ai-chat-exporter-print-style').count(), 0);
          const hwp = await page.evaluate(mode => new Promise(resolve => exportListener({
            type: 'AI_CHAT_EXPORTER_EXPORT', mode, target: 'hwpx', settings: { includeUser: true, includeAssistant: true }
          }, {}, resolve)), mode);
          assert.equal(hwp.ok, true, hwp.error);
          assert.equal(hwp.package.equations.length, 2);
          assert.equal(hwp.package.diagnostics.omittedEquations.length, 0);
          assert.match(hwp.package.html, /한글 본문/);
          records.push({ channel, browser: browser.version(), scale, theme, mode, hwpxEquations: 2, status: 'pass' });
        }
      }
      await context.close();
    }
  } finally { await browser.close(); }
}
fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(records, null, 2));
console.log(`PASS: ${records.length} native headless frame-print calls and ${records.length} HWPX extraction cases (host CSS isolation, themes, DPI/zoom, modes, math, SVG, retained preview, source preservation).`);
