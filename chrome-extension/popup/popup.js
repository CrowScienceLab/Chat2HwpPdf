(() => {
  "use strict";

  const SCRIPT_FILES = [
    "content/utils/dom-utils.js",
    "content/utils/site-detector.js",
    "content/adapters/base.js",
    "content/adapters/chatgpt.js",
    "content/adapters/gemini.js",
    "content/adapters/claude.js",
    "content/adapters/generic.js",
    "content/adapters/notebooklm.js",
    "content/exporter/math-preserver.js",
    "content/exporter/image-handler.js",
    "content/exporter/content-cleaner.js",
    "content/exporter/dom-cloner.js",
    "content/exporter/hwp-equations.js",
    "content/exporter/text-math.js",
    "content/exporter/hwp-package.js",
    "content/exporter/print-engine.js",
    "content/main.js"
  ];

  const DEFAULTS = {
    orientation: "portrait",
    margin: "default",
    includeTitle: true,
    includeDate: true,
    includeUser: true,
    includeAssistant: true,
    wrapCode: true
  };

  const $ = (selector) => document.querySelector(selector);
  let activeTab;
  let settings = { ...DEFAULTS };
  const NATIVE_HOST = "com.ai_chat_exporter.hwp";

  function detectSite(url = "") {
    try {
      const host = new URL(url).hostname;
      if (host === "chatgpt.com") return { id: "chatgpt", label: "ChatGPT" };
      if (host === "gemini.google.com") return { id: "gemini", label: "Gemini" };
      if (host === "claude.ai") return { id: "claude", label: "Claude" };
      if (host === "notebooklm.google.com" || host === "notebook.google.com") {
        return { id: "notebooklm", label: "Gemini Notebook" };
      }
      if (/^https?:$/.test(new URL(url).protocol)) return { id: "generic", label: ({'grok.com':'Grok','chat.deepseek.com':'DeepSeek','www.meta.ai':'Meta AI','meta.ai':'Meta AI'})[host] || "기타 LLM · 공통 변환" };
    } catch (_) { /* Unsupported internal browser page. */ }
    return null;
  }

  function readForm() {
    return {
      orientation: document.querySelector('[name="orientation"]:checked').value,
      margin: document.querySelector('[name="margin"]:checked').value,
      includeTitle: $("#include-title").checked,
      includeDate: $("#include-date").checked,
      includeUser: $("#include-user").checked,
      includeAssistant: $("#include-assistant").checked,
      wrapCode: $("#wrap-code").checked,
      mathSource: $("#math-source").value
    };
  }

  function fillForm(value) {
    const orientation = document.querySelector(`[name="orientation"][value="${value.orientation}"]`);
    const margin = document.querySelector(`[name="margin"][value="${value.margin}"]`);
    if (orientation) orientation.checked = true;
    if (margin) margin.checked = true;
    $("#include-title").checked = value.includeTitle;
    $("#include-date").checked = value.includeDate;
    $("#include-user").checked = value.includeUser;
    $("#include-assistant").checked = value.includeAssistant;
    $("#wrap-code").checked = value.wrapCode;
    $("#math-source").value = ['auto','latex','mathml'].includes(value.mathSource) ? value.mathSource : 'auto';
  }

  async function persistSettings() {
    settings = readForm();
    await chrome.storage.local.set({ exportSettings: settings });
  }

  function shortError(error) {
    const message = String(error?.message || error || "처리하지 못했습니다.");
    if (/specified native messaging host not found/i.test(message)) return "도우미가 필요합니다. 설치 · 저장 폴더에서 다운로드하세요.";
    if (/access to the specified native messaging host is forbidden/i.test(message)) return "확장 ID가 다릅니다. 도우미를 복구 설치해 주세요.";
    if (/native host has exited/i.test(message)) return "도우미가 종료됐습니다. 다시 시도해 주세요.";
    return message.length > 85 ? message.slice(0, 82) + "…" : message;
  }

  function setBusy(busy) {
    document.querySelectorAll("button").forEach((button) => { button.disabled = busy; });
  }

  async function exportMode(mode) {
    const status = $("#status");
    status.className = "status";
    status.textContent = "PDF 준비 중…";
    setBusy(true);
    try {
      await persistSettings();
      const styleResponse = await fetch(chrome.runtime.getURL("styles/print.css"));
      if (!styleResponse.ok) throw new Error("확장 프로그램의 인쇄 스타일을 불러오지 못했습니다.");
      const printCss = await styleResponse.text();
      await chrome.scripting.executeScript({ target: { tabId: activeTab.id }, files: SCRIPT_FILES });
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        type: "AI_CHAT_EXPORTER_EXPORT",
        mode,
        settings,
        printCss
      });
      if (!response?.ok) throw new Error(response?.error || "내보내기를 시작하지 못했습니다.");
      status.className = "status success";
      status.textContent = "PDF 인쇄 창 열기 완료.";
    } catch (error) {
      status.textContent = shortError(error);
    } finally {
      setBusy(false);
    }
  }

  function renderHwpJob(job) {
    if (!job) return;
    const status = $("#status");
    setBusy(job.state === "running");
    status.className = job.state === "success" ? "status success" : "status";
    status.textContent = job.state === "running"
      ? "HWPX 변환 중…"
      : job.state === "success"
        ? [job.omittedEquationCount ? `저장 완료 · 수식 ${job.omittedEquationCount}개 생략 (${job.omissionSummary}${job.omittedEquationCount > 3 ? ' 외' : ''})` : "HWPX 저장 완료.", job.warnings?.length ? "일부 수식 표현 확인 필요." : "", job.openWarning ? "파일을 직접 열어 주세요." : ""].filter(Boolean).join(' ')
        : shortError(job.error);
  }

  async function exportHwp(mode) {
    const status = $("#status");
    status.className = "status";
    status.textContent = "HWPX 준비 중…";
    setBusy(true);
    try {
      const granted = await chrome.permissions.request({ permissions: ["nativeMessaging"] });
      if (!granted) throw new Error("HWPX 내보내기에는 로컬 도우미 연결 권한이 필요합니다.");
      const helper = await CrowHelper.request('settings');
      if (helper.hostVersion !== chrome.runtime.getManifest().version) {
        await chrome.tabs.create({ url: chrome.runtime.getURL('setup/setup.html') });
        throw new Error(CrowHelper.versionMessage(helper));
      }
      await persistSettings();
      await chrome.scripting.executeScript({ target: { tabId: activeTab.id }, files: SCRIPT_FILES });
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        type: "AI_CHAT_EXPORTER_EXPORT",
        target: "hwpx",
        mode,
        settings
      });
      if (!response?.ok) throw new Error(response?.error || "내보낼 콘텐츠를 만들지 못했습니다.");
      status.textContent = "HWPX 변환 중…";
      const result = await chrome.runtime.sendMessage({
        type: "START_HWP_EXPORT",
        requestId: crypto.randomUUID(),
        payload: { ...response.package, format: "HWPX" }
      });
      if (!result?.ok) throw new Error(result?.error || "내보내기를 시작하지 못했습니다.");
      const current = await chrome.runtime.sendMessage({ type: "GET_HWP_EXPORT" });
      renderHwpJob(current?.hwpExportJob);
    } catch (error) {
      status.textContent = shortError(error);
      if (/native messaging host not found|forbidden/i.test(String(error.message))) {
        await chrome.tabs.create({ url: chrome.runtime.getURL('setup/setup.html') });
      }
    } finally {
      const current = await chrome.runtime.sendMessage({ type: "GET_HWP_EXPORT" });
      setBusy(current?.hwpExportJob?.state === "running");
    }
  }

  async function init() {
    $("#app-version").textContent = chrome.runtime.getManifest().version;
    $("#open-setup").addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("setup/setup.html") }));
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.hwpExportJob) renderHwpJob(changes.hwpExportJob.newValue);
    });
    const current = await chrome.runtime.sendMessage({ type: "GET_HWP_EXPORT" });
    renderHwpJob(current?.hwpExportJob);
    $("#check-native").addEventListener("click", checkNativeConnection);
    const stored = await chrome.storage.local.get("exportSettings");
    settings = { ...DEFAULTS, ...(stored.exportSettings || {}) };
    fillForm(settings);

    [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const site = detectSite(activeTab?.url);
    if (!site) {
      $("#site-label").textContent = "지원되지 않는 페이지";
      $("#unsupported").hidden = false;
      $("#settings-panel").hidden = true;
      return;
    }

    $("#site-label").textContent = site.label;
    $("#actions").hidden = false;
    $("#notebook-actions").hidden = site.id !== "notebooklm";
    document.querySelectorAll("button[data-mode]").forEach((button) => {
      button.addEventListener("click", () => exportMode(button.dataset.mode));
    });
    document.querySelectorAll("button[data-hwp-mode]").forEach((button) => {
      button.addEventListener("click", () => exportHwp(button.dataset.hwpMode));
    });
    document.querySelectorAll("input, select").forEach((input) => input.addEventListener("change", persistSettings));
  }

  async function checkNativeConnection() {
    const status = $("#status");
    status.className = "status";
    status.textContent = "연결 확인 중…";
    setBusy(true);
    try {
      const granted = await chrome.permissions.request({ permissions: ["nativeMessaging"] });
      if (!granted) throw new Error("로컬 도우미 연결 권한이 필요합니다.");
      const result = await CrowHelper.request('settings');
      status.className = result.hostVersion === chrome.runtime.getManifest().version ? "status success" : "status";
      status.textContent = CrowHelper.versionMessage(result);
    } catch (error) {
      status.textContent = "연결 실패 · " + shortError(error);
    } finally {
      setBusy(false);
    }
  }

  init().catch((error) => {
    $("#site-label").textContent = "초기화 실패";
    $("#status").textContent = shortError(error);
  });
})();
