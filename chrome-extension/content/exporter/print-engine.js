(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  if (AICE.printEngine?.version === 4) return;

  const ROOT_ID = "ai-chat-exporter-print-root";
  const STYLE_ID = "ai-chat-exporter-print-style";
  const FRAME_ID = "ai-chat-exporter-print-frame";
  let activePrint = false;

  // A clone still matches the host site's dark-mode/streaming CSS. Normalize
  // only the exported copy; keep formula layout and SVG artwork intact.
  function normalizeAppearance(content) {
    for (const node of [content, ...content.querySelectorAll('*')]) {
      if (!node.style || (node.namespaceURI === 'http://www.w3.org/2000/svg' && node.localName !== 'svg')) continue;
      for (const [property, value] of Object.entries({
        color: '#17191f', '-webkit-text-fill-color': 'currentColor',
        opacity: '1', filter: 'none', 'backdrop-filter': 'none',
        'mask-image': 'none', '-webkit-mask-image': 'none',
        'mix-blend-mode': 'normal', animation: 'none', transition: 'none',
        'text-shadow': 'none', 'background-color': 'transparent',
        'background-image': 'none', 'content-visibility': 'visible'
      })) node.style.setProperty(property, value, 'important');
      if (node.closest('.aice-preserved-math, .katex, mjx-container, math')) {
        for (const side of ['top', 'right', 'bottom', 'left']) node.style.setProperty(`border-${side}-color`, 'currentColor', 'important');
      }
    }
  }

  function cleanup() {
    document.getElementById(FRAME_ID)?.remove();
    document.getElementById(ROOT_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    document.documentElement.classList.remove("aice-printing");
  }

  function fontRules() {
    const fonts = [];
    const visit = (rules, base) => {
      for (const rule of rules) {
        if (rule.type === 5) {
          fonts.push(rule.cssText.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g, (match, quote, url) => {
            try { return `url(${JSON.stringify(new URL(url, base).href)})`; } catch (_) { return match; }
          }));
        } else if (rule.cssRules) visit(rule.cssRules, base);
      }
    };
    for (const sheet of document.styleSheets) {
      try { visit(sheet.cssRules, sheet.href || document.baseURI); } catch (_) { /* Cross-origin sheets are not readable. */ }
    }
    return fonts.join('\n');
  }

  function prepareCss(sourceCss, settings) {
    if (typeof sourceCss !== "string" || !sourceCss.includes("#ai-chat-exporter-print-root")) {
      throw new Error("인쇄 스타일 데이터가 올바르지 않습니다.");
    }
    let css = sourceCss;
    const pageSize = settings.orientation === "landscape" ? "A4 landscape" : "A4 portrait";
    const margins = settings.margin === "narrow" ? "9mm 10mm 11mm" : "15mm 17mm 18mm";
    css = css.replace("__AICE_PAGE_SIZE__", pageSize).replace("__AICE_PAGE_MARGIN__", margins);
    if (!settings.wrapCode) css += `\n#${ROOT_ID} pre { white-space: pre !important; overflow-wrap: normal !important; }`;
    return css;
  }

  function makeHeader({ title, siteLabel, settings }) {
    if (!settings.includeTitle && !settings.includeDate) return null;
    const header = document.createElement("header");
    header.className = "aice-document-header";
    if (settings.includeTitle) {
      const heading = document.createElement("h1");
      heading.textContent = title || `${siteLabel} 내보내기`;
      header.append(heading);
    }
    const metadata = [];
    metadata.push(`Exported from ${siteLabel}`);
    if (settings.includeDate) metadata.push(new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date()));
    const meta = document.createElement("p");
    meta.textContent = metadata.join(" · ");
    header.append(meta);
    return header;
  }

  function fitWideMath(root) {
    const available = root.getBoundingClientRect().width;
    if (!available) return;
    AICE.mathPreserver.findMath(root).forEach((node) => {
      const width = node.getBoundingClientRect().width;
      if (width <= available || width <= 0) return;
      const scale = Math.max(0.58, available / width);
      node.style.setProperty("transform", `scale(${scale})`, "important");
      node.style.setProperty("transform-origin", "left top", "important");
      node.style.setProperty("width", `${100 / scale}%`, "important");
    });
  }

  async function print({ content, title, siteLabel, settings, mathCount, printCss }) {
    if (activePrint) throw new Error("인쇄 창을 닫은 뒤 다시 내보내 주세요.");
    cleanup();
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = prepareCss(printCss, settings);
    normalizeAppearance(content);
    // Print a separate document. Host-page @media print rules and React's
    // handling of body children must never hide or restyle the print root.
    const frame = document.createElement('iframe');
    frame.id = FRAME_ID;
    frame.title = 'PDF 인쇄 문서';
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = `position:fixed!important;left:-100000px!important;top:0!important;width:${settings.orientation === 'landscape' ? '263mm' : '176mm'}!important;height:1px!important;border:0!important;`;
    document.body.append(frame);
    const printDocument = frame.contentDocument;
    const printWindow = frame.contentWindow;
    if (!printDocument || !printWindow) { cleanup(); throw new Error('인쇄 문서를 열지 못했습니다. 페이지를 새로고침해 주세요.'); }
    const base = printDocument.createElement('base');
    base.href = document.baseURI;
    printDocument.head.append(base);
    printDocument.title = title || `${siteLabel} 내보내기`;
    printDocument.documentElement.lang = 'ko';
    printDocument.documentElement.classList.add('aice-printing');
    style.textContent += `\n${fontRules()}\nhtml,body{margin:0;padding:0;background:white;} #${ROOT_ID}{display:block;}`;
    const root = document.createElement("div");
    root.id = ROOT_ID;
    const header = makeHeader({ title, siteLabel, settings });
    if (header) root.append(header);
    root.append(content);
    printDocument.head.append(style);
    printDocument.body.append(root);
    root.querySelectorAll('img').forEach(image => { image.loading = 'eager'; });
    activePrint = true;
    let cleaned = false;
    let fallbackTimer;
    const finish = () => {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(fallbackTimer);
      activePrint = false;
      // Keep the isolated document until the next export. Some print-preview
      // implementations still read it after afterprint; removing it here can
      // turn a valid preview blank. Only one retained frame is ever kept.
      printWindow.removeEventListener("afterprint", finish);
    };
    printWindow.addEventListener("afterprint", finish, { once: true });
    try {
      await AICE.imageHandler.waitForImages(root);
      if (printDocument.fonts) {
        let fontTimer;
        try { await Promise.race([printDocument.fonts.ready, new Promise(resolve => { fontTimer = setTimeout(resolve, 5000); })]); }
        finally { clearTimeout(fontTimer); }
      }
      fitWideMath(root);
      await new Promise(resolve => setTimeout(resolve, 80));
      if (AICE.debug) console.info("[AI Chat Exporter] math nodes:", mathCount);
      printWindow.focus();
      printWindow.print();
      // Start the fallback only after blocking print dialogs close. An old
      // job's timer must never remove a newer export.
      if (!cleaned) fallbackTimer = setTimeout(finish, 120000);
    } catch (error) { finish(); cleanup(); throw error; }
  }

  AICE.printEngine = { print, cleanup, version: 4 };
})();
