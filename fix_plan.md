# ShiftV 개선 및 최적화 보고서 (Fix Plan)

본 보고서는 ShiftV 프로젝트의 현재 상태를 분석하고, 코드 구조, 성능, UI/UX 측면에서의 개선 방안을 구체적으로 제시합니다.

## 1. 현재 상태 분석 (Current Status)

### 1.1 구조적 문제 (Structural Issues)
*   **Monolithic `script.js`**:
    *   **위치**: `root/script.js`
    *   **상태**: 약 7,300줄에 달하는 거대한 파일로, 앱의 모든 로직(라우팅, UI 조작, 데이터 처리, 이벤트 핸들링)이 뒤섞여 있습니다.
    *   **문제**: 유지보수가 매우 어렵고, 가독성이 떨어지며, 전역 스코프 오염 위험이 높습니다.
*   **Monolithic `index.html`**:
    *   **위치**: `root/index.html`
    *   **상태**: 약 1,400줄. 모든 모달(Modal)과 탭(Tab) 컨텐츠가 초기에 HTML로 작성되어 있습니다.
    *   **문제**: 초기 로딩 시 불필요한 DOM 요소가 많아 메모리를 낭비하며, 파일이 길어 수정이 번거롭습니다.
*   **Doctor Module의 UI 의존성**:
    *   **위치**: `src/doctor-module/core/doctor-engine.js`
    *   **상태**: 핵심 로직 엔진이 HTML 문자열(`<span>...</span>`)을 직접 생성하여 반환합니다.
    *   **문제**: 비즈니스 로직과 뷰(View)가 강하게 결합되어 있어, 디자인 변경 시 로직 코드를 수정해야 합니다.

### 1.2 코드 품질 및 최적화 (Code Quality & Optimization)
*   **하드코딩된 문자열**: 다국어 지원(`translations.js`)이 있음에도 불구하고, `DoctorEngine` 및 HTML 곳곳에 한국어 문자열이 하드코딩되어 있습니다.
*   **PWA 라우팅의 취약성**: `script.js` 하단의 `history.pushState` 및 `popstate` 처리가 함수 몽키패칭(Monkey Patching)으로 구현되어 있어 사이드 이펙트 발생 가능성이 높습니다.
*   **인라인 SVG**: `index.html` 내부에 긴 SVG 코드가 반복적으로 포함되어 가독성을 해칩니다.

### 1.3 UI/UX
*   **장점**: `variables.css`를 통한 체계적인 MD3 토큰 및 다크모드/접근성(고대비, 동작 줄이기) 지원은 매우 우수합니다.
*   **개선점**: 모달이 단순히 `display: none`으로 숨겨져 있어, 스크린 리더 등의 보조 기술에서 불필요하게 탐색될 수 있습니다.

---

## 2. 개선 제안 (Improvement Plan)

### 2.1 아키텍처 리팩토링 (Refactoring Architecture)

**목표**: 모듈화 및 관심사 분리 (Separation of Concerns)

| 구분 | 현재 위치 | 변경 계획 | 상세 내용 |
| :--- | :--- | :--- | :--- |
| **진입점** | `script.js` | `src/main.js` | 앱 초기화, 전역 에러 핸들링, 서비스 워커 등록만 담당 |
| **라우팅** | `script.js` (혼재) | `src/core/router.js` | History API 관리, 탭/모달 URL 동기화 로직 분리 |
| **UI 관리** | `script.js` (혼재) | `src/ui/ui-manager.js` | DOM 조작, 모달 열기/닫기, 탭 전환 로직 중앙화 |
| **이벤트** | `script.js` (혼재) | `src/core/event-bus.js` | 컴포넌트 간 통신을 위한 경량 이벤트 버스 도입 |
| **닥터** | `DoctorEngine` | `DoctorEngine` + UI | `DoctorEngine`은 순수 데이터(JSON)만 반환, UI 렌더링은 별도 함수로 분리 |

### 2.2 기술적 구현 상세 (Technical Implementation)

#### A. 모듈 시스템 도입 (ES Modules)
`script.js`를 기능별로 쪼개어 `src/` 하위로 이동시킵니다.

```javascript
// src/main.js 예시
import { Router } from './core/router.js';
import { UIManager } from './ui/ui-manager.js';
import { DoctorEngine } from './doctor-module/core/doctor-engine.js';

const app = {
    init() {
        this.router = new Router();
        this.ui = new UIManager();
        this.doctor = new DoctorEngine();
        
        this.router.on('routeChange', (route) => this.ui.render(route));
        this.bindEvents();
    },
    // ...
};

document.addEventListener('DOMContentLoaded', () => app.init());
```

#### B. Doctor Engine 뷰 분리
`DoctorEngine`의 `_generateSummaryMessage` 등이 HTML 태그를 반환하지 않고, 상태 코드나 객체를 반환하도록 수정합니다.

**AS-IS (현재):**
```javascript
// doctor-engine.js
if (status === 'optimal') {
    return '<span class="mi-success">check_circle</span> 호르몬 수치가 이상적입니다.';
}
```

**TO-BE (변경):**
```javascript
// doctor-engine.js
return {
    status: 'optimal',
    messageKey: 'hormoneOptimal', // 번역 키 사용
    type: 'success'
};

// src/ui/renderers/summary-renderer.js (새로 생성)
function renderSummary(data) {
    const icon = data.type === 'success' ? 'check_circle' : 'warning';
    return `<span class="material-symbols-outlined mi-${data.type}">${icon}</span> ${translate(data.messageKey)}`;
}
```

### 2.3 UI 시각화 구현 (UI Visualization)

#### A. 동적 모달 시스템 (Dynamic Modal System)
HTML에 모든 모달을 미리 적어두는 대신, `template` 태그나 JS 템플릿 리터럴을 사용하여 필요할 때 DOM에 렌더링합니다.

```html
<!-- index.html -->
<template id="modal-template">
    <div class="modal-overlay">
        <div class="modal-content glass-card">
            <div class="modal-header">
                <h3 class="modal-title"></h3>
                <button class="modal-close">×</button>
            </div>
            <div class="modal-body"></div>
        </div>
    </div>
</template>
```

```javascript
// src/ui/modal-system.js
export class ModalSystem {
    open(title, contentRenderFunction) {
        const template = document.getElementById('modal-template');
        const clone = template.content.cloneNode(true);
        // ... 타이틀 설정 및 컨텐츠 삽입 ...
        document.body.appendChild(clone);
        // ... 애니메이션 및 이벤트 바인딩 ...
    }
}
```

#### B. 차트/그래프 컴포넌트화
현재 `Chart.js` 설정이 산재되어 있습니다. 이를 `ChartComponent` 클래스로 캡슐화하여 재사용성을 높입니다.

```javascript
// src/ui/components/chart-component.js
export class BaseChart {
    constructor(canvasId, config) {
        this.ctx = document.getElementById(canvasId).getContext('2d');
        this.chart = new Chart(this.ctx, this.defaultConfig(config));
    }
    
    update(newData) {
        this.chart.data = newData;
        this.chart.update();
    }
    // ...
}
```

### 2.4 최적화 및 정리 (Optimization & Cleanup)

1.  **Dead Code 제거**:
    *   `script.js` 내 사용되지 않는 레거시 함수(이전 버전의 데이터 마이그레이션 로직 등) 식별 및 제거.
    *   `scripts/` 폴더 내 사용하지 않는 Python/Node 스크립트 정리.
2.  **중복 제거**:
    *   `openModal`, `openHormoneModal`, `openBriefingModal` 등을 하나의 `ModalSystem.open(type, data)`으로 통합.
    *   HTML 내 반복되는 SVG 아이콘을 `<svg><use href="#icon-id"></use></svg>` 형태로 변경하여 파일 크기 축소.

## 3. 실행 로드맵 (Execution Roadmap)

1.  **1단계 (구조 분리)**: `script.js`를 여러 모듈 파일로 단순 분리 (기능 변경 없이 파일만 쪼개기).
2.  **2단계 (Doctor 분리)**: `DoctorEngine`에서 UI 코드 제거 및 순수 로직화.
3.  **3단계 (UI 시스템)**: `ModalSystem` 및 `Router` 클래스 구현 및 적용.
4.  **4단계 (HTML 다이어트)**: `index.html`의 인라인 모달/SVG 제거 및 동적 로딩 적용.
5.  **5단계 (테스트)**: 주요 시나리오(기록 저장, 분석 보기, 설정 변경) 테스트.

이 보고서를 바탕으로 점진적인 리팩토링을 수행하면, 앱의 안정성과 유지보수성이 획기적으로 향상될 것입니다.
