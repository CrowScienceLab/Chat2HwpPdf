# 수식Chat Windows 도우미 · 0.4.8

로컬 HTML·수식 패키지를 한글 COM으로 HWPX로 저장한 후 한글 편집 창에서 엽니다.

## 설치와 공식 보안 모듈

Setup에서 설치를 누르면 기본값으로 설치합니다. 확장 ID·문서 폴더·모듈 폴더는 고급 설정에서 변경할 수 있습니다. 도우미는 현재 사용자 LocalAppData/CrowScienceLab/Chat2HwpPdf에 설치됩니다. 기본 문서 폴더는 Chat2Hwp&Pdf입니다.

공식 DLL FilePathCheckerModuleExample.dll을 원본 그대로 포함합니다. HKCU/Software/HNC/HwpAutomation/Modules의 FilePathCheckerModuleExample REG_SZ에 DLL 절대경로를 기록하고 RegisterModule("FilePathCheckDLL", "FilePathCheckerModuleExample")을 호출합니다. 다른 앱이 동일 이름을 등록했다면 보존하고 설치를 중단합니다.

모듈 등록이 없으면 한글의 기본 승인창이 표시될 수 있습니다. 등록 호출 실패는 오류로 알립니다. 승인창 자동 클릭은 하지 않습니다.

## 제거 및 복구

Windows 설치된 앱에서 제거합니다. 기록된 파일·등록값만 제거하고 사용자 문서와 다른 프로그램 파일은 보존합니다. 설치 실패 시 이전 파일·값을 복구합니다. 사용 중인 파일은 제거 전에 검사합니다.

## 빌드와 검증

build-setup.ps1로 x86 빌드합니다. 공식 ZIP의 DLL 체크섬을 검사합니다. release.json의 공통 버전과 웹스토어 ID를 사용합니다. 개발용 ID가 필요한 경우 -ExtensionId를 지정합니다.

- native-host-ping.mjs: 직접 프로세스의 framed ping
- Setup --self-test: 격리된 시험용 등록값으로 설치·복구·실패 롤백·제거
- security-module-smoke.ps1: 공식 등록값을 임시 적용하고 변환·수식 수정·재저장 후 원복
- security-real-session.ps1: 일반 Windows 사용자 세션에서 설치 테스트와 실제 COM 검사. -InstallForCurrentUser는 현재 Chrome 등록의 ID로 실제 도우미를 설치함

진단 도구의 레지스트리 격리 환경에서는 실제 한글이 등록값을 보지 못할 수 있습니다. 검증을 일반 사용자 세션에서 실행해야 합니다.

install.ps1 / uninstall.ps1 / install-machine.ps1은 이전 개발 설치 유지용입니다. 일반 사용자에게는 통합 Setup을 안내합니다.
