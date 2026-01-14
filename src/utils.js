/**
 * ShiftV Utility Functions
 * 
 * 앱 전체에서 사용되는 유틸리티 함수들
 * @module utils
 */

import { DATE_FORMAT_OPTIONS } from './constants.js';

/**
 * 날짜를 포맷된 문자열로 변환
 * @param {Date|number|string} date - 날짜 객체, 타임스탬프, 또는 날짜 문자열
 * @param {string} format - 포맷 타입 ('short', 'long', 'time')
 * @returns {string} 포맷된 날짜 문자열
 */
export function formatDate(date, format = 'short') {
    const dateObj = date instanceof Date ? date : new Date(date);
    const options = DATE_FORMAT_OPTIONS[format] || DATE_FORMAT_OPTIONS.short;
    return dateObj.toLocaleDateString('ko-KR', options);
}

/**
 * 현재 날짜 가져오기
 * @returns {Date} 현재 날짜
 */
export function getCurrentDate() {
    return new Date();
}

/**
 * 타임스탬프를 날짜 문자열로 변환
 * @param {number} timestamp - 타임스탬프
 * @returns {string} YYYY-MM-DD 형식
 */
export function timestampToDateString(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 날짜로부터 주차 번호 계산
 * @param {Date} date - 날짜
 * @returns {number} 주차 번호
 */
export function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * 두 날짜 사이의 일수 계산
 * @param {Date} date1 - 첫 번째 날짜
 * @param {Date} date2 - 두 번째 날짜
 * @returns {number} 일수 차이
 */
export function daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1 - date2) / oneDay));
}

/**
 * 날짜에 일수 추가
 * @param {Date} date - 기준 날짜
 * @param {number} days - 추가할 일수
 * @returns {Date} 새로운 날짜
 */
export function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * 디바운스 함수
 * @param {Function} func - 실행할 함수
 * @param {number} wait - 대기 시간 (ms)
 * @returns {Function} 디바운스된 함수
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 쓰로틀 함수
 * @param {Function} func - 실행할 함수
 * @param {number} limit - 제한 시간 (ms)
 * @returns {Function} 쓰로틀된 함수
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 깊은 복사 (Deep Clone)
 * @param {*} obj - 복사할 객체
 * @returns {*} 복사된 객체
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * 객체 병합 (Deep Merge)
 * @param {Object} target - 대상 객체
 * @param {Object} source - 소스 객체
 * @returns {Object} 병합된 객체
 */
export function deepMerge(target, source) {
    const output = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}

/**
 * 객체인지 확인
 * @param {*} item - 확인할 항목
 * @returns {boolean} 객체 여부
 */
function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * 숫자를 소수점 자리수로 반올림
 * @param {number} num - 숫자
 * @param {number} decimals - 소수점 자리수
 * @returns {number} 반올림된 숫자
 */
export function roundTo(num, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
}

/**
 * 숫자에 쉼표 추가
 * @param {number} num - 숫자
 * @returns {string} 포맷된 문자열
 */
export function formatNumberWithCommas(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * 퍼센트 계산
 * @param {number} value - 현재 값
 * @param {number} total - 전체 값
 * @param {number} decimals - 소수점 자리수
 * @returns {number} 퍼센트 값
 */
export function calculatePercentage(value, total, decimals = 1) {
    if (total === 0) return 0;
    return roundTo((value / total) * 100, decimals);
}

/**
 * 범위 내 값으로 제한
 * @param {number} value - 값
 * @param {number} min - 최소값
 * @param {number} max - 최대값
 * @returns {number} 제한된 값
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * 배열에서 중복 제거
 * @param {Array} arr - 배열
 * @returns {Array} 중복이 제거된 배열
 */
export function uniqueArray(arr) {
    return [...new Set(arr)];
}

/**
 * 배열을 청크로 분할
 * @param {Array} arr - 배열
 * @param {number} size - 청크 크기
 * @returns {Array} 분할된 배열
 */
export function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

/**
 * 랜덤 ID 생성
 * @param {number} length - ID 길이
 * @returns {string} 랜덤 ID
 */
export function generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * UUID v4 생성
 * @returns {string} UUID
 */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * 문자열을 slug로 변환
 * @param {string} str - 문자열
 * @returns {string} slug
 */
export function slugify(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * 문자열 자르기 (말줄임표 추가)
 * @param {string} str - 문자열
 * @param {number} maxLength - 최대 길이
 * @returns {string} 잘린 문자열
 */
export function truncate(str, maxLength = 50) {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}

/**
 * 로컬 스토리지 체크
 * @returns {boolean} 사용 가능 여부
 */
export function isLocalStorageAvailable() {
    try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * iOS 기기 체크
 * @returns {boolean} iOS 여부
 */
export function isIOS() {
    return [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
        || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
}

/**
 * 모바일 기기 체크
 * @returns {boolean} 모바일 여부
 */
export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * CSS 변수 값 가져오기
 * @param {string} varName - CSS 변수명 (예: '--primary-color')
 * @returns {string} 변수 값
 */
export function getCSSVar(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

/**
 * CSS 변수 값 설정
 * @param {string} varName - CSS 변수명
 * @param {string} value - 값
 */
export function setCSSVar(varName, value) {
    document.documentElement.style.setProperty(varName, value);
}

/**
 * 숫자 검증
 * @param {*} value - 검증할 값
 * @param {number} min - 최소값 (옵션)
 * @param {number} max - 최대값 (옵션)
 * @returns {boolean} 유효 여부
 */
export function isValidNumber(value, min = null, max = null) {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    if (min !== null && num < min) return false;
    if (max !== null && num > max) return false;
    return true;
}

/**
 * 이메일 검증
 * @param {string} email - 이메일 주소
 * @returns {boolean} 유효 여부
 */
export function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * 측정 데이터 검증
 * @param {Object} data - 측정 데이터
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateMeasurement(data) {
    const errors = [];
    
    // 숫자 필드 검증
    const numericFields = ['height', 'weight', 'shoulder', 'neck', 'chest', 'cupSize', 
                          'waist', 'hips', 'thigh', 'calf', 'arm', 'muscleMass', 
                          'bodyFatPercentage', 'estrogenLevel', 'testosteroneLevel'];
    
    for (const field of numericFields) {
        if (data[field] !== undefined && data[field] !== '' && data[field] !== null) {
            if (!isValidNumber(data[field], 0)) {
                errors.push(`${field} must be a positive number`);
            }
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * 로그 출력 (디버그 모드일 때만)
 * @param {...any} args - 로그 인자
 */
export function log(...args) {
    if (process.env.NODE_ENV === 'development') {
        console.log('[ShiftV]', ...args);
    }
}

/**
 * 에러 로그 출력
 * @param {...any} args - 에러 인자
 */
export function logError(...args) {
    console.error('[ShiftV Error]', ...args);
}

/**
 * 경고 로그 출력
 * @param {...any} args - 경고 인자
 */
export function logWarn(...args) {
    console.warn('[ShiftV Warning]', ...args);
}

// Default export
export default {
    formatDate,
    getCurrentDate,
    timestampToDateString,
    getWeekNumber,
    daysBetween,
    addDays,
    debounce,
    throttle,
    deepClone,
    deepMerge,
    roundTo,
    formatNumberWithCommas,
    calculatePercentage,
    clamp,
    uniqueArray,
    chunkArray,
    generateId,
    generateUUID,
    slugify,
    truncate,
    isLocalStorageAvailable,
    isIOS,
    isMobile,
    getCSSVar,
    setCSSVar,
    isValidNumber,
    isValidEmail,
    validateMeasurement,
    log,
    logError,
    logWarn
};
