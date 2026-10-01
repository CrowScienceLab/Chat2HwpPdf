# 0.4.5 정식 공개 준비 및 검증 기록

검증일: 2026-09-29. 현행 프로젝트: `D:\App coding\AI-Chat-Exporter`.
현재 스토어는 사용자 확인 기준 테스터 한정 공개다. 이번 변경은 로컬 0.4.5 패키지이며 GitHub/스토어에 업로드하거나 공개 범위를 변경하지 않았다.

## PDF 원인과 수정

사용자가 제공한 3쪽 PDF의 본문 856자는 RGB `(0.9294, 0.9294, 0.9294)`, 즉 `#EDEDED`였다. 제목은 `(0.0902, 0.098, 0.1216)`이었다. 실제로 매우 밝은 본문색이 PDF에 기록되어 있다. 저해상도 이미지로 바뀌어서 흐려진다는 증거는 없었다.

현재 답변/전체 대화는 메시지 컨테이너의 class/style을 복제하고, 수식은 계산된 색상까지 복사했다. 인쇄 루트에만 진한 색상을 지정해도 하위 요소의 색상이나 투명도를 덮어쓰지 못한다. 선택 영역은 새 wrapper에 들어가므로 바깥 메시지 컨테이너의 영향을 덜 받는다. 이 경로를 합성 다크 모드/opacity/filter/mask 조건으로 검증했다. 해당 PC의 실제 DOM을 확보하지 못했으므로 어느 사이트 클래스가 #EDEDED를 주었는지는 확정하지 않았다.

PDF용 복제본의 본문·수식 글자색과 text-fill을 진한 색으로 정규화하고 opacity/filter/mask/animation을 해제했다. 수식의 위치·크기·숨겨진 접근성 MathML 구조와 SVG 내부 그림 색상은 유지한다. 내보낸 본문의 장식용 글자색은 진한 단색으로 바뀐다. 원본 페이지는 수정하지 않는다.

## 추가 수정

- 인쇄 준비 중 중복 실행을 거부하고, 이미지/폰트 준비 후 인쇄한다.
- 인쇄 오류를 호출자에게 전달하고 임시 DOM을 정리한다. 완료된 작업의 타이머가 다음 작업을 지우지 않도록 취소한다.
- 복제 최상위 요소까지 이벤트 속성과 위험한 URL을 정리한다.
- SVG ID를 삭제하는 대신 고유 ID로 바꾸고 `use`, gradient, clipPath의 내부 참조를 함께 갱신한다.
- HWPX 이미지 변환은 실제 로드된 Image를 사용한다. 이미지별 4.5초 제한을 두어 멈춘 요청은 생략 표시로 처리한다.
- Playwright 개발 의존성을 고정하고 PDF/브라우저, 인쇄 수명주기, 이미지 실패 회귀 검사를 추가했다.
- 패키징 임시 자료와 기존 패키지는 상위 작업 규칙에 따라 `_archive`에 보관한다.

## 수행한 검증

| 검사 | 결과 | 범위/한계 |
|---|---|---|
| npm test | 통과 | 구문·권한·수식 변환·잘못된 입력·분할 전송·중복 실행·연결 종료·재시작 복구·사이트 어댑터·인쇄/이미지 오류 |
| 브라우저 PDF 경로 54건 | 통과 | 설치된 Chrome/Edge의 headless 실행, 밝음/다크/흐림 × DPR/zoom 1/1.25/2 × 현재/전체/선택 |
| 브라우저 HWPX 추출 54건 | 통과 | 동일 환경에서 수식 2개 추출, 생략 0개, 한글 보존 |
| 실제 PDF 3개 | 통과 | 현재/전체/선택 PDF 생성, 한글·표·분수·MathML·SVG 시각 확인 및 색상/텍스트 검사 |
| 실제 한글 COM | 통과 | 합성 수식 6개 문서 및 Gemini/Notebook/Claude/부분생략/전체생략/Notebook태그 6종 저장 |
| HWPX 내부 XML | 통과 | 기대 수식 개체 수와 일치, 미치환 AICEEQ 표식 0개 |
| 수식 편집 | 통과 | 저장본을 다시 열어 `F = m a` → `F = m a + 1` 재저장, 내부 script 확인 |
| Native Messaging 프레임 | 통과 | 분할 헤더를 포함한 ping 2회. Chrome의 실제 호스트 탐색 검사는 아님 |
| 의존성 검사 | 통과 | 설치 시 npm audit 0 vulnerabilities |

브라우저 검사는 합성 문서를 사용하며 실제 사용자 계정의 로그인 대화나 OS 배율 변경을 직접 검사한 것은 아니다. DPR/zoom은 브라우저 내 모의 조건이다. 가로/세로와 기본/좁은 여백도 포함하지만 전체 옵션의 모든 조합은 아니다. 한글 COM은 현재 노트북 환경만 검증했다. PDF 화면의 인쇄 대화상자 클릭은 자동화하지 않았으며 실제 렌더링은 Chromium PDF 엔진으로 확인했다.

## 재현 명령

```powershell
npm ci --ignore-scripts
npm test
$env:AICE_BROWSER_CHANNELS='chrome,msedge'
npm run test:print
./native-host/build-setup.ps1 -ExtensionId njcnchmapljncehmmfplijnlfgloiibb
node tests/native-host-ping.mjs
node tests/site-compatibility.mjs --write-fixtures
# COM 검사는 Windows 한글과 공식 보안 모듈 등록 환경에서 수행한다.
./native-host/bin/AIChatExporter.HwpHost.exe --self-test tmp/equations/fixture.json tmp/equations/verified.hwpx
./native-host/bin/AIChatExporter.HwpHost.exe --edit-test tmp/equations/verified.hwpx tmp/equations/edited.hwpx
```

`tests/verify-generated.py`는 pdfplumber가 필요하며 PDF와 생성된 HWPX 내부를 검사한다. 브라우저 테스트는 설치된 Chrome/Edge를 사용한다. Playwright와 Python은 개발 검증용이며 확장 사용자에게 설치를 요구하지 않는다.

## 정식 공개 완료 조건

- [ ] 문제가 발생한 PC에 0.4.5를 적용하고 동일 대화의 PDF 3범위 재시험. 확장 업데이트 후 AI 대화 탭도 새로고침한다.
- [ ] 실제 스토어 설치 경로에서 PDF/HWPX 버튼, 인쇄 취소 후 재시도, 도우미 연결 확인.
- [ ] 새 Windows 사용자/PC에서 설치·업데이트·제거 및 사용자 문서 보존 확인.
- [ ] 다른 지원 대상 한글 버전에서 수식 저장·재편집 확인.
- [ ] 긴 실제 대화, 넓은 표/수식, 늦게 로드되는 이미지의 페이지 나눔 확인.
- [ ] DeepSeek/Meta 실제 로그인 대화 검증. 현재 합성 검증만으로 지원 보장하지 않는다.
- [ ] 게시자 라이선스 결정, 설치파일 서명 여부 및 공식 Automation 배포 조건 확인.
- [ ] 스토어에 0.4.5 업로드 후 테스터 결과 확인, 정식 공개 전환.

위 미확인 항목을 통과한 것으로 표시하지 않는다. PDF 수정 검증과 제품의 모든 환경에 대한 출시 승인은 별개다.
