document.querySelector("#run").addEventListener("click", async () => {
  try {
    const source = document.querySelector("#source");
    const clone = source.cloneNode(true);
    const mathCount = AIChatExporter.mathPreserver.preserve(source, clone);
    const payload = await AIChatExporter.hwpPackage.create({ content: clone, title: "브라우저 원문 → 한글 수식", siteLabel: "synthetic-fixture", settings: { includeTitle: true }, mathCount });
    payload.format = "HWPX";
    const pass = payload.equations.length === 8 && payload.diagnostics.warnings.length === 1 && !/<img|<math|중복 시각 표현/.test(payload.html) && payload.equations.every(eq => payload.html.split(eq.marker).length === 2);
    if (!pass) throw new Error("수식 중복/누락 또는 그림 대체 발생");
    const response = await fetch("/fixture-result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error("로컬 저장 실패");
    document.querySelector("#status").textContent = JSON.stringify({ pass, equations: payload.equations }, null, 2);
  } catch (error) { document.querySelector("#status").textContent = `FAIL: ${error.message}`; }
});
