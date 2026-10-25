(() => {
  "use strict";
  const AICE = globalThis.AIChatExporter ||= {};
  if (AICE.mainVersion === 2) return;
  AICE.mainVersion = 2;
  AICE.debug = false;

  function getAdapter() {
    const site = AICE.siteDetector.detect();
    const adapter = site && AICE.adapters?.[site];
    if (!adapter?.detect()) throw new Error("현재 페이지에서는 사용할 수 없습니다.");
    return adapter;
  }

  function appendMessage(container, cloned, role) {
    const article = document.createElement("article");
    article.className = `aice-message aice-message-${role}`;
    const label = document.createElement("div");
    label.className = "aice-role-label";
    label.textContent = role === "user" ? "질문" : "답변";
    article.append(label, cloned);
    container.append(article);
  }

  async function buildContent(mode, adapter, settings) {
    let mathCount = 0;
    if (mode === "selection") {
      const selection = getSelection();
      if (!selection?.rangeCount || selection.isCollapsed) throw new Error("내보낼 영역을 먼저 선택하세요.");
      const range = selection.getRangeAt(0);
      await AICE.imageHandler.prepareSelection(range, settings);
      return AICE.domCloner.cloneSelection(adapter, settings);
    }

    if (mode === "note") {
      const source = adapter.getCurrentNote();
      if (!source) throw new Error("현재 열린 메모를 찾지 못했습니다. 메모를 연 뒤 다시 시도해 주세요.");
      await AICE.imageHandler.prepare(source, settings);
      return AICE.domCloner.cloneNode(source, adapter, settings);
    }

    if (mode === "current") {
      const source = adapter.getLatestAssistantMessage();
      if (!source) throw new Error(adapter.id === 'generic' ? "답변 구조를 인식하지 못했습니다. 본문을 드래그한 뒤 선택 영역을 사용하세요." : "현재 답변을 찾지 못했습니다. 페이지가 완전히 로드된 후 다시 시도해 주세요.");
      await AICE.imageHandler.prepare(source, settings);
      return AICE.domCloner.cloneNode(source, adapter, settings);
    }

    if (mode === "conversation") {
      const messages = adapter.getMessages().filter(({ role }) => role === "user" ? settings.includeUser : settings.includeAssistant);
      if (!messages.length) throw new Error("대화 구조를 인식하지 못했습니다. 본문을 드래그한 뒤 선택 영역을 사용하세요.");
      const container = document.createElement("section");
      container.className = "aice-conversation";
      for (const { node, role } of messages) {
        await AICE.imageHandler.prepare(node, settings);
        const result = AICE.domCloner.cloneNode(node, adapter, settings);
        mathCount += result.mathCount;
        appendMessage(container, result.clone, role);
      }
      return { clone: container, mathCount };
    }
    throw new Error("지원하지 않는 내보내기 모드입니다.");
  }

  let exportBusy = false;
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!["AI_CHAT_EXPORTER_EXPORT_V2", "AI_CHAT_EXPORTER_EXPORT"].includes(message?.type)) return;
    if (exportBusy) { sendResponse({ok:false,error:"이미 내보내는 중입니다."}); return; }
    exportBusy = true;
    (async () => {
      try {
        const adapter = getAdapter();
        AICE.imageHandler.begin({ exportId: message.exportId });
        const result = await buildContent(message.mode, adapter, message.settings || {});
        if (AICE.debug) {
          console.info("[AI Chat Exporter] adapter:", adapter.id);
          console.info("[AI Chat Exporter] messages:", adapter.getMessages().length);
        }
        if (message.target === "hwpx") {
          const documentPackage = await AICE.hwpPackage.create({
            content: result.clone,
            title: adapter.getTitle(),
            siteLabel: adapter.label,
            settings: message.settings,
            mathCount: result.mathCount
          });
          documentPackage.diagnostics.media = AICE.imageHandler.getDiagnostics();
          sendResponse({ ok: true, package: documentPackage });
          return;
        }
        await AICE.printEngine.print({
          content: result.clone,
          title: adapter.getTitle(),
          siteLabel: adapter.label,
          settings: message.settings,
          mathCount: result.mathCount,
          printCss: message.printCss
        });
        sendResponse({ ok: true, media: AICE.imageHandler.getDiagnostics() });
      } catch (error) {
        if (AICE.debug) console.error("[AI Chat Exporter]", error);
        sendResponse({ ok: false, error: error?.message || String(error) });
      } finally { exportBusy = false; }
    })();
    return true;
  });
})();
