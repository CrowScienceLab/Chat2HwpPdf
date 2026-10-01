"use strict";
window.CrowHelper = {
  async request(type = 'settings', askPermission = false) {
    const permission = { permissions: ['nativeMessaging'] };
    const granted = askPermission ? await chrome.permissions.request(permission) : await chrome.permissions.contains(permission);
    if (!granted) throw new Error('도우미 연결 확인을 눌러 연결 권한을 허용해 주세요.');
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();
      let port, timer, done = false;
      const finish = (error, message) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { port?.disconnect(); } catch (_) {}
        if (error) reject(error); else resolve(message);
      };
      try {
        port = chrome.runtime.connectNative('com.ai_chat_exporter.hwp');
        if (type !== 'choose-folder') timer = setTimeout(() => finish(new Error('도우미 응답 시간이 초과됐습니다. 다시 확인해 주세요.')), 10000);
        port.onMessage.addListener(message => {
          if (message?.requestId === requestId) finish(message.ok ? null : new Error(message.error || '도우미 요청 실패'), message);
        });
        port.onDisconnect.addListener(() => finish(new Error(chrome.runtime.lastError?.message || '도우미 연결이 종료되었습니다.')));
        port.postMessage({ type, requestId });
      } catch (error) { finish(error); }
    });
  },
  versionMessage(result) {
    const version = chrome.runtime.getManifest().version;
    return result.hostVersion === version
      ? `연결됨 · 확장 앱 ${version} · 도우미 ${result.hostVersion}`
      : `버전 확인 필요 · 확장 앱 ${version} · 도우미 ${result.hostVersion || '확인 불가'}. 설치 안내에서 같은 버전으로 업데이트해 주세요.`;
  }
};
