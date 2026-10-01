(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  if (AICE.contentCleaner?.version === 2) return;

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
    const elements = [clone, ...clone.querySelectorAll('*')];
    const ids = new Map();
    const prefix = 'aice-' + crypto.randomUUID() + '-';
    elements.forEach(node => {
      for (const attribute of [...node.attributes]) {
        if (/^on/i.test(attribute.name) || attribute.name === 'srcdoc' ||
            (/^(href|src|xlink:href)$/i.test(attribute.name) && /^\s*(javascript|vbscript):/i.test(attribute.value))) {
          node.removeAttribute(attribute.name);
        }
      }
      if (node.id) {
        if (!ids.has(node.id)) ids.set(node.id, prefix + ids.size);
        node.id = ids.get(node.id);
      }
    });
    // SVG <use>, clipPath and gradient references must survive cloning without
    // colliding with IDs in the original page.
    elements.forEach(node => {
      for (const attribute of [...node.attributes]) {
        let value = attribute.value.replace(/url\(\s*(['"]?)#([^\s)'"]+)\1\s*\)/g,
          (match, quote, id) => ids.has(id) ? `url(#${ids.get(id)})` : match);
        if (/^(href|xlink:href)$/.test(attribute.name) && value.startsWith('#') && ids.has(value.slice(1))) value = '#' + ids.get(value.slice(1));
        if (value !== attribute.value) node.setAttribute(attribute.name, value);
      }
    });
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

  AICE.contentCleaner = { clean, version: 2 };
})();
