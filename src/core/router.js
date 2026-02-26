/**
 * ShiftV Hash Router
 * 
 * 해시 기반 라우팅 시스템으로 탭 전환과 모바일 뒤로가기를 처리합니다.
 * 기존 activateTab() 함수를 콜백으로 받아 기존 동작을 완벽히 보존합니다.
 * 
 * @module router
 */

/** 해시 → 탭 ID 매핑 */
const ROUTE_MAP = {
    'sv': 'tab-sv',
    'record': 'tab-record',
    'my': 'tab-my',
    'diary': 'tab-diary',
    'settings': 'tab-settings',
};

/** 탭 ID → 해시 (역방향 매핑) */
const TAB_TO_HASH = {};
for (const [hash, tabId] of Object.entries(ROUTE_MAP)) {
    TAB_TO_HASH[tabId] = hash;
}

/** 기본 해시 (홈 탭) */
const DEFAULT_HASH = 'sv';

/** 내부 상태: 라우터 초기화 여부 */
let _initialized = false;

/** 콜백: 탭 활성화 함수 (script.js의 activateTab) */
let _activateTabFn = null;

/** 콜백: 모달 닫기 함수 */
let _closeAllModalsFn = null;

/** 프로그래밍적 해시 변경 시 중복 처리 방지 플래그 */
let _suppressHashChange = false;

/**
 * 라우터 초기화
 * @param {Object} options
 * @param {Function} options.activateTab - 기존 activateTab(tabId) 함수
 * @param {Function} [options.closeAllModals] - 열려있는 모달을 모두 닫는 함수 (있으면 사용)
 */
export function initRouter({ activateTab, closeAllModals } = {}) {
    if (_initialized) {
        console.warn('[Router] Already initialized');
        return;
    }
    if (typeof activateTab !== 'function') {
        console.error('[Router] activateTab callback is required');
        return;
    }

    _activateTabFn = activateTab;
    _closeAllModalsFn = closeAllModals || null;

    // hashchange 이벤트 리스너 등록
    window.addEventListener('hashchange', _handleHashChange);

    // 초기 해시 처리
    // ⚠️ 해시가 없을 때 URL을 바꾸지 않음 → PWA start_url(/ShiftV/) 일치 유지
    // 브라우저 PWA 설치 버튼은 현재 URL이 start_url과 일치해야 표시됨
    const currentHash = _getHash();
    if (!currentHash || !ROUTE_MAP[currentHash]) {
        // URL은 그대로 두고 기본 탭(sv)만 활성화
        _activateTabFn(ROUTE_MAP[DEFAULT_HASH]);
    } else {
        // 이미 유효한 해시가 있으면 해당 탭 활성화
        _activateTabFn(ROUTE_MAP[currentHash]);
    }

    _initialized = true;
    console.log('[Router] Initialized with hash:', window.location.hash);
}

/**
 * 해시 네비게이션 (탭 전환 시 사용)
 * @param {string} hash - 해시 값 (예: 'sv', 'record', '#record' 모두 허용)
 */
export function navigateTo(hash) {
    // '#' 접두사 제거
    const cleanHash = hash.replace(/^#/, '');

    // 유효하지 않은 해시는 무시
    if (!ROUTE_MAP[cleanHash]) {
        console.warn('[Router] Unknown route:', hash);
        return;
    }

    // 현재 해시와 같으면 무시 (불필요한 이벤트 방지)
    if (_getHash() === cleanHash) {
        return;
    }

    window.location.hash = '#' + cleanHash;
}

/**
 * 탭 ID를 해시로 변환하여 네비게이션
 * activateTab('tab-record') 대신 사용
 * @param {string} tabId - 탭 ID (예: 'tab-record')
 */
export function navigateToTab(tabId) {
    const hash = TAB_TO_HASH[tabId];
    if (hash) {
        navigateTo(hash);
    } else {
        // 매핑에 없는 탭은 직접 activateTab 호출 (안전장치)
        console.warn('[Router] No route mapping for tab:', tabId, '- calling activateTab directly');
        if (_activateTabFn) _activateTabFn(tabId);
    }
}

/**
 * 현재 해시의 탭 ID 반환
 * @returns {string|null} 현재 탭 ID 또는 null
 */
export function getCurrentTabId() {
    const hash = _getHash();
    return ROUTE_MAP[hash] || null;
}

/**
 * 라우터가 초기화되었는지 확인
 * @returns {boolean}
 */
export function isRouterInitialized() {
    return _initialized;
}

// ─── Internal ──────────────────────────────────────

/**
 * 현재 URL 해시 추출 (# 제거, 파라미터 분리)
 * @returns {string} 해시 값
 */
function _getHash() {
    return window.location.hash.replace(/^#/, '').split('/')[0] || '';
}

/**
 * hashchange 이벤트 핸들러
 */
function _handleHashChange() {
    if (_suppressHashChange) return;

    const hash = _getHash();
    console.log('[Router] Hash changed to:', hash);

    // 모달이 열려 있으면 먼저 닫기
    if (_closeAllModalsFn) {
        _closeAllModalsFn();
    }

    const tabId = ROUTE_MAP[hash];
    if (tabId && _activateTabFn) {
        _activateTabFn(tabId);
    } else if (!tabId) {
        // 알 수 없는 해시 → 기본 탭으로
        console.warn('[Router] Unknown hash, navigating to default:', hash);
        _suppressHashChange = true;
        window.location.hash = '#' + DEFAULT_HASH;
        _suppressHashChange = false;
        if (_activateTabFn) _activateTabFn(ROUTE_MAP[DEFAULT_HASH]);
    }
}
