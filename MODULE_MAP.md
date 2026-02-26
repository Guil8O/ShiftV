# ShiftV v2.0 — MODULE MAP

> **코딩 전 반드시 참고.** 새 기능 추가/수정 시 아래 위치를 먼저 확인하고 기존 함수를 재활용할 것.  
> 마지막 업데이트: 2026-02-25

> **2026-02-25 최적화 변경 이력**
> - `utils.js`: `today()`, `dateToString()` 추가. `deepClone`, `deepMerge`, `throttle`, `generateUUID`, `slugify`, `truncate`, `chunkArray`, `isValidEmail`, `validateMeasurement`, `log`, `logWarn` 12개 제거 (미사용)
> - `data-manager.js`: `deepClone` → 네이티브 `structuredClone` 3곳 교체
> - `quest-modal.js` / `data-schema.js` / `diary-tab.js` / `streak-strip.js`: 인라인 날짜 패턴 → `today()` / `dateToString()` 교체, utils.js import 추가
> - `change-roadmap-modal.js`: 7줄짜리 `dateKeyFromTimestamp` 로컬 함수 → `timestampToDateString()` import 교체
> - `ai-advisor-modal.js`: `_deleteCachedResponse(hash)` 메서드 추출 (인라인 중복 블록 제거)
> - `base-modal.js` **신규 생성**: `QuestModal`, `AIAdvisorModal` extends BaseModal — overlay 생성/마운트/이벤트/close 10줄 보일러플레이트 2곳 제거> - `utils/carousel-frame.js` **신규 생성**: sv-cards.js private `_addCarouselArrows` / `_addDots` → 공유 모듈로 이관. `createCarousel()` 팩토리 추가
> - `utils/card-frame.js` **신규 생성**: MD3 카드 DOM 팩토리 `createCard()` / `renderCardList()`
> - **19-11 적응형 디자인**: `variables.css`에 `--bp-medium/expanded/large` 브레이크포인트 토큰 추가. `min-width: 1200px` Extended Rail (200px, 라벨 가로) + 4열 sv-grid 신규. `min-width: 600px`에 quest-modal 반응형 다이얼로그(≥600px 센터, Compact bottom-sheet 유지) 추가. `.chart-wrapper canvas` → `clamp(180px, 35vw, 360px)` 반응형 높이. **타이포그래피**: `md3-tokens.css` display/headline/title-large 토큰을 `clamp(min@320px, calc(intercept + slope·vw), max@1200px)` 유체 보간으로 교체 (320→1200px 범위, body/label 고정 유지)
---

## 📁 루트 파일

| 파일 | 역할 |
|---|---|
| `index.html` | 단일 SPA 진입점. 탭 5개(`#tab-sv`, `#tab-record`, `#tab-diary`, `#tab-my`, `#tab-settings`), 모달 마운트 대상 |
| `style.css` | 전역 스타일 (~5900줄). MD3 컴포넌트 CSS 전부 포함. 섹션별 주석으로 구분 |
| `script.js` | 앱 메인 진입점 (ESM). 모든 모달/매니저 인스턴스 생성, 탭 전환, 차트 초기화 |
| `vite.config.js` | Vite 빌드 설정 (rollup 청크 분리 등) |
| `manifest.json` | PWA 매니페스트 |
| `service-worker.js` | 오프라인 캐시 전략 |

---

## 📁 src/

### `src/constants.js` — 앱 전역 상수 (361줄)
| 상수 | 설명 |
|---|---|
| `APP_VERSION` | 현재 버전 문자열 |
| `PRIMARY_DATA_KEY` | 측정 데이터 localStorage 키 |
| `SETTINGS_KEY` | 설정 localStorage 키 |
| `BODY_SIZE_KEYS` | 신체 사이즈 필드명 배열 (height, weight, shoulder...) |
| `HEALTH_KEYS` | 건강 지표 필드명 배열 (muscleMass, bodyFatPercentage...) |
| `DATE_FORMAT_OPTIONS` | `formatDate()` 포맷 preset 객체 |

> ⚠️ 새 데이터 필드 추가 시 여기에도 선언할 것

---

### `src/data-manager.js` — LocalStorage CRUD 추상화 (518줄)
| 클래스/내보내기 | 설명 |
|---|---|
| `DataManager` (abstract) | localStorage read/write 베이스 클래스 |
| `MeasurementDataManager extends DataManager` | 측정 데이터 CRUD. `add()`, `getAll()`, `getLatest()`, `update()`, `delete()` |
| `SettingsDataManager extends DataManager` | 앱 설정 CRUD |
| `DataBackup` | JSON export/import 유틸 |
| `measurementManager` *(export)* | `MeasurementDataManager` 싱글턴 인스턴스 |
| `settingsManager` *(export)* | `SettingsDataManager` 싱글턴 인스턴스 |

> ✅ 측정 데이터 읽기/쓰기는 무조건 `measurementManager` 사용

---

### `src/translations.js` — 다국어 i18n (2140줄+)
| 내보내기 | 설명 |
|---|---|
| `languages` | `{ ko, en, ja }` 번역 객체 |
| `translate(key, lang?)` | 키→현재 언어 문자열 번역 |
| `setCurrentLanguage(lang)` | 언어 전환 (`'ko'` / `'en'` / `'ja'`) |
| `getCurrentLanguage()` | 현재 언어 반환 |
| `parseIconPatterns(str)` | 번역 문자열 내 아이콘 패턴 `{icon:xxx}` 파싱 |

> ⚠️ 새 번역 키는 **ko → en → ja 순서로 모두** 추가. 누락 시 키 이름 그대로 노출됨

---

### `src/utils.js` — 공통 유틸리티
| 함수 | 설명 |
|---|---|
| `formatDate(date, format)` | 날짜 → `'ko-KR'` 포맷 문자열 (`'short'`/`'long'`/`'time'`) |
| `timestampToDateString(ts)` | 타임스탬프(number) → `YYYY-MM-DD` |
| `today()` | 오늘 날짜 → `YYYY-MM-DD` 문자열. 반복 인라인 대체용 |
| `dateToString(date)` | `Date` 객체 → `YYYY-MM-DD` 문자열 |
| `getWeekNumber(date)` | 날짜 → ISO 주차 번호 |
| `daysBetween(d1, d2)` | 두 날짜 사이 일수 (절댓값) |
| `addDays(date, n)` | 날짜에 n일 추가 |
| `debounce(fn, delay)` | 디바운스 래퍼 |
| `roundTo(num, decimals)` | 소수점 반올림 |
| `formatNumberWithCommas(num)` | 숫자 → 천단위 쉼표 문자열 |
| `calculatePercentage(val, total)` | 퍼센트 계산 |
| `clamp(val, min, max)` | 범위 제한 |
| `uniqueArray(arr)` | 배열 중복 제거 |
| `generateId(length?)` | 랜덤 ID 생성 (기본 8자) |
| `isLocalStorageAvailable()` | localStorage 사용 가능 여부 |
| `isIOS()` / `isMobile()` | 기기 감지 |
| `getCSSVar(name)` / `setCSSVar(name, val)` | CSS 변수 읽기/쓰기 |
| `isValidNumber(val, min?, max?)` | 숫자 유효성 검사 |
| `logError(...args)` | 에러 콘솔 출력 |

> ⚠️ `deepClone` 제거됨 → 네이티브 `structuredClone()` 사용  
> ⚠️ `throttle` / `generateUUID` / `slugify` 등 12개 함수 제거됨 (미사용)

---

### `src/bridge.js` — 네이티브 브릿지
Capacitor/Cordova 플러그인 호출 래퍼. PWA 환경에서는 no-op 폴백 처리.

---

## 📁 src/firebase/

| 파일 | 내보내기 / 역할 |
|---|---|
| `firebase-config.js` | Firebase 앱 초기화, `app`, `db`, `auth`, `storage` 인스턴스 export |
| `auth.js` | Google/이메일 로그인, 회원가입, 로그아웃, `onAuthStateChanged` 래퍼 |
| `firestore.js` | Firestore CRUD 추상화 (`saveData`, `loadData`, `deleteData`) |
| `storage.js` | 프로필 이미지 업로드/다운로드 (`uploadImage`, `getImageURL`) |
| `sync.js` | localStorage ↔ Firestore 동기화 (`syncToCloud`, `syncFromCloud`) |

---

## 📁 src/data/

| 파일 | 역할 |
|---|---|
| `data-schema.js` | 측정 레코드 스키마 정의 및 유효성 검사 |
| `image-compress.js` | `browser-image-compression` 래퍼 (업로드 전 리사이즈/압축) |
| `pdf-report.js` | 측정 데이터 PDF 내보내기 생성 |

---

## 📁 src/ui/

### 컴포넌트

| 파일 | 내보내기 / 역할 |
|---|---|
| `components/sv-cards.js` | `renderPersonaCard(data)` — SV 탭 퍼소나 카드 렌더링 |
| `components/svg-illustration.js` | SVG 에셋 래퍼 컴포넌트 (애니메이션 SVG 삽입) |
| `components/streak-strip.js` | 연속 기록 스트릭 UI 스트립 렌더링 |
| `ripple.js` | MD3 Ripple 효과 (`attachRipple(element)`) |
| `chart-zoom.js` | `chartZoomState`, `applyChartZoom()`, `ensureChartZoomControls()` — 차트 줌/팬 |
| `medication-selector.js` | 약물 선택 UI 컴포넌트 |
| `symptom-selector.js` | 증상 선택 멀티셀렉트 UI |
| `utils/color-generator.js` | 카테고리/태그 색상 자동 생성 |
| `utils/unit-conversion.js` | `UNIT_CONVERSIONS`, `convertToStandard(val, unit)`, `convertFromStandard(val, unit)` — 단위 변환 (kg↔lb, cm↔in 등) |
| `utils/carousel-frame.js` ⭐ | `addCarouselArrows(wrapEl, trackSelector)`, `addCarouselDots(wrapEl, trackSelector, count)`, `createCarousel({ slides, showArrows, showDots, className, slideClass })` — 재사용 캐러셀 유틸 (sv-cards.js private → 이관) |
| `utils/card-frame.js` ⭐ | `createCard({ type, icon, title, desc, clickable, onClick, className, body })`, `renderCardList(container, opts[])` — MD3 카드 DOM 팩토리 |

---

### 모달 (src/ui/modals/)

| 파일 | 클래스 | 핵심 메서드 |
|---|---|---|
| `base-modal.js` | `BaseModal` ⭐ | `_mount(cls, html, closeSelector?)`, `close()`, `_onBeforeClose()` 훅, `$(selector)`. **새 모달은 이 클래스 extends** |
| `quest-modal.js` | `QuestModal extends BaseModal` | `open()`, `close()`, `openCreateDialog()`, `_renderCard()`, `_recordValue()`, `_historyListHtml()` |
| `body-briefing-modal.js` | `BodyBriefingModal` | `open()`, 건강 요약 + 측정 입력 UI |
| `health-modal.js` | `HealthModal` | `open()`, 건강 지표 상세 뷰 |
| `action-guide-modal.js` | `ActionGuideModal` | `open()`, 닥터 모듈 권고사항 표시 |
| `ai-advisor-modal.js` | `AIAdvisorModal extends BaseModal` | `open()`, AI 조언 채팅 인터페이스. `_getCachedResponse()`, `_setCachedResponse()`, `_deleteCachedResponse()` |
| `change-roadmap-modal.js` | `ChangeRoadmapModal` | `open()`, 변화 로드맵 타임라인 뷰 |
| `onboarding-flow.js` | `OnboardingFlow` | `start()`, 신규 사용자 온보딩 스텝 |

> ⚠️ `body-briefing`, `action-guide`, `change-roadmap`, `onboarding`은 공유 bottom-sheet DOM 또는 fade transition 등 다른 패턴 사용 → BaseModal 미적용

---

### 탭 (src/ui/tabs/)

| 파일 | 역할 |
|---|---|
| `diary-tab.js` | 다이어리 탭 렌더링, 캘린더/목록 뷰 |

---

## 📁 src/doctor-module/

> **직접 수정 금지.** ActionGuide와 AI Advisor 모달이 호출하는 분석 엔진.

### core/
| 파일 | 역할 |
|---|---|
| `doctor-engine.js` | 분석 오케스트레이터. 다른 분석기 결과 종합 |
| `symptom-analyzer.js` | 증상 데이터 분석 → 가능한 원인 도출 |
| `health-evaluator.js` | 건강 지표 수준 평가 (정상/경계/위험) |
| `ftm-analyzer.js` | FTM 특화 분석 |
| `mtf-analyzer.js` | MTF 특화 분석 |
| `recommendation-engine.js` | 분석 결과 → 행동 권고사항 생성 |
| `trend-predictor.js` | 히스토리 기반 추세 예측 |

### data/
| 파일 | 역할 |
|---|---|
| `medication-database.js` | 호르몬 약물 데이터베이스 |
| `symptom-cause-map.js` | 증상-원인 매핑 테이블 |
| `symptom-database.js` | 증상 분류 및 설명 데이터 |

---

## 🗝️ 주요 데이터 스토리지 키 (localStorage)

| 키 | 내용 |
|---|---|
| `shiftV_Data_v1_1` | 측정 데이터 배열 (PRIMARY_DATA_KEY) |
| `shiftV_Settings_v1_0` | 앱 설정 (SETTINGS_KEY) |
| `shiftv_quests` | 퀘스트 데이터 배열 (quest-modal.js 내 STORAGE_KEY) |

---

## 🔄 데이터 흐름 요약

```
사용자 입력
    ↓
script.js (이벤트 처리)
    ↓
measurementManager / settingsManager (data-manager.js)
    → localStorage 저장
    → sync.js → Firestore (로그인 시)
    ↓
UI 모달 / 탭 (src/ui/)
    → doctor-module/ (분석 필요 시)
    → translations.js (다국어)
```

---

## ⚠️ 작업 규칙 (이 파일과 함께 준수)

1. **새 함수 작성 전** → 이 맵에서 동일/유사 기능 함수 먼저 검색
2. **날짜 계산** → `utils.js`의 `today()`, `dateToString()`, `daysBetween()` 활용  
3. **단위 변환** → `src/utils/unit-conversion.js`의 `convertToStandard()` / `convertFromStandard()` 사용
4. **번역 키 추가** → ko → en → ja 순서 3곳 동시에 추가
5. **측정 데이터 접근** → 반드시 `measurementManager` 싱글턴 사용 (직접 localStorage 접근 금지)
6. **새 모달 생성** → `BaseModal` extends 필수. `_mount()` + `_onBeforeClose()` 패턴 사용
7. **반응형 미디어 쿼리** → `variables.css`의 `--bp-medium(600)`, `--bp-expanded(840)`, `--bp-large(1200)` 값 사용. JS: `parseInt(getComputedStyle(root).getPropertyValue('--bp-expanded'))`
8. **doctor-module** → 직접 수정 금지, 인터페이스(`doctor-engine.js`)통해서만 호출
9. **스타일 추가** → `style.css`에 섹션 주석(`/* ── 컴포넌트명 ── */`) 포함하여 추가
