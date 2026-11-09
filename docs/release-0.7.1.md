# 수식Chat to HWPX/PDF 0.7.1 · 편집 수식·그림 내보내기와 ChatGPT 호환성 복구

AI 대화의 텍스트·수식·그림을 PDF 또는 편집 가능한 한글 HWPX 문서로 보존하세요. 기존 문서 변환 기능을 유지하면서 ChatGPT에서 현재 답변·전체 대화를 찾지 못하던 문제를 해결했습니다.

## 주요 기능과 기존 버전의 장점

- **편집 가능한 한글 수식**: 지원되는 MathML·LaTeX를 그림 대신 한글 수식 개체로 변환합니다. 자동·LaTeX 우선·MathML 우선 방식을 선택할 수 있습니다.
- **그림·인포그래픽 포함**: 기본으로 포함하며 필요한 경우 대화형 시각화를 정적 이미지로 보존합니다. 항상 보이는 **그림 제외**를 선택하면 텍스트·수식만 출력합니다.
- **출력 범위 선택**: 현재 답변·전체 대화·선택 영역을 PDF/HWPX로 내보내고 질문·답변·제목·날짜 포함 여부와 PDF 방향을 선택합니다.
- **여러 AI 서비스 지원**: ChatGPT·Gemini·Claude·Gemini Notebook, Notebook 메모·보고서·인포그래픽, Grok 및 기타 LLM의 공통 구조나 선택 영역 내보내기를 지원합니다. 사이트 구조·접근 제한에 따라 일부 내용은 생략될 수 있습니다.
- **정돈된 서식**: 본문·표11pt/줄간격150%, 전체제목20pt, 중간제목15pt와 앞 빈 줄. HWPX 여백은 상하15/좌우20/머리말·꼬리말10mm, PDF는 상하15/좌우20mm이며 PDF 머리말·꼬리말은 Chrome 설정을 따릅니다.
- **변환 실패 안내**: 지원하지 않는 수식·보존할 수 없는 그림은 사유를 안내하고 나머지 내용을 저장합니다.
- **로컬 처리**: 대화와 문서를 외부 변환 서버로 전송하지 않습니다. HWPX 데이터는 Chrome Native Messaging으로 PC의 Windows 도우미에 전달합니다.
- **설치·연결 편의**: 설치 완료 후 닫기 버튼, 연결 LED/버전 표시, 중복 문구 제거, 선명한 까마귀 아이콘과 PDF 보안 정책 오류 수정을 유지합니다.

## 0.7.1의 ChatGPT 수정

ChatGPT에서 “현재 답변을 찾지 못했습니다” 또는 “대화 구조를 인식하지 못했습니다”가 나타나던 문제를 수정했습니다.

실제 2026-11-09 ChatGPT 화면에는 기존 data-message-author-role 속성이 없고, 역할 제목에 data-conversation-role이 표시됩니다. 제목의 textContent에는 숨겨진 인쇄용 이름까지 붙어 기존의 정확한 제목 비교가 실패했습니다.

- 새로운 역할 속성으로 질문/답변을 구분합니다.
- 이전 화면에서는 숨겨진 인쇄용 글자를 제외한 역할 제목으로 탐색합니다.
- 역할 속성으로 구분되는 경우 화면 언어에 의존하지 않습니다.
- 질문과 답변이 한 턴에 함께 있어도 메시지 경계를 분리합니다.
- 숨겨진 복제 메시지를 제외하고 문서에서 중복 역할 제목을 제거합니다.
- 이미 열려 있는 페이지에 이전 어댑터가 있어도 새 어댑터를 적용할 수 있도록 내부 버전을 구분합니다.

본문11pt/150%, 제목20pt/중간제목15pt, 그림 포함/제외 등 0.7.0 출력 기능을 유지합니다. Google Docs 변환 기능은 이번 수정에 포함되지 않습니다.

## 검증 및 업데이트

실제 로그인된 ChatGPT 페이지에서 화면 구조를 확인했습니다. 개인정보를 제외하고 같은 구조를 재현한 시험 페이지에서 신/구 구조·다국어·혼합 구조·숨겨진 복제 메시지에 대해 현재 답변/전체 대화 × PDF/HWPX 28개 경우를 검사합니다. 그림, 표, 수식 개수, 질문/답변 순서와 메시지 경계를 함께 검증합니다.

확장과 도우미/설치 파일 버전은 0.7.1(Windows 파일 버전0.7.1.0)로 통일했습니다. 기존 구현은 HWPX 변환 전에 버전 일치를 검사하므로 이번 수정본을 시험할 때 두 앱을 함께 교체하세요. 확장 갱신 후 ChatGPT 대화 탭도 새로고침합니다.

PDF는 확장만 필요합니다. HWPX는 Windows용 한글과 도우미가 필요하며 확장과 도우미를 함께0.7.1로 맞춰야 합니다. 수동 설치는 Chat2HwpPdf-Chrome-0.7.1.zip을 압축 해제하여 chrome://extensions 개발자 모드에서 manifest.json이 있는 폴더만 로드합니다. 개발용 확장 ID가 웹스토어 ID와 다르면 도우미 고급 설정에 실제 ID를 입력하세요. 업데이트 후 ChatGPT 탭을 새로고침하고 그림 처리 중에는 해당 탭을 유지합니다.

출력은 PDF/HWPX이며 그림은 정적 이미지입니다. 모든 LaTeX 명령과 사이트 구조를 지원하는 범용 변환기는 아닙니다. Google Docs 전용 변환은 이번 버전에 포함되지 않습니다. 한컴 공식·제휴 제품이 아닙니다.

배포 파일은 확장 ZIP·설치 EXE·소스 ZIP·소개 이미지·SHA256SUMS.txt입니다. GitHub 배포와 Chrome 웹스토어 심사는 별도이며 GitHub 공개만으로 웹스토어 설치본이 자동 갱신되지는 않습니다.

---

## English

**Formula Chat to HWPX/PDF0.7.1** preserves AI conversations, equations and images as PDFs or editable Hancom HWPX documents. This release restores ChatGPT response/conversation detection while retaining the existing conversion features.

### Core features

- Convert supported MathML/LaTeX into editable Hancom equation objects, with automatic, LaTeX-first and MathML-first options.
- Include images and infographics by default, or select the always-visible Exclude images option. Interactive visualizations may be preserved as static images.
- Export the current response, full conversation or selected content, with question/answer/title/date and PDF orientation options.
- Support ChatGPT, Gemini, Claude and Gemini Notebook, including Notebook notes/reports/infographics. Common structures or selection export may also work with Grok and other LLMs; site structure and access restrictions can limit coverage.
- Apply consistent body/table11pt,150% line spacing, title20pt and headings15pt with a preceding blank line. HWPX margins: top/bottom15mm, left/right20mm, header/footer10mm. PDF margins: top/bottom15mm and left/right20mm; Chrome controls PDF headers/footers.
- Explain unsupported equations/images while saving the remaining content.
- Process data locally without an external conversion server. HWPX data is passed to the Windows helper through Chrome Native Messaging.
- Provide installation-complete Close behavior, connection LEDs/version information, a sharper crow icon and the existing PDF security-policy fix.

### Fixes and updating

Restored ChatGPT detection after its page structure changed. Fixed role recognition affected by hidden print-only names, retained legacy layouts, improved message boundaries and hidden-copy filtering, removed duplicate role headings, and improved adapter refresh and consecutive exports.

PDF needs only the extension. HWPX requires Hancom Hangul for Windows and the helper. Update both apps to0.7.1 and refresh open ChatGPT tabs. For manual installation, extract the Chrome ZIP and load the folder containing manifest.json in Chrome developer mode. Enter the actual extension ID in the helper's advanced settings if it differs from the store ID. Keep the source tab active while images are processed.

Verified28 new/legacy-layout export cases,72 Chrome/Edge print cases,72 HWPX extraction cases,44 media cases, UI/CSP regressions and native Hancom saving/reopening/equation editing. Structural fixtures are informed by the live page; the user's installed extension was not automatically replaced.

Outputs: PDF/HWPX. Figures are static, and not every LaTeX command or site layout is supported. Google Docs-specific conversion is not included. GitHub releases and Chrome Web Store review are separate. This product is not affiliated with Hancom.

Development: Crow Science Lab. / Design: Now That Physics, Crow.
