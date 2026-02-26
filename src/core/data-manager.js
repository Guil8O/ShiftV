/**
 * ShiftV Data Manager (localStorage)
 * 
 * 앱 설정 및 측정 데이터의 localStorage 저장/로드를 담당합니다.
 * 
 * @module data-manager
 */

const PRIMARY_DATA_KEY = 'shiftV_Data_v1_1';
const SETTINGS_KEY = 'shiftV_Settings_v1_0';

/**
 * 설정 기본값
 */
const DEFAULT_SETTINGS = {
    language: 'ko',
    mode: 'mtf',
    theme: 'system',
    initialSetupDone: false,
    selectedMetrics: ['weight'],
    notificationEnabled: false,
    biologicalSex: 'male'
};

// ─── Settings ──────────────────────────────────────

/**
 * 설정을 localStorage에 저장합니다.
 * @param {Object} settings - 저장할 설정 객체
 * @returns {boolean} 성공 여부
 */
export function saveSettings(settings) {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        console.log("DEBUG: Settings saved", settings);
        return true;
    } catch (e) {
        console.error("Error saving settings:", e);
        return false;
    }
}

/**
 * localStorage에서 설정을 불러옵니다.
 * @returns {{ settings: Object, isDefault: boolean }} 설정 객체와 기본값 여부
 */
export function loadSettings() {
    try {
        const storedSettings = localStorage.getItem(SETTINGS_KEY);
        if (storedSettings) {
            const settings = JSON.parse(storedSettings);
            return {
                settings: { ...DEFAULT_SETTINGS, ...settings },
                isDefault: false
            };
        }
    } catch (e) {
        console.error("Error loading settings:", e);
    }

    // 기본값 반환 (브라우저 언어에 따라 기본 언어 결정)
    const defaultLang = navigator.language.startsWith('ko') ? 'ko'
        : navigator.language.startsWith('ja') ? 'ja' : 'en';

    return {
        settings: { ...DEFAULT_SETTINGS, language: defaultLang },
        isDefault: true
    };
}

// ─── Primary Data ──────────────────────────────────

/**
 * 측정 데이터, 목표, 노트를 localStorage에 저장합니다.
 * @param {Object} data - 저장할 데이터
 * @param {Array} data.measurements - 측정 데이터 배열
 * @param {Object} data.targets - 목표 설정 객체
 * @param {Array} data.notes - 노트 배열 (레거시)
 * @returns {boolean} 성공 여부
 */
export function savePrimaryData({ measurements, targets, notes }) {
    try {
        const dataToSave = { measurements, targets, notes };
        localStorage.setItem(PRIMARY_DATA_KEY, JSON.stringify(dataToSave));
        console.log("DEBUG: Primary data saved.");
        return true;
    } catch (e) {
        console.error("Error saving primary data:", e);
        return false;
    }
}

/**
 * localStorage에서 측정 데이터를 불러옵니다.
 * @returns {{ measurements: Array, targets: Object, notes: Array }}
 */
export function loadPrimaryData() {
    try {
        const storedData = localStorage.getItem(PRIMARY_DATA_KEY);
        if (storedData) {
            const data = JSON.parse(storedData);
            const measurements = Array.isArray(data.measurements) ? data.measurements : [];
            const targets = (typeof data.targets === 'object' && data.targets !== null) ? data.targets : {};
            const notes = Array.isArray(data.notes) ? data.notes : [];

            // 타임스탬프 기준 정렬
            measurements.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

            return { measurements, targets, notes };
        }
    } catch (e) {
        console.error("Error loading primary data:", e);
    }

    return { measurements: [], targets: {}, notes: [] };
}

/**
 * 데이터 키 상수 내보내기 (외부 모듈에서 참조 시)
 */
export { PRIMARY_DATA_KEY, SETTINGS_KEY };
