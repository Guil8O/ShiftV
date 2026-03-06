/**
 * Chart Renderer — chart selector UI + Chart.js rendering
 * Extracted from script.js Phase 3
 */
import { translate } from '../translations.js';
import { getCSSVar as getCssVar } from '../utils.js';

/* ── dependency injection ── */
let _d;
export function initChartRenderer(deps) { _d = deps; }

export const metricButtonColors = {};

// 미리 정의된 색상 팔레트 (다크/라이트 모드 최적화)
const colorPalette = {
    dark: {
        active: [
            '#FF6B9D', '#FF8C69', '#FFAA44', '#FFD93D', '#A8E855',
            '#4ADE80', '#34D399', '#36CFC9', '#22D3EE', '#60A5FA',
            '#818CF8', '#A78BFA', '#C084FC', '#E879F9', '#F472B6'
        ],
        inactive: [
            '#FF6B9D', '#FF8C69', '#FFAA44', '#FFD93D', '#A8E855',
            '#4ADE80', '#34D399', '#36CFC9', '#22D3EE', '#60A5FA',
            '#818CF8', '#A78BFA', '#C084FC', '#E879F9', '#F472B6'
        ]
    },
    light: {
        active: [
            '#E91E63', '#FF5722', '#FF9800', '#FFC107', '#8BC34A',
            '#4CAF50', '#009688', '#00BCD4', '#03A9F4', '#2196F3',
            '#3F51B5', '#673AB7', '#9C27B0', '#E91E63', '#F06292'
        ],
        inactive: [
            '#E91E63', '#FF5722', '#FF9800', '#FFC107', '#8BC34A',
            '#4CAF50', '#009688', '#00BCD4', '#03A9F4', '#2196F3',
            '#3F51B5', '#673AB7', '#9C27B0', '#E91E63', '#F06292'
        ]
    }
};

export function renderChartSelector() {
    const { selectedMetrics, getFilteredChartKeys, saveSettingsToStorage } = _d;
    const chartSelector = document.getElementById('chart-selector');
    if (!chartSelector) return;
    const availableKeys = getFilteredChartKeys();
    chartSelector.innerHTML = '';
    const isDarkMode = document.body.classList.contains('dark-mode');
    const palette = isDarkMode ? colorPalette.dark : colorPalette.light;

    availableKeys.forEach((key, index) => {
        const button = document.createElement('button');
        button.classList.add('chart-metric-button');
        if (selectedMetrics.includes(key)) {
            button.classList.add('active');
        }
        const colorIndex = index % palette.active.length;
        const activeColor = palette.active[colorIndex];
        metricButtonColors[key] = activeColor;

        if (selectedMetrics.includes(key)) {
            button.style.backgroundColor = activeColor;
            button.style.color = '#FFFFFF';
            button.style.borderColor = activeColor;
        }

        button.textContent = translate(key).split('(')[0].trim();
        button.dataset.metric = key;
        chartSelector.appendChild(button);
    });
}

export function handleChartSelectorClick(event) {
    const { getFilteredChartKeys, saveSettingsToStorage } = _d;
    let selectedMetrics = _d.selectedMetrics;
    const button = event.target.closest('.chart-metric-button');
    if (!button) return;
    const metric = button.dataset.metric;
    if (!metric) return;

    if (selectedMetrics.includes(metric)) {
        _d.selectedMetrics = selectedMetrics.filter(m => m !== metric);
    } else {
        selectedMetrics.push(metric);
    }
    saveSettingsToStorage();
    renderChartSelector();
    renderChart().catch(e => console.error('Chart render error:', e));
}

export function handleSelectAllCharts() {
    const { getFilteredChartKeys, saveSettingsToStorage } = _d;
    _d.selectedMetrics = [...getFilteredChartKeys()];
    renderChartSelector(); saveSettingsToStorage(); renderChart().catch(e => console.error('Chart render error:', e));
}

export function handleDeselectAllCharts() {
    const { saveSettingsToStorage } = _d;
    _d.selectedMetrics = [];
    renderChartSelector(); saveSettingsToStorage(); renderChart().catch(e => console.error('Chart render error:', e));
}

export async function renderChart() {
    const { measurements, targets, getFilteredChartKeys, formatValue, loadChartJS, ensureAverageLinePluginRegistered, bodySizeKeys } = _d;
    let selectedMetrics = _d.selectedMetrics;
    let chartInstance = _d.chartInstance;
    const chartCanvas = document.getElementById('chart-canvas');
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext('2d'); if (!ctx) return;
    const metricsToRender = selectedMetrics.filter(key => getFilteredChartKeys().includes(key));
    if (measurements.length < 1 || metricsToRender.length === 0) {
        if (chartInstance) { chartInstance.destroy(); _d.chartInstance = null; }
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        const x = chartCanvas.width / 2;
        const y = chartCanvas.height / 2;
        ctx.font = '16px "Pretendard Variable", sans-serif';
        ctx.fillStyle = getCssVar('--md-sys-color-on-surface-variant');
        ctx.textAlign = 'center';
        ctx.fillText(translate('noDataYet'), x, y);
        return;
    }

  try {
    await loadChartJS();
    await ensureAverageLinePluginRegistered();

    const sorted = [...measurements].sort((a, b) => (a.week || 0) - (b.week || 0));
    const labels = sorted.map(m => `${translate('week')} ${m.week}`);
    const isDarkMode = document.body.classList.contains('dark-mode');
    const palette = isDarkMode ? colorPalette.dark : colorPalette.light;

    const datasets = metricsToRender.map((key, index) => {
        const data = sorted.map(m => parseFloat(m[key]) || null);
        const colorIdx = Object.keys(metricButtonColors).indexOf(key);
        const color = palette.active[colorIdx >= 0 ? colorIdx % palette.active.length : index % palette.active.length];
        metricButtonColors[key] = color;

        const hasTarget = targets && targets[key] !== undefined && targets[key] !== null && targets[key] !== '';
        const targetValue = hasTarget ? parseFloat(targets[key]) : null;

        const dataset = {
            label: translate(key).split('(')[0].trim(),
            data: data,
            borderColor: color,
            backgroundColor: color + '33',
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 7,
            borderWidth: 2,
            fill: false,
            spanGaps: true,
            _originalKey: key,
        };

        if (hasTarget && !isNaN(targetValue)) {
            dataset._targetValue = targetValue;
            dataset._targetColor = color;
        }

        return dataset;
    });

    if (chartInstance) chartInstance.destroy();
    chartInstance = new window.Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 30 } },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 12,
                        color: getCssVar('--md-sys-color-on-surface'),
                        font: { size: 11, family: '"Pretendard Variable", sans-serif' },
                        boxWidth: 8,
                    }
                },
                tooltip: {
                    mode: 'nearest',
                    intersect: false,
                    backgroundColor: getCssVar('--md-sys-color-surface-container-high'),
                    titleColor: getCssVar('--md-sys-color-on-surface'),
                    bodyColor: getCssVar('--md-sys-color-on-surface-variant'),
                    borderColor: getCssVar('--md-sys-color-outline-variant'),
                    borderWidth: 1,
                    cornerRadius: 12,
                    padding: 10,
                    titleFont: { size: 13, weight: '600', family: '"Pretendard Variable", sans-serif' },
                    bodyFont: { size: 12, family: '"Pretendard Variable", sans-serif' },
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                const originalKey = context.dataset._originalKey || '';
                                label += formatValue(context.parsed.y, originalKey);
                                let displayUnit = '';
                                if (originalKey.includes('Percentage')) displayUnit = '%';
                                else if (originalKey === 'weight' || originalKey === 'muscleMass') displayUnit = translate('unitKg');
                                else if (bodySizeKeys.includes(originalKey)) displayUnit = translate('unitCm');
                                if (displayUnit) label += ` ${displayUnit}`;
                            } else { label += '-'; }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: getCssVar('--md-sys-color-on-surface-variant'),
                        font: { size: 10, family: '"Pretendard Variable", sans-serif' }
                    },
                    grid: { color: getCssVar('--md-sys-color-outline-variant') + '33' }
                },
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: getCssVar('--md-sys-color-on-surface-variant'),
                        font: { size: 10, family: '"Pretendard Variable", sans-serif' }
                    },
                    grid: { color: getCssVar('--md-sys-color-outline-variant') + '33' }
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
    _d.chartInstance = chartInstance;
  } catch (e) {
    console.error('renderChart error:', e);
  }
}
