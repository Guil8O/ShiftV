/**
 * Doctor Engine
 * 
 * 모든 건강 분석의 중심 - 서브모듈 통합 오케스트레이터
 * 증상, 측정 데이터, 약물 정보를 종합하여 진단 및 추천 생성
 */

import { SYMPTOM_DATABASE } from '../data/symptom-database.js';
import { MEDICATION_DATABASE, getMedicationById } from '../data/medication-database.js';
import { SYMPTOM_CAUSES, COMPOUND_PATTERNS, RESOLUTION_LABELS, HORMONE_RANGES, HOSPITAL_MESSAGES } from '../data/symptom-cause-map.js';
import { HealthEvaluator } from './health-evaluator.js';
import { SymptomAnalyzer } from './symptom-analyzer.js';
import { TrendPredictor } from './trend-predictor.js';
import { RecommendationEngine } from './recommendation-engine.js';
import { SafetyEngine } from './safety-engine.js';
import { svgIcon } from '../../ui/icon-paths.js';

// ========================================
// 1. 의사 엔진 클래스
// ========================================

export class DoctorEngine {
  constructor(measurements = [], userSettings = {}) {
    this.measurements = (Array.isArray(measurements) ? measurements : []).map(m => {
      const mm = m && typeof m === 'object' ? m : {};
      return {
        ...mm,
        upperChest: (mm.upperChest ?? mm.chest ?? null),
        lowerChest: (mm.lowerChest ?? mm.cupSize ?? null)
      };
    });
    this.userSettings = userSettings;
    this.mode = userSettings.mode || 'mtf';
    this.biologicalSex = userSettings.biologicalSex || 'male';
    this.language = userSettings.language || 'ko';
    this.targets = userSettings.targets || {};
    
    // 데이터베이스 로드
    this.symptomDB = SYMPTOM_DATABASE;
    this.medicationDB = MEDICATION_DATABASE;
    
    // 서브모듈 초기화
    this.healthEvaluator = new HealthEvaluator(this.measurements, this.mode, this.biologicalSex, this.language);
    this.symptomAnalyzer = new SymptomAnalyzer(measurements, this.mode, this.language);
    this.trendPredictor = new TrendPredictor(this.measurements, this.targets, this.language);
    
    // 추천 엔진은 증상과 약물 정보도 필요
    const latestSymptoms = measurements.length > 0 ? measurements[measurements.length - 1].symptoms : [];
    const latestMedications = measurements.length > 0 ? measurements[measurements.length - 1] : {};
    this.recommendationEngine = new RecommendationEngine(
      measurements,
      latestSymptoms,
      latestMedications,
      this.targets,
      this.mode,
      this.language
    );

    // 안전 평가 엔진 초기화 (SafetyEngine)
    this.safetyEngine = new SafetyEngine(this.language, this.mode);
  }

  _t(texts, params = {}) {
    const lang = this.language || 'ko';
    let text = (texts && (texts[lang] || texts.ko)) || '';
    Object.keys(params).forEach(k => {
      text = text.replaceAll(`{${k}}`, String(params[k]));
    });
    return text;
  }
  
  // ========================================
  // 1.5. 약물 분석 (Medication Analysis)
  // ========================================

  /**
   * 약물 상호작용 분석
   * @param {Array} currentMeds - 현재 복용 중인 약물 ID 목록
   * @returns {Array} 상호작용 경고 목록
   */
  analyzeMedicationInteraction(currentMeds) {
    const warnings = [];
    if (!currentMeds || currentMeds.length === 0) return warnings;

    // 약물 ID로 약물 정보 찾기
    const medObjects = currentMeds.map(id => {
      // ID가 문자열인 경우
      if (typeof id === 'string') {
        return getMedicationById(id);
      }
      // ID가 객체인 경우 (예: { id: '...', dosage: '...' })
      if (typeof id === 'object' && id.id) {
        return getMedicationById(id.id);
      }
      return null;
    }).filter(Boolean);

    // 1. 개별 약물의 상호작용 경고 확인
    for (const med of medObjects) {
      if (med.interactions && med.interactions.length > 0) {
        // 정의된 상호작용 확인
        for (const interaction of med.interactions) {
          // 상호작용 카테고리가 현재 복용 약물 중에 있는지 확인 (간단한 로직)
          // 실제로는 카테고리 매칭 로직이 더 정교해야 함 (지금은 기초 구현)
          const hasInteraction = this._checkInteractionCategory(interaction.category, medObjects);
          if (hasInteraction) {
            warnings.push({
              medication: med.names[0],
              level: 'warning',
              message: interaction.message
            });
          }
        }
      }
    }
    
    // 2. 일반적인 금기 사항 체크 (하드코딩된 로직 - 추후 DB로 이동 가능)
    // 예: 에스트로겐 + 흡연
    const hasEstrogen = medObjects.some(m => m.category === 'estrogen');
    if (hasEstrogen && this.userSettings.isSmoker) {
      warnings.push({
        medication: this._t({ ko: '에스트로겐', en: 'Estrogen', ja: 'エストロゲン' }),
        level: 'critical',
        message: this._t({ ko: '흡연은 에스트로겐 복용 중 혈전 위험을 치명적으로 높입니다. 즉시 금연하세요.', en: 'Smoking critically increases the risk of blood clots while taking estrogen. Stop smoking immediately.', ja: '喫煙はエストロゲン服用中の血栓リスクを致命的に高めます。直ちに禁煙してください。' })
      });
    }

    return warnings;
  }

  /**
   * 상호작용 카테고리 매칭 확인 (내부 헬퍼)
   * @private
   */
  _checkInteractionCategory(category, currentMedObjects) {
    // 예: category가 'potassium_supplements'이면, 현재 약물 중 보조제 확인
    // 현재는 단순화하여 구현
    
    // 1. 카테고리 이름이 약물 ID에 포함되는지
    if (currentMedObjects.some(m => m.id.includes(category) || m.category === category)) {
      return true;
    }
    
    return false;
  }

  // ========================================
  // 2. 바디 브리핑 생성 (Body Briefing)
  // ========================================
  
  /**
   * 전체 건강 브리핑을 생성합니다.
   * @returns {Object} 건강 브리핑 데이터
   */
  generateHealthBriefing() {
    if (this.measurements.length === 0) {
      return {
        summary: {
          message: this._t({ ko: '측정 데이터가 없습니다. 첫 측정을 시작하세요!', en: 'No measurement data available. Start your first measurement!', ja: '測定データがありません。最初の測定を始めましょう！' }),
          overallStatus: 'no_data'
        },
        targetAchievement: null,
        bodyRatios: {},
        hormoneStatus: {},
        predictions: {},
        alerts: [],
        symptomAnalysis: {}
      };
    }
    
    const latestMeasurement = this.measurements[this.measurements.length - 1];
    const previousMeasurement = this.measurements.length > 1 ? this.measurements[this.measurements.length - 2] : null;
    
    // 각 모듈로부터 데이터 수집
    const healthEvaluation = this.healthEvaluator.evaluateAll();
    
    // 약물 정보 추출 (최신 측정 데이터에 포함되어 있다고 가정)
    const currentMeds = latestMeasurement.medications || [];
    
    // 증상 분석 (약물 정보 전달)
    const symptomAnalysis = this.symptomAnalyzer.analyzeAll(currentMeds);
    
    // 호르몬 주기 분석 (Peak/Trough)
    const hormoneCycle = this.analyzeHormoneCycle(currentMeds, latestMeasurement.date);
    
    const predictions = this.trendPredictor.predictAll();
    
    const mergedAlerts = this._mergeAlerts(symptomAnalysis.criticalAlerts, symptomAnalysis.warnings);
    if (this.biologicalSex === 'female' && this.mode === 'ftm' && latestMeasurement.menstruationActive) {
      const severity = typeof latestMeasurement.menstruationPain === 'number' ? latestMeasurement.menstruationPain : 1;
      mergedAlerts.push({
        level: severity >= 4 ? 'critical' : 'warning',
        message: this._t({ ko: `월경이 기록되었습니다. 강도: ${severity}/5`, en: `Menstruation recorded. Intensity: ${severity}/5`, ja: `月経が記録されました。強度：${severity}/5` })
      });
    }

    // Phase 9: 증상 원인 분석 & 복합 증상 & 호르몬 범위
    const symptomCauses = this.analyzeSymptomCauses(latestMeasurement);
    const compoundPatterns = this.analyzeCompoundSymptoms(latestMeasurement);
    const hormoneRangeEval = this.evaluateHormoneRanges(latestMeasurement);

    // 안전 평가 (SafetyEngine) — 약물·증상·체형 기반 8개 도메인 위험 평가
    const safetyAssessment = this.safetyEngine.runSafetyAssessment(
      latestMeasurement,
      this.measurements.slice(0, -1) // 히스토리 (최신 제외)
    );

    // Merge compound pattern alerts into main alerts
    for (const pattern of compoundPatterns) {
      mergedAlerts.push({
        level: pattern.severity,
        title: pattern.label,
        description: pattern.description,
        action: pattern.action,
        category: 'compound',
        matchedSymptoms: pattern.matchedSymptoms
      });
    }

    // SafetyEngine critical/warning 알림을 메인 알림으로 병합
    if (safetyAssessment && safetyAssessment.alerts) {
      for (const sa of safetyAssessment.alerts) {
        if (sa.level === 'critical' || sa.level === 'warning') {
          mergedAlerts.push({
            level: sa.level,
            title: sa.title,
            description: sa.message,
            category: 'safety',
            domain: sa.domain,
            safetyScore: sa.score,
            triggeredMeds: sa.triggeredMeds,
            triggeredSymptoms: sa.triggeredSymptoms,
            isNotDiagnosis: true,
          });
        }
      }
    }

    const briefing = {
      // 요약 (Summary Tab)
      summary: {
        overallProgress: this._calculateOverallProgressBar(),
        overallBodyChange: this._calculateOverallBodyChangeBar(healthEvaluation.transformationScore),
        message: this._generateSummaryMessage(healthEvaluation, symptomAnalysis),
        lastUpdated: latestMeasurement.date
      },
      
      // 목표 달성률
      targetAchievement: predictions.targetAchievement,
      
      // 신체 비율 분석
      bodyRatios: healthEvaluation.bodyRatios,
      
      // 미래 예측
      predictions: predictions.predictions,
      
      // 건강 경고 알림
      alerts: mergedAlerts,
      
      // 증상 분석
      symptomAnalysis: {
        summary: symptomAnalysis.summary,
        insights: symptomAnalysis.insights,
        trends: symptomAnalysis.trends,
        lagAnalysis: symptomAnalysis.lagAnalysis,
        crossValidation: symptomAnalysis.crossValidation,
        hormoneCycle: hormoneCycle,
        // Phase 9 별 원인 분석 + 해소 추천
        causes: symptomCauses,
        compoundPatterns: compoundPatterns
      },
      
      // 호르몬 상태
      hormoneStatus: healthEvaluation.hormones,
      
      // 호르몬 범위 평가 (Phase 9)
      hormoneRanges: hormoneRangeEval,
      
      // 체성분 분석
      bodyComposition: healthEvaluation.bodyComposition,
      
      // 전체 변환 점수 (여성화/남성화 점수)
      transformationScore: healthEvaluation.transformationScore,

      // 안전 평가 결과 (SafetyEngine — 약물·증상 기반 위험 도메인 분석)
      safetyAssessment: safetyAssessment
    };
    
    return briefing;
  }

  /**
   * 호르몬 주기 분석 (Peak/Trough)
   * @param {Array} currentMeds - 현재 약물 목록
   * @param {string} measurementDate - 측정 날짜
   */
  analyzeHormoneCycle(currentMeds, measurementDate) {
    const cycleInfo = [];
    const measureDate = new Date(measurementDate);
    
    if (!currentMeds || currentMeds.length === 0) return cycleInfo;

    // 약물 정보 병합
    const medObjects = currentMeds.map(m => {
      const medId = typeof m === 'string' ? m : m.id;
      const dbMed = getMedicationById(medId);
      if (!dbMed) return null;
      // 사용자 입력 데이터(날짜 등)와 DB 데이터 병합
      return typeof m === 'object' ? { ...dbMed, ...m } : dbMed;
    }).filter(Boolean);

    for (const med of medObjects) {
      // 주사제이고 마지막 투여일이 있는 경우
      if (med.route === 'injectable' && med.date) {
        const injectionDate = new Date(med.date);
        const diffHours = (measureDate - injectionDate) / (1000 * 60 * 60);
        
        if (diffHours < 0) continue;
        
        const halfLife = med.halfLife || 120; // 기본값 5일
        
        let status = 'stable';
        let message = this._t({ ko: '안정적인 농도입니다.', en: 'Concentration is stable.', ja: '安定した濃度です。' });
        
        // 피크: 보통 주사 후 24-48시간 (에스테르에 따라 다름)
        if (diffHours <= 48) {
          status = 'peak';
          message = this._t({ ko: '호르몬 농도가 가장 높은 시기(Peak)입니다. 기분 변화나 과민 반응이 있을 수 있습니다.', en: 'Hormone levels are at their highest (Peak). You may experience mood swings or hypersensitivity.', ja: 'ホルモン濃度が最も高い時期（ピーク）です。気分の変動や過敏反応が起こることがあります。' });
        } 
        // 트러프: 반감기 이후 다음 주사 직전
        else if (diffHours >= halfLife) {
          status = 'trough';
          message = this._t({ ko: '호르몬 농도가 낮아지는 시기(Trough)입니다. 피로감이나 감정 저하가 올 수 있습니다.', en: 'Hormone levels are declining (Trough). You may experience fatigue or low mood.', ja: 'ホルモン濃度が低下する時期（トラフ）です。疲労感や気分の低下が起こることがあります。' });
        }
        
        cycleInfo.push({
          medication: med.names[0],
          status,
          hoursSinceInjection: Math.round(diffHours),
          message
        });
      }
    }
    
    return cycleInfo;
  }

  // ========================================
  // 2.5. 증상 원인 분석 & 해소 추천 (Phase 9)
  // ========================================

  /**
   * 증상별 원인 트리 분석
   * @param {Object} measurement - 현재 측정 데이터
   * @returns {Array} 증상별 원인 + 해소 추천 목록
   */
  analyzeSymptomCauses(measurement) {
    const symptoms = measurement?.symptoms || [];
    if (!symptoms.length) return [];

    const results = [];
    for (const sym of symptoms) {
      const symId = typeof sym === 'string' ? sym : sym.id;
      const severity = typeof sym === 'object' ? (sym.severity || 1) : 1;
      const causeData = SYMPTOM_CAUSES[symId];
      if (!causeData) continue;

      // Evaluate which causes are active
      const activeCauses = causeData.causes
        .filter(c => {
          try { return c.condition(measurement, this.mode); } catch { return false; }
        })
        .map(c => ({
          id: c.id,
          label: this._t(c.label)
        }));

      // Generate resolution recommendations
      const resolution = {};
      for (const [category, keys] of Object.entries(causeData.resolution || {})) {
        resolution[category] = keys
          .map(k => RESOLUTION_LABELS[k] ? this._t(RESOLUTION_LABELS[k]) : k)
          .filter(Boolean);
      }

      // Check hospital recommendation
      let hospitalAdvice = null;
      if (causeData.hospitalThreshold != null && severity >= causeData.hospitalThreshold) {
        const level = severity >= 4 ? 'critical' : 'warning';
        hospitalAdvice = {
          level,
          message: this._t(HOSPITAL_MESSAGES[level])
        };
      }

      results.push({
        symptomId: symId,
        severity,
        activeCauses,
        resolution,
        hospitalAdvice
      });
    }

    return results;
  }

  /**
   * 복합 증상 패턴 분석
   * @param {Object} measurement - 현재 측정 데이터
   * @returns {Array} 매칭된 복합 패턴 목록
   */
  analyzeCompoundSymptoms(measurement) {
    const symptoms = measurement?.symptoms || [];
    if (!symptoms.length) return [];

    const symptomIds = new Set(symptoms.map(s => typeof s === 'string' ? s : s.id));
    const medIds = new Set(
      (measurement?.medications || []).map(m => typeof m === 'string' ? m : (m.id || ''))
    );
    const matched = [];

    for (const pattern of COMPOUND_PATTERNS) {
      // Mode filter check
      if (pattern.modeFilter && pattern.modeFilter !== this.mode) continue;

      // Required meds filter: 패턴에 requiredMeds가 있으면 그 중 하나라도 복용 중이어야 함
      if (pattern.requiredMeds && pattern.requiredMeds.length > 0) {
        const hasRequiredMed = pattern.requiredMeds.some(m => medIds.has(m));
        if (!hasRequiredMed) continue;
      }

      const matchCount = pattern.symptoms.filter(s => symptomIds.has(s)).length;
      if (matchCount >= pattern.minMatch) {
        matched.push({
          id: pattern.id,
          severity: pattern.severity,
          label: this._t(pattern.label),
          description: this._t(pattern.description),
          action: this._t(pattern.action),
          matchedSymptoms: pattern.symptoms.filter(s => symptomIds.has(s)),
          matchRatio: matchCount / pattern.symptoms.length
        });
      }
    }

    // Sort by severity (critical first)
    return matched.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return (order[a.severity] || 2) - (order[b.severity] || 2);
    });
  }

  /**
   * 호르몬 범위 평가
   * @param {Object} measurement - 현재 측정 데이터
   * @returns {Object} 호르몬 상태 평가
   */
  evaluateHormoneRanges(measurement) {
    const ranges = HORMONE_RANGES[this.mode];
    if (!ranges) return null;

    const result = {};

    if (measurement?.estrogenLevel != null) {
      const e2 = measurement.estrogenLevel;
      const eRanges = ranges.estrogen;
      let status = 'unknown';
      for (const [key, range] of Object.entries(eRanges)) {
        if (key === 'unit') continue;
        if (e2 >= range.min && e2 < range.max) {
          status = key;
          result.estrogen = {
            value: e2,
            unit: eRanges.unit,
            status,
            label: this._t(range.label),
            isIdeal: key === 'ideal' || key === 'suppressed'
          };
          break;
        }
      }
    }

    if (measurement?.testosteroneLevel != null) {
      const t = measurement.testosteroneLevel;
      const tRanges = ranges.testosterone;
      for (const [key, range] of Object.entries(tRanges)) {
        if (key === 'unit') continue;
        if (t >= range.min && t < range.max) {
          result.testosterone = {
            value: t,
            unit: tRanges.unit,
            status: key,
            label: this._t(range.label),
            isIdeal: key === 'ideal' || key === 'suppressed'
          };
          break;
        }
      }
    }

    return result;
  }

  /**
   * 전체 목표 달성률 프로그래스 바 계산
   * @private
   */
  _calculateOverallProgressBar() {
    const progress = this.trendPredictor.calculateOverallProgress();
    
    // 전주, 월평균 변화율 계산
    let weeklyChange = 0;
    let monthlyAvgChange = 0;
    
    if (this.measurements.length >= 2) {
      // 주간 변화율
      const latest = this.measurements[this.measurements.length - 1];
      const previous = this.measurements[this.measurements.length - 2];
      
      let positiveChanges = 0;
      let totalChecked = 0;
      
      Object.keys(this.targets).forEach(key => {
        if (latest[key] && previous[key]) {
          totalChecked++;
          const target = parseFloat(this.targets[key]);
          const currentDiff = Math.abs(latest[key] - target);
          const previousDiff = Math.abs(previous[key] - target);
          
          if (currentDiff < previousDiff) {
            positiveChanges++;
          }
        }
      });
      
      weeklyChange = totalChecked > 0 ? (positiveChanges / totalChecked) * 100 : 0;
    }
    
    if (this.measurements.length >= 4) {
      // 월평균 (최근 4주)
      const recentMeasurements = this.measurements.slice(-4);
      let totalWeeklyChange = 0;
      
      for (let i = 1; i < recentMeasurements.length; i++) {
        const curr = recentMeasurements[i];
        const prev = recentMeasurements[i - 1];
        
        let positiveChanges = 0;
        let totalChecked = 0;
        
        Object.keys(this.targets).forEach(key => {
          if (curr[key] && prev[key]) {
            totalChecked++;
            const target = parseFloat(this.targets[key]);
            const currentDiff = Math.abs(curr[key] - target);
            const previousDiff = Math.abs(prev[key] - target);
            
            if (currentDiff < previousDiff) {
              positiveChanges++;
            }
          }
        });
        
        totalWeeklyChange += totalChecked > 0 ? (positiveChanges / totalChecked) * 100 : 0;
      }
      
      monthlyAvgChange = totalWeeklyChange / (recentMeasurements.length - 1);
    }
    
    return {
      currentProgress: progress.percentage,
      weeklyChange: weeklyChange.toFixed(1),
      monthlyAvgChange: monthlyAvgChange.toFixed(1),
      achievedCount: progress.achievedCount,
      totalCount: progress.totalCount,
      status: progress.status,
      message: progress.message
    };
  }
  
  /**
   * 전체 신체 변화 바 계산 (여성화/남성화)
   * @private
   */
  _calculateOverallBodyChangeBar(transformationScore) {
    if (!transformationScore) {
      return {
        feminizationScore: 50,
        masculinizationScore: 50,
        currentWeek: 50,
        previousWeek: 50,
        monthlyAvg: 50,
        target: this.mode === 'mtf' ? 85 : (this.mode === 'ftm' ? 15 : 50)
      };
    }
    
    const currentScore = parseFloat(transformationScore.score);
    
    let previousWeekScore = currentScore;
    let monthlyAvgScore = currentScore;
    
    // 이전 주 점수 계산
    if (this.measurements.length >= 2) {
      const previousMeasurements = this.measurements.slice(0, -1);
      const previousEvaluator = new HealthEvaluator(previousMeasurements, this.mode, this.biologicalSex, this.language);
      const previousEval = previousEvaluator.evaluateAll();
      if (previousEval.transformationScore) {
        previousWeekScore = parseFloat(previousEval.transformationScore.score);
      }
    }
    
    // 월평균 점수 계산 (최근 4주)
    if (this.measurements.length >= 4) {
      const recentMeasurements = this.measurements.slice(-4);
      let totalScore = 0;
      
      for (let i = 0; i < recentMeasurements.length; i++) {
        const tempMeasurements = this.measurements.slice(0, this.measurements.length - (recentMeasurements.length - 1 - i));
        const tempEvaluator = new HealthEvaluator(tempMeasurements, this.mode, this.biologicalSex, this.language);
        const tempEval = tempEvaluator.evaluateAll();
        if (tempEval.transformationScore) {
          totalScore += parseFloat(tempEval.transformationScore.score);
        }
      }
      
      monthlyAvgScore = totalScore / recentMeasurements.length;
    }
    
    return {
      feminizationScore: this.mode === 'mtf' ? currentScore : (100 - currentScore),
      masculinizationScore: this.mode === 'ftm' ? currentScore : (100 - currentScore),
      currentWeek: currentScore,
      previousWeek: previousWeekScore,
      monthlyAvg: monthlyAvgScore,
      target: this.mode === 'mtf' ? 85 : (this.mode === 'ftm' ? 85 : 50),
      change: currentScore - previousWeekScore
    };
  }
  
  /**
   * 요약 메시지 생성
   * @private
   */
  _generateSummaryMessage(healthEval, symptomAnalysis) {
    const messages = [];
    
    // 변환 점수 기반 메시지
    if (healthEval.transformationScore) {
      messages.push(healthEval.transformationScore.message);
    }
    
    // 증상 요약
    if (symptomAnalysis.summary) {
      messages.push(symptomAnalysis.summary);
    }
    
    // 호르몬 상태
    if (healthEval.hormones) {
      if (healthEval.hormones.status === 'optimal') {
        messages.push(svgIcon('check_circle', 'mi-inline mi-sm mi-success') + ' ' + this._t({ ko: '호르몬 수치가 이상적입니다.', en: 'Hormone levels are optimal.', ja: 'ホルモン値は理想的です。' }));
      } else if (healthEval.hormones.status === 'warning') {
        messages.push(svgIcon('warning', 'mi-inline mi-sm mi-warning') + ' ' + this._t({ ko: '호르몬 수치 조정이 필요합니다.', en: 'Hormone levels need adjustment.', ja: 'ホルモン値の調整が必要です。' }));
      }
    }
    
    return messages.join(' ');
  }
  
  /**
   * 경고 통합
   * @private
   */
  _mergeAlerts(criticalAlerts, warnings) {
    return [...criticalAlerts, ...warnings].sort((a, b) => {
      const levelOrder = { critical: 0, warning: 1 };
      return levelOrder[a.level] - levelOrder[b.level];
    });
  }
  
  // ========================================
  // 3. 변화 로드맵 생성 (Change Roadmap)
  // ========================================
  
  /**
   * 변화 로드맵 데이터를 생성합니다.
   * @returns {Object} 변화 로드맵 데이터
   */
  generateRoadmap() {
    if (this.measurements.length === 0) {
      return {
        summary: {
          message: this._t({ ko: '측정 데이터가 없습니다.', en: 'No measurement data available.', ja: '測定データがありません。' }),
          overallProgress: 0,
          timeline: [],
          monthlySummaries: []
        },
        detailedGraph: {},
        changeComparison: {},
        specificDateComparison: {}
      };
    }
    
    const predictions = this.trendPredictor.predictAll();
    
    return {
      // 요약 탭
      summary: {
        overallProgress: this._generateOverallProgressTimeline(),
        timeline: this._generateTimeline(predictions.targetAchievement),
        monthlySummaries: this._generateMonthlySummaries()
      },
      
      // 상세 그래프
      detailedGraph: this._generateDetailedGraphData(),
      
      // 변화 비교
      changeComparison: this._generateChangeComparison(),
      
      // 특정일 비교
      specificDateComparison: this._generateSpecificDateComparisonOptions()
    };
  }
  
  /**
   * 전체 진행도 타임라인 생성
   * @private
   */
  _generateOverallProgressTimeline() {
    const timeline = [];
    const firstMeasurement = this.measurements[0];
    const latestMeasurement = this.measurements[this.measurements.length - 1];
    
    // 각 측정 시점마다 긍정/부정 변화 평가
    for (let i = 1; i < this.measurements.length; i++) {
      const current = this.measurements[i];
      const previous = this.measurements[i - 1];
      
      let positiveChanges = 0;
      let negativeChanges = 0;
      let totalChecked = 0;
      
      Object.keys(this.targets).forEach(key => {
        if (current[key] && previous[key]) {
          totalChecked++;
          const target = parseFloat(this.targets[key]);
          const currentDiff = Math.abs(current[key] - target);
          const previousDiff = Math.abs(previous[key] - target);
          
          if (currentDiff < previousDiff) {
            positiveChanges++;
          } else if (currentDiff > previousDiff) {
            negativeChanges++;
          }
        }
      });
      
      timeline.push({
        week: i,
        date: current.date,
        positive: positiveChanges > negativeChanges,
        changeRate: totalChecked > 0 ? (positiveChanges / totalChecked) * 100 : 50
      });
    }
    
    // 전체 달성률
    const overallProgress = this.trendPredictor.calculateOverallProgress();
    
    return {
      startDate: firstMeasurement.date,
      currentDate: latestMeasurement.date,
      currentWeek: this.measurements.length,
      estimatedTargetWeek: this._estimateTargetCompletionWeek(),
      progress: overallProgress.percentage,
      weeklyChanges: timeline
    };
  }
  
  /**
   * 목표 달성 예상 주차 계산
   * @private
   */
  _estimateTargetCompletionWeek() {
    const predictions = this.trendPredictor.predictAll();
    let maxWeeks = 0;
    
    Object.values(predictions.targetAchievement).forEach(target => {
      if (target && target.weeksRemaining) {
        maxWeeks = Math.max(maxWeeks, target.weeksRemaining);
      }
    });
    
    return this.measurements.length + maxWeeks;
  }
  
  /**
   * 타임라인 생성 (주요 이정표 포함)
   * @private
   */
  _generateTimeline(targetAchievement) {
    const milestones = [];
    const totalWeeks = this.measurements.length;
    const overallProgressObj = this.trendPredictor.calculateOverallProgress();
    const overallPercent = Number(overallProgressObj?.percentage) || 0;
    
    // 시작 시점
    milestones.push({
      week: 1,
      date: this.measurements[0].date,
      type: 'start',
      title: this._t({ ko: '시작', en: 'Start', ja: 'Start' }),
      description: this._formatMilestoneSnapshot(0)
    });

    const addMilestone = (week, type, title, description) => {
      if (!Number.isFinite(week) || week < 1 || week > totalWeeks) return;
      const date = this.measurements[week - 1]?.date;
      milestones.push({ week, date, type, title, description });
    };

    const thresholdWeeks = [];
    const candidates = [25, 50, 75];
    candidates.forEach(threshold => {
      const w = this._findProgressCrossWeek(threshold);
      if (w && w > 1 && w < totalWeeks) thresholdWeeks.push({ threshold, week: w });
    });

    thresholdWeeks
      .sort((a, b) => a.week - b.week)
      .slice(0, 3)
      .forEach(item => {
        addMilestone(
          item.week,
          'milestone',
          this._t({ ko: '{percent}% 도달', en: 'Reached {percent}%', ja: '{percent}%到達' }, { percent: item.threshold }),
          this._formatMilestoneSnapshot(item.week - 1)
        );
      });

    const bigChangeWeeks = this._findBigChangeWeeks(3);
    bigChangeWeeks.forEach(week => {
      addMilestone(
        week,
        'milestone',
        this._t({ ko: '큰 변화', en: 'Big change', ja: '大きな変化' }),
        this._formatMilestoneSnapshot(week - 1)
      );
    });

    const rollbackWeek = this._findRollbackWeek();
    if (rollbackWeek) {
      addMilestone(
        rollbackWeek,
        'warning',
        this._t({ ko: '목표에서 멀어짐', en: 'Moving away from goal', ja: '目標から遠ざかり' }),
        this._t({
          ko: '일부 지표가 목표에서 멀어졌습니다. 계획을 점검해 보세요.',
          en: 'Some metrics moved away from the goal. Review your plan.',
          ja: '一部の指標が目標から遠ざかっています。計画を見直しましょう。'
        })
      );
    }
    
    // 목표 달성 마일스톤 찾기
    Object.keys(targetAchievement).forEach(metric => {
      const achievement = targetAchievement[metric];
      
      if (achievement && achievement.status === 'achieved') {
        // 언제 달성했는지 찾기
        const achievedWeek = this._findAchievementWeek(metric);
        if (achievedWeek > 0) {
          milestones.push({
            week: achievedWeek,
            date: this.measurements[achievedWeek - 1].date,
            type: 'achievement',
            title: `${this._getMetricName(metric)} ${this._t({ ko: '달성!', en: 'achieved!', ja: '達成！' })}`,
            description: this._formatMilestoneAchievement(metric)
          });
        }
      }
    });
    
    // 현재 시점
    milestones.push({
      week: totalWeeks,
      date: this.measurements[totalWeeks - 1].date,
      type: 'current',
      title: this._t({ ko: '현재', en: 'Now', ja: '現在' }),
      description: `${this._formatMilestoneSnapshot(totalWeeks - 1)} · ${overallPercent.toFixed(0)}%`
    });
    
    // 예상 달성 시점
    const estimatedWeek = this._estimateTargetCompletionWeek();
    if (estimatedWeek > totalWeeks) {
      milestones.push({
        week: estimatedWeek,
        date: this._estimateDate(estimatedWeek - totalWeeks),
        type: 'prediction',
        title: this._t({ ko: '최종 목표 예상', en: 'Final goal forecast', ja: '最終目標の予測' }),
        description: this._t({ ko: '모든 목표 달성 예상 시점', en: 'Estimated time to achieve all goals', ja: 'すべての目標達成の予測時期' })
      });
    }

    const dedup = new Map();
    milestones
      .sort((a, b) => a.week - b.week)
      .forEach(m => {
        const key = `${m.week}::${m.type}::${m.title}`;
        if (!dedup.has(key)) dedup.set(key, m);
      });

    return [...dedup.values()].sort((a, b) => a.week - b.week);
  }

  _findProgressCrossWeek(thresholdPercent) {
    const timeline = this._generateOverallProgressTimeline();
    const changes = Array.isArray(timeline?.weeklyChanges) ? timeline.weeklyChanges : [];
    if (changes.length === 0) return null;

    let score = 0;
    for (let i = 0; i < changes.length; i++) {
      score += changes[i]?.positive ? 1 : -1;
      const percent = Math.max(0, Math.min(100, (score / Math.max(1, changes.length)) * 100 + 50));
      if (percent >= thresholdPercent) return i + 1;
    }
    return null;
  }

  _findRollbackWeek() {
    const timeline = this._generateOverallProgressTimeline();
    const changes = Array.isArray(timeline?.weeklyChanges) ? timeline.weeklyChanges : [];
    if (changes.length < 3) return null;
    for (let i = 2; i < changes.length; i++) {
      const a = changes[i - 2];
      const b = changes[i - 1];
      const c = changes[i];
      if (a?.positive === true && b?.positive === false && c?.positive === false) return i + 1;
    }
    return null;
  }

  _findBigChangeWeeks(limit = 3) {
    const result = [];
    const keys = Object.keys(this.targets || {});
    if (keys.length === 0) return result;
    for (let i = 1; i < this.measurements.length; i++) {
      const curr = this.measurements[i];
      const prev = this.measurements[i - 1];
      let sum = 0;
      let count = 0;
      keys.forEach(key => {
        const c = Number(curr?.[key]);
        const p = Number(prev?.[key]);
        const t = Number(this.targets?.[key]);
        if (!Number.isFinite(c) || !Number.isFinite(p) || !Number.isFinite(t)) return;
        const d1 = Math.abs(p - t);
        const d2 = Math.abs(c - t);
        const delta = d1 - d2;
        sum += delta;
        count += 1;
      });
      if (count > 0) {
        result.push({ week: i + 1, score: sum / count });
      }
    }
    return result
      .filter(x => Math.abs(x.score) > 0.2)
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, limit)
      .map(x => x.week)
      .filter(w => w > 1 && w < this.measurements.length);
  }

  _formatMilestoneAchievement(metric) {
    const key = metric;
    const target = this.targets?.[key];
    const week = this._findAchievementWeek(key);
    if (!week || week < 1) {
      return this._t({ ko: '목표: {target}', en: 'Target: {target}', ja: '目標：{target}' }, { target: target });
    }
    return this._t({
      ko: '{metric} 목표 {target} 달성',
      en: '{metric} goal achieved: {target}',
      ja: '{metric}の目標{target}を達成'
    }, { metric: this._getMetricName(key), target: target });
  }

  _formatMilestoneSnapshot(index) {
    const m = this.measurements[index];
    if (!m) return '';
    const pick = ['weight', 'waist', 'hips', 'chest', 'cupSize'];
    const parts = [];
    pick.forEach(k => {
      const v = Number(m?.[k]);
      if (!Number.isFinite(v)) return;
      parts.push(`${this._getMetricName(k)}: ${v}${this._getMetricUnit(k)}`);
    });
    return parts.slice(0, 2).join(', ');
  }
  
  /**
   * 특정 메트릭의 달성 주차 찾기
   * @private
   */
  _findAchievementWeek(metric) {
    const target = parseFloat(this.targets[metric]);
    
    for (let i = 0; i < this.measurements.length; i++) {
      const measurement = this.measurements[i];
      if (measurement[metric]) {
        const diff = Math.abs(measurement[metric] - target);
        if (diff < 0.5) {
          return i + 1;
        }
      }
    }
    
    return -1;
  }
  
  /**
   * 미래 날짜 예측
   * @private
   */
  _estimateDate(weeksFromNow) {
    const today = new Date();
    const futureDate = new Date(today.getTime() + weeksFromNow * 7 * 24 * 60 * 60 * 1000);
    return futureDate.toISOString().split('T')[0];
  }
  
  /**
   * 월별 요약 생성 (가장 눈에 띄는 변화 3개)
   * @private
   */
  _generateMonthlySummaries() {
    const summaries = [];
    const measurementsByMonth = this._groupMeasurementsByMonth();
    
    Object.keys(measurementsByMonth).forEach(month => {
      const measurements = measurementsByMonth[month];
      const changes = this._calculateMonthlyChanges(measurements);
      
      // 가장 큰 변화 3개 선택
      const top3Changes = changes
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 3);
      
      summaries.push({
        month,
        topChanges: top3Changes
      });
    });
    
    return summaries;
  }
  
  /**
   * 측정 데이터를 월별로 그룹화
   * @private
   */
  _groupMeasurementsByMonth() {
    const grouped = {};
    
    this.measurements.forEach(measurement => {
      const date = new Date(measurement.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(measurement);
    });
    
    return grouped;
  }
  
  /**
   * 월별 변화량 계산
   * @private
   */
  _calculateMonthlyChanges(measurements) {
    if (measurements.length < 2) return [];
    
    const first = measurements[0];
    const last = measurements[measurements.length - 1];
    const changes = [];
    
    const metrics = ['weight', 'waist', 'hips', 'chest', 'cupSize', 'shoulder', 'thigh', 'arm', 'muscleMass', 'bodyFatPercentage'];
    
    metrics.forEach(metric => {
      const a = Number(first?.[metric]);
      const b = Number(last?.[metric]);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return;
      const change = b - a;
        if (Math.abs(change) > 0.1) {
          changes.push({
            metric: this._getMetricName(metric),
            change: change.toFixed(1),
            unit: this._getMetricUnit(metric)
          });
        }
    });
    
    return changes;
  }
  
  /**
   * 상세 그래프 데이터 생성
   * @private
   */
  _generateDetailedGraphData() {
    // 기존 바디 브리핑의 그래프와 동일한 데이터
    return {
      categories: this._getAllMetricCategories(),
      data: this.measurements
    };
  }
  
  /**
   * 변화 비교 데이터 생성
   * @private
   */
  _generateChangeComparison() {
    if (this.measurements.length < 2) {
      return { message: this._t({ ko: '비교할 데이터가 부족합니다.', en: 'Not enough data for comparison.', ja: '比較するデータが不足しています。' }) };
    }
    
    const latest = this.measurements[this.measurements.length - 1];
    const previous = this.measurements[this.measurements.length - 2];
    const first = this.measurements[0];
    
    return {
      withPreviousWeek: this._compareTwo(latest, previous, this._t({ ko: '지난 주', en: 'Last week', ja: '先週' })),
      withFirstMeasurement: this._compareTwo(latest, first, this._t({ ko: '처음', en: 'First', ja: '最初' }))
    };
  }
  
  /**
   * 두 측정값 비교
   * @private
   */
  _compareTwo(current, comparison, label) {
    const differences = {};
    const metrics = [
      'height',
      'weight',
      'shoulder',
      'neck',
      'chest',
      'cupSize',
      'waist',
      'hips',
      'thigh',
      'calf',
      'arm',
      'muscleMass',
      'bodyFatPercentage',
      'estrogenLevel',
      'testosteroneLevel',
      'libido',
      'menstruationPain'
    ];
    
    metrics.forEach(metric => {
      const cur = Number(current?.[metric]);
      const cmp = Number(comparison?.[metric]);
      if (!Number.isFinite(cur) || !Number.isFinite(cmp)) return;
      if (cmp === 0) {
        differences[metric] = {
          current: cur,
          comparison: cmp,
          change: (cur - cmp).toFixed(2),
          percentChange: '-'
        };
        return;
      }
      differences[metric] = {
        current: cur,
        comparison: cmp,
        change: (cur - cmp).toFixed(2),
        percentChange: (((cur - cmp) / cmp) * 100).toFixed(1)
        };
    });
    
    return {
      label,
      comparisonDate: comparison.date,
      differences
    };
  }
  
  /**
   * 특정일 비교 옵션 생성
   * @private
   */
  _generateSpecificDateComparisonOptions() {
    return {
      availableDates: this.measurements.map(m => m.date),
      message: this._t({ ko: '날짜를 선택하여 비교하세요.', en: 'Select dates to compare.', ja: '日付を選択して比較してください。' })
    };
  }
  
  // ========================================
  // 4. 액션 가이드 생성 (Action Guide)
  // ========================================
  
  /**
   * 액션 가이드 데이터를 생성합니다.
   * @returns {Object} 액션 가이드 데이터
   */
  generateActionGuide() {
    const recommendations = this.recommendationEngine.generateAllRecommendations();
    
    return {
      // 다음 측정 예정일
      nextMeasurementDate: this._calculateNextMeasurementDate(),
      
      // 주간 체크리스트
      checklist: this._generateWeeklyChecklist(),
      
      // 추천 액션
      recommendations: {
        exercise: recommendations.exercise,
        diet: recommendations.diet,
        medication: recommendations.medication,
        habits: recommendations.habits
      },
      
      // 이번 주 집중 목표
      weeklyFocus: recommendations.focus,
      
      // 최근 성과 피드백
      performanceFeedback: this._generatePerformanceFeedback(),
      
      // 동기부여 메시지
      motivation: this._generateMotivationMessages()
    };
  }
  
  /**
   * 다음 측정 예정일 계산
   * @private
   */
  _calculateNextMeasurementDate() {
    if (this.measurements.length === 0) {
      return {
        date: new Date().toISOString().split('T')[0],
        message: this._t({
          ko: '첫 측정을 시작하세요!',
          en: 'Start your first measurement!',
          ja: '最初の測定を始めましょう！'
        })
      };
    }
    
    const lastDate = new Date(this.measurements[this.measurements.length - 1].date);
    const nextDate = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
    
    return {
      date: nextDate.toISOString().split('T')[0],
      daysUntil,
      message: daysUntil <= 0 
        ? this._t({
          ko: '측정 시기입니다!',
          en: "It's time to measure!",
          ja: '測定のタイミングです！'
        })
        : this._t({
          ko: '{days}일 후 측정 예정',
          en: 'Measurement in {days} days',
          ja: '測定まであと{days}日'
        }, { days: daysUntil })
    };
  }
  
  /**
   * 주간 체크리스트 생성
   * @private
   */
  _generateWeeklyChecklist() {
    return [
      { id: 'medication', text: this._t({ ko: '약물 규칙적으로 복용하기', en: 'Take medications regularly', ja: '薬を規則的に服用する' }), completed: false },
      { id: 'exercise', text: this._t({ ko: '주 3회 운동하기', en: 'Exercise 3 times a week', ja: '週3回運動する' }), completed: false },
      { id: 'water', text: this._t({ ko: '하루 2-3L 물 마시기', en: 'Drink 2-3L of water daily', ja: '1日2〜3Lの水を飲む' }), completed: false },
      { id: 'sleep', text: this._t({ ko: '충분한 수면 (7-8시간)', en: 'Get enough sleep (7-8 hours)', ja: '十分な睡眠（7〜8時間）' }), completed: false },
      { id: 'measurement', text: this._t({ ko: '정기 측정 기록하기', en: 'Log regular measurements', ja: '定期測定を記録する' }), completed: false }
    ];
  }
  
  /**
   * 최근 성과 피드백 생성
   * @private
   */
  _generatePerformanceFeedback() {
    if (this.measurements.length < 2) {
      return {
        message: this._t({
          ko: '데이터가 부족합니다. 꾸준히 측정하세요!',
          en: 'Not enough data yet. Keep measuring regularly!',
          ja: 'データが不足しています。継続して測定しましょう！'
        })
      };
    }
    
    const latest = this.measurements[this.measurements.length - 1];
    const previous = this.measurements[this.measurements.length - 2];
    const feedbacks = [];
    
    // 각 목표별 피드백
    Object.keys(this.targets).forEach(metric => {
      if (latest[metric] && previous[metric]) {
        const target = parseFloat(this.targets[metric]);
        const current = parseFloat(latest[metric]);
        const prev = parseFloat(previous[metric]);
        
        const currentDiff = Math.abs(current - target);
        const prevDiff = Math.abs(prev - target);
        
        if (currentDiff < prevDiff) {
          const improvement = prev - current;
          feedbacks.push({
            metric: this._getMetricName(metric),
            status: 'improving',
            message: this._t({
              ko: '{metric} {value}{unit} 개선!',
              en: '{metric}: improved by {value}{unit}!',
              ja: '{metric}が{value}{unit}改善！'
            }, {
              metric: this._getMetricName(metric),
              value: Math.abs(improvement).toFixed(1),
              unit: this._getMetricUnit(metric)
            }),
            tip: this._getTipForMetric(metric, 'keep_going')
          });
        } else if (currentDiff > prevDiff * 1.1) {
          feedbacks.push({
            metric: this._getMetricName(metric),
            status: 'declining',
            message: this._t({
              ko: '{metric} 목표에서 멀어지고 있습니다.',
              en: '{metric}: moving away from the goal.',
              ja: '{metric}が目標から遠ざかっています。'
            }, { metric: this._getMetricName(metric) }),
            tip: this._getTipForMetric(metric, 'needs_work')
          });
        }
      }
    });
    
    return feedbacks;
  }
  
  /**
   * 동기부여 메시지 생성
   * @private
   */
  _generateMotivationMessages() {
    const messages = [];
    
    // 연속 기록 확인
    if (this.measurements.length >= 4) {
      messages.push({
        icon: svgIcon('local_fire_department', 'mi-sm'),
        text: this._t({
          ko: '연속 {weeks}주 기록 중! 대단해요!',
          en: 'Streak: {weeks} weeks of logging!',
          ja: '連続{weeks}週記録中！すごい！'
        }, { weeks: this.measurements.length })
      });
    }
    
    // 목표 달성 확인
    const achievements = [];
    Object.keys(this.targets).forEach(metric => {
      const latest = this.measurements[this.measurements.length - 1];
      if (latest[metric]) {
        const diff = Math.abs(latest[metric] - this.targets[metric]);
        if (diff < 0.5) {
          achievements.push(this._getMetricName(metric));
        }
      }
    });
    
    if (achievements.length > 0) {
      messages.push({
        icon: svgIcon('celebration', 'mi-sm mi-success'),
        text: this._t({
          ko: '{items} 목표 달성!',
          en: 'Goal achieved: {items}',
          ja: '目標達成：{items}'
        }, { items: achievements.join(', ') })
      });
    }
    
    // 월간 변화 확인
    if (this.measurements.length >= 4) {
      const recentMonth = this.measurements.slice(-4);
      const first = recentMonth[0];
      const last = recentMonth[recentMonth.length - 1];
      
      if (first.weight && last.weight) {
        const weightChange = first.weight - last.weight;
        if (Math.abs(weightChange) >= 1) {
          messages.push({
            icon: svgIcon('fitness_center', 'mi-sm'),
            text: this._t({
              ko: '지난 달 체중 {sign}{value}kg!',
              en: 'Last month weight {sign}{value}kg!',
              ja: '先月の体重 {sign}{value}kg！'
            }, {
              sign: weightChange > 0 ? '-' : '+',
              value: Math.abs(weightChange).toFixed(1)
            })
          });
        }
      }
    }
    
    // 기본 격려 메시지
    if (messages.length === 0) {
      messages.push({
        icon: svgIcon('auto_awesome', 'mi-sm'),
        text: this._t({
          ko: '꾸준한 노력이 결과를 만듭니다. 계속 진행하세요!',
          en: 'Consistency creates results. Keep going!',
          ja: '継続は結果につながります。続けましょう！'
        })
      });
    }
    
    return messages;
  }
  
  // ========================================
  // 5. 유틸리티 함수
  // ========================================
  
  _getMetricName(metric) {
    const names = {
      height: { ko: '키', en: 'Height', ja: '身長' },
      weight: { ko: '체중', en: 'Weight', ja: '体重' },
      shoulderWidth: { ko: '어깨 너비', en: 'Shoulder Width', ja: '肩幅' },
      shoulder: { ko: '어깨', en: 'Shoulder', ja: '肩' },
      neck: { ko: '목', en: 'Neck', ja: '首回り' },
      waist: { ko: '허리', en: 'Waist', ja: 'ウエスト' },
      hips: { ko: '엉덩이', en: 'Hips', ja: 'ヒップ' },
      upperChest: { ko: '가슴(상)', en: 'Upper Chest', ja: '胸囲(上)' },
      lowerChest: { ko: '가슴(하)', en: 'Lower Chest', ja: '胸囲(下)' },
      chest: { ko: '윗 가슴둘레', en: 'Upper chest', ja: '上胸囲' },
      cupSize: { ko: '아랫 가슴둘레', en: 'Lower chest', ja: '下胸囲' },
      thigh: { ko: '허벅지', en: 'Thigh', ja: '太もも' },
      calf: { ko: '종아리', en: 'Calf', ja: 'ふくらはぎ' },
      arm: { ko: '팔뚝', en: 'Arm', ja: '腕' },
      muscleMass: { ko: '근육량', en: 'Muscle Mass', ja: '筋肉量' },
      bodyFatPercentage: { ko: '체지방률', en: 'Body Fat %', ja: '体脂肪率' },
      libido: { ko: '리비도', en: 'Libido', ja: 'リビドー' },
      estrogenLevel: { ko: '에스트로겐', en: 'Estrogen', ja: 'エストロゲン' },
      testosteroneLevel: { ko: '테스토스테론', en: 'Testosterone', ja: 'テストステロン' }
    };
    const entry = names[metric];
    if (!entry) return metric;
    return this._t(entry);
  }
  
  _getMetricUnit(metric) {
    const units = {
      height: 'cm',
      weight: 'kg',
      shoulderWidth: 'cm',
      shoulder: 'cm',
      neck: 'cm',
      waist: 'cm',
      hips: 'cm',
      upperChest: 'cm',
      lowerChest: 'cm',
      chest: 'cm',
      cupSize: 'cm',
      thigh: 'cm',
      calf: 'cm',
      arm: 'cm',
      muscleMass: 'kg',
      bodyFatPercentage: '%',
      libido: '',
      estrogenLevel: 'pg/mL',
      testosteroneLevel: 'ng/dL',
      menstruationPain: ''
    };
    return units[metric] || '';
  }
  
  _getAllMetricCategories() {
    return [
      { id: 'bodySize', name: this._t({ ko: '신체 사이즈', en: 'Body size', ja: '体のサイズ' }), metrics: ['weight', 'waist', 'hips', 'chest', 'cupSize', 'shoulder', 'thigh', 'arm'] },
      { id: 'composition', name: this._t({ ko: '체성분', en: 'Body composition', ja: '体組成' }), metrics: ['muscleMass', 'bodyFatPercentage'] },
      { id: 'hormones', name: this._t({ ko: '호르몬', en: 'Hormones', ja: 'ホルモン' }), metrics: ['estrogenLevel', 'testosteroneLevel'] }
    ];
  }
  
  _getTipForMetric(metric, situation) {
    const tips = {
      weight: {
        keep_going: {
          ko: '현재 식단과 운동을 계속 유지하세요!',
          en: 'Keep up your current diet and workouts!',
          ja: '今の食事と運動を続けましょう！'
        },
        needs_work: {
          ko: '칼로리 섭취를 재검토하고, 유산소 운동을 늘려보세요.',
          en: 'Review calorie intake and increase cardio.',
          ja: '摂取カロリーを見直し、有酸素運動を増やしましょう。'
        }
      },
      waist: {
        keep_going: {
          ko: '복부 운동을 계속하세요!',
          en: 'Keep doing core workouts!',
          ja: '腹部のトレーニングを続けましょう！'
        },
        needs_work: {
          ko: '복부 운동을 늘리고, 탄수화물 섭취를 조절하세요.',
          en: 'Increase core work and moderate carbs.',
          ja: '腹部トレを増やし、炭水化物を調整しましょう。'
        }
      }
    };

    const t = tips[metric]?.[situation];
    if (t) return this._t(t);
    return this._t({ ko: '꾸준히 노력하세요!', en: 'Keep going consistently!', ja: '継続して取り組みましょう！' });
  }
  
  /**
   * 논바이너리 모드에 대한 특별한 분석 로직을 처리합니다.
   * @param {MeasurementData} measurement - 측정 데이터
   * @returns {Object} 논바이너리 모드에 특화된 분석 결과
   */
  analyzeNonBinary(measurement) {
    console.log("Analyzing for non-binary mode:", measurement);
    
    const healthEval = this.healthEvaluator.evaluateAll();
    
    return {
      message: this._t({ ko: '논바이너리 분석은 개인의 목표에 따라 다릅니다.', en: 'Non-binary analysis varies based on individual goals.', ja: 'ノンバイナリー分析は個人の目標によって異なります。' }),
      balanceScore: healthEval.transformationScore,
      bodyRatios: healthEval.bodyRatios,
      recommendations: this.recommendationEngine.generateAllRecommendations(),
      note: this._t({ ko: '중성적이고 균형 잡힌 체형을 목표로 합니다.', en: 'Aiming for an androgynous and balanced body shape.', ja: '中性的でバランスの取れた体型を目指します。' })
    };
  }
}

// ========================================
// 6. Export
// ========================================

export default DoctorEngine;
