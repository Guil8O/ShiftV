import { svgIcon } from '../../ui/icon-paths.js';
/**
 * MTF Analyzer
 * 
 * 여성화 전환에 특화된 상세 분석
 * - 에스트로겐/항안드로겐 효과 분석
 * - 여성적 신체 변화 추적
 * - MTF 특유 증상 및 부작용 관리
 * - 가슴 발달 추적
 */

// ========================================
// 1. MTF 분석기 클래스
// ========================================

export class MTFAnalyzer {
  constructor(measurements, biologicalSex = 'male', language = 'ko') {
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
  // 2. 전체 MTF 분석
  // ========================================
  
  /**
   * MTF 전환 종합 분석
   */
  analyzeAll() {
    if (this.measurements.length === 0) {
      return {
        message: this._t({ko: 'MTF 분석을 위한 데이터가 없습니다.', en: 'No data available for MTF analysis.', ja: 'MTF分析のためのデータがありません。'}),
        feminizationProgress: null,
        breastDevelopment: null,
        bodyReshaping: null,
        hormoneEffects: null,
        timeline: null
      };
    }
    
    return {
      feminizationProgress: this.analyzeFeminizationProgress(),
      breastDevelopment: this.analyzeBreastDevelopment(),
      bodyReshaping: this.analyzeBodyReshaping(),
      hormoneEffects: this.analyzeHormoneEffects(),
      timeline: this.generateMTFTimeline(),
      recommendations: this.generateMTFRecommendations()
    };
  }
  
  // ========================================
  // 3. 여성화 진행도 분석
  // ========================================
  
  /**
   * 전체 여성화 진행도 점수 (0-100)
   */
  analyzeFeminizationProgress() {
    const latest = this.measurements[this.measurements.length - 1];
    let score = 0;
    let maxScore = 0;
    const breakdown = {};
    
    // 1. 신체 비율 변화 (40점)
    const ratioScore = this._evaluateBodyRatios(latest);
    score += ratioScore.score;
    maxScore += 40;
    breakdown.bodyRatios = ratioScore;
    
    // 2. 가슴 발달 (20점)
    const breastScore = this._evaluateBreastDevelopment(latest);
    score += breastScore.score;
    maxScore += 20;
    breakdown.breastDevelopment = breastScore;
    
    // 3. 체지방 재분배 (20점)
    const fatScore = this._evaluateFatRedistribution(latest);
    score += fatScore.score;
    maxScore += 20;
    breakdown.fatRedistribution = fatScore;
    
    // 4. 호르몬 수치 (20점)
    const hormoneScore = this._evaluateHormones(latest);
    score += hormoneScore.score;
    maxScore += 20;
    breakdown.hormones = hormoneScore;
    
    const finalScore = (score / maxScore) * 100;
    
    return {
      overallScore: finalScore.toFixed(1),
      category: this._getFeminizationCategory(finalScore),
      breakdown,
      message: this._getFeminizationMessage(finalScore)
    };
  }
  
  /**
   * 신체 비율 평가 (40점)
   * @private
   */
  _evaluateBodyRatios(measurement) {
    let score = 0;
    const maxScore = 40;
    const details = {};
    
    // WHR (Waist-Hip Ratio) - 15점
    if (measurement.waist && measurement.hips) {
      const whr = measurement.waist / measurement.hips;
      details.whr = { value: whr.toFixed(3) };
      
      if (whr < 0.75) {
        score += 15;
        details.whr.evaluation = this._t({ko: '매우 여성적 (< 0.75)', en: 'Very feminine (< 0.75)', ja: '非常に女性的 (< 0.75)'});
      } else if (whr < 0.80) {
        score += 12;
        details.whr.evaluation = this._t({ko: '여성적 (< 0.80)', en: 'Feminine (< 0.80)', ja: '女性的 (< 0.80)'});
      } else if (whr < 0.85) {
        score += 8;
        details.whr.evaluation = this._t({ko: '진행 중 (< 0.85)', en: 'In progress (< 0.85)', ja: '進行中 (< 0.85)'});
      } else {
        score += 4;
        details.whr.evaluation = this._t({ko: '초기 단계 (>= 0.85)', en: 'Early stage (>= 0.85)', ja: '初期段階 (>= 0.85)'});
      }
    }
    
    // Shoulder-Waist Ratio - 15점
    if (measurement.shoulder && measurement.waist) {
      const swr = measurement.shoulder / measurement.waist;
      details.shoulderWaist = { value: swr.toFixed(2) };
      
      if (swr < 1.25) {
        score += 15;
        details.shoulderWaist.evaluation = this._t({ko: '매우 부드러운 비율 (< 1.25)', en: 'Very soft ratio (< 1.25)', ja: '非常に柔らかい比率 (< 1.25)'});
      } else if (swr < 1.35) {
        score += 12;
        details.shoulderWaist.evaluation = this._t({ko: '여성적 비율 (< 1.35)', en: 'Feminine ratio (< 1.35)', ja: '女性的な比率 (< 1.35)'});
      } else if (swr < 1.45) {
        score += 8;
        details.shoulderWaist.evaluation = this._t({ko: '진행 중 (< 1.45)', en: 'In progress (< 1.45)', ja: '進行中 (< 1.45)'});
      } else {
        score += 4;
        details.shoulderWaist.evaluation = this._t({ko: '아직 넓은 어깨 (>= 1.45)', en: 'Still broad shoulders (>= 1.45)', ja: 'まだ広い肩 (>= 1.45)'});
      }
    }
    
    // Hip-Waist Ratio (높을수록 좋음) - 10점
    if (measurement.hips && measurement.waist) {
      const hwr = measurement.hips / measurement.waist;
      details.hipWaist = { value: hwr.toFixed(2) };
      
      if (hwr > 1.3) {
        score += 10;
        details.hipWaist.evaluation = this._t({ko: '뚜렷한 곡선 (> 1.3)', en: 'Pronounced curves (> 1.3)', ja: '顕著なカーブ (> 1.3)'});
      } else if (hwr > 1.2) {
        score += 8;
        details.hipWaist.evaluation = this._t({ko: '여성적 곡선 (> 1.2)', en: 'Feminine curves (> 1.2)', ja: '女性的なカーブ (> 1.2)'});
      } else if (hwr > 1.1) {
        score += 5;
        details.hipWaist.evaluation = this._t({ko: '약간의 곡선 (> 1.1)', en: 'Slight curves (> 1.1)', ja: 'わずかなカーブ (> 1.1)'});
      } else {
        score += 2;
        details.hipWaist.evaluation = this._t({ko: '직선형 (<= 1.1)', en: 'Straight figure (<= 1.1)', ja: '直線型 (<= 1.1)'});
      }
    }
    
    return { score, maxScore, details };
  }
  
  /**
   * 가슴 발달 평가 (20점)
   * @private
   */
  _evaluateBreastDevelopment(measurement) {
    let score = 0;
    const maxScore = 20;
    const details = {};
    
    if (measurement.cupSize && measurement.chest) {
      const diff = measurement.cupSize - measurement.chest;
      details.difference = diff.toFixed(1);
      
      // 컵 사이즈 추정
      let cupSize = '';
      if (diff < 5) {
        cupSize = 'AA';
        score += 5;
      } else if (diff < 7.5) {
        cupSize = 'A';
        score += 10;
      } else if (diff < 10) {
        cupSize = 'B';
        score += 15;
      } else if (diff < 12.5) {
        cupSize = 'C';
        score += 18;
      } else if (diff < 15) {
        cupSize = 'D';
        score += 20;
      } else {
        cupSize = 'DD+';
        score += 20;
      }
      
      details.estimatedCup = cupSize;
      details.evaluation = this._getBreastDevelopmentStage(cupSize);
    } else {
      details.message = this._t({ko: '가슴 둘레 측정이 필요합니다.', en: 'Bust measurement is needed.', ja: 'バスト周囲の測定が必要です。'});
    }
    
    return { score, maxScore, details };
  }
  
  /**
   * 체지방 재분배 평가 (20점)
   * @private
   */
  _evaluateFatRedistribution(measurement) {
    let score = 0;
    const maxScore = 20;
    const details = {};
    
    if (measurement.bodyFatPercentage) {
      const bfp = parseFloat(measurement.bodyFatPercentage);
      details.bodyFatPercentage = bfp.toFixed(1);
      
      // 여성 범위: 20-28%
      if (bfp >= 20 && bfp <= 28) {
        score += 20;
        details.evaluation = this._t({ko: '이상적인 여성 체지방률 (20-28%)', en: 'Ideal female body fat percentage (20-28%)', ja: '理想的な女性体脂肪率 (20-28%)'});
      } else if (bfp >= 18 && bfp < 20) {
        score += 12;
        details.evaluation = this._t({ko: '약간 낮음 (18-20%) - 여성 곡선 형성에 불리', en: 'Slightly low (18-20%) - unfavorable for feminine curves', ja: 'やや低い (18-20%) - 女性的なカーブ形成に不利'});
      } else if (bfp > 28 && bfp <= 32) {
        score += 15;
        details.evaluation = this._t({ko: '약간 높음 (28-32%) - 여성적이지만 건강 주의', en: 'Slightly high (28-32%) - feminine but watch health', ja: 'やや高い (28-32%) - 女性的だが健康に注意'});
      } else if (bfp < 18) {
        score += 5;
        details.evaluation = this._t({ko: '너무 낮음 (< 18%) - 여성 곡선 형성 어려움', en: 'Too low (< 18%) - difficult to form feminine curves', ja: '低すぎる (< 18%) - 女性的なカーブ形成が困難'});
      } else {
        score += 8;
        details.evaluation = this._t({ko: '높음 (> 32%) - 건강을 위해 감소 필요', en: 'High (> 32%) - reduction needed for health', ja: '高い (> 32%) - 健康のために減少が必要'});
      }
    }
    
    // 엉덩이/허벅지 발달 확인
    if (measurement.hips && measurement.thigh) {
      details.lowerBodyDevelopment = this._t({ko: '[OK] 하체 발달 측정 중', en: '[OK] Tracking lower body development', ja: '[OK] 下半身の発達を測定中'});
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
    
    // 에스트로겐 (12점)
    if (measurement.estrogenLevel) {
      const eLevel = parseFloat(measurement.estrogenLevel);
      details.estrogen = { level: eLevel };
      
      if (eLevel >= 100 && eLevel <= 200) {
        score += 12;
        details.estrogen.status = this._t({ko: '이상적 (100-200 pg/ml)', en: 'Ideal (100-200 pg/ml)', ja: '理想的 (100-200 pg/ml)'});
      } else if (eLevel >= 80 && eLevel < 100) {
        score += 8;
        details.estrogen.status = this._t({ko: '약간 낮음 (80-100 pg/ml)', en: 'Slightly low (80-100 pg/ml)', ja: 'やや低い (80-100 pg/ml)'});
      } else if (eLevel > 200 && eLevel <= 250) {
        score += 10;
        details.estrogen.status = this._t({ko: '약간 높음 (200-250 pg/ml) - 혈전 주의', en: 'Slightly high (200-250 pg/ml) - watch for blood clots', ja: 'やや高い (200-250 pg/ml) - 血栓に注意'});
      } else if (eLevel < 80) {
        score += 4;
        details.estrogen.status = this._t({ko: '낮음 (< 80 pg/ml) - 증량 필요', en: 'Low (< 80 pg/ml) - dose increase needed', ja: '低い (< 80 pg/ml) - 増量が必要'});
      } else {
        score += 6;
        details.estrogen.status = this._t({ko: '높음 (> 250 pg/ml) - 위험, 감량 필요', en: 'High (> 250 pg/ml) - dangerous, dose reduction needed', ja: '高い (> 250 pg/ml) - 危険、減量が必要'});
      }
    }
    
    // 테스토스테론 (8점)
    if (measurement.testosteroneLevel) {
      const tLevel = parseFloat(measurement.testosteroneLevel);
      details.testosterone = { level: tLevel };
      
      if (tLevel < 50) {
        score += 8;
        details.testosterone.status = this._t({ko: '이상적 (< 50 ng/ml) - 잘 억제됨', en: 'Ideal (< 50 ng/ml) - well suppressed', ja: '理想的 (< 50 ng/ml) - よく抑制されている'});
      } else if (tLevel < 100) {
        score += 5;
        details.testosterone.status = this._t({ko: '보통 (50-100 ng/ml) - 항안드로겐 조정 고려', en: 'Moderate (50-100 ng/ml) - consider anti-androgen adjustment', ja: '普通 (50-100 ng/ml) - 抗アンドロゲン調整を検討'});
      } else if (tLevel < 200) {
        score += 2;
        details.testosterone.status = this._t({ko: '높음 (100-200 ng/ml) - 억제 부족', en: 'High (100-200 ng/ml) - insufficient suppression', ja: '高い (100-200 ng/ml) - 抑制不足'});
      } else {
        score += 0;
        details.testosterone.status = this._t({ko: '매우 높음 (> 200 ng/ml) - 즉시 조정 필요', en: 'Very high (> 200 ng/ml) - immediate adjustment needed', ja: '非常に高い (> 200 ng/ml) - 即時調整が必要'});
      }
    }
    
    return { score, maxScore, details };
  }
  
  // ========================================
  // 4. 가슴 발달 추적
  // ========================================
  
  /**
   * 가슴 발달 상세 분석
   */
  analyzeBreastDevelopment() {
    if (this.measurements.length === 0) {
      return null;
    }
    
    const development = [];
    
    this.measurements.forEach((measurement, index) => {
      if (measurement.cupSize && measurement.chest) {
        const diff = measurement.cupSize - measurement.chest;
        const cupSize = this._estimateCupSize(diff);
        const tannerStage = this._estimateTannerStage(diff, index);
        
        development.push({
          week: index + 1,
          date: measurement.date,
          difference: diff.toFixed(1),
          estimatedCup: cupSize,
          tannerStage,
          chest: measurement.chest,
          cupSize: measurement.cupSize
        });
      }
    });
    
    return {
      history: development,
      current: development.length > 0 ? development[development.length - 1] : null,
      progress: this._analyzeBreastProgress(development)
    };
  }
  
  /**
   * 컵 사이즈 추정
   * @private
   */
  _estimateCupSize(diff) {
    if (diff < 5) return 'AA';
    if (diff < 7.5) return 'A';
    if (diff < 10) return 'B';
    if (diff < 12.5) return 'C';
    if (diff < 15) return 'D';
    return 'DD+';
  }
  
  /**
   * Tanner Stage 추정 (가슴 발달 단계)
   * @private
   */
  _estimateTannerStage(diff, weekIndex) {
    if (diff < 1) {
      return { stage: 1, description: this._t({ko: 'Stage 1: 발달 시작 전', en: 'Stage 1: Pre-development', ja: 'Stage 1: 発達開始前'}) };
    } else if (diff < 3) {
      return { stage: 2, description: this._t({ko: 'Stage 2: 유방 봉오리 (Breast Buds)', en: 'Stage 2: Breast buds', ja: 'Stage 2: 乳房芽（ブレストバッド）'}) };
    } else if (diff < 6) {
      return { stage: 3, description: this._t({ko: 'Stage 3: 초기 발달', en: 'Stage 3: Early development', ja: 'Stage 3: 初期発達'}) };
    } else if (diff < 10) {
      return { stage: 4, description: this._t({ko: 'Stage 4: 중기 발달', en: 'Stage 4: Mid development', ja: 'Stage 4: 中期発達'}) };
    } else {
      return { stage: 5, description: this._t({ko: 'Stage 5: 성숙한 발달', en: 'Stage 5: Mature development', ja: 'Stage 5: 成熟した発達'}) };
    }
  }
  
  /**
   * 가슴 발달 진행 분석
   * @private
   */
  _analyzeBreastProgress(development) {
    if (development.length < 2) {
      return { message: this._t({ko: '진행도를 확인하기 위해 더 많은 데이터가 필요합니다.', en: 'More data is needed to track progress.', ja: '進捗を確認するにはより多くのデータが必要です。'}) };
    }
    
    const first = development[0];
    const latest = development[development.length - 1];
    
    const totalGrowth = parseFloat(latest.difference) - parseFloat(first.difference);
    const weeksElapsed = latest.week - first.week;
    const avgWeeklyGrowth = totalGrowth / weeksElapsed;
    
    let evaluation = '';
    if (avgWeeklyGrowth > 0.3) {
      evaluation = this._t({ko: '빠른 발달 (평균 이상)', en: 'Rapid development (above average)', ja: '急速な発達（平均以上）'});
    } else if (avgWeeklyGrowth > 0.15) {
      evaluation = this._t({ko: '정상적인 발달', en: 'Normal development', ja: '正常な発達'});
    } else if (avgWeeklyGrowth > 0) {
      evaluation = this._t({ko: '느린 발달 (프로게스테론 고려)', en: 'Slow development (consider progesterone)', ja: '遅い発達（プロゲステロンを検討）'});
    } else {
      evaluation = this._t({ko: '정체 또는 감소 (전문가 상담 필요)', en: 'Stagnation or decrease (consult specialist)', ja: '停滞または減少（専門家に相談が必要）'});
    }
    
    return {
      totalGrowth: totalGrowth.toFixed(1),
      weeksElapsed,
      avgWeeklyGrowth: avgWeeklyGrowth.toFixed(2),
      evaluation,
      cupSizeChange: `${first.estimatedCup} → ${latest.estimatedCup}`
    };
  }
  
  /**
   * 가슴 발달 단계 설명
   * @private
   */
  _getBreastDevelopmentStage(cupSize) {
    const stages = {
      'AA': this._t({ko: 'Stage 2-3: 초기 발달 (유방 봉오리)', en: 'Stage 2-3: Early development (breast buds)', ja: 'Stage 2-3: 初期発達（乳房芽）'}),
      'A': this._t({ko: 'Stage 3: 눈에 보이는 발달', en: 'Stage 3: Visible development', ja: 'Stage 3: 目に見える発達'}),
      'B': this._t({ko: 'Stage 4: 중간 발달', en: 'Stage 4: Intermediate development', ja: 'Stage 4: 中間発達'}),
      'C': this._t({ko: 'Stage 4-5: 상당한 발달', en: 'Stage 4-5: Significant development', ja: 'Stage 4-5: 相当な発達'}),
      'D': this._t({ko: 'Stage 5: 완전한 발달', en: 'Stage 5: Full development', ja: 'Stage 5: 完全な発達'}),
      'DD+': this._t({ko: 'Stage 5: 큰 발달', en: 'Stage 5: Large development', ja: 'Stage 5: 大きな発達'})
    };
    return stages[cupSize] || this._t({ko: '측정 필요', en: 'Measurement needed', ja: '測定が必要'});
  }
  
  // ========================================
  // 5. 신체 재형성 분석
  // ========================================
  
  /**
   * 신체 곡선 변화 분석
   */
  analyzeBodyReshaping() {
    if (this.measurements.length === 0) {
      return null;
    }
    
    const latest = this.measurements[this.measurements.length - 1];
    const first = this.measurements[0];
    
    const changes = {};
    
    // 허리 감소
    if (latest.waist && first.waist) {
      changes.waist = {
        first: first.waist,
        current: latest.waist,
        change: (latest.waist - first.waist).toFixed(1),
        evaluation: latest.waist < first.waist ? this._t({ko: '[OK] 감소 중 (좋음)', en: '[OK] Decreasing (good)', ja: '[OK] 減少中（良好）'}) : this._t({ko: '[WARN] 증가 중', en: '[WARN] Increasing', ja: '[WARN] 増加中'})
      };
    }
    
    // 엉덩이 증가
    if (latest.hips && first.hips) {
      changes.hips = {
        first: first.hips,
        current: latest.hips,
        change: (latest.hips - first.hips).toFixed(1),
        evaluation: latest.hips > first.hips ? this._t({ko: '[OK] 증가 중 (좋음)', en: '[OK] Increasing (good)', ja: '[OK] 増加中（良好）'}) : this._t({ko: '[WARN] 감소 중', en: '[WARN] Decreasing', ja: '[WARN] 減少中'})
      };
    }
    
    // 어깨 (변화 최소화가 목표)
    if (latest.shoulder && first.shoulder) {
      changes.shoulder = {
        first: first.shoulder,
        current: latest.shoulder,
        change: (latest.shoulder - first.shoulder).toFixed(1),
        evaluation: Math.abs(latest.shoulder - first.shoulder) < 1 
            ? this._t({ko: '[OK] 유지 중 (좋음)', en: '[OK] Maintaining (good)', ja: '[OK] 維持中（良好）'}) 
            : latest.shoulder > first.shoulder 
              ? this._t({ko: '[WARN] 증가 중 (상체 운동 주의)', en: '[WARN] Increasing (watch upper body exercise)', ja: '[WARN] 増加中（上半身の運動に注意）'})
              : this._t({ko: '[OK] 약간 감소 (좋음)', en: '[OK] Slightly decreased (good)', ja: '[OK] わずかに減少（良好）'})
      };
    }
    
    // 허벅지 증가
    if (latest.thigh && first.thigh) {
      changes.thigh = {
        first: first.thigh,
        current: latest.thigh,
        change: (latest.thigh - first.thigh).toFixed(1),
        evaluation: latest.thigh > first.thigh ? this._t({ko: '[OK] 증가 중 (좋음)', en: '[OK] Increasing (good)', ja: '[OK] 増加中（良好）'}) : this._t({ko: '[WARN] 감소 중', en: '[WARN] Decreasing', ja: '[WARN] 減少中'})
      };
    }
    
    // WHR 변화
    if (latest.waist && latest.hips && first.waist && first.hips) {
      const firstWHR = first.waist / first.hips;
      const latestWHR = latest.waist / latest.hips;
      
      changes.whr = {
        first: firstWHR.toFixed(3),
        current: latestWHR.toFixed(3),
        change: (latestWHR - firstWHR).toFixed(3),
        evaluation: latestWHR < firstWHR ? this._t({ko: '[OK] 여성적으로 변화 중', en: '[OK] Becoming more feminine', ja: '[OK] 女性的に変化中'}) : this._t({ko: '[WARN] 개선 필요', en: '[WARN] Improvement needed', ja: '[WARN] 改善が必要'})
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
      return svgIcon('celebration', 'mi-inline mi-sm mi-success') + ' ' + this._t({ko: '훌륭합니다! 신체가 여성적으로 재형성되고 있습니다!', en: 'Excellent! Your body is reshaping femininely!', ja: '素晴らしい！身体が女性的に再形成されています！'});
    } else if (percentage >= 60) {
      return svgIcon('auto_awesome', 'mi-inline mi-sm') + ' ' + this._t({ko: '좋은 진행 상황입니다. 계속 유지하세요!', en: 'Good progress. Keep it up!', ja: '良い進捗です。続けてください！'});
    } else if (percentage >= 40) {
      return svgIcon('trending_up', 'mi-inline mi-sm') + ' ' + this._t({ko: '진행 중입니다. 운동과 식단을 재검토하세요.', en: 'In progress. Review your exercise and diet.', ja: '進行中です。運動と食事を見直してください。'});
    } else {
      return svgIcon('warning', 'mi-inline mi-sm mi-warning') + ' ' + this._t({ko: '개선이 필요합니다. 전문가와 상담하세요.', en: 'Improvement needed. Consult a specialist.', ja: '改善が必要です。専門家に相談してください。'});
    }
  }
  
  // ========================================
  // 6. 호르몬 효과 분석
  // ========================================
  
  /**
   * 에스트로겐/항안드로겐 효과 분석
   */
  analyzeHormoneEffects() {
    if (this.measurements.length === 0) {
      return null;
    }
    
    const latest = this.measurements[this.measurements.length - 1];
    const effects = {
      physical: [],
      emotional: [],
      sexual: []
    };
    
    // 신체적 효과
    if (latest.estrogenLevel && latest.estrogenLevel >= 100) {
      effects.physical.push(this._t({ko: '[OK] 에스트로겐 수치 적정 - 신체 여성화 진행 중', en: '[OK] Estrogen level adequate - body feminization in progress', ja: '[OK] エストロゲン値適正 - 身体の女性化進行中'}));
    } else if (latest.estrogenLevel) {
      effects.physical.push(this._t({ko: '[WARN] 에스트로겐 수치 낮음 - 여성화 진행 느림', en: '[WARN] Estrogen level low - feminization progressing slowly', ja: '[WARN] エストロゲン値低い - 女性化の進行が遅い'}));
    }
    
    if (latest.testosteroneLevel && latest.testosteroneLevel < 50) {
      effects.physical.push(this._t({ko: '[OK] 테스토스테론 잘 억제됨 - 남성화 역전 중', en: '[OK] Testosterone well suppressed - masculinization reversing', ja: '[OK] テストステロンよく抑制 - 男性化が逆転中'}));
    } else if (latest.testosteroneLevel) {
      effects.physical.push(this._t({ko: '[WARN] 테스토스테론 억제 부족 - 항안드로겐 조정 필요', en: '[WARN] Testosterone insufficiently suppressed - anti-androgen adjustment needed', ja: '[WARN] テストステロン抑制不足 - 抗アンドロゲン調整が必要'}));
    }
    
    // 가슴 발달
    if (latest.cupSize && latest.chest) {
      const diff = latest.cupSize - latest.chest;
      if (diff > 5) {
        effects.physical.push(this._t({ko: '[OK] 가슴 발달 진행 중', en: '[OK] Breast development in progress', ja: '[OK] 乳房発達進行中'}));
      }
    }
    
    // 근육량 감소 (여성화에서는 일반적)
    if (this.measurements.length >= 2) {
      const previous = this.measurements[this.measurements.length - 2];
      if (latest.muscleMass && previous.muscleMass && latest.muscleMass < previous.muscleMass) {
        effects.physical.push(this._t({ko: '[INFO] 근육량 감소 - 정상적인 여성화 과정', en: '[INFO] Muscle mass decrease - normal feminization process', ja: '[INFO] 筋肉量減少 - 正常な女性化過程'}));
      }
    }
    
    // 성적 효과
    if (latest.libido !== undefined) {
      if (latest.libido < 2) {
        effects.sexual.push(this._t({ko: '[INFO] 성욕 감소 - 정상적인 항안드로겐 효과', en: '[INFO] Decreased libido - normal anti-androgen effect', ja: '[INFO] 性欲減少 - 正常な抗アンドロゲン効果'}));
      }
    }
    
    return {
      effects,
      hormoneLevels: {
        estrogen: latest.estrogenLevel || 'N/A',
        testosterone: latest.testosteroneLevel || 'N/A'
      },
      overallStatus: this._getHormoneEffectStatus(effects)
    };
  }
  
  /**
   * 호르몬 효과 전체 상태
   * @private
   */
  _getHormoneEffectStatus(effects) {
    const totalEffects = effects.physical.length + effects.emotional.length + effects.sexual.length;
    const positiveEffects = [...effects.physical, ...effects.emotional, ...effects.sexual]
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
  // 7. MTF 타임라인 생성
  // ========================================
  
  /**
   * MTF 전환 타임라인 (예상 변화)
   */
  generateMTFTimeline() {
    const currentWeek = this.measurements.length;
    
    const timeline = [
      {
        period: this._t({ko: '1-3개월', en: '1-3 months', ja: '1-3ヶ月'}),
        week: '1-12',
        changes: [
          this._t({ko: '성욕 감소', en: 'Decreased libido', ja: '性欲減少'}),
          this._t({ko: '아침 발기 감소/소실', en: 'Reduced/loss of morning erections', ja: '朝立ちの減少/消失'}),
          this._t({ko: '피부 부드러워짐', en: 'Skin softening', ja: '肌が柔らかくなる'}),
          this._t({ko: '유방 봉오리 시작 (통증)', en: 'Breast budding begins (tenderness)', ja: '乳房芽の開始（痛み）'}),
          this._t({ko: '정서적 변화', en: 'Emotional changes', ja: '感情的な変化'})
        ],
        status: currentWeek >= 1 ? 'completed' : 'upcoming'
      },
      {
        period: this._t({ko: '3-6개월', en: '3-6 months', ja: '3-6ヶ月'}),
        week: '13-24',
        changes: [
          this._t({ko: '가슴 지속 발달 (A컵)', en: 'Continued breast growth (A cup)', ja: '乳房の継続的な発達（Aカップ）'}),
          this._t({ko: '체지방 재분배 시작', en: 'Body fat redistribution begins', ja: '体脂肪の再分配開始'}),
          this._t({ko: '근육량 감소', en: 'Muscle mass decrease', ja: '筋肉量の減少'}),
          this._t({ko: '체모 감소/부드러워짐', en: 'Body hair reduction/softening', ja: '体毛の減少/軟化'}),
          this._t({ko: '얼굴 변화 시작', en: 'Facial changes begin', ja: '顔の変化の開始'})
        ],
        status: currentWeek >= 13 ? (currentWeek >= 24 ? 'completed' : 'in_progress') : 'upcoming'
      },
      {
        period: this._t({ko: '6-12개월', en: '6-12 months', ja: '6-12ヶ月'}),
        week: '25-52',
        changes: [
          this._t({ko: '가슴 계속 발달 (A-B컵)', en: 'Continued breast growth (A-B cup)', ja: '乳房の継続発達（A-Bカップ）'}),
          this._t({ko: '엉덩이/허벅지 발달', en: 'Hip/thigh development', ja: 'ヒップ/太ももの発達'}),
          this._t({ko: '허리 감소', en: 'Waist reduction', ja: 'ウエストの減少'}),
          this._t({ko: '피부 변화 지속', en: 'Continued skin changes', ja: '肌の変化の継続'}),
          this._t({ko: '정자 생산 감소/중단', en: 'Sperm production decrease/cessation', ja: '精子生産の減少/停止'})
        ],
        status: currentWeek >= 25 ? (currentWeek >= 52 ? 'completed' : 'in_progress') : 'upcoming'
      },
      {
        period: this._t({ko: '12-24개월', en: '12-24 months', ja: '12-24ヶ月'}),
        week: '53-104',
        changes: [
          this._t({ko: '가슴 발달 둘화 (B컵 이상)', en: 'Breast growth slowing (B cup or larger)', ja: '乳房発達の鈍化（Bカップ以上）'}),
          this._t({ko: '체형 여성적으로 안정화', en: 'Body shape stabilizing femininely', ja: '体型が女性的に安定化'}),
          this._t({ko: '얼굴 변화 지속', en: 'Continued facial changes', ja: '顔の変化の継続'}),
          this._t({ko: '체모 더욱 감소', en: 'Further body hair reduction', ja: '体毛のさらなる減少'}),
          this._t({ko: '목소리는 변화 없음 (훈련 필요)', en: 'No voice change (training needed)', ja: '声の変化なし（トレーニングが必要）'})
        ],
        status: currentWeek >= 53 ? (currentWeek >= 104 ? 'completed' : 'in_progress') : 'upcoming'
      },
      {
        period: this._t({ko: '24개월+', en: '24 months+', ja: '24ヶ月+'}),
        week: '105+',
        changes: [
          this._t({ko: '가슴 최종 크기 도달 (2-5년)', en: 'Final breast size reached (2-5 years)', ja: '乳房の最終サイズに到達（2-5年）'}),
          this._t({ko: '체형 완전 안정화', en: 'Body shape fully stabilized', ja: '体型の完全な安定化'}),
          this._t({ko: '변화가 매우 느려짐', en: 'Changes become very slow', ja: '変化が非常に遅くなる'}),
          this._t({ko: '유지 및 미세 조정 단계', en: 'Maintenance and fine-tuning phase', ja: '維持および微調整段階'})
        ],
        status: currentWeek >= 105 ? 'in_progress' : 'upcoming'
      }
    ];
    
    return {
      currentWeek,
      currentPeriod: this._getCurrentPeriod(currentWeek),
      timeline,
      note: this._t({ko: '개인차가 크며, 이는 평균적인 예상 타임라인입니다. 프로게스테론 추가 시 가슴 발달이 더 빠를 수 있습니다.', en: 'Individual results vary greatly; this is an average expected timeline. Adding progesterone may accelerate breast development.', ja: '個人差が大きく、これは平均的な予想タイムラインです。プロゲステロンの追加で乳房の発達が早まる可能性があります。'})
    };
  }
  
  /**
   * 현재 기간 판단
   * @private
   */
  _getCurrentPeriod(week) {
    if (week < 13) return this._t({ko: '초기 (1-3개월)', en: 'Early (1-3 months)', ja: '初期（1-3ヶ月）'});
    if (week < 25) return this._t({ko: '초중기 (3-6개월)', en: 'Early-mid (3-6 months)', ja: '初中期（3-6ヶ月）'});
    if (week < 53) return this._t({ko: '중기 (6-12개월)', en: 'Mid (6-12 months)', ja: '中期（6-12ヶ月）'});
    if (week < 105) return this._t({ko: '중후기 (12-24개월)', en: 'Mid-late (12-24 months)', ja: '中後期（12-24ヶ月）'});
    return this._t({ko: '후기 (24개월+)', en: 'Late (24 months+)', ja: '後期（24ヶ月+）'});
  }
  
  // ========================================
  // 8. MTF 추천사항 생성
  // ========================================
  
  /**
   * MTF 특화 추천사항
   */
  generateMTFRecommendations() {
    const latest = this.measurements[this.measurements.length - 1];
    const recommendations = [];
    
    // 가슴 발달 관련
    if (latest.cupSize && latest.chest) {
      const diff = latest.cupSize - latest.chest;
      if (diff < 5) {
        recommendations.push({
          category: 'breast',
          priority: 'medium',
          title: this._t({ko: '가슴 발달 촉진', en: 'Promote breast development', ja: '乳房発達の促進'}),
          advice: [
            this._t({ko: '프로게스테론 추가 고려 (의사와 상담)', en: 'Consider adding progesterone (consult doctor)', ja: 'プロゲステロンの追加を検討（医師と相談）'}),
            this._t({ko: '충분한 체지방률 유지 (20-28%)', en: 'Maintain adequate body fat percentage (20-28%)', ja: '十分な体脂肪率を維持（20-28%）'}),
            this._t({ko: '가슴 마사지', en: 'Breast massage', ja: '乳房マッサージ'}),
            this._t({ko: '브래지어 착용 (발달 도움)', en: 'Wear a bra (aids development)', ja: 'ブラジャーの着用（発達を助ける）'})
          ]
        });
      }
    }
    
    // 체형 관련
    if (latest.waist && latest.hips) {
      const whr = latest.waist / latest.hips;
      if (whr >= 0.85) {
        recommendations.push({
          category: 'body_shape',
          priority: 'high',
          title: this._t({ko: '여성적 곡선 만들기', en: 'Build feminine curves', ja: '女性的な曲線を作る'}),
          advice: [
            this._t({ko: '하체 운동 집중 (힙 스러스트, 스쿼트)', en: 'Focus on lower body exercises (hip thrusts, squats)', ja: '下半身の運動に集中（ヒップスラスト、スクワット）'}),
            this._t({ko: '복부 운동으로 허리 줄이기', en: 'Reduce waist with core exercises', ja: '腹部運動でウエストを減らす'}),
            this._t({ko: '유산소 + 체지방 적정 유지', en: 'Cardio + maintain optimal body fat', ja: '有酸素運動 + 適正体脂肪を維持'}),
            this._t({ko: '상체 근력 운동 최소화', en: 'Minimize upper body strength training', ja: '上半身の筋力トレーニングを最小限に'})
          ]
        });
      }
    }
    
    // 호르몬 관련
    if (latest.estrogenLevel && latest.estrogenLevel < 100) {
      recommendations.push({
        category: 'hormone',
        priority: 'high',
        title: this._t({ko: '에스트라디올 증량 고려', en: 'Consider increasing estradiol', ja: 'エストラジオールの増量を検討'}),
        advice: [
          this._t({ko: '현재 E2 수치가 낮습니다', en: 'Current E2 level is low', ja: '現在のE2値が低いです'}),
          this._t({ko: '의사와 상담하여 용량 조정', en: 'Consult doctor to adjust dosage', ja: '医師と相談して用量を調整'}),
          this._t({ko: '흡수율 확인 (경구 vs 패치 vs 주사)', en: 'Check absorption rate (oral vs patch vs injection)', ja: '吸収率を確認（経口 vs パッチ vs 注射）'}),
          this._t({ko: '정기 혈액 검사', en: 'Regular blood tests', ja: '定期的な血液検査'})
        ]
      });
    }
    
    if (latest.testosteroneLevel && latest.testosteroneLevel > 50) {
      recommendations.push({
        category: 'hormone',
        priority: 'high',
        title: this._t({ko: '테스토스테론 억제 강화', en: 'Strengthen testosterone suppression', ja: 'テストステロン抑制の強化'}),
        advice: [
          this._t({ko: '항안드로겐 증량 고려', en: 'Consider increasing anti-androgen', ja: '抗アンドロゲンの増量を検討'}),
          this._t({ko: '스피로노락톤 또는 비칼루타마이드', en: 'Spironolactone or bicalutamide', ja: 'スピロノラクトンまたはビカルタミド'}),
          this._t({ko: 'GnRH 작용제 고려 (강력한 억제)', en: 'Consider GnRH agonist (strong suppression)', ja: 'GnRH作動薬を検討（強力な抑制）'}),
          this._t({ko: '의사와 상담', en: 'Consult doctor', ja: '医師と相談'})
        ]
      });
    }
    
    // 피부 관리
    recommendations.push({
      category: 'skincare',
      priority: 'low',
      title: this._t({ko: '여성적 피부 관리', en: 'Feminine skin care', ja: '女性的なスキンケア'}),
      advice: [
        this._t({ko: '매일 보습제 사용', en: 'Use moisturizer daily', ja: '毎日保湿剤を使用'}),
        this._t({ko: '자외선 차단제 필수', en: 'Sunscreen is essential', ja: '日焼け止めは必須'}),
        this._t({ko: '순한 클렌저', en: 'Gentle cleanser', ja: '優しいクレンザー'}),
        this._t({ko: '비타민 C 세럼', en: 'Vitamin C serum', ja: 'ビタミンCセラム'}),
        this._t({ko: '충분한 수분 섭취', en: 'Adequate hydration', ja: '十分な水分摂取'})
      ]
    });
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
  
  // ========================================
  // 9. 유틸리티
  // ========================================
  
  _getFeminizationCategory(score) {
    if (score >= 85) return 'highly_feminized';
    if (score >= 70) return 'well_feminized';
    if (score >= 50) return 'moderately_feminized';
    if (score >= 30) return 'early_feminization';
    return 'just_started';
  }
  
  _getFeminizationMessage(score) {
    if (score >= 85) {
      return svgIcon('celebration', 'mi-inline mi-sm mi-success') + ' ' + this._t({ko: '훌륭합니다! 여성화가 매우 잘 진행되고 있습니다!', en: 'Excellent! Feminization is progressing very well!', ja: '素晴らしい！女性化が非常にうまく進んでいます！'});
    } else if (score >= 70) {
      return svgIcon('auto_awesome', 'mi-inline mi-sm') + ' ' + this._t({ko: '여성화가 순조롭게 진행 중입니다!', en: 'Feminization is progressing smoothly!', ja: '女性化が順調に進行中です！'});
    } else if (score >= 50) {
      return svgIcon('trending_up', 'mi-inline mi-sm') + ' ' + this._t({ko: '중간 정도 진행되었습니다. 계속 노력하세요!', en: 'Moderate progress. Keep going!', ja: '中程度の進捗です。引き続き頑張ってください！'});
    } else if (score >= 30) {
      return svgIcon('spa', 'mi-inline mi-sm') + ' ' + this._t({ko: '초기 단계입니다. 시간과 인내가 필요합니다.', en: 'Early stage. Time and patience are needed.', ja: '初期段階です。時間と忍耐が必要です。'});
    } else {
      return this._t({ko: '시작 단계입니다. 꾸준한 관리가 중요합니다.', en: 'Starting phase. Consistent care is important.', ja: '開始段階です。着実なケアが重要です。'});
    }
  }
}

// ========================================
// 10. Export
// ========================================

export default MTFAnalyzer;
