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
  constructor(measurements, biologicalSex = 'female') {
    this.measurements = measurements;
    this.biologicalSex = biologicalSex;
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
        message: 'FTM 분석을 위한 데이터가 없습니다.',
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
        details.whr.evaluation = '매우 남성적 (> 0.95)';
      } else if (whr > 0.90) {
        score += 10;
        details.whr.evaluation = '남성적 (> 0.90)';
      } else if (whr > 0.85) {
        score += 7;
        details.whr.evaluation = '진행 중 (> 0.85)';
      } else {
        score += 4;
        details.whr.evaluation = '아직 여성적 (<= 0.85)';
      }
    }
    
    // Shoulder-Waist Ratio - 높을수록 좋음 (15점)
    if (measurement.shoulder && measurement.waist) {
      const swr = measurement.shoulder / measurement.waist;
      details.shoulderWaist = { value: swr.toFixed(2) };
      
      if (swr > 1.50) {
        score += 15;
        details.shoulderWaist.evaluation = '매우 넓은 어깨 (> 1.50) - V자 체형!';
      } else if (swr > 1.40) {
        score += 12;
        details.shoulderWaist.evaluation = '남성적 어깨 (> 1.40)';
      } else if (swr > 1.30) {
        score += 8;
        details.shoulderWaist.evaluation = '진행 중 (> 1.30)';
      } else {
        score += 4;
        details.shoulderWaist.evaluation = '어깨 발달 필요 (<= 1.30)';
      }
    }
    
    // 가슴 평탄화 (8점)
    if (measurement.cupSize && measurement.chest) {
      const diff = measurement.cupSize - measurement.chest;
      details.chestFlattening = { difference: diff.toFixed(1) };
      
      if (diff < 1) {
        score += 8;
        details.chestFlattening.evaluation = '매우 평탄 (< 1cm)';
      } else if (diff < 2) {
        score += 6;
        details.chestFlattening.evaluation = '상당히 평탄 (< 2cm)';
      } else if (diff < 3) {
        score += 4;
        details.chestFlattening.evaluation = '진행 중 (< 3cm)';
      } else {
        score += 2;
        details.chestFlattening.evaluation = '바인더 또는 수술 고려 (>= 3cm)';
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
        details.muscleMass.evaluation = '매우 높은 근육량 (> 38kg)';
      } else if (mm > 35) {
        score += 12;
        details.muscleMass.evaluation = '높은 근육량 (> 35kg)';
      } else if (mm > 30) {
        score += 9;
        details.muscleMass.evaluation = '보통 근육량 (> 30kg)';
      } else if (mm > 25) {
        score += 6;
        details.muscleMass.evaluation = '낮은 근육량 (> 25kg) - 근력 운동 필요';
      } else {
        score += 3;
        details.muscleMass.evaluation = '매우 낮음 (<= 25kg) - 적극적인 근력 운동 필요';
      }
    }
    
    // 근육량 비율 (체중 대비) (10점)
    if (measurement.muscleMass && measurement.weight) {
      const musclePercentage = (measurement.muscleMass / measurement.weight) * 100;
      details.musclePercentage = { value: musclePercentage.toFixed(1) };
      
      if (musclePercentage > 50) {
        score += 10;
        details.musclePercentage.evaluation = '매우 높음 (> 50%)';
      } else if (musclePercentage > 45) {
        score += 8;
        details.musclePercentage.evaluation = '높음 (> 45%)';
      } else if (musclePercentage > 40) {
        score += 6;
        details.musclePercentage.evaluation = '보통 (> 40%)';
      } else {
        score += 3;
        details.musclePercentage.evaluation = '낮음 (<= 40%) - 근육 증가 필요';
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
        details.evaluation = '이상적인 남성 체지방률 (10-15%)';
      } else if (bfp < 10) {
        score += 12;
        details.evaluation = '매우 낮음 (< 10%) - 건강 주의, 너무 낮음';
      } else if (bfp > 15 && bfp <= 18) {
        score += 16;
        details.evaluation = '좋음 (15-18%)';
      } else if (bfp > 18 && bfp <= 22) {
        score += 10;
        details.evaluation = '약간 높음 (18-22%) - 감소 필요';
      } else {
        score += 5;
        details.evaluation = '높음 (> 22%) - 적극적인 감소 필요';
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
        details.testosterone.status = '이상적 (300-700 ng/ml)';
      } else if (tLevel >= 700 && tLevel <= 1000) {
        score += 12;
        details.testosterone.status = '약간 높음 (700-1000 ng/ml) - 부작용 주의';
      } else if (tLevel >= 200 && tLevel < 300) {
        score += 8;
        details.testosterone.status = '낮음 (200-300 ng/ml) - 증량 필요';
      } else if (tLevel < 200) {
        score += 4;
        details.testosterone.status = '매우 낮음 (< 200 ng/ml) - 즉시 증량 필요';
      } else {
        score += 6;
        details.testosterone.status = '너무 높음 (> 1000 ng/ml) - 위험, 감량 필요';
      }
    }
    
    // 에스트로겐 (5점)
    if (measurement.estrogenLevel) {
      const eLevel = parseFloat(measurement.estrogenLevel);
      details.estrogen = { level: eLevel };
      
      if (eLevel < 30) {
        score += 5;
        details.estrogen.status = '이상적 (< 30 pg/ml) - 잘 억제됨';
      } else if (eLevel < 50) {
        score += 3;
        details.estrogen.status = '약간 높음 (30-50 pg/ml)';
      } else {
        score += 1;
        details.estrogen.status = '높음 (> 50 pg/ml) - AI 고려';
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
      return { message: '진행도를 확인하기 위해 더 많은 데이터가 필요합니다.' };
    }
    
    const first = growth[0];
    const latest = growth[growth.length - 1];
    
    const totalGain = parseFloat(latest.muscleMass) - parseFloat(first.muscleMass);
    const weeksElapsed = latest.week - first.week;
    const avgWeeklyGain = totalGain / weeksElapsed;
    
    let evaluation = '';
    if (avgWeeklyGain > 0.3) {
      evaluation = '매우 빠른 성장 (테스토스테론 + 운동 효과 우수)';
    } else if (avgWeeklyGain > 0.15) {
      evaluation = '정상적인 성장 (순조로운 진행)';
    } else if (avgWeeklyGain > 0) {
      evaluation = '느린 성장 (운동 강도 증가 필요)';
    } else {
      evaluation = '정체 또는 감소 (운동 및 영양 재검토 필요)';
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
        evaluation: latest.shoulder > first.shoulder ? '[OK] 증가 중 (좋음)' : '[WARN] 정체 또는 감소'
      };
    }
    
    // 허리 (직선형 유지 또는 약간 증가)
    if (latest.waist && first.waist) {
      changes.waist = {
        first: first.waist,
        current: latest.waist,
        change: (latest.waist - first.waist).toFixed(1),
        evaluation: '[INFO] 변화 추적 중'
      };
    }
    
    // 엉덩이 감소 (목표)
    if (latest.hips && first.hips) {
      changes.hips = {
        first: first.hips,
        current: latest.hips,
        change: (latest.hips - first.hips).toFixed(1),
        evaluation: latest.hips < first.hips ? '[OK] 감소 중 (좋음)' : '[WARN] 증가 또는 정체'
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
        evaluation: latestWHR > firstWHR ? '[OK] 남성적으로 변화 중' : '[WARN] 개선 필요'
      };
    }
    
    // 팔뚝 증가 (근육)
    if (latest.arm && first.arm) {
      changes.arm = {
        first: first.arm,
        current: latest.arm,
        change: (latest.arm - first.arm).toFixed(1),
        evaluation: latest.arm > first.arm ? '[OK] 증가 중 (좋음)' : '[WARN] 근력 운동 필요'
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
      return '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> 훌륭합니다! 신체가 남성적으로 재형성되고 있습니다!';
    } else if (percentage >= 60) {
      return '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 좋은 진행 상황입니다. 계속 유지하세요!';
    } else if (percentage >= 40) {
      return '<span class="material-symbols-outlined mi-inline mi-sm">trending_up</span> 진행 중입니다. 운동과 식단을 재검토하세요.';
    } else {
      return '<span class="material-symbols-outlined mi-inline mi-sm mi-warning">warning</span> 개선이 필요합니다. 근력 운동을 늘리세요.';
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
      effects.physical.push('[OK] 테스토스테론 수치 적정 - 남성화 진행 중');
    } else if (latest.testosteroneLevel) {
      effects.physical.push('[WARN] 테스토스테론 수치 낮음 - 남성화 진행 느림');
    }
    
    // 근육량 증가
    if (this.measurements.length >= 2) {
      const previous = this.measurements[this.measurements.length - 2];
      if (latest.muscleMass && previous.muscleMass && latest.muscleMass > previous.muscleMass) {
        effects.physical.push('[OK] 근육량 증가 중 - 테스토스테론 효과');
      }
    }
    
    // 생리 중단 (예상되는 효과)
    effects.reproductive.push('[INFO] 생리 중단 - 정상적인 테스토스테론 효과');
    
    // 잠재적 부작용
    if (latest.testosteroneLevel && latest.testosteroneLevel > 800) {
      effects.sideEffects.push('[WARN] T 수치 높음 - 여드름, 공격성 증가 주의');
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
      return 'Stage 1: 아직 변화 없음';
    } else if (week < 12) {
      return 'Stage 2: 목이 간질거림, 갈라짐 시작';
    } else if (week < 24) {
      return 'Stage 3: 눈에 띄는 변화, 불안정';
    } else if (week < 52) {
      return 'Stage 4: 상당한 변화, 안정화 진행';
    } else {
      return 'Stage 5: 변화 완료 (12-18개월)';
    }
  }
  
  /**
   * 목소리 변화 예상 타임라인
   * @private
   */
  _getVoiceTimeline() {
    return [
      { period: '1-3개월', change: '목이 간질거림, 약간의 변화' },
      { period: '3-6개월', change: '목소리 갈라짐, 눈에 띄는 변화' },
      { period: '6-12개월', change: '상당한 낮아짐, 불안정' },
      { period: '12-18개월', change: '변화 완료, 안정화' }
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
        period: '1-3개월',
        week: '1-12',
        changes: [
          '생리 중단 (1-6개월)',
          '성욕 증가',
          '클리토리스 비대 시작',
          '피부 지성화, 여드름 시작',
          '체모 증가 시작',
          '목소리 변화 시작 (갈라짐)'
        ],
        status: currentWeek >= 1 ? 'completed' : 'upcoming'
      },
      {
        period: '3-6개월',
        week: '13-24',
        changes: [
          '목소리 눈에 띄게 낮아짐',
          '여드름 증가 (피크)',
          '체모 증가 지속',
          '근육량 증가 시작',
          '얼굴형 변화 시작',
          '체지방 재분배 시작'
        ],
        status: currentWeek >= 13 ? (currentWeek >= 24 ? 'completed' : 'in_progress') : 'upcoming'
      },
      {
        period: '6-12개월',
        week: '25-52',
        changes: [
          '목소리 변화 계속 (안정화 시작)',
          '여드름 점차 감소',
          '근육량 상당히 증가',
          '얼굴 남성화 진행',
          '체형 남성적으로 변화',
          '수염 시작 (개인차 큼)'
        ],
        status: currentWeek >= 25 ? (currentWeek >= 52 ? 'completed' : 'in_progress') : 'upcoming'
      },
      {
        period: '12-24개월',
        week: '53-104',
        changes: [
          '목소리 변화 완료 (12-18개월)',
          '여드름 대부분 안정화',
          '수염 지속 성장',
          '체모 계속 증가',
          '체형 완전히 남성화',
          '얼굴 변화 완료'
        ],
        status: currentWeek >= 53 ? (currentWeek >= 104 ? 'completed' : 'in_progress') : 'upcoming'
      },
      {
        period: '24개월+',
        week: '105+',
        changes: [
          '변화 대부분 완료',
          '수염 성장 계속 (5년까지)',
          '근육 발달 계속 가능',
          '유지 및 미세 조정 단계'
        ],
        status: currentWeek >= 105 ? 'in_progress' : 'upcoming'
      }
    ];
    
    return {
      currentWeek,
      currentPeriod: this._getCurrentPeriod(currentWeek),
      timeline,
      note: '개인차가 크며, 이는 평균적인 예상 타임라인입니다. 여드름은 피부과 치료로 관리 가능합니다.'
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
        title: '근육량 증가',
        advice: [
          '주 4-5회 근력 운동 (복합 운동 중심)',
          '단백질 섭취 증가 (체중 1kg당 2g)',
          '충분한 칼로리 (근육 성장 위해)',
          '크레아틴 보충제 고려',
          '충분한 휴식과 수면'
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
          title: 'V자 체형 만들기',
          advice: [
            '숄더 프레스, 사이드 레터럴 레이즈',
            '풀업/턱걸이',
            '로우 (등 운동)',
            '벤치프레스',
            '허리 줄이기 (유산소 + 코어)'
          ]
        });
      }
    }
    
    // 호르몬 관련
    if (latest.testosteroneLevel && latest.testosteroneLevel < 300) {
      recommendations.push({
        category: 'hormone',
        priority: 'high',
        title: '테스토스테론 증량 필요',
        advice: [
          '현재 T 수치가 낮습니다',
          '의사와 상담하여 용량 조정',
          '투여 간격 확인 (주사 시)',
          '정기 혈액 검사'
        ]
      });
    }
    
    if (latest.testosteroneLevel && latest.testosteroneLevel > 800) {
      recommendations.push({
        category: 'hormone',
        priority: 'high',
        title: '테스토스테론 조정 필요',
        advice: [
          'T 수치가 높습니다 (부작용 주의)',
          '여드름, 공격성 증가 가능',
          '적혈구 증가증 위험',
          '의사와 상담하여 감량 고려'
        ]
      });
    }
    
    // 여드름 관리
    recommendations.push({
      category: 'skincare',
      priority: 'medium',
      title: '여드름 관리 (FTM 흔한 부작용)',
      advice: [
        '하루 2회 클렌징',
        '살리실산 또는 벤조일 퍼옥사이드',
        '유제품 줄이기',
        '충분한 물',
        '심한 경우 피부과 상담 (isotretinoin)'
      ]
    });
    
    // 가슴 관리 (수술 전)
    if (latest.cupSize && latest.chest && (latest.cupSize - latest.chest) > 3) {
      recommendations.push({
        category: 'chest',
        priority: 'medium',
        title: '가슴 관리',
        advice: [
          '안전한 바인더 사용 (8시간 이내)',
          '압박 브래지어 고려',
          '상부 수술(Top Surgery) 상담',
          '바인더 장시간 착용 피하기 (건강 위험)'
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
      return '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> 훌륭합니다! 남성화가 매우 잘 진행되고 있습니다!';
    } else if (score >= 70) {
      return '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 남성화가 순조롭게 진행 중입니다!';
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
// 11. Export
// ========================================

export default FTMAnalyzer;
