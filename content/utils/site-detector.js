(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  AICE.siteDetector = {
    detect(hostname = location.hostname) {
      if (hostname === "chatgpt.com") return "chatgpt";
      if (hostname === "gemini.google.com") return "gemini";
      if (hostname === "claude.ai") return "claude";
      if (hostname === "notebooklm.google.com" || hostname === "notebook.google.com") return "notebooklm";
      return /^https?:$/.test(location.protocol) ? "generic" : null;
    }
  };
})();
