/**
 * ShiftV Translations (i18n)
 * 
 * 다국어 지원을 위한 번역 데이터 및 함수
 * @module translations
 */

/**
 * 언어별 번역 데이터
 * @type {Object.<string, Object>}
 */
export const languages = {
    ko: {
        // General
        save: "저장", edit: "수정", delete: "삭제", cancel: "취소",
        saveRecord: "기록하기 ✨", cancelEdit: "수정 취소", saveTarget: "목표 저장! 💪",
        saveNote: "플래닝 저장 🖋️",
        saveSettings: "설정 저장", close: "닫기", ComRemainder: '남은 수치',
        confirm: "확인", selectAll: "전체 선택", deselectAll: "전체 해제",
        noDataYet: "첫 기록을 남겨볼까요?",
        noNotesYet: "첫 플래닝을 남겨보세요!",
        noTargetsYet: "설정된 목표가 없어요.", noDataForChart: "표시할 항목을 선택하거나 데이터를 입력하세요.",
        invalidValue: "유효하지 않은 값", loadingError: "데이터 로드 오류", savingError: "데이터 저장 오류",
        confirmReset: "정말로 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 측정 기록, 목표, 플래닝가 영구적으로 삭제됩니다. 초기화 전에 데이터를 백업하는 것이 좋습니다.",
        confirmDeleteRecord: "주차 {week} ({date}) 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
        confirmDeleteNote: "플래닝 '{title}'을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
        dataExported: "데이터가 파일로 저장되었습니다.", dataImported: "데이터를 성공적으로 불러왔습니다!",
        dataReset: "모든 데이터가 초기화되었습니다.", dataSaved: "저장 완료! 👍",
        noteSaved: "플래닝가 저장되었습니다.",
        targetsSaved: "목표가 저장되었습니다.", settingsSaved: "설정이 저장되었습니다.",
        importError: "파일을 불러오는 중 오류 발생:", importSuccessRequiresReload: "데이터를 성공적으로 불러왔습니다. 변경사항을 적용하려면 페이지를 새로고침해주세요.",
        unexpectedError: "예상치 못한 오류가 발생했습니다 😢 콘솔(F12)을 확인해주세요.\n오류: {message}",
        alertInitError: "앱 초기화 중 오류 발생!", alertListenerError: "이벤트 리스너 설정 오류!",
        popupSaveSuccess: "측정 기록 저장 완료! 🎉", popupUpdateSuccess: "측정 기록 수정 완료! ✨",
        popupDeleteSuccess: "측정 기록 삭제 완료 👍", popupTargetSaveSuccess: "목표 저장 완료! 👍",
        popupNoteSaveSuccess: "새 플래닝 저장 완료! 🎉", popupNoteUpdateSuccess: "플래닝 수정 완료! ✨",
        popupNoteDeleteSuccess: "플래닝 삭제 완료 👍", popupDataExportSuccess: "데이터 내보내기 성공! 🎉",
        popupDataImportSuccess: "데이터 가져오기 성공! ✨", popupDataResetSuccess: "모든 데이터가 초기화되었습니다. ✨",
        popupSettingsSaved: "설정 저장 완료! 👍",
        alertValidationError: "유효하지 않은 입력 값이 있습니다. 빨간색 표시 필드를 확인해주세요. 숫자 값은 0 이상이어야 합니다.",
        alertNoteContentMissing: "플래닝 제목이나 내용을 입력해주세요!",
        alertImportConfirm: "현재 데이터를 덮어쓰고 가져온 데이터로 복원하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
        alertImportInvalidFile: "파일 형식이 올바르지 않거나 호환되지 않는 데이터입니다.",
        alertImportReadError: "파일 읽기/처리 중 오류 발생.", alertImportFileReadError: "파일 읽기 실패.",
        alertGenericError: "오류가 발생했습니다.", alertDeleteError: "삭제 중 오류 발생.",
        alertLoadError: "데이터 로드 중 오류 발생. 데이터가 손상되었을 수 있습니다. 콘솔 확인.",
        alertSaveError: "로컬 스토리지 저장 실패.", alertExportError: "데이터 내보내기 중 오류 발생.",
        alertCannotFindRecordEdit: "수정할 기록 찾기 실패.", alertCannotFindRecordDelete: "삭제할 기록 찾기 실패.",
        alertInvalidIndex: "기록 처리 중 오류: 인덱스 오류.",
        alertCannotFindNoteEdit: "수정할 플래닝 찾기 실패.", alertCannotFindNoteDelete: "삭제할 플래닝 찾기 실패.",
        notification_setup_success_title: "알림 설정 완료",
        notification_setup_success_body: "알림이 설정되었습니다. 매주 측정일이 되면 알려드릴게요!",
        notification_permission_denied: "알림 권한이 차단되었습니다. 브라우저 설정에서 허용해주세요.",

        // Tabs
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

        // SV Card
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
        svcard_no_major_changes: "최근 주요 변화가 없어요.",
        svcard_change_vs_last_week: "지난 주 대비",
        svcard_title_weekly_guide: "오늘의 한마디",
        svcard_no_keeps_yet: "작성된 플래닝가 없어요.",
        svcard_no_keeps_add_prompt: "작성된 플래닝가 없어요. '기록하기' 탭에서 추가해보세요!",
        svcard_hormone_weekly_change: "주간 변화량",
        svcard_label_target: "목표",

        // Notifications
        notification_title: "ShiftV 측정 알림",
        notification_body: "마지막으로 기록한 지 일주일이 지났어요. 새로운 변화를 기록해볼까요?",
        notificationSettingsTitle: "알림 설정",
        notificationToggleLabel: "측정일 알림 받기",
        notificationSettingsDesc: "마지막 측정일로부터 7일이 지나면 알려드려요. 알림을 받으려면 브라우저의 권한 허용이 필요해요.",
        alertBrowserNotSupportNotification: "이 브라우저는 알림을 지원하지 않아요.",

        // Modals
        comparisonModalTitle: "바디 브리핑",
        selectedWeekDataTitle: "{week}주차 상세 기록",
        medicationHistoryTitle: "투여량 변화",
        hormoneLevelHistoryTitle: "호르몬 수치 변화",
        hormoneAnalysisTitle: "최근 2주 분석",
        hormoneAnalysisAvgChange: "평균 변화량: {change}",
        hormoneAnalysisNextWeek: "다음 주 예상 수치: {value}",
        hormoneModalTitle: "호르몬 저널",
        modalTabDetailedAnalysis: "상세 분석",
        modalTabComparativeAnalysis: "비교 분석",
        labelBase: "기준",
        labelCompareTarget: "비교 대상",
        
        // Body Briefing
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
        
        // Change Roadmap
        modalTabRoadmapSummary: "요약",
        modalTabRoadmapDetail: "상세",
        roadmapOverallProgress: "전체 진행도",
        roadmapTimeline: "타임라인",
        roadmapMonthlySummary: "월별 요약",
        roadmapDetailedGraph: "상세 그래프",
        roadmapChangeComparison: "변화 비교",
        roadmapCompareSpecificDate: "특정일과 비교",
        roadmapStart: "시작",
        roadmapAchievementRate: "전체 달성률:",
        roadmapComparePreviousWeek: "지난주와 비교",
        roadmapCompareFirst: "처음과 비교",
        roadmapSelectDate: "날짜 선택:",
        roadmapModalTitle: "변화 로드맵",
        
        // Metric Names
        metricWeight: "체중",
        metricWaist: "허리",
        metricHips: "엉덩이",
        metricChest: "가슴",
        metricShoulder: "어깨",
        metricThigh: "허벅지",
        metricArm: "팔뚝",
        metricMuscleMass: "근육량",
        metricBodyFatPercentage: "체지방률",
        estrogenLevel: "에스트로겐 수치",
        testosteroneLevel: "테스토스테론 수치",
        
        // Body Briefing Additional
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

        // Hormone Analysis
        emaxTitle: "Emax / Hill 분석 🧬",
        responseFactor: "실제 반응도 (RF)",
        rfMessage_high: "평균 대비 E2에 높은 민감도를 보입니다. ✨",
        rfMessage_normal: "예측 모델과 유사한 반응을 보입니다. 👌",
        rfMessage_low: "E2 수치 대비 T 억제가 예상보다 낮습니다. 🤔",
        rfMessage_negative: "수치가 상승했습니다. (플레어/변동) 📈",
        rfMessage_very_high: "매우 높은 반응도 - 호르몬에 매우 민감하게 반응합니다",
        rfMessage_very_low: "매우 낮은 반응도 - 호르몬에 매우 둔감하게 반응합니다",
        
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
        totalChangeWithInitial: '총 변화량 (초기: {value})',
        drugInfluence: "mg당 영향",
        predictedNextWeek: "다음 주 예상",
        daysToTarget: "목표까지 예상",
        daysUnit: "{days}일",
        notEnoughData: "데이터 부족",
        dailyTSuppression: '일일 T 억제량',
        influenceAnalysisDesc: '이 정보는 실측 데이터에 기반한 예측치입니다. <br>수치에는 오차가 있을 수 있습니다.',
        
        currentLevelsEvaluationTitle: "현재 수치 평가",
        hormoneLevelOptimal: "최적 범위입니다",
        hormoneLevelAboveTarget: "목표보다 높습니다",
        hormoneLevelBelowTarget: "목표보다 낮습니다",
        hormoneLevelHigh: "높은 수치입니다",
        hormoneLevelLow: "낮은 수치입니다",
        hormoneLevelNoTarget: "목표가 설정되지 않았습니다",
        healthAlertsTitle: "건강 주의사항",
        healthAlertHighE2: "⚠️ 에스트로겐 수치가 매우 높습니다 (>300 pg/mL). 의료진과 상담을 권장합니다.",
        healthAlertLowT: "⚠️ 테스토스테론 수치가 매우 낮습니다 (<0.05 ng/mL). 의료진과 상담을 권장합니다.",
        predictionDisclaimer: "※ 예측 수치는 참고용이며, 개인차와 측정 오차가 있을 수 있습니다.",
        hormoneExplanationTitle: "호르몬 수치 이해하기",
        hormoneExplanationDesc: "아래는 각 호르몬의 의미와 측정 방법입니다.",
        hormoneLevelsExplained: "호르몬 수치 설명",
        estrogenLevelUnit: "pg/mL",
        estrogenLevelExplanation: "에스트라디올(E2)은 여성화에 중요한 호르몬으로, 혈액 검사를 통해 측정됩니다.",
        testosteroneLevelUnit: "ng/mL",
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

        // Input Tab
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

        // Measurement Labels
        week: '주차',
        date: '날짜',
        timestamp: '기록 시간',
        height: '신장 (cm)',
        weight: '체중 (kg)',
        shoulder: '어깨너비 (cm)',
        neck: '목둘레 (cm)',
        chest: '윗 가슴둘레 (cm)',
        cupSize: '아랫 가슴둘레 (cm)',
        waist: '허리둘레 (cm)',
        hips: '엉덩이둘레 (cm)',
        thigh: '허벅지둘레 (cm)',
        calf: '종아리둘레 (cm)',
        arm: '팔뚝둘레 (cm)',
        muscleMass: '근육량 (kg)',
        bodyFatPercentage: '체지방률 (%)',
        libido: '성욕 (회/주)',
        estrogenLevel: '에스트로겐 수치 (pg/ml)',
        testosteroneLevel: '테스토스테론 수치 (ng/ml)',
        healthStatus: '건강 상태',
        healthScore: '건강 점수',
        healthNotes: '건강 상세(텍스트)',
        skinCondition: '피부 상태',
        
        // Symptoms
        symptomsLabel: '증상 선택',
        symptomsDescription: '경험하고 있는 증상을 선택하고 심각도를 표시하세요. (여러 개 선택 가능)',
        symptomsEmptyState: '증상이 없으면 추가 버튼을 눌러 증상을 선택하세요.',
        addSymptom: '증상 추가',
        severityLabel: '심각도',
        removeSymptom: '제거',
        
        estradiol: '에스트라디올 (mg)',
        progesterone: '프로게스테론 (mg)',
        antiAndrogen: '항안드로겐 (mg)',
        testosterone: '테스토스테론 (mg)',
        antiEstrogen: '항에스트로겐 (mg)',
        medicationOtherName: '기타 마법 이름',
        medicationOtherDose: '기타 마법 용량 (mg)',
        medicationOtherNamePlaceholder: '(기타)',
        unitMgPlaceholder: 'mg',

        // Placeholders
        skinConditionPlaceholder: '예: 부드러워짐',
        libidoPlaceholder: '회/주',
        scorePlaceholder: "점수",
        notesPlaceholder: "특이사항",
        unitCm: "cm",
        unitKg: "kg",
        unitPercent: "%",
        unitMg: "mg",
        unitCountPerWeek: "회/주",
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
        comparisonItem: "항목",
        comparisonChange: "변화량",
        comparisonProgress: "달성률",
        targetAchieved: "달성 🎉",

        // Targets Tab
        targetTitle: "나만의 목표 설정 💖",
        targetDescription: "원하는 목표 수치를 입력해주세요. 메인 탭에서 달성률을 확인할 수 있어요.",
        targetItem: "항목",
        targetValue: "목표값",

        // Overview (Keeps) Tab
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

        // Settings Tab
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
        ComRemainder: 'Remainder',
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
        
        // Symptoms (English)
        symptomsLabel: 'Select Symptoms',
        symptomsDescription: 'Select symptoms you are experiencing and indicate severity. (Multiple selections possible)',
        symptomsEmptyState: 'Click the add button to select symptoms if you have none.',
        addSymptom: 'Add Symptom',
        severityLabel: 'Severity',
        removeSymptom: 'Remove',
        
        // Body Briefing (English)
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
        
        // Change Roadmap (English)
        modalTabRoadmapSummary: "Summary",
        modalTabRoadmapDetail: "Detail",
        roadmapOverallProgress: "Overall Progress",
        roadmapTimeline: "Timeline",
        roadmapMonthlySummary: "Monthly Summary",
        roadmapDetailedGraph: "Detailed Graph",
        roadmapChangeComparison: "Change Comparison",
        roadmapCompareSpecificDate: "Compare with Specific Date",
        roadmapStart: "Start",
        roadmapAchievementRate: "Overall Achievement Rate:",
        roadmapComparePreviousWeek: "Compare with Previous Week",
        roadmapCompareFirst: "Compare with First",
        roadmapSelectDate: "Select Date:",
        roadmapModalTitle: "Change Roadmap",
        
        // Metric Names (English)
        metricWeight: "Weight",
        metricWaist: "Waist",
        metricHips: "Hips",
        metricChest: "Chest",
        metricShoulder: "Shoulder",
        metricThigh: "Thigh",
        metricArm: "Arm",
        metricMuscleMass: "Muscle Mass",
        metricBodyFatPercentage: "Body Fat %",
        estrogenLevel: "Estrogen Level",
        testosteroneLevel: "Testosterone Level",
        
        // Body Briefing Additional (English)
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
        
        // ... (영어 번역은 너무 길어서 생략, 실제 사용 시 script.js에서 복사)
    },
    
    ja: {
        // General (일본어 번역도 생략, 실제 사용 시 script.js에서 복사)
        save: "保存",
        edit: "編集",
        delete: "削除",
        cancel: "キャンセル",
        
        // Symptoms (Japanese)
        symptomsLabel: '症状選択',
        symptomsDescription: '経験している症状を選択し、重症度を表示してください。（複数選択可能）',
        symptomsEmptyState: '症状がない場合は追加ボタンを押して症状を選択してください。',
        addSymptom: '症状追加',
        severityLabel: '重症度',
        removeSymptom: '削除',
        
        // Body Briefing (Japanese)
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
        
        // Change Roadmap (Japanese)
        modalTabRoadmapSummary: "要約",
        modalTabRoadmapDetail: "詳細",
        roadmapOverallProgress: "全体進捗",
        roadmapTimeline: "タイムライン",
        roadmapMonthlySummary: "月別要約",
        roadmapDetailedGraph: "詳細グラフ",
        roadmapChangeComparison: "変化比較",
        roadmapCompareSpecificDate: "特定日と比較",
        roadmapStart: "開始",
        roadmapAchievementRate: "全体達成率:",
        roadmapComparePreviousWeek: "先週と比較",
        roadmapCompareFirst: "最初と比較",
        roadmapSelectDate: "日付選択:",
        roadmapModalTitle: "変化ロードマップ",
        
        // Metric Names (Japanese)
        metricWeight: "体重",
        metricWaist: "ウエスト",
        metricHips: "ヒップ",
        metricChest: "胸囲",
        metricShoulder: "肩幅",
        metricThigh: "太もも",
        metricArm: "腕",
        metricMuscleMass: "筋肉量",
        metricBodyFatPercentage: "体脂肪率",
        estrogenLevel: "エストロゲン数値",
        testosteroneLevel: "テストステロン数値",
        
        // Body Briefing Additional (Japanese)
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
        
        // ...
    }
};

/**
 * 현재 언어 (전역 상태, 나중에 상태 관리로 이동 예정)
 * @type {string}
 */
let currentLanguage = 'ko';

/**
 * 현재 언어 설정
 * @param {string} lang - 언어 코드 ('ko', 'en', 'ja')
 */
export function setCurrentLanguage(lang) {
    if (languages[lang]) {
        currentLanguage = lang;
    }
}

/**
 * 현재 언어 가져오기
 * @returns {string} 현재 언어 코드
 */
export function getCurrentLanguage() {
    return currentLanguage;
}

/**
 * 키에 해당하는 번역 텍스트 가져오기
 * @param {string} key - 번역 키
 * @param {Object} params - 템플릿 파라미터 (예: {name: 'John'})
 * @returns {string} 번역된 텍스트
 */
export function translate(key, params = {}) {
    const langData = languages[currentLanguage] || languages.ko;
    let text = langData[key] || key;
    
    // 파라미터 치환
    for (const p in params) {
        const regex = new RegExp(`\\{${p}\\}`, 'g');
        text = text.replace(regex, params[p]);
    }
    
    return text;
}

/**
 * DOM 요소들의 텍스트를 현재 언어로 번역
 * @param {HTMLElement|Document} context - 번역할 컨텍스트 (기본값: document)
 */
export function translateUI(context = document) {
    console.log(`Translating UI to ${currentLanguage} within context:`, context.id || context.tagName);
    
    if (context === document) {
        document.documentElement.lang = currentLanguage.split('-')[0];
    }

    // data-lang-key 속성을 가진 모든 요소 번역
    context.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        let translation = '';
        
        try {
            let params = {};
            const paramsAttr = el.dataset.langParams;
            if (paramsAttr) {
                try {
                    params = JSON.parse(paramsAttr);
                } catch (e) {
                    console.error("Error parsing lang params:", paramsAttr, e);
                }
            }
            translation = translate(key, params);

            // 탭 버튼 특별 처리
            if (el.classList.contains('tab-button')) {
                const span = el.querySelector('span');
                if (span) span.textContent = translation;
                return;
            }

            // 입력 필드 placeholder 처리
            if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder !== undefined) {
                const placeholderKey = key + 'Placeholder';
                let placeholderText = translate(placeholderKey);
                
                if (placeholderText === placeholderKey) {
                    // Fallback 처리
                    switch (key) {
                        case 'semenScore':
                        case 'healthScore':
                            placeholderText = translate('scorePlaceholder') || 'Number';
                            break;
                        case 'medicationOtherDose':
                            placeholderText = translate('unitMgPlaceholder') || 'mg';
                            break;
                        default:
                            if (el.type === 'number') {
                                placeholderText = translate(key).split('(')[1]?.replace(')', '') || 'Number';
                            } else {
                                placeholderText = translate('notesPlaceholder') || 'Text';
                            }
                            break;
                    }
                }
                el.placeholder = placeholderText;
            }
            // 일반 텍스트 요소
            else if (el.tagName === 'BUTTON' || el.tagName === 'OPTION' || 
                     el.tagName === 'LEGEND' || el.tagName === 'LABEL' || 
                     el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'H4' || 
                     el.tagName === 'P' || el.tagName === 'SPAN' || el.tagName === 'STRONG' || 
                     el.tagName === 'TD' || el.tagName === 'TH' || el.tagName === 'SUMMARY') {
                
                if (el.childElementCount === 0 || el.classList.contains('description') || 
                    el.classList.contains('table-title') || el.classList.contains('tab-button') || 
                    el.classList.contains('version-info') || el.classList.contains('form-title') || 
                    el.classList.contains('warning') || el.classList.contains('placeholder-text')) {
                    
                    if (!el.id?.includes('app-version-display')) {
                        // 경고 메시지 특별 처리
                        if (el.classList.contains('warning') && key === 'importWarning') {
                            el.innerHTML = `<strong data-lang-key="warning">${translate('warning')}</strong> <span>${translation}</span>`;
                        } else if (el.classList.contains('warning') && key === 'resetWarning') {
                            el.innerHTML = `<strong data-lang-key="severeWarning">${translate('severeWarning')}</strong> <span>${translation}</span>`;
                        } else {
                            el.textContent = translation;
                        }
                    }
                }
            }
            // 이미지 alt 속성
            else if (el.tagName === 'IMG' && el.alt !== undefined) {
                el.alt = translation;
            }

        } catch (e) {
            console.error(`Error translating element with key "${key}":`, e, el);
        }
    });

    console.log("UI Translation complete.");
}

/**
 * 언어별 날짜 포맷팅
 * @param {Date} date - 날짜 객체
 * @param {string} style - 포맷 스타일 ('short', 'long', 'time')
 * @returns {string} 포맷된 날짜 문자열
 */
export function formatDate(date, style = 'short') {
    const options = {
        short: { year: 'numeric', month: '2-digit', day: '2-digit' },
        long: { year: 'numeric', month: 'long', day: 'numeric' },
        time: { hour: '2-digit', minute: '2-digit' }
    };
    
    const locale = {
        ko: 'ko-KR',
        en: 'en-US',
        ja: 'ja-JP'
    };
    
    return new Intl.DateTimeFormat(locale[currentLanguage] || 'ko-KR', options[style]).format(date);
}

/**
 * 언어별 숫자 포맷팅
 * @param {number} num - 숫자
 * @param {number} decimals - 소수점 자리수
 * @returns {string} 포맷된 숫자 문자열
 */
export function formatNumber(num, decimals = 2) {
    const locale = {
        ko: 'ko-KR',
        en: 'en-US',
        ja: 'ja-JP'
    };
    
    return new Intl.NumberFormat(locale[currentLanguage] || 'ko-KR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(num);
}

// Default export
export default {
    languages,
    setCurrentLanguage,
    getCurrentLanguage,
    translate,
    translateUI,
    formatDate,
    formatNumber
};
