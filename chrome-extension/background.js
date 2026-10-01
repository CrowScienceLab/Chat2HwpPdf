"use strict";
// Remove document handoffs left by the retired 0.4.0 editor.
if (typeof indexedDB !== "undefined") indexedDB.deleteDatabase("crow-document-handoff");
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('setup/setup.html') });
});

// The native port belongs to this worker, never to the short-lived popup.
let activeJob = null;
const recovered = chrome.storage.local.get("hwpExportJob").then(async ({ hwpExportJob }) => {
  if (hwpExportJob?.state === "running") {
    await chrome.storage.local.set({ hwpExportJob: { ...hwpExportJob, state: "error",
      error: "브라우저 또는 확장이 다시 시작되어 작업이 중단되었습니다. 저장 폴더를 확인한 뒤 다시 시도해 주세요." } });
  }
});

async function startExport(request) {
  await recovered;
  if (activeJob) throw new Error("이미 한글 문서를 만드는 중입니다. 보안 확인 창에서 접근을 허용해 주세요.");
  const job = { requestId: request.requestId, state: "running",
    equationCount: request.payload.equations?.length || 0,
    omittedEquationCount: request.payload.diagnostics?.omittedEquations?.length || 0,
    omissionSummary: (request.payload.diagnostics?.omittedEquations || []).slice(0, 3).map(item => `${item.number}번: ${item.reason}`).join(' · '),
    warnings: request.payload.diagnostics?.warnings || [] };
  activeJob = job;
  let port;
  let settled = false;
  async function finish(result) {
    if (settled) return;
    settled = true;
    try {
      // Only status is persisted; conversation contents stay in memory.
      await chrome.storage.local.set({ hwpExportJob: { ...job, ...result } });
    } finally {
      activeJob = null;
      try { port?.disconnect(); } catch (_) { /* Already disconnected. */ }
    }
  }
  try {
    await chrome.storage.local.set({ hwpExportJob: job });
    port = chrome.runtime.connectNative("com.ai_chat_exporter.hwp");
    port.onMessage.addListener((message) => {
      if (settled) return;
      if (message?.requestId !== job.requestId) return;
      void finish(message.ok
        ? { state: "success", outputPath: message.outputPath, openWarning: message.openWarning || "" }
        : { state: "error", error: message.error || "한글 문서를 만들지 못했습니다." });
    });
    port.onDisconnect.addListener(() => {
      const reason = chrome.runtime.lastError?.message || "로컬 도우미 연결이 종료되었습니다.";
      void finish({ state: "error", error: reason });
    });
    const serialized = JSON.stringify(request.payload);
    const chunkSize = 240000;
    const totalChunks = Math.ceil(serialized.length / chunkSize);
    port.postMessage({ type: "start", requestId: job.requestId, totalChunks });
    for (let index = 0; index < totalChunks; index++) {
      port.postMessage({ type: "chunk", requestId: job.requestId, index,
        data: serialized.slice(index * chunkSize, (index + 1) * chunkSize) });
    }
    port.postMessage({ type: "finish", requestId: job.requestId });
    return { ok: true };
  } catch (error) {
    await finish({ state: "error", error: error.message });
    throw error;
  }
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL("popup/popup.html")) return;
  if (message?.type === "START_HWP_EXPORT") {
    startExport(message).then(respond, (error) => respond({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "GET_HWP_EXPORT") {
    recovered.then(() => chrome.storage.local.get("hwpExportJob")).then(respond);
    return true;
  }
});
