/**
 * ShiftV Shared Application State
 * 
 * Central state store that script.js populates and extracted modules read from.
 * This enables gradual module extraction without passing dozens of parameters.
 * 
 * Usage in script.js:
 *   import { appState } from './src/app-state.js';
 *   appState.measurements = measurements;  // set once, update as needed
 * 
 * Usage in extracted modules:
 *   import { appState } from '../app-state.js';
 *   const { measurements, targets } = appState;
 */

export const appState = {
    // --- Core Data ---
    measurements: [],
    targets: {},
    notes: [],

    // --- User Settings ---
    currentLanguage: 'ko',
    currentMode: 'mtf',
    biologicalSex: 'male',
    currentTheme: 'system',

    // --- UI State ---
    selectedMetrics: ['weight'],
    activeHistoryFilters: [],
    activeComparisonFilters: ['weight'],
    activeModalTab: 'detailed-analysis',
    isInitialSetupDone: false,
    notificationEnabled: false,

    // --- Chart Instances (mutable refs) ---
    chartInstance: null,
    medicationChartInstance: null,
    hormoneChartInstance: null,
    comparisonChartInstance: null,

    // --- Lazy-loaded Maps ---
    medicationNameMap: null,
    symptomLabelMap: null,
};
