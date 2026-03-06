# ShiftV 마스터 To-Do — Phase별 실행 계획

**작성일:** 2026-03-06  
**기준 커밋:** `10d4839`  
**총 추정:** 6 Phase, 순차 진행  

---

## 🔴 Phase 1: 긴급 버그 수정 & 안정화 (1~2일)
> **목표:** 사용자가 바로 체감하는 크래시/이상동작 제거

### 1-1. 중복 이벤트 리스너 제거
- [ ] `svCardTargets` — L5949의 빈 핸들러(`// 기존 코드 생략`) 삭제, L6008의 모달 핸들러만 유지
- [ ] `svCardShortcut` — L6068의 `activateTab('tab-record')` 중복 핸들러 삭제 (L6000의 `navigateToTab` 유지)

### 1-2. 라우터 완전 적용 (activateTab → navigateToTab)
- [ ] L5050 — 측정 저장 후 SV 탭 이동
- [ ] L5143 — 측정 편집 클릭 후 Record 탭 이동
- [ ] L5286 — 목표 저장 후 SV 탭 이동
- [ ] L5483 — 데이터 가져오기 후 My 탭 이동
- [ ] L5605 — 앱 초기화 시 SV 탭 활성화
- [ ] L5657 — 온보딩 완료 후 SV 탭 이동
- [ ] L5767 — 히스토리 모달 편집 버튼 → Record 탭
- [ ] L6039 — My탭 편집 버튼 → Record 탭
- [ ] L6172 — FAB 다이어리 버튼 → Diary 탭

### 1-3. 무방어 JSON.parse 보호
- [ ] L1737, L1744 — `saveThemeSetting/loadThemeSetting` try-catch 래핑
- [ ] L6414, L6415 — PDF 보고서 내 diary/quests 파싱 보호
- [ ] L6551 — 알림 체크 내 PRIMARY_DATA_KEY 파싱 보호

### 1-4. 빈 catch 블록 → 최소 console.warn 추가
- [ ] **High 우선순위** 5개: L2494(호르몬 리포트), L4089(히스토리 테이블), L4090(My 히스토리), L4117, L4118
- [ ] **Medium** 2개: L2366(약물 이름 맵), L6687(AI 키 atob)
  
### 1-5. 빌드 + 테스트 + 커밋
- [ ] `npm run build` 확인
- [ ] 모바일/데스크탑 수동 테스트 (탭 전환, 뒤로가기, 모달 열기/닫기)
- [ ] Git 커밋 + upstream push

---

## 🟡 Phase 2: 코드 품질 & 기술 부채 정리 (2~3일)
> **목표:** 프로덕션 품질 확보, 데드코드 제거, 성능 개선 기반 마련

### 2-1. DEBUG 콘솔로그 제거
- [ ] script.js 내 48개 `console.log("DEBUG: ...")` 제거 또는 `if(DEBUG)` 플래그 뒤로 이동
- [ ] vite.config.js에 `esbuild.drop: ['console']` 옵션 검토 (프로덕션 빌드에서 자동 제거)

### 2-2. 데드코드 정리
- [ ] `src/data-manager.js` (루트, 529줄) 삭제 — 아무데서도 import 안 됨
- [ ] `service-worker.js` 캐시 목록에서 `src/data-manager.js` 제거
- [ ] script.js 내 이미지 압축 인라인 코드(L27-63) 삭제 → `src/data/image-compress.js` 사용으로 통일

### 2-3. z-index 체계 정리
- [ ] `z-index: 9999` 2곳(style.css L8588, L8988) → 적절한 토큰 사용으로 변경
- [ ] `calc(var(--z-index-fixed) + 50)` → 전용 토큰 `--z-index-notif-panel` 신설
- [ ] `--z-index-modal-backdrop` 미사용 → 실제 모달에 적용하거나 제거
- [ ] `calc(var(--z-index-modal) + 10)` → `--z-index-popover` 사용으로 변경

### 2-4. 이벤트 리스너 정리
- [ ] 모달 콘텐츠에 붙는 리스너 → 모달 close 시 cleanup 추가 (filterContainer, tabSwitcher 등)
- [ ] 차트 레전드 핸들러 중복 등록 방지 (렌더 함수 내 → 초기화 1회로)

### 2-5. i18n 하드코딩 정리 (1차)
- [ ] index.html의 주요 하드코딩 한국어 → `data-lang-key` 변환 (상위 50개)
- [ ] script.js의 UI 문자열 중 한국어 → translate() 호출로 변환

### 2-6. 빌드 + 테스트 + 커밋

---

## 🟢 Phase 3: script.js 분할 & 아키텍처 개선 (3~5일)
> **목표:** 모놀리스를 관리 가능한 크기로 분할, 유지보수성 대폭 향상

### 3-1. SV 탭 분리 (`src/ui/tabs/sv-tab.js`)
- [ ] `renderSvTab()` 및 관련 카드 렌더링/이벤트 로직 추출 (~500줄)
- [ ] 위젯 클릭 핸들러 전부 이동
- [ ] script.js에서 import + 호출로 대체

### 3-2. My 탭 분리 (`src/ui/tabs/my-tab.js`)
- [ ] `renderMyHistoryView()`, 히스토리 테이블, 목표 입력 UI 추출 (~800줄)
- [ ] 테이블 페이지네이션 로직 포함

### 3-3. Settings 탭 분리 (`src/ui/tabs/settings-tab.js`)
- [ ] 설정 폼 이벤트, 테마/언어/동기화 설정 추출 (~400줄)

### 3-4. Record 탭 완전 분리 (`src/ui/tabs/record-tab.js`)  
- [ ] `record-tab-helpers.js`와 합병하여 완전한 탭 모듈로 만들기
- [ ] 측정 폼 검증, 약물/증상 컨테이너 동적 생성 코드 이동 (~600줄)

### 3-5. 차트 매니저 캡슐화 (`src/ui/charts/chart-manager.js`)
- [ ] Chart.js 인스턴스 생성/파기/줌 설정 통합
- [ ] 호르몬 차트, 비교 차트, 메인 차트 → 통합 클래스

### 3-6. script.js 다이어트 목표
- [ ] 분리 후 script.js → **3,000줄 이하** 목표 (초기화, 글로벌 이벤트, import 연결만)

### 3-7. 빌드 + 전체 탭 수동 테스트 + 커밋

---

## 🔵 Phase 4: 프리미엄 & 결제 시스템 (5~7일)
> **목표:** 수익화 기반 구축, 구독 관리, 기능 게이팅

### 4-1. Firebase Functions 백엔드 구축
- [ ] Firebase Functions 프로젝트 초기화
- [ ] Stripe/Paddle webhook 엔드포인트 구현
- [ ] `users/{uid}/subscription` Firestore 스키마 설계

### 4-2. PremiumManager 클라이언트 모듈
- [ ] `src/premium/premium-manager.js` 생성
  - 구독 상태 캐싱 (localStorage + Firestore)
  - `isPremium()`, `canUseFeature(featureName)` API
  - 구독 만료/갱신 자동 체크
- [ ] `src/premium/paywall-modal.js` — 프리미엄 기능 클릭 시 결제 유도 모달

### 4-3. 기능 게이팅 적용
- [ ] AI 분석 → 프리미엄 전용
- [ ] PDF 보고서 → 무료 월1회, 프리미엄 무제한
- [ ] 고급 건강 분석 (약물안전, 트렌드예측) → 프리미엄
- [ ] 데이터 내보내기 → 프리미엄
- [ ] 프리미엄 테마 컬러팩
- [ ] 목표 개수 제한 (무료 3개)

### 4-4. 구독 관리 UI
- [ ] Settings 탭에 "구독 관리" 섹션 추가
- [ ] 플랜 비교 화면
- [ ] 영수증/구독 이력 표시
- [ ] 구독 취소 플로우

### 4-5. 웹 결제 (Stripe/Paddle)
- [ ] 결제 페이지/모달 구현
- [ ] 성공/실패 핸들링
- [ ] 서버리스 구독 상태 동기화

### 4-6. 광고 시스템 (무료 사용자)
- [ ] 비침입 배너 위치 선정 (Settings 탭 하단, 로드맵 하단 등)
- [ ] 광고 SDK 연동 (AdMob 웹 or 대체)
- [ ] 프리미엄 사용자 광고 제거 로직

### 4-7. 테스트 + 커밋

---

## 🟣 Phase 5: 네이티브 앱 패키징 & 스토어 배포 (5~7일)
> **목표:** Capacitor로 네이티브 래핑, Android/iOS 스토어 출시

### 5-1. Capacitor 초기 설정
- [ ] `npm install @capacitor/core @capacitor/cli`
- [ ] `npx cap init ShiftV com.shiftv.app`
- [ ] `vite build` → `npx cap sync` 파이프라인 구축
- [ ] npm scripts에 `build:android`, `build:ios` 추가

### 5-2. Android 앱
- [ ] `npx cap add android`
- [ ] Android Studio에서 빌드 확인
- [ ] 앱 아이콘 설정 (기존 android/ 에셋 활용)
- [ ] 스플래시 스크린 설정
- [ ] APK/AAB 서명 설정

### 5-3. iOS 앱
- [ ] `npx cap add ios`
- [ ] Xcode에서 빌드 확인
- [ ] 앱 아이콘 + 런치 스크린 설정
- [ ] Provisioning Profile / Certificate 설정

### 5-4. 네이티브 기능 추가
- [ ] 푸시 알림 (`@capacitor/push-notifications`)
- [ ] 로컬 알림 (`@capacitor/local-notifications`) — 측정 리마인더
- [ ] 생체 인증 (`capacitor-native-biometric`) — 앱 잠금
- [ ] 상태바/내비게이션바 스타일링 (`@capacitor/status-bar`)

### 5-5. 앱 내 결제 (IAP)
- [ ] `capacitor-purchases` (RevenueCat) 또는 직접 IAP 플러그인
- [ ] PremiumManager와 연동 (웹 Stripe와 통합 구독 상태)

### 5-6. Google Play 스토어 출시
- [ ] Google Play Console 개발자 계정 ($25)
- [ ] 스토어 리스팅 (설명, 스크린샷, 분류)
- [ ] 개인정보정책 페이지 URL
- [ ] 건강 앱 면책조항
- [ ] IARC 연령등급 설문
- [ ] 내부 테스트 → 오픈 테스트 → 프로덕션 출시

### 5-7. Apple App Store 출시
- [ ] Apple Developer Program 등록 ($99/년)
- [ ] App Store Connect 앱 생성
- [ ] 스크린샷 (6.7", 6.5", 5.5")
- [ ] App Privacy Labels (건강 데이터 카테고리)
- [ ] 심사 제출 (Health 카테고리 주의)

### 5-8. 개인정보정책 & 이용약관
- [ ] 한국어/영어/일본어 개인정보정책 페이지 작성
- [ ] 이용약관 페이지 작성
- [ ] 건강 데이터 수집/처리 관련 동의 플로우 구현
- [ ] "의료 조언이 아닙니다" 면책조항 앱 내 표시

---

## ⚪ Phase 6: 최종 안정화 & 폴리시 (지속)
> **목표:** 프로덕션 품질 확보, 사용자 경험 극대화

### 6-1. 성능 최적화
- [ ] Chart.js CDN → 동적 import(`import()`)로 Lazy Loading 전환 → 초기 로딩 50%+ 개선
- [ ] service-worker.js 이중화 해소 (VitePWA만 사용하도록 정리)
- [ ] 이미지 lazy loading 전면 적용 (`loading="lazy"`)
- [ ] CSS 코드분할 검토 (컴포넌트별 CSS 분리)
- [ ] Lighthouse 성능 점수 90+ 목표

### 6-2. 접근성 (Accessibility)
- [ ] 전체 이미지 `alt` 속성 확인
- [ ] 폼 입력 → `<label>` 연결 확인
- [ ] ARIA 속성 점검 (모달, 탭, 알림)
- [ ] 키보드 네비게이션 지원 확인
- [ ] 색상 대비 비율 WCAG AA 확인

### 6-3. PWA 강화
- [ ] manifest.json에 `screenshots` 추가 → Chrome 리치 설치 UI
- [ ] 전용 maskable 아이콘 제작 (safe-zone 적용)
- [ ] `dir: "ltr"` 추가
- [ ] 오프라인 페이지 개선 (현재 캐시 미스 시 빈 화면)

### 6-4. 보안 강화
- [ ] CSP(Content Security Policy) 헤더 설정
- [ ] localStorage 데이터 무결성 검증 로직 추가
- [ ] Firebase Security Rules 강화 검토

### 6-5. 추가 언어 지원
- [ ] 중국어(간체/번체) 추가 검토
- [ ] 스페인어/포르투갈어 추가 검토
- [ ] i18n:translate 자동번역 파이프라인 활용

### 6-6. 사용자 피드백 시스템
- [ ] 앱 내 피드백/버그 리포트 기능
- [ ] 앱 평점 요청 (네이티브 앱용 in-app review)
- [ ] 변경 로그 (What's New) 표시

### 6-7. 모니터링 & 분석
- [ ] Firebase Analytics 연동 (사용 패턴 추적)
- [ ] Firebase Crashlytics 연동 (크래시 리포팅)
- [ ] 구독 전환율, DAU/MAU 대시보드

---

## 📅 타임라인 요약

```
2026년 3월
├── Week 1: Phase 1 (긴급 버그 수정) ← 최우선
├── Week 2: Phase 2 (코드 품질 정리)
└── Week 3-4: Phase 3 (script.js 분할)

2026년 4월
├── Week 1-2: Phase 4 (프리미엄 & 결제)
└── Week 3-4: Phase 5 (네이티브 앱 & 스토어 배포)

2026년 5월~
└── Phase 6 (지속적 안정화 & 폴리시)
```

---

## 🎯 우선순위 원칙

1. **안정성 > 기능** — 기존 버그를 먼저 잡고, 새 기능은 그 다음
2. **점진적 변경** — 한 번에 하나의 모듈. 매 Phase 끝에 빌드+테스트+커밋
3. **사용자 영향도** — 크래시/데이터 손실 > UI 깨짐 > 성능 > 코드 품질
4. **수익화 병행** — Phase 4(결제)는 Phase 3(분할)과 병행 가능
5. **테스트 필수** — 탭 전환, 뒤로가기, 모달, 데이터 저장/불러오기는 매번 확인
