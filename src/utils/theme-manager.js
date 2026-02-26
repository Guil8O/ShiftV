/**
 * theme-manager.js
 * 테마(다크/라이트/시스템) 및 accent 색상 관련 유틸리티 모음
 *
 * Exports:
 *   PRESET_HEX         — accent preset 이름 → seed hex 매핑
 *   getAccentHex       — accent 이름 또는 커스텀 hex → hex 반환
 *   resolveTheme       — 'system' 포함 테마 값 → 실제 'dark'|'light' 반환
 *   applyDocumentTheme — data-theme / data-accent / theme-color meta 적용 (DOM 순수 조작)
 */

/** accent preset 이름 → Material Color Utilities seed hex */
export const PRESET_HEX = {
    'rose':   '#B02F5B',
    'coral':  '#9B406B',
    'violet': '#7A4A9E',
    'indigo': '#4355B9',
    'sky':    '#006493',
    'cyan':   '#006874',
    'teal':   '#006A60',
    'lime':   '#1A6C30',
    'amber':  '#855400',
    'gold':   '#8E4E00',
};

/**
 * accent 이름 또는 커스텀 hex → seed hex 반환
 * @param {string} savedAccent  localStorage에 저장된 값 (preset 이름 or '#rrggbb')
 * @returns {string} hex color
 */
export function getAccentHex(savedAccent) {
    if (!savedAccent) return PRESET_HEX['violet'];
    return savedAccent.startsWith('#')
        ? savedAccent
        : (PRESET_HEX[savedAccent] || PRESET_HEX['violet']);
}

/**
 * 저장된 테마 설정 → 실제 적용할 테마 값 반환
 * 'system'이면 미디어 쿼리로 감지
 * @param {string} storedTheme  'dark' | 'light' | 'system'
 * @returns {'dark'|'light'}
 */
export function resolveTheme(storedTheme) {
    if (storedTheme === 'system') {
        return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
            ? 'dark'
            : 'light';
    }
    return storedTheme === 'dark' ? 'dark' : 'light';
}

/**
 * data-theme / data-accent / theme-color meta 태그 등 DOM 속성을 반영한다.
 * 실제 Material Dynamic Color 적용 (window.applyDynamicTheme) 은 script.js 에서 처리.
 *
 * @param {object} params
 * @param {string} params.theme        'dark' | 'light'
 * @param {string} params.accentHex    seed hex (e.g. '#7A4A9E')
 * @param {string} params.accentKey    preset 이름 또는 hex (data-accent 에 그대로 세팅)
 */
export function applyDocumentTheme({ theme, accentHex, accentKey }) {
    const root = document.documentElement;
    const body = document.body;

    // 1. theme 클래스
    body.classList.remove('light-mode', 'dark-mode');
    body.classList.add(theme === 'light' ? 'light-mode' : 'dark-mode');

    // 2. data-theme on :root (MD3 토큰 선택자용)
    root.setAttribute('data-theme', theme);

    // 3. data-accent (CSS 선택자용, 프리셋 이름 or hex 그대로)
    root.setAttribute('data-accent', accentKey);

    // 4. theme-color meta
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'light' ? '#FBF8FD' : '#131316');
    }
}
