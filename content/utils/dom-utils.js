(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  if (AICE.domUtils) return;

  function queryAll(root, selectors) {
    const results = [];
    const seen = new Set();
    for (const selector of selectors) {
      try {
        root.querySelectorAll(selector).forEach((node) => {
          if (!seen.has(node)) { seen.add(node); results.push(node); }
        });
      } catch (_) { /* A stale selector should not break export. */ }
    }
    return results;
  }

  function first(root, selectors) {
    for (const selector of selectors) {
      try {
        const node = root.querySelector(selector);
        if (node) return node;
      } catch (_) { /* Continue with the next selector. */ }
    }
    return null;
  }

  function isVisible(node) {
    if (!(node instanceof Element)) return false;
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function uniqueTopLevel(nodes) {
    const unique = [...new Set(nodes)].filter((node) => node?.isConnected);
    return unique.filter((node) => !unique.some((other) => other !== node && other.contains(node)));
  }

  function nearestScrollableTextContainer(node) {
    let current = node;
    while (current && current !== document.body) {
      if (current.matches?.("article, [role='article'], [data-message-author-role], main section")) return current;
      current = current.parentElement;
    }
    return node;
  }

  function safeText(node) {
    return (node?.textContent || "").replace(/\s+/g, " ").trim();
  }

  AICE.domUtils = { queryAll, first, isVisible, uniqueTopLevel, nearestScrollableTextContainer, safeText };
})();
