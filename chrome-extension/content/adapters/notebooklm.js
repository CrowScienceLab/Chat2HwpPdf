(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  AICE.adapters ||= {};
  const { queryAll, first, uniqueTopLevel, isVisible, safeText } = AICE.domUtils;

  const SELECTORS = {
    assistant: [
      'chat-message .to-user-message-card-content',
      '.chat-message-pair .to-user-message-card-content',
      '[data-message-role="assistant"]',
      '.response-container',
      'chat-message.model-message'
    ],
    user: [
      'chat-message .from-user-message-card-content',
      '.chat-message-pair .from-user-message-card-content',
      '[data-message-role="user"]',
      '.query-container',
      'chat-message.user-message'
    ],
    note: [
      'note-editor labs-tailwind-doc-viewer.note-editor',
      'labs-tailwind-doc-viewer.note-editor',
      'note-editor form.note-form',
      '[role="dialog"] [contenteditable="true"]',
      '[aria-label*="note" i] [contenteditable="true"]',
      '[data-testid*="note"] [contenteditable="true"]',
      '.note-editor', '.single-note-container'
    ],
    noteTitle: [
      'note-editor input[aria-label="노트 제목 수정 가능"]',
      'note-editor input.note-header__editable-title',
      '[role="dialog"] input',
      '[aria-label*="title" i]',
      '.note-title'
    ],
    title: ['h1', '[data-testid*="notebook-title"]', 'title'],
    controls: ['button', '[role="button"]', 'nb-button', 'mat-icon', 'mat-card-actions', 'thinking-chain-view', 'chat-actions', 'follow-up', 'debug-log-link', 'textarea', 'input']
  };

  class NotebookLMAdapter extends AICE.SiteAdapter {
    constructor() { super("notebooklm", "NotebookLM", SELECTORS); }
    detect() { return location.hostname === "notebooklm.google.com" || location.hostname === "notebook.google.com"; }
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
    getCurrentNote() {
      const candidates = queryAll(document, SELECTORS.note).filter((node) => isVisible(node) && safeText(node));
      return candidates.sort((a, b) => safeText(b).length - safeText(a).length)[0] || null;
    }
    getTitle() {
      const noteTitle = first(document, SELECTORS.noteTitle);
      return noteTitle?.value?.trim() || noteTitle?.textContent?.trim() || first(document, SELECTORS.title)?.textContent?.trim() || super.getTitle();
    }
    cleanNode(node) { queryAll(node, SELECTORS.controls).forEach((control) => control.remove()); }
  }
  AICE.adapters.notebooklm = new NotebookLMAdapter();
})();
