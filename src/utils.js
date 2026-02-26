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
 * 오늘 날짜를 YYYY-MM-DD 문자열로 반환
 * @returns {string} 오늘 날짜 문자열 (YYYY-MM-DD)
 */
export function today() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Date 객체를 YYYY-MM-DD 문자열로 변환
 * @param {Date} date - Date 객체
 * @returns {string} YYYY-MM-DD 형식 날짜 문자열
 */
export function dateToString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
 * 에러 로그 출력
 * @param {...any} args - 에러 인자
 */
export function logError(...args) {
    console.error('[ShiftV Error]', ...args);
}

// Default export
export default {
    formatDate,
    getCurrentDate,
    timestampToDateString,
    today,
    dateToString,
    getWeekNumber,
    daysBetween,
    addDays,
    debounce,
    roundTo,
    formatNumberWithCommas,
    calculatePercentage,
    clamp,
    uniqueArray,
    generateId,
    isLocalStorageAvailable,
    isIOS,
    isMobile,
    getCSSVar,
    setCSSVar,
    isValidNumber,
    logError
};
