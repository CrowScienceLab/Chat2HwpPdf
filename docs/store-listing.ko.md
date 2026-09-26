# Chrome Web Store 소개 초안

이름: 수식Chat to HWPX/PDF
개발자: Crow Science Lab.

AI 대화의 수식을 편집 가능한 한글 수식 개체로 옮기고 PDF로 출력하세요.

ChatGPT·Gemini·Gemini Notebook(NotebookLM)·Claude에서 현재 답변·전체 대화·선택 영역을 선택합니다. 수식을 그림으로 바꾸지 않고 한글에서 수정할 수 있는 수식 개체로 변환합니다.

- PDF: Chrome 인쇄 창에서 저장
- HWPX: Windows 한글과 로컬 도우미로 문서 생성
- Crow Ink 디자인, 간결한 출력 설정
- 대화 내용은 외부 서버로 전송하지 않음

HWPX에는 Windows 데스크톱 한글과 별도 도우미 설치가 필요합니다. .hwp 출력은 제공하지 않습니다. 한컴의 공식 제품이나 제휴 제품이 아닙니다.

Windows 도우미와 설치 안내: https://github.com/CrowScienceLab/Chat2HwpPdf/releases

개인정보처리방침: https://crowsciencelab.github.io/Chat2HwpPdf/privacy.html

## 심사자 안내

사용자 제스처로 얻는 activeTab에 scripting을 실행합니다. nativeMessaging은 HWPX 변환 또는 연결 확인 시 선택적으로 요청합니다. 원격 실행 코드나 WASM은 없습니다. Windows 도우미는 별도 설치 프로그램으로 설치합니다. 한글과 도우미, 심사 확장 ID 등록이 필요합니다.
