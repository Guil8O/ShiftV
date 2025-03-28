// script.js for ShiftV App v1.3 (Modified based on request)
// Changes from v1.2:
// - Restored and adapted initial setup popup logic from v1.1.
// - Added 'showPopup' call in initial setup save handler.
// - Modified week calculation to be based on entry count (index) instead of date difference.
// - Ensured history table action buttons are sticky (using CSS, mechanism already present in v1.2 structure).
// - Corrected untranslated 'muscle_mass', 'body_fat_percentage' keys to use camelCase ('muscleMass', 'bodyFatPercentage') and ensure translation.
// - Added 'height' to target setting options.
// - Changed '메모'/'Notes' related texts to 'Keeps' in Korean and English, following v1.1.
// - Updated APP_VERSION to 1.3.

// Global Error Handler (v1.2 방식 유지)
window.onerror = function (message, source, lineno, colno, error) {
    console.error("🚨 Global Error:", message, "\nFile:", source, `\nLine:${lineno}:${colno}`, "\nError Obj:", error);
    // v1.3: Ensure translate function is available before calling
    const errorMessage = typeof translate === 'function'
        ? translate('unexpectedError', { message: message })
        : `An unexpected error occurred 😢 Check console (F12).\nError: ${message}`;
    alert(errorMessage);
};

// --- Language Data (i18n) ---
// (v1.1/v1.2 language data - 내용은 v1.2의 것을 유지하되, 'Keeps' 관련 수정 적용됨)
const languages = {
    ko: { // v1.3: '메모' -> 'Keeps' 관련 텍스트 수정
        // General
        save: "저장", edit: "수정", delete: "삭제", cancel: "취소",
        saveRecord: "기록하기 ✨", cancelEdit: "수정 취소", saveTarget: "목표 저장! 💪",
        saveNote: "Keeps 저장 🖋️", // Changed from "메모 저장"
        saveSettings: "설정 저장", close: "닫기",
        confirm: "확인", selectAll: "전체 선택", deselectAll: "전체 해제",
        noDataYet: "첫 기록을 남겨볼까요?",
        noNotesYet: "첫 Keeps를 남겨보세요!", // Changed from "메모"
        noTargetsYet: "설정된 목표가 없어요.", noDataForChart: "표시할 항목을 선택하거나 데이터를 입력하세요.",
        invalidValue: "유효하지 않은 값", loadingError: "데이터 로드 오류", savingError: "데이터 저장 오류",
        confirmReset: "정말로 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 측정 기록, 목표, Keeps가 영구적으로 삭제됩니다. 초기화 전에 데이터를 백업하는 것이 좋습니다.", // Changed from "메모"
        confirmDelete: "정말로 이 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
        confirmDeleteNote: "Keeps '{title}'을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.", // Changed from "메모"
        dataExported: "데이터가 파일로 저장되었습니다.", dataImported: "데이터를 성공적으로 불러왔습니다!",
        dataReset: "모든 데이터가 초기화되었습니다.", dataSaved: "저장 완료! 👍",
        noteSaved: "Keeps가 저장되었습니다.", // Changed from "메모"
        targetsSaved: "목표가 저장되었습니다.", settingsSaved: "설정이 저장되었습니다.", // v1.1에서 가져옴
        importError: "파일을 불러오는 중 오류 발생:", importSuccessRequiresReload: "데이터를 성공적으로 불러왔습니다. 변경사항을 적용하려면 페이지를 새로고침해주세요.",
        unexpectedError: "예상치 못한 오류가 발생했습니다 😢 콘솔(F12)을 확인해주세요.\n오류: {message}",
        alertInitError: "앱 초기화 중 오류 발생!", alertListenerError: "이벤트 리스너 설정 오류!",
        // v1.1에서 추가된 팝업 메시지 (v1.3에서 복원)
        popupSaveSuccess: "측정 기록 저장 완료! 🎉", popupUpdateSuccess: "측정 기록 수정 완료! ✨",
        popupDeleteSuccess: "측정 기록 삭제 완료 👍", popupTargetSaveSuccess: "목표 저장 완료! 👍",
        popupNoteSaveSuccess: "새 Keeps 저장 완료! 🎉", popupNoteUpdateSuccess: "Keeps 수정 완료! ✨",
        popupNoteDeleteSuccess: "Keeps 삭제 완료 👍", popupDataExportSuccess: "데이터 내보내기 성공! 🎉",
        popupDataImportSuccess: "데이터 가져오기 성공! ✨", popupDataResetSuccess: "모든 데이터가 초기화되었습니다. ✨",
        popupSettingsSaved: "설정 저장 완료! 👍", // Settings saved message
        alertValidationError: "유효하지 않은 입력 값이 있습니다. 빨간색 표시 필드를 확인해주세요. 숫자 값은 0 이상이어야 합니다.",
        alertNoteContentMissing: "Keeps 제목이나 내용을 입력해주세요!",
        alertImportConfirm: "현재 데이터를 덮어쓰고 가져온 데이터로 복원하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
        alertImportInvalidFile: "파일 형식이 올바르지 않거나 호환되지 않는 데이터입니다.",
        alertImportReadError: "파일 읽기/처리 중 오류 발생.", alertImportFileReadError: "파일 읽기 실패.",
        alertGenericError: "오류가 발생했습니다.", alertDeleteError: "삭제 중 오류 발생.",
        alertLoadError: "데이터 로드 중 오류 발생. 데이터가 손상되었을 수 있습니다. 콘솔 확인.",
        alertSaveError: "로컬 스토리지 저장 실패.", alertExportError: "데이터 내보내기 중 오류 발생.",
        // alertInitError: "앱 초기화 중 오류 발생. 새로고침 또는 데이터 초기화 필요.", // v1.2 버전 사용
        // alertListenerError: "페이지 인터랙션 설정 중 오류 발생. 일부 기능 미작동 가능.", // v1.2 버전 사용
        alertCannotFindRecordEdit: "수정할 기록 찾기 실패.", alertCannotFindRecordDelete: "삭제할 기록 찾기 실패.",
        alertInvalidIndex: "기록 처리 중 오류: 인덱스 오류.",
        alertCannotFindNoteEdit: "수정할 Keeps 찾기 실패.", alertCannotFindNoteDelete: "삭제할 Keeps 찾기 실패.",

        // Tabs
        tabInput: "측정 입력", tabHistory: "측정 기록", tabReport: "변화 리포트",
        tabTargets: "목표 설정",
        tabOverview: "Keeps", // Changed from "메모"
        tabSettings: "설정",
        // Input Tab
        formTitleNew: "측정 시작하기📏 (현재 {week}주차)", formTitleEdit: "측정 기록 수정 ({week}주차)", // 주차 계산 방식 변경됨
        inputDescription: "모든 항목은 선택 사항! 기록하고 싶은 것만 편하게 입력해주세요 😉",
        nextMeasurementInfoNoData: "마지막 측정일을 기준으로 다음 예정일을 계산해요.",
        nextMeasurementInfo: "마지막 측정: {lastDate} ({daysAgo}일 전) | 다음 측정 추천일: {nextDate} ({daysUntil}일 후)",
        nextMeasurementInfoToday: "마지막 측정: {lastDate} ({daysAgo}일 전) | 오늘 측정하는 날이에요!",
        nextMeasurementInfoOverdue: "마지막 측정: {lastDate} ({daysAgo}일 전) | 측정이 {daysOverdue}일 지났어요!",
        daysAgo: "{count}일 전", daysUntil: "{count}일 후", today: "오늘",
        categoryBodySize: "신체 사이즈 📐", categoryHealth: "건강 💪", categoryMedication: "마법 ✨",
        // Measurement Labels (v1.3: Correct keys for translation lookup)
        week: '주차', date: '날짜', timestamp: '기록 시간',
        height: '신장 (cm)', weight: '체중 (kg)', shoulder: '어깨너비 (cm)', neck: '목둘레 (cm)',
        chest: '가슴둘레 (cm)', cupSize: '컵 사이즈', cupSizePlaceholder: '예: 75A', waist: '허리둘레 (cm)', hips: '엉덩이둘레 (cm)',
        thigh: '허벅지둘레 (cm)', calf: '종아리둘레 (cm)', arm: '팔뚝둘레 (cm)',
        muscleMass: '근육량 (kg)', // Use camelCase key
        bodyFatPercentage: '체지방률 (%)', // Use camelCase key
        libido: '성욕 (회/주)', libidoPlaceholder: '회/주',
        semenStatus: '정액 상태', semenScore: '정액 점수', semenNotes: '정액 상세(텍스트)',
        healthStatus: '건강 상태', healthScore: '건강 점수', healthNotes: '건강 상세(텍스트)',
        skinCondition: '피부 상태', skinConditionPlaceholder: '예: 부드러워짐, 트러블 감소',
        estradiol: '에스트라디올 (mg)', progesterone: '프로게스테론 (mg)',
        antiAndrogen: '항안드로겐 (mg)', testosterone: '테스토스테론 (mg)',
        // Placeholders (수정됨)
        scorePlaceholder: "점수", notesPlaceholder: "특이사항",
        unitCm: "cm", unitKg: "kg", unitPercent: "%", unitMg: "mg",
        // History Tab
        historyTitle: "측정 기록 꼼꼼히 보기 🧐",
        historyDescription: "(표가 화면보다 넓으면 좌우로 스크롤해보세요!)",
        action: "작업", // v1.3: Used for sticky column header
        manageColumn: "관리", // v1.1 키 추가 (renderHistoryTable에서 사용)
        // Report Tab
        reportTitle: "나의 변화 리포트 📈",
        reportGraphTitle: "주차별 변화 그래프",
        reportGraphDesc: "보고 싶은 항목 버튼을 눌러 선택(활성)하거나 해제할 수 있어요. 여러 항목을 겹쳐 볼 수도 있답니다!",
        reportPrevWeekTitle: "지난주와 비교하면? 🤔",
        reportInitialTitle: "처음과 비교하면? 🌱➡️🌳",
        reportTargetTitle: "목표까지 얼마나 왔을까? 🎯",
        reportNeedTwoRecords: "데이터가 2개 이상 기록되어야 비교할 수 있어요.",
        reportNeedTarget: "먼저 '목표 설정' 탭에서 목표를 입력해주세요!",
        chartAxisLabel: "주차",
        comparisonItem: "항목",
        comparisonChange: "변화량",
        comparisonProgress: "달성률",
        targetAchieved: "달성 🎉",
        // Targets Tab
        targetTitle: "나만의 목표 설정 💖",
        targetDescription: "원하는 목표 수치를 입력해주세요. 리포트 탭에서 달성률을 확인할 수 있어요.",
        targetItem: "항목", targetValue: "목표값",
        // Overview (Keeps) Tab (v1.3: Changed from Notes/메모)
        overviewTitle: "Keeps 📝", // Changed from "메모"
        noteNewTitle: "새 Keeps 작성", // Changed from "새 메모 작성"
        noteEditTitle: "Keeps 수정", // Changed from "메모 수정"
        noteTitleLabel: "제목",
        noteTitlePlaceholder: "Keeps 제목 (선택)", // Changed from "메모 제목"
        noteContentLabel: "내용",
        noteContentPlaceholder: "이벤트, 몸 상태, 생각 등 자유롭게 Keeps에 기록해요!", // Changed from "메모"
        noteListTitle: "작성된 Keeps 목록 ✨", // Changed from "메모 목록"
        noteTitleUntitled: "제목 없음", // Keep consistent or change if needed
        sortBy: "정렬:", sortNewest: "최신 순", sortOldest: "오래된 순",
        noteDateCreated: "작성:", // v1.1 키 추가 (renderNotesList에서 사용)
        noteDateUpdated: "(수정: {date})", // v1.1 키 추가 (renderNotesList에서 사용)
        notePreviewEmpty: "내용을 적어 보세요", // v1.1 키 추가 (renderNotesList에서 사용)
        // Settings Tab
        settingsTitle: "설정 ⚙️",
        languageSettingsTitle: "언어 설정", language: "언어",
        modeSettingsTitle: "성 선호 설정", modeSettingsDesc: "목표하는 신체 변화 방향을 선택해주세요.",
        mode: "성 선호", modeMtf: "여성화", modeFtm: "남성화",
        dataManagementTitle: "데이터 백업 & 복원",
        dataManagementDesc: "모든 기록(측정, 목표, Keeps)을 파일 하나로 저장하거나 복원할 수 있어요. 가끔 백업해두면 안심이에요! 😊", // Changed from "메모"
        exportData: "파일 저장하기", importData: "파일 불러오기",
        warning: "주의!", importWarning: "복원하면 지금 앱앱에 있는 모든 데이터가 파일 내용으로 완전히 대체돼요!",
        resetDataTitle: "데이터 초기화",
        severeWarning: "정말정말 주의!", resetWarning: "😱 모든 데이터(측정, 목표, Keeps)가 영구적으로 삭제됩니다! 초기화 전에 꼭! 데이터를 파일로 백업해주세요.", // Changed from "메모"
        resetDataButton: "모든 데이터 초기화",
        infoTitle: "정보", versionLabel: "버전:",
        privacyInfo: "이 앱은 오프라인 작동하며 모든 데이터는 앱앱에만 안전하게 저장됩니다! 😉",
        developerMessage: "이 작은 도구가 당신의 소중한 여정에 즐거움과 도움이 되기를 바라요!",
        // Initial Setup (v1.1 내용 복원 및 v1.2 요소에 맞게 조정)
        initialSetupTitle: "초기 설정",
        initialSetupDesc: "ShiftV 사용을 시작하기 전에 언어와 성 선호 설정정을 선택해주세요.", // v1.2 요소명 반영
        // Swipe feature (from v1.2)
        swipeThresholdMet: "스와이프 감지: {direction}" // Not directly shown to user usually
    },
    en: { // v1.3: 'Notes' -> 'Keeps' related text changes
        // General
        save: "Save", edit: "Edit", delete: "Delete", cancel: "Cancel",
        saveRecord: "Record ✨", cancelEdit: "Cancel Edit", saveTarget: "Save Targets! 💪",
        saveNote: "Save Keeps 🖋️", // Changed from "Save Note"
        saveSettings: "Save Settings", close: "Close",
        confirm: "Confirm", selectAll: "Select All", deselectAll: "Deselect All",
        noDataYet: "Let's add the first record!",
        noNotesYet: "No Keeps written yet. Let's add the first Keeps!", // Changed from "Notes"
        noTargetsYet: "No targets set.", noDataForChart: "Select items to display or enter data.",
        invalidValue: "Invalid value", loadingError: "Data loading error", savingError: "Data saving error",
        confirmReset: "Are you absolutely sure you want to reset all data? This action cannot be undone and will permanently delete all measurement records, targets, and Keeps. It is highly recommended to back up your data before proceeding.", // Changed from "notes"
        confirmDelete: "Are you sure you want to delete this record? This action cannot be undone.",
        confirmDeleteNote: "Delete Keeps \"{title}\"? This cannot be undone.", // Changed from "note"
        dataExported: "Data exported to file.", dataImported: "Data imported successfully!",
        dataReset: "All data has been reset.", dataSaved: "Saved!👍",
        noteSaved: "Keeps saved.👍", // Changed from "Note"
        targetsSaved: "Targets saved.👍", settingsSaved: "Settings saved.👍",
        importError: "Error importing file:", importSuccessRequiresReload: "Data imported successfully. Please reload the page to apply changes.",
        unexpectedError: "An unexpected error occurred 😢 Check console (F12).\nError: {message}",
        alertInitError: "Error during app initialization!", alertListenerError: "Error setting up event listeners!",
        // v1.1 popup messages restored
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
        tabInput: "Input", tabHistory: "History", tabReport: "Report",
        tabTargets: "Targets",
        tabOverview: "Keeps", // Changed from "Notes"
        tabSettings: "Settings",
        // Input Tab
        formTitleNew: "Start Measuring📏 (Current Week {week})", formTitleEdit: "Edit Measurement Record (Week {week})", // Week calculation changed
        inputDescription: "All fields are optional! Feel free to enter only what you want to track 😉",
        nextMeasurementInfoNoData: "Calculates the next recommended date based on the last measurement.",
        nextMeasurementInfo: "Last: {lastDate} ({daysAgo} ago) | Next recommended: {nextDate} ({daysUntil} away)",
        nextMeasurementInfoToday: "Last: {lastDate} ({daysAgo} ago) | Today is measurement day!",
        nextMeasurementInfoOverdue: "Last: {lastDate} ({daysAgo} ago) | Measurement is {daysOverdue} days overdue!",
        daysAgo: "{count} days ago", daysUntil: "{count} days left", today: "Today",
        categoryBodySize: "Body Size 📐", categoryHealth: "Health 💪", categoryMedication: "Magic ✨",
        // Measurement Labels (v1.3: Correct keys for translation lookup)
        week: 'Week', date: 'Date', timestamp: 'Timestamp',
        height: 'Height (cm)', weight: 'Weight (kg)', shoulder: 'Shoulder Width (cm)', neck: 'Neck Circum. (cm)',
        chest: 'Chest Circum. (cm)', cupSize: 'Cup Size', cupSizePlaceholder: 'e.g., 34A', waist: 'Waist Circum. (cm)', hips: 'Hip Circum. (cm)',
        thigh: 'Thigh Circum. (cm)', calf: 'Calf Circum. (cm)', arm: 'Arm Circum. (cm)',
        muscleMass: 'Muscle Mass (kg)', // Use camelCase key
        bodyFatPercentage: 'Body Fat (%)', // Use camelCase key
        libido: 'Libido (freq/wk)', libidoPlaceholder: 'freq/week',
        semenStatus: 'Semen Status', semenScore: 'Semen Score', semenNotes: 'Semen Detail(text)', // Changed from "Notes"
        healthStatus: 'Health Status', healthScore: 'Health Score', healthNotes: 'Health Detail(text)', // Changed from "Notes"
        skinCondition: 'Skin Condition', skinConditionPlaceholder: 'e.g., Softer, Less acne',
        estradiol: 'Estradiol (mg)', progesterone: 'Progesterone (mg)',
        antiAndrogen: 'Anti-androgen (mg)', testosterone: 'Testosterone (mg)',
        // Placeholders (Revised)
        scorePlaceholder: "Score", notesPlaceholder: "Notes", // Common placeholders
        unitCm: "cm", unitKg: "kg", unitPercent: "%", unitMg: "mg",
        // History Tab
        historyTitle: "Measurement History 🧐",
        historyDescription: "(If the table is wider than the screen, scroll horizontally!)",
        action: "Actions", // v1.3: Used for sticky column header
        manageColumn: "Manage", // v1.1 key added
        // Report Tab
        reportTitle: "My Change Report 📈",
        reportGraphTitle: "Weekly Change Graph",
        reportGraphDesc: "Select (activate) or deselect items by clicking the buttons. You can overlay multiple items!",
        reportPrevWeekTitle: "Compared to Last Week? 🤔",
        reportInitialTitle: "Compared to the Beginning? 🌱➡️🌳",
        reportTargetTitle: "How Close to the Target? 🎯",
        reportNeedTwoRecords: "At least two records are needed for comparison.",
        reportNeedTarget: "Please set your targets in the 'Targets' tab first!",
        chartAxisLabel: "Week",
        comparisonItem: "Item",
        comparisonChange: "Change",
        comparisonProgress: "Progress",
        targetAchieved: "Achieved 🎉",
        // Targets Tab
        targetTitle: "Set Your Personal Goals 💖",
        targetDescription: "Enter your desired target values. You can check the progress in the Report tab.",
        targetItem: "Item", targetValue: "Target Value",
        // Overview (Keeps) Tab (v1.3: Changed from Notes)
        overviewTitle: "Keeps 📝", // Changed from "Notes"
        noteNewTitle: "New Keeps", // Changed from "New Note"
        noteEditTitle: "Edit Keeps", // Changed from "Edit Note"
        noteTitleLabel: "Title",
        noteTitlePlaceholder: "Keeps title (optional)", // Changed from "Note title"
        noteContentLabel: "Content",
        noteContentPlaceholder: "Record anything - events, body changes, thoughts in Keeps!", // Changed from "Note content"
        noteListTitle: "Saved Keeps ✨", // Changed from "Saved Notes"
        noteTitleUntitled: "Untitled", // Keep consistent or change if needed
        sortBy: "Sort by:", sortNewest: "Newest First", sortOldest: "Oldest First",
        noteDateCreated: "Created:", // v1.1 key added
        noteDateUpdated: "(Edited: {date})", // v1.1 key added
        notePreviewEmpty: "(No content)", // v1.1 key added
        // Settings Tab
        settingsTitle: "Settings ⚙️",
        languageSettingsTitle: "Language Settings", language: "Language",
        modeSettingsTitle: "Sexual Selection Settings", modeSettingsDesc: "Select the direction of physical changes you are aiming for.",
        mode: "Sexual Selection", modeMtf: "Feminization", modeFtm: "Masculinization",
        dataManagementTitle: "Data Backup & Restore",
        dataManagementDesc: "You can save all your records (measurements, targets, Keeps) to a single file or restore from one. Backing up occasionally gives peace of mind! 😊", // Changed from "notes"
        exportData: "Export Data", importData: "Import Data",
        warning: "Warning!", importWarning: "Restoring will completely replace all data currently in your browser with the file's content!",
        resetDataTitle: "Reset Data",
        severeWarning: "Extreme Caution!", resetWarning: "😱 All data (measurements, targets, Keeps) will be permanently deleted! Please back up your data before proceeding.", // Changed from "notes"
        resetDataButton: "Reset All Data",
        infoTitle: "Information", versionLabel: "Version:",
        privacyInfo: "This app works offline and all data is stored securely only in your browser! 😉",
        developerMessage: "Hope this little tool brings joy and help to your precious journey!",
        // Initial Setup (v1.1 content restored, adapted for v1.2 elements)
        initialSetupTitle: "Initial Setup",
        initialSetupDesc: "Before starting ShiftV, please select your language and Sexual Selection.", // Reflects v1.2 elements
        // Swipe feature (from v1.2)
        swipeThresholdMet: "Swipe detected: {direction}" // Not directly shown to user usually
    },
    ja: { // v1.3: Japanese translations remain mostly unchanged from v1.2 unless 'memo' needs specific changing. Assuming 'メモ' is correct. Keeps' 관련 변경 확인 필요 시 추가 수정
        // General
        save: "保存", edit: "編集", delete: "削除", cancel: "キャンセル",
        saveRecord: "記録する ✨", cancelEdit: "編集をキャンセル", saveTarget: "目標を保存! 💪",
        saveNote: "メモを保存 🖋️", // 'Keeps'로 변경할지 확인 필요
        saveSettings: "設定を保存", close: "閉じる",
        confirm: "確認", selectAll: "すべて選択", deselectAll: "すべて解除",
        noDataYet: "最初の記録を残しましょうか？",
        noNotesYet: "まだ作成されたメモがありません。最初のメモを残しましょうか？", // 'Keeps'로 변경할지 확인 필요
        noTargetsYet: "目標が設定されていません。", noDataForChart: "表示する項目を選択するか、データを入力してください。",
        invalidValue: "無効な値", loadingError: "データの読み込みエラー", savingError: "データの保存エラー",
        confirmReset: "本当にすべてのデータを初期化しますか？ この操作は元に戻すことができず、すべての測定記録、目標、メモが完全に削除されます。初期化する前にデータをバックアップすることを強くお勧めします。", // 'Keeps'로 변경할지 확인 필요
        confirmDelete: "本当にこの記録を削除しますか？ この操作は元に戻せません。",
        confirmDeleteNote: "メモ「{title}」を削除しますか？ この操作は元に戻せません。", // 'Keeps'로 변경할지 확인 필요
        dataExported: "データがファイルに保存されました。", dataImported: "データが正常に読み込まれました！",
        dataReset: "すべてのデータが初期化されました。", dataSaved: "保存されました！",
        noteSaved: "メモが保存されました。", // 'Keeps'로 변경할지 확인 필요
        targetsSaved: "目標が保存されました。", settingsSaved: "設定が保存されました。",
        importError: "ファイルの読み込み中にエラーが発生しました:", importSuccessRequiresReload: "データが正常に読み込まれました。変更を適用するにはページを再読み込みしてください。",
        unexpectedError: "予期しないエラーが発生しました 😢 コンソール（F12）を確認してください。\nエラー: {message}",
        alertInitError: "アプリの初期化中にエラーが発生しました！", alertListenerError: "イベントリスナーの設定中にエラーが発生しました！",
        // v1.1 popup messages restored
        popupSaveSuccess: "測定記録 保存完了！🎉", popupUpdateSuccess: "測定記録 更新完了！✨",
        popupDeleteSuccess: "測定記録 削除完了 👍", popupTargetSaveSuccess: "目標 保存完了！👍",
        popupNoteSaveSuccess: "新規メモ 保存完了！🎉", popupNoteUpdateSuccess: "メモ 更新完了！✨", // 'Keeps'로 변경할지 확인 필요
        popupNoteDeleteSuccess: "メモ 削除完了 👍", popupDataExportSuccess: "データ エクスポート成功！🎉", // 'Keeps'로 변경할지 확인 필요
        popupDataImportSuccess: "データ インポート成功！✨", popupDataResetSuccess: "全データ リセット完了。 ✨",
        popupSettingsSaved: "設定 保存完了！",
        alertValidationError: "無効な入力値あり。赤色箇所を確認。数値は0以上必須。",
        alertNoteContentMissing: "メモのタイトルか内容を入力してください！", // 'Keeps'로 변경할지 확인 필요
        alertImportConfirm: "現在のデータを上書きしファイルから復元しますか？元に戻せません。",
        alertImportInvalidFile: "ファイル形式が無効か互換性がありません",
        alertImportReadError: "ファイル読込/処理エラー", alertImportFileReadError: "ファイル読込失敗",
        alertGenericError: "エラー発生", alertDeleteError: "削除中エラー",
        alertLoadError: "データ読込エラー。データ破損の可能性あり。コンソール確認",
        alertSaveError: "保存失敗", alertExportError: "エクスポート中エラー",
        alertCannotFindRecordEdit: "編集対象記録なし", alertCannotFindRecordDelete: "削除対象記録なし",
        alertInvalidIndex: "記録処理エラー：インデックス無効",
        alertCannotFindNoteEdit: "編集対象メモなし", alertCannotFindNoteDelete: "削除対象メモなし", // 'Keeps'로 변경할지 확인 필요

        // Tabs
        tabInput: "測定入力", tabHistory: "測定記録", tabReport: "変化レポート",
        tabTargets: "目標設定", tabOverview: "メモ", tabSettings: "設定", // 'Keeps'로 변경할지 확인 필요
        // Input Tab
        formTitleNew: "測定開始📏（現在{week}週目）", formTitleEdit: "測定記録を編集（{week}週目）", // Week calculation changed
        inputDescription: "すべての項目は任意です！記録したいものだけ気軽に入力してください 😉",
        nextMeasurementInfoNoData: "最終測定日を基準に次の予定日を計算します。",
        nextMeasurementInfo: "最終測定: {lastDate} ({daysAgo}日前) | 次回推奨日: {nextDate} ({daysUntil}日後)",
        nextMeasurementInfoToday: "最終測定: {lastDate} ({daysAgo}日前) | 今日は測定日です！",
        nextMeasurementInfoOverdue: "最終測定: {lastDate} ({daysAgo}日前) | 測定が{daysOverdue}日遅れています！",
        daysAgo: "{count}日前", daysUntil: "{count}日後", today: "今日",
        categoryBodySize: "身体サイズ 📐", categoryHealth: "健康 💪", categoryMedication: "魔法 ✨",
        // Measurement Labels (v1.3: Correct keys for translation lookup)
        week: '週目', date: '日付', timestamp: '記録時間',
        height: '身長 (cm)', weight: '体重 (kg)', shoulder: '肩幅 (cm)', neck: '首周り (cm)',
        chest: '胸囲 (cm)', cupSize: 'カップサイズ', cupSizePlaceholder: '例: C70', waist: '腹囲 (cm)', hips: 'ヒップ (cm)',
        thigh: '太もも周り (cm)', calf: 'ふくらはぎ周り (cm)', arm: '腕周り (cm)',
        muscleMass: '筋肉量 (kg)', // Use camelCase key
        bodyFatPercentage: '体脂肪率 (%)', // Use camelCase key
        libido: '性欲 (回/週)', libidoPlaceholder: '回/週',
        semenStatus: '精液の状態', semenScore: '精液スコア', semenNotes: '精液状態(テキスト)', // 'Keeps'로 변경할지 확인 필요
        healthStatus: '健康状態', healthScore: '健康スコア', healthNotes: '健康状態(テキスト)', // 'Keeps'로 변경할지 확인 필요
        skinCondition: '肌の状態', skinConditionPlaceholder: '例: 柔らかくなった、ニキビが減った',
        estradiol: 'エストラジオール (mg)', progesterone: 'プロゲステロン (mg)',
        antiAndrogen: '抗アンドロゲン (mg)', testosterone: 'テストステロン (mg)',
        // Placeholders (Revised)
        scorePlaceholder: "点数", notesPlaceholder: "特記事項", // Common placeholders
        unitCm: "cm", unitKg: "kg", unitPercent: "%", unitMg: "mg",
        // History Tab
        historyTitle: "測定記録の詳細 🧐",
        historyDescription: "（表が画面より広い場合は、左右にスクロールしてください！）",
        action: "操作", // v1.3: Used for sticky column header
        manageColumn: "管理", // v1.1 key added
        // Report Tab
        reportTitle: "私の変化レポート 📈",
        reportGraphTitle: "週ごとの変化グラフ",
        reportGraphDesc: "見たい項目のボタンを押して選択（アクティブ化）または解除できます。複数の項目を重ねて表示することも可能です！",
        reportPrevWeekTitle: "先週と比較すると？ 🤔",
        reportInitialTitle: "最初と比較すると？ 🌱➡️🌳",
        reportTargetTitle: "目標まであとどれくらい？ 🎯",
        reportNeedTwoRecords: "比較するには、少なくとも2つの記録が必要です。",
        reportNeedTarget: "まず「目標設定」タブで目標を入力してください！",
        chartAxisLabel: "週目",
        comparisonItem: "項目",
        comparisonChange: "変化量",
        comparisonProgress: "達成率",
        targetAchieved: "達成 🎉",
        // Targets Tab
        targetTitle: "自分だけの目標設定 💖",
        targetDescription: "希望する目標数値を入力してください。レポートタブで達成率を確認できます。",
        targetItem: "項目", targetValue: "目標値",
        // Overview (Notes) Tab
        overviewTitle: "メモ 📝", // 'Keeps'로 변경할지 확인 필요
        noteNewTitle: "新しいメモを作成", noteEditTitle: "メモを編集", // 'Keeps'로 변경할지 확인 필요
        noteTitleLabel: "タイトル", noteTitlePlaceholder: "メモのタイトル（任意）", // 'Keeps'로 변경할지 확인 필요
        noteContentLabel: "内容", noteContentPlaceholder: "イベント、体調の変化、考えなど、自由に記録しましょう！", // 'Keeps'로 변경할지 확인 필요
        noteListTitle: "作成されたメモ一覧 ✨", // 'Keeps'로 변경할지 확인 필요
        noteTitleUntitled: "無題",
        sortBy: "並び替え:", sortNewest: "新しい順", sortOldest: "古い順",
        noteDateCreated: "作成:", // v1.1 key added
        noteDateUpdated: "(編集: {date})", // v1.1 key added
        notePreviewEmpty: "(内容なし)", // v1.1 key added
        // Settings Tab
        settingsTitle: "設定 ⚙️",
        languageSettingsTitle: "言語設定", language: "言語",
        modeSettingsTitle: "性的指向設定", modeSettingsDesc: "目指す身体の変化の方向を選択してください。",
        mode: "性的指向", modeMtf: "女性化", modeFtm: "男性化",
        dataManagementTitle: "データのバックアップと復元",
        dataManagementDesc: "すべての記録（測定、目標、メモ）を1つのファイルに保存したり、復元したりできます。時々バックアップしておくと安心です！ 😊", // 'Keeps'로 변경할지 확인 필요
        exportData: "ファイルに保存", importData: "ファイルから読み込む",
        warning: "注意！", importWarning: "復元すると、現在ブラウザにあるすべてのデータがファイルの内容に完全に置き換えられます！",
        resetDataTitle: "データ初期化",
        severeWarning: "！！！警告！！！", resetWarning: "😱 すべてのデータ（測定、目標、メモ）が完全に削除されます！ 初期化する前に必ずデータをファイルにバックアップしてください。", // 'Keeps'로 변경할지 확인 필요
        resetDataButton: "すべてのデータを初期化",
        infoTitle: "情報", versionLabel: "バージョン:",
        privacyInfo: "このアプリはオフラインで動作し、すべてのデータはブラウザ内にのみ安全に保存されます！ 😉",
        developerMessage: "この小さなツールが、あなたの貴重な旅に喜びと助けをもたらすことを願っています！",
        // Initial Setup (v1.1 content restored, adapted for v1.2 elements)
        initialSetupTitle: "初期設定",
        initialSetupDesc: "ShiftVを使用する前に、言語と性的指向を選択してください。", // Reflects v1.2 elements
        // Swipe feature (from v1.2)
        swipeThresholdMet: "スワイプ検出: {direction}" // Not directly shown to user usually
    }
};

// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: ShiftV App Initializing v1.0 (Modified)...");

    // --- State Variables ---
    const PRIMARY_DATA_KEY = 'shiftV_Data_v1_1'; // 데이터 구조 변경 없으면 유지
    const SETTINGS_KEY = 'shiftV_Settings_v1_0'; // 설정 구조 변경 없으면 유지
    const APP_VERSION = "1.0"; // v1.0: 버전 업데이트
    let chartInstance = null;
    let measurements = [];
    let targets = {};
    let notes = [];
    let currentNoteSortOrder = 'newest';
    let selectedMetrics = ['weight']; // Default selection
    let currentLanguage = 'ko';
    let currentMode = 'mtf';
    let isInitialSetupDone = false;
    let lastScrollY = window.scrollY; // For scroll-based tab bar hiding (optional)
    let isTabBarCollapsed = false; // For scroll-based tab bar hiding (optional)

    // --- DOM Element References ---
    const mainTitle = document.querySelector('#main-title');
    const tabBar = document.querySelector('.tab-bar');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContentsContainer = document.querySelector('.tab-contents');
    const tabContents = document.querySelectorAll('.tab-content');
    const savePopup = document.getElementById('save-popup'); // v1.3: Reference for popup
    const versionDisplays = document.querySelectorAll('#app-version-display, #app-version-display-footer');
    const bodyElement = document.body;
    // Initial Setup Popup (v1.1/v1.2 참조 유지)
    const initialSetupPopup = document.getElementById('initial-setup-popup');
    const initialLanguageSelect = document.getElementById('initial-language-select');
    const initialModeSelect = document.getElementById('initial-mode-select'); // v1.2에서는 select 요소 사용
    const initialSetupSaveBtn = document.getElementById('initial-setup-save');
    // Input Tab
    const form = document.getElementById('measurement-form');
    const formTitle = document.getElementById('form-title');
    const saveUpdateBtn = document.getElementById('save-update-button');
    const cancelEditBtn = document.getElementById('cancel-edit-button');
    const editIndexInput = document.getElementById('edit-index');
    const currentWeekSpan = document.getElementById('current-week');
    const nextMeasurementInfoDiv = document.getElementById('next-measurement-info');
    const inputDescriptionP = document.querySelector('#tab-input .description');
    // History Tab
    const historyContainer = document.getElementById('history-table-container');
    const historyDescriptionP = document.querySelector('#tab-history .description');
    const historyTitleH2 = document.querySelector('#tab-history h2');
    // Report Tab
    const reportTitleH2 = document.querySelector('#tab-change-report h2');
    const reportGraphTitleH3 = document.getElementById('report-graph-title');
    const reportGraphDescP = document.getElementById('report-graph-description');
    const reportPrevWeekTitleH3 = document.getElementById('prev-week-comparison-title');
    const reportInitialTitleH3 = document.getElementById('initial-comparison-title');
    const reportTargetTitleH3 = document.getElementById('target-comparison-title');
    const prevWeekComparisonContainer = document.getElementById('prev-week-comparison-container');
    const initialComparisonContainer = document.getElementById('initial-comparison-container');
    const targetComparisonContainer = document.getElementById('target-comparison-container');
    const chartCanvas = document.getElementById('measurement-chart');
    const chartContainer = document.querySelector('.chart-container');
    const chartSelector = document.getElementById('chart-selector');
    const selectAllChartsBtn = document.getElementById('select-all-charts');
    const deselectAllChartsBtn = document.getElementById('deselect-all-charts');
    // Targets Tab
    const targetForm = document.getElementById('target-form');
    const targetTitleH2 = document.querySelector('#tab-targets h2');
    const targetDescriptionP = document.querySelector('#tab-targets .description');
    let targetGrid = targetForm ? targetForm.querySelector('.target-grid') : null;
    const saveTargetsButton = document.getElementById('save-targets-button');
    // Overview (Keeps) Tab (v1.3: Renamed from Notes)
    const overviewTitleH2 = document.querySelector('#tab-overview h2');
    const noteFormArea = document.getElementById('note-form-area');
    const noteTitleInput = document.getElementById('note-title');
    const noteContentInput = document.getElementById('note-content');
    const saveNoteButton = document.getElementById('save-note-button');
    const noteSortOrderSelect = document.getElementById('note-sort-order');
    const notesListContainer = document.getElementById('notes-list-container');
    const noteFormTitle = document.getElementById('note-form-title');
    const editNoteIdInput = document.getElementById('edit-note-id');
    const cancelEditNoteBtn = document.getElementById('cancel-edit-note-button');
    const noteListTitleH3 = document.getElementById('note-list-title');
    const sortLabel = document.querySelector('label[for="note-sort-order"]');
    const noteTitleLabel = document.querySelector('label[for="note-title"]');
    const noteContentLabel = document.querySelector('label[for="note-content"]');
    // Settings Tab
    const settingsTitleH2 = document.querySelector('#tab-settings h2');
    const langSettingsTitleH3 = document.getElementById('language-settings-title');
    const modeSettingsTitleH3 = document.getElementById('mode-settings-title');
    const modeSettingsDescP = document.getElementById('mode-settings-description');
    const dataMgmtTitleH3 = document.getElementById('data-management-title');
    const dataMgmtDescP = document.getElementById('data-management-description');
    const resetDataTitleH3 = document.getElementById('reset-data-title');
    const resetWarningP = document.getElementById('reset-data-warning');
    const infoTitleH3 = document.getElementById('info-title');
    const privacyInfoP = document.getElementById('privacy-info');
    const devMessageP = document.getElementById('developer-message');
    const swInfoP = document.getElementById('sw-info');
    const resetDataButton = document.getElementById('reset-data-button');
    const exportDataButton = document.getElementById('export-data-button');
    const importDataButton = document.getElementById('import-data-button');
    const importFileInput = document.getElementById('import-file-input');
    const languageSelect = document.getElementById('language-select');
    const modeSelect = document.getElementById('mode-select'); // v1.2 mode select
    const langLabel = document.querySelector('label[for="language-select"]');
    const modeLabel = document.querySelector('label[for="mode-select"]');

    console.log("DEBUG: DOM elements fetched.");

    // --- Constants for Measurement Keys (v1.3: Use camelCase for consistency) ---
    const bodySizeKeys = ['height', 'weight', 'shoulder', 'neck', 'chest', 'cupSize', 'waist', 'hips', 'thigh', 'calf', 'arm'];
    const healthKeys = ['muscleMass', 'bodyFatPercentage', 'libido', 'semenScore', 'healthScore', 'skinCondition', 'semenNotes', 'healthNotes']; // Use camelCase
    const medicationKeys_MtF = ['estradiol', 'progesterone', 'antiAndrogen'];
    const medicationKeys_FtM = ['testosterone'];
    const baseNumericKeys = [
        'height', 'weight', 'shoulder', 'neck', 'chest', 'waist', 'hips', 'thigh', 'calf', 'arm',
        'muscleMass', 'bodyFatPercentage', 'libido', 'semenScore', 'healthScore', // Use camelCase
        'estradiol', 'progesterone', 'antiAndrogen', 'testosterone'
    ];
    const textKeys = ['cupSize', 'semenNotes', 'healthNotes', 'skinCondition'];
    // 기록(History) 탭 표시에 사용될 순서
    const displayKeysInOrder = [
        'week', 'date', // 날짜와 주차를 맨 앞에 표시 (주차 계산 방식 변경됨)
        'height', 'weight', 'shoulder', 'neck', 'chest', 'cupSize', 'waist', 'hips', 'thigh', 'calf', 'arm',
        'muscleMass', 'bodyFatPercentage', 'libido', 'skinCondition', 'healthScore', 'healthNotes', // Use camelCase
        'semenScore', 'semenNotes', // Use camelCase
        'estradiol', 'progesterone', 'antiAndrogen', 'testosterone',
        'timestamp' // 기록 시간은 맨 뒤에 (필요시)
    ];
    // 차트에서 선택 가능한 숫자 항목 (점수 제외)
    const chartSelectableKeys = baseNumericKeys.filter(k => !k.includes('Score')); // Adjusted for camelCase
    // 목표 설정에서 사용 가능한 숫자 항목 (v1.3: 'height' 포함)
    const targetSettingKeys = baseNumericKeys.filter(k =>
        bodySizeKeys.includes(k) || ['muscleMass', 'bodyFatPercentage'].includes(k) // Use camelCase
    ).filter(k => !textKeys.includes(k)); // v1.3: Allow height for target setting
    // 비교표에 표시할 주요 항목들 (순서 중요)
    const comparisonKeys = [
        'weight', 'muscleMass', 'bodyFatPercentage', // Use camelCase
        'shoulder', 'neck', 'chest', 'waist', 'hips', 'thigh', 'calf', 'arm'
        // 필요에 따라 다른 numeric key 추가 가능
    ];

    console.log("DEBUG: Measurement keys defined (camelCase).");


    // --- Utility Functions ---

    // iOS 감지 함수 추가 (v1.2 유지)
    function isIOS() {
        return [
            'iPad Simulator', 'iPhone Simulator', 'iPod Simulator',
            'iPad', 'iPhone', 'iPod'
        ].includes(navigator.platform)
        || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
    }

    function translate(key, params = {}) {
        const langData = languages[currentLanguage] || languages.ko;
        let text = langData[key] || key; // 키가 없으면 키 자체를 반환
        for (const p in params) {
            const regex = new RegExp(`\\{${p}\\}`, 'g');
            text = text.replace(regex, params[p]);
        }
        return text;
    }

    // Placeholder 문제 해결을 포함한 translateUI 수정 (v1.2 기반, 일부 수정)
    function translateUI() {
        console.log(`DEBUG: Translating UI to ${currentLanguage}`);
        document.documentElement.lang = currentLanguage.split('-')[0]; // Set HTML lang attribute

        // Translate all elements with data-lang-key attribute
        document.querySelectorAll('[data-lang-key]').forEach(el => {
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

                // Handle placeholders specifically
                if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder !== undefined) {
                    let placeholderText = '';
                    const placeholderKey = key + 'Placeholder'; // e.g., cupSizePlaceholder
    
                    // --- Revised Logic ---
                    // 1. Check for specific placeholder key (e.g., cupSizePlaceholder, skinConditionPlaceholder, libidoPlaceholder)
                }
                // Handle other element types
                else if (el.tagName === 'BUTTON' || el.tagName === 'OPTION' || el.tagName === 'LEGEND' || el.tagName === 'LABEL' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'P' || el.tagName === 'SPAN' || el.tagName === 'STRONG' || el.tagName === 'TD' || el.tagName === 'TH') {
                     // Avoid overwriting complex elements, target specific classes or simple elements
                     if (!el.querySelector('span:not(.unit)') && !el.querySelector('strong') && el.children.length === 0 || el.classList.contains('description') || el.classList.contains('table-title') || el.classList.contains('tab-button') || el.tagName === 'BUTTON' || el.tagName === 'OPTION' || el.tagName === 'LEGEND' || el.classList.contains('form-title')) { // Added form-title
                        el.textContent = translation;
                    } else if (el.tagName === 'LABEL' && el.htmlFor) { // Special handling for labels to keep units if necessary
                         let content = translation;
                         // Let's try just setting textContent for labels for now
                         el.textContent = content;
                    }
                } else if (el.tagName === 'IMG') {
                    if (el.alt !== undefined) el.alt = translation;
                }

            } catch (e) {
                console.error(`Error translating element with key "${key}":`, e, el);
            }
        });

        // --- Specific Element Updates (using translate function) ---
        if (resetWarningP) resetWarningP.innerHTML = `<strong>${translate('severeWarning')}</strong> ${translate('resetWarning')}`;
        if (saveUpdateBtn) saveUpdateBtn.textContent = translate(editIndexInput.value === '' ? 'saveRecord' : 'edit');
        if (saveNoteButton) saveNoteButton.textContent = translate(editNoteIdInput.value === '' ? 'saveNote' : 'edit'); // v1.3 Use saveNote key -> "Keeps 저장"
        if (cancelEditBtn) cancelEditBtn.textContent = translate('cancelEdit');
        if (cancelEditNoteBtn) cancelEditNoteBtn.textContent = translate('cancelEdit'); // Shared 'cancelEdit' key
        if (selectAllChartsBtn) selectAllChartsBtn.textContent = translate('selectAll');
        if (deselectAllChartsBtn) deselectAllChartsBtn.textContent = translate('deselectAll');
        if (saveTargetsButton) saveTargetsButton.textContent = translate('saveTarget');
        if (exportDataButton) exportDataButton.textContent = translate('exportData');
        if (importDataButton) importDataButton.textContent = translate('importData');
        if (resetDataButton) resetDataButton.textContent = translate('resetDataButton');
        if (initialSetupSaveBtn) initialSetupSaveBtn.textContent = translate('saveSettings'); // Initial setup button

        // Dynamic Titles
        updateFormTitle(); // Recalculates week and translates
        if (noteFormTitle) noteFormTitle.textContent = translate(editNoteIdInput.value === '' ? 'noteNewTitle' : 'noteEditTitle'); // v1.3 Use note keys -> "새 Keeps 작성" / "Keeps 수정"

        // Update Select options and ensure correct value is selected
        [languageSelect, initialLanguageSelect].forEach(select => {
            if (select) {
                Array.from(select.options).forEach(option => {
                    const key = option.value; // 'ko', 'en', 'ja'
                    if (key === 'ko') option.textContent = '한국어';
                    else if (key === 'en') option.textContent = 'English';
                    else if (key === 'ja') option.textContent = '日本語';
                });
                if (select.id === 'language-select') select.value = currentLanguage;
             }
        });
        [modeSelect, initialModeSelect].forEach(select => { // v1.2 uses select for mode
             if (select) {
                Array.from(select.options).forEach(option => {
                    const key = option.value === 'mtf' ? 'modeMtf' : 'modeFtm';
                    option.textContent = translate(key);
                });
                 if (select.id === 'mode-select') select.value = currentMode;
            }
        });
        if (noteSortOrderSelect) {
             Array.from(noteSortOrderSelect.options).forEach(option => {
                const key = option.value === 'newest' ? 'sortNewest' : 'sortOldest';
                option.textContent = translate(key);
            });
            noteSortOrderSelect.value = currentNoteSortOrder;
        }


        // Re-render components that depend on language
        console.log("DEBUG: Re-rendering components after translation...");
        renderChartSelector(); // Update button text/colors
        setupTargetInputs(true); // Update target input labels/placeholders
        renderHistoryTable(); // Update table headers/content/buttons
        renderAllComparisonTables(); // Update comparison table headers/content
        renderNotesList(); // Update note display/buttons (v1.3 uses 'Keeps')
        renderNextMeasurementInfo(); // Update next measurement info text
        if (chartInstance && chartInstance.options) {
             if (chartInstance.options.scales?.x?.title) {
                chartInstance.options.scales.x.title.text = translate('chartAxisLabel');
             }
             // Update dataset labels if chart exists
             chartInstance.data.datasets.forEach(dataset => {
                 // Find original key if possible (complex mapping needed here, maybe skip dataset label update)
                 // dataset.label = translate(originalKey);
             });
             chartInstance.update();
            console.log("DEBUG: Chart updated for language change.");
        }

        console.log("DEBUG: UI Translation complete.");
    }

    // v1.3: Restored showPopup function from v1.1 using classList
    function showPopup(messageKey, duration = 2500, params = {}) {
        if (!savePopup) {
            console.error("DEBUG: [Error!] Popup element (#save-popup) not found.");
            // Fallback to alert if popup element is missing
            alert(translate(messageKey, params));
            return;
        }
        const message = translate(messageKey, params);
        console.log(`DEBUG: Showing popup: "${message}"`);
        savePopup.textContent = message;
        savePopup.classList.add('show'); // Use class to show

        // Clear existing timer if any
        if (savePopup.timerId) {
            clearTimeout(savePopup.timerId);
        }

        // Set timer to hide popup
        savePopup.timerId = setTimeout(() => {
            savePopup.classList.remove('show'); // Use class to hide
            savePopup.timerId = null; // Clear timer ID
        }, duration);
    }


    function formatValue(value, key = '') {
        if (value === null || value === undefined || value === '') return '-';
        // Handle text values directly
        if (textKeys.includes(key) || key === 'skinCondition') { // Use camelCase key
            return value;
        }
        // Handle numeric values
        const num = parseFloat(value);
        if (isNaN(num)) return '-';

        // Use specific decimal places based on the key (Use camelCase)
        if (['weight', 'muscleMass', 'bodyFatPercentage', 'height', 'shoulder', 'neck', 'chest', 'waist', 'hips', 'thigh', 'calf', 'arm', 'estradiol', 'semenScore', 'healthScore'].includes(key)) {
            return num.toFixed(1);
        } else if (['progesterone', 'antiAndrogen', 'testosterone', 'libido'].includes(key)) {
            return num.toFixed(0); // Libido as whole number
        }
        return num.toString(); // Default formatting
    }

     function formatTimestamp(dateInput, includeTime = false) {
        let date;
        if (dateInput instanceof Date) {
            date = dateInput;
        } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
            // Try parsing common formats robustly
            try {
                date = new Date(dateInput);
                // Handle potential invalid date string 'YYYY-MM-DD' interpretation in some environments
                if (isNaN(date.getTime()) && typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
                    const parts = dateInput.split('-');
                    date = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
                }
            } catch {
                return '-'; // Error during date creation
            }
        } else {
            return '-'; // Invalid input type
        }

        if (isNaN(date.getTime())) {
            return '-'; // Invalid date object
        }

        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');

        if (includeTime) {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        } else {
            return `${year}-${month}-${day}`;
        }
    }

    function saveSettingsToStorage() {
        const settings = {
            language: currentLanguage,
            mode: currentMode,
            initialSetupDone: isInitialSetupDone,
            selectedMetrics: selectedMetrics // Save selected metrics for chart
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
                isInitialSetupDone = settings.initialSetupDone || false;
                selectedMetrics = Array.isArray(settings.selectedMetrics) ? settings.selectedMetrics : ['weight']; // Load saved metrics or default
                console.log("DEBUG: Settings loaded", settings);
            } else {
                console.log("DEBUG: No settings found, using defaults.");
                // Default settings if nothing is stored (first run)
                 currentLanguage = navigator.language.startsWith('ko') ? 'ko' : navigator.language.startsWith('ja') ? 'ja' : 'en';
                 currentMode = 'mtf';
                 isInitialSetupDone = false; // Needs initial setup
                 selectedMetrics = ['weight'];
            }
        } catch (e) {
            console.error("Error loading settings:", e);
            showPopup('loadingError');
             // Fallback to defaults in case of error
             currentLanguage = 'ko';
             currentMode = 'mtf';
             isInitialSetupDone = false;
             selectedMetrics = ['weight'];
        }
    }

    function savePrimaryDataToStorage() {
        const dataToSave = {
            measurements: measurements,
            targets: targets,
            notes: notes // v1.3: Keep using 'notes' as the internal key for data structure consistency
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
                // Basic validation and assignment
                measurements = Array.isArray(data.measurements) ? data.measurements : [];
                targets = (typeof data.targets === 'object' && data.targets !== null) ? data.targets : {};
                notes = Array.isArray(data.notes) ? data.notes : []; // v1.3: Load into 'notes' variable

                 // Ensure measurements are sorted by date initially (needed for potential week recalculation)
                 measurements.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

                 // ** MODIFIED: Week Calculation Logic **
                 // Ensure week numbers are based on index (0, 1, 2...)
                 let needsSave = false;
                 measurements.forEach((m, index) => {
                     if (m.week !== index) {
                         m.week = index;
                         needsSave = true;
                     }
                     // Ensure timestamps exist (copied from original v1.2 load)
                     if (!m.timestamp && m.date) {
                         try { m.timestamp = new Date(m.date).getTime(); needsSave = true; }
                         catch { m.timestamp = Date.now() - (measurements.length - 1 - index) * 86400000; needsSave = true; } // Fallback timestamp
                     } else if (!m.timestamp) { // If no date and no timestamp
                         m.timestamp = Date.now() - (measurements.length - 1 - index) * 86400000; // Assign arbitrary sequential timestamp
                         needsSave = true;
                     }
                 });


                 // Ensure notes have IDs and timestamps
                 notes.forEach(note => {
                     if (!note.id) {
                         note.id = 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
                         needsSave = true;
                     }
                     if (!note.timestamp) { // Use timestamp for sorting
                         note.timestamp = note.createdAt || note.id || Date.now(); // Fallback if timestamp missing
                         needsSave = true;
                     }
                 });

                 if (needsSave) {
                     console.log("DEBUG: Data migration applied (week numbers/timestamps/note IDs). Saving updated data.");
                     savePrimaryDataToStorage(); // Save back the updated data
                 }

                console.log("DEBUG: Primary data loaded.", { measurements: measurements.length, targets: Object.keys(targets).length, notes: notes.length });
            } else {
                console.log("DEBUG: No primary data found in storage.");
                measurements = [];
                targets = {};
                notes = [];
            }
        } catch (e) {
            console.error("Error loading or parsing primary data:", e);
            showPopup('loadingError');
             // Reset data in case of corrupted storage
             measurements = [];
             targets = {};
             notes = [];
        }
    }

     // ** MODIFIED: Recalculate week numbers based on index **
     function calculateAndAddWeekNumbers() {
        if (measurements.length === 0) return false; // Indicate no change

        // Ensure sorted by timestamp (primary sort key)
        measurements.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        let weeksChanged = false;
        measurements.forEach((m, index) => {
            if (m.week !== index) {
                m.week = index; // Assign 0-based index as the week number
                weeksChanged = true;
            }
        });

        if (weeksChanged) {
            console.log("DEBUG: Recalculated week numbers based on entry index.");
        }
        return weeksChanged; // Indicate if any week numbers were updated
    }


    // --- Initial Setup Popup Logic (Adapted from v1.1 for v1.2 structure) ---
    function showInitialSetupPopup() {
        if (!initialSetupPopup || !initialLanguageSelect || !initialModeSelect || !initialSetupSaveBtn) {
             console.error("DEBUG: Initial setup popup elements missing!");
             return;
        }
        console.log("DEBUG: Showing initial setup popup.");

        // Set default selections based on current settings (which might be browser defaults)
        initialLanguageSelect.value = currentLanguage;
        initialModeSelect.value = currentMode; // v1.2 uses select

        // Translate popup content explicitly when shown
        try {
             const h2 = initialSetupPopup.querySelector('h2');
             if (h2) h2.textContent = translate('initialSetupTitle'); else console.warn("Initial setup H2 not found");

             const p = initialSetupPopup.querySelector('p');
             if (p) p.textContent = translate('initialSetupDesc'); else console.warn("Initial setup P not found");

             const langLabelPopup = initialSetupPopup.querySelector('label[for="initial-language-select"]');
             if (langLabelPopup) langLabelPopup.textContent = translate('language'); else console.warn("Initial setup lang label not found");

             const modeLabelPopup = initialSetupPopup.querySelector('label[for="initial-mode-select"]'); // Label for select
             if (modeLabelPopup) modeLabelPopup.textContent = translate('mode'); else console.warn("Initial setup mode label not found");

             // Translate options within the mode select
             Array.from(initialModeSelect.options).forEach(option => {
                 const key = option.value === 'mtf' ? 'modeMtf' : 'modeFtm';
                 option.textContent = translate(key);
             });

             if (initialSetupSaveBtn) initialSetupSaveBtn.textContent = translate('saveSettings'); else console.warn("Initial setup save button not found");

             // No close button in v1.2 HTML structure for initial popup, skip translating it.

        } catch (e) {
             console.error("Error translating initial setup popup:", e);
        }

        initialSetupPopup.style.display = 'flex'; // Show the popup using flex display
    }


    function hideInitialSetupPopup() {
        if (!initialSetupPopup) return;
        initialSetupPopup.style.display = 'none';
        console.log("DEBUG: Hiding initial setup popup.");
    }

     // Modified: Added showPopup call from v1.1
     function handleInitialSetupSave() {
        if (!initialLanguageSelect || !initialModeSelect) {
             console.error("Initial setup select elements missing during save.");
             return;
        }
        currentLanguage = initialLanguageSelect.value;
        currentMode = initialModeSelect.value; // Read from select element
        isInitialSetupDone = true;
        console.log("DEBUG: Initial setup saved.", { lang: currentLanguage, mode: currentMode });

        saveSettingsToStorage();
        hideInitialSetupPopup();

        // Apply settings, load data, render UI - sequence from v1.2
        applyModeToUI();
        applyLanguageToUI(); // This will trigger translateUI and render relevant parts
        loadPrimaryDataFromStorage(); // Load data *after* setup is complete
        setupTargetInputs(); // Setup targets based on the chosen mode
        renderAll(); // Render everything with the new settings

        // Show confirmation popup (from v1.1)
        showPopup('popupSettingsSaved');

        // Activate the first tab after setup
        const firstTabButton = tabBar ? tabBar.querySelector('.tab-button') : null;
        if (firstTabButton) {
            activateTab(firstTabButton.dataset.tab);
        }
    }


    function applyModeToUI() {
        console.log("DEBUG: Applying mode to UI:", currentMode);
        bodyElement.classList.remove('mode-mtf', 'mode-ftm');
        bodyElement.classList.add(`mode-${currentMode}`);

        // Update visibility of mode-specific form fields
        document.querySelectorAll('.mtf-only').forEach(el => {
            const parentFieldset = el.closest('fieldset'); // Check fieldset visibility
            const isVisible = currentMode === 'mtf';
            el.style.display = isVisible ? '' : 'none';
            // Also hide/show parent fieldset if it contains only mode-specific elements
            if(parentFieldset && parentFieldset.querySelectorAll(':scope > div:not(.mtf-only)').length === 0) {
                 parentFieldset.style.display = isVisible ? '' : 'none';
            }
        });
        document.querySelectorAll('.ftm-only').forEach(el => {
            const parentFieldset = el.closest('fieldset');
            const isVisible = currentMode === 'ftm';
            el.style.display = isVisible ? '' : 'none';
             if(parentFieldset && parentFieldset.querySelectorAll(':scope > div:not(.ftm-only)').length === 0) {
                 parentFieldset.style.display = isVisible ? '' : 'none';
            }
        });

        // Update mode select in settings if it exists
        if(modeSelect) modeSelect.value = currentMode;

        // Re-setup target inputs to show/hide based on mode
        setupTargetInputs(true); // Pass true to only update existing inputs visibility/labels

         // Re-render components that might depend on mode (e.g., history table columns, chart options)
         // Check isInitialSetupDone because applyModeToUI might be called during initial setup save
         if (isInitialSetupDone){
             renderHistoryTable();
             renderAllComparisonTables();
             renderChartSelector(); // Ensure chart selectors are updated
             renderChart(); // Re-render chart as available metrics might change
         }
    }

    function applyLanguageToUI() {
        if(languageSelect) languageSelect.value = currentLanguage; // Update settings dropdown
        translateUI(); // Translates all UI elements and triggers necessary re-renders
    }

    function updateAppVersionDisplay() {
        versionDisplays.forEach(el => {
            if (el) el.textContent = APP_VERSION;
        });
    }

    function clearElement(container, messageKey = "noDataYet") {
        if (!container) return;
        
        container.innerHTML = `<p class="placeholder-text">${translate(messageKey)}</p>`; // v1.3: Added class for styling
    }

    // ** MODIFIED: Get week number based on index **
    function getCurrentWeekNumber() {
        if (measurements.length === 0) return 0;
        // Week is now 0-based index
        return measurements.length - 1;
    }

    function updateCurrentWeekDisplay() {
        if (currentWeekSpan) {
            // Display index + 1 for 1-based week display, or just index for 0-based
             currentWeekSpan.textContent = getCurrentWeekNumber(); // Display 0-based index
        }
    }

    function updateFormTitle() {
        if (!formTitle) return;
        // Get week based on index of record being edited or total count for new
        let week = 0;
        const editIndexVal = editIndexInput.value;
        if (editIndexVal !== '' && !isNaN(editIndexVal)) {
             const index = parseInt(editIndexVal, 10);
             if (index >= 0 && index < measurements.length && measurements[index].week !== undefined) {
                 week = measurements[index].week; // Use stored index-based week
             } else {
                 week = getCurrentWeekNumber(); // Fallback
             }
        } else {
             week = measurements.length; // For a new entry, the week number *will be* the current length
        }

        const titleKey = editIndexVal === '' ? 'formTitleNew' : 'formTitleEdit';
        formTitle.innerHTML = translate(titleKey, { week: week }); // Use innerHTML to allow span if needed
    }


    function renderNextMeasurementInfo() {
        if (!nextMeasurementInfoDiv) return;
        if (measurements.length === 0) {
            nextMeasurementInfoDiv.innerHTML = `<p>${translate('nextMeasurementInfoNoData')}</p>`;
            return;
        }

        // Ensure sorted by timestamp before getting last measurement
        measurements.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        const lastMeasurement = measurements[measurements.length - 1];

        // Check if last measurement has a valid timestamp or date
        const lastTimestamp = lastMeasurement.timestamp || (lastMeasurement.date ? new Date(lastMeasurement.date).getTime() : 0);
        if (!lastTimestamp || isNaN(lastTimestamp)) {
             nextMeasurementInfoDiv.innerHTML = `<p>${translate('nextMeasurementInfoNoData')}</p>`; // Or a specific error msg
             console.warn("DEBUG: Last measurement has invalid date/timestamp for next info calc.");
             return;
        }

        const lastDate = new Date(lastTimestamp);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today
        lastDate.setHours(0, 0, 0, 0); // Normalize last measurement date

        const diffTime = today - lastDate;
        const daysAgo = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24))); // Ensure non-negative

        // Assume weekly measurement cycle
        const nextMeasurementDate = new Date(lastTimestamp);
        nextMeasurementDate.setDate(nextMeasurementDate.getDate() + 7);

        const diffUntilNext = nextMeasurementDate - today;
        // Use floor for daysUntil to represent full days left (ceil makes today '1 day left')
        const daysUntil = Math.floor(diffUntilNext / (1000 * 60 * 60 * 24));

        let messageKey = 'nextMeasurementInfo';
        let params = {
            lastDate: formatTimestamp(lastTimestamp),
            daysAgo: daysAgo === 1 ? '1' : daysAgo, // Handle singular 'day' if needed in translation
            nextDate: formatTimestamp(nextMeasurementDate),
            daysUntil: daysUntil >= 0 ? (daysUntil === 1 ? '1' : daysUntil) : 0 // Handle singular 'day', Show 0 if overdue
        };

        // Adjust keys based on daysAgo/daysUntil for better translation (if language file supports it)
        // e.g., daysAgo_one, daysAgo_other, daysUntil_one, daysUntil_other

        if (daysUntil < 0) { // Measurement overdue
            messageKey = 'nextMeasurementInfoOverdue';
            params.daysOverdue = Math.abs(daysUntil);
        } else if (daysUntil === 0) { // Measurement day is today
            messageKey = 'nextMeasurementInfoToday';
        } // else: daysUntil > 0, use default 'nextMeasurementInfo'

        // Pass singular/plural info if needed by translation framework
        // params.daysAgoCount = daysAgo;
        // params.daysUntilCount = daysUntil >= 0 ? daysUntil : 0;
        // params.daysOverdueCount = Math.abs(daysUntil);

        nextMeasurementInfoDiv.innerHTML = `<p>${translate(messageKey, params)}</p>`;
    }


    // Helper to get keys relevant for the current mode
    function getFilteredDisplayKeys() {
        let keys = [...displayKeysInOrder];
        if (currentMode === 'mtf') {
            keys = keys.filter(k => !medicationKeys_FtM.includes(k)); // Hide FTM meds
        } else if (currentMode === 'ftm') {
            keys = keys.filter(k => !medicationKeys_MtF.includes(k) && k !== 'cupSize' && k !== 'semenScore' && k !== 'semenNotes'); // Hide MTF specific
        }
        return keys;
    }

     function getFilteredNumericKeys() { // Used for comparison tables
        let keys = [...baseNumericKeys];
        if (currentMode === 'mtf') {
            keys = keys.filter(k => !medicationKeys_FtM.includes(k));
        } else if (currentMode === 'ftm') {
            keys = keys.filter(k => !medicationKeys_MtF.includes(k) && k !== 'semenScore');
        }
        return keys;
    }

    function getFilteredChartKeys() {
         let keys = [...chartSelectableKeys]; // Uses baseNumericKeys minus scores
         if (currentMode === 'mtf') {
            keys = keys.filter(k => !medicationKeys_FtM.includes(k));
         } else if (currentMode === 'ftm') {
            keys = keys.filter(k => !medicationKeys_MtF.includes(k));
         }
         return keys;
    }


    // --- History Tab Rendering (v1.3: Ensure sticky actions) ---
    function renderHistoryTable() {
        console.log("DEBUG: -> renderHistoryTable");
        if (!historyContainer) return; // historyContainer DOM 요소 확인
        if (!measurements || measurements.length === 0) {
            clearElement(historyContainer, "noDataYet"); // 데이터 없을 시 메시지 표시
            return;
        }

        try {
             // Ensure data is sorted by week (index) before displaying
             measurements.sort((a, b) => (a.week || 0) - (b.week || 0));

            const currentDisplayKeys = getFilteredDisplayKeys(); // 현재 모드에 맞는 데이터 키 필터링
            let tableHTML = '<table><thead><tr>'; // 테이블 시작 및 헤더 행 시작

            // 테이블 헤더 생성 (주차, 날짜, 각 측정 항목)
            currentDisplayKeys.forEach(key => {
                 // Skip timestamp in header for now
                 if (key === 'timestamp') return;

                const labelData = translate(key).match(/^(.*?) *(\((.*?)\))?$/); // 레이블과 단위 분리
                const labelText = labelData ? labelData[1].trim() : translate(key);
                const unitText = labelData && labelData[3] ? `<span class="unit">(${labelData[3]})</span>` : '';
                tableHTML += `<th>${labelText}${unitText}</th>`; // 각 측정 항목 헤더 추가
            });

            // --- 스크롤 고정 기능 핵심 부분 (헤더) ---
            // '관리' 컬럼 헤더 추가 (sticky-col 클래스로 CSS 고정 적용)
            tableHTML += `<th class="sticky-col">${translate('manageColumn')}</th>`; // v1.1 키 사용
            // ----------------------------------------

            tableHTML += `</tr></thead><tbody>`; // 헤더 행 닫고 바디 시작

            // 테이블 바디 생성 (각 측정 기록 행)
            for (let i = 0; i < measurements.length; i++) {
                const m = measurements[i]; // 현재 행의 측정 데이터
                const displayDate = formatTimestamp(m.timestamp || m.date, false); // 날짜 포맷팅

                tableHTML += '<tr>'; // 행 시작

                // 각 측정값 셀 추가
                currentDisplayKeys.forEach(key => {
                     // Skip timestamp in body cells for now
                     if (key === 'timestamp') return;

                     let value = '-';
                     if (key === 'week') {
                         value = m.week ?? i; // Display week number (index)
                     } else if (key === 'date') {
                         value = displayDate;
                     } else {
                         value = formatValue(m[key], key); // 각 측정값 포맷팅 및 추가
                     }
                    tableHTML += `<td>${value}</td>`;
                });

                // --- 스크롤 고정 기능 핵심 부분 (데이터 셀) ---
                // 수정/삭제 버튼이 포함된 '관리' 셀 추가 (sticky-col 클래스로 CSS 고정 적용)
                tableHTML += `<td class="action-buttons sticky-col">`;
                // Use actual index 'i' for data attributes, as 'm.week' might be unreliable if data isn't perfectly indexed
                tableHTML += `<button class="btn btn-edit" data-index="${i}">${translate('edit')}</button>`; // 수정 버튼
                tableHTML += `<button class="btn btn-delete" data-index="${i}">${translate('delete')}</button>`; // 삭제 버튼
                tableHTML += `</td>`;
                // ---------------------------------------------

                tableHTML += '</tr>'; // 행 닫기
            }
            tableHTML += '</tbody></table>'; // 바디 및 테이블 닫기
            historyContainer.innerHTML = tableHTML; // 생성된 HTML을 페이지에 삽입
            console.log("DEBUG: <- renderHistoryTable complete");
        } catch (e) {
            console.error(" Error rendering history table:", e);
            historyContainer.innerHTML = `<p style="color: red;">${translate('alertGenericError')}</p>`; // 오류 발생 시 메시지 표시
        }
    }


    // --- Report Tab Rendering ---

    // Generic function to render comparison tables (Adapted for v1.1/v1.3 style data format)
    function renderComparisonTable(container, titleKey, dataCalculator) {
        if (!container) return;

        const dataResult = dataCalculator(); // Expected to return { data: [], headers: [] }
        const data = dataResult.data;
        const headers = dataResult.headers;

        const titleElement = document.getElementById(container.id.replace('-container', '-title'));
        if(titleElement) titleElement.textContent = translate(titleKey);

        if (!data || data.length === 0) {
             // Show appropriate message based on why data might be empty
             if (titleKey === 'reportTargetTitle' && Object.keys(targets).length === 0) {
                clearElement(container, 'reportNeedTarget');
             } else if (measurements.length < 2 && (titleKey === 'reportPrevWeekTitle' || titleKey === 'reportInitialTitle')) {
                 clearElement(container, 'reportNeedTwoRecords');
             } else if (measurements.length === 0){
                 clearElement(container, 'noDataYet');
             } else {
                 clearElement(container, 'noDataForChart'); // Generic message if targets exist but no progress, etc.
             }
            return;
        }

       // Create table structure
       let tableHTML = `<table class="comparison-table"><thead><tr>`;
       headers.forEach(header => tableHTML += `<th>${header}</th>`);
       tableHTML += `</tr></thead><tbody>`;

       // Populate table rows - Adapt based on data structure (array of arrays or array of objects)
       data.forEach(item => {
           tableHTML += `<tr>`;
           if (Array.isArray(item)) { // Handle array-based rows (like v1.1 comparison tables)
                item.forEach(cellData => {
                   let value = cellData;
                   let className = '';
                   if (typeof cellData === 'object' && cellData !== null) {
                       value = cellData.value;
                       className = cellData.class || '';
                   }
                   tableHTML += `<td ${className ? `class="${className}"` : ''}>${value}</td>`;
                });
           } else if (typeof item === 'object' && item !== null) { // Handle object-based rows (like v1.2 comparison tables)
               // Assuming object keys match headers order or standard keys 'key', 'value', 'unit', 'extra'
               // This part needs careful adaptation based on the exact structure returned by calculators
               tableHTML += `<td>${translate(item.key)}</td>`; // Translate the item key
               tableHTML += `<td>${item.value || '-'} ${item.unit || ''} ${item.extra || ''}</td>`;
               // Add more cells if more headers/data points exist
           }
           tableHTML += `</tr>`;
       });
       tableHTML += `</tbody></table>`;
       container.innerHTML = tableHTML;
   }



// Calculate change compared to the previous week (Modified for 2 columns: Item, Change)
function calculatePrevWeekComparison() {
    // Headers for a 2-column table: Item, Change
    const headers = [translate('comparisonItem'), translate('comparisonChange')];
    if (measurements.length < 2) return { data: [], headers };

    const lastWeek = measurements[measurements.length - 1];
    const secondLastWeek = measurements[measurements.length - 2];
    const data = [];

    getFilteredNumericKeys().forEach(key => { // Use filtered keys for current mode
        const lastValue = parseFloat(lastWeek[key]);
        const secondLastValue = parseFloat(secondLastWeek[key]);
        let change = '-';
        let changeClass = '';

        // Calculate change only if both values are valid numbers
        if (!isNaN(lastValue) && !isNaN(secondLastValue)) {
            const diff = lastValue - secondLastValue;
            change = formatValue(diff, key);
            const threshold = 0.05; // Threshold to add sign/class

            if (diff > threshold) {
                change = `+${change}`;
                changeClass = 'positive-change';
            } else if (diff < -threshold) {
                // Sign is already part of formatValue for negative numbers
                changeClass = 'negative-change';
            }
            // Add row only if change could be calculated
             data.push([
                 translate(key).split('(')[0].trim(), // Item name (without unit)
                 { value: change, class: changeClass } // Only push Item name and Change object
             ]);
        }
        // If change couldn't be calculated (e.g., missing one value), don't add the row for Change table.
        // Alternatively, could add row with '-' for change if at least one value exists:
        // else if (!isNaN(lastValue) || !isNaN(secondLastValue)) {
        //     data.push([ translate(key).split('(')[0].trim(), { value: '-', class: '' } ]);
        // }
    });
    return { data, headers };
}

// Calculate change compared to the initial measurement (Modified for 2 columns: Item, Change)
function calculateInitialComparison() {
    // Headers for a 2-column table: Item, Change
    const headers = [translate('comparisonItem'), translate('comparisonChange')]; // Use 'totalChange' header key
    if (measurements.length < 1) return { data: [], headers };

    const initial = measurements[0];
    const latest = measurements[measurements.length - 1];
    const isOnlyOneRecord = measurements.length === 1;
    const data = [];

    getFilteredNumericKeys().forEach(key => { // Use filtered keys for current mode
        const initialValue = parseFloat(initial[key]);
        const latestValue = parseFloat(latest[key]);
        let change = '-';
        let changeClass = '';

        // Calculate change only if more than one record and both values are valid numbers
        if (!isOnlyOneRecord && !isNaN(initialValue) && !isNaN(latestValue)) {
            const diff = latestValue - initialValue;
            change = formatValue(diff, key);
            const threshold = 0.05;

            if (diff > threshold) {
                change = `+${change}`;
                changeClass = 'positive-change';
            } else if (diff < -threshold) {
                changeClass = 'negative-change';
            }
             // Add row only if change could be calculated
             data.push([
                translate(key).split('(')[0].trim(), // Item name
                { value: change, class: changeClass } // Only push Item name and Change object
             ]);
        }
        // If only one record, or change couldn't be calculated, don't add the row for Change table.
        // Alternatively, could add row with '-' for change if needed:
        // else if (!isNaN(initialValue) || !isNaN(latestValue)) { // If at least one value exists
        //    data.push([ translate(key).split('(')[0].trim(), { value: '-', class: '' } ]);
        // }
    });
    return { data, headers };
}

// Calculate progress towards targets (Modified for 2 columns: Item, Progress)
function calculateTargetComparison() {
    // Headers for a 2-column table: Item, Progress
    const headers = [translate('comparisonItem'), translate('comparisonProgress')];
    const relevantTargetKeys = targetSettingKeys.filter(k => targets[k] !== null && targets[k] !== undefined && targets[k] !== ''); // Use targetSettingKeys (includes height)

    if (measurements.length === 0 || relevantTargetKeys.length === 0) {
        return { data: [], headers };
    }

    const latestMeasurement = measurements[measurements.length - 1];
    const firstMeasurement = measurements.length > 0 ? measurements[0] : null; // Needed for progress calculation baseline
    const data = [];

    relevantTargetKeys.forEach(key => {
        const targetValue = parseFloat(targets[key]);
        const currentValue = parseFloat(latestMeasurement[key]);
        const initialValue = firstMeasurement ? parseFloat(firstMeasurement[key]) : NaN; // Get initial value

        let achievementRate = '-';
        let rateClass = '';
        const threshold = 0.05; // Reusing threshold

        // Calculate Achievement Rate only if target, current, and initial values are valid
        if (!isNaN(targetValue) && !isNaN(currentValue) && !isNaN(initialValue)) {
            const totalChangeNeeded = targetValue - initialValue;
            const currentChangeMade = currentValue - initialValue;

            if (Math.abs(totalChangeNeeded) > threshold) { // Avoid division by zero if start = target
                const rate = (currentChangeMade / totalChangeNeeded) * 100;
                const displayRate = Math.max(0, rate); // Don't show negative progress %
                achievementRate = `${displayRate.toFixed(0)}%`; // Show rate rounded

                // Determine rate class based on progress
                if (displayRate >= 99.95) rateClass = 'target-achieved';
                else if (displayRate >= 80) rateClass = 'positive-change';
                else rateClass = 'negative-change'; // Rate below 80%

            } else if (Math.abs(currentValue - targetValue) <= threshold) { // Target equals initial, and current is at target
                achievementRate = '100%';
                rateClass = 'target-achieved';
            } else { // Target equals initial, but current is not at target
                 achievementRate = '0%';
                 rateClass = 'negative-change';
            }
             // Add row only if a rate could be determined
             data.push([
                 translate(key).split('(')[0].trim(), // Item name
                 { value: achievementRate, class: rateClass } // Only push Item name and Progress object
             ]);

        } else if (!isNaN(targetValue)) {
             // If target exists but rate can't be calculated (missing initial or current)
             // Still add the row but show '-' for progress.
              data.push([
                 translate(key).split('(')[0].trim(), // Item name
                 { value: '-', class: '' } // Show '-' for progress
             ]);
        }
        // If no targetValue, do not add the row to the target comparison table.
    });
    return { data, headers };
}


    function renderAllComparisonTables() {
        renderComparisonTable(prevWeekComparisonContainer, 'reportPrevWeekTitle', calculatePrevWeekComparison);
        renderComparisonTable(initialComparisonContainer, 'reportInitialTitle', calculateInitialComparison);
        renderComparisonTable(targetComparisonContainer, 'reportTargetTitle', calculateTargetComparison);
    }

    // Cache for button colors
    const metricButtonColors = {};
    // Render chart metric selector buttons (Use camelCase keys for translation)
     function renderChartSelector() {
        if (!chartSelector) return;
        const availableKeys = getFilteredChartKeys(); // Uses camelCase
        chartSelector.innerHTML = ''; // Clear previous buttons

        availableKeys.forEach((key, index) => {
            const button = document.createElement('button');
            button.classList.add('chart-select-button');
            button.dataset.metric = key;
            button.textContent = translate(key).split('(')[0].trim(); // Translate the camelCase key name, remove unit

            // Assign color (v1.2 logic)
            const hue = (index * (360 / Math.min(availableKeys.length, 15))) % 360; // Use 15 for more color variation
            const saturation = 70;
            const lightness = 55; // Slightly lighter
            const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

            button.style.borderColor = color;
            metricButtonColors[key] = color; // Store color

            // Set active state based on `selectedMetrics` array
            if (selectedMetrics.includes(key)) {
                 button.classList.add('active');
                 button.style.color = '#fff';
                 button.style.backgroundColor = color; // Active background
            } else {
                 button.classList.remove('active');
                 button.style.color = color; // Inactive text color matches border
                 button.style.backgroundColor = '#1d1d45'; // Inactive background
            }
            chartSelector.appendChild(button);
        });
    }


     function handleChartSelectorClick(event) {
        if (!event.target.classList.contains('chart-select-button')) return;
        const metric = event.target.dataset.metric;
        if (!metric) return;

        const button = event.target;
        const color = metricButtonColors[metric]; // Get stored color

        // Toggle metric selection
        if (selectedMetrics.includes(metric)) {
            selectedMetrics = selectedMetrics.filter(m => m !== metric);
            button.classList.remove('active');
             // Restore inactive style
             button.style.color = color;
             button.style.backgroundColor = '#1d1d45';
        } else {
            selectedMetrics.push(metric);
            button.classList.add('active');
             // Apply active style
             button.style.color = '#fff';
             button.style.backgroundColor = color; // Use stored color
        }

        saveSettingsToStorage(); // Save the updated selection
        renderChart(); // Re-render the chart with new selections
    }


     function handleSelectAllCharts() {
        const availableKeys = getFilteredChartKeys();
        selectedMetrics = [...availableKeys]; // Select all available keys
        renderChartSelector(); // Update button styles
        saveSettingsToStorage();
        renderChart();
    }

    function handleDeselectAllCharts() {
        selectedMetrics = []; // Deselect all
        renderChartSelector(); // Update button styles
        saveSettingsToStorage();
        renderChart();
    }

    // Render the main chart (Use camelCase keys, v1.2 structure maintained)
    function renderChart() {
        if (!chartCanvas) return; // Ensure canvas exists
        const ctx = chartCanvas.getContext('2d');
        if (!ctx) return; // Ensure context is available

        const metricsToRender = selectedMetrics.filter(key => getFilteredChartKeys().includes(key)); // Filter based on current mode

        if (measurements.length < 1 || metricsToRender.length === 0) {
            ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height); // Clear canvas
            ctx.textAlign = 'center';
            ctx.fillStyle = 'var(--text-secondary-color, #888)'; // Use CSS var for color
            ctx.font = '16px sans-serif';
            ctx.fillText(translate('noDataForChart'), chartCanvas.width / 2, chartCanvas.height / 2);
             if (chartInstance) {
                chartInstance.destroy(); // Destroy existing instance if no data
                chartInstance = null;
             }
            return;
        }

        // Use week number (index) for x-axis labels
        const labels = measurements.map(m => m.week !== undefined ? m.week : '-');

        const datasets = metricsToRender.map(metric => {
             const color = metricButtonColors[metric] || '#007bff'; // Get stored color or default
             const originalKey = metric; // Keep the camelCase key
             const translatedLabel = translate(originalKey).split('(')[0].trim(); // Translated metric name without unit

            return {
                label: translatedLabel,
                data: measurements.map(m => m[originalKey] !== undefined && m[originalKey] !== null && m[originalKey] !== '' ? parseFloat(m[originalKey]) : NaN), // Get data, handle missing/empty/null as NaN
                borderColor: color, // Use color from button
                backgroundColor: color + '33', // Use slightly transparent version for fill/points
                fill: false,
                tension: 0.1, // Slight curve to lines
                pointRadius: 3,
                pointHoverRadius: 5,
                spanGaps: true, // Connect lines across NaN values (missing data points)
                borderWidth: 2, // Slightly thicker line
                parsing: { // Ensure chart.js parses correctly even with nulls
                     xAxisKey: 'x', // Assuming x-axis is index or week
                     yAxisKey: 'y'
                }
            };
        });

        if (chartInstance) {
            chartInstance.destroy(); // Destroy previous instance before creating a new one
        }

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                // labels: labels, // Use week numbers as x-values directly
                datasets: datasets.map(ds => ({
                    ...ds,
                    // Map data to {x, y} where x is the week number
                    data: ds.data.map((value, index) => ({ x: labels[index], y: value }))
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear', // Treat week number as linear scale
                        title: {
                           display: true,
                            text: translate('chartAxisLabel') // '주차' or translated equivalent
                        },
                         ticks: {
                            stepSize: 1, // Try to show integer weeks
                            // autoSkip: true, // Allow skipping labels if too dense
                            // maxTicksLimit: 10 // Limit ticks
                             callback: function(value, index, values) {
                                 // Only show integer labels for weeks
                                 if (Number.isInteger(value) && value >= 0) {
                                    return value;
                                 }
                                 return null; // Hide non-integer labels
                             }
                        },
                        grid: {
                            display: false // Hide vertical grid lines
                        }
                    },
                     y: {
                        beginAtZero: false, // Don't always start at zero
                        title: {
                            display: false // No Y-axis title needed usually
                        },
                         grid: {
                            color: 'rgba(128, 128, 128, 0.2)' // Lighter grid lines
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false // Hide default legend, using buttons instead
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: { // Format tooltip values
                            title: function(tooltipItems) {
                                // Show "Week X" as title
                                return tooltipItems.length > 0 ? `${translate('week')} ${tooltipItems[0].parsed.x}` : '';
                            },
                            label: function(context) {
                                let label = context.dataset.label || '';
                                let value = context.parsed.y;
                                if (label) { label += ': '; }
                                if (value !== null && !isNaN(value)) {
                                    // Find original key - This relies on label being unique and matching translation
                                    // A more robust way would be to store the original key in the dataset
                                    let originalKey = '';
                                    const datasetIndex = context.datasetIndex;
                                    if (metricsToRender[datasetIndex]) {
                                         originalKey = metricsToRender[datasetIndex];
                                    } else {
                                         originalKey = context.dataset.label; // Fallback
                                    }

                                    label += formatValue(value, originalKey); // Use formatValue

                                     // Add unit based on original key
                                     let displayUnit = '';
                                     if (originalKey.includes('Percentage')) displayUnit = '%';
                                     else if (originalKey === 'weight' || originalKey === 'muscleMass') displayUnit = translate('unitKg');
                                     else if (bodySizeKeys.includes(originalKey) && originalKey !== 'cupSize') displayUnit = translate('unitCm');
                                     else if (medicationKeys_MtF.includes(originalKey) || medicationKeys_FtM.includes(originalKey)) displayUnit = translate('unitMg');

                                     if (displayUnit) label += ` ${displayUnit}`;
                                } else {
                                    label += '-'; // Show dash if value is null/NaN
                                }
                                return label;
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
        console.log("DEBUG: Chart rendered/updated.");
    }


    // --- Notes (Keeps) Tab --- (v1.3: Uses 'notes' internal variable, displays as 'Keeps')

     function sortNotes(notesArray, order = 'newest') {
        return [...notesArray].sort((a, b) => { // Sort a copy
            // Use timestamp as the primary sort key
            const timeA = a.timestamp || a.createdAt || a.id || 0;
            const timeB = b.timestamp || b.createdAt || b.id || 0;
            return order === 'newest' ? timeB - timeA : timeA - timeB;
        });
    }


     function renderNotesList() { // Displays 'Keeps' based on translation keys
        if (!notesListContainer) return;
        if (notes.length === 0) {
            clearElement(notesListContainer, "noNotesYet"); // Uses 'noNotesYet' key -> "Keeps..."
            return;
        }

        const sortedNotes = sortNotes(notes, currentNoteSortOrder);

        let notesHTML = '<div class="notes-grid">'; // Use CSS Grid for layout

        sortedNotes.forEach(note => {
            // Use noteTitleUntitled key if title is empty
            const title = note.title || translate('noteTitleUntitled');
            const previewLength = 100;
            const previewContent = note.content ? (note.content.length > previewLength ? note.content.substring(0, previewLength).replace(/\n/g, ' ') + '...' : note.content.replace(/\n/g, ' ')) : translate('notePreviewEmpty'); // Use v1.1 key
            const createdStr = formatTimestamp(note.timestamp || note.createdAt || note.id, true); // Use timestamp primarily
            // v1.1 style date display (assuming no separate updatedAt)
            // const updatedStr = note.updatedAt ? translate('noteDateUpdated', { date: formatTimestamp(note.updatedAt, true) }) : ''; // Use v1.1 key

            notesHTML += `
                <div class="note-card card" data-note-id="${note.id}">
                    <h4>${escapeHTML(title)}</h4>
                     <p class="note-content-preview">${escapeHTML(previewContent)}</p>
                    <p class="note-timestamp">${translate('noteDateCreated')} ${createdStr}</p> {/* Use v1.1 key */}
                     {/* ${updatedStr ? `<span class="note-updated">${updatedStr}</span>` : ''} */} {/* Optional updated display */}
                     <div class="note-actions">
                        <button class="edit-note-button btn btn-sm btn-outline" data-id="${note.id}">${translate('edit')}</button> {/* Added btn classes */}
                        <button class="delete-note-button btn btn-sm btn-danger" data-id="${note.id}" data-title="${escapeHTML(title)}">${translate('delete')}</button> {/* Added btn classes */}
                    </div>
                </div>
            `;
        });

        notesHTML += '</div>';
        notesListContainer.innerHTML = notesHTML;
    }


    // Helper function to escape HTML characters
    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, function(match) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match];
        });
    }


    // --- Targets Tab ---

     // v1.3: Includes 'height', uses camelCase keys, updates existing inputs correctly
     function setupTargetInputs(updateOnly = false) {
        if (!targetGrid) {
             targetGrid = targetForm ? targetForm.querySelector('.target-grid') : null;
             if (!targetGrid) { console.error("Target grid container not found."); return; }
         }

        const keysForMode = targetSettingKeys.filter(key => { // targetSettingKeys includes height
            if (currentMode === 'mtf') {
                 return !medicationKeys_FtM.includes(key);
            } else { // ftm
                 // FtM mode: Hide MtF meds, cupSize, semen stuff. Keep height, weight, bodyfat, muscleMass, sizes.
                 return !medicationKeys_MtF.includes(key) && key !== 'cupSize' && !key.startsWith('semen');
            }
        });

        if (!updateOnly) {
            targetGrid.innerHTML = ''; // Clear previous inputs only if not just updating labels
            keysForMode.forEach(key => {
                const formGroup = document.createElement('div');
                formGroup.classList.add('form-group');

                 const label = document.createElement('label');
                label.setAttribute('for', `target-${key}`);
                 label.textContent = translate(key); // Translate label using camelCase key
                 label.dataset.langKey = key; // Add lang key for re-translation

                const input = document.createElement('input');
                input.setAttribute('type', 'number');
                input.setAttribute('id', `target-${key}`);
                 input.setAttribute('name', key); // Use camelCase key as name
                input.setAttribute('step', '0.1'); // Default step
                 input.setAttribute('min', '0');

                 // Set placeholder based on unit
                 let placeholderUnit = '';
                 if (key.includes('Percentage')) placeholderUnit = translate('unitPercent');
                 else if (key === 'weight' || key === 'muscleMass') placeholderUnit = translate('unitKg');
                 else if (bodySizeKeys.includes(key) && key !== 'cupSize') placeholderUnit = translate('unitCm');
                 input.setAttribute('placeholder', placeholderUnit);

                formGroup.appendChild(label);
                formGroup.appendChild(input);
                targetGrid.appendChild(formGroup);
            });
        } else {
             // Just update labels, placeholders, and visibility if inputs already exist
             targetGrid.querySelectorAll('.form-group').forEach(group => {
                 const label = group.querySelector('label');
                 const input = group.querySelector('input');
                 if (label && input) {
                     const key = input.name; // Get key from input name (should be camelCase)
                     label.textContent = translate(key); // Update label translation

                     // Update placeholder translation
                     let placeholderUnit = '';
                     if (key.includes('Percentage')) placeholderUnit = translate('unitPercent');
                     else if (key === 'weight' || key === 'muscleMass') placeholderUnit = translate('unitKg');
                     else if (bodySizeKeys.includes(key) && key !== 'cupSize') placeholderUnit = translate('unitCm');
                     input.setAttribute('placeholder', placeholderUnit);

                     // Show/hide based on current mode
                     const keyShouldBeVisible = keysForMode.includes(key);
                     group.style.display = keyShouldBeVisible ? '' : 'none';
                 }
             });
        }

        populateTargetInputs(); // Fill inputs with current target values
    }


    function populateTargetInputs() {
        if (!targetGrid) return;
        targetGrid.querySelectorAll('input[type="number"]').forEach(input => {
            const key = input.name; // Key is camelCase
            input.value = targets[key] || ''; // Set value from targets object or empty
        });
    }

     // --- Event Handlers ---

    // Form submission (New Record / Update Record) - Use camelCase keys
    // ** MODIFIED: Week calculation uses index **
     function handleFormSubmit(event) {
        event.preventDefault();
        if (!form) return;

        // Clear previous validation errors
        form.querySelectorAll('.invalid-input').forEach(el => el.classList.remove('invalid-input'));
        let isValid = true;
        let firstInvalidField = null;

        const formData = new FormData(form);
        const measurementData = {
             // date: '', // Set below
             timestamp: Date.now(), // Record timestamp
             // week: 0, // Calculated below
         };
        let dateInputStr = formData.get('date') || ''; // Get date input value

        // Process form data using camelCase keys and validate numbers
        baseNumericKeys.concat(textKeys).forEach(key => {
             let value = formData.get(key); // Form input names should match keys
             const inputElement = form.querySelector(`[name="${key}"]`);

             if (value !== null && value !== undefined) {
                 if (baseNumericKeys.includes(key) && value !== '') {
                    const numValue = parseFloat(value);
                    if (isNaN(numValue) || numValue < 0) { // Store only valid non-negative numbers
                         measurementData[key] = null; // Store invalid number input as null
                        console.warn(`Invalid numeric input for ${key}: ${value}`);
                        if (inputElement) {
                            inputElement.classList.add('invalid-input');
                            isValid = false;
                            if (!firstInvalidField) firstInvalidField = inputElement;
                        }
                    } else {
                        measurementData[key] = numValue;
                    }
                 } else if (textKeys.includes(key)) {
                    measurementData[key] = value.trim() || null; // Trim text, store empty as null
                 }
             } else {
                measurementData[key] = null; // Ensure key exists even if not in form
             }
        });

        // Show validation error if any numeric field is invalid
        if (!isValid) {
             showPopup('alertValidationError', 4000);
             if (firstInvalidField) firstInvalidField.focus();
             return;
        }


        // Determine date
        const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        // Use date from input if provided and valid, otherwise default to today
        let recordDateStr = todayStr;
        if (dateInputStr && /^\d{4}-\d{2}-\d{2}$/.test(dateInputStr)) {
             const inputDate = new Date(dateInputStr);
             if (!isNaN(inputDate.getTime())) {
                 recordDateStr = dateInputStr;
             }
        }
        measurementData.date = recordDateStr;

        // ** MODIFIED: Calculate week based on index **
        const editIndex = editIndexInput.value;
        if (editIndex !== '') {
            // --- Update existing measurement ---
            const indexToUpdate = parseInt(editIndex, 10);
            if (indexToUpdate >= 0 && indexToUpdate < measurements.length) {
                 // Preserve original week number when editing (it's based on original position)
                 measurementData.week = measurements[indexToUpdate].week;
                 // Preserve original date unless explicitly changed (handle date change?)
                 // For now, let's keep original date on edit for simplicity unless date input is added back
                 measurementData.date = measurements[indexToUpdate].date;
                 // Update timestamp on edit
                 measurementData.timestamp = Date.now();
                 // Merge updated data, overwriting existing fields
                 measurements[indexToUpdate] = { ...measurements[indexToUpdate], ...measurementData };
                 console.log("DEBUG: Measurement updated at index", indexToUpdate);
                 showPopup('popupUpdateSuccess'); // v1.1 popup message
            } else {
                 console.error("Invalid index for editing:", editIndex);
                 showPopup('savingError'); // Or a more specific error
                 return; // Stop execution if index is invalid
             }
        } else {
            // --- Add new measurement ---
            // Week number is the current length (0 for first entry, 1 for second, etc.)
            measurementData.week = measurements.length;

            // Ensure all potential keys exist in the new object, even if null
            const fullMeasurementData = {};
            [...baseNumericKeys, ...textKeys, 'date', 'week', 'timestamp'].forEach(key => {
                fullMeasurementData[key] = measurementData.hasOwnProperty(key) ? measurementData[key] : null;
            });
            measurements.push(fullMeasurementData);
            console.log("DEBUG: New measurement added with week", measurementData.week);
             showPopup('popupSaveSuccess'); // v1.1 popup message
        }

        // Ensure measurements are sorted by timestamp *after* adding/editing
        measurements.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        // ** MODIFIED: Recalculate week numbers for all entries based on index **
        calculateAndAddWeekNumbers(); // Ensure weeks are 0, 1, 2... after sorting

        savePrimaryDataToStorage(); // Save potentially updated weeks too
        resetFormState(); // Clear the form
        renderAll(); // Re-render tables, charts, etc.
        applyModeToUI(); // Ensure UI matches current mode (might affect history table columns)
    }


    // Delete Measurement
     function handleDeleteMeasurement(index) {
        if (index >= 0 && index < measurements.length) {
            const entry = measurements[index];
            const displayDate = formatTimestamp(entry.timestamp || entry.date, false);
            const weekNum = entry.week ?? index; // Use stored week or index

             // Use confirmDeleteRecord key from v1.1
             if (confirm(translate('confirmDeleteRecord', { week: weekNum, date: displayDate }))) {
                measurements.splice(index, 1);
                console.log("DEBUG: Measurement deleted at index", index);

                 // ** MODIFIED: Recalculate week numbers based on index after deletion **
                 calculateAndAddWeekNumbers();

                 savePrimaryDataToStorage(); // Save updated data
                renderAll(); // Re-render history table and potentially reports
                 showPopup('popupDeleteSuccess'); // v1.1 popup message
             }
         } else {
             console.error("Invalid index for deletion:", index);
             showPopup('alertCannotFindRecordDelete'); // v1.1 error message
         }
    }


    // Populate form for editing (Use camelCase keys)
    function handleEditClick(index) {
        if (index >= 0 && index < measurements.length) {
            const measurementToEdit = measurements[index];
            console.log("DEBUG: Editing measurement at index", index, measurementToEdit);

            // Populate form fields using camelCase keys
            // Ensure all possible form fields are considered
            const allFormKeys = [...baseNumericKeys, ...textKeys, 'date'];
            allFormKeys.forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) {
                    if (measurementToEdit.hasOwnProperty(key)) {
                        // Format date correctly for date input
                        if (key === 'date' && measurementToEdit[key]) {
                             input.value = formatTimestamp(measurementToEdit[key], false); // YYYY-MM-DD
                        } else {
                             input.value = measurementToEdit[key] !== null ? measurementToEdit[key] : '';
                        }
                    } else {
                        input.value = ''; // Clear fields not present in the data
                    }
                    input.classList.remove('invalid-input'); // Clear validation state
                }
            });

            editIndexInput.value = index; // Set hidden input to track edit index
            updateFormTitle(); // Update title to "Edit Measurement..."
            if (saveUpdateBtn) saveUpdateBtn.textContent = translate('edit'); // Change button text
            if (cancelEditBtn) cancelEditBtn.style.display = 'inline-block'; // Show cancel button

            // Switch to the input tab
            activateTab('tab-input');
             // Scroll form into view smoothly and focus first visible input
            setTimeout(() => {
                form.scrollIntoView({ behavior: 'smooth', block: 'start' });
                const firstVisibleInput = form.querySelector('fieldset:not([style*="display: none"]) input, fieldset:not([style*="display: none"]) textarea');
                if(firstVisibleInput) firstVisibleInput.focus();
            }, 150); // Small delay for tab switch

        } else {
            console.error("Invalid index for editing:", index);
            showPopup('alertCannotFindRecordEdit'); // v1.1 error message
        }
    }


    // Cancel Edit
     function cancelEdit() {
        resetFormState();
        console.log("DEBUG: Edit cancelled.");
    }

    // Reset form fields and state
    function resetFormState() {
         if (form) form.reset(); // Reset all form fields
         // Clear any validation classes
         form.querySelectorAll('.invalid-input').forEach(el => el.classList.remove('invalid-input'));
         editIndexInput.value = ''; // Clear edit index
        updateFormTitle(); // Reset title to "New Measurement..."
        if (saveUpdateBtn) saveUpdateBtn.textContent = translate('saveRecord'); // Reset button text
        if (cancelEditBtn) cancelEditBtn.style.display = 'none'; // Hide cancel button
    }

    // Save Targets (Use camelCase keys)
    function handleTargetFormSubmit(event) {
        event.preventDefault();
        if (!targetForm || !targetGrid) return;

        // Clear previous validation
        targetForm.querySelectorAll('.invalid-input').forEach(el => el.classList.remove('invalid-input'));
        let isValid = true;
        let firstInvalidField = null;

        const formData = new FormData(targetForm);
        const newTargets = {}; // Use a temp object

        // Iterate over inputs in the target grid
         targetGrid.querySelectorAll('input[type="number"]').forEach(input => {
            const key = input.name; // Key is camelCase
            const value = formData.get(key);
            if (value !== null && value !== '') {
                 const numValue = parseFloat(value);
                 if (isNaN(numValue) || numValue < 0) { // Validate non-negative numbers
                     newTargets[key] = null; // Treat invalid input as null/cleared
                      console.warn(`Invalid target value for ${key}: ${value}`);
                      input.classList.add('invalid-input');
                      isValid = false;
                      if (!firstInvalidField) firstInvalidField = input;
                 } else {
                      newTargets[key] = numValue;
                 }
             } else {
                 // If input is empty, explicitly set to null to clear the target
                 newTargets[key] = null;
             }
        });

        if (!isValid) {
             showPopup('alertValidationError', 4000);
             if (firstInvalidField) firstInvalidField.focus();
             return;
        }


        // Merge newTargets with existing targets, overwriting or adding
        // Only update keys relevant to targetSettingKeys to avoid stray data
        const updatedTargets = { ...targets }; // Start with existing targets
        targetSettingKeys.forEach(key => {
             // Check if the key exists in the form inputs for the current mode
             const inputElement = targetGrid.querySelector(`input[name="${key}"]`);
             const isVisible = inputElement && inputElement.closest('.form-group').style.display !== 'none';

            if (isVisible) { // Only update targets for currently visible fields
                if (newTargets.hasOwnProperty(key)) {
                    updatedTargets[key] = newTargets[key]; // Add or update from form (could be null if cleared/invalid)
                }
                // If key is visible but not in newTargets (shouldn't happen with current logic), it keeps its old value? Let's ensure nullification if cleared.
                else if (!newTargets.hasOwnProperty(key) && updatedTargets.hasOwnProperty(key)){
                     // This case might mean the input was disabled/removed dynamically, preserve existing target?
                     // Or assume if visible and not submitted, it should be cleared? Let's stick to `newTargets` override.
                     // If newTargets[key] is null, it means it was cleared or invalid.
                }
            }
        });

        // Clean up null values - remove keys with null values
        Object.keys(updatedTargets).forEach(key => {
            if (updatedTargets[key] === null) {
                delete updatedTargets[key];
            }
        });

        targets = updatedTargets; // Assign the cleaned, updated targets

        console.log("DEBUG: Targets saved", targets);
        savePrimaryDataToStorage();
        showPopup('popupTargetSaveSuccess'); // v1.1 popup message
         renderAllComparisonTables(); // Update the target comparison table immediately
    }


    // Save or Update Note (v1.3: Uses 'Keeps' terminology in UI via translation)
    function handleSaveNote() {
         const title = noteTitleInput.value.trim();
         const content = noteContentInput.value.trim();
         const noteId = editNoteIdInput.value; // ID is string 'note_timestamp_random' or empty

         if (!content && !title) { // Require content OR title for a note
             showPopup('alertNoteContentMissing'); // v1.1 key -> "Keeps 제목이나 내용을..."
             noteContentInput.focus();
             return;
         }

         if (noteId) {
             // Update existing note
             const noteIndex = notes.findIndex(n => n.id === noteId);
             if (noteIndex !== -1) {
                 notes[noteIndex].title = title;
                 notes[noteIndex].content = content;
                 notes[noteIndex].timestamp = Date.now(); // Update timestamp on edit
                 console.log("DEBUG: Note (Keeps) updated", notes[noteIndex]);
                 showPopup('popupNoteUpdateSuccess'); // v1.1 popup message
             } else {
                 console.error("Cannot find note (Keeps) to update with ID:", noteId);
                 showPopup('alertCannotFindNoteEdit'); // v1.1 error message
                 handleCancelEditNote(); // Reset form if note not found
                 return;
             }
         } else {
             // Add new note
             const newNote = {
                 id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9), // Unique ID
                 title: title,
                 content: content,
                 timestamp: Date.now() // Record creation time as timestamp
             };
             notes.push(newNote);
             console.log("DEBUG: New note (Keeps) added", newNote);
             showPopup('popupNoteSaveSuccess'); // v1.1 popup message
         }

         savePrimaryDataToStorage();
         handleCancelEditNote(); // Reset form after save/update
         renderNotesList(); // Update the list display
     }


     // Start editing a note (Keeps)
     function handleEditNoteStart(noteId) {
         const noteToEdit = notes.find(n => n.id === noteId);
         if (noteToEdit) {
             editNoteIdInput.value = noteId;
             noteTitleInput.value = noteToEdit.title || '';
             noteContentInput.value = noteToEdit.content || '';
             if (noteFormTitle) noteFormTitle.textContent = translate('noteEditTitle'); // -> "Keeps 수정"
             if (saveNoteButton) saveNoteButton.textContent = translate('edit');
             if (cancelEditNoteBtn) cancelEditNoteBtn.style.display = 'inline-block';
             noteTitleInput.focus(); // Focus on title field
             // Scroll form into view if needed
             if (noteFormArea) noteFormArea.scrollIntoView({ behavior: 'smooth' });
         } else {
              console.error("Cannot find note (Keeps) to edit with ID:", noteId);
              showPopup('alertCannotFindNoteEdit'); // v1.1 error message
         }
     }

     // Cancel editing a note (Keeps)
     function handleCancelEditNote() {
         editNoteIdInput.value = '';
         noteTitleInput.value = '';
         noteContentInput.value = '';
         if (noteFormTitle) noteFormTitle.textContent = translate('noteNewTitle'); // -> "새 Keeps 작성"
         if (saveNoteButton) saveNoteButton.textContent = translate('saveNote'); // -> "Keeps 저장"
         if (cancelEditNoteBtn) cancelEditNoteBtn.style.display = 'none';
     }

     // Delete a note (Keeps)
     function handleDeleteNote(noteId, noteTitle) {
        const titleToShow = noteTitle || translate('noteTitleUntitled');
        // Use confirmDeleteNote key -> "Keeps '{title}'..." (v1.1)
        if (confirm(translate('confirmDeleteNote', { title: titleToShow }))) {
            notes = notes.filter(n => n.id !== noteId);
            savePrimaryDataToStorage();
            renderNotesList();
            showPopup('popupNoteDeleteSuccess'); // v1.1 popup message
            // If the deleted note was being edited, cancel the edit state
             if (editNoteIdInput.value === noteId) {
                 handleCancelEditNote();
             }
        }
    }

    // Handle Language Change
     function handleLanguageChange(event) {
        currentLanguage = event.target.value;
        console.log("DEBUG: Language changed to", currentLanguage);
        saveSettingsToStorage();
        applyLanguageToUI(); // Trigger UI update and re-renders
        showPopup('popupSettingsSaved'); // v1.1 message
    }

    // Handle Mode Change
     function handleModeChange(event) {
        currentMode = event.target.value;
        console.log("DEBUG: Mode changed to", currentMode);
        saveSettingsToStorage();
        applyModeToUI(); // Apply mode class and update relevant UI parts
        showPopup('popupSettingsSaved'); // v1.1 message
        // No need to call renderAll here, applyModeToUI handles necessary renders
    }

    // Reset All Data (v1.3 uses 'Keeps' in confirmation from v1.1)
     function handleResetData() {
        // Use confirmResetData1 and confirmResetData2 from v1.1
        if (confirm(translate('confirmResetData1'))) {
            if (confirm(translate('confirmResetData2'))) {
                console.log("DEBUG: Resetting all data.");
                localStorage.removeItem(PRIMARY_DATA_KEY);
                // Keep settings (language/mode preference)
                // localStorage.removeItem(SETTINGS_KEY);
                measurements = [];
                targets = {};
                notes = []; // Clear notes (Keeps)
                selectedMetrics = ['weight']; // Reset selected chart metrics

                // Save the reset selectedMetrics back to settings
                // Need to also reset initialSetupDone flag to force setup again
                isInitialSetupDone = false;
                saveSettingsToStorage();

                // Clear UI elements explicitly
                 clearElement(historyContainer, "noDataYet");
                 clearElement(prevWeekComparisonContainer, "noDataYet");
                 clearElement(initialComparisonContainer, "noDataYet");
                 clearElement(targetComparisonContainer, "noDataYet");
                 clearElement(notesListContainer, "noNotesYet"); // -> "... first Keeps!"

                 if (chartInstance) {
                     chartInstance.destroy();
                     chartInstance = null;
                 }
                 // Reset chart selectors and target inputs
                 renderChartSelector();
                 setupTargetInputs(true); // Update target inputs (will be empty)

                 // Reset forms
                 resetFormState();
                 handleCancelEditNote();

                 // Update displays
                 updateCurrentWeekDisplay();
                 renderNextMeasurementInfo();
                 renderChart(); // Render empty chart state

                 showPopup('popupDataResetSuccess', 3000); // v1.1 message

                 // Reload after reset to ensure clean state and trigger initial setup
                 setTimeout(() => window.location.reload(), 1000);
            }
         }
    }

    // Export Data (v1.3 includes settings)
     function exportMeasurementData() {
         try {
             const dataToExport = {
                 app: "ShiftV", // Identify the app
                 version: APP_VERSION,
                 exportDate: new Date().toISOString(),
                 settings: { // Include settings in export
                    language: currentLanguage,
                    mode: currentMode,
                    selectedMetrics: selectedMetrics
                 },
                 data: { // Keep primary data nested under 'data' key
                     measurements: measurements,
                     targets: targets,
                     notes: notes // Use internal 'notes' key
                 }
             };
             const dataStr = JSON.stringify(dataToExport, null, 2); // Pretty print JSON
             const blob = new Blob([dataStr], { type: 'application/json' });
             const url = URL.createObjectURL(blob);

             const a = document.createElement('a');
             const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
             a.href = url;
             a.download = `ShiftV_Backup_${timestamp}.json`; // Filename with timestamp
             document.body.appendChild(a);
             a.click();
             document.body.removeChild(a);
             URL.revokeObjectURL(url);
             console.log("DEBUG: Data exported.");
             showPopup('popupDataExportSuccess'); // v1.1 message
         } catch (e) {
             console.error("Error exporting data:", e);
             showPopup('alertExportError'); // v1.1 message
         }
     }

     // Import Data (v1.3 uses 'Keeps' in warning, handles new export format)
     function importMeasurementData(event) {
         const file = event.target.files[0];
         if (!file) { return; }

         const reader = new FileReader();
         reader.onload = function(e) {
             try {
                 const imported = JSON.parse(e.target.result);
                 // Basic validation of imported structure (check for 'app', 'version', 'data')
                 // Allow import from older 'mtbc_tracker' format as well (from v1.1)
                 const isValidShiftV = imported && imported.app === "ShiftV" && imported.data && Array.isArray(imported.data.measurements) && typeof imported.data.targets === 'object' && Array.isArray(imported.data.notes);
                 const isValidOldFormat = imported && imported.project === "ShiftV_Backup" && Array.isArray(imported.measurements) && typeof imported.targets === 'object' && Array.isArray(imported.notes); // v1.1 format check

                 if (isValidShiftV || isValidOldFormat) {

                     // Use alertImportConfirm key from v1.1 -> "...overwrite current data..."
                     if (!confirm(translate('alertImportConfirm'))) {
                         if (importFileInput) importFileInput.value = ''; // Clear input
                         return; // User cancelled
                     }

                     if (isValidShiftV) {
                         // Restore data from 'data' object (new format)
                         measurements = imported.data.measurements;
                         targets = imported.data.targets;
                         notes = imported.data.notes; // Restore into 'notes' variable

                         // Restore settings if present in the backup
                         if (imported.settings) {
                             currentLanguage = imported.settings.language || currentLanguage;
                             currentMode = imported.settings.mode || currentMode;
                             selectedMetrics = Array.isArray(imported.settings.selectedMetrics) ? imported.settings.selectedMetrics : selectedMetrics;
                         } else {
                              console.log("DEBUG: Importing backup possibly missing settings block.");
                         }
                     } else { // isValidOldFormat
                          measurements = imported.measurements;
                          targets = imported.targets;
                          notes = imported.notes;
                          // Keep current settings when importing old format
                          console.log("DEBUG: Importing older backup format (v1.1 style). Keeping current settings.");
                     }

                     // Mark setup as done after import
                     isInitialSetupDone = true;

                      // Ensure data integrity after import
                      // Sort by timestamp first, then recalculate week based on index
                      measurements.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                      calculateAndAddWeekNumbers(); // Ensure weeks are 0, 1, 2...

                      // Ensure notes have IDs and timestamps
                      notes.forEach(note => {
                         if (!note.id) note.id = 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
                         if (!note.timestamp) note.timestamp = note.createdAt || note.id || Date.now(); // Fallback
                      });

                      savePrimaryDataToStorage(); // Save restored data
                     saveSettingsToStorage(); // Save potentially restored/current settings

                     console.log("DEBUG: Data imported successfully.");
                     showPopup('popupDataImportSuccess'); // v1.1 message

                      // Instead of reload, re-apply settings and re-render everything
                      applyModeToUI(); // Apply potentially restored mode
                      applyLanguageToUI(); // Apply potentially restored language and re-translate/re-render
                      setupTargetInputs(); // Ensure targets tab reflects loaded data/mode
                      renderAll(); // Render all components with new data
                      // Activate a default tab after import (e.g., history)
                      activateTab('tab-history');

                 } else {
                     console.error("Import failed: Invalid file structure or app identifier.");
                     showPopup('alertImportInvalidFile', 4000); // v1.1 message
                 }
             } catch (err) {
                 console.error("Error parsing imported file:", err);
                 showPopup('alertImportReadError', 4000); // v1.1 message
             } finally {
                 // Clear the file input value regardless of success/failure
                 if (importFileInput) importFileInput.value = '';
             }
         };
         reader.onerror = function(e) {
             console.error("Error reading file:", e);
             showPopup('alertImportFileReadError', 4000); // v1.1 message
             if (importFileInput) importFileInput.value = '';
         };
         reader.readAsText(file);
     }


     // Scroll listener for potential header effects (Optional, v1.2 code maintained)
     function setupScrollListener() {
         window.addEventListener('scroll', () => {
             // ... (scroll logic - kept same as v1.2) ...
         }, { passive: true });
         console.log("DEBUG: Scroll listener setup.");
     }

    // --- Swipe Navigation (v1.2 code maintained) ---
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0; // To detect vertical scroll intention
    const swipeThreshold = 50; // Minimum horizontal distance for a swipe
    let isSwiping = false; // Flag to track if a potential swipe is in progress

    function handleTouchStart(e) {
        const target = e.target;
        // Prevent swipe if touching interactive elements or elements needing scroll
        if (target.closest('.tab-bar, button, input, textarea, select, .table-responsive, .chart-controls, .chart-container, .note-actions, .modal-content, .notes-grid, [data-no-swipe]')) {
            isSwiping = false;
            return;
        }
        // Only register touch start for swipe if not on an interactive element
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        isSwiping = true; // Potential swipe starts
    }

    function handleTouchMove(e) {
        if (!isSwiping) return; // Exit if swipe was disabled or cancelled

        const currentX = e.changedTouches[0].screenX;
        const currentY = e.changedTouches[0].screenY;
        const deltaX = currentX - touchStartX;
        const deltaY = currentY - touchStartY;
        // Check if the vertical movement is significantly larger than horizontal
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
            isSwiping = false; // Cancel the swipe gesture
            return;
        }

        // If horizontal movement is dominant, potentially prevent default vertical scroll (Use with caution)
        // if (Math.abs(deltaX) > Math.abs(deltaY) + 10) {
        //     e.preventDefault();
        // }

        touchEndX = currentX; // Update the end X position
    }

    function handleTouchEnd(e) {
        if (!isSwiping) return; // Exit if swipe was disabled or cancelled

        isSwiping = false; // Swipe gesture finished
        touchEndX = e.changedTouches[0].screenX;
        const deltaX = touchEndX - touchStartX;

        // Check if the horizontal distance threshold is met
        if (Math.abs(deltaX) > swipeThreshold) {
            const direction = deltaX < 0 ? 'left' : 'right'; // Determine swipe direction
            console.log("DEBUG: Swipe detected:", direction);
            navigateTabs(direction); // Trigger tab navigation
        }

        // Reset coordinates for the next touch
        touchStartX = 0;
        touchEndX = 0;
        touchStartY = 0;
    }

    function navigateTabs(direction) {
        if (!tabBar) return;
        const currentActiveButton = tabBar.querySelector('.tab-button.active');
        if (!currentActiveButton) return;

        const buttons = Array.from(tabBar.querySelectorAll('.tab-button'));
        const currentIndex = buttons.findIndex(btn => btn === currentActiveButton);
        let nextIndex;
        if (direction === 'left') { // Swiped left, move to the next tab (rightward)
            nextIndex = (currentIndex + 1) % buttons.length;
        } else { // Swiped right, move to the previous tab (leftward)
            nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
        }

        if (nextIndex !== currentIndex && buttons[nextIndex]) {
            console.log(`DEBUG: Navigating via swipe from index ${currentIndex} to ${nextIndex}`);
            activateTab(buttons[nextIndex].dataset.tab); // Use activateTab directly
        }
    }

    // --- Tab Activation ---
    function activateTab(targetTabId) {
        if (!tabBar) return;
        console.log("DEBUG: Activating tab:", targetTabId);

        // Deactivate all tabs and hide all content
        tabButtons.forEach(button => button.classList.remove('active'));
        tabContents.forEach(content => content.style.display = 'none'); // Use display none/block

        // Activate the target tab button and show content
        const targetButton = tabBar.querySelector(`[data-tab="${targetTabId}"]`);
        const targetContent = document.getElementById(targetTabId);

        if (targetButton) {
            targetButton.classList.add('active');
        }
        if (targetContent) {
            targetContent.style.display = 'block'; // Show the content

             // Special actions when activating specific tabs
             if (targetTabId === 'tab-history') {
                 renderHistoryTable(); // Re-render history table on activation
             } else if (targetTabId === 'tab-change-report') {
                 renderChart(); // Render chart when report tab is activated
                 renderAllComparisonTables(); // Also update comparison tables
             } else if (targetTabId === 'tab-overview') { // v1.3: This is the Keeps tab
                 renderNotesList(); // Render notes (Keeps) when overview tab is activated
             } else if (targetTabId === 'tab-targets') {
                 populateTargetInputs(); // Ensure target inputs show current values
                 setupTargetInputs(true); // Ensure labels/visibility are correct for current mode/lang
             } else if (targetTabId === 'tab-input') {
                 renderNextMeasurementInfo(); // Update next measurement info when switching to input
             }

        } else {
             console.error("Target tab content not found:", targetTabId);
             // Activate the first tab as a fallback?
             const firstTabButton = tabBar.querySelector('.tab-button');
             if(firstTabButton) activateTab(firstTabButton.dataset.tab);
        }
         // Reset edit states when switching tabs? Optional.
         // cancelEdit(); // Reset measurement form edit state
         // handleCancelEditNote(); // Reset note (Keeps) form edit state
    }


    // --- Global Render Function ---
     function renderAll() {
         console.log("DEBUG: === renderAll triggered ===");
         try {
             updateCurrentWeekDisplay(); // Updates based on index now
             renderNextMeasurementInfo(); // Uses timestamp
             renderHistoryTable(); // Renders based on sorted measurements (by index/week)
             renderAllComparisonTables(); // Renders based on latest/first/previous entries
             renderChartSelector(); // Updates chart buttons
             renderNotesList(); // Updates notes (Keeps) list
             populateTargetInputs(); // Update target input values
             setupTargetInputs(true); // Ensure target labels/placeholders/visibility are up-to-date

             // Only render chart if the report tab is currently active
             const activeTabContent = document.querySelector('.tab-content[style*="display: block"]');
             const activeTabId = activeTabContent ? activeTabContent.id : null;

             if (activeTabId === 'tab-change-report') {
                 console.log("DEBUG: Report tab active, rendering chart in renderAll.");
                 renderChart();
             } else {
                 // Optional: Destroy chart if not on report tab to save resources
                 // if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
                 console.log("DEBUG: Report tab inactive, skipping chart render in renderAll.");
             }

             console.log("DEBUG: === renderAll complete ===");
         } catch (e) {
             console.error(`renderAll error: ${e.message}`, e.stack);
             showPopup('unexpectedError', 5000, { message: e.message }); // Show error popup
         }
     }


    // ===============================================
    // Initialization
    // ===============================================
    console.log("DEBUG: App Initialization Start (v1.3 Modified)");
    try {
        updateAppVersionDisplay();
        loadSettingsFromStorage(); // Load language, mode, etc. first

         // Check for iOS and add class for specific styling
         if (isIOS()) {
            bodyElement.classList.add('ios-device');
            console.log("DEBUG: iOS device detected, added .ios-device class to body.");
         }


        // ** Initial Setup Logic (v1.1 style integrated) **
        if (!isInitialSetupDone) {
            // If setup is not marked as done in settings, show the popup.
            // The rest of the initialization (data loading, rendering) will happen
            // inside handleInitialSetupSave when the user saves the initial settings.
            showInitialSetupPopup();
            console.log("DEBUG: Initial setup required. Showing popup.");
        } else {
             // If setup is already done, proceed with normal initialization.
             console.log("DEBUG: Initial setup already done. Proceeding with normal initialization.");
             applyModeToUI(); // Apply mode class, show/hide elements based on loaded settings
             applyLanguageToUI(); // Translate UI based on loaded settings
             loadPrimaryDataFromStorage(); // Load measurements, targets, notes (includes week calculation fix)
             setupTargetInputs(); // Setup target inputs based on mode and loaded targets
             renderAll(); // Initial render of all components

             // Activate the default tab (e.g., Input)
             const initialTab = 'tab-input';
             activateTab(initialTab);
        }
        console.log("DEBUG: App Initialization Sequence Complete (pending initial setup popup interaction if shown)");

    } catch (initError) {
        console.error("App Initialization Error:", initError);
        // Use v1.1 error message key
        alert(translate('alertInitError') || `App Initialization Error: ${initError.message}`);
    }


    // ===============================================
    // Event Listener Setup
    // ===============================================
    console.log("DEBUG: Setting up event listeners...");
    try {
        // Tab Bar Clicks
        if (tabBar) {
            tabBar.addEventListener('click', (e) => {
                // Find the button element that was clicked or is an ancestor
                const button = e.target.closest('.tab-button');
                if (button && button.dataset.tab) {
                    const targetTab = button.dataset.tab;
                    if (targetTab) {
                        activateTab(targetTab);
                    }
                }
            });
        } else { console.error("DEBUG: [Error!] tabBar element missing!"); }

        // Form Submissions
        if (form) form.addEventListener('submit', handleFormSubmit);
        if (targetForm) targetForm.addEventListener('submit', handleTargetFormSubmit);

        // Button Clicks - Input Form
        if (cancelEditBtn) cancelEditBtn.addEventListener('click', cancelEdit);

        // Button Clicks - Settings
        if (resetDataButton) resetDataButton.addEventListener('click', handleResetData);
        if (exportDataButton) exportDataButton.addEventListener('click', exportMeasurementData);
        if (importDataButton && importFileInput) {
             importDataButton.addEventListener('click', () => importFileInput.click());
             // Ensure clicking Import again after cancelling works
             importFileInput.addEventListener('click', (e) => { e.target.value = null; });
        }
        if (importFileInput) importFileInput.addEventListener('change', importMeasurementData);
        if (languageSelect) languageSelect.addEventListener('change', handleLanguageChange);
        if (modeSelect) modeSelect.addEventListener('change', handleModeChange);

        // Button Clicks - History Table (Event Delegation)
         if (historyContainer) {
             historyContainer.addEventListener('click', (e) => {
                 // Use specific classes for buttons if possible, or check data attributes
                 const editBtn = e.target.closest('.btn-edit');
                 const deleteBtn = e.target.closest('.btn-delete');

                 if (editBtn && editBtn.dataset.index !== undefined) {
                     handleEditClick(parseInt(editBtn.dataset.index, 10));
                 } else if (deleteBtn && deleteBtn.dataset.index !== undefined) {
                     handleDeleteMeasurement(parseInt(deleteBtn.dataset.index, 10));
                 }
             });
         }

        // Button Clicks - Notes (Keeps) Tab
        if (saveNoteButton) saveNoteButton.addEventListener('click', handleSaveNote);
        if (cancelEditNoteBtn) cancelEditNoteBtn.addEventListener('click', handleCancelEditNote);
        if (noteSortOrderSelect) {
             noteSortOrderSelect.addEventListener('change', (e) => {
                 currentNoteSortOrder = e.target.value;
                 renderNotesList(); // Re-render notes with new sort order
             });
        }
        // Button Clicks - Notes (Keeps) List (Event Delegation)
        if (notesListContainer) {
            notesListContainer.addEventListener('click', (e) => {
                 const editBtn = e.target.closest('.edit-note-button');
                 const deleteBtn = e.target.closest('.delete-note-button');

                if (editBtn && editBtn.dataset.id) {
                    handleEditNoteStart(editBtn.dataset.id); // ID is string
                } else if (deleteBtn && deleteBtn.dataset.id) {
                    handleDeleteNote(deleteBtn.dataset.id, deleteBtn.dataset.title); // ID is string
                }
            });
        }

        // Button Clicks - Chart Controls
        if (chartSelector) chartSelector.addEventListener('click', handleChartSelectorClick);
        if (selectAllChartsBtn) selectAllChartsBtn.addEventListener('click', handleSelectAllCharts);
        if (deselectAllChartsBtn) deselectAllChartsBtn.addEventListener('click', handleDeselectAllCharts);

        // Initial Setup Save Button (v1.1/v1.2)
        if (initialSetupSaveBtn) initialSetupSaveBtn.addEventListener('click', handleInitialSetupSave);
        // No close button listener needed for v1.2 initial setup HTML

        // Swipe Listeners (Attached to body)
        document.body.addEventListener('touchstart', handleTouchStart, { passive: true }); // Try passive true first
        document.body.addEventListener('touchmove', handleTouchMove, { passive: false }); // Need false for potential preventDefault
        document.body.addEventListener('touchend', handleTouchEnd);
        console.log("DEBUG: Swipe listeners attached to body.");

        // Scroll Listener (Optional)
        // setupScrollListener();

        console.log("DEBUG: Event listeners setup complete.");

    } catch (listenerError) {
        console.error(" Event listener setup error:", listenerError);
        // Use v1.1 error message key
        alert(translate('alertListenerError') || `Event Listener Error: ${listenerError.message}`);
    }

}); // DOMContentLoaded End