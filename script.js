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
        tabInput: "측정 입력", tabHistory: "측정 기록", tabReport: "변화 리포트",
        tabTargets: "목표 설정", tabOverview: "Keeps", tabSettings: "설정",
        // Input Tab
        formTitleNew: "측정 시작하기📏 (현재 {week}주차)", formTitleEdit: "측정 기록 수정 ({week}주차)",
        inputDescription: "모든 항목은 선택 사항! 기록하고 싶은 것만 편하게 입력해주세요 😉",
        nextMeasurementInfoNoData: "마지막 측정일을 기준으로 다음 예정일을 계산해요.",
        nextMeasurementInfo: "마지막 측정: {lastDate} ({daysAgo}일 전) | 다음 측정 추천일: {nextDate} ({daysUntil}일 후)",
        nextMeasurementInfoToday: "마지막 측정: {lastDate} ({daysAgo}일 전) | 오늘은 측정하는 날!",
        nextMeasurementInfoOverdue: "마지막 측정: {lastDate} ({daysAgo}일 전) | 측정이 {daysOverdue}일 지났어요!",
        daysAgo: "{count}일 전", daysUntil: "{count}일 후", today: "오늘",
        categoryBodySize: "신체 사이즈 📐", categoryHealth: "건강 💪", categoryMedication: "마법 ✨",
        // Measurement Labels (camelCase keys)
        week: '주차', date: '날짜', timestamp: '기록 시간',
        height: '신장 (cm)', weight: '체중 (kg)', shoulder: '어깨너비 (cm)', neck: '목둘레 (cm)',
        chest: '가슴둘레 (cm)', cupSize: '컵 사이즈', waist: '허리둘레 (cm)', hips: '엉덩이둘레 (cm)',
        thigh: '허벅지둘레 (cm)', calf: '종아리둘레 (cm)', arm: '팔뚝둘레 (cm)',
        muscleMass: '근육량 (kg)', bodyFatPercentage: '체지방률 (%)', libido: '성욕 (회/주)',
        semenStatus: '정액 상태', semenScore: '정액 점수', semenNotes: '정액 상세(텍스트)',
        healthStatus: '건강 상태', healthScore: '건강 점수', healthNotes: '건강 상세(텍스트)',
        skinCondition: '피부 상태',
        estradiol: '에스트라디올 (mg)', progesterone: '프로게스테론 (mg)',
        antiAndrogen: '항안드로겐 (mg)', testosterone: '테스토스테론 (mg)',
        medicationOtherName: '기타 마법 이름',
        medicationOtherDose: '기타 마법 용량 (mg)',
        medicationOtherNamePlaceholder: '(기타)', 
        unitMgPlaceholder: 'mg',
        // Placeholders
        cupSizePlaceholder: '예: 75A', skinConditionPlaceholder: '예: 부드러워짐', libidoPlaceholder: '회/주',
        scorePlaceholder: "점수", notesPlaceholder: "특이사항",
        unitCm: "cm", unitKg: "kg", unitPercent: "%", unitMg: "mg", unitCountPerWeek: "회/주",
        // History Tab
        historyTitle: "측정 기록 꼼꼼히 보기 🧐",
        historyDescription: "(표가 화면보다 넓으면 좌우로 스크롤해보세요!)",
        manageColumn: "관리",
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
        comparisonItem: "항목", comparisonChange: "변화량", comparisonProgress: "달성률",
        targetAchieved: "달성 🎉",
        // Targets Tab
        targetTitle: "나만의 목표 설정 💖",
        targetDescription: "원하는 목표 수치를 입력해주세요. 리포트 탭에서 달성률을 확인할 수 있어요.",
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
        // Initial Setup
        initialSetupTitle: "초기 설정",
        initialSetupDesc: "ShiftV 사용을 시작하기 전에 언어와 모드를 선택해주세요.",
        // Swipe feature
        swipeThresholdMet: "스와이프 감지: {direction}"
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
        tabInput: "Input", tabHistory: "History", tabReport: "Report", tabTargets: "Targets", tabOverview: "Keeps", tabSettings: "Settings",
        // Input Tab
        formTitleNew: "Start Measuring📏 (Current Week {week})", formTitleEdit: "Edit Measurement Record (Week {week})",
        inputDescription: "All fields are optional! Feel free to enter only what you want to track 😉",
        nextMeasurementInfoNoData: "Calculates the next recommended date based on the last measurement.",
        nextMeasurementInfo: "Last: {lastDate} ({daysAgo} ago) | Next recommended: {nextDate} ({daysUntil} away)",
        nextMeasurementInfoToday: "Last: {lastDate} ({daysAgo} ago) | Today is measurement day!",
        nextMeasurementInfoOverdue: "Last: {lastDate} ({daysAgo} ago) | Measurement is {daysOverdue} days overdue!",
        daysAgo: "{count} days ago", daysUntil: "{count} days left", today: "Today",
        categoryBodySize: "Body Size 📐", categoryHealth: "Health 💪", categoryMedication: "Magic ✨",
        // Measurement Labels
        week: 'Week', date: 'Date', timestamp: 'Timestamp',
        height: 'Height (cm)', weight: 'Weight (kg)', shoulder: 'Shoulder Width (cm)', neck: 'Neck Circum. (cm)',
        chest: 'Chest Circum. (cm)', cupSize: 'Cup Size', waist: 'Waist Circum. (cm)', hips: 'Hip Circum. (cm)',
        thigh: 'Thigh Circum. (cm)', calf: 'Calf Circum. (cm)', arm: 'Arm Circum. (cm)',
        muscleMass: 'Muscle Mass (kg)', bodyFatPercentage: 'Body Fat (%)', libido: 'Libido (freq/wk)',
        semenStatus: 'Semen Status', semenScore: 'Semen Score', semenNotes: 'Semen Detail(text)',
        healthStatus: 'Health Status', healthScore: 'Health Score', healthNotes: 'Health Detail(text)',
        skinCondition: 'Skin Condition',
        estradiol: 'Estradiol (mg)', progesterone: 'Progesterone (mg)',
        antiAndrogen: 'Anti-androgen (mg)', testosterone: 'Testosterone (mg)',
        medicationOtherName: 'Other Magic Name',
        medicationOtherDose: 'Other Magic Dose (mg)',
        medicationOtherNamePlaceholder: '(Other)',
        unitMgPlaceholder: 'mg',
        // Placeholders
        cupSizePlaceholder: 'e.g., 34A', skinConditionPlaceholder: 'e.g., Softer', libidoPlaceholder: 'freq/week',
        scorePlaceholder: "Score", notesPlaceholder: "Notes",
        unitCm: "cm", unitKg: "kg", unitPercent: "%", unitMg: "mg", unitCountPerWeek: "freq/wk",
        // History Tab
        historyTitle: "Measurement History 🧐",
        historyDescription: "(If the table is wider than the screen, scroll horizontally!)",
        manageColumn: "Manage",
        // Report Tab
        reportTitle: "My Change Report 📈", reportGraphTitle: "Weekly Change Graph",
        reportGraphDesc: "Select (activate) or deselect items by clicking the buttons. You can overlay multiple items!",
        reportPrevWeekTitle: "Compared to Last Week? 🤔", reportInitialTitle: "Compared to the Beginning? 🌱➡️🌳",
        reportTargetTitle: "How Close to the Target? 🎯",
        reportNeedTwoRecords: "At least two records are needed for comparison.", reportNeedTarget: "Please set your targets in the 'Targets' tab first!",
        chartAxisLabel: "Week", comparisonItem: "Item", comparisonChange: "Change", comparisonProgress: "Progress", targetAchieved: "Achieved 🎉",
        // Targets Tab
        targetTitle: "Set Your Personal Goals 💖", targetDescription: "Enter your desired target values. You can check the progress in the Report tab.",
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
        // Initial Setup
        initialSetupTitle: "Initial Setup", initialSetupDesc: "Before starting ShiftV, please select your language and mode.",
        swipeThresholdMet: "Swipe detected: {direction}"
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
        tabInput: "測定入力", tabHistory: "測定記録", tabReport: "変化レポート", tabTargets: "目標設定", tabOverview: "メモ", tabSettings: "設定",
        // Input Tab
        formTitleNew: "測定開始📏（現在{week}週目）", formTitleEdit: "測定記録を編集（{week}週目）",
        inputDescription: "すべての項目は任意です！記録したいものだけ気軽に入力してください 😉",
        nextMeasurementInfoNoData: "最終測定日を基準に次の予定日を計算します。",
        nextMeasurementInfo: "最終測定: {lastDate} ({daysAgo}日前) | 次回推奨日: {nextDate} ({daysUntil}日後)",
        nextMeasurementInfoToday: "最終測定: {lastDate} ({daysAgo}日前) | 今日は測定日です！",
        nextMeasurementInfoOverdue: "最終測定: {lastDate} ({daysAgo}日前) | 測定が{daysOverdue}日遅れています！",
        daysAgo: "{count}日前", daysUntil: "{count}日後", today: "今日",
        categoryBodySize: "身体サイズ 📐", categoryHealth: "健康 💪", categoryMedication: "魔法 ✨",
        // Measurement Labels
        week: '週目', date: '日付', timestamp: '記録時間',
        height: '身長 (cm)', weight: '体重 (kg)', shoulder: '肩幅 (cm)', neck: '首周り (cm)',
        chest: '胸囲 (cm)', cupSize: 'カップサイズ', waist: '腹囲 (cm)', hips: 'ヒップ (cm)',
        thigh: '太もも周り (cm)', calf: 'ふくらはぎ周り (cm)', arm: '腕周り (cm)',
        muscleMass: '筋肉量 (kg)', bodyFatPercentage: '体脂肪率 (%)', libido: '性欲 (回/週)',
        semenStatus: '精液の状態', semenScore: '精液スコア', semenNotes: '精液状態(テキスト)',
        healthStatus: '健康状態', healthScore: '健康スコア', healthNotes: '健康状態(テキスト)',
        skinCondition: '肌の状態',
        estradiol: 'エストラジオール (mg)', progesterone: 'プロゲステロン (mg)',
        antiAndrogen: '抗アンドロゲン (mg)', testosterone: 'テストステロン (mg)',
        medicationOtherName: 'その他の魔法名',
        medicationOtherDose: 'その他の魔法用量 (mg)',
        medicationOtherNamePlaceholder: '（その他）',
        unitMgPlaceholder: 'mg',
        // Placeholders
        cupSizePlaceholder: '例: C70', skinConditionPlaceholder: '例: 柔らかくなった', libidoPlaceholder: '回/週',
        scorePlaceholder: "点数", notesPlaceholder: "特記事項",
        unitCm: "cm", unitKg: "kg", unitPercent: "%", unitMg: "mg", unitCountPerWeek: "回/週",
        // History Tab
        historyTitle: "測定記録の詳細 🧐", historyDescription: "（表が画面より広い場合は、左右にスクロールしてください！）", manageColumn: "管理",
        // Report Tab
        reportTitle: "私の変化レポート 📈", reportGraphTitle: "週ごとの変化グラフ",
        reportGraphDesc: "見たい項目のボタンを押して選択（アクティブ化）または解除できます。複数の項目を重ねて表示することも可能です！",
        reportPrevWeekTitle: "先週と比較すると？ 🤔", reportInitialTitle: "最初と比較すると？ 🌱➡️🌳", reportTargetTitle: "目標まであとどれくらい？ 🎯",
        reportNeedTwoRecords: "比較するには、少なくとも2つの記録が必要です。", reportNeedTarget: "まず「目標設定」タブで目標を入力してください！",
        chartAxisLabel: "週目", comparisonItem: "項目", comparisonChange: "変化量", comparisonProgress: "達成率", targetAchieved: "達成 🎉",
        // Targets Tab
        targetTitle: "自分だけの目標設定 💖", targetDescription: "希望する目標数値を入力してください。レポートタブで達成率を確認できます。",
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
        // Initial Setup
        initialSetupTitle: "初期設定", initialSetupDesc: "ShiftVを使用する前に、言語とモードを選択してください。",
        swipeThresholdMet: "スワイプ検出: {direction}"
    }
};
// --- Main Application Logic ---
document.addEventListener('DOMContentLoaded', () => {
    console.log(`DEBUG: ShiftV App Initializing v${APP_VERSION}...`);

    // --- State Variables ---
    const PRIMARY_DATA_KEY = 'shiftV_Data_v1_1';
    const SETTINGS_KEY = 'shiftV_Settings_v1_0';
    let chartInstance = null;
    let measurements = [];
    let targets = {};
    let notes = [];
    let currentNoteSortOrder = 'newest';
    let selectedMetrics = ['weight'];
    let currentLanguage = 'ko';
    let currentMode = 'mtf';
    let isInitialSetupDone = false;
    let lastScrollY = window.scrollY;
    let isTabBarCollapsed = false;
    let currentTheme = 'system'; // *** 수정 4: 테마 상태 변수 추가 ***

    // --- DOM Element References ---
    const mainTitle = document.querySelector('#main-title');
    const tabBar = document.querySelector('.tab-bar');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContentsContainer = document.querySelector('.tab-contents');
    const tabContents = document.querySelectorAll('.tab-content');
    const savePopup = document.getElementById('save-popup');
    const versionDisplays = document.querySelectorAll('#app-version-display, #app-version-display-footer');
    const bodyElement = document.body;
    // Initial Setup Popup
    const initialSetupPopup = document.getElementById('initial-setup-popup');
    const initialLanguageSelect = document.getElementById('initial-language-select');
    const initialModeSelect = document.getElementById('initial-mode-select');
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
    // Overview (Keeps) Tab
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
    const modeSelect = document.getElementById('mode-select');
    const themeSelect = document.getElementById('theme-select'); // *** 수정 4: 테마 선택 요소 참조 ***
    const langLabel = document.querySelector('label[for="language-select"]');
    const modeLabel = document.querySelector('label[for="mode-select"]');

    console.log("DEBUG: DOM elements fetched.");
    // --- Constants for Measurement Keys (Using camelCase) ---
    const bodySizeKeys = ['height', 'weight', 'shoulder', 'neck', 'chest', 'cupSize', 'waist', 'hips', 'thigh', 'calf', 'arm'];
    const healthKeys = ['muscleMass', 'bodyFatPercentage', 'libido', 'semenScore', 'healthScore', 'skinCondition', 'semenNotes', 'healthNotes'];
    const medicationKeys_MtF = ['estradiol', 'progesterone', 'antiAndrogen'];
    const medicationKeys_FtM = ['testosterone'];
    const baseNumericKeys = [
        'height', 'weight', 'shoulder', 'neck', 'chest', 'waist', 'hips', 'thigh', 'calf', 'arm',
        'muscleMass', 'bodyFatPercentage', 'libido', 'semenScore', 'healthScore',
        'estradiol', 'progesterone', 'antiAndrogen', 'testosterone',
        'medicationOtherDose' 
    ];
    const textKeys = ['cupSize', 'semenNotes', 'healthNotes', 'skinCondition', 'medicationOtherName'];
    const displayKeysInOrder = [
        'week', 'date',
        'height', 'weight', 'shoulder', 'neck', 'chest', 'cupSize', 'waist', 'hips', 'thigh', 'calf', 'arm',
        'muscleMass', 'bodyFatPercentage', 'libido', 'skinCondition', 'healthScore', 'healthNotes',
        'semenScore', 'semenNotes',
        'estradiol', 'progesterone', 'antiAndrogen', 'testosterone',
        'medicationOtherName', 'medicationOtherDose', 
        'timestamp'
    ];
    const chartSelectableKeys = baseNumericKeys.filter(k => !k.includes('Score'));
    const targetSettingKeys = baseNumericKeys.filter(k =>
        bodySizeKeys.includes(k) || ['muscleMass', 'bodyFatPercentage'].includes(k)
    ).filter(k => !textKeys.includes(k));
    const comparisonKeys = [
        'weight', 'muscleMass', 'bodyFatPercentage',
        'shoulder', 'neck', 'chest', 'waist', 'hips', 'thigh', 'calf', 'arm'
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

    function translateUI() {
        console.log(`DEBUG: Translating UI to ${currentLanguage}`);
        document.documentElement.lang = currentLanguage.split('-')[0];

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

                if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder !== undefined) {
                    // Placeholder 처리 로직
                    const placeholderKey = key + 'Placeholder';
                    let placeholderText = translate(placeholderKey);
                    // If specific placeholder key doesn't exist, fallback to main key? Or default?
                    if (placeholderText === placeholderKey) { // Translation not found for specific key
                        if (el.type === 'number') placeholderText = translate('unit' + key.charAt(0).toUpperCase() + key.slice(1)) || translate(key).split('(')[1]?.replace(')', '') || 'Value'; // Try unit or number
                        else if (el.type === 'text') placeholderText = translate('notesPlaceholder') || 'Text';
                        else placeholderText = translate(key) || 'Input'; // Fallback to main key or generic 'Input'
                    }
                     el.placeholder = placeholderText;

                } else if (el.tagName === 'BUTTON' || el.tagName === 'OPTION' || el.tagName === 'LEGEND' || el.tagName === 'LABEL' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'P' || el.tagName === 'SPAN' || el.tagName === 'STRONG' || el.tagName === 'TD' || el.tagName === 'TH') {
                     // 단순 텍스트 요소 업데이트
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
        if (saveNoteButton) saveNoteButton.textContent = translate(editNoteIdInput.value === '' ? 'saveNote' : 'edit');
        if (cancelEditBtn) cancelEditBtn.textContent = translate('cancelEdit');
        if (cancelEditNoteBtn) cancelEditNoteBtn.textContent = translate('cancelEdit');
        if (selectAllChartsBtn) selectAllChartsBtn.textContent = translate('selectAll');
        if (deselectAllChartsBtn) deselectAllChartsBtn.textContent = translate('deselectAll');
        if (saveTargetsButton) saveTargetsButton.textContent = translate('saveTarget');
        if (exportDataButton) exportDataButton.textContent = translate('exportData');
        if (importDataButton) importDataButton.textContent = translate('importData');
        if (resetDataButton) resetDataButton.textContent = translate('resetDataButton');
        if (initialSetupSaveBtn) initialSetupSaveBtn.textContent = translate('saveSettings');

        // Dynamic Titles
        updateFormTitle(); // 주차 계산 및 번역
        if (noteFormTitle) noteFormTitle.textContent = translate(editNoteIdInput.value === '' ? 'noteNewTitle' : 'noteEditTitle');

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
        if (noteSortOrderSelect) {
             Array.from(noteSortOrderSelect.options).forEach(option => {
                const key = option.value === 'newest' ? 'sortNewest' : 'sortOldest';
                option.textContent = translate(key);
            });
            noteSortOrderSelect.value = currentNoteSortOrder;
        }
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
        setupTargetInputs(true);
        renderHistoryTable();
        renderAllComparisonTables();
        renderNotesList();
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
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        } else {
            return `${year}-${month}-${day}`;
        }
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
             if(themeColorMeta) themeColorMeta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--lm-bg').trim() || '#FFF0F5'); // 라이트 모드 배경색
         } else {
             document.body.classList.add('dark-mode');
             if(themeColorMeta) themeColorMeta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg-dark').trim() || '#1E1E48'); // 다크 모드 배경색
         }
         // Update chart colors if chart exists
         if(chartInstance) {
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
            selectedMetrics: selectedMetrics
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
                console.log("DEBUG: Settings loaded", settings);
            } else {
                console.log("DEBUG: No settings found, using defaults.");
                currentLanguage = navigator.language.startsWith('ko') ? 'ko' : navigator.language.startsWith('ja') ? 'ja' : 'en';
                currentMode = 'mtf';
                currentTheme = 'system'; // *** 수정 4: 기본 테마 설정 ***
                isInitialSetupDone = false;
                selectedMetrics = ['weight'];
            }
             // Update UI elements after loading settings
             if (languageSelect) languageSelect.value = currentLanguage;
             if (modeSelect) modeSelect.value = currentMode;
             if (themeSelect) themeSelect.value = currentTheme; // *** 수정 4: 테마 드롭다운 업데이트 ***
        } catch (e) {
            console.error("Error loading settings:", e);
            showPopup('loadingError');
             // Fallback to defaults
             currentLanguage = 'ko';
             currentMode = 'mtf';
             currentTheme = 'system';
             isInitialSetupDone = false;
             selectedMetrics = ['weight'];
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
        if (!initialLanguageSelect || !initialModeSelect) {
             console.error("Initial setup select elements missing during save."); return;
        }
        currentLanguage = initialLanguageSelect.value;
        currentMode = initialModeSelect.value;
        isInitialSetupDone = true;
        console.log("DEBUG: Initial setup saved.", { lang: currentLanguage, mode: currentMode });

        saveSettingsToStorage(); // Save basic settings (lang, mode, setupDone)
        hideInitialSetupPopup();
        applyModeToUI();
        applyLanguageToUI(); // This triggers translateUI
        loadPrimaryDataFromStorage(); // Load data AFTER setup complete
        applyTheme(); // Apply theme AFTER settings are saved/loaded
        setupTargetInputs();
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

        if(modeSelect) modeSelect.value = currentMode;
        setupTargetInputs(true); // Update target inputs visibility/labels

         if (isInitialSetupDone){ // Avoid unnecessary renders during initial setup
             renderHistoryTable();
             renderAllComparisonTables();
             renderChartSelector();
             renderChart();
         }
    }

    function applyLanguageToUI() {
        if(languageSelect) languageSelect.value = currentLanguage;
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

    function getCurrentWeekNumber() {
        if (measurements.length === 0) return 0;
        return measurements.length - 1; // 0-based index
    }

    function updateCurrentWeekDisplay() {
        if (currentWeekSpan) {
             currentWeekSpan.textContent = getCurrentWeekNumber();
        }
    }

    function updateFormTitle() {
        if (!formTitle) return;
        let week = 0;
        const editIndexVal = editIndexInput.value;
        if (editIndexVal !== '' && !isNaN(editIndexVal)) {
             const index = parseInt(editIndexVal, 10);
             if (index >= 0 && index < measurements.length && measurements[index].week !== undefined) {
                 week = measurements[index].week;
             } else { week = getCurrentWeekNumber(); }
        } else { week = measurements.length; }
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
            keys = keys.filter(k => !medicationKeys_FtM.includes(k));
        } else if (currentMode === 'ftm') {
            keys = keys.filter(k => !medicationKeys_MtF.includes(k) && k !== 'cupSize' && !k.startsWith('semen'));
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
        if (!historyContainer) return;
        if (!measurements || measurements.length === 0) {
            clearElement(historyContainer, "noDataYet"); return;
        }
        try {
             measurements.sort((a, b) => (a.week || 0) - (b.week || 0));
             const currentDisplayKeys = getFilteredDisplayKeys();
             let tableHTML = '<table><thead><tr>';
             currentDisplayKeys.forEach(key => {
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
                 currentDisplayKeys.forEach(key => {
                      if (key === 'timestamp') return;
                      let value = '-';
                      if (key === 'week') { value = m.week ?? i; }
                      else if (key === 'date') { value = displayDate; }
                      else { value = formatValue(m[key], key); }
                      tableHTML += `<td>${value}</td>`;
                 });
                 tableHTML += `<td class="action-buttons sticky-col">`;
                 tableHTML += `<button class="btn btn-edit" data-index="${i}">${translate('edit')}</button>`;
                 tableHTML += `<button class="btn btn-delete" data-index="${i}">${translate('delete')}</button>`;
                 tableHTML += `</td>`;
                 tableHTML += '</tr>';
             }
             tableHTML += '</tbody></table>';
             historyContainer.innerHTML = tableHTML;
             console.log("DEBUG: <- renderHistoryTable complete");
        } catch (e) {
            console.error(" Error rendering history table:", e);
            historyContainer.innerHTML = `<p style="color: red;">${translate('alertGenericError')}</p>`;
        }
    }

    // --- Report Tab Rendering ---
    function renderComparisonTable(container, titleKey, dataCalculator) {
        if (!container) return;
        const dataResult = dataCalculator();
        const data = dataResult.data;
        const headers = dataResult.headers;
        const titleElement = document.getElementById(container.id.replace('-container', '-title'));
        if(titleElement) titleElement.textContent = translate(titleKey);

        if (!data || data.length === 0) {
             if (titleKey === 'reportTargetTitle' && Object.keys(targets).length === 0) clearElement(container, 'reportNeedTarget');
             else if (measurements.length < 2 && (titleKey === 'reportPrevWeekTitle' || titleKey === 'reportInitialTitle')) clearElement(container, 'reportNeedTwoRecords');
             else if (measurements.length === 0) clearElement(container, 'noDataYet');
             else clearElement(container, 'noDataForChart');
            return;
        }
        let tableHTML = `<table class="comparison-table"><thead><tr>`;
        headers.forEach(header => tableHTML += `<th>${header}</th>`);
        tableHTML += `</tr></thead><tbody>`;
        data.forEach(item => {
            tableHTML += `<tr>`;
            if (Array.isArray(item)) {
                 item.forEach(cellData => {
                     let value = cellData;
                     let className = '';
                     if (typeof cellData === 'object' && cellData !== null) {
                         value = cellData.value; className = cellData.class || '';
                     }
                     tableHTML += `<td ${className ? `class="${className}"` : ''}>${value}</td>`;
                 });
            }
            tableHTML += `</tr>`;
        });
        tableHTML += `</tbody></table>`;
        container.innerHTML = tableHTML;
    }

    function calculatePrevWeekComparison() {
        const headers = [translate('comparisonItem'), translate('comparisonChange')];
        if (measurements.length < 2) return { data: [], headers };
        const lastWeek = measurements[measurements.length - 1];
        const secondLastWeek = measurements[measurements.length - 2];
        const data = [];
        getFilteredNumericKeys().forEach(key => {
            const lastValue = parseFloat(lastWeek[key]);
            const secondLastValue = parseFloat(secondLastWeek[key]);
            let change = '-'; let changeClass = '';
            if (!isNaN(lastValue) && !isNaN(secondLastValue)) {
                const diff = lastValue - secondLastValue;
                change = formatValue(diff, key);
                const threshold = 0.05;
                if (diff > threshold) { change = `+${change}`; changeClass = 'positive-change'; }
                else if (diff < -threshold) { changeClass = 'negative-change'; }
                 data.push([ translate(key).split('(')[0].trim(), { value: change, class: changeClass } ]);
            }
        });
        return { data, headers };
    }

    function calculateInitialComparison() {
        const headers = [translate('comparisonItem'), translate('comparisonChange')];
        if (measurements.length < 1) return { data: [], headers };
        const initial = measurements[0];
        const latest = measurements[measurements.length - 1];
        const isOnlyOneRecord = measurements.length === 1;
        const data = [];
        getFilteredNumericKeys().forEach(key => {
            const initialValue = parseFloat(initial[key]);
            const latestValue = parseFloat(latest[key]);
            let change = '-'; let changeClass = '';
            if (!isOnlyOneRecord && !isNaN(initialValue) && !isNaN(latestValue)) {
                 const diff = latestValue - initialValue;
                 change = formatValue(diff, key);
                 const threshold = 0.05;
                 if (diff > threshold) { change = `+${change}`; changeClass = 'positive-change'; }
                 else if (diff < -threshold) { changeClass = 'negative-change'; }
                 data.push([ translate(key).split('(')[0].trim(), { value: change, class: changeClass } ]);
            }
        });
        return { data, headers };
    }

    // *** 수정 2: 달성률 계산 수정 (100% 상한 적용) ***
// *** 수정: 새로운 달성률 공식 적용 ***
function calculateTargetComparison() {
    const headers = [translate('comparisonItem'), translate('comparisonProgress')];
    // Use targetSettingKeys which filters for numeric, non-text body/health keys
    const relevantTargetKeys = targetSettingKeys.filter(k => targets[k] !== null && targets[k] !== undefined && targets[k] !== '');

    // Need at least one measurement and one relevant target set
    if (measurements.length === 0 || relevantTargetKeys.length === 0) {
        // console.log("DEBUG: Target comparison skipped - no measurements or relevant targets."); // 디버깅 로그 필요시 주석 해제
        return { data: [], headers };
    }

    const latestMeasurement = measurements[measurements.length - 1];
    const data = [];
    const zeroThreshold = 0.0001; // 부동 소수점 0 비교를 위한 임계값

    // console.log("DEBUG: Calculating target comparison for keys:", relevantTargetKeys); // 디버깅 로그 필요시 주석 해제

    relevantTargetKeys.forEach(key => {
        const targetValue = parseFloat(targets[key]);
        const currentValue = parseFloat(latestMeasurement[key]);

        let achievementRateNum = NaN; // 계산 실패 시 NaN 유지
        let achievementRateStr = '-';
        let rateClass = '';

        // 목표치(targetValue)와 현재기록치(currentValue)가 유효한 숫자인지 확인
        if (!isNaN(targetValue) && !isNaN(currentValue)) {
            // console.log(`DEBUG: Comparing Key: ${key}, Current: ${currentValue}, Target: ${targetValue}`); // 디버깅 로그 필요시 주석 해제

            // --- ▼▼▼ 요청하신 새로운 달성률 계산 로직 적용 ▼▼▼ ---
            if (Math.abs(targetValue) < zeroThreshold) { // 만약 목표치 == 0 이라면:
                if (Math.abs(currentValue) < zeroThreshold) { // 현재기록치 == 0 이면:
                    achievementRateNum = 100; // 100%
                } else { // 현재기록치 != 0 이면:
                    achievementRateNum = 0; // 0%
                }
            } else { // 만약 목표치 != 0 이라면:
                // 근접도 (%) = MAX(0, (1 - |현재기록치 - 목표치| / |목표치|) * 100)
                const absoluteDifference = Math.abs(currentValue - targetValue);
                const absoluteTarget = Math.abs(targetValue); // 여기서 targetValue는 0이 아님
                // 0으로 나누는 경우 방지 (이론상 발생 안 함)
                if (absoluteTarget > zeroThreshold) {
                     achievementRateNum = Math.max(0, (1 - (absoluteDifference / absoluteTarget)) * 100);
                } else {
                    // 혹시 모를 극단적인 경우 처리 (목표치가 0에 매우 가깝지만 0은 아닐 때)
                    achievementRateNum = (Math.abs(currentValue) < zeroThreshold) ? 100 : 0;
                }
            }
            // --- ▲▲▲ 새로운 달성률 계산 로직 끝 ▲▲▲ ---

            // 계산이 성공했는지 확인 (결과가 NaN이 아닌지)
            if (!isNaN(achievementRateNum)) {
                achievementRateStr = `${achievementRateNum.toFixed(0)}%`; // 정수로 표시

                // 계산된 비율에 따라 CSS 클래스 결정
                if (achievementRateNum >= 100) { // 100% 이상 달성 (정확히 100 포함)
                    rateClass = 'target-achieved';
                } else if (achievementRateNum >= 80) { // 80% 이상
                    rateClass = 'positive-change'; // 목표 근접 (긍정적)
                } else if (achievementRateNum > 50) { // 50% 초과
                   rateClass = ''; // 중간 정도는 특별 클래스 없음
                } else { // 50% 이하
                    rateClass = 'negative-change'; // 목표와 거리 있음 (부정적)
                }
                // console.log(`DEBUG: Key ${key} - Final Rate Str: ${achievementRateStr}, Class: ${rateClass}`); // 디버깅 로그 필요시 주석 해제
            } else {
                // console.log(`DEBUG: Key ${key} - Calculation failed (NaN).`); // 디버깅 로그 필요시 주석 해제
                achievementRateStr = '-';
                rateClass = '';
            }

             // 테이블 렌더링을 위한 데이터 배열에 추가
            data.push([
                translate(key).split('(')[0].trim(), // 항목 이름
                { value: achievementRateStr, class: rateClass } // 진행률 값 및 클래스
            ]);

        } else {
            // 목표값 또는 현재값이 유효한 숫자가 아니지만, 목표 자체는 설정된 경우
            if (!isNaN(targetValue)) {
                // console.log(`DEBUG: Key ${key} - Current value is invalid, cannot compare.`); // 디버깅 로그 필요시 주석 해제
                data.push([
                    translate(key).split('(')[0].trim(),
                    { value: '-', class: '' }
                ]);
            } else {
               // console.log(`DEBUG: Key ${key} - Target value is invalid.`); // 디버깅 로그 필요시 주석 해제
               // 목표값 자체가 유효하지 않으면 행을 추가하지 않을 수도 있음 (선택사항)
            }
        }
    }); // End forEach loop

    // console.log("DEBUG: Target comparison data generated:", data); // 디버깅 로그 필요시 주석 해제
    return { data, headers };
}

    function renderAllComparisonTables() {
        renderComparisonTable(prevWeekComparisonContainer, 'reportPrevWeekTitle', calculatePrevWeekComparison);
        renderComparisonTable(initialComparisonContainer, 'reportInitialTitle', calculateInitialComparison);
        renderComparisonTable(targetComparisonContainer, 'reportTargetTitle', calculateTargetComparison);
    }

    const metricButtonColors = {};
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
            const color = `hsl(${hue}, 70%, 55%)`;
            button.style.borderColor = color;
            metricButtonColors[key] = color;
            if (selectedMetrics.includes(key)) {
                 button.classList.add('active');
                 button.style.color = 'var(--lm-bg-card, #fff)'; // Use CSS var for text color
                 button.style.backgroundColor = color;
            } else {
                 button.classList.remove('active');
                 button.style.color = color;
                 button.style.backgroundColor = 'var(--bg-dark, #1d1d45)'; // Use CSS var for background
            }
            chartSelector.appendChild(button);
        });
    }

    function handleChartSelectorClick(event) {
        if (!event.target.classList.contains('chart-select-button')) return;
        const metric = event.target.dataset.metric; if (!metric) return;
        const button = event.target;
        const color = metricButtonColors[metric];
        if (selectedMetrics.includes(metric)) {
            selectedMetrics = selectedMetrics.filter(m => m !== metric);
            button.classList.remove('active');
            button.style.color = color;
            button.style.backgroundColor = 'var(--bg-dark, #1d1d45)';
        } else {
            selectedMetrics.push(metric);
            button.classList.add('active');
            button.style.color = 'var(--lm-bg-card, #fff)';
            button.style.backgroundColor = color;
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

    function renderChart() {
        if (!chartCanvas) return;
        const ctx = chartCanvas.getContext('2d'); if (!ctx) return;
        const metricsToRender = selectedMetrics.filter(key => getFilteredChartKeys().includes(key));

        if (measurements.length < 1 || metricsToRender.length === 0) {
            if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
            ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#5e5ebf'; // Use CSS variable
            ctx.font = '16px sans-serif';
            ctx.fillText(translate('noDataForChart'), chartCanvas.width / 2, chartCanvas.height / 2);
            return;
        }
        const labels = measurements.map(m => m.week ?? '-');
        const datasets = metricsToRender.map(metric => {
             const color = metricButtonColors[metric] || '#007bff';
             const translatedLabel = translate(metric).split('(')[0].trim();
             return {
                 label: translatedLabel,
                 data: measurements.map(m => m[metric] !== undefined && m[metric] !== null && m[metric] !== '' ? parseFloat(m[metric]) : NaN),
                 borderColor: color,
                 backgroundColor: color + '33',
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
                        type: 'linear', title: { display: true, text: translate('chartAxisLabel'), color: '#5e5ebf' },
                        ticks: {
                             stepSize: 1,
                             callback: function(value) { if (Number.isInteger(value) && value >= 0) { return value; } return null; },
                             color: '#5e5ebf'
                        },
                        border:{
                            display:true,
                            color: '#5e5ebf'
                        },
                        grid: { display: true , color: '#5e5ebf'}
                    },
                     y: {
                        beginAtZero: false, title: { display: false },
                        border:{
                            display:true,
                            color: '#5e5ebf'
                        },

                        grid: { color: '#5e5ebf' }, // Use CSS var
                        ticks: { color: '#5e5ebf' } // Use CSS var for tick color
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index', intersect: false,
                        callbacks: {
                            title: function(tooltipItems) { return tooltipItems.length > 0 ? `${translate('week')} ${tooltipItems[0].parsed.x}` : ''; },
                            label: function(context) {
                                let label = context.dataset.label || ''; let value = context.parsed.y;
                                if (label) { label += ': '; }
                                if (value !== null && !isNaN(value)) {
                                    let originalKey = ''; const datasetIndex = context.datasetIndex;
                                    if (metricsToRender[datasetIndex]) { originalKey = metricsToRender[datasetIndex]; }
                                    else { originalKey = context.dataset.label; } // Fallback
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

    function renderNotesList() {
        if (!notesListContainer) return;
        if (notes.length === 0) { clearElement(notesListContainer, "noNotesYet"); return; }
        const sortedNotes = sortNotes(notes, currentNoteSortOrder);
        let notesHTML = '<div class="notes-grid">';
        sortedNotes.forEach(note => {
            const title = note.title || translate('noteTitleUntitled');
            const previewLength = 100;
            const previewContent = note.content ? (note.content.length > previewLength ? note.content.substring(0, previewLength).replace(/\n/g, ' ') + '...' : note.content.replace(/\n/g, ' ')) : translate('notePreviewEmpty');
            const createdStr = formatTimestamp(note.timestamp || note.createdAt || note.id, true);
            notesHTML += `
             <div class="note-card card" data-note-id="${note.id}">
                    <h4>${escapeHTML(title)}</h4>
                     <p class="note-content-preview">${escapeHTML(previewContent)}</p>
                    <p class="note-timestamp">${translate('noteDateCreated')} ${createdStr}</p>
                     <div class="note-actions">
                        <button class="edit-note-button btn btn-sm btn-outline" data-id="${note.id}">${translate('edit')}</button>
                        <button class="delete-note-button btn btn-sm btn-danger" data-id="${note.id}" data-title="${escapeHTML(title)}">${translate('delete')}</button>
                    </div>
                </div>
            `;
        });
        notesHTML += '</div>';
        notesListContainer.innerHTML = notesHTML;
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
            else return !medicationKeys_MtF.includes(key) && key !== 'cupSize' && !key.startsWith('semen');
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
             let value = formData.get(key); // Get value using the camelCase key
             const inputElement = form.querySelector(`[name="${key}"]`); // Find element by camelCase name

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
            [...baseNumericKeys, ...textKeys, 'date'].forEach(key => { // Add date key
                const input = form.querySelector(`[name="${key}"]`); // Find by camelCase name
                if (input) {
                    if (measurementToEdit.hasOwnProperty(key)) {
                        if(key === 'date' && measurementToEdit[key]) {
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
            activateTab('tab-input');
            setTimeout(() => {
                form.scrollIntoView({ behavior: 'smooth', block: 'start' });
                const firstVisibleInput = form.querySelector('fieldset:not([style*="display: none"]) input, fieldset:not([style*="display: none"]) textarea');
                if(firstVisibleInput) firstVisibleInput.focus();
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
        renderAllComparisonTables();
    }

    // Save/Update Note
    function handleSaveNote() {
         const title = noteTitleInput.value.trim();
         const content = noteContentInput.value.trim();
         const noteId = editNoteIdInput.value;
         if (!content && !title) { showPopup('alertNoteContentMissing'); noteContentInput.focus(); return; }
         if (noteId) {
             const noteIndex = notes.findIndex(n => n.id === noteId);
             if (noteIndex !== -1) {
                 notes[noteIndex].title = title; notes[noteIndex].content = content;
                 notes[noteIndex].timestamp = Date.now();
                 console.log("DEBUG: Note (Keeps) updated", notes[noteIndex]);
                 showPopup('popupNoteUpdateSuccess');
             } else { console.error("Cannot find note to update:", noteId); showPopup('alertCannotFindNoteEdit'); handleCancelEditNote(); return; }
         } else {
             const newNote = {
                 id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
                 title: title, content: content, timestamp: Date.now()
             };
             notes.push(newNote); console.log("DEBUG: New note (Keeps) added", newNote); showPopup('popupNoteSaveSuccess');
         }
         savePrimaryDataToStorage(); handleCancelEditNote(); renderNotesList();
     }

     // Start Edit Note
     function handleEditNoteStart(noteId) {
         const noteToEdit = notes.find(n => n.id === noteId);
         if (noteToEdit) {
             editNoteIdInput.value = noteId; noteTitleInput.value = noteToEdit.title || ''; noteContentInput.value = noteToEdit.content || '';
             if (noteFormTitle) noteFormTitle.textContent = translate('noteEditTitle');
             if (saveNoteButton) saveNoteButton.textContent = translate('edit');
             if (cancelEditNoteBtn) cancelEditNoteBtn.style.display = 'inline-block';
             noteTitleInput.focus();
             if (noteFormArea) noteFormArea.scrollIntoView({ behavior: 'smooth' });
         } else { console.error("Cannot find note to edit:", noteId); showPopup('alertCannotFindNoteEdit'); }
     }

     // Cancel Edit Note
     function handleCancelEditNote() {
         editNoteIdInput.value = ''; noteTitleInput.value = ''; noteContentInput.value = '';
         if (noteFormTitle) noteFormTitle.textContent = translate('noteNewTitle');
         if (saveNoteButton) saveNoteButton.textContent = translate('saveNote');
         if (cancelEditNoteBtn) cancelEditNoteBtn.style.display = 'none';
     }

     // Delete Note
     function handleDeleteNote(noteId, noteTitle) {
        const titleToShow = noteTitle || translate('noteTitleUntitled');
        if (confirm(translate('confirmDeleteNote', { title: titleToShow }))) {
            notes = notes.filter(n => n.id !== noteId);
            savePrimaryDataToStorage(); renderNotesList(); showPopup('popupNoteDeleteSuccess');
             if (editNoteIdInput.value === noteId) { handleCancelEditNote(); }
        }
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
             measurements = []; targets = {}; notes = [];
             selectedMetrics = ['weight'];
             isInitialSetupDone = false;
             saveSettingsToStorage();

             clearElement(historyContainer, "noDataYet");
             clearElement(prevWeekComparisonContainer, "noDataYet");
             clearElement(initialComparisonContainer, "noDataYet");
             clearElement(targetComparisonContainer, "noDataYet");
             clearElement(notesListContainer, "noNotesYet");
             if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
             renderChartSelector();
             setupTargetInputs(true);
             resetFormState(); handleCancelEditNote();
             updateCurrentWeekDisplay(); renderNextMeasurementInfo(); renderChart();
             showPopup('popupDataResetSuccess', 3000);
             setTimeout(() => window.location.reload(), 1000);
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
         reader.onload = function(e) {
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
                     setupTargetInputs(); renderAll(); activateTab('tab-history');
                 } else { console.error("Import failed: Invalid file structure."); showPopup('alertImportInvalidFile', 4000); }
             } catch (err) { console.error("Error parsing imported file:", err); showPopup('alertImportReadError', 4000); }
             finally { if (importFileInput) importFileInput.value = ''; }
         };
         reader.onerror = function(e) { console.error("Error reading file:", e); showPopup('alertImportFileReadError', 4000); if (importFileInput) importFileInput.value = ''; };
         reader.readAsText(file);
     }

    // --- Swipe Navigation ---
    let touchStartX = 0; let touchEndX = 0; let touchStartY = 0;
    const swipeThreshold = 50; let isSwiping = false;
    function handleTouchStart(e) {
        const target = e.target;
        if (target.closest('.tab-bar, button, input, textarea, select, .table-responsive, .chart-controls, .chart-container, .note-actions, .modal-content, .notes-grid, [data-no-swipe]')) {
            isSwiping = false; return;
        }
        touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY; isSwiping = true;
    }
    function handleTouchMove(e) {
        if (!isSwiping) return;
        const currentX = e.changedTouches[0].screenX; const currentY = e.changedTouches[0].screenY;
        const deltaX = currentX - touchStartX; const deltaY = currentY - touchStartY;
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) { isSwiping = false; return; }
        touchEndX = currentX;
    }
    function handleTouchEnd(e) {
        if (!isSwiping) return; isSwiping = false; touchEndX = e.changedTouches[0].screenX;
        const deltaX = touchEndX - touchStartX;
        if (Math.abs(deltaX) > swipeThreshold) {
            const direction = deltaX < 0 ? 'left' : 'right';
            console.log("DEBUG: Swipe detected:", direction); navigateTabs(direction);
        }
        touchStartX = 0; touchEndX = 0; touchStartY = 0;
    }
    function navigateTabs(direction) {
        if (!tabBar) return; const currentActiveButton = tabBar.querySelector('.tab-button.active'); if (!currentActiveButton) return;
        const buttons = Array.from(tabBar.querySelectorAll('.tab-button'));
        const currentIndex = buttons.findIndex(btn => btn === currentActiveButton); let nextIndex;
        if (direction === 'left') { nextIndex = (currentIndex + 1) % buttons.length; }
        else { nextIndex = (currentIndex - 1 + buttons.length) % buttons.length; }
        if (nextIndex !== currentIndex && buttons[nextIndex]) {
            console.log(`DEBUG: Navigating via swipe from index ${currentIndex} to ${nextIndex}`);
            activateTab(buttons[nextIndex].dataset.tab);
        }
    }

    // --- Tab Activation ---
    function activateTab(targetTabId) {
        if (!tabBar) return; console.log("DEBUG: Activating tab:", targetTabId);
        tabButtons.forEach(button => button.classList.remove('active'));
        tabContents.forEach(content => content.style.display = 'none');
        const targetButton = tabBar.querySelector(`[data-tab="${targetTabId}"]`);
        const targetContent = document.getElementById(targetTabId);
        if (targetButton) { targetButton.classList.add('active'); }
        if (targetContent) {
            targetContent.style.display = 'block';
             if (targetTabId === 'tab-history') { renderHistoryTable(); }
             else if (targetTabId === 'tab-change-report') { renderChart(); renderAllComparisonTables(); }
             else if (targetTabId === 'tab-overview') { renderNotesList(); }
             else if (targetTabId === 'tab-targets') { populateTargetInputs(); setupTargetInputs(true); }
             else if (targetTabId === 'tab-input') { renderNextMeasurementInfo(); }
        } else {
             console.error("Target tab content not found:", targetTabId);
             const firstTabButton = tabBar.querySelector('.tab-button');
             if(firstTabButton) activateTab(firstTabButton.dataset.tab);
        }
    }

    // --- Global Render Function ---
     function renderAll() {
         console.log("DEBUG: === renderAll triggered ===");
         try {
             updateCurrentWeekDisplay(); renderNextMeasurementInfo(); renderHistoryTable();
             renderAllComparisonTables(); renderChartSelector(); renderNotesList();
             populateTargetInputs(); setupTargetInputs(true);
             const activeTabContent = document.querySelector('.tab-content[style*="display: block"]');
             const activeTabId = activeTabContent ? activeTabContent.id : null;
             if (activeTabId === 'tab-change-report') { renderChart(); }
             console.log("DEBUG: === renderAll complete ===");
         } catch (e) { console.error(`renderAll error: ${e.message}`, e.stack); showPopup('unexpectedError', 5000, { message: e.message }); }
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
            showInitialSetupPopup(); console.log("DEBUG: Initial setup required.");
        } else {
             console.log("DEBUG: Initial setup already done.");
             applyModeToUI();
             applyLanguageToUI();
             loadPrimaryDataFromStorage();
             applyTheme(); // Apply theme after loading settings
             setupTargetInputs();
             renderAll();
             activateTab('tab-input');
        }

        // *** 수정 4: 시스템 테마 변경 감지 리스너 추가 ***
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        try {
            mediaQuery.addEventListener('change', () => { if (currentTheme === 'system') { applyTheme(); } });
        } catch (e1) {
             try { // Fallback for older browsers
                 mediaQuery.addListener(() => { if (currentTheme === 'system') { applyTheme(); } });
             } catch (e2) { console.error("Error adding listener for system theme changes:", e2); }
        }

        console.log("DEBUG: App Initialization Sequence Complete");
    } catch (initError) { console.error("App Initialization Error:", initError); alert(translate('alertInitError') || `App Initialization Error: ${initError.message}`); }

    // ===============================================
    // Event Listener Setup
    // ===============================================
    console.log("DEBUG: Setting up event listeners...");
    try {
        // Tab Bar Clicks
        if (tabBar) {
            tabBar.addEventListener('click', (e) => {
                const button = e.target.closest('.tab-button');
                if (button && button.dataset.tab) { activateTab(button.dataset.tab); }
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
             importFileInput.addEventListener('click', (e) => { e.target.value = null; });
        }
        if (importFileInput) importFileInput.addEventListener('change', importMeasurementData);
        if (languageSelect) languageSelect.addEventListener('change', handleLanguageChange);
        if (modeSelect) modeSelect.addEventListener('change', handleModeChange);
        if (themeSelect) themeSelect.addEventListener('change', handleThemeChange); // *** 수정 4: 테마 변경 리스너 ***
        // Button Clicks - History Table (Event Delegation)
         if (historyContainer) {
             historyContainer.addEventListener('click', (e) => {
                 const editBtn = e.target.closest('.btn-edit');
                 const deleteBtn = e.target.closest('.btn-delete');
                 if (editBtn?.dataset.index !== undefined) handleEditClick(parseInt(editBtn.dataset.index, 10));
                 else if (deleteBtn?.dataset.index !== undefined) handleDeleteMeasurement(parseInt(deleteBtn.dataset.index, 10));
             });
         }
        // Button Clicks - Notes (Keeps) Tab
        if (saveNoteButton) saveNoteButton.addEventListener('click', handleSaveNote);
        if (cancelEditNoteBtn) cancelEditNoteBtn.addEventListener('click', handleCancelEditNote);
        if (noteSortOrderSelect) {
             noteSortOrderSelect.addEventListener('change', (e) => { currentNoteSortOrder = e.target.value; renderNotesList(); });
        }
        // Button Clicks - Notes (Keeps) List (Event Delegation)
        if (notesListContainer) {
            notesListContainer.addEventListener('click', (e) => {
                 const editBtn = e.target.closest('.edit-note-button');
                 const deleteBtn = e.target.closest('.delete-note-button');
                 if (editBtn?.dataset.id) handleEditNoteStart(editBtn.dataset.id);
                 else if (deleteBtn?.dataset.id) handleDeleteNote(deleteBtn.dataset.id, deleteBtn.dataset.title);
            });
        }
        // Button Clicks - Chart Controls
        if (chartSelector) chartSelector.addEventListener('click', handleChartSelectorClick);
        if (selectAllChartsBtn) selectAllChartsBtn.addEventListener('click', handleSelectAllCharts);
        if (deselectAllChartsBtn) deselectAllChartsBtn.addEventListener('click', handleDeselectAllCharts);
        // Initial Setup Save Button
        if (initialSetupSaveBtn) initialSetupSaveBtn.addEventListener('click', handleInitialSetupSave);
        // Swipe Listeners
        document.body.addEventListener('touchstart', function(e) {
            if ( (e.touches.length > 1) || e.targetTouches.length > 1) {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
            }
          }, {passive: false});
        document.body.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.body.addEventListener('touchend', handleTouchEnd);
        console.log("DEBUG: Swipe listeners attached to body.");
        console.log("DEBUG: Event listeners setup complete.");
    } catch (listenerError) { console.error(" Event listener setup error:", listenerError); alert(translate('alertListenerError') || `Event Listener Error: ${listenerError.message}`); }

}); // DOMContentLoaded End
