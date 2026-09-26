# 편집 가능한 한글 수식

## 0.4.1 변경

PDF/HWPX만 제공합니다. 공식 보안 모듈 이름으로 등록하고 일반 Windows 사용자 세션에서 변환·수식 편집·재저장을 검증했습니다. 이전 등록 실패는 진단 환경의 레지스트리 격리로 실제 한글이 등록값을 찾지 못한 문제였습니다. 표도 글자처럼 취급해 후속 수식과의 겹침을 줄였습니다. 아래 초기 검증 이력과 현재 버전의 종단 검증 범위는 구분합니다.

## 현재 구현

MathML 또는 LaTeX 원문을 한글 수식 스크립트로 변환한다. 수식의 시각 DOM 전체를 고유 위치 표식으로 교체하여 KaTeX의 접근성 MathML과 시각 HTML이 중복 삽입되지 않게 한다. 일반 문서 구조는 HTML 가져오기로 유지하고, 호스트가 각 표식을 찾아 삭제한 뒤 `EquationCreate`로 수식 개체를 삽입한다. 수식은 11pt HancomEQN, 글자처럼 취급으로 설정한다. 저장 전에 수식 개체 수와 패키지 수를 비교한다.

수식 PNG/SVG 래스터화 경로는 폐기했다. 일반 삽화의 이미지 처리는 별도다. schemaVersion 2를 사용하며 구버전의 이미지 수식 패키지는 호스트가 거부한다. 확장 0.4.2는 도우미 0.4.1과 호환되며 도우미 재설치는 필요하지 않다.

## 지원과 한계

- MathML: 분수, 첨자/지수, 근호, 합/적분의 범위, 그리스 문자, 벡터·일부 악센트, 행렬, 일반 텍스트.
- LaTeX: 기본 산술, frac/dfrac/tfrac, 첨자/지수, sqrt, 적분·합, 일반 함수, 그리스 문자, left/right, 일부 문자 장식과 글꼴.
- 0.4.3부터 지원하지 않는 명령 또는 원문이 없는 수식은 해당 수식만 [수식 N 생략]으로 표시하고 나머지를 저장한다. 완료 상태에 생략 개수와 최대 3건의 원인을 표시한다. 그림으로 대체하지 않는다. COM 삽입/저장 자체 오류는 여전히 실패로 보고한다.
- boxed/MathML box 강조 테두리는 생략하고 수식 내용만 변환한다. 패키지에 상세 경고를 남기고 완료 메시지에는 수식 확인이 필요함을 표시한다.
- 임의의 LaTeX 매크로·패키지·모든 환경을 지원하는 범용 TeX 엔진은 아니다. 긴 수식의 자동 줄바꿈과 모든 사이트 종단 동작은 추가 확인이 필요하다.

## 검증

`node tests/hwp-equations.mjs`는 LaTeX 변환, 잘못된 입력 거부를 검사하고 COM 검증 패키지를 `tmp/equations/fixture.json`에 생성한다.

`node tests/serve-equation-fixture.mjs`의 로컬 페이지에서 브라우저 MathML·LaTeX 패키징을 검사한다. 합성 fixture 8개만 사용하며 외부로 전송하지 않는다. 결과는 `tmp/equations/browser-fixture.json`이다.

호스트 `--self-test <package.json> <output.hwpx>`로 실제 한글 COM 저장을 검증한다. 기존 HTML fixture는 수식 개체 변환 검사가 아니므로 사용하지 않는다. 호스트 `--edit-test <input.hwpx> <edited.hwpx>`는 저장한 파일을 다시 열어 첫 수식의 String을 수정하고 별도 파일로 저장한다. 파일 승인창을 볼 수 있도록 변환 중 한글 창을 표시하며, 보안 승인을 자동 처리하지 않는다.

확인된 결과: 합성 LaTeX 6개 및 브라우저 MathML/LaTeX 6개 각각 HWPX 내부 수식 개체 6개, 그림 개체 0개, 위치 표식 0개. 브라우저 fixture의 표 1개와 문장 속 수식 배치를 미리보기에서 확인했다. 보완한 브라우저 8개 패키징 검사도 통과했다. 실제 대화에서 읽은 LaTeX 수식 44개를 별도 검증 문서에 삽입하여 수식 개체 44개·그림 0개를 확인했다. 첫 문서를 다시 열어 `F = m a`를 `F = m a + 1`로 편집하고 재저장한 내부 스크립트도 확인했다. 실제 Chrome 버튼에서의 0.3.0 종단 검증은 아직 사용자 재시험이 필요하다.

## 설치

통합 설치는 현재 사용자 LocalAppData/CrowScienceLab/Chat2HwpPdf의 도우미를 Chrome에 등록한다. 확장은 기존 프로젝트 폴더에서 새로고침하여 사용한다.

## 근거

- 한컴 Automation ActionObject: https://raw.githubusercontent.com/hancom-io/devcenter-archive/main/hwp-automation/ActionObject.pdf
- 수식 명령: https://help.hancom.com/hoffice/multi/ko_kr/hwp/insert/equation/equation(script).htm
- 찾아서 블록 지정: https://forum.developer.hancom.com/t/topic/2893
