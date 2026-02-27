import { svgIcon } from '../../ui/icon-paths.js';
/**
 * FTM Analyzer
 * 
 * 남성화 전환에 특화된 상세 분석
 * - 테스토스테론 효과 분석
 * - 남성적 신체 변화 추적
 * - FTM 특유 증상 및 부작용 관리
 * - 목소리 변화 및 체형 변화 추적
 */

// ========================================
// 1. FTM 분석기 클래스
// ========================================

export class FTMAnalyzer {
  constructor(measurements, biologicalSex = 'female', language = 'ko') {
    this.measurements = measurements;
    this.biologicalSex = biologicalSex;
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
  // 2. 전체 FTM 분석
  // ========================================
  
  /**
   * FTM 전환 종합 분석
   */
  analyzeAll() {
    if (this.measurements.length === 0) {
      return {
        message: this._t({ko: 'FTM 분석을 위한 데이터가 없습니다.', en: 'No data available for FTM analysis.', ja: 'FTM分析のためのデータがありません。'}),
        masculinizationProgress: null,
        muscleGrowth: null,
        bodyReshaping: null,
        hormoneEffects: null,
        timeline: null
      };
    }
    
    return {
      masculinizationProgress: this.analyzeMasculinizationProgress(),
      muscleGrowth: this.analyzeMuscleGrowth(),
      bodyReshaping: this.analyzeBodyReshaping(),
      hormoneEffects: this.analyzeHormoneEffects(),
      voiceChange: this.analyzeVoiceChange(),
      timeline: this.generateFTMTimeline(),
      recommendations: this.generateFTMRecommendations()
    };
  }
  
  // ========================================
  // 3. 남성화 진행도 분석
  // ========================================
  
  /**
   * 전체 남성화 진행도 점수 (0-100)
   */
  analyzeMasculinizationProgress() {
    const latest = this.measurements[this.measurements.length - 1];
    let score = 0;
    let maxScore = 0;
    const breakdown = {};
    
    // 1. 신체 비율 변화 (35점)
    const ratioScore = this._evaluateBodyRatios(latest);
    score += ratioScore.score;
    maxScore += 35;
    breakdown.bodyRatios = ratioScore;
    
    // 2. 근육 발달 (25점)
    const muscleScore = this._evaluateMuscleDevelopment(latest);
    score += muscleScore.score;
    maxScore += 25;
    breakdown.muscleDevelopment = muscleScore;
    
    // 3. 체지방 감소 (20점)
    const fatScore = this._evaluateFatReduction(latest);
    score += fatScore.score;
    maxScore += 20;
    breakdown.fatReduction = fatScore;
    
    // 4. 호르몬 수치 (20점)
    const hormoneScore = this._evaluateHormones(latest);
    score += hormoneScore.score;
    maxScore += 20;
    breakdown.hormones = hormoneScore;
    
    const finalScore = (score / maxScore) * 100;
    
    return {
      overallScore: finalScore.toFixed(1),
      category: this._getMasculinizationCategory(finalScore),
      breakdown,
      message: this._getMasculinizationMessage(finalScore)
    };
  }
  
  /**
   * 신체 비율 평가 (35점)
   * @private
   */
  _evaluateBodyRatios(measurement) {
    let score = 0;
    const maxScore = 35;
    const details = {};
    
    // WHR (Waist-Hip Ratio) - 높을수록 좋음 (12점)
    if (measurement.waist && measurement.hips) {
      const whr = measurement.waist / measurement.hips;
      details.whr = { value: whr.toFixed(3) };
      
      if (whr > 0.95) {
        score += 12;
        details.whr.evaluation = this._t({ko: '매우 남성적 (> 0.95)', en: 'Very masculine (> 0.95)', ja: '非常に男性的 (> 0.95)'});
      } else if (whr > 0.90) {
        score += 10;
        details.whr.evaluation = this._t({ko: '남성적 (> 0.90)', en: 'Masculine (> 0.90)', ja: '男性的 (> 0.90)'});
      } else if (whr > 0.85) {
        score += 7;
        details.whr.evaluation = this._t({ko: '진행 중 (> 0.85)', en: 'In progress (> 0.85)', ja: '進行中 (> 0.85)'});
      } else {
        score += 4;
        details.whr.evaluation = this._t({ko: '아직 여성적 (<= 0.85)', en: 'Still feminine (<= 0.85)', ja: 'まだ女性的 (<= 0.85)'});
      }
    }
    
    // Shoulder-Waist Ratio - 높을수록 좋음 (15점)
    if (measurement.shoulder && measurement.waist) {
      const swr = measurement.shoulder / measurement.waist;
      details.shoulderWaist = { value: swr.toFixed(2) };
      
      if (swr > 1.50) {
        score += 15;
        details.shoulderWaist.evaluation = this._t({ko: '매우 넓은 어깨 (> 1.50) - V자 체형!', en: 'Very broad shoulders (> 1.50) - V-shaped body!', ja: '非常に広い肩 (> 1.50) - V字体型!'});
      } else if (swr > 1.40) {
        score += 12;
        details.shoulderWaist.evaluation = this._t({ko: '남성적 어깨 (> 1.40)', en: 'Masculine shoulders (> 1.40)', ja: '男性的な肩 (> 1.40)'});
      } else if (swr > 1.30) {
        score += 8;
        details.shoulderWaist.evaluation = this._t({ko: '진행 중 (> 1.30)', en: 'In progress (> 1.30)', ja: '進行中 (> 1.30)'});
      } else {
        score += 4;
        details.shoulderWaist.evaluation = this._t({ko: '어깨 발달 필요 (<= 1.30)', en: 'Shoulder development needed (<= 1.30)', ja: '肩の発達が必要 (<= 1.30)'});
      }
    }
    
    // 가슴 평탄화 (8점)
    if (measurement.cupSize && measurement.chest) {
      const diff = measurement.cupSize - measurement.chest;
      details.chestFlattening = { difference: diff.toFixed(1) };
      
      if (diff < 1) {
        score += 8;
        details.chestFlattening.evaluation = this._t({ko: '매우 평탄 (< 1cm)', en: 'Very flat (< 1cm)', ja: '非常に平坦 (< 1cm)'});
      } else if (diff < 2) {
        score += 6;
        details.chestFlattening.evaluation = this._t({ko: '상당히 평탄 (< 2cm)', en: 'Considerably flat (< 2cm)', ja: 'かなり平坦 (< 2cm)'});
      } else if (diff < 3) {
        score += 4;
        details.chestFlattening.evaluation = this._t({ko: '진행 중 (< 3cm)', en: 'In progress (< 3cm)', ja: '進行中 (< 3cm)'});
      } else {
        score += 2;
        details.chestFlattening.evaluation = this._t({ko: '바인더 또는 수술 고려 (>= 3cm)', en: 'Consider binder or surgery (>= 3cm)', ja: 'バインダーまたは手術を検討 (>= 3cm)'});
      }
    }
    
    return { score, maxScore, details };
  }
  
  /**
   * 근육 발달 평가 (25점)
   * @private
   */
  _evaluateMuscleDevelopment(measurement) {
    let score = 0;
    const maxScore = 25;
    const details = {};
    
    // 근육량 절대값 (15점)
    if (measurement.muscleMass) {
      const mm = parseFloat(measurement.muscleMass);
      details.muscleMass = { value: mm.toFixed(1) };
      
      if (mm > 38) {
        score += 15;
        details.muscleMass.evaluation = this._t({ko: '매우 높은 근육량 (> 38kg)', en: 'Very high muscle mass (> 38kg)', ja: '非常に高い筋肉量 (> 38kg)'});
      } else if (mm > 35) {
        score += 12;
        details.muscleMass.evaluation = this._t({ko: '높은 근육량 (> 35kg)', en: 'High muscle mass (> 35kg)', ja: '高い筋肉量 (> 35kg)'});
      } else if (mm > 30) {
        score += 9;
        details.muscleMass.evaluation = this._t({ko: '보통 근육량 (> 30kg)', en: 'Average muscle mass (> 30kg)', ja: '普通の筋肉量 (> 30kg)'});
      } else if (mm > 25) {
        score += 6;
        details.muscleMass.evaluation = this._t({ko: '낮은 근육량 (> 25kg) - 근력 운동 필요', en: 'Low muscle mass (> 25kg) - strength training needed', ja: '低い筋肉量 (> 25kg) - 筋力トレーニングが必要'});
      } else {
        score += 3;
        details.muscleMass.evaluation = this._t({ko: '매우 낮음 (<= 25kg) - 적극적인 근력 운동 필요', en: 'Very low (<= 25kg) - active strength training needed', ja: '非常に低い (<= 25kg) - 積極的な筋力トレーニングが必要'});
      }
    }
    
    // 근육량 비율 (체중 대비) (10점)
    if (measurement.muscleMass && measurement.weight) {
      const musclePercentage = (measurement.muscleMass / measurement.weight) * 100;
      details.musclePercentage = { value: musclePercentage.toFixed(1) };
      
      if (musclePercentage > 50) {
        score += 10;
        details.musclePercentage.evaluation = this._t({ko: '매우 높음 (> 50%)', en: 'Very high (> 50%)', ja: '非常に高い (> 50%)'});
      } else if (musclePercentage > 45) {
        score += 8;
        details.musclePercentage.evaluation = this._t({ko: '높음 (> 45%)', en: 'High (> 45%)', ja: '高い (> 45%)'});
      } else if (musclePercentage > 40) {
        score += 6;
        details.musclePercentage.evaluation = this._t({ko: '보통 (> 40%)', en: 'Average (> 40%)', ja: '普通 (> 40%)'});
      } else {
        score += 3;
        details.musclePercentage.evaluation = this._t({ko: '낮음 (<= 40%) - 근육 증가 필요', en: 'Low (<= 40%) - muscle increase needed', ja: '低い (<= 40%) - 筋肉増加が必要'});
      }
    }
    
    return { score, maxScore, details };
  }
  
  /**
   * 체지방 감소 평가 (20점)
   * @private
   */
  _evaluateFatReduction(measurement) {
    let score = 0;
    const maxScore = 20;
    const details = {};
    
    if (measurement.bodyFatPercentage) {
      const bfp = parseFloat(measurement.bodyFatPercentage);
      details.bodyFatPercentage = bfp.toFixed(1);
      
      // 남성 범위: 10-18%
      if (bfp >= 10 && bfp <= 15) {
        score += 20;
        details.evaluation = this._t({ko: '이상적인 남성 체지방률 (10-15%)', en: 'Ideal male body fat percentage (10-15%)', ja: '理想的な男性体脂肪率 (10-15%)'});
      } else if (bfp < 10) {
        score += 12;
        details.evaluation = this._t({ko: '매우 낮음 (< 10%) - 건강 주의, 너무 낮음', en: 'Very low (< 10%) - health caution, too low', ja: '非常に低い (< 10%) - 健康注意、低すぎる'});
      } else if (bfp > 15 && bfp <= 18) {
        score += 16;
        details.evaluation = this._t({ko: '좋음 (15-18%)', en: 'Good (15-18%)', ja: '良好 (15-18%)'});
      } else if (bfp > 18 && bfp <= 22) {
        score += 10;
        details.evaluation = this._t({ko: '약간 높음 (18-22%) - 감소 필요', en: 'Slightly high (18-22%) - reduction needed', ja: 'やや高い (18-22%) - 減少が必要'});
      } else {
        score += 5;
        details.evaluation = this._t({ko: '높음 (> 22%) - 적극적인 감소 필요', en: 'High (> 22%) - active reduction needed', ja: '高い (> 22%) - 積極的な減少が必要'});
      }
    }
    
    return { score, maxScore, details };
  }
  
  /**
   * 호르몬 수치 평가 (20점)
   * @private
   */
  _evaluateHormones(measurement) {
    let score = 0;
    const maxScore = 20;
    const details = {};
    
    // 테스토스테론 (15점)
    if (measurement.testosteroneLevel) {
      const tLevel = parseFloat(measurement.testosteroneLevel);
      details.testosterone = { level: tLevel };
      
      if (tLevel >= 300 && tLevel <= 700) {
        score += 15;
        details.testosterone.status = this._t({ko: '이상적 (300-700 ng/ml)', en: 'Ideal (300-700 ng/ml)', ja: '理想的 (300-700 ng/ml)'});
      } else if (tLevel >= 700 && tLevel <= 1000) {
        score += 12;
        details.testosterone.status = this._t({ko: '약간 높음 (700-1000 ng/ml) - 부작용 주의', en: 'Slightly high (700-1000 ng/ml) - watch for side effects', ja: 'やや高い (700-1000 ng/ml) - 副作用に注意'});
      } else if (tLevel >= 200 && tLevel < 300) {
        score += 8;
        details.testosterone.status = this._t({ko: '낮음 (200-300 ng/ml) - 증량 필요', en: 'Low (200-300 ng/ml) - dose increase needed', ja: '低い (200-300 ng/ml) - 増量が必要'});
      } else if (tLevel < 200) {
        score += 4;
        details.testosterone.status = this._t({ko: '매우 낮음 (< 200 ng/ml) - 즉시 증량 필요', en: 'Very low (< 200 ng/ml) - immediate dose increase needed', ja: '非常に低い (< 200 ng/ml) - 即座に増量が必要'});
      } else {
        score += 6;
        details.testosterone.status = this._t({ko: '너무 높음 (> 1000 ng/ml) - 위험, 감량 필요', en: 'Too high (> 1000 ng/ml) - dangerous, reduction needed', ja: '高すぎる (> 1000 ng/ml) - 危険、減量が必要'});
      }
    }
    
    // 에스트로겐 (5점)
    if (measurement.estrogenLevel) {
      const eLevel = parseFloat(measurement.estrogenLevel);
      details.estrogen = { level: eLevel };
      
      if (eLevel < 30) {
        score += 5;
        details.estrogen.status = this._t({ko: '이상적 (< 30 pg/ml) - 잘 억제됨', en: 'Ideal (< 30 pg/ml) - well suppressed', ja: '理想的 (< 30 pg/ml) - よく抑制されている'});
      } else if (eLevel < 50) {
        score += 3;
        details.estrogen.status = this._t({ko: '약간 높음 (30-50 pg/ml)', en: 'Slightly high (30-50 pg/ml)', ja: 'やや高い (30-50 pg/ml)'});
      } else {
        score += 1;
        details.estrogen.status = this._t({ko: '높음 (> 50 pg/ml) - AI 고려', en: 'High (> 50 pg/ml) - consider AI', ja: '高い (> 50 pg/ml) - AI検討'});
      }
    }
    
    return { score, maxScore, details };
  }
  
  // ========================================
  // 4. 근육 성장 추적
  // ========================================
  
  /**
   * 근육 성장 상세 분석
   */
  analyzeMuscleGrowth() {
    if (this.measurements.length === 0) {
      return null;
    }
    
    const growth = [];
    
    this.measurements.forEach((measurement, index) => {
      if (measurement.muscleMass) {
        growth.push({
          week: index + 1,
          date: measurement.date,
          muscleMass: measurement.muscleMass,
          weight: measurement.weight || null,
          musclePercentage: measurement.weight 
            ? ((measurement.muscleMass / measurement.weight) * 100).toFixed(1)
            : null
        });
      }
    });
    
    return {
      history: growth,
      current: growth.length > 0 ? growth[growth.length - 1] : null,
      progress: this._analyzeMuscleProgress(growth)
    };
  }
  
  /**
   * 근육 성장 진행 분석
   * @private
   */
  _analyzeMuscleProgress(growth) {
    if (growth.length < 2) {
      return { message: this._t({ko: '진행도를 확인하기 위해 더 많은 데이터가 필요합니다.', en: 'More data is needed to check progress.', ja: '進捗を確認するためにもっとデータが必要です。'}) };
    }
    
    const first = growth[0];
    const latest = growth[growth.length - 1];
    
    const totalGain = parseFloat(latest.muscleMass) - parseFloat(first.muscleMass);
    const weeksElapsed = latest.week - first.week;
    const avgWeeklyGain = totalGain / weeksElapsed;
    
    let evaluation = '';
    if (avgWeeklyGain > 0.3) {
      evaluation = this._t({ko: '매우 빠른 성장 (테스토스테론 + 운동 효과 우수)', en: 'Very rapid growth (excellent testosterone + exercise effect)', ja: '非常に速い成長 (テストステロン + 運動効果が優秀)'});
    } else if (avgWeeklyGain > 0.15) {
      evaluation = this._t({ko: '정상적인 성장 (순조로운 진행)', en: 'Normal growth (smooth progress)', ja: '正常な成長 (順調な進行)'});
    } else if (avgWeeklyGain > 0) {
      evaluation = this._t({ko: '느린 성장 (운동 강도 증가 필요)', en: 'Slow growth (exercise intensity increase needed)', ja: '遅い成長 (運動強度の増加が必要)'});
    } else {
      evaluation = this._t({ko: '정체 또는 감소 (운동 및 영양 재검토 필요)', en: 'Plateau or decline (review exercise and nutrition)', ja: '停滞または減少 (運動と栄養の見直しが必要)'});
    }
    
    return {
      totalGain: totalGain.toFixed(1),
      weeksElapsed,
      avgWeeklyGain: avgWeeklyGain.toFixed(2),
      evaluation
    };
  }
  
  // ========================================
  // 5. 신체 재형성 분석
  // ========================================
  
  /**
   * 남성적 체형 변화 분석
   */
  analyzeBodyReshaping() {
    if (this.measurements.length === 0) {
      return null;
    }
    
    const latest = this.measurements[this.measurements.length - 1];
    const first = this.measurements[0];
    
    const changes = {};
    
    // 어깨 증가 (목표)
    if (latest.shoulder && first.shoulder) {
      changes.shoulder = {
        first: first.shoulder,
        current: latest.shoulder,
        change: (latest.shoulder - first.shoulder).toFixed(1),
        evaluation: latest.shoulder > first.shoulder ? '[OK] ' + this._t({ko: '증가 중 (좋음)', en: 'Increasing (good)', ja: '増加中 (良好)'}) : '[WARN] ' + this._t({ko: '정체 또는 감소', en: 'Plateau or decrease', ja: '停滞または減少'})
      };
    }
    
    // 허리 (직선형 유지 또는 약간 증가)
    if (latest.waist && first.waist) {
      changes.waist = {
        first: first.waist,
        current: latest.waist,
        change: (latest.waist - first.waist).toFixed(1),
        evaluation: '[INFO] ' + this._t({ko: '변화 추적 중', en: 'Tracking changes', ja: '変化追跡中'})
      };
    }
    
    // 엉덩이 감소 (목표)
    if (latest.hips && first.hips) {
      changes.hips = {
        first: first.hips,
        current: latest.hips,
        change: (latest.hips - first.hips).toFixed(1),
        evaluation: latest.hips < first.hips ? '[OK] ' + this._t({ko: '감소 중 (좋음)', en: 'Decreasing (good)', ja: '減少中 (良好)'}) : '[WARN] ' + this._t({ko: '증가 또는 정체', en: 'Increasing or plateau', ja: '増加または停滞'})
      };
    }
    
    // WHR 변화 (높아지는 것이 목표)
    if (latest.waist && latest.hips && first.waist && first.hips) {
      const firstWHR = first.waist / first.hips;
      const latestWHR = latest.waist / latest.hips;
      
      changes.whr = {
        first: firstWHR.toFixed(3),
        current: latestWHR.toFixed(3),
        change: (latestWHR - firstWHR).toFixed(3),
        evaluation: latestWHR > firstWHR ? '[OK] ' + this._t({ko: '남성적으로 변화 중', en: 'Changing to masculine', ja: '男性的に変化中'}) : '[WARN] ' + this._t({ko: '개선 필요', en: 'Improvement needed', ja: '改善が必要'})
      };
    }
    
    // 팔뚝 증가 (근육)
    if (latest.arm && first.arm) {
      changes.arm = {
        first: first.arm,
        current: latest.arm,
        change: (latest.arm - first.arm).toFixed(1),
        evaluation: latest.arm > first.arm ? '[OK] ' + this._t({ko: '증가 중 (좋음)', en: 'Increasing (good)', ja: '増加中 (良好)'}) : '[WARN] ' + this._t({ko: '근력 운동 필요', en: 'Strength training needed', ja: '筋力トレーニングが必要'})
      };
    }
    
    return {
      changes,
      overallEvaluation: this._evaluateOverallReshaping(changes)
    };
  }
  
  /**
   * 전체 재형성 평가
   * @private
   */
  _evaluateOverallReshaping(changes) {
    let positiveChanges = 0;
    let totalChanges = 0;
    
    Object.values(changes).forEach(change => {
      if (change.evaluation && change.evaluation.startsWith('[OK]')) {
        positiveChanges++;
      }
      totalChanges++;
    });
    
    const percentage = totalChanges > 0 ? (positiveChanges / totalChanges) * 100 : 0;
    
    if (percentage >= 80) {
      return svgIcon('celebration', 'mi-inline mi-sm mi-success') + ' ' + this._t({ko: '훌륭합니다! 신체가 남성적으로 재형성되고 있습니다!', en: 'Excellent! Your body is being reshaped masculinely!', ja: '素晴らしい！体が男性的に再形成されています！'});
    } else if (percentage >= 60) {
      return svgIcon('auto_awesome', 'mi-inline mi-sm') + ' ' + this._t({ko: '좋은 진행 상황입니다. 계속 유지하세요!', en: 'Good progress. Keep it up!', ja: '良い進捗です。続けてください！'});
    } else if (percentage >= 40) {
      return svgIcon('trending_up', 'mi-inline mi-sm') + ' ' + this._t({ko: '진행 중입니다. 운동과 식단을 재검토하세요.', en: 'In progress. Review your exercise and diet.', ja: '進行中です。運動と食事を見直してください。'});
    } else {
      return svgIcon('warning', 'mi-inline mi-sm mi-warning') + ' ' + this._t({ko: '개선이 필요합니다. 근력 운동을 늘리세요.', en: 'Improvement needed. Increase strength training.', ja: '改善が必要です。筋力トレーニングを増やしてください。'});
    }
  }
  
  // ========================================
  // 6. 호르몬 효과 분석
  // ========================================
  
  /**
   * 테스토스테론 효과 분석
   */
  analyzeHormoneEffects() {
    if (this.measurements.length === 0) {
      return null;
    }
    
    const latest = this.measurements[this.measurements.length - 1];
    const effects = {
      physical: [],
      voice: [],
      reproductive: [],
      sideEffects: []
    };
    
    // 신체적 효과
    if (latest.testosteroneLevel && latest.testosteroneLevel >= 300) {
      effects.physical.push('[OK] ' + this._t({ko: '테스토스테론 수치 적정 - 남성화 진행 중', en: 'Testosterone level adequate - masculinization in progress', ja: 'テストステロン値適正 - 男性化進行中'}));
    } else if (latest.testosteroneLevel) {
      effects.physical.push('[WARN] ' + this._t({ko: '테스토스테론 수치 낮음 - 남성화 진행 느림', en: 'Testosterone level low - masculinization progressing slowly', ja: 'テストステロン値低い - 男性化の進行が遅い'}));
    }
    
    // 근육량 증가
    if (this.measurements.length >= 2) {
      const previous = this.measurements[this.measurements.length - 2];
      if (latest.muscleMass && previous.muscleMass && latest.muscleMass > previous.muscleMass) {
        effects.physical.push('[OK] ' + this._t({ko: '근육량 증가 중 - 테스토스테론 효과', en: 'Muscle mass increasing - testosterone effect', ja: '筋肉量増加中 - テストステロン効果'}));
      }
    }
    
    // 생리 중단 (예상되는 효과)
    effects.reproductive.push('[INFO] ' + this._t({ko: '생리 중단 - 정상적인 테스토스테론 효과', en: 'Menstruation stopped - normal testosterone effect', ja: '月経停止 - 正常なテストステロン効果'}));
    
    // 잠재적 부작용
    if (latest.testosteroneLevel && latest.testosteroneLevel > 800) {
      effects.sideEffects.push('[WARN] ' + this._t({ko: 'T 수치 높음 - 여드름, 공격성 증가 주의', en: 'T level high - watch for acne, increased aggression', ja: 'T値が高い - ニキビ、攻撃性増加に注意'}));
    }
    
    return {
      effects,
      hormoneLevels: {
        testosterone: latest.testosteroneLevel || 'N/A',
        estrogen: latest.estrogenLevel || 'N/A'
      },
      overallStatus: this._getHormoneEffectStatus(effects)
    };
  }
  
  /**
   * 호르몬 효과 전체 상태
   * @private
   */
  _getHormoneEffectStatus(effects) {
    const totalEffects = effects.physical.length + effects.voice.length + effects.reproductive.length;
    const positiveEffects = [...effects.physical, ...effects.voice, ...effects.reproductive]
      .filter(e => e.startsWith('[OK]')).length;
    
    if (positiveEffects / totalEffects >= 0.7) {
      return 'excellent';
    } else if (positiveEffects / totalEffects >= 0.5) {
      return 'good';
    } else {
      return 'needs_adjustment';
    }
  }
  
  // ========================================
  // 7. 목소리 변화 분석
  // ========================================
  
  /**
   * 목소리 변화 추적 (증상 데이터 기반)
   */
  analyzeVoiceChange() {
    // 증상 데이터에서 'voice_change' 찾기
    const voiceChanges = [];
    
    this.measurements.forEach((measurement, index) => {
      if (measurement.symptoms) {
        const voiceSymptom = measurement.symptoms.find(s => s.id === 'voice_change');
        if (voiceSymptom) {
          voiceChanges.push({
            week: index + 1,
            date: measurement.date,
            severity: voiceSymptom.severity,
            stage: this._getVoiceStage(index + 1, voiceSymptom.severity)
          });
        }
      }
    });
    
    return {
      history: voiceChanges,
      current: voiceChanges.length > 0 ? voiceChanges[voiceChanges.length - 1] : null,
      expectedTimeline: this._getVoiceTimeline()
    };
  }
  
  /**
   * 목소리 변화 단계
   * @private
   */
  _getVoiceStage(week, severity) {
    if (week < 4) {
      return this._t({ko: 'Stage 1: 아직 변화 없음', en: 'Stage 1: No change yet', ja: 'Stage 1: まだ変化なし'});
    } else if (week < 12) {
      return this._t({ko: 'Stage 2: 목이 간질거림, 갈라짐 시작', en: 'Stage 2: Throat tickling, voice cracking begins', ja: 'Stage 2: 喉のイガイガ、声割れ開始'});
    } else if (week < 24) {
      return this._t({ko: 'Stage 3: 눈에 띄는 변화, 불안정', en: 'Stage 3: Noticeable change, unstable', ja: 'Stage 3: 目立つ変化、不安定'});
    } else if (week < 52) {
      return this._t({ko: 'Stage 4: 상당한 변화, 안정화 진행', en: 'Stage 4: Significant change, stabilization in progress', ja: 'Stage 4: 大きな変化、安定化進行中'});
    } else {
      return this._t({ko: 'Stage 5: 변화 완료 (12-18개월)', en: 'Stage 5: Change complete (12-18 months)', ja: 'Stage 5: 変化完了 (12-18ヶ月)'});
    }
  }
  
  /**
   * 목소리 변화 예상 타임라인
   * @private
   */
  _getVoiceTimeline() {
    return [
      { period: this._t({ko: '1-3개월', en: '1-3 months', ja: '1-3ヶ月'}), change: this._t({ko: '목이 간질거림, 약간의 변화', en: 'Throat tickling, slight changes', ja: '喉のイガイガ、わずかな変化'}) },
      { period: this._t({ko: '3-6개월', en: '3-6 months', ja: '3-6ヶ月'}), change: this._t({ko: '목소리 갈라짐, 눈에 띄는 변화', en: 'Voice cracking, noticeable changes', ja: '声割れ、目立つ変化'}) },
      { period: this._t({ko: '6-12개월', en: '6-12 months', ja: '6-12ヶ月'}), change: this._t({ko: '상당한 낮아짐, 불안정', en: 'Significant deepening, unstable', ja: '大幅な低音化、不安定'}) },
      { period: this._t({ko: '12-18개월', en: '12-18 months', ja: '12-18ヶ月'}), change: this._t({ko: '변화 완료, 안정화', en: 'Change complete, stabilization', ja: '変化完了、安定化'}) }
    ];
  }
  
  // ========================================
  // 8. FTM 타임라인 생성
  // ========================================
  
  /**
   * FTM 전환 타임라인 (예상 변화)
   */
  generateFTMTimeline() {
    const currentWeek = this.measurements.length;
    
    const timeline = [
      {
        period: this._t({ko: '1-3개월', en: '1-3 months', ja: '1-3ヶ月'}),
        week: '1-12',
        changes: [
          this._t({ko: '생리 중단 (1-6개월)', en: 'Menstruation stops (1-6 months)', ja: '月経停止 (1-6ヶ月)'}),
          this._t({ko: '성욕 증가', en: 'Increased libido', ja: '性欲増加'}),
          this._t({ko: '클리토리스 비대 시작', en: 'Clitoral enlargement begins', ja: 'クリトリス肥大開始'}),
          this._t({ko: '피부 지성화, 여드름 시작', en: 'Oilier skin, acne begins', ja: '皮膚の脂性化、ニキビ開始'}),
          this._t({ko: '체모 증가 시작', en: 'Body hair growth begins', ja: '体毛増加開始'}),
          this._t({ko: '목소리 변화 시작 (갈라짐)', en: 'Voice changes begin (cracking)', ja: '声の変化開始 (声割れ)'})
        ],
        status: currentWeek >= 1 ? 'completed' : 'upcoming'
      },
      {
        period: this._t({ko: '3-6개월', en: '3-6 months', ja: '3-6ヶ月'}),
        week: '13-24',
        changes: [
          this._t({ko: '목소리 눈에 띄게 낮아짐', en: 'Voice noticeably deeper', ja: '声が目立って低くなる'}),
          this._t({ko: '여드름 증가 (피크)', en: 'Acne increase (peak)', ja: 'ニキビ増加 (ピーク)'}),
          this._t({ko: '체모 증가 지속', en: 'Body hair continues to increase', ja: '体毛の増加が継続'}),
          this._t({ko: '근육량 증가 시작', en: 'Muscle mass increase begins', ja: '筋肉量の増加開始'}),
          this._t({ko: '얼굴형 변화 시작', en: 'Facial shape changes begin', ja: '顔の形の変化開始'}),
          this._t({ko: '체지방 재분배 시작', en: 'Body fat redistribution begins', ja: '体脂肪の再分配開始'})
        ],
        status: currentWeek >= 13 ? (currentWeek >= 24 ? 'completed' : 'in_progress') : 'upcoming'
      },
      {
        period: this._t({ko: '6-12개월', en: '6-12 months', ja: '6-12ヶ月'}),
        week: '25-52',
        changes: [
          this._t({ko: '목소리 변화 계속 (안정화 시작)', en: 'Voice changes continue (stabilization begins)', ja: '声の変化が継続 (安定化開始)'}),
          this._t({ko: '여드름 점차 감소', en: 'Acne gradually decreasing', ja: 'ニキビ徐々に減少'}),
          this._t({ko: '근육량 상당히 증가', en: 'Muscle mass significantly increased', ja: '筋肉量が大幅に増加'}),
          this._t({ko: '얼굴 남성화 진행', en: 'Facial masculinization in progress', ja: '顔の男性化進行'}),
          this._t({ko: '체형 남성적으로 변화', en: 'Body shape changing to masculine', ja: '体型が男性的に変化'}),
          this._t({ko: '수염 시작 (개인차 큼)', en: 'Facial hair begins (large individual variation)', ja: 'ヒゲ開始 (個人差が大きい)'})
        ],
        status: currentWeek >= 25 ? (currentWeek >= 52 ? 'completed' : 'in_progress') : 'upcoming'
      },
      {
        period: this._t({ko: '12-24개월', en: '12-24 months', ja: '12-24ヶ月'}),
        week: '53-104',
        changes: [
          this._t({ko: '목소리 변화 완료 (12-18개월)', en: 'Voice change complete (12-18 months)', ja: '声の変化完了 (12-18ヶ月)'}),
          this._t({ko: '여드름 대부분 안정화', en: 'Acne mostly stabilized', ja: 'ニキビほぼ安定化'}),
          this._t({ko: '수염 지속 성장', en: 'Facial hair continues to grow', ja: 'ヒゲの継続的成長'}),
          this._t({ko: '체모 계속 증가', en: 'Body hair continues to increase', ja: '体毛の継続的増加'}),
          this._t({ko: '체형 완전히 남성화', en: 'Body shape fully masculinized', ja: '体型が完全に男性化'}),
          this._t({ko: '얼굴 변화 완료', en: 'Facial changes complete', ja: '顔の変化完了'})
        ],
        status: currentWeek >= 53 ? (currentWeek >= 104 ? 'completed' : 'in_progress') : 'upcoming'
      },
      {
        period: this._t({ko: '24개월+', en: '24+ months', ja: '24ヶ月+'}),
        week: '105+',
        changes: [
          this._t({ko: '변화 대부분 완료', en: 'Most changes complete', ja: 'ほとんどの変化が完了'}),
          this._t({ko: '수염 성장 계속 (5년까지)', en: 'Facial hair continues to grow (up to 5 years)', ja: 'ヒゲの成長が継続 (最大5年)'}),
          this._t({ko: '근육 발달 계속 가능', en: 'Muscle development can continue', ja: '筋肉の発達が継続可能'}),
          this._t({ko: '유지 및 미세 조정 단계', en: 'Maintenance and fine-tuning stage', ja: '維持と微調整の段階'})
        ],
        status: currentWeek >= 105 ? 'in_progress' : 'upcoming'
      }
    ];
    
    return {
      currentWeek,
      currentPeriod: this._getCurrentPeriod(currentWeek),
      timeline,
      note: this._t({ko: '개인차가 크며, 이는 평균적인 예상 타임라인입니다. 여드름은 피부과 치료로 관리 가능합니다.', en: 'Individual variation is significant; this is an average expected timeline. Acne can be managed with dermatological treatment.', ja: '個人差が大きく、これは平均的な予想タイムラインです。ニキビは皮膚科治療で管理可能です。'})
    };
  }
  
  /**
   * 현재 기간 판단
   * @private
   */
  _getCurrentPeriod(week) {
    if (week < 13) return this._t({ko: '초기 (1-3개월)', en: 'Early (1-3 months)', ja: '初期 (1-3ヶ月)'});
    if (week < 25) return this._t({ko: '초중기 (3-6개월)', en: 'Early-mid (3-6 months)', ja: '初中期 (3-6ヶ月)'});
    if (week < 53) return this._t({ko: '중기 (6-12개월)', en: 'Mid (6-12 months)', ja: '中期 (6-12ヶ月)'});
    if (week < 105) return this._t({ko: '중후기 (12-24개월)', en: 'Mid-late (12-24 months)', ja: '中後期 (12-24ヶ月)'});
    return this._t({ko: '후기 (24개월+)', en: 'Late (24+ months)', ja: '後期 (24ヶ月+)'});
  }
  
  // ========================================
  // 9. FTM 추천사항 생성
  // ========================================
  
  /**
   * FTM 특화 추천사항
   */
  generateFTMRecommendations() {
    const latest = this.measurements[this.measurements.length - 1];
    const recommendations = [];
    
    // 근육 발달 관련
    if (latest.muscleMass && latest.muscleMass < 35) {
      recommendations.push({
        category: 'muscle',
        priority: 'high',
        title: this._t({ko: '근육량 증가', en: 'Increase muscle mass', ja: '筋肉量増加'}),
        advice: [
          this._t({ko: '주 4-5회 근력 운동 (복합 운동 중심)', en: 'Strength training 4-5 times/week (compound exercises)', ja: '週4-5回の筋力トレーニング (複合運動中心)'}),
          this._t({ko: '단백질 섭취 증가 (체중 1kg당 2g)', en: 'Increase protein intake (2g per kg body weight)', ja: 'タンパク質摂取増加 (体重1kgあたり2g)'}),
          this._t({ko: '충분한 칼로리 (근육 성장 위해)', en: 'Sufficient calories (for muscle growth)', ja: '十分なカロリー (筋肉成長のため)'}),
          this._t({ko: '크레아틴 보충제 고려', en: 'Consider creatine supplement', ja: 'クレアチンサプリメントを検討'}),
          this._t({ko: '충분한 휴식과 수면', en: 'Adequate rest and sleep', ja: '十分な休息と睡眠'})
        ]
      });
    }
    
    // 체형 관련
    if (latest.shoulder && latest.waist) {
      const swr = latest.shoulder / latest.waist;
      if (swr < 1.40) {
        recommendations.push({
          category: 'body_shape',
          priority: 'high',
          title: this._t({ko: 'V자 체형 만들기', en: 'Build V-shaped body', ja: 'V字体型を作る'}),
          advice: [
            this._t({ko: '숄더 프레스, 사이드 레터럴 레이즈', en: 'Shoulder press, side lateral raises', ja: 'ショルダープレス、サイドラテラルレイズ'}),
            this._t({ko: '풀업/턱걸이', en: 'Pull-ups/chin-ups', ja: 'プルアップ/チンアップ'}),
            this._t({ko: '로우 (등 운동)', en: 'Rows (back exercises)', ja: 'ロウ (背中の運動)'}),
            this._t({ko: '벤치프레스', en: 'Bench press', ja: 'ベンチプレス'}),
            this._t({ko: '허리 줄이기 (유산소 + 코어)', en: 'Waist reduction (cardio + core)', ja: 'ウエスト減少 (有酸素 + コア)'})
          ]
        });
      }
    }
    
    // 호르몬 관련
    if (latest.testosteroneLevel && latest.testosteroneLevel < 300) {
      recommendations.push({
        category: 'hormone',
        priority: 'high',
        title: this._t({ko: '테스토스테론 증량 필요', en: 'Testosterone dose increase needed', ja: 'テストステロン増量が必要'}),
        advice: [
          this._t({ko: '현재 T 수치가 낮습니다', en: 'Current T level is low', ja: '現在のT値が低いです'}),
          this._t({ko: '의사와 상담하여 용량 조정', en: 'Consult your doctor to adjust dosage', ja: '医師と相談して用量調整'}),
          this._t({ko: '투여 간격 확인 (주사 시)', en: 'Check administration interval (for injections)', ja: '投与間隔の確認 (注射時)'}),
          this._t({ko: '정기 혈액 검사', en: 'Regular blood tests', ja: '定期的な血液検査'})
        ]
      });
    }
    
    if (latest.testosteroneLevel && latest.testosteroneLevel > 800) {
      recommendations.push({
        category: 'hormone',
        priority: 'high',
        title: this._t({ko: '테스토스테론 조정 필요', en: 'Testosterone adjustment needed', ja: 'テストステロン調整が必要'}),
        advice: [
          this._t({ko: 'T 수치가 높습니다 (부작용 주의)', en: 'T level is high (watch for side effects)', ja: 'T値が高いです (副作用に注意)'}),
          this._t({ko: '여드름, 공격성 증가 가능', en: 'Acne, increased aggression possible', ja: 'ニキビ、攻撃性増加の可能性'}),
          this._t({ko: '적혈구 증가증 위험', en: 'Polycythemia risk', ja: '赤血球増加症のリスク'}),
          this._t({ko: '의사와 상담하여 감량 고려', en: 'Consult your doctor to consider dose reduction', ja: '医師と相談して減量を検討'})
        ]
      });
    }
    
    // 여드름 관리
    recommendations.push({
      category: 'skincare',
      priority: 'medium',
      title: this._t({ko: '여드름 관리 (FTM 흔한 부작용)', en: 'Acne management (common FTM side effect)', ja: 'ニキビ管理 (FTMの一般的な副作用)'}),
      advice: [
        this._t({ko: '하루 2회 클렌징', en: 'Cleanse twice daily', ja: '1日2回のクレンジング'}),
        this._t({ko: '살리실산 또는 벤조일 퍼옥사이드', en: 'Salicylic acid or benzoyl peroxide', ja: 'サリチル酸または過酸化ベンゾイル'}),
        this._t({ko: '유제품 줄이기', en: 'Reduce dairy products', ja: '乳製品を減らす'}),
        this._t({ko: '충분한 물', en: 'Drink plenty of water', ja: '十分な水分摂取'}),
        this._t({ko: '심한 경우 피부과 상담 (isotretinoin)', en: 'Consult dermatologist for severe cases (isotretinoin)', ja: '重症の場合は皮膚科相談 (イソトレチノイン)'})
      ]
    });
    
    // 가슴 관리 (수술 전)
    if (latest.cupSize && latest.chest && (latest.cupSize - latest.chest) > 3) {
      recommendations.push({
        category: 'chest',
        priority: 'medium',
        title: this._t({ko: '가슴 관리', en: 'Chest management', ja: '胸部管理'}),
        advice: [
          this._t({ko: '안전한 바인더 사용 (8시간 이내)', en: 'Safe binder use (within 8 hours)', ja: '安全なバインダー使用 (8時間以内)'}),
          this._t({ko: '압박 브래지어 고려', en: 'Consider compression bra', ja: 'コンプレッションブラを検討'}),
          this._t({ko: '상부 수술(Top Surgery) 상담', en: 'Top surgery consultation', ja: 'トップサージェリー相談'}),
          this._t({ko: '바인더 장시간 착용 피하기 (건강 위험)', en: 'Avoid prolonged binder use (health risk)', ja: 'バインダーの長時間着用を避ける (健康リスク)'})
        ]
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
  
  // ========================================
  // 10. 유틸리티
  // ========================================
  
  _getMasculinizationCategory(score) {
    if (score >= 85) return 'highly_masculinized';
    if (score >= 70) return 'well_masculinized';
    if (score >= 50) return 'moderately_masculinized';
    if (score >= 30) return 'early_masculinization';
    return 'just_started';
  }
  
  _getMasculinizationMessage(score) {
    if (score >= 85) {
      return svgIcon('celebration', 'mi-inline mi-sm mi-success') + ' ' + this._t({ko: '훌륭합니다! 남성화가 매우 잘 진행되고 있습니다!', en: 'Excellent! Masculinization is progressing very well!', ja: '素晴らしい！男性化が非常に順調に進んでいます！'});
    } else if (score >= 70) {
      return svgIcon('auto_awesome', 'mi-inline mi-sm') + ' ' + this._t({ko: '남성화가 순조롭게 진행 중입니다!', en: 'Masculinization is progressing smoothly!', ja: '男性化が順調に進行中です！'});
    } else if (score >= 50) {
      return svgIcon('trending_up', 'mi-inline mi-sm') + ' ' + this._t({ko: '중간 정도 진행되었습니다. 계속 노력하세요!', en: 'Moderate progress. Keep going!', ja: '中程度の進行です。引き続き頑張ってください！'});
    } else if (score >= 30) {
      return svgIcon('spa', 'mi-inline mi-sm') + ' ' + this._t({ko: '초기 단계입니다. 시간과 인내가 필요합니다.', en: 'Early stage. Time and patience are needed.', ja: '初期段階です。時間と忍耐が必要です。'});
    } else {
      return this._t({ko: '시작 단계입니다. 꾸준한 관리가 중요합니다.', en: 'Starting stage. Consistent management is important.', ja: '開始段階です。継続的な管理が重要です。'});
    }
  }
}

// ========================================
// 11. Export
// ========================================

export default FTMAnalyzer;
