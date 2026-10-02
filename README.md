# 수식Chat to HWPX/PDF

Crow Science Lab. · Crow Ink · 확장 앱 / Windows 도우미 **0.4.8**

AI 대화의 수식을 한글에서 편집할 수 있는 수식 개체로 보존하여 HWPX로 저장하고, Chrome 인쇄 기능으로 PDF를 저장합니다. 실제 출력 형식은 HWPX와 PDF입니다.

## 처음 사용하기

1. Chrome 웹스토어에서 확장 앱을 설치합니다. 현재 배포 대상은 테스터입니다.
2. **PDF는 바로 사용**합니다. 별도 도우미나 한글 설치가 필요하지 않습니다.
3. **HWPX**를 사용하려면 확장의 **설치 · 저장 폴더 → 한글 변환 도우미 받기**를 누릅니다.
4. 다운로드한 `Chat2HwpPdf-Setup.exe`를 실행하고 **설치**를 누릅니다.
5. 설치 안내 화면으로 돌아오면 연결을 확인합니다. 연결 권한을 허용하지 않았다면 **도우미 연결 확인**을 누릅니다.

HWPX에는 Windows 데스크톱 한글이 필요합니다. 웹스토어 확장 ID와 저장 위치는 기본값으로 설정됩니다. 저장 위치는 확장에서 변경할 수 있습니다. 개발용으로 압축해제하여 로드한 확장은 [고급 설치 안내](docs/advanced-install.md)를 참고하세요.

확장과 도우미의 버전이 다르면 같은 버전의 도우미를 설치하도록 안내합니다. 다운로드는 해당 확장 버전의 GitHub 배포 파일로 직접 연결되므로 GitHub 페이지에서 파일을 고를 필요가 없습니다. 실행 파일 설치는 사용자가 Windows에서 진행합니다.

## 프로젝트 구조

- `chrome-extension/`: Chrome 확장 개발 및 압축해제 로드 영역. `manifest.json`이 이 폴더에 있습니다.
- `windows-helper/`: Windows 연결 도우미·한글 COM·설치 프로그램·보안 모듈.
- `branding/`: Windows ICO, 설명용 512px 이미지, 웹스토어 440×280 홍보 이미지.
- `release.json`: 공통 버전·웹스토어 ID·배포 저장소 설정.
- `scripts/`: 버전 동기화·아이콘 생성·배포 패키징.
- `tests/`: 수식·사이트·PDF·연결·설치 검증.
- `docs/`: 사용자 안내, 개인정보처리방침, 버전별 변경 기록.
- `dist/<version>/`: 생성한 확장 ZIP·설치 EXE·소스 ZIP·이미지·체크섬.
- `tmp/`: 임시 검증 결과. 작업 종료 후 작업 공간의 `_archive`로 이동합니다.

## 빌드와 검증

```powershell
npm ci --ignore-scripts
npm run build
npm test
$env:AICE_BROWSER_CHANNELS = 'chrome,msedge'
npm run test:print
node tests/native-host-ping.mjs
```

`npm run build`는 `release.json`에서 두 앱의 버전과 Windows 파일 버전을 동기화하고 아이콘·도우미·배포 패키지를 생성합니다. Windows의 .NET Framework x86 컴파일러와 Node.js가 필요합니다. 빌드 전 검증과 변경 내용은 [0.4.8 배포 기록](docs/release-0.4.8.md)을 참고하세요.

## 데이터와 제거

대화 내용은 PC 내부에서 처리하고 외부 변환 서버로 전송하지 않습니다. Windows ‘설치된 앱 → 수식Chat 도우미 → 제거’로 도우미를 제거하고, Chrome에서 확장을 삭제합니다. 저장한 문서는 보존합니다.

설치 파일은 아직 코드 서명되지 않았습니다. [개인정보처리방침](docs/privacy.md) · [타사 고지](THIRD_PARTY_NOTICES.md) · [개발 인계서](HANDOFF.md)

## English

PDF works immediately through Chrome. For HWPX, install Hancom Hangul on Windows, select **Download Windows helper** in the extension's setup page, then run the downloaded installer and click **Install**. Standard users do not need to enter an extension ID. Return to the setup page to check the connection. The extension and helper use the same release version; developer IDs and custom directories are under **Advanced settings**. Export formats are HWPX and PDF.
