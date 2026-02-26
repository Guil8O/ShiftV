/**
 * Unit Conversion Utilities
 * 
 * 호르몬 수치, 체중 등의 단위 변환을 제공합니다.
 * @module unit-conversion
 */

/**
 * 단위 변환 상수 테이블
 */
export const UNIT_CONVERSIONS = {
    estrogenLevel: {
        'pg/ml': 1,
        'pmol/L': 0.2724 // 1 pmol/L = 0.2724 pg/mL
    },
    testosteroneLevel: {
        'ng/dl': 1,
        'nmol/L': 28.85, // 1 nmol/L = 28.85 ng/dL
        'ng/ml': 100     // 1 ng/mL = 100 ng/dL
    },
    weight: {
        'kg': 1,
        'lbs': 0.45359237
    }
};

/**
 * 값을 표준 단위로 변환
 * @param {string} key - 측정 항목 키
 * @param {number|string} value - 변환할 값
 * @param {string} unit - 현재 단위
 * @returns {number|null} 표준 단위로 변환된 값
 */
export function convertToStandard(key, value, unit) {
    if (value === null || value === undefined || value === '') return null;
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (Number.isNaN(num)) return null;
    if (!UNIT_CONVERSIONS[key] || !UNIT_CONVERSIONS[key][unit]) return num;
    return num * UNIT_CONVERSIONS[key][unit];
}

/**
 * 값을 표준 단위에서 특정 단위로 변환
 * @param {string} key - 측정 항목 키
 * @param {number|string} value - 변환할 값 (표준 단위)
 * @param {string} unit - 대상 단위
 * @returns {string|number} 변환된 값
 */
export function convertFromStandard(key, value, unit) {
    if (value === null || value === undefined || value === '') return '';
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (Number.isNaN(num)) return '';
    if (!UNIT_CONVERSIONS[key] || !UNIT_CONVERSIONS[key][unit]) return num.toFixed(2);
    return (num / UNIT_CONVERSIONS[key][unit]).toFixed(2);
}
