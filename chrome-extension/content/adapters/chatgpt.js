(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  if (AICE.adapters?.chatgpt?.version === 2) return;
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
    // Current ChatGPT uses a stable role attribute on the accessible heading.
    // Its textContent also contains hidden print-only names (e.g. 답변:ChatGPT).
    const role = heading?.getAttribute('data-conversation-role');
    if (role === 'assistant' || role === 'user') return role;
    const copy = heading?.cloneNode(true);
    copy?.querySelectorAll('[aria-hidden="true"],[hidden]').forEach(node => node.remove());
    const text = copy?.textContent?.replace(/\s+/g, " ").trim() || "";
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

  function isMessageAvailable(node) {
    for (let current = node; current && current !== document.body; current = current.parentElement) {
      if (current.hidden || current.getAttribute('aria-hidden') === 'true') return false;
      // Do not use computed visibility here: Chrome print media may hide the
      // source page while an export frame is retained. Those messages still
      // belong to a subsequent conversation export.
      if (current.style.display === 'none' || current.classList.contains('hidden')) return false;
    }
    return true;
  }

  class ChatGPTAdapter extends AICE.SiteAdapter {
    constructor() { super("chatgpt", "ChatGPT", SELECTORS); this.version = 2; }
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
      return uniqueTopLevel([...explicitNodes, ...semanticNodes].filter(node => node && isMessageAvailable(node)));
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
      // The export already provides its own question/answer label. Site role
      // headings are accessibility metadata, not 15pt document subheadings.
      node.querySelectorAll('h4').forEach(heading => { if (headingRole(heading)) heading.remove(); });
    }
  }

  AICE.adapters.chatgpt = new ChatGPTAdapter();
})();
