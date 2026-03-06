# ShiftV 마스터 To-Do — Phase별 실행 계획

**작성일:** 2026-03-06  
**기준 커밋:** `53b9785`  
**총 추정:** 6 Phase, 순차 진행  

---

## 🔴 Phase 1: 긴급 버그 수정 & 안정화 (1~2일)
> **목표:** 사용자가 바로 체감하는 크래시/이상동작 제거

### 1-1. 중복 이벤트 리스너 제거
- [x] `svCardTargets` — 빈 핸들러 삭제, 모달 핸들러로 교체 ✅ `e654823`
- [x] `svCardShortcut` — 중복 `activateTab` 핸들러 삭제 ✅ `e654823`

### 1-2. 라우터 완전 적용 (activateTab → navigateToTab)
- [x] 9개 activateTab() → navigateToTab() 전환 완료 ✅ `e654823`
- [x] 수정 버튼 클릭 시 SV탭 먼저 경유 후 Record 이동 ✅ `53b9785`

### 1-3. 무방어 JSON.parse 보호
- [x] saveThemeSetting/loadThemeSetting try-catch 래핑 ✅ `e654823`
- [x] PDF 보고서 내 diary/quests 파싱 보호 ✅ `e654823`
- [x] 알림 체크 내 PRIMARY_DATA_KEY 파싱 보호 ✅ `e654823`

### 1-4. 빈 catch 블록 → 최소 console.warn 추가
- [x] **High 우선순위** 5개 + **Medium** 2개 완료 ✅ `e654823`
  
### 1-5. 빌드 + 테스트 + 커밋
- [x] `npm run build` 확인 ✅
- [x] Git 커밋 + upstream push ✅ `e654823`

---

## 🟡 Phase 2: 코드 품질 & 기술 부채 정리 (2~3일)
> **목표:** 프로덕션 품질 확보, 데드코드 제거, 성능 개선 기반 마련

### 2-1. DEBUG 콘솔로그 제거
- [x] script.js 내 41개 `console.log("DEBUG: ...")` 전량 제거 ✅ `53b9785`

### 2-2. 데드코드 정리
- [x] `src/data-manager.js` (루트, 529줄) 삭제 ✅ `53b9785`
- [x] `service-worker.js` 캐시 목록에서 `src/data-manager.js` 제거 ✅ `53b9785`
- [ ] script.js 내 이미지 압축 인라인 코드(L27-63) — 용도 상이(localStorage용 vs Firestore용)하여 유지

### 2-3. z-index 체계 정리
- [x] `z-index: 9999` 2곳 → `--z-index-overlay-top(1090)` 토큰 적용 ✅ `53b9785`
- [x] `calc(var(--z-index-fixed) + 50)` → `--z-index-notif-panel(1080)` 신설 ✅ `53b9785`
- [x] `--z-index-modal-backdrop` → notif-backdrop에 적용 ✅ `53b9785`
- [x] `calc(var(--z-index-modal) + 10)` → `--z-index-popover` 사용 ✅ `53b9785`

### 2-4. 이벤트 리스너 정리
- [ ] 모달 콘텐츠에 붙는 리스너 → Phase 3에서 모듈 분리 시 cleanup 추가
- [ ] 차트 레전드 핸들러 중복 등록 방지 → Phase 3 차트 매니저 캡슐화 시 처리

### 2-5. i18n 하드코딩 정리 (1차)
- [ ] index.html의 주요 하드코딩 한국어 → `data-lang-key` 변환 (상위 50개)
- [ ] script.js의 UI 문자열 중 한국어 → translate() 호출로 변환

### 2-6. 빌드 + 테스트 + 커밋
- [x] 빌드 + 커밋 + upstream push ✅ `53b9785`

---

## 🟢 Phase 3: script.js 분할 & 아키텍처 개선 (3~5일)
> **목표:** 모놀리스를 관리 가능한 크기로 분할, 유지보수성 대폭 향상

### 3-1. SV 탭 분리 (`src/ui/tabs/sv-tab.js`)
- [x] `renderSvTab()` 및 관련 카드 렌더링/이벤트 로직 추출 (843줄 모듈, 776줄 제거)
- [x] 위젯 클릭 핸들러 전부 이동
- [x] script.js에서 import + 호출로 대체

### 3-2. My 탭 분리 (`src/ui/tabs/my-tab.js`)
- [x] `renderMyHistoryView()`, 히스토리 테이블, 비교 테이블 추출 (~540줄 모듈, 521줄 제거)
- [x] 호르몬 보고서 분리 → `src/ui/hormone-report.js` (1,267줄 모듈, 1,242줄 제거)

### 3-3. Settings 탭 분리 (`src/ui/tabs/settings-handlers.js`)
- [x] 목표 폼, 언어/모드 변경, 데이터 임포트/익스포트/리셋, 탭 활성화 추출 (~567줄 모듈)
- [x] 목표 입력 UI(setupTargetInputs), 업데이트 확인, 알림 토글 포함

### 3-4. Record 탭 폼 핸들러 분리 (`src/ui/tabs/record-form.js`)
- [x] 측정 폼 저장/수정/삭제, 중복 날짜 체크 추출 (~337줄 모듈, 339줄 제거)

### 3-5. 차트 렌더러 분리 (`src/ui/chart-renderer.js`)
- [x] 차트 셀렉터 UI + Chart.js 렌더링 추출 (~310줄 모듈, 309줄 제거)

### 3-6. 비교·분석 모달 분리 (`src/ui/modals/comparison-analysis.js`)
- [x] 비교 모달 + 상세/비교 분석 뷰 추출 (~645줄 모듈, 648줄 제거)

### 3-7. script.js 다이어트 결과
- [x] **7,228줄 → 3,029줄** (58% 감소) — 초기화, 글로벌 이벤트, import 연결만 유지

### 3-8. 빌드 + 커밋
- [x] `npx vite build` 성공 확인

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
