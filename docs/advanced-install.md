# 수동 설치 / Manual installation

> Chrome 웹스토어는 현재 테스터에게만 공개되어 있습니다. Chrome 확장 프로그램의 개발자 모드와 확장 ID를 이해하는 고급 사용자에게만 권장합니다.

## Chrome 확장 프로그램

1. [GitHub Releases](https://github.com/CrowScienceLab/Chat2HwpPdf/releases)에서 `Chat2HwpPdf-Chrome-<version>.zip`을 받습니다.
2. ZIP을 새 폴더에 완전히 압축 해제합니다. ZIP 자체를 Chrome에 지정할 수는 없습니다.
3. Chrome 주소창에서 `chrome://extensions`를 엽니다.
4. 오른쪽 위의 **개발자 모드**를 켭니다.
5. **압축해제된 확장 프로그램을 로드합니다**를 누르고, `manifest.json`이 들어 있는 압축 해제 폴더를 선택합니다.
6. 설치된 카드에 표시된 32자리 **확장 프로그램 ID**를 복사합니다.

수동 설치 확장은 Chrome 웹스토어 버전과 ID가 다를 수 있고 자동 업데이트되지 않습니다. 새 버전은 직접 받아 교체해야 하며 Chrome이 개발자 모드 확장 경고를 표시할 수 있습니다.

## Windows 도우미

1. 같은 릴리스에서 `Chat2HwpPdf-Setup.exe`를 받습니다.
2. 설치 프로그램의 **고급 설정 → Chrome 확장 ID** 칸에 위에서 확인한 수동 설치 ID를 입력합니다. 기본값은 웹스토어 ID이므로 수동 설치에서는 반드시 확인해야 합니다.
3. HWPX 저장 폴더와 보안 모듈 폴더를 선택하고 설치합니다.
4. 확장 프로그램과 AI 대화 탭을 새로고침한 뒤 **도우미 연결 확인**을 실행합니다.

HWPX 변환에는 Windows용 한글이 필요합니다. PDF 출력에는 Windows 도우미나 한글이 필요하지 않습니다. 설치 파일은 현재 코드 서명되지 않아 Windows SmartScreen 안내가 표시될 수 있습니다. 파일의 SHA-256은 릴리스의 `SHA256SUMS.txt`에서 확인하세요.

문제가 생기면 확장 ID가 설치 프로그램에 입력한 값과 정확히 같은지 먼저 확인하세요.

---

# Manual installation

> Chrome Web Store access is currently limited to testers. It is recommended only for advanced users familiar with Chrome Developer mode and extension IDs.

## Chrome extension

1. Download `Chat2HwpPdf-Chrome-<version>.zip` from [GitHub Releases](https://github.com/CrowScienceLab/Chat2HwpPdf/releases).
2. Fully extract the ZIP into a new folder. Chrome cannot load the ZIP file directly.
3. Open `chrome://extensions` in Chrome.
4. Turn on **Developer mode**.
5. Select **Load unpacked**, then choose the extracted folder containing `manifest.json`.
6. Copy the 32-character **extension ID** displayed on the installed extension card.

A manually installed extension may have a different ID from the Chrome Web Store version and does not update automatically. New versions must be downloaded and replaced manually. Chrome may also display a Developer mode extension warning.

## Windows Helper

1. Download `Chat2HwpPdf-Setup.exe` from the same release.
2. Enter the manual extension ID from the previous step in the installer's **Advanced settings → Chrome extension ID** field. The default value is the Web Store ID, so manual installations must verify this field.
3. Choose the HWPX output folder and security module folder, then install.
4. Reload both the extension and the AI conversation tab, then select **Check helper connection**.

HWPX export requires Hancom Hangul for Windows. PDF export does not require the helper or Hancom Hangul. The installer is currently unsigned, so Windows SmartScreen may display a warning. Verify SHA-256 hashes with `SHA256SUMS.txt` in the release.

If the helper cannot connect, first confirm that the installed extension ID exactly matches the ID entered in the installer.
