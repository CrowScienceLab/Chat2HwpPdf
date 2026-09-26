"use strict";
const $ = id => document.getElementById(id);
$('extension-id').value = chrome.runtime.id;
$('copy-id').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(chrome.runtime.id); $('status').textContent = '확장 ID를 복사했습니다.'; }
  catch { $('extension-id').select(); $('status').textContent = '선택된 ID를 복사해 주세요.'; }
});
async function request(type) {
  try {
    const granted = await chrome.permissions.request({ permissions: ['nativeMessaging'] });
    if (!granted) throw new Error('도우미 연결 권한이 필요합니다.');
    document.querySelectorAll('button').forEach(b => { b.disabled = true; });
    $('status').textContent = type === 'choose-folder' ? '폴더 선택 창에서 저장 위치를 선택하세요.' : '도우미를 확인하는 중…';
    const result = await new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const port = chrome.runtime.connectNative('com.ai_chat_exporter.hwp');
      let done = false;
      const finish = (error, message) => {
        if (done) return; done = true;
        clearTimeout(timer); port.disconnect();
        if (error) reject(error); else resolve(message);
      };
      const timer = type === 'settings' ? setTimeout(() => finish(new Error('연결 응답이 없습니다. 도우미를 업데이트해 주세요.')), 10000) : undefined;
      port.onMessage.addListener(message => { if (message.requestId === id) finish(message.ok ? null : new Error(message.error), message); });
      port.onDisconnect.addListener(() => finish(new Error(chrome.runtime.lastError?.message || '연결이 종료되었습니다.')));
      port.postMessage({ type, requestId: id });
    });
    $('folder-path').textContent = result.outputDirectory;
    $('status').textContent = '연결됨 · 도우미 ' + result.hostVersion;
  } catch (error) { $('status').textContent = error.message + '\n도우미 설치 후 다시 확인하세요.'; }
  finally { document.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
}
$('connect').addEventListener('click', () => request('settings'));
$('folder').addEventListener('click', () => request('choose-folder'));
