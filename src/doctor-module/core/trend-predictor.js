import { svgIcon } from '../../ui/icon-paths.js';
/**
 * Trend Predictor
 * 
 * 과거 측정 데이터를 분석하여 미래 추세 예측
 * - 다음 주 예상 수치
 * - 목표 달성 예상 시기
 * - 변화 속도 분석
 * - 선형 회귀 및 이동 평균 기반 예측
 */

// ========================================
// 1. 추세 예측기 클래스
// ========================================

export class TrendPredictor {
  constructor(measurements, targets = {}, language = 'ko') {
    this.measurements = measurements;
    this.targets = targets;
    this.language = language;
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
  // 2. 전체 예측 생성
  // ========================================
  
  /**
   * 모든 메트릭에 대한 예측 생성
   */
  predictAll() {
    if (this.measurements.length < 2) {
      return {
        message: this._t({ko: '예측을 위해서는 최소 2회 이상의 측정 데이터가 필요합니다.', en: 'At least 2 measurements are required for predictions.', ja: '予測には最低2回以上の測定データが必要です。'}),
        predictions: {},
        targetAchievement: {}
      };
    }
    
    const metricsToPredict = [
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
      'libido',
      'estrogenLevel',
      'testosteroneLevel',
      'menstruationPain'
    ];
    
    const predictions = {};
    const targetAchievement = {};
    
    metricsToPredict.forEach(metric => {
      const data = this.extractMetricData(metric);
      
      if (data.length >= 2) {
        predictions[metric] = this.predictNextValue(metric, data);
        
        if (this.targets[metric]) {
          targetAchievement[metric] = this.predictTargetDate(metric, data, this.targets[metric]);
        }
      }
    });
    
    return {
      predictions,
      targetAchievement,
      overallProgress: this.calculateOverallProgress()
    };
  }
  
  // ========================================
  // 3. 다음 주 예측
  // ========================================
  
  /**
   * 특정 메트릭의 다음 주 예상 값 계산
   */
  predictNextValue(metric, data = null) {
    if (!data) {
      data = this.extractMetricData(metric);
    }
    
    if (data.length < 2) {
      return null;
    }
    
    // 선형 회귀 사용
    const regression = this.linearRegression(data);
    const nextWeek = data.length;
    const prediction = regression.slope * nextWeek + regression.intercept;
    
    // 이동 평균도 계산 (최근 4주)
    const recentData = data.slice(-4);
    const movingAvg = this.calculateMovingAverage(recentData);
    
    // 두 방법의 가중 평균 (선형 60%, 이동 평균 40%)
    const weightedPrediction = prediction * 0.6 + movingAvg * 0.4;
    
    // 현재 값과의 변화량
    const currentValue = data[data.length - 1];
    const change = weightedPrediction - currentValue;
    const percentChange = (change / currentValue) * 100;
    
    // 신뢰도 계산 (R² 값)
    const confidence = this.calculateConfidence(data, regression);
    
    // 월평균 변화량 계산 (최근 4주 기준)
    const monthlyAvgChange = this.calculateMonthlyAvgChange(data);
    
    // 전주 변화량 계산
    const weeklyChange = data.length >= 2 ? (data[data.length - 1] - data[data.length - 2]).toFixed(2) : null;
    
    return {
      current: currentValue.toFixed(2),
      predicted: weightedPrediction.toFixed(2),
      change: change.toFixed(2),
      percentChange: percentChange.toFixed(1),
      confidence: (confidence * 100).toFixed(0),
      trend: this.determineTrend(data),
      method: 'weighted_average',
      dataPoints: data.length,
      monthlyAvgChange: monthlyAvgChange ? monthlyAvgChange.toFixed(2) : null,
      weeklyChange: weeklyChange
    };
  }
  
  /**
   * 선형 회귀 계산
   */
  linearRegression(data) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    data.forEach((y, x) => {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  }
  
  /**
   * 이동 평균 계산
   */
  calculateMovingAverage(data) {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, val) => acc + val, 0);
    return sum / data.length;
  }
  
  /**
   * 월평균 변화량 계산 (최근 4주 기준)
   */
  calculateMonthlyAvgChange(data) {
    if (data.length < 4) return null; // 최소 4주 데이터 필요
    
    // 최근 4주 데이터 사용
    const recentData = data.slice(-4);
    const regression = this.linearRegression(recentData);
    
    // 4주 = 1개월이므로 slope * 4
    return regression.slope * 4;
  }
  
  /**
   * 예측 신뢰도 계산 (R² 값)
   */
  calculateConfidence(data, regression) {
    if (data.length < 3) return 0.5; // 데이터가 적으면 중간 신뢰도
    
    const mean = data.reduce((acc, val) => acc + val, 0) / data.length;
    
    let ssTotal = 0;
    let ssResidual = 0;
    
    data.forEach((y, x) => {
      const predicted = regression.slope * x + regression.intercept;
      ssTotal += Math.pow(y - mean, 2);
      ssResidual += Math.pow(y - predicted, 2);
    });
    
    const r2 = 1 - (ssResidual / ssTotal);
    return Math.max(0, Math.min(1, r2)); // 0-1 사이로 제한
  }
  
  /**
   * 추세 판단
   */
  determineTrend(data) {
    if (data.length < 2) return 'insufficient_data';
    
    const recent = data.slice(-3); // 최근 3주
    
    const increases = [];
    for (let i = 1; i < recent.length; i++) {
      increases.push(recent[i] - recent[i - 1]);
    }
    
    const avgChange = increases.reduce((a, b) => a + b, 0) / increases.length;
    
    if (Math.abs(avgChange) < 0.1) {
      return 'stable';
    } else if (avgChange > 0) {
      return avgChange > 1 ? 'rapidly_increasing' : 'increasing';
    } else {
      return avgChange < -1 ? 'rapidly_decreasing' : 'decreasing';
    }
  }
  
  // ========================================
  // 4. 목표 달성 예측
  // ========================================
  
  /**
   * 목표 달성 예상 시기 계산
   */
  predictTargetDate(metric, data = null, target = null) {
    if (!data) {
      data = this.extractMetricData(metric);
    }
    
    if (!target) {
      target = this.targets[metric];
    }
    
    if (!target || data.length < 2) {
      return null;
    }
    
    const currentValue = data[data.length - 1];
    const diff = target - currentValue;
    
    // 이미 목표 달성
    if (Math.abs(diff) < 0.5) {
      return {
        status: 'achieved',
        message: 'targetAchievement.already_achieved',
        weeksRemaining: 0
      };
    }
    
    // 선형 회귀로 변화율 계산
    const regression = this.linearRegression(data);
    const weeklyChange = regression.slope;
    
    // 주간 변화율이 목표 방향과 반대면 달성 불가능
    if ((diff > 0 && weeklyChange < 0) || (diff < 0 && weeklyChange > 0)) {
      return {
        status: 'moving_away',
        message: 'targetAchievement.moving_away_trend',
        recommendation: 'targetAchievement.review_habits',
        weeksRemaining: null
      };
    }
    
    // 변화율이 너무 작으면
    if (Math.abs(weeklyChange) < 0.05) {
      return {
        status: 'too_slow',
        message: 'targetAchievement.too_slow_rate',
        recommendation: 'targetAchievement.need_more_active',
        weeksRemaining: Math.ceil(Math.abs(diff / weeklyChange))
      };
    }
    
    // 예상 주 수 계산
    const weeksRemaining = Math.ceil(Math.abs(diff / weeklyChange));
    
    // 예상 날짜 계산
    const today = new Date();
    const targetDate = new Date(today.getTime() + weeksRemaining * 7 * 24 * 60 * 60 * 1000);
    
    let status = 'on_track';
    if (weeksRemaining <= 4) {
      status = 'almost_there';
    } else if (weeksRemaining > 24) {
      status = 'long_term';
    }
    
    return {
      status,
      weeksRemaining,
      targetDate: targetDate.toISOString().split('T')[0],
      currentValue: currentValue.toFixed(2),
      targetValue: target.toFixed(2),
      weeklyChange: weeklyChange.toFixed(2),
      message: this.getTargetMessage(status, weeksRemaining)
    };
  }
  
  /**
   * 목표 달성 메시지 생성
   */
  getTargetMessage(status, weeks) {
    switch (status) {
      case 'achieved':
        return 'targetAchievement.achieved';
      case 'almost_there':
        return 'targetAchievement.almost_there';
      case 'on_track':
        return 'targetAchievement.on_track';
      case 'long_term':
        return 'targetAchievement.long_term';
      case 'moving_away':
        return 'targetAchievement.moving_away';
      case 'too_slow':
        return 'targetAchievement.too_slow';
      default:
        return '';
    }
  }
  
  // ========================================
  // 5. 전체 진행도 계산
  // ========================================
  
  /**
   * 모든 목표에 대한 전체 진행도
   */
  calculateOverallProgress() {
    if (!this.targets || Object.keys(this.targets).length === 0) {
      return {
        percentage: 0,
        achievedCount: 0,
        totalCount: 0,
        status: 'no_targets'
      };
    }
    
    if (this.measurements.length === 0) {
      return {
        percentage: 0,
        achievedCount: 0,
        totalCount: Object.keys(this.targets).length,
        status: 'no_data'
      };
    }
    
    const latest = this.measurements[this.measurements.length - 1];
    let achievedCount = 0;
    let totalProgress = 0;
    const targetKeys = Object.keys(this.targets);
    
    targetKeys.forEach(key => {
      if (latest[key]) {
        const target = parseFloat(this.targets[key]);
        const current = parseFloat(latest[key]);
        const diff = Math.abs(target - current);
        
        // 목표 달성 (±0.5 오차 허용)
        if (diff < 0.5) {
          achievedCount++;
          totalProgress += 100;
        } else {
          // 첫 측정값 찾기
          const firstMeasurement = this.measurements.find(m => m[key]);
          if (firstMeasurement) {
            const initial = parseFloat(firstMeasurement[key]);
            const totalDiff = Math.abs(target - initial);
            const progress = Math.max(0, Math.min(100, 
              ((totalDiff - diff) / totalDiff) * 100
            ));
            totalProgress += progress;
          }
        }
      }
    });
    
    const avgProgress = targetKeys.length > 0 ? totalProgress / targetKeys.length : 0;
    
    let status = 'in_progress';
    if (achievedCount === targetKeys.length) {
      status = 'all_achieved';
    } else if (achievedCount > targetKeys.length / 2) {
      status = 'more_than_half';
    } else if (avgProgress < 25) {
      status = 'just_started';
    }
    
    return {
      percentage: avgProgress.toFixed(1),
      achievedCount,
      totalCount: targetKeys.length,
      status,
      message: this.getProgressMessage(status, achievedCount, targetKeys.length)
    };
  }
  
  /**
   * 진행도 메시지 생성
   */
  getProgressMessage(status, achieved, total) {
    switch (status) {
      case 'all_achieved':
        return `${svgIcon('celebration', 'mi-inline mi-sm mi-success')} ${this._t({ko: '모든 목표 달성!', en: 'All goals achieved!', ja: 'すべての目標達成!'})} (${achieved}/${total})`;
      case 'more_than_half':
        return `${svgIcon('fitness_center', 'mi-inline mi-sm')} ${this._t({ko: '절반 이상 달성!', en: 'More than half achieved!', ja: '半分以上達成!'})} (${achieved}/${total})`;
      case 'in_progress':
        return `${svgIcon('trending_up', 'mi-inline mi-sm')} ${this._t({ko: '진행 중', en: 'In progress', ja: '進行中'})} (${achieved}/${total} ${this._t({ko: '달성', en: 'achieved', ja: '達成'})})`;
      case 'just_started':
        return `${svgIcon('spa', 'mi-inline mi-sm')} ${this._t({ko: '시작 단계', en: 'Getting started', ja: '開始段階'})} (${achieved}/${total} ${this._t({ko: '달성', en: 'achieved', ja: '達成'})})`;
      case 'no_targets':
        return this._t({ko: '목표를 설정하지 않았습니다.', en: 'No goals have been set.', ja: '目標が設定されていません。'});
      case 'no_data':
        return this._t({ko: '측정 데이터가 없습니다.', en: 'No measurement data available.', ja: '測定データがありません。'});
      default:
        return '';
    }
  }
  
  // ========================================
  // 6. 변화 속도 분석
  // ========================================
  
  /**
   * 최근 변화 속도 분석
   */
  analyzeChangeRate(metric, weeks = 4) {
    const data = this.extractMetricData(metric);
    
    if (data.length < 2) {
      return null;
    }
    
    const recentData = data.slice(-weeks);
    
    if (recentData.length < 2) {
      return null;
    }
    
    // 주간 변화량 계산
    const changes = [];
    for (let i = 1; i < recentData.length; i++) {
      changes.push(recentData[i] - recentData[i - 1]);
    }
    
    const avgWeeklyChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    const maxChange = Math.max(...changes.map(Math.abs));
    const minChange = Math.min(...changes.map(Math.abs));
    
    // 일관성 점수 (0-100)
    const consistency = 100 - (Math.abs(maxChange - minChange) / Math.abs(avgWeeklyChange + 0.01) * 100);
    const consistencyScore = Math.max(0, Math.min(100, consistency));
    
    let evaluation = 'moderate';
    if (Math.abs(avgWeeklyChange) < 0.1) {
      evaluation = 'minimal';
    } else if (Math.abs(avgWeeklyChange) < 0.5) {
      evaluation = 'slow';
    } else if (Math.abs(avgWeeklyChange) < 1.5) {
      evaluation = 'good';
    } else {
      evaluation = 'rapid';
    }
    
    return {
      avgWeeklyChange: avgWeeklyChange.toFixed(2),
      maxChange: maxChange.toFixed(2),
      minChange: minChange.toFixed(2),
      consistency: consistencyScore.toFixed(0),
      evaluation,
      weeksAnalyzed: recentData.length,
      message: this.getChangeRateMessage(evaluation, avgWeeklyChange)
    };
  }
  
  /**
   * 변화 속도 메시지 생성
   */
  getChangeRateMessage(evaluation, change) {
    const direction = change > 0
      ? this._t({ko: '증가', en: 'increasing', ja: '増加'})
      : this._t({ko: '감소', en: 'decreasing', ja: '減少'});
    const absChange = Math.abs(change);
    
    switch (evaluation) {
      case 'minimal':
        return this._t({ko: '변화가 거의 없습니다. (주당 {change})', en: 'Almost no change. ({change} per week)', ja: '変化はほとんどありません。(週あたり {change})'}, { change: absChange.toFixed(2) });
      case 'slow':
        return this._t({ko: '천천히 {direction}하고 있습니다. (주당 {change})', en: 'Slowly {direction}. ({change} per week)', ja: 'ゆっくり{direction}しています。(週あたり {change})'}, { direction, change: absChange.toFixed(2) });
      case 'good':
        return this._t({ko: '[OK] 이상적인 속도로 {direction}하고 있습니다. (주당 {change})', en: '[OK] {direction} at an ideal rate. ({change} per week)', ja: '[OK] 理想的な速度で{direction}しています。(週あたり {change})'}, { direction, change: absChange.toFixed(2) });
      case 'rapid':
        return this._t({ko: '[WARN] 매우 빠르게 {direction}하고 있습니다. (주당 {change}) 건강에 주의하세요.', en: '[WARN] {direction} very rapidly. ({change} per week) Please monitor your health.', ja: '[WARN] 非常に速く{direction}しています。(週あたり {change}) 健康に注意してください。'}, { direction, change: absChange.toFixed(2) });
      default:
        return '';
    }
  }
  
  // ========================================
  // 7. 유틸리티
  // ========================================
  
  /**
   * 측정 데이터에서 특정 메트릭 추출
   */
  extractMetricData(metric) {
    const data = [];
    
    this.measurements.forEach(measurement => {
      if (measurement[metric] !== undefined && measurement[metric] !== null && measurement[metric] !== '') {
        const value = parseFloat(measurement[metric]);
        if (!isNaN(value)) {
          data.push(value);
        }
      }
    });
    
    return data;
  }
  
  /**
   * 특정 메트릭의 통계 계산
   */
  calculateStatistics(metric) {
    const data = this.extractMetricData(metric);
    
    if (data.length === 0) {
      return null;
    }
    
    const sorted = [...data].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    
    // 중앙값
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
    
    // 표준편차
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      count: data.length,
      min: min.toFixed(2),
      max: max.toFixed(2),
      mean: mean.toFixed(2),
      median: median.toFixed(2),
      stdDev: stdDev.toFixed(2),
      range: (max - min).toFixed(2)
    };
  }
}

// ========================================
// 8. Export
// ========================================

export default TrendPredictor;
