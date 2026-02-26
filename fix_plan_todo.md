# ShiftV 최적화 및 라우팅 도입 작업 계획서 (Phase-by-Phase To-Do)

본 문서는 `script.js`(전체 약 7300줄)의 방대한 컨텍스트와 기존 UI의 안전성을 최우선으로 고려하여 작성된 **점진적(Phase) 리팩토링 및 기능 수정 로드맵**입니다. 
각 Phase는 한 번에 처리 가능한 코드 수정량(컨텍스트 크기)과 연관성(모듈/기능)을 기준으로 분할되었습니다.

---

## 🚦 Phase 1: 기반 마련 및 긴급 이슈 해결 (Low Risk / High Priority) ✅ 완료
- **목표**: 앱의 구동에 직접적인 영향을 주지 않는 유틸리티성 코드들을 먼저 분리하고, 가장 시급한 로그인 라우팅(리다이렉트 후처리) 문제를 최우선으로 해결합니다.

1. **상수 및 유틸리티 추출 (`src/constants.js`, `src/utils.js`)**
   - [x] `PRIMARY_DATA_KEY`, `SETTINGS_KEY`, `bodySizeKeys` 등 데이터 키 관련 상수 `src/constants.js`로 분리 → `script.js`에서 import
   - [x] `isIOS()`, `normalizeSymptomsArray()`, `symptomsSignature()`, `getCssVar()` 등 독립적인 순수 함수 `src/utils.js`로 이동 → `script.js`에서 import
   - [x] `healthKeys`는 미사용(dead code)으로 확인되어 제거
2. **구글 리다이렉트 로그인 이슈 핫픽스 (`src/firebase/auth.js`)**
   - [x] 파이어베이스 인증 로직(`signInWithPopup`, `signInWithRedirect`, `handleRedirectResult`, `onAuthStateChanged` 등)을 `auth.js`로 추출 완료.
   - [x] 🚨 앱 진입 직후(DOMContentLoaded 최상단) `handleRedirectResult()`를 호출하여 리다이렉트 성공 시 메인 대시보드(`#sv`)로 이동하도록 구현.
3. **Phase 1 통합 테스트**
   - [x] `vite build` 성공 확인 (빌드 에러 없음)
   - [ ] 모바일/PWA에서 구글 로그인 시 리다이렉트가 초기화면 루프에 빠지지 않고 정상 접속되는지 확인 (수동 테스트 필요)

---

## 🚄 Phase 2: 해시 라우팅 시스템 도입 및 탭 제어 분리 (Medium Risk / Core Change)
- **목표**: SPA(Single Page Application)로서의 뼈대인 라우팅을 구축하여 뒤로가기 문제를 해결하고, 전역에 산재된 탭 전환 로직을 하나로 통합합니다. 

1. **라우터 생성 (`src/core/router.js`)**
   - [ ] `window.addEventListener('hashchange')`를 기반으로 한 중앙 라우터 함수 구현
   - [ ] URI 해시(`/#sv`, `/#record`, `/#settings` 등)에 따라 적절한 탭/화면을 렌더링하도록 매핑 로직 작성
2. **기존 탭 전환 로직 치환 (`script.js` 일부 수정)**
   - [ ] 현재 바닐라 JS로 `tab.addEventListener('click', ... display:block;)` 파트를 거둬내고, 단순히 `window.location.hash`를 변경하도록 버튼 이벤트 치환
3. **모달(Modal) 상태의 라우팅 연동 (선택사항, 필요시)**
   - [ ] 특정 모달 창이 열릴 때 라우터에 파라미터를 추가(`/#sv/hormone-modal` 형태)하여 뒤로가기 시 앱이 꺼지지 않고 모달만 닫히도록 개선
4. **Phase 2 통합 테스트**
   - [ ] 안드로이드 기기에서 여러 탭과 모달을 이동한 후 '뒤로 가기' 버튼을 눌렀을 때 앱이 종료되지 않고 정상적인 화면 전환이 이루어지는지 집중 테스트

---

## 🏗️ Phase 3: 핵심 뷰(View) 렌더링 로직 분리 (High Context / Medium Risk)
- **목표**: 가장 코드량이 길고 DOM 변화가 많은 '측정 기록 화면'과 '보고서(SV) 화면'의 HTML 주입(`.innerHTML`) 및 이벤트 리스너 로직을 밖으로 뺍니다.

1. **측정 기록 탭 로직 추출 (`src/ui/tabs/record-tab.js`)**
   - [ ] `measurement-form` DOM 요소에 붙은 온갖 입력 필드 검증 로직, 증상 추가/수정, 약물 컨테이너 동적 생성 코드 등을 이 파일로 이동
2. **메인 리포트 탭 렌더링 로직 추출 (`src/ui/tabs/sv-tab.js`)**
   - [ ] `renderPersonaCard`, `renderQuestCard`, `calculateAdvancedHormoneAnalytics()` 기반의 호르몬 카드, 건강 분석 카드 등 복잡한 HTML 스트링 생성 코드 일괄 분리
3. **Phase 3 코드 정리 (`script.js` 다이어트)**
   - [ ] 위 두 개의 뷰 파일이 분리되면 `script.js` 컨텍스트가 40~50% 정도로 크게 줄어듦. 분리된 함수들의 `import` 구문 점검

---

## 🎯 Phase 4: 모듈성 강화 및 차트/테이블 컴포넌트화 (Medium Context / Medium Risk)
- **목표**: 여러 탭에서 재사용되는 UI 컴포넌트(차트, 표 렌더링, 페이지네이션)를 클래스(Class)나 모듈 패턴으로 리팩토링합니다.

1. **차트 엔진 캡슐화 (`src/ui/charts/chart-manager.js`)**
   - [ ] `Chart.js` 인스턴스의 생성(`new Chart(...)`) 및 파기(`destroy()`), 줌 플러그인 설정 등을 담당하는 객체/클래스 작성.
2. **테이블 및 리스트 생성기 분리 (`src/ui/components/table-renderer.js`)**
   - [ ] '마이(My) 탭'의 거대한 테이블 생성 코드(`document.createElement('table')` 루프 도는 부분) 캡슐화.
3. **데이터 매니저 생성 (`src/core/data-manager.js`)**
   - [ ] `measurements`, `targets` 배열과 이 데이터를 localStorage/IndexedDB 등에 저장/불러오기(Sync) 하는 로직 분리 (수정 및 읽기는 모두 DataManager를 통하도록 변경)

---

## 🛠️ Phase 5: 최종 최적화 및 번들링 (Low Risk / Polish)
- **목표**: 앱의 구동 성능 및 다이얼로그 시스템 구조 등, 사용자 경험(UX) 최적화

1. **팝업/다이얼로그 컨트롤러 통합 (`src/ui/components/modal-system.js`)**
   - [ ] 곳곳에 흩어진 `openModal()`, `closeModal()`, "배경 누르면 다이얼로그 닫기" 로직 등 중앙 집중화
   - [ ] `<dialog>` 태그를 활용한 네이티브 다이얼로그 방식으로 업그레이드 검토
2. **Chart.js 및 외부 라이브러리 Lazy Loading 적용 (Performance 향상)**
   - [ ] `index.html` 상의 차트 라이브러리 스크립트 삭제 후, SV 탭 등 실제로 차트를 그릴 때만 `import(...)` 형태로 동적 로딩하여 앱의 첫 화면 렌더링(TTI) 속도 파격적 개선
3. **안 쓰는 레거시 코드 및 하드코딩된 HTML/CSS 찌꺼기 제거**

---

> **💡 진행 가이드**
> *   각 Phase의 작업이 끝날 때마다 정상 작동 여부를 앱에서 바로 테스트하고, 이상이 없으면 Git Commit(또는 백업)을 남긴 후 다음 Phase로 이동하는 것을 추천합니다. 
> *   가장 먼저 **Phase 1** 진행을 시작할까요?
