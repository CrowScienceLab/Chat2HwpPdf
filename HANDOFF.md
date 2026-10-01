# 개발 인계 · 2026-10-02

작업 기준: `D:\App coding\AI_Chat2Hwpx_Pdf`
저장소: https://github.com/CrowScienceLab/Chat2HwpPdf
웹스토어 ID: `njcnchmapljncehmmfplijnlfgloiibb`
현재 버전: 확장·도우미·설치 프로그램 모두 `0.4.7`.

이전 `AI-Chat-Exporter` 디렉터리를 위 경로로 옮겼습니다. `.git`와 사용자 작업을 보존했으며 별도 병렬 프로젝트를 만들지 않았습니다. 개발 영역은 `chrome-extension`과 `windows-helper`로 구분합니다. 압축해제 로드 대상은 프로젝트 전체가 아닌 `chrome-extension`입니다. 경로 변경으로 개발용 확장 ID가 달라질 수 있으므로 도우미의 고급 설정에서 확인하세요. 웹스토어 ID는 그대로입니다.

## 기능과 빌드

PDF에는 도우미를 요구하지 않습니다. HWPX는 변환 전에 도우미 연결과 버전을 확인하고, 누락·불일치 시 설치 안내를 제공합니다. 설치 안내의 다운로드는 `release.json` 버전의 릴리스 EXE로 직접 연결합니다. 설치 프로그램은 기본값 설치를 제공하고 확장 ID·저장 폴더·보안 모듈 폴더는 고급 설정에 둡니다. Windows Native Messaging 호스트명·설치 경로·보안 모듈 등록 이름은 기존 설치와 호환됩니다.

`npm run build`: 버전 동기화 → 아이콘 생성 → 도우미 빌드 → 배포 묶음. `npm test`, `npm run test:print`, `node tests/native-host-ping.mjs`로 검증합니다. `release.json`을 변경해 버전을 올립니다. 배포 ZIP은 `manifest.json`이 압축 루트에 있어야 합니다. Windows 설치 파일은 공식 웹스토어 ID를 기본 사용합니다.

## 이전 PDF 수정과 검증

0.4.5: 밝은 글자색·투명도·필터 정규화, SVG 참조 보존.
0.4.6: 원본 사이트 인쇄 CSS와 분리된 프레임에서 출력. 인쇄 종료 후 프레임을 다음 출력까지 보존. 사용자가 다른 PC에서도 정상 작동을 확인했습니다.
0.4.7: 설치 단순화, 공통 버전, 검은 까마귀/노란 부리 아이콘, 설명용 `f(x) = HWP`, 프로젝트 구조 정리. 상세: `docs/release-0.4.7.md`.

## 보존과 배포

구 배포본·로컬 기록·이전 안내서·일회성 비교 검사는 `D:\App coding\_archive\AI_Chat2Hwpx_Pdf\2026-10-02-structure`에 보관합니다. 기존 보고서는 `D:\App coding\Segyo-On\docs\maintenance`에 그대로 유지합니다. 이번 결과도 해당 경로의 날짜별 작업 폴더에 기록합니다. 임시 결과는 작업 종료 후 `_archive`로 이동합니다.

소스·패키지 생성과 외부 공개 상태는 별도로 기록해야 합니다. Chrome 웹스토어 접근은 이전 대화에서 사이트 접근 정책에 의해 차단되었으며 업로드 성공으로 간주하지 않습니다. 웹스토어 ZIP 교체·심사 제출과 아이콘/홍보 이미지 교체가 필요합니다. GitHub 배포 시 확장·EXE·소스 ZIP·이미지·체크섬을 같은 버전으로 올립니다.
