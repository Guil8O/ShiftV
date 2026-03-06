/**
 * Record Form Handlers — save/edit/delete measurement, duplicate date dialog
 * Extracted from script.js Phase 3
 */
import { translate } from '../../translations.js';
import { svgIcon } from '../icon-paths.js';

/* ── dependency injection ── */
let _d;
export function initRecordForm(deps) { _d = deps; }

export async function handleSaveMeasurement() {
    const { form, editIndexInput, baseNumericKeys, textKeys, getUnitHealthEvaluator, processAndStorePhotos, showPopup } = _d;
    const measurements = _d.measurements;
    if (!form) return null;

    form.querySelectorAll('.invalid-input').forEach(el => el.classList.remove('invalid-input'));

    const unitEvaluator = await getUnitHealthEvaluator();
    const formData = new FormData(form);
    const editIndexValue = editIndexInput.value;
    const isEdit = editIndexValue !== '';
    const indexToUpdate = isEdit ? parseInt(editIndexValue, 10) : -1;

    const base = isEdit && indexToUpdate >= 0 && indexToUpdate < measurements.length ? { ...measurements[indexToUpdate] } : {};

    const timestamp = isEdit ? (base.timestamp || Date.now()) : Date.now();
    const date = isEdit ? (base.date || new Date(timestamp).toISOString().split('T')[0]) : new Date(timestamp).toISOString().split('T')[0];

    const collectedData = { ...base };
    let isValid = true;
    let firstInvalidField = null;

    for (const key of [...baseNumericKeys, ...textKeys]) {
        const formKey = key;
        const value = formData.get(formKey);
        const inputElement = form.querySelector(`[name="${formKey}"]`);

        if (baseNumericKeys.includes(key)) {
            if (value === null || value === undefined || value === '') {
                collectedData[key] = null;
                continue;
            }
            const parsed = parseFloat(value);
            if (isNaN(parsed)) {
                isValid = false;
                if (inputElement) {
                    inputElement.classList.add('invalid-input');
                    if (!firstInvalidField) firstInvalidField = inputElement;
                }
                continue;
            }
            // Unit-aware validation
            const validationResult = unitEvaluator ? unitEvaluator.validateMetricInput(key, parsed) : { valid: true };
            if (!validationResult.valid) {
                isValid = false;
                if (inputElement) {
                    inputElement.classList.add('invalid-input');
                    if (!firstInvalidField) firstInvalidField = inputElement;
                }
                continue;
            }
            collectedData[key] = parsed;
        } else {
            collectedData[key] = value || null;
        }
    }

    if (!isValid) {
        showPopup('alertInvalidInput');
        if (firstInvalidField) firstInvalidField.focus();
        return null;
    }

    if (window.medicationSelector) {
        collectedData.medications = window.medicationSelector.getSelectedMedications?.() ?? [];
    }
    if (window.symptomSelector) {
        collectedData.symptoms = window.symptomSelector.getSelectedSymptoms?.() ?? [];
    }

    const menstruationCheckbox = form.querySelector('[name="menstruationActive"]');
    collectedData.menstruationActive = menstruationCheckbox ? menstruationCheckbox.checked : false;

    collectedData.timestamp = timestamp;
    collectedData.date = date;

    // Photo handling
    const pendingPhotos = collectedData._pendingPhotos;
    delete collectedData._pendingPhotos;
    if (pendingPhotos && pendingPhotos.length > 0) {
        try {
            const photoURLs = await processAndStorePhotos(pendingPhotos);
            collectedData.photos = [...(collectedData.photos || []), ...photoURLs];
        } catch (e) {
            console.error('Photo processing error:', e);
        }
    }

    return collectedData;
}

export async function handleFormSubmit(event) {
    const { form, editIndexInput, calculateAndAddWeekNumbers, savePrimaryDataToStorage, renderAll, updateFormTitle, updatePlaceholders, addNotification, navigateToTab, showPopup } = _d;
    const measurements = _d.measurements;
    event.preventDefault();

    const collectedData = await handleSaveMeasurement();
    if (!collectedData) return;

    const editIndexValue = editIndexInput.value;
    const isEdit = editIndexValue !== '';
    const indexToUpdate = isEdit ? parseInt(editIndexValue, 10) : -1;

    if (isEdit && indexToUpdate >= 0 && indexToUpdate < measurements.length) {
        measurements[indexToUpdate] = collectedData;
    } else {
        // Check for duplicate date
        const newDate = collectedData.date;
        if (newDate && checkDuplicateDate(newDate)) {
            showDuplicateDateDialog(newDate);
            return;
        }
        measurements.push(collectedData);
    }

    calculateAndAddWeekNumbers();
    savePrimaryDataToStorage();

    form.reset();
    editIndexInput.value = '';

    // Reset medication & symptom selectors
    if (window.medicationSelector) window.medicationSelector.clearAll?.();
    if (window.symptomSelector) window.symptomSelector.clearAll?.();

    const menstruationCheckbox = form.querySelector('[name="menstruationActive"]');
    if (menstruationCheckbox) menstruationCheckbox.checked = false;

    renderAll();
    updateFormTitle();
    updatePlaceholders();

    if (isEdit) {
        showPopup('alertDataUpdated');
    } else {
        showPopup('alertDataSaved');
        addNotification({ type: 'measurement', title: translate('notifNewMeasurement'), body: translate('notifNewMeasurementBody') });
    }
    navigateToTab('my');
}

export function handleDeleteMeasurement(index) {
    const { calculateAndAddWeekNumbers, savePrimaryDataToStorage, renderAll, showPopup } = _d;
    const measurements = _d.measurements;
    if (index < 0 || index >= measurements.length) return;

    if (!confirm(translate('alertDeleteConfirm'))) return;

    measurements.splice(index, 1);
    calculateAndAddWeekNumbers();
    savePrimaryDataToStorage();
    renderAll();
    showPopup('alertDataDeleted');
}

export function handleEditClick(index) {
    const { form, editIndexInput, saveUpdateBtn, cancelEditBtn, baseNumericKeys, textKeys, formatTimestamp, updateFormTitle, navigateToTab, applyModeToUI } = _d;
    const measurements = _d.measurements;
    if (index < 0 || index >= measurements.length) return;

    const m = measurements[index];
    editIndexInput.value = index;

    navigateToTab('record');

    requestAnimationFrame(() => {
        baseNumericKeys.forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) input.value = m[key] !== null && m[key] !== undefined ? m[key] : '';
        });
        textKeys.forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) input.value = m[key] || '';
        });

        // Restore medication selector state
        if (window.medicationSelector && Array.isArray(m.medications)) {
            window.medicationSelector.clearAll?.();
            m.medications.forEach(med => {
                if (med && (med.id || med.medicationId)) {
                    window.medicationSelector.addMedication?.({
                        id: med.id || med.medicationId,
                        dose: med.dose || '',
                        unit: med.unit || 'mg'
                    });
                }
            });
        }

        // Restore symptom selector state
        if (window.symptomSelector && Array.isArray(m.symptoms)) {
            window.symptomSelector.clearAll?.();
            m.symptoms.forEach(s => {
                if (s && s.id) {
                    window.symptomSelector.addSymptom?.({
                        id: s.id,
                        severity: s.severity || 1
                    });
                }
            });
        }

        const menstruationCheckbox = form.querySelector('[name="menstruationActive"]');
        if (menstruationCheckbox) menstruationCheckbox.checked = !!m.menstruationActive;

        updateFormTitle();
        applyModeToUI();

        if (saveUpdateBtn) saveUpdateBtn.textContent = translate('update');
        if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';

        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

export function cancelEdit() { resetFormState(); }

export function resetFormState() {
    const { form, editIndexInput, saveUpdateBtn, cancelEditBtn, updateFormTitle, updatePlaceholders } = _d;
    if (!form) return;
    form.reset();
    editIndexInput.value = '';

    if (window.medicationSelector) window.medicationSelector.clearAll?.();
    if (window.symptomSelector) window.symptomSelector.clearAll?.();

    const menstruationCheckbox = form.querySelector('[name="menstruationActive"]');
    if (menstruationCheckbox) menstruationCheckbox.checked = false;

    form.querySelectorAll('.invalid-input').forEach(el => el.classList.remove('invalid-input'));

    updateFormTitle();
    updatePlaceholders();

    if (saveUpdateBtn) saveUpdateBtn.textContent = translate('save');
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';
}

function checkDuplicateDate(date) {
    const measurements = _d.measurements;
    return measurements.some(m => m.date === date);
}

function showDuplicateDateDialog(date) {
    const { showPopup, calculateAndAddWeekNumbers, savePrimaryDataToStorage, renderAll, updateFormTitle, updatePlaceholders, navigateToTab, addNotification, form, editIndexInput } = _d;
    const measurements = _d.measurements;

    const existingIndex = measurements.findIndex(m => m.date === date);
    if (existingIndex === -1) return;

    const confirmed = confirm(translate('alertDuplicateDate'));
    if (confirmed) {
        // Overwrite existing
        const collectedData = { ...measurements[existingIndex] };
        // Re-collect form data (simplified since handleSaveMeasurement already validated)
        const formData = new FormData(form);
        const { baseNumericKeys, textKeys } = _d;
        for (const key of [...baseNumericKeys, ...textKeys]) {
            const value = formData.get(key);
            if (baseNumericKeys.includes(key)) {
                collectedData[key] = value ? parseFloat(value) : null;
            } else {
                collectedData[key] = value || null;
            }
        }
        measurements[existingIndex] = collectedData;
        calculateAndAddWeekNumbers();
        savePrimaryDataToStorage();
        form.reset();
        editIndexInput.value = '';
        renderAll();
        updateFormTitle();
        updatePlaceholders();
        showPopup('alertDataUpdated');
        navigateToTab('my');
    }
}
