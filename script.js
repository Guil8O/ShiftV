/**
 * ShiftV Main Application
 * @module script
 */

// --- Module Imports ---
import { languages, translate as _translate, setCurrentLanguage, getCurrentLanguage, parseIconPatterns } from './src/translations.js';
import { chartZoomState, ensureChartWrapperContainer, applyChartZoom, ensureChartZoomControls } from './src/ui/chart-zoom.js';
import { UNIT_CONVERSIONS, convertToStandard, convertFromStandard } from './src/utils/unit-conversion.js';
import { renderPersonaCard as _svRenderPersonaCard } from './src/ui/components/sv-cards.js';
import { PRESET_HEX, getAccentHex, resolveTheme, applyDocumentTheme } from './src/utils/theme-manager.js';
import {
    updateFormTitle as _updateFormTitle,
    updatePlaceholders as _updatePlaceholders,
    renderNextMeasurementInfo as _renderNextMeasurementInfo,
} from './src/ui/tabs/record-tab-helpers.js';
import { initRouter, navigateToTab } from './src/core/router.js';
import { createModalSystem } from './src/ui/modal-system.js';
import { initSvTab, renderSvTab, renderQuestCard } from './src/ui/tabs/sv-tab.js';
import { initHormoneReport, calculateAdvancedHormoneAnalytics, renderHormoneReport } from './src/ui/hormone-report.js';
import { initMyTab, renderMyHistoryView, renderHistoryTable, renderAllComparisonTables, buildMedicationChipRow, buildSymptomChipRow, calculatePrevWeekComparison, calculateInitialComparison, calculateTargetComparison, createProgressBarHTML } from './src/ui/tabs/my-tab.js';
import { initChartRenderer, renderChartSelector, renderChart, handleChartSelectorClick, handleSelectAllCharts, handleDeselectAllCharts, metricButtonColors } from './src/ui/chart-renderer.js';
import { initComparisonAnalysis, openComparisonModal, handleComparisonFilterClick, renderComparisonFilters, renderComparisonChart, renderDetailedAnalysisView, renderComparativeAnalysisView, handleModalTabSwitch, handleTargetModalTabSwitch, closeAllModalsVisually } from './src/ui/modals/comparison-analysis.js';
import { initRecordForm, handleFormSubmit, handleDeleteMeasurement, handleEditClick, cancelEdit, resetFormState } from './src/ui/tabs/record-form.js';
import { initSettingsHandlers, handleTargetFormSubmit, handleLanguageChange, handleModeChange, handleResetData, exportMeasurementData, exportCSV, importMeasurementData, activateTab, setupTargetInputs, handleCheckForUpdates, handleNotificationToggle, setupSubscriptionHandlers } from './src/ui/tabs/settings-handlers.js';
import * as dataManager from './src/core/data-manager.js';
import { initPremium, canUseFeature, recordFeatureUse, getPlan, isPremium } from './src/premium/premium-manager.js';
import { showPaywall } from './src/premium/paywall-modal.js';
import { PRIMARY_DATA_KEY, SETTINGS_KEY, BODY_SIZE_KEYS as bodySizeKeys } from './src/constants.js';
import { isIOS, getCSSVar as getCssVar, normalizeSymptomsArray, symptomsSignature } from './src/utils.js';
import { svgIcon, replaceMaterialIcons } from './src/ui/icon-paths.js';

const APP_VERSION = "2.0.0a"; // 버전 업데이트

// ── Photo compression & storage helpers ──────────────────────────────
async function processAndStorePhotos(pendingPhotos) {
    if (!pendingPhotos || typeof pendingPhotos !== 'object') return null;
    const photos = {};
    for (const [category, file] of Object.entries(pendingPhotos)) {
        if (!file) continue;
        try {
            // Compress via canvas (no external lib needed for quick inline)
            const dataUrl = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const MAX = 600;
                    let w = img.width, h = img.height;
                    if (w > MAX || h > MAX) {
                        const ratio = Math.min(MAX / w, MAX / h);
                        w = Math.round(w * ratio);
                        h = Math.round(h * ratio);
                    }
                    const c = document.createElement('canvas');
                    c.width = w; c.height = h;
                    c.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(c.toDataURL('image/webp', 0.65));
                };
                img.onerror = reject;
                const reader = new FileReader();
                reader.onload = e => { img.src = e.target.result; };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            photos[category] = dataUrl;
            console.log(`[Photo] Compressed ${category}: ${(dataUrl.length / 1024).toFixed(0)}KB`);
        } catch (err) {
            console.error(`[Photo] Failed to process ${category}:`, err);
        }
    }
    return Object.keys(photos).length > 0 ? photos : null;
}

// ── Lazy-load Chart.js on demand (not at page load) ──────────────────
let _chartJsLoaded = typeof Chart !== 'undefined';
let _chartJsLoadingPromise = null;
function loadChartJS() {
    if (_chartJsLoaded) return Promise.resolve();
    if (_chartJsLoadingPromise) return _chartJsLoadingPromise;
    _chartJsLoadingPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        s.onload = () => { _chartJsLoaded = true; _chartJsLoadingPromise = null; resolve(); };
        s.onerror = () => { _chartJsLoadingPromise = null; reject(new Error('Failed to load chart.js')); };
        document.head.appendChild(s);
    });
    return _chartJsLoadingPromise;
}
window.loadChartJS = loadChartJS;

// ── Preload Chart.js & heavy modules during idle time ────────────────
const _preloadOnIdle = () => {
    // Preload Chart.js from CDN (will be cached by service worker)
    loadChartJS().catch(() => {});
    // Preload the Body Briefing modal module (triggers download of all doctor-module deps)
    import('./src/ui/modals/body-briefing-modal.js').catch(() => {});
};
if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(_preloadOnIdle, { timeout: 5000 });
} else {
    setTimeout(_preloadOnIdle, 3000);
}

// Global Error Handler
window.onerror = function (message, source, lineno, colno, error) {
    console.error("[Error] Global Error:", message, "\nFile:", source, `\nLine:${lineno}:${colno}`, "\nError Obj:", error);
    const errorMessage = typeof _translate === 'function'
        ? _translate('unexpectedError', { message: message })
        : `An unexpected error occurred. Check console (F12).\nError: ${message}`;
    alert(errorMessage);
};

// Unhandled Promise Rejection Handler
window.onunhandledrejection = function (event) {
    const reason = event.reason;
    // Suppress known Firebase SDK internal assertion after popup close
    if (reason?.message?.includes('INTERNAL ASSERTION FAILED')) {
        event.preventDefault();
        return;
    }
    const message = reason?.message || String(reason);
    console.error("[Error] Unhandled promise rejection:", reason);
};

function ensureAverageLinePluginRegistered() {
    if (typeof Chart === 'undefined') return;
    const pluginId = 'shiftvAverageLines';
    const alreadyRegistered = Chart?.registry?.plugins?.get?.(pluginId);
    if (alreadyRegistered) return;

    Chart.register({
        id: pluginId,
        afterDatasetsDraw(chart) {
            const yScale = Object.values(chart.scales || {}).find(s => s?.axis === 'y') || chart.scales?.y;
            if (!yScale) return;
            const { ctx, chartArea } = chart;
            if (!ctx || !chartArea) return;

            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                if (!meta || !chart.isDatasetVisible(datasetIndex)) return;

                const targetValue = Number(dataset?._targetValue);
                if (!Number.isFinite(targetValue)) return;
                const y = yScale.getPixelForValue(targetValue);
                if (!Number.isFinite(y)) return;

                ctx.save();
                ctx.setLineDash([6, 4]);
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = dataset.borderColor || 'rgba(255,255,255,0.6)';
                ctx.globalAlpha = 0.6;

                ctx.beginPath();
                ctx.moveTo(chartArea.left, y);
                ctx.lineTo(chartArea.right, y);
                ctx.stroke();

                ctx.restore();
            });
        }
    });
}

// normalizeSymptomsArray, symptomsSignature → imported from src/utils.js

function syncModuleLanguage(lang) {
    setCurrentLanguage(lang);
}

function populateMedicationAutocomplete() {
    const datalist = document.getElementById('medication-suggestions');
    if (!datalist || !window.ShiftV_MedDB) {
        // Retry once if DB not loaded yet
        if (!window.ShiftV_MedDB) {
            setTimeout(populateMedicationAutocomplete, 1000);
        }
        return;
    }

    const allMeds = [];
    const db = window.ShiftV_MedDB;

    const extract = (list) => {
        if (Array.isArray(list)) {
            list.forEach(item => {
                if (item.names) allMeds.push(...item.names);
            });
        }
    };

    if (db.ESTROGENS) {
        extract(db.ESTROGENS.oral);
        extract(db.ESTROGENS.transdermal);
        extract(db.ESTROGENS.injectable);
    }
    extract(db.ANTI_ANDROGENS);
    if (db.TESTOSTERONE) {
        extract(db.TESTOSTERONE.longActing);
        extract(db.TESTOSTERONE.mediumActing);
        extract(db.TESTOSTERONE.topical);
    }
    if (db.SERM_AND_AI) {
        extract(db.SERM_AND_AI.serm);
    }

    const uniqueNames = [...new Set(allMeds)].sort();
    datalist.innerHTML = uniqueNames.map(name => `<option value="${escapeHTML(name)}">`).join('');
    console.log("Autocomplete populated with " + uniqueNames.length + " items.");
}

// ── PWA Install Prompt ──────────────────────────────────────────────
let _deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredInstallPrompt = e;
    // 설치 가능 → 설정 탭에 설치 버튼 표시
    const section = document.getElementById('pwa-install-section');
    if (section) section.style.display = '';
});
window.addEventListener('appinstalled', () => {
    _deferredInstallPrompt = null;
    const section = document.getElementById('pwa-install-section');
    if (section) section.style.display = 'none';
    console.log('[PWA] App installed successfully');
});

// ── Clean up legacy service workers ─────────────────────────────────
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const reg of registrations) {
            // VitePWA의 sw.js는 유지, 레거시 service-worker.js는 제거
            if (reg.active && reg.active.scriptURL.includes('service-worker.js')) {
                reg.unregister().then(() => console.log('[SW] Legacy service-worker.js unregistered'));
            }
        }
    });
}

// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', () => {
    console.log(`DEBUG: ShiftV App Initializing v${APP_VERSION}...`);

    // ── Replace all Material Symbols font icons with inline SVGs ─────
    replaceMaterialIcons(document.body);

    // ── Auto-replace font icons in dynamically added DOM content ──────
    const iconObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.nodeType === 1) replaceMaterialIcons(node);
            }
        }
    });
    iconObserver.observe(document.body, { childList: true, subtree: true });

    // ── 화면 회전 잠금 (PWA/fullscreen) ──────────────────────────────
    try {
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
            screen.orientation.lock('portrait').catch(() => {
                // lock()은 fullscreen 모드에서만 작동 — 일반 브라우저에선 무시
            });
        }
    } catch (e) { /* Screen Orientation API 미지원 */ }

    // ── Inline SVG logo for theme tinting ─────────────────────────────
    (async () => {
        try {
            const res = await fetch('assets/title.svg', { signal: AbortSignal.timeout(3000) });
            if (!res.ok) return;
            const svgText = await res.text();
            const container = document.getElementById('app-bar-logo-svg');
            if (container) {
                container.innerHTML = svgText;
                // Hide static PNGs once SVG is loaded
                document.querySelectorAll('.app-bar-logo--dark, .app-bar-logo--light').forEach(el => { el.style.display = 'none'; });
                container.style.display = 'flex';
            }
        } catch (e) { /* SVG unavailable – fallback PNGs remain */ }
    })();

    // ── Notification Panel System ──────────────────────────────────────
    const NOTIF_KEY = 'shiftV_notifications_v1';
    let _notifications = [];
    try { _notifications = JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); } catch { _notifications = []; }

    function saveNotifications() {
        try { localStorage.setItem(NOTIF_KEY, JSON.stringify(_notifications.slice(0, 100))); } catch { }
    }

    function addNotification({ type = 'measurement', title = '', body = '', time = Date.now() } = {}) {
        _notifications.unshift({ id: `${Date.now()}-${Math.random()}`, type, title, body, time, read: false });
        saveNotifications();
        renderNotificationPanel();
    }
    window.addNotification = addNotification; // expose for other modules

    function renderNotificationPanel() {
        const listEl = document.getElementById('notif-list');
        const badge = document.getElementById('notif-badge');
        if (!listEl) return;

        const unread = _notifications.filter(n => !n.read).length;
        if (badge) {
            badge.style.display = unread > 0 ? '' : 'none';
            badge.textContent = unread > 9 ? '9+' : String(unread);
        }

        if (_notifications.length === 0) {
            listEl.innerHTML = '<div class="notif-empty">새 알림이 없어요</div>';
            return;
        }

        const typeInfo = {
            measurement: { icon: 'straighten', cls: 'notif-icon--measurement', label: translate('notifTypeMeasurement') },
            diary: { icon: 'book', cls: 'notif-icon--diary', label: translate('notifTypeDiary') },
            quest: { icon: 'emoji_events', cls: 'notif-icon--quest', label: translate('notifTypeQuest') },
            health: { icon: 'favorite', cls: 'notif-icon--health', label: translate('notifTypeHealth') },
            goal: { icon: 'flag', cls: 'notif-icon--goal', label: translate('notifTypeGoal') },
        };

        const timeAgo = ts => {
            const diff = Date.now() - ts;
            const m = Math.floor(diff / 60000);
            if (m < 1) return translate('timeJustNow');
            if (m < 60) return translate('timeMinutesAgo', { m });
            const h = Math.floor(m / 60);
            if (h < 24) return translate('timeHoursAgo', { h });
            return translate('timeDaysAgo', { d: Math.floor(h / 24) });
        };

        listEl.innerHTML = _notifications.map(n => {
            const info = typeInfo[n.type] || typeInfo.measurement;
            return `<div class="notif-item${n.read ? '' : ' unread'}" data-id="${n.id}" onclick="(function(el){const id=el.dataset.id;window._markNotifRead(id);})(this)">
                <div class="notif-icon ${info.cls}">
                    ${svgIcon(info.icon)}
                </div>
                <div class="notif-content">
                    <div class="notif-title">${escapeHTML(n.title)}</div>
                    <div class="notif-body">${escapeHTML(n.body)}</div>
                </div>
                <span class="notif-time">${timeAgo(n.time)}</span>
            </div>`;
        }).join('');
    }

    window._markNotifRead = (id) => {
        const n = _notifications.find(x => x.id === id);
        if (n) { n.read = true; saveNotifications(); renderNotificationPanel(); }
    };

    const btnNotif = document.getElementById('btn-notifications');
    const notifPanel = document.getElementById('notification-panel');
    const notifBackdrop = document.getElementById('notif-backdrop');
    const notifClose = document.getElementById('notif-panel-close');
    const notifClearAll = document.getElementById('notif-clear-all');

    function openNotifPanel() {
        notifPanel?.classList.add('open');
        notifBackdrop?.classList.add('visible');
        notifPanel?.setAttribute('aria-hidden', 'false');
        document.body.classList.add('notif-panel-open');
        // Mark all as read after 1s
        setTimeout(() => {
            _notifications.forEach(n => n.read = true);
            saveNotifications();
            renderNotificationPanel();
        }, 1200);
    }
    function closeNotifPanel() {
        notifPanel?.classList.remove('open');
        notifBackdrop?.classList.remove('visible');
        notifPanel?.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('notif-panel-open');
    }

    btnNotif?.addEventListener('click', () => {
        if (notifPanel?.classList.contains('open')) closeNotifPanel();
        else openNotifPanel();
    });
    notifClose?.addEventListener('click', closeNotifPanel);
    notifBackdrop?.addEventListener('click', closeNotifPanel);
    notifClearAll?.addEventListener('click', () => { _notifications = []; saveNotifications(); renderNotificationPanel(); });

    // NOTE: renderNotificationPanel() is deferred to after state variables
    // because translate() requires currentLanguage (TDZ if called here).

    // --- State Variables ---
    // PRIMARY_DATA_KEY, SETTINGS_KEY → imported from src/constants.js
    let chartInstance = null;
    let medicationChartInstance = null;
    let hormoneChartInstance = null;
    let comparisonChartInstance = null; // 이 줄 추가
    let activeComparisonFilters = ['weight'];
    let measurements = [];
    let targets = {};
    let notes = []; // Legacy notes - will be phased out
    let selectedMetrics = ['weight'];
    let currentLanguage = 'ko';
    let currentMode = 'mtf';
    let isInitialSetupDone = false;
    let currentTheme = 'system';
    let resizeDebounceTimer;
    let activeHistoryFilters = [];
    let notificationEnabled = false;
    let activeModalTab = 'detailed-analysis';
    let biologicalSex = 'male';

    // Deferred from the notification section above (needs currentLanguage)
    renderNotificationPanel();

    // --- DOM Element References ---
    const bodyElement = document.body;
    const tabBar = document.querySelector('.tab-bar');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const appBar = document.querySelector('.app-bar');
    const savePopup = document.getElementById('save-popup');
    const versionDisplays = document.querySelectorAll('#app-version-display, #app-version-display-footer');
    const modalOverlay = document.getElementById('modal-bottom-sheet-overlay');
    const modalSheet = document.getElementById('modal-bottom-sheet');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const notificationToggle = document.getElementById('notification-toggle');

    const menstruationActiveInput = document.getElementById('menstruationActive');
    const menstruationPainInput = document.getElementById('menstruationPain');
    const menstruationPainValue = document.getElementById('menstruationPainValue');
    const menstruationPainGroup = document.getElementById('menstruation-pain-group');
    if (menstruationPainInput && menstruationPainValue) {
        menstruationPainInput.addEventListener('input', () => {
            menstruationPainValue.textContent = menstruationPainInput.value;
        });
    }
    if (menstruationActiveInput && menstruationPainGroup) {
        menstruationActiveInput.addEventListener('change', () => {
            menstruationPainGroup.style.display = menstruationActiveInput.checked ? 'block' : 'none';
        });
    }

    // Handle Unit Selects Persistence
    document.querySelectorAll('.unit-select').forEach(select => {
        const persistKey = select.dataset.persist;
        if (persistKey) {
            // Load saved unit
            const savedUnit = localStorage.getItem('shiftV_' + persistKey);
            if (savedUnit) {
                select.value = savedUnit;
            }

            // Save on change
            select.addEventListener('change', (e) => {
                localStorage.setItem('shiftV_' + persistKey, e.target.value);
            });
        }
    });

    // Populate Medication Autocomplete if needed
    setTimeout(populateMedicationAutocomplete, 500);

    // App Bar scroll behavior
    if (appBar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 8) {
                appBar.classList.add('scrolled');
            } else {
                appBar.classList.remove('scrolled');
            }
        }, { passive: true });
    }

    // History View within My Tab (마이 탭의 기록 뷰) // ▼▼▼ 이 부분 추가 ▼▼▼
    const myHistoryViewContainer = document.getElementById('my-history-view-container');
    const myHistoryCardsContainer = document.getElementById('my-history-cards-container');
    const myHistoryTableContainer = document.getElementById('my-history-table-container');
    const myFilterControls = document.getElementById('my-history-filter-controls');
    // Comparison Modal
    const comparisonModalOverlay = document.getElementById('comparison-modal-overlay');
    const comparisonModalCloseBtn = document.getElementById('comparison-modal-close-btn');
    const hormoneModalOverlay = document.getElementById('hormone-modal-overlay');
    const hormoneModalCloseBtn = document.getElementById('hormone-modal-close-btn');
    const initialSexSelect = document.getElementById('initial-sex-select');
    const sexSelect = document.getElementById('sex-select');

    // Initial Setup (Deprecated)
    const initialSetupPopup = null;
    const initialLanguageSelect = null;
    const initialModeSelect = null;
    const initialSetupSaveBtn = null;

    // Record Tab (기록하기 탭)
    const recordInputView = document.getElementById('record-input-view');
    const form = document.getElementById('measurement-form');
    const formTitle = document.querySelector('#record-input-view #form-title');
    const saveUpdateBtn = document.getElementById('save-update-button');
    const cancelEditBtn = document.getElementById('cancel-edit-button');
    const editIndexInput = document.getElementById('edit-index');
    const nextMeasurementInfoDiv = document.getElementById('next-measurement-info');


    // SV Tab (리포트 탭)
    const svGrid = document.querySelector('.sv-grid');
    const svCardShortcut = document.getElementById('sv-card-shortcut');
    const svCardHighlights = document.getElementById('sv-card-highlights');
    const svCardGuide = document.getElementById('sv-card-guide');
    const svCardTargets = document.getElementById('sv-card-targets');
    const svCardHormones = document.getElementById('sv-card-hormones');
    const svCardDiary = document.getElementById('sv-card-diary');
    const svCardQuest = document.getElementById('sv-card-quest');
    const svCardHealth = document.getElementById('sv-card-health');
    const svCardPersona = document.getElementById('sv-card-persona');

    const prevWeekComparisonContainer = null; // 이제 사용하지 않으므로 null 처리
    const initialComparisonContainer = null;
    const targetComparisonContainer = null;
    const chartCanvas = null;
    const chartSelector = null;
    const selectAllChartsBtn = null;
    const deselectAllChartsBtn = null;

    // Settings Tab (설정 탭) - 목표 설정(Targets)은 이제 설정으로 이동
    const settingsTab = document.getElementById('tab-settings');
    const targetForm = document.getElementById('target-form');
    let targetGrid = targetForm ? targetForm.querySelector('.target-grid') : null;
    const saveTargetsButton = document.getElementById('save-targets-button');
    const exportDataButton = document.getElementById('export-data-button');
    const exportCsvButton = document.getElementById('export-csv-button');
    const importDataButton = document.getElementById('import-data-button');
    const importFileInput = document.getElementById('import-file-input');
    const languageSelect = document.getElementById('language-select');
    const modeSelect = document.getElementById('mode-select');
    const themeSelect = document.getElementById('theme-select');
    const resetDataButton = document.getElementById('reset-data-button');
    const checkForUpdatesButton = document.getElementById('check-for-updates-button');

    // --- Constants for Measurement Keys (Using camelCase) ---
    // bodySizeKeys → imported from src/constants.js (BODY_SIZE_KEYS as bodySizeKeys)
    // healthKeys (사용되지 않아 제거됨)
    const medicationKeys_MtF = [];
    const medicationKeys_FtM = [];
    const baseNumericKeys = [
        'height', 'weight', 'shoulder', 'neck', 'chest', 'underBustCircumference', 'waist', 'hips', 'thigh', 'calf', 'arm',
        'muscleMass', 'bodyFatPercentage', 'libido', 'estrogenLevel', 'testosteroneLevel', 'healthScore',
        'menstruationPain'
    ];
    const textKeys = ['menstruationActive'];
    // displayKeysInOrder를 업데이트합니다. (표시 순서 제어)
    const displayKeysInOrder = [
        'week', 'date',
        'height', 'weight', 'shoulder', 'neck', 'chest', 'underBustCircumference', 'waist', 'hips', 'thigh', 'calf', 'arm',
        'muscleMass', 'bodyFatPercentage', 'libido', 'estrogenLevel', 'testosteroneLevel', 'healthScore',
        'memo', 'menstruationActive', 'menstruationPain',
        'timestamp'
    ];

    // chartSelectableKeys를 업데이트합니다.
    const chartSelectableKeys = baseNumericKeys.filter(k => !k.includes('Score'));

    // targetSettingKeys를 업데이트합니다. (목표 설정 가능 항목)
    const targetSettingKeys = baseNumericKeys.filter(k =>
        bodySizeKeys.includes(k) || ['muscleMass', 'bodyFatPercentage', 'estrogenLevel', 'testosteroneLevel'].includes(k) // 새 키 추가
    ).filter(k => !textKeys.includes(k));

    // comparisonKeys를 업데이트합니다. (리포트 비교 항목)
    const comparisonKeys = [
        'weight', 'muscleMass', 'bodyFatPercentage',
        'shoulder', 'neck', 'chest', 'underBustCircumference', 'waist', 'hips', 'thigh', 'calf', 'arm'
    ];

    // Wire SV tab module with dependencies (functions are hoisted; state via getters)
    initSvTab({
        get measurements() { return measurements; },
        get targets() { return targets; },
        get currentMode() { return currentMode; },
        get biologicalSex() { return biologicalSex; },
        comparisonKeys,
        formatValue,
        escapeHTML,
        toLocalDayIndex,
        getMeasurementBaseDate,
        calculateAdvancedHormoneAnalytics,
        addNotification,
        _svRenderPersonaCard,
    });

    // Wire hormone report module with dependencies
    initHormoneReport({
        get measurements() { return measurements; },
        get targets() { return targets; },
        get currentMode() { return currentMode; },
        get biologicalSex() { return biologicalSex; },
        get medicationChartInstance() { return medicationChartInstance; },
        set medicationChartInstance(v) { medicationChartInstance = v; },
        get hormoneChartInstance() { return hormoneChartInstance; },
        set hormoneChartInstance(v) { hormoneChartInstance = v; },
        get medicationNameMap() { return medicationNameMap; },
        formatValue,
        getFilteredDisplayKeys,
        ensureMedicationNameMap,
        loadChartJS,
        ensureAverageLinePluginRegistered,
    });

    initMyTab({
        get measurements() { return measurements; },
        get targets() { return targets; },
        get currentMode() { return currentMode; },
        get activeHistoryFilters() { return activeHistoryFilters; },
        get chartSelectableKeys() { return chartSelectableKeys; },
        get medicationKeys_MtF() { return medicationKeys_MtF; },
        get medicationKeys_FtM() { return medicationKeys_FtM; },
        get targetSettingKeys() { return targetSettingKeys; },
        get legacyKeysToHideInTables() { return legacyKeysToHideInTables; },
        get medicationNameMap() { return medicationNameMap; },
        get symptomLabelMap() { return symptomLabelMap; },
        getFilteredDisplayKeys,
        formatValue,
        formatTimestamp,
        clearElement,
        escapeHTML,
        ensureMedicationNameMap,
        ensureSymptomLabelMap,
    });

    initChartRenderer({
        get measurements() { return measurements; },
        get targets() { return targets; },
        get selectedMetrics() { return selectedMetrics; },
        set selectedMetrics(v) { selectedMetrics = v; },
        get chartInstance() { return chartInstance; },
        set chartInstance(v) { chartInstance = v; },
        get bodySizeKeys() { return bodySizeKeys; },
        getFilteredChartKeys,
        formatValue,
        saveSettingsToStorage,
        loadChartJS,
        ensureAverageLinePluginRegistered,
    });

    initComparisonAnalysis({
        get measurements() { return measurements; },
        get targets() { return targets; },
        get currentMode() { return currentMode; },
        get currentLanguage() { return currentLanguage; },
        get biologicalSex() { return biologicalSex; },
        get activeComparisonFilters() { return activeComparisonFilters; },
        set activeComparisonFilters(v) { activeComparisonFilters = v; },
        get comparisonChartInstance() { return comparisonChartInstance; },
        set comparisonChartInstance(v) { comparisonChartInstance = v; },
        get activeModalTab() { return activeModalTab; },
        set activeModalTab(v) { activeModalTab = v; },
        get modalContent() { return modalContent; },
        get modalSystem() { return modalSystem; },
        openModal,
        formatValue,
        formatTimestamp,
        getFilteredDisplayKeys,
        getFilteredChartKeys,
        getMetricColor,
        loadChartJS,
        ensureAverageLinePluginRegistered,
    });

    initRecordForm({
        get measurements() { return measurements; },
        get form() { return form; },
        get editIndexInput() { return editIndexInput; },
        get saveUpdateBtn() { return saveUpdateBtn; },
        get cancelEditBtn() { return cancelEditBtn; },
        get baseNumericKeys() { return baseNumericKeys; },
        get textKeys() { return textKeys; },
        getUnitHealthEvaluator,
        processAndStorePhotos,
        showPopup,
        savePrimaryDataToStorage,
        renderAll,
        applyModeToUI,
        updateFormTitle,
        updatePlaceholders,
        navigateToTab,
        addNotification,
        formatTimestamp,
        calculateAndAddWeekNumbers,
    });

    initSettingsHandlers({
        get measurements() { return measurements; },
        set measurements(v) { measurements = v; },
        get targets() { return targets; },
        set targets(v) { targets = v; },
        get notes() { return notes; },
        set notes(v) { notes = v; },
        get currentLanguage() { return currentLanguage; },
        set currentLanguage(v) { currentLanguage = v; },
        get currentMode() { return currentMode; },
        set currentMode(v) { currentMode = v; },
        get currentTheme() { return currentTheme; },
        set currentTheme(v) { currentTheme = v; },
        get biologicalSex() { return biologicalSex; },
        set biologicalSex(v) { biologicalSex = v; },
        get selectedMetrics() { return selectedMetrics; },
        set selectedMetrics(v) { selectedMetrics = v; },
        get isInitialSetupDone() { return isInitialSetupDone; },
        set isInitialSetupDone(v) { isInitialSetupDone = v; },
        get symptomLabelMap() { return symptomLabelMap; },
        set symptomLabelMap(v) { symptomLabelMap = v; },
        get symptomLabelMapPromise() { return symptomLabelMapPromise; },
        set symptomLabelMapPromise(v) { symptomLabelMapPromise = v; },
        get medicationNameMap() { return medicationNameMap; },
        set medicationNameMap(v) { medicationNameMap = v; },
        get medicationNameMapPromise() { return medicationNameMapPromise; },
        set medicationNameMapPromise(v) { medicationNameMapPromise = v; },
        get targetSettingKeys() { return targetSettingKeys; },
        APP_VERSION,
        getUnitHealthEvaluator,
        showPopup,
        navigateToTab,
        savePrimaryDataToStorage,
        saveSettingsToStorage,
        renderAllComparisonTables,
        syncModuleLanguage,
        applyLanguageToUI,
        applyModeToUI,
        applyTheme,
        updateFormTitle,
        renderNextMeasurementInfo,
        renderHistoryTable,
        renderMyHistoryView,
        renderAll,
        calculateAndAddWeekNumbers,
        updateCycleTrackerVisibility,
        renderSvTab,
        normalizeMetricValue,
        get bodySizeKeys() { return bodySizeKeys; },
        get medicationKeys_FtM() { return medicationKeys_FtM; },
        get medicationKeys_MtF() { return medicationKeys_MtF; },
        get notificationEnabled() { return notificationEnabled; },
        set notificationEnabled(v) { notificationEnabled = v; },
    });

    // UNIT_CONVERSIONS, convertToStandard, convertFromStandard imported from src/utils/unit-conversion.js

    let UnitHealthEvaluatorClass = null;
    let unitHealthEvaluatorInstance = null;

    async function getUnitHealthEvaluator() {
        if (unitHealthEvaluatorInstance) return unitHealthEvaluatorInstance;
        if (!UnitHealthEvaluatorClass) {
            const module = await import('./src/doctor-module/core/health-evaluator.js');
            UnitHealthEvaluatorClass = module.HealthEvaluator || module.default;
        }
        unitHealthEvaluatorInstance = new UnitHealthEvaluatorClass([], currentMode, biologicalSex, currentLanguage || 'ko');
        return unitHealthEvaluatorInstance;
    }

    async function normalizeMetricValue(metric, value, fromUnit) {
        const evaluator = await getUnitHealthEvaluator();
        return evaluator.normalizeUnit(metric, value, fromUnit);
    }

    // --- Utility Functions ---
    // isIOS → imported from src/utils.js

    function translate(key, params = {}) {
        const langData = languages[currentLanguage] || languages.ko;
        let text = langData[key] || key;
        for (const p in params) {
            const regex = new RegExp(`\\{${p}\\}`, 'g');
            text = text.replace(regex, params[p]);
        }
        return text;
    }
    // Expose for ES module consumers (onboarding, etc.)
    window.__shiftv_translate = translate;
    window.__shiftv_getCurrentLanguage = () => currentLanguage;
    window.__shiftv_setLanguage = (lang) => { currentLanguage = lang; setCurrentLanguage(lang); };
    window.__shiftv_applyTheme = () => applyTheme();
    window.__shiftv_syncTheme = (theme, accent) => {
        if (theme) currentTheme = theme;
        if (accent) localStorage.setItem('shiftV_accentColor', accent);
        applyTheme();
        saveSettingsToStorage();
    };

    // getCssVar → imported from src/utils.js (getCSSVar as getCssVar)

    function translateUI(context = document) {
        console.log(`DEBUG: Translating UI to ${currentLanguage} within context:`, context.id || context.tagName);
        if (context === document) {
            document.documentElement.lang = currentLanguage.split('-')[0];
        }

        context.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.dataset.langKey;
            let translation = '';
            try {
                let params = {};
                const paramsAttr = el.dataset.langParams;
                if (paramsAttr) {
                    try { params = JSON.parse(paramsAttr); }
                    catch (e) { console.error("Error parsing lang params:", paramsAttr, e); }
                }
                translation = translate(key, params);

                if (el.classList.contains('tab-button')) {
                    const span = el.querySelector('span');
                    if (span) span.textContent = translation;
                    return; // Skip to the next element once handled
                }

                if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder !== undefined) {
                    const placeholderKey = key + 'Placeholder';
                    let placeholderText = translate(placeholderKey);

                    // ** MODIFIED ** to handle specific placeholder fallbacks
                    if (placeholderText === placeholderKey) { // 번역이 없을 경우
                        switch (key) {
                            case 'semenScore':
                            case 'healthScore':
                                placeholderText = translate('scorePlaceholder') || 'Number';
                                break;
                            case 'medicationOtherDose':
                                placeholderText = translate('unitMgPlaceholder') || 'mg';
                                break;
                            default:
                                if (el.type === 'Number') {
                                    placeholderText = translate(key).split('(')[1]?.replace(')', '') || 'Number';
                                } else {
                                    placeholderText = translate('notesPlaceholder') || 'Text';
                                }
                                break;
                        }
                    }
                    el.placeholder = placeholderText;
                } else if (el.tagName === 'BUTTON' || el.tagName === 'OPTION' || el.tagName === 'LEGEND' || el.tagName === 'LABEL' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'H4' || el.tagName === 'P' || el.tagName === 'SPAN' || el.tagName === 'STRONG' || el.tagName === 'TD' || el.tagName === 'TH' || el.tagName === 'SUMMARY') {
                    if (!el.id?.includes('app-version-display')) {
                        if (el.classList.contains('warning') && key === 'importWarning') {
                            el.innerHTML = `<strong data-lang-key="warning">${translate('warning')}</strong> <span>${translation}</span>`;
                        } else if (el.classList.contains('warning') && key === 'resetWarning') {
                            el.innerHTML = `<strong data-lang-key="severeWarning">${translate('severeWarning')}</strong> <span>${translation}</span>`;
                        } else if (el.childElementCount > 0 || translation.includes('{{icon:') || translation.includes('<svg') || translation.includes('<span')) {
                            // 아이콘 자식 있거나 SVG/HTML 마크업 포함 → innerHTML + 아이콘 렌더링
                            el.innerHTML = parseIconPatterns(translation);
                        } else {
                            el.textContent = translation;
                        }
                    }
                } else if (el.tagName === 'IMG' && el.alt !== undefined) {
                    el.alt = translation;
                }

            } catch (e) {
                console.error(`Error translating element with key "${key}":`, e, el);
            }
        });

        // data-lang-key-placeholder 속성 직접 처리
        context.querySelectorAll('[data-lang-key-placeholder]').forEach(el => {
            const key = el.dataset.langKeyPlaceholder;
            if (key) {
                const t = translate(key);
                if (t && t !== key) el.placeholder = t;
            }
        });

        // --- Specific Element Updates (using translate function) ---
        if (saveUpdateBtn) saveUpdateBtn.innerHTML = parseIconPatterns(translate(editIndexInput.value === '' ? 'saveRecord' : 'edit'));
        if (selectAllChartsBtn) selectAllChartsBtn.textContent = translate('selectAll');
        if (deselectAllChartsBtn) deselectAllChartsBtn.textContent = translate('deselectAll');
        if (exportDataButton) exportDataButton.textContent = translate('exportData');
        if (importDataButton) importDataButton.textContent = translate('importData');
        if (resetDataButton) resetDataButton.textContent = translate('resetDataButton');
        if (initialSetupSaveBtn) initialSetupSaveBtn.textContent = translate('saveSettings');


        // Update Select options
        [languageSelect, initialLanguageSelect].forEach(select => {
            if (select) {
                Array.from(select.options).forEach(option => {
                    if (option.value === 'ko') option.textContent = '한국어';
                    else if (option.value === 'en') option.textContent = 'English';
                    else if (option.value === 'ja') option.textContent = '日本語';
                });
                if (select.id === 'language-select') select.value = currentLanguage;
            }
        });
        [modeSelect, initialModeSelect].forEach(select => {
            if (select) {
                Array.from(select.options).forEach(option => {
                    const key = option.value === 'mtf' ? 'modeMtf' : 'modeFtm';
                    option.textContent = translate(key);
                });
                if (select.id === 'mode-select') select.value = currentMode;
            }
        });
        // *** 수정 4: 테마 선택 옵션 번역 ***
        if (themeSelect) {
            Array.from(themeSelect.options).forEach(option => {
                let key = '';
                if (option.value === 'system') key = 'themeSystem';
                else if (option.value === 'light') key = 'themeLight';
                else if (option.value === 'dark') key = 'themeDark';
                if (key) option.textContent = translate(key);
            });
            themeSelect.value = currentTheme; // 현재 설정된 테마 반영
        }


        // Re-render components that depend on language
        renderChartSelector();
        renderAllComparisonTables();
        renderNextMeasurementInfo();
        if (chartInstance && chartInstance.options) {
            if (chartInstance.options.scales?.x?.title) {
                chartInstance.options.scales.x.title.text = translate('chartAxisLabel');
            }
            chartInstance.update();
        }

    }


    // --- Modal Bottom Sheet Functions ---
    // 모달 시스템 초기화 (DOM 준비 후 바로 생성)
    const modalSystem = createModalSystem({
        modalOverlay,
        modalTitle,
        modalContent,
        hormoneModalOverlay,
        bodyElement,
        translateUI,
        onHormoneModalClose: () => {
            if (medicationChartInstance) {
                medicationChartInstance.destroy();
                medicationChartInstance = null;
            }
            if (hormoneChartInstance) {
                hormoneChartInstance.destroy();
                hormoneChartInstance = null;
            }
        }
    });

    // 기존 코드와의 호환성을 위해 로컬 함수로 래핑
    function openModal(title, contentHTML) {
        modalSystem.openModal(title, contentHTML);
    }

    function closeModal() {
        modalSystem.closeModal();
    }

    function openHormoneModal() {
        modalSystem.openHormoneModal(renderHormoneReport);
    }

    function closeHormoneModal() {
        modalSystem.closeHormoneModal();
    }

    // script.js (약 1080번째 줄 근처, 기존 openComparisonModal 부터 handleComparisonFilterClick 까지를 아래 코드로 교체)

    function showPopup(messageKey, duration = 2500, params = {}) {
        if (!savePopup) {
            console.error("DEBUG: [Error!] Popup element (#save-popup) not found.");
            alert(translate(messageKey, params));
            return;
        }
        const message = translate(messageKey, params);
        console.log(`DEBUG: Showing popup: "${message}"`);
        savePopup.textContent = message;
        savePopup.classList.add('show');

        if (savePopup.timerId) {
            clearTimeout(savePopup.timerId);
        }

        savePopup.timerId = setTimeout(() => {
            savePopup.classList.remove('show');
            savePopup.timerId = null;
        }, duration);
    }

    // script.js 파일에서 formatValue 함수를 찾아 아래 코드로 교체해주세요.

    function formatValue(value, key = '') {
        if (value === null || value === undefined || value === '') return '-';
        if (textKeys.includes(key) || key === 'skinCondition') {
            return value;
        }
        const num = parseFloat(value);
        if (isNaN(num)) return '-';

        // 소수점 첫째 자리까지 표시할 항목들
        const toFixed1Keys = [
            // 신체 사이즈
            'height', 'weight', 'shoulder', 'neck', 'chest', 'underBustCircumference', 'waist', 'hips', 'thigh', 'calf', 'arm',
            // 건강 수치
            'muscleMass', 'bodyFatPercentage', 'estrogenLevel', 'testosteroneLevel', 'healthScore',
            // 모든 약물 용량
            'estradiol', 'progesterone', 'antiAndrogen', 'testosterone', 'antiEstrogen', 'medicationOtherDose'
        ];

        // 정수로 표시할 항목들
        const toFixed0Keys = [
            'libido'
        ];

        if (toFixed1Keys.includes(key)) {
            return num.toFixed(1); // 0.5는 "0.5"로, 0은 "0.0"으로 표시
        } else if (toFixed0Keys.includes(key)) {
            return num.toFixed(0); // 정수로 반올림하여 표시
        }

        // 위에 해당하지 않는 다른 모든 숫자 값
        return num.toString();
    }

    function formatTimestamp(dateInput, includeTime = false) {
        let date;
        if (dateInput instanceof Date) {
            date = dateInput;
        } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
            try {
                date = new Date(dateInput);
                if (isNaN(date.getTime()) && typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
                    const parts = dateInput.split('-').map(v => parseInt(v, 10));
                    date = new Date(parts[0], parts[1] - 1, parts[2]);
                }
            } catch { return '-'; }
        } else { return '-'; }
        if (isNaN(date.getTime())) { return '-'; }

        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        if (includeTime) {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0'); // 초(second) 추가
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`; // 반환 형식에 초 추가
        } else {
            return `${year}-${month}-${day}`;
        }
    }

    function parseLocalYMD(dateString) {
        if (typeof dateString !== 'string') return null;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
        const parts = dateString.split('-').map(v => parseInt(v, 10));
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        if (isNaN(date.getTime())) return null;
        date.setHours(0, 0, 0, 0);
        return date;
    }

    function toLocalDayIndex(date) {
        if (!(date instanceof Date) || isNaN(date.getTime())) return null;
        return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
    }

    function localDayIndexToDate(dayIndex) {
        if (typeof dayIndex !== 'number' || !isFinite(dayIndex)) return null;
        const utc = new Date(dayIndex * 86400000);
        return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
    }

    function getMeasurementBaseDate(measurement) {
        if (!measurement || typeof measurement !== 'object') return null;
        const ts = measurement.timestamp;
        if (typeof ts === 'number' && isFinite(ts)) {
            const d = new Date(ts);
            if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        }
        if (typeof ts === 'string') {
            const d = new Date(ts);
            if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        }
        const dateStr = measurement.date;
        const parsed = parseLocalYMD(dateStr);
        if (parsed) return parsed;
        if (typeof dateStr === 'string' || typeof dateStr === 'number') {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        }
        return null;
    }

    function getUnifiedMedicationDoseMap(measurement) {
        const map = new Map();

        const addDose = (id, dose) => {
            if (!id) return;
            if (dose === null || dose === undefined || dose === '') {
                if (!map.has(id)) map.set(id, null);
                return;
            }
            const n = Number(dose);
            if (!Number.isFinite(n)) {
                if (!map.has(id)) map.set(id, null);
                return;
            }
            const prev = map.get(id);
            const base = Number.isFinite(Number(prev)) ? Number(prev) : 0;
            map.set(id, base + n);
        };

        if (measurement && Array.isArray(measurement.medications)) {
            measurement.medications.forEach(entry => {
                const id = entry?.id || entry?.medicationId;
                addDose(id, entry?.dose);
            });
        }

        return map;
    }

    function getMetricColor(key, light = false) {
        const availableKeys = getFilteredChartKeys();
        const index = availableKeys.indexOf(key);
        if (index === -1) return '#cccccc'; // Fallback color
        const hue = (index * (360 / Math.min(availableKeys.length, 15))) % 360;

        if (light) {
            // 비활성 버튼을 위한 연한 색상
            return `hsl(${hue}, 50%, 75%)`;
        }
        // 활성 버튼 및 차트 라인을 위한 기본 색상
        return `hsl(${hue}, 75%, 58%)`;
    }

    // --- 테마 설정 함수 ---
    function saveThemeSetting() {
        let settings = {};
        try { settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) { console.warn('[saveThemeSetting] Corrupt settings in localStorage, resetting:', e); }
        settings.theme = currentTheme;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    function loadThemeSetting() {
        const storedSettings = localStorage.getItem(SETTINGS_KEY);
        if (storedSettings) {
            try {
                const settings = JSON.parse(storedSettings);
                currentTheme = settings.theme || 'system';
            } catch (e) {
                console.warn('[loadThemeSetting] Corrupt settings in localStorage:', e);
                currentTheme = 'system';
            }
        } else {
            currentTheme = 'system'; // 기본값
        }
        if (themeSelect) {
            themeSelect.value = currentTheme;
        }
    }

    // ** NEW ** Debounce function for performance on resize events
    function debounce(func, delay) {
        clearTimeout(resizeDebounceTimer);
        resizeDebounceTimer = setTimeout(func, delay);
    }

    // --- Notification Functions ---
    function showNotification() {
        try {
            if (!('Notification' in window)) {
                console.log("This browser does not support desktop notification");
                return;
            }

            if (Notification.permission === "granted") {
                const notification = new Notification(translate('notification_title'), {
                    body: translate('notification_body'),
                    icon: '/icons/apple-touch-icon.png'
                });
                notification.onclick = () => {
                    window.focus();
                };
            }
        } catch (e) {
            console.warn('DEBUG: Notification failed', e);
        }
    }

    function checkAndRequestNotification() {
        try {
            if (!notificationEnabled || !('Notification' in window) || !Array.isArray(measurements) || measurements.length === 0) {
                return;
            }

            const lastMeasurement = measurements[measurements.length - 1];
            if (!lastMeasurement || typeof lastMeasurement !== 'object') return;
            let lastTimestamp = Number(lastMeasurement.timestamp);
            if (!Number.isFinite(lastTimestamp)) {
                lastTimestamp = Number(new Date(lastMeasurement.date).getTime());
            }
            if (!Number.isFinite(lastTimestamp)) return;

            const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - lastTimestamp > sevenDaysInMillis) {
                if (Notification.permission === "granted") {
                    showNotification();
                } else if (Notification.permission !== "denied") {
                    Notification.requestPermission().then(permission => {
                        if (permission === "granted") {
                            showNotification();
                        }
                    }).catch(() => { });
                } else {
                    console.warn(translate('notification_permission_denied'));
                }
            }
        } catch (e) {
            console.warn('DEBUG: checkAndRequestNotification failed', e);
        }
    }

    function renderHistoryFilters() {
        const container = document.getElementById('history-filter-controls');
        if (!container) return;

        const filterableKeys = chartSelectableKeys.filter(key => {
            if (currentMode === 'ftm') return !medicationKeys_MtF.includes(key);
            return !medicationKeys_FtM.includes(key);
        });

        // '전체' 버튼 추가
        let buttonsHTML = `<button class="filter-button ${activeHistoryFilters.length === 0 ? 'active' : ''}" data-key="all">${translate('selectAll')}</button>`;

        filterableKeys.forEach(key => {
            const label = translate(key).split('(')[0].trim();
            const isActive = activeHistoryFilters.includes(key);
            buttonsHTML += `<button class="filter-button ${isActive ? 'active' : ''}" data-key="${key}">${label}</button>`;
        });

        container.innerHTML = buttonsHTML;
    }

    // ** FINAL FIX ** Function to render history records with a dedicated scroll wrapper
    function renderHistoryCards() {
        if (!historyCardsContainer) return;
        if (!measurements || measurements.length === 0) {
            clearElement(historyCardsContainer, "noDataYet");
            return;
        }



        let html = '';
        const reversedMeasurements = [...measurements].reverse();
        reversedMeasurements.forEach((m, revIndex) => {
            const index = measurements.length - 1 - revIndex;

            let displayKeys = getFilteredDisplayKeys().filter(key =>
                !['week', 'date', 'timestamp'].includes(key) && (m[key] !== null && m[key] !== undefined && m[key] !== '')
            );

            if (activeHistoryFilters.length > 0) {
                displayKeys = displayKeys.filter(key => activeHistoryFilters.includes(key));
            }
            const labelsRow = displayKeys.map(key => `<th class="label">${translate(key).split('(')[0].trim()}</th>`).join('');
            const valuesRow = displayKeys.map(key => `<td class="value">${formatValue(m[key], key)}</td>`).join('');

            html += `
            <div class="history-card glass-card">
                <div class="history-card-header">
                    <h4>${translate('week')} ${m.week ?? index}</h4>
                    <span class="date">${formatTimestamp(m.timestamp, false)}</span>
                </div>
                <div class="history-card-body">
                    <div class="inner-table-wrapper">
                        <table class="inner-history-table">
                            <thead>
                                <tr>${labelsRow}</tr>
                            </thead>
                            <tbody>
                                <tr>${valuesRow}</tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="history-card-actions">
                    <button class="glass-button btn-edit" data-index="${index}">${translate('edit')}</button>
                    <button class="glass-button danger btn-delete" data-index="${index}">${translate('delete')}</button>
                </div>
            </div>`;
        });
        historyCardsContainer.innerHTML = html;
    }


    function applyTheme() {
        const resolvedTheme = resolveTheme(currentTheme);
        const savedAccent = localStorage.getItem('shiftV_accentColor') || 'violet';
        const hexColor = getAccentHex(savedAccent);

        applyDocumentTheme({ theme: resolvedTheme, accentHex: hexColor, accentKey: savedAccent });

        // Material Dynamic Color 적용 (window.applyDynamicTheme — color-generator.js)
        if (window.applyDynamicTheme) {
            window.applyDynamicTheme(hexColor, resolvedTheme === 'dark');
        }

        // 차트 색상 갱신
        if (chartInstance) renderChart().catch(e => console.error('Chart render error (theme):', e));
        renderChartSelector();
    }

    function handleThemeChange(event) {
        currentTheme = event.target.value;
        saveThemeSetting();
        applyTheme();
        showPopup('popupSettingsSaved');
    }
    // --- 끝: 테마 설정 함수 ---

    function saveSettingsToStorage() {
        const settings = {
            language: currentLanguage,
            mode: currentMode,
            theme: currentTheme,
            initialSetupDone: isInitialSetupDone,
            selectedMetrics: selectedMetrics,
            notificationEnabled: notificationEnabled,
            biologicalSex: biologicalSex
        };
        if (!dataManager.saveSettings(settings)) {
            showPopup('savingError');
        }
    }

    function loadSettingsFromStorage() {
        const { settings, isDefault } = dataManager.loadSettings();
        currentLanguage = settings.language;
        setCurrentLanguage(currentLanguage);
        currentMode = settings.mode;
        currentTheme = settings.theme;
        isInitialSetupDone = settings.initialSetupDone;
        selectedMetrics = Array.isArray(settings.selectedMetrics) ? settings.selectedMetrics : ['weight'];
        notificationEnabled = settings.notificationEnabled;
        biologicalSex = settings.biologicalSex;

        // Update UI elements after loading settings
        if (languageSelect) languageSelect.value = currentLanguage;
        if (modeSelect) modeSelect.value = currentMode;
        if (themeSelect) themeSelect.value = currentTheme;
        if (notificationToggle) notificationToggle.checked = notificationEnabled;
        if (sexSelect) sexSelect.value = biologicalSex;
    }

    function savePrimaryDataToStorage() {
        if (!dataManager.savePrimaryData({ measurements, targets, notes })) {
            showPopup('savingError');
        }
    }

    function loadPrimaryDataFromStorage() {
        try {
            const storedData = localStorage.getItem(PRIMARY_DATA_KEY);
            if (storedData) {
                const data = JSON.parse(storedData);
                measurements = Array.isArray(data.measurements) ? data.measurements : [];
                targets = (typeof data.targets === 'object' && data.targets !== null) ? data.targets : {};
                notes = Array.isArray(data.notes) ? data.notes : [];

                measurements.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                let needsSave = false;
                const legacyMeasurementFields = [
                    'healthNotes',
                    'skinCondition',
                    'estradiol',
                    'progesterone',
                    'antiAndrogen',
                    'testosterone',
                    'antiEstrogen',
                    'medicationOtherName',
                    'medicationOtherDose',
                    'semenScore',
                    'semenNotes'
                ];
                legacyMeasurementFields.forEach(k => {
                    if (targets && Object.prototype.hasOwnProperty.call(targets, k)) {
                        try { delete targets[k]; } catch { }
                        needsSave = true;
                    }
                });
                // targets cupSize → underBustCircumference 마이그레이션
                if (targets && Object.prototype.hasOwnProperty.call(targets, 'cupSize')) {
                    if (targets.underBustCircumference == null) targets.underBustCircumference = targets.cupSize;
                    delete targets.cupSize;
                    needsSave = true;
                }
                measurements.forEach((m, index) => {
                    // 1. 주차 번호 복구
                    if (m.week !== index) { m.week = index; needsSave = true; }

                    // 2. Timestamp 및 Date 복구 (NaN 체크 필수)
                    if (!m.timestamp || isNaN(m.timestamp)) {
                        if (m.date && !isNaN(new Date(m.date).getTime())) {
                            m.timestamp = new Date(m.date).getTime();
                        } else {
                            // 날짜 정보도 없으면 현재 시간에서 역산하거나 index 기반 추정
                            m.timestamp = Date.now() - ((measurements.length - 1 - index) * 7 * 86400000);
                            console.warn(`Recovered invalid timestamp for index ${index}`);
                        }
                        needsSave = true;
                    }
                    if (m.memoLiked === undefined) { m.memoLiked = false; needsSave = true; }

                    // 3. cupSize → underBustCircumference 마이그레이션
                    if (Object.prototype.hasOwnProperty.call(m, 'cupSize')) {
                        if (m.underBustCircumference == null) m.underBustCircumference = m.cupSize;
                        delete m.cupSize;
                        needsSave = true;
                    }

                    legacyMeasurementFields.forEach(k => {
                        if (m && Object.prototype.hasOwnProperty.call(m, k)) {
                            try { delete m[k]; } catch { }
                            needsSave = true;
                        }
                    });

                    const beforeSig = symptomsSignature(m.symptoms);
                    const normalizedSymptoms = normalizeSymptomsArray(m.symptoms);
                    const afterSig = symptomsSignature(normalizedSymptoms);
                    if (beforeSig !== afterSig) {
                        m.symptoms = normalizedSymptoms;
                        needsSave = true;
                    }
                });
                notes.forEach(note => {
                    if (!note.id) { note.id = 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9); needsSave = true; }
                    if (!note.timestamp) { note.timestamp = note.createdAt || note.id || Date.now(); needsSave = true; }
                });
                if (needsSave) {
                    savePrimaryDataToStorage();
                }

                if (window.medicationSelector && editIndexInput?.value === '') {
                    const lastMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;
                    try {
                        window.medicationSelector.setMedications(lastMeasurement?.medications || null);
                    } catch (error) {
                        console.error('Error applying last medications after load:', error);
                    }
                }
            } else {
                measurements = []; targets = {}; notes = [];
            }
        } catch (e) {
            console.error("Error loading or parsing primary data:", e);
            showPopup('loadingError');
            measurements = []; targets = {}; notes = [];
        }
    }

    // Check for App Updates
    function calculateAndAddWeekNumbers() {
        if (measurements.length === 0) return false;
        measurements.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        let weeksChanged = false;
        measurements.forEach((m, index) => {
            if (m.week !== index) { m.week = index; weeksChanged = true; }
        });
        if (weeksChanged) { }
        return weeksChanged;
    }


    function applyModeToUI() {
        bodyElement.classList.remove('mode-mtf', 'mode-ftm');
        bodyElement.classList.add(`mode-${currentMode}`);

        // Show/hide elements
        document.querySelectorAll('.mtf-only').forEach(el => el.style.display = currentMode === 'mtf' ? '' : 'none');
        document.querySelectorAll('.ftm-only').forEach(el => el.style.display = currentMode === 'ftm' ? '' : 'none');

        if (modeSelect) modeSelect.value = currentMode;

        if (isInitialSetupDone) { // Avoid unnecessary renders during initial setup
            renderAllComparisonTables();
            renderChartSelector();
            renderChart().catch(e => console.error('Chart render error (mode):', e));
        }

        updateCycleTrackerVisibility();
        unitHealthEvaluatorInstance = null;
    }

    function updateCycleTrackerVisibility() {
        const cycleGroup = document.getElementById('cycle-tracker-group');
        if (!cycleGroup) return;
        const shouldShow = currentMode === 'ftm' && biologicalSex === 'female';
        cycleGroup.style.display = shouldShow ? '' : 'none';

        if (!shouldShow) {
            const menstruationActiveInput = document.getElementById('menstruationActive');
            const menstruationPainGroup = document.getElementById('menstruation-pain-group');
            if (menstruationActiveInput) menstruationActiveInput.checked = false;
            if (menstruationPainGroup) menstruationPainGroup.style.display = 'none';
        }
    }

    function applyLanguageToUI() {
        if (languageSelect) languageSelect.value = currentLanguage;
        syncModuleLanguage(currentLanguage);
        translateUI(); // Translates UI and triggers re-renders
    }

    function updateAppVersionDisplay() {
        versionDisplays.forEach(el => {
            if (el) el.textContent = APP_VERSION;
        });
    }

    function clearElement(container, messageKey = "noDataYet") {
        if (!container) return;
        container.innerHTML = `<p class="placeholder-text">${translate(messageKey)}</p>`;
    }


    function updateFormTitle() {
        _updateFormTitle({ formTitle, editIndexInput, measurements, translate });
    }

    function renderNextMeasurementInfo() {
        _renderNextMeasurementInfo({
            container: nextMeasurementInfoDiv,
            measurements,
            translate,
            formatTimestamp,
            getMeasurementBaseDate,
            toLocalDayIndex,
            localDayIndexToDate,
        });
    }


    function getFilteredDisplayKeys() {
        return [...displayKeysInOrder];
    }

    function getFilteredNumericKeys() {
        return [...baseNumericKeys];
    }

    function getFilteredChartKeys() {
        return [...chartSelectableKeys];
    }

    const legacyKeysToHideInTables = new Set([
        'healthScore',
    ]);

    let symptomLabelMap = null;
    let symptomLabelMapPromise = null;
    let medicationNameMap = null;
    let medicationNameMapPromise = null;

    function pickLocalizedName(names, language) {
        if (!Array.isArray(names) || names.length === 0) return '';
        if (language === 'ko') return names.find(n => /[가-힣]/.test(n)) || names[0];
        if (language === 'ja') return names.find(n => /[ぁ-んァ-ン一-龯]/.test(n)) || names.find(n => /[A-Za-z]/.test(n)) || names[0];
        return names.find(n => /[A-Za-z]/.test(n)) || names[0];
    }

    function ensureSymptomLabelMap() {
        if (symptomLabelMap) return Promise.resolve(symptomLabelMap);
        if (symptomLabelMapPromise) return symptomLabelMapPromise;

        symptomLabelMapPromise = import('./src/doctor-module/data/symptom-database.js')
            .then(mod => {
                const map = new Map();

                const db = mod.SYMPTOM_DATABASE;
                if (db && typeof db === 'object') {
                    Object.values(db).forEach(group => {
                        const symptoms = group?.symptoms;
                        if (!Array.isArray(symptoms)) return;
                        symptoms.forEach(s => {
                            if (!s?.id) return;
                            const label = (currentLanguage === 'ja' ? s.ja : currentLanguage === 'en' ? s.en : s.ko) || s.ko || s.en || s.ja || s.id;
                            map.set(s.id, label);
                        });
                    });
                }

                symptomLabelMap = map;
                return map;
            })
            .finally(() => {
                symptomLabelMapPromise = null;
            });

        symptomLabelMapPromise.then(() => {
            try { renderHistoryTable(); } catch (e) { console.warn('[History] renderHistoryTable failed after symptom map load:', e); }
            try { renderMyHistoryView(); } catch (e) { console.warn('[History] renderMyHistoryView failed after symptom map load:', e); }
        });

        return symptomLabelMapPromise;
    }

    function ensureMedicationNameMap() {
        if (medicationNameMap) return Promise.resolve(medicationNameMap);
        if (medicationNameMapPromise) return medicationNameMapPromise;

        medicationNameMapPromise = import('./src/doctor-module/data/medication-database.js')
            .then(mod => {
                const getAllMedications = mod.getAllMedications;
                if (typeof getAllMedications !== 'function') return null;
                const list = getAllMedications();
                const map = new Map();
                (Array.isArray(list) ? list : []).forEach(m => {
                    map.set(m.id, pickLocalizedName(m.names, currentLanguage || 'ko') || m.id);
                });
                medicationNameMap = map;
                return map;
            })
            .finally(() => {
                medicationNameMapPromise = null;
            });

        medicationNameMapPromise.then(() => {
            try { renderHistoryTable(); } catch (e) { console.warn('[History] renderHistoryTable failed after medication map load:', e); }
            try { renderMyHistoryView(); } catch (e) { console.warn('[History] renderMyHistoryView failed after medication map load:', e); }
        });

        return medicationNameMapPromise;
    }

    function formatSymptomsCell(symptoms) {
        if (!Array.isArray(symptoms) || symptoms.length === 0) return '-';
        ensureSymptomLabelMap();
        const map = symptomLabelMap;

        return symptoms
            .filter(s => s && s.id)
            .map(s => {
                const name = map?.get(s.id) || s.id;
                const sev = Number.isFinite(Number(s.severity)) ? Number(s.severity) : null;
                return sev ? `${name}(${sev})` : `${name}`;
            })
            .join(',<br>');
    }

    function formatMedicationsCell(medications) {
        if (!Array.isArray(medications) || medications.length === 0) return '-';
        ensureMedicationNameMap();
        const map = medicationNameMap;

        return medications
            .filter(m => m && (m.id || m.medicationId))
            .map(m => {
                const id = m.id || m.medicationId;
                const name = map?.get(id) || id;
                const dose = Number.isFinite(Number(m.dose)) ? Number(m.dose) : null;
                const unit = m.unit || '';
                if (dose === null) return `${name}`;
                return `${name} ${dose}${unit}`;
            })
            .join(',<br>');
    }

    // --- Notes Tab ---
    function sortNotes(notesArray, order = 'newest') {
        return [...notesArray].sort((a, b) => {
            const timeA = a.timestamp || a.createdAt || a.id || 0;
            const timeB = b.timestamp || b.createdAt || b.id || 0;
            return order === 'newest' ? timeB - timeA : timeA - timeB;
        });
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
    }

    // --- Targets Tab ---

    function updatePlaceholders() {
        _updatePlaceholders({ form, measurements, translate, formatValue });
    }
    // --- Global Render Function ---
    function renderAll() {

        // 개별 렌더링 함수들을 각각 try-catch로 감싸서, 하나가 실패해도 나머지는 그리도록 합니다.

        try { updateFormTitle(); } catch (e) { console.error("Form Title Error", e); }

        try { renderNextMeasurementInfo(); } catch (e) { console.error("Next Measurement Info Error", e); }

        try { renderAllComparisonTables(); } catch (e) { console.error("Comparison Table Error", e); }

        // placeholder는 입력의 편의성을 위해 매우 중요하므로 반드시 실행 시도
        try { updatePlaceholders(); } catch (e) { console.error("Update Placeholder Error", e); }

        try { renderMyHistoryView(); } catch (e) { console.error("History View Error", e); }

        const activeTabContent = document.querySelector('.tab-content.active');
        const activeTabId = activeTabContent ? activeTabContent.id : 'tab-sv';

        if (activeTabId === 'tab-sv') {
            try { renderSvTab(); } catch (e) { console.error("SV Tab Error", e); }
        }

    }

    // ===============================================
    // Initialization
    // ===============================================
    try {
        try {
            if (history && typeof history.pushState === 'function') {
                history.pushState(null, '', location.href);
            }
        } catch (e) {
            console.warn("DEBUG: pushState failed", e);
        }
        updateAppVersionDisplay();
        loadSettingsFromStorage();
        initPremium();
        // 첫 실행 포함, 항상 테마 기본값 적용
        if (!localStorage.getItem('shiftV_accentColor')) {
            localStorage.setItem('shiftV_accentColor', 'violet');
        }
        applyTheme();
        if (isIOS()) { bodyElement.classList.add('ios-device'); }

        if (!isInitialSetupDone) {
        } else {
            applyModeToUI();
            applyLanguageToUI();
            loadPrimaryDataFromStorage();
            checkAndRequestNotification();
            applyTheme();
            renderAll();
            navigateToTab('tab-sv');
        }

        try {
            const mediaQuery = typeof window.matchMedia === 'function'
                ? window.matchMedia('(prefers-color-scheme: dark)')
                : null;
            if (mediaQuery) {
                const handler = () => { if (currentTheme === 'system') applyTheme(); };
                if (typeof mediaQuery.addEventListener === 'function') {
                    mediaQuery.addEventListener('change', handler);
                } else if (typeof mediaQuery.addListener === 'function') {
                    mediaQuery.addListener(handler);
                }
            }
        } catch (e) {
            console.warn("DEBUG: matchMedia listener setup failed", e);
        }


        // Onboarding check — show on first run
        try {
            import('./src/ui/modals/onboarding-flow.js').then(mod => {
                const OnboardingFlow = mod.OnboardingFlow || mod.default;
                if (OnboardingFlow.shouldShow()) {
                    const onboarding = new OnboardingFlow({
                        onComplete: () => {
                            // 온보딩에서 선택한 테마/색상을 메인 앱에 동기화
                            const obTheme = localStorage.getItem('shiftV_Theme');
                            const obAccent = localStorage.getItem('shiftV_accentColor');
                            if (obTheme) currentTheme = obTheme;

                            // 클라우드에서 가져온 설정값을 인메모리에 반영
                            loadSettingsFromStorage();
                            // 클라우드에서 불러온 경우 + 개별 키 우선
                            const obLang = localStorage.getItem('shiftV_Language');
                            const obMode = localStorage.getItem('shiftV_Mode');
                            const obSex  = localStorage.getItem('shiftV_BiologicalSex');
                            if (obLang) { currentLanguage = obLang; setCurrentLanguage(obLang); }
                            if (obMode) currentMode = obMode;
                            if (obSex)  biologicalSex = obSex;
                            if (obTheme) currentTheme = obTheme;

                            // 초기 설정 완료 표시 — 새로고침 시 데이터 로드/렌더를 위해 필수
                            isInitialSetupDone = true;
                            saveSettingsToStorage();
                            applyTheme();
                            loadPrimaryDataFromStorage();
                            applyModeToUI();
                            applyLanguageToUI();
                            renderAll();
                            navigateToTab('tab-sv');

                            // 다이어리 탭이 이미 초기화됐으면 데이터 새로고침
                            if (window.diaryTab) {
                                window.diaryTab.diaryData = window.diaryTab._loadFromStorage();
                                window.diaryTab.render();
                            }
                            console.log('[OK] Onboarding completed');
                        }
                    });
                    onboarding.start();
                }
            }).catch(err => console.warn('Onboarding load skipped:', err));
        } catch (e) {
            console.warn('Onboarding check failed:', e);
        }
    } catch (initError) {
        console.error("App Initialization Error:", initError);
        alert(translate('alertInitError') || `App Initialization Error: ${initError.message}`);
    }
    // --- Notification Toggle Handler ---
    // ===============================================
    // Event Listener Setup
    // ===============================================
    try {
        // Tab Bar - 해시 라우팅을 통한 탭 전환
        tabBar.addEventListener('click', (e) => {
            const button = e.target.closest('.tab-button');
            if (button) {
                navigateToTab(button.dataset.tab);
            }
        });

        if (notificationToggle) {
            notificationToggle.addEventListener('change', handleNotificationToggle);
        }
        // --- Subscription management ---
        setupSubscriptionHandlers();
        // --- Modal Bottom Sheet Events ---
        if (modalCloseBtn) { // <--- 이 부분을 추가하세요
            modalCloseBtn.addEventListener('click', closeModal);
        }

        if (modalOverlay) { // <--- 이 부분을 추가하세요
            modalOverlay.addEventListener('click', (e) => {
                // 클릭된 요소가 모달의 어두운 배경(오버레이) 자체일 때만 닫히도록 함
                if (e.target === modalOverlay) {
                    closeModal();
                }
            });
        }
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.btn-edit');
                const deleteBtn = e.target.closest('.btn-delete');
                const index = parseInt(editBtn?.dataset.index || deleteBtn?.dataset.index, 10);

                if (isNaN(index)) return;

                // 수정 또는 삭제 버튼 클릭 시 모달을 닫고 액션 실행
                if (editBtn || deleteBtn) {
                    closeModal();
                    setTimeout(() => {
                        if (editBtn) {
                            handleEditClick(index);
                        } else if (deleteBtn) {
                            handleDeleteMeasurement(index);
                        }
                    }, 100);
                }
            });
        }

        // --- Hormone Modal Events ---
        if (hormoneModalCloseBtn) {
            hormoneModalCloseBtn.addEventListener('click', closeHormoneModal);
        }

        // [NOTE] 이 부분을 추가하거나, 기존 코드를 이 코드로 교체해주세요.
        if (hormoneModalOverlay) {
            hormoneModalOverlay.addEventListener('click', (e) => {
                // 모달의 검은 배경을 클릭했을 때 닫히도록 함
                if (e.target === hormoneModalOverlay) {
                    closeHormoneModal();
                }

                // 이벤트 위임: 범주 버튼(.legend-button) 클릭 처리
                const button = e.target.closest('.legend-button');
                if (button) {
                    const action = button.dataset.action;
                    const datasetIndex = parseInt(button.dataset.datasetIndex, 10);
                    const legendControls = button.closest('#medication-legend-controls, #hormone-legend-controls');
                    const chart = legendControls?.id === 'medication-legend-controls'
                        ? medicationChartInstance
                        : hormoneChartInstance;

                    if (chart) {
                        if (action === 'toggle-all') {
                            const isAllVisible = chart.data.datasets.length > 0 && chart.data.datasets.every((_, i) => chart.isDatasetVisible(i));
                            chart.data.datasets.forEach((_, i) => chart.setDatasetVisibility(i, !isAllVisible));
                            chart.update();
                            if (legendControls) {
                                try {
                                    const allVisible = chart.data.datasets.length > 0 && chart.data.datasets.every((_, i) => chart.isDatasetVisible(i));
                                    const toggleText = allVisible ? translate('deselectAll') : translate('selectAll');
                                    legendControls.querySelectorAll(`.legend-button[data-action="toggle-all"]`).forEach(btn => {
                                        btn.textContent = toggleText;
                                    });
                                    legendControls.querySelectorAll(`.legend-button[data-dataset-index]`).forEach(el => {
                                        const idx = parseInt(el.dataset.datasetIndex, 10);
                                        const active = chart.isDatasetVisible(idx);
                                        el.classList.toggle('inactive', !active);
                                        el.style.backgroundColor = active ? chart.data.datasets[idx].borderColor : 'transparent';
                                        el.style.color = active ? 'white' : getCssVar('--text-dim');
                                    });

                                    const groupKey = legendControls.id === 'medication-legend-controls' ? 'medication' : 'metric';
                                    const groupIndices = chart.data.datasets
                                        .map((ds, idx) => ({ ds, idx }))
                                        .filter(({ ds }) => (ds?._series?.kind || groupKey) === groupKey)
                                        .map(({ idx }) => idx);
                                    const groupAllVisible = groupIndices.length > 0 && groupIndices.every(i => chart.isDatasetVisible(i));
                                    const groupToggleText = groupAllVisible ? translate('deselectAll') : translate('selectAll');
                                    legendControls.querySelectorAll(`.legend-button[data-action="toggle-group"][data-group="${groupKey}"]`).forEach(btn => {
                                        btn.textContent = groupToggleText;
                                    });
                                } catch { }
                            }
                            return;
                        } else if (action === 'toggle-group') {
                            const group = button.dataset.group;
                            const groupIndices = chart.data.datasets
                                .map((ds, idx) => ({ ds, idx }))
                                .filter(({ ds }) => ds?._series?.kind === group)
                                .map(({ idx }) => idx);
                            if (groupIndices.length === 0) return;
                            const allVisible = groupIndices.every(i => chart.isDatasetVisible(i));
                            groupIndices.forEach(i => chart.setDatasetVisibility(i, !allVisible));
                            chart.update();
                            if (legendControls) {
                                try {
                                    const toggleText = (!allVisible) ? translate('deselectAll') : translate('selectAll');
                                    button.textContent = toggleText;
                                    legendControls.querySelectorAll(`.legend-button[data-dataset-index]`).forEach(el => {
                                        const idx = parseInt(el.dataset.datasetIndex, 10);
                                        const active = chart.isDatasetVisible(idx);
                                        el.classList.toggle('inactive', !active);
                                        el.style.backgroundColor = active ? chart.data.datasets[idx].borderColor : 'transparent';
                                        el.style.color = active ? 'white' : getCssVar('--text-dim');
                                    });
                                    const allVisible = chart.data.datasets.length > 0 && chart.data.datasets.every((_, i) => chart.isDatasetVisible(i));
                                    const allToggleText = allVisible ? translate('deselectAll') : translate('selectAll');
                                    legendControls.querySelectorAll(`.legend-button[data-action="toggle-all"]`).forEach(btn => {
                                        btn.textContent = allToggleText;
                                    });
                                } catch { }
                            }
                            return;
                        }

                        const isHidden = chart.isDatasetVisible(datasetIndex);
                        chart.setDatasetVisibility(datasetIndex, !isHidden);
                        button.classList.toggle('inactive', isHidden);
                        button.style.backgroundColor = isHidden ? 'transparent' : chart.data.datasets[datasetIndex].borderColor;
                        button.style.color = isHidden ? getCssVar('--text-dim') : 'white';
                        chart.update();

                        if (legendControls) {
                            const allVisible = chart.data.datasets.length > 0 && chart.data.datasets.every((_, i) => chart.isDatasetVisible(i));
                            const toggleText = allVisible ? translate('deselectAll') : translate('selectAll');
                            legendControls.querySelectorAll(`.legend-button[data-action="toggle-all"]`).forEach(btn => {
                                btn.textContent = toggleText;
                            });

                            const groupKey = legendControls.id === 'medication-legend-controls' ? 'medication' : 'metric';
                            const groupIndices = chart.data.datasets
                                .map((ds, idx) => ({ ds, idx }))
                                .filter(({ ds }) => (ds?._series?.kind || groupKey) === groupKey)
                                .map(({ idx }) => idx);
                            const groupAllVisible = groupIndices.length > 0 && groupIndices.every(i => chart.isDatasetVisible(i));
                            const groupToggleText = groupAllVisible ? translate('deselectAll') : translate('selectAll');
                            legendControls.querySelectorAll(`.legend-button[data-action="toggle-group"][data-group="${groupKey}"]`).forEach(btn => {
                                btn.textContent = groupToggleText;
                            });
                        }
                    }
                }
            });
        }



        // 파일의 약 3050번째 줄 근처, Event Listener Setup 섹션 내부
        // --- Clickable Main Cards Events ---
        if (svCardHormones) {
            svCardHormones.classList.add('sv-card--clickable'); // 이 줄을 참고하세요
            svCardHormones.addEventListener('click', () => {
                openHormoneModal();
            });
        }

        if (svCardHighlights) {
            svCardHighlights.classList.add('sv-card--clickable'); // 이 줄을 추가하세요
            svCardHighlights.addEventListener('click', () => {
                openComparisonModal();
            });
        }

        if (svCardGuide) {
            svCardGuide.classList.add('sv-card--clickable');
            svCardGuide.addEventListener('click', () => {
                try {
                    syncModuleLanguage(currentLanguage || 'ko');
                    // 히스토리에 모달 상태를 먼저 추가하여 연속 열기/닫기 시 버그 방지
                    history.pushState({ type: 'modal-action-guide' }, '', location.href);
                    import('./src/ui/modals/action-guide-modal.js').then(module => {
                        const ActionGuideModal = module.ActionGuideModal || module.default;
                        const userSettings = {
                            mode: currentMode || 'mtf',
                            biologicalSex: biologicalSex || 'male',
                            language: currentLanguage || 'ko',
                            targets: targets || {}
                        };
                        const modal = new ActionGuideModal(measurements || [], userSettings);
                        modal.open();
                    }).catch(error => {
                        console.error('Failed to load Action Guide modal:', error);
                    });
                } catch (error) {
                    console.error('Error opening Action Guide modal:', error);
                }
            });
        }

        // --- Clickable Main Cards Events ---

        // Persona card → navigate to My (account) tab
        if (svCardPersona) {
            svCardPersona.classList.add('sv-card--clickable');
            svCardPersona.addEventListener('click', () => {
                navigateToTab('tab-my');
            });
        }

        if (svCardTargets) {
            svCardTargets.classList.add('sv-card--clickable');
            svCardTargets.addEventListener('click', () => {
                try {
                    import(`./src/ui/modals/change-roadmap-modal.js`).then(module => {
                        const ChangeRoadmapModal = module.ChangeRoadmapModal || module.default;
                        const userSettings = {
                            mode: currentMode || 'mtf',
                            biologicalSex: biologicalSex || 'male',
                            language: currentLanguage || 'ko',
                            targets: targets || {}
                        };
                        const modal = new ChangeRoadmapModal(measurements || [], userSettings);
                        modal.open();
                    }).catch(error => {
                        console.error('Failed to load Change Roadmap modal:', error);
                    });
                } catch (error) {
                    console.error('Error opening Change Roadmap modal:', error);
                }
            });
        }

        if (svCardDiary) {
            svCardDiary.classList.add('sv-card--clickable');
            svCardDiary.addEventListener('click', () => {
                navigateToTab('tab-diary');
            });
        }

        if (svCardQuest) {
            svCardQuest.classList.add('sv-card--clickable');
            svCardQuest.addEventListener('click', () => {
                import(`./src/ui/modals/quest-modal.js`).then(module => {
                    const QuestModal = module.QuestModal || module.default;
                    const modal = new QuestModal({
                        language: currentLanguage,
                        translate: translate,
                        measurements: measurements || [],
                        onChange: () => renderQuestCard()
                    });
                    modal.open();
                }).catch(error => {
                    console.error('Failed to load Quest modal:', error);
                });
            });
        }

        if (svCardHealth) {
            svCardHealth.classList.add('sv-card--clickable');
            svCardHealth.addEventListener('click', () => {
                import(`./src/ui/modals/health-modal.js`).then(module => {
                    const HealthModal = module.HealthModal || module.default;
                    const userSettings = {
                        mode: localStorage.getItem('shiftv_mode') || 'mtf',
                        language: currentLanguage
                    };
                    const modal = new HealthModal(measurements || [], userSettings);
                    modal.open();
                }).catch(error => {
                    console.error('Failed to load Health modal:', error);
                });
            });
        }

        // ... (다른 리스너들) ...

        if (svCardShortcut) {
            svCardShortcut.classList.add('sv-card--clickable');
            svCardShortcut.addEventListener('click', () => {
                navigateToTab('tab-record');
            });
        }


        // --- Clickable Main Cards Events (duplicates removed — see first block) ---


        if (myHistoryViewContainer) {
            myHistoryViewContainer.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.btn-edit');
                const deleteBtn = e.target.closest('.btn-delete');
                const index = parseInt(editBtn?.dataset.index || deleteBtn?.dataset.index, 10);
                if (isNaN(index)) return;

                if (editBtn) {
                    handleEditClick(index);
                } else if (deleteBtn) {
                    handleDeleteMeasurement(index);
                }
            });
        }

        // My Tab: History Filter
        if (myFilterControls) {
            myFilterControls.addEventListener('click', e => {
                const button = e.target.closest('.filter-button');
                if (!button) return;
                const key = button.dataset.key;

                if (key === 'all') {
                    activeHistoryFilters = [];
                } else {
                    if (activeHistoryFilters.includes(key)) {
                        activeHistoryFilters = activeHistoryFilters.filter(k => k !== key);
                    } else {
                        activeHistoryFilters.push(key);
                    }
                }
                // 변경된 필터 상태로 '마이' 탭의 기록 뷰만 다시 렌더링
                renderMyHistoryView();
            });
        }

        // (svCardShortcut duplicate removed — see first block)

        // Forms
        if (form) form.addEventListener('submit', handleFormSubmit);
        if (targetForm) targetForm.addEventListener('submit', handleTargetFormSubmit);

        // Symptom Selector 초기화
        window.symptomSelector = null;
        try {
            import('./src/ui/symptom-selector.js').then(module => {
                const SymptomSelector = module.SymptomSelector || module.default;
                window.symptomSelector = new SymptomSelector('symptoms-container', currentMode || 'mtf', currentLanguage || 'ko');
                const lastMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;
                if (lastMeasurement?.symptoms && editIndexInput.value === '') {
                    try { window.symptomSelector.setSymptoms(lastMeasurement.symptoms); } catch { }
                }
                console.log('[OK] Symptom Selector initialized');
            }).catch(error => {
                console.error('Failed to load Symptom Selector:', error);
            });
        } catch (error) {
            console.error('Error initializing Symptom Selector:', error);
        }

        window.medicationSelector = null;
        try {
            import('./src/ui/medication-selector.js').then(module => {
                const MedicationSelector = module.MedicationSelector || module.default;
                window.medicationSelector = new MedicationSelector('medications-container', currentMode || 'mtf', currentLanguage || 'ko');
                const lastMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;
                if (lastMeasurement?.medications && editIndexInput.value === '') {
                    window.medicationSelector.setMedications(lastMeasurement.medications);
                }
                console.log('[OK] Medication Selector initialized');
            }).catch(error => {
                console.error('Failed to load Medication Selector:', error);
            });
        } catch (error) {
            console.error('Error initializing Medication Selector:', error);
        }

        // --- Diary Tab ---
        window.diaryTab = null;
        try {
            import('./src/ui/tabs/diary-tab.js').then(module => {
                const DiaryTab = module.DiaryTab || module.default;
                window.diaryTab = new DiaryTab();
                console.log('[OK] Diary Tab initialized');
            }).catch(error => {
                console.error('Failed to load Diary Tab:', error);
            });
        } catch (error) {
            console.error('Error initializing Diary Tab:', error);
        }

        // --- Streak Strip ---
        window.streakStrip = null;
        try {
            import('./src/ui/components/streak-strip.js').then(module => {
                const StreakStrip = module.StreakStrip || module.default;
                window.streakStrip = new StreakStrip('streak-strip-container');
                console.log('[OK] Streak Strip initialized');
            }).catch(error => {
                console.error('Failed to load Streak Strip:', error);
            });
        } catch (error) {
            console.error('Error initializing Streak Strip:', error);
        }

        // --- Photo Upload Handlers ---
        document.querySelectorAll('.photo-upload-slot input[type="file"]').forEach(input => {
            input.addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (!file) return;
                const slot = this.closest('.photo-upload-slot');
                const preview = slot.querySelector('.photo-preview-circle');
                const category = slot.dataset.category;

                // Show preview
                const reader = new FileReader();
                reader.onload = function (ev) {
                    preview.innerHTML = `<img src="${ev.target.result}" alt="${category}">`;
                    preview.classList.add('has-photo');
                };
                reader.readAsDataURL(file);

                // Store file reference for upload on save
                if (!window._pendingPhotos) window._pendingPhotos = {};
                window._pendingPhotos[category] = file;
                console.log(`[Photo] Photo queued for ${category}`);
            });
        });

        // Buttons
        if (cancelEditBtn) cancelEditBtn.addEventListener('click', cancelEdit);

        // FAB Buttons
        const fabAddDiary = document.getElementById('fab-add-diary');
        const fabAddQuest = document.getElementById('fab-add-quest');
        if (fabAddDiary) {
            fabAddDiary.addEventListener('click', () => {
                navigateToTab('tab-diary');
                // TODO: Open diary entry bottom sheet
                console.log('[Diary] FAB: Add diary entry');
            });
        }
        if (fabAddQuest) {
            fabAddQuest.addEventListener('click', () => {
                import(`./src/ui/modals/quest-modal.js`).then(module => {
                    const QuestModal = module.QuestModal || module.default;
                    const modal = new QuestModal({
                        language: currentLanguage,
                        translate: translate,
                        measurements: measurements || [],
                        onChange: () => renderQuestCard()
                    });
                    modal.open();
                }).catch(error => {
                    console.error('Failed to load Quest modal:', error);
                });
            });
        }

        if (resetDataButton) resetDataButton.addEventListener('click', handleResetData);
        if (checkForUpdatesButton) checkForUpdatesButton.addEventListener('click', handleCheckForUpdates);
        if (exportDataButton) exportDataButton.addEventListener('click', exportMeasurementData);
        if (exportCsvButton) exportCsvButton.addEventListener('click', exportCSV);

        // Cloud Sync buttons (upload / download split)
        const cloudSyncBtn = document.getElementById('cloud-sync-button');
        const cloudSyncSplit = document.getElementById('cloud-sync-split');
        const cloudUploadBtn = document.getElementById('cloud-upload-btn');
        const cloudDownloadBtn = document.getElementById('cloud-download-btn');

        async function _withCloudBtn(btn, label, action) {
            try {
                const syncMod = await import('./src/firebase/sync.js');
                const SyncManager = syncMod.SyncManager || syncMod.default;
                btn.disabled = true;
                btn.innerHTML = svgIcon('hourglass_top', 'mi-inline mi-sm') + ' ' + (translate('cloudSyncing') || '처리 중...');
                const syncManager = new SyncManager();
                await action(syncManager);
                btn.innerHTML = svgIcon('check_circle', 'mi-inline mi-sm mi-success') + ' ' + (translate('cloudSyncDone') || '완료!');
                setTimeout(() => { btn.innerHTML = label; btn.disabled = false; }, 2000);
            } catch (err) {
                console.error('Cloud sync error:', err);
                btn.innerHTML = svgIcon('error', 'mi-inline mi-sm mi-error') + ' ' + (translate('cloudSyncError') || '실패');
                btn.disabled = false;
            }
        }
        if (cloudUploadBtn) {
            cloudUploadBtn.addEventListener('click', () => _withCloudBtn(
                cloudUploadBtn,
                svgIcon('cloud_upload', 'mi-inline mi-sm') + ' ' + (translate('cloudUpload') || '클라우드에 저장'),
                sm => sm.pushToCloud()
            ));
        }
        if (cloudDownloadBtn) {
            cloudDownloadBtn.addEventListener('click', () => _withCloudBtn(
                cloudDownloadBtn,
                svgIcon('cloud_download', 'mi-inline mi-sm') + ' ' + (translate('cloudDownload') || '클라우드에서 불러오기'),
                async sm => { await sm.pullFromCloud(); window.location.reload(); }
            ));
        }

        // ── Avatar helpers ─────────────────────────────────────────────────
        /**
         * Resize + center-crop an image File to 200×200 WebP using Canvas.
         * @param {File} file
         * @returns {Promise<Blob>} WebP blob, quality 0.8
         */
        async function compressAvatarImage(file) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const objectUrl = URL.createObjectURL(file);
                img.onload = () => {
                    try {
                        const SIZE = 200;
                        const canvas = document.createElement('canvas');
                        canvas.width = SIZE;
                        canvas.height = SIZE;
                        const ctx = canvas.getContext('2d');
                        // Center-crop to square then scale to 200×200
                        const side = Math.min(img.naturalWidth, img.naturalHeight);
                        const sx = (img.naturalWidth - side) / 2;
                        const sy = (img.naturalHeight - side) / 2;
                        ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
                        canvas.toBlob(blob => {
                            if (blob) resolve(blob); else reject(new Error('toBlob failed'));
                        }, 'image/webp', 0.8);
                    } catch (e) { reject(e); }
                    finally { URL.revokeObjectURL(objectUrl); }
                };
                img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')); };
                img.src = objectUrl;
            });
        }

        // Auth logic
        const btnLoginGoogle = document.getElementById('btn-login-google');
        const btnLogout = document.getElementById('btn-logout');
        const accountName = document.getElementById('account-name');
        const accountEmail = document.getElementById('account-email');
        const avatarImg = document.getElementById('account-avatar-img');
        const avatarPlaceholder = document.getElementById('account-avatar-placeholder');
        const avatarInput = document.getElementById('account-avatar-input');

        // Fallback: restore placeholder if img src fails to load
        if (avatarImg) avatarImg.onerror = () => clearAvatarUI();

        /** Show a loaded photo in the avatar circle */
        function setAvatarUI(src) {
            if (!avatarImg) return;
            avatarImg.src = src;
            avatarImg.style.display = 'block';
            if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
        }
        /** Revert to placeholder SVG */
        function clearAvatarUI() {
            if (!avatarImg) return;
            avatarImg.src = '';
            avatarImg.style.display = 'none';
            if (avatarPlaceholder) avatarPlaceholder.style.display = '';
        }
        /** Try to restore local-only avatar from localStorage */
        function restoreLocalAvatar() {
            const local = localStorage.getItem('shiftV_avatarLocal');
            if (local) setAvatarUI(local); else clearAvatarUI();
        }

        // Restore avatar immediately on page load (before auth resolves)
        restoreLocalAvatar();

        if (btnLoginGoogle && btnLogout && accountName && accountEmail) {
            import('./src/firebase/auth.js').then(authMod => {
                // 리다이렉트 로그인 결과는 이미 앱 초기화 시 처리됨 (DOMContentLoaded 상단 참조)

                let _currentUser = null; // track current auth state for avatar handler

                authMod.onAuthStateChanged(user => {
                    _currentUser = user;
                    if (user) {
                        accountName.textContent = user.displayName || 'User';
                        accountEmail.textContent = user.email || '';
                        btnLoginGoogle.style.display = 'none';
                        btnLogout.style.display = 'inline-block';
                        if (cloudSyncSplit) cloudSyncSplit.style.display = 'flex';
                        // Prefer local cached avatar, else Google photo, else placeholder
                        const cached = localStorage.getItem('shiftV_avatarLocal');
                        if (cached) {
                            setAvatarUI(cached);
                        } else if (user.photoURL) {
                            setAvatarUI(user.photoURL);
                        } else {
                            clearAvatarUI();
                        }
                    } else {
                        accountName.textContent = translate('accountLocalUser') || '로컬 사용자';
                        accountEmail.textContent = translate('accountNotLoggedIn') || '로그인하지 않음';
                        btnLoginGoogle.style.display = 'inline-block';
                        btnLogout.style.display = 'none';
                        if (cloudSyncSplit) cloudSyncSplit.style.display = 'none';
                        restoreLocalAvatar();
                    }
                });

                btnLoginGoogle.addEventListener('click', async () => {
                    try {
                        await authMod.signInWithGoogle();
                    } catch (err) {
                        if (err?.code !== 'auth/popup-closed-by-user' &&
                            err?.code !== 'auth/cancelled-popup-request') {
                            console.error('Login error:', err);
                            alert(translate('loginError') || '로그인 중 오류가 발생했습니다.');
                        }
                    }
                });

                btnLogout.addEventListener('click', async () => {
                    try {
                        await authMod.signOut();
                    } catch (err) {
                        console.error('Logout error:', err);
                    }
                });

                // ── Avatar file-input handler ───────────────────────────
                if (avatarInput) {
                    avatarInput.addEventListener('change', async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        // 5 MB size guard
                        if (file.size > 5 * 1024 * 1024) {
                            const sizeMsg = (translate('avatarSizeWarning') || '이미지 파일이 5MB를 초과합니다.');
                            const nudge = !_currentUser ? (' ' + (translate('avatarLoginNudge') || '로그인하면 클라우드에 자동 저장됩니다.')) : '';
                            showPopup(sizeMsg + nudge, 3500);
                            avatarInput.value = '';
                            return;
                        }
                        showPopup(translate('avatarSaving') || '아바타 저장 중...', 1500);
                        try {
                            const blob = await compressAvatarImage(file);
                            const user = _currentUser;
                            if (user) {
                                // Logged-in: upload to Firebase Storage
                                const { uploadAvatar } = await import('./src/firebase/storage.js');
                                const url = await uploadAvatar(user.uid, blob);
                                // Also cache URL in localStorage for fast next-load
                                localStorage.setItem('shiftV_avatarLocal', url);
                                setAvatarUI(url);
                            } else {
                                // Local user: store as data URL in localStorage
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                    const dataUrl = ev.target.result;
                                    localStorage.setItem('shiftV_avatarLocal', dataUrl);
                                    setAvatarUI(dataUrl);
                                    showPopup(translate('avatarSaved') || '아바타 저장 완료!', 2000);
                                };
                                reader.readAsDataURL(blob);
                                avatarInput.value = '';
                                return; // popup shown in reader.onload
                            }
                            showPopup(translate('avatarSaved') || '아바타 저장 완료!', 2000);
                        } catch (err) {
                            console.error('[Avatar] save error:', err);
                            showPopup(translate('avatarSaveError') || '아바타 저장 실패', 3000);
                        }
                        avatarInput.value = '';
                    });
                }
            }).catch(err => console.error('Failed to load auth module:', err));
        }

        // PDF Monthly Report
        const pdfReportBtn = document.getElementById('pdf-report-button');
        if (pdfReportBtn) {
            pdfReportBtn.addEventListener('click', async () => {
                // ── Feature gating: PDF report ──
                const pdfCheck = canUseFeature('pdf_report');
                if (!pdfCheck.allowed) {
                    showPaywall(pdfCheck.reason, { feature: 'pdf_report', limit: pdfCheck.limit, used: pdfCheck.used });
                    return;
                }
                try {
                    pdfReportBtn.disabled = true;
                    pdfReportBtn.innerHTML = svgIcon('hourglass_top', 'mi-inline mi-sm') + ' ' + (translate('pdfGenerating') || '생성 중...');
                    const mod = await import(`./src/data/pdf-report.js`);
                    const PDFReportGenerator = mod.PDFReportGenerator || mod.default;
                    const now = new Date();
                    const generator = new PDFReportGenerator({
                        measurements,
                        diary: (() => { try { return JSON.parse(localStorage.getItem('shiftv_diary') || '{}'); } catch (e) { console.warn('[PDF] Corrupt diary data:', e); return {}; } })(),
                        quests: (() => { try { return JSON.parse(localStorage.getItem('shiftv_quests') || '[]'); } catch (e) { console.warn('[PDF] Corrupt quests data:', e); return []; } })(),
                        targets,
                        translate,
                        language: currentLanguage,
                        mode: currentMode || 'mtf',
                        biologicalSex: biologicalSex || 'male',
                    });
                    const fileName = await generator.generate(now.getFullYear(), now.getMonth());
                    pdfReportBtn.innerHTML = svgIcon('check_circle', 'mi-inline mi-sm mi-success') + ' ' + (translate('pdfSaved') || '저장 완료!');
                    recordFeatureUse('pdf_report');
                    showPopup((translate('pdfSavedAs') || '저장됨: ') + fileName, 3000);
                    setTimeout(() => {
                        pdfReportBtn.innerHTML = svgIcon('description', 'mi-inline mi-sm') + ' ' + (translate('pdfReport') || '이번 달 리포트 저장');
                        pdfReportBtn.disabled = false;
                    }, 2000);
                } catch (err) {
                    console.error('PDF report error:', err);
                    pdfReportBtn.innerHTML = svgIcon('error', 'mi-inline mi-sm mi-error') + ' ' + (translate('pdfError') || '생성 실패');
                    pdfReportBtn.disabled = false;
                }
            });
        }

        if (importDataButton) {
            importDataButton.addEventListener('click', () => {
                if (!importFileInput) {
                    console.error('Import file input not found');
                    showPopup('alertImportFileReadError', 4000);
                    return;
                }
                importFileInput.value = '';
                importFileInput.click();
            });
        }
        if (importFileInput) importFileInput.addEventListener('change', importMeasurementData);

        // --- Re-run Onboarding ---
        const rerunOnboardingBtn = document.getElementById('rerun-onboarding-btn');
        if (rerunOnboardingBtn) {
            rerunOnboardingBtn.addEventListener('click', async () => {
                try {
                    localStorage.removeItem('shiftV_onboardingCompleted');
                    const mod = await import('./src/ui/modals/onboarding-flow.js');
                    const OnboardingFlow = mod.OnboardingFlow || mod.default;
                    const onboarding = new OnboardingFlow({
                        onComplete: () => { renderAll(); }
                    });
                    onboarding.start();
                } catch (err) {
                    console.error('Onboarding re-run error:', err);
                }
            });
        }

        // --- PWA Install Button ---
        const pwaInstallBtn = document.getElementById('pwa-install-btn');
        if (pwaInstallBtn) {
            pwaInstallBtn.addEventListener('click', async () => {
                if (!_deferredInstallPrompt) return;
                _deferredInstallPrompt.prompt();
                const { outcome } = await _deferredInstallPrompt.userChoice;
                console.log('[PWA] Install prompt outcome:', outcome);
                _deferredInstallPrompt = null;
                const section = document.getElementById('pwa-install-section');
                if (section) section.style.display = 'none';
            });
        }
        // 이미 PWA로 실행 중이면 설치 섹션 숨김
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            const section = document.getElementById('pwa-install-section');
            if (section) section.style.display = 'none';
        }

        // --- Notification Reminder ---
        const reminderSelect = document.getElementById('reminder-interval');
        const testNotifBtn = document.getElementById('test-notification-btn');
        if (reminderSelect) {
            // Restore saved interval
            const saved = localStorage.getItem('shiftV_reminderInterval') || 'off';
            reminderSelect.value = saved;
            reminderSelect.addEventListener('change', async () => {
                const val = reminderSelect.value;
                localStorage.setItem('shiftV_reminderInterval', val);
                if (val !== 'off') {
                    // Request notification permission
                    if ('Notification' in window && Notification.permission === 'default') {
                        await Notification.requestPermission();
                    }
                    if ('Notification' in window && Notification.permission !== 'granted') {
                        showPopup(translate('notificationDenied') || '알림 권한이 거부되었습니다.', 3000);
                        reminderSelect.value = 'off';
                        localStorage.setItem('shiftV_reminderInterval', 'off');
                        return;
                    }
                    // Schedule check
                    _scheduleReminderCheck(val);
                }
            });
            // Kick off schedule on load
            if (saved !== 'off') _scheduleReminderCheck(saved);
        }
        if (testNotifBtn) {
            testNotifBtn.addEventListener('click', async () => {
                if (!('Notification' in window)) {
                    showPopup(translate('notificationNotSupported') || '이 브라우저는 알림을 지원하지 않아요.', 3000);
                    return;
                }
                const perm = await Notification.requestPermission();
                if (perm !== 'granted') {
                    showPopup(translate('notificationDenied') || '알림 권한이 거부되었습니다.', 3000);
                    return;
                }
                // Send test via SW or fallback
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'CHECK_REMINDER',
                        lastRecordDate: null,
                        lang: currentLanguage
                    });
                } else {
                    new Notification('ShiftV', { body: translate('testNotificationBody') || '알림이 잘 작동하고 있어요!' });
                }
            });
        }

        function _scheduleReminderCheck(interval) {
            // Clear existing timer
            if (window._reminderTimer) clearInterval(window._reminderTimer);
            if (interval === 'off') return;
            const intervalMs = { daily: 12 * 60 * 60 * 1000, weekly: 24 * 60 * 60 * 1000, biweekly: 24 * 60 * 60 * 1000 };
            const checkMs = intervalMs[interval] || intervalMs.daily;

            function shouldNotify() {
                const lastKey = localStorage.getItem('shiftV_lastNotified');
                const now = Date.now();
                if (lastKey && (now - parseInt(lastKey)) < checkMs) return false;
                // Check last record date
                let data = [];
                try { data = JSON.parse(localStorage.getItem('shiftV_Data_v1_1') || '[]'); } catch (e) { console.warn('[Reminder] Corrupt measurement data:', e); return true; }
                if (!data.length) return true;
                const lastDate = new Date(data[data.length - 1].date || data[data.length - 1].recordDate);
                const daysSince = (now - lastDate.getTime()) / (1000 * 60 * 60 * 24);
                const thresholds = { daily: 1, weekly: 7, biweekly: 14 };
                return daysSince >= (thresholds[interval] || 1);
            }

            window._reminderTimer = setInterval(() => {
                if (shouldNotify() && navigator.serviceWorker && navigator.serviceWorker.controller) {
                    localStorage.setItem('shiftV_lastNotified', Date.now().toString());
                    navigator.serviceWorker.controller.postMessage({
                        type: 'CHECK_REMINDER',
                        lang: currentLanguage
                    });
                }
            }, 60 * 60 * 1000); // Check every hour
        }

        // --- Accent Color Picker ---
        const accentGrid = document.getElementById('accent-color-grid');
        if (accentGrid) {
            // Restore saved accent
            const savedAccent = localStorage.getItem('shiftV_accentColor') || 'violet';
            document.documentElement.setAttribute('data-accent', savedAccent);

            const customPicker = document.getElementById('custom-accent-picker');
            const customBtn = document.getElementById('custom-color-btn');

            if (savedAccent.startsWith('#')) {
                if (customBtn) customBtn.classList.add('active');
                if (customPicker) customPicker.value = savedAccent;
            } else {
                const activeChip = accentGrid.querySelector(`[data-accent="${savedAccent}"]`);
                if (activeChip) activeChip.classList.add('active');
            }

            accentGrid.addEventListener('click', (e) => {
                const chip = e.target.closest('.accent-chip');
                if (!chip || chip.id === 'custom-color-btn') return;
                const accent = chip.dataset.accent;
                if (!accent) return;
                accentGrid.querySelectorAll('.accent-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                document.documentElement.setAttribute('data-accent', accent);
                localStorage.setItem('shiftV_accentColor', accent);
                applyTheme(); // Re-apply theme to clear custom colors
            });

            // 버튼 클릭 → 숨겨진 input[type=color] 열기
            if (customBtn) {
                customBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    customPicker?.click();
                });
            }

            if (customPicker) {
                customPicker.addEventListener('input', (e) => {
                    const hexColor = e.target.value;
                    accentGrid.querySelectorAll('.accent-chip').forEach(c => c.classList.remove('active'));
                    if (customBtn) customBtn.classList.add('active');
                    document.documentElement.setAttribute('data-accent', hexColor);
                    localStorage.setItem('shiftV_accentColor', hexColor);
                    applyTheme();
                });
            }
        }

        // --- AI API Key Toggle ---
        const aiKeyToggle = document.getElementById('ai-key-toggle');
        const aiKeyInput = document.getElementById('ai-api-key');
        if (aiKeyToggle && aiKeyInput) {
            aiKeyToggle.addEventListener('click', () => {
                aiKeyInput.type = aiKeyInput.type === 'password' ? 'text' : 'password';
            });
        }

        // --- AI Provider / Model dynamic setup ---
        const AI_PROVIDER_MODELS = {
            openai: { models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'], placeholder: 'sk-...' },
            anthropic: { models: ['claude-sonnet-4-20250514', 'claude-haiku-4-20250414', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'], placeholder: 'sk-ant-...' },
            gemini: { models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'], placeholder: 'AIza...' },
            deepseek: { models: ['deepseek-chat', 'deepseek-reasoner'], placeholder: 'sk-...' },
            custom: { models: [], placeholder: 'API Key' }
        };

        const aiProviderSelect = document.getElementById('ai-api-provider');
        const aiModelSelect = document.getElementById('ai-api-model');
        const aiCustomEndpointGroup = document.getElementById('ai-custom-endpoint-group');
        const aiCustomModelGroup = document.getElementById('ai-custom-model-group');
        const aiCustomEndpoint = document.getElementById('ai-custom-endpoint');
        const aiCustomModel = document.getElementById('ai-custom-model');
        const aiModelGroup = document.getElementById('ai-model-group');

        function updateAiProviderUI(provider) {
            const conf = AI_PROVIDER_MODELS[provider] || AI_PROVIDER_MODELS.openai;
            // Update model dropdown
            if (aiModelSelect) {
                aiModelSelect.innerHTML = '';
                if (conf.models.length > 0) {
                    conf.models.forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m;
                        opt.textContent = m;
                        aiModelSelect.appendChild(opt);
                    });
                    if (aiModelGroup) aiModelGroup.style.display = '';
                } else {
                    if (aiModelGroup) aiModelGroup.style.display = 'none';
                }
                // Restore saved model
                const savedModel = localStorage.getItem('shiftV_aiModel');
                if (savedModel && conf.models.includes(savedModel)) {
                    aiModelSelect.value = savedModel;
                }
            }
            // Show/hide custom fields
            const isCustom = provider === 'custom';
            if (aiCustomEndpointGroup) aiCustomEndpointGroup.style.display = isCustom ? '' : 'none';
            if (aiCustomModelGroup) aiCustomModelGroup.style.display = isCustom ? '' : 'none';
            // Update placeholder
            if (aiKeyInput) aiKeyInput.placeholder = conf.placeholder;
        }

        if (aiProviderSelect) {
            // Restore saved provider
            const savedProvider = localStorage.getItem('shiftV_aiProvider');
            if (savedProvider) aiProviderSelect.value = savedProvider;
            updateAiProviderUI(aiProviderSelect.value);

            // Restore saved custom fields
            if (aiCustomEndpoint) aiCustomEndpoint.value = localStorage.getItem('shiftV_aiCustomEndpoint') || '';
            if (aiCustomModel) aiCustomModel.value = localStorage.getItem('shiftV_aiCustomModel') || '';
            // Restore saved API key
            const savedKey = localStorage.getItem('shiftV_aiApiKey');
            if (savedKey && aiKeyInput) { try { aiKeyInput.value = atob(savedKey); } catch (e) { console.warn('[AI] Failed to decode saved API key:', e); } }

            aiProviderSelect.addEventListener('change', () => {
                updateAiProviderUI(aiProviderSelect.value);
            });
        }

        // --- AI Test Connection (Save + Test) ---
        const aiTestBtn = document.getElementById('ai-test-connection');
        const aiTestResult = document.getElementById('ai-test-result');
        if (aiTestBtn) {
            aiTestBtn.addEventListener('click', async () => {
                const key = aiKeyInput?.value;
                if (!key) { showPopup('aiNoKey', 3000); return; }
                const provider = aiProviderSelect?.value || 'openai';
                const model = aiModelSelect?.value || '';
                // Save all settings
                localStorage.setItem('shiftV_aiApiKey', btoa(key));
                localStorage.setItem('shiftV_aiProvider', provider);
                localStorage.setItem('shiftV_aiModel', model);
                if (provider === 'custom') {
                    localStorage.setItem('shiftV_aiCustomEndpoint', aiCustomEndpoint?.value || '');
                    localStorage.setItem('shiftV_aiCustomModel', aiCustomModel?.value || '');
                }
                // Test connection
                if (aiTestResult) aiTestResult.innerHTML = svgIcon('hourglass_top', 'mi-inline mi-sm') + ' 연결 테스트 중...';
                try {
                    const mod = await import(`./src/ui/modals/ai-advisor-modal.js`);
                    const AIAdvisorModal = mod.AIAdvisorModal || mod.default;
                    const advisor = new AIAdvisorModal([], {});
                    const response = await advisor._callApi('Say "Connection successful!" in one sentence.');
                    if (aiTestResult) aiTestResult.innerHTML = `<span style="color:var(--success,#4caf50)">${svgIcon('check_circle', 'mi-inline mi-sm mi-success')} 연결 성공! 응답: ${response.slice(0, 80)}...</span>`;
                } catch (e) {
                    if (aiTestResult) aiTestResult.innerHTML = `<span style="color:var(--error,#ef4444)">${svgIcon('error', 'mi-inline mi-sm mi-error')} 연결 실패: ${e.message}</span>`;
                }
            });
        }

        // --- Persona Save ---
        const savePersonaBtn = document.getElementById('save-persona-btn');
        if (savePersonaBtn) {
            // Load saved persona
            const savedNickname = localStorage.getItem('shiftV_nickname');
            const savedBirthdate = localStorage.getItem('shiftV_birthdate');
            if (savedNickname) document.getElementById('persona-nickname').value = savedNickname;
            if (savedBirthdate) document.getElementById('persona-birthdate').value = savedBirthdate;

            savePersonaBtn.addEventListener('click', () => {
                const nickname = document.getElementById('persona-nickname')?.value?.trim();
                const birthdate = document.getElementById('persona-birthdate')?.value;
                if (nickname) localStorage.setItem('shiftV_nickname', nickname);
                if (birthdate) localStorage.setItem('shiftV_birthdate', birthdate);
                showPopup('popupSettingsSaved');
            });
        }

        // --- Goal Text & AI Goal Analysis ---
        const goalTextInput = document.getElementById('goal-text-input');
        const goalCharCount = document.getElementById('goal-char-count');
        if (goalTextInput) {
            // Load saved goal text
            const savedGoalText = localStorage.getItem('shiftV_goalText') || '';
            goalTextInput.value = savedGoalText;
            if (goalCharCount) goalCharCount.textContent = savedGoalText.length;
            goalTextInput.addEventListener('input', () => {
                if (goalCharCount) goalCharCount.textContent = goalTextInput.value.length;
            });
        }
        // Save goal text with targets
        const _wrappedTargetSubmit = function (e) {
            if (goalTextInput) {
                localStorage.setItem('shiftV_goalText', goalTextInput.value);
            }
            return handleTargetFormSubmit.call(this, e);
        };
        if (targetForm) {
            targetForm.removeEventListener('submit', handleTargetFormSubmit);
            targetForm.addEventListener('submit', _wrappedTargetSubmit);
        }

        const aiGoalBtn = document.getElementById('ai-goal-analysis-btn');
        if (aiGoalBtn) {
            aiGoalBtn.addEventListener('click', async () => {
                const resultContainer = document.getElementById('ai-goal-result');
                const resultContent = document.getElementById('ai-goal-result-content');
                if (!resultContainer || !resultContent) return;

                // ── Feature gating: AI analysis ──
                const aiCheck = canUseFeature('ai_analysis');
                if (!aiCheck.allowed) {
                    showPaywall(aiCheck.reason, { feature: 'ai_analysis', limit: aiCheck.limit, used: aiCheck.used });
                    return;
                }

                resultContainer.style.display = 'block';
                resultContent.innerHTML = `<div class="ai-advisor-loading"><div class="ai-advisor-spinner"></div><p>${translate('aiAnalyzing')}</p></div>`;

                try {
                    const mod = await import(`./src/ui/modals/ai-advisor-modal.js`);
                    const AIAdvisorModal = mod.AIAdvisorModal || mod.default;
                    const userSettings = {
                        mode: currentMode || 'mtf',
                        biologicalSex: biologicalSex || 'male',
                        language: currentLanguage || 'ko',
                        targets: targets || {}
                    };
                    const advisor = new AIAdvisorModal(measurements || [], userSettings);
                    const { apiKey } = advisor._getApiConfig();
                    if (!apiKey) {
                        resultContent.innerHTML = `<p>${svgIcon('vpn_key', 'mi-inline mi-sm mi-warning')} ${translate('aiNoApiKey')}</p><p class="ai-advisor-error-hint">${translate('aiNoApiKeyHint')}</p>`;
                        return;
                    }
                    const goalText = goalTextInput?.value || '';
                    const prompt = advisor.buildPrompt() + `\n\nUser's personal goals:\n${goalText || 'Not specified'}\n\nPlease also analyze the feasibility of these goals and provide a realistic timeline.`;
                    const response = await advisor._callApi(prompt);
                    const html = response
                        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n\n/g, '</p><p>')
                        .replace(/\n/g, '<br>');
                    resultContent.innerHTML = `<p>${html}</p>`;
                    recordFeatureUse('ai_analysis');
                } catch (err) {
                    console.error('AI Goal analysis error:', err);
                    resultContent.innerHTML = `<p>${svgIcon('warning', 'mi-inline mi-sm mi-error')} ${translate('aiError')}</p><p class="ai-advisor-error-hint">${err.message}</p>`;
                }
            });
        }

        // Selects
        if (languageSelect) languageSelect.addEventListener('change', handleLanguageChange);
        if (modeSelect) modeSelect.addEventListener('change', handleModeChange);
        if (themeSelect) themeSelect.addEventListener('change', handleThemeChange);
        if (sexSelect) {
            sexSelect.addEventListener('change', (event) => {
                biologicalSex = event.target.value;
                saveSettingsToStorage();
                showPopup('popupSettingsSaved');
                renderAll(); // 계산식에 영향을 주므로 다시 렌더링
                updateCycleTrackerVisibility();
                unitHealthEvaluatorInstance = null;
            });
        }

        // Chart Controls
        if (chartSelector) chartSelector.addEventListener('click', handleChartSelectorClick);
        if (selectAllChartsBtn) selectAllChartsBtn.addEventListener('click', handleSelectAllCharts);
        if (deselectAllChartsBtn) deselectAllChartsBtn.addEventListener('click', handleDeselectAllCharts);

        // Initial Setup
        if (initialSetupSaveBtn) initialSetupSaveBtn.addEventListener('click', handleInitialSetupSave);

        // Window & Body events
        window.addEventListener('resize', () => debounce(renderMyHistoryView, 150));

        // --- Carousel Button Logic ---
        function setupCarouselControls(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const prevBtn = container.querySelector('.carousel-nav-btn.prev');
            const nextBtn = container.querySelector('.carousel-nav-btn.next');
            const content = container.querySelector('.carousel-content');

            if (!prevBtn || !nextBtn || !content) return;

            const scrollCarousel = (direction) => {
                const item = content.querySelector('.carousel-item');
                if (item) {
                    const itemWidth = item.offsetWidth;
                    content.scrollBy({
                        left: itemWidth * direction,
                        behavior: 'smooth'
                    });
                }
            };

            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 카드 전체 클릭 방지
                scrollCarousel(-1); // 이전으로 이동
            });

            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 카드 전체 클릭 방지
                scrollCarousel(1); // 다음으로 이동
            });
        }

        function setupCarouselDotControls(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const dots = container.querySelector('.carousel-dots');
            const content = container.querySelector('.carousel-content');

            if (!dots || !content) return;

            dots.addEventListener('click', (e) => {
                const dot = e.target.closest('.carousel-dot');
                if (!dot) return;
                e.stopPropagation();

                const index = parseInt(dot.dataset.index, 10);
                if (Number.isNaN(index)) return;

                const item = content.querySelector('.carousel-item');
                if (!item) return;
                const itemWidth = item.offsetWidth;
                content.scrollTo({
                    left: itemWidth * index,
                    behavior: 'smooth'
                });
            });
        }

        function setupCarouselSwipeGuard(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            const content = container.querySelector('.carousel-content');
            if (!content) return;

            let isSwiping = false;
            let startX = 0;
            let startY = 0;

            const reset = () => {
                isSwiping = false;
            };

            content.addEventListener('pointerdown', (e) => {
                startX = e.clientX;
                startY = e.clientY;
                isSwiping = false;
            }, { passive: true });

            content.addEventListener('pointermove', (e) => {
                const dx = Math.abs(e.clientX - startX);
                const dy = Math.abs(e.clientY - startY);
                if (dx > 10 && dx > dy) isSwiping = true;
            }, { passive: true });

            content.addEventListener('pointerup', () => {
                if (!isSwiping) return;
                window.setTimeout(reset, 200);
            }, { passive: true });

            content.addEventListener('pointercancel', reset, { passive: true });

            content.addEventListener('click', (e) => {
                if (!isSwiping) return;
                e.preventDefault();
                e.stopPropagation();
            }, true);
        }

        // 이벤트 리스너 설정 부분에서 위 함수를 호출합니다.
        setupCarouselControls('sv-card-highlights');
        setupCarouselControls('sv-card-guide');
        setupCarouselControls('sv-card-hormones');
        setupCarouselDotControls('sv-card-highlights');
        setupCarouselDotControls('sv-card-guide');
        setupCarouselDotControls('sv-card-hormones');
        setupCarouselSwipeGuard('sv-card-highlights');
        setupCarouselSwipeGuard('sv-card-guide');
        setupCarouselSwipeGuard('sv-card-hormones');


    } catch (listenerError) {
        console.error(" Event listener setup error:", listenerError);
        alert(translate('alertListenerError') || `Event Listener Error: ${listenerError.message}`);
    }


    /* --- Hash Router 초기화 (PWA Navigation & Back Button) --- */
    initRouter({
        activateTab: activateTab,
        closeAllModals: closeAllModalsVisually
    });
    console.log('DEBUG: Hash router initialized');

});
