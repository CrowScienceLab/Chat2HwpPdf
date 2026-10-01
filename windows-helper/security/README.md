# 한컴 공식 Automation 보안 모듈

출처: https://developer.hancom.com/hwpautomation

공식 원본 ZIP: https://raw.githubusercontent.com/hancom-io/devcenter-archive/main/hwp-automation/보안모듈(Automation).zip

원본 DLL: FilePathCheckerModuleExample.dll

SHA-256: 9ac5b97c47ac8aed1e8bca27a3eef39411361d8f68c262509f0c40a8f9d21bb6

설치 패키지는 공식 FilePathCheckerModuleExample.dll 이름을 유지합니다. HKCU\Software\HNC\HwpAutomation\Modules의 FilePathCheckerModuleExample REG_SZ에 절대경로를 등록합니다. 다른 프로그램의 동일 이름 등록이 있으면 덮어쓰지 않습니다. 제거 시 설치 기록과 일치하는 등록값만 제거합니다.

한컴의 개인·비상업적 Automation 이용 안내를 따르는 배포입니다. 한컴과 제휴·후원 관계가 없습니다. 상업적 배포는 한컴의 별도 조건을 확인해야 합니다.

원본 ZIP은 소스 패키지에 보존합니다. 빌드 전에 ZIP을 이 폴더의 official 하위로 압축 해제합니다. 배포 설치 파일에는 체크섬이 고정된 DLL만 포함됩니다.
