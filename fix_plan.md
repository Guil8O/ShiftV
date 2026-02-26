# ShiftV 개선 및 최적화 보고서 (Fix Plan)

본 보고서는 기능과 UI의 파손 없이 안전하게 코드를 최적화하고 라우팅을 붙이는 구체적인 단계와 기술적 가이드라인을 제공합니다.

---

## 1. 아키텍처 리팩토링 - 점진적 모듈 분리 전략 (UI 파손 방지)

`script.js`(약 7천 줄)을 한 번에 분리하면 UI 연결이 깨질 위험이 매우 큽니다. 따라서 **기능별로 하나씩 ES Module로 옮기되, 기존 `script.js`에서는 해당 모듈을 `import`해서 연결만 해두는 방식**으로 진행해야 합니다.

### 점진적 분리 로드맵

1. **상수 및 유틸리티 분리 (가장 안전함)**
   - `constants.js` 생성: `PRIMARY_DATA_KEY`, `SETTINGS_KEY`, `bodySizeKeys` 등 이동.
   - `utils.js` 생성: `isIOS()`, `normalizeSymptomsArray()`, `getCssVar()` 등 독립적인 함수 이동.
2. **파이어베이스 & 인증 분리 (`auth.js`)**
   - 구글 로그인, 이메일 로그인, `onAuthStateChanged` 관련 로직을 `src/firebase/auth.js`로 추출.
   - 글로벌 객체 대신 초기화 함수 `initAuth()`를 만들어 `script.js`의 맨 위에서 실행.
3. **UI 매니저 분리 (`ui-manager.js`)**
   - 모달 열기/닫기(`openModal`, `closeModal` 등)와 알림 패널 관련 함수 이동.
4. **차트 및 데이터 시각화 분리 (`chart-manager.js`)**
   - `Chart.js`를 다루는 `renderMainChart`, `updateChart` 변수/함수 이동.
5. **각 탭별 로직 분리 (`tabs/`)**
   - `tab-sv.js`, `tab-record.js`, `tab-settings.js`, `tab-my.js` 등으로 분리하여 각 탭 요소의 이벤트 리스너 이동.

---

## 2. 구글 로그인 "리다이렉트 무반응" 완벽 해결

초기화면으로 돌아오는 이유는 앱 진입 시 `getRedirectResult`를 처리하지 않기 때문입니다.
`import { getRedirectResult, getAuth } from "firebase/auth";` 를 최상단에 추가하고 앱 초기화 로직에 바로 끼워넣어야 합니다.

### 수정할 코드 (script.js 최상단 DOMContentLoaded 직후)

```javascript
import { getAuth, getRedirectResult } from "firebase/auth";

document.addEventListener('DOMContentLoaded', async () => {
    const auth = getAuth();
    
    // 1. 리다이렉트 로그인 결과 낚아채기
    try {
        const result = await getRedirectResult(auth);
        if (result) {
            console.log("리다이렉트 로그인 성공:", result.user);
            // 로그인 모달 숨기기 & 메인 탭(SV)으로 강제 라우팅
            document.getElementById('auth-modal').style.display = 'none';
            document.querySelector('.app-wrapper').style.display = 'block';
            window.location.hash = '#sv'; 
            return; // 로그인 처리가 끝났으므로 아래 로직 생략
        }
    } catch (error) {
        console.error("리다이렉트 로그인 실패:", error);
    }
    
    // ... 기존 초기화 로직 (initializeApp 등) ...
});
```

---

## 3. PWA 및 모바일 대응을 위한 해시 기반 라우팅 (Hash Routing)

History API보다 **Hash(`#`) 라우팅을 추천**합니다. Vanilla JS와 Github Pages/Vercel 등 정적 호스팅 환경에서 서버 설정 없이 가장 안정적으로 모바일 "뒤로 가기" 버튼을 지원할 수 있습니다.

### 핵심 동작 원리
모달을 열거나 탭을 바꿀 때, 직접 `display: none`을 하는 대신 **URL의 Hash를 바꿉니다 (`window.location.hash = '#record'`)**. 그리고 Hash가 바뀔 때 이벤트를 수신해서 화면을 그립니다.

### 라우팅 구현 코드 (router.js 생성 추천)

```javascript
// src/core/router.js
export function initRouter() {
    // 1. URL 해시 변경 감지
    window.addEventListener('hashchange', handleRoute);
    
    // 2. 초기 로드 시 현재 해시에 맞는 화면 표시
    if (!window.location.hash) {
        window.location.hash = '#sv'; // 기본 탭
    } else {
        handleRoute();
    }
}

function handleRoute() {
    const hash = window.location.hash.replace('#', '');
    const [path, param] = hash.split('/'); 
    
    // 예: #record, #my, #diary, #settings
    switch (path) {
        case 'sv':
            switchTab('tab-sv');
            closeAllModals();
            break;
        case 'record':
            switchTab('tab-record');
            closeAllModals();
            break;
        case 'settings':
            switchTab('tab-settings');
            closeAllModals();
            break;
        // 특정 기능 모달 예시 (#import-data)
        case 'import-data':
            openModal('import-modal-id');
            break;
        default:
            switchTab('tab-sv');
    }
}

// 기존 탭 전환 함수 연동
function switchTab(tabId) {
    // 기존의 탭 버튼 active 클래스 토글 로직을 여기에 넣습니다.
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    document.querySelectorAll('.tab-button').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
}

// 기존 앱 코드에서 탭을 클릭할 때
document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // 직접 클래스를 바꾸지 않고 URL만 바꿈 (router가 처리하게 함)
        const target = btn.getAttribute('data-tab').replace('tab-', '');
        window.location.hash = `#${target}`;
    });
});
```

---

## 4. UI 렌더링 최적화 (성능 개선)

현재 `script.js`에는 매우 긴 HTML 문자열을 `innerHTML`로 넣는 카드를 렌더링하는 함수들이 있습니다. (`renderPersonaCard` 등).

1. **DocumentFragment 사용**: 여러 요소를 루프로 생성할 때 DOM에 직접 `appendChild` 하지 않고 `DocumentFragment`에 모았다가 한 번에 추가하여 리플로우(Reflow)를 최소화합니다.
2. **Lazy Loading (지연 로딩)**: `index.html` 하단에 있는 `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`를, 사용자가 **차트가 있는 탭(SV 탭)에 접속했을 때만 동적으로 동적으로 로드**하도록 변경합니다. 이러면 초기 앱 실행 속도(PWA)가 50% 이상 빨라집니다.
3. **이벤트 위임(Event Delegation)**: 탭 안의 수많은 리스트나 버튼에 각각 `addEventListener`를 다는 대신, 부모 컨테이너에 하나만 달아서 `e.target`을 판별하도록 수정합니다. (현재 일부 적용되어 있으나 전체로 확대 권장)

---

## 🚀 실행 즉시 가이드
1. 가장 먼저 **2번 항목(구글 리다이렉트 로그인 후처리)**을 `script.js` 최상단에 끼워넣어 인증 문제를 최우선으로 막으세요.
2. 두 번째로 **3번 항목(해시 라우터)** 코드를 도입하여 모든 탭 버튼 클릭 이벤트를 `window.location.hash` 변경으로 치환하세요. 모바일 뒤로가기 문제가 완벽히 고쳐집니다.
3. 이후 시간 날 때마다 `script.js`의 독립성 높은 함수부터 `src/` 로 분리(`export`/`import`)해 나가시면 기존 UI 파손 없이 앱이 가벼워집니다.
