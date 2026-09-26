(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  if (AICE.SiteAdapter) return;
  AICE.SiteAdapter = class SiteAdapter {
    constructor(id, label, selectors) { this.id = id; this.label = label; this.selectors = selectors; }
    detect() { return false; }
    getMessages() { return []; }
    getLatestAssistantMessage() { return null; }
    getCurrentNote() { return null; }
    getTitle() { return document.title.replace(/\s*[|–-]\s*(ChatGPT|Gemini|NotebookLM|Claude).*$/i, "").trim(); }
    cleanNode() {}
  };
})();
