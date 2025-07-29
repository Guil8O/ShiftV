// script.js for ShiftV App v1.4 (Modified based on request)
// Changes from v1.3:
// - Fixed measurement saving bug by ensuring HTML 'name' attributes match JS keys (requires HTML update).
// - Adjusted target achievement rate calculation to cap at 100%.
// - Added theme (dark/light/system) setting functionality.
// - Added CSS rule to potentially prevent pull-to-refresh (requires CSS update).
// - Added translation keys for theme settings.
// - Updated APP_VERSION to 1.4.

const APP_VERSION = "1.4"; // 버전 업데이트

// Global Error Handler
window.onerror = function (message, source, lineno, colno, error) {
    console.error("🚨 Global Error:", message, "\nFile:", source, `\nLine:${lineno}:${colno}`, "\nError Obj:", error);
    const errorMessage = typeof translate === 'function'
        ? translate('unexpectedError', { message: message })
        : `An unexpected error occurred 😢 Check console (F12).\nError: ${message}`;
    alert(errorMessage);
};

// --- Language Data (i18n) ---
const languages = {
    ko: {
        // General
        save: "저장", edit: "수정", delete: "삭제", cancel: "취소",
        saveRecord: "기록하기 ✨", cancelEdit: "수정 취소", saveTarget: "목표 저장! 💪",
        saveNote: "Keeps 저장 🖋️",
        saveSettings: "설정 저장", close: "닫기",
        confirm: "확인", selectAll: "전체 선택", deselectAll: "전체 해제",
        noDataYet: "첫 기록을 남겨볼까요?",
        noNotesYet: "첫 Keeps를 남겨보세요!",
        noTargetsYet: "설정된 목표가 없어요.", noDataForChart: "표시할 항목을 선택하거나 데이터를 입력하세요.",
        invalidValue: "유효하지 않은 값", loadingError: "데이터 로드 오류", savingError: "데이터 저장 오류",
        confirmReset: "정말로 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 측정 기록, 목표, Keeps가 영구적으로 삭제됩니다. 초기화 전에 데이터를 백업하는 것이 좋습니다.",
        confirmDeleteRecord: "주차 {week} ({date}) 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.", // Updated delete confirmation
        confirmDeleteNote: "Keeps '{title}'을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
        dataExported: "데이터가 파일로 저장되었습니다.", dataImported: "데이터를 성공적으로 불러왔습니다!",
        dataReset: "모든 데이터가 초기화되었습니다.", dataSaved: "저장 완료! 👍",
        noteSaved: "Keeps가 저장되었습니다.",
        targetsSaved: "목표가 저장되었습니다.", settingsSaved: "설정이 저장되었습니다.",
        importError: "파일을 불러오는 중 오류 발생:", importSuccessRequiresReload: "데이터를 성공적으로 불러왔습니다. 변경사항을 적용하려면 페이지를 새로고침해주세요.",
        unexpectedError: "예상치 못한 오류가 발생했습니다 😢 콘솔(F12)을 확인해주세요.\n오류: {message}",
        alertInitError: "앱 초기화 중 오류 발생!", alertListenerError: "이벤트 리스너 설정 오류!",
        popupSaveSuccess: "측정 기록 저장 완료! 🎉", popupUpdateSuccess: "측정 기록 수정 완료! ✨",
        popupDeleteSuccess: "측정 기록 삭제 완료 👍", popupTargetSaveSuccess: "목표 저장 완료! 👍",
        popupNoteSaveSuccess: "새 Keeps 저장 완료! 🎉", popupNoteUpdateSuccess: "Keeps 수정 완료! ✨",
        popupNoteDeleteSuccess: "Keeps 삭제 완료 👍", popupDataExportSuccess: "데이터 내보내기 성공! 🎉",
        popupDataImportSuccess: "데이터 가져오기 성공! ✨", popupDataResetSuccess: "모든 데이터가 초기화되었습니다. ✨",
        popupSettingsSaved: "설정 저장 완료! 👍",
        alertValidationError: "유효하지 않은 입력 값이 있습니다. 빨간색 표시 필드를 확인해주세요. 숫자 값은 0 이상이어야 합니다.",
        alertNoteContentMissing: "Keeps 제목이나 내용을 입력해주세요!",
        alertImportConfirm: "현재 데이터를 덮어쓰고 가져온 데이터로 복원하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
        alertImportInvalidFile: "파일 형식이 올바르지 않거나 호환되지 않는 데이터입니다.",
        alertImportReadError: "파일 읽기/처리 중 오류 발생.", alertImportFileReadError: "파일 읽기 실패.",
        alertGenericError: "오류가 발생했습니다.", alertDeleteError: "삭제 중 오류 발생.",
        alertLoadError: "데이터 로드 중 오류 발생. 데이터가 손상되었을 수 있습니다. 콘솔 확인.",
        alertSaveError: "로컬 스토리지 저장 실패.", alertExportError: "데이터 내보내기 중 오류 발생.",
        alertCannotFindRecordEdit: "수정할 기록 찾기 실패.", alertCannotFindRecordDelete: "삭제할 기록 찾기 실패.",
        alertInvalidIndex: "기록 처리 중 오류: 인덱스 오류.",
        alertCannotFindNoteEdit: "수정할 Keeps 찾기 실패.", alertCannotFindNoteDelete: "삭제할 Keeps 찾기 실패.",

        // Tabs
        tabMain: "메인",
        tabRecord: "기록하기",
        tabMy: "마이",
        tabSettings: "설정",
        myTitle: "마이 페이지 🧑‍🚀", // 임시 제목
        // ▼▼▼ 새 키 추가 ▼▼▼
        showHistoryButton: "기록 확인하기",
        showInputButton: "입력으로 돌아가기",
        recordKeepsLabel: "이번 주 Keeps 📝",
        recordKeepsPlaceholder: "오늘의 기분, 이벤트, 신체 변화 등을 자유롭게 기록해보세요...",
        memo: "Keeps",
        //SVcard
        svcard_shortcut_new: "새 마음으로<br><span class='countdown-days'>기록</span><br>해볼까요?",
        svcard_shortcut_dday: "'D-Day!'<br>새로운 기록을<br>측정해주세요",
        svcard_shortcut_overdue: "'측정이 {days}일 지났어요!'<br>새로운 기록을<br>측정해주세요",
        svcard_shortcut_countdown: "다음 측정일까지<br><span class='countdown-days'>{days}일</span><br>남았어요",
        // SV Card Titles & Content
        svcard_title_highlights: "✨ 하이라이트",
        svcard_title_targets: "🎯 목표 달성도",
        svcard_title_hormones: "💉 호르몬 분석",
        svcard_title_keeps: "📝 최근 Keeps",
        svcard_no_data_for_highlights: "변화를 비교하려면 데이터가 2개 이상 필요해요.",
        svcard_no_targets_set: "설정 탭에서 목표를 설정해주세요.",
        svcard_overall_progress: "전체 달성률",
        svcard_label_current: "현재: {value}",
        targetLabelShort: "(목표:{value})",
        // SV Card Titles & Content
        svcard_guide_default: "꾸준함이 <br>변화를 만들어요! ✨",
        svcard_guide_positive_short: "훌륭해요! <br>변화가 순조로워요.",
        svcard_guide_positive_long: "최근 3주간 목표를 향해 <br>꾸준히 나아가고 있어요!",
        svcard_guide_negative_short: "괜찮아요 <br>잠시 쉬어가는 주일 수도 있어요.",
        svcard_guide_negative_long: "괜찮아요 <br>다시 한번 해볼까요?",
        svcard_no_hormone_data: "호르몬 데이터가 부족해요.",
        svcard_hormone_prediction: "다음 주 예상 {hormone} 수치: <strong>{value}</strong>",
        notification_title: "ShiftV 측정 알림",
        notification_body: "마지막으로 기록한 지 일주일이 지났어요. 새로운 변화를 기록해볼까요?",
        notification_permission_denied: "알림 권한이 차단되었습니다. 브라우저 설정에서 허용해주세요.",
        notificationSettingsTitle: "알림 설정",
        notificationToggleLabel: "측정일 알림 받기",
        notificationSettingsDesc: "마지막 측정일로부터 7일이 지나면 알려드려요. 알림을 받으려면 브라우저의 권한 허용이 필요해요.",
        alertBrowserNotSupportNotification: "이 브라우저는 알림을 지원하지 않아요.",
        comparisonModalTitle: "측정 상세 분석",
        selectedWeekDataTitle: "{week}주차 상세 기록",

        medicationHistoryTitle: "투여량 변화",
        hormoneLevelHistoryTitle: "호르몬 수치 변화",
        hormoneAnalysisTitle: "최근 2주 분석",
        hormoneAnalysisAvgChange: "평균 변화량: {change}",
        hormoneAnalysisNextWeek: "다음 주 예상 수치: {value}",
        hormoneModalTitle: "호르몬 수치 분석",

        svcard_no_major_changes: "최근 주요 변화가 없어요.",
        svcard_change_vs_last_week: "지난 주 대비",
        svcard_title_weekly_guide: "주간 가이드",
        svcard_no_keeps_yet: "작성된 Keeps가 없어요.",
        svcard_no_keeps_add_prompt: "작성된 Keeps가 없어요. '기록하기' 탭에서 추가해보세요!",
        modalTabDetailedAnalysis: "상세 분석",
        modalTabComparativeAnalysis: "비교 분석",
        labelBase: "기준",
        labelCompareTarget: "비교 대상",
        svcard_hormone_weekly_change: "주간 변화량",

        //hormon
        hormoneAnalysisTitleChange: "수치 변화량 분석",
        hormoneAnalysisTitleInfluence: "약물 영향력 분석",
        hormoneAnalysisTitlePrediction: "미래 예측",
        weeklyChange: "주간 변화량",
        monthlyAvgChange: "월간 평균 변화량",
        totalChange: "총 변화량",
        totalChangeWithInitial: '총 변화량 (초기: {value})',
        drugInfluence: "mg당 영향",
        predictedNextWeek: "다음 주 예상",
        daysToTarget: "목표까지 예상",
        daysUnit: "{days}일",
        notEnoughData: "데이터 부족",
        dailyTSuppression: '일일 T 억제량',
        influenceAnalysisDesc: '이 정보는 실측 데이터에 기반한 예측치입니다. <br>수치에는 오차가 있을 수 있습니다.',

        // Input Tab
        formTitleNew: "측정 시작하기<br>현재 {week}주차", formTitleEdit: "측정 기록 수정 <br>{week}주차",
        inputDescription: "모든 항목은 선택 사항! 기록하고 싶은 것만 편하게 입력해주세요 😉",
        nextMeasurementInfoNoData: "마지막 측정일을 기준으로 다음 예정일을 계산해요.",
        nextMeasurementInfo: "마지막 측정: {lastDate} ({daysAgo}일 전) <br>다음 측정 추천일: {nextDate} ({daysUntil}일 후)",
        nextMeasurementInfoToday: "마지막 측정: {lastDate} ({daysAgo}일 전) <br>오늘은 측정하는 날!",
        nextMeasurementInfoOverdue: "마지막 측정: {lastDate} ({daysAgo}일 전) <br>측정이 {daysOverdue}일 지났어요!",
        daysAgo: "{count}일 전", daysUntil: "{count}일 후", today: "오늘",
        categoryBodySize: "신체 사이즈 📐", categoryHealth: "건강 💪", categoryMedication: "마법 ✨",
        // Measurement Labels (camelCase keys)
        week: '주차', date: '날짜', timestamp: '기록 시간',
        height: '신장 (cm)', weight: '체중 (kg)', shoulder: '어깨너비 (cm)', neck: '목둘레 (cm)',
        chest: '윗 가슴둘레 (cm)', cupSize: '아랫 가슴둘레 (cm)', waist: '허리둘레 (cm)', hips: '엉덩이둘레 (cm)',
        thigh: '허벅지둘레 (cm)', calf: '종아리둘레 (cm)', arm: '팔뚝둘레 (cm)',
        muscleMass: '근육량 (kg)', bodyFatPercentage: '체지방률 (%)', libido: '성욕 (회/주)',
        estrogenLevel: '에스트로겐 수치 (pg/ml)', testosteroneLevel: '테스토스테론 수치 (ng/ml)',
        healthStatus: '건강 상태', healthScore: '건강 점수', healthNotes: '건강 상세(텍스트)',
        skinCondition: '피부 상태',
        estradiol: '에스트라디올 (mg)', progesterone: '프로게스테론 (mg)',
        antiAndrogen: '항안드로겐 (mg)', testosterone: '테스토스테론 (mg)', antiEstrogen: '항에스트로겐 (mg)',
        medicationOtherName: '기타 마법 이름',
        medicationOtherDose: '기타 마법 용량 (mg)',
        medicationOtherNamePlaceholder: '(기타)',
        unitMgPlaceholder: 'mg',
        // Placeholders
        skinConditionPlaceholder: '예: 부드러워짐', libidoPlaceholder: '회/주',
        scorePlaceholder: "점수", notesPlaceholder: "특이사항",
        unitCm: "cm", unitKg: "kg", unitPercent: "%", unitMg: "mg", unitCountPerWeek: "회/주",
        placeholderPrevious: "이전: {value}",
        // History Tab
        historyTitle: "측정 기록 꼼꼼히 보기 🧐",
        historyDescription: "(표가 화면보다 넓으면 좌우로 스크롤해보세요!)",
        manageColumn: "관리",
        // Report Tab
        reportTitle: "나의 변화 리포트 📈",
        reportGraphTitle: "주차별 변화 그래프",
        reportGraphDesc: "보고 싶은 항목 버튼을 눌러 선택(활성)하거나 해제할 수 있어요. 여러 항목을 겹쳐 볼 수도 있답니다!",
        reportPrevWeekTitle: "지난주와 비교🤔",
        reportInitialTitle: "처음과 비교🌱",
        reportTargetTitle: "목표 달성률🎯",
        reportNeedTwoRecords: "데이터가 2개 이상 기록되어야 비교할 수 있어요.",
        reportNeedTarget: "먼저 '목표 설정' 탭에서 목표를 입력해주세요!",
        chartAxisLabel: "주차",
        comparisonItem: "항목", comparisonChange: "변화량", comparisonProgress: "달성률",
        targetAchieved: "달성 🎉",
        // Targets Tab
        targetTitle: "나만의 목표 설정 💖",
        targetDescription: "원하는 목표 수치를 입력해주세요. 메인 탭에서 달성률을 확인할 수 있어요.",
        targetItem: "항목", targetValue: "목표값",
        // Overview (Keeps) Tab
        overviewTitle: "Keeps 📝",
        noteNewTitle: "새 Keeps 작성", noteEditTitle: "Keeps 수정",
        noteTitleLabel: "제목", noteTitlePlaceholder: "Keeps 제목 (선택)",
        noteContentLabel: "내용", noteContentPlaceholder: "이벤트, 몸 상태, 생각 등 자유롭게 Keeps에 기록해요!",
        noteListTitle: "작성된 Keeps 목록 ✨", noteTitleUntitled: "제목 없음",
        sortBy: "정렬:", sortNewest: "최신 순", sortOldest: "오래된 순",
        noteDateCreated: "작성:", noteDateUpdated: "(수정: {date})", notePreviewEmpty: "내용을 적어 보세요",
        // Settings Tab
        settingsTitle: "설정 ⚙️",
        languageSettingsTitle: "언어 설정", language: "언어",
        modeSettingsTitle: "모드 설정", modeSettingsDesc: "목표하는 신체 변화 방향을 선택해주세요.",
        mode: "모드", modeMtf: "여성화", modeFtm: "남성화",
        themeSettingsTitle: "테마 설정", theme: "테마", themeSystem: "기기 값 참조", themeLight: "라이트 모드", themeDark: "다크 모드",
        dataManagementTitle: "데이터 백업 & 복원",
        dataManagementDesc: "모든 기록(측정, 목표, Keeps)을 파일 하나로 저장하거나 복원할 수 있어요. 가끔 백업해두면 안심이에요! 😊",
        exportData: "파일 저장하기", importData: "파일 불러오기",
        warning: "주의!", importWarning: "복원하면 지금 앱에 있는 모든 데이터가 파일 내용으로 완전히 대체돼요!",
        resetDataTitle: "데이터 초기화",
        severeWarning: "정말정말 주의!", resetWarning: "😱 모든 데이터(측정, 목표, Keeps)가 영구적으로 삭제됩니다! 초기화 전에 꼭! 데이터를 파일로 백업해주세요.",
        resetDataButton: "모든 데이터 초기화",
        infoTitle: "정보", versionLabel: "버전:",
        privacyInfo: "이 앱은 오프라인 작동하며 모든 데이터는 앱에만 안전하게 저장됩니다! 😉",
        developerMessage: "이 작은 도구가 당신의 소중한 여정에 즐거움과 도움이 되기를 바라요!",
        dataUpdateAndResetTitle: "데이터 업데이트 및 초기화",
        checkForUpdatesButton: "업데이트 확인",
        popupUpdateComplete: "업데이트 완료! 앱을 다시 시작합니다.",
        popupUpdateFailed: "업데이트에 실패했습니다. 잠시 후 다시 시도해주세요.",
        popupAlreadyLatest: "이미 최신 버전이에요! ✨",
        popupOfflineForUpdate: "업데이트를 확인하려면 인터넷 연결이 필요해요.",
        resetWarning: "😱 데이터 초기화는 모든 기록(측정, 목표, Keeps)을 영구적으로 삭제합니다! 초기화 전에 꼭! 데이터를 파일로 백업해주세요.",
        // Initial Setup
        initialSetupTitle: "초기 설정",
        initialSetupDesc: "ShiftV 사용을 시작하기 전에 언어와 모드를 선택해주세요.",
        // Swipe feature
        swipeThresholdMet: "스와이프 감지: {direction}",
        labelInitial: "초기",
        labelPrev: "전주",
        labelCurrent: "현재",
        labelTarget: "목표",
        initialTargetSame: "초기/목표",
        prevCurrentSame: "전주/현재",
        graphClickPrompt: "그래프의 수치를 클릭하면 해당 주차의 상세정보가 표시됩니다.",
        biologicalSex: "생물학적 성별",
        sexSettingsTitle: "생물학적 성별 설정",
        sexSettingsDesc: "자연 호르몬 회복률 계산의 정확도를 높이기 위해 사용됩니다.",
        sexMale: "남성",
        sexFemale: "여성",
        sexOther: "기타/무성별"
    },
    en: {
        // General
        save: "Save", edit: "Edit", delete: "Delete", cancel: "Cancel",
        saveRecord: "Record ✨", cancelEdit: "Cancel Edit", saveTarget: "Save Targets! 💪",
        saveNote: "Save Keeps 🖋️", saveSettings: "Save Settings", close: "Close",
        confirm: "Confirm", selectAll: "Select All", deselectAll: "Deselect All",
        noDataYet: "Let's add the first record!", noNotesYet: "No Keeps written yet. Let's add the first Keeps!",
        noTargetsYet: "No targets set.", noDataForChart: "Select items to display or enter data.",
        invalidValue: "Invalid value", loadingError: "Data loading error", savingError: "Data saving error",
        confirmReset: "Are you absolutely sure you want to reset all data? This action cannot be undone and will permanently delete all measurement records, targets, and Keeps. It is highly recommended to back up your data before proceeding.",
        confirmDeleteRecord: "Delete record for Week {week} ({date})? This action cannot be undone.",
        confirmDeleteNote: "Delete Keeps \"{title}\"? This cannot be undone.",
        dataExported: "Data exported to file.", dataImported: "Data imported successfully!",
        dataReset: "All data has been reset.", dataSaved: "Saved! 👍",
        noteSaved: "Keeps saved.👍", targetsSaved: "Targets saved.👍", settingsSaved: "Settings saved.👍",
        importError: "Error importing file:", importSuccessRequiresReload: "Data imported successfully. Please reload the page to apply changes.",
        unexpectedError: "An unexpected error occurred 😢 Check console (F12).\nError: {message}",
        alertInitError: "Error during app initialization!", alertListenerError: "Error setting up event listeners!",
        popupSaveSuccess: "Measurement saved! 🎉", popupUpdateSuccess: "Measurement updated! ✨",
        popupDeleteSuccess: "Measurement deleted 👍", popupTargetSaveSuccess: "Targets saved! 👍",
        popupNoteSaveSuccess: "New Keeps saved! 🎉", popupNoteUpdateSuccess: "Keeps updated! ✨",
        popupNoteDeleteSuccess: "Keeps deleted 👍", popupDataExportSuccess: "Data export successful! 🎉",
        popupDataImportSuccess: "Data import successful! ✨", popupDataResetSuccess: "All data has been reset. ✨",
        popupSettingsSaved: "Settings saved!",
        alertValidationError: "Invalid input value(s). Check red fields. Numbers must be 0 or greater.",
        alertNoteContentMissing: "Please enter Keeps title or content!",
        alertImportConfirm: "Overwrite current data and restore from file? This cannot be undone.",
        alertImportInvalidFile: "Invalid file format or incompatible data.",
        alertImportReadError: "Error reading/processing file.", alertImportFileReadError: "Failed to read file.",
        alertGenericError: "An error occurred.", alertDeleteError: "Error during deletion.",
        alertLoadError: "Error loading data. Data might be corrupt. Check console.",
        alertSaveError: "Failed to save data.", alertExportError: "Error exporting data.",
        alertCannotFindRecordEdit: "Cannot find record to edit.", alertCannotFindRecordDelete: "Cannot find record to delete.",
        alertInvalidIndex: "Error processing record: Invalid index.",
        alertCannotFindNoteEdit: "Cannot find Keeps to edit.", alertCannotFindNoteDelete: "Cannot find Keeps to delete.",
        // Tabs
        tabMain: "Main",
        tabRecord: "Record",
        tabMy: "My",
        tabSettings: "Settings",
        myTitle: "My Page 🧑‍🚀", // Temporary title
        showHistoryButton: "View History",
        showInputButton: "Back to Input",
        recordKeepsLabel: "This Week's Keeps 📝",
        recordKeepsPlaceholder: "Freely write down your mood, events, body changes, etc.",
        memo: "Keeps",
        //SVcard
        svcard_title_highlights: "✨Highlights",
        svcard_title_targets: "🎯 Target Progress",
        svcard_title_hormones: "💉 Hormone Analysis",
        svcard_title_keeps: "📝 Recent Keeps",
        svcard_no_data_for_highlights: "Need at least 2 records to compare changes.",
        svcard_no_targets_set: "Set your goals in the Settings tab.",
        svcard_overall_progress: "Overall Progress",

        svcard_shortcut_new: "Ready for a<br><span class='countdown-days'>New Start</span><br>Shall we record?",
        svcard_shortcut_dday: "'It's D-Day!'<br>Time to record<br>your new data",
        svcard_shortcut_overdue: "'{days} days overdue!'<br>Time to record<br>your new data",
        svcard_shortcut_countdown: "Next measurement in<br><span class='countdown-days'>{days} days</span><br>left",
        // SV Card Titles & Content
        svcard_guide_default: "Consistency creates change! ✨",
        svcard_guide_positive_short: "Great work! <br>Progress is smooth.",
        svcard_guide_positive_long: "You've been making steady <br>progress towards your goals!",
        svcard_guide_negative_short: "It's okay, <br>this might be a week to rest.",
        svcard_guide_negative_long: "It's okay, <br>you can start again!",
        svcard_no_hormone_data: "Not enough hormone data.",
        svcard_hormone_prediction: "Next week's predicted {hormone} level: <strong>{value}</strong>",
        notification_title: "ShiftV Measurement Reminder",
        notification_body: "It's been a week since your last record. Time to log your new changes!",
        notification_permission_denied: "Notification permission was denied. Please allow it in your browser settings.",
        notificationSettingsTitle: "Notification Settings",
        notificationToggleLabel: "Receive measurement reminders",
        notificationSettingsDesc: "Get notified 7 days after your last measurement. Browser permission is required.",
        alertBrowserNotSupportNotification: "This browser does not support notifications.",
        comparisonModalTitle: "Detailed Records Analysis",

        medicationHistoryTitle: "Medication Dosage History",
        hormoneLevelHistoryTitle: "Hormone Level History",
        hormoneAnalysisTitle: "Last 2 Weeks Analysis",
        hormoneAnalysisAvgChange: "Average Change: {change}",
        hormoneAnalysisNextWeek: "Predicted Next Week: {value}",
        hormoneModalTitle: "Hormone-Dose Analysis",
        selectedWeekDataTitle: "Week {week} Detailed Data",

        svcard_no_major_changes: "No major changes recently.",
        svcard_change_vs_last_week: "vs last week",
        svcard_title_weekly_guide: "Weekly Guide",
        svcard_no_keeps_yet: "No Keeps written yet.",
        svcard_no_keeps_add_prompt: "No Keeps written yet. Try adding one in the 'Record' tab!",
        modalTabDetailedAnalysis: "Detailed Analysis",
        modalTabComparativeAnalysis: "Comparative Analysis",
        labelBase: "Base",
        labelCompareTarget: "Compare Target",
        svcard_hormone_weekly_change: "Weekly Change",
        svcard_label_current: "Current: {value}",
        targetLabelShort: "(Target:{value})",

        //hormon
        hormoneAnalysisTitleChange: "Level Change Analysis",
        hormoneAnalysisTitleInfluence: "Medication Influence Analysis",
        hormoneAnalysisTitlePrediction: "Prediction",
        weeklyChange: "Weekly Change",
        monthlyAvgChange: "Monthly Avg. Change",
        totalChange: "Total Change",
        totalChangeWithInitial: 'Total Change (Initial: {value})',
        drugInfluence: "Influence/mg",
        predictedNextWeek: "Next Week's Forecast",
        daysToTarget: "Est. Days to Target",
        daysUnit: "{days} days",
        notEnoughData: "N/A",
        dailyTSuppression: 'Daily T Suppression',
        influenceAnalysisDesc: 'This is predictive data based on measurements. <br>Values may contain errors.',

        // Input Tab
        formTitleNew: "Start Measuring📏 <br>Current Week {week}", formTitleEdit: "Edit Measurement Record <br>Week {week}",
        inputDescription: "All fields are optional! Feel free to enter only what you want to track 😉",
        nextMeasurementInfoNoData: "Calculates the next recommended date based on the last measurement.",
        nextMeasurementInfo: "Last: {lastDate} ({daysAgo} ago) <br>Next recommended: {nextDate} ({daysUntil} away)",
        nextMeasurementInfoToday: "Last: {lastDate} ({daysAgo} ago) <br>Today is measurement day!",
        nextMeasurementInfoOverdue: "Last: {lastDate} ({daysAgo} ago) <br>Measurement is {daysOverdue} days overdue!",
        daysAgo: "{count} days ago", daysUntil: "{count} days left", today: "Today",
        categoryBodySize: "Body Size 📐", categoryHealth: "Health 💪", categoryMedication: "Magic ✨",
        // Measurement Labels
        week: 'Week', date: 'Date', timestamp: 'Timestamp',
        height: 'Height (cm)', weight: 'Weight (kg)', shoulder: 'Shoulder Width (cm)', neck: 'Neck Circum (cm)',
        chest: 'Upper Chest Circum (cm)', cupSize: 'Under Bust Circum (cm)', waist: 'Waist Circum (cm)', hips: 'Hip Circum (cm)',
        thigh: 'Thigh Circum (cm)', calf: 'Calf Circum (cm)', arm: 'Arm Circum (cm)',
        muscleMass: 'Muscle Mass (kg)', bodyFatPercentage: 'Body Fat (%)', libido: 'Libido (freq/wk)',
        estrogenLevel: 'Estrogen Level (pg/ml)', testosteroneLevel: 'Testosterone Level (ng/ml)',
        healthStatus: 'Health Status', healthScore: 'Health Score', healthNotes: 'Health Detail(text)',
        skinCondition: 'Skin Condition',
        estradiol: 'Estradiol (mg)', progesterone: 'Progesterone (mg)',
        antiAndrogen: 'Anti-androgen (mg)', testosterone: 'Testosterone (mg)', antiEstrogen: 'Anti-Estrogen (mg)',
        medicationOtherName: 'Other Magic Name',
        medicationOtherDose: 'Other Magic Dose (mg)',
        medicationOtherNamePlaceholder: '(Other)',
        unitMgPlaceholder: 'mg',
        // Placeholders
        skinConditionPlaceholder: 'e.g., Softer', libidoPlaceholder: 'freq/week',
        scorePlaceholder: "Score", notesPlaceholder: "Notes",
        unitCm: "cm", unitKg: "kg", unitPercent: "%", unitMg: "mg", unitCountPerWeek: "freq/wk",
        placeholderPrevious: "Prev: {value}",
        // History Tab
        historyTitle: "Measurement History 🧐",
        historyDescription: "(If the table is wider than the screen, scroll horizontally!)",
        manageColumn: "Manage",
        // Report Tab
        reportTitle: "My Change Report 📈", reportGraphTitle: "Weekly Change Graph",
        reportGraphDesc: "Select (activate) or deselect items by clicking the buttons. You can overlay multiple items!",
        reportPrevWeekTitle: "vs Last Week🤔", reportInitialTitle: "vs Beginning🌱",
        reportTargetTitle: "Target🎯",
        reportNeedTwoRecords: "At least two records are needed for comparison.", reportNeedTarget: "Please set your targets in the 'Targets' tab first!",
        chartAxisLabel: "Week", comparisonItem: "Item", comparisonChange: "Change", comparisonProgress: "Progress", targetAchieved: "Achieved 🎉",
        // Targets Tab
        targetTitle: "Set Your Personal Goals 💖",
        targetDescription: "Enter your desired target values. You can check the progress in the Main tab.",
        targetItem: "Item", targetValue: "Target Value",
        // Overview (Keeps) Tab
        overviewTitle: "Keeps 📝", noteNewTitle: "New Keeps", noteEditTitle: "Edit Keeps",
        noteTitleLabel: "Title", noteTitlePlaceholder: "Keeps title (optional)",
        noteContentLabel: "Content", noteContentPlaceholder: "Record anything - events, body changes, thoughts in Keeps!",
        noteListTitle: "Saved Keeps ✨", noteTitleUntitled: "Untitled",
        sortBy: "Sort by:", sortNewest: "Newest First", sortOldest: "Oldest First",
        noteDateCreated: "Created:", noteDateUpdated: "(Edited: {date})", notePreviewEmpty: "(No content)",
        // Settings Tab
        settingsTitle: "Settings ⚙️",
        languageSettingsTitle: "Language Settings", language: "Language",
        modeSettingsTitle: "Mode Settings", modeSettingsDesc: "Select the direction of physical changes you are aiming for.",
        mode: "Mode", modeMtf: "Feminization", modeFtm: "Masculinization",
        themeSettingsTitle: "Theme Settings", theme: "Theme", themeSystem: "Follow Device", themeLight: "Light Mode", themeDark: "Dark Mode",
        dataManagementTitle: "Data Backup & Restore",
        dataManagementDesc: "You can save all your records (measurements, targets, Keeps) to a single file or restore from one. Backing up occasionally gives peace of mind! 😊",
        exportData: "Export Data", importData: "Import Data",
        warning: "Warning!", importWarning: "Restoring will completely replace all data currently in your browser with the file's content!",
        resetDataTitle: "Reset Data",
        severeWarning: "Extreme Caution!", resetWarning: "😱 All data (measurements, targets, Keeps) will be permanently deleted! Please back up your data before proceeding.",
        resetDataButton: "Reset All Data",
        infoTitle: "Information", versionLabel: "Version:",
        privacyInfo: "This app works offline and all data is stored securely only in your browser! 😉",
        developerMessage: "Hope this little tool brings joy and help to your precious journey!",
        dataUpdateAndResetTitle: "Data Update & Reset",
        checkForUpdatesButton: "Check for Updates",
        popupUpdateComplete: "Update complete! The app will now restart.",
        popupUpdateFailed: "Update failed. Please try again later.",
        popupAlreadyLatest: "You are already on the latest version! ✨",
        popupOfflineForUpdate: "An internet connection is required to check for updates.",
        resetWarning: "😱 Resetting data will permanently delete all records (measurements, targets, Keeps)! Please back up your data before resetting.",
        // Initial Setup
        initialSetupTitle: "Initial Setup", initialSetupDesc: "Before starting ShiftV, please select your language and mode.",
        swipeThresholdMet: "Swipe detected: {direction}"
        ,
        labelInitial: "Initial",
        labelPrev: "Prev",
        labelCurrent: "Current",
        labelTarget: "Target",
        initialTargetSame: "Initial/Target",
        prevCurrentSame: "Prev/Current",
        graphClickPrompt: "Click a data point on the graph to view detailed records for that week.",
        biologicalSex: "Biological Sex",
        sexSettingsTitle: "Biological Sex Settings",
        sexSettingsDesc: "Used to improve the accuracy of natural hormone recovery calculations.",
        sexMale: "Male",
        sexFemale: "Female",
        sexOther: "Other"
    },
    ja: {
        // General
        save: "保存", edit: "編集", delete: "削除", cancel: "キャンセル",
        saveRecord: "記録する ✨", cancelEdit: "編集をキャンセル", saveTarget: "目標を保存! 💪",
        saveNote: "メモを保存 🖋️", saveSettings: "設定を保存", close: "閉じる",
        confirm: "確認", selectAll: "すべて選択", deselectAll: "すべて解除",
        noDataYet: "最初の記録を残しましょうか？", noNotesYet: "まだ作成されたメモがありません。最初のメモを残しましょうか？",
        noTargetsYet: "目標が設定されていません。", noDataForChart: "表示する項目を選択するか、データを入力してください。",
        invalidValue: "無効な値", loadingError: "データの読み込みエラー", savingError: "データの保存エラー",
        confirmReset: "本当にすべてのデータを初期化しますか？ この操作は元に戻すことができず、すべての測定記録、目標、メモが完全に削除されます。初期化する前にデータをバックアップすることを強くお勧めします。",
        confirmDeleteRecord: "週{week} ({date}) の記録を削除しますか？ この操作は元に戻せません。",
        confirmDeleteNote: "メモ「{title}」を削除しますか？ この操作は元に戻せません。",
        dataExported: "データがファイルに保存されました。", dataImported: "データが正常に読み込まれました！",
        dataReset: "すべてのデータが初期化されました。", dataSaved: "保存されました！",
        noteSaved: "メモが保存されました。", targetsSaved: "目標が保存されました。", settingsSaved: "設定が保存されました。",
        importError: "ファイルの読み込み中にエラーが発生しました:", importSuccessRequiresReload: "データが正常に読み込まれました。変更を適用するにはページを再読み込みしてください。",
        unexpectedError: "予期しないエラーが発生しました 😢 コンソール（F12）を確認してください。\nエラー: {message}",
        alertInitError: "アプリの初期化中にエラーが発生しました！", alertListenerError: "イベントリスナーの設定中にエラーが発生しました！",
        popupSaveSuccess: "測定記録 保存完了！🎉", popupUpdateSuccess: "測定記録 更新完了！✨",
        popupDeleteSuccess: "測定記録 削除完了 👍", popupTargetSaveSuccess: "目標 保存完了！👍",
        popupNoteSaveSuccess: "新規メモ 保存完了！🎉", popupNoteUpdateSuccess: "メモ 更新完了！✨",
        popupNoteDeleteSuccess: "メモ 削除完了 👍", popupDataExportSuccess: "データ エクスポート成功！🎉",
        popupDataImportSuccess: "データ インポート成功！✨", popupDataResetSuccess: "全データ リセット完了。 ✨",
        popupSettingsSaved: "設定 保存完了！",
        alertValidationError: "無効な入力値あり。赤色箇所を確認。数値は0以上必須。",
        alertNoteContentMissing: "メモのタイトルか内容を入力してください！",
        alertImportConfirm: "現在のデータを上書きしファイルから復元しますか？元に戻せません。",
        alertImportInvalidFile: "ファイル形式が無効か互換性がありません",
        alertImportReadError: "ファイル読込/処理エラー", alertImportFileReadError: "ファイル読込失敗",
        alertGenericError: "エラー発生", alertDeleteError: "削除中エラー",
        alertLoadError: "データ読込エラー。データ破損の可能性あり。コンソール確認",
        alertSaveError: "保存失敗", alertExportError: "エクスポート中エラー",
        alertCannotFindRecordEdit: "編集対象記録なし", alertCannotFindRecordDelete: "削除対象記録なし",
        alertInvalidIndex: "記録処理エラー：インデックス無効",
        alertCannotFindNoteEdit: "編集対象メモなし", alertCannotFindNoteDelete: "削除対象メモなし",
        // Tabs
        tabMain: "メイン",
        tabRecord: "記録する",
        tabMy: "マイページ",
        tabSettings: "設定",
        myTitle: "マイページ 🧑‍🚀", // 仮タイトル
        //SVcard
        svcard_shortcut_new: "新たな気持ちで<br><span class='countdown-days'>記録</span><br>しませんか？",
        svcard_shortcut_dday: "「測定日です！」<br>新しい記録を<br>測定しましょう",
        svcard_shortcut_overdue: "「測定が{days}日遅れています！」<br>新しい記録を<br>測定しましょう",
        svcard_shortcut_countdown: "次の測定まで<br><span class='countdown-days'>{days}日</span><br>です",

        svcard_title_highlights: "✨ ハイライト",
        svcard_title_targets: "🎯 目標達成度",
        svcard_title_hormones: "💉 ホルモン分析",
        svcard_title_keeps: "📝 最近のメモ",
        svcard_no_data_for_highlights: "比較するには記録が2つ以上必要です。",
        svcard_no_targets_set: "設定タブで目標を設定してください。",
        svcard_overall_progress: "全体達成率",

        svcard_no_major_changes: "最近、主な変化はありません。",
        svcard_change_vs_last_week: "先週より",
        svcard_title_weekly_guide: "週間ガイド",
        svcard_no_keeps_yet: "作成されたメモがありません。",
        svcard_no_keeps_add_prompt: "作成されたメモがありません。「記録する」タブで追加してみてください！",
        modalTabDetailedAnalysis: "詳細分析",
        modalTabComparativeAnalysis: "比較分析",
        labelBase: "基準",
        labelCompareTarget: "比較対象",
        svcard_hormone_weekly_change: "週間変化量",

        // SV Card Titles & Content
        svcard_guide_default: "継続は力なり！✨",
        svcard_guide_positive_short: "素晴らしい！<br>変化は順調です。",
        svcard_guide_positive_long: "ここ3週間、<br>着実に目標に向かっています！",
        svcard_guide_negative_short: "大丈夫、<br>少し休む週かもしれません。",
        svcard_guide_negative_long: "大丈夫、<br>また始めましょう！",
        svcard_no_hormone_data: "ホルモンデータが不足しています。",
        svcard_hormone_prediction: "来週の予測{hormone}値: <strong>{value}</strong>",
        notification_title: "ShiftV 測定通知",
        notification_body: "最後の記録から1週間が経ちました。新しい変化を記録しましょう！",
        notification_permission_denied: "通知の許可が拒否されました。ブラウザの設定で許可してください。",
        notificationSettingsTitle: "通知設定",
        notificationToggleLabel: "測定日の通知を受け取る",
        notificationSettingsDesc: "最終測定日から7日後に通知します。通知を受け取るには、ブラウザの許可が必要です。",
        alertBrowserNotSupportNotification: "このブラウザは通知をサポートしていません。",
        showHistoryButton: "記録を確認",
        showInputButton: "入力に戻る",
        recordKeepsLabel: "今週のメモ 📝",
        recordKeepsPlaceholder: "今日の気分、出来事、体の変化などを自由に記録しましょう...",
        memo: "メモ",
        comparisonModalTitle: "記録レポートの詳細分析",

        medicationHistoryTitle: "投薬量の変化",
        hormoneLevelHistoryTitle: "ホルモン数値の変化",
        hormoneAnalysisTitle: "過去2週間の分析",
        hormoneAnalysisAvgChange: "平均変化量: {change}",
        hormoneAnalysisNextWeek: "来週の予測値: {value}",
        hormoneModalTitle: "ホルモン詳細分析",
        selectedWeekDataTitle: "{week}週目の詳細記録",
        svcard_label_current: "現在: {value}",
        targetLabelShort: "(目標:{value})",

        //hormon
        hormoneAnalysisTitleChange: "数値変化分析",
        hormoneAnalysisTitleInfluence: "薬物影響分析",
        hormoneAnalysisTitlePrediction: "将来予測",
        weeklyChange: "週間変化量",
        monthlyAvgChange: "月間平均変化量",
        totalChange: "総変化量",
        totalChangeWithInitial: '総変化量 (初期値: {value})',
        drugInfluence: "mgあたりの影響",
        predictedNextWeek: "来週の予測",
        daysToTarget: "目標までの予測日数",
        daysUnit: "{days}日",
        notEnoughData: "データ不足",
        dailyTSuppression: '一日T抑制量',
        influenceAnalysisDesc: 'この情報は実測データに基づく予測です。<br>数値には誤差が含まれる場合があります。',

        // Input Tab
        formTitleNew: "測定開始📏<br>現在{week}週", formTitleEdit: "測定記録を編集<br>{week}週目",
        inputDescription: "すべての項目は任意です！記録したいものだけ気軽に入力してください 😉",
        nextMeasurementInfoNoData: "最終測定日を基準に次の予定日を計算します。",
        nextMeasurementInfo: "最終測定: {lastDate} ({daysAgo}日前) <br>次回推奨日: {nextDate} ({daysUntil}日後)",
        nextMeasurementInfoToday: "最終測定: {lastDate} ({daysAgo}日前) <br>今日は測定日です！",
        nextMeasurementInfoOverdue: "最終測定: {lastDate} ({daysAgo}日前) <br>測定が{daysOverdue}日遅れています！",
        daysAgo: "{count}日前", daysUntil: "{count}日後", today: "今日",
        categoryBodySize: "身体サイズ 📐", categoryHealth: "健康 💪", categoryMedication: "魔法 ✨",
        // Measurement Labels
        week: '週目', date: '日付', timestamp: '記録時間',
        height: '身長 (cm)', weight: '体重 (kg)', shoulder: '肩幅 (cm)', neck: '首周り (cm)',
        chest: 'トップバスト (cm)', cupSize: 'アンダーバスト (cm)', waist: '腹囲 (cm)', hips: 'ヒップ (cm)',
        thigh: '太もも周り (cm)', calf: 'ふくらはぎ周り (cm)', arm: '腕周り (cm)',
        muscleMass: '筋肉量 (kg)', bodyFatPercentage: '体脂肪率 (%)', libido: '性欲 (回/週)',
        estrogenLevel: 'エストロゲン値 (pg/ml)', testosteroneLevel: 'テストステロン値 (ng/ml)',
        healthStatus: '健康状態', healthScore: '健康スコア', healthNotes: '健康状態(テキスト)',
        skinCondition: '肌の状態',
        estradiol: 'エストラジオール (mg)', progesterone: 'プロゲステロン (mg)',
        antiAndrogen: '抗アンドロゲン (mg)', testosterone: 'テストステロン (mg)', antiEstrogen: '抗エストロゲン剤 (mg)',
        medicationOtherName: 'その他の魔法名',
        medicationOtherDose: 'その他の魔法用量 (mg)',
        medicationOtherNamePlaceholder: '（その他）',
        unitMgPlaceholder: 'mg',
        // Placeholders
        skinConditionPlaceholder: '例: 柔らかくなった', libidoPlaceholder: '回/週',
        scorePlaceholder: "点数", notesPlaceholder: "特記事項",
        unitCm: "cm", unitKg: "kg", unitPercent: "%", unitMg: "mg", unitCountPerWeek: "回/週",
        placeholderPrevious: "前回: {value}",
        // History Tab
        historyTitle: "測定記録の詳細 🧐", historyDescription: "（表が画面より広い場合は、左右にスクロールしてください！）", manageColumn: "管理",
        // Report Tab
        reportTitle: "私の変化レポート 📈", reportGraphTitle: "週ごとの変化グラフ",
        reportGraphDesc: "見たい項目のボタンを押して選択（アクティブ化）または解除できます。複数の項目を重ねて表示することも可能です！",
        reportPrevWeekTitle: "先週と比較🤔", reportInitialTitle: "最初と比較🌱", reportTargetTitle: "目標達成率🎯",
        reportNeedTwoRecords: "比較するには、少なくとも2つの記録が必要です。", reportNeedTarget: "まず「目標設定」タブで目標を入力してください！",
        chartAxisLabel: "週目", comparisonItem: "項目", comparisonChange: "変化量", comparisonProgress: "達成率", targetAchieved: "達成 🎉",
        // Targets Tab
        targetDescription: "希望する目標数値を入力してください。メインタブで達成率を確認できます。",
        targetItem: "項目", targetValue: "目標値",
        // Overview (Notes) Tab
        overviewTitle: "メモ 📝", noteNewTitle: "新しいメモを作成", noteEditTitle: "メモを編集",
        noteTitleLabel: "タイトル", noteTitlePlaceholder: "メモのタイトル（任意）",
        noteContentLabel: "内容", noteContentPlaceholder: "イベント、体調の変化、考えなど、自由に記録しましょう！",
        noteListTitle: "作成されたメモ一覧 ✨", noteTitleUntitled: "無題",
        sortBy: "並び替え:", sortNewest: "新しい順", sortOldest: "古い順",
        noteDateCreated: "作成:", noteDateUpdated: "(編集: {date})", notePreviewEmpty: "(内容なし)",
        // Settings Tab
        settingsTitle: "設定 ⚙️",
        languageSettingsTitle: "言語設定", language: "言語",
        modeSettingsTitle: "モード設定", modeSettingsDesc: "目指す身体の変化の方向を選択してください。",
        mode: "モード", modeMtf: "女性化", modeFtm: "男性化",
        themeSettingsTitle: "テーマ設定", theme: "テーマ", themeSystem: "デバイスの設定に従う", themeLight: "ライトモード", themeDark: "ダークモード",
        dataManagementTitle: "データのバックアップと復元",
        dataManagementDesc: "すべての記録（測定、目標、メモ）を1つのファイルに保存したり、復元したりできます。時々バックアップしておくと安心です！ 😊",
        exportData: "ファイルに保存", importData: "ファイルから読み込む",
        warning: "注意！", importWarning: "復元すると、現在ブラウザにあるすべてのデータがファイルの内容に完全に置き換えられます！",
        resetDataTitle: "データ初期化",
        severeWarning: "！！！警告！！！", resetWarning: "😱 すべてのデータ（測定、目標、メモ）が完全に削除されます！ 初期化する前に必ずデータをファイルにバックアップしてください。",
        resetDataButton: "すべてのデータを初期化",
        infoTitle: "情報", versionLabel: "バージョン:",
        privacyInfo: "このアプリはオフラインで動作し、すべてのデータはブラウザ内にのみ安全に保存されます！ 😉",
        developerMessage: "この小さなツールが、あなたの貴重な旅に喜びと助けをもたらすことを願っています！",
        dataUpdateAndResetTitle: "データの更新と初期化",
        checkForUpdatesButton: "更新を確認",
        popupUpdateComplete: "アップデートが完了しました。アプリを再起動します。",
        popupUpdateFailed: "アップデートに失敗しました。後でもう一度お試しください。",
        popupAlreadyLatest: "すでに最新バージョンです！✨",
        popupOfflineForUpdate: "アップデートを確認するにはインターネット接続が必要です。",
        resetWarning: "😱 データの初期化は、すべての記録（測定、目標、メモ）を完全に削除します！初期化する前に、必ずデータをファイルにバックアップしてください。",
        // Initial Setup
        initialSetupTitle: "初期設定", initialSetupDesc: "ShiftVを使用する前に、言語とモードを選択してください。",
        swipeThresholdMet: "スワイプ検出: {direction}"
        ,
        labelInitial: "初期",
        labelPrev: "前週",
        labelCurrent: "現在",
        labelTarget: "目標",
        initialTargetSame: "初期/目標",
        prevCurrentSame: "前週/現在",
        graphClickPrompt: "グラフの数値をタップすると、該当週の詳細記録が表示されます。",
        biologicalSex: "生物学的性別",
        sexSettingsTitle: "生物学的性別設定",
        sexSettingsDesc: "自然なホルモン回復率の計算精度を向上させるために使用されます。",
        sexMale: "男性",
        sexFemale: "女性",
        sexOther: "その他"
    }
};
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
        'medicationOtherDose'
    ];
    const textKeys = ['healthNotes', 'skinCondition', 'medicationOtherName', 'memo']; // <-- 'memo' 추가
    // displayKeysInOrder를 업데이트합니다. (표시 순서 제어)
    const displayKeysInOrder = [
        'week', 'date',
        'height', 'weight', 'shoulder', 'neck', 'chest', 'cupSize', 'waist', 'hips', 'thigh', 'calf', 'arm',
        'muscleMass', 'bodyFatPercentage', 'libido', 'estrogenLevel', 'testosteroneLevel', 'skinCondition', 'healthScore', 'healthNotes',
        'estradiol', 'progesterone', 'antiAndrogen', 'testosterone', 'antiEstrogen',
        'medicationOtherName', 'medicationOtherDose', 'memo',
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
        if (measurements.length < 2) return null;

        const MIN_DAYS_INTERVAL = 1;

        // --- 물리 상수 및 Helper 함수 (이전과 동일) ---
        const T_BASELINE_MALE = 630, T_BASELINE_FEMALE = 30, E_BASELINE_FEMALE = 115;
        const T_RECOVERY_HALFLIFE = 1.5, E_RECOVERY_HALFLIFE = 1.5;
        const S_E_R_INFINITY = 0.82, S_E_TAU_RECOVERY = 3;
        const getSuppressionRate = (e) => {
            if (isNaN(e) || e < 60) return 0;
            if (e < 200) return 0.5 * (e - 135) / 65;
            if (e < 500) return 0.5 + 0.4 * (e - 200) / 300;
            return Math.min(0.95, 0.9 + 0.05 * (e - 500) / 500);
        };
        const getNaturalRecoveryChange = (t_days, t0, baseline, half_life) => {
            if (baseline === null || isNaN(t0)) return 0;
            return (baseline - (baseline - t0) * Math.exp(-t_days / half_life)) - t0;
        };
        const getDrugAttributedChanges = (prev, curr, daysDiff) => {
            const prevE = parseFloat(prev.estrogenLevel), currE = parseFloat(curr.estrogenLevel);
            const prevT = parseFloat(prev.testosteroneLevel), currT = parseFloat(curr.testosteroneLevel);
            if ([prevE, currE, prevT, currT].some(isNaN)) return null;
            let naturalEChange = 0, naturalTChange = 0;
            const T_BASELINE = biologicalSex === 'male' ? T_BASELINE_MALE : (biologicalSex === 'female' ? T_BASELINE_FEMALE : null);
            const E_BASELINE = biologicalSex === 'female' ? E_BASELINE_FEMALE : null;
            naturalTChange += getNaturalRecoveryChange(daysDiff, prevT, T_BASELINE, T_RECOVERY_HALFLIFE);
            if (currentMode === 'ftm') naturalEChange += getNaturalRecoveryChange(daysDiff, prevE, E_BASELINE, E_RECOVERY_HALFLIFE);
            const avgE = (prevE + currE) / 2;
            const Se = getSuppressionRate(avgE);
            const kt = 1 - (1 - S_E_R_INFINITY) * (1 - Math.exp(-daysDiff / S_E_TAU_RECOVERY));
            naturalTChange += prevT * (1 - (Se * kt)) - prevT;
            return { eChange: (currE - prevE) - naturalEChange, tChange: (currT - prevT) - naturalTChange };
        };

        const analytics = { estrogenLevel: {}, testosteroneLevel: {}, influence: {} };
        // --- 기본적인 변화량 계산 (변경 없음) ---
        const initial = measurements[0], latest = measurements[measurements.length - 1], previous = measurements.length > 1 ? measurements[measurements.length - 2] : null;
        const oneMonthAgoTime = latest.timestamp - (28 * 86400000);
        const monthAgoRecord = measurements.slice().reverse().find(m => m.timestamp <= oneMonthAgoTime) || initial;
        const daysForMonthAvg = (latest.timestamp - monthAgoRecord.timestamp) / 86400000;
        ['estrogenLevel', 'testosteroneLevel'].forEach(h => {
            const latestVal = parseFloat(latest[h]);
            if (!isNaN(latestVal)) {
                analytics[h].current = latestVal;
                analytics[h].weeklyChange = (previous && !isNaN(parseFloat(previous[h]))) ? latestVal - parseFloat(previous[h]) : null;
                const initialVal = parseFloat(initial[h]);
                analytics[h].totalChange = !isNaN(initialVal) ? latestVal - initialVal : null;
                analytics[h].initial = !isNaN(initialVal) ? initialVal : null;
                analytics[h].monthlyAvgChange = (daysForMonthAvg > 0 && !isNaN(parseFloat(monthAgoRecord[h]))) ? ((latestVal - parseFloat(monthAgoRecord[h])) / daysForMonthAvg) * 7 : null;
            }
        });

        // === ★★★ 새로운 약물 영향력 계산 로직 ★★★ ===
        const drugRoles = { estradiol: { estrogen: 1, testosterone: 0 }, antiAndrogen: { estrogen: 0, testosterone: -1 }, testosterone: { estrogen: 0, testosterone: 1 }, antiEstrogen: { estrogen: -1, testosterone: 0 } };
        const otherDrugs = [...new Set(measurements.map(m => m.medicationOtherName).filter(Boolean))];
        const allDrugs = [...new Set([...Object.keys(drugRoles), ...otherDrugs])];

        const periodData = [];
        for (let i = 1; i < measurements.length; i++) {
            const curr = measurements[i], prev = measurements[i - 1];
            const daysDiff = (curr.timestamp - prev.timestamp) / 86400000;
            if (daysDiff < MIN_DAYS_INTERVAL) continue;

            const changes = getDrugAttributedChanges(prev, curr, daysDiff);
            if (changes === null) continue;

            // ★★★ 여기가 핵심 수정 사항입니다 ★★★
            // 입력된 용량을 '일일 복용량'으로 해석하고, 이를 '주간 평균 복용량'으로 환산합니다.
            const weeklyDoses = {};
            allDrugs.forEach(drug => {
                const dailyDose = parseFloat(curr[drug] || (curr.medicationOtherName === drug ? curr.medicationOtherDose : 0)) || 0;
                weeklyDoses[drug] = dailyDose * 7; // 일일 복용량 * 7일 = 주간 복용량
            });

            periodData.push({
                doses: weeklyDoses,
                weeklyEChange: (changes.eChange / daysDiff) * 7,
                weeklyTChange: (changes.tChange / daysDiff) * 7
            });
        }

        let influences = {};
        allDrugs.forEach(drug => influences[drug] = { estrogen: 0, testosterone: 0 });

        const MAX_ITERATIONS = 15;
        for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
            allDrugs.forEach(drugToEstimate => {
                const residualsE = [], residualsT = [], dosesOfDrug = [];

                periodData.forEach(p => {
                    if (p.doses[drugToEstimate] <= 0) return;
                    let eExpectedFromOthers = 0, tExpectedFromOthers = 0;
                    allDrugs.forEach(otherDrug => {
                        if (otherDrug !== drugToEstimate) {
                            eExpectedFromOthers += influences[otherDrug].estrogen * p.doses[otherDrug];
                            tExpectedFromOthers += influences[otherDrug].testosterone * p.doses[otherDrug];
                        }
                    });
                    residualsE.push(p.weeklyEChange - eExpectedFromOthers);
                    residualsT.push(p.weeklyTChange - tExpectedFromOthers);
                    dosesOfDrug.push(p.doses[drugToEstimate]);
                });

                if (dosesOfDrug.length > 0) {
                    const filterOutliers = (arr, doses) => {
                        const samples = arr.map((res, index) => doses[index] > 0 ? res / doses[index] : 0).filter(isFinite);
                        if (samples.length < 4) return samples;
                        const sorted = [...samples].sort((a, b) => a - b);
                        const q1 = sorted[Math.floor(sorted.length / 4)], q3 = sorted[Math.floor(sorted.length * 3 / 4)];
                        const iqr = q3 - q1;
                        const lower = q1 - 1.5 * iqr, upper = q3 + 1.5 * iqr;
                        return samples.filter(x => x >= lower && x <= upper);
                    };

                    const filteredE = filterOutliers(residualsE, dosesOfDrug);
                    const filteredT = filterOutliers(residualsT, dosesOfDrug);

                    if (filteredE.length > 0) influences[drugToEstimate].estrogen = filteredE.reduce((a, b) => a + b, 0) / filteredE.length;
                    if (filteredT.length > 0) influences[drugToEstimate].testosterone = filteredT.reduce((a, b) => a + b, 0) / filteredT.length;
                }
            });
        }

        Object.keys(drugRoles).forEach(drug => {
            if (influences[drug]) {
                if (drugRoles[drug].estrogen > 0 && influences[drug].estrogen < 0) influences[drug].estrogen = 0;
                if (drugRoles[drug].estrogen < 0 && influences[drug].estrogen > 0) influences[drug].estrogen = 0;
                if (drugRoles[drug].testosterone > 0 && influences[drug].testosterone < 0) influences[drug].testosterone = 0;
                if (drugRoles[drug].testosterone < 0 && influences[drug].testosterone > 0) influences[drug].testosterone = 0;
            }
        });
        analytics.influence = influences;

        // --- 미래 예측 (변경 없음) ---
        // (이 부분은 이전 코드와 동일하여 생략합니다. 그대로 두시면 됩니다.)
        const latestE = analytics.estrogenLevel.current;
        const weeklyEChange = analytics.estrogenLevel.monthlyAvgChange;

        if (!isNaN(latestE) && weeklyEChange !== null) {
            // 다음 주 예상 = 현재 수치 + 월간 평균 주간 변화량
            analytics.estrogenLevel.predictedNext = latestE + weeklyEChange;

            const targetE = parseFloat(targets.estrogenLevel);
            const dailyEChange = weeklyEChange / 7; // 일일 평균 변화량

            if (!isNaN(targetE) && dailyEChange !== 0 && Math.sign(targetE - latestE) === Math.sign(dailyEChange)) {
                analytics.estrogenLevel.daysToTarget = Math.abs(Math.round((targetE - latestE) / dailyEChange));
            }
        }

        const latestT = analytics.testosteroneLevel.current;
        const weeklyTChange = analytics.testosteroneLevel.monthlyAvgChange;

        if (!isNaN(latestT) && weeklyTChange !== null) {
            // 다음 주 예상 = 현재 수치 + 월간 평균 주간 변화량
            analytics.testosteroneLevel.predictedNext = latestT + weeklyTChange;

            const targetT = parseFloat(targets.testosteroneLevel);
            const dailyTChange = weeklyTChange / 7; // 일일 평균 변화량

            if (!isNaN(targetT) && dailyTChange !== 0 && Math.sign(targetT - latestT) === Math.sign(dailyTChange)) {
                analytics.testosteroneLevel.daysToTarget = Math.abs(Math.round((targetT - latestT) / dailyTChange));
            }
        }
        const latestEForSuppression = parseFloat(latest.estrogenLevel);
        const T_BASELINE_ForSuppression = biologicalSex === 'male' ? T_BASELINE_MALE : (biologicalSex === 'female' ? T_BASELINE_FEMALE : null);

        if (!isNaN(latestEForSuppression) && T_BASELINE_ForSuppression !== null) {
            const suppressionRate = getSuppressionRate(latestEForSuppression);
            // 억제량은 음수로 표시해야 하므로 -1을 곱합니다.
            const dailySuppressionAmount = -1 * T_BASELINE_ForSuppression * suppressionRate;
            analytics.testosteroneLevel.dailySuppression = dailySuppressionAmount;
        } else {
            analytics.testosteroneLevel.dailySuppression = null;
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
        if (!modalOverlay) return;

        bodyElement.classList.remove('modal-open');
        modalOverlay.classList.remove('visible');
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
        if (!hormoneModalOverlay) return;
        bodyElement.classList.remove('modal-open');
        hormoneModalOverlay.classList.remove('visible');

        // 모달이 닫힐 때 차트 인스턴스를 파괴
        if (medicationChartInstance) {
            medicationChartInstance.destroy();
            medicationChartInstance = null;
        }
        if (hormoneChartInstance) {
            hormoneChartInstance.destroy();
            hormoneChartInstance = null;
        }
    }

    // script.js (약 1080번째 줄 근처, 기존 openComparisonModal 부터 handleComparisonFilterClick 까지를 아래 코드로 교체)

    // --- Comparison Modal 'Flow View' Functions ---
    function openComparisonModal() {
        const comparisonViewTemplate = document.getElementById('compare-flow-view');
        if (!comparisonViewTemplate) return;

        const contentHTML = comparisonViewTemplate.innerHTML;
        const title = translate('comparisonModalTitle'); // 이 부분은 '최근 변화 하이라이트' 등으로 바꿀 수 있습니다.
        openModal(title, contentHTML);

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

        // 탭 전환 이벤트 리스너 연결
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

        const filterableKeys = getFilteredChartKeys();

        // 1. 측정 항목 버튼들의 HTML만 먼저 생성합니다.
        const categoryButtonsHTML = filterableKeys.map(key => {
            const label = translate(key).split('(')[0].trim();
            const isActive = activeComparisonFilters.includes(key);
            return `<button class="filter-button ${isActive ? 'active' : ''}" data-key="${key}">${label}</button>`;
        }).join('');

        // 2. '전체 선택', '전체 해제' 버튼을 별도의 div(.comparison-actions)로 묶어줍니다.
        const actionButtonsHTML = `
            <div class="comparison-actions">
                <button class="filter-button" data-key="all">${translate('selectAll')}</button>
                <button class="filter-button" data-key="none">${translate('deselectAll')}</button>
            </div>
        `;

        // 3. 두 부분의 HTML을 합쳐서 컨테이너에 삽입합니다.
        container.innerHTML = categoryButtonsHTML + actionButtonsHTML;

        // 버튼에 동적 스타일을 적용하는 로직은 그대로 유지합니다.
        container.querySelectorAll('button[data-key]').forEach(button => {
            const key = button.dataset.key;
            if (key === 'all' || key === 'none') return; // 전체선택/해제 버튼은 색상 변경 안 함

            const color = getMetricColor(key);
            const lightColor = getMetricColor(key, true);

            if (button.classList.contains('active')) {
                button.style.backgroundColor = color;
                button.style.borderColor = color;
                button.style.color = 'white';
            } else {
                button.style.backgroundColor = 'transparent';
                button.style.borderColor = lightColor;
                button.style.color = lightColor;
            }
        });
    }

    function renderComparisonChart() {
        const ctx = modalContent.querySelector('#detailed-analysis-view #comparison-chart')?.getContext('2d');
        if (!ctx) return;

        if (comparisonChartInstance) {
            comparisonChartInstance.destroy();
        }

        if (measurements.length < 1 || activeComparisonFilters.length === 0) {
            return; // 데이터 없으면 차트 그리지 않음
        }

        const labels = measurements.map(m => `${m.week}${translate('week')}`);
        const datasets = activeComparisonFilters.map(metric => {
            const color = getMetricColor(metric); // 헬퍼 함수로 색상 가져오기
            return {
                label: translate(metric).split('(')[0].trim(),
                data: measurements.map(m => m[metric] ?? null),
                borderColor: color,
                backgroundColor: color + '33',
                tension: 0.1,
                borderWidth: 2.5,
                pointRadius: 4,
                pointHoverRadius: 6,
                spanGaps: true,
            };
        });

        // <<< 시작: 라이트 모드에 따른 색상 변수를 정의하는 코드를 여기에 추가합니다.
        const isLightMode = document.body.classList.contains('light-mode');
        const tickColor = isLightMode ? '#5c5c8a' : getCssVar('--text-dim2');
        const gridColor = isLightMode ? 'rgba(200, 200, 235, 0.5)' : getCssVar('--glass-border');
        // <<< 종료

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
                        const weekIndex = firstPoint.index;
                        const weekData = measurements[weekIndex];

                        if (weekData) {
                            titleEl.textContent = translate('selectedWeekDataTitle', { week: weekData.week });
                            let contentHTML = '';
                            getFilteredDisplayKeys().forEach(key => {
                                // 값이 유효할 때만 항목을 표시합니다.
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
                    // <<< 시작: 축과 그리드 라인의 색상을 위에서 정의한 변수로 교체합니다.
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
                    // <<< 종료
                },
                plugins: {
                    legend: {
                        display: false
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

    function formatValue(value, key = '') {
        if (value === null || value === undefined || value === '') return '-';
        if (textKeys.includes(key) || key === 'skinCondition') { // skinCondition도 textKey 처럼 처리
            return value;
        }
        const num = parseFloat(value);
        if (isNaN(num)) return '-';

        if (['weight', 'muscleMass', 'bodyFatPercentage', 'height', 'shoulder', 'neck', 'chest', 'waist', 'hips', 'thigh', 'calf', 'arm', 'estradiol', 'semenScore', 'healthScore'].includes(key)) {
            return num.toFixed(1);
        } else if (['progesterone', 'antiAndrogen', 'testosterone', 'libido'].includes(key)) {
            return num.toFixed(0);
        }
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
                    const parts = dateInput.split('-');
                    date = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
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
        const topChanges = allChanges.slice(0, 3);

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
        <div class="carousel-item">
            <p style="font-size: 1.1em; font-weight: 500;">${translate(item.key)}</p>
            <p style="font-size: 2.2em; font-weight: 700; color: var(--text-main); margin: 5px 0;">${formatValue(item.value, item.key)}</p>
            <p class="${changeClass}" style="font-weight: 600;">${translate('svcard_change_vs_last_week')} ${changeText}</p>
        </div>`;
        }).join('');

        dotsEl.innerHTML = topChanges.map((_, index) => `<div class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`).join('');

        // 스크롤 이벤트 리스너 추가 (이벤트 중복 방지)
        contentEl.removeEventListener('scroll', handleCarouselScroll); // 기존 리스너 제거
        contentEl.addEventListener('scroll', handleCarouselScroll); // 새 리스너 추가
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
                if (val === null || val === undefined || isNaN(val)) return translate('notEnoughData');
                const fixedVal = val.toFixed(1);
                return val >= 0 ? `+${fixedVal}` : fixedVal;
            };

            // --- 섹션 1: 수치 변화량 분석 ---
            analysisHTML += `<h4 class="table-title">${translate('hormoneAnalysisTitleChange')}</h4><br>
<div class="sv-grid" style="grid-template-columns: 1fr 1fr;">
    <div class="sv-card">
        <h3>${translate('estrogenLevel').split('(')[0]}</h3>
        <p class="analysis-card-subtitle">${translate('svcard_label_current', { value: formatValue(analytics.estrogenLevel.current, 'estrogenLevel') })}</p>
        <div class="analysis-card-content">
            <div class="analysis-item"><span class="analysis-label">${translate('weeklyChange')}</span><span class="analysis-value">${formatChange(analytics.estrogenLevel.weeklyChange)}</span></div>
            <div class="analysis-item"><span class="analysis-label">${translate('monthlyAvgChange')}</span><span class="analysis-value">${formatChange(analytics.estrogenLevel.monthlyAvgChange)}</span></div>
            <div class="analysis-item"><span class="analysis-label">${translate('totalChangeWithInitial', { value: formatValue(analytics.estrogenLevel.initial, 'estrogenLevel') })}</span><span class="analysis-value">${formatChange(analytics.estrogenLevel.totalChange)}</span></div>
            <div class="analysis-item">
    <span class="analysis-label">${translate('dailyTSuppression')}</span>
    <span class="analysis-value">${analytics.testosteroneLevel.dailySuppression ? formatChange(analytics.testosteroneLevel.dailySuppression) : '-'}</span>
</div>
        </div>
    </div>
    <div class="sv-card">
        <h3>${translate('testosteroneLevel').split('(')[0]}</h3>
        <p class="analysis-card-subtitle">${translate('svcard_label_current', { value: formatValue(analytics.testosteroneLevel.current, 'testosteroneLevel') })}</p>
        <div class="analysis-card-content">
            <div class="analysis-item"><span class="analysis-label">${translate('weeklyChange')}</span><span class="analysis-value">${formatChange(analytics.testosteroneLevel.weeklyChange)}</span></div>
            <div class="analysis-item"><span class="analysis-label">${translate('monthlyAvgChange')}</span><span class="analysis-value">${formatChange(analytics.testosteroneLevel.monthlyAvgChange)}</span></div>
            <div class="analysis-item"><span class="analysis-label">${translate('totalChangeWithInitial', { value: formatValue(analytics.testosteroneLevel.initial, 'testosteroneLevel') })}</span><span class="analysis-value">${formatChange(analytics.testosteroneLevel.totalChange)}</span></div>
<div class="analysis-item">
    <span class="analysis-label">${translate('dailyTSuppression')}</span>
    <span class="analysis-value">${analytics.testosteroneLevel.dailySuppression ? formatChange(analytics.testosteroneLevel.dailySuppression) : '-'}</span>
</div>        </div>
    </div>
</div>`;

            // --- 섹션 2: 약물 영향력 분석 (수정된 로직 적용) ---
            const allInfluenceDrugs = Object.keys(analytics.influence);
            if (allInfluenceDrugs.length > 0) {
                const drugRoles = { estradiol: { estrogen: 1, testosterone: 0 }, antiAndrogen: { estrogen: 0, testosterone: -1 }, testosterone: { estrogen: 0, testosterone: 1 }, antiEstrogen: { estrogen: -1, testosterone: 0 } };
                const otherDrugs = [...new Set(measurements.map(m => m.medicationOtherName).filter(Boolean))];

                const usedDrugs = new Set();
                const allPossibleDrugs = [...new Set([...Object.keys(drugRoles), ...otherDrugs])];
                measurements.forEach(m => {
                    allPossibleDrugs.forEach(drug => {
                        const dose = parseFloat(m[drug] || (m.medicationOtherName === drug ? m.medicationOtherDose : 0)) || 0;
                        if (dose > 0) usedDrugs.add(drug);
                    });
                });

                const influenceEntries = Object.entries(analytics.influence).filter(([drug, effects]) =>
                    usedDrugs.has(drug) && (effects.estrogen.toFixed(2) != '0.00' || effects.testosterone.toFixed(2) != '0.00')
                );

                if (influenceEntries.length > 0) {
                    // <<< 안내 문구 추가
                    analysisHTML += `<h4 class="table-title">${translate('hormoneAnalysisTitleInfluence')}</h4><br>
                                     <p class="description" style="text-align: center; margin-top: -10px; margin-bottom: 30px;">${translate('influenceAnalysisDesc')}</p>
                                     <div class="sv-grid drug-influence-grid">`; // <<< drug-influence-grid 클래스 추가
                    // >>> 수정 완료

                    analysisHTML += influenceEntries.map(([drug, effects]) => `
                     <div class="sv-card">
                         <h3>${translate(drug) || drug}</h3>
                         <div class="analysis-card-content">
                             <div class="analysis-item"><span class="analysis-label">E₂ ${translate('drugInfluence')}</span><span class="analysis-value ${effects.estrogen >= 0 ? 'positive-change' : 'negative-change'}">${effects.estrogen.toFixed(2)}</span></div>
                             <div class="analysis-item"><span class="analysis-label">T ${translate('drugInfluence')}</span><span class="analysis-value ${effects.testosterone >= 0 ? 'positive-change' : 'negative-change'}">${effects.testosterone.toFixed(2)}</span></div>
                         </div>
                     </div>`).join('');

                    analysisHTML += `</div>`; // div 닫기
                }
            }

            // --- 섹션 3: 미래 예측 ---
            analysisHTML += `<h4 class="table-title">${translate('hormoneAnalysisTitlePrediction')}</h4><br>
        <div class="sv-grid" style="grid-template-columns: 1fr 1fr;">
             <div class="sv-card">
                <h3>${translate('estrogenLevel').split('(')[0]}</h3>
                <div class="analysis-card-content">
                    <div class="analysis-item"><span class="analysis-label">${translate('predictedNextWeek')}</span><span class="analysis-value">${analytics.estrogenLevel.predictedNext ? analytics.estrogenLevel.predictedNext.toFixed(1) : '-'}</span></div>
                    <div class="analysis-item"><span class="analysis-label">${translate('daysToTarget')} ${targets.estrogenLevel ? translate('targetLabelShort', { value: targets.estrogenLevel }) : ''}</span><span class="analysis-value">${analytics.estrogenLevel.daysToTarget ? translate('daysUnit', { days: analytics.estrogenLevel.daysToTarget }) : '-'}</span></div>
                </div>
            </div>
            <div class="sv-card">
                <h3>${translate('testosteroneLevel').split('(')[0]}</h3>
                 <div class="analysis-card-content">
                    <div class="analysis-item"><span class="analysis-label">${translate('predictedNextWeek')}</span><span class="analysis-value">${analytics.testosteroneLevel.predictedNext ? analytics.testosteroneLevel.predictedNext.toFixed(1) : '-'}</span></div>
                    <div class="analysis-item"><span class="analysis-label">${translate('daysToTarget')} ${targets.testosteroneLevel ? translate('targetLabelShort', { value: targets.testosteroneLevel }) : ''}</span><span class="analysis-value">${analytics.testosteroneLevel.daysToTarget ? translate('daysUnit', { days: analytics.testosteroneLevel.daysToTarget }) : '-'}</span></div>
                </div>
            </div>
        </div>`;
        }
        analysisEl.innerHTML = analysisHTML;

        // --- 이하 그래프 렌더링 로직 ---
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
        const medicationKeys = currentMode === 'mtf' ? medicationKeys_MtF : medicationKeys_FtM;
        const medicationColors = ['#ff8fcd', '#ff60a8', '#ff5577'];
        const medicationDatasets = medicationKeys.map((key, index) => ({
            label: translate(key).split('(')[0].trim(), data: measurements.map(m => m[key] || null), borderColor: medicationColors[index], backgroundColor: medicationColors[index] + '33', tension: 0.1, borderWidth: 2, pointRadius: 4, pointHoverRadius: 6
        }));

        const hormoneKeys = ['estrogenLevel', 'testosteroneLevel'];
        const hormoneColors = ['#55f0d0', '#8888ff'];
        const hormoneDatasets = hormoneKeys.map((key, index) => ({
            label: translate(key).split('(')[0].trim(), data: measurements.map(m => m[key] ? parseFloat(m[key]) : NaN), borderColor: hormoneColors[index], backgroundColor: hormoneColors[index] + '33', tension: 0.1, borderWidth: 2, spanGaps: true, pointRadius: 4, pointHoverRadius: 6
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
            // <<< 이 부분을 추가하여 현재 모드를 확인하고 색상을 결정합니다.
            const isLightMode = document.body.classList.contains('light-mode');
            const tickColor = isLightMode ? '#5c5c8a' : getCssVar('--text-dim2'); // 라이트 모드일 때 사용할 진한 폰트 색상
            const gridColor = isLightMode ? 'rgba(200, 200, 235, 0.5)' : getCssVar('--glass-border'); // 라이트 모드일 때 사용할 연한 그리드 색상

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

        medicationChartInstance = new Chart(medicationCtx, { type: 'line', data: { labels, datasets: medicationDatasets }, options: chartOptions(() => medicationChartInstance) });
        hormoneChartInstance = new Chart(hormoneCtx, { type: 'line', data: { labels, datasets: hormoneDatasets }, options: chartOptions(() => hormoneChartInstance) });

        const medicationLegendEl = document.getElementById('medication-legend-controls');
        const hormoneLegendEl = document.getElementById('hormone-legend-controls');
        if (!medicationLegendEl || !hormoneLegendEl) return;

        const createLegend = (chart, container) => {
            container.innerHTML = chart.data.datasets.map((dataset, index) => {
                const color = dataset.borderColor;
                // <<< 아래 style 속성을 수정하여 배경색을 추가하고 폰트색을 흰색으로 고정합니다.
                return `<button class="legend-button" data-chart="${chart.canvas.id}" data-dataset-index="${index}" style="background-color: ${color}; border-color: ${color}; color: white;">
                    ${dataset.label}
                </button>`;
            }).join('');
        };
        createLegend(medicationChartInstance, medicationLegendEl);
        createLegend(hormoneChartInstance, hormoneLegendEl);
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
        if (!svCardGuide) return;

        let message = translate('svcard_guide_default');
        let icon = '💬';
        let title = translate('svcard_title_weekly_guide');
        svCardGuide.className = 'sv-card sv-card-widget'; // 클래스 초기화

        // 모든 경우에 기본 이미지 클래스를 먼저 추가합니다.
        svCardGuide.classList.add('sv-card-with-image');

        // 데이터가 충분할 때만 점수를 계산하고, 그렇지 않으면 기본 상태를 유지합니다.
        if (measurements.length >= 4 && Object.keys(targets).length > 0) {
            const lastFour = measurements.slice(-4);
            let progressScores = [];

            // 최근 3주간의 변화를 계산
            for (let i = 1; i < lastFour.length; i++) {
                const current = lastFour[i];
                const prev = lastFour[i - 1];
                let weeklyProgress = 0;
                let validTargetsInWeek = 0;

                Object.keys(targets).forEach(key => {
                    const targetValue = parseFloat(targets[key]);
                    const prevValue = parseFloat(prev[key]);
                    const currentValue = parseFloat(current[key]);

                    if (![targetValue, prevValue, currentValue].some(isNaN)) {
                        const direction = Math.sign(targetValue - prevValue);
                        if (direction !== 0) {
                            if (Math.sign(currentValue - prevValue) === direction) {
                                weeklyProgress += 1;
                            } else if (Math.sign(currentValue - prevValue) === -direction) {
                                weeklyProgress -= 1;
                            }
                        }
                        validTargetsInWeek++;
                    }
                });

                if (validTargetsInWeek > 0) {
                    progressScores.push(weeklyProgress / validTargetsInWeek);
                } else {
                    progressScores.push(0);
                }
            }

            const totalScore = progressScores.reduce((a, b) => a + b, 0);

            if (totalScore >= 2) {
                message = translate('svcard_guide_positive_long');
                icon = '🎉';
                svCardGuide.classList.add('sv-card--countdown-green', 'sv-card-image-good');
            } else if (totalScore > 0) {
                message = translate('svcard_guide_positive_short');
                icon = '👍';
                svCardGuide.classList.add('sv-card--countdown-yellow', 'sv-card-image-normal');
            } else if (totalScore <= -2) {
                message = translate('svcard_guide_negative_long');
                icon = '😥';
                svCardGuide.classList.add('sv-card--countdown-red', 'sv-card-image-bad');
            } else if (totalScore < 0) {
                message = translate('svcard_guide_negative_short');
                icon = '🤔';
                svCardGuide.classList.add('sv-card--dday', 'sv-card-image-bad');
            } else {
                // 점수가 0이거나 계산 불가일 때 (기본 메시지 유지)
                svCardGuide.classList.add('sv-card-image-nothing');
            }
        } else {
            // 데이터가 부족한 경우
            svCardGuide.classList.add('sv-card-image-nothing');
        }

        svCardGuide.innerHTML = `<h3>${icon} ${title}</h3><div class="sv-card-content"><p>${message}</p></div>`;
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
        if (!svCardHormones) return;

        svCardHormones.classList.add('sv-card--clickable');
        // ▼▼▼▼▼ 여기가 수정된 부분입니다 ▼▼▼▼▼
        const analytics = calculateAdvancedHormoneAnalytics();
        // ▲▲▲▲▲ 여기가 수정된 부분입니다 ▲▲▲▲▲
        let content = `<h3>${translate('svcard_title_hormones')}</h3><div class="sv-card-content" style="align-items: stretch; text-align: left; gap: 20px;">`;

        if (measurements.length < 1) {
            content += `<p class="placeholder" style="text-align: center;">${translate('svcard_no_hormone_data')}</p>`;
        } else {
            const initial = measurements[0];
            const latest = measurements[measurements.length - 1];
            const previous = measurements.length > 1 ? measurements[measurements.length - 2] : null;

            const hormonesToDisplay = [
                { key: 'estrogenLevel', label: translate('estrogenLevel').split('(')[0] },
                { key: 'testosteroneLevel', label: translate('testosteroneLevel').split('(')[0] }
            ];

            hormonesToDisplay.forEach(h => {
                const barData = {
                    key: h.key,
                    initialValue: initial ? parseFloat(initial[h.key]) : null,
                    prevValue: previous ? parseFloat(previous[h.key]) : null,
                    currentValue: latest ? parseFloat(latest[h.key]) : null,
                    targetValue: targets[h.key] ? parseFloat(targets[h.key]) : null,
                };

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = `<table><tr>${createProgressBarHTML(barData)}</tr></table>`;
                const barHTML = tempDiv.querySelector('.progress-bar-cell')?.innerHTML || '<p class="placeholder" style="font-size: 0.8em; text-align: center;">-</p>';

                let weeklyChangeHTML = '';

                // analytics가 null이 아니고, 해당 호르몬 키가 있는지 확인
                if (analytics && analytics[h.key] && analytics[h.key].weeklyChange !== null) {
                    const change = analytics[h.key].weeklyChange;
                    const changeClass = change >= 0 ? 'positive-change' : 'negative-change';
                    const changeText = change >= 0 ? `+${change.toFixed(1)}` : change.toFixed(1);
                    weeklyChangeHTML = `
                        <div class="hormone-weekly-change">
                            <span class="change-label">${translate('svcard_hormone_weekly_change')}</span>
                            <span class="change-value ${changeClass}">${changeText}</span>
                        </div>
                    `;
                } else {
                    weeklyChangeHTML = `
                        <div class="hormone-weekly-change">
                            <span class="change-label">${translate('svcard_hormone_weekly_change')}</span>
                            <span class="change-value">-</span>
                        </div>
                    `;
                }

                content += `
                    <div class="hormone-item">
                        <label style="font-weight: 600; font-size: 0.9em; color: var(--text-main); margin-bottom: 5px; display: block;">${h.label}</label>
                        <div class="hormone-item-row">
                            <div class="hormone-progress-bar-container">
                                ${barHTML}
                            </div>
                            ${weeklyChangeHTML}
                        </div>
                    </div>
                `;
            });
        }

        content += '</div>';
        svCardHormones.innerHTML = content;
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

        svCardShortcut.className = 'sv-card sv-card--clickable'; // 기본 클래스 + 클릭 가능 클래스
        svCardShortcut.classList.add('sv-card-with-image', 'sv-card-image-write');
        let contentHTML = '';

        if (measurements.length === 0) {
            svCardShortcut.classList.add('sv-card--new');
            contentHTML = translate('svcard_shortcut_new');
        } else {
            const lastMeasurement = measurements[measurements.length - 1];
            const lastTimestamp = lastMeasurement.timestamp;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const nextMeasurementDate = new Date(lastTimestamp);
            nextMeasurementDate.setDate(nextMeasurementDate.getDate() + 7);

            const diffTime = nextMeasurementDate - today;
            const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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

        const currentDisplayKeys = getFilteredDisplayKeys();
        let headers = currentDisplayKeys.filter(k => k !== 'timestamp');

        // 헤더 필터링 (테이블 뷰용)
        if (activeHistoryFilters.length > 0) {
            headers = currentDisplayKeys.filter(key =>
                ['week', 'date', 'memo'].includes(key) || activeHistoryFilters.includes(key)
            );
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
                !['week', 'date', 'timestamp', 'memo'].includes(key) && (m[key] !== null && m[key] !== undefined && m[key] !== '')
            );
            if (activeHistoryFilters.length > 0) {
                displayKeys = displayKeys.filter(key => activeHistoryFilters.includes(key));
            }

            const labelsRow = displayKeys.map(key => `<th class="label">${translate(key).split('(')[0].trim()}</th>`).join('');
            const valuesRow = displayKeys.map(key => `<td class="value">${formatValue(m[key], key)}</td>`).join('');

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

        let tableHTML = '<table><thead><tr>';
        headers.forEach(key => {
            if (key === 'timestamp') return;
            const labelText = translate(key).split('(')[0].trim();
            tableHTML += `<th>${labelText}</th>`;
        });
        tableHTML += `<th class="sticky-col">${translate('manageColumn')}</th></tr></thead><tbody>`;

        data.forEach(m => {
            const index = m.week;
            tableHTML += '<tr>';
            headers.forEach(key => {
                if (key === 'timestamp') return;
                let value = (key === 'date') ? formatTimestamp(m.timestamp, true) : formatValue(m[key], key);
                if (key === 'memo' && value.length > 20) {
                    value = value.substring(0, 20) + '...';
                }
                tableHTML += `<td>${value}</td>`;
            });
            tableHTML += `<td class="action-buttons sticky-col">
                        <button class="glass-button btn-edit" data-index="${index}">${translate('edit')}</button>
                        <button class="glass-button danger btn-delete" data-index="${index}">${translate('delete')}</button>
                      </td></tr>`;
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
                    if (m.week !== index) { m.week = index; needsSave = true; }
                    if (!m.timestamp) {
                        m.timestamp = m.date ? new Date(m.date).getTime() : Date.now() - (measurements.length - 1 - index) * 86400000;
                        needsSave = true;
                    }
                    if (m.memoLiked === undefined) { m.memoLiked = false; needsSave = true; }
                });
                notes.forEach(note => {
                    if (!note.id) { note.id = 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9); needsSave = true; }
                    if (!note.timestamp) { note.timestamp = note.createdAt || note.id || Date.now(); needsSave = true; }
                });
                if (needsSave) {
                    console.log("DEBUG: Data migration applied (week numbers/timestamps/note IDs). Saving updated data.");
                    savePrimaryDataToStorage();
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
    }

    function applyLanguageToUI() {
        if (languageSelect) languageSelect.value = currentLanguage;
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
        if (measurements.length === 0) {
            nextMeasurementInfoDiv.innerHTML = `<p>${translate('nextMeasurementInfoNoData')}</p>`;
            return;
        }
        measurements.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        const lastMeasurement = measurements[measurements.length - 1];
        const lastTimestamp = lastMeasurement.timestamp || (lastMeasurement.date ? new Date(lastMeasurement.date).getTime() : 0);
        if (!lastTimestamp || isNaN(lastTimestamp)) {
            nextMeasurementInfoDiv.innerHTML = `<p>${translate('nextMeasurementInfoNoData')}</p>`;
            console.warn("DEBUG: Last measurement has invalid date/timestamp."); return;
        }
        const lastDate = new Date(lastTimestamp);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        lastDate.setHours(0, 0, 0, 0);
        const diffTime = today - lastDate;
        const daysAgo = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        const nextMeasurementDate = new Date(lastTimestamp);
        nextMeasurementDate.setDate(nextMeasurementDate.getDate() + 7);
        const diffUntilNext = nextMeasurementDate - today;
        const daysUntil = Math.floor(diffUntilNext / (1000 * 60 * 60 * 24));
        let messageKey = 'nextMeasurementInfo';
        let params = {
            lastDate: formatTimestamp(lastTimestamp),
            daysAgo: daysAgo,
            nextDate: formatTimestamp(nextMeasurementDate),
            daysUntil: daysUntil >= 0 ? daysUntil : 0
        };
        if (daysUntil < 0) {
            messageKey = 'nextMeasurementInfoOverdue';
            params.daysOverdue = Math.abs(daysUntil);
        } else if (daysUntil === 0) {
            messageKey = 'nextMeasurementInfoToday';
        }
        nextMeasurementInfoDiv.innerHTML = `<p>${translate(messageKey, params)}</p>`;
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


    // --- History Tab Rendering ---
    function renderHistoryTable() {
        console.log("DEBUG: -> renderHistoryTable");
        if (!historyTableContainer) return;
        if (!measurements || measurements.length === 0) {
            clearElement(historyTableContainer, "noDataYet"); return;
        }
        try {
            measurements.sort((a, b) => (a.week || 0) - (b.week || 0));
            const currentDisplayKeys = getFilteredDisplayKeys();
            let filteredHeaderKeys = currentDisplayKeys;
            if (activeHistoryFilters.length > 0) {
                // '주차'와 '날짜'는 항상 표시하고, 선택된 필터 항목을 추가
                filteredHeaderKeys = currentDisplayKeys.filter(key =>
                    ['week', 'date', 'memo'].includes(key) || activeHistoryFilters.includes(key)
                );
            }

            let tableHTML = '<table><thead><tr>';
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
                    else { value = formatValue(m[key], key); }
                    tableHTML += `<td>${value}</td>`;
                });
                tableHTML += `<td class="action-buttons sticky-col">`;
                // ** MODIFIED to use new glass button classes **
                tableHTML += `<button class="glass-button btn-edit" data-index="${i}">${translate('edit')}</button>`;
                tableHTML += `<button class="glass-button danger btn-delete" data-index="${i}">${translate('delete')}</button>`;
                tableHTML += `</td>`;
                tableHTML += '</tr>';
            }
            tableHTML += '</tbody></table>';
            historyTableContainer.innerHTML = tableHTML;
            console.log("DEBUG: <- renderHistoryTable complete");
        } catch (e) {
            console.error(" Error rendering history table:", e);
            historyTableContainer.innerHTML = `<p style="color: red;">${translate('alertGenericError')}</p>`;
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
        const headers = [translate('comparisonItem'), ' ', translate('comparisonProgress')];
        if (measurements.length < 1 || Object.keys(targets).length === 0) {
            return { data: [], headers };
        }

        const fullData = calculateComparisonData();
        // 목표가 설정된 항목만 필터링합니다.
        const data = fullData.filter(item => item.targetValue !== null).map(item => {
            let progress = null;
            // 초기값이 있어야 진행률을 계산할 수 있습니다.
            if (item.initialValue !== null) {
                const totalChangeNeeded = item.targetValue - item.initialValue;
                const currentChange = item.currentValue - item.initialValue;

                // 목표와 시작이 같은 경우 (유지 목표)
                if (Math.abs(totalChangeNeeded) < 0.01) {
                    // 현재 값도 같다면 100% 달성
                    progress = (Math.abs(currentChange) < 0.01) ? 100 : 0;
                } else {
                    progress = (currentChange / totalChangeNeeded) * 100;
                }
                // 진행률은 0% ~ 100% 사이로 제한합니다.
                progress = Math.max(0, Math.min(progress, 100));
            }
            return { ...item, progress: progress };
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



    // *** 수정 2: 달성률 계산 수정 (100% 상한 적용) ***
    // script.js 파일에서 calculateTargetComparison 함수를 찾아 아래 코드로 전체를 교체해주세요.

    function calculateTargetComparison() {
        const headers = [translate('comparisonItem'), ' ', translate('comparisonProgress')];

        // 데이터가 1개 미만이거나, 설정된 목표가 없으면 빈 테이블을 반환합니다.
        if (measurements.length < 1 || Object.keys(targets).length === 0) {
            return { data: [], headers };
        }

        // 모든 비교 데이터를 가져옵니다.
        const fullData = calculateComparisonData();

        // fullData 배열에서 '목표값(targetValue)'이 실제로 설정된 항목만 필터링합니다.
        const data = fullData.filter(item => item.targetValue !== null)
            // 필터링된 각 항목에 대해 '진행률(progress)'을 계산하여 추가합니다.
            .map(item => {
                let progress = null; // 진행률 기본값은 null

                // '초기값(initialValue)'이 있어야 진행률을 계산할 수 있습니다.
                if (item.initialValue !== null) {
                    const totalChangeNeeded = item.targetValue - item.initialValue; // 목표 달성을 위해 필요한 총 변화량
                    const currentChange = item.currentValue - item.initialValue;   // 현재까지의 변화량

                    // 목표와 시작이 거의 같은 '유지' 목표인 경우
                    if (Math.abs(totalChangeNeeded) < 0.01) {
                        // 현재 값도 같다면 100% 달성, 아니면 0%
                        progress = (Math.abs(currentChange) < 0.01) ? 100 : 0;
                    } else {
                        // 일반적인 경우: (현재 변화량 / 총 필요 변화량) * 100
                        progress = (currentChange / totalChangeNeeded) * 100;
                    }

                    // 진행률이 100%를 넘거나 0% 미만으로 가지 않도록 값을 0과 100 사이로 고정합니다.
                    progress = Math.max(0, Math.min(progress, 100));
                }

                // 기존 item 객체에 계산된 progress를 추가하여 새로운 객체를 반환합니다.
                return { ...item, progress: progress };
            });

        // 최종적으로 렌더링 함수가 사용할 수 있는 올바른 형식의 데이터를 반환합니다.
        return { data, headers };
    }

    function renderAllComparisonTables() {
        renderComparisonTable(prevWeekComparisonContainer, 'reportPrevWeekTitle', calculatePrevWeekComparison);
        renderComparisonTable(initialComparisonContainer, 'reportInitialTitle', calculateInitialComparison);
        renderComparisonTable(targetComparisonContainer, 'reportTargetTitle', calculateTargetComparison);
    }

    const metricButtonColors = {};
    // script.js 에서 renderChartSelector 함수를 찾아 교체
    function renderChartSelector() {
        if (!chartSelector) return;
        const availableKeys = getFilteredChartKeys();
        chartSelector.innerHTML = '';
        availableKeys.forEach((key, index) => {
            const button = document.createElement('button');
            button.classList.add('chart-select-button');
            button.dataset.metric = key;
            button.textContent = translate(key).split('(')[0].trim();

            const hue = (index * (360 / Math.min(availableKeys.length, 15))) % 360;

            // 두 가지 색상 정의: 활성(선명), 비활성(채도 낮춤)
            const activeColor = `hsl(${hue}, 75%, 58%)`;
            const inactiveColor = `hsl(${hue}, 50%, 70%)`;

            // metricButtonColors 객체에 두 색상 모두 저장
            metricButtonColors[key] = { active: activeColor, inactive: inactiveColor };

            if (selectedMetrics.includes(key)) {
                button.classList.add('active');
                button.style.backgroundColor = activeColor;
                button.style.borderColor = activeColor;
                button.style.color = '#ffffff';
            } else {
                button.classList.remove('active');
                button.style.backgroundColor = ''; // 비활성 시 배경 없음
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

        if (selectedMetrics.includes(metric)) {
            // --- 비활성화 로직 ---
            selectedMetrics = selectedMetrics.filter(m => m !== metric);
            button.classList.remove('active');
            button.style.backgroundColor = '';
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
                backgroundColor: color + '33', // 이제 color가 문자열이므로 정상 동작합니다.
                fill: false, tension: 0.1, pointRadius: 3, pointHoverRadius: 5, spanGaps: true, borderWidth: 2,
                parsing: { xAxisKey: 'x', yAxisKey: 'y' }
            };
        });
        if (chartInstance) { chartInstance.destroy(); }

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
                const input = document.createElement('input'); input.setAttribute('type', 'number');
                input.setAttribute('id', `target-${key}`); input.setAttribute('name', key);
                input.setAttribute('step', '0.1'); input.setAttribute('min', '0');
                let placeholderUnit = '';
                if (key.includes('Percentage')) placeholderUnit = translate('unitPercent');
                else if (key === 'weight' || key === 'muscleMass') placeholderUnit = translate('unitKg');
                else if (bodySizeKeys.includes(key) && key !== 'cupSize') placeholderUnit = translate('unitCm');
                input.setAttribute('placeholder', placeholderUnit);
                formGroup.appendChild(label); formGroup.appendChild(input);
                targetGrid.appendChild(formGroup);
            });
        } else {
            targetGrid.querySelectorAll('.form-group').forEach(group => {
                const label = group.querySelector('label'); const input = group.querySelector('input');
                if (label && input) {
                    const key = input.name;
                    label.textContent = translate(key);
                    let placeholderUnit = '';
                    if (key.includes('Percentage')) placeholderUnit = translate('unitPercent');
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
            input.value = targets[key] || '';
        });
    }

    // --- Event Handlers ---

    // Form submission
    function handleFormSubmit(event) {
        event.preventDefault();
        if (!form) return;
        form.querySelectorAll('.invalid-input').forEach(el => el.classList.remove('invalid-input'));
        let isValid = true; let firstInvalidField = null;
        const formData = new FormData(form);
        // measurementData 객체는 여기서 초기화하지 않습니다. edit 여부에 따라 다르게 처리합니다.

        // *** 수정 1 확인: HTML의 name이 카멜케이스로 변경되었으므로, JS 키와 일치함 ***
        const collectedData = {}; // 폼에서 읽어온 데이터만 임시 저장
        [...baseNumericKeys, ...textKeys].forEach(key => { // Process all keys
            const formKey = (key === 'memo') ? 'record-keeps' : key;
            let value = formData.get(formKey);
            const inputElement = form.querySelector(`[name="${formKey}"]`);

            if (value !== null && value !== undefined) {
                if (baseNumericKeys.includes(key) && value !== '') {
                    const numValue = parseFloat(value);
                    if (isNaN(numValue) || numValue < 0) {
                        collectedData[key] = null; // Store invalid as null
                        if (inputElement) {
                            inputElement.classList.add('invalid-input'); isValid = false;
                            if (!firstInvalidField) firstInvalidField = inputElement;
                        }
                    } else { collectedData[key] = numValue; }
                } else if (textKeys.includes(key)) {
                    collectedData[key] = value.trim() || null; // Trim text, store empty as null
                } else {
                    collectedData[key] = value || null;
                }
            } else { collectedData[key] = null; } // Ensure key exists even if not in form
        });

        if (!isValid) {
            showPopup('alertValidationError', 4000);
            if (firstInvalidField) firstInvalidField.focus();
            return;
        }

        const editIndexValue = editIndexInput.value;

        if (editIndexValue !== '') { // --- 수정 모드 ---
            const indexToUpdate = parseInt(editIndexValue, 10);
            if (indexToUpdate >= 0 && indexToUpdate < measurements.length) {
                measurements[indexToUpdate] = { ...measurements[indexToUpdate], ...collectedData };
                console.log("DEBUG: Measurement updated at index", indexToUpdate);
                showPopup('popupUpdateSuccess');
            } else {
                console.error("Invalid index for editing:", editIndex); showPopup('savingError'); return;
            }
        } else {
            const measurementData = { ...collectedData }; // 폼 데이터 복사
            measurementData.timestamp = Date.now(); // 새 레코드에만 현재 타임스탬프 추가
            measurementData.date = new Date(measurementData.timestamp).toISOString().split('T')[0]; // 오늘 날짜 추가
            measurementData.week = measurements.length; // 새 주차 번호 할당 (저장 전)
            const fullMeasurementData = {};
            [...baseNumericKeys, ...textKeys, 'date', 'week', 'timestamp'].forEach(key => {
                fullMeasurementData[key] = measurementData.hasOwnProperty(key) ? measurementData[key] : null;
            });
            measurements.push(fullMeasurementData);
            console.log("DEBUG: New measurement added with week", measurementData.week);
            showPopup('popupSaveSuccess');
            activateTab('tab-sv');

            measurements.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            calculateAndAddWeekNumbers(); // Recalculate weeks after adding and sorting
        }


        savePrimaryDataToStorage();
        resetFormState();
        renderAll();
        applyModeToUI(); // Ensure UI consistency
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
            editIndexInput.value = index;
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
                // 기존 단위 placeholder 로직 (단순화 버전)
                const unit = translate(key).match(/\((.*?)\)/)?.[1] || '';
                placeholderText = unit;
            }
            input.placeholder = placeholderText;
        });
    }

    // Save Targets
    function handleTargetFormSubmit(event) {
        event.preventDefault(); if (!targetForm || !targetGrid) return;
        targetForm.querySelectorAll('.invalid-input').forEach(el => el.classList.remove('invalid-input'));
        let isValid = true; let firstInvalidField = null;
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
                } else { newTargets[key] = numValue; }
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
        saveSettingsToStorage(); applyLanguageToUI(); showPopup('popupSettingsSaved');
    }

    // Handle Mode Change
    function handleModeChange(event) {
        currentMode = event.target.value; console.log("DEBUG: Mode changed to", currentMode);
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
                settings: { language: currentLanguage, mode: currentMode, theme: currentTheme, selectedMetrics: selectedMetrics },
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
                    measurements = imported.data.measurements; targets = imported.data.targets; notes = imported.data.notes;
                    if (imported.settings) {
                        currentLanguage = imported.settings.language || currentLanguage;
                        currentMode = imported.settings.mode || currentMode;
                        currentTheme = imported.settings.theme || currentTheme; // *** 수정 4: 테마 설정 복원 ***
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
        try {
            updateFormTitle();
            renderNextMeasurementInfo();
            renderAllComparisonTables(); // 이 함수는 현재 내용이 없지만, 나중에 채워질 수 있으니 둡니다.
            updatePlaceholders();
            renderMyHistoryView(); // '마이' 탭의 기록 뷰를 항상 렌더링

            // 현재 활성화된 탭에 따라 필요한 것만 렌더링
            const activeTabContent = document.querySelector('.tab-content.active');
            const activeTabId = activeTabContent ? activeTabContent.id : 'tab-sv';
            if (activeTabId === 'tab-sv') {
                renderSvTab();
            }
            // 'tab-record'에 대한 추가 렌더링은 이제 필요 없습니다.
            console.log("DEBUG: === renderAll complete ===");
        } catch (e) {
            console.error(`renderAll error: ${e.message}`, e.stack);
            showPopup('unexpectedError', { message: e.message });
        }
    }

    // ===============================================
    // Initialization
    // ===============================================
    console.log("DEBUG: App Initialization Start");
    try {
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

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => { if (currentTheme === 'system') applyTheme(); });

        console.log("DEBUG: App Initialization Sequence Complete");
    } catch (initError) {
        console.error("App Initialization Error:", initError);
        alert(translate('alertInitError') || `App Initialization Error: ${initError.message}`);
    }
    // --- Notification Toggle Handler ---
    function handleNotificationToggle() {
        if (!notificationToggle) return;
        const isEnabled = notificationToggle.checked;

        if (isEnabled) {
            // 알림을 켜려고 할 때
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
                } else {
                    console.log("DEBUG: Notification permission denied.");
                    notificationEnabled = false;
                    notificationToggle.checked = false; // 사용자가 거부하면 토글을 다시 끔
                    saveSettingsToStorage();
                }
            });
        } else {
            // 알림을 끌 때
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
        // --- Modal Bottom Sheet Events ---
        if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                // 오버레이의 검은 배경을 클릭했을 때만 닫히도록 함
                if (e.target === modalOverlay) {
                    closeModal();
                }
            });
        }
        // ✅ 교체할 코드 2: modalContent 이벤트 리스너
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.btn-edit');
                const deleteBtn = e.target.closest('.btn-delete');
                const likeBtn = e.target.closest('.keeps-like-btn'); // '좋아요' 버튼 변수 추가
                const index = parseInt(editBtn?.dataset.index || deleteBtn?.dataset.index || likeBtn?.dataset.index, 10);

                if (isNaN(index)) return;

                // '좋아요' 버튼 클릭 시 처리 로직
                if (likeBtn) {
                    if (index >= 0 && index < measurements.length) {
                        // 1. 데이터 업데이트
                        measurements[index].memoLiked = !measurements[index].memoLiked;
                        savePrimaryDataToStorage();

                        // 2. UI 즉시 업데이트 (CSS 클래스 토글)
                        likeBtn.classList.toggle('liked', measurements[index].memoLiked);
                    }
                    return; // 좋아요 처리 후 함수 종료
                }

                // 수정 버튼 클릭 시 처리
                if (editBtn) {
                    console.log(`DEBUG: Edit button clicked in modal for index ${index}`);
                    closeModal(); // 모달을 먼저 닫고
                    // 0.1초 후 수정 함수 호출 및 해당 탭으로 이동
                    setTimeout(() => {
                        handleEditClick(index);
                        activateTab('tab-record');
                    }, 100);
                }
                // 삭제 버튼 클릭 시 처리
                else if (deleteBtn) {
                    console.log(`DEBUG: Delete button clicked in modal for index ${index}`);
                    closeModal(); // 모달을 먼저 닫고
                    setTimeout(() => {
                        handleDeleteMeasurement(index);
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
                    const chartId = button.dataset.chart;
                    const datasetIndex = parseInt(button.dataset.datasetIndex, 10);
                    const chart = chartId === 'medication-chart' ? medicationChartInstance : hormoneChartInstance;

                    if (chart) {
                        const isHidden = chart.isDatasetVisible(datasetIndex);
                        chart.setDatasetVisibility(datasetIndex, !isHidden);
                        button.classList.toggle('inactive', isHidden);
                        chart.update();
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
                const title = translate('svcard_title_targets');

                // 1. 탭 구조를 포함한 모달의 HTML을 생성합니다.
                const content = `
            <div class="modal-content-wrapper">
                <div class="modal-tab-switcher">
                    <button class="modal-tab-btn active" data-tab="target-progress-view">${translate('reportTargetTitle')}</button>
                    <button class="modal-tab-btn" data-tab="prev-week-view">${translate('reportPrevWeekTitle')}</button>
                    <button class="modal-tab-btn" data-tab="initial-view">${translate('reportInitialTitle')}</button>
                </div>

                <div id="target-progress-view" class="modal-tab-content active">
                    <!-- '목표 달성도' 탭 내용이 여기에 렌더링됩니다. -->
                </div>
                <div id="prev-week-view" class="modal-tab-content">
                    <!-- '지난주와 비교' 탭 내용이 여기에 렌더링됩니다. -->
                </div>
                <div id="initial-view" class="modal-tab-content">
                    <!-- '처음과 비교' 탭 내용이 여기에 렌더링됩니다. -->
                </div>
            </div>
        `;

                // 2. 새로운 HTML 구조로 모달을 엽니다.
                openModal(title, content);

                // 3. 기본으로 선택된 '목표 달성도' 탭의 내용을 렌더링합니다.
                renderTargetProgressTab();

                // 4. 탭 버튼에 클릭 이벤트를 연결합니다.
                const tabSwitcher = modalContent.querySelector('.modal-tab-switcher');
                if (tabSwitcher) {
                    tabSwitcher.addEventListener('click', handleTargetModalTabSwitch);
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
        if (form) form.addEventListener('submit', handleFormSubmit);
        if (targetForm) targetForm.addEventListener('submit', handleTargetFormSubmit);

        // Buttons
        if (cancelEditBtn) cancelEditBtn.addEventListener('click', cancelEdit);
        if (resetDataButton) resetDataButton.addEventListener('click', handleResetData);
        if (checkForUpdatesButton) checkForUpdatesButton.addEventListener('click', handleCheckForUpdates);
        if (exportDataButton) exportDataButton.addEventListener('click', exportMeasurementData);
        if (importDataButton) importDataButton.addEventListener('click', () => importFileInput.click());
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

        // 이벤트 리스너 설정 부분에서 위 함수를 호출합니다.
        setupCarouselControls('sv-card-highlights');
        setupCarouselControls('sv-card-keeps');


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
        if (targetTab === activeModalTab) return; // 이미 활성화된 탭이면 무시

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
            const progress = item.progress !== null ? Math.round(item.progress) : '-';
            const progressClass = progress >= 100 ? 'target-achieved' : (progress > 0 ? 'positive-change' : '');
            return `
            <tr>
                <td>${translate(item.key)}</td>
                ${createProgressBarHTML(item)}
                <td class="${progressClass}">${progress}%</td>
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

});