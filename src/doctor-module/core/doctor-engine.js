/**
 * 🩺 의사 모듈 핵심 엔진 (Doctor Engine)
 * 
 * 모든 건강 분석의 중심 - 서브모듈 통합 오케스트레이터
 * 증상, 측정 데이터, 약물 정보를 종합하여 진단 및 추천 생성
 */

import { SYMPTOM_DATABASE } from '../data/symptom-database.js';
import { MEDICATION_DATABASE } from '../data/medication-database.js';
import { HealthEvaluator } from './health-evaluator.js';
import { SymptomAnalyzer } from './symptom-analyzer.js';
import { TrendPredictor } from './trend-predictor.js';
import { RecommendationEngine } from './recommendation-engine.js';

// ========================================
// 1. 의사 엔진 클래스
// ========================================

export class DoctorEngine {
  constructor(measurements = [], userSettings = {}) {
    this.measurements = measurements;
    this.userSettings = userSettings;
    this.mode = userSettings.mode || 'mtf';
    this.biologicalSex = userSettings.biologicalSex || 'male';
    this.language = userSettings.language || 'ko';
    this.targets = userSettings.targets || {};
    
    // 데이터베이스 로드
    this.symptomDB = SYMPTOM_DATABASE;
    this.medicationDB = MEDICATION_DATABASE;
    
    // 서브모듈 초기화
    this.healthEvaluator = new HealthEvaluator(measurements, this.mode, this.biologicalSex);
    this.symptomAnalyzer = new SymptomAnalyzer(measurements, this.mode, this.language);
    this.trendPredictor = new TrendPredictor(measurements, this.targets);
    
    // 추천 엔진은 증상과 약물 정보도 필요
    const latestSymptoms = measurements.length > 0 ? measurements[measurements.length - 1].symptoms : [];
    const latestMedications = measurements.length > 0 ? measurements[measurements.length - 1] : {};
    this.recommendationEngine = new RecommendationEngine(
      measurements,
      latestSymptoms,
      latestMedications,
      this.targets,
      this.mode
    );
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
          message: '측정 데이터가 없습니다. 첫 측정을 시작하세요!',
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
    const symptomAnalysis = this.symptomAnalyzer.analyzeAll();
    const predictions = this.trendPredictor.predictAll();
    
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
      alerts: this._mergeAlerts(symptomAnalysis.criticalAlerts, symptomAnalysis.warnings),
      
      // 증상 분석
      symptomAnalysis: {
        summary: symptomAnalysis.summary,
        insights: symptomAnalysis.insights,
        trends: symptomAnalysis.trends
      },
      
      // 호르몬 상태
      hormoneStatus: healthEvaluation.hormones,
      
      // 체성분 분석
      bodyComposition: healthEvaluation.bodyComposition,
      
      // 전체 변환 점수 (여성화/남성화 점수)
      transformationScore: healthEvaluation.transformationScore
    };
    
    return briefing;
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
      const previousEvaluator = new HealthEvaluator(previousMeasurements, this.mode, this.biologicalSex);
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
        const tempEvaluator = new HealthEvaluator(tempMeasurements, this.mode, this.biologicalSex);
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
        messages.push('✅ 호르몬 수치가 이상적입니다.');
      } else if (healthEval.hormones.status === 'warning') {
        messages.push('⚠️ 호르몬 수치 조정이 필요합니다.');
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
          message: '측정 데이터가 없습니다.',
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
    
    // 시작 시점
    milestones.push({
      week: 1,
      date: this.measurements[0].date,
      type: 'start',
      title: '시작',
      description: '첫 측정'
    });
    
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
            title: `${this._getMetricName(metric)} 달성!`,
            description: `목표: ${this.targets[metric]}`
          });
        }
      }
    });
    
    // 현재 시점
    milestones.push({
      week: this.measurements.length,
      date: this.measurements[this.measurements.length - 1].date,
      type: 'current',
      title: '현재',
      description: `Week ${this.measurements.length}`
    });
    
    // 예상 달성 시점
    const estimatedWeek = this._estimateTargetCompletionWeek();
    if (estimatedWeek > this.measurements.length) {
      milestones.push({
        week: estimatedWeek,
        date: this._estimateDate(estimatedWeek - this.measurements.length),
        type: 'prediction',
        title: '최종 목표 예상',
        description: '모든 목표 달성 예상 시점'
      });
    }
    
    return milestones.sort((a, b) => a.week - b.week);
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
    
    const metrics = ['weight', 'waist', 'hips', 'chest', 'shoulder', 'thigh', 'arm', 'muscleMass', 'bodyFatPercentage'];
    
    metrics.forEach(metric => {
      if (first[metric] && last[metric]) {
        const change = last[metric] - first[metric];
        if (Math.abs(change) > 0.1) {
          changes.push({
            metric: this._getMetricName(metric),
            change: change.toFixed(1),
            unit: this._getMetricUnit(metric)
          });
        }
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
      return { message: '비교할 데이터가 부족합니다.' };
    }
    
    const latest = this.measurements[this.measurements.length - 1];
    const previous = this.measurements[this.measurements.length - 2];
    const first = this.measurements[0];
    
    return {
      withPreviousWeek: this._compareTwo(latest, previous, '지난 주'),
      withFirstMeasurement: this._compareTwo(latest, first, '처음')
    };
  }
  
  /**
   * 두 측정값 비교
   * @private
   */
  _compareTwo(current, comparison, label) {
    const differences = {};
    const metrics = ['weight', 'waist', 'hips', 'chest', 'shoulder', 'thigh', 'arm', 'muscleMass', 'bodyFatPercentage'];
    
    metrics.forEach(metric => {
      if (current[metric] && comparison[metric]) {
        differences[metric] = {
          current: current[metric],
          comparison: comparison[metric],
          change: (current[metric] - comparison[metric]).toFixed(2),
          percentChange: (((current[metric] - comparison[metric]) / comparison[metric]) * 100).toFixed(1)
        };
      }
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
      message: '날짜를 선택하여 비교하세요.'
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
        message: '첫 측정을 시작하세요!'
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
        ? '측정 시기입니다!' 
        : `${daysUntil}일 후 측정 예정`
    };
  }
  
  /**
   * 주간 체크리스트 생성
   * @private
   */
  _generateWeeklyChecklist() {
    return [
      { id: 'medication', text: '약물 규칙적으로 복용하기', completed: false },
      { id: 'exercise', text: '주 3회 운동하기', completed: false },
      { id: 'water', text: '하루 2-3L 물 마시기', completed: false },
      { id: 'sleep', text: '충분한 수면 (7-8시간)', completed: false },
      { id: 'measurement', text: '정기 측정 기록하기', completed: false }
    ];
  }
  
  /**
   * 최근 성과 피드백 생성
   * @private
   */
  _generatePerformanceFeedback() {
    if (this.measurements.length < 2) {
      return {
        message: '데이터가 부족합니다. 꾸준히 측정하세요!'
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
            message: `${this._getMetricName(metric)} ${Math.abs(improvement).toFixed(1)}${this._getMetricUnit(metric)} 개선!`,
            tip: this._getTipForMetric(metric, 'keep_going')
          });
        } else if (currentDiff > prevDiff * 1.1) {
          feedbacks.push({
            metric: this._getMetricName(metric),
            status: 'declining',
            message: `${this._getMetricName(metric)} 목표에서 멀어지고 있습니다.`,
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
        icon: '🔥',
        text: `연속 ${this.measurements.length}주 기록 중! 대단해요!`
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
        icon: '🎉',
        text: `${achievements.join(', ')} 목표 달성!`
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
            icon: '💪',
            text: `지난 달 체중 ${weightChange > 0 ? '-' : '+'}${Math.abs(weightChange).toFixed(1)}kg!`
          });
        }
      }
    }
    
    // 기본 격려 메시지
    if (messages.length === 0) {
      messages.push({
        icon: '✨',
        text: '꾸준한 노력이 결과를 만듭니다. 계속 진행하세요!'
      });
    }
    
    return messages;
  }
  
  // ========================================
  // 5. 유틸리티 함수
  // ========================================
  
  _getMetricName(metric) {
    const names = {
      weight: '체중',
      waist: '허리',
      hips: '엉덩이',
      chest: '가슴',
      shoulder: '어깨',
      thigh: '허벅지',
      arm: '팔뚝',
      muscleMass: '근육량',
      bodyFatPercentage: '체지방률'
    };
    return names[metric] || metric;
  }
  
  _getMetricUnit(metric) {
    const units = {
      weight: 'kg',
      waist: 'cm',
      hips: 'cm',
      chest: 'cm',
      shoulder: 'cm',
      thigh: 'cm',
      arm: 'cm',
      muscleMass: 'kg',
      bodyFatPercentage: '%'
    };
    return units[metric] || '';
  }
  
  _getAllMetricCategories() {
    return [
      { id: 'bodySize', name: '신체 사이즈', metrics: ['weight', 'waist', 'hips', 'chest', 'shoulder', 'thigh', 'arm'] },
      { id: 'composition', name: '체성분', metrics: ['muscleMass', 'bodyFatPercentage'] },
      { id: 'hormones', name: '호르몬', metrics: ['estrogenLevel', 'testosteroneLevel'] }
    ];
  }
  
  _getTipForMetric(metric, situation) {
    const tips = {
      weight: {
        keep_going: '현재 식단과 운동을 계속 유지하세요!',
        needs_work: '칼로리 섭취를 재검토하고, 유산소 운동을 늘려보세요.'
      },
      waist: {
        keep_going: '복부 운동을 계속하세요!',
        needs_work: '복부 운동을 늘리고, 탄수화물 섭취를 조절하세요.'
      }
    };
    
    return tips[metric]?.[situation] || '꾸준히 노력하세요!';
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
      message: "논바이너리 분석은 개인의 목표에 따라 다릅니다.",
      balanceScore: healthEval.transformationScore,
      bodyRatios: healthEval.bodyRatios,
      recommendations: this.recommendationEngine.generateAllRecommendations(),
      note: "중성적이고 균형 잡힌 체형을 목표로 합니다."
    };
  }
}

// ========================================
// 6. Export
// ========================================

export default DoctorEngine;
