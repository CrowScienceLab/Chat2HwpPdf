# 개인정보처리방침 / Privacy Policy

수식Chat to HWPX/PDF · Crow Science Lab. · 0.4.4

시행일 / Effective date: 2026-09-26

사용자가 선택한 대화를 로컬에서 내보냅니다. 자체 서버로 대화·파일·개인정보를 전송하지 않으며 분석·광고·추적 코드를 포함하지 않습니다.

## 권한

- activeTab: 현재 탭의 대화 읽기
- scripting: 지원 사이트의 대화 추출
- storage: 출력 설정과 마지막 작업 상태 저장
- nativeMessaging (선택): Windows 도우미와 로컬 통신

전체 사이트 접근·방문 기록·다운로드 목록 권한은 요청하지 않습니다.

## 저장 정보

확장 로컬 저장소에는 설정, 마지막 작업 결과, 파일 경로, 수식 개수와 변환 경고를 보관합니다. Windows 사용자 폴더에는 도우미 설정·보안 모듈과 내보낸 문서가 저장됩니다. 변환용 HTML·이미지는 임시 폴더에 만들고 정상 종료 시 정리합니다. 강제 종료 시 일부가 남을 수 있습니다.

이전 0.4.0의 브라우저 편집 전달용 IndexedDB는 0.4.1 업데이트 시 제거합니다. 현재 버전은 문서 데이터를 확장 저장소에 보관하지 않습니다.

도우미를 제거해도 저장한 문서는 보존합니다. Chrome 확장 제거 시 확장의 로컬 저장소는 Chrome이 정리합니다.

문의와 개인정보 관련 요청은 이 저장소의 GitHub Issues를 통해 접수할 수 있습니다.

---

## English

Formula Chat to HWPX/PDF processes only the AI conversation content that the user explicitly chooses to export. Conversations, documents, equations, and personal information are not transmitted to servers operated by Crow Science Lab. The extension contains no advertising, analytics, or tracking code.

### Permissions

- `activeTab`: reads the active tab only after the user starts an export.
- `scripting`: runs conversation and equation extraction in that active tab.
- `storage`: stores output preferences and the status of the most recent task.
- `nativeMessaging` (optional): communicates locally with the Windows helper when the user creates an HWPX file or checks the helper connection.

The extension does not request access to browsing history, downloads, or all websites. It does not use remote executable code.

### Stored information

Chrome extension storage contains output preferences, the latest task result, the saved file path, equation counts, and conversion warnings. It does not retain the full conversation or generated document content.

The Windows helper stores its settings and security module under the current user's local application data folder. Exported HWPX documents are saved in the folder selected by the user. Temporary HTML and image files are removed after normal completion, although some temporary files may remain after an unexpected termination.

Removing the Windows helper does not delete documents created by the user. Chrome removes the extension's local storage when the extension is uninstalled.

Privacy questions and requests may be submitted through GitHub Issues in this repository.
