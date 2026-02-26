/**
 * chart-zoom.js
 * Standalone zoom state + controls for Chart.js instances.
 *
 * Exports:
 *   chartZoomState              — Map<chartId, zoomLevel (0–4)>
 *   ensureChartWrapperContainer — Wrap chart element in .chart-wrapper-container
 *   applyChartZoom              — Apply scroll/size based on current zoom level
 *   ensureChartZoomControls     — Create/update +/− zoom buttons
 */

/** Global zoom level store keyed by chartId string. Level 0 = most zoomed in, 4 = fit. */
export const chartZoomState = new Map();

const ZOOM_MAX = 4;
const STEP_WIDTHS = [70, 60, 50, 40]; // px per data point per zoom level (0→3)

/**
 * Ensure `wrapper` is inside a `.chart-wrapper-container` div.
 * Creates and inserts the container if not already present.
 * @param {HTMLElement} wrapper
 * @returns {HTMLElement} The container element.
 */
export function ensureChartWrapperContainer(wrapper) {
  if (!wrapper) return wrapper;
  const parent = wrapper.parentElement;
  if (!parent) return wrapper;
  if (parent.classList.contains('chart-wrapper-container')) return parent;

  const container = document.createElement('div');
  container.className = 'chart-wrapper-container';
  parent.insertBefore(container, wrapper);
  container.appendChild(wrapper);
  return container;
}

/**
 * Apply horizontal scroll zoom to the chart based on current state.
 *
 * @param {import('chart.js').Chart} chartInstance
 * @param {HTMLElement} wrapper    — scrollable outer element
 * @param {HTMLElement} inner      — sized inner element (canvas container)
 * @param {number}      pointCount — number of data points on X axis
 * @param {string}      chartId    — key in chartZoomState
 */
export function applyChartZoom(chartInstance, wrapper, inner, pointCount, chartId) {
  if (!wrapper || !inner || !chartInstance) return;

  const level = _getLevel(chartId);
  const wrapperWidth = wrapper.clientWidth || 0;
  const availableWidth = Math.max(0, wrapperWidth - 20);

  if (level >= ZOOM_MAX || pointCount <= 1) {
    // Fully zoomed out: fit everything in container
    wrapper.style.overflowX = 'hidden';
    wrapper.style.overflowY = 'hidden';
    inner.style.width = '100%';
  } else {
    const pointWidth = STEP_WIDTHS[level] ?? STEP_WIDTHS[0];
    const neededWidth = pointCount * pointWidth;

    if (neededWidth > availableWidth && availableWidth > 0) {
      wrapper.style.overflowX = 'auto';
      wrapper.style.overflowY = 'hidden';
      inner.style.width = `${neededWidth}px`;
    } else {
      // Content fits — no scroll needed
      wrapper.style.overflowX = 'hidden';
      wrapper.style.overflowY = 'hidden';
      inner.style.width = '100%';
    }
  }

  // At level >= 3 hide point dots and X tick labels to reduce clutter
  const hideDetails = level >= 3;
  chartInstance.data.datasets.forEach((ds) => {
    ds.pointRadius = hideDetails ? 0 : 4;
    ds.pointHoverRadius = hideDetails ? 0 : 6;
  });
  if (chartInstance.options?.scales?.x?.ticks) {
    chartInstance.options.scales.x.ticks.display = !hideDetails;
  }
  // Guard: skip update if canvas was destroyed
  if (!chartInstance.canvas || !chartInstance.ctx) return;
  try {
    chartInstance.update('none');
  } catch (e) {
    console.warn('[ChartZoom] update skipped — chart may be destroyed:', e.message);
  }
}

/**
 * Create (or refresh) the +/− zoom control buttons inside the chart container.
 * Buttons are appended to `container` (the `.chart-wrapper-container`).
 * Attaches click handlers only once (guarded by a WeakSet flag).
 *
 * @param {import('chart.js').Chart} chartInstance
 * @param {HTMLElement} wrapper    — scrollable outer element (for stale-control cleanup)
 * @param {HTMLElement} inner      — sized inner element
 * @param {number}      pointCount
 * @param {string}      chartId
 */
export function ensureChartZoomControls(chartInstance, wrapper, inner, pointCount, chartId) {
  if (!wrapper) return;
  const container = wrapper.parentElement?.classList.contains('chart-wrapper-container')
    ? wrapper.parentElement
    : wrapper;

  // Remove any controls accidentally placed inside wrapper (legacy position)
  const stale = wrapper.querySelector('.chart-zoom-controls');
  if (stale) stale.remove();

  let controls = container.querySelector('.chart-zoom-controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.className = 'chart-zoom-controls';
    controls.innerHTML = `
      <button type="button" class="chart-zoom-btn zoom-in" aria-label="Zoom in">+</button>
      <button type="button" class="chart-zoom-btn zoom-out" aria-label="Zoom out">−</button>
    `;
    container.appendChild(controls);
  }

  const updateButtons = () => {
    const level = _getLevel(chartId);
    const inBtn = controls.querySelector('.zoom-in');
    const outBtn = controls.querySelector('.zoom-out');
    if (inBtn) inBtn.disabled = level <= 0;
    if (outBtn) outBtn.disabled = level >= ZOOM_MAX;
  };

  updateButtons();

  // Attach click handler only once per controls element
  if (_boundControls.has(controls)) return;
  _boundControls.add(controls);

  controls.addEventListener('click', (e) => {
    const btn = e.target.closest('.chart-zoom-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const delta = btn.classList.contains('zoom-out') ? 1 : -1;
    const next = Math.max(0, Math.min(ZOOM_MAX, _getLevel(chartId) + delta));
    chartZoomState.set(chartId, next);

    applyChartZoom(chartInstance, wrapper, inner, pointCount, chartId);
    updateButtons();
  }, { passive: false });
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/** @type {WeakSet<HTMLElement>} */
const _boundControls = new WeakSet();

function _getLevel(chartId) {
  const v = chartZoomState.get(chartId);
  return Math.max(0, Math.min(ZOOM_MAX, Number.isFinite(v) ? v : ZOOM_MAX));
}
