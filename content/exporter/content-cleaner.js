(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  if (AICE.contentCleaner) return;

  const COMMON_UI = [
    "script", "style", "link", "template", "noscript", "iframe", "video", "audio",
    "button", '[role="button"]', '[role="menu"]', '[role="toolbar"]',
    '[contenteditable="true"]:empty', '[aria-label*="copy" i]', '[aria-label*="share" i]',
    '[aria-label*="like" i]', '[aria-label*="dislike" i]', '[aria-label*="regenerate" i]',
    '[aria-label*="복사" i]', '[aria-label*="공유" i]', '[aria-label*="다시" i]'
  ].join(",");

  function clean(clone, adapter) {
    clone.querySelectorAll(COMMON_UI).forEach((node) => node.remove());
    adapter.cleanNode(clone);
    clone.querySelectorAll('*').forEach(node => {
      for (const attribute of [...node.attributes]) {
        if (/^on/i.test(attribute.name) || attribute.name === 'srcdoc' ||
            (/^(href|src|xlink:href)$/i.test(attribute.name) && /^\s*(javascript|vbscript):/i.test(attribute.value))) {
          node.removeAttribute(attribute.name);
        }
      }
    });
    clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    clone.querySelectorAll("a").forEach((link) => {
      link.removeAttribute("target");
      link.removeAttribute("onclick");
    });
    clone.querySelectorAll("input, textarea, select").forEach((node) => {
      const span = document.createElement("span");
      span.textContent = node.value || node.getAttribute("value") || "";
      node.replaceWith(span);
    });
    return clone;
  }

  AICE.contentCleaner = { clean };
})();
