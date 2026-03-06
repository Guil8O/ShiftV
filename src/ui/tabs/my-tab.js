/**
 * My Tab — History views, report tables, comparison data
 * Extracted from script.js Phase 3
 */
import { translate } from '../../translations.js';
import { svgIcon } from '../icon-paths.js';

/* ── dependency injection ── */
let _d;
export function initMyTab(deps) { _d = deps; }

/* ═══════════════════════════════════════
   My Tab History Views
   ═══════════════════════════════════════ */

function renderMyHistoryFilters() {
    const { currentMode, activeHistoryFilters, chartSelectableKeys, medicationKeys_MtF, medicationKeys_FtM } = _d;
    const myFilterControls = document.getElementById('my-filter-controls');
    if (!myFilterControls) return;
    const filterableKeys = chartSelectableKeys.filter(key => {
        if (currentMode === 'ftm') return !medicationKeys_MtF.includes(key);
        return !medicationKeys_FtM.includes(key);
    });
    let buttonsHTML = `<button class="filter-button ${activeHistoryFilters.length === 0 ? 'active' : ''}" data-key="all">${translate('selectAll')}</button>`;
    filterableKeys.forEach(key => {
        const label = translate(key).split('(')[0].trim();
        const isActive = activeHistoryFilters.includes(key);
        buttonsHTML += `<button class="filter-button ${isActive ? 'active' : ''}" data-key="${key}">${label}</button>`;
    });
    myFilterControls.innerHTML = buttonsHTML;
}

export function renderMyHistoryView() {
    const { data, headers } = getFilteredHistoryData();
    renderMyHistoryFilters();

    const myHistoryCardsContainer = document.getElementById('my-history-cards');
    const myHistoryTableContainer = document.getElementById('my-history-table-container');

    const isMobileView = window.innerWidth < 768;
    if (isMobileView) {
        if (myHistoryCardsContainer) myHistoryCardsContainer.style.display = 'grid';
        if (myHistoryTableContainer) myHistoryTableContainer.style.display = 'none';
        renderMyHistoryCards(data);
    } else {
        if (myHistoryCardsContainer) myHistoryCardsContainer.style.display = 'none';
        if (myHistoryTableContainer) myHistoryTableContainer.style.display = 'block';
        renderMyHistoryTable(data, headers);
    }
}

function getFilteredHistoryData() {
    const { measurements, activeHistoryFilters, legacyKeysToHideInTables, getFilteredDisplayKeys } = _d;
    if (!measurements || measurements.length === 0) {
        return { data: [], headers: [] };
    }

    const currentDisplayKeys = getFilteredDisplayKeys().filter(k => !legacyKeysToHideInTables.has(k));
    let headers = currentDisplayKeys.filter(k => k !== 'timestamp');

    if (activeHistoryFilters.length > 0) {
        headers = currentDisplayKeys.filter(key =>
            ['week', 'date', 'memo'].includes(key) || activeHistoryFilters.includes(key)
        );
    }

    headers = headers.filter(k => k !== 'symptoms' && k !== 'medications');

    let filteredData = [...measurements];
    if (activeHistoryFilters.length > 0) {
        filteredData = measurements.filter(m => {
            return activeHistoryFilters.every(key =>
                m[key] !== null && m[key] !== undefined && m[key] !== ''
            );
        });
    }

    const data = filteredData.reverse();
    return { data, headers };
}

export function buildMedicationChipRow(m) {
    const { medicationNameMap, ensureMedicationNameMap, escapeHTML } = _d;
    if (!Array.isArray(m.medications) || m.medications.length === 0) return '';
    ensureMedicationNameMap();
    const map = medicationNameMap;
    const chips = m.medications
        .filter(med => med && (med.id || med.medicationId))
        .map(med => {
            const id = med.id || med.medicationId;
            const name = map?.get(id) || id;
            const dose = Number.isFinite(Number(med.dose)) ? Number(med.dose) : null;
            const unit = med.unit || '';
            const label = dose ? `${name} ${dose}${unit}` : name;
            return `<span class="chip-assist history-tag-chip">${escapeHTML(label)}</span>`;
        }).join('');
    if (!chips) return '';
    return `<div class="history-card-tags-row"><span class="history-tag-label">${translate('medications')}</span><div class="history-tag-chips">${chips}</div></div>`;
}

export function buildSymptomChipRow(m) {
    const { symptomLabelMap, ensureSymptomLabelMap, escapeHTML } = _d;
    if (!Array.isArray(m.symptoms) || m.symptoms.length === 0) return '';
    ensureSymptomLabelMap();
    const map = symptomLabelMap;
    const chips = m.symptoms
        .filter(s => s && s.id)
        .map(s => {
            const name = map?.get(s.id) || s.id;
            const sev = Number.isFinite(Number(s.severity)) ? Number(s.severity) : null;
            const label = sev ? `${name}(${sev})` : name;
            return `<span class="chip-assist history-tag-chip">${escapeHTML(label)}</span>`;
        }).join('');
    if (!chips) return '';
    return `<div class="history-card-tags-row"><span class="history-tag-label">${translate('symptoms')}</span><div class="history-tag-chips">${chips}</div></div>`;
}

function renderMyHistoryCards(data) {
    const { activeHistoryFilters, legacyKeysToHideInTables, getFilteredDisplayKeys, formatValue, formatTimestamp, clearElement, escapeHTML } = _d;
    const myHistoryCardsContainer = document.getElementById('my-history-cards');
    if (!myHistoryCardsContainer) return;
    if (data.length === 0) {
        clearElement(myHistoryCardsContainer, "noDataYet");
        return;
    }

    let html = '';
    data.forEach(m => {
        const index = m.week;

        let cardKeys = getFilteredDisplayKeys().filter(key =>
            !legacyKeysToHideInTables.has(key) &&
            !['week', 'date', 'timestamp', 'memo', 'symptoms', 'medications'].includes(key) &&
            (m[key] !== null && m[key] !== undefined && m[key] !== '')
        );

        if (activeHistoryFilters.length > 0) {
            cardKeys = cardKeys.filter(key => activeHistoryFilters.includes(key));
        }

        const labelsRow = cardKeys.map(key => `<th class="label">${translate(key).split('(')[0].trim()}</th>`).join('');
        const valuesRow = cardKeys.map(key => {
            if (key === 'menstruationActive') return `<td class="value">${m.menstruationActive === true ? svgIcon('check', 'status-icon mi-success') : '-'}</td>`;
            return `<td class="value">${formatValue(m[key], key)}</td>`;
        }).join('');

        const medsRow = buildMedicationChipRow(m);
        const symptomsRow = buildSymptomChipRow(m);
        const tagsSection = (medsRow || symptomsRow)
            ? `<div class="history-card-tags">${medsRow}${symptomsRow}</div>`
            : '';

        let memoHtml = '';
        if (m.memo) {
            const memoId = `memo-${m.week}-${index}`;
            const lines = escapeHTML(m.memo).replace(/\n/g, '<br>');
            const needsExpand = m.memo.split('\n').length > 2 || m.memo.length > 100;
            memoHtml = `<p class="memo-text" id="${memoId}">${lines}</p>
                ${needsExpand ? `<button class="memo-expand-btn" onclick="(function(btn){const el=document.getElementById('${memoId}');const expanded=el.classList.toggle('expanded');btn.textContent=expanded?'\u2038 \uc811\uae30':'\u2026 \ub354 \ubcf4\uae30';})(this)">\u2026 \ub354 \ubcf4\uae30</button>` : ''}`;
        }

        html += `
    <div class="history-card glass-card">
        <div class="history-card-header">
            <h4>${translate('week')} ${m.week}</h4>
            <span class="date-label">${formatTimestamp(m.timestamp, true)}</span>
        </div>
        ${cardKeys.length > 0 ? `
        <div class="history-card-body">
            <div class="inner-table-wrapper">
                <table class="inner-history-table">
                    <thead><tr>${labelsRow}</tr></thead>
                    <tbody><tr>${valuesRow}</tr></tbody>
                </table>
            </div>
        </div>` : ''}
        ${tagsSection}
        ${memoHtml}
        <div class="button-group">
            <button class="glass-button btn-edit" data-index="${index}">${translate('edit')}</button>
            <button class="glass-button danger btn-delete" data-index="${index}">${translate('delete')}</button>
        </div>
    </div>`;
    });
    myHistoryCardsContainer.innerHTML = html;
}

function renderMyHistoryTable(data, headers) {
    const { legacyKeysToHideInTables, formatValue, formatTimestamp, clearElement } = _d;
    const myHistoryTableContainer = document.getElementById('my-history-table-container');
    if (!myHistoryTableContainer) return;
    if (data.length === 0) {
        clearElement(myHistoryTableContainer, "noDataYet");
        return;
    }

    const effectiveHeaders = (Array.isArray(headers) ? headers : [])
        .filter(k => !legacyKeysToHideInTables.has(k) && k !== 'symptoms' && k !== 'medications');

    const dataColCount = effectiveHeaders.filter(k => k !== 'timestamp').length;
    const totalColspan = dataColCount + 1;

    let tableHTML = '<table class="history-table"><thead><tr>';
    effectiveHeaders.forEach(key => {
        if (key === 'timestamp') return;
        const labelText = translate(key).split('(')[0].trim();
        tableHTML += `<th>${labelText}</th>`;
    });
    tableHTML += `<th class="sticky-col">${translate('manageColumn')}</th></tr></thead><tbody>`;

    data.forEach(m => {
        const index = m.week;
        tableHTML += '<tr>';
        effectiveHeaders.forEach(key => {
            if (key === 'timestamp') return;
            let value = '-';
            if (key === 'date') value = formatTimestamp(m.timestamp, true);
            else if (key === 'week') value = m.week;
            else if (key === 'menstruationActive') value = m.menstruationActive === true ? svgIcon('check', 'status-icon mi-success') : '-';
            else value = formatValue(m[key], key);
            if (key === 'memo' && value.length > 20) {
                value = value.substring(0, 20) + '...';
            }
            tableHTML += `<td>${value}</td>`;
        });
        tableHTML += `<td class="sticky-col action-col"><div class="action-buttons">
                    <button class="glass-button btn-edit" data-index="${index}">${translate('edit')}</button>
                    <button class="glass-button danger btn-delete" data-index="${index}">${translate('delete')}</button>
                  </div></td></tr>`;
        const medsRow = buildMedicationChipRow(m);
        const symptomsRow = buildSymptomChipRow(m);
        if (medsRow || symptomsRow) {
            tableHTML += `<tr class="history-tags-row"><td colspan="${totalColspan}" class="history-tags-cell">${medsRow}${symptomsRow}</td></tr>`;
        }
    });

    tableHTML += '</tbody></table>';
    myHistoryTableContainer.innerHTML = tableHTML;
}

/* ═══════════════════════════════════════
   Report Tab — History & Comparison Tables
   ═══════════════════════════════════════ */

export function renderHistoryTable() {
    const { measurements, activeHistoryFilters, legacyKeysToHideInTables, getFilteredDisplayKeys, formatValue, formatTimestamp, clearElement } = _d;
    const myHistoryTableContainer = document.getElementById('my-history-table-container');
    if (!myHistoryTableContainer) return;
    if (!measurements || measurements.length === 0) {
        clearElement(myHistoryTableContainer, "noDataYet"); return;
    }
    try {
        measurements.sort((a, b) => (a.week || 0) - (b.week || 0));
        const currentDisplayKeys = getFilteredDisplayKeys().filter(k => !legacyKeysToHideInTables.has(k));
        let filteredHeaderKeys = currentDisplayKeys.filter(k => k !== 'symptoms' && k !== 'medications');
        if (activeHistoryFilters.length > 0) {
            filteredHeaderKeys = currentDisplayKeys.filter(key =>
                ['week', 'date', 'memo'].includes(key) || activeHistoryFilters.includes(key)
            ).filter(k => k !== 'symptoms' && k !== 'medications');
        }

        const dataColCount = filteredHeaderKeys.filter(k => k !== 'timestamp').length;
        const totalColspan = dataColCount + 1;

        let tableHTML = '<table class="history-table"><thead><tr>';
        filteredHeaderKeys.forEach(key => {
            if (key === 'timestamp') return;
            const labelData = translate(key).match(/^(.*?) *(\((.*?)\))?$/);
            const labelText = labelData ? labelData[1].trim() : translate(key);
            const unitText = labelData && labelData[3] ? `<span class="unit">(${labelData[3]})</span>` : '';
            tableHTML += `<th>${labelText}${unitText}</th>`;
        });
        tableHTML += `<th class="sticky-col">${translate('manageColumn')}</th>`;
        tableHTML += `</tr></thead><tbody>`;
        for (let i = 0; i < measurements.length; i++) {
            const m = measurements[i];
            const displayDate = formatTimestamp(m.timestamp || m.date, false);
            tableHTML += '<tr>';
            filteredHeaderKeys.forEach(key => {
                if (key === 'timestamp') return;
                let value = '-';
                if (key === 'week') { value = m.week ?? i; }
                else if (key === 'date') { value = displayDate; }
                else if (key === 'menstruationActive') {
                    value = m.menstruationActive === true ? svgIcon('check', 'status-icon mi-success') : '-';
                }
                else { value = formatValue(m[key], key); }
                tableHTML += `<td>${value}</td>`;
            });
            tableHTML += `<td class="sticky-col action-col"><div class="action-buttons">`;
            tableHTML += `<button class="glass-button btn-edit" data-index="${i}">${translate('edit')}</button>`;
            tableHTML += `<button class="glass-button danger btn-delete" data-index="${i}">${translate('delete')}</button>`;
            tableHTML += `</div></td>`;
            tableHTML += '</tr>';
            const medsRow = buildMedicationChipRow(m);
            const symptomsRow = buildSymptomChipRow(m);
            if (medsRow || symptomsRow) {
                tableHTML += `<tr class="history-tags-row"><td colspan="${totalColspan}" class="history-tags-cell">${medsRow}${symptomsRow}</td></tr>`;
            }
        }
        tableHTML += '</tbody></table>';
        myHistoryTableContainer.innerHTML = tableHTML;
    } catch (e) {
        console.error(" Error rendering history table:", e);
        myHistoryTableContainer.innerHTML = `<p style="color: red;">${translate('alertGenericError')}</p>`;
    }
}

function renderComparisonTable(container, titleKey, dataCalculator) {
    const { measurements, targets, clearElement } = _d;
    if (!container) return;
    const dataResult = dataCalculator();
    if (!dataResult) return;

    const data = dataResult.data;
    const headers = dataResult.headers;

    if (!data || data.length === 0) {
        if (titleKey === 'reportTargetTitle' && Object.keys(targets).length === 0) clearElement(container, 'reportNeedTarget');
        else if (measurements.length < 2 && (titleKey === 'reportPrevWeekTitle' || titleKey === 'reportInitialTitle')) clearElement(container, 'reportNeedTwoRecords');
        else clearElement(container, 'noDataYet');
        return;
    }

    let tableHTML = `<table class="comparison-table"><thead><tr>
    ${headers.map(h => `<th>${h}</th>`).join('')}
</tr></thead><tbody>`;

    data.forEach(item => {
        const changeValue = item.change !== undefined ? item.change : item.progress;
        let changeClass = '';
        let changeText = '-';

        if (typeof changeValue === 'number') {
            if (item.progress !== undefined) {
                const roundedProgress = Math.round(changeValue);
                changeText = `${roundedProgress}%`;
                if (roundedProgress >= 100) changeClass = 'target-achieved';
                else if (roundedProgress > 0) changeClass = 'positive-change';
            } else {
                const roundedChange = parseFloat(changeValue.toFixed(1));
                if (roundedChange === 0) {
                    changeText = "0.0";
                } else {
                    changeText = roundedChange > 0 ? `+${roundedChange}` : `${roundedChange}`;
                    if (roundedChange > 0) changeClass = 'positive-change';
                    if (roundedChange < 0) changeClass = 'negative-change';
                }
            }
        }

        tableHTML += `<tr>
        <td>${translate(item.key)}</td>
        ${createProgressBarHTML(item)}
        <td class="${changeClass}">${changeText}</td>
    </tr>`;
    });

    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}

function calculateComparisonData() {
    const { measurements, targets, currentMode, targetSettingKeys, medicationKeys_MtF } = _d;
    if (measurements.length < 1) return [];

    const comparisonData = [];
    const initial = measurements[0];
    const latest = measurements[measurements.length - 1];
    const previous = measurements.length > 1 ? measurements[measurements.length - 2] : null;

    const keysToShow = targetSettingKeys.filter(key => {
        if (currentMode === 'ftm') return !medicationKeys_MtF.includes(key) && !key.startsWith('semen');
        return true;
    });

    keysToShow.forEach(key => {
        const initialValue = parseFloat(initial[key]);
        const currentValue = parseFloat(latest[key]);
        const prevValue = previous ? parseFloat(previous[key]) : null;
        const targetValue = targets[key] ? parseFloat(targets[key]) : null;

        if (!isNaN(currentValue)) {
            comparisonData.push({
                key: key,
                initialValue: isNaN(initialValue) ? null : initialValue,
                prevValue: isNaN(prevValue) ? null : prevValue,
                currentValue: currentValue,
                targetValue: isNaN(targetValue) ? null : targetValue,
            });
        }
    });
    return comparisonData;
}

export function calculatePrevWeekComparison() {
    const { measurements } = _d;
    const headers = [translate('comparisonItem'), ' ', translate('comparisonChange')];
    if (measurements.length < 2) return { data: [], headers };

    const fullData = calculateComparisonData();
    const data = fullData.map(item => {
        const change = item.currentValue - item.prevValue;
        return { ...item, change: isNaN(change) ? null : change };
    });

    return { data, headers };
}

export function calculateInitialComparison() {
    const { measurements } = _d;
    const headers = [translate('comparisonItem'), ' ', translate('comparisonChange')];
    if (measurements.length < 2) return { data: [], headers };

    const fullData = calculateComparisonData();
    const data = fullData.map(item => {
        const change = item.currentValue - item.initialValue;
        return { ...item, change: isNaN(change) ? null : change };
    });

    return { data, headers };
}

export function calculateTargetComparison() {
    const { measurements, targets } = _d;
    const headers = [translate('comparisonItem'), ' ', translate('ComRemainder')];

    if (measurements.length < 1 || Object.keys(targets).length === 0) {
        return { data: [], headers };
    }

    const fullData = calculateComparisonData();

    const data = fullData.filter(item => item.targetValue !== null)
        .map(item => {
            let diff = null;
            if (item.currentValue !== null && item.targetValue !== null) {
                diff = parseFloat((item.targetValue - item.currentValue).toFixed(2));
            }
            return { ...item, progress: diff };
        });

    return { data, headers };
}

export function createProgressBarHTML(data) {
    const { initialValue, prevValue, currentValue, targetValue } = data;
    let values = [
        { key: 'initial', value: initialValue, text: translate('labelInitial') },
        { key: 'prev', value: prevValue, text: translate('labelPrev') },
        { key: 'current', value: currentValue, text: translate('labelCurrent') },
        { key: 'target', value: targetValue, text: translate('labelTarget') }
    ].filter(v => v.value !== null && !isNaN(v.value));

    if (values.length < 2 && (values.length === 0 || values[0].key !== 'current')) return '<td>-</td>';

    const TOLERANCE = 0.01;
    if (initialValue !== null && targetValue !== null && Math.abs(initialValue - targetValue) < TOLERANCE) {
        values = values.filter(v => v.key !== 'initial' && v.key !== 'target');
        values.push({ key: 'initialTarget', value: initialValue, text: translate('initialTargetSame') });
    }
    if (prevValue !== null && currentValue !== null && Math.abs(prevValue - currentValue) < TOLERANCE) {
        values = values.filter(v => v.key !== 'prev' && v.key !== 'current');
        values.push({ key: 'prevCurrent', value: currentValue, text: translate('prevCurrentSame'), isCurrent: true });
    }

    const numericValues = values.map(v => v.value);
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const range = max - min;
    const padding = range === 0 ? 1 : range * 0.1;
    const displayMin = min - padding;
    const displayRange = (max + padding) - displayMin;

    if (displayRange === 0) return '<td>-</td>';
    const calcPercent = (val) => ((val - displayMin) / displayRange) * 100;

    values.forEach(v => {
        v.pos = calcPercent(v.value);
        v.staggerClass = '';
    });
    values.sort((a, b) => a.pos - b.pos);

    for (let i = 1; i < values.length; i++) {
        const prev = values[i - 1];
        const curr = values[i];
        if (curr.pos - prev.pos < 15) {
            prev.staggerClass = 'stagger-left';
            curr.staggerClass = 'stagger-right';
        }
    }

    const pCurrent = calcPercent(currentValue);
    const pInitial = initialValue !== null ? calcPercent(initialValue) : null;
    const pPrev = prevValue !== null ? calcPercent(prevValue) : null;
    const pTarget = targetValue !== null ? calcPercent(targetValue) : null;

    const initialToCurrent = pInitial !== null ? `<div class="progress-bar-range range-initial" style="left: ${Math.min(pInitial, pCurrent)}%; width: ${Math.abs(pCurrent - pInitial)}%;"></div>` : '';
    const prevToCurrent = pPrev !== null ? `<div class="progress-bar-range range-prev" style="left: ${Math.min(pPrev, pCurrent)}%; width: ${Math.abs(pCurrent - pPrev)}%;"></div>` : '';
    const currentToTarget = pTarget !== null ? `<div class="progress-bar-range range-target" style="left: ${Math.min(pCurrent, pTarget)}%; width: ${Math.abs(pTarget - pCurrent)}%;"></div>` : '';

    const labelsHTML = values.map(v => {
        const isCurrentClass = v.key === 'current' || v.isCurrent ? 'current' : '';
        return `<div class="progress-bar-label ${isCurrentClass} ${v.staggerClass}" style="left: ${v.pos}%;">
            <span>${v.value}</span><br>${v.text}
        </div>`;
    }).join('');

    return `
<td class="progress-bar-cell">
    <div class="progress-bar-container">
        <div class="progress-bar-track"></div>
        ${initialToCurrent}
        ${prevToCurrent}
        ${currentToTarget}
        <div class="progress-bar-marker" style="left: ${pCurrent}%;"></div>
    </div>
    <div class="progress-bar-labels">${labelsHTML}</div>
</td>`;
}

export function renderAllComparisonTables() {
    renderComparisonTable(document.getElementById('prev-week-comparison'), 'reportPrevWeekTitle', calculatePrevWeekComparison);
    renderComparisonTable(document.getElementById('initial-comparison'), 'reportInitialTitle', calculateInitialComparison);
    renderComparisonTable(document.getElementById('target-comparison'), 'reportTargetTitle', calculateTargetComparison);
}
