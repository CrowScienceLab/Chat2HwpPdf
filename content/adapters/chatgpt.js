(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  if (AICE.adapters?.chatgpt) return;
  AICE.adapters ||= {};
  const { queryAll, first, isVisible, uniqueTopLevel, nearestScrollableTextContainer } = AICE.domUtils;

  const SELECTORS = {
    assistant: [
      '[data-message-author-role="assistant"]',
      'article [data-message-author-role="assistant"]',
      'article:has([data-message-author-role="assistant"])'
    ],
    user: [
      '[data-message-author-role="user"]',
      'article [data-message-author-role="user"]',
      'article:has([data-message-author-role="user"])'
    ],
    title: ['nav a[aria-current="page"]', 'h1', 'title'],
    controls: [
      '[data-testid*="copy"]', '[data-testid*="vote"]', '[data-testid*="regenerate"]',
      'button', '[role="button"]', 'audio', 'form'
    ]
  };

  const ROLE_HEADING_PATTERNS = {
    assistant: /^(?:ChatGPT\s*(?:답변|said)|Assistant)\s*:?$/i,
    user: /^(?:내가 한 말|You said|User)\s*:?$/i
  };

  function headingRole(heading) {
    const text = heading?.textContent?.replace(/\s+/g, " ").trim() || "";
    if (ROLE_HEADING_PATTERNS.assistant.test(text)) return "assistant";
    if (ROLE_HEADING_PATTERNS.user.test(text)) return "user";
    return null;
  }

  function messageContainerFromHeading(heading) {
    let current = heading.parentElement;
    for (let depth = 0; current?.parentElement && depth < 8; depth += 1) {
      const parent = current.parentElement;
      const roleHeadingCount = [...parent.querySelectorAll("h4")].filter(headingRole).length;
      if (roleHeadingCount !== 1 || parent.matches("main, [role='main']")) break;
      current = parent;
    }
    return current;
  }

  class ChatGPTAdapter extends AICE.SiteAdapter {
    constructor() { super("chatgpt", "ChatGPT", SELECTORS); }
    detect() { return location.hostname === "chatgpt.com"; }

    normalizeMessage(node, role) {
      if (node.matches?.("h4") && headingRole(node) === role) return messageContainerFromHeading(node);
      const explicit = node.closest?.(`[data-message-author-role="${role}"]`);
      return nearestScrollableTextContainer(explicit || node);
    }

    getRoleNodes(role) {
      const explicitNodes = queryAll(document, SELECTORS[role]).map((node) => this.normalizeMessage(node, role));
      const semanticNodes = queryAll(document, ["main h4", "h4.sr-only", "h4"])
        .filter((heading) => headingRole(heading) === role)
        .map(messageContainerFromHeading);
      return uniqueTopLevel([...explicitNodes, ...semanticNodes].filter(Boolean));
    }

    getMessages() {
      const users = this.getRoleNodes("user").map((node) => ({ node, role: "user" }));
      const assistants = this.getRoleNodes("assistant").map((node) => ({ node, role: "assistant" }));
      return [...users, ...assistants].sort((a, b) => {
        const position = a.node.compareDocumentPosition(b.node);
        return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });
    }

    getLatestAssistantMessage() {
      const selection = getSelection();
      const anchor = selection?.rangeCount ? selection.getRangeAt(0).commonAncestorContainer : null;
      const anchorElement = anchor?.nodeType === Node.ELEMENT_NODE ? anchor : anchor?.parentElement;
      const candidates = this.getRoleNodes("assistant");
      const selectedCandidate = anchorElement && candidates.find((node) => node.contains(anchorElement));
      if (selectedCandidate) return selectedCandidate;
      const selectedMessage = anchorElement?.closest?.('[data-message-author-role="assistant"]');
      if (selectedMessage) return this.normalizeMessage(selectedMessage, "assistant");
      const selectedArticle = anchorElement?.closest?.("article");
      if (selectedArticle?.querySelector?.('[data-message-author-role="assistant"]')) return selectedArticle;
      return [...candidates].reverse().find(isVisible) || candidates.at(-1) || null;
    }

    getTitle() {
      const active = first(document, SELECTORS.title);
      const text = active?.textContent?.trim();
      return text && text !== "ChatGPT" ? text : super.getTitle();
    }

    cleanNode(node) {
      queryAll(node, SELECTORS.controls).forEach((control) => control.remove());
    }
  }

  AICE.adapters.chatgpt = new ChatGPTAdapter();
})();
