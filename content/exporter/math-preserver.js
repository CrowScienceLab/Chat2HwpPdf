(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  if (AICE.mathPreserver?.version === 2) return;

  const MATH_SELECTOR = [
    "math", '[role="math"]', ".katex", ".katex-display", ".MathJax", "mjx-container",
    "[data-math]", "[data-latex]", "[data-tex]"
  ].join(",");
  const MATH_CLASS_TOKEN = /(?:^|[-_])(?:math|latex|tex)(?:$|[-_])/i;
  const STYLE_PROPERTIES = [
    "font-family", "font-size", "font-style", "font-weight", "line-height", "letter-spacing",
    "color", "display", "vertical-align", "text-align", "white-space", "position", "width", "height",
    "margin-top", "margin-right", "margin-bottom", "margin-left",
    "padding-top", "padding-right", "padding-bottom", "padding-left",
    "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
    "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
    "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
    "transform", "transform-origin"
  ];

  function isMathSvg(svg) {
    return Boolean(svg.closest(MATH_SELECTOR) || svg.getAttribute("aria-label")?.match(/math|equation|formula|수식/i) || svg.querySelector("use[href*='MJX'], path[id^='MJX']"));
  }

  function findMath(root) {
    const nodes = [...root.querySelectorAll(MATH_SELECTOR)];
    root.querySelectorAll("[class]").forEach((node) => {
      if ([...node.classList].some((className) => MATH_CLASS_TOKEN.test(className))) nodes.push(node);
    });
    root.querySelectorAll("svg").forEach((svg) => { if (isMathSvg(svg)) nodes.push(svg); });
    return [...new Set(nodes)].filter((node) => !nodes.some((parent) => parent !== node && parent.contains(node)));
  }

  function copyComputedStyle(source, clone) {
    const sourceElements = [source, ...source.querySelectorAll("*")];
    const cloneElements = [clone, ...clone.querySelectorAll("*")];
    sourceElements.forEach((element, index) => {
      const target = cloneElements[index];
      if (!target) return;
      const style = getComputedStyle(element);
      STYLE_PROPERTIES.forEach((property) => target.style.setProperty(property, style.getPropertyValue(property), style.getPropertyPriority(property)));
    });
  }

  function preserve(sourceRoot, cloneRoot) {
    const sourceMath = findMath(sourceRoot);
    const cloneMath = findMath(cloneRoot);
    sourceMath.forEach((source, index) => {
      const clone = cloneMath[index];
      if (!clone) return;
      copyComputedStyle(source, clone);
      clone.classList.add("aice-preserved-math");
      if (source.matches(".katex-display, .math-block, mjx-container[display='true']") || source.querySelector('.katex-display, math[display="block"]')) clone.classList.add("aice-display-math");
    });
    return sourceMath.length;
  }

  AICE.mathPreserver = { preserve, findMath, version: 2 };
})();
