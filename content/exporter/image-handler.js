(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  if (AICE.imageHandler) return;

  function copyCanvas(sourceRoot, cloneRoot) {
    const sources = sourceRoot.querySelectorAll("canvas");
    const clones = cloneRoot.querySelectorAll("canvas");
    sources.forEach((canvas, index) => {
      const clone = clones[index];
      if (!clone) return;
      try {
        const image = document.createElement("img");
        image.src = canvas.toDataURL("image/png");
        image.alt = canvas.getAttribute("aria-label") || "Canvas content";
        image.className = clone.className;
        clone.replaceWith(image);
      } catch (_) { clone.setAttribute("data-aice-canvas-unavailable", "true"); }
    });
  }

  async function waitForImages(root, timeoutMs = 4500) {
    const pending = [...root.querySelectorAll("img")].filter((image) => !image.complete);
    if (!pending.length) return;
    await Promise.race([
      Promise.allSettled(pending.map((image) => new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      }))),
      new Promise((resolve) => setTimeout(resolve, timeoutMs))
    ]);
  }

  AICE.imageHandler = { copyCanvas, waitForImages };
})();
