/**
 * ShiftV Data Schema & Migration
 * 
 * @module data-schema
 */

import { today } from '../utils.js';

export const STORAGE_KEYS = {
    measurements: 'shiftV_Data_v1_1',
    diary: 'shiftv_diary',
    quests: 'shiftv_quests',
    profile: 'shiftv_profile',
    customActions: 'shiftv_custom_actions',
    settings: 'shiftV_Settings_v1_0',
    aiCache: 'shiftv_ai_cache'
};

/**
 * 측정 데이터 마이그레이션 (v1 -> v2)
 * cupSize 필드를 underBustCircumference로 변경
 * @param {Object} raw - 원본 측정 데이터
 * @returns {Object} 마이그레이션된 데이터
 */
export function migrateMeasurement(raw) {
    if (!raw) return raw;
    
    const migrated = { ...raw };
    
    if ('cupSize' in migrated && !('underBustCircumference' in migrated)) {
        migrated.underBustCircumference = migrated.cupSize;
        delete migrated.cupSize;
    }
    
    return migrated;
}

/**
 * 전체 측정 데이터 배열 마이그레이션
 * @param {Array} measurements - 원본 측정 데이터 배열
 * @returns {Array} 마이그레이션된 배열
 */
export function migrateMeasurementsList(measurements) {
    if (!Array.isArray(measurements)) return [];
    return measurements.map(migrateMeasurement);
}

// ============================================================
// DEFAULT OBJECTS
// ============================================================

export function createDefaultMeasurement(date) {
    return {
        date: date || today(),
        height: null, weight: null, shoulder: null, neck: null,
        chest: null, underBustCircumference: null, waist: null,
        hips: null, thigh: null, calf: null, arm: null,
        muscleMass: null, bodyFatPercentage: null, libido: null,
        estrogenLevel: null, testosteroneLevel: null,
        medications: [], symptoms: [], photos: {},
        menstruationActive: false, menstruationPain: null,
        memo: '', _createdAt: new Date().toISOString()
    };
}

export function createDefaultDiaryEntry(date) {
    return {
        date: date || today(),
        mood: null,
        text: '',
        questProgress: {},
        _createdAt: new Date().toISOString()
    };
}

export function createDefaultQuest() {
    return {
        title: '', description: '', category: 'custom',
        unit: '', initialValue: 0, currentValue: 0, targetValue: 0,
        targetDate: null, linkedMeasurementField: null,
        status: 'active', pinned: false, favorited: false,
        history: [], createdAt: new Date().toISOString()
    };
}

export function createDefaultProfile() {
    return {
        nickname: '', biologicalSex: 'male', mode: 'mtf',
        birthDate: null, language: 'ko', theme: 'system',
        accent: 'rose', onboardingCompleted: false,
        goals: { items: [], text: '' }
    };
}

// ============================================================
// SCHEMA VALIDATION
// ============================================================

export function validateMeasurement(data) {
    const errors = [];
    if (!data) { errors.push('Data is null'); return errors; }
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        errors.push('Invalid or missing date (expected YYYY-MM-DD)');
    }
    const numericFields = [
        'height', 'weight', 'shoulder', 'neck', 'chest', 'underBustCircumference',
        'waist', 'hips', 'thigh', 'calf', 'arm', 'muscleMass', 'bodyFatPercentage',
        'libido', 'estrogenLevel', 'testosteroneLevel'
    ];
    for (const field of numericFields) {
        if (data[field] != null && data[field] !== '') {
            const val = Number(data[field]);
            if (!Number.isFinite(val) || val < 0) {
                errors.push(`${field}: must be a non-negative number`);
            }
        }
    }
    return errors;
}

export function validateDiaryEntry(entry) {
    const errors = [];
    if (!entry) { errors.push('Entry is null'); return errors; }
    if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
        errors.push('Invalid or missing date');
    }
    if (entry.text && entry.text.length > 500) {
        errors.push('Text exceeds 500 character limit');
    }
    return errors;
}

export function validateQuest(quest) {
    const errors = [];
    if (!quest) { errors.push('Quest is null'); return errors; }
    if (!quest.title || quest.title.trim() === '') {
        errors.push('Title is required');
    }
    return errors;
}
