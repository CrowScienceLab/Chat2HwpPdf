(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  if (AICE.adapters?.gemini) return;
  AICE.adapters ||= {};
  const { queryAll, first, uniqueTopLevel, isVisible } = AICE.domUtils;

  const SELECTORS = {
    assistant: ['model-response', '[data-test-id="model-response"]', '.model-response-text', 'message-content'],
    user: ['user-query', '[data-test-id="user-query"]', '.query-text'],
    title: ['[data-test-id="conversation-title"]', 'h1', 'title'],
    controls: ['button', '[role="button"]', 'mat-icon', '.response-footer', '.buttons-container']
  };

  class GeminiAdapter extends AICE.SiteAdapter {
    constructor() { super("gemini", "Gemini", SELECTORS); }
    detect() { return location.hostname === "gemini.google.com"; }
    getRoleNodes(role) { return uniqueTopLevel(queryAll(document, SELECTORS[role])); }
    getMessages() {
      return [
        ...this.getRoleNodes("user").map((node) => ({ node, role: "user" })),
        ...this.getRoleNodes("assistant").map((node) => ({ node, role: "assistant" }))
      ].sort((a, b) => a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    }
    getLatestAssistantMessage() {
      const nodes = this.getRoleNodes("assistant");
      return [...nodes].reverse().find(isVisible) || nodes.at(-1) || null;
    }
    getTitle() { return first(document, SELECTORS.title)?.textContent?.trim() || super.getTitle(); }
    cleanNode(node) { queryAll(node, SELECTORS.controls).forEach((control) => control.remove()); }
  }
  AICE.adapters.gemini = new GeminiAdapter();
})();
