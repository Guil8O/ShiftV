/**
 * Comparison Modal + Analysis Views
 * Extracted from script.js Phase 3
 */
import { translate } from '../../translations.js';
import { getCSSVar as getCssVar } from '../../utils.js';
import { applyChartZoom } from '../chart-zoom.js';
import { calculatePrevWeekComparison, calculateInitialComparison, calculateTargetComparison, createProgressBarHTML } from '../tabs/my-tab.js';

/* ── dependency injection ── */
let _d;
export function initComparisonAnalysis(deps) { _d = deps; }

/* ═══════════════════════════════════════
   Comparison Modal (Block 1)
   ═══════════════════════════════════════ */

export async function openComparisonModal() {
    const { measurements, currentMode, biologicalSex, currentLanguage, targets, openModal } = _d;
    // 새로운 Body Briefing 모달 사용
    try {
        const module = await import('../../doctor-module/core/health-evaluator.js').catch(() => null);
        const bbModule = await import('../modals/body-briefing-modal.js');
        const BodyBriefingModal = bbModule.BodyBriefingModal || bbModule.default;
        const userSettings = {
            mode: currentMode || 'mtf',
            biologicalSex: biologicalSex || 'male',
            language: currentLanguage || 'ko',
            targets: targets || {}
        };
        history.pushState({ type: 'modal-briefing' }, '', location.href);
        const modal = new BodyBriefingModal(measurements || [], userSettings);
        await modal.open();
    } catch (error) {
        console.error('Failed to load Body Briefing modal:', error);
        const comparisonViewTemplate = document.getElementById('compare-flow-view');
        if (!comparisonViewTemplate) return;
        const contentHTML = comparisonViewTemplate.innerHTML;
        const title = translate('comparisonModalTitle');
        openModal(title, contentHTML);
    }
    return;

    // 모달이 열리면 상세 분석 뷰를 기본으로 렌더링
    renderDetailedAnalysisView();

    const filterContainer = _d.modalContent.querySelector('#comparison-filter-controls');
    if (filterContainer) {
        filterContainer.addEventListener('click', handleComparisonFilterClick);
    }
    const tabSwitcher = _d.modalContent.querySelector('.modal-tab-switcher');
    if (tabSwitcher) {
        tabSwitcher.addEventListener('click', handleModalTabSwitch);
    }
}

export function handleComparisonFilterClick(event) {
    const { getFilteredChartKeys } = _d;
    const button = event.target.closest('.filter-button');
    if (!button) return;

    const key = button.dataset.key;

    if (key === 'all') {
        _d.activeComparisonFilters = getFilteredChartKeys();
    } else if (key === 'none') {
        _d.activeComparisonFilters = [];
    } else {
        const filters = _d.activeComparisonFilters;
        const index = filters.indexOf(key);
        if (index > -1) {
            filters.splice(index, 1);
        } else {
            filters.push(key);
        }
    }

    renderComparisonFilters();
    renderComparisonChart();
    renderComparisonTable();
}

export function renderComparisonFilters() {
    const { measurements, getFilteredChartKeys, getMetricColor } = _d;
    const activeComparisonFilters = _d.activeComparisonFilters;
    const modalContent = _d.modalContent;
    const container = modalContent.querySelector('#detailed-analysis-view #comparison-filter-controls');
    if (!container) return;

    const standardKeys = getFilteredChartKeys().filter(key => key !== 'medicationOtherDose');

    const otherMedNames = [...new Set(measurements
        .map(m => m.medicationOtherName)
        .filter(name => name && name.trim() !== '')
    )];

    let categoryButtonsHTML = '';

    standardKeys.forEach(key => {
        const label = translate(key).split('(')[0].trim();
        const isActive = activeComparisonFilters.includes(key);
        const color = getMetricColor(key);
        const lightColor = getMetricColor(key, true);

        categoryButtonsHTML += `<button class="filter-button ${isActive ? 'active' : ''}" 
        data-key="${key}"
        style="${isActive ? `background-color:${color};border-color:${color};color:white;` : `color:${lightColor};border-color:${lightColor};`}"
        >${label}</button>`;
    });

    otherMedNames.forEach((name, index) => {
        const isActive = activeComparisonFilters.includes(name);
        const hue = (index * 137.5 + 200) % 360;
        const color = `hsl(${hue}, 70%, 60%)`;
        const lightColor = `hsl(${hue}, 50%, 75%)`;

        categoryButtonsHTML += `<button class="filter-button ${isActive ? 'active' : ''}" 
        data-key="${name}"
        style="${isActive ? `background-color:${color};border-color:${color};color:white;` : `color:${lightColor};border-color:${lightColor};`}"
        >${name}</button>`;
    });

    const actionButtonsHTML = `
    <div class="comparison-actions">
        <button class="filter-button" data-key="all">${translate('selectAll')}</button>
        <button class="filter-button" data-key="none">${translate('deselectAll')}</button>
    </div>
`;

    container.innerHTML = categoryButtonsHTML + actionButtonsHTML;
}

export async function renderComparisonChart() {
    const { measurements, targets, getFilteredChartKeys, getMetricColor, loadChartJS, ensureAverageLinePluginRegistered } = _d;
    const activeComparisonFilters = _d.activeComparisonFilters;
    const modalContent = _d.modalContent;

    const ctx = modalContent.querySelector('#detailed-analysis-view #comparison-chart')?.getContext('2d');
    if (!ctx) return;
    await loadChartJS();

    let comparisonChartInstance = _d.comparisonChartInstance;
    if (comparisonChartInstance) comparisonChartInstance.destroy();

    if (measurements.length < 1 || activeComparisonFilters.length === 0) return;

    const labels = measurements.map(m => `${m.week}${translate('week')}`);

    const otherMedNames = [...new Set(measurements.map(m => m.medicationOtherName).filter(n => n))];

    const datasets = [];

    activeComparisonFilters.forEach(filterKey => {
        let mainDataset = null;
        let metricColor = '';

        if (otherMedNames.includes(filterKey)) {
            const index = otherMedNames.indexOf(filterKey);
            const hue = (index * 137.5 + 200) % 360;
            metricColor = `hsl(${hue}, 70%, 60%)`;

            mainDataset = {
                label: filterKey,
                data: measurements.map(m => m.medicationOtherName === filterKey ? m.medicationOtherDose : null),
                borderColor: metricColor,
                backgroundColor: metricColor + '33',
                tension: 0.1, borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6, spanGaps: true
            };
        } else {
            metricColor = getMetricColor(filterKey);

            mainDataset = {
                label: translate(filterKey).split('(')[0].trim(),
                data: measurements.map(m => m[filterKey] ?? null),
                borderColor: metricColor,
                backgroundColor: metricColor + '33',
                tension: 0.1, borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6, spanGaps: true
            };

            const targetVal = parseFloat(targets[filterKey]);
            if (!isNaN(targetVal)) {
                const faintColor = metricColor.replace('hsl', 'hsla').replace(')', ', 0.5)');

                datasets.push({
                    label: `${translate(filterKey).split('(')[0].trim()} (${translate('labelTarget')})`,
                    data: new Array(measurements.length).fill(targetVal),
                    borderColor: faintColor,
                    backgroundColor: 'transparent',
                    borderWidth: 4,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    fill: false,
                    order: 99
                });
            }
        }

        if (mainDataset) {
            datasets.push(mainDataset);
        }
    });

    const isLightMode = document.body.classList.contains('light-mode');
    const tickColor = isLightMode ? '#5c5c8a' : getCssVar('--text-dim2');
    const gridColor = isLightMode ? 'rgba(200, 200, 235, 0.5)' : getCssVar('--glass-border');

    const maxPointsPerView = 20;
    const minPointWidth = 45;
    const chartWrapper = ctx.canvas.closest('.chart-wrapper');

    let chartInnerContainer = ctx.canvas.parentElement;
    if (!chartInnerContainer || !chartInnerContainer.classList.contains('chart-inner-container')) {
        chartInnerContainer = document.createElement('div');
        chartInnerContainer.classList.add('chart-inner-container');
        const parent = ctx.canvas.parentElement;
        parent.insertBefore(chartInnerContainer, ctx.canvas);
        chartInnerContainer.appendChild(ctx.canvas);
    }

    if (measurements.length > maxPointsPerView) {
        const neededWidth = measurements.length * minPointWidth;
        if (chartWrapper) {
            chartWrapper.style.overflowX = 'auto';
            chartWrapper.style.overflowY = 'hidden';
        }
        chartInnerContainer.style.width = neededWidth + 'px';
        chartInnerContainer.style.height = '280px';
        ctx.canvas.style.width = '100%';
        ctx.canvas.style.height = '100%';
    } else {
        if (chartWrapper) {
            chartWrapper.style.overflowX = 'hidden';
        }
        chartInnerContainer.style.width = '100%';
        chartInnerContainer.style.height = '280px';
        ctx.canvas.style.width = '100%';
        ctx.canvas.style.height = '100%';
    }

    ensureAverageLinePluginRegistered();
    comparisonChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (event, elements) => {
                const points = comparisonChartInstance.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
                const titleEl = modalContent.querySelector('#comparison-selected-week-data-title');
                const contentEl = modalContent.querySelector('#comparison-selected-week-data-content');
                const placeholderEl = modalContent.querySelector('#comparison-data-placeholder');

                if (!titleEl || !contentEl || !placeholderEl) return;

                if (points.length) {
                    const firstPoint = points[0];
                    const datasetIndex = firstPoint.datasetIndex;

                    if (comparisonChartInstance.data.datasets[datasetIndex].pointRadius === 0) return;

                    const weekIndex = firstPoint.index;
                    const weekData = measurements[weekIndex];

                    if (weekData) {
                        titleEl.textContent = translate('selectedWeekDataTitle', { week: weekData.week });
                        let contentHTML = '';
                        _d.getFilteredDisplayKeys().forEach(key => {
                            if (weekData[key] !== null && weekData[key] !== undefined && weekData[key] !== '') {
                                contentHTML += `
                            <div class="data-item">
                                <span class="data-item-label">${translate(key).split('(')[0].trim()}</span>
                                <span class="data-item-value">${_d.formatValue(weekData[key], key)}</span>
                            </div>`;
                            }
                        });
                        contentEl.innerHTML = contentHTML;

                        contentEl.style.display = 'grid';
                        placeholderEl.style.display = 'none';
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: tickColor },
                    grid: { color: gridColor },
                    border: { color: gridColor }
                },
                y: {
                    ticks: { color: tickColor },
                    grid: { color: gridColor },
                    border: { color: gridColor },
                    beginAtZero: false
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    filter: function (tooltipItem) {
                        return tooltipItem.dataset.pointRadius !== 0;
                    }
                }
            }
        }
    });
    _d.comparisonChartInstance = comparisonChartInstance;
}

function renderComparisonTable() {
    const { measurements, formatValue, formatTimestamp, getFilteredDisplayKeys } = _d;
    const activeComparisonFilters = _d.activeComparisonFilters;
    const modalContent = _d.modalContent;
    const container = modalContent.querySelector('#detailed-analysis-view #comparison-table-container');
    if (!container) return;
    if (measurements.length < 1) {
        container.innerHTML = `<p>${translate('noDataYet')}</p>`;
        return;
    }

    const allKeys = getFilteredDisplayKeys().filter(key => !['week', 'date', 'timestamp'].includes(key));
    let tableHTML = '<table><thead><tr>';
    tableHTML += `<th>${translate('week')}</th><th>${translate('date')}</th>`;
    allKeys.forEach(key => {
        tableHTML += `<th>${translate(key).split('(')[0].trim()}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    measurements.forEach(m => {
        tableHTML += '<tr>';
        tableHTML += `<td>${m.week}</td><td>${formatTimestamp(m.timestamp)}</td>`;
        allKeys.forEach(key => {
            const isActiveCol = activeComparisonFilters.includes(key);
            tableHTML += `<td class="${isActiveCol ? 'active-col' : ''}">${formatValue(m[key], key)}</td>`;
        });
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

/* ═══════════════════════════════════════
   Analysis Views (Block 8)
   ═══════════════════════════════════════ */

export function renderDetailedAnalysisView() {
    const modalContent = _d.modalContent;
    renderComparisonFilters();
    renderComparisonChart();
    renderComparisonTable();

    const container = modalContent.querySelector('#comparison-selected-week-data-container');
    const titleEl = modalContent.querySelector('#comparison-selected-week-data-title');
    const contentEl = modalContent.querySelector('#comparison-selected-week-data-content');
    const placeholderEl = modalContent.querySelector('#comparison-data-placeholder');

    if (container) container.style.display = 'block';
    if (titleEl) titleEl.innerHTML = '';
    if (contentEl) {
        contentEl.innerHTML = '';
        contentEl.style.display = 'none';
    }
    if (placeholderEl) {
        placeholderEl.style.display = 'block';
        placeholderEl.textContent = translate('graphClickPrompt');
    }
}

export function renderComparativeAnalysisView() {
    const { measurements, formatTimestamp, formatValue, getFilteredDisplayKeys } = _d;
    const modalContent = _d.modalContent;
    const leftSelect = modalContent.querySelector('#compare-left-select');
    const rightSelect = modalContent.querySelector('#compare-right-select');

    if (!leftSelect || !rightSelect || measurements.length < 1) {
        const grid = modalContent.querySelector('#comparison-results-grid');
        if (grid) grid.innerHTML = `<p>${translate('noDataYet')}</p>`;
        return;
    }

    const optionsHTML = measurements.map((m, index) =>
        `<option value="${index}">${m.week}${translate('week')} (${formatTimestamp(m.timestamp)})</option>`
    ).reverse().join('');

    leftSelect.innerHTML = optionsHTML;
    rightSelect.innerHTML = optionsHTML;

    if (measurements.length >= 2) {
        leftSelect.value = measurements.length - 2;
        rightSelect.value = measurements.length - 1;
    } else {
        leftSelect.value = 0;
        rightSelect.value = 0;
    }

    leftSelect.addEventListener('change', updateComparisonResults);
    rightSelect.addEventListener('change', updateComparisonResults);

    updateComparisonResults();
}

function updateComparisonResults() {
    const { measurements, formatValue, getFilteredDisplayKeys } = _d;
    const modalContent = _d.modalContent;
    const leftIndex = parseInt(modalContent.querySelector('#compare-left-select').value);
    const rightIndex = parseInt(modalContent.querySelector('#compare-right-select').value);
    const grid = modalContent.querySelector('#comparison-results-grid');

    if (isNaN(leftIndex) || isNaN(rightIndex) || !grid) return;

    const leftData = measurements[leftIndex];
    const rightData = measurements[rightIndex];
    const displayKeys = getFilteredDisplayKeys().filter(k => !['week', 'date', 'timestamp', 'memo'].includes(k));

    let html = `
<div class="comparison-item-header label">${translate('comparisonItem')}</div>
<div class="comparison-item-header">${leftData.week}${translate('week')}</div> 
<div class="comparison-item-header">${rightData.week}${translate('week')}</div>
`;

    displayKeys.forEach(key => {
        const leftValue = leftData[key];
        const rightValue = rightData[key];

        if ((leftValue !== null && leftValue !== undefined && leftValue !== '') ||
            (rightValue !== null && rightValue !== undefined && rightValue !== '')) {
            html += `
            <div class="comparison-item-label">${translate(key).split('(')[0].trim()}</div>
            <div class="comparison-item-value">${formatValue(leftValue, key)}</div>
            <div class="comparison-item-value">${formatValue(rightValue, key)}</div>
        `;
        }
    });

    grid.innerHTML = html;
}

export function handleModalTabSwitch(event) {
    const modalContent = _d.modalContent;
    const button = event.target.closest('.modal-tab-btn');
    if (!button) return;

    const targetTab = button.dataset.tab;
    if (targetTab === _d.activeModalTab) return;

    _d.activeModalTab = targetTab;

    modalContent.querySelectorAll('.modal-tab-btn').forEach(btn => btn.classList.remove('active'));
    modalContent.querySelectorAll('.modal-tab-content').forEach(content => content.classList.remove('active'));

    button.classList.add('active');
    const targetContent = modalContent.querySelector(`#${targetTab}-view`);
    if (targetContent) {
        targetContent.classList.add('active');

        if (targetTab === 'detailed-analysis') {
            renderDetailedAnalysisView();
        } else if (targetTab === 'comparative-analysis') {
            renderComparativeAnalysisView();
        }
    }
}

export function handleTargetModalTabSwitch(event) {
    const modalContent = _d.modalContent;
    const button = event.target.closest('.modal-tab-btn');
    if (!button) return;

    const targetTabId = button.dataset.tab;

    modalContent.querySelectorAll('.modal-tab-btn').forEach(btn => btn.classList.remove('active'));
    modalContent.querySelectorAll('.modal-tab-content').forEach(content => content.classList.remove('active'));

    button.classList.add('active');
    const targetContent = modalContent.querySelector(`#${targetTabId}`);
    if (targetContent) {
        targetContent.classList.add('active');

        if (targetTabId === 'target-progress-view') {
            renderTargetProgressTab();
        } else if (targetTabId === 'prev-week-view') {
            renderPrevWeekComparisonTab();
        } else if (targetTabId === 'initial-view') {
            renderInitialComparisonTab();
        }
    }
}

function renderTargetProgressTab() {
    const modalContent = _d.modalContent;
    const container = modalContent.querySelector('#target-progress-view');
    if (!container) return;

    const { data, headers } = calculateTargetComparison();

    if (data.length === 0) {
        container.innerHTML = `<p class="placeholder">${translate('reportNeedTarget')}</p>`;
        return;
    }

    let tableRows = data.map(item => {
        let diffText = '-';
        let diffClass = '';

        if (item.progress !== null && typeof item.progress === 'number') {
            const val = item.progress;

            if (val === 0) {
                diffText = translate('targetAchieved');
                diffClass = 'target-achieved';
            } else {
                const sign = val > 0 ? '+' : '';
                diffText = `${sign}${val}`;
                diffClass = val > 0 ? 'positive-change' : 'negative-change';
            }

            if (val !== 0) {
                let unit = '';
                if (item.key.includes('weight') || item.key.includes('Mass')) unit = 'kg';
                else if (['height', 'chest', 'waist', 'hips', 'thigh', 'arm', 'shoulder'].includes(item.key)) unit = 'cm';
                else if (item.key.includes('Percentage')) unit = '%';
                if (unit) diffText += unit;
            }
        }

        return `
    <tr>
        <td>${translate(item.key)}</td>
        ${createProgressBarHTML(item)}
        <td class="${diffClass}" style="font-weight: bold;">${diffText}</td>
    </tr>
`;
    }).join('');

    container.innerHTML = `
<div class="table-responsive">
    <table class="comparison-table progress-comparison-table">
        <thead><tr><th>${headers[0]}</th><th></th><th>${headers[2]}</th></tr></thead>
        <tbody>${tableRows}</tbody>
    </table>
</div>
`;
}

function renderPrevWeekComparisonTab() {
    const modalContent = _d.modalContent;
    const container = modalContent.querySelector('#prev-week-view');
    if (!container) return;

    const { data, headers } = calculatePrevWeekComparison();

    if (data.length === 0) {
        container.innerHTML = `<p class="placeholder">${translate('reportNeedTwoRecords')}</p>`;
        return;
    }

    let tableRows = data.map(item => {
        let changeText = '-';
        let changeClass = '';
        if (item.change !== null && !isNaN(item.change)) {
            const roundedChange = parseFloat(item.change.toFixed(1));
            if (roundedChange > 0) {
                changeText = `+${roundedChange}`;
                changeClass = 'positive-change';
            } else {
                changeText = `${roundedChange}`;
                if (roundedChange < 0) changeClass = 'negative-change';
            }
        }
        return `
        <tr>
            <td>${translate(item.key)}</td>
            ${createProgressBarHTML(item)}
            <td class="${changeClass}">${changeText}</td>
        </tr>
    `;
    }).join('');

    container.innerHTML = `
    <div class="table-responsive">
        <table class="comparison-table progress-comparison-table">
            <thead><tr><th>${headers[0]}</th><th></th><th>${headers[2]}</th></tr></thead>
            <tbody>${tableRows}</tbody>
        </table>
    </div>
`;
}

function renderInitialComparisonTab() {
    const modalContent = _d.modalContent;
    const container = modalContent.querySelector('#initial-view');
    if (!container) return;

    const { data, headers } = calculateInitialComparison();

    if (data.length === 0) {
        container.innerHTML = `<p class="placeholder">${translate('reportNeedTwoRecords')}</p>`;
        return;
    }

    let tableRows = data.map(item => {
        let changeText = '-';
        let changeClass = '';
        if (item.change !== null && !isNaN(item.change)) {
            const roundedChange = parseFloat(item.change.toFixed(1));
            if (roundedChange > 0) {
                changeText = `+${roundedChange}`;
                changeClass = 'positive-change';
            } else {
                changeText = `${roundedChange}`;
                if (roundedChange < 0) changeClass = 'negative-change';
            }
        }
        return `
        <tr>
            <td>${translate(item.key)}</td>
            ${createProgressBarHTML(item)}
            <td class="${changeClass}">${changeText}</td>
        </tr>
    `;
    }).join('');

    container.innerHTML = `
    <div class="table-responsive">
        <table class="comparison-table progress-comparison-table">
             <thead><tr><th>${headers[0]}</th><th></th><th>${headers[2]}</th></tr></thead>
            <tbody>${tableRows}</tbody>
        </table>
    </div>
`;
}

export function closeAllModalsVisually() {
    return _d.modalSystem.closeAllModalsVisually();
}
