# 수식Chat to HWPX/PDF

**AI Chat을 편집 가능한 Hwp와 Pdf로**

Crow Science Lab. · Crow Ink · 0.4.4 공개 전 검증판

ChatGPT·Gemini·Gemini Notebook(NotebookLM)·Claude의 대화를 PDF로 출력하거나 편집 가능한 한글 수식 개체가 포함된 HWPX로 변환합니다. 수식을 그림으로 대체하지 않습니다. 출력은 PDF와 HWPX이며 .hwp 출력은 제공하지 않습니다.

0.4.3은 gg/ll 비교 기호를 지원하고, 변환할 수 없는 수식만 [수식 N 생략]으로 표시하여 나머지를 저장합니다. 완료 메시지에 생략 개수와 원인(최대 3건)을 표시합니다. 파일 저장·도우미 연결 오류까지 무시하지는 않습니다.

0.4.4는 Notebook의 웹 전용 태그가 한글 본문에 노출되는 문제를 막기 위해 수식 추출 후 기본 HTML로 정규화합니다. 드래그 시작/끝이 수식 내부에 있으면 수식 전체를 포함합니다. 출력 설정의 수식 읽기에서 자동·LaTeX 원문 우선·MathML 구조 우선을 선택할 수 있습니다. 선택한 원문 종류가 없거나 해석 불가능하면 다른 원문을 시도합니다.

기타 LLM은 공통 MathML/LaTeX 변환을 사용합니다. Grok은 실제 화면의 메시지 속성을 확인하여 반영했습니다. DeepSeek·Meta는 메시지/응답 구조 기반 인식을 추가했지만 실제 로그인 대화 검증 전입니다. 구조를 인식하지 못하면 선택 영역을 사용하세요. 추가 사이트 권한 없이 사용자가 버튼을 누른 탭에서만 동작합니다.

기존 도우미 0.4.1을 그대로 사용합니다. 확장 프로그램을 새로고침한 뒤 열린 대화 페이지도 새로고침하세요.

## 사용

PDF / HWPX 두 열에서 현재 답변·전체 대화·선택 영역을 선택합니다. NotebookLM은 현재 메모도 지원합니다. 선택 영역은 대화에서 먼저 드래그하세요.

- PDF: Chrome 인쇄 창에서 저장 위치를 선택합니다.
- HWPX: Windows 데스크톱 한글과 도우미가 필요합니다. 기본 폴더에 저장 후 한글에서 엽니다.
- 출력 설정: 포함 항목, PDF 용지·여백, 코드 줄바꿈만 표시합니다.
- 상태: 연결 성공, 변환 중, 저장 완료 또는 오류를 짧게 표시합니다.

## 설치

1. 공개 전에는 프로젝트 또는 Chrome ZIP을 풀어 Chrome 확장 관리에서 ‘압축해제된 확장 프로그램 로드’로 선택합니다.
2. 확장의 ‘설치 · 저장 폴더’ 화면에서 확장 ID를 확인합니다.
3. Chat2HwpPdf-Setup.exe를 실행해 확장 ID, 저장 폴더, 보안 모듈 폴더를 지정합니다.
4. 확장에서 ‘도우미 연결 확인’을 누릅니다.

도우미는 현재 사용자의 LocalAppData/CrowScienceLab/Chat2HwpPdf에 설치됩니다. 기본 문서 폴더는 문서/Chat2Hwp&Pdf입니다. PDF 저장 위치는 별도로 Chrome 인쇄 창에서 선택합니다.

보안 모듈은 공식 이름 FilePathCheckerModuleExample.dll과 HKCU/Software/HNC/HwpAutomation/Modules의 FilePathCheckerModuleExample 값을 사용합니다. 다른 프로그램이 같은 이름을 등록했다면 덮어쓰지 않고 설치를 중단합니다.

## 제거

Windows ‘설치된 앱 → 수식Chat 도우미 → 제거’를 실행합니다. 설치한 파일·등록값·설정을 정리하고 저장한 문서는 보존합니다. Chrome 확장은 Chrome에서 별도로 제거합니다.

## 빌드

```powershell
npm ci --ignore-scripts
npm run vendor
npm test
./native-host/build-setup.ps1
./scripts/package.ps1
```

vendor 명령은 Crow 아이콘 PNG를 생성합니다. 확장 실행에 외부 편집 엔진이나 WASM은 포함되지 않습니다. .NET Framework x86 컴파일러로 도우미를 빌드합니다. 스토어 ID 확정 후 build-setup.ps1의 -ExtensionId로 지정할 수 있습니다.

## 검증과 공개 상태

현재 한글 2024 13.0.0.3622에서 공식 보안 모듈 등록 후 합성 수식 6개를 변환·저장하고, 다시 열어 첫 수식을 편집·재저장했습니다. 승인창 조작 없이 완료됐습니다. 앞선 등록 실패는 진단 프로세스의 격리된 레지스트리와 실제 한글의 레지스트리가 달라 발생했습니다.

실제 Chrome의 PDF/HWPX × 3범위, 다른 한글 버전과 새 PC 설치는 추가 검증이 필요합니다. 설치 파일은 현재 코드 서명되지 않았으므로 Windows SmartScreen 안내가 표시될 수 있습니다.

[개인정보처리방침](docs/privacy.md) · [편집 가능한 수식 안내](docs/hwp-editable-equations.md) · [타사 고지](THIRD_PARTY_NOTICES.md)

---

# Formula Chat to HWPX/PDF

**Export AI chats to editable HWPX documents or PDF**

Formula Chat converts AI chat responses and mathematical expressions to PDF or HWPX. Equations are created as native, editable equation objects for Hancom Hangul rather than raster images.

## Features

- Export the current response, the full conversation, or a selected area.
- Print or save PDF through Chrome.
- Create HWPX files with editable equations from MathML or LaTeX.
- Support ChatGPT, Gemini, Gemini Notebook, Claude, and the verified Grok message structure.
- Use common extraction rules and selected-area export on other LLM services.
- Preserve the rest of the document when an individual equation cannot be converted, and report omitted equations.
- Choose automatic, LaTeX-first, or MathML-first equation extraction.
- Process conversation content locally without an external conversion server, advertising, analytics, or tracking.

## Requirements

PDF export works through Chrome and does not require additional software.

HWPX export requires:

1. Windows
2. Hancom Hangul desktop
3. The separate Formula Chat Windows Helper from [GitHub Releases](https://github.com/CrowScienceLab/Chat2HwpPdf/releases)

The helper communicates with the extension through Chrome Native Messaging and uses Hancom Automation locally. The default document directory is `Documents/Chat2Hwp&Pdf`. The legacy `.hwp` format is not supported.

## Installation

1. Install the Chrome extension from the Chrome Web Store.
2. Download and run `Chat2HwpPdf-Setup.exe` from the latest GitHub Release.
3. Choose the HWPX save folder and security module folder.
4. Open the extension and select **Check helper connection**.

The public installer is configured for Chrome Web Store extension ID `njcnchmapljncehmmfplijnlfgloiibb`.

## Build

```powershell
npm ci --ignore-scripts
npm run vendor
npm test
./native-host/build-setup.ps1 -ExtensionId njcnchmapljncehmmfplijnlfgloiibb
./scripts/package.ps1
```

## Privacy and third-party notices

- [Privacy Policy](docs/privacy.md)
- [Third-party software and trademarks](THIRD_PARTY_NOTICES.md)
- [Editable equation implementation](docs/hwp-editable-equations.md)

The extension does not use remotely hosted executable code. All extension JavaScript is included in the package. Formula Chat to HWPX/PDF is not an official Hancom product and is not affiliated with Hancom.

Developed by Crow Science Lab. · Crow Ink
