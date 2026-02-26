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
  constructor(measurements, biologicalSex = 'male') {
    this.measurements = measurements;
    this.biologicalSex = biologicalSex;
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
        message: 'MTF 분석을 위한 데이터가 없습니다.',
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
        details.whr.evaluation = '매우 여성적 (< 0.75)';
      } else if (whr < 0.80) {
        score += 12;
        details.whr.evaluation = '여성적 (< 0.80)';
      } else if (whr < 0.85) {
        score += 8;
        details.whr.evaluation = '진행 중 (< 0.85)';
      } else {
        score += 4;
        details.whr.evaluation = '초기 단계 (>= 0.85)';
      }
    }
    
    // Shoulder-Waist Ratio - 15점
    if (measurement.shoulder && measurement.waist) {
      const swr = measurement.shoulder / measurement.waist;
      details.shoulderWaist = { value: swr.toFixed(2) };
      
      if (swr < 1.25) {
        score += 15;
        details.shoulderWaist.evaluation = '매우 부드러운 비율 (< 1.25)';
      } else if (swr < 1.35) {
        score += 12;
        details.shoulderWaist.evaluation = '여성적 비율 (< 1.35)';
      } else if (swr < 1.45) {
        score += 8;
        details.shoulderWaist.evaluation = '진행 중 (< 1.45)';
      } else {
        score += 4;
        details.shoulderWaist.evaluation = '아직 넓은 어깨 (>= 1.45)';
      }
    }
    
    // Hip-Waist Ratio (높을수록 좋음) - 10점
    if (measurement.hips && measurement.waist) {
      const hwr = measurement.hips / measurement.waist;
      details.hipWaist = { value: hwr.toFixed(2) };
      
      if (hwr > 1.3) {
        score += 10;
        details.hipWaist.evaluation = '뚜렷한 곡선 (> 1.3)';
      } else if (hwr > 1.2) {
        score += 8;
        details.hipWaist.evaluation = '여성적 곡선 (> 1.2)';
      } else if (hwr > 1.1) {
        score += 5;
        details.hipWaist.evaluation = '약간의 곡선 (> 1.1)';
      } else {
        score += 2;
        details.hipWaist.evaluation = '직선형 (<= 1.1)';
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
      details.message = '가슴 둘레 측정이 필요합니다.';
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
        details.evaluation = '이상적인 여성 체지방률 (20-28%)';
      } else if (bfp >= 18 && bfp < 20) {
        score += 12;
        details.evaluation = '약간 낮음 (18-20%) - 여성 곡선 형성에 불리';
      } else if (bfp > 28 && bfp <= 32) {
        score += 15;
        details.evaluation = '약간 높음 (28-32%) - 여성적이지만 건강 주의';
      } else if (bfp < 18) {
        score += 5;
        details.evaluation = '너무 낮음 (< 18%) - 여성 곡선 형성 어려움';
      } else {
        score += 8;
        details.evaluation = '높음 (> 32%) - 건강을 위해 감소 필요';
      }
    }
    
    // 엉덩이/허벅지 발달 확인
    if (measurement.hips && measurement.thigh) {
      details.lowerBodyDevelopment = '[OK] 하체 발달 측정 중';
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
        details.estrogen.status = '이상적 (100-200 pg/ml)';
      } else if (eLevel >= 80 && eLevel < 100) {
        score += 8;
        details.estrogen.status = '약간 낮음 (80-100 pg/ml)';
      } else if (eLevel > 200 && eLevel <= 250) {
        score += 10;
        details.estrogen.status = '약간 높음 (200-250 pg/ml) - 혈전 주의';
      } else if (eLevel < 80) {
        score += 4;
        details.estrogen.status = '낮음 (< 80 pg/ml) - 증량 필요';
      } else {
        score += 6;
        details.estrogen.status = '높음 (> 250 pg/ml) - 위험, 감량 필요';
      }
    }
    
    // 테스토스테론 (8점)
    if (measurement.testosteroneLevel) {
      const tLevel = parseFloat(measurement.testosteroneLevel);
      details.testosterone = { level: tLevel };
      
      if (tLevel < 50) {
        score += 8;
        details.testosterone.status = '이상적 (< 50 ng/ml) - 잘 억제됨';
      } else if (tLevel < 100) {
        score += 5;
        details.testosterone.status = '보통 (50-100 ng/ml) - 항안드로겐 조정 고려';
      } else if (tLevel < 200) {
        score += 2;
        details.testosterone.status = '높음 (100-200 ng/ml) - 억제 부족';
      } else {
        score += 0;
        details.testosterone.status = '매우 높음 (> 200 ng/ml) - 즉시 조정 필요';
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
      return { stage: 1, description: 'Stage 1: 발달 시작 전' };
    } else if (diff < 3) {
      return { stage: 2, description: 'Stage 2: 유방 봉오리 (Breast Buds)' };
    } else if (diff < 6) {
      return { stage: 3, description: 'Stage 3: 초기 발달' };
    } else if (diff < 10) {
      return { stage: 4, description: 'Stage 4: 중기 발달' };
    } else {
      return { stage: 5, description: 'Stage 5: 성숙한 발달' };
    }
  }
  
  /**
   * 가슴 발달 진행 분석
   * @private
   */
  _analyzeBreastProgress(development) {
    if (development.length < 2) {
      return { message: '진행도를 확인하기 위해 더 많은 데이터가 필요합니다.' };
    }
    
    const first = development[0];
    const latest = development[development.length - 1];
    
    const totalGrowth = parseFloat(latest.difference) - parseFloat(first.difference);
    const weeksElapsed = latest.week - first.week;
    const avgWeeklyGrowth = totalGrowth / weeksElapsed;
    
    let evaluation = '';
    if (avgWeeklyGrowth > 0.3) {
      evaluation = '빠른 발달 (평균 이상)';
    } else if (avgWeeklyGrowth > 0.15) {
      evaluation = '정상적인 발달';
    } else if (avgWeeklyGrowth > 0) {
      evaluation = '느린 발달 (프로게스테론 고려)';
    } else {
      evaluation = '정체 또는 감소 (전문가 상담 필요)';
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
      'AA': 'Stage 2-3: 초기 발달 (유방 봉오리)',
      'A': 'Stage 3: 눈에 보이는 발달',
      'B': 'Stage 4: 중간 발달',
      'C': 'Stage 4-5: 상당한 발달',
      'D': 'Stage 5: 완전한 발달',
      'DD+': 'Stage 5: 큰 발달'
    };
    return stages[cupSize] || '측정 필요';
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
        evaluation: latest.waist < first.waist ? '[OK] 감소 중 (좋음)' : '[WARN] 증가 중'
      };
    }
    
    // 엉덩이 증가
    if (latest.hips && first.hips) {
      changes.hips = {
        first: first.hips,
        current: latest.hips,
        change: (latest.hips - first.hips).toFixed(1),
        evaluation: latest.hips > first.hips ? '[OK] 증가 중 (좋음)' : '[WARN] 감소 중'
      };
    }
    
    // 어깨 (변화 최소화가 목표)
    if (latest.shoulder && first.shoulder) {
      changes.shoulder = {
        first: first.shoulder,
        current: latest.shoulder,
        change: (latest.shoulder - first.shoulder).toFixed(1),
        evaluation: Math.abs(latest.shoulder - first.shoulder) < 1 
            ? '[OK] 유지 중 (좋음)' 
            : latest.shoulder > first.shoulder 
              ? '[WARN] 증가 중 (상체 운동 주의)'
              : '[OK] 약간 감소 (좋음)'
      };
    }
    
    // 허벅지 증가
    if (latest.thigh && first.thigh) {
      changes.thigh = {
        first: first.thigh,
        current: latest.thigh,
        change: (latest.thigh - first.thigh).toFixed(1),
        evaluation: latest.thigh > first.thigh ? '[OK] 증가 중 (좋음)' : '[WARN] 감소 중'
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
        evaluation: latestWHR < firstWHR ? '[OK] 여성적으로 변화 중' : '[WARN] 개선 필요'
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
      return '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> 훌륭합니다! 신체가 여성적으로 재형성되고 있습니다!';
    } else if (percentage >= 60) {
      return '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 좋은 진행 상황입니다. 계속 유지하세요!';
    } else if (percentage >= 40) {
      return '<span class="material-symbols-outlined mi-inline mi-sm">trending_up</span> 진행 중입니다. 운동과 식단을 재검토하세요.';
    } else {
      return '<span class="material-symbols-outlined mi-inline mi-sm mi-warning">warning</span> 개선이 필요합니다. 전문가와 상담하세요.';
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
      effects.physical.push('[OK] 에스트로겐 수치 적정 - 신체 여성화 진행 중');
    } else if (latest.estrogenLevel) {
      effects.physical.push('[WARN] 에스트로겐 수치 낮음 - 여성화 진행 느림');
    }
    
    if (latest.testosteroneLevel && latest.testosteroneLevel < 50) {
      effects.physical.push('[OK] 테스토스테론 잘 억제됨 - 남성화 역전 중');
    } else if (latest.testosteroneLevel) {
      effects.physical.push('[WARN] 테스토스테론 억제 부족 - 항안드로겐 조정 필요');
    }
    
    // 가슴 발달
    if (latest.cupSize && latest.chest) {
      const diff = latest.cupSize - latest.chest;
      if (diff > 5) {
        effects.physical.push('[OK] 가슴 발달 진행 중');
      }
    }
    
    // 근육량 감소 (여성화에서는 일반적)
    if (this.measurements.length >= 2) {
      const previous = this.measurements[this.measurements.length - 2];
      if (latest.muscleMass && previous.muscleMass && latest.muscleMass < previous.muscleMass) {
        effects.physical.push('[INFO] 근육량 감소 - 정상적인 여성화 과정');
      }
    }
    
    // 성적 효과
    if (latest.libido !== undefined) {
      if (latest.libido < 2) {
        effects.sexual.push('[INFO] 성욕 감소 - 정상적인 항안드로겐 효과');
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
        period: '1-3개월',
        week: '1-12',
        changes: [
          '성욕 감소',
          '아침 발기 감소/소실',
          '피부 부드러워짐',
          '유방 봉오리 시작 (통증)',
          '정서적 변화'
        ],
        status: currentWeek >= 1 ? 'completed' : 'upcoming'
      },
      {
        period: '3-6개월',
        week: '13-24',
        changes: [
          '가슴 지속 발달 (A컵)',
          '체지방 재분배 시작',
          '근육량 감소',
          '체모 감소/부드러워짐',
          '얼굴 변화 시작'
        ],
        status: currentWeek >= 13 ? (currentWeek >= 24 ? 'completed' : 'in_progress') : 'upcoming'
      },
      {
        period: '6-12개월',
        week: '25-52',
        changes: [
          '가슴 계속 발달 (A-B컵)',
          '엉덩이/허벅지 발달',
          '허리 감소',
          '피부 변화 지속',
          '정자 생산 감소/중단'
        ],
        status: currentWeek >= 25 ? (currentWeek >= 52 ? 'completed' : 'in_progress') : 'upcoming'
      },
      {
        period: '12-24개월',
        week: '53-104',
        changes: [
          '가슴 발달 둔화 (B컵 이상)',
          '체형 여성적으로 안정화',
          '얼굴 변화 지속',
          '체모 더욱 감소',
          '목소리는 변화 없음 (훈련 필요)'
        ],
        status: currentWeek >= 53 ? (currentWeek >= 104 ? 'completed' : 'in_progress') : 'upcoming'
      },
      {
        period: '24개월+',
        week: '105+',
        changes: [
          '가슴 최종 크기 도달 (2-5년)',
          '체형 완전 안정화',
          '변화가 매우 느려짐',
          '유지 및 미세 조정 단계'
        ],
        status: currentWeek >= 105 ? 'in_progress' : 'upcoming'
      }
    ];
    
    return {
      currentWeek,
      currentPeriod: this._getCurrentPeriod(currentWeek),
      timeline,
      note: '개인차가 크며, 이는 평균적인 예상 타임라인입니다. 프로게스테론 추가 시 가슴 발달이 더 빠를 수 있습니다.'
    };
  }
  
  /**
   * 현재 기간 판단
   * @private
   */
  _getCurrentPeriod(week) {
    if (week < 13) return '초기 (1-3개월)';
    if (week < 25) return '초중기 (3-6개월)';
    if (week < 53) return '중기 (6-12개월)';
    if (week < 105) return '중후기 (12-24개월)';
    return '후기 (24개월+)';
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
          title: '가슴 발달 촉진',
          advice: [
            '프로게스테론 추가 고려 (의사와 상담)',
            '충분한 체지방률 유지 (20-28%)',
            '가슴 마사지',
            '브래지어 착용 (발달 도움)'
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
          title: '여성적 곡선 만들기',
          advice: [
            '하체 운동 집중 (힙 스러스트, 스쿼트)',
            '복부 운동으로 허리 줄이기',
            '유산소 + 체지방 적정 유지',
            '상체 근력 운동 최소화'
          ]
        });
      }
    }
    
    // 호르몬 관련
    if (latest.estrogenLevel && latest.estrogenLevel < 100) {
      recommendations.push({
        category: 'hormone',
        priority: 'high',
        title: '에스트라디올 증량 고려',
        advice: [
          '현재 E2 수치가 낮습니다',
          '의사와 상담하여 용량 조정',
          '흡수율 확인 (경구 vs 패치 vs 주사)',
          '정기 혈액 검사'
        ]
      });
    }
    
    if (latest.testosteroneLevel && latest.testosteroneLevel > 50) {
      recommendations.push({
        category: 'hormone',
        priority: 'high',
        title: '테스토스테론 억제 강화',
        advice: [
          '항안드로겐 증량 고려',
          '스피로노락톤 또는 비칼루타미드',
          'GnRH 작용제 고려 (강력한 억제)',
          '의사와 상담'
        ]
      });
    }
    
    // 피부 관리
    recommendations.push({
      category: 'skincare',
      priority: 'low',
      title: '여성적 피부 관리',
      advice: [
        '매일 보습제 사용',
        '자외선 차단제 필수',
        '순한 클렌저',
        '비타민 C 세럼',
        '충분한 수분 섭취'
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
      return '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> 훌륭합니다! 여성화가 매우 잘 진행되고 있습니다!';
    } else if (score >= 70) {
      return '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 여성화가 순조롭게 진행 중입니다!';
    } else if (score >= 50) {
      return '<span class="material-symbols-outlined mi-inline mi-sm">trending_up</span> 중간 정도 진행되었습니다. 계속 노력하세요!';
    } else if (score >= 30) {
      return '<span class="material-symbols-outlined mi-inline mi-sm">spa</span> 초기 단계입니다. 시간과 인내가 필요합니다.';
    } else {
      return '시작 단계입니다. 꾸준한 관리가 중요합니다.';
    }
  }
}

// ========================================
// 10. Export
// ========================================

export default MTFAnalyzer;
