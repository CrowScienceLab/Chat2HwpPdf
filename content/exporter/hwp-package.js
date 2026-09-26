(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  if (AICE.hwpPackage?.version === 6) return;

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function imageFromUrl(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
      image.src = url;
    });
  }

  function replaceMathWithEquations(root, mathSource) {
    AICE.textMath?.materialize(root);
    const nodes = AICE.mathPreserver.findMath(root);
    const batch = crypto.randomUUID().replaceAll("-", "");
    const omittedEquations = [];
    const equations = nodes.map((node, index) => {
      let converted;
      try {
        converted = AICE.hwpEquations.convert(node, mathSource);
        if (!converted.script.trim()) throw new Error("빈 수식");
      } catch (error) {
        omittedEquations.push({ number: index + 1, reason: String(error.message || error).slice(0, 160) });
        const omitted = document.createElement("span");
        omitted.textContent = `[수식 ${index + 1} 생략]`;
        node.replaceWith(omitted);
        return null;
      }
      const marker = "AICEEQ" + batch + "N" + index + "END";
      const display = node.matches('.katex-display, .math-block, .aice-display-math, math[display="block"], mjx-container[display="true"]') || Boolean(node.closest('.katex-display')) || Boolean(node.querySelector('.katex-display, math[display="block"]'));
      const placeholder = document.createElement("span");
      placeholder.textContent = marker;
      placeholder.style.cssText = display ? "display:block;margin:8pt 0;" : "display:inline;";
      if (display) node.replaceWith(document.createElement('br'), placeholder, document.createElement('br'));
      else node.replaceWith(placeholder);
      return { marker, script: converted.script, sourceType: converted.sourceType, display, fontSize: 11, warnings: converted.warnings || [] };
    }).filter(Boolean);
    return { equations, omittedEquations };
  }

  async function inlineImages(root) {
    const images = [...root.querySelectorAll("img")].filter((image) => !image.src.startsWith("data:"));
    let omitted = 0;
    for (const image of images) {
      try {
        if (!image.complete) await imageFromUrl(image.currentSrc || image.src);
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width || 1;
        canvas.height = image.naturalHeight || image.height || 1;
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        image.src = canvas.toDataURL("image/png");
        image.removeAttribute("srcset");
      } catch (_) {
        const placeholder = document.createElement("span");
        placeholder.className = "aice-image-omitted";
        placeholder.textContent = `[이미지 생략: ${image.alt || "교차 출처 이미지"}]`;
        image.replaceWith(placeholder);
        omitted += 1;
      }
    }
    return omitted;
  }

  // Hancom's HTML importer can print unknown web-component tags literally.
  // Rebuild a small HTML vocabulary after equation extraction, never before it.
  function normalizeHtml(root) {
    const allowed = new Set('div span p br hr h1 h2 h3 h4 h5 h6 ul ol li table thead tbody tfoot tr th td caption colgroup col b strong i em u s sub sup pre code blockquote a img'.split(' '));
    root.querySelectorAll('script,style,template,svg,iframe,object').forEach(n => n.remove());
    for (const node of [...root.querySelectorAll('*')]) {
      let target = node;
      if (!allowed.has(node.localName)) {
        target = document.createElement(['bdi','bdo','mark','small','time'].includes(node.localName) ? 'span' : 'div');
        target.append(...node.childNodes);
        node.replaceWith(target);
      }
      const markerStyle = node.textContent.startsWith('AICEEQ') && node.children.length === 0 ? node.style.cssText : '';
      for (const attribute of [...target.attributes]) {
        if (!['href','src','alt','colspan','rowspan','start','width','height'].includes(attribute.name)) target.removeAttribute(attribute.name);
      }
      if (markerStyle) target.style.cssText = markerStyle;
    }
  }

  async function create({ content, title, siteLabel, settings, mathCount }) {
    const root = document.createElement("div");
    root.className = "aice-hwp-document";
    if (settings.includeTitle) {
      const heading = document.createElement("h1");
      heading.textContent = title || `${siteLabel} 내보내기`;
      root.append(heading);
    }
    if (settings.includeDate) {
      const meta = document.createElement("p");
      meta.className = "aice-metadata";
      meta.textContent = `${siteLabel} · ${new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date())}`;
      root.append(meta);
    }
    root.append(content);
    document.body.append(root);
    root.style.cssText = "position:fixed;left:-100000px;top:0;width:176mm;background:white;color:black;";
    try {
      const { equations, omittedEquations } = replaceMathWithEquations(root, settings.mathSource);
      const omittedImages = await inlineImages(root);
      normalizeHtml(root);
      root.removeAttribute('style');
      return {
        schemaVersion: 2,
        equations,
        title: title || `${siteLabel} 내보내기`,
        source: siteLabel,
        createdAt: new Date().toISOString(),
        privacy: "local-only",
        diagnostics: { sourceMathCount: mathCount, equationCount: equations.length, omittedEquations, omittedImages, warnings: [...new Set(equations.flatMap(eq => eq.warnings))] },
        html: `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:'함초롬바탕','Malgun Gothic',sans-serif;line-height:1.65;color:#111}h1,h2,h3{font-family:'함초롬돋움','Malgun Gothic',sans-serif}table{border-collapse:collapse;width:100%}th,td{border:1px solid #777;padding:5px}pre,code{font-family:Consolas,'D2Coding',monospace;white-space:pre-wrap}.aice-message{margin:0 0 14pt;padding:8pt;border-left:3pt solid #bbb}.aice-message-user{background:#f4f7fb;border-color:#6d8fbe}.aice-role-label{font-weight:700;margin-bottom:4pt}.aice-hwp-math.inline{display:inline;vertical-align:middle}.aice-hwp-math.display{display:block;max-width:100%;height:auto;margin:8pt auto}img{max-width:100%;height:auto}blockquote{border-left:3px solid #aaa;margin-left:0;padding-left:12px;color:#444}a{color:#1659a7;text-decoration:underline}.aice-metadata{color:#666;font-size:9pt}</style></head><body>${root.innerHTML}</body></html>`
      };
    } finally {
      root.remove();
    }
  }

  AICE.hwpPackage = { create, version: 6 };
})();
