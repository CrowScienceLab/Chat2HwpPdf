# 수식Chat to HWPX/PDF 개발 인계서

최종 갱신: 2026-09-26  
개발: Crow Science Lab.  
디자인: Crow Ink  
현재 버전: 0.4.4  
상태: Chrome 웹스토어 심사 전 시험판

## 프로젝트 위치와 공개 주소

- 작업 기준 폴더: `D:\App coding\AI-Chat-Exporter`
- GitHub: https://github.com/CrowScienceLab/Chat2HwpPdf
- 시험판 릴리스: https://github.com/CrowScienceLab/Chat2HwpPdf/releases/tag/v0.4.4
- 개인정보처리방침: https://crowsciencelab.github.io/Chat2HwpPdf/privacy.html
- Chrome 웹스토어 확장 ID: `njcnchmapljncehmmfplijnlfgloiibb`
- Native Messaging 호스트: `com.ai_chat_exporter.hwp`

다른 Windows 계정에서 작업할 때는 GitHub 저장소를 위 기준 폴더로 복제한다. GitHub 인증정보와 Chrome 웹스토어 계정 인증정보는 저장소에 포함하지 않는다.

## 제품 목적

AI 채팅의 현재 답변, 전체 대화 또는 선택 영역을 PDF로 출력하거나, 수식을 한글에서 편집 가능한 수식 개체로 변환해 HWPX로 저장한다. 수식은 그림으로 대체하지 않는다. 해석할 수 없는 개별 수식은 `[수식 N 생략]`으로 표시하고 나머지 문서를 저장한다.

지원 확인 범위:

- ChatGPT
- Gemini
- Gemini Notebook
- Claude
- Grok 실제 메시지 구조
- 기타 LLM의 공통 구조 및 선택 영역

Meta와 DeepSeek 자동 인식은 재현 테스트만 있으며 실제 로그인 대화 검증이 남아 있다. `.hwp` 및 rhwp 기능은 제공하지 않는다.

## 구조

- `manifest.json`: Chrome Manifest V3 메타데이터와 권한
- `popup/`: Crow Ink 팝업 UI와 내보내기 시작
- `content/adapters/`: 사이트별 질문·답변 및 노트 추출
- `content/exporter/`: 문서 정리, MathML/LaTeX 변환, HWPX 패키지 생성, PDF 출력
- `background.js`: Native Messaging 작업 전송과 상태 유지
- `native-host/src/Program.cs`: 한글 COM Automation HWPX 생성 호스트
- `native-host/src/Setup.cs`: 현재 사용자용 설치·복구·제거 프로그램
- `native-host/security/`: 한컴 공식 보안 모듈 출처와 체크섬 안내
- `tests/`: 변환, 메시지 전송, 사이트 구조 및 실제 COM 검증 도구
- `scripts/package.ps1`: 확장 ZIP, 소스 ZIP, 설치 파일과 체크섬 패키징
- `docs/`: 개인정보처리방침, 웹 안내, 고급 사용자 설치 안내
- `dist/0.4.4/`: 현재 공개 배포 파일
- `_local-history/`: 과거 검증 보고서의 로컬 보관 위치. Git에는 포함하지 않음

## 필수 환경

- Windows
- Chrome 105 이상
- Node.js와 npm
- .NET Framework x86 C# 컴파일러: `C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe`
- HWPX 실제 검증 시 Windows용 한글. 현재 검증 버전은 한글 2024 `13.0.0.3622`

의존성은 `package-lock.json`으로 고정한다. `node_modules`, `dist`, `tmp`, 빌드된 실행 파일과 한컴 공식 바이너리는 Git에 넣지 않는다.

## 처음 작업하는 계정

```powershell
cd "D:\App coding"
git clone https://github.com/CrowScienceLab/Chat2HwpPdf.git AI-Chat-Exporter
cd "D:\App coding\AI-Chat-Exporter"
npm ci --ignore-scripts
npm test
```

아이콘 PNG를 다시 만들 때만 `npm run vendor`를 실행한다.

한컴 공식 보안 모듈은 https://developer.hancom.com/hwpautomation 에서 내려받는다. 압축 원본은 `native-host/security/official-automation.zip`, 해제 위치는 `native-host/security/official/`이다. `FilePathCheckerModuleExample.dll`의 예상 SHA-256은 다음과 같다.

`9ac5b97c47ac8aed1e8bca27a3eef39411361d8f68c262509f0c40a8f9d21bb6`

공식 바이너리는 저장소나 소스 ZIP에 포함하지 않는다. 공개 설치 EXE에는 체크섬을 확인한 DLL이 리소스로 들어간다. 한컴 Automation의 이용 조건을 변경할 수 있으므로 새 공개 배포 전에 공식 조건을 다시 확인한다.

## 빌드와 검증

```powershell
npm test
./native-host/build-setup.ps1 -ExtensionId njcnchmapljncehmmfplijnlfgloiibb
./scripts/package.ps1
```

출력은 `dist/<manifest version>/`에 생성된다.

- `Chat2HwpPdf-Chrome-<version>.zip`: Chrome 웹스토어 또는 고급 사용자 수동 설치
- `Chat2HwpPdf-Setup.exe`: Windows 도우미 설치
- `Chat2HwpPdf-Source-<version>.zip`: 공개 소스 묶음
- `SHA256SUMS.txt`: 배포 파일 검증

자동 테스트는 구문·권한, LaTeX 변환과 오류 거부, 백그라운드 분할 전송, Gemini/Notebook/Claude/Grok 구조, 선택 영역과 부분 생략을 검사한다. 실제 COM 검증은 일반 Windows 사용자 세션에서 실행해야 한다. 격리된 진단 프로세스의 HKCU와 실제 한글 프로세스의 HKCU가 달라 보안 모듈 등록 실패로 오인한 이력이 있으므로 주의한다.

## 설치와 보안 모듈

- 설치 위치: `%LOCALAPPDATA%\CrowScienceLab\Chat2HwpPdf`
- 공식 DLL: `Security\FilePathCheckerModuleExample.dll`
- 등록 위치: `HKCU\Software\HNC\HwpAutomation\Modules`
- 값 이름: `FilePathCheckerModuleExample`
- 호스트 호출: `RegisterModule("FilePathCheckDLL", "FilePathCheckerModuleExample")`

설치 프로그램은 다른 프로그램이 등록한 같은 이름의 모듈을 덮어쓰지 않는다. 제거 시 자신의 설치 경로와 일치하는 등록값만 제거하며 사용자가 만든 문서는 보존한다.

## 공개 및 업데이트 절차

1. `manifest.json`과 `package.json` 버전을 함께 올린다.
2. `README.md`, 개인정보처리방침과 설치 문서의 버전을 갱신한다.
3. `npm test`를 실행한다.
4. 웹스토어 확장 ID를 지정해 설치 프로그램을 다시 빌드한다.
5. `scripts/package.ps1`을 실행하고 SHA-256을 확인한다.
6. 변경 사항을 커밋하고 `main`에 푸시한다.
7. GitHub Release에 네 개의 배포 파일을 첨부한다.
8. 웹스토어 심사 중에는 GitHub 릴리스를 prerelease로 유지한다. 승인 후 정식 릴리스로 전환하고 README의 심사 전 문구를 수정한다.

GitHub 릴리스 수정 예:

```powershell
gh release upload v<version> dist/<version>/* --clobber
```

Chrome 웹스토어용 개인정보처리방침 주소는 위 GitHub Pages URL을 사용한다. `activeTab`, `scripting`, `storage`, 선택적 `nativeMessaging`만 요청하며 원격 실행 코드를 사용하지 않는다.

## 현재 남은 확인 사항

- Chrome 웹스토어 심사 완료 및 공개 전환
- 게시자 연락처 이메일 인증
- 실제 Chrome에서 PDF/HWPX × 현재 답변/전체 대화/선택 영역 최종 점검
- 새 PC 설치·제거와 다른 한글 버전 확인
- Meta와 DeepSeek 실제 대화 자동 인식 확인
- 공개 설치 파일의 코드 서명 검토
- 프로젝트 자체 소스 라이선스 확정. 현재 저장소에 명시적 라이선스 파일은 없음

## 작업 원칙

- 현행 프로젝트는 이 폴더 하나만 사용한다. 병렬 복사본을 만들지 않는다.
- 임시 파일은 `tmp/`에 만들고 작업 후 `_local-history/`로 이동하거나 불필요하면 제거한다.
- 과거 보고서와 검증 산출물은 `_local-history/`에 두며 현행 소스와 섞지 않는다.
- `_local-history/legacy-development-bundle.zip`은 폐기된 rhwp 실험, 중복 패키지와 과거 원시 진단물의 복구용 압축본이다.
- `_local-history/private-browser-profiles/`는 2026-09-24 시험용 Chrome 프로필이다. 쿠키·세션 정보가 포함될 수 있어 Git에 포함하지 않는다. 개발에는 필요 없으며 명시적 삭제 승인 후 제거한다.
- 비밀번호, 토큰, 인증서, 개인 이메일과 사용자 대화 원문을 저장소에 커밋하지 않는다.
- 공개 전 `git status`, 테스트 결과, 패키지 체크섬, GitHub 릴리스 첨부 파일을 확인한다.
