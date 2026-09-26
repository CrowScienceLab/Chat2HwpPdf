(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  // Some answers leave explicit TeX delimiters as text instead of rendering KaTeX.
  // Process only the export clone, preserving the original page and PDF rendering.
  function materialize(root) {
    const excluded = 'code, pre, textarea, script, style, math, [role="math"], .katex, mjx-container, [data-math], [data-latex], [data-tex]';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) if (!walker.currentNode.parentElement?.closest(excluded)) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.nodeValue;
      const pattern = /(?<!\\)(\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$(?!\s)([^$\n]*?\S)\$(?!\d))/g;
      const fragment = document.createDocumentFragment();
      let offset = 0, changed = false;
      for (const match of text.matchAll(pattern)) {
        const source = match[2] ?? match[3] ?? match[4] ?? match[5];
        if (!source.trim()) continue;
        fragment.append(document.createTextNode(text.slice(offset, match.index)));
        const equation = document.createElement('span');
        equation.setAttribute('data-latex', source);
        equation.className = match[2] != null || match[3] != null ? 'aice-raw-math aice-display-math' : 'aice-raw-math';
        equation.textContent = match[0];
        fragment.append(equation);
        offset = match.index + match[0].length; changed = true;
      }
      if (changed) { fragment.append(document.createTextNode(text.slice(offset))); node.replaceWith(fragment); }
    }
  }
  AICE.textMath = { materialize };
})();
