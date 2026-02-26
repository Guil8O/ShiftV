/**
 * ShiftV Data Manager
 * 
 * 로컬 스토리지 데이터 관리 (CRUD, 백업, 복원)
 * @module data-manager
 */

import { PRIMARY_DATA_KEY, SETTINGS_KEY, BACKUP_FILE_PREFIX } from './constants.js';
import { isLocalStorageAvailable, logError } from './utils.js';
import { migrateMeasurementsList } from './data/data-schema.js';

/**
 * 데이터 관리 클래스
 */
export class DataManager {
    /**
     * @param {string} storageKey - 로컬 스토리지 키
     */
    constructor(storageKey) {
        this.storageKey = storageKey;
        this.cache = null;
    }

    /**
     * 데이터 로드
     * @returns {Object|null} 로드된 데이터
     */
    load() {
        try {
            if (!isLocalStorageAvailable()) {
                throw new Error('LocalStorage is not available');
            }

            const data = localStorage.getItem(this.storageKey);
            if (!data) {
                console.log(`No data found for key: ${this.storageKey}`);
                return null;
            }

            this.cache = JSON.parse(data);
            console.log(`Data loaded from ${this.storageKey}:`, this.cache);
            return structuredClone(this.cache);
        } catch (error) {
            logError('Error loading data:', error);
            return null;
        }
    }

    /**
     * 데이터 저장
     * @param {Object} data - 저장할 데이터
     * @returns {boolean} 성공 여부
     */
    save(data) {
        try {
            if (!isLocalStorageAvailable()) {
                throw new Error('LocalStorage is not available');
            }

            const jsonData = JSON.stringify(data);
            localStorage.setItem(this.storageKey, jsonData);
            this.cache = structuredClone(data);
            console.log(`Data saved to ${this.storageKey}`);
            return true;
        } catch (error) {
            logError('Error saving data:', error);
            return false;
        }
    }

    /**
     * 데이터 삭제
     * @returns {boolean} 성공 여부
     */
    remove() {
        try {
            if (!isLocalStorageAvailable()) {
                throw new Error('LocalStorage is not available');
            }

            localStorage.removeItem(this.storageKey);
            this.cache = null;
            console.log(`Data removed from ${this.storageKey}`);
            return true;
        } catch (error) {
            logError('Error removing data:', error);
            return false;
        }
    }

    /**
     * 데이터 존재 여부 확인
     * @returns {boolean}
     */
    exists() {
        return localStorage.getItem(this.storageKey) !== null;
    }

    /**
     * 캐시된 데이터 가져오기
     * @returns {Object|null}
     */
    getCache() {
        return this.cache ? structuredClone(this.cache) : null;
    }

    /**
     * 캐시 초기화
     */
    clearCache() {
        this.cache = null;
    }
}

/**
 * 측정 데이터 관리 클래스
 */
export class MeasurementDataManager extends DataManager {
    constructor() {
        super(PRIMARY_DATA_KEY);
    }

    /**
     * 모든 측정 데이터 로드
     * @returns {Object} { measurements: [], targets: {}, notes: [] }
     */
    load() {
        const data = super.load();
        const result = data || { measurements: [], targets: {}, notes: [] };
        
        // Apply migration
        if (result.measurements && Array.isArray(result.measurements)) {
            result.measurements = migrateMeasurementsList(result.measurements);
        }
        
        return result;
    }

    /**
     * 측정 데이터 추가
     * @param {Object} measurement - 측정 데이터
     * @returns {boolean} 성공 여부
     */
    addMeasurement(measurement) {
        try {
            const data = this.load();
            data.measurements.push(measurement);
            return this.save(data);
        } catch (error) {
            logError('Error adding measurement:', error);
            return false;
        }
    }

    /**
     * 측정 데이터 수정
     * @param {number} index - 인덱스
     * @param {Object} measurement - 수정할 측정 데이터
     * @returns {boolean} 성공 여부
     */
    updateMeasurement(index, measurement) {
        try {
            const data = this.load();
            if (index < 0 || index >= data.measurements.length) {
                throw new Error('Invalid index');
            }
            data.measurements[index] = measurement;
            return this.save(data);
        } catch (error) {
            logError('Error updating measurement:', error);
            return false;
        }
    }

    /**
     * 측정 데이터 삭제
     * @param {number} index - 인덱스
     * @returns {boolean} 성공 여부
     */
    deleteMeasurement(index) {
        try {
            const data = this.load();
            if (index < 0 || index >= data.measurements.length) {
                throw new Error('Invalid index');
            }
            data.measurements.splice(index, 1);
            return this.save(data);
        } catch (error) {
            logError('Error deleting measurement:', error);
            return false;
        }
    }

    /**
     * 모든 측정 데이터 가져오기
     * @returns {Array} 측정 데이터 배열
     */
    getMeasurements() {
        const data = this.load();
        return data.measurements || [];
    }

    /**
     * 특정 측정 데이터 가져오기
     * @param {number} index - 인덱스
     * @returns {Object|null} 측정 데이터
     */
    getMeasurement(index) {
        const measurements = this.getMeasurements();
        return measurements[index] || null;
    }

    /**
     * 목표 데이터 저장
     * @param {Object} targets - 목표 데이터
     * @returns {boolean} 성공 여부
     */
    saveTargets(targets) {
        try {
            const data = this.load();
            data.targets = targets;
            return this.save(data);
        } catch (error) {
            logError('Error saving targets:', error);
            return false;
        }
    }

    /**
     * 목표 데이터 가져오기
     * @returns {Object} 목표 데이터
     */
    getTargets() {
        const data = this.load();
        return data.targets || {};
    }

    /**
     * 노트 추가
     * @param {Object} note - 노트 데이터
     * @returns {boolean} 성공 여부
     */
    addNote(note) {
        try {
            const data = this.load();
            data.notes = data.notes || [];
            data.notes.push(note);
            return this.save(data);
        } catch (error) {
            logError('Error adding note:', error);
            return false;
        }
    }

    /**
     * 노트 수정
     * @param {number} index - 인덱스
     * @param {Object} note - 수정할 노트 데이터
     * @returns {boolean} 성공 여부
     */
    updateNote(index, note) {
        try {
            const data = this.load();
            if (!data.notes || index < 0 || index >= data.notes.length) {
                throw new Error('Invalid index');
            }
            data.notes[index] = note;
            return this.save(data);
        } catch (error) {
            logError('Error updating note:', error);
            return false;
        }
    }

    /**
     * 노트 삭제
     * @param {number} index - 인덱스
     * @returns {boolean} 성공 여부
     */
    deleteNote(index) {
        try {
            const data = this.load();
            if (!data.notes || index < 0 || index >= data.notes.length) {
                throw new Error('Invalid index');
            }
            data.notes.splice(index, 1);
            return this.save(data);
        } catch (error) {
            logError('Error deleting note:', error);
            return false;
        }
    }

    /**
     * 모든 노트 가져오기
     * @returns {Array} 노트 배열
     */
    getNotes() {
        const data = this.load();
        return data.notes || [];
    }
}

/**
 * 설정 데이터 관리 클래스
 */
export class SettingsDataManager extends DataManager {
    constructor() {
        super(SETTINGS_KEY);
    }

    /**
     * 설정 데이터 로드
     * @returns {Object} 설정 데이터
     */
    load() {
        const data = super.load();
        return data || {
            language: 'ko',
            mode: 'mtf',
            theme: 'system',
            biologicalSex: 'male',
            notificationEnabled: false
        };
    }

    /**
     * 특정 설정 값 가져오기
     * @param {string} key - 설정 키
     * @param {*} defaultValue - 기본값
     * @returns {*} 설정 값
     */
    get(key, defaultValue = null) {
        const settings = this.load();
        return settings[key] !== undefined ? settings[key] : defaultValue;
    }

    /**
     * 특정 설정 값 저장
     * @param {string} key - 설정 키
     * @param {*} value - 설정 값
     * @returns {boolean} 성공 여부
     */
    set(key, value) {
        try {
            const settings = this.load();
            settings[key] = value;
            return this.save(settings);
        } catch (error) {
            logError('Error setting value:', error);
            return false;
        }
    }

    /**
     * 여러 설정 값 저장
     * @param {Object} updates - 업데이트할 설정 객체
     * @returns {boolean} 성공 여부
     */
    update(updates) {
        try {
            const settings = this.load();
            Object.assign(settings, updates);
            return this.save(settings);
        } catch (error) {
            logError('Error updating settings:', error);
            return false;
        }
    }
}

/**
 * 데이터 백업 및 복원
 */
export class DataBackup {
    /**
     * 모든 데이터 내보내기
     * @returns {Object} 전체 데이터
     */
    static exportAll() {
        try {
            const measurementManager = new MeasurementDataManager();
            const settingsManager = new SettingsDataManager();

            return {
                version: '1.5',
                exportDate: new Date().toISOString(),
                measurements: measurementManager.getMeasurements(),
                targets: measurementManager.getTargets(),
                notes: measurementManager.getNotes(),
                settings: settingsManager.load()
            };
        } catch (error) {
            logError('Error exporting data:', error);
            return null;
        }
    }

    /**
     * JSON 파일로 다운로드
     * @param {Object} data - 내보낼 데이터
     * @param {string} filename - 파일명 (옵션)
     */
    static downloadAsJSON(data, filename = null) {
        try {
            if (!filename) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                filename = `${BACKUP_FILE_PREFIX}_${timestamp}.json`;
            }

            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
            return true;
        } catch (error) {
            logError('Error downloading JSON:', error);
            return false;
        }
    }

    /**
     * 파일에서 데이터 가져오기
     * @param {File} file - 가져올 파일
     * @returns {Promise<Object>} 가져온 데이터
     */
    static async importFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!file || file.type !== 'application/json') {
                reject(new Error('Invalid file type'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    resolve(data);
                } catch (error) {
                    reject(new Error('Invalid JSON format'));
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    /**
     * 데이터 복원
     * @param {Object} data - 복원할 데이터
     * @returns {boolean} 성공 여부
     */
    static restore(data) {
        try {
            if (!data || !data.measurements) {
                throw new Error('Invalid data format');
            }

            const measurementManager = new MeasurementDataManager();
            const settingsManager = new SettingsDataManager();

            // 측정 데이터 복원
            measurementManager.save({
                measurements: data.measurements || [],
                targets: data.targets || {},
                notes: data.notes || []
            });

            // 설정 복원
            if (data.settings) {
                settingsManager.save(data.settings);
            }

            console.log('Data restored successfully');
            return true;
        } catch (error) {
            logError('Error restoring data:', error);
            return false;
        }
    }

    /**
     * 모든 데이터 초기화
     * @returns {boolean} 성공 여부
     */
    static resetAll() {
        try {
            const measurementManager = new MeasurementDataManager();
            const settingsManager = new SettingsDataManager();

            measurementManager.remove();
            settingsManager.remove();

            console.log('All data reset');
            return true;
        } catch (error) {
            logError('Error resetting data:', error);
            return false;
        }
    }
}

// 싱글톤 인스턴스 생성
export const measurementManager = new MeasurementDataManager();
export const settingsManager = new SettingsDataManager();

// Default export
export default {
    DataManager,
    MeasurementDataManager,
    SettingsDataManager,
    DataBackup,
    measurementManager,
    settingsManager
};
