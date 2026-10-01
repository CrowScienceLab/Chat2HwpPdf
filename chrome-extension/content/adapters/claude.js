(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  AICE.adapters ||= {};
  const { queryAll, uniqueTopLevel, isVisible } = AICE.domUtils;
  const SELECTORS = {
    assistant: ['[data-testid="assistant-message"]', '[data-message-author-role="assistant"]', '.font-claude-message'],
    user: ['[data-testid="user-message"]', '[data-message-author-role="user"]', '.font-user-message'],
    controls: ['button', '[role="button"]', '[role="toolbar"]', '[role="status"]', 'h2[data-find-omitted]', 'time']
  };
  class ClaudeAdapter extends AICE.SiteAdapter {
    constructor() { super("claude", "Claude", SELECTORS); }
    detect() { return location.hostname === "claude.ai"; }
    getMessages() {
      const root = document.querySelector('main [role="feed"], main [data-testid="transcript-list"], main') || document;
      const messages = ["user", "assistant"].flatMap(role => uniqueTopLevel(queryAll(root, SELECTORS[role])).map(node => ({ node, role })));
      // Current Claude exposes semantic message articles; never infer roles from alternating order.
      root.querySelectorAll('article, [role="article"]').forEach(article => {
        if (messages.some(message => article.contains(message.node))) return;
        const heading = article.querySelector('h2[data-find-omitted], h2.sr-only')?.textContent?.trim() || "";
        const role = /^(?:Claude 응답|Claude(?:'s)? response)\s*:/i.test(heading) ? "assistant"
          : /^(?:보낸 메시지|You said|Your message)\s*:/i.test(heading) ? "user" : null;
        if (role) messages.push({ node: article, role });
      });
      return messages.sort((a, b) => a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    }
    getLatestAssistantMessage() {
      const nodes = this.getMessages().filter(message => message.role === "assistant").map(message => message.node);
      return [...nodes].reverse().find(isVisible) || nodes.at(-1) || null;
    }
    cleanNode(node) { queryAll(node, SELECTORS.controls).forEach(control => control.remove()); }
  }
  AICE.adapters.claude = new ClaudeAdapter();
})();
