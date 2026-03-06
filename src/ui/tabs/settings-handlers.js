/**
 * Settings Handlers Module
 * @module src/ui/tabs/settings-handlers
 *
 * Extracted from script.js — handles target form, language/mode changes,
 * data import/export/reset, CSV export, and tab activation.
 */

import { translate, setCurrentLanguage } from '../../translations.js';
import { normalizeSymptomsArray, symptomsSignature } from '../../utils.js';
import { convertFromStandard } from '../../utils/unit-conversion.js';
import { PRIMARY_DATA_KEY } from '../../constants.js';

let _d; // dependency container

/**
 * Initialise with host-app dependencies.
 * Mutable state is accessed via getter/setter properties on `deps`.
 */
export function initSettingsHandlers(deps) { _d = deps; }

/* ─── Target Form ──────────────────────────────────────────────────── */

export async function handleTargetFormSubmit(event) {
    event.preventDefault();
    const { getUnitHealthEvaluator, showPopup, navigateToTab,
            savePrimaryDataToStorage, renderAllComparisonTables } = _d;
    const targetForm = document.getElementById('target-form');
    const targetGrid = targetForm ? targetForm.querySelector('.target-grid') : null;
    if (!targetForm || !targetGrid) return;

    targetForm.querySelectorAll('.invalid-input').forEach(el => el.classList.remove('invalid-input'));
    let isValid = true; let firstInvalidField = null;
    const unitEvaluator = await getUnitHealthEvaluator();
    const formData = new FormData(targetForm);
    const newTargets = {};

    targetGrid.querySelectorAll('input[type="number"]').forEach(input => {
        const key = input.name; const value = formData.get(key);
        if (value !== null && value !== '') {
            const numValue = parseFloat(value);
            if (isNaN(numValue) || numValue < 0) {
                newTargets[key] = null;
                input.classList.add('invalid-input'); isValid = false;
                if (!firstInvalidField) firstInvalidField = input;
            } else {
                if (key === 'estrogenLevel') {
                    const unit = document.getElementById(`target-${key}-unit`)?.value || 'pg/ml';
                    newTargets[key] = unitEvaluator.normalizeUnit('estrogenLevel', numValue, unit);
                } else if (key === 'testosteroneLevel') {
                    const unit = document.getElementById(`target-${key}-unit`)?.value || 'ng/dl';
                    newTargets[key] = unitEvaluator.normalizeUnit('testosteroneLevel', numValue, unit);
                } else if (key === 'weight') {
                    const unit = document.getElementById(`target-${key}-unit`)?.value || 'kg';
                    newTargets[key] = unitEvaluator.normalizeUnit('weight', numValue, unit);
                } else {
                    newTargets[key] = numValue;
                }
            }
        } else { newTargets[key] = null; }
    });

    if (!isValid) {
        showPopup('alertValidationError', 4000);
        if (firstInvalidField) firstInvalidField.focus();
        return;
    }

    const targets = _d.targets;
    const targetSettingKeys = _d.targetSettingKeys;
    const updatedTargets = { ...targets };
    targetSettingKeys.forEach(key => {
        const inputElement = targetGrid.querySelector(`input[name="${key}"]`);
        const isVisible = inputElement && inputElement.closest('.form-group').style.display !== 'none';
        if (isVisible) {
            if (newTargets.hasOwnProperty(key)) { updatedTargets[key] = newTargets[key]; }
        }
    });
    Object.keys(updatedTargets).forEach(key => { if (updatedTargets[key] === null) delete updatedTargets[key]; });
    _d.targets = updatedTargets;
    savePrimaryDataToStorage();
    showPopup('popupTargetSaveSuccess');
    navigateToTab('tab-sv');
    renderAllComparisonTables();
}

/* ─── Language Change ──────────────────────────────────────────────── */

export function handleLanguageChange(event) {
    const { syncModuleLanguage, saveSettingsToStorage, applyLanguageToUI,
            showPopup, updateFormTitle, renderNextMeasurementInfo,
            renderHistoryTable, renderMyHistoryView } = _d;

    _d.currentLanguage = event.target.value;
    syncModuleLanguage(_d.currentLanguage);

    // 증상 선택기 언어 업데이트
    if (window.symptomSelector) {
        try { window.symptomSelector.setLanguage(_d.currentLanguage); } catch (error) {
            console.error('Error updating symptom selector language:', error);
        }
    }
    if (window.medicationSelector) {
        try { window.medicationSelector.setLanguage(_d.currentLanguage); } catch (error) {
            console.error('Error updating medication selector language:', error);
        }
    }

    // 증상/약물 맵 무효화 (언어 변경 시 재생성)
    _d.symptomLabelMap = null;
    _d.symptomLabelMapPromise = null;
    _d.medicationNameMap = null;
    _d.medicationNameMapPromise = null;

    saveSettingsToStorage(); applyLanguageToUI(); showPopup('popupSettingsSaved');

    if (typeof updateFormTitle === 'function') updateFormTitle();
    if (typeof renderNextMeasurementInfo === 'function') renderNextMeasurementInfo();
    if (typeof renderHistoryTable === 'function') renderHistoryTable();
    if (typeof renderMyHistoryView === 'function') renderMyHistoryView();
}

/* ─── Mode Change ──────────────────────────────────────────────────── */

export function handleModeChange(event) {
    const { saveSettingsToStorage, applyModeToUI, showPopup } = _d;

    _d.currentMode = event.target.value;

    if (window.symptomSelector) {
        try { window.symptomSelector.setMode(_d.currentMode); } catch (error) {
            console.error('Error updating symptom selector mode:', error);
        }
    }
    if (window.medicationSelector) {
        try { window.medicationSelector.setMode(_d.currentMode); } catch (error) {
            console.error('Error updating medication selector mode:', error);
        }
    }

    saveSettingsToStorage(); applyModeToUI(); showPopup('popupSettingsSaved');
}

/* ─── Reset All Data ───────────────────────────────────────────────── */

export function handleResetData() {
    const { saveSettingsToStorage, showPopup } = _d;
    if (confirm(translate('confirmReset'))) {
        localStorage.removeItem(PRIMARY_DATA_KEY);
        _d.measurements = [];
        _d.targets = {};
        _d.notes = [];
        _d.isInitialSetupDone = false;
        saveSettingsToStorage();
        showPopup('popupDataResetSuccess', 3000);
        setTimeout(() => { window.location.reload(); }, 1000);
    }
}

/* ─── Export (JSON) ────────────────────────────────────────────────── */

export function exportMeasurementData() {
    const { showPopup, APP_VERSION } = _d;
    try {
        const dataToExport = {
            app: "ShiftV", version: APP_VERSION, exportDate: new Date().toISOString(),
            settings: {
                language: _d.currentLanguage, mode: _d.currentMode,
                theme: _d.currentTheme, biologicalSex: _d.biologicalSex,
                selectedMetrics: _d.selectedMetrics
            },
            data: { measurements: _d.measurements, targets: _d.targets, notes: _d.notes }
        };
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url; a.download = `ShiftV_Backup_${timestamp}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        showPopup('popupDataExportSuccess');
    } catch (e) { console.error("Error exporting data:", e); showPopup('alertExportError'); }
}

/* ─── Export CSV ───────────────────────────────────────────────────── */

export function exportCSV() {
    const { showPopup } = _d;
    const measurements = _d.measurements;
    try {
        if (!measurements || measurements.length === 0) {
            showPopup('alertNoData', 3000);
            return;
        }
        const allKeys = new Set();
        measurements.forEach(m => Object.keys(m).forEach(k => allKeys.add(k)));
        const headers = ['date', 'week', ...([...allKeys].filter(k => k !== 'date' && k !== 'week' && k !== 'timestamp').sort()), 'timestamp'];

        let csv = '\ufeff' + headers.join(',') + '\n';
        measurements.forEach(m => {
            const row = headers.map(h => {
                const val = m[h];
                if (val === null || val === undefined) return '';
                if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
                const str = String(val);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            });
            csv += row.join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url; a.download = `ShiftV_Export_${timestamp}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        showPopup('popupDataExportSuccess');
    } catch (e) {
        console.error('CSV export error:', e);
        showPopup('alertExportError');
    }
}

/* ─── Import Data ──────────────────────────────────────────────────── */

export function importMeasurementData(event) {
    const { savePrimaryDataToStorage, saveSettingsToStorage, applyModeToUI,
            applyLanguageToUI, applyTheme, renderAll,
            navigateToTab, showPopup, calculateAndAddWeekNumbers,
            updateCycleTrackerVisibility } = _d;
    const importFileInput = document.getElementById('import-file-input');
    const sexSelect = document.getElementById('sex-select');

    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const imported = JSON.parse(e.target.result);
            const isValidShiftV = imported?.app === "ShiftV" && imported?.data &&
                Array.isArray(imported.data.measurements) &&
                typeof imported.data.targets === 'object' &&
                Array.isArray(imported.data.notes);

            if (isValidShiftV) {
                if (!confirm(translate('alertImportConfirm'))) {
                    if (importFileInput) importFileInput.value = ''; return;
                }
                _d.measurements = imported.data.measurements;
                _d.measurements.forEach(m => {
                    const beforeSig = symptomsSignature(m.symptoms);
                    const normalizedSymptoms = normalizeSymptomsArray(m.symptoms);
                    const afterSig = symptomsSignature(normalizedSymptoms);
                    if (beforeSig !== afterSig) m.symptoms = normalizedSymptoms;
                });
                _d.targets = imported.data.targets;
                _d.notes = imported.data.notes;
                if (imported.settings) {
                    _d.currentLanguage = imported.settings.language || _d.currentLanguage;
                    setCurrentLanguage(_d.currentLanguage);
                    _d.currentMode = imported.settings.mode || _d.currentMode;
                    _d.currentTheme = imported.settings.theme || _d.currentTheme;
                    _d.biologicalSex = imported.settings.biologicalSex || _d.biologicalSex;
                    _d.selectedMetrics = Array.isArray(imported.settings.selectedMetrics)
                        ? imported.settings.selectedMetrics : _d.selectedMetrics;
                }
                _d.isInitialSetupDone = true;
                _d.measurements.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                calculateAndAddWeekNumbers();
                _d.notes.forEach(note => {
                    if (!note.id) note.id = 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
                    if (!note.timestamp) note.timestamp = note.createdAt || note.id || Date.now();
                });
                savePrimaryDataToStorage(); saveSettingsToStorage();
                applyModeToUI(); applyLanguageToUI(); applyTheme();
                if (sexSelect) sexSelect.value = _d.biologicalSex;
                updateCycleTrackerVisibility();
                setupTargetInputs(); renderAll(); navigateToTab('tab-my');
            } else {
                console.error("Import failed: Invalid file structure.");
                showPopup('alertImportInvalidFile', 4000);
            }
        } catch (err) {
            console.error("Error parsing imported file:", err);
            showPopup('alertImportReadError', 4000);
        } finally {
            if (importFileInput) importFileInput.value = '';
        }
    };
    reader.onerror = function (e) {
        console.error("Error reading file:", e);
        showPopup('alertImportFileReadError', 4000);
        if (importFileInput) importFileInput.value = '';
    };
    reader.readAsText(file);
}

/* ─── Tab Activation ───────────────────────────────────────────────── */

export function activateTab(targetTabId) {
    const { renderNextMeasurementInfo, renderSvTab,
            renderMyHistoryView } = _d;
    const tabBar = document.querySelector('.tab-bar');
    if (!tabBar) return;

    const targetButton = tabBar.querySelector(`[data-tab="${targetTabId}"]`);
    if (!targetButton) {
        console.error("Target tab button not found:", targetTabId);
        return;
    }

    const tabButtons = tabBar.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // 1. 모든 버튼에서 active 클래스 제거
    tabButtons.forEach(button => {
        button.classList.remove('active');
        button.setAttribute('aria-selected', 'false');
    });

    // 2. 타겟 버튼에 active 클래스 추가
    targetButton.classList.add('active');
    targetButton.setAttribute('aria-selected', 'true');

    // 3. 탭 콘텐츠 표시/숨기기
    tabContents.forEach(content => {
        content.style.display = (content.id === targetTabId) ? 'block' : 'none';
        if (content.id === targetTabId) {
            setTimeout(() => content.classList.add('active'), 10);
        } else {
            content.classList.remove('active');
        }
    });

    // 4. 탭에 따른 동적 렌더링
    if (targetTabId === 'tab-record') {
        document.getElementById('record-input-view').style.display = 'block';
        renderNextMeasurementInfo();
    } else if (targetTabId === 'tab-sv') {
        renderSvTab();
        if (window.streakStrip) window.streakStrip.refresh();
    } else if (targetTabId === 'tab-my') {
        setupTargetInputs();
        renderMyHistoryView();
    } else if (targetTabId === 'tab-diary') {
        if (window.diaryTab) window.diaryTab.render();
    }

    // 5. 확장된 탭 바를 축소시킵니다.
    if (tabBar.classList.contains('tab-bar-expanded')) {
        tabBar.classList.remove('tab-bar-expanded');
    }
}

/* ─── Setup Target Inputs ──────────────────────────────────────────── */

export function setupTargetInputs(updateOnly = false) {
    const { normalizeMetricValue, bodySizeKeys, medicationKeys_FtM, medicationKeys_MtF } = _d;
    const targetForm = document.getElementById('target-form');
    let targetGrid = targetForm ? targetForm.querySelector('.target-grid') : null;
    if (!targetGrid) {
        console.error("Target grid container not found."); return;
    }
    const targetSettingKeys = _d.targetSettingKeys;
    const currentMode = _d.currentMode;
    const keysForMode = targetSettingKeys.filter(key => {
        if (currentMode === 'mtf') return !medicationKeys_FtM.includes(key);
        else return !medicationKeys_MtF.includes(key) && !key.startsWith('semen');
    });
    if (!updateOnly) {
        targetGrid.innerHTML = '';
        keysForMode.forEach(key => {
            const formGroup = document.createElement('div'); formGroup.classList.add('form-group');
            const label = document.createElement('label'); label.setAttribute('for', `target-${key}`);
            label.textContent = translate(key); label.dataset.langKey = key;

            const input = document.createElement('input');
            input.setAttribute('type', 'number');
            input.setAttribute('id', `target-${key}`);
            input.setAttribute('name', key);
            input.setAttribute('step', '0.1');
            input.setAttribute('min', '0');

            const needsUnitSelect = key === 'estrogenLevel' || key === 'testosteroneLevel' || key === 'weight';

            let placeholderUnit = '';
            if (needsUnitSelect) placeholderUnit = translate('valuePlaceholder');
            else if (key.includes('Percentage')) placeholderUnit = translate('unitPercent');
            else if (key === 'weight' || key === 'muscleMass') placeholderUnit = translate('unitKg');
            else if (bodySizeKeys.includes(key)) placeholderUnit = translate('unitCm');
            input.setAttribute('placeholder', placeholderUnit);

            formGroup.appendChild(label);
            if (needsUnitSelect) {
                const wrap = document.createElement('div');
                wrap.className = 'input-with-unit';
                wrap.appendChild(input);

                const select = document.createElement('select');
                select.className = 'unit-select';
                select.id = `target-${key}-unit`;
                select.dataset.targetMetric = key;
                select.dataset.prevUnit = '';

                const options =
                    key === 'estrogenLevel'
                        ? ['pg/ml', 'pmol/L']
                        : key === 'testosteroneLevel'
                            ? ['ng/dl', 'nmol/L', 'ng/ml']
                            : ['kg', 'lbs'];

                select.innerHTML = options.map(u => `<option value="${u}">${u}</option>`).join('');
                const pref = localStorage.getItem(`shiftV_targetUnit_${key}`);
                if (pref && options.includes(pref)) select.value = pref;
                select.dataset.prevUnit = select.value;

                select.addEventListener('focus', () => {
                    select.dataset.prevUnit = select.value;
                });
                select.addEventListener('change', async () => {
                    const prevUnit = select.dataset.prevUnit || select.value;
                    const nextUnit = select.value;
                    if (input.value !== '') {
                        const standard = await normalizeMetricValue(key, input.value, prevUnit);
                        input.value = convertFromStandard(key, standard, nextUnit);
                    }
                    localStorage.setItem(`shiftV_targetUnit_${key}`, nextUnit);
                    select.dataset.prevUnit = nextUnit;
                });

                wrap.appendChild(select);
                formGroup.appendChild(wrap);
            } else {
                formGroup.appendChild(input);
            }
            targetGrid.appendChild(formGroup);
        });
    } else {
        targetGrid.querySelectorAll('.form-group').forEach(group => {
            const label = group.querySelector('label'); const input = group.querySelector('input');
            if (label && input) {
                const key = input.name;
                label.textContent = translate(key);
                let placeholderUnit = '';
                if (key === 'estrogenLevel' || key === 'testosteroneLevel' || key === 'weight') placeholderUnit = translate('valuePlaceholder');
                else if (key.includes('Percentage')) placeholderUnit = translate('unitPercent');
                else if (key === 'weight' || key === 'muscleMass') placeholderUnit = translate('unitKg');
                else if (bodySizeKeys.includes(key)) placeholderUnit = translate('unitCm');
                input.setAttribute('placeholder', placeholderUnit);
                const keyShouldBeVisible = keysForMode.includes(key);
                group.style.display = keyShouldBeVisible ? '' : 'none';
            }
        });
    }
    populateTargetInputs();
}

function populateTargetInputs() {
    const targetForm = document.getElementById('target-form');
    const targetGrid = targetForm ? targetForm.querySelector('.target-grid') : null;
    if (!targetGrid) return;
    const targets = _d.targets;
    targetGrid.querySelectorAll('input[type="number"]').forEach(input => {
        const key = input.name;
        const unitSelect = document.getElementById(`target-${key}-unit`);
        if (unitSelect && targets[key] !== undefined && targets[key] !== null && targets[key] !== '') {
            input.value = convertFromStandard(key, targets[key], unitSelect.value);
        } else {
            input.value = targets[key] || '';
        }
    });
}

/* ─── Check For Updates ────────────────────────────────────────────── */

export function handleCheckForUpdates() {
    const { showPopup } = _d;
    if (!navigator.onLine) {
        showPopup('popupOfflineForUpdate');
        return;
    }

    if (!('serviceWorker' in navigator)) {
        showPopup('popupUpdateFailed');
        return;
    }

    navigator.serviceWorker.ready.then(registration => {
        let updateFound = false;
        registration.addEventListener('updatefound', () => {
            updateFound = true;
            console.log('DEBUG: New service worker found, installing...');
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('DEBUG: New service worker installed and ready.');
                    showPopup('popupUpdateComplete', 3000);
                    setTimeout(() => window.location.reload(), 3000);
                }
            });
        });

        registration.update().then(() => {
            setTimeout(() => {
                if (!updateFound) {
                    console.log('DEBUG: No new service worker found after check.');
                    showPopup('popupAlreadyLatest');
                }
            }, 3000);
        }).catch(error => {
            console.error('Error during service worker update check:', error);
            showPopup('popupUpdateFailed');
        });

    }).catch(error => {
        console.error('Service worker not ready:', error);
        showPopup('popupUpdateFailed');
    });
}

/* ─── Notification Handlers ────────────────────────────────────────── */

function showConfirmationNotification() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    const title = translate('notification_setup_success_title');
    const body = translate('notification_setup_success_body');
    new Notification(title, {
        body: body,
        icon: '/icons/apple-touch-icon.png'
    });
}

export function handleNotificationToggle() {
    const { showPopup, saveSettingsToStorage } = _d;
    const notificationToggle = document.getElementById('notification-toggle');
    if (!notificationToggle) return;
    const isEnabled = notificationToggle.checked;

    if (isEnabled) {
        if (!('Notification' in window)) {
            showPopup('alertBrowserNotSupportNotification', 3000);
            notificationToggle.checked = false;
            return;
        }
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                _d.notificationEnabled = true;
                saveSettingsToStorage();
                showPopup('popupSettingsSaved');
                showConfirmationNotification();
            } else {
                _d.notificationEnabled = false;
                notificationToggle.checked = false;
                saveSettingsToStorage();
            }
        });
    } else {
        _d.notificationEnabled = false;
        saveSettingsToStorage();
        showPopup('popupSettingsSaved');
    }
}
