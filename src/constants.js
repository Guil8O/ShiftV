/**
 * ShiftV Constants
 * 
 * 앱 전체에서 사용되는 상수들을 정의합니다.
 * @module constants
 */

// ====================
// 앱 정보
// ====================

/** 앱 버전 */
export const APP_VERSION = "1.5.1";

// ====================
// 로컬 스토리지 키
// ====================

/** 측정 데이터 저장 키 */
export const PRIMARY_DATA_KEY = 'shiftV_Data_v1_1';

/** 설정 데이터 저장 키 */
export const SETTINGS_KEY = 'shiftV_Settings_v1_0';

// ====================
// 측정 필드 정의
// ====================

/** 신체 사이즈 측정 필드 */
export const BODY_SIZE_KEYS = [
    'height',     // 신장
    'weight',     // 체중
    'shoulder',   // 어깨너비
    'neck',       // 목둘레
    'chest',      // 윗 가슴 둘레
    'underBustCircumference',    // 아랫 가슴 둘레
    'waist',      // 허리둘레
    'hips',       // 엉덩이둘레
    'thigh',      // 허벅지둘레
    'calf',       // 종아리둘레
    'arm'         // 팔뚝둘레
];

/** 건강 지표 필드 */
export const HEALTH_KEYS = [
    'muscleMass',          // 근육량
    'bodyFatPercentage',   // 체지방률
    'estrogenLevel',       // 에스트로겐 수치
    'testosteroneLevel',   // 테스토스테론 수치
    'libido',              // 성욕
    'healthNotes',         // 건강 상태 (텍스트)
    'skinCondition'        // 피부 상태 (텍스트)
];

/** MtF(여성화) 약물 필드 */
export const MTF_MEDICATION_KEYS = [
    'estradiol',      // 에스트라디올
    'progesterone',   // 프로게스테론
    'antiAndrogen'    // 항안드로겐
];

/** FtM(남성화) 약물 필드 */
export const FTM_MEDICATION_KEYS = [
    'testosterone',   // 테스토스테론
    'antiEstrogen'    // 항에스트로겐
];

/** 기타 약물 필드 */
export const OTHER_MEDICATION_KEYS = [
    'medicationOtherName',  // 기타 약물 이름
    'medicationOtherDose'   // 기타 약물 용량
];

/** 모든 약물 필드 */
export const ALL_MEDICATION_KEYS = [
    ...MTF_MEDICATION_KEYS,
    ...FTM_MEDICATION_KEYS,
    ...OTHER_MEDICATION_KEYS
];

/** 텍스트 입력 필드 (숫자가 아닌 필드) */
export const TEXT_KEYS = [
    'healthNotes',
    'skinCondition',
    'medicationOtherName'
];

/** 숫자 입력 필드 (모든 숫자 필드) */
export const NUMERIC_KEYS = [
    ...BODY_SIZE_KEYS,
    ...HEALTH_KEYS.filter(k => !TEXT_KEYS.includes(k)),
    ...ALL_MEDICATION_KEYS.filter(k => !TEXT_KEYS.includes(k))
];

/** 기본 숫자 필드 (body + health + medication) */
export const BASE_NUMERIC_KEYS = [
    'height', 'weight', 'shoulder', 'neck', 
    'chest', 'underBustCircumference', 'waist', 'hips', 
    'thigh', 'calf', 'arm',
    'muscleMass', 'bodyFatPercentage',
    'estrogenLevel', 'testosteroneLevel', 'libido',
    'estradiol', 'progesterone', 'antiAndrogen',
    'testosterone', 'antiEstrogen',
    'medicationOtherDose'
];

/** 목표 설정 가능 필드 */
export const TARGET_SETTING_KEYS = [
    ...BODY_SIZE_KEYS,
    'muscleMass',
    'bodyFatPercentage',
    'estrogenLevel',
    'testosteroneLevel'
];

/** 비교 리포트에 표시할 필드 */
export const COMPARISON_KEYS = [
    'weight',
    'muscleMass',
    'bodyFatPercentage',
    'shoulder',
    'neck',
    'chest',
    'underBustCircumference',
    'waist',
    'hips',
    'thigh',
    'calf',
    'arm'
];

// ====================
// 차트 설정
// ====================

/** 차트 기본 색상 */
export const CHART_COLORS = {
    primary: 'rgba(139, 92, 246, 1)',      // Primary color
    primaryLight: 'rgba(139, 92, 246, 0.2)', // Primary with alpha
    secondary: 'rgba(236, 72, 153, 1)',    // Secondary color
    secondaryLight: 'rgba(236, 72, 153, 0.2)',
    success: 'rgba(16, 185, 129, 1)',      // Success color
    warning: 'rgba(245, 158, 11, 1)',      // Warning color
    error: 'rgba(239, 68, 68, 1)',         // Error color
    info: 'rgba(59, 130, 246, 1)'          // Info color
};

/** 차트 라인 색상 팔레트 */
export const CHART_LINE_COLORS = [
    'rgba(139, 92, 246, 1)',    // Purple
    'rgba(236, 72, 153, 1)',    // Pink
    'rgba(59, 130, 246, 1)',    // Blue
    'rgba(16, 185, 129, 1)',    // Green
    'rgba(245, 158, 11, 1)',    // Orange
    'rgba(239, 68, 68, 1)',     // Red
    'rgba(99, 102, 241, 1)',    // Indigo
    'rgba(168, 85, 247, 1)',    // Purple Light
    'rgba(236, 252, 203, 1)',   // Lime
    'rgba(147, 197, 253, 1)'    // Sky
];

// ====================
// 기본값 및 임계값
// ====================

/** 측정 주기 (일) */
export const DEFAULT_MEASUREMENT_INTERVAL = 7; // 7일(1주)

/** 알림 임계값 (마지막 측정 후 며칠) */
export const NOTIFICATION_THRESHOLD_DAYS = 7;

/** 호르몬 수치 기준값 */
export const HORMONE_THRESHOLDS = {
    estrogen: {
        low: 50,        // pg/mL
        optimal: 100,   // pg/mL
        high: 200,      // pg/mL
        critical: 300   // pg/mL (위험 수준)
    },
    testosterone: {
        low: 0.05,      // ng/mL
        optimal: 0.5,   // ng/mL
        high: 1.0,      // ng/mL
        critical: 10.0  // ng/mL (생물학적 남성 기준)
    }
};

/** BMI 분류 기준 */
export const BMI_CATEGORIES = {
    underweight: 18.5,
    normal: 23,
    overweight: 25,
    obese: 30
};

/** 신체 비율 기준 */
export const BODY_RATIO_STANDARDS = {
    whr: {
        male: 0.90,    // 허리-엉덩이 비율 (남성)
        female: 0.80   // 허리-엉덩이 비율 (여성)
    },
    shr: {
        male: 1.30,    // 어깨-엉덩이 비율 (남성)
        female: 1.00   // 어깨-엉덩이 비율 (여성)
    }
};

// ====================
// UI 설정
// ====================

/** 지원 언어 */
export const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja'];

/** 지원 테마 */
export const SUPPORTED_THEMES = ['system', 'light', 'dark'];

/** 지원 모드 */
export const SUPPORTED_MODES = ['mtf', 'ftm'];

/** 생물학적 성별 */
export const BIOLOGICAL_SEXES = ['male', 'female', 'other'];

/** 디바운스 딜레이 (ms) */
export const DEBOUNCE_DELAY = 300;

/** 팝업 표시 시간 (ms) */
export const POPUP_DURATION = 3000;

// ====================
// 에러 메시지
// ====================

/** 에러 타입 */
export const ERROR_TYPES = {
    VALIDATION: 'validation',
    STORAGE: 'storage',
    NETWORK: 'network',
    PARSING: 'parsing',
    UNKNOWN: 'unknown'
};

// ====================
// 날짜 포맷
// ====================

/** 날짜 포맷 옵션 */
export const DATE_FORMAT_OPTIONS = {
    short: { year: 'numeric', month: '2-digit', day: '2-digit' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' }
};

// ====================
// 파일 관련
// ====================

/** 백업 파일 접두사 */
export const BACKUP_FILE_PREFIX = 'shiftv_backup';

/** 허용 파일 타입 */
export const ALLOWED_FILE_TYPES = ['.json'];

/** 최대 파일 크기 (bytes) */
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ====================
// 개발/디버그
// ====================

/** 디버그 모드 */
export const DEBUG_MODE = false;

/** 콘솔 로그 접두사 */
export const LOG_PREFIX = 'DEBUG:';

// ====================
// 유틸리티 함수
// ====================

/**
 * 현재 모드에 따라 약물 필드를 반환
 * @param {string} mode - 'mtf' 또는 'ftm'
 * @returns {string[]} 약물 필드 배열
 */
export function getMedicationKeysByMode(mode) {
    return mode === 'mtf' ? MTF_MEDICATION_KEYS : FTM_MEDICATION_KEYS;
}

/**
 * 필드가 숫자 필드인지 확인
 * @param {string} key - 필드명
 * @returns {boolean}
 */
export function isNumericField(key) {
    return NUMERIC_KEYS.includes(key);
}

/**
 * 필드가 텍스트 필드인지 확인
 * @param {string} key - 필드명
 * @returns {boolean}
 */
export function isTextField(key) {
    return TEXT_KEYS.includes(key);
}

/**
 * 필드가 목표 설정 가능한지 확인
 * @param {string} key - 필드명
 * @returns {boolean}
 */
export function isTargetable(key) {
    return TARGET_SETTING_KEYS.includes(key);
}

// ====================
// Export all for convenience
// ====================

export default {
    APP_VERSION,
    PRIMARY_DATA_KEY,
    SETTINGS_KEY,
    BODY_SIZE_KEYS,
    HEALTH_KEYS,
    MTF_MEDICATION_KEYS,
    FTM_MEDICATION_KEYS,
    OTHER_MEDICATION_KEYS,
    ALL_MEDICATION_KEYS,
    TEXT_KEYS,
    NUMERIC_KEYS,
    BASE_NUMERIC_KEYS,
    TARGET_SETTING_KEYS,
    COMPARISON_KEYS,
    CHART_COLORS,
    CHART_LINE_COLORS,
    DEFAULT_MEASUREMENT_INTERVAL,
    NOTIFICATION_THRESHOLD_DAYS,
    HORMONE_THRESHOLDS,
    BMI_CATEGORIES,
    BODY_RATIO_STANDARDS,
    SUPPORTED_LANGUAGES,
    SUPPORTED_THEMES,
    SUPPORTED_MODES,
    BIOLOGICAL_SEXES,
    DEBOUNCE_DELAY,
    POPUP_DURATION,
    ERROR_TYPES,
    DATE_FORMAT_OPTIONS,
    BACKUP_FILE_PREFIX,
    ALLOWED_FILE_TYPES,
    MAX_FILE_SIZE,
    DEBUG_MODE,
    LOG_PREFIX,
    getMedicationKeysByMode,
    isNumericField,
    isTextField,
    isTargetable
};
