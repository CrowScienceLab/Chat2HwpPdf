"use strict";
const $ = id => document.getElementById(id);
const version = chrome.runtime.getManifest().version;
$('app-version').textContent = version;
$('download-helper').href = CrowRelease.downloadUrl;
$('extension-id').value = chrome.runtime.id;
if (chrome.runtime.id !== CrowRelease.extensionId) $('advanced-settings').open = true;
$('copy-id').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(chrome.runtime.id); $('status').textContent = '확장 ID를 복사했습니다. 도우미의 고급 설정에 붙여 넣으세요.'; }
  catch { $('extension-id').select(); $('status').textContent = '선택된 ID를 복사해 주세요.'; }
});
let busy = false, watchingUntil = 0, watchTimer;
async function request(type = 'settings', askPermission = false, silent = false) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button').forEach(b => { b.disabled = true; });
  if (!silent) $('status').textContent = type === 'choose-folder' ? '폴더 선택 창에서 저장 위치를 선택하세요.' : '도우미를 확인하는 중…';
  try {
    const result = await CrowHelper.request(type, askPermission);
    $('folder-path').textContent = result.outputDirectory;
    $('status').textContent = CrowHelper.versionMessage(result);
    $('status').className = result.hostVersion === version ? 'success' : 'warning';
    if (result.hostVersion === version) { watchingUntil = 0; clearTimeout(watchTimer); }
  } catch (error) {
    if (!silent) {
      $('status').className = 'warning';
      $('status').textContent = /forbidden/i.test(error.message)
        ? '개발용 확장 ID가 다릅니다. 고급 설정의 ID로 도우미를 복구 설치하세요.'
        : '도우미 설치 후 다시 확인하세요. PDF는 바로 사용할 수 있습니다.';
      if (/권한|시간/.test(error.message)) $('status').textContent = error.message;
    }
  } finally {
    busy = false;
    document.querySelectorAll('button').forEach(b => { b.disabled = false; });
  }
}
async function watch() {
  clearTimeout(watchTimer);
  if (Date.now() >= watchingUntil) return;
  if (!document.hidden) await request('settings', false, true);
  if (Date.now() < watchingUntil) watchTimer = setTimeout(watch, 3000);
}
$('download-helper').addEventListener('click', () => {
  $('status').textContent = '다운로드한 Chat2HwpPdf-Setup.exe를 실행하고 설치를 누르세요. 이 화면으로 돌아오면 연결을 확인합니다.';
  chrome.permissions.request({ permissions: ['nativeMessaging'] }).then(granted => {
    if (granted) { watchingUntil = Date.now() + 120000; void watch(); }
  }).catch(() => {});
});
$('connect').addEventListener('click', () => request('settings', true));
$('folder').addEventListener('click', () => request('choose-folder', true));
window.addEventListener('focus', () => { void request('settings', false, true); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) void request('settings', false, true); });
window.addEventListener('pagehide', () => { watchingUntil = 0; clearTimeout(watchTimer); });
void request('settings', false, true);
