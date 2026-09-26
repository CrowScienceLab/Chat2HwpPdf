(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  if (AICE.printEngine) return;

  const ROOT_ID = "ai-chat-exporter-print-root";
  const STYLE_ID = "ai-chat-exporter-print-style";

  function cleanup() {
    document.getElementById(ROOT_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    document.documentElement.classList.remove("aice-printing");
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
    cleanup();
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = prepareCss(printCss, settings);
    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.setAttribute("aria-hidden", "true");
    const header = makeHeader({ title, siteLabel, settings });
    if (header) root.append(header);
    root.append(content);
    document.head.append(style);
    document.body.append(root);
    root.style.cssText = `display:block;position:fixed;left:-100000px;top:0;width:${settings.orientation === "landscape" ? "260mm" : "176mm"};visibility:hidden;`;
    fitWideMath(root);
    root.removeAttribute("style");
    document.documentElement.classList.add("aice-printing");
    await AICE.imageHandler.waitForImages(root);
    if (AICE.debug) console.info("[AI Chat Exporter] math nodes:", mathCount);

    let cleaned = false;
    const finish = () => {
      if (cleaned) return;
      cleaned = true;
      cleanup();
      removeEventListener("afterprint", finish);
    };
    addEventListener("afterprint", finish, { once: true });
    setTimeout(() => { try { window.print(); } catch (error) { finish(); throw error; } }, 80);
    setTimeout(finish, 120000);
  }

  AICE.printEngine = { print, cleanup };
})();
