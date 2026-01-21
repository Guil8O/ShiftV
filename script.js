

const APP_VERSION = "1.5"; // 버전 업데이트

// Global Error Handler
window.onerror = function (message, source, lineno, colno, error) {
    console.error("🚨 Global Error:", message, "\nFile:", source, `\nLine:${lineno}:${colno}`, "\nError Obj:", error);
    const errorMessage = typeof translate === 'function'
        ? translate('unexpectedError', { message: message })
        : `An unexpected error occurred 😢 Check console (F12).\nError: ${message}`;
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

function normalizeSymptomsArray(symptoms) {
    if (!Array.isArray(symptoms) || symptoms.length === 0) return null;

    const idMap = {
        depression_lethargy: 'depression',
        anxiety_restlessness: 'anxiety',
        raynauds_paresthesia: 'paresthesia',
        flushing_erythema: 'flushing',
        skin_atrophy_bruising: 'skin_atrophy',
        alopecia_mpb: 'male_pattern_baldness',
        edema_moon_face: 'edema',
        sarcopenia_weakness: 'sarcopenia',
        voice_cracking_deepening: 'voice_change',
        breast_budding_mastalgia: 'breast_budding',
        gynecomastia_enlargement: 'gynecomastia',
        palpitation_tachycardia: 'palpitation',
        dvt_suspicion: 'dvt_symptoms'
    };

    const byId = new Map();
    for (const s of symptoms) {
        const rawId = s?.id;
        if (!rawId) continue;
        const id = idMap[rawId] || rawId;
        const sev = Number.isFinite(Number(s?.severity)) ? Number(s.severity) : 3;
        const prev = byId.get(id);
        const next = { id, severity: Math.max(1, Math.min(5, sev)) };
        if (!prev || next.severity > prev.severity) byId.set(id, next);
    }

    const out = [...byId.values()];
    return out.length > 0 ? out : null;
}

function symptomsSignature(symptoms) {
    if (!Array.isArray(symptoms) || symptoms.length === 0) return '';
    return symptoms
        .map(s => ({ id: s?.id || '', severity: Number.isFinite(Number(s?.severity)) ? Number(s.severity) : 3 }))
        .filter(s => s.id)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(s => `${s.id}:${Math.max(1, Math.min(5, s.severity))}`)
        .join('|');
}

function syncModuleLanguage(lang) {
    try {
        import('./src/translations.js').then(mod => {
            if (typeof mod?.setCurrentLanguage === 'function') {
                mod.setCurrentLanguage(lang);
            }
        }).catch(() => { });
    } catch { }
}

const chartZoomState = {
    levels: {},
    bound: {}
};

function ensureChartWrapperContainer(wrapper) {
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

function applyChartZoom(chart, wrapper, inner, pointCount, chartKey) {
    if (!chart || !wrapper || !inner) return;
    const levelRaw = chartZoomState.levels[chartKey];
    const level = Math.max(0, Math.min(4, Number.isFinite(Number(levelRaw)) ? Number(levelRaw) : 0));
    chartZoomState.levels[chartKey] = level;

    const basePointWidth = 42;
    const stepWidths = [basePointWidth, 36, 30, 24];
    const wrapperWidth = wrapper.clientWidth || 0;
    const availableWidth = Math.max(0, wrapperWidth - 20);

    if (level >= 4 || pointCount <= 1) {
        wrapper.style.overflowX = 'hidden';
        wrapper.style.overflowY = 'hidden';
        inner.style.width = '100%';
    } else {
        const pointWidth = stepWidths[level] || basePointWidth;
        const neededWidth = pointCount * pointWidth;
        if (neededWidth > availableWidth && availableWidth > 0) {
            wrapper.style.overflowX = 'auto';
            wrapper.style.overflowY = 'hidden';
            inner.style.width = neededWidth + 'px';
        } else {
            wrapper.style.overflowX = 'hidden';
            wrapper.style.overflowY = 'hidden';
            inner.style.width = '100%';
        }
    }

    const hideDetails = level >= 3;
    chart.data.datasets.forEach(ds => {
        ds.pointRadius = hideDetails ? 0 : 4;
        ds.pointHoverRadius = hideDetails ? 0 : 6;
    });
    if (chart.options?.scales?.x?.ticks) {
        chart.options.scales.x.ticks.display = !hideDetails;
    }
    chart.update('none');
}

function ensureChartZoomControls(chart, wrapper, inner, pointCount, chartKey) {
    if (!chart || !wrapper) return;
    const container = ensureChartWrapperContainer(wrapper);
    const stale = wrapper.querySelector('.chart-zoom-controls');
    if (stale) stale.remove();

    let controls = container.querySelector(`.chart-zoom-controls[data-chart="${chartKey}"]`);
    if (!controls) {
        controls = document.createElement('div');
        controls.className = 'chart-zoom-controls';
        controls.dataset.chart = chartKey;
        controls.innerHTML = `
            <button type="button" class="chart-zoom-btn zoom-in" aria-label="Zoom in">+</button>
            <button type="button" class="chart-zoom-btn zoom-out" aria-label="Zoom out">−</button>
        `;
        container.appendChild(controls);
    }

    const updateState = () => {
        const level = Math.max(0, Math.min(4, Number(chartZoomState.levels[chartKey]) || 0));
        const inBtn = controls.querySelector('.zoom-in');
        const outBtn = controls.querySelector('.zoom-out');
        if (inBtn) inBtn.disabled = level <= 0;
        if (outBtn) outBtn.disabled = level >= 4;
    };

    updateState();
    if (chartZoomState.bound[chartKey]) return;
    chartZoomState.bound[chartKey] = true;

    controls.addEventListener('click', (e) => {
        const btn = e.target.closest('.chart-zoom-btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const isIn = btn.classList.contains('zoom-in');
        const isOut = btn.classList.contains('zoom-out');
        if (!isIn && !isOut) return;
        const next = (Number(chartZoomState.levels[chartKey]) || 0) + (isOut ? 1 : -1);
        chartZoomState.levels[chartKey] = Math.max(0, Math.min(4, next));
        applyChartZoom(chart, wrapper, inner, pointCount, chartKey);
        updateState();
    }, { passive: false });
}

// --- Language Data (i18n) ---
const languages = {
  ko: {
    save: "저장",
    edit: "수정",
    delete: "삭제",
    cancel: "취소",
    saveRecord: "기록하기 ✨",
    cancelEdit: "수정 취소",
    saveTarget: "목표 저장! 💪",
    saveNote: "플래닝 저장 🖋️",
    saveSettings: "설정 저장",
    close: "닫기",
    ComRemainder: "남은 수치",
    confirm: "확인",
    selectAll: "전체 선택",
    deselectAll: "전체 해제",
    noDataYet: "첫 기록을 남겨볼까요?",
    noNotesYet: "첫 플래닝을 남겨보세요!",
    noTargetsYet: "설정된 목표가 없어요.",
    noDataForChart: "표시할 항목을 선택하거나 데이터를 입력하세요.",
    invalidValue: "유효하지 않은 값",
    loadingError: "데이터 로드 오류",
    savingError: "데이터 저장 오류",
    valuePlaceholder: "값",
    confirmReset: "정말로 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 측정 기록, 목표, 플래닝가 영구적으로 삭제됩니다. 초기화 전에 데이터를 백업하는 것이 좋습니다.",
    confirmDeleteRecord: "주차 {week} ({date}) 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
    confirmDeleteNote: "플래닝 '{title}'을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
    dataExported: "데이터가 파일로 저장되었습니다.",
    dataImported: "데이터를 성공적으로 불러왔습니다!",
    dataReset: "모든 데이터가 초기화되었습니다.",
    dataSaved: "저장 완료! 👍",
    noteSaved: "플래닝가 저장되었습니다.",
    targetsSaved: "목표가 저장되었습니다.",
    settingsSaved: "설정이 저장되었습니다.",
    importError: "파일을 불러오는 중 오류 발생:",
    importSuccessRequiresReload: "데이터를 성공적으로 불러왔습니다. 변경사항을 적용하려면 페이지를 새로고침해주세요.",
    unexpectedError: "예상치 못한 오류가 발생했습니다 😢 콘솔(F12)을 확인해주세요.\n오류: {message}",
    alertInitError: "앱 초기화 중 오류 발생!",
    alertListenerError: "이벤트 리스너 설정 오류!",
    popupSaveSuccess: "측정 기록 저장 완료! 🎉",
    popupUpdateSuccess: "측정 기록 수정 완료! ✨",
    popupDeleteSuccess: "측정 기록 삭제 완료 👍",
    popupTargetSaveSuccess: "목표 저장 완료! 👍",
    popupNoteSaveSuccess: "새 플래닝 저장 완료! 🎉",
    popupNoteUpdateSuccess: "플래닝 수정 완료! ✨",
    popupNoteDeleteSuccess: "플래닝 삭제 완료 👍",
    popupDataExportSuccess: "데이터 내보내기 성공! 🎉",
    popupDataImportSuccess: "데이터 가져오기 성공! ✨",
    popupDataResetSuccess: "모든 데이터가 초기화되었습니다. ✨",
    popupSettingsSaved: "설정 저장 완료! 👍",
    alertValidationError: "유효하지 않은 입력 값이 있습니다. 빨간색 표시 필드를 확인해주세요. 숫자 값은 0 이상이어야 합니다.",
    alertNoteContentMissing: "플래닝 제목이나 내용을 입력해주세요!",
    alertImportConfirm: "현재 데이터를 덮어쓰고 가져온 데이터로 복원하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
    alertImportInvalidFile: "파일 형식이 올바르지 않거나 호환되지 않는 데이터입니다.",
    alertImportReadError: "파일 읽기/처리 중 오류 발생.",
    alertImportFileReadError: "파일 읽기 실패.",
    alertGenericError: "오류가 발생했습니다.",
    alertDeleteError: "삭제 중 오류 발생.",
    alertLoadError: "데이터 로드 중 오류 발생. 데이터가 손상되었을 수 있습니다. 콘솔 확인.",
    alertSaveError: "로컬 스토리지 저장 실패.",
    alertExportError: "데이터 내보내기 중 오류 발생.",
    alertCannotFindRecordEdit: "수정할 기록 찾기 실패.",
    alertCannotFindRecordDelete: "삭제할 기록 찾기 실패.",
    alertInvalidIndex: "기록 처리 중 오류: 인덱스 오류.",
    alertCannotFindNoteEdit: "수정할 플래닝 찾기 실패.",
    alertCannotFindNoteDelete: "삭제할 플래닝 찾기 실패.",
    notification_setup_success_title: "알림 설정 완료",
    notification_setup_success_body: "알림이 설정되었습니다. 매주 측정일이 되면 알려드릴게요!",
    notification_permission_denied: "알림 권한이 차단되었습니다. 브라우저 설정에서 허용해주세요.",
    tabMain: "홈",
    tabRecord: "기록하기",
    tabMy: "마이",
    tabSettings: "설정",
    myTitle: "마이 페이지 🧑‍🚀",
    showHistoryButton: "기록 확인하기",
    showInputButton: "입력으로 돌아가기",
    recordKeepsLabel: "이번 주 플래닝! 📝",
    recordKeepsPlaceholder: "오늘의 기분, 이벤트, 신체 변화 등을 자유롭게 기록해보세요...",
    memo: "플래닝",
    svcard_shortcut_new: "새 마음으로<br><span class='countdown-days'>기록</span><br>해볼까요?",
    svcard_shortcut_dday: "'D-Day!'<br>새로운 기록을<br>측정해주세요",
    svcard_shortcut_overdue: "'측정이 {days}일 지났어요!'<br>새로운 기록을<br>측정해주세요",
    svcard_shortcut_countdown: "다음 측정일까지<br><span class='countdown-days'>{days}일</span><br>남았어요",
    svcard_title_highlights: "✨ 바디 브리핑",
    svcard_title_targets: "🎯 변화 로드맵",
    svcard_title_hormones: "💉 호르몬 저널",
    svcard_title_keeps: "📝 플래닝 노트",
    svcard_no_data_for_highlights: "변화를 비교하려면 데이터가 2개 이상 필요해요.",
    svcard_no_targets_set: "설정 탭에서 목표를 설정해주세요.",
    svcard_overall_progress: "전체 달성률",
    svcard_label_current: "현재: {value}",
    targetLabelShort: "(목표:{value})",
    svcard_guide_default: "꾸준함이 <br>변화를 만들어요! ✨",
    svcard_guide_positive_short: "훌륭해요! <br>변화가 순조로워요.",
    svcard_guide_positive_long: "최근 3주간 목표를 향해 <br>꾸준히 나아가고 있어요!",
    svcard_guide_negative_short: "괜찮아요 <br>잠시 쉬어가는 주일 수도 있어요.",
    svcard_guide_negative_long: "괜찮아요 <br>다시 한번 해볼까요?",
    svcard_no_hormone_data: "호르몬 데이터가 부족해요.",
    svcard_hormone_prediction: "다음 주 예상 {hormone} 수치: <strong>{value}</strong>",
    notification_title: "ShiftV 측정 알림",
    notification_body: "마지막으로 기록한 지 일주일이 지났어요. 새로운 변화를 기록해볼까요?",
    notificationSettingsTitle: "알림 설정",
    notificationToggleLabel: "측정일 알림 받기",
    notificationSettingsDesc: "마지막 측정일로부터 7일이 지나면 알려드려요. 알림을 받으려면 브라우저의 권한 허용이 필요해요.",
    alertBrowserNotSupportNotification: "이 브라우저는 알림을 지원하지 않아요.",
    comparisonModalTitle: "바디 브리핑",
    selectedWeekDataTitle: "{week}주차 상세 기록",
    medicationHistoryTitle: "투여량 변화",
    hormoneLevelHistoryTitle: "호르몬 수치 변화",
    hormoneAnalysisTitle: "최근 2주 분석",
    hormoneAnalysisAvgChange: "평균 변화량: {change}",
    hormoneAnalysisNextWeek: "다음 주 예상 수치: {value}",
    hormoneModalTitle: "호르몬 저널",
    svcard_no_major_changes: "최근 주요 변화가 없어요.",
    svcard_change_vs_last_week: "지난 주 대비",
    svcard_title_weekly_guide: "오늘의 한마디",
    svcard_title_action_guide: "🎯 액션 가이드",
    svcard_action_guide_summary: "추천 액션과 성과 피드백을 확인해보세요.",
    svcard_no_keeps_yet: "작성된 플래닝가 없어요.",
    svcard_no_keeps_add_prompt: "작성된 플래닝가 없어요. '기록하기' 탭에서 추가해보세요!",
    modalTabDetailedAnalysis: "상세 분석",
    modalTabComparativeAnalysis: "비교 분석",
    labelBase: "기준",
    labelCompareTarget: "비교 대상",
    svcard_hormone_weekly_change: "주간 변화량",
    emaxTitle: "Emax / Hill 분석 🧬",
    responseFactor: "실제 반응도 (RF)",
    rfMessage_high: "평균 대비 E2에 높은 민감도를 보입니다. ✨",
    rfMessage_normal: "예측 모델과 유사한 반응을 보입니다. 👌",
    rfMessage_low: "E2 수치 대비 T 억제가 예상보다 낮습니다. 🤔",
    rfMessage_negative: "수치가 상승했습니다. (플레어/변동) 📈",
    currentLevelEvaluation: "현재 수치 평가",
    currentLevelEvaluationDesc: "목표치와 비교하여 현재 호르몬 수치가 적절한지 평가합니다.",
    hormoneAnalysisTitleChange: "수치 변화량 분석",
    hormoneChangeAnalysisDesc: "시간에 따른 호르몬 수치의 변화를 주간, 월간, 전체 기간으로 나누어 분석합니다.",
    hormoneAnalysisTitleInfluence: "약물 영향력 분석",
    drugInfluenceDesc: "복용 중인 약물이 호르몬 수치에 미치는 영향을 데이터 기반으로 분석합니다.",
    hormoneAnalysisTitlePrediction: "미래 예측",
    emaxAnalysisDesc: "Hill 모델을 사용하여 호르몬 반응도를 평가하고 테스토스테론 억제량을 예측합니다.",
    bodyRatioAnalysisDesc: "신체 비율을 분석하여 변화 추이를 시각화합니다.",
    estrogen_optimal: "최적 범위입니다",
    estrogen_above_target: "목표보다 높습니다",
    estrogen_below_target: "목표보다 낮습니다",
    estrogen_critical_high: "위험: 매우 높은 수치입니다",
    testosterone_optimal: "최적 범위입니다",
    testosterone_above_target: "목표보다 높습니다",
    testosterone_below_target: "목표보다 낮습니다",
    testosterone_critical_low: "위험: 매우 낮은 수치입니다",
    no_target_set: "목표 미설정",
    understandingHormones: "호르몬 수치 이해하기",
    estrogenExplanation: "에스트로겐은 여성화 효과를 담당하는 주요 호르몬입니다. 피부 변화, 유방 발달, 지방 분포 변화 등에 영향을 미칩니다.",
    testosteroneExplanation: "테스토스테론은 남성화 효과를 담당하는 주요 호르몬입니다. 근육량, 체모, 목소리 등에 영향을 미칩니다.",
    stabilityAnalysisTitle: "호르몬 안정성 분석",
    variationCoeff: "변동 계수",
    stability: "안정성",
    stability_stable: "안정적",
    stability_moderate: "보통",
    stability_unstable: "불안정",
    drugInfluenceHowItWorks: "작동 원리",
    drugInfluenceHowItWorksDesc: "약물 복용 전후의 호르몬 변화를 분석하여 각 약물의 영향력을 계산합니다. 복용량 변화가 큰 시기에 더 높은 가중치를 부여합니다.",
    drugInfluenceConfidenceDesc: "신뢰도는 데이터의 양과 질을 나타냅니다. 샘플 수가 많고 단일 약물 변화 구간이 많을수록 높아집니다.",
    samples: "샘플",
    confidence: "신뢰도",
    bodyRatioAnalysisTitle: "신체 비율 분석",
    waistHipRatio: "허리-엉덩이 비율 (WHR)",
    chestWaistRatio: "가슴-허리 비율",
    shoulderHipRatio: "어깨-엉덩이 비율",
    weeklyChange: "주간 변화량",
    monthlyAvgChange: "월간 평균 변화량",
    totalChange: "총 변화량",
    totalChangeWithInitial: "총 변화량 (초기: {value})",
    drugInfluence: "mg당 영향",
    predictedNextWeek: "다음 주 예상",
    daysToTarget: "목표까지 예상",
    daysUnit: "{days}일",
    notEnoughData: "데이터 부족",
    dailyTSuppression: "일일 T 억제량",
    influenceAnalysisDesc: "이 정보는 실측 데이터에 기반한 예측치입니다. <br>수치에는 오차가 있을 수 있습니다.",
    currentLevelsEvaluationTitle: "현재 수치 평가",
    svcard_label_target: "목표",
    hormoneLevelOptimal: "최적 범위입니다",
    hormoneLevelAboveTarget: "목표보다 높습니다",
    hormoneLevelBelowTarget: "목표보다 낮습니다",
    hormoneLevelHigh: "높은 수치입니다",
    hormoneLevelLow: "낮은 수치입니다",
    hormoneLevelNoTarget: "목표가 설정되지 않았습니다",
    healthAlertsTitle: "건강 주의사항",
    healthAlertHighE2: "⚠️ 에스트로겐 수치가 매우 높습니다 (>300 pg/mL). 의료진과 상담을 권장합니다.",
    healthAlertLowT: "⚠️ 테스토스테론 수치가 매우 낮습니다 (<5 ng/dL). 의료진과 상담을 권장합니다.",
    predictionDisclaimer: "※ 예측 수치는 참고용이며, 개인차와 측정 오차가 있을 수 있습니다.",
    hormoneExplanationTitle: "호르몬 수치 이해하기",
    hormoneExplanationDesc: "아래는 각 호르몬의 의미와 측정 방법입니다.",
    hormoneLevelsExplained: "호르몬 수치 설명",
    estrogenLevelUnit: "pg/mL",
    estrogenLevelExplanation: "에스트라디올(E2)은 여성화에 중요한 호르몬으로, 혈액 검사를 통해 측정됩니다.",
    testosteroneLevelUnit: "ng/dL",
    testosteroneLevelExplanation: "테스토스테론(T)은 남성화에 중요한 호르몬으로, 혈액 검사를 통해 측정됩니다.",
    responseFactorExplanation: "개인의 호르몬 반응 민감도를 나타냅니다. 1.0에 가까울수록 표준적인 반응입니다.",
    etRatioTitle: "E/T 비율",
    etRatioMale: "남성형",
    etRatioFemale: "여성형",
    etRatioExplanation: "E/T 비율은 에스트로겐(E)과 테스토스테론(T)의 상대적 균형을 나타냅니다. 의학적 표준 공식: E2(pg/mL) ÷ T(ng/dL), 정상 범위: 0.04~0.1. 높을수록 여성화, 낮을수록 남성화를 의미합니다.",
    bodyRatioTitle: "신체 비율 분석",
    whrLabel: "WHR (허리-엉덩이 비율)",
    chestWaistLabel: "가슴-허리 비율",
    shoulderHipLabel: "어깨-엉덩이 비율",
    drugInfluenceHow: "이 분석은 약물 복용량과 호르몬 변화를 비교하여, 각 약물이 호르몬 수치에 미치는 영향을 예측합니다. 복용량 변경이 명확한 구간에 더 높은 가중치를 부여합니다.",
    drugInfluenceConfidence: "신뢰도는 분석에 사용된 데이터의 양과 질을 나타냅니다. 높을수록 더 정확한 예측입니다.",
    drugInfluenceHowTitle: "분석 방법",
    drugInfluenceConfidenceTitle: "신뢰도",
    influenceSamplesLabel: "분석 구간",
    hormoneStabilityTitle: "호르몬 안정성",
    cvStabilityNote: "낮을수록 안정적 (< 10%: 매우 안정적)",
    rfMessage_very_high: "매우 높은 반응도 - 호르몬에 매우 민감하게 반응합니다",
    rfMessage_very_low: "매우 낮은 반응도 - 호르몬에 매우 둔감하게 반응합니다",
    formTitleNew: "측정 시작하기<br>현재 {week}주차",
    formTitleEdit: "측정 기록 수정 <br>{week}주차",
    inputDescription: "모든 항목은 선택 사항! 기록하고 싶은 것만 편하게 입력해주세요 😉",
    nextMeasurementInfoNoData: "마지막 측정일을 기준으로 다음 예정일을 계산해요.",
    nextMeasurementInfo: "마지막 측정: {lastDate} ({daysAgo}일 전) <br>다음 측정 추천일: {nextDate} ({daysUntil}일 후)",
    nextMeasurementInfoToday: "마지막 측정: {lastDate} ({daysAgo}일 전) <br>오늘은 측정하는 날!",
    nextMeasurementInfoOverdue: "마지막 측정: {lastDate} ({daysAgo}일 전) <br>측정이 {daysOverdue}일 지났어요!",
    daysAgo: "{count}일 전",
    daysUntil: "{count}일 후",
    today: "오늘",
    categoryBodySize: "신체 사이즈 📐",
    categoryHealth: "건강 💪",
    categoryMedication: "마법 ✨",
    week: "주차",
    date: "날짜",
    timestamp: "기록 시간",
    height: "신장 (cm)",
    weight: "체중 (kg)",
    shoulder: "어깨너비 (cm)",
    neck: "목둘레 (cm)",
    chest: "윗 가슴둘레 (cm)",
    cupSize: "아랫 가슴둘레 (cm)",
    waist: "허리둘레 (cm)",
    hips: "엉덩이둘레 (cm)",
    thigh: "허벅지둘레 (cm)",
    calf: "종아리둘레 (cm)",
    arm: "팔뚝둘레 (cm)",
    muscleMass: "근육량 (kg)",
    bodyFatPercentage: "체지방률 (%)",
    libido: "성욕 (회/주)",
    estrogenLevel: "에스트로겐 수치 (pg/ml)",
    testosteroneLevel: "테스토스테론 수치 (ng/ml)",
    healthStatus: "건강 상태",
    healthScore: "건강 점수",
    healthNotes: "건강 상세(텍스트)",
    skinCondition: "피부 상태",
    estradiol: "에스트라디올 (mg)",
    progesterone: "프로게스테론 (mg)",
    antiAndrogen: "항안드로겐 (mg)",
    testosterone: "테스토스테론 (mg)",
    antiEstrogen: "항에스트로겐 (mg)",
    medicationOtherName: "기타 마법 이름",
    medicationOtherDose: "기타 마법 용량 (mg)",
    medicationOtherNamePlaceholder: "(기타)",
    unitMgPlaceholder: "mg",
    skinConditionPlaceholder: "예: 부드러워짐",
    libidoPlaceholder: "회/주",
    scorePlaceholder: "점수",
    notesPlaceholder: "특이사항",
    unitCm: "cm",
    unitKg: "kg",
    unitPercent: "%",
    unitMg: "mg",
    unitCountPerWeek: "회/주",
    placeholderPrevious: "이전: {value}",
    historyTitle: "측정 기록 꼼꼼히 보기 🧐",
    historyDescription: "(표가 화면보다 넓으면 좌우로 스크롤해보세요!)",
    manageColumn: "관리",
    reportTitle: "나의 변화 리포트 📈",
    reportGraphTitle: "주차별 변화 그래프",
    reportGraphDesc: "보고 싶은 항목 버튼을 눌러 선택(활성)하거나 해제할 수 있어요. 여러 항목을 겹쳐 볼 수도 있답니다!",
    reportPrevWeekTitle: "지난주와 비교🤔",
    reportInitialTitle: "처음과 비교🌱",
    reportTargetTitle: "목표 달성률🎯",
    reportNeedTwoRecords: "데이터가 2개 이상 기록되어야 비교할 수 있어요.",
    reportNeedTarget: "먼저 '목표 설정' 탭에서 목표를 입력해주세요!",
    chartAxisLabel: "주차",
    comparisonItem: "항목",
    comparisonChange: "변화량",
    comparisonProgress: "달성률",
    targetAchieved: "달성 🎉",
    targetTitle: "나만의 목표 설정 💖",
    targetDescription: "원하는 목표 수치를 입력해주세요. 메인 탭에서 달성률을 확인할 수 있어요.",
    targetItem: "항목",
    targetValue: "목표값",
    overviewTitle: "플래닝 📝",
    noteNewTitle: "새 플래닝 작성",
    noteEditTitle: "플래닝 수정",
    noteTitleLabel: "제목",
    noteTitlePlaceholder: "플래닝 제목 (선택)",
    noteContentLabel: "내용",
    noteContentPlaceholder: "이벤트, 몸 상태, 생각 등 자유롭게 플래닝에 기록해요!",
    noteListTitle: "작성된 플래닝 목록 ✨",
    noteTitleUntitled: "제목 없음",
    sortBy: "정렬:",
    sortNewest: "최신 순",
    sortOldest: "오래된 순",
    noteDateCreated: "작성:",
    noteDateUpdated: "(수정: {date})",
    notePreviewEmpty: "내용을 적어 보세요",
    settingsTitle: "설정 ⚙️",
    languageSettingsTitle: "언어 설정",
    language: "언어",
    modeSettingsTitle: "모드 설정",
    modeSettingsDesc: "목표하는 신체 변화 방향을 선택해주세요.",
    mode: "모드",
    modeMtf: "여성화",
    modeFtm: "남성화",
    themeSettingsTitle: "테마 설정",
    theme: "테마",
    themeSystem: "기기 값 참조",
    themeLight: "라이트 모드",
    themeDark: "다크 모드",
    dataManagementTitle: "데이터 백업 & 복원",
    dataManagementDesc: "모든 기록(측정, 목표, 플래닝)을 파일 하나로 저장하거나 복원할 수 있어요. 가끔 백업해두면 안심이에요! 😊",
    exportData: "파일 저장하기",
    importData: "파일 불러오기",
    warning: "주의!",
    importWarning: "복원하면 지금 앱에 있는 모든 데이터가 파일 내용으로 완전히 대체돼요!",
    resetDataTitle: "데이터 초기화",
    severeWarning: "정말정말 주의!",
    resetWarning: "😱 모든 데이터(측정, 목표, 플래닝)가 영구적으로 삭제됩니다! 초기화 전에 꼭! 데이터를 파일로 백업해주세요.",
    resetDataButton: "모든 데이터 초기화",
    infoTitle: "정보",
    versionLabel: "버전:",
    privacyInfo: "이 앱은 오프라인 작동하며 모든 데이터는 앱에만 안전하게 저장됩니다! 😉",
    developerMessage: "이 작은 도구가 당신의 소중한 여정에 즐거움과 도움이 되기를 바라요!",
    dataUpdateAndResetTitle: "데이터 업데이트 및 초기화",
    checkForUpdatesButton: "업데이트 확인",
    popupUpdateComplete: "업데이트 완료! 앱을 다시 시작합니다.",
    popupUpdateFailed: "업데이트에 실패했습니다. 잠시 후 다시 시도해주세요.",
    popupAlreadyLatest: "이미 최신 버전이에요! ✨",
    popupOfflineForUpdate: "업데이트를 확인하려면 인터넷 연결이 필요해요.",
    initialSetupTitle: "초기 설정",
    initialSetupDesc: "ShiftV 사용을 시작하기 전에 언어와 모드를 선택해주세요.",
    swipeThresholdMet: "스와이프 감지: {direction}",
    labelInitial: "초기",
    labelPrev: "전주",
    labelCurrent: "현재",
    labelTarget: "목표",
    initialTargetSame: "초기/목표",
    prevCurrentSame: "전주/현재",
    graphClickPrompt: "그래프의 수치를 클릭하면 해당 주차의 상세정보가 표시됩니다.",
    symptoms: "증상",
    medications: "투여 약물",
    menstruationActive: "월경 여부",
    menstruationPain: "월경 통증",
    briefingGroupMeasurements: "측정",
    briefingGroupSymptoms: "증상",
    briefingGroupMedications: "약물",
    biologicalSex: "생물학적 성별",
    sexSettingsTitle: "생물학적 성별 설정",
    sexSettingsDesc: "자연 호르몬 회복률 계산의 정확도를 높이기 위해 사용됩니다.",
    sexMale: "남성",
    sexFemale: "여성",
    sexOther: "기타/무성별",
    menstruationLabel: "월경 발생 여부",
    cyclePainLabel: "강도 (1-5)",
    symptomsLabel: "증상 선택",
    symptomsDescription: "경험하고 있는 증상을 선택하고 심각도를 표시하세요. (여러 개 선택 가능)",
    addSymptom: "증상 추가",
    symptomsEmptyState: "증상이 없으면 추가 버튼을 눌러 증상을 선택하세요.",
    severityLabel: "심각도",
    medicationsLabel: "약물 선택",
    medicationsDescription: "자주 투여하는 약물은 목록으로 추가해두면 다음 기록 때 자동으로 유지됩니다.",
    addMedication: "약물 추가",
    medicationsEmptyState: "추가 버튼을 눌러 약물을 선택하세요.",
    modalTabBriefingSummary: "요약",
    modalTabBriefingDetail: "상세",
    briefingOverallProgress: "전체 목표 달성률",
    briefingBodyChange: "전체 신체 변화",
    briefingTargetAchievement: "목표 달성률",
    briefingBodyRatio: "신체 비율 분석",
    briefingFuturePrediction: "미래 예측",
    briefingHealthAlerts: "건강 경고 알림",
    briefingWeeklyChange: "주간 변화:",
    briefingMonthlyAvg: "월평균:",
    briefingPreviousWeek: "지난주:",
    briefingTarget: "목표:",
    actionGuideModalTitle: "액션 가이드",
    actionGuideNextMeasurement: "다음 측정일",
    actionGuideRecommendations: "추천 액션",
    actionGuidePerformance: "최근 성과 피드백",
    actionGuideMotivation: "동기부여",
    actionGuideDDayUnknown: "D-?",
    actionGuideCategoryExercise: "운동",
    actionGuideCategoryDiet: "식단",
    actionGuideCategoryMedication: "약물",
    actionGuideCategoryHabits: "습관",
    actionGuideNoRecommendations: "추천을 만들기 위한 데이터가 부족합니다.",
    actionGuideNoPerformance: "이번 주 성과 피드백을 만들기 위한 데이터가 부족합니다.",
    actionGuideMotivationClosing: "훌륭해요! 이 페이스를 유지하세요!",
    actionGuideNextMessageDue: "측정 시기입니다!",
    actionGuideNextMessageInDays: "{days}일 후 측정 예정",
    modalTabRoadmapSummary: "요약",
    modalTabRoadmapDetail: "상세",
    roadmapOverallProgress: "전체 진행도",
    roadmapTimeline: "타임라인",
    roadmapMonthlySummary: "월별 요약",
    roadmapStandoutChanges: "가장 눈에 띄는 변화",
    roadmapDetailedGraph: "상세 그래프",
    roadmapChangeComparison: "변화 비교",
    roadmapCompareSpecificDate: "특정일과 비교",
    roadmapBaseDate: "기준일",
    roadmapCompareDate: "비교일",
    roadmapStart: "시작",
    roadmapWeekLabel: "Week {week}",
    roadmapTimelineStart: "시작",
    roadmapTimelineCurrent: "현재",
    roadmapTimelineFinalForecast: "최종 목표 예상",
    roadmapTimelineAwayFromGoal: "목표에서 멀어짐",
    roadmapTimelineBigChange: "큰 변화",
    roadmapTimelineReachedPercent: "{percent}% 도달",
    roadmapTimelineAllGoalsEta: "모든 목표 달성 예상 시점",
    roadmapTimelineAwayFromGoalDesc: "일부 지표가 목표에서 멀어졌습니다. 계획을 점검해 보세요.",
    roadmapAchievementRate: "전체 달성률:",
    roadmapAchievementCount: "({achieved}/{total} 목표)",
    roadmapComparePreviousWeek: "지난주와 비교",
    roadmapCompareFirst: "처음과 비교",
    roadmapVsPrevious: "vs 지난주",
    roadmapVsFirst: "vs 처음",
    roadmapCurrent: "현재",
    roadmapPrevious: "지난주",
    roadmapFirst: "처음",
    roadmapSetBaseLatest: "기준=현재",
    roadmapSetComparePrev: "비교=지난주",
    roadmapSetCompareFirst: "비교=처음",
    roadmapSwapDates: "바꾸기",
    roadmapSelectDate: "날짜 선택:",
    roadmapNegativeNote: "목표에서 멀어지는 구간이 감지되었습니다. 빨간 틱/궤적 후퇴를 참고하세요.",
    roadmapModalTitle: "변화 로드맵",
    metricWeight: "체중",
    metricWaist: "허리",
    metricHips: "엉덩이",
    metricChest: "가슴",
    metricShoulder: "어깨",
    metricThigh: "허벅지",
    metricArm: "팔뚝",
    metricMuscleMass: "근육량",
    metricBodyFatPercentage: "체지방률",
    feminization: "여성화",
    masculinization: "남성화",
    balanced: "균형",
    points: "점",
    achieved: "달성",
    inProgress: "진행 중",
    noPredictionData: "예측 데이터가 없습니다.",
    noAlerts: "경고 알림이 없습니다. 건강 상태가 양호합니다! 😊",
    target: "목표",
    ratioWHR: "WHR (허리-엉덩이 비율)",
    ratioShoulderWaist: "어깨-허리 비율",
    ratioChestWaist: "가슴-허리 비율",
    percentileTop10: "상위 10%",
    percentileTop25: "상위 25%",
    percentileAverage: "평균",
    percentileBottom25: "하위 25%",
    percentileBottom10: "하위 10%",
    percentileBottom5: "하위 5%",
    percentileRank: "상위 {value}%",
    removeSymptom: "제거"
  },
  en: {
    save: "Save",
    edit: "Edit",
    delete: "Delete",
    cancel: "Cancel",
    saveRecord: "Record ✨",
    cancelEdit: "Cancel Edit",
    saveTarget: "Save Targets! 💪",
    saveNote: "Save Planning 🖋️",
    saveSettings: "Save Settings",
    close: "Close",
    ComRemainder: "Remainder",
    confirm: "Confirm",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    noDataYet: "Let's add the first record!",
    noNotesYet: "No Planning written yet. Let's add the first Planning!",
    noTargetsYet: "No targets set.",
    noDataForChart: "Select items to display or enter data.",
    invalidValue: "Invalid value",
    loadingError: "Data loading error",
    savingError: "Data saving error",
    valuePlaceholder: "Value",
    confirmReset: "Are you absolutely sure you want to reset all data? This action cannot be undone and will permanently delete all measurement records, targets, and Planning. It is highly recommended to back up your data before proceeding.",
    confirmDeleteRecord: "Delete record for Week {week} ({date})? This action cannot be undone.",
    confirmDeleteNote: "Delete Planning \"{title}\"? This cannot be undone.",
    dataExported: "Data exported to file.",
    dataImported: "Data imported successfully!",
    dataReset: "All data has been reset.",
    dataSaved: "Saved! 👍",
    noteSaved: "Planning saved.👍",
    targetsSaved: "Targets saved.👍",
    settingsSaved: "Settings saved.👍",
    importError: "Error importing file:",
    importSuccessRequiresReload: "Data imported successfully. Please reload the page to apply changes.",
    unexpectedError: "An unexpected error occurred 😢 Check console (F12).\nError: {message}",
    alertInitError: "Error during app initialization!",
    alertListenerError: "Error setting up event listeners!",
    popupSaveSuccess: "Measurement saved! 🎉",
    popupUpdateSuccess: "Measurement updated! ✨",
    popupDeleteSuccess: "Measurement deleted 👍",
    popupTargetSaveSuccess: "Targets saved! 👍",
    popupNoteSaveSuccess: "New Planning saved! 🎉",
    popupNoteUpdateSuccess: "Planning updated! ✨",
    popupNoteDeleteSuccess: "Planning deleted 👍",
    popupDataExportSuccess: "Data export successful! 🎉",
    popupDataImportSuccess: "Data import successful! ✨",
    popupDataResetSuccess: "All data has been reset. ✨",
    popupSettingsSaved: "Settings saved!",
    alertValidationError: "Invalid input value(s). Check red fields. Numbers must be 0 or greater.",
    alertNoteContentMissing: "Please enter Planning title or content!",
    alertImportConfirm: "Overwrite current data and restore from file? This cannot be undone.",
    alertImportInvalidFile: "Invalid file format or incompatible data.",
    alertImportReadError: "Error reading/processing file.",
    alertImportFileReadError: "Failed to read file.",
    alertGenericError: "An error occurred.",
    alertDeleteError: "Error during deletion.",
    alertLoadError: "Error loading data. Data might be corrupt. Check console.",
    alertSaveError: "Failed to save data.",
    alertExportError: "Error exporting data.",
    alertCannotFindRecordEdit: "Cannot find record to edit.",
    alertCannotFindRecordDelete: "Cannot find record to delete.",
    alertInvalidIndex: "Error processing record: Invalid index.",
    alertCannotFindNoteEdit: "Cannot find Planning to edit.",
    alertCannotFindNoteDelete: "Cannot find Planning to delete.",
    notification_setup_success_title: "Notification Setup Complete",
    notification_setup_success_body: "Notifications have been set. We'll remind you on your weekly measurement day!",
    notification_permission_denied: "Notification permission was denied. Please allow it in your browser settings.",
    tabMain: "Main",
    tabRecord: "Record",
    tabMy: "My",
    tabSettings: "Settings",
    myTitle: "My Page 🧑‍🚀",
    showHistoryButton: "View History",
    showInputButton: "Back to Input",
    recordKeepsLabel: "This Week's Planning 📝",
    recordKeepsPlaceholder: "Freely write down your mood, events, body changes, etc.",
    symptomsLabel: "Select Symptoms",
    symptomsDescription: "Select symptoms you are experiencing and indicate severity. (Multiple selections possible)",
    addSymptom: "Add Symptom",
    symptomsEmptyState: "Click the add button to select symptoms if you have none.",
    severityLabel: "Severity",
    medicationsLabel: "Medications",
    medicationsDescription: "Add frequently used meds so they stay selected next time.",
    addMedication: "Add Medication",
    medicationsEmptyState: "Press Add to select a medication.",
    memo: "Planning",
    svcard_title_highlights: "✨Body Brief",
    svcard_title_targets: "🎯 Change Roadmap",
    svcard_title_hormones: "💉 Hormone Journal",
    svcard_title_keeps: "📝 Planning Notes",
    svcard_no_data_for_highlights: "Need at least 2 records to compare changes.",
    svcard_no_targets_set: "Set your goals in the Settings tab.",
    svcard_overall_progress: "Overall Progress",
    svcard_shortcut_new: "Ready for a<br><span class='countdown-days'>New Start</span><br>Shall we record?",
    svcard_shortcut_dday: "'It's D-Day!'<br>Time to record<br>your new data",
    svcard_shortcut_overdue: "'{days} days overdue!'<br>Time to record<br>your new data",
    svcard_shortcut_countdown: "Next measurement in<br><span class='countdown-days'>{days} days</span><br>left",
    svcard_guide_default: "Consistency creates change! ✨",
    svcard_guide_positive_short: "Great work! <br>Progress is smooth.",
    svcard_guide_positive_long: "You've been making steady <br>progress towards your goals!",
    svcard_guide_negative_short: "It's okay, <br>this might be a week to rest.",
    svcard_guide_negative_long: "It's okay, <br>you can start again!",
    svcard_no_hormone_data: "Not enough hormone data.",
    svcard_hormone_prediction: "Next week's predicted {hormone} level: <strong>{value}</strong>",
    notification_title: "ShiftV Measurement Reminder",
    notification_body: "It's been a week since your last record. Time to log your new changes!",
    notificationSettingsTitle: "Notification Settings",
    notificationToggleLabel: "Receive measurement reminders",
    notificationSettingsDesc: "Get notified 7 days after your last measurement. Browser permission is required.",
    alertBrowserNotSupportNotification: "This browser does not support notifications.",
    comparisonModalTitle: "Body Brief",
    medicationHistoryTitle: "Medication Dosage History",
    hormoneLevelHistoryTitle: "Hormone Level History",
    hormoneAnalysisTitle: "Last 2 Weeks Analysis",
    hormoneAnalysisAvgChange: "Average Change: {change}",
    hormoneAnalysisNextWeek: "Predicted Next Week: {value}",
    hormoneModalTitle: "Hormone Journal",
    selectedWeekDataTitle: "Week {week} Detailed Data",
    svcard_no_major_changes: "No major changes recently.",
    svcard_change_vs_last_week: "vs last week",
    svcard_title_weekly_guide: "Today's Words",
    svcard_title_action_guide: "🎯 Action Guide",
    svcard_action_guide_summary: "Check recommendations, feedback, and motivation.",
    svcard_no_keeps_yet: "No Planning written yet.",
    svcard_no_keeps_add_prompt: "No Planning written yet. Try adding one in the 'Record' tab!",
    modalTabDetailedAnalysis: "Detailed Analysis",
    modalTabComparativeAnalysis: "Comparative Analysis",
    labelBase: "Base",
    labelCompareTarget: "Compare Target",
    svcard_hormone_weekly_change: "Weekly Change",
    svcard_label_current: "Current: {value}",
    targetLabelShort: "(Target:{value})",
    emaxTitle: "Emax / Hill Analysis 🧬",
    responseFactor: "Response Factor (RF)",
    rfMessage_high: "You show higher sensitivity to E2 than average. ✨",
    rfMessage_normal: "Response aligns with the predictive model. 👌",
    rfMessage_low: "T suppression is lower than expected for E2 levels. 🤔",
    rfMessage_negative: "Levels have increased. (Flare/Fluctuation) 📈",
    currentLevelEvaluation: "Current Level Evaluation",
    currentLevelEvaluationDesc: "Evaluates whether current hormone levels are appropriate compared to target values.",
    hormoneAnalysisTitleChange: "Level Change Analysis",
    hormoneChangeAnalysisDesc: "Analyzes hormone level changes over time, divided into weekly, monthly, and total periods.",
    hormoneAnalysisTitleInfluence: "Medication Influence Analysis",
    drugInfluenceDesc: "Data-driven analysis of how medications affect hormone levels.",
    hormoneAnalysisTitlePrediction: "Prediction",
    emaxAnalysisDesc: "Uses the Hill model to evaluate hormone response and predict testosterone suppression.",
    bodyRatioAnalysisDesc: "Analyzes and visualizes body ratio changes over time.",
    estrogen_optimal: "Optimal Range",
    estrogen_above_target: "Above Target",
    estrogen_below_target: "Below Target",
    estrogen_critical_high: "Warning: Very High Level",
    testosterone_optimal: "Optimal Range",
    testosterone_above_target: "Above Target",
    testosterone_below_target: "Below Target",
    testosterone_critical_low: "Warning: Very Low Level",
    no_target_set: "No Target Set",
    understandingHormones: "Understanding Hormone Levels",
    estrogenExplanation: "Estrogen is the primary hormone responsible for feminizing effects, influencing skin changes, breast development, and fat distribution.",
    testosteroneExplanation: "Testosterone is the primary hormone responsible for masculinizing effects, influencing muscle mass, body hair, and voice.",
    stabilityAnalysisTitle: "Hormone Stability Analysis",
    variationCoeff: "Variation Coefficient",
    stability: "Stability",
    stability_stable: "Stable",
    stability_moderate: "Moderate",
    stability_unstable: "Unstable",
    drugInfluenceHowItWorks: "How It Works",
    drugInfluenceHowItWorksDesc: "Analyzes hormone changes before and after medication intake to calculate each drug's influence. Higher weight is given to periods with significant dosage changes.",
    drugInfluenceConfidenceDesc: "Confidence indicates the quantity and quality of data. It increases with more samples and isolated single-drug change intervals.",
    samples: "Samples",
    confidence: "Confidence",
    bodyRatioAnalysisTitle: "Body Ratio Analysis",
    waistHipRatio: "Waist-Hip Ratio (WHR)",
    chestWaistRatio: "Chest-Waist Ratio",
    shoulderHipRatio: "Shoulder-Hip Ratio",
    weeklyChange: "Weekly Change",
    monthlyAvgChange: "Monthly Avg. Change",
    totalChange: "Total Change",
    totalChangeWithInitial: "Total Change (Initial: {value})",
    drugInfluence: "Influence/mg",
    predictedNextWeek: "Next Week",
    daysToTarget: "Est. Days to Target",
    daysUnit: "{days} days",
    notEnoughData: "N/A",
    dailyTSuppression: "Daily T Suppression",
    influenceAnalysisDesc: "This is predictive data based on measurements. <br>Values may contain errors.",
    currentLevelsEvaluationTitle: "Current Level Evaluation",
    svcard_label_target: "Target",
    hormoneLevelOptimal: "Optimal range",
    hormoneLevelAboveTarget: "Above target",
    hormoneLevelBelowTarget: "Below target",
    hormoneLevelHigh: "High level",
    hormoneLevelLow: "Low level",
    hormoneLevelNoTarget: "No target set",
    healthAlertsTitle: "Health Alerts",
    healthAlertHighE2: "⚠️ Estrogen level is very high (>300 pg/mL). Consult your healthcare provider.",
    healthAlertLowT: "⚠️ Testosterone level is very low (<5 ng/dL). Consult your healthcare provider.",
    predictionDisclaimer: "※ Predictions are for reference only. Individual variations and measurement errors may occur.",
    hormoneExplanationTitle: "Understanding Hormone Levels",
    hormoneExplanationDesc: "Below are the meanings and measurement methods for each hormone.",
    hormoneLevelsExplained: "Hormone Level Explanation",
    estrogenLevelUnit: "pg/mL",
    estrogenLevelExplanation: "Estradiol (E2) is an important hormone for feminization, measured through blood tests.",
    testosteroneLevelUnit: "ng/dL",
    testosteroneLevelExplanation: "Testosterone (T) is an important hormone for masculinization, measured through blood tests.",
    responseFactorExplanation: "Indicates individual hormone response sensitivity. Closer to 1.0 means standard response.",
    etRatioTitle: "E/T Ratio",
    etRatioMale: "Masculine",
    etRatioFemale: "Feminine",
    etRatioExplanation: "The E/T ratio represents the relative balance between Estrogen (E) and Testosterone (T). Medical standard formula: E2(pg/mL) ÷ T(ng/dL), Normal range: 0.04~0.1. Higher values indicate feminization, lower values indicate masculinization.",
    bodyRatioTitle: "Body Ratio Analysis",
    whrLabel: "WHR (Waist-Hip Ratio)",
    chestWaistLabel: "Chest-Waist Ratio",
    shoulderHipLabel: "Shoulder-Hip Ratio",
    drugInfluenceHow: "This analysis compares medication dosages with hormone changes to predict each drug's effect on hormone levels. Intervals with clear dosage changes receive higher weights.",
    drugInfluenceConfidence: "Confidence indicates the quantity and quality of data used in the analysis. Higher values mean more accurate predictions.",
    drugInfluenceHowTitle: "Analysis Method",
    drugInfluenceConfidenceTitle: "Confidence",
    influenceSamplesLabel: "Analysis Intervals",
    hormoneStabilityTitle: "Hormone Stability",
    cvStabilityNote: "Lower is more stable (< 10%: very stable)",
    rfMessage_very_high: "Very high response - highly sensitive to hormones",
    rfMessage_very_low: "Very low response - very insensitive to hormones",
    formTitleNew: "Start Measuring📏 <br>Current Week {week}",
    formTitleEdit: "Edit Measurement Record <br>Week {week}",
    inputDescription: "All fields are optional! Feel free to enter only what you want to track 😉",
    nextMeasurementInfoNoData: "Calculates the next recommended date based on the last measurement.",
    nextMeasurementInfo: "Last: {lastDate} ({daysAgo} ago) <br>Next recommended: {nextDate} ({daysUntil} away)",
    nextMeasurementInfoToday: "Last: {lastDate} ({daysAgo} ago) <br>Today is measurement day!",
    nextMeasurementInfoOverdue: "Last: {lastDate} ({daysAgo} ago) <br>Measurement is {daysOverdue} days overdue!",
    daysAgo: "{count} days ago",
    daysUntil: "{count} days left",
    today: "Today",
    categoryBodySize: "Body Size 📐",
    categoryHealth: "Health 💪",
    categoryMedication: "Magic ✨",
    week: "Week",
    date: "Date",
    timestamp: "Timestamp",
    height: "Height (cm)",
    weight: "Weight (kg)",
    shoulder: "Shoulder Width (cm)",
    neck: "Neck (cm)",
    chest: "Upper Chest (cm)",
    cupSize: "Lower Chest (cm)",
    waist: "Waist (cm)",
    hips: "Hips (cm)",
    thigh: "Thigh (cm)",
    calf: "Calf (cm)",
    arm: "Arm (cm)",
    muscleMass: "Muscle Mass (kg)",
    bodyFatPercentage: "Body Fat (%)",
    libido: "Libido (/week)",
    estrogenLevel: "Estrogen Level",
    testosteroneLevel: "Testosterone Level",
    healthStatus: "Health Status",
    healthScore: "Health Score",
    healthNotes: "Health Detail(text)",
    skinCondition: "Skin Condition",
    estradiol: "Estradiol (mg)",
    progesterone: "Progesterone (mg)",
    antiAndrogen: "Anti-androgen (mg)",
    testosterone: "Testosterone (mg)",
    antiEstrogen: "Anti-Estrogen (mg)",
    medicationOtherName: "Other Magic Name",
    medicationOtherDose: "Other Magic Dose (mg)",
    medicationOtherNamePlaceholder: "(Other)",
    unitMgPlaceholder: "mg",
    skinConditionPlaceholder: "e.g., Softer",
    libidoPlaceholder: "freq/week",
    scorePlaceholder: "Score",
    notesPlaceholder: "Notes",
    unitCm: "cm",
    unitKg: "kg",
    unitPercent: "%",
    unitMg: "mg",
    unitCountPerWeek: "freq/wk",
    placeholderPrevious: "Prev: {value}",
    historyTitle: "Measurement History 🧐",
    historyDescription: "(If the table is wider than the screen, scroll horizontally!)",
    manageColumn: "Manage",
    reportTitle: "My Change Report 📈",
    reportGraphTitle: "Weekly Change Graph",
    reportGraphDesc: "Select (activate) or deselect items by clicking the buttons. You can overlay multiple items!",
    reportPrevWeekTitle: "vs Last Week🤔",
    reportInitialTitle: "vs Beginning🌱",
    reportTargetTitle: "Target🎯",
    reportNeedTwoRecords: "At least two records are needed for comparison.",
    reportNeedTarget: "Please set your targets in the 'Targets' tab first!",
    chartAxisLabel: "Week",
    comparisonItem: "Item",
    comparisonChange: "Change",
    comparisonProgress: "Progress",
    targetAchieved: "Achieved 🎉",
    targetTitle: "Set Your Personal Goals 💖",
    targetDescription: "Enter your desired target values. You can check the progress in the Main tab.",
    targetItem: "Item",
    targetValue: "Target Value",
    overviewTitle: "Planning 📝",
    noteNewTitle: "New Planning",
    noteEditTitle: "Edit Planning",
    noteTitleLabel: "Title",
    noteTitlePlaceholder: "Planning title (optional)",
    noteContentLabel: "Content",
    noteContentPlaceholder: "Record anything - events, body changes, thoughts in Planning!",
    noteListTitle: "Saved Planning ✨",
    noteTitleUntitled: "Untitled",
    sortBy: "Sort by:",
    sortNewest: "Newest First",
    sortOldest: "Oldest First",
    noteDateCreated: "Created:",
    noteDateUpdated: "(Edited: {date})",
    notePreviewEmpty: "(No content)",
    settingsTitle: "Settings ⚙️",
    languageSettingsTitle: "Language Settings",
    language: "Language",
    modeSettingsTitle: "Mode Settings",
    modeSettingsDesc: "Select the direction of physical changes you are aiming for.",
    mode: "Mode",
    modeMtf: "Feminization",
    modeFtm: "Masculinization",
    themeSettingsTitle: "Theme Settings",
    theme: "Theme",
    themeSystem: "Follow Device",
    themeLight: "Light Mode",
    themeDark: "Dark Mode",
    dataManagementTitle: "Data Backup & Restore",
    dataManagementDesc: "You can save all your records (measurements, targets, Planning) to a single file or restore from one. Backing up occasionally gives peace of mind! 😊",
    exportData: "Export Data",
    importData: "Import Data",
    warning: "Warning!",
    importWarning: "Restoring will completely replace all data currently in your browser with the file's content!",
    resetDataTitle: "Reset Data",
    severeWarning: "Extreme Caution!",
    resetWarning: "😱 Resetting data will permanently delete all records (measurements, targets, Planning)! Please back up your data before resetting.",
    resetDataButton: "Reset All Data",
    infoTitle: "Information",
    versionLabel: "Version:",
    privacyInfo: "This app works offline and all data is stored securely only in your browser! 😉",
    developerMessage: "Hope this little tool brings joy and help to your precious journey!",
    dataUpdateAndResetTitle: "Data Update & Reset",
    checkForUpdatesButton: "Check for Updates",
    popupUpdateComplete: "Update complete! The app will now restart.",
    popupUpdateFailed: "Update failed. Please try again later.",
    popupAlreadyLatest: "You are already on the latest version! ✨",
    popupOfflineForUpdate: "An internet connection is required to check for updates.",
    initialSetupTitle: "Initial Setup",
    initialSetupDesc: "Before starting ShiftV, please select your language and mode.",
    swipeThresholdMet: "Swipe detected: {direction}",
    labelInitial: "Initial",
    labelPrev: "Prev",
    labelCurrent: "Current",
    labelTarget: "Target",
    initialTargetSame: "Initial/Target",
    prevCurrentSame: "Prev/Current",
    graphClickPrompt: "Click a data point on the graph to view detailed records for that week.",
    symptoms: "Symptoms",
    medications: "Medications",
    menstruationActive: "Menstruation",
    menstruationPain: "Menstruation Pain",
    briefingGroupMeasurements: "Measurements",
    briefingGroupSymptoms: "Symptoms",
    briefingGroupMedications: "Medications",
    biologicalSex: "Biological Sex",
    sexSettingsTitle: "Biological Sex Settings",
    sexSettingsDesc: "Used to improve the accuracy of natural hormone recovery calculations.",
    sexMale: "Male",
    sexFemale: "Female",
    sexOther: "Other",
    menstruationLabel: "Menstruation occurred",
    cyclePainLabel: "Severity (1-5)",
    removeSymptom: "Remove",
    modalTabBriefingSummary: "Summary",
    modalTabBriefingDetail: "Detail",
    briefingOverallProgress: "Overall Target Achievement",
    briefingBodyChange: "Overall Body Change",
    briefingTargetAchievement: "Target Achievement",
    briefingBodyRatio: "Body Ratio Analysis",
    briefingFuturePrediction: "Future Prediction",
    briefingHealthAlerts: "Health Warning Alerts",
    briefingWeeklyChange: "Weekly Change:",
    briefingMonthlyAvg: "Monthly Avg:",
    briefingPreviousWeek: "Previous Week:",
    briefingTarget: "Target:",
    modalTabRoadmapSummary: "Summary",
    modalTabRoadmapDetail: "Detail",
    roadmapOverallProgress: "Overall Progress",
    roadmapTimeline: "Timeline",
    roadmapMonthlySummary: "Monthly Summary",
    roadmapStandoutChanges: "Standout Changes",
    roadmapDetailedGraph: "Detailed Graph",
    roadmapChangeComparison: "Change Comparison",
    roadmapCompareSpecificDate: "Compare with Specific Date",
    roadmapBaseDate: "Base Date",
    roadmapCompareDate: "Compare Date",
    roadmapStart: "Start",
    roadmapWeekLabel: "Week {week}",
    roadmapTimelineStart: "Start",
    roadmapTimelineCurrent: "Now",
    roadmapTimelineFinalForecast: "Final goal forecast",
    roadmapTimelineAwayFromGoal: "Moving away from goal",
    roadmapTimelineBigChange: "Big change",
    roadmapTimelineReachedPercent: "Reached {percent}%",
    roadmapTimelineAllGoalsEta: "Estimated time to achieve all goals",
    roadmapTimelineAwayFromGoalDesc: "Some metrics moved away from the goal. Review your plan.",
    roadmapAchievementRate: "Overall Achievement Rate:",
    roadmapAchievementCount: "({achieved}/{total} goals)",
    roadmapComparePreviousWeek: "Compare with Previous Week",
    roadmapCompareFirst: "Compare with First",
    roadmapVsPrevious: "vs previous",
    roadmapVsFirst: "vs first",
    roadmapCurrent: "Current",
    roadmapPrevious: "Previous",
    roadmapFirst: "First",
    roadmapSetBaseLatest: "Base = current",
    roadmapSetComparePrev: "Compare = previous",
    roadmapSetCompareFirst: "Compare = first",
    roadmapSwapDates: "Swap",
    roadmapSelectDate: "Select Date:",
    roadmapNegativeNote: "A negative segment was detected. See red ticks / rollback in the path.",
    roadmapModalTitle: "Change Roadmap",
    metricWeight: "Weight",
    metricWaist: "Waist",
    metricHips: "Hips",
    metricChest: "Chest",
    metricShoulder: "Shoulder",
    metricThigh: "Thigh",
    metricArm: "Arm",
    metricMuscleMass: "Muscle Mass",
    metricBodyFatPercentage: "Body Fat %",
    feminization: "Feminization",
    masculinization: "Masculinization",
    balanced: "Balanced",
    points: "pts",
    achieved: "Achieved",
    inProgress: "In Progress",
    noPredictionData: "No prediction data available.",
    noAlerts: "No alerts. Your health status is good! 😊",
    target: "target",
    ratioWHR: "WHR (Waist-Hip Ratio)",
    ratioShoulderWaist: "Shoulder-Waist Ratio",
    ratioChestWaist: "Chest-Waist Ratio",
    percentileTop10: "Top 10%",
    percentileTop25: "Top 25%",
    percentileAverage: "Average",
    percentileBottom25: "Bottom 25%",
    percentileBottom10: "Bottom 10%",
    percentileBottom5: "Bottom 5%",
    percentileRank: "Top {value}%",
    actionGuideModalTitle: "Action Guide",
    actionGuideNextMeasurement: "Next measurement",
    actionGuideRecommendations: "Recommended actions",
    actionGuidePerformance: "Recent performance feedback",
    actionGuideMotivation: "Motivation",
    actionGuideDDayUnknown: "D-?",
    actionGuideCategoryExercise: "Exercise",
    actionGuideCategoryDiet: "Diet",
    actionGuideCategoryMedication: "Medication",
    actionGuideCategoryHabits: "Habits",
    actionGuideNoRecommendations: "Not enough data to generate recommendations.",
    actionGuideNoPerformance: "Not enough data to generate performance feedback.",
    actionGuideMotivationClosing: "Great work — keep this pace!",
    actionGuideNextMessageDue: "It's time to measure!",
    actionGuideNextMessageInDays: "Measurement in {days} days"
  },
  ja: {
    save: "保存",
    edit: "編集",
    delete: "削除",
    cancel: "キャンセル",
    saveRecord: "記録する ✨",
    cancelEdit: "編集をキャンセル",
    saveTarget: "目標を保存! 💪",
    saveNote: "プランを保存 🖋️",
    saveSettings: "設定を保存",
    close: "閉じる",
    ComRemainder: "残り",
    confirm: "確認",
    selectAll: "すべて選択",
    deselectAll: "すべて解除",
    noDataYet: "最初の記録を残しましょうか？",
    noNotesYet: "まだ作成されたプランがありません。最初のプランを残しましょうか？",
    noTargetsYet: "目標が設定されていません。",
    noDataForChart: "表示する項目を選択するか、データを入力してください。",
    invalidValue: "無効な値",
    loadingError: "データの読み込みエラー",
    savingError: "データの保存エラー",
    valuePlaceholder: "値",
    confirmReset: "本当にすべてのデータを初期化しますか？ この操作は元に戻すことができず、すべての測定記録、目標、プランが完全に削除されます。初期化する前にデータをバックアップすることを強くお勧めします。",
    confirmDeleteRecord: "週{week} ({date}) の記録を削除しますか？ この操作は元に戻せません。",
    confirmDeleteNote: "プラン「{title}」を削除しますか？ この操作は元に戻せません。",
    dataExported: "データがファイルに保存されました。",
    dataImported: "データが正常に読み込まれました！",
    dataReset: "すべてのデータが初期化されました。",
    dataSaved: "保存されました！",
    noteSaved: "プランが保存されました。",
    targetsSaved: "目標が保存されました。",
    settingsSaved: "設定が保存されました。",
    importError: "ファイルの読み込み中にエラーが発生しました:",
    importSuccessRequiresReload: "データが正常に読み込まれました。変更を適用するにはページを再読み込みしてください。",
    unexpectedError: "予期しないエラーが発生しました 😢 コンソール（F12）を確認してください。\nエラー: {message}",
    alertInitError: "アプリの初期化中にエラーが発生しました！",
    alertListenerError: "イベントリスナーの設定中にエラーが発生しました！",
    popupSaveSuccess: "測定記録 保存完了！🎉",
    popupUpdateSuccess: "測定記録 更新完了！✨",
    popupDeleteSuccess: "測定記録 削除完了 👍",
    popupTargetSaveSuccess: "目標 保存完了！👍",
    popupNoteSaveSuccess: "新規プラン 保存完了！🎉",
    popupNoteUpdateSuccess: "プラン 更新完了！✨",
    popupNoteDeleteSuccess: "プラン 削除完了 👍",
    popupDataExportSuccess: "データ エクスポート成功！🎉",
    popupDataImportSuccess: "データ インポート成功！✨",
    popupDataResetSuccess: "全データ リセット完了。 ✨",
    popupSettingsSaved: "設定 保存完了！",
    alertValidationError: "無効な入力値あり。赤色箇所を確認。数値は0以上必須。",
    alertNoteContentMissing: "プランのタイトルか内容を入力してください！",
    alertImportConfirm: "現在のデータを上書きしファイルから復元しますか？元に戻せません。",
    alertImportInvalidFile: "ファイル形式が無効か互換性がありません",
    alertImportReadError: "ファイル読込/処理エラー",
    alertImportFileReadError: "ファイル読込失敗",
    alertGenericError: "エラー発生",
    alertDeleteError: "削除中エラー",
    alertLoadError: "データ読込エラー。データ破損の可能性あり。コンソール確認",
    alertSaveError: "保存失敗",
    alertExportError: "エクスポート中エラー",
    alertCannotFindRecordEdit: "編集対象記録なし",
    alertCannotFindRecordDelete: "削除対象記録なし",
    alertInvalidIndex: "記録処理エラー：インデックス無効",
    alertCannotFindNoteEdit: "編集対象プランなし",
    alertCannotFindNoteDelete: "削除対象プランなし",
    notification_setup_success_title: "通知設定完了",
    notification_setup_success_body: "通知が設定されました。毎週測定日にお知らせします！",
    notification_permission_denied: "通知の許可が拒否されました。ブラウザの設定で許可してください。",
    tabMain: "ホーム",
    tabRecord: "記録する",
    tabMy: "マイページ",
    tabSettings: "設定",
    myTitle: "マイページ 🧑‍🚀",
    svcard_shortcut_new: "新たな気持ちで<br><span class='countdown-days'>記録</span><br>しませんか？",
    svcard_shortcut_dday: "「測定日です！」<br>新しい記録を<br>測定しましょう",
    svcard_shortcut_overdue: "「測定が{days}日遅れています！」<br>新しい記録を<br>測定しましょう",
    svcard_shortcut_countdown: "次の測定まで<br><span class='countdown-days'>{days}日</span><br>です",
    svcard_title_highlights: "✨ ボディまとめ",
    svcard_title_targets: "🎯 変化ロードマップ",
    svcard_title_hormones: "💉 ホルモン分析",
    svcard_title_keeps: "📝 プランノート",
    svcard_no_data_for_highlights: "比較するには記録が2つ以上必要です。",
    svcard_no_targets_set: "設定タブで目標を設定してください。",
    svcard_overall_progress: "全体達成率",
    svcard_no_major_changes: "最近、主な変化はありません。",
    svcard_change_vs_last_week: "先週より",
    svcard_title_weekly_guide: "今日のひとこと",
    svcard_title_action_guide: "🎯 アクションガイド",
    svcard_action_guide_summary: "おすすめアクションとフィードバックを確認しましょう。",
    actionGuideCategoryExercise: "運動",
    actionGuideCategoryDiet: "食事",
    actionGuideCategoryMedication: "薬",
    actionGuideCategoryHabits: "習慣",
    svcard_no_keeps_yet: "作成されたプランがありません。",
    svcard_no_keeps_add_prompt: "作成されたプランがありません。「記録する」タブで追加してみてください！",
    modalTabDetailedAnalysis: "詳細分析",
    modalTabComparativeAnalysis: "比較分析",
    labelBase: "基準",
    labelCompareTarget: "比較対象",
    svcard_hormone_weekly_change: "週間変化量",
    svcard_guide_default: "継続は力なり！✨",
    svcard_guide_positive_short: "素晴らしい！<br>変化は順調です。",
    svcard_guide_positive_long: "ここ3週間、<br>着実に目標に向かっています！",
    svcard_guide_negative_short: "大丈夫、<br>少し休む週かもしれません。",
    svcard_guide_negative_long: "大丈夫、<br>また始めましょう！",
    svcard_no_hormone_data: "ホルモンデータが不足しています。",
    svcard_hormone_prediction: "来週の予測{hormone}値: <strong>{value}</strong>",
    notification_title: "ShiftV 測定通知",
    notification_body: "最後の記録から1週間が経ちました。新しい変化を記録しましょう！",
    notificationSettingsTitle: "通知設定",
    notificationToggleLabel: "測定日の通知を受け取る",
    notificationSettingsDesc: "最終測定日から7日後に通知します。通知を受け取るには、ブラウザの許可が必要です。",
    alertBrowserNotSupportNotification: "このブラウザは通知をサポートしていません。",
    showHistoryButton: "記録を確認",
    showInputButton: "入力に戻る",
    recordKeepsLabel: "今週のプラン 📝",
    recordKeepsPlaceholder: "今日の気分、出来事、体の変化などを自由に記録しましょう...",
    symptomsLabel: "症状選択",
    symptomsDescription: "経験している症状を選択し、重症度を表示してください。（複数選択可能）",
    addSymptom: "症状追加",
    symptomsEmptyState: "症状がない場合は追加ボタンを押して症状を選択してください。",
    severityLabel: "重症度",
    medicationsLabel: "薬の選択",
    medicationsDescription: "よく使う薬を追加しておくと、次の記録で自動的に維持されます。",
    addMedication: "薬を追加",
    medicationsEmptyState: "追加ボタンを押して薬を選択してください。",
    memo: "プラン",
    comparisonModalTitle: "記録レポートの詳細分析",
    medicationHistoryTitle: "投薬量の変化",
    hormoneLevelHistoryTitle: "ホルモン数値の変化",
    hormoneAnalysisTitle: "過去2週間の分析",
    hormoneAnalysisAvgChange: "平均変化量: {change}",
    hormoneAnalysisNextWeek: "来週の予測値: {value}",
    hormoneModalTitle: "ホルモン分析",
    selectedWeekDataTitle: "{week}週目の詳細記録",
    svcard_label_current: "現在: {value}",
    targetLabelShort: "(目標:{value})",
    emaxTitle: "Emax / Hill 分析 🧬",
    responseFactor: "実際の反応度 (RF)",
    rfMessage_high: "平均よりE2に対する感度が高いです。✨",
    rfMessage_normal: "予測モデルと同様の反応を示しています。👌",
    rfMessage_low: "E2値に対し、T抑制が予想より低いです。🤔",
    rfMessage_negative: "数値が上昇しました。(フレア/変動) 📈",
    currentLevelEvaluation: "現在の数値評価",
    currentLevelEvaluationDesc: "目標値と比較して現在のホルモン数値が適切かを評価します。",
    hormoneAnalysisTitleChange: "数値変化分析",
    hormoneChangeAnalysisDesc: "時間経過によるホルモン数値の変化を週間、月間、全期間に分けて分析します。",
    hormoneAnalysisTitleInfluence: "薬物影響分析",
    drugInfluenceDesc: "服用中の薬物がホルモン数値に与える影響をデータに基づいて分析します。",
    hormoneAnalysisTitlePrediction: "将来予測",
    emaxAnalysisDesc: "Hillモデルを使用してホルモン反応度を評価し、テストステロン抑制量を予測します。",
    bodyRatioAnalysisDesc: "身体比率を分析し、変化の推移を可視化します。",
    estrogen_optimal: "最適範囲です",
    estrogen_above_target: "目標より高いです",
    estrogen_below_target: "目標より低いです",
    estrogen_critical_high: "警告：非常に高い数値です",
    testosterone_optimal: "最適範囲です",
    testosterone_above_target: "目標より高いです",
    testosterone_below_target: "目標より低いです",
    testosterone_critical_low: "警告：非常に低い数値です",
    no_target_set: "目標未設定",
    understandingHormones: "ホルモン数値の理解",
    estrogenExplanation: "エストロゲンは女性化効果を担当する主要ホルモンです。肌の変化、乳房の発達、脂肪分布の変化などに影響します。",
    testosteroneExplanation: "テストステロンは男性化効果を担当する主要ホルモンです。筋肉量、体毛、声などに影響します。",
    stabilityAnalysisTitle: "ホルモン安定性分析",
    variationCoeff: "変動係数",
    stability: "安定性",
    stability_stable: "安定",
    stability_moderate: "普通",
    stability_unstable: "不安定",
    drugInfluenceHowItWorks: "動作原理",
    drugInfluenceHowItWorksDesc: "薬物服用前後のホルモン変化を分析し、各薬物の影響力を計算します。用量変化が大きい時期により高い重みを付与します。",
    drugInfluenceConfidenceDesc: "信頼度はデータの量と質を示します。サンプル数が多く、単一薬物変化区間が多いほど高くなります。",
    samples: "サンプル",
    confidence: "信頼度",
    bodyRatioAnalysisTitle: "身体比率分析",
    waistHipRatio: "ウエスト-ヒップ比 (WHR)",
    chestWaistRatio: "チェスト-ウエスト比",
    shoulderHipRatio: "肩-ヒップ比",
    weeklyChange: "週間変化量",
    monthlyAvgChange: "月間平均変化量",
    totalChange: "総変化量",
    totalChangeWithInitial: "総変化量 (初期値: {value})",
    drugInfluence: "mgあたりの影響",
    predictedNextWeek: "来週予測",
    daysToTarget: "目標までの予測日数",
    daysUnit: "{days}日",
    notEnoughData: "データ不足",
    dailyTSuppression: "一日T抑制量",
    influenceAnalysisDesc: "この情報は実測データに基づく予測です。<br>数値には誤差が含まれる場合があります。",
    currentLevelsEvaluationTitle: "現在の数値評価",
    svcard_label_target: "目標",
    hormoneLevelOptimal: "最適範囲です",
    hormoneLevelAboveTarget: "目標より高いです",
    hormoneLevelBelowTarget: "目標より低いです",
    hormoneLevelHigh: "高い数値です",
    hormoneLevelLow: "低い数値です",
    hormoneLevelNoTarget: "目標が設定されていません",
    healthAlertsTitle: "健康注意事項",
    healthAlertHighE2: "⚠️ エストロゲン値が非常に高いです (>300 pg/mL)。医療機関への相談をお勧めします。",
    healthAlertLowT: "⚠️ テストステロン値が非常に低いです (<5 ng/dL)。医療機関への相談をお勧めします。",
    predictionDisclaimer: "※ 予測値は参考用であり、個人差と測定誤差がある場合があります。",
    hormoneExplanationTitle: "ホルモン数値の理解",
    hormoneExplanationDesc: "以下は各ホルモンの意味と測定方法です。",
    hormoneLevelsExplained: "ホルモン数値の説明",
    estrogenLevelUnit: "pg/mL",
    estrogenLevelExplanation: "エストラジオール(E2)は女性化に重要なホルモンで、血液検査で測定されます。",
    testosteroneLevelUnit: "ng/mL",
    testosteroneLevelExplanation: "テストステロン(T)は男性化に重要なホルモンで、血液検査で測定されます。",
    responseFactorExplanation: "個人のホルモン反応感度を示します。1.0に近いほど標準的な反応です。",
    etRatioTitle: "E/T比",
    etRatioMale: "男性型",
    etRatioFemale: "女性型",
    etRatioExplanation: "E/T比はエストロゲン(E)とテストステロン(T)の相対的バランスを示します。医学的標準式: E2(pg/mL) ÷ T(ng/dL)、正常範囲: 0.04~0.1。高いほど女性化、低いほど男性化を意味します。",
    bodyRatioTitle: "身体比率分析",
    whrLabel: "WHR (ウエスト・ヒップ比)",
    chestWaistLabel: "胸囲・ウエスト比",
    shoulderHipLabel: "肩幅・ヒップ比",
    drugInfluenceHow: "この分析は薬物投与量とホルモン変化を比較し、各薬物がホルモン値に与える影響を予測します。投与量変更が明確な区間により高い重み付けを行います。",
    drugInfluenceConfidence: "信頼度は分析に使用されたデータの量と質を示します。高いほど予測がより正確です。",
    drugInfluenceHowTitle: "分析方法",
    drugInfluenceConfidenceTitle: "信頼度",
    influenceSamplesLabel: "分析区間",
    hormoneStabilityTitle: "ホルモン安定性",
    cvStabilityNote: "低いほど安定 (< 10%: 非常に安定)",
    rfMessage_very_high: "非常に高い反応度 - ホルモンに非常に敏感に反応します",
    rfMessage_very_low: "非常に低い反応度 - ホルモンに非常に鈍感に反応します",
    formTitleNew: "測定開始📏<br>現在{week}週",
    formTitleEdit: "測定記録を編集<br>{week}週目",
    inputDescription: "すべての項目は任意です！記録したいものだけ気軽に入力してください 😉",
    nextMeasurementInfoNoData: "最終測定日を基準に次の予定日を計算します。",
    nextMeasurementInfo: "最終測定: {lastDate} ({daysAgo}日前) <br>次回推奨日: {nextDate} ({daysUntil}日後)",
    nextMeasurementInfoToday: "最終測定: {lastDate} ({daysAgo}日前) <br>今日は測定日です！",
    nextMeasurementInfoOverdue: "最終測定: {lastDate} ({daysAgo}日前) <br>測定が{daysOverdue}日遅れています！",
    daysAgo: "{count}日前",
    daysUntil: "{count}日後",
    today: "今日",
    categoryBodySize: "身体サイズ 📐",
    categoryHealth: "健康 💪",
    categoryMedication: "魔法 ✨",
    week: "週目",
    date: "日付",
    timestamp: "記録時間",
    height: "身長 (cm)",
    weight: "体重 (kg)",
    shoulder: "肩幅 (cm)",
    neck: "首回り (cm)",
    chest: "上胸囲 (cm)",
    cupSize: "下胸囲 (cm)",
    waist: "ウエスト (cm)",
    hips: "ヒップ (cm)",
    thigh: "太もも (cm)",
    calf: "ふくらはぎ (cm)",
    arm: "腕 (cm)",
    muscleMass: "筋肉量 (kg)",
    bodyFatPercentage: "体脂肪率 (%)",
    libido: "性欲 (回/週)",
    estrogenLevel: "エストロゲン数値",
    testosteroneLevel: "テストステロン数値",
    healthStatus: "健康状態",
    healthScore: "健康スコア",
    healthNotes: "健康状態(テキスト)",
    skinCondition: "肌の状態",
    estradiol: "エストラジオール (mg)",
    progesterone: "プロゲステロン (mg)",
    antiAndrogen: "抗アンドロゲン (mg)",
    testosterone: "テストステロン (mg)",
    antiEstrogen: "抗エストロゲン剤 (mg)",
    medicationOtherName: "その他の魔法名",
    medicationOtherDose: "その他の魔法用量 (mg)",
    medicationOtherNamePlaceholder: "（その他）",
    unitMgPlaceholder: "mg",
    skinConditionPlaceholder: "例: 柔らかくなった",
    libidoPlaceholder: "回/週",
    scorePlaceholder: "点数",
    notesPlaceholder: "特記事項",
    unitCm: "cm",
    unitKg: "kg",
    unitPercent: "%",
    unitMg: "mg",
    unitCountPerWeek: "回/週",
    placeholderPrevious: "前回: {value}",
    historyTitle: "測定記録の詳細 🧐",
    historyDescription: "（表が画面より広い場合は、左右にスクロールしてください！）",
    manageColumn: "管理",
    reportTitle: "私の変化レポート 📈",
    reportGraphTitle: "週ごとの変化グラフ",
    reportGraphDesc: "見たい項目のボタンを押して選択（アクティブ化）または解除できます。複数の項目を重ねて表示することも可能です！",
    reportPrevWeekTitle: "先週と比較🤔",
    reportInitialTitle: "最初と比較🌱",
    reportTargetTitle: "目標達成率🎯",
    reportNeedTwoRecords: "比較するには、少なくとも2つの記録が必要です。",
    reportNeedTarget: "まず「目標設定」タブで目標を入力してください！",
    chartAxisLabel: "週目",
    comparisonItem: "項目",
    comparisonChange: "変化量",
    comparisonProgress: "達成率",
    targetAchieved: "達成 🎉",
    targetDescription: "希望する目標数値を入力してください。メインタブで達成率を確認できます。",
    targetItem: "項目",
    targetValue: "目標値",
    overviewTitle: "プラン 📝",
    noteNewTitle: "新しいプランを作成",
    noteEditTitle: "プランを編集",
    noteTitleLabel: "タイトル",
    noteTitlePlaceholder: "プランのタイトル（任意）",
    noteContentLabel: "内容",
    noteContentPlaceholder: "イベント、体調の変化、考えなど、自由に記録しましょう！",
    noteListTitle: "作成されたプラン一覧 ✨",
    noteTitleUntitled: "無題",
    sortBy: "並び替え:",
    sortNewest: "新しい順",
    sortOldest: "古い順",
    noteDateCreated: "作成:",
    noteDateUpdated: "(編集: {date})",
    notePreviewEmpty: "(内容なし)",
    settingsTitle: "設定 ⚙️",
    languageSettingsTitle: "言語設定",
    language: "言語",
    modeSettingsTitle: "モード設定",
    modeSettingsDesc: "目指す身体の変化の方向を選択してください。",
    mode: "モード",
    modeMtf: "女性化",
    modeFtm: "男性化",
    themeSettingsTitle: "テーマ設定",
    theme: "テーマ",
    themeSystem: "デバイスの設定に従う",
    themeLight: "ライトモード",
    themeDark: "ダークモード",
    dataManagementTitle: "データのバックアップと復元",
    dataManagementDesc: "すべての記録（測定、目標、プラン）を1つのファイルに保存したり、復元したりできます。時々バックアップしておくと安心です！ 😊",
    exportData: "ファイルに保存",
    importData: "ファイルから読み込む",
    warning: "注意！",
    importWarning: "復元すると、現在ブラウザにあるすべてのデータがファイルの内容に完全に置き換えられます！",
    resetDataTitle: "データ初期化",
    severeWarning: "！！！警告！！！",
    resetWarning: "😱 すべてのデータ（測定、目標、プラン）が完全に削除されます！ 初期化する前に必ずデータをファイルにバックアップしてください。",
    resetDataButton: "すべてのデータを初期化",
    infoTitle: "情報",
    versionLabel: "バージョン:",
    privacyInfo: "このアプリはオフラインで動作し、すべてのデータはブラウザ内にのみ安全に保存されます！ 😉",
    developerMessage: "この小さなツールが、あなたの貴重な旅に喜びと助けをもたらすことを願っています！",
    dataUpdateAndResetTitle: "データの更新と初期化",
    checkForUpdatesButton: "更新を確認",
    popupUpdateComplete: "アップデートが完了しました。アプリを再起動します。",
    popupUpdateFailed: "アップデートに失敗しました。後でもう一度お試しください。",
    popupAlreadyLatest: "すでに最新バージョンです！✨",
    popupOfflineForUpdate: "アップデートを確認するにはインターネット接続が必要です。",
    initialSetupTitle: "初期設定",
    initialSetupDesc: "ShiftVを使用する前に、言語とモードを選択してください。",
    swipeThresholdMet: "スワイプ検出: {direction}",
    labelInitial: "初期",
    labelPrev: "前週",
    labelCurrent: "現在",
    labelTarget: "目標",
    initialTargetSame: "初期/目標",
    prevCurrentSame: "前週/現在",
    graphClickPrompt: "グラフの数値をタップすると、該当週の詳細記録が表示されます。",
    symptoms: "症状",
    medications: "服用薬",
    menstruationActive: "月経の有無",
    menstruationPain: "月経痛",
    briefingGroupMeasurements: "測定",
    briefingGroupSymptoms: "症状",
    briefingGroupMedications: "薬",
    biologicalSex: "生物学的性別",
    sexSettingsTitle: "生物学的性別設定",
    sexSettingsDesc: "自然なホルモン回復率の計算精度を向上させるために使用されます。",
    sexMale: "男性",
    sexFemale: "女性",
    sexOther: "その他",
    menstruationLabel: "月経の有無",
    cyclePainLabel: "強度 (1-5)",
    actionGuideModalTitle: "アクションガイド",
    actionGuideNextMeasurement: "次回測定日",
    actionGuideRecommendations: "おすすめアクション",
    actionGuidePerformance: "最近の成果フィードバック",
    actionGuideMotivation: "モチベーション",
    actionGuideDDayUnknown: "D-?",
    actionGuideNoRecommendations: "おすすめを作るためのデータが不足しています。",
    actionGuideNoPerformance: "成果フィードバックを作るためのデータが不足しています。",
    actionGuideMotivationClosing: "素晴らしい！このペースを保ちましょう！",
    actionGuideNextMessageDue: "測定のタイミングです！",
    actionGuideNextMessageInDays: "測定まであと{days}日",
    removeSymptom: "削除",
    modalTabBriefingSummary: "要約",
    modalTabBriefingDetail: "詳細",
    briefingOverallProgress: "全体目標達成率",
    briefingBodyChange: "全体身体変化",
    briefingTargetAchievement: "目標達成率",
    briefingBodyRatio: "身体比率分析",
    briefingFuturePrediction: "未来予測",
    briefingHealthAlerts: "健康警告アラート",
    briefingWeeklyChange: "週間変化:",
    briefingMonthlyAvg: "月平均:",
    briefingPreviousWeek: "先週:",
    briefingTarget: "目標:",
    modalTabRoadmapSummary: "要約",
    modalTabRoadmapDetail: "詳細",
    roadmapOverallProgress: "全体進捗",
    roadmapTimeline: "タイムライン",
    roadmapMonthlySummary: "月別要約",
    roadmapStandoutChanges: "注目の変化",
    roadmapDetailedGraph: "詳細グラフ",
    roadmapChangeComparison: "変化比較",
    roadmapCompareSpecificDate: "特定日と比較",
    roadmapBaseDate: "基準日",
    roadmapCompareDate: "比較日",
    roadmapStart: "開始",
    roadmapWeekLabel: "Week {week}",
    roadmapTimelineStart: "開始",
    roadmapTimelineCurrent: "現在",
    roadmapTimelineFinalForecast: "最終目標の予測",
    roadmapTimelineAwayFromGoal: "目標から遠ざかり",
    roadmapTimelineBigChange: "大きな変化",
    roadmapTimelineReachedPercent: "{percent}%到達",
    roadmapTimelineAllGoalsEta: "すべての目標達成の予測時期",
    roadmapTimelineAwayFromGoalDesc: "一部の指標が目標から遠ざかっています。計画を見直しましょう。",
    roadmapAchievementRate: "全体達成率:",
    roadmapAchievementCount: "（{achieved}/{total}目標）",
    roadmapComparePreviousWeek: "先週と比較",
    roadmapCompareFirst: "最初と比較",
    roadmapVsPrevious: "先週比",
    roadmapVsFirst: "初回比",
    roadmapCurrent: "現在",
    roadmapPrevious: "先週",
    roadmapFirst: "初回",
    roadmapSetBaseLatest: "基準=現在",
    roadmapSetComparePrev: "比較=先週",
    roadmapSetCompareFirst: "比較=初回",
    roadmapSwapDates: "入れ替え",
    roadmapSelectDate: "日付選択:",
    roadmapNegativeNote: "目標から離れる区間が検出されました。赤いティック/軌跡の後退を参照してください。",
    roadmapModalTitle: "変化ロードマップ",
    metricWeight: "体重",
    metricWaist: "ウエスト",
    metricHips: "ヒップ",
    metricChest: "胸囲",
    metricShoulder: "肩幅",
    metricThigh: "太もも",
    metricArm: "腕",
    metricMuscleMass: "筋肉量",
    metricBodyFatPercentage: "体脂肪率",
    feminization: "女性化",
    masculinization: "男性化",
    balanced: "バランス",
    points: "点",
    achieved: "達成",
    inProgress: "進行中",
    noPredictionData: "予測データがありません。",
    noAlerts: "警告アラートがありません。健康状態は良好です！😊",
    target: "目標",
    ratioWHR: "WHR (ウエスト-ヒップ比率)",
    ratioShoulderWaist: "肩-ウエスト比率",
    ratioChestWaist: "胸-ウエスト比率",
    percentileTop10: "上位10%",
    percentileTop25: "上位25%",
    percentileAverage: "平均",
    percentileBottom25: "下位25%",
    percentileBottom10: "下位10%",
    percentileBottom5: "下位5%",
    percentileRank: "上位 {value}%",
    targetTitle: "目標設定"
  }
};
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

// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', () => {
    console.log(`DEBUG: ShiftV App Initializing v${APP_VERSION}...`);

    // --- State Variables ---
    const PRIMARY_DATA_KEY = 'shiftV_Data_v1_1';
    const SETTINGS_KEY = 'shiftV_Settings_v1_0';
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

    // Initial Setup
    const initialSetupPopup = document.getElementById('initial-setup-popup');
    const initialLanguageSelect = document.getElementById('initial-language-select');
    const initialModeSelect = document.getElementById('initial-mode-select');
    const initialSetupSaveBtn = document.getElementById('initial-setup-save');

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
    const svCardKeeps = document.getElementById('sv-card-keeps');

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
    const importDataButton = document.getElementById('import-data-button');
    const importFileInput = document.getElementById('import-file-input');
    const languageSelect = document.getElementById('language-select');
    const modeSelect = document.getElementById('mode-select');
    const themeSelect = document.getElementById('theme-select');
    const resetDataButton = document.getElementById('reset-data-button');
    const checkForUpdatesButton = document.getElementById('check-for-updates-button');

    console.log("DEBUG: DOM elements fetched.");
    // --- Constants for Measurement Keys (Using camelCase) ---
    const bodySizeKeys = ['height', 'weight', 'shoulder', 'neck', 'chest', 'cupSize', 'waist', 'hips', 'thigh', 'calf', 'arm'];
    const healthKeys = ['muscleMass', 'bodyFatPercentage', 'libido', 'estrogenLevel', 'testosteroneLevel', 'healthScore', 'skinCondition', 'healthNotes']; // 'semenScore', 'semenNotes' 삭제 및 새 키 추가
    const medicationKeys_MtF = ['estradiol', 'progesterone', 'antiAndrogen'];
    const medicationKeys_FtM = ['testosterone', 'antiEstrogen']; // 'antiEstrogen' 추가
    const baseNumericKeys = [
        'height', 'weight', 'shoulder', 'neck', 'chest', 'cupSize', 'waist', 'hips', 'thigh', 'calf', 'arm', // 'cupSize' 추가
        'muscleMass', 'bodyFatPercentage', 'libido', 'estrogenLevel', 'testosteroneLevel', 'healthScore', // 'semenScore' 삭제 및 새 키 추가
        'estradiol', 'progesterone', 'antiAndrogen', 'testosterone', 'antiEstrogen', // 'antiEstrogen' 추가
        'menstruationPain'
    ];
    const textKeys = ['healthNotes', 'skinCondition', 'memo', 'menstruationActive'];
    // displayKeysInOrder를 업데이트합니다. (표시 순서 제어)
    const displayKeysInOrder = [
        'week', 'date',
        'height', 'weight', 'shoulder', 'neck', 'chest', 'cupSize', 'waist', 'hips', 'thigh', 'calf', 'arm',
        'muscleMass', 'bodyFatPercentage', 'libido', 'estrogenLevel', 'testosteroneLevel', 'skinCondition', 'healthScore', 'healthNotes',
        'estradiol', 'progesterone', 'antiAndrogen', 'testosterone', 'antiEstrogen',
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
        'shoulder', 'neck', 'chest', 'cupSize', 'waist', 'hips', 'thigh', 'calf', 'arm' // 'cupSize' 추가
    ];
    console.log("DEBUG: Measurement keys defined (camelCase).");


    // --- Unit Conversion Constants ---
    const UNIT_CONVERSIONS = {
        estrogenLevel: {
            'pg/ml': 1,
            'pmol/L': 0.2724 // 1 pmol/L = 0.2724 pg/mL
        },
        testosteroneLevel: {
            'ng/dl': 1,
            'nmol/L': 28.85, // 1 nmol/L = 28.85 ng/dL
            'ng/ml': 100     // 1 ng/mL = 100 ng/dL
        },
        weight: {
            'kg': 1,
            'lbs': 0.45359237
        }
    };

    function convertToStandard(key, value, unit) {
        if (value === null || value === undefined || value === '') return null;
        const num = typeof value === 'number' ? value : parseFloat(value);
        if (Number.isNaN(num)) return null;
        if (!UNIT_CONVERSIONS[key] || !UNIT_CONVERSIONS[key][unit]) return num;
        return num * UNIT_CONVERSIONS[key][unit];
    }

    function convertFromStandard(key, value, unit) {
        if (value === null || value === undefined || value === '') return '';
        const num = typeof value === 'number' ? value : parseFloat(value);
        if (Number.isNaN(num)) return '';
        if (!UNIT_CONVERSIONS[key] || !UNIT_CONVERSIONS[key][unit]) return num.toFixed(2);
        return (num / UNIT_CONVERSIONS[key][unit]).toFixed(2);
    }

    let UnitHealthEvaluatorClass = null;
    let unitHealthEvaluatorInstance = null;

    async function getUnitHealthEvaluator() {
        if (unitHealthEvaluatorInstance) return unitHealthEvaluatorInstance;
        if (!UnitHealthEvaluatorClass) {
            const module = await import('./src/doctor-module/core/health-evaluator.js');
            UnitHealthEvaluatorClass = module.HealthEvaluator || module.default;
        }
        unitHealthEvaluatorInstance = new UnitHealthEvaluatorClass([], currentMode, biologicalSex);
        return unitHealthEvaluatorInstance;
    }

    async function normalizeMetricValue(metric, value, fromUnit) {
        const evaluator = await getUnitHealthEvaluator();
        return evaluator.normalizeUnit(metric, value, fromUnit);
    }

    // --- Utility Functions ---

    function isIOS() {
        return [
            'iPad Simulator', 'iPhone Simulator', 'iPod Simulator',
            'iPad', 'iPhone', 'iPod'
        ].includes(navigator.platform)
            || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
    }

    function translate(key, params = {}) {
        const langData = languages[currentLanguage] || languages.ko;
        let text = langData[key] || key;
        for (const p in params) {
            const regex = new RegExp(`\\{${p}\\}`, 'g');
            text = text.replace(regex, params[p]);
        }
        return text;
    }
    function getCssVar(varName) {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }

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
                    if (el.childElementCount === 0 || el.classList.contains('description') || el.classList.contains('table-title') || el.classList.contains('tab-button') || el.tagName === 'BUTTON' || el.tagName === 'OPTION' || el.tagName === 'LEGEND' || el.tagName === 'LABEL' || el.classList.contains('version-info') || el.classList.contains('form-title') || el.classList.contains('warning') || el.classList.contains('placeholder-text')) {
                        // Check if it's the specific span for version number to avoid overwriting
                        if (!el.id?.includes('app-version-display')) {
                            // Handle special cases like warning messages with strong tags
                            if (el.classList.contains('warning') && key === 'importWarning') {
                                el.innerHTML = `<strong data-lang-key="warning">${translate('warning')}</strong> <span>${translation}</span>`;
                            } else if (el.classList.contains('warning') && key === 'resetWarning') {
                                el.innerHTML = `<strong data-lang-key="severeWarning">${translate('severeWarning')}</strong> <span>${translation}</span>`;
                            } else {
                                el.textContent = translation;
                            }
                        }
                    }
                } else if (el.tagName === 'IMG' && el.alt !== undefined) {
                    el.alt = translation;
                }

            } catch (e) {
                console.error(`Error translating element with key "${key}":`, e, el);
            }
        });

        // --- Specific Element Updates (using translate function) ---
        if (saveUpdateBtn) saveUpdateBtn.textContent = translate(editIndexInput.value === '' ? 'saveRecord' : 'edit');
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
            
            if (value <= data.p10) return { percentile: 10, text: '상위 10%' };
            if (value <= data.p25) return { percentile: 25, text: '상위 25%' };
            if (value <= data.p50) return { percentile: 50, text: '평균' };
            if (value <= data.p75) return { percentile: 75, text: '하위 25%' };
            if (value <= data.p90) return { percentile: 90, text: '하위 10%' };
            return { percentile: 95, text: '하위 5%' };
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
            
            // ⚠️ 중요: 어깨는 "너비"이고 엉덩이는 "둘레"
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
            const legacyStandardMeds = ['estradiol', 'progesterone', 'antiAndrogen', 'testosterone', 'antiEstrogen'];

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

                legacyStandardMeds.forEach(key => {
                    const dose = Number(m?.[key]);
                    if (!Number.isFinite(dose) || dose <= 0) return;
                    map[key] = (map[key] || 0) + dose;
                });

                const otherName = m?.medicationOtherName;
                const otherDose = Number(m?.medicationOtherDose);
                if (otherName && otherName.trim() !== '' && Number.isFinite(otherDose) && otherDose > 0) {
                    map[otherName] = (map[otherName] || 0) + otherDose;
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
    function openModal(title, contentHTML) {
        if (!modalOverlay || !modalTitle || !modalContent) return;

        modalTitle.textContent = title;
        modalContent.innerHTML = contentHTML;

        translateUI(modalContent); // <<< 이 한 줄을 추가해주세요!

        bodyElement.classList.add('modal-open');
        modalOverlay.classList.add('visible');
    }

    function closeModal() {
        // 이미 닫혀있으면 아무것도 하지 않음
        if (!modalOverlay || !modalOverlay.classList.contains('visible')) return;

        const state = history.state;
        if (state && typeof state.type === 'string' && state.type.startsWith('modal')) {
            history.back();
        } else {
            // 히스토리 상태가 없는 경우에는 그냥 시각적으로만 닫기
            closeAllModalsVisually();
        }
    }
    // --- Hormone Modal Functions ---
    function openHormoneModal() {
        if (!hormoneModalOverlay) return;

        // 모달을 열기 전에 내용을 먼저 채웁니다.
        renderHormoneReport();

        const hormoneModalContent = hormoneModalOverlay.querySelector('.modal-content'); // <<< 이 줄 추가
        if (hormoneModalContent) {
            hormoneModalContent.scrollTop = 0;
            translateUI(hormoneModalContent); // <<< 이 한 줄을 추가해주세요!
        }

        bodyElement.classList.add('modal-open');
        hormoneModalOverlay.classList.add('visible');
    }

    function closeHormoneModal() {
        if (!hormoneModalOverlay || !hormoneModalOverlay.classList.contains('visible')) return;

        const state = history.state;
        if (state && state.type === 'modal-hormone') {
            history.back();
        } else {
            closeAllModalsVisually();
        }
    }

    // script.js (약 1080번째 줄 근처, 기존 openComparisonModal 부터 handleComparisonFilterClick 까지를 아래 코드로 교체)

    // --- Comparison Modal 'Flow View' Functions ---
    function openComparisonModal() {
        // 새로운 Body Briefing 모달 사용
        try {
            // 동적 import로 Body Briefing 모달 로드
            import('./src/ui/body-briefing-modal.js').then(module => {
                const BodyBriefingModal = module.BodyBriefingModal || module.default;
                const userSettings = {
                    mode: currentMode || 'mtf',
                    biologicalSex: biologicalSex || 'male',
                    language: currentLanguage || 'ko',
                    targets: targets || {}
                };
                pushHistoryState('modal-briefing');
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
            'height', 'weight', 'shoulder', 'neck', 'chest', 'cupSize', 'waist', 'hips', 'thigh', 'calf', 'arm',
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
        const legacyStandardMeds = ['estradiol', 'progesterone', 'antiAndrogen', 'testosterone', 'antiEstrogen'];
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

        legacyStandardMeds.forEach(key => {
            if (!measurement || !(key in measurement)) return;
            addDose(key, measurement[key]);
        });

        const otherName = measurement?.medicationOtherName;
        if (otherName && otherName.trim() !== '') {
            addDose(otherName, measurement?.medicationOtherDose);
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
        if (!('Notification' in window)) {
            console.log("This browser does not support desktop notification");
            return;
        }

        if (Notification.permission === "granted") {
            const notification = new Notification(translate('notification_title'), {
                body: translate('notification_body'),
                icon: '/icons/apple-touch-icon.png' // 앱 아이콘 경로
            });
            // 알림 클릭 시 앱 창으로 포커스
            notification.onclick = () => {
                window.focus();
            };
        }
    }

    function checkAndRequestNotification() {
        if (!notificationEnabled || !('Notification' in window) || measurements.length === 0) {
            return;
        }


        const lastMeasurement = measurements[measurements.length - 1];
        const lastTimestamp = lastMeasurement.timestamp;
        const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;

        // 마지막 측정 후 7일이 지났는지 확인
        if (Date.now() - lastTimestamp > sevenDaysInMillis) {
            if (Notification.permission === "granted") {
                showNotification();
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        showNotification();
                    }
                });
            } else {
                console.warn(translate('notification_permission_denied'));
            }
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
            return `
        <div class="carousel-item sv-metric-slide">
            <p class="sv-metric-title">${translate(item.key)}</p>
            <p class="sv-metric-value">${formatValue(item.value, item.key)}</p>
            <p class="sv-metric-change ${changeClass}">${translate('svcard_change_vs_last_week')} ${changeText}</p>
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
                    statusHTML = `<div class="status-badge danger-badge">⚠️ ${translate('estrogen_critical_high')}</div>`;
                    statusIcon = '⚠️';
                } else if (analytics.estrogenLevel.status === 'optimal') {
                    statusHTML = `<div class="status-badge optimal-badge">✓ ${translate('estrogen_optimal')}</div>`;
                    statusIcon = '✓';
                } else if (analytics.estrogenLevel.status === 'above_target') {
                    statusHTML = `<div class="status-badge above-badge">↑ ${translate('estrogen_above_target')}</div>`;
                    statusIcon = '↑';
                } else if (analytics.estrogenLevel.status === 'below_target') {
                    statusHTML = `<div class="status-badge below-badge">↓ ${translate('estrogen_below_target')}</div>`;
                    statusIcon = '↓';
                } else {
                    statusHTML = `<div class="status-badge neutral-badge">${translate('no_target_set')}</div>`;
                    statusIcon = '—';
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
                    statusHTML = `<div class="status-badge danger-badge">⚠️ ${translate('testosterone_critical_low')}</div>`;
                    statusIcon = '⚠️';
                } else if (analytics.testosteroneLevel.status === 'optimal') {
                    statusHTML = `<div class="status-badge optimal-badge">✓ ${translate('testosterone_optimal')}</div>`;
                    statusIcon = '✓';
                } else if (analytics.testosteroneLevel.status === 'above_target') {
                    statusHTML = `<div class="status-badge above-badge">↑ ${translate('testosterone_above_target')}</div>`;
                    statusIcon = '↑';
                } else if (analytics.testosteroneLevel.status === 'below_target') {
                    statusHTML = `<div class="status-badge below-badge">↓ ${translate('testosterone_below_target')}</div>`;
                    statusIcon = '↓';
                } else {
                    statusHTML = `<div class="status-badge neutral-badge">${translate('no_target_set')}</div>`;
                    statusIcon = '—';
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
                                <span class="ratio-icon male">♂</span>
                                <span class="ratio-percentile">${maleRange}</span>
                            </div>
                            <div class="ratio-bar">
                                <div class="ratio-bar-fill" style="width: ${analytics.etRatio.position}%;"></div>
                                <div class="ratio-bar-marker" style="left: ${analytics.etRatio.position}%;"></div>
                            </div>
                            <div class="ratio-icon-group">
                                <span class="ratio-icon female">♀</span>
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
                    <h4 class="info-card-title">💡 ${translate('understandingHormones')}</h4>
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
                let rfIcon = '📊';
                if (analytics.emax.messageKey === 'rfMessage_very_high' || analytics.emax.messageKey === 'rfMessage_high') {
                    rfColorClass = 'positive';
                    rfIcon = '✓';
                } else if (analytics.emax.messageKey === 'rfMessage_low' || analytics.emax.messageKey === 'rfMessage_very_low' || analytics.emax.messageKey === 'rfMessage_negative') {
                    rfColorClass = 'negative';
                    rfIcon = '⚠️';
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
                        statusIcon = '✓';
                        statusClass = 'stable';
                    } else if (analytics.stability.estrogenLevel.status === 'moderate') {
                        statusText = translate('stability_moderate');
                        statusIcon = '~';
                        statusClass = 'moderate';
                    } else {
                        statusText = translate('stability_unstable');
                        statusIcon = '⚠️';
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
                        statusIcon = '✓';
                        statusClass = 'stable';
                    } else if (analytics.stability.testosteroneLevel.status === 'moderate') {
                        statusText = translate('stability_moderate');
                        statusIcon = '~';
                        statusClass = 'moderate';
                    } else {
                        statusText = translate('stability_unstable');
                        statusIcon = '⚠️';
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
                                <span class="prediction-label">📈 ${translate('predictedNextWeek')}</span>
                                <span class="prediction-value">${analytics.estrogenLevel.predictedNext ? analytics.estrogenLevel.predictedNext.toFixed(1) : '-'}</span>
                            </div>
                            ${targets.estrogenLevel ? `
                            <div class="prediction-item">
                                <span class="prediction-label">🎯 ${translate('daysToTarget')}</span>
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
                                <span class="prediction-label">📈 ${translate('predictedNextWeek')}</span>
                                <span class="prediction-value">${analytics.testosteroneLevel.predictedNext ? analytics.testosteroneLevel.predictedNext.toFixed(1) : '-'}</span>
                            </div>
                            ${targets.testosteroneLevel ? `
                            <div class="prediction-item">
                                <span class="prediction-label">🎯 ${translate('daysToTarget')}</span>
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
                                <h4 class="info-card-title">ℹ️ ${translate('drugInfluenceHowItWorks')}</h4>
                                <p class="info-card-text">${translate('drugInfluenceHowItWorksDesc')}</p>
                            </div>
                            <div class="info-card mini">
                                <h4 class="info-card-title">📊 ${translate('drugInfluenceConfidence')}</h4>
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
                                <h3 class="drug-name">💊 ${drugLabel}</h3>
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
                        <h3 class="body-ratio-name">📏 ${translate('waistHipRatio')}</h3>
                        <div class="ratio-bar-container">
                            <div class="ratio-icon-group">
                                <span class="ratio-icon male">♂</span>
                                <span class="ratio-percentile">${malePercent}</span>
                            </div>
                            <div class="ratio-bar">
                                <div class="ratio-bar-fill" style="width: ${analytics.bodyRatios.whr.position}%;"></div>
                                <div class="ratio-bar-marker" style="left: ${analytics.bodyRatios.whr.position}%;"></div>
                            </div>
                            <div class="ratio-icon-group">
                                <span class="ratio-icon female">♀</span>
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
                        <h3 class="body-ratio-name">📏 ${translate('chestWaistRatio')}</h3>
                        <div class="ratio-bar-container">
                            <div class="ratio-icon-group">
                                <span class="ratio-icon male">♂</span>
                                <span class="ratio-percentile">${malePercent}</span>
                            </div>
                            <div class="ratio-bar">
                                <div class="ratio-bar-fill" style="width: ${analytics.bodyRatios.chestWaist.position}%;"></div>
                                <div class="ratio-bar-marker" style="left: ${analytics.bodyRatios.chestWaist.position}%;"></div>
                            </div>
                            <div class="ratio-icon-group">
                                <span class="ratio-icon female">♀</span>
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
                        <h3 class="body-ratio-name">📏 ${translate('shoulderHipRatio')}</h3>
                        <div class="ratio-bar-container">
                            <div class="ratio-icon-group">
                                <span class="ratio-icon male">♂</span>
                                <span class="ratio-percentile">${malePercent}</span>
                            </div>
                            <div class="ratio-bar">
                                <div class="ratio-bar-fill" style="width: ${analytics.bodyRatios.shoulderHip.position}%;"></div>
                                <div class="ratio-bar-marker" style="left: ${analytics.bodyRatios.shoulderHip.position}%;"></div>
                            </div>
                            <div class="ratio-icon-group">
                                <span class="ratio-icon female">♀</span>
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
                    regex: /^💪\s*거의\s*다\s*왔어요!\s*약\s*([0-9]+)주\s*남았습니다!$/,
                    replace: (m) => lang === 'en' ? `💪 Almost there! About ${m[1]} weeks left!` : `💪 もうすぐです！あと約${m[1]}週間！`
                },
                {
                    regex: /^현재\s*추세로는\s*목표에서\s*멀어지고\s*있습니다\.$/,
                    replace: () => lang === 'en' ? `Trending away from target.` : `現在の傾向では目標から遠ざかっています。`
                },
                {
                    regex: /^📈\s*순조롭게\s*진행\s*중입니다\.\s*약\s*([0-9]+)주\s*예상됩니다\.$/,
                    replace: (m) => lang === 'en' ? `📈 On track. Estimated ${m[1]} weeks.` : `📈 順調です。約${m[1]}週間と予想されます。`
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
            exercise: { icon: '💪', titleKey: 'actionGuideCategoryExercise' },
            diet: { icon: '🥗', titleKey: 'actionGuideCategoryDiet' },
            medication: { icon: '💊', titleKey: 'actionGuideCategoryMedication' },
            habits: { icon: '🧠', titleKey: 'actionGuideCategoryHabits' }
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

        const circumference = 50 * 2 * Math.PI; // 반지름 50
        const offset = circumference - (overallProgress / 100) * circumference;

        content += `
        <div class="sv-card-content">
            <div class="progress-circle-container">
                <svg height="120" width="120" viewBox="0 0 120 120">
                    <circle class="progress-circle-bg" cx="60" cy="60" r="50"></circle>
                    <circle class="progress-circle-bar" cx="60" cy="60" r="50"
                        stroke-dasharray="${circumference}"
                        stroke-dashoffset="${offset}"
                    ></circle>
                </svg>
                <div class="progress-circle-text">${overallProgress}%</div>
            </div>
            <p>${translate('svcard_overall_progress')}</p>
        </div>
    `;

        svCardTargets.innerHTML = content;
    }

    // 호르몬 카드 렌더링 함수
    function renderHormonesCard() {
        const card = document.getElementById('sv-card-hormones');
        const titleEl = document.getElementById('sv-card-hormones-title');
        const contentEl = document.getElementById('sv-card-hormones-content');
        const dotsEl = document.getElementById('sv-card-hormones-dots');

        if (!card || !titleEl || !contentEl || !dotsEl) return;

        card.classList.add('sv-card--clickable');
        titleEl.innerHTML = `${translate('svcard_title_hormones')}`;

        const analytics = calculateAdvancedHormoneAnalytics();

        if (measurements.length < 1) {
            contentEl.innerHTML = `<div class="carousel-item"><p class="placeholder">${translate('svcard_no_hormone_data')}</p></div>`;
            dotsEl.innerHTML = '';
            return;
        }

        const getStatusBadge = (hormoneKey, status) => {
            const isE = hormoneKey === 'estrogenLevel';
            if (status === 'critical_high') return { cls: 'danger-badge', icon: '⚠️', text: translate('estrogen_critical_high') };
            if (status === 'critical_low') return { cls: 'danger-badge', icon: '⚠️', text: translate('testosterone_critical_low') };
            if (status === 'optimal') return { cls: 'optimal-badge', icon: '✓', text: isE ? translate('estrogen_optimal') : translate('testosterone_optimal') };
            if (status === 'above_target') return { cls: 'above-badge', icon: '↑', text: isE ? translate('estrogen_above_target') : translate('testosterone_above_target') };
            if (status === 'below_target') return { cls: 'below-badge', icon: '↓', text: isE ? translate('estrogen_below_target') : translate('testosterone_below_target') };
            return { cls: 'neutral-badge', icon: '—', text: translate('no_target_set') };
        };

        const currentLevelSlide = (() => {
            if (!analytics) {
                return `
                    <div class="carousel-item sv-hormone-summary-slide">
                        <p class="placeholder">${translate('notEnoughData')}</p>
                    </div>
                `;
            }

            const hormones = [
                { key: 'estrogenLevel', name: translate('estrogenLevel').split('(')[0] },
                { key: 'testosteroneLevel', name: translate('testosteroneLevel').split('(')[0] }
            ];

            const cardsHtml = hormones.map(h => {
                const current = analytics[h.key]?.current;
                const target = parseFloat(targets?.[h.key]);
                const status = analytics[h.key]?.status;
                const badge = getStatusBadge(h.key, status);
                const showTarget = Number.isFinite(target);

                return `
                    <div class="hormone-card highlight-card sv-hormone-mini-card">
                        <div class="hormone-card-header">
                            <h3 class="hormone-name">${h.name}</h3>
                        </div>
                        <div class="hormone-current-value">${Number.isFinite(current) ? formatValue(current, h.key) : '-'}</div>
                        ${showTarget ? `<div class="hormone-target">
                            <span class="target-label">${translate('svcard_label_target')}</span>
                            <span class="target-value">${formatValue(target, h.key)}</span>
                        </div>` : ''}
                        <div class="status-badge ${badge.cls}">${badge.icon} ${badge.text}</div>
                    </div>
                `;
            }).join('');

            return `
                <div class="carousel-item sv-hormone-summary-slide">
                    <div class="hormone-grid sv-hormone-widget-grid">${cardsHtml}</div>
                </div>
            `;
        })();

        const etRatioSlide = (() => {
            const lang = currentLanguage || 'ko';
            const transitioningText = lang.startsWith('ja') ? '移行中' : lang.startsWith('en') ? 'Transitioning' : '전환 중';

            if (!analytics?.etRatio) {
                return `
                    <div class="carousel-item sv-hormone-summary-slide">
                        <div class="hormone-card ratio-card sv-hormone-mini-card">
                            <div class="ratio-value-display">
                                <span class="ratio-number">-</span>
                            </div>
                            <p class="placeholder">${translate('notEnoughData')}</p>
                        </div>
                    </div>
                `;
            }

            const ratio = analytics.etRatio.value;
            const label = analytics.etRatio.evaluation === 'male_range'
                ? translate('etRatioMale')
                : analytics.etRatio.evaluation === 'female_range'
                    ? translate('etRatioFemale')
                    : transitioningText;

            const badgeClass = analytics.etRatio.isNormal ? 'optimal-badge' : 'neutral-badge';
            const badgeText = analytics.etRatio.isNormal ? (lang.startsWith('ja') ? '正常範囲' : lang.startsWith('en') ? 'Normal range' : '정상 범위') : label;

            return `
                <div class="carousel-item sv-hormone-summary-slide">
                    <div class="hormone-card ratio-card sv-hormone-mini-card">
                        <div class="sv-ratio-row">
                            <div class="sv-ratio-group">
                                <div class="ratio-icon male">♂</div>
                                <div class="ratio-percentile">${translate('etRatioMale')}</div>
                            </div>
                            <div class="sv-ratio-bar-wrapper">
                                <div class="ratio-bar">
                                    <div class="ratio-bar-marker" style="left: ${analytics.etRatio.position}%;"></div>
                                </div>
                            </div>
                            <div class="sv-ratio-group">
                                <div class="ratio-icon female">♀</div>
                                <div class="ratio-percentile">${translate('etRatioFemale')}</div>
                            </div>
                        </div>
                        <div class="ratio-value-display">
                            <span class="ratio-number">E/T - ${ratio.toFixed(3)}</span>
                        </div>
                    </div>
                </div>
            `;
        })();

        contentEl.innerHTML = `${currentLevelSlide}${etRatioSlide}`;

        dotsEl.innerHTML = [0, 1].map((_, index) => `<div class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`).join('');

        contentEl.removeEventListener('scroll', handleCarouselScroll);
        contentEl.addEventListener('scroll', handleCarouselScroll);
        contentEl.scrollLeft = 0;
    }



    // Keeps 카드 렌더링 함수
    function renderKeepsCard() {
        const card = document.getElementById('sv-card-keeps');
        card.classList.add('sv-card-with-image', 'sv-card-image-keeps');
        const titleEl = document.getElementById('sv-card-keeps-title');
        const contentEl = document.getElementById('sv-card-keeps-content');
        const dotsEl = document.getElementById('sv-card-keeps-dots');

        if (!card || !titleEl || !contentEl || !dotsEl) return;

        const icon = '';
        const title = translate('svcard_title_keeps');
        titleEl.innerHTML = `${icon} ${title}`;

        const recentMemos = measurements
            .filter(m => m.memo && m.memo.trim() !== '')
            .slice(-3) // 최근 3개만 가져오기
            .reverse(); // 최신순으로

        if (recentMemos.length === 0) {
            contentEl.innerHTML = `<div class="carousel-item"><p class="placeholder">${translate('svcard_no_keeps_yet')}</p></div>`;
            dotsEl.innerHTML = '';
            return;
        }

        contentEl.innerHTML = recentMemos.map(item => `
            <div class="carousel-item keeps-preview">
                <div class="keeps-week">${translate('week')} ${item.week}</div>
                <p class="keeps-text-preview">${escapeHTML(item.memo)}</p>
            </div>
        `).join('');

        dotsEl.innerHTML = recentMemos.map((_, index) => `<div class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`).join('');

        // 스크롤 이벤트 리스너 추가 (중복 방지)
        contentEl.removeEventListener('scroll', handleCarouselScroll);
        contentEl.addEventListener('scroll', handleCarouselScroll);
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
        renderKeepsCard();
    }

    function renderShortcutCard() {
        if (!svCardShortcut) return;

        try {
            svCardShortcut.className = 'sv-card sv-card--clickable'; // 기본 클래스 + 클릭 가능 클래스
            svCardShortcut.classList.add('sv-card-with-image', 'sv-card-image-write');
            let contentHTML = '';

            if (!measurements || measurements.length === 0) {
                svCardShortcut.classList.add('sv-card--new');
                contentHTML = translate('svcard_shortcut_new');
            } else {
                const lastMeasurement = measurements[measurements.length - 1];
                
                // 더 강력한 타임스탬프 처리
                let lastTimestamp = lastMeasurement.timestamp;
                if (!lastTimestamp || isNaN(new Date(lastTimestamp).getTime())) {
                    // timestamp가 없거나 유효하지 않으면 date 필드 사용
                    if (lastMeasurement.date) {
                        lastTimestamp = new Date(lastMeasurement.date).getTime();
                    } else {
                        // 그래도 없으면 현재 시간 사용
                        lastTimestamp = Date.now();
                    }
                }
                
                const todayBase = new Date();
                todayBase.setHours(0, 0, 0, 0);
                const todayIndex = toLocalDayIndex(todayBase);
                const lastBase = getMeasurementBaseDate(lastMeasurement) || todayBase;
                const lastIndex = toLocalDayIndex(lastBase) ?? todayIndex;
                const nextIndex = lastIndex + 7;
                const daysUntil = nextIndex - todayIndex;

                if (daysUntil <= 0) {
                    svCardShortcut.classList.add('sv-card--dday');
                    if (daysUntil === 0) {
                        contentHTML = translate('svcard_shortcut_dday');
                    } else {
                        contentHTML = translate('svcard_shortcut_overdue', { days: Math.abs(daysUntil) });
                    }
                } else {
                    if (daysUntil <= 1) svCardShortcut.classList.add('sv-card--countdown-red');
                    else if (daysUntil <= 3) svCardShortcut.classList.add('sv-card--countdown-yellow');
                    else svCardShortcut.classList.add('sv-card--countdown-green');
                    contentHTML = translate('svcard_shortcut_countdown', { days: daysUntil });
                }
            }

            svCardShortcut.innerHTML = `<div class="shortcut-content">${contentHTML}</div>`;
        } catch (error) {
            console.error('Error in renderShortcutCard:', error);
            svCardShortcut.innerHTML = `<div class="shortcut-content">${translate('svcard_shortcut_new')}</div>`;
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
                ['week', 'date', 'symptoms', 'medications', 'memo'].includes(key) || activeHistoryFilters.includes(key)
            );
        }

        if (!headers.includes('symptoms')) {
            const memoIndex = headers.indexOf('memo');
            const insertAt = memoIndex >= 0 ? memoIndex : headers.length;
            headers.splice(insertAt, 0, 'symptoms');
        }
        if (!headers.includes('medications')) {
            const memoIndex = headers.indexOf('memo');
            const insertAt = memoIndex >= 0 ? memoIndex : headers.length;
            headers.splice(insertAt, 0, 'medications');
        }

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

    // '마이' 탭의 카드 뷰 렌더링 (모바일용)
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

            let displayKeys = getFilteredDisplayKeys().filter(key =>
                !legacyKeysToHideInTables.has(key) &&
                !['week', 'date', 'timestamp', 'memo'].includes(key) &&
                (key === 'symptoms' || key === 'medications' || (m[key] !== null && m[key] !== undefined && m[key] !== ''))
            );

            if (!displayKeys.includes('symptoms')) displayKeys.unshift('symptoms');
            if (!displayKeys.includes('medications')) displayKeys.splice(Math.min(1, displayKeys.length), 0, 'medications');
            if (activeHistoryFilters.length > 0) {
                displayKeys = displayKeys.filter(key => activeHistoryFilters.includes(key));
            }

            const labelsRow = displayKeys.map(key => `<th class="label">${translate(key).split('(')[0].trim()}</th>`).join('');
            const valuesRow = displayKeys.map(key => {
                if (key === 'symptoms') return `<td class="value wrap-cell">${formatSymptomsCell(m.symptoms)}</td>`;
                if (key === 'medications') return `<td class="value wrap-cell">${formatMedicationsCell(m.medications)}</td>`;
                if (key === 'menstruationActive') return `<td class="value">${m.menstruationActive === true ? '✓' : '-'}</td>`;
                return `<td class="value">${formatValue(m[key], key)}</td>`;
            }).join('');

            html += `
        <div class="history-card glass-card">
            <div class="history-card-header">
                <h4>${translate('week')} ${m.week}</h4>
                <span class="date-label">${formatTimestamp(m.timestamp, true)}</span>
            </div>
            ${displayKeys.length > 0 ? `
            <div class="history-card-body">
                <div class="inner-table-wrapper">
                    <table class="inner-history-table">
                        <thead><tr>${labelsRow}</tr></thead>
                        <tbody><tr>${valuesRow}</tr></tbody>
                    </table>
                </div>
            </div>` : ''}
            ${m.memo ? `<p class="keeps-text">${escapeHTML(m.memo).replace(/\n/g, '<br>')}</p>` : ''}
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

        let effectiveHeaders = Array.isArray(headers) ? headers.filter(k => !legacyKeysToHideInTables.has(k)) : [];
        if (!effectiveHeaders.includes('symptoms')) {
            const memoIndex = effectiveHeaders.indexOf('memo');
            const insertAt = memoIndex >= 0 ? memoIndex : effectiveHeaders.length;
            effectiveHeaders.splice(insertAt, 0, 'symptoms');
        }
        if (!effectiveHeaders.includes('medications')) {
            const memoIndex = effectiveHeaders.indexOf('memo');
            const insertAt = memoIndex >= 0 ? memoIndex : effectiveHeaders.length;
            effectiveHeaders.splice(insertAt, 0, 'medications');
        }

        let tableHTML = '<table class="history-table"><thead><tr>';
        effectiveHeaders.forEach(key => {
            if (key === 'timestamp') return;
            const labelText = translate(key).split('(')[0].trim();
            const thClass = (key === 'symptoms') ? 'col-symptoms' : (key === 'medications') ? 'col-medications' : '';
            tableHTML += `<th class="${thClass}">${labelText}</th>`;
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
                else if (key === 'symptoms') value = formatSymptomsCell(m.symptoms);
                else if (key === 'medications') value = formatMedicationsCell(m.medications);
                else if (key === 'menstruationActive') value = m.menstruationActive === true ? '✓' : '-';
                else value = formatValue(m[key], key);
                if (key === 'memo' && value.length > 20) {
                    value = value.substring(0, 20) + '...';
                }
                if (key === 'symptoms') tableHTML += `<td class="wrap-cell col-symptoms">${value}</td>`;
                else if (key === 'medications') tableHTML += `<td class="wrap-cell col-medications">${value}</td>`;
                else tableHTML += `<td>${value}</td>`;
            });
            tableHTML += `<td class="sticky-col action-col"><div class="action-buttons">
                        <button class="glass-button btn-edit" data-index="${index}">${translate('edit')}</button>
                        <button class="glass-button danger btn-delete" data-index="${index}">${translate('delete')}</button>
                      </div></td></tr>`;
        });

        tableHTML += '</tbody></table>';
        myHistoryTableContainer.innerHTML = tableHTML;
    }



    function applyTheme() {
        let themeToApply = currentTheme;
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');

        if (themeToApply === 'system') {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            themeToApply = prefersDark ? 'dark' : 'light';
        }

        console.log("DEBUG: Applying theme:", themeToApply);
        document.body.classList.remove('light-mode', 'dark-mode');

        if (themeToApply === 'light') {
            document.body.classList.add('light-mode');
            if (themeColorMeta) themeColorMeta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--lm-bg').trim() || '#FFF0F5'); // 라이트 모드 배경색
        } else {
            document.body.classList.add('dark-mode');
            if (themeColorMeta) themeColorMeta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg-dark').trim() || '#1E1E48'); // 다크 모드 배경색
        }
        // Update chart colors if chart exists
        if (chartInstance) {
            // Force chart redraw which should pick up new CSS variable colors
            renderChart(); // Re-rendering might be necessary if colors don't update automatically
        }
        // Re-render chart selector to update button colors for new theme
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
            theme: currentTheme, // *** 수정 4: 테마 설정 저장 ***
            initialSetupDone: isInitialSetupDone,
            selectedMetrics: selectedMetrics,
            notificationEnabled: notificationEnabled,
            biologicalSex: biologicalSex
        };
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            console.log("DEBUG: Settings saved", settings);
        } catch (e) {
            console.error("Error saving settings:", e);
            showPopup('savingError');
        }
    }

    function loadSettingsFromStorage() {
        try {
            const storedSettings = localStorage.getItem(SETTINGS_KEY);
            if (storedSettings) {
                const settings = JSON.parse(storedSettings);
                currentLanguage = settings.language || 'ko';
                currentMode = settings.mode || 'mtf';
                currentTheme = settings.theme || 'system'; // *** 수정 4: 테마 설정 로드 ***
                isInitialSetupDone = settings.initialSetupDone || false;
                selectedMetrics = Array.isArray(settings.selectedMetrics) ? settings.selectedMetrics : ['weight'];
                notificationEnabled = settings.notificationEnabled || false;
                biologicalSex = settings.biologicalSex || 'male';
                console.log("DEBUG: Settings loaded", settings);
            } else {
                console.log("DEBUG: No settings found, using defaults.");
                currentLanguage = navigator.language.startsWith('ko') ? 'ko' : navigator.language.startsWith('ja') ? 'ja' : 'en';
                currentMode = 'mtf';
                currentTheme = 'system'; // *** 수정 4: 기본 테마 설정 ***
                isInitialSetupDone = false;
                selectedMetrics = ['weight'];
                notificationEnabled = false;
                biologicalSex = 'male';
            }
            // Update UI elements after loading settings
            if (languageSelect) languageSelect.value = currentLanguage;
            if (modeSelect) modeSelect.value = currentMode;
            if (themeSelect) themeSelect.value = currentTheme; // *** 수정 4: 테마 드롭다운 업데이트 ***
            if (notificationToggle) notificationToggle.checked = notificationEnabled;
            if (sexSelect) sexSelect.value = biologicalSex;
        } catch (e) {
            console.error("Error loading settings:", e);
            showPopup('loadingError');
            // Fallback to defaults
            currentLanguage = 'ko';
            currentMode = 'mtf';
            currentTheme = 'system';
            notificationEnabled = false;
            isInitialSetupDone = false;
            selectedMetrics = ['weight'];
            biologicalSex = 'male';
        }
    }

    function savePrimaryDataToStorage() {
        const dataToSave = {
            measurements: measurements,
            targets: targets,
            notes: notes
        };
        try {
            localStorage.setItem(PRIMARY_DATA_KEY, JSON.stringify(dataToSave));
            console.log("DEBUG: Primary data saved.");
        } catch (e) {
            console.error("Error saving primary data:", e);
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


    // --- Initial Setup Popup Logic ---
    function showInitialSetupPopup() {
        if (!initialSetupPopup || !initialLanguageSelect || !initialModeSelect || !initialSetupSaveBtn) {
            console.error("DEBUG: Initial setup popup elements missing!"); return;
        }
        console.log("DEBUG: Showing initial setup popup.");
        initialLanguageSelect.value = currentLanguage;
        initialModeSelect.value = currentMode;

        // Translate popup content
        try {
            initialSetupPopup.querySelector('h2')?.setAttribute('data-lang-key', 'initialSetupTitle');
            initialSetupPopup.querySelector('p')?.setAttribute('data-lang-key', 'initialSetupDesc');
            initialSetupPopup.querySelector('label[for="initial-language-select"]')?.setAttribute('data-lang-key', 'language');
            initialSetupPopup.querySelector('label[for="initial-mode-select"]')?.setAttribute('data-lang-key', 'mode');
            initialSetupPopup.querySelector('#initial-setup-save')?.setAttribute('data-lang-key', 'saveSettings');
            translateUI(); // Translate the whole UI temporarily to get popup text
        } catch (e) { console.error("Error translating initial setup popup:", e); }

        initialSetupPopup.style.display = 'flex';
    }

    function hideInitialSetupPopup() {
        if (!initialSetupPopup) return;
        initialSetupPopup.style.display = 'none';
        console.log("DEBUG: Hiding initial setup popup.");
    }

    function handleInitialSetupSave() {
        if (!initialLanguageSelect || !initialModeSelect || !initialSexSelect) {
            console.error("Initial setup select elements missing during save."); return;
        }
        currentLanguage = initialLanguageSelect.value;
        currentMode = initialModeSelect.value;
        biologicalSex = initialSexSelect.value;
        isInitialSetupDone = true;
        console.log("DEBUG: Initial setup saved.", { lang: currentLanguage, mode: currentMode });

        saveSettingsToStorage(); // Save basic settings (lang, mode, setupDone)
        hideInitialSetupPopup();
        applyModeToUI();
        applyLanguageToUI(); // This triggers translateUI
        loadPrimaryDataFromStorage(); // Load data AFTER setup complete
        applyTheme(); // Apply theme AFTER settings are saved/loaded
        renderAll();
        showPopup('popupSettingsSaved');

        const firstTabButton = tabBar ? tabBar.querySelector('.tab-button') : null;
        if (firstTabButton) { activateTab(firstTabButton.dataset.tab); }
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
        if (!formTitle) return;
        let week = 0;
        const editIndexVal = editIndexInput.value;
        if (editIndexVal !== '' && !isNaN(editIndexVal)) { // 수정 모드
            const index = parseInt(editIndexVal, 10);
            // 수정하는 기록의 'week' 속성을 사용하고, 없다면 인덱스 자체를 폴백으로 사용
            if (index >= 0 && index < measurements.length) {
                week = measurements[index].week ?? index;
            }
        } else { // 새 기록 모드
            // 새 기록의 주차는 현재 기록의 총 개수와 같음 (0부터 시작)
            week = measurements.length;
        }
        const titleKey = editIndexVal === '' ? 'formTitleNew' : 'formTitleEdit';
        formTitle.innerHTML = translate(titleKey, { week: week });
    }

    function renderNextMeasurementInfo() {
        if (!nextMeasurementInfoDiv) return;

        // 데이터가 없으면 초기 문구 표시
        if (!measurements || measurements.length === 0) {
            nextMeasurementInfoDiv.innerHTML = `<p>${translate('nextMeasurementInfoNoData')}</p>`;
            return;
        }

        try {
            // 안전한 데이터 추출 및 정렬
            // 원본 데이터를 손상시키지 않기 위해 복사본 사용
            const validData = measurements
                .map(m => ({ m, baseDate: getMeasurementBaseDate(m) }))
                .filter(item => item.baseDate && !isNaN(item.baseDate.getTime()));

            if (validData.length === 0) {
                nextMeasurementInfoDiv.innerHTML = `<p>${translate('nextMeasurementInfoNoData')}</p>`;
                return;
            }

            const sortedMeasurements = validData
                .sort((a, b) => a.baseDate.getTime() - b.baseDate.getTime());

            const lastItem = sortedMeasurements[sortedMeasurements.length - 1];
            const lastBaseDate = lastItem.baseDate;

            const todayBase = new Date();
            todayBase.setHours(0, 0, 0, 0);
            const todayIndex = toLocalDayIndex(todayBase);
            const lastIndex = toLocalDayIndex(lastBaseDate);
            if (todayIndex === null || lastIndex === null) {
                nextMeasurementInfoDiv.innerHTML = `<p>${translate('nextMeasurementInfoNoData')}</p>`;
                return;
            }

            const nextIndex = lastIndex + 7;
            const nextMeasurementDate = localDayIndexToDate(nextIndex) || new Date(lastBaseDate.getFullYear(), lastBaseDate.getMonth(), lastBaseDate.getDate() + 7);
            const daysAgo = Math.max(0, todayIndex - lastIndex);
            const daysUntil = nextIndex - todayIndex;

            let messageKey = 'nextMeasurementInfo';
            let params = {
                lastDate: formatTimestamp(lastBaseDate),
                daysAgo: daysAgo,
                nextDate: formatTimestamp(nextMeasurementDate),
                daysUntil: Math.abs(daysUntil)
            };

            if (daysUntil < 0) {
                messageKey = 'nextMeasurementInfoOverdue';
                params.daysOverdue = Math.abs(daysUntil);
            } else if (daysUntil === 0) {
                messageKey = 'nextMeasurementInfoToday';
            }

            nextMeasurementInfoDiv.innerHTML = `<p>${translate(messageKey, params)}</p>`;

        } catch (e) {
            console.error("Rendering Info Critical Error:", e);
            // 오류가 발생해도 사용자에게는 최소한의 정보 표시 후 종료 (앱 멈춤 방지)
            nextMeasurementInfoDiv.innerHTML = `<p>${translate('nextMeasurementInfoNoData')}</p>`;
        }
    }


    function getFilteredDisplayKeys() {
        let keys = [...displayKeysInOrder];
        if (currentMode === 'mtf') {
            // medicationKeys_FtM에 'antiEstrogen'이 추가되었으므로 이 로직은 자동으로 처리됩니다.
            keys = keys.filter(k => !medicationKeys_FtM.includes(k));
        } else if (currentMode === 'ftm') {
            // 'cupSize'와 'semen' 관련 필터링 부분만 수정합니다.
            keys = keys.filter(k => !medicationKeys_MtF.includes(k) && !k.startsWith('semen'));
        }
        return keys;
    }

    function getFilteredNumericKeys() {
        let keys = [...baseNumericKeys];
        if (currentMode === 'mtf') {
            keys = keys.filter(k => !medicationKeys_FtM.includes(k));
        } else if (currentMode === 'ftm') {
            keys = keys.filter(k => !medicationKeys_MtF.includes(k) && k !== 'semenScore');
        }
        return keys;
    }

    function getFilteredChartKeys() {
        let keys = [...chartSelectableKeys];
        if (currentMode === 'mtf') {
            keys = keys.filter(k => !medicationKeys_FtM.includes(k));
        } else if (currentMode === 'ftm') {
            keys = keys.filter(k => !medicationKeys_MtF.includes(k));
        }
        return keys;
    }

    const legacyKeysToHideInTables = new Set([
        'skinCondition',
        'healthScore',
        'healthNotes',
        'estradiol',
        'progesterone',
        'antiAndrogen',
        'testosterone',
        'antiEstrogen'
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
            let filteredHeaderKeys = currentDisplayKeys;
            if (activeHistoryFilters.length > 0) {
                // '주차'와 '날짜'는 항상 표시하고, 선택된 필터 항목을 추가
                filteredHeaderKeys = currentDisplayKeys.filter(key =>
                    ['week', 'date', 'symptoms', 'medications', 'memo'].includes(key) || activeHistoryFilters.includes(key)
                );
            }

            if (!filteredHeaderKeys.includes('symptoms')) {
                const memoIndex = filteredHeaderKeys.indexOf('memo');
                const insertAt = memoIndex >= 0 ? memoIndex : filteredHeaderKeys.length;
                filteredHeaderKeys.splice(insertAt, 0, 'symptoms');
            }
            if (!filteredHeaderKeys.includes('medications')) {
                const memoIndex = filteredHeaderKeys.indexOf('memo');
                const insertAt = memoIndex >= 0 ? memoIndex : filteredHeaderKeys.length;
                filteredHeaderKeys.splice(insertAt, 0, 'medications');
            }

            let tableHTML = '<table class="history-table"><thead><tr>';
            filteredHeaderKeys.forEach(key => {
                if (key === 'timestamp') return;
                const labelData = translate(key).match(/^(.*?) *(\((.*?)\))?$/);
                const labelText = labelData ? labelData[1].trim() : translate(key);
                const unitText = labelData && labelData[3] ? `<span class="unit">(${labelData[3]})</span>` : '';
                const thClass = (key === 'symptoms') ? 'col-symptoms' : (key === 'medications') ? 'col-medications' : '';
                tableHTML += `<th class="${thClass}">${labelText}${unitText}</th>`;
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
                    else if (key === 'symptoms') {
                        value = formatSymptomsCell(m.symptoms);
                        tableHTML += `<td class="wrap-cell col-symptoms">${value}</td>`;
                        return;
                    }
                    else if (key === 'medications') {
                        value = formatMedicationsCell(m.medications);
                        tableHTML += `<td class="wrap-cell col-medications">${value}</td>`;
                        return;
                    }
                    else if (key === 'menstruationActive') {
                        value = m.menstruationActive === true ? '✓' : '-';
                    }
                    else { value = formatValue(m[key], key); }
                    tableHTML += `<td>${value}</td>`;
                });
                tableHTML += `<td class="sticky-col action-col"><div class="action-buttons">`;
                tableHTML += `<button class="glass-button btn-edit" data-index="${i}">${translate('edit')}</button>`;
                tableHTML += `<button class="glass-button danger btn-delete" data-index="${i}">${translate('delete')}</button>`;
                tableHTML += `</div></td>`;
                tableHTML += '</tr>';
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
            if (currentMode === 'ftm') return !medicationKeys_MtF.includes(key) && key !== 'cupSize' && !key.startsWith('semen');
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
                                    else if (bodySizeKeys.includes(originalKey) && originalKey !== 'cupSize') displayUnit = translate('unitCm');
                                    else if (medicationKeys_MtF.includes(originalKey) || medicationKeys_FtM.includes(originalKey)) displayUnit = translate('unitMg');
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


    // --- Notes (Keeps) Tab ---
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
                else if (bodySizeKeys.includes(key) && key !== 'cupSize') placeholderUnit = translate('unitCm');
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
                    else if (bodySizeKeys.includes(key) && key !== 'cupSize') placeholderUnit = translate('unitCm');
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
            const formKey = (key === 'memo') ? 'record-keeps' : key;
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
            const fullMeasurementData = {};
            [...baseNumericKeys, ...textKeys, 'symptoms', 'medications', 'date', 'week', 'timestamp'].forEach(key => {
                fullMeasurementData[key] = saved.data.hasOwnProperty(key) ? saved.data[key] : null;
            });
            measurements.push(fullMeasurementData);
            showPopup('popupSaveSuccess');
            activateTab('tab-sv');
            measurements.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            calculateAndAddWeekNumbers();
        }

        savePrimaryDataToStorage();
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
            // *** 수정 1 확인: HTML name과 JS key가 일치하므로 정상 작동 예상 ***

            const memoTextarea = form.querySelector('[name="record-keeps"]');
            if (memoTextarea) {
                memoTextarea.value = measurementToEdit.memo || '';
            }

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
        
        // 증상 선택기 리셋
        if (window.symptomSelector) {
            try {
                window.symptomSelector.reset();
            } catch (error) {
                console.error('Error resetting symptom selector:', error);
            }
        }

        const lastMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;
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
    }

    function updatePlaceholders() {
        if (!form) return;

        const lastMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;

        form.querySelectorAll('input[type="number"], input[type="text"], textarea').forEach(input => {
            const key = input.name;
            if (!key) return; // 이름 없는 input은 건너뛰기

            let placeholderText = '';

            // Keeps 통합 textarea는 별도 처리
            if (key === 'record-keeps') {
                placeholderText = translate('recordKeepsPlaceholder');
                input.placeholder = placeholderText;
                return;
            }

            const lastValue = lastMeasurement ? lastMeasurement[key] : null;

            if (lastValue !== null && lastValue !== undefined && lastValue !== '') {
                placeholderText = translate('placeholderPrevious', { value: formatValue(lastValue, key) });
            } else {
                if (key === 'estrogenLevel' || key === 'testosteroneLevel') {
                    placeholderText = translate('valuePlaceholder');
                } else {
                    const unit = translate(key).match(/\((.*?)\)/)?.[1] || '';
                    placeholderText = unit;
                }
            }
            input.placeholder = placeholderText;
        });
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
        tabButtons.forEach(button => button.classList.remove('active'));

        // 2. 타겟 버튼에 active 클래스 추가
        targetButton.classList.add('active');

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
        } else if (targetTabId === 'tab-my') {
            setupTargetInputs();
            renderMyHistoryView();
        }

        // 5. (핵심) 탭 버튼을 클릭했으므로, 확장된 탭 바를 축소시킵니다.
        if (tabBar.classList.contains('tab-bar-expanded')) {
            tabBar.classList.remove('tab-bar-expanded');
        }
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
        if (isIOS()) { bodyElement.classList.add('ios-device'); }

        if (!isInitialSetupDone) {
            showInitialSetupPopup();
            console.log("DEBUG: Initial setup required.");
        } else {
            console.log("DEBUG: Initial setup already done.");
            applyModeToUI();
            applyLanguageToUI();
            loadPrimaryDataFromStorage();
            checkAndRequestNotification(); // <--- 이 줄을 추가하세요.
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
        // Tab Bar
        tabBar.addEventListener('click', (e) => {
            const button = e.target.closest('.tab-button');
            const isTouchDevice = !window.matchMedia('(hover: hover)').matches;

            // --- 1. 데스크톱(마우스 사용) 환경의 경우 ---
            if (!isTouchDevice) {
                // 마우스 환경에서는 버튼을 클릭하면 항상 바로 탭 이동
                if (button) {
                    activateTab(button.dataset.tab);
                }
                return; // 배경 클릭은 아무것도 하지 않음
            }

            // --- 2. 터치스크린 환경의 경우 ---
            const isExpanded = tabBar.classList.contains('tab-bar-expanded');

            if (isExpanded) {
                // **[동작 B] 이미 확장된 상태일 때**
                if (button) {
                    // (핵심) 버튼을 클릭하면 탭 이동 및 축소
                    activateTab(button.dataset.tab);
                } else {
                    // 버튼이 아닌 배경을 클릭하면 그냥 축소만 함
                    tabBar.classList.remove('tab-bar-expanded');
                }
            } else {
                // **[동작 A] 축소된 상태일 때**
                // 버튼이든 배경이든, 어떤 곳을 클릭해도 확장만 함
                tabBar.classList.add('tab-bar-expanded');
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
                const likeBtn = e.target.closest('.keeps-like-btn');
                const index = parseInt(editBtn?.dataset.index || deleteBtn?.dataset.index || likeBtn?.dataset.index, 10);

                if (isNaN(index)) return;

                // '좋아요' 버튼 클릭 시 처리 로직
                if (likeBtn) {
                    if (index >= 0 && index < measurements.length) {
                        measurements[index].memoLiked = !measurements[index].memoLiked;
                        savePrimaryDataToStorage();
                        likeBtn.classList.toggle('liked', measurements[index].memoLiked);
                    }
                    return; // 좋아요 처리 후 함수 종료
                }

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

        // 👇👇👇 이 부분을 추가하거나, 기존 코드를 이 코드로 교체해주세요. 👇👇👇
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
                    pushHistoryState('modal-action-guide');
                    import('./src/ui/action-guide-modal.js').then(module => {
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
        if (svCardTargets) {
            svCardTargets.classList.add('sv-card--clickable'); // 이 줄을 추가하세요
            svCardTargets.addEventListener('click', () => {
                // ... (기존 코드 생략)
            });
        }

        if (svCardKeeps) {
            svCardKeeps.classList.add('sv-card--clickable'); // 이 줄을 추가하세요
            svCardKeeps.addEventListener('click', () => {
                // ... (기존 코드 생략)
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
                    import('./src/ui/change-roadmap-modal.js').then(module => {
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

        if (svCardKeeps) {
            svCardKeeps.addEventListener('click', () => {
                const title = translate('svcard_title_keeps');

                // 모달의 상태를 관리할 변수
                let currentSortOrder = 'newest'; // 'newest' 또는 'oldest'
                let showFavoritesOnly = false;   // true 또는 false

                // 모달의 기본 HTML 구조 (컨트롤 영역 + 리스트 영역)
                const initialContent = `
            <div class="keeps-modal-controls">
                <!-- JS가 컨트롤 버튼들을 여기에 렌더링합니다 -->
            </div>
            <div class="keeps-list">
                <!-- JS가 메모 목록을 여기에 렌더링합니다 -->
            </div>
        `;

                openModal(title, initialContent);

                // 메모 목록과 컨트롤 UI를 렌더링하는 함수
                const renderKeepsList = () => {
                    const controlsContainer = modalContent.querySelector('.keeps-modal-controls');
                    const listContainer = modalContent.querySelector('.keeps-list');
                    if (!controlsContainer || !listContainer) return;

                    // 1. 컨트롤 버튼 HTML 생성
                    controlsContainer.innerHTML = `
                <div class="sort-controls">
                    <button class="control-btn ${currentSortOrder === 'newest' ? 'active' : ''}" data-action="sort" data-value="newest">${translate('sortNewest')}</button>
                    <button class="control-btn ${currentSortOrder === 'oldest' ? 'active' : ''}" data-action="sort" data-value="oldest">${translate('sortOldest')}</button>
                </div>
                <div class="filter-controls">
                    <button class="control-btn-icon ${showFavoritesOnly ? 'active' : ''}" data-action="filter-favorites" title="좋아요만 보기">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                            <path class="heart-outline" d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.05.05-.05-.05C7.32 14.43 4 11.72 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 3.22-3.32 5.93-8.1 10.05z"></path>
                            <path class="heart-fill" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
                        </svg>
                    </button>
                </div>
            `;

                    // 2. 데이터 필터링 및 정렬
                    let memos = measurements
                        .map((m, index) => ({ ...m, originalIndex: index }))
                        .filter(m => m.memo && m.memo.trim() !== '');

                    if (showFavoritesOnly) {
                        memos = memos.filter(m => m.memoLiked === true);
                    }

                    memos.sort((a, b) => {
                        return currentSortOrder === 'newest' ?
                            (b.timestamp || 0) - (a.timestamp || 0) :
                            (a.timestamp || 0) - (b.timestamp || 0);
                    });

                    // 3. 목록 HTML 생성
                    if (memos.length === 0) {
                        listContainer.innerHTML = `<p class="placeholder">${translate('svcard_no_keeps_add_prompt')}</p>`;
                    } else {
                        listContainer.innerHTML = memos.map(memoEntry => {
                            const isLiked = memoEntry.memoLiked ? 'liked' : '';
                            return `
                        <div class="keeps-list-item glass-section">
                            <div class="keeps-header">
                                <div class="keeps-header-left">
                                    <span class="keeps-week">${translate('week')} ${memoEntry.week}</span>
                                    <button class="keeps-like-btn ${isLiked}" data-index="${memoEntry.originalIndex}" title="좋아요">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                                            <path class="heart-outline" d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.05.05-.05-.05C7.32 14.43 4 11.72 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 3.22-3.32 5.93-8.1 10.05z"></path>
                                            <path class="heart-fill" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
                                        </svg>
                                    </button>
                                </div>
                                <span class="keeps-date">${formatTimestamp(memoEntry.timestamp)}</span>
                            </div>
                            <p class="keeps-text">${escapeHTML(memoEntry.memo).replace(/\n/g, '<br>')}</p>
                            <div class="keeps-actions">
                                <button class="glass-button btn-edit" data-index="${memoEntry.originalIndex}">${translate('edit')}</button>
                                <button class="glass-button danger btn-delete" data-index="${memoEntry.originalIndex}">${translate('delete')}</button>
                            </div>
                        </div>
                    `;
                        }).join('');
                    }
                };

                // 모달 내부의 클릭 이벤트를 처리하는 핸들러 (정렬, 필터)
                const handleModalInteraction = (e) => {
                    const button = e.target.closest('button');
                    if (!button) return;

                    const action = button.dataset.action;
                    if (action === 'sort') {
                        currentSortOrder = button.dataset.value;
                        renderKeepsList(); // 정렬 순서 변경 후 다시 렌더링
                    } else if (action === 'filter-favorites') {
                        showFavoritesOnly = !showFavoritesOnly;
                        renderKeepsList(); // 필터 상태 변경 후 다시 렌더링
                    }
                };

                // 이벤트 리스너 연결 (정렬, 필터 버튼에만)
                const controlsContainer = modalContent.querySelector('.keeps-modal-controls');
                if (controlsContainer) {
                    controlsContainer.addEventListener('click', handleModalInteraction);
                }

                // 초기 렌더링 실행
                renderKeepsList();
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
                console.log('✅ Symptom Selector initialized');
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
                console.log('✅ Medication Selector initialized');
            }).catch(error => {
                console.error('Failed to load Medication Selector:', error);
            });
        } catch (error) {
            console.error('Error initializing Medication Selector:', error);
        }

        // Buttons
        if (cancelEditBtn) cancelEditBtn.addEventListener('click', cancelEdit);
        if (resetDataButton) resetDataButton.addEventListener('click', handleResetData);
        if (checkForUpdatesButton) checkForUpdatesButton.addEventListener('click', handleCheckForUpdates);
        if (exportDataButton) exportDataButton.addEventListener('click', exportMeasurementData);
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
        setupCarouselControls('sv-card-keeps');
        setupCarouselDotControls('sv-card-highlights');
        setupCarouselDotControls('sv-card-guide');
        setupCarouselDotControls('sv-card-hormones');
        setupCarouselDotControls('sv-card-keeps');
        setupCarouselSwipeGuard('sv-card-highlights');
        setupCarouselSwipeGuard('sv-card-guide');
        setupCarouselSwipeGuard('sv-card-hormones');
        setupCarouselSwipeGuard('sv-card-keeps');


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
        let aModalWasClosed = false;

        // 모든 모달 오버레이를 확인합니다.
        const allModalOverlays = [
            document.getElementById('modal-bottom-sheet-overlay'),
            document.getElementById('hormone-modal-overlay')
        ];

        allModalOverlays.forEach(overlay => {
            if (overlay && overlay.classList.contains('visible')) {
                overlay.classList.remove('visible');
                aModalWasClosed = true;

                // 특정 모달에만 필요한 후처리 (예: 차트 파괴)
                if (overlay.id === 'hormone-modal-overlay') {
                    if (medicationChartInstance) {
                        medicationChartInstance.destroy();
                        medicationChartInstance = null;
                    }
                    if (hormoneChartInstance) {
                        hormoneChartInstance.destroy();
                        hormoneChartInstance = null;
                    }
                }
            }
        });

        if (aModalWasClosed) {
            document.body.classList.remove('modal-open');
        }

        return aModalWasClosed;
    }


    /* --- PWA Navigation & Back Button Logic (New) --- */

    /**
     * 히스토리 상태를 관리하는 함수입니다.
     * 앱의 주요 상태 변경(탭 이동, 모달 열기 등) 시 호출하세요.
     */
    function pushHistoryState(stateType, tabId = null) {
        // 중복 상태 방지를 위해 현재 state 확인
        const currentState = history.state;
        if (currentState && currentState.type === stateType && currentState.tab === tabId) {
            return;
        }
        history.pushState({ type: stateType, tab: tabId }, '', '');
    }

    // 1. 탭 변경 함수 수정 (기존 activateTab 함수 내부 상단에 추가)
    /* 기존 activateTab 함수 찾아서 앞부분에 추가하세요 */
    const _originalActivateTab = activateTab;
    activateTab = function (targetTabId) {
        // 탭 이동 시 히스토리 스택 추가
        // 단, popstate 이벤트에 의해 호출된 경우는 제외해야 함(무한루프 방지)가 정석이나
        // 간단 구현을 위해 여기서 pushState를 하고, popstate 핸들러에서 중복 처리를 제어
        const currentState = history.state;
        if (!currentState || currentState.tab !== targetTabId) {
            // 모달이 열려있다면 모달을 닫는 동작이 우선이므로 탭 이동 기록은 신중해야 함
            // 메인 탭이 아닌 다른 탭으로 갈 때 히스토리 추가
            if (targetTabId !== 'tab-sv') {
                pushHistoryState('tab', targetTabId);
            }
        }

        _originalActivateTab(targetTabId);

        // 만약 메인 탭('tab-sv')으로 돌아왔다면, 필요없는 히스토리를 정리하면 좋지만
        // 모바일 브라우저 특성상 사용자가 뒤로가기를 연타할 것을 대비해
        // 별도 처리 안 함.
    };

    // 2. 모달 열기 함수 수정 (openModal 내부 상단에 추가)
    const _originalOpenModal = openModal;
    openModal = function (title, contentHTML) {
        pushHistoryState('modal'); // 모달 상태 푸시
        _originalOpenModal(title, contentHTML);
    };

    // 2-1. 호르몬 모달 등 다른 모달 함수도 마찬가지
    const _originalOpenHormoneModal = openHormoneModal;
    openHormoneModal = function () {
        pushHistoryState('modal-hormone');
        _originalOpenHormoneModal();
    };

    // 3. 뒤로가기(PopState) 이벤트 핸들러 (기존 popstate 리스너 대체)
    window.removeEventListener('popstate', window.onpopstate); // 혹시 모를 중복 제거
    window.addEventListener('popstate', function (event) {

        console.log("DEBUG: Popstate triggered", event.state);

        // 1. 열려있는 모달이 있는지 확인 (최우선 순위)
        // closeAllModalsVisually 함수가 true를 반환하면 모달을 닫았다는 뜻
        if (closeAllModalsVisually()) {
            console.log("Back button: Closed a modal");
            return; // 모달만 닫고 종료
        }

        // 2. 탭 이동 처리
        // 현재 히스토리 상태가 있다면 그에 맞춰 이동, 없다면 메인으로
        if (event.state && event.state.type === 'tab') {
            // 무한 루프 방지를 위해 내부 함수 직접 호출 또는 플래그 사용
            // 여기서는 activateTab을 부르되, 내부에서 history.push를 안하도록 수정 필요하나
            // 단순하게 기존 탭 활성화 함수 호출 (사용성상 큰 문제 없음)
            _originalActivateTab(event.state.tab);
            return;
        }

        // 3. 상태가 없거나(초기 상태), 메인 탭이 아닌 경우 -> 메인 탭으로 이동
        const activeTab = document.querySelector('.tab-button.active')?.dataset.tab;
        if (activeTab && activeTab !== 'tab-sv') {
            console.log("Back button: Going to Home tab");
            _originalActivateTab('tab-sv');
            return;
        }

        // 4. 이미 메인 탭이고 모달도 없다면?
        // 여기서 앱을 종료시킬지, 계속 유지할지 결정.
        // PWA에서는 보통 여기서 종료되도록 두거나, 토스트 메시지("한번 더 누르면 종료")를 띄움.
        console.log("Back button: Exiting app flow");
    });

    /* [중요] 초기 로드 시 히스토리 상태 초기화 */
    // script.js 마지막 부분 Initialization 쪽에 추가
    history.replaceState({ type: 'tab', tab: 'tab-sv' }, '', '');

});
