(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  AICE.adapters ||= {};
  // Use explicit author roles only. Unknown layouts must use user selection;
  // do not export an entire page or guess speakers from alternating elements.
  class GenericAdapter extends AICE.SiteAdapter {
    constructor() { super('generic', '기타 LLM', {}); }
    detect() { return /^https?:$/.test(location.protocol); }
    getMessages() {
      const root = document.querySelector('main, [role="main"]') || document.body;
      const roles = ['user', 'assistant'];
      const messages = roles.flatMap(role => {
        const selectors = [`[data-message-author-role="${role}"]`, `[data-role="${role}"]`, `[data-message-role="${role}"]`, `[data-testid="${role}-message"]`];
        if (location.hostname === 'grok.com') selectors.push(`[role="article"][aria-label="${role === 'assistant' ? 'Grok' : '당신'}"]`);
        return AICE.domUtils.uniqueTopLevel([...root.querySelectorAll(selectors.join(','))]).map(node => ({ node, role }));
      });
      // Site-specific response renderers are a fallback, never an alternating-role guess.
      const fallback = location.hostname === 'chat.deepseek.com' ? '.ds-markdown'
        : /(^|\.)meta.ai$/.test(location.hostname) ? '[data-testid="bot-message"], [data-testid="assistant-response"]' : null;
      if (fallback) AICE.domUtils.uniqueTopLevel([...root.querySelectorAll(fallback)]).forEach(node => {
        if (!messages.some(message => message.node.contains(node) || node.contains(message.node))) messages.push({ node, role: 'assistant' });
      });
      return messages.filter(({node}) => !node.closest('aside, nav, header, footer, [hidden], [aria-hidden="true"]')).sort((a,b) => a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    }
    getLatestAssistantMessage() { return this.getMessages().filter(message => message.role === 'assistant').at(-1)?.node || null; }
    cleanNode(node) { node.querySelectorAll('button, [role="button"], [role="toolbar"], .thinking-container, textarea, input, script, style').forEach(control => control.remove()); }
  }
  AICE.adapters.generic = new GenericAdapter();
})();
