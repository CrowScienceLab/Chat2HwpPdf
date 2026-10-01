import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const context = vm.createContext({});
vm.runInContext(fs.readFileSync("chrome-extension/content/exporter/hwp-equations.js", "utf8"), context);
const convert = context.AIChatExporter.hwpEquations.fromLatex;
assert.equal(convert(String.raw`\frac{dy}{dt}`), "{d y} over {d t}");
assert.equal(convert(String.raw`e^{-bt/m}`), "e ^{- b t / m}");
assert.equal(convert(String.raw`\sqrt{x^2+1}`), "sqrt {x ^{2} + 1}");
assert.throws(() => convert(String.raw`\unknown{x}`), /지원하지 않는/);
assert.throws(() => convert(String.raw`\frac{x}`), /누락/);
assert.throws(() => convert("{x"), /닫히지/);
assert.equal(convert(String.raw`\frac mb`), "{m} over {b}");
assert.equal(convert(String.raw`\frac12gt^2`), "{1} over {2} g t ^{2}");
assert.equal(convert(String.raw`\vec F_{\rm drag}\propto v^2`), "vec {F} _{rm d r a g} propto v ^{2}");
assert.equal(convert(String.raw`\boxed{x+1}`), "{x + 1}");
const expressions = [
  String.raw`F=ma`,
  String.raw`\frac{dy}{dt}=\left(v_0\sin\theta+\frac{mg}{b}\right)e^{-bt/m}-\frac{mg}{b}`,
  String.raw`y(t)=\int\left[\left(v_0\sin\theta+\frac{mg}{b}\right)e^{-bt/m}-\frac{mg}{b}\right]dt`,
  String.raw`\int e^{-bt/m}dt=-\frac{m}{b}e^{-bt/m}+C`,
  String.raw`\int_0^t v(s)\,ds`,
  String.raw`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`
];
const equations = expressions.map((source, index) => ({ marker: `AICEEQTESTN${index}END`, script: convert(source), fontSize: 11, display: index > 0 }));
const payload = {
  schemaVersion: 2, title: "편집 가능한 수식 검증", source: "synthetic-fixture", privacy: "local-only", format: "HWPX", equations,
  html: '<!doctype html><html><head><meta charset="utf-8"></head><body><h1>편집 가능한 한글 수식</h1>' + equations.map((eq, index) => `<p>검증 ${index + 1}: ${eq.marker}</p><p>수식 아래 문단입니다. 겹치지 않아야 합니다.</p>`).join("") + '</body></html>'
};
fs.mkdirSync("tmp/equations", { recursive: true });
fs.writeFileSync("tmp/equations/fixture.json", JSON.stringify(payload, null, 2));
console.log("PASS: LaTeX conversion, malformed/unsupported input rejection; 6 equation fixture written.");
