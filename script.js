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
import * as dataManager from './src/core/data-manager.js';
import { PRIMARY_DATA_KEY, SETTINGS_KEY, BODY_SIZE_KEYS as bodySizeKeys } from './src/constants.js';
import { isIOS, getCSSVar as getCssVar, normalizeSymptomsArray, symptomsSignature } from './src/utils.js';

const APP_VERSION = "2.0.0a"; // 버전 업데이트

// Global Error Handler
window.onerror = function (message, source, lineno, colno, error) {
    console.error("[Error] Global Error:", message, "\nFile:", source, `\nLine:${lineno}:${colno}`, "\nError Obj:", error);
    const errorMessage = typeof _translate === 'function'
        ? _translate('unexpectedError', { message: message })
        : `An unexpected error occurred. Check console (F12).\nError: ${message}`;
    alert(errorMessage);
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
            const res = await fetch('assets/title.svg');
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
                    <span class="material-symbols-outlined" style="font-size:18px">${info.icon}</span>
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
    }

    btnNotif?.addEventListener('click', () => {
        if (notifPanel?.classList.contains('open')) closeNotifPanel();
        else openNotifPanel();
    });
    notifClose?.addEventListener('click', closeNotifPanel);
    notifBackdrop?.addEventListener('click', closeNotifPanel);
    notifClearAll?.addEventListener('click', () => { _notifications = []; saveNotifications(); renderNotificationPanel(); });

    renderNotificationPanel();

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

    console.log("DEBUG: DOM elements fetched.");
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
    console.log("DEBUG: Measurement keys defined (camelCase).");

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
                        } else if (el.childElementCount > 0 || translation.includes('{{icon:')) {
                            // 아이콘 자식 있는 h2/h3/h4, 또는 {{icon:...}} 패턴 포함 → innerHTML + 아이콘 렌더링
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
        console.log("DEBUG: Re-rendering components after translation...");
        renderChartSelector();
        renderAllComparisonTables();
        renderNextMeasurementInfo();
        if (chartInstance && chartInstance.options) {
            if (chartInstance.options.scales?.x?.title) {
                chartInstance.options.scales.x.title.text = translate('chartAxisLabel');
            }
            chartInstance.update();
            console.log("DEBUG: Chart updated for language change.");
        }

        console.log("DEBUG: UI Translation complete.");
    }

    function calculateAdvancedHormoneAnalytics() {
        if (measurements.length < 1) return null;

        const analytics = {
            estrogenLevel: {},
            testosteroneLevel: {},
            influence: {},
            emax: {},
            etRatio: null,
            stability: {},
            bodyRatios: {}
        };

        // 1. 기본 수치 및 변화량 계산
        const sortedMeas = [...measurements].sort((a, b) => a.timestamp - b.timestamp);
        const initial = sortedMeas[0];
        const latest = sortedMeas[sortedMeas.length - 1];
        const previous = sortedMeas.length > 1 ? sortedMeas[sortedMeas.length - 2] : null;

        const oneMonthAgoTime = latest.timestamp - (28 * 86400000);
        const monthAgoRecord = sortedMeas.slice().reverse().find(m => m.timestamp <= oneMonthAgoTime) || initial;
        const daysForMonthAvg = (latest.timestamp - monthAgoRecord.timestamp) / 86400000;

        ['estrogenLevel', 'testosteroneLevel'].forEach(h => {
            const latestVal = parseFloat(latest[h]);
            if (!isNaN(latestVal)) {
                analytics[h].current = latestVal;
                analytics[h].weeklyChange = (previous && !isNaN(parseFloat(previous[h]))) ? latestVal - parseFloat(previous[h]) : null;
                const initialVal = parseFloat(initial[h]);
                analytics[h].totalChange = !isNaN(initialVal) ? latestVal - initialVal : null;
                analytics[h].initial = !isNaN(initialVal) ? initialVal : null;

                if (daysForMonthAvg > 1 && !isNaN(parseFloat(monthAgoRecord[h]))) {
                    analytics[h].monthlyAvgChange = ((latestVal - parseFloat(monthAgoRecord[h])) / daysForMonthAvg) * 7;
                } else {
                    analytics[h].monthlyAvgChange = null;
                }
            }
        });

        // 2. 호르몬 안정성 분석 (Coefficient of Variation - CV)
        ['estrogenLevel', 'testosteroneLevel'].forEach(h => {
            const recentData = sortedMeas.slice(-8).map(m => parseFloat(m[h])).filter(v => !isNaN(v));
            if (recentData.length >= 3) {
                const mean = recentData.reduce((sum, v) => sum + v, 0) / recentData.length;
                const variance = recentData.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / recentData.length;
                const stdDev = Math.sqrt(variance);
                const cv = (stdDev / mean) * 100;
                analytics.stability[h] = { cv, status: cv < 10 ? 'stable' : cv < 20 ? 'moderate' : 'unstable' };
            }
        });

        // 3. E/T Ratio 계산 (표준 단위: E2 pg/mL, T ng/dL)
        const latestE_pgml = parseFloat(latest.estrogenLevel);
        const latestT_ngdL = parseFloat(latest.testosteroneLevel);

        if (!isNaN(latestE_pgml) && !isNaN(latestT_ngdL) && latestT_ngdL > 0) {
            const ratio = latestE_pgml / latestT_ngdL;
            analytics.etRatio = {
                value: ratio,
                position: Math.min(Math.max((ratio / 0.2) * 100, 0), 100),
                evaluation: ratio < 0.1 ? 'male_range' : ratio > 0.5 ? 'female_range' : 'transitioning',
                isNormal: ratio >= 0.04 && ratio <= 0.1
            };
        }

        // 백분위 계산 함수 (실제 통계 데이터 기반)
        const calculatePercentile = (value, type, gender) => {
            const stats = {
                whr: {
                    female: { p10: 0.67, p25: 0.70, p50: 0.75, p75: 0.80, p90: 0.85 },
                    male: { p10: 0.85, p25: 0.90, p50: 0.95, p75: 1.00, p90: 1.05 }
                },
                chestWaist: {
                    female: { p10: 0.95, p25: 1.00, p50: 1.10, p75: 1.20, p90: 1.30 },
                    male: { p10: 1.20, p25: 1.30, p50: 1.40, p75: 1.50, p90: 1.60 }
                },
                shoulderHip: {
                    female: { p10: 0.95, p25: 1.00, p50: 1.05, p75: 1.10, p90: 1.15 },
                    male: { p10: 1.15, p25: 1.25, p50: 1.30, p75: 1.35, p90: 1.45 }
                }
            };

            const data = stats[type]?.[gender];
            if (!data) return null;

            if (value <= data.p10) return { percentile: 10, text: translate('percentileTop10') };
            if (value <= data.p25) return { percentile: 25, text: translate('percentileTop25') };
            if (value <= data.p50) return { percentile: 50, text: translate('percentileAverage') };
            if (value <= data.p75) return { percentile: 75, text: translate('percentileBottom25') };
            if (value <= data.p90) return { percentile: 90, text: translate('percentileBottom10') };
            return { percentile: 95, text: translate('percentileBottom5') };
        };

        // 4. 신체 비율 분석 (어깨=너비, 나머지=둘레 인식)

        // WHR (허리-엉덩이 비율): 둘레 / 둘레
        if (latest.waist && latest.hips) {
            const waistCircum = parseFloat(latest.waist);
            const hipCircum = parseFloat(latest.hips);
            const whr = waistCircum / hipCircum;

            if (!isNaN(whr)) {
                // WHR: 여성 0.7-0.8, 남성 0.9-1.0
                const rawPosition = Math.min(Math.max(((whr - 0.7) / (1.0 - 0.7)) * 100, 0), 100);

                // 백분위 계산
                const femalePercentile = calculatePercentile(whr, 'whr', 'female');
                const malePercentile = calculatePercentile(whr, 'whr', 'male');

                analytics.bodyRatios.whr = {
                    value: whr,
                    position: 100 - rawPosition, // 반대로 (여성=오른쪽)
                    percentiles: {
                        female: femalePercentile,
                        male: malePercentile
                    }
                };
            }
        }

        // Chest-Waist (가슴-허리 비율): 둘레 / 둘레
        if (latest.chest && latest.waist) {
            const chestCircum = parseFloat(latest.chest);
            const waistCircum = parseFloat(latest.waist);
            const cwr = chestCircum / waistCircum;

            if (!isNaN(cwr)) {
                // Chest-Waist: 여성 1.0-1.2, 남성 1.3-1.5
                const rawPosition = Math.min(Math.max(((cwr - 1.0) / (1.5 - 1.0)) * 100, 0), 100);

                // 백분위 계산
                const femalePercentile = calculatePercentile(cwr, 'chestWaist', 'female');
                const malePercentile = calculatePercentile(cwr, 'chestWaist', 'male');

                analytics.bodyRatios.chestWaist = {
                    value: cwr,
                    position: 100 - rawPosition, // 반대로 (여성=오른쪽)
                    percentiles: {
                        female: femalePercentile,
                        male: malePercentile
                    }
                };
            }
        }

        // Shoulder-Hip (어깨-엉덩이 비율): 너비 vs 둘레 - 어깨 둘레로 추정 변환
        if (latest.shoulder && latest.hips) {
            const shoulderWidth = parseFloat(latest.shoulder);
            const hipCircum = parseFloat(latest.hips);

            // [NOTE] 중요: 어깨는 "너비"이고 엉덩이는 "둘레"
            // 어깨 너비를 어깨 둘레로 추정 변환: 어깨 둘레 ≈ 어깨 너비 × 2.8
            const shoulderCircumEstimated = shoulderWidth * 2.8;

            // Shoulder/Hip 비율 (둘레 기준)
            const shr = shoulderCircumEstimated / hipCircum;

            if (!isNaN(shr)) {
                // Shoulder/Hip: 여성 1.0-1.1, 남성 1.25-1.35
                const rawPosition = Math.min(Math.max(((shr - 1.0) / (1.35 - 1.0)) * 100, 0), 100);

                // 백분위 계산
                const femalePercentile = calculatePercentile(shr, 'shoulderHip', 'female');
                const malePercentile = calculatePercentile(shr, 'shoulderHip', 'male');

                analytics.bodyRatios.shoulderHip = {
                    value: shr,
                    position: 100 - rawPosition, // 반대로 (여성=오른쪽)
                    percentiles: {
                        female: femalePercentile,
                        male: malePercentile
                    },
                    note: `어깨 너비 ${shoulderWidth}cm → 추정 둘레 ${shoulderCircumEstimated.toFixed(1)}cm`
                };

                console.log(`Shoulder-Hip Ratio: Width ${shoulderWidth}cm → Est. Circumference ${shoulderCircumEstimated.toFixed(1)}cm / Hip ${hipCircum}cm = ${shr.toFixed(2)}`);
            }
        }

        // 5. 약물 영향력 분석 (개선된 알고리즘)
        if (sortedMeas.length >= 2) {
            const getMedicationDoseMap = (m) => {
                const map = {};

                if (m && Array.isArray(m.medications)) {
                    m.medications.forEach(entry => {
                        const id = entry?.id || entry?.medicationId;
                        const dose = Number(entry?.dose);
                        if (!id || !Number.isFinite(dose) || dose <= 0) return;
                        map[id] = (map[id] || 0) + dose;
                    });
                }

                return map;
            };

            const doseMaps = sortedMeas.map(getMedicationDoseMap);

            const allMedNames = [...new Set(doseMaps.flatMap(dm => Object.keys(dm)))];
            const drugStats = {};
            allMedNames.forEach(name => drugStats[name] = {
                eDeltaSum: 0, tDeltaSum: 0, doseSum: 0, count: 0, weightSum: 0
            });

            // 먼저 모든 호르몬 변화를 수집하여 중앙값 계산 (이상치 필터링용)
            const allEChanges = [];
            const allTChanges = [];
            for (let i = 1; i < sortedMeas.length; i++) {
                const curr = sortedMeas[i];
                const prev = sortedMeas[i - 1];
                const days = (curr.timestamp - prev.timestamp) / 86400000;
                if (days < 1) continue;

                const dE = (!isNaN(parseFloat(curr.estrogenLevel)) && !isNaN(parseFloat(prev.estrogenLevel)))
                    ? (parseFloat(curr.estrogenLevel) - parseFloat(prev.estrogenLevel)) : null;
                const dT = (!isNaN(parseFloat(curr.testosteroneLevel)) && !isNaN(parseFloat(prev.testosteroneLevel)))
                    ? (parseFloat(curr.testosteroneLevel) - parseFloat(prev.testosteroneLevel)) : null;
                const wE = dE !== null ? Math.abs((dE / days) * 7) : null;
                const wT = dT !== null ? Math.abs((dT / days) * 7) : null;

                if (wE !== null) allEChanges.push(wE);
                if (wT !== null) allTChanges.push(wT);
            }

            // 중앙값 계산
            const getMedian = (arr) => {
                if (arr.length === 0) return 0;
                const sorted = [...arr].sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
            };
            const medianE = getMedian(allEChanges);
            const medianT = getMedian(allTChanges);

            // 본격적인 약물 영향력 계산
            for (let i = 1; i < sortedMeas.length; i++) {
                const curr = sortedMeas[i];
                const prev = sortedMeas[i - 1];
                const days = (curr.timestamp - prev.timestamp) / 86400000;
                if (days < 1) continue;

                const dE = (!isNaN(parseFloat(curr.estrogenLevel)) && !isNaN(parseFloat(prev.estrogenLevel)))
                    ? (parseFloat(curr.estrogenLevel) - parseFloat(prev.estrogenLevel)) : null;
                const dT = (!isNaN(parseFloat(curr.testosteroneLevel)) && !isNaN(parseFloat(prev.testosteroneLevel)))
                    ? (parseFloat(curr.testosteroneLevel) - parseFloat(prev.testosteroneLevel)) : null;
                const wE = dE !== null ? (dE / days) * 7 : 0;
                const wT = dT !== null ? (dT / days) * 7 : 0;

                // 이상치 필터링 (중앙값의 5배 이상 변화는 측정 오류로 간주)
                if (Math.abs(wE) > medianE * 5 || Math.abs(wT) > medianT * 5) {
                    console.warn(`Outlier filtered at week ${i}: wE=${wE}, wT=${wT}`);
                    continue;
                }

                // 각 약물의 복용량 변화 계산
                const doseChanges = {};
                const currMap = doseMaps[i] || {};
                const prevMap = doseMaps[i - 1] || {};
                allMedNames.forEach(drugName => {
                    const currDose = Number(currMap[drugName] || 0);
                    const prevDose = Number(prevMap[drugName] || 0);
                    doseChanges[drugName] = { curr: currDose, prev: prevDose, change: Math.abs(currDose - prevDose) };
                });

                // 단일 약물 변화 감지 (가중치 부여)
                const significantChanges = Object.values(doseChanges).filter(d => d.change >= 0.5).length;

                allMedNames.forEach(drugName => {
                    const { curr, prev, change } = doseChanges[drugName];
                    const doseAvg = (curr + prev) / 2;
                    if (doseAvg === 0) return;

                    // 기본 가중치 1.0
                    let weight = 1.0;

                    // 복용량 변화가 유의미한 경우 가중치 증가
                    if (change >= 0.5) {
                        weight *= 2.0;
                    }

                    // 단일 약물만 변경된 경우 가중치 대폭 증가 (효과 분리)
                    if (significantChanges === 1 && change >= 0.5) {
                        weight *= 3.0;
                    } else if (significantChanges >= 3) {
                        // 여러 약물이 동시 변경된 경우 신뢰도 감소
                        weight *= 0.3;
                    }

                    if (dE !== null) drugStats[drugName].eDeltaSum += (wE * weight);
                    if (dT !== null) drugStats[drugName].tDeltaSum += (wT * weight);
                    drugStats[drugName].doseSum += (doseAvg * weight);
                    drugStats[drugName].weightSum += weight;
                    drugStats[drugName].count++;
                });
            }

            const influences = {};
            allMedNames.forEach(drug => {
                if (drugStats[drug].count >= 2 && drugStats[drug].doseSum > 0) {
                    const scoreE = drugStats[drug].eDeltaSum / drugStats[drug].doseSum;
                    const scoreT = drugStats[drug].tDeltaSum / drugStats[drug].doseSum;

                    // 신뢰도 계산 (0-1)
                    const countFactor = Math.min(drugStats[drug].count / 10, 1);
                    const weightFactor = Math.min(drugStats[drug].weightSum / 20, 1);
                    const confidence = (countFactor * 0.6 + weightFactor * 0.4);

                    if (Math.abs(scoreE) > 0.01 || Math.abs(scoreT) > 0.01) {
                        influences[drug] = {
                            estrogen: scoreE,
                            testosterone: scoreT,
                            confidence: confidence,
                            samples: drugStats[drug].count
                        };
                    }
                }
            });
            analytics.influence = influences;
        }

        // 6. 미래 예측
        const predictDays = (current, target, weeklyRate) => {
            if (isNaN(target) || weeklyRate === 0 || weeklyRate === null) return null;
            const dailyRate = weeklyRate / 7;
            const days = (target - current) / dailyRate;
            if (Math.abs(days) > 3650) return null;
            return Math.round(days);
        };

        if (analytics.estrogenLevel.monthlyAvgChange !== null) {
            analytics.estrogenLevel.predictedNext = analytics.estrogenLevel.current + analytics.estrogenLevel.monthlyAvgChange;
            analytics.estrogenLevel.daysToTarget = predictDays(analytics.estrogenLevel.current, parseFloat(targets.estrogenLevel), analytics.estrogenLevel.monthlyAvgChange);
        } else if (analytics.estrogenLevel.weeklyChange !== null) {
            analytics.estrogenLevel.predictedNext = analytics.estrogenLevel.current + analytics.estrogenLevel.weeklyChange;
            analytics.estrogenLevel.daysToTarget = null;
        }
        if (analytics.testosteroneLevel.monthlyAvgChange !== null) {
            analytics.testosteroneLevel.predictedNext = analytics.testosteroneLevel.current + analytics.testosteroneLevel.monthlyAvgChange;
            analytics.testosteroneLevel.daysToTarget = predictDays(analytics.testosteroneLevel.current, parseFloat(targets.testosteroneLevel), analytics.testosteroneLevel.monthlyAvgChange);
        } else if (analytics.testosteroneLevel.weeklyChange !== null) {
            analytics.testosteroneLevel.predictedNext = analytics.testosteroneLevel.current + analytics.testosteroneLevel.weeklyChange;
            analytics.testosteroneLevel.daysToTarget = null;
        }

        // 7. Emax / Hill 모델 기반 분석 및 반응도(RF) 계산
        const E_max = 0.95;
        const EC_50 = 175; // 개선된 값 (WPATH SOC 8 기반)

        // T0 설정 (성별 기반) - 표준 단위: ng/dL
        let T0 = 600; // 기본값 (남성)
        if (biologicalSex === 'female') {
            T0 = 40; // 여성
        } else {
            const initialT = parseFloat(initial.testosteroneLevel);
            if (!isNaN(initialT) && initialT > 200) T0 = initialT;
        }

        if (!isNaN(latestE_pgml)) {
            const predictedSuppressionFraction = E_max * (latestE_pgml / (EC_50 + latestE_pgml));
            const predictedSuppressedAmount = T0 * predictedSuppressionFraction;
            analytics.emax.dailySuppression = -1 * predictedSuppressedAmount;

            if (!isNaN(latestT_ngdL)) {
                const actualSuppressionFraction = (T0 - latestT_ngdL) / T0;
                let rf = 0;
                let messageKey = 'rfMessage_normal';

                if (actualSuppressionFraction < 0) {
                    rf = actualSuppressionFraction;
                    messageKey = 'rfMessage_negative';
                } else {
                    rf = actualSuppressionFraction / predictedSuppressionFraction;

                    if (rf > 1.3) messageKey = 'rfMessage_very_high';
                    else if (rf > 1.15) messageKey = 'rfMessage_high';
                    else if (rf < 0.7) messageKey = 'rfMessage_very_low';
                    else if (rf < 0.85) messageKey = 'rfMessage_low';
                    else messageKey = 'rfMessage_normal';
                }

                analytics.emax.rf = rf;
                analytics.emax.messageKey = messageKey;
            } else {
                analytics.emax.rf = null;
            }
        } else {
            analytics.emax.dailySuppression = null;
            analytics.emax.rf = null;
        }

        // 8. 현재 수치 평가 (간소화 - 목표치와 현재치 비교)
        const targetE = parseFloat(targets.estrogenLevel);
        const targetT = parseFloat(targets.testosteroneLevel);

        if (!isNaN(latestE_pgml)) {
            if (!isNaN(targetE)) {
                if (latestE_pgml > 300) {
                    analytics.estrogenLevel.status = 'critical_high';
                } else if (Math.abs(latestE_pgml - targetE) / targetE < 0.1) {
                    analytics.estrogenLevel.status = 'optimal';
                } else if (latestE_pgml > targetE) {
                    analytics.estrogenLevel.status = 'above_target';
                } else {
                    analytics.estrogenLevel.status = 'below_target';
                }
            } else {
                analytics.estrogenLevel.status = 'no_target';
            }
        }

        if (!isNaN(latestT_ngdL)) {
            if (!isNaN(targetT)) {
                if (latestT_ngdL < 5) {
                    analytics.testosteroneLevel.status = 'critical_low';
                } else if (Math.abs(latestT_ngdL - targetT) / targetT < 0.1) {
                    analytics.testosteroneLevel.status = 'optimal';
                } else if (latestT_ngdL > targetT) {
                    analytics.testosteroneLevel.status = 'above_target';
                } else {
                    analytics.testosteroneLevel.status = 'below_target';
                }
            } else {
                analytics.testosteroneLevel.status = 'no_target';
            }
        }

        return analytics;
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

    // --- Comparison Modal 'Flow View' Functions ---
    function openComparisonModal() {
        // 새로운 Body Briefing 모달 사용
        try {
            // 동적 import로 Body Briefing 모달 로드
            import(`./src/ui/modals/body-briefing-modal.js`).then(module => {
                const BodyBriefingModal = module.BodyBriefingModal || module.default;
                const userSettings = {
                    mode: currentMode || 'mtf',
                    biologicalSex: biologicalSex || 'male',
                    language: currentLanguage || 'ko',
                    targets: targets || {}
                };
                history.pushState({ type: 'modal-briefing' }, '', location.href);
                const modal = new BodyBriefingModal(measurements || [], userSettings);
                modal.open();
            }).catch(error => {
                console.error('Failed to load Body Briefing modal:', error);
                // 폴백: 기존 방식 사용
                const comparisonViewTemplate = document.getElementById('compare-flow-view');
                if (!comparisonViewTemplate) return;
                const contentHTML = comparisonViewTemplate.innerHTML;
                const title = translate('comparisonModalTitle');
                openModal(title, contentHTML);
            });
        } catch (error) {
            console.error('Error opening Body Briefing modal:', error);
            // 폴백: 기존 방식 사용
            const comparisonViewTemplate = document.getElementById('compare-flow-view');
            if (!comparisonViewTemplate) return;
            const contentHTML = comparisonViewTemplate.innerHTML;
            const title = translate('comparisonModalTitle');
            openModal(title, contentHTML);
        }
        return; // 기존 코드는 실행하지 않음

        // 모달이 열리면 상세 분석 뷰를 기본으로 렌더링
        renderDetailedAnalysisView();

        // [수정된 부분 시작]
        // 모달이 열린 후, 필터 버튼이 있는 컨테이너를 찾아 이벤트 리스너를 연결합니다.
        // 이벤트 위임을 사용하여 컨테이너에 한 번만 리스너를 붙여 효율적으로 처리합니다.
        const filterContainer = modalContent.querySelector('#comparison-filter-controls');
        if (filterContainer) {
            filterContainer.addEventListener('click', handleComparisonFilterClick);
        }
        // [수정된 부분 끝]
        const tabSwitcher = modalContent.querySelector('.modal-tab-switcher');
        if (tabSwitcher) {
            tabSwitcher.addEventListener('click', handleModalTabSwitch);
        }

    }

    function handleComparisonFilterClick(event) {
        const button = event.target.closest('.filter-button');
        if (!button) return;

        const key = button.dataset.key;

        if (key === 'all') { // 전체 선택
            activeComparisonFilters = getFilteredChartKeys();
        } else if (key === 'none') { // 전체 해제
            activeComparisonFilters = [];
        } else { // 개별 항목 토글
            const index = activeComparisonFilters.indexOf(key);
            if (index > -1) {
                activeComparisonFilters.splice(index, 1); // 있으면 제거
            } else {
                activeComparisonFilters.push(key); // 없으면 추가
            }
        }

        // 클릭 후 모달 전체를 다시 렌더링하여 변경사항 반영
        renderComparisonFilters();
        renderComparisonChart();
        renderComparisonTable();
    }

    function renderComparisonFilters() {
        const container = modalContent.querySelector('#detailed-analysis-view #comparison-filter-controls');
        if (!container) return;

        // '기타 마법 용량' (medicationOtherDose)을 표준 키 목록에서 제외
        const standardKeys = getFilteredChartKeys().filter(key => key !== 'medicationOtherDose');

        // 기타 약물 이름들 수집
        const otherMedNames = [...new Set(measurements
            .map(m => m.medicationOtherName)
            .filter(name => name && name.trim() !== '')
        )];

        // HTML 생성
        let categoryButtonsHTML = '';

        // A. 표준 항목 버튼
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

        // B. 기타 약물 이름 버튼 (이름으로 표시)
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

    // 2. 상세 분석 모달 차트 그리는 함수 업데이트 (renderComparisonChart)
    function renderComparisonChart() {
        const ctx = modalContent.querySelector('#detailed-analysis-view #comparison-chart')?.getContext('2d');
        if (!ctx) return;

        if (comparisonChartInstance) comparisonChartInstance.destroy();

        if (measurements.length < 1 || activeComparisonFilters.length === 0) return;

        const labels = measurements.map(m => `${m.week}${translate('week')}`);

        // 기타 약물 이름 목록
        const otherMedNames = [...new Set(measurements.map(m => m.medicationOtherName).filter(n => n))];

        // 데이터셋 생성 (측정값 + 목표값 가로줄)
        const datasets = [];

        activeComparisonFilters.forEach(filterKey => {
            let mainDataset = null;
            let metricColor = '';

            // A. 기타 약물인 경우 (약물은 목표치가 없으므로 메인 데이터셋만 생성)
            if (otherMedNames.includes(filterKey)) {
                // 이름 정렬 순서에 따른 동적 색상
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
            }
            // B. 일반 측정 항목인 경우 (목표치가 있을 수 있음)
            else {
                metricColor = getMetricColor(filterKey);

                mainDataset = {
                    label: translate(filterKey).split('(')[0].trim(),
                    data: measurements.map(m => m[filterKey] ?? null),
                    borderColor: metricColor,
                    backgroundColor: metricColor + '33',
                    tension: 0.1, borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6, spanGaps: true
                };

                // [기능 추가] 목표치가 설정되어 있다면 목표선 데이터셋 추가
                const targetVal = parseFloat(targets[filterKey]);
                if (!isNaN(targetVal)) {
                    // 기존 색상(hsl)을 가져와서 연하게(hsla) 변환
                    // 예: hsl(100, 75%, 58%) -> hsla(100, 75%, 58%, 0.4)
                    const faintColor = metricColor.replace('hsl', 'hsla').replace(')', ', 0.5)');

                    datasets.push({
                        label: `${translate(filterKey).split('(')[0].trim()} (${translate('labelTarget')})`, // 범례: 항목명 (목표)
                        data: new Array(measurements.length).fill(targetVal), // 모든 지점에 목표값 채움
                        borderColor: faintColor,
                        backgroundColor: 'transparent',
                        borderWidth: 4,             // 아주 얇게
                        borderDash: [5, 5],         // 점선 처리
                        pointRadius: 0,             // 포인트 숨김 (선만 표시)
                        pointHoverRadius: 0,        // 호버 시 포인트 숨김
                        fill: false,
                        order: 99 // 맨 뒤로 보냄 (실제 데이터가 위로 오게)
                    });
                }
            }

            if (mainDataset) {
                datasets.push(mainDataset);
            }
        });

        // 라이트/다크 모드 스타일 설정
        const isLightMode = document.body.classList.contains('light-mode');
        const tickColor = isLightMode ? '#5c5c8a' : getCssVar('--text-dim2');
        const gridColor = isLightMode ? 'rgba(200, 200, 235, 0.5)' : getCssVar('--glass-border');

        // 비교 차트 스크롤 기능
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
                    // 클릭 이벤트: 목표선이 아닌 실제 데이터 포인트만 클릭되도록 처리
                    const points = comparisonChartInstance.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
                    const titleEl = modalContent.querySelector('#comparison-selected-week-data-title');
                    const contentEl = modalContent.querySelector('#comparison-selected-week-data-content');
                    const placeholderEl = modalContent.querySelector('#comparison-data-placeholder');

                    if (!titleEl || !contentEl || !placeholderEl) return;

                    // 클릭한 요소가 있고, 그 데이터셋이 목표선(pointRadius가 0)이 아닌 경우에만 상세 정보 표시
                    if (points.length) {
                        const firstPoint = points[0];
                        const datasetIndex = firstPoint.datasetIndex;

                        // pointRadius가 0인 데이터셋(=목표선)은 무시
                        if (comparisonChartInstance.data.datasets[datasetIndex].pointRadius === 0) return;

                        const weekIndex = firstPoint.index;
                        const weekData = measurements[weekIndex];

                        if (weekData) {
                            titleEl.textContent = translate('selectedWeekDataTitle', { week: weekData.week });
                            let contentHTML = '';
                            getFilteredDisplayKeys().forEach(key => {
                                if (weekData[key] !== null && weekData[key] !== undefined && weekData[key] !== '') {
                                    contentHTML += `
                                <div class="data-item">
                                    <span class="data-item-label">${translate(key).split('(')[0].trim()}</span>
                                    <span class="data-item-value">${formatValue(weekData[key], key)}</span>
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
                        beginAtZero: false // 데이터 변화를 더 잘 보여주기 위해 0부터 시작 안 함
                    }
                },
                plugins: {
                    legend: {
                        display: false // 범례 숨김 (깔끔하게)
                    },
                    tooltip: {
                        filter: function (tooltipItem) {
                            // 툴팁에서도 목표선 데이터는 숨김 (원할 경우 제거 가능)
                            return tooltipItem.dataset.pointRadius !== 0;
                        }
                    }
                }
            }
        });
    }

    // 신규 추가: 상세 데이터 테이블 렌더링 함수
    function renderComparisonTable() {
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
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        settings.theme = currentTheme;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        console.log("DEBUG: Theme setting saved:", currentTheme);
    }

    function loadThemeSetting() {
        const storedSettings = localStorage.getItem(SETTINGS_KEY);
        if (storedSettings) {
            const settings = JSON.parse(storedSettings);
            currentTheme = settings.theme || 'system';
        } else {
            currentTheme = 'system'; // 기본값
        }
        if (themeSelect) {
            themeSelect.value = currentTheme;
        }
        console.log("DEBUG: Theme setting loaded:", currentTheme);
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

    // --- SV Tab Card Rendering ---

    // 하이라이트 카드 렌더링 함수
    function renderHighlightsCard() {
        const card = document.getElementById('sv-card-highlights');
        const titleEl = document.getElementById('sv-card-highlights-title');
        const contentEl = document.getElementById('sv-card-highlights-content');
        const dotsEl = document.getElementById('sv-card-highlights-dots');

        if (!card || !titleEl || !contentEl || !dotsEl) return;

        const icon = '';
        const title = translate('svcard_title_highlights');
        titleEl.innerHTML = `${icon} ${title}`;

        if (measurements.length < 2) {
            contentEl.innerHTML = `<div class="carousel-item"><p class="placeholder">${translate('svcard_no_data_for_highlights')}</p></div>`;
            dotsEl.innerHTML = '';
            return;
        }

        const latest = measurements[measurements.length - 1];
        const previous = measurements[measurements.length - 2];
        const allChanges = [];

        comparisonKeys.forEach(key => {
            const latestValue = parseFloat(latest[key]);
            const prevValue = parseFloat(previous[key]);

            if (!isNaN(latestValue) && !isNaN(prevValue) && prevValue !== 0) {
                const change = latestValue - prevValue;
                const percentageChange = Math.abs((change / prevValue) * 100);
                if (percentageChange > 0.1) { // 0.1% 이상 변화만 의미있는 것으로 간주
                    allChanges.push({
                        key: key,
                        percentageChange: percentageChange,
                        value: latestValue,
                        diff: change
                    });
                }
            }
        });



        // 변화율이 가장 큰 순서대로 정렬하고, 상위 3개만 선택
        allChanges.sort((a, b) => b.percentageChange - a.percentageChange);
        const topChanges = allChanges.slice(0, 4);

        if (topChanges.length === 0) {
            contentEl.innerHTML = `<div class="carousel-item"><p class="placeholder">${translate('svcard_no_major_changes')}</p></div>`; // 수정
            dotsEl.innerHTML = '';
            return;
        }

        // 캐러셀 아이템과 점(dot) 생성
        contentEl.innerHTML = topChanges.map(item => {
            const changeText = item.diff > 0 ? `+${item.diff.toFixed(1)}` : `${item.diff.toFixed(1)}`;
            const changeClass = item.diff > 0 ? 'positive-change' : 'negative-change';
            const changeIcon = item.diff > 0 ? 'trending_up' : 'trending_down';
            const pctText = `${item.percentageChange.toFixed(1)}%`;
            return `
        <div class="carousel-item sv-metric-slide">
            <div class="sv-metric-header">
                <span class="sv-metric-title">${translate(item.key).split('(')[0]}</span>
                <span class="sv-metric-pct ${changeClass}">${item.diff > 0 ? '+' : '-'}${pctText}</span>
            </div>
            <div class="sv-metric-body">
                <span class="sv-metric-value">${formatValue(item.value, item.key)}</span>
            </div>
            <div class="sv-metric-footer">
                <span class="material-symbols-outlined sv-metric-icon ${changeClass}">${changeIcon}</span>
                <span class="sv-metric-change ${changeClass}">${translate('svcard_change_vs_last_week')} ${changeText}</span>
            </div>
        </div>`;
        }).join('');

        dotsEl.innerHTML = topChanges.map((_, index) => `<div class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`).join('');

        // 스크롤 이벤트 리스너 추가 (이벤트 중복 방지)
        contentEl.removeEventListener('scroll', handleCarouselScroll); // 기존 리스너 제거
        contentEl.addEventListener('scroll', handleCarouselScroll); // 새 리스너 추가
        contentEl.scrollLeft = 0;
    }

    function renderHormoneReport() {
        const modalTitleEl = document.getElementById('hormone-modal-title');
        if (modalTitleEl) modalTitleEl.textContent = translate('hormoneModalTitle');

        const analysisEl = document.getElementById('hormone-analysis-text');
        if (!analysisEl) return;

        const analytics = calculateAdvancedHormoneAnalytics();
        let analysisHTML = '';

        if (!analytics) {
            analysisHTML = `<h4 class="table-title">${translate('hormoneAnalysisTitle')}</h4><p class="placeholder">${translate('notEnoughData')}</p>`;
        } else {
            const formatChange = (val) => {
                if (val === null || val === undefined || isNaN(val)) return '-';
                const fixedVal = val.toFixed(1);
                return val > 0 ? `+${fixedVal}` : fixedVal;
            };

            // ========================================
            // 섹션 1: 현재 수치 평가 (Current Level Evaluation)
            // ========================================
            analysisHTML += `
            <div class="hormone-section">
                <div class="hormone-section-header">
                    <h2 class="hormone-section-title">
                        <span class="section-number">1</span>
                        ${translate('currentLevelEvaluation')}
                    </h2>
                    <p class="hormone-section-desc">${translate('currentLevelEvaluationDesc')}</p>
                </div>
                <div class="hormone-grid">`;

            // Estrogen 평가
            if (analytics.estrogenLevel.current !== undefined) {
                const targetE = parseFloat(targets.estrogenLevel);
                const currentE = analytics.estrogenLevel.current;
                let statusHTML = '';
                let statusIcon = '';

                if (analytics.estrogenLevel.status === 'critical_high') {
                    statusHTML = `<div class="status-badge danger-badge"><span class="material-symbols-outlined status-icon mi-error">warning</span> ${translate('estrogen_critical_high')}</div>`;
                    statusIcon = '<span class="material-symbols-outlined status-icon mi-error">warning</span>';
                } else if (analytics.estrogenLevel.status === 'optimal') {
                    statusHTML = `<div class="status-badge optimal-badge"><span class="material-symbols-outlined status-icon mi-success">check_circle</span> ${translate('estrogen_optimal')}</div>`;
                    statusIcon = '<span class="material-symbols-outlined status-icon mi-success">check_circle</span>';
                } else if (analytics.estrogenLevel.status === 'above_target') {
                    statusHTML = `<div class="status-badge above-badge"><span class="material-symbols-outlined status-icon">arrow_upward</span> ${translate('estrogen_above_target')}</div>`;
                    statusIcon = '<span class="material-symbols-outlined status-icon">arrow_upward</span>';
                } else if (analytics.estrogenLevel.status === 'below_target') {
                    statusHTML = `<div class="status-badge below-badge"><span class="material-symbols-outlined status-icon">arrow_downward</span> ${translate('estrogen_below_target')}</div>`;
                    statusIcon = '<span class="material-symbols-outlined status-icon">arrow_downward</span>';
                } else {
                    statusHTML = `<div class="status-badge neutral-badge">${translate('no_target_set')}</div>`;
                    statusIcon = '<span class="material-symbols-outlined status-icon">remove</span>';
                }

                analysisHTML += `
                <div class="hormone-card highlight-card">
                    <div class="hormone-card-header">
                        <h3 class="hormone-name">${translate('estrogenLevel').split('(')[0]}</h3>
                    </div>
                    <div class="hormone-current-value">${formatValue(currentE, 'estrogenLevel')}</div>
                    ${!isNaN(targetE) ? `<div class="hormone-target">
                        <span class="target-label">${translate('svcard_label_target')}</span>
                        <span class="target-value">${formatValue(targetE, 'estrogenLevel')}</span>
                    </div>` : ''}
                    ${statusHTML}
                </div>`;
            }

            // Testosterone 평가
            if (analytics.testosteroneLevel.current !== undefined) {
                const targetT = parseFloat(targets.testosteroneLevel);
                const currentT = analytics.testosteroneLevel.current;
                let statusHTML = '';
                let statusIcon = '';

                if (analytics.testosteroneLevel.status === 'critical_low') {
                    statusHTML = `<div class="status-badge danger-badge"><span class="material-symbols-outlined status-icon mi-error">warning</span> ${translate('testosterone_critical_low')}</div>`;
                    statusIcon = '<span class="material-symbols-outlined status-icon mi-error">warning</span>';
                } else if (analytics.testosteroneLevel.status === 'optimal') {
                    statusHTML = `<div class="status-badge optimal-badge"><span class="material-symbols-outlined status-icon mi-success">check_circle</span> ${translate('testosterone_optimal')}</div>`;
                    statusIcon = '<span class="material-symbols-outlined status-icon mi-success">check_circle</span>';
                } else if (analytics.testosteroneLevel.status === 'above_target') {
                    statusHTML = `<div class="status-badge above-badge"><span class="material-symbols-outlined status-icon">arrow_upward</span> ${translate('testosterone_above_target')}</div>`;
                    statusIcon = '<span class="material-symbols-outlined status-icon">arrow_upward</span>';
                } else if (analytics.testosteroneLevel.status === 'below_target') {
                    statusHTML = `<div class="status-badge below-badge"><span class="material-symbols-outlined status-icon">arrow_downward</span> ${translate('testosterone_below_target')}</div>`;
                    statusIcon = '<span class="material-symbols-outlined status-icon">arrow_downward</span>';
                } else {
                    statusHTML = `<div class="status-badge neutral-badge">${translate('no_target_set')}</div>`;
                    statusIcon = '<span class="material-symbols-outlined status-icon">remove</span>';
                }

                analysisHTML += `
                <div class="hormone-card highlight-card">
                    <div class="hormone-card-header">
                        <h3 class="hormone-name">${translate('testosteroneLevel').split('(')[0]}</h3>
                    </div>
                    <div class="hormone-current-value">${formatValue(currentT, 'testosteroneLevel')}</div>
                    ${!isNaN(targetT) ? `<div class="hormone-target">
                        <span class="target-label">${translate('svcard_label_target')}</span>
                        <span class="target-value">${formatValue(targetT, 'testosteroneLevel')}</span>
                    </div>` : ''}
                    ${statusHTML}
                </div>`;
            }

            analysisHTML += `
                </div>
            </div>`;

            // ========================================
            // 섹션 2: E/T Ratio
            // ========================================
            if (analytics.etRatio) {
                // E/T 비율 범위 표시
                const maleRange = '< 5';
                const femaleRange = '> 30';

                analysisHTML += `
                <div class="hormone-section">
                    <div class="hormone-section-header">
                        <h2 class="hormone-section-title">
                            <span class="section-number">2</span>
                            ${translate('etRatioTitle')}
                        </h2>
                        <p class="hormone-section-desc">${translate('etRatioExplanation')}</p>
                    </div>
                    <div class="hormone-card ratio-card">
                        <div class="ratio-bar-container">
                            <div class="ratio-icon-group">
                                <span class="ratio-icon male"><span class="material-symbols-outlined mi-sm">male</span></span>
                                <span class="ratio-percentile">${maleRange}</span>
                            </div>
                            <div class="ratio-bar">
                                <div class="ratio-bar-fill" style="width: ${analytics.etRatio.position}%;"></div>
                                <div class="ratio-bar-marker" style="left: ${analytics.etRatio.position}%;"></div>
                            </div>
                            <div class="ratio-icon-group">
                                <span class="ratio-icon female"><span class="material-symbols-outlined mi-sm">female</span></span>
                                <span class="ratio-percentile">${femaleRange}</span>
                            </div>
                        </div>
                        <div class="ratio-value-display">
                            <span class="ratio-number">${analytics.etRatio.value.toFixed(3)}</span>
                        </div>
                    </div>
                </div>`;
            }

            // ========================================
            // 섹션 3: 수치 변화량 분석 (Level Change Analysis)
            // ========================================
            analysisHTML += `
            <div class="hormone-section">
                <div class="hormone-section-header">
                    <h2 class="hormone-section-title">
                        <span class="section-number">3</span>
                        ${translate('hormoneAnalysisTitleChange')}
                    </h2>
                    <p class="hormone-section-desc">${translate('hormoneChangeAnalysisDesc')}</p>
                </div>
                
                <div class="info-card">
                    <h4 class="info-card-title"><span class="material-symbols-outlined mi-inline mi-sm">lightbulb</span> ${translate('understandingHormones')}</h4>
                    <div class="info-card-content">
                        <p><strong>${translate('estrogenLevel').split('(')[0]}:</strong> ${translate('estrogenExplanation')}</p>
                        <p><strong>${translate('testosteroneLevel').split('(')[0]}:</strong> ${translate('testosteroneExplanation')}</p>
                    </div>
                </div>

                <div class="hormone-grid">
                    <div class="hormone-card">
                        <div class="hormone-card-header">
                            <h3 class="hormone-name">${translate('estrogenLevel').split('(')[0]}</h3>
                            <span class="hormone-current-mini">${formatValue(analytics.estrogenLevel.current, 'estrogenLevel')}</span>
                        </div>
                        <div class="change-metrics">
                            <div class="change-item">
                                <span class="change-label">${translate('weeklyChange')}</span>
                                <span class="change-value ${analytics.estrogenLevel.weeklyChange > 0 ? 'positive' : analytics.estrogenLevel.weeklyChange < 0 ? 'negative' : ''}">${formatChange(analytics.estrogenLevel.weeklyChange)}</span>
                            </div>
                            <div class="change-item">
                                <span class="change-label">${translate('monthlyAvgChange')}</span>
                                <span class="change-value ${analytics.estrogenLevel.monthlyAvgChange > 0 ? 'positive' : analytics.estrogenLevel.monthlyAvgChange < 0 ? 'negative' : ''}">${formatChange(analytics.estrogenLevel.monthlyAvgChange)}</span>
                            </div>
                            <div class="change-item">
                                <span class="change-label">${translate('totalChange')}</span>
                                <span class="change-value ${analytics.estrogenLevel.totalChange > 0 ? 'positive' : analytics.estrogenLevel.totalChange < 0 ? 'negative' : ''}">${formatChange(analytics.estrogenLevel.totalChange)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="hormone-card">
                        <div class="hormone-card-header">
                            <h3 class="hormone-name">${translate('testosteroneLevel').split('(')[0]}</h3>
                            <span class="hormone-current-mini">${formatValue(analytics.testosteroneLevel.current, 'testosteroneLevel')}</span>
                        </div>
                        <div class="change-metrics">
                            <div class="change-item">
                                <span class="change-label">${translate('weeklyChange')}</span>
                                <span class="change-value ${analytics.testosteroneLevel.weeklyChange > 0 ? 'positive' : analytics.testosteroneLevel.weeklyChange < 0 ? 'negative' : ''}">${formatChange(analytics.testosteroneLevel.weeklyChange)}</span>
                            </div>
                            <div class="change-item">
                                <span class="change-label">${translate('monthlyAvgChange')}</span>
                                <span class="change-value ${analytics.testosteroneLevel.monthlyAvgChange > 0 ? 'positive' : analytics.testosteroneLevel.monthlyAvgChange < 0 ? 'negative' : ''}">${formatChange(analytics.testosteroneLevel.monthlyAvgChange)}</span>
                            </div>
                            <div class="change-item">
                                <span class="change-label">${translate('totalChange')}</span>
                                <span class="change-value ${analytics.testosteroneLevel.totalChange > 0 ? 'positive' : analytics.testosteroneLevel.totalChange < 0 ? 'negative' : ''}">${formatChange(analytics.testosteroneLevel.totalChange)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

            // ========================================
            // 섹션 4: Emax / Hill 분석
            // ========================================
            if (analytics.emax && analytics.emax.dailySuppression !== null) {
                const rfValue = analytics.emax.rf !== null ? analytics.emax.rf.toFixed(2) : '-';
                const rfMessage = analytics.emax.messageKey ? translate(analytics.emax.messageKey) : '';
                const suppressionValue = formatChange(analytics.emax.dailySuppression);

                let rfColorClass = '';
                let rfIcon = '<span class="material-symbols-outlined status-icon">monitoring</span>';
                if (analytics.emax.messageKey === 'rfMessage_very_high' || analytics.emax.messageKey === 'rfMessage_high') {
                    rfColorClass = 'positive';
                    rfIcon = '<span class="material-symbols-outlined status-icon mi-success">check_circle</span>';
                } else if (analytics.emax.messageKey === 'rfMessage_low' || analytics.emax.messageKey === 'rfMessage_very_low' || analytics.emax.messageKey === 'rfMessage_negative') {
                    rfColorClass = 'negative';
                    rfIcon = '<span class="material-symbols-outlined status-icon mi-error">warning</span>';
                }

                analysisHTML += `
                <div class="hormone-section">
                    <div class="hormone-section-header">
                        <h2 class="hormone-section-title">
                            <span class="section-number">4</span>
                            ${translate('emaxTitle')}
                        </h2>
                        <p class="hormone-section-desc">${translate('emaxAnalysisDesc')}</p>
                    </div>
                    <div class="hormone-card highlight-card emax-special">
                        <div class="emax-metrics">
                            <div class="emax-item">
                                <div class="emax-label">${translate('dailyTSuppression')}</div>
                                <div class="emax-value primary-color">${suppressionValue}</div>
                                <div class="emax-unit">ng/dL / week</div>
                            </div>
                            <div class="emax-divider"></div>
                            <div class="emax-item">
                                <div class="emax-label">${translate('responseFactor')}</div>
                                <div class="emax-value ${rfColorClass}">${rfIcon} ${rfValue}x</div>
                                <div class="emax-message">${rfMessage}</div>
                            </div>
                        </div>
                    </div>
                </div>`;
            }

            // ========================================
            // 섹션 5: 호르몬 안정성 분석 (Hormone Stability Analysis)
            // ========================================
            if (analytics.stability && (analytics.stability.estrogenLevel || analytics.stability.testosteroneLevel)) {
                analysisHTML += `
                <div class="hormone-section">
                    <div class="hormone-section-header">
                        <h2 class="hormone-section-title">
                            <span class="section-number">5</span>
                            ${translate('stabilityAnalysisTitle')}
                        </h2>
                        <p class="hormone-section-desc">${translate('cvStabilityNote')}</p>
                    </div>
                    <div class="hormone-grid">`;

                if (analytics.stability.estrogenLevel) {
                    const cv = analytics.stability.estrogenLevel.cv.toFixed(1);
                    let statusText = '';
                    let statusIcon = '';
                    let statusClass = '';

                    if (analytics.stability.estrogenLevel.status === 'stable') {
                        statusText = translate('stability_stable');
                        statusIcon = '<span class="material-symbols-outlined status-icon mi-success">check_circle</span>';
                        statusClass = 'stable';
                    } else if (analytics.stability.estrogenLevel.status === 'moderate') {
                        statusText = translate('stability_moderate');
                        statusIcon = '<span class="material-symbols-outlined status-icon mi-warning">swap_vert</span>';
                        statusClass = 'moderate';
                    } else {
                        statusText = translate('stability_unstable');
                        statusIcon = '<span class="material-symbols-outlined status-icon mi-error">warning</span>';
                        statusClass = 'unstable';
                    }

                    analysisHTML += `
                    <div class="hormone-card">
                        <div class="hormone-card-header">
                            <h3 class="hormone-name">${translate('estrogenLevel').split('(')[0]}</h3>
                        </div>
                        <div class="stability-display">
                            <div class="stability-cv">
                                <span class="stability-cv-value">${cv}%</span>
                                <span class="stability-cv-label">${translate('variationCoeff')}</span>
                            </div>
                            <div class="stability-status ${statusClass}">
                                ${statusIcon} ${statusText}
                            </div>
                        </div>
                    </div>`;
                }

                if (analytics.stability.testosteroneLevel) {
                    const cv = analytics.stability.testosteroneLevel.cv.toFixed(1);
                    let statusText = '';
                    let statusIcon = '';
                    let statusClass = '';

                    if (analytics.stability.testosteroneLevel.status === 'stable') {
                        statusText = translate('stability_stable');
                        statusIcon = '<span class="material-symbols-outlined status-icon mi-success">check_circle</span>';
                        statusClass = 'stable';
                    } else if (analytics.stability.testosteroneLevel.status === 'moderate') {
                        statusText = translate('stability_moderate');
                        statusIcon = '<span class="material-symbols-outlined status-icon mi-warning">swap_vert</span>';
                        statusClass = 'moderate';
                    } else {
                        statusText = translate('stability_unstable');
                        statusIcon = '<span class="material-symbols-outlined status-icon mi-error">warning</span>';
                        statusClass = 'unstable';
                    }

                    analysisHTML += `
                    <div class="hormone-card">
                        <div class="hormone-card-header">
                            <h3 class="hormone-name">${translate('testosteroneLevel').split('(')[0]}</h3>
                        </div>
                        <div class="stability-display">
                            <div class="stability-cv">
                                <span class="stability-cv-value">${cv}%</span>
                                <span class="stability-cv-label">${translate('variationCoeff')}</span>
                            </div>
                            <div class="stability-status ${statusClass}">
                                ${statusIcon} ${statusText}
                            </div>
                        </div>
                    </div>`;
                }

                analysisHTML += `
                    </div>
                </div>`;
            }

            // ========================================
            // 섹션 6: 미래 예측 (Future Prediction)
            // ========================================
            const getDayText = (val) => {
                if (val === null) return '-';
                return translate('daysUnit', { days: val });
            };

            analysisHTML += `
            <div class="hormone-section">
                <div class="hormone-section-header">
                    <h2 class="hormone-section-title">
                        <span class="section-number">6</span>
                        ${translate('hormoneAnalysisTitlePrediction')}
                    </h2>
                    <p class="hormone-section-desc">${translate('predictionDisclaimer')}</p>
                </div>
                <div class="hormone-grid">
                    <div class="hormone-card prediction-card">
                        <div class="hormone-card-header">
                            <h3 class="hormone-name">${translate('estrogenLevel').split('(')[0]}</h3>
                        </div>
                        <div class="prediction-display">
                            <div class="prediction-item">
                                <span class="prediction-label"><span class="material-symbols-outlined status-icon">trending_up</span> ${translate('predictedNextWeek')}</span>
                                <span class="prediction-value">${analytics.estrogenLevel.predictedNext ? analytics.estrogenLevel.predictedNext.toFixed(1) : '-'}</span>
                            </div>
                            ${targets.estrogenLevel ? `
                            <div class="prediction-item">
                                <span class="prediction-label"><span class="material-symbols-outlined status-icon">target</span> ${translate('daysToTarget')}</span>
                                <span class="prediction-value">${getDayText(analytics.estrogenLevel.daysToTarget)}</span>
                                <span class="prediction-target">${translate('targetLabelShort', { value: targets.estrogenLevel })}</span>
                            </div>` : ''}
                        </div>
                    </div>
                    
                    <div class="hormone-card prediction-card">
                        <div class="hormone-card-header">
                            <h3 class="hormone-name">${translate('testosteroneLevel').split('(')[0]}</h3>
                        </div>
                        <div class="prediction-display">
                            <div class="prediction-item">
                                <span class="prediction-label"><span class="material-symbols-outlined status-icon">trending_up</span> ${translate('predictedNextWeek')}</span>
                                <span class="prediction-value">${analytics.testosteroneLevel.predictedNext ? analytics.testosteroneLevel.predictedNext.toFixed(1) : '-'}</span>
                            </div>
                            ${targets.testosteroneLevel ? `
                            <div class="prediction-item">
                                <span class="prediction-label"><span class="material-symbols-outlined status-icon">target</span> ${translate('daysToTarget')}</span>
                                <span class="prediction-value">${getDayText(analytics.testosteroneLevel.daysToTarget)}</span>
                                <span class="prediction-target">${translate('targetLabelShort', { value: targets.testosteroneLevel })}</span>
                            </div>` : ''}
                        </div>
                    </div>
                </div>
            </div>`;

            // ========================================
            // 섹션 7: 약물 영향력 분석 (Drug Influence Analysis)
            // ========================================
            if (analytics.influence) {
                const influenceEntries = Object.entries(analytics.influence);
                if (influenceEntries.length > 0) {
                    analysisHTML += `
                    <div class="hormone-section">
                        <div class="hormone-section-header">
                            <h2 class="hormone-section-title">
                                <span class="section-number">7</span>
                                ${translate('hormoneAnalysisTitleInfluence')}
                            </h2>
                            <p class="hormone-section-desc">${translate('drugInfluenceDesc')}</p>
                        </div>
                        
                        <div class="info-card-grid">
                            <div class="info-card mini">
                                <h4 class="info-card-title"><span class="material-symbols-outlined mi-inline mi-sm">info</span> ${translate('drugInfluenceHowItWorks')}</h4>
                                <p class="info-card-text">${translate('drugInfluenceHowItWorksDesc')}</p>
                            </div>
                            <div class="info-card mini">
                                <h4 class="info-card-title"><span class="material-symbols-outlined mi-inline mi-sm">monitoring</span> ${translate('drugInfluenceConfidence')}</h4>
                                <p class="info-card-text">${translate('drugInfluenceConfidenceDesc')}</p>
                            </div>
                        </div>

                        <div class="drug-grid">`;

                    try { ensureMedicationNameMap(); } catch { }

                    const translateIfExists = (key) => {
                        const t = translate(key);
                        return t && t !== key ? t : null;
                    };

                    analysisHTML += influenceEntries.map(([drug, effects]) => {
                        const confidencePercent = Math.round(effects.confidence * 100);
                        let confidenceClass = '';
                        if (confidencePercent >= 80) confidenceClass = 'high';
                        else if (confidencePercent >= 50) confidenceClass = 'medium';
                        else confidenceClass = 'low';

                        const drugLabel = translateIfExists(drug) || medicationNameMap?.get?.(drug) || drug;

                        return `
                        <div class="drug-card">
                            <div class="drug-card-header">
                                <h3 class="drug-name"><span class="material-symbols-outlined mi-inline mi-sm">medication</span> ${drugLabel}</h3>
                                <div class="drug-samples">${effects.samples} ${translate('samples')}</div>
                            </div>
                            <div class="drug-influences">
                                <div class="drug-influence-item">
                                    <span class="drug-hormone-label">E₂</span>
                                    <span class="drug-influence-value ${effects.estrogen >= 0 ? 'positive' : 'negative'}">
                                        ${effects.estrogen >= 0 ? '+' : ''}${effects.estrogen.toFixed(2)}
                                    </span>
                                    <span class="drug-influence-unit">pg/mL / mg</span>
                                </div>
                                <div class="drug-influence-item">
                                    <span class="drug-hormone-label">T</span>
                                    <span class="drug-influence-value ${effects.testosterone >= 0 ? 'positive' : 'negative'}">
                                        ${effects.testosterone >= 0 ? '+' : ''}${effects.testosterone.toFixed(2)}
                                    </span>
                                    <span class="drug-influence-unit">ng/dL / mg</span>
                                </div>
                            </div>
                            <div class="drug-confidence ${confidenceClass}">
                                <span class="confidence-label">${translate('confidence')}</span>
                                <span class="confidence-value">${confidencePercent}%</span>
                            </div>
                        </div>`;
                    }).join('');

                    analysisHTML += `
                        </div>
                    </div>`;
                }
            }

            // ========================================
            // 섹션 8: 신체 비율 분석 (Body Ratio Analysis)
            // ========================================
            if (analytics.bodyRatios && (analytics.bodyRatios.whr || analytics.bodyRatios.chestWaist || analytics.bodyRatios.shoulderHip)) {
                analysisHTML += `
                <div class="hormone-section">
                    <div class="hormone-section-header">
                        <h2 class="hormone-section-title">
                            <span class="section-number">8</span>
                            ${translate('bodyRatioAnalysisTitle')}
                        </h2>
                        <p class="hormone-section-desc">${translate('bodyRatioAnalysisDesc')}</p>
                    </div>
                    <div class="body-ratio-container">`;

                if (analytics.bodyRatios.whr) {
                    const malePercent = analytics.bodyRatios.whr.percentiles?.male?.text || '-';
                    const femalePercent = analytics.bodyRatios.whr.percentiles?.female?.text || '-';

                    analysisHTML += `
                    <div class="body-ratio-card">
                        <h3 class="body-ratio-name"><span class="material-symbols-outlined mi-inline mi-sm">straighten</span> ${translate('waistHipRatio')}</h3>
                        <div class="ratio-bar-container">
                            <div class="ratio-icon-group">
                                <span class="ratio-icon male"><span class="material-symbols-outlined mi-sm">male</span></span>
                                <span class="ratio-percentile">${malePercent}</span>
                            </div>
                            <div class="ratio-bar">
                                <div class="ratio-bar-fill" style="width: ${analytics.bodyRatios.whr.position}%;"></div>
                                <div class="ratio-bar-marker" style="left: ${analytics.bodyRatios.whr.position}%;"></div>
                            </div>
                            <div class="ratio-icon-group">
                                <span class="ratio-icon female"><span class="material-symbols-outlined mi-sm">female</span></span>
                                <span class="ratio-percentile">${femalePercent}</span>
                            </div>
                        </div>
                        <div class="ratio-value-display">
                            <span class="ratio-number">${analytics.bodyRatios.whr.value.toFixed(2)}</span>
                        </div>
                    </div>`;
                }

                if (analytics.bodyRatios.chestWaist) {
                    const malePercent = analytics.bodyRatios.chestWaist.percentiles?.male?.text || '-';
                    const femalePercent = analytics.bodyRatios.chestWaist.percentiles?.female?.text || '-';

                    analysisHTML += `
                    <div class="body-ratio-card">
                        <h3 class="body-ratio-name"><span class="material-symbols-outlined mi-inline mi-sm">straighten</span> ${translate('chestWaistRatio')}</h3>
                        <div class="ratio-bar-container">
                            <div class="ratio-icon-group">
                                <span class="ratio-icon male"><span class="material-symbols-outlined mi-sm">male</span></span>
                                <span class="ratio-percentile">${malePercent}</span>
                            </div>
                            <div class="ratio-bar">
                                <div class="ratio-bar-fill" style="width: ${analytics.bodyRatios.chestWaist.position}%;"></div>
                                <div class="ratio-bar-marker" style="left: ${analytics.bodyRatios.chestWaist.position}%;"></div>
                            </div>
                            <div class="ratio-icon-group">
                                <span class="ratio-icon female"><span class="material-symbols-outlined mi-sm">female</span></span>
                                <span class="ratio-percentile">${femalePercent}</span>
                            </div>
                        </div>
                        <div class="ratio-value-display">
                            <span class="ratio-number">${analytics.bodyRatios.chestWaist.value.toFixed(2)}</span>
                        </div>
                    </div>`;
                }

                if (analytics.bodyRatios.shoulderHip) {
                    const malePercent = analytics.bodyRatios.shoulderHip.percentiles?.male?.text || '-';
                    const femalePercent = analytics.bodyRatios.shoulderHip.percentiles?.female?.text || '-';

                    analysisHTML += `
                    <div class="body-ratio-card">
                        <h3 class="body-ratio-name"><span class="material-symbols-outlined mi-inline mi-sm">straighten</span> ${translate('shoulderHipRatio')}</h3>
                        <div class="ratio-bar-container">
                            <div class="ratio-icon-group">
                                <span class="ratio-icon male"><span class="material-symbols-outlined mi-sm">male</span></span>
                                <span class="ratio-percentile">${malePercent}</span>
                            </div>
                            <div class="ratio-bar">
                                <div class="ratio-bar-fill" style="width: ${analytics.bodyRatios.shoulderHip.position}%;"></div>
                                <div class="ratio-bar-marker" style="left: ${analytics.bodyRatios.shoulderHip.position}%;"></div>
                            </div>
                            <div class="ratio-icon-group">
                                <span class="ratio-icon female"><span class="material-symbols-outlined mi-sm">female</span></span>
                                <span class="ratio-percentile">${femalePercent}</span>
                            </div>
                        </div>
                        <div class="ratio-value-display">
                            <span class="ratio-number">${analytics.bodyRatios.shoulderHip.value.toFixed(2)}</span>
                        </div>
                    </div>`;
                }

                analysisHTML += `
                    </div>
                </div>`;
            }
        }
        analysisEl.innerHTML = analysisHTML;



        // --- 그래프 렌더링 로직 (여기가 핵심 수정) ---
        const medicationCtx = document.getElementById('medication-chart')?.getContext('2d');
        const hormoneCtx = document.getElementById('hormone-chart')?.getContext('2d');
        const selectedDataContainer = document.getElementById('selected-week-data-container');
        const selectedDataTitle = document.getElementById('selected-week-data-title');
        const selectedDataContent = document.getElementById('selected-week-data-content');
        const hormonePlaceholderEl = document.getElementById('hormone-data-placeholder');

        if (!medicationCtx || !hormoneCtx || !selectedDataContainer || !hormonePlaceholderEl) return;

        if (medicationChartInstance) medicationChartInstance.destroy();
        if (hormoneChartInstance) hormoneChartInstance.destroy();

        selectedDataContainer.style.display = 'block';
        selectedDataTitle.innerHTML = '';
        selectedDataContent.innerHTML = '';
        selectedDataContent.style.display = 'none';
        hormonePlaceholderEl.style.display = 'block';
        hormonePlaceholderEl.textContent = translate('graphClickPrompt');

        const labels = measurements.map(m => `${m.week}${translate('week')}`);

        try {
            if (!medicationNameMap) {
                ensureMedicationNameMap().then(map => {
                    if (!map) return;
                    if (!hormoneModalOverlay?.classList?.contains('visible')) return;
                    try { renderHormoneReport(); } catch { }
                });
            } else {
                ensureMedicationNameMap();
            }
        } catch { }
        const translateIfExists = (key) => {
            const t = translate(key);
            return t && t !== key ? t : null;
        };

        const baseColors = ['#ff8fcd', '#ff60a8', '#ff5577', '#e04f9e', '#dc143c'];
        const medKeyToMeta = new Map();
        measurements.forEach(m => {
            if (!m || !Array.isArray(m.medications)) return;
            m.medications.forEach(entry => {
                const id = entry?.id || entry?.medicationId;
                if (!id) return;
                const unit = entry?.unit || '';
                const key = `${id}__${unit}`;
                if (medKeyToMeta.has(key)) return;
                medKeyToMeta.set(key, { id, unit });
            });
        });

        const medSeries = Array.from(medKeyToMeta.values());

        let allDatasets = medSeries.map((def, index) => {
            const color = baseColors[index % baseColors.length] || `hsl(${(index * 37) % 360}, 70%, 60%)`;
            const name = translateIfExists(def.id) || medicationNameMap?.get?.(def.id) || def.id;
            const label = `${name}${def.unit ? ` (${def.unit})` : ''}`;

            const data = measurements.map(m => {
                const found = Array.isArray(m?.medications)
                    ? m.medications.find(x => (x?.id || x?.medicationId) === def.id && (x?.unit || '') === (def.unit || ''))
                    : null;
                const dose = Number(found?.dose);
                return Number.isFinite(dose) ? dose : null;
            });

            return {
                label,
                data,
                borderColor: color,
                backgroundColor: color + '33',
                tension: 0.1,
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                spanGaps: true,
                _series: { kind: 'medication', id: def.id, unit: def.unit }
            };
        });

        // 호르몬 데이터셋 (기존 동일)
        const hormoneKeys = ['estrogenLevel', 'testosteroneLevel'];
        const hormoneColors = ['#55f0d0', '#8888ff'];
        const hormoneDatasets = hormoneKeys.map((key, index) => ({
            label: translate(key).split('(')[0].trim(),
            data: measurements.map(m => m[key] ? parseFloat(m[key]) : NaN),
            borderColor: hormoneColors[index],
            backgroundColor: hormoneColors[index] + '33',
            tension: 0.1,
            borderWidth: 2,
            spanGaps: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            _series: { kind: 'metric', key },
            _targetValue: (targets && Number.isFinite(Number(targets[key]))) ? Number(targets[key]) : undefined
        }));

        const onChartClick = (event, chartInstance) => {
            const points = chartInstance.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
            if (points.length) {
                const firstPoint = points[0];
                const weekIndex = firstPoint.index;
                const weekData = measurements[weekIndex];
                if (weekData) {
                    selectedDataTitle.textContent = translate('selectedWeekDataTitle', { week: weekData.week });
                    let contentHTML = '';
                    getFilteredDisplayKeys().forEach(key => {
                        if (weekData[key] !== null && weekData[key] !== undefined && weekData[key] !== '') {
                            contentHTML += `
            <div class="data-item">
                <span class="data-item-label">${translate(key).split('(')[0].trim()}</span>
                <span class="data-item-value">${formatValue(weekData[key], key)}</span>
            </div>`;
                        }
                    });
                    selectedDataContent.innerHTML = contentHTML;
                    selectedDataContent.style.display = 'grid';
                    hormonePlaceholderEl.style.display = 'none';
                }
            }
        };

        const chartOptions = (chartInstanceProvider) => {
            const isLightMode = document.body.classList.contains('light-mode');
            const tickColor = isLightMode ? '#5c5c8a' : getCssVar('--text-dim2');
            const gridColor = isLightMode ? 'rgba(200, 200, 235, 0.5)' : getCssVar('--glass-border');

            return {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: tickColor }, grid: { color: gridColor }, border: { color: gridColor } },
                    y: { ticks: { color: tickColor }, grid: { color: gridColor }, border: { color: gridColor } }
                },
                plugins: { legend: { display: false } },
                onClick: (event) => onChartClick(event, chartInstanceProvider())
            }
        };

        // 호르몬 차트들 스크롤 기능
        const maxPointsPerView = 20;
        const minPointWidth = 42;
        const medicationWrapper = medicationCtx.canvas.closest('.chart-wrapper');
        const hormoneWrapper = hormoneCtx.canvas.closest('.chart-wrapper');

        // Medication 차트 컨테이너 설정
        let medInnerContainer = medicationCtx.canvas.parentElement;
        if (!medInnerContainer || !medInnerContainer.classList.contains('chart-inner-container')) {
            medInnerContainer = document.createElement('div');
            medInnerContainer.classList.add('chart-inner-container');
            const parent = medicationCtx.canvas.parentElement;
            parent.insertBefore(medInnerContainer, medicationCtx.canvas);
            medInnerContainer.appendChild(medicationCtx.canvas);
        }

        // Hormone 차트 컨테이너 설정
        let hormoneInnerContainer = hormoneCtx.canvas.parentElement;
        if (!hormoneInnerContainer || !hormoneInnerContainer.classList.contains('chart-inner-container')) {
            hormoneInnerContainer = document.createElement('div');
            hormoneInnerContainer.classList.add('chart-inner-container');
            const parent = hormoneCtx.canvas.parentElement;
            parent.insertBefore(hormoneInnerContainer, hormoneCtx.canvas);
            hormoneInnerContainer.appendChild(hormoneCtx.canvas);
        }

        if (measurements.length > maxPointsPerView) {
            const neededWidth = measurements.length * minPointWidth;

            if (medicationWrapper) {
                medicationWrapper.style.overflowX = 'auto';
                medicationWrapper.style.overflowY = 'hidden';
            }
            medInnerContainer.style.width = neededWidth + 'px';
            medInnerContainer.style.height = '230px';
            medicationCtx.canvas.style.width = '100%';
            medicationCtx.canvas.style.height = '100%';

            if (hormoneWrapper) {
                hormoneWrapper.style.overflowX = 'auto';
                hormoneWrapper.style.overflowY = 'hidden';
            }
            hormoneInnerContainer.style.width = neededWidth + 'px';
            hormoneInnerContainer.style.height = '230px';
            hormoneCtx.canvas.style.width = '100%';
            hormoneCtx.canvas.style.height = '100%';
        } else {
            if (medicationWrapper) {
                medicationWrapper.style.overflowX = 'hidden';
            }
            medInnerContainer.style.width = '100%';
            medInnerContainer.style.height = '230px';
            medicationCtx.canvas.style.width = '100%';
            medicationCtx.canvas.style.height = '100%';

            if (hormoneWrapper) {
                hormoneWrapper.style.overflowX = 'hidden';
            }
            hormoneInnerContainer.style.width = '100%';
            hormoneInnerContainer.style.height = '230px';
            hormoneCtx.canvas.style.width = '100%';
            hormoneCtx.canvas.style.height = '100%';
        }

        ensureAverageLinePluginRegistered();
        medicationChartInstance = new Chart(medicationCtx, { type: 'line', data: { labels, datasets: allDatasets }, options: chartOptions(() => medicationChartInstance) });
        hormoneChartInstance = new Chart(hormoneCtx, { type: 'line', data: { labels, datasets: hormoneDatasets }, options: chartOptions(() => hormoneChartInstance) });

        const medicationLegendEl = document.getElementById('medication-legend-controls');
        const hormoneLegendEl = document.getElementById('hormone-legend-controls');
        if (!medicationLegendEl || !hormoneLegendEl) return;

        const createGroupedLegend = (chart, container, titleKey) => {
            const allVisible = chart.data.datasets.length > 0 && chart.data.datasets.every((_, i) => chart.isDatasetVisible(i));
            const toggleText = allVisible ? translate('deselectAll') : translate('selectAll');
            const groupKey = chart.canvas.id === 'medication-chart' ? 'medication' : 'metric';
            const groupIndices = chart.data.datasets
                .map((ds, idx) => ({ ds, idx }))
                .filter(({ ds }) => (ds?._series?.kind || groupKey) === groupKey)
                .map(({ idx }) => idx);
            const groupAllVisible = groupIndices.length > 0 && groupIndices.every(i => chart.isDatasetVisible(i));
            const groupToggleText = groupAllVisible ? translate('deselectAll') : translate('selectAll');
            const items = chart.data.datasets.map((dataset, index) => {
                const color = dataset.borderColor;
                const isActive = chart.isDatasetVisible(index);
                const inactive = isActive ? '' : 'inactive';
                const bg = isActive ? color : 'transparent';
                const fg = isActive ? 'white' : getCssVar('--text-dim');
                return `<button class="legend-button ${inactive}" data-dataset-index="${index}" style="background-color: ${bg}; border-color: ${color}; color: ${fg};">${dataset.label}</button>`;
            }).join('');

            container.innerHTML = `
                <div class="briefing-legend-toolbar">
                    <button class="legend-button" data-action="toggle-all" style="background-color: var(--accent); border-color: var(--accent); color: white;">${toggleText}</button>
                </div>
                <div class="briefing-legend-grid">
                    <div class="legend-group-card">
                        <h5 class="legend-group-title">${translate(titleKey)}</h5>
                        <div class="legend-list" data-group="${groupKey}">${items}</div>
                        <div class="legend-group-toolbar">
                            <button class="legend-button legend-group-toggle" data-group="${groupKey}" data-action="toggle-group" style="background-color: var(--glass-bg); border-color: var(--glass-border); color: var(--text-dim); margin-top: 8px; width: 100%;">${groupToggleText}</button>
                        </div>
                    </div>
                </div>
            `;
        };

        createGroupedLegend(medicationChartInstance, medicationLegendEl, 'briefingGroupMedications');
        createGroupedLegend(hormoneChartInstance, hormoneLegendEl, 'briefingGroupMeasurements');

        const pointCount = labels.length;
        const medContainer = ensureChartWrapperContainer(medicationWrapper);
        const hormoneContainer = ensureChartWrapperContainer(hormoneWrapper);
        ensureChartZoomControls(medicationChartInstance, medicationWrapper, medInnerContainer, pointCount, 'medication-chart');
        ensureChartZoomControls(hormoneChartInstance, hormoneWrapper, hormoneInnerContainer, pointCount, 'hormone-chart');
        applyChartZoom(medicationChartInstance, medicationWrapper, medInnerContainer, pointCount, 'medication-chart');
        applyChartZoom(hormoneChartInstance, hormoneWrapper, hormoneInnerContainer, pointCount, 'hormone-chart');
    }

    // 캐러셀 스크롤 이벤트 핸들러 (유틸리티 함수 섹션에 추가해도 좋습니다)
    function handleCarouselScroll(event) {
        const contentEl = event.target;
        const dots = contentEl.closest('.carousel-container').querySelectorAll('.carousel-dot');
        if (!dots.length) return;

        const itemWidth = contentEl.querySelector('.carousel-item').offsetWidth;
        const scrollLeft = contentEl.scrollLeft;
        const currentIndex = Math.round(scrollLeft / itemWidth);

        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    // 가이드 카드 렌더링 함수
    function renderGuideCard() {
        const card = document.getElementById('sv-card-guide');
        const titleEl = document.getElementById('sv-card-guide-title');
        const contentEl = document.getElementById('sv-card-guide-content');
        const dotsEl = document.getElementById('sv-card-guide-dots');

        if (!card || !titleEl || !contentEl || !dotsEl) return;

        const renderId = (renderGuideCard._renderId = (renderGuideCard._renderId || 0) + 1);

        const localizeActionGuideText = (text) => {
            const s = String(text || '');
            if (!s) return s;
            const lang = currentLanguage || 'ko';
            if (lang === 'ko') return s;

            const dictionary = {
                en: {
                    '하체 집중 운동': 'Lower-body focused training',
                    '여성적 하체 라인 형성': 'Build a feminine lower-body line',
                    '여성적 곡선 만들기': 'Build feminine curves',
                    '근육 손실 방지': 'Prevent muscle loss',
                    '근육량 회복': 'Recover muscle mass',
                    '건강한 체중 증가 필요': 'Need healthy weight gain',
                    '주 3회, 복합 운동 중심': '3 times/week, compound-focused',
                    '단백질 섭취 늘리기': 'Increase protein intake',
                    '단백질 섭취 증가': 'Increase protein intake',
                    '고단백 식단으로 근육 보호': 'Protect muscle with a high-protein diet',
                    '건강한 지방 섭취': 'Healthy fat intake',
                    '호르몬 균형 및 지방 재분배': 'Hormone balance and fat redistribution',
                    '수분 섭취': 'Hydration',
                    '전반적인 건강': 'Overall health',
                    '하루 2-3리터': '2–3 liters/day',
                    '항안드로겐 증량 고려': 'Consider increasing anti-androgen',
                    '테스토스테론 억제가 충분하지 않습니다': 'Testosterone suppression is insufficient',
                    '에스트라디올 복용량 유지': 'Maintain estradiol dose',
                    '현재 수치가 이상적입니다': 'Current level is ideal',
                    '충분한 수분 섭취': 'Adequate hydration',
                    '하루 2-3리터 물 마시기': 'Drink 2–3 L of water per day',
                    '신진대사 및 호르몬 대사': 'Metabolism and hormone metabolism',
                    '정기 측정 유지': 'Keep regular measurements',
                    '일관성 있는 측정으로 정확한 추세 파악': 'Consistent measurements improve trend accuracy',
                    '피부 관리': 'Skin care',
                    '여성적 피부 유지': 'Maintain feminine skin',
                    '보습 및 관리': 'Moisturizing and care',
                    '근력 운동': 'Strength training',
                    '유산소 운동 증가': 'Increase cardio',
                    '체중 감소를 위한 유산소 운동': 'Cardio for weight loss',
                    '체중 증가 및 근육 발달': 'Build muscle and gain weight',
                    '주 3-4회, 30-45분': '3–4 times/week, 30–45 min',
                    '칼로리 섭취 조절': 'Adjust calorie intake',
                    '약물 복용량 관리': 'Manage medication dosage',
                    '습관 개선': 'Improve habits'
                },
                ja: {
                    '하체 집중 운동': '下半身集中トレ',
                    '여성적 하체 라인 형성': '女性らしい下半身ラインづくり',
                    '여성적 곡선 만들기': '女性らしい曲線づくり',
                    '근육 손실 방지': '筋肉減少の防止',
                    '근육량 회복': '筋肉量の回復',
                    '건강한 체중 증가 필요': '健康的な増量が必要',
                    '주 3회, 복합 운동 중심': '週3回、複合種目中心',
                    '단백질 섭취 늘리기': 'タンパク質摂取を増やす',
                    '단백질 섭취 증가': 'タンパク質摂取を増やす',
                    '고단백 식단으로 근육 보호': '高タンパク食で筋肉を守る',
                    '건강한 지방 섭취': '良質な脂質を摂る',
                    '호르몬 균형 및 지방 재분배': 'ホルモンバランスと脂肪再分配',
                    '수분 섭취': '水分補給',
                    '전반적인 건강': '全体的な健康',
                    '하루 2-3리터': '1日2〜3L',
                    '항안드로겐 증량 고려': '抗アンドロゲン増量を検討',
                    '테스토스테론 억제가 충분하지 않습니다': 'テストステロン抑制が不十分です',
                    '에스트라디올 복용량 유지': 'エストラジオール量を維持',
                    '현재 수치가 이상적입니다': '現在の値は理想的です',
                    '충분한 수분 섭취': '十分な水分補給',
                    '하루 2-3리터 물 마시기': '1日2〜3Lの水を飲む',
                    '신진대사 및 호르몬 대사': '代謝とホルモン代謝',
                    '정기 측정 유지': '定期測定を継続',
                    '일관성 있는 측정으로 정확한 추세 파악': '一貫した測定で正確な傾向を把握',
                    '피부 관리': 'スキンケア',
                    '여성적 피부 유지': '女性らしい肌を保つ',
                    '보습 및 관리': '保湿とケア',
                    '근력 운동': '筋力トレーニング',
                    '유산소 운동 증가': '有酸素運動を増やす',
                    '체중 감소를 위한 유산소 운동': '減量のための有酸素運動',
                    '체중 증가 및 근육 발달': '増量・筋肉増加',
                    '주 3-4회, 30-45분': '週3〜4回、30〜45分',
                    '칼로리 섭취 조절': '摂取カロリーの調整',
                    '약물 복용량 관리': '服薬量の管理',
                    '습관 개선': '習慣の改善'
                }
            };

            const direct = dictionary[lang]?.[s];
            if (direct) return direct;

            const metricToken = {
                ko: { '체중': 'weight', '허리': 'waist', '엉덩이': 'hips', '가슴': 'chest', '어깨': 'shoulder', '허벅지': 'thigh', '팔뚝': 'arm', '근육량': 'muscleMass', '체지방률': 'bodyFatPercentage' },
                en: { 'weight': 'Weight', 'waist': 'Waist', 'hips': 'Hips', 'chest': 'Chest', 'shoulder': 'Shoulder', 'thigh': 'Thigh', 'arm': 'Arm', 'muscleMass': 'Muscle Mass', 'bodyFatPercentage': 'Body Fat %' },
                ja: { 'weight': '体重', 'waist': 'ウエスト', 'hips': 'ヒップ', 'chest': '胸囲', 'shoulder': '肩幅', 'thigh': '太もも', 'arm': '腕', 'muscleMass': '筋肉量', 'bodyFatPercentage': '体脂肪率' }
            };

            const patterns = [
                {
                    regex: /^([0-9]+)주\s*연속\s*기록\s*중!$/,
                    replace: (m) => lang === 'en' ? `${m[1]}-week streak!` : `${m[1]}週連続記録中！`
                },
                {
                    regex: /^(.+?)\s*([0-9.]+)(kg|cm|%)\s*감소$/,
                    replace: (m) => {
                        const rawMetric = m[1].trim();
                        const key = metricToken.ko[rawMetric];
                        const metric = key ? metricToken[lang]?.[key] : rawMetric;
                        return lang === 'en' ? `${metric} decreased by ${m[2]}${m[3]}` : `${metric}が${m[2]}${m[3]}減少`;
                    }
                },
                {
                    regex: /^주간\s*([0-9.]+)kg\s*감소\s*\(권장:\s*([0-9.]+)kg\)$/,
                    replace: (m) => lang === 'en' ? `Weekly loss ${m[1]}kg (recommended: ${m[2]}kg)` : `週間${m[1]}kg減（推奨：${m[2]}kg）`
                },
                {
                    regex: /^목표\s*체지방률:\s*([0-9.]+\s*-\s*[0-9.]+)%\s*\(현재:\s*([0-9.]+)%\)$/,
                    replace: (m) => lang === 'en' ? `Target body fat: ${m[1].replace(/\s*/g, '')}% (current: ${m[2]}%)` : `目標体脂肪率：${m[1].replace(/\s*/g, '')}%（現在：${m[2]}%）`
                },
                {
                    regex: /^거의\s*다\s*왔어요!\s*약\s*([0-9]+)주\s*남았습니다!$/,
                    replace: (m) => lang === 'en' ? `Almost there! About ${m[1]} weeks left!` : `もうすぐです！あと約${m[1]}週間！`
                },
                {
                    regex: /^현재\s*추세로는\s*목표에서\s*멀어지고\s*있습니다\.$/,
                    replace: () => lang === 'en' ? `Trending away from target.` : `現在の傾向では目標から遠ざかっています。`
                },
                {
                    regex: /^<span[^>]*>trending_up<\/span>\s*순조롭게\s*진행\s*중입니다\.\s*약\s*([0-9]+)주\s*예상됩니다\.$/,
                    replace: (m) => lang === 'en' ? `On track. Estimated ${m[1]} weeks.` : `順調です。約${m[1]}週間と予想されます。`
                }
            ];

            for (const p of patterns) {
                const match = s.match(p.regex);
                if (match) return p.replace(match);
            }

            return s;
        };

        card.className = 'sv-card sv-card-widget carousel-container sv-card-with-image sv-card-image-normal sv-card--clickable';
        titleEl.innerHTML = `${translate('svcard_title_action_guide')}`;

        const metaByCategory = {
            exercise: { icon: '<span class="material-symbols-outlined category-icon">fitness_center</span>', titleKey: 'actionGuideCategoryExercise' },
            diet: { icon: '<span class="material-symbols-outlined category-icon">restaurant</span>', titleKey: 'actionGuideCategoryDiet' },
            medication: { icon: '<span class="material-symbols-outlined category-icon">medication</span>', titleKey: 'actionGuideCategoryMedication' },
            habits: { icon: '<span class="material-symbols-outlined category-icon">psychology</span>', titleKey: 'actionGuideCategoryHabits' }
        };

        const categoryKeys = ['exercise', 'diet', 'medication', 'habits'];

        const renderSlides = (recs) => {
            return categoryKeys.map((key) => {
                const meta = metaByCategory[key];
                const title = translate(meta.titleKey) || key;
                const list = Array.isArray(recs?.[key]) ? recs[key].slice(0, 3) : [];
                const itemsHtml = list.length > 0
                    ? list.map((it) => {
                        const itemTitle = localizeActionGuideText(it?.title || '');
                        const reason = localizeActionGuideText(it?.reason || it?.description || '');
                        return `
                            <div class="sv-action-item">
                                <div class="sv-action-item-title">${itemTitle}</div>
                                ${reason ? `<div class="sv-action-item-reason">${reason}</div>` : ''}
                            </div>
                        `;
                    }).join('')
                    : `<div class="sv-action-empty">${translate('notEnoughData')}</div>`;

                return `
                    <div class="carousel-item sv-action-slide">
                        <div class="sv-action-category">${meta.icon} ${title}</div>
                        <div class="sv-action-items">${itemsHtml}</div>
                    </div>
                `;
            }).join('');
        };

        contentEl.innerHTML = renderSlides(null);
        dotsEl.innerHTML = categoryKeys.map((_, index) => `<div class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`).join('');

        contentEl.removeEventListener('scroll', handleCarouselScroll);
        contentEl.addEventListener('scroll', handleCarouselScroll);
        contentEl.scrollLeft = 0;

        const userSettings = {
            mode: currentMode || 'mtf',
            biologicalSex: biologicalSex || 'male',
            language: currentLanguage || 'ko',
            targets: targets || {}
        };

        import('./src/doctor-module/core/doctor-engine.js').then((module) => {
            if (renderGuideCard._renderId !== renderId) return;
            const DoctorEngine = module.DoctorEngine || module.default;
            const engine = new DoctorEngine(measurements || [], userSettings);
            const guide = engine.generateActionGuide();
            const recs = guide?.recommendations || null;
            contentEl.innerHTML = renderSlides(recs);
            contentEl.scrollLeft = 0;
        }).catch(() => {
            if (renderGuideCard._renderId !== renderId) return;
            contentEl.innerHTML = renderSlides(null);
        });
    }

    // 목표 달성도 카드 렌더링 함수
    function renderTargetsCard() {
        if (!svCardTargets) return;

        let content = `<h3>${translate('svcard_title_targets')}</h3>`;
        const targetKeys = Object.keys(targets);

        if (measurements.length < 1 || targetKeys.length === 0) {
            content += `<div class="sv-card-content"><p>${translate('svcard_no_targets_set')}</p></div>`;
            svCardTargets.innerHTML = content;
            return;
        }

        const initial = measurements[0];
        const latest = measurements[measurements.length - 1];
        let totalProgress = 0;
        let validTargets = 0;

        targetKeys.forEach(key => {
            const targetValue = parseFloat(targets[key]);
            const initialValue = parseFloat(initial[key]);
            const latestValue = parseFloat(latest[key]);

            if (![targetValue, initialValue, latestValue].some(isNaN)) {
                const totalChangeNeeded = targetValue - initialValue;
                const currentChange = latestValue - initialValue;

                let progress = 0;
                if (Math.abs(totalChangeNeeded) > 0.01) {
                    progress = (currentChange / totalChangeNeeded) * 100;
                } else if (Math.abs(currentChange) < 0.01) {
                    progress = 100;
                }
                totalProgress += Math.max(0, Math.min(progress, 100)); // 0~100%로 제한
                validTargets++;
            }
        });

        const overallProgress = validTargets > 0 ? Math.round(totalProgress / validTargets) : 0;

        // M3 circular progress: r=38, circumference = 2*π*38 ≈ 238.76
        const circumference = 238.76;
        const dashOffset = (circumference * (1 - overallProgress / 100)).toFixed(2);
        content += `
        <div class="sv-card-content">
            <div class="m3-circular-progress"
                 role="progressbar"
                 aria-valuenow="${overallProgress}"
                 aria-valuemin="0"
                 aria-valuemax="100">
                <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
                    <circle class="m3-progress-track" cx="48" cy="48" r="38"/>
                    <circle class="m3-progress-indicator" cx="48" cy="48" r="38"
                            style="stroke-dashoffset:${dashOffset}"/>
                </svg>
                <span class="m3-progress-label">${overallProgress}%</span>
            </div>
            <p class="m3-progress-desc">${translate('svcard_overall_progress')}</p>
        </div>
    `;

        svCardTargets.innerHTML = content;
    }

    // 호르몬 카드 렌더링 함수
    function renderHormonesCard() {
        const card = document.getElementById('sv-card-hormones');
        if (!card) return;

        // Convert from carousel-container to a simple clickable card
        card.className = 'sv-card sv-card--clickable sv-card-hormones-compact';

        const analytics = calculateAdvancedHormoneAnalytics();
        const title = `<h3>${translate('svcard_title_hormones')}</h3>`;

        if (measurements.length < 1) {
            card.innerHTML = `${title}<p class="placeholder">${translate('svcard_no_hormone_data')}</p>`;
            return;
        }

        const getStatusBadge = (hormoneKey, status) => {
            const isE = hormoneKey === 'estrogenLevel';
            if (status === 'critical_high') return { cls: 'danger-badge', icon: 'warning', text: translate('estrogen_critical_high') };
            if (status === 'critical_low') return { cls: 'danger-badge', icon: 'warning', text: translate('testosterone_critical_low') };
            if (status === 'optimal') return { cls: 'optimal-badge', icon: 'check_circle', text: isE ? translate('estrogen_optimal') : translate('testosterone_optimal') };
            if (status === 'above_target') return { cls: 'above-badge', icon: 'arrow_upward', text: isE ? translate('estrogen_above_target') : translate('testosterone_above_target') };
            if (status === 'below_target') return { cls: 'below-badge', icon: 'arrow_downward', text: isE ? translate('estrogen_below_target') : translate('testosterone_below_target') };
            return { cls: 'neutral-badge', icon: 'remove', text: translate('no_target_set') };
        };

        const hormones = [
            { key: 'estrogenLevel', abbr: 'E₂', name: translate('estrogenLevel').split('(')[0] },
            { key: 'testosteroneLevel', abbr: 'T', name: translate('testosteroneLevel').split('(')[0] }
        ];

        const rowsHtml = hormones.map(h => {
            const current = analytics?.[h.key]?.current;
            const target = parseFloat(targets?.[h.key]);
            const status = analytics?.[h.key]?.status;
            const badge = getStatusBadge(h.key, status);
            const showTarget = Number.isFinite(target);

            return `
                <div class="shc-row">
                    <div class="shc-label">
                        <span class="shc-abbr">${h.abbr}</span>
                        <span class="shc-name">${h.name}</span>
                    </div>
                    <div class="shc-data">
                        <span class="shc-value">${Number.isFinite(current) ? formatValue(current, h.key) : '-'}</span>
                        ${showTarget ? `<span class="shc-target">${translate('svcard_label_target')} ${formatValue(target, h.key)}</span>` : ''}
                    </div>
                    <div class="shc-badge status-badge ${badge.cls}">
                        <span class="material-symbols-outlined">${badge.icon}</span>
                    </div>
                </div>`;
        }).join('');

        // E/T ratio mini bar
        let ratioHtml = '';
        if (analytics?.etRatio) {
            ratioHtml = `
                <div class="shc-ratio">
                    <div class="shc-ratio-bar">
                        <div class="shc-ratio-track">
                            <div class="shc-ratio-marker" style="left:${analytics.etRatio.position}%"></div>
                        </div>
                        <div class="shc-ratio-labels">
                            <span>♂</span>
                            <span class="shc-ratio-val">E/T ${analytics.etRatio.value.toFixed(2)}</span>
                            <span>♀</span>
                        </div>
                    </div>
                </div>`;
        }

        card.innerHTML = `${title}
            <div class="shc-grid">
                ${rowsHtml}
            </div>
            ${ratioHtml}`;
    }



    // ═══════════════════════════════════════════════════════════════
    // SV 카드 통합 렌더 헬퍼
    // 모든 sv-card 렌더 함수는 이 헬퍼를 사용해야 합니다.
    // - null guard 중앙화
    // - 에러 자동 catch + fallback
    // - card.className 일관성 보장
    // 사용: _svCard('sv-card-diary', 'sv-card--clickable', () => `<h3>...</h3>...`)
    // ═══════════════════════════════════════════════════════════════
    function _svCard(id, extraClasses, buildFn) {
        const card = document.getElementById(id);
        if (!card) return;
        card.className = `sv-card${extraClasses ? ' ' + extraClasses : ''}`;
        try {
            card.innerHTML = buildFn();
        } catch (e) {
            console.error(`[SV Card #${id}] render error:`, e);
            card.innerHTML = `<p class="placeholder">${translate('unexpectedError') || '표시 오류'}</p>`;
        }
    }

    /** svcard_title_* 키는 icon span 포함 HTML → innerHTML에 사용 */
    function _svCardTitle(key) {
        return `<h3>${translate(key)}</h3>`;
    }

    // ─── Diary Card ────────────────────────────────────────────────
    function renderDiaryCard() {
        _svCard('sv-card-diary', 'sv-card--clickable sv-card-with-image sv-card-image-diary', () => {
            let diaryData = {};
            try { diaryData = JSON.parse(localStorage.getItem('shiftv_diary') || '{}'); } catch { /**/ }

            const entries = Object.entries(diaryData)
                .filter(([, v]) => v && (v.text || v.mood))
                .sort(([a], [b]) => b.localeCompare(a))
                .slice(0, 3);

            const title = _svCardTitle('svcard_title_diary');

            if (entries.length === 0) {
                return `${title}<p class="placeholder">${translate('svcard_no_diary_yet')}</p>`;
            }

            const moodEmoji = { happy: '😊', neutral: '😐', sad: '😢', angry: '😤', tired: '😴', energetic: '💪', hopeful: '🌿' };
            const content = entries.map(([date, entry]) => `
                <div class="diary-preview-item">
                    <div class="diary-preview-header">
                        <span class="diary-preview-date">${date}</span>
                        ${entry.mood ? `<span class="diary-preview-mood">${moodEmoji[entry.mood] || '📝'}</span>` : ''}
                    </div>
                    ${entry.text ? `<p class="diary-preview-text">${escapeHTML(entry.text).substring(0, 60)}${entry.text.length > 60 ? '...' : ''}</p>` : ''}
                </div>`).join('');

            return title + content;
        });
    }

    // ─── Quest Card ────────────────────────────────────────────────
    function renderQuestCard() {
        _svCard('sv-card-quest', 'sv-card--clickable sv-card-with-image sv-card-image-quest', () => {
            let quests = [];
            try { quests = JSON.parse(localStorage.getItem('shiftv_quests') || '[]'); } catch { /**/ }

            const title = _svCardTitle('svcard_title_quest');
            const activeQuests = quests.filter(q => q.status !== 'completed').slice(0, 3);

            if (activeQuests.length === 0) {
                return `${title}<p class="placeholder">${translate('svcard_no_quest_yet')}</p>`;
            }

            const content = activeQuests.map(q => {
                let pct = 0;
                const tt = q.trackingType || 'manual';
                if (tt === 'progress') {
                    pct = Math.max(0, Math.min(100, q.progressValue ?? 0));
                } else if (tt === 'dday' && q.targetDate) {
                    const start = q.createdAt ? new Date(q.createdAt).getTime() : Date.now();
                    const target = new Date(q.targetDate).getTime();
                    const total = target - start;
                    pct = total <= 0 ? 100 : Math.max(0, Math.min(100, ((Date.now() - start) / total) * 100));
                } else {
                    const range = (q.targetValue || 0) - (q.initialValue || 0);
                    pct = range === 0 ? 0 : Math.max(0, Math.min(100, (((q.currentValue || 0) - (q.initialValue || 0)) / range) * 100));
                }
                pct = Math.round(pct);
                return `
                    <div class="quest-preview-item">
                        <div class="quest-preview-header">
                            <span class="quest-preview-title">${escapeHTML(q.title || q.name || '')}</span>
                            <span class="quest-preview-pct">${pct}%</span>
                        </div>
                        <div class="quest-preview-bar"><div class="quest-preview-fill" style="width:${pct}%"></div></div>
                    </div>`;
            }).join('');

            return title + content;
        });
    }

    // ─── Health Card ───────────────────────────────────────────────
    function renderHealthCard() {
        _svCard('sv-card-health', 'sv-card--clickable', () => {
            const title = _svCardTitle('svcard_title_health');

            if (!measurements || measurements.length === 0) {
                return `${title}<p class="placeholder">${translate('svcard_no_health_data')}</p>`;
            }

            return `${title}
                <div class="health-preview">
                    <span class="material-symbols-outlined mi-sm">shield</span>
                    <span>${translate('svcard_health_tap')}</span>
                </div>
                <div id="health-card-alerts" class="health-card-alerts-container"></div>`;
        });

        // Async: load symptom/alert data for the widget
        if (measurements && measurements.length > 0) {
            import('./src/doctor-module/core/doctor-engine.js').then(module => {
                const DoctorEngine = module.DoctorEngine || module.default;
                const userSettings = {
                    mode: currentMode || 'mtf',
                    biologicalSex: biologicalSex || 'male',
                    language: currentLanguage || 'ko',
                    targets: targets || {}
                };
                const engine = new DoctorEngine(measurements, userSettings);
                const briefing = engine.generateHealthBriefing();
                const alertsEl = document.getElementById('health-card-alerts');
                if (!alertsEl) return;

                const alerts = briefing?.alerts || [];
                const criticalAlerts = alerts.filter(a => a.level === 'critical');
                const warningAlerts = alerts.filter(a => a.level === 'warning');
                const infoAlerts = alerts.filter(a => a.level === 'info' || a.level === 'good');

                if (criticalAlerts.length === 0 && warningAlerts.length === 0) {
                    const okLabel = translate('health_no_issues') || (currentLanguage === 'ja' ? '特に問題なし' : currentLanguage === 'en' ? 'No issues detected' : '특이사항 없음');
                    alertsEl.innerHTML = `
                        <div class="health-chip health-chip--good">
                            <span class="material-symbols-outlined">check_circle</span>
                            <span>${okLabel}</span>
                        </div>`;
                    return;
                }

                let html = '';
                const maxShow = 3;
                const topAlerts = [...criticalAlerts.slice(0, maxShow), ...warningAlerts.slice(0, Math.max(0, maxShow - criticalAlerts.length))].slice(0, maxShow);

                topAlerts.forEach(alert => {
                    const isCritical = alert.level === 'critical';
                    const icon = isCritical ? 'error' : 'warning';
                    const cls = isCritical ? 'health-chip--critical' : 'health-chip--warning';
                    const msg = alert.title || alert.message || alert.description || '';
                    html += `
                        <div class="health-chip ${cls}">
                            <span class="material-symbols-outlined">${icon}</span>
                            <span>${msg}</span>
                        </div>`;
                });

                const remaining = (criticalAlerts.length + warningAlerts.length) - topAlerts.length;
                if (remaining > 0) {
                    html += `<div class="health-chip health-chip--more">+${remaining} ${translate('more') || (currentLanguage === 'ja' ? '件' : currentLanguage === 'en' ? 'more' : '건')}</div>`;
                }

                alertsEl.innerHTML = html;

                // Push health notification for new critical issues (session-once)
                if (criticalAlerts.length > 0 && !sessionStorage.getItem('healthNotifSent')) {
                    sessionStorage.setItem('healthNotifSent', '1');
                    if (typeof addNotification === 'function') {
                        addNotification({
                            type: 'health',
                            title: `건강 이슈 ${criticalAlerts.length}건 발견`,
                            body: criticalAlerts[0]?.title || criticalAlerts[0]?.message || '건강 분석 탭을 확인하세요.',
                        });
                    }
                }
            }).catch(e => {
                console.warn('[HealthCard] Failed to load alerts:', e);
            });
        }
    }

    // 모든 SV 카드를 한번에 렌더링하는 마스터 함수
    function renderSvTab() {
        if (!svGrid) return; // SV 탭이 아니면 실행 안 함

        console.log("DEBUG: Rendering SV Tab Cards...");
        renderShortcutCard();
        renderHighlightsCard();
        renderGuideCard();
        renderTargetsCard();
        renderHormonesCard();
        renderDiaryCard();
        renderQuestCard();
        renderHealthCard();

        // 계정/프로필 카드 (sv-cards.js 모듈에서 렌더링)
        if (svCardPersona) {
            try {
                _svRenderPersonaCard(svCardPersona, { measurements, targets, currentMode });
            } catch (e) {
                console.error('[SV Card #sv-card-persona] render error:', e);
            }
        }
    }

    function renderShortcutCard() {
        if (!svCardShortcut) return;

        try {
            svCardShortcut.className = 'sv-card sv-card--clickable';

            if (!measurements || measurements.length === 0) {
                // No data yet — show first-entry prompt with icon
                svCardShortcut.style.setProperty('--shortcut-bg-pct', '8%');
                svCardShortcut.innerHTML = `
                    <div class="shortcut-card shortcut--new">
                        <span class="material-symbols-outlined shortcut-new-icon">add_circle</span>
                        <div class="shortcut-detail">${translate('svcard_shortcut_new')}</div>
                    </div>`;
                return;
            }

            const lastMeasurement = measurements[measurements.length - 1];

            let lastTimestamp = lastMeasurement.timestamp;
            if (!lastTimestamp || isNaN(new Date(lastTimestamp).getTime())) {
                if (lastMeasurement.date) {
                    lastTimestamp = new Date(lastMeasurement.date).getTime();
                } else {
                    lastTimestamp = Date.now();
                }
            }

            const todayBase = new Date();
            todayBase.setHours(0, 0, 0, 0);
            const todayIndex = toLocalDayIndex(todayBase);
            const lastBase = getMeasurementBaseDate(lastMeasurement) || todayBase;
            const lastIndex = toLocalDayIndex(lastBase) ?? todayIndex;
            const daysSinceLast = todayIndex - lastIndex;
            const nextIndex = lastIndex + 7;
            const daysUntil = nextIndex - todayIndex;

            // Progressive background: 5% per day since last measurement
            const bgPct = Math.min(Math.max(daysSinceLast * 5, 0), 50);
            svCardShortcut.style.setProperty('--shortcut-bg-pct', `${bgPct}%`);

            let ddayLabel = '';
            let ddayClass = '';
            let detailText = '';

            if (daysUntil <= 0) {
                const overdue = Math.abs(daysUntil);
                if (daysUntil === 0) {
                    ddayLabel = 'D-Day';
                    ddayClass = 'shortcut-dday--dday';
                    detailText = translate('svcard_shortcut_dday');
                } else {
                    ddayLabel = `D+${overdue}`;
                    ddayClass = 'shortcut-dday--overdue';
                    detailText = translate('svcard_shortcut_overdue', { days: overdue });
                }
            } else {
                ddayLabel = `D-${daysUntil}`;
                if (daysUntil <= 1) { ddayClass = 'shortcut-dday--urgent'; }
                else if (daysUntil <= 3) { ddayClass = 'shortcut-dday--soon'; }
                else { ddayClass = 'shortcut-dday--ok'; }
                detailText = translate('svcard_shortcut_countdown', { days: daysUntil });
            }

            svCardShortcut.innerHTML = `
                <div class="shortcut-card">
                    <div class="shortcut-dday ${ddayClass}">${ddayLabel}</div>
                    <div class="shortcut-detail">${detailText}</div>
                </div>`;
        } catch (error) {
            console.error('Error in renderShortcutCard:', error);
            svCardShortcut.innerHTML = `<div class="shortcut-detail">${translate('svcard_shortcut_new')}</div>`;
        }
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

    // '마이' 탭의 기록 뷰를 렌더링하는 마스터 함수
    function renderMyHistoryView() {
        const isMobileView = window.innerWidth < 768;
        renderMyHistoryFilters(); // 필터는 항상 렌더링

        if (isMobileView) {
            if (myHistoryCardsContainer) myHistoryCardsContainer.style.display = 'grid';
            if (myHistoryTableContainer) myHistoryTableContainer.style.display = 'none';
            renderMyHistoryCards();
        } else {
            if (myHistoryCardsContainer) myHistoryCardsContainer.style.display = 'none';
            if (myHistoryTableContainer) myHistoryTableContainer.style.display = 'block';
            renderMyHistoryTable();
        }
    }

    // '마이' 탭의 필터 버튼 렌더링
    function renderMyHistoryFilters() {
        if (!myFilterControls) return;
        // 로직은 기존 renderHistoryFilters와 동일, 대상만 다름
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


    // --- My Tab History Rendering (Refactored) ---

    // '마이' 탭의 기록 뷰를 렌더링하는 마스터 함수
    function renderMyHistoryView() {
        // 필터링된 데이터와 헤더를 한 번만 계산
        const { data, headers } = getFilteredHistoryData();

        renderMyHistoryFilters(); // 필터 UI는 항상 렌더링

        // 화면 크기에 따라 카드 또는 테이블 뷰를 렌더링
        const isMobileView = window.innerWidth < 768;
        if (isMobileView) {
            if (myHistoryCardsContainer) myHistoryCardsContainer.style.display = 'grid';
            if (myHistoryTableContainer) myHistoryTableContainer.style.display = 'none';
            renderMyHistoryCards(data); // 계산된 데이터를 인자로 전달
        } else {
            if (myHistoryCardsContainer) myHistoryCardsContainer.style.display = 'none';
            if (myHistoryTableContainer) myHistoryTableContainer.style.display = 'block';
            renderMyHistoryTable(data, headers); // 계산된 데이터와 헤더를 인자로 전달
        }
    }

    // 표시할 기록 데이터를 계산하고 필터링하는 함수
    function getFilteredHistoryData() {
        if (!measurements || measurements.length === 0) {
            return { data: [], headers: [] };
        }

        const currentDisplayKeys = getFilteredDisplayKeys().filter(k => !legacyKeysToHideInTables.has(k));
        let headers = currentDisplayKeys.filter(k => k !== 'timestamp');

        // 헤더 필터링 (테이블 뷰용)
        if (activeHistoryFilters.length > 0) {
            headers = currentDisplayKeys.filter(key =>
                ['week', 'date', 'memo'].includes(key) || activeHistoryFilters.includes(key)
            );
        }

        // medications & symptoms are shown as chip rows below the table, not as columns
        headers = headers.filter(k => k !== 'symptoms' && k !== 'medications');

        // 데이터 필터링 (카드/테이블 뷰 공통)
        let filteredData = [...measurements];
        if (activeHistoryFilters.length > 0) {
            filteredData = measurements.filter(m => {
                // 선택된 모든 필터에 대해 데이터가 존재하는 기록만 남김
                return activeHistoryFilters.every(key =>
                    m[key] !== null && m[key] !== undefined && m[key] !== ''
                );
            });
        }

        const data = filteredData.reverse(); // 최신순 정렬

        return { data, headers };
    }

    // 투여 약물 hashtag chip row HTML 생성
    function buildMedicationChipRow(m) {
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

    // 증상 hashtag chip row HTML 생성
    function buildSymptomChipRow(m) {
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

    // '마이' 탭의 카드 뷰 렌더링 (모바일용)
    function renderMyHistoryCards(data) {
        if (!myHistoryCardsContainer) return;
        if (data.length === 0) {
            clearElement(myHistoryCardsContainer, "noDataYet");
            return;
        }

        let html = '';
        data.forEach(m => {
            const index = m.week;

            // medications & symptoms excluded from inner table — shown as chip rows below
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
                if (key === 'menstruationActive') return `<td class="value">${m.menstruationActive === true ? '<span class="material-symbols-outlined status-icon mi-success">check</span>' : '-'}</td>`;
                return `<td class="value">${formatValue(m[key], key)}</td>`;
            }).join('');

            // Build medication & symptom chip rows
            const medsRow = buildMedicationChipRow(m);
            const symptomsRow = buildSymptomChipRow(m);
            const tagsSection = (medsRow || symptomsRow)
                ? `<div class="history-card-tags">${medsRow}${symptomsRow}</div>`
                : '';

            // Memo: 2-line clamp with expand button
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

    // '마이' 탭의 테이블 뷰 렌더링 (데스크톱용)
    function renderMyHistoryTable(data, headers) {
        if (!myHistoryTableContainer) return;
        if (data.length === 0) {
            clearElement(myHistoryTableContainer, "noDataYet");
            return;
        }

        // medications & symptoms excluded as columns – displayed as chip sub-rows below each row
        const effectiveHeaders = (Array.isArray(headers) ? headers : [])
            .filter(k => !legacyKeysToHideInTables.has(k) && k !== 'symptoms' && k !== 'medications');

        const dataColCount = effectiveHeaders.filter(k => k !== 'timestamp').length;
        const totalColspan = dataColCount + 1; // +1 for action column

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
                else if (key === 'menstruationActive') value = m.menstruationActive === true ? '<span class="material-symbols-outlined status-icon mi-success">check</span>' : '-';
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
            // Tags sub-row for medications & symptoms
            const medsRow = buildMedicationChipRow(m);
            const symptomsRow = buildSymptomChipRow(m);
            if (medsRow || symptomsRow) {
                tableHTML += `<tr class="history-tags-row"><td colspan="${totalColspan}" class="history-tags-cell">${medsRow}${symptomsRow}</td></tr>`;
            }
        });

        tableHTML += '</tbody></table>';
        myHistoryTableContainer.innerHTML = tableHTML;
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
        if (chartInstance) renderChart();
        renderChartSelector();
    }

    function handleThemeChange(event) {
        currentTheme = event.target.value;
        console.log("DEBUG: Theme changed to", currentTheme);
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
        console.log("DEBUG: Settings loaded", isDefault ? '(defaults)' : '', settings);

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
                    console.log("DEBUG: Data migration applied (week numbers/timestamps/note IDs). Saving updated data.");
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
                console.log("DEBUG: Primary data loaded.", { measurements: measurements.length, targets: Object.keys(targets).length, notes: notes.length });
            } else {
                console.log("DEBUG: No primary data found in storage.");
                measurements = []; targets = {}; notes = [];
            }
        } catch (e) {
            console.error("Error loading or parsing primary data:", e);
            showPopup('loadingError');
            measurements = []; targets = {}; notes = [];
        }
    }

    // Check for App Updates
    function handleCheckForUpdates() {
        if (!navigator.onLine) {
            showPopup('popupOfflineForUpdate');
            return;
        }

        if (!('serviceWorker' in navigator)) {
            showPopup('popupUpdateFailed');
            return;
        }

        navigator.serviceWorker.ready.then(registration => {
            console.log("DEBUG: Checking for service worker update...");

            let updateFound = false;
            // Listen for the update event
            registration.addEventListener('updatefound', () => {
                updateFound = true;
                console.log('DEBUG: New service worker found, installing...');
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('DEBUG: New service worker installed and ready.');
                        showPopup('popupUpdateComplete', 3000);
                        // Reload the page to apply the update
                        setTimeout(() => window.location.reload(), 3000);
                    }
                });
            });

            // Trigger the update check
            registration.update().then(() => {
                // The 'update' promise doesn't tell us if an update was found.
                // We use a timeout to see if the 'updatefound' event fired.
                setTimeout(() => {
                    if (!updateFound) {
                        console.log('DEBUG: No new service worker found after check.');
                        showPopup('popupAlreadyLatest');
                    }
                }, 3000); // Wait 3 seconds
            }).catch(error => {
                console.error('Error during service worker update check:', error);
                showPopup('popupUpdateFailed');
            });

        }).catch(error => {
            console.error('Service worker not ready:', error);
            showPopup('popupUpdateFailed');
        });
    }

    function calculateAndAddWeekNumbers() {
        if (measurements.length === 0) return false;
        measurements.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        let weeksChanged = false;
        measurements.forEach((m, index) => {
            if (m.week !== index) { m.week = index; weeksChanged = true; }
        });
        if (weeksChanged) { console.log("DEBUG: Recalculated week numbers based on entry index."); }
        return weeksChanged;
    }


    function applyModeToUI() {
        console.log("DEBUG: Applying mode to UI:", currentMode);
        bodyElement.classList.remove('mode-mtf', 'mode-ftm');
        bodyElement.classList.add(`mode-${currentMode}`);

        // Show/hide elements
        document.querySelectorAll('.mtf-only').forEach(el => el.style.display = currentMode === 'mtf' ? '' : 'none');
        document.querySelectorAll('.ftm-only').forEach(el => el.style.display = currentMode === 'ftm' ? '' : 'none');

        if (modeSelect) modeSelect.value = currentMode;

        if (isInitialSetupDone) { // Avoid unnecessary renders during initial setup
            renderAllComparisonTables();
            renderChartSelector();
            renderChart();
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
            try { renderHistoryTable(); } catch { }
            try { renderMyHistoryView(); } catch { }
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
            try { renderHistoryTable(); } catch { }
            try { renderMyHistoryView(); } catch { }
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


    // --- History Tab Rendering ---
    function renderHistoryTable() {
        console.log("DEBUG: -> renderHistoryTable");
        if (!myHistoryTableContainer) return;
        if (!measurements || measurements.length === 0) {
            clearElement(myHistoryTableContainer, "noDataYet"); return;
        }
        try {
            measurements.sort((a, b) => (a.week || 0) - (b.week || 0));
            const currentDisplayKeys = getFilteredDisplayKeys().filter(k => !legacyKeysToHideInTables.has(k));
            // medications & symptoms excluded as columns – shown as chip sub-rows
            let filteredHeaderKeys = currentDisplayKeys.filter(k => k !== 'symptoms' && k !== 'medications');
            if (activeHistoryFilters.length > 0) {
                // '주차'와 '날짜'는 항상 표시하고, 선택된 필터 항목을 추가
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
                        value = m.menstruationActive === true ? '<span class="material-symbols-outlined status-icon mi-success">check</span>' : '-';
                    }
                    else { value = formatValue(m[key], key); }
                    tableHTML += `<td>${value}</td>`;
                });
                tableHTML += `<td class="sticky-col action-col"><div class="action-buttons">`;
                tableHTML += `<button class="glass-button btn-edit" data-index="${i}">${translate('edit')}</button>`;
                tableHTML += `<button class="glass-button danger btn-delete" data-index="${i}">${translate('delete')}</button>`;
                tableHTML += `</div></td>`;
                tableHTML += '</tr>';
                // Tags sub-row for medications & symptoms
                const medsRow = buildMedicationChipRow(m);
                const symptomsRow = buildSymptomChipRow(m);
                if (medsRow || symptomsRow) {
                    tableHTML += `<tr class="history-tags-row"><td colspan="${totalColspan}" class="history-tags-cell">${medsRow}${symptomsRow}</td></tr>`;
                }
            }
            tableHTML += '</tbody></table>';
            myHistoryTableContainer.innerHTML = tableHTML;
            console.log("DEBUG: <- renderHistoryTable complete");
        } catch (e) {
            console.error(" Error rendering history table:", e);
            myHistoryTableContainer.innerHTML = `<p style="color: red;">${translate('alertGenericError')}</p>`;
        }
    }

    // --- Report Tab Rendering ---
    function renderComparisonTable(container, titleKey, dataCalculator) {
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

            if (typeof changeValue === 'number') { // ** BUG FIX **
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

    function calculatePrevWeekComparison() {
        const headers = [translate('comparisonItem'), ' ', translate('comparisonChange')];
        if (measurements.length < 2) return { data: [], headers };

        const fullData = calculateComparisonData();
        const data = fullData.map(item => {
            const change = item.currentValue - item.prevValue;
            return { ...item, change: isNaN(change) ? null : change };
        });

        return { data, headers };
    }

    function calculateInitialComparison() {
        const headers = [translate('comparisonItem'), ' ', translate('comparisonChange')];
        if (measurements.length < 2) return { data: [], headers };

        const fullData = calculateComparisonData();
        const data = fullData.map(item => {
            const change = item.currentValue - item.initialValue;
            return { ...item, change: isNaN(change) ? null : change };
        });

        return { data, headers };
    }

    // script.js 수정 사항

    // 기존 calculateTargetComparison 함수를 찾아서 아래 코드로 전체를 교체해주세요.

    function calculateTargetComparison() {
        // 헤더를 명확하게 '남은 수치 (Target - Current)'로 인식하도록 변경
        const headers = [translate('comparisonItem'), ' ', translate('ComRemainder')];

        if (measurements.length < 1 || Object.keys(targets).length === 0) {
            return { data: [], headers };
        }

        const fullData = calculateComparisonData();

        const data = fullData.filter(item => item.targetValue !== null)
            .map(item => {
                let diff = null;

                // ★ 핵심 수정: 오직 (목표값 - 현재값)만 계산합니다.
                // 다른 조건(유지 목표 등) 다 제거하고 단순 뺄셈만 수행합니다.
                if (item.currentValue !== null && item.targetValue !== null) {
                    // 부동소수점 오차 제거를 위해 toFixed 후 다시 숫자로 변환
                    diff = parseFloat((item.targetValue - item.currentValue).toFixed(2));
                }

                // item.progress 속성에 '차이값'을 저장합니다. (변수명은 편의상 유지)
                return { ...item, progress: diff };
            });

        return { data, headers };
    }

    // ** FINAL FIX for Progress Bar Rendering with Label Overlap Logic **
    // ** FINAL FIX for Progress Bar Rendering with Overlap & Label Logic **
    // ** FINAL FIX for Progress Bar Rendering with Overlap & Label Logic **
    // script.js 파일에서 createProgressBarHTML 함수를 찾아 아래 코드로 교체해주세요.

    function createProgressBarHTML(data) {
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
            v.staggerClass = ''; // 엇갈림 클래스를 저장할 속성 초기화
        });
        values.sort((a, b) => a.pos - b.pos);

        // ▼▼▼ 좌우 엇갈림 로직 ▼▼▼
        for (let i = 1; i < values.length; i++) {
            const prev = values[i - 1];
            const curr = values[i];
            // 15% 이내로 가까우면 겹침으로 간주
            if (curr.pos - prev.pos < 15) {
                // 왼쪽 라벨은 왼쪽으로, 오른쪽 라벨은 오른쪽으로 밀어냅니다.
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
            // JS에서 할당한 staggerClass를 사용합니다.
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


    function renderAllComparisonTables() {
        renderComparisonTable(prevWeekComparisonContainer, 'reportPrevWeekTitle', calculatePrevWeekComparison);
        renderComparisonTable(initialComparisonContainer, 'reportInitialTitle', calculateInitialComparison);
        renderComparisonTable(targetComparisonContainer, 'reportTargetTitle', calculateTargetComparison);
    }

    const metricButtonColors = {};

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

    // script.js 에서 renderChartSelector 함수를 찾아 교체
    function renderChartSelector() {
        if (!chartSelector) return;
        const availableKeys = getFilteredChartKeys();
        chartSelector.innerHTML = '';

        const isLightMode = document.body.classList.contains('light-mode');
        const palette = isLightMode ? colorPalette.light : colorPalette.dark;

        availableKeys.forEach((key, index) => {
            const button = document.createElement('button');
            button.classList.add('chart-select-button');
            button.dataset.metric = key;
            button.textContent = translate(key).split('(')[0].trim();

            const colorIndex = index % palette.active.length;
            const activeColor = palette.active[colorIndex];
            const inactiveColor = palette.inactive[colorIndex];

            // metricButtonColors 객체에 두 색상 모두 저장
            metricButtonColors[key] = { active: activeColor, inactive: inactiveColor };

            if (selectedMetrics.includes(key)) {
                button.classList.add('active');
                button.style.backgroundColor = activeColor;
                button.style.borderColor = activeColor;
                button.style.color = '#ffffff';
            } else {
                button.classList.remove('active');
                // 비활성 버튼에 반투명 배경 추가 (콘트라스트 개선)
                const inactiveBgOpacity = isLightMode ? 0.15 : 0.1;
                const inactiveBgColor = activeColor + Math.floor(inactiveBgOpacity * 255).toString(16).padStart(2, '0');
                button.style.backgroundColor = inactiveBgColor;
                button.style.borderColor = inactiveColor;
                button.style.color = inactiveColor;
            }
            chartSelector.appendChild(button);
        });
    }

    // script.js 에서 handleChartSelectorClick 함수를 찾아 교체
    function handleChartSelectorClick(event) {
        if (!event.target.classList.contains('chart-select-button')) return;
        const metric = event.target.dataset.metric;
        if (!metric) return;

        const button = event.target;
        const colors = metricButtonColors[metric]; // 저장된 색상 객체 가져오기
        const isLightMode = document.body.classList.contains('light-mode');

        if (selectedMetrics.includes(metric)) {
            // --- 비활성화 로직 ---
            selectedMetrics = selectedMetrics.filter(m => m !== metric);
            button.classList.remove('active');
            // 비활성 버튼에 반투명 배경 추가 (콘트라스트 개선)
            const inactiveBgOpacity = isLightMode ? 0.15 : 0.1;
            const inactiveBgColor = colors.active + Math.floor(inactiveBgOpacity * 255).toString(16).padStart(2, '0');
            button.style.backgroundColor = inactiveBgColor;
            button.style.borderColor = colors.inactive;
            button.style.color = colors.inactive;
        } else {
            // --- 활성화 로직 ---
            selectedMetrics.push(metric);
            button.classList.add('active');
            button.style.backgroundColor = colors.active;
            button.style.borderColor = colors.active;
            button.style.color = '#ffffff';
        }

        saveSettingsToStorage();
        renderChart();
    }
    function handleSelectAllCharts() {
        selectedMetrics = [...getFilteredChartKeys()];
        renderChartSelector(); saveSettingsToStorage(); renderChart();
    }

    function handleDeselectAllCharts() {
        selectedMetrics = [];
        renderChartSelector(); saveSettingsToStorage(); renderChart();
    }

    // script.js 에서 renderChart 함수를 찾아 아래의 코드로 전체를 교체해주세요.

    function renderChart() {
        if (!chartCanvas) return;
        const ctx = chartCanvas.getContext('2d'); if (!ctx) return;
        const metricsToRender = selectedMetrics.filter(key => getFilteredChartKeys().includes(key));

        if (measurements.length < 1 || metricsToRender.length === 0) {
            if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
            ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);

            // ... (이 부분은 기존과 동일하므로 생략) ...

            const text = translate('noDataForChart');
            const x = chartCanvas.width / 2;
            let y = chartCanvas.height / 2;
            const lineHeight = 20;
            const padding = 20;
            const maxWidth = chartCanvas.width - (padding * 2);

            ctx.textAlign = 'center';
            ctx.fillStyle = getComputedStyle(bodyElement).getPropertyValue('--text-dim').trim();
            ctx.font = '16px ' + getComputedStyle(bodyElement).getPropertyValue('--font-family');

            const words = text.split(' ');
            let line = '';
            let lines = [];

            for (let n = 0; n < words.length; n++) {
                let testLine = line + words[n] + ' ';
                let metrics = ctx.measureText(testLine);
                let testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    lines.push(line);
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);
            y -= (lines.length - 1) * lineHeight / 2;
            for (let i = 0; i < lines.length; i++) {
                ctx.fillText(lines[i].trim(), x, y);
                y += lineHeight;
            }
            return;
        }
        const labels = measurements.map(m => m.week ?? '-');
        const datasets = metricsToRender.map(metric => {
            // ▼▼▼▼▼ 바로 이 부분이 수정되었습니다! ▼▼▼▼▼
            // 기존: const color = metricButtonColors[metric] || '#007bff';
            // 수정: .active를 추가하여 객체에서 실제 색상 문자열을 가져옵니다.
            const color = metricButtonColors[metric]?.active || '#007bff';
            // ▲▲▲▲▲ 바로 이 부분이 수정되었습니다! ▲▲▲▲▲

            const translatedLabel = translate(metric).split('(')[0].trim();
            return {
                label: translatedLabel,
                data: measurements.map(m => m[metric] !== undefined && m[metric] !== null && m[metric] !== '' ? parseFloat(m[metric]) : NaN),
                borderColor: color,
                backgroundColor: color + '33',
                fill: false,
                tension: 0.1,
                pointRadius: 3,
                pointHoverRadius: 5,
                spanGaps: true,
                borderWidth: 2,
                parsing: { xAxisKey: 'x', yAxisKey: 'y' }
            };
        });
        if (chartInstance) { chartInstance.destroy(); }

        // 차트 스크롤 기능
        const maxPointsPerView = 20;
        const minPointWidth = 40;
        const chartWrapper = ctx.canvas.closest('.chart-wrapper');

        // 차트를 감싸는 내부 div가 있는지 확인하고 없으면 생성
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
            // 외부 wrapper에 스크롤 설정
            if (chartWrapper) {
                chartWrapper.style.overflowX = 'auto';
                chartWrapper.style.overflowY = 'hidden';
            }
            // 내부 컨테이너의 너비를 고정
            chartInnerContainer.style.width = neededWidth + 'px';
            chartInnerContainer.style.height = '230px';
            // 캔버스는 100%로 설정하여 컨테이너에 맞춤
            ctx.canvas.style.width = '100%';
            ctx.canvas.style.height = '100%';
        } else {
            if (chartWrapper) {
                chartWrapper.style.overflowX = 'hidden';
            }
            chartInnerContainer.style.width = '100%';
            chartInnerContainer.style.height = '230px';
            ctx.canvas.style.width = '100%';
            ctx.canvas.style.height = '100%';
        }

        ensureAverageLinePluginRegistered();
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: datasets.map(ds => ({
                    ...ds,
                    data: ds.data.map((value, index) => ({ x: labels[index], y: value }))
                }))
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: translate('chartAxisLabel'),
                            // <<< 제목 색상도 동적으로 변경
                            color: document.body.classList.contains('light-mode') ? '#5c5c8a' : getCssVar('--text-dim')
                        },
                        ticks: {
                            stepSize: 1,
                            callback: function (value) { if (Number.isInteger(value) && value >= 0) { return value; } return null; },
                            // <<< 틱 색상도 동적으로 변경
                            color: document.body.classList.contains('light-mode') ? '#5c5c8a' : getCssVar('--text-dim')
                        },
                        border: {
                            display: true,
                            // <<< 테두리 및 그리드 색상도 동적으로 변경
                            color: document.body.classList.contains('light-mode') ? 'rgba(200, 200, 235, 0.5)' : getCssVar('--glass-border')
                        },
                        grid: {
                            display: true,
                            color: document.body.classList.contains('light-mode') ? 'rgba(200, 200, 235, 0.5)' : getCssVar('--glass-border')
                        }
                    },
                    y: {
                        beginAtZero: false, title: { display: false },
                        border: {
                            display: true,
                            color: document.body.classList.contains('light-mode') ? 'rgba(200, 200, 235, 0.5)' : getCssVar('--glass-border')
                        },
                        grid: {
                            color: document.body.classList.contains('light-mode') ? 'rgba(200, 200, 235, 0.5)' : getCssVar('--glass-border')
                        },
                        ticks: {
                            color: document.body.classList.contains('light-mode') ? '#5c5c8a' : getCssVar('--text-dim')
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index', intersect: false,
                        callbacks: {
                            title: function (tooltipItems) { return tooltipItems.length > 0 ? `${translate('week')} ${tooltipItems[0].parsed.x}` : ''; },
                            label: function (context) {
                                let label = context.dataset.label || ''; let value = context.parsed.y;
                                if (label) { label += ': '; }
                                if (value !== null && !isNaN(value)) {
                                    let originalKey = ''; const datasetIndex = context.datasetIndex;
                                    if (metricsToRender[datasetIndex]) { originalKey = metricsToRender[datasetIndex]; }
                                    else { originalKey = context.dataset.label; }
                                    label += formatValue(value, originalKey);
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
                interaction: { mode: 'nearest', axis: 'x', intersect: false }
            }
        });
        console.log("DEBUG: Chart rendered/updated.");
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
    function setupTargetInputs(updateOnly = false) {
        if (!targetGrid) {
            targetGrid = targetForm ? targetForm.querySelector('.target-grid') : null;
            if (!targetGrid) { console.error("Target grid container not found."); return; }
        }
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
        if (!targetGrid) return;
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

    // --- Event Handlers ---

    async function handleSaveMeasurement() {
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

                const numValue = parseFloat(value);
                if (Number.isNaN(numValue) || numValue < 0) {
                    collectedData[key] = null;
                    if (inputElement) {
                        inputElement.classList.add('invalid-input');
                        if (!firstInvalidField) firstInvalidField = inputElement;
                    }
                    isValid = false;
                    continue;
                }

                if (key === 'estrogenLevel') {
                    const unit = document.getElementById('estrogenUnit')?.value || 'pg/ml';
                    collectedData[key] = unitEvaluator.normalizeUnit('estrogenLevel', numValue, unit);
                } else if (key === 'testosteroneLevel') {
                    const unit = document.getElementById('testosteroneUnit')?.value || 'ng/dl';
                    collectedData[key] = unitEvaluator.normalizeUnit('testosteroneLevel', numValue, unit);
                } else if (key === 'weight') {
                    const unit = document.getElementById('weightUnit')?.value || 'kg';
                    collectedData[key] = unitEvaluator.normalizeUnit('weight', numValue, unit);
                } else {
                    collectedData[key] = numValue;
                }
            } else {
                if (key === 'menstruationActive') {
                    collectedData[key] = document.getElementById('menstruationActive')?.checked === true;
                } else {
                    collectedData[key] = (value !== null && value !== undefined) ? (value.toString().trim() || null) : null;
                }
            }
        }

        const menstruationActive = document.getElementById('menstruationActive')?.checked === true;
        collectedData.menstruationActive = menstruationActive;
        if (menstruationActive) {
            const painRaw = document.getElementById('menstruationPain')?.value;
            const pain = painRaw === null || painRaw === undefined || painRaw === '' ? null : parseInt(painRaw, 10);
            collectedData.menstruationPain = Number.isNaN(pain) ? null : pain;
        } else {
            collectedData.menstruationPain = null;
        }

        const symptoms = window.symptomSelector ? window.symptomSelector.getSymptoms() : [];
        collectedData.symptoms = Array.isArray(symptoms) && symptoms.length > 0 ? symptoms : null;

        const medsRaw = window.medicationSelector ? window.medicationSelector.getMedications() : [];
        const meds = Array.isArray(medsRaw)
            ? medsRaw
                .map(m => {
                    const medId = m?.id || m?.medicationId || null;
                    if (!medId) return null;
                    const dose = m?.dose === null || m?.dose === undefined || Number.isNaN(m?.dose) ? null : m.dose;
                    const unit = m?.unit || 'mg';
                    return { id: medId, dose, unit, date };
                })
                .filter(Boolean)
            : [];

        collectedData.medications = meds.length > 0 ? meds : null;

        if (!isValid) {
            showPopup('alertValidationError', 4000);
            if (firstInvalidField) firstInvalidField.focus();
            return null;
        }

        if (!isEdit) {
            collectedData.timestamp = timestamp;
            collectedData.date = date;
            collectedData.week = measurements.length;
        }

        // Pending photos (references only; actual upload handled in handleFormSubmit)
        collectedData._pendingPhotos = window._pendingPhotos || null;

        return { isEdit, indexToUpdate, data: collectedData };
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        const saved = await handleSaveMeasurement();
        if (!saved) return;

        if (saved.isEdit) {
            if (saved.indexToUpdate >= 0 && saved.indexToUpdate < measurements.length) {
                measurements[saved.indexToUpdate] = saved.data;
                showPopup('popupUpdateSuccess');
            } else {
                console.error("Invalid index for editing:", saved.indexToUpdate);
                showPopup('savingError');
                return;
            }
        } else {
            // Check for duplicate date
            const existingIndex = checkDuplicateDate(saved.data.date);
            if (existingIndex >= 0) {
                const shouldOverwrite = await showDuplicateDateDialog(saved.data.date);
                if (!shouldOverwrite) return;
                // Overwrite existing
                measurements[existingIndex] = { ...measurements[existingIndex], ...saved.data };
                showPopup('popupUpdateSuccess');
            } else {
                const fullMeasurementData = {};
                [...baseNumericKeys, ...textKeys, 'symptoms', 'medications', 'date', 'week', 'timestamp'].forEach(key => {
                    fullMeasurementData[key] = saved.data.hasOwnProperty(key) ? saved.data[key] : null;
                });
                measurements.push(fullMeasurementData);
                showPopup('popupSaveSuccess');
            }
            activateTab('tab-sv');
            measurements.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            calculateAndAddWeekNumbers();
        }

        // Clean up pending photos reference (not persisted in measurement data)
        delete saved.data._pendingPhotos;

        savePrimaryDataToStorage();

        // Notification: measurement saved
        if (typeof addNotification === 'function') {
            const weekNum = measurements[measurements.length - 1]?.week ?? measurements.length;
            addNotification({
                type: 'measurement',
                title: `${weekNum}주차 측정 저장됨`,
                body: `${formatTimestamp(Date.now(), false)} 측정 기록이 저장되었습니다.`,
            });
        }

        resetFormState();
        renderAll();
        applyModeToUI();
    }

    // Delete Measurement
    function handleDeleteMeasurement(index) {
        if (index >= 0 && index < measurements.length) {
            const entry = measurements[index];
            const weekNum = entry.week ?? index;
            if (confirm(translate('confirmDeleteRecord', { week: weekNum, date: formatTimestamp(entry.timestamp || entry.date, false) }))) { // Use updated confirm key
                measurements.splice(index, 1);
                console.log("DEBUG: Measurement deleted at index", index);
                savePrimaryDataToStorage();
                renderAll();
                showPopup('popupDeleteSuccess');
            }
        } else { console.error("Invalid index for deletion:", index); showPopup('alertCannotFindRecordDelete'); }
    }

    // Edit Measurement
    function handleEditClick(index) {
        if (index >= 0 && index < measurements.length) {
            const measurementToEdit = measurements[index];
            console.log("DEBUG: Editing measurement at index", index, measurementToEdit);

            [...baseNumericKeys, ...textKeys, 'date'].forEach(key => { // Add date key
                const input = form.querySelector(`[name="${key}"]`); // Find by camelCase name
                if (input) {
                    if (measurementToEdit.hasOwnProperty(key)) {
                        if (key === 'date' && measurementToEdit[key]) {
                            input.value = formatTimestamp(measurementToEdit[key], false); // YYYY-MM-DD format for date input
                        } else {
                            input.value = measurementToEdit[key] !== null ? measurementToEdit[key] : '';
                        }
                    } else { input.value = ''; }
                    input.classList.remove('invalid-input');
                }
            });
            // 증상 데이터 로드
            if (window.symptomSelector && measurementToEdit.symptoms) {
                try {
                    window.symptomSelector.setSymptoms(measurementToEdit.symptoms);
                } catch (error) {
                    console.error('Error loading symptoms:', error);
                }
            } else if (window.symptomSelector) {
                window.symptomSelector.reset();
            }

            if (window.medicationSelector && measurementToEdit.medications) {
                try {
                    window.medicationSelector.setMedications(measurementToEdit.medications);
                } catch (error) {
                    console.error('Error loading medications:', error);
                }
            } else if (window.medicationSelector) {
                window.medicationSelector.reset();
            }

            editIndexInput.value = index;
            // Initialize Unit Selects from Preference
            ['estrogenUnit', 'testosteroneUnit'].forEach(persistKey => {
                const savedUnit = localStorage.getItem('shiftV_' + persistKey);
                if (savedUnit) {
                    const select = document.getElementById(persistKey);
                    if (select) select.value = savedUnit;
                }
            });

            // Initialize Form Title
            updateFormTitle();
            if (saveUpdateBtn) saveUpdateBtn.textContent = translate('edit');
            if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block';
            activateTab('tab-record');
            setTimeout(() => {
                form.scrollIntoView({ behavior: 'smooth', block: 'start' });
                const firstVisibleInput = form.querySelector('fieldset:not([style*="display: none"]) input, fieldset:not([style*="display: none"]) textarea');
                if (firstVisibleInput) firstVisibleInput.focus();
            }, 150);
        } else { console.error("Invalid index for editing:", index); showPopup('alertCannotFindRecordEdit'); }
    }

    // Cancel Edit
    function cancelEdit() { resetFormState(); console.log("DEBUG: Edit cancelled."); }

    // Reset form
    function resetFormState() {
        if (form) form.reset();
        form.querySelectorAll('.invalid-input').forEach(el => el.classList.remove('invalid-input'));
        editIndexInput.value = '';

        // Restore Unit Preferences
        ['estrogenUnit', 'testosteroneUnit'].forEach(persistKey => {
            const savedUnit = localStorage.getItem('shiftV_' + persistKey);
            if (savedUnit) {
                const select = document.getElementById(persistKey);
                if (select) select.value = savedUnit;
            }
        });

        const lastMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;

        // 증상 선택기: 마지막 기록을 기본값으로 유지 (약물 선택기와 동일한 UX)
        if (window.symptomSelector) {
            try {
                window.symptomSelector.setSymptoms(lastMeasurement?.symptoms || null);
                setTimeout(() => {
                    const active = document.activeElement;
                    if (active && active.classList && active.classList.contains('symptom-select')) {
                        try { active.blur(); } catch { }
                    }
                }, 0);
            } catch (error) {
                console.error('Error resetting symptom selector:', error);
            }
        }
        if (window.medicationSelector) {
            try {
                window.medicationSelector.setMedications(lastMeasurement?.medications || null);
            } catch (error) {
                console.error('Error resetting medication selector:', error);
            }
        }

        updateFormTitle();
        if (saveUpdateBtn) saveUpdateBtn.textContent = translate('saveRecord');
        if (cancelEditBtn) cancelEditBtn.style.display = 'none';
        updatePlaceholders();

        // Reset photo previews
        window._pendingPhotos = {};
        document.querySelectorAll('.photo-preview-circle').forEach(preview => {
            preview.classList.remove('has-photo');
            preview.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8h-3zM5 19l3-4 2 3 3-4 4 5H5z" fill="currentColor"/></svg>';
        });
    }

    // --- Duplicate Date Dialog ---
    function checkDuplicateDate(date) {
        return measurements.findIndex(m => m.date === date);
    }

    function showDuplicateDateDialog(date) {
        return new Promise((resolve) => {
            const dialog = document.getElementById('date-conflict-dialog');
            if (!dialog) { resolve(false); return; }
            dialog.style.display = 'flex';

            const cancelBtn = document.getElementById('date-conflict-cancel');
            const overwriteBtn = document.getElementById('date-conflict-overwrite');

            function cleanup() {
                dialog.style.display = 'none';
                cancelBtn.removeEventListener('click', onCancel);
                overwriteBtn.removeEventListener('click', onOverwrite);
            }
            function onCancel() { cleanup(); resolve(false); }
            function onOverwrite() { cleanup(); resolve(true); }

            cancelBtn.addEventListener('click', onCancel);
            overwriteBtn.addEventListener('click', onOverwrite);
        });
    }

    function updatePlaceholders() {
        _updatePlaceholders({ form, measurements, translate, formatValue });
    }

    // Save Targets
    async function handleTargetFormSubmit(event) {
        event.preventDefault(); if (!targetForm || !targetGrid) return;
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
                    newTargets[key] = null; // Invalid treated as cleared
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
            } else { newTargets[key] = null; } // Empty treated as cleared
        });
        if (!isValid) {
            showPopup('alertValidationError', 4000); if (firstInvalidField) firstInvalidField.focus(); return;
        }
        const updatedTargets = { ...targets };
        targetSettingKeys.forEach(key => {
            const inputElement = targetGrid.querySelector(`input[name="${key}"]`);
            const isVisible = inputElement && inputElement.closest('.form-group').style.display !== 'none';
            if (isVisible) { // Only update visible targets
                if (newTargets.hasOwnProperty(key)) { updatedTargets[key] = newTargets[key]; }
            }
        });
        Object.keys(updatedTargets).forEach(key => { if (updatedTargets[key] === null) delete updatedTargets[key]; }); // Clean nulls
        targets = updatedTargets;
        console.log("DEBUG: Targets saved", targets);
        savePrimaryDataToStorage();
        showPopup('popupTargetSaveSuccess');
        activateTab('tab-sv');
        renderAllComparisonTables();
    }


    // Handle Language Change
    function handleLanguageChange(event) {
        currentLanguage = event.target.value; console.log("DEBUG: Language changed to", currentLanguage);

        syncModuleLanguage(currentLanguage);

        // 증상 선택기 언어 업데이트
        if (window.symptomSelector) {
            try {
                window.symptomSelector.setLanguage(currentLanguage);
            } catch (error) {
                console.error('Error updating symptom selector language:', error);
            }
        }

        if (window.medicationSelector) {
            try {
                window.medicationSelector.setLanguage(currentLanguage);
            } catch (error) {
                console.error('Error updating medication selector language:', error);
            }
        }

        // 증상/약물 맵 무효화 (언어 변경 시 재생성)
        symptomLabelMap = null;
        symptomLabelMapPromise = null;
        medicationNameMap = null;
        medicationNameMapPromise = null;

        saveSettingsToStorage(); applyLanguageToUI(); showPopup('popupSettingsSaved');

        // 폼 타이틀 및 측정 정보 업데이트
        if (typeof updateFormTitle === 'function') updateFormTitle();
        if (typeof renderNextMeasurementInfo === 'function') renderNextMeasurementInfo();

        // 기록 테이블 강제 재렌더링
        if (typeof renderHistoryTable === 'function') renderHistoryTable();
        if (typeof renderMyHistoryView === 'function') renderMyHistoryView();
    }

    // Handle Mode Change
    function handleModeChange(event) {
        currentMode = event.target.value; console.log("DEBUG: Mode changed to", currentMode);

        // 증상 선택기 모드 업데이트
        if (window.symptomSelector) {
            try {
                window.symptomSelector.setMode(currentMode);
            } catch (error) {
                console.error('Error updating symptom selector mode:', error);
            }
        }

        if (window.medicationSelector) {
            try {
                window.medicationSelector.setMode(currentMode);
            } catch (error) {
                console.error('Error updating medication selector mode:', error);
            }
        }

        saveSettingsToStorage(); applyModeToUI(); showPopup('popupSettingsSaved');
    }

    // Reset All Data
    function handleResetData() {
        if (confirm(translate('confirmReset'))) {
            console.log("DEBUG: Resetting all data.");

            localStorage.removeItem(PRIMARY_DATA_KEY);

            measurements = [];
            targets = {};
            notes = [];

            isInitialSetupDone = false;
            saveSettingsToStorage();

            showPopup('popupDataResetSuccess', 3000);

            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    }

    // Export Data
    function exportMeasurementData() {
        try {
            const dataToExport = {
                app: "ShiftV", version: APP_VERSION, exportDate: new Date().toISOString(),
                settings: { language: currentLanguage, mode: currentMode, theme: currentTheme, biologicalSex: biologicalSex, selectedMetrics: selectedMetrics },
                data: { measurements: measurements, targets: targets, notes: notes }
            };
            const dataStr = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            a.href = url; a.download = `ShiftV_Backup_${timestamp}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            console.log("DEBUG: Data exported."); showPopup('popupDataExportSuccess');
        } catch (e) { console.error("Error exporting data:", e); showPopup('alertExportError'); }
    }

    // CSV Export
    function exportCSV() {
        try {
            if (!measurements || measurements.length === 0) {
                showPopup('alertNoData', 3000);
                return;
            }
            // Gather all keys
            const allKeys = new Set();
            measurements.forEach(m => Object.keys(m).forEach(k => allKeys.add(k)));
            const headers = ['date', 'week', ...([...allKeys].filter(k => k !== 'date' && k !== 'week' && k !== 'timestamp').sort()), 'timestamp'];

            // UTF-8 BOM for Excel compatibility
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
            a.href = url;
            a.download = `ShiftV_Export_${timestamp}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showPopup('popupDataExportSuccess');
        } catch (e) {
            console.error('CSV export error:', e);
            showPopup('alertExportError');
        }
    }

    // Import Data
    function importMeasurementData(event) {
        const file = event.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const imported = JSON.parse(e.target.result);
                const isValidShiftV = imported?.app === "ShiftV" && imported?.data && Array.isArray(imported.data.measurements) && typeof imported.data.targets === 'object' && Array.isArray(imported.data.notes);
                // Legacy format check removed for simplicity

                if (isValidShiftV) {
                    if (!confirm(translate('alertImportConfirm'))) {
                        if (importFileInput) importFileInput.value = ''; return;
                    }
                    measurements = imported.data.measurements;
                    measurements.forEach(m => {
                        const beforeSig = symptomsSignature(m.symptoms);
                        const normalizedSymptoms = normalizeSymptomsArray(m.symptoms);
                        const afterSig = symptomsSignature(normalizedSymptoms);
                        if (beforeSig !== afterSig) m.symptoms = normalizedSymptoms;
                    });
                    targets = imported.data.targets;
                    notes = imported.data.notes;
                    if (imported.settings) {
                        currentLanguage = imported.settings.language || currentLanguage;
                        setCurrentLanguage(currentLanguage);
                        currentMode = imported.settings.mode || currentMode;
                        currentTheme = imported.settings.theme || currentTheme; // *** 수정 4: 테마 설정 복원 ***
                        biologicalSex = imported.settings.biologicalSex || biologicalSex;
                        selectedMetrics = Array.isArray(imported.settings.selectedMetrics) ? imported.settings.selectedMetrics : selectedMetrics;
                    }
                    isInitialSetupDone = true;
                    measurements.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                    calculateAndAddWeekNumbers();
                    notes.forEach(note => {
                        if (!note.id) note.id = 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
                        if (!note.timestamp) note.timestamp = note.createdAt || note.id || Date.now();
                    });
                    savePrimaryDataToStorage(); saveSettingsToStorage();
                    console.log("DEBUG: Data imported successfully."); showPopup('popupDataImportSuccess');
                    applyModeToUI(); applyLanguageToUI(); applyTheme();
                    if (sexSelect) sexSelect.value = biologicalSex;
                    updateCycleTrackerVisibility();
                    setupTargetInputs(); renderAll(); activateTab('tab-my');
                } else { console.error("Import failed: Invalid file structure."); showPopup('alertImportInvalidFile', 4000); }
            } catch (err) { console.error("Error parsing imported file:", err); showPopup('alertImportReadError', 4000); }
            finally { if (importFileInput) importFileInput.value = ''; }
        };
        reader.onerror = function (e) { console.error("Error reading file:", e); showPopup('alertImportFileReadError', 4000); if (importFileInput) importFileInput.value = ''; };
        reader.readAsText(file);
    }



    // --- Tab Activation ---
    function activateTab(targetTabId) {
        if (!tabBar) return;
        console.log("DEBUG: Activating tab:", targetTabId);

        const targetButton = tabBar.querySelector(`[data-tab="${targetTabId}"]`);
        if (!targetButton) {
            console.error("Target tab button not found:", targetTabId);
            return;
        }

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

        // 5. (핵심) 탭 버튼을 클릭했으므로, 확장된 탭 바를 축소시킵니다.
        if (tabBar.classList.contains('tab-bar-expanded')) {
            tabBar.classList.remove('tab-bar-expanded');
        }

        // 6. (Removed) FABs are now inline in diary tab, no visibility toggling needed
    }

    // --- Global Render Function ---
    function renderAll() {
        console.log("DEBUG: === renderAll triggered ===");

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

        console.log("DEBUG: === renderAll complete ===");
    }

    // ===============================================
    // Initialization
    // ===============================================
    console.log("DEBUG: App Initialization Start");
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
        // 첫 실행 포함, 항상 테마 기본값 적용
        if (!localStorage.getItem('shiftV_accentColor')) {
            localStorage.setItem('shiftV_accentColor', 'violet');
        }
        applyTheme();
        if (isIOS()) { bodyElement.classList.add('ios-device'); }

        if (!isInitialSetupDone) {
            console.log("DEBUG: Initial setup required.");
        } else {
            console.log("DEBUG: Initial setup already done.");
            applyModeToUI();
            applyLanguageToUI();
            loadPrimaryDataFromStorage();
            checkAndRequestNotification();
            applyTheme();
            renderAll();
            activateTab('tab-sv');
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

        console.log("DEBUG: App Initialization Sequence Complete");

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
                            saveSettingsToStorage();
                            applyTheme();
                            loadPrimaryDataFromStorage();
                            applyModeToUI();
                            applyLanguageToUI();
                            renderAll();
                            activateTab('tab-sv');
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


    // --- Notification Toggle Handler ---
    function handleNotificationToggle() {
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
                    console.log("DEBUG: Notification permission granted.");
                    notificationEnabled = true;
                    saveSettingsToStorage();
                    showPopup('popupSettingsSaved');
                    // ▼▼▼▼▼ 아래 함수 호출을 추가합니다. ▼▼▼▼▼
                    showConfirmationNotification(); // 설정 완료 확인 알림 표시
                } else {
                    console.log("DEBUG: Notification permission denied.");
                    notificationEnabled = false;
                    notificationToggle.checked = false;
                    saveSettingsToStorage();
                }
            });
        } else {
            notificationEnabled = false;
            saveSettingsToStorage();
            console.log("DEBUG: Notifications disabled by user.");
            showPopup('popupSettingsSaved');
        }
    }
    // ===============================================
    // Event Listener Setup
    // ===============================================
    console.log("DEBUG: Setting up event listeners...");
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
                            activateTab('tab-record');
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
                activateTab('tab-my');
            });
        }

        if (svCardTargets) {
            svCardTargets.classList.add('sv-card--clickable'); // 이 줄을 추가하세요
            svCardTargets.addEventListener('click', () => {
                // ... (기존 코드 생략)
            });
        }

        if (svCardDiary) {
            svCardDiary.classList.add('sv-card--clickable');
            svCardDiary.addEventListener('click', () => {
                activateTab('tab-diary');
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
            svCardShortcut.classList.add('sv-card--clickable'); // 이 줄을 추가하세요
            svCardShortcut.addEventListener('click', () => {
                activateTab('tab-record');
            });
        }


        // --- Clickable Main Cards Events ---
        if (svCardTargets) {
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


        if (myHistoryViewContainer) {
            myHistoryViewContainer.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.btn-edit');
                const deleteBtn = e.target.closest('.btn-delete');
                const index = parseInt(editBtn?.dataset.index || deleteBtn?.dataset.index, 10);
                if (isNaN(index)) return;

                if (editBtn) {
                    handleEditClick(index);
                    activateTab('tab-record');
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

        if (svCardShortcut) {
            svCardShortcut.addEventListener('click', () => {
                activateTab('tab-record');
            });
        }

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
                activateTab('tab-diary');
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
                btn.innerHTML = '<span class="material-symbols-outlined mi-inline mi-sm">hourglass_top</span> ' + (translate('cloudSyncing') || '처리 중...');
                const syncManager = new SyncManager();
                await action(syncManager);
                btn.innerHTML = '<span class="material-symbols-outlined mi-inline mi-sm mi-success">check_circle</span> ' + (translate('cloudSyncDone') || '완료!');
                setTimeout(() => { btn.innerHTML = label; btn.disabled = false; }, 2000);
            } catch (err) {
                console.error('Cloud sync error:', err);
                btn.innerHTML = '<span class="material-symbols-outlined mi-inline mi-sm mi-error">error</span> ' + (translate('cloudSyncError') || '실패');
                btn.disabled = false;
            }
        }
        if (cloudUploadBtn) {
            cloudUploadBtn.addEventListener('click', () => _withCloudBtn(
                cloudUploadBtn,
                '<span class="material-symbols-outlined mi-inline mi-sm">cloud_upload</span> ' + (translate('cloudUpload') || '클라우드에 저장'),
                sm => sm.pushToCloud()
            ));
        }
        if (cloudDownloadBtn) {
            cloudDownloadBtn.addEventListener('click', () => _withCloudBtn(
                cloudDownloadBtn,
                '<span class="material-symbols-outlined mi-inline mi-sm">cloud_download</span> ' + (translate('cloudDownload') || '클라우드에서 불러오기'),
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
                        console.error('Login error:', err);
                        alert(translate('loginError') || '로그인 중 오류가 발생했습니다.');
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
                try {
                    pdfReportBtn.disabled = true;
                    pdfReportBtn.innerHTML = '<span class="material-symbols-outlined mi-inline mi-sm">hourglass_top</span> ' + (translate('pdfGenerating') || '생성 중...');
                    const mod = await import(`./src/data/pdf-report.js`);
                    const PDFReportGenerator = mod.PDFReportGenerator || mod.default;
                    const now = new Date();
                    const generator = new PDFReportGenerator({
                        measurements,
                        diary: JSON.parse(localStorage.getItem('shiftv_diary') || '{}'),
                        quests: JSON.parse(localStorage.getItem('shiftv_quests') || '[]'),
                        targets,
                        translate,
                        language: currentLanguage,
                        mode: currentMode || 'mtf',
                        biologicalSex: biologicalSex || 'male',
                    });
                    const fileName = await generator.generate(now.getFullYear(), now.getMonth());
                    pdfReportBtn.innerHTML = '<span class="material-symbols-outlined mi-inline mi-sm mi-success">check_circle</span> ' + (translate('pdfSaved') || '저장 완료!');
                    showPopup((translate('pdfSavedAs') || '저장됨: ') + fileName, 3000);
                    setTimeout(() => {
                        pdfReportBtn.innerHTML = '<span class="material-symbols-outlined mi-inline mi-sm">description</span> ' + (translate('pdfReport') || '이번 달 리포트 저장');
                        pdfReportBtn.disabled = false;
                    }, 2000);
                } catch (err) {
                    console.error('PDF report error:', err);
                    pdfReportBtn.innerHTML = '<span class="material-symbols-outlined mi-inline mi-sm mi-error">error</span> ' + (translate('pdfError') || '생성 실패');
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
                const data = JSON.parse(localStorage.getItem('shiftV_Data_v1_1') || '[]');
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
            if (savedKey && aiKeyInput) { try { aiKeyInput.value = atob(savedKey); } catch { } }

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
                if (aiTestResult) aiTestResult.innerHTML = '<span class="material-symbols-outlined mi-inline mi-sm">hourglass_top</span> 연결 테스트 중...';
                try {
                    const mod = await import(`./src/ui/modals/ai-advisor-modal.js`);
                    const AIAdvisorModal = mod.AIAdvisorModal || mod.default;
                    const advisor = new AIAdvisorModal([], {});
                    const response = await advisor._callApi('Say "Connection successful!" in one sentence.');
                    if (aiTestResult) aiTestResult.innerHTML = `<span style="color:var(--success,#4caf50)"><span class="material-symbols-outlined mi-inline mi-sm mi-success">check_circle</span> 연결 성공! 응답: ${response.slice(0, 80)}...</span>`;
                } catch (e) {
                    if (aiTestResult) aiTestResult.innerHTML = `<span style="color:var(--error,#ef4444)"><span class="material-symbols-outlined mi-inline mi-sm mi-error">error</span> 연결 실패: ${e.message}</span>`;
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
        const origTargetSubmit = handleTargetFormSubmit;
        handleTargetFormSubmit = function (e) {
            if (goalTextInput) {
                localStorage.setItem('shiftV_goalText', goalTextInput.value);
            }
            return origTargetSubmit.call(this, e);
        };

        const aiGoalBtn = document.getElementById('ai-goal-analysis-btn');
        if (aiGoalBtn) {
            aiGoalBtn.addEventListener('click', async () => {
                const resultContainer = document.getElementById('ai-goal-result');
                const resultContent = document.getElementById('ai-goal-result-content');
                if (!resultContainer || !resultContent) return;

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
                        resultContent.innerHTML = `<p><span class="material-symbols-outlined mi-inline mi-sm mi-warning">vpn_key</span> ${translate('aiNoApiKey')}</p><p class="ai-advisor-error-hint">${translate('aiNoApiKeyHint')}</p>`;
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
                } catch (err) {
                    console.error('AI Goal analysis error:', err);
                    resultContent.innerHTML = `<p><span class="material-symbols-outlined mi-inline mi-sm mi-error">warning</span> ${translate('aiError')}</p><p class="ai-advisor-error-hint">${err.message}</p>`;
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
                console.log("DEBUG: Biological sex changed to", biologicalSex);
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


        console.log("DEBUG: Event listeners setup complete.");
    } catch (listenerError) {
        console.error(" Event listener setup error:", listenerError);
        alert(translate('alertListenerError') || `Event Listener Error: ${listenerError.message}`);
    }

    // 상세 분석 뷰 렌더링 (기존 렌더링 함수들을 호출)
    function renderDetailedAnalysisView() {
        renderComparisonFilters();
        renderComparisonChart();
        renderComparisonTable();

        const container = modalContent.querySelector('#comparison-selected-week-data-container');
        const titleEl = modalContent.querySelector('#comparison-selected-week-data-title');
        const contentEl = modalContent.querySelector('#comparison-selected-week-data-content');
        const placeholderEl = modalContent.querySelector('#comparison-data-placeholder');

        if (container) container.style.display = 'block'; // 전체 섹션은 항상 보이도록
        if (titleEl) titleEl.innerHTML = ''; // 제목 초기화
        if (contentEl) {
            contentEl.innerHTML = '';
            contentEl.style.display = 'none'; // 데이터 영역은 숨김
        }
        if (placeholderEl) {
            placeholderEl.style.display = 'block'; // 안내 문구는 보이게
            placeholderEl.textContent = translate('graphClickPrompt'); // 다국어 텍스트 적용
        }
    }

    // 비교 분석 뷰 렌더링
    function renderComparativeAnalysisView() {
        const leftSelect = modalContent.querySelector('#compare-left-select');
        const rightSelect = modalContent.querySelector('#compare-right-select');

        if (!leftSelect || !rightSelect || measurements.length < 1) {
            const grid = modalContent.querySelector('#comparison-results-grid');
            if (grid) grid.innerHTML = `<p>${translate('noDataYet')}</p>`;
            return;
        };

        // 셀렉트 박스 옵션 채우기
        const optionsHTML = measurements.map((m, index) =>
            `<option value="${index}">${m.week}${translate('week')} (${formatTimestamp(m.timestamp)})</option>` // 수정
        ).reverse().join(''); // 최신순으로 정렬

        leftSelect.innerHTML = optionsHTML;
        rightSelect.innerHTML = optionsHTML;

        // 기본 선택값 설정 (가장 최신 데이터와 그 이전 데이터)
        if (measurements.length >= 2) {
            leftSelect.value = measurements.length - 2;
            rightSelect.value = measurements.length - 1;
        } else {
            leftSelect.value = 0;
            rightSelect.value = 0;
        }

        // 셀렉트 박스 변경 시 결과 업데이트
        leftSelect.addEventListener('change', updateComparisonResults);
        rightSelect.addEventListener('change', updateComparisonResults);

        // 초기 결과 렌더링
        updateComparisonResults();
    }

    // 비교 분석 탭의 결과 업데이트
    function updateComparisonResults() {
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
`; // 수정

        displayKeys.forEach(key => {
            const leftValue = leftData[key];
            const rightValue = rightData[key];

            // 두 값 중 하나라도 존재할 때만 행을 추가
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

    // 모달 내부 탭 전환 핸들러
    function handleModalTabSwitch(event) {
        const button = event.target.closest('.modal-tab-btn');
        if (!button) return;

        const targetTab = button.dataset.tab;
        if (targetTab === activeModalTab) return;

        activeModalTab = targetTab;

        // 모든 버튼과 컨텐츠에서 active 클래스 제거
        modalContent.querySelectorAll('.modal-tab-btn').forEach(btn => btn.classList.remove('active'));
        modalContent.querySelectorAll('.modal-tab-content').forEach(content => content.classList.remove('active'));

        // 클릭된 버튼과 해당 컨텐츠에 active 클래스 추가
        button.classList.add('active');
        const targetContent = modalContent.querySelector(`#${targetTab}-view`);
        if (targetContent) {
            targetContent.classList.add('active');

            // 활성화된 탭에 따라 필요한 렌더링 함수 호출
            if (targetTab === 'detailed-analysis') {
                renderDetailedAnalysisView();
            } else if (targetTab === 'comparative-analysis') {
                renderComparativeAnalysisView();
            }
        }
    }

    function handleTargetModalTabSwitch(event) {
        const button = event.target.closest('.modal-tab-btn');
        if (!button) return;

        const targetTabId = button.dataset.tab;

        // 모든 탭 버튼과 컨텐츠의 'active' 클래스를 제거
        modalContent.querySelectorAll('.modal-tab-btn').forEach(btn => btn.classList.remove('active'));
        modalContent.querySelectorAll('.modal-tab-content').forEach(content => content.classList.remove('active'));

        // 클릭된 버튼과 그에 맞는 컨텐츠에 'active' 클래스를 추가
        button.classList.add('active');
        const targetContent = modalContent.querySelector(`#${targetTabId}`);
        if (targetContent) {
            targetContent.classList.add('active');

            // 어떤 탭이 클릭되었는지에 따라 해당 탭의 내용을 렌더링
            if (targetTabId === 'target-progress-view') {
                renderTargetProgressTab();
            } else if (targetTabId === 'prev-week-view') {
                renderPrevWeekComparisonTab();
            } else if (targetTabId === 'initial-view') {
                renderInitialComparisonTab();
            }
        }
    }

    // '목표 달성도' 탭의 내용을 렌더링하는 함수
    function renderTargetProgressTab() {
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

            // item.progress에는 (목표 - 현재) 값이 들어있음
            if (item.progress !== null && typeof item.progress === 'number') {
                const val = item.progress;

                if (val === 0) {
                    // 수정된 부분: 하드코딩 제거하고 translate 함수 사용
                    diffText = translate('targetAchieved');
                    diffClass = 'target-achieved';
                } else {
                    // 부호 표시 (+, -)
                    const sign = val > 0 ? '+' : '';
                    diffText = `${sign}${val}`;

                    diffClass = val > 0 ? 'positive-change' : 'negative-change';
                }

                // 단위 추가 (값일 경우에만)
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

    // '지난주와 비교' 탭의 내용을 렌더링하는 함수
    function renderPrevWeekComparisonTab() {
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

    // '처음과 비교' 탭의 내용을 렌더링하는 함수
    function renderInitialComparisonTab() {
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

    function closeAllModalsVisually() {
        return modalSystem.closeAllModalsVisually();
    }


    /* --- Hash Router 초기화 (PWA Navigation & Back Button) --- */
    initRouter({
        activateTab: activateTab,
        closeAllModals: closeAllModalsVisually
    });
    console.log('DEBUG: Hash router initialized');

});
