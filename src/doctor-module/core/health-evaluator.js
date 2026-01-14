/**
 * 🏥 건강 평가기 (Health Evaluator)
 * 
 * 신체 측정 데이터를 기반으로 건강 상태 평가
 * - BMI 및 체형 분석
 * - 신체 비율 분석 (WHR, Shoulder-Waist, etc.)
 * - 호르몬 수치 평가
 * - 모드별 여성화/남성화 점수 계산
 */

// ========================================
// 1. 건강 평가기 클래스
// ========================================

export class HealthEvaluator {
  constructor(measurements, mode, biologicalSex = 'male') {
    this.measurements = measurements;
    this.mode = mode;
    this.biologicalSex = biologicalSex;
  }
  
  // ========================================
  // 2. 전체 건강 평가
  // ========================================
  
  /**
   * 전체 건강 상태 평가
   */
  evaluateAll() {
    if (this.measurements.length === 0) {
      return {
        message: 'No data to evaluate.',
        bmi: null,
        bodyRatios: {},
        hormones: {},
        transformationScore: null
      };
    }
    
    const latest = this.measurements[this.measurements.length - 1];
    
    return {
      bmi: this.calculateBMI(latest),
      bodyRatios: this.analyzeBodyRatios(latest),
      bodyComposition: this.analyzeBodyComposition(latest),
      hormones: this.evaluateHormones(latest),
      transformationScore: this.calculateTransformationScore(latest)
    };
  }
  
  // ========================================
  // 3. BMI 계산 및 평가
  // ========================================
  
  /**
   * BMI 계산
   */
  calculateBMI(measurement) {
    if (!measurement.height || !measurement.weight) {
      return null;
    }
    
    const heightM = measurement.height / 100;
    const bmi = measurement.weight / (heightM * heightM);
    
    let category = '';
    let healthStatus = '';
    
    if (bmi < 18.5) {
      category = 'underweight';
      healthStatus = '저체중';
    } else if (bmi < 23) { // 아시아 기준
      category = 'normal';
      healthStatus = '정상';
    } else if (bmi < 25) {
      category = 'overweight';
      healthStatus = '과체중';
    } else if (bmi < 30) {
      category = 'obese_1';
      healthStatus = '비만 1단계';
    } else {
      category = 'obese_2';
      healthStatus = '비만 2단계';
    }
    
    return {
      value: bmi.toFixed(1),
      category,
      healthStatus,
      recommendation: this.getBMIRecommendation(category)
    };
  }
  
  /**
   * BMI 기반 권장사항
   */
  getBMIRecommendation(category) {
    switch (category) {
      case 'underweight':
        return '체중 증가를 위해 칼로리 섭취를 늘리고 근력 운동을 하세요.';
      case 'normal':
        return '건강한 체중입니다. 현재 생활 습관을 유지하세요.';
      case 'overweight':
      case 'obese_1':
        return '체중 감량을 위해 유산소 운동과 식단 조절이 필요합니다.';
      case 'obese_2':
        return '건강을 위해 체중 감량이 필요합니다. 의사와 상담하세요.';
      default:
        return '';
    }
  }
  
  // ========================================
  // 4. 신체 비율 분석
  // ========================================
  
  /**
   * 신체 비율 종합 분석
   */
  analyzeBodyRatios(measurement) {
    const ratios = {};
    
    // WHR (Waist-Hip Ratio)
    if (measurement.waist && measurement.hips) {
      ratios.whr = this.calculateWHR(measurement.waist, measurement.hips);
    }
    
    // Shoulder-Waist Ratio
    if (measurement.shoulder && measurement.waist) {
      ratios.shoulderWaist = this.calculateShoulderWaistRatio(measurement.shoulder, measurement.waist);
    }
    
    // Chest-Waist Ratio
    if (measurement.chest && measurement.waist) {
      ratios.chestWaist = this.calculateChestWaistRatio(measurement.chest, measurement.waist);
    }
    
    // Cup Size Difference (for MTF)
    if (measurement.cupSize && measurement.chest) {
      ratios.cupDifference = this.calculateCupSizeDifference(measurement.cupSize, measurement.chest);
    }
    
    return ratios;
  }
  
  /**
   * WHR (Waist-Hip Ratio) 계산
   */
  calculateWHR(waist, hips) {
    const ratio = waist / hips;
    
    let category = '';
    let femininity = 0;
    let healthRisk = 'low';
    
    // 여성적 vs 남성적
    if (this.mode === 'mtf') {
      if (ratio < 0.75) {
        category = 'very_feminine';
        femininity = 100;
        healthRisk = 'low';
      } else if (ratio < 0.80) {
        category = 'feminine';
        femininity = 80;
        healthRisk = 'low';
      } else if (ratio < 0.85) {
        category = 'neutral';
        femininity = 50;
        healthRisk = 'moderate';
      } else {
        category = 'masculine';
        femininity = 20;
        healthRisk = 'high';
      }
    } else if (this.mode === 'ftm') {
      if (ratio > 0.95) {
        category = 'very_masculine';
        femininity = 0;
      } else if (ratio > 0.90) {
        category = 'masculine';
        femininity = 20;
      } else if (ratio > 0.85) {
        category = 'neutral';
        femininity = 50;
      } else {
        category = 'feminine';
        femininity = 80;
      }
      healthRisk = 'low'; // FTM은 건강 위험이 낮아짐
    } else {
      // Non-binary
      if (ratio < 0.85) {
        category = 'balanced_feminine';
        femininity = 60;
      } else if (ratio < 0.90) {
        category = 'balanced';
        femininity = 50;
      } else {
        category = 'balanced_masculine';
        femininity = 40;
      }
      healthRisk = 'low';
    }
    
    return {
      value: ratio.toFixed(3),
      category,
      femininity,
      healthRisk,
      evaluation: this.getWHREvaluation(category, this.mode),
      target: this.getWHRTarget(this.mode)
    };
  }
  
  getWHREvaluation(category, mode) {
    if (mode === 'mtf') {
      switch (category) {
        case 'very_feminine':
          return '🎉 매우 여성적인 체형입니다!';
        case 'feminine':
          return '✨ 여성적인 체형입니다.';
        case 'neutral':
          return '진행 중 - 더 여성적인 체형을 위해 노력하세요.';
        case 'masculine':
          return '아직 남성적 체형입니다. 꾸준한 노력이 필요합니다.';
      }
    } else if (mode === 'ftm') {
      switch (category) {
        case 'very_masculine':
          return '🎉 매우 남성적인 체형입니다!';
        case 'masculine':
          return '✨ 남성적인 체형입니다.';
        case 'neutral':
          return '진행 중 - 더 남성적인 체형을 위해 노력하세요.';
        case 'feminine':
          return '아직 여성적 체형입니다. 꾸준한 노력이 필요합니다.';
      }
    }
    return '균형 잡힌 체형입니다.';
  }
  
  getWHRTarget(mode) {
    if (mode === 'mtf') {
      return '< 0.80 (여성적 곡선)';
    } else if (mode === 'ftm') {
      return '> 0.90 (남성적 직선)';
    }
    return '0.85 (중성)';
  }
  
  /**
   * Shoulder-Waist Ratio 계산
   */
  calculateShoulderWaistRatio(shoulder, waist) {
    const ratio = shoulder / waist;
    
    let category = '';
    let masculinity = 0;
    
    if (this.mode === 'ftm') {
      if (ratio > 1.45) {
        category = 'very_masculine';
        masculinity = 100;
      } else if (ratio > 1.35) {
        category = 'masculine';
        masculinity = 80;
      } else if (ratio > 1.25) {
        category = 'neutral';
        masculinity = 50;
      } else {
        category = 'feminine';
        masculinity = 20;
      }
    } else if (this.mode === 'mtf') {
      if (ratio < 1.25) {
        category = 'very_feminine';
        masculinity = 0;
      } else if (ratio < 1.35) {
        category = 'feminine';
        masculinity = 20;
      } else if (ratio < 1.45) {
        category = 'neutral';
        masculinity = 50;
      } else {
        category = 'masculine';
        masculinity = 80;
      }
    } else {
      category = 'balanced';
      masculinity = 50;
    }
    
    return {
      value: ratio.toFixed(2),
      category,
      masculinity,
      evaluation: this.getShoulderWaistEvaluation(category, this.mode),
      target: this.getShoulderWaistTarget(this.mode)
    };
  }
  
  getShoulderWaistEvaluation(category, mode) {
    if (mode === 'ftm') {
      switch (category) {
        case 'very_masculine':
          return '🎉 매우 넓은 어깨! V자 체형 완성!';
        case 'masculine':
          return '✨ 남성적인 어깨입니다.';
        case 'neutral':
          return '진행 중 - 어깨 운동을 늘리세요.';
        case 'feminine':
          return '아직 어깨가 좁습니다. 숄더 프레스를 하세요.';
      }
    } else if (mode === 'mtf') {
      switch (category) {
        case 'very_feminine':
          return '🎉 여성적인 어깨 비율입니다!';
        case 'feminine':
          return '✨ 좋은 비율입니다.';
        case 'neutral':
          return '진행 중 - 허리를 줄이는 데 집중하세요.';
        case 'masculine':
          return '어깨가 넓습니다. 허리 감소 운동이 필요합니다.';
      }
    }
    return '균형 잡힌 비율입니다.';
  }
  
  getShoulderWaistTarget(mode) {
    if (mode === 'ftm') {
      return '> 1.40 (V자 체형)';
    } else if (mode === 'mtf') {
      return '< 1.30 (부드러운 곡선)';
    }
    return '~1.35';
  }
  
  /**
   * Chest-Waist Ratio 계산 (상체 비율)
   */
  calculateChestWaistRatio(chest, waist) {
    const ratio = chest / waist;
    
    let category = '';
    
    if (ratio > 1.35) {
      category = 'v_shape'; // 남성적 V자
    } else if (ratio > 1.25) {
      category = 'athletic';
    } else if (ratio > 1.15) {
      category = 'balanced';
    } else {
      category = 'straight'; // 여성적 직선
    }
    
    return {
      value: ratio.toFixed(2),
      category,
      evaluation: `가슴-허리 비율: ${ratio.toFixed(2)}`
    };
  }
  
  /**
   * Cup Size Difference (MTF 가슴 발달 평가)
   */
  calculateCupSizeDifference(cupSize, chest) {
    const diff = cupSize - chest;
    
    let cupCategory = '';
    if (diff < 5) {
      cupCategory = 'AA';
    } else if (diff < 7.5) {
      cupCategory = 'A';
    } else if (diff < 10) {
      cupCategory = 'B';
    } else if (diff < 12.5) {
      cupCategory = 'C';
    } else if (diff < 15) {
      cupCategory = 'D';
    } else {
      cupCategory = 'DD+';
    }
    
    return {
      difference: diff.toFixed(1),
      estimatedCup: cupCategory,
      evaluation: this.mode === 'mtf' 
        ? `추정 컵 사이즈: ${cupCategory}`
        : null
    };
  }
  
  // ========================================
  // 5. 체성분 분석
  // ========================================
  
  /**
   * 근육량 및 체지방률 분석
   */
  analyzeBodyComposition(measurement) {
    const analysis = {};
    
    // 근육량 평가
    if (measurement.muscleMass && measurement.weight) {
      const musclePercentage = (measurement.muscleMass / measurement.weight) * 100;
      
      let muscleCategory = '';
      if (this.mode === 'ftm') {
        if (musclePercentage > 50) {
          muscleCategory = 'very_high';
        } else if (musclePercentage > 45) {
          muscleCategory = 'high';
        } else if (musclePercentage > 40) {
          muscleCategory = 'normal';
        } else {
          muscleCategory = 'low';
        }
      } else if (this.mode === 'mtf') {
        if (musclePercentage > 45) {
          muscleCategory = 'very_high';
        } else if (musclePercentage > 40) {
          muscleCategory = 'high';
        } else if (musclePercentage > 35) {
          muscleCategory = 'normal';
        } else {
          muscleCategory = 'low';
        }
      } else {
        muscleCategory = musclePercentage > 40 ? 'normal' : 'low';
      }
      
      analysis.muscleMass = {
        value: measurement.muscleMass.toFixed(1),
        percentage: musclePercentage.toFixed(1),
        category: muscleCategory,
        evaluation: this.getMuscleMassEvaluation(muscleCategory, this.mode)
      };
    }
    
    // 체지방률 평가
    if (measurement.bodyFatPercentage) {
      let fatCategory = '';
      let healthStatus = '';
      
      if (this.mode === 'mtf') {
        if (measurement.bodyFatPercentage < 20) {
          fatCategory = 'too_low';
          healthStatus = '여성화를 위해 체지방률을 높이는 것이 좋습니다.';
        } else if (measurement.bodyFatPercentage < 25) {
          fatCategory = 'optimal';
          healthStatus = '✅ 이상적인 체지방률입니다!';
        } else if (measurement.bodyFatPercentage < 32) {
          fatCategory = 'good';
          healthStatus = '여성적 체형에 적합합니다.';
        } else {
          fatCategory = 'high';
          healthStatus = '건강을 위해 체지방 감소가 필요할 수 있습니다.';
        }
      } else if (this.mode === 'ftm') {
        if (measurement.bodyFatPercentage < 10) {
          fatCategory = 'very_low';
          healthStatus = '⚠️ 너무 낮습니다. 건강에 주의하세요.';
        } else if (measurement.bodyFatPercentage < 15) {
          fatCategory = 'optimal';
          healthStatus = '✅ 이상적인 남성적 체지방률입니다!';
        } else if (measurement.bodyFatPercentage < 20) {
          fatCategory = 'good';
          healthStatus = '좋은 범위입니다.';
        } else {
          fatCategory = 'high';
          healthStatus = '체지방 감소가 필요합니다.';
        }
      } else {
        if (measurement.bodyFatPercentage < 16 || measurement.bodyFatPercentage > 24) {
          fatCategory = 'outside_range';
          healthStatus = '균형 잡힌 범위를 벗어났습니다.';
        } else {
          fatCategory = 'balanced';
          healthStatus = '✅ 균형 잡힌 체지방률입니다.';
        }
      }
      
      analysis.bodyFat = {
        value: measurement.bodyFatPercentage.toFixed(1),
        category: fatCategory,
        healthStatus,
        target: this.getBodyFatTarget(this.mode)
      };
    }
    
    return analysis;
  }
  
  getMuscleMassEvaluation(category, mode) {
    if (mode === 'ftm') {
      switch (category) {
        case 'very_high':
          return '💪 매우 높은 근육량!';
        case 'high':
          return '✨ 좋은 근육량입니다.';
        case 'normal':
          return '보통 수준입니다.';
        case 'low':
          return '근육량이 부족합니다. 근력 운동을 늘리세요.';
      }
    } else if (mode === 'mtf') {
      switch (category) {
        case 'very_high':
          return '근육량이 매우 높습니다. 과도한 운동은 피하세요.';
        case 'high':
          return '약간 높습니다.';
        case 'normal':
          return '✨ 적절한 수준입니다.';
        case 'low':
          return '⚠️ 근육량이 너무 낮습니다. 건강을 위해 약간의 근력 운동이 필요합니다.';
      }
    }
    return '보통 수준입니다.';
  }
  
  getBodyFatTarget(mode) {
    if (mode === 'mtf') {
      return '20-28% (여성 범위)';
    } else if (mode === 'ftm') {
      return '10-18% (남성 범위)';
    }
    return '16-24%';
  }
  
  // ========================================
  // 6. 호르몬 평가
  // ========================================
  
  /**
   * 호르몬 수치 평가
   */
  evaluateHormones(measurement) {
    const evaluation = {};
    
    if (this.mode === 'mtf') {
      // 에스트로겐
      if (measurement.estrogenLevel) {
        const eLevel = parseFloat(measurement.estrogenLevel);
        let status = '';
        let recommendation = '';
        
        if (eLevel < 100) {
          status = 'too_low';
          recommendation = '에스트라디올 증량 고려';
        } else if (eLevel < 200) {
          status = 'optimal';
          recommendation = '이상적인 범위입니다 ✅';
        } else if (eLevel < 300) {
          status = 'high';
          recommendation = '약간 높습니다. 혈전 위험 주의';
        } else {
          status = 'too_high';
          recommendation = '⚠️ 위험 수준. 즉시 의사 상담';
        }
        
        evaluation.estrogen = {
          value: eLevel,
          status,
          targetRange: '100-200 pg/ml',
          recommendation
        };
      }
      
      // 테스토스테론
      if (measurement.testosteroneLevel) {
        const tLevel = parseFloat(measurement.testosteroneLevel);
        let status = '';
        let recommendation = '';
        
        if (tLevel < 20) {
          status = 'very_low';
          recommendation = '⚠️ 너무 낮습니다. 피로감 주의';
        } else if (tLevel < 50) {
          status = 'optimal';
          recommendation = '이상적인 범위입니다 ✅';
        } else if (tLevel < 100) {
          status = 'moderate';
          recommendation = '억제가 부족합니다. 항안드로겐 조정 고려';
        } else {
          status = 'too_high';
          recommendation = '⚠️ 억제 실패. 항안드로겐 증량 필요';
        }
        
        evaluation.testosterone = {
          value: tLevel,
          status,
          targetRange: '< 50 ng/ml',
          recommendation
        };
      }
      
    } else if (this.mode === 'ftm') {
      // 테스토스테론
      if (measurement.testosteroneLevel) {
        const tLevel = parseFloat(measurement.testosteroneLevel);
        let status = '';
        let recommendation = '';
        
        if (tLevel < 300) {
          status = 'too_low';
          recommendation = '테스토스테론 증량 필요';
        } else if (tLevel < 700) {
          status = 'optimal';
          recommendation = '이상적인 범위입니다 ✅';
        } else if (tLevel < 1000) {
          status = 'high';
          recommendation = '약간 높습니다. 부작용 주의';
        } else {
          status = 'too_high';
          recommendation = '⚠️ 위험 수준. 즉시 의사 상담';
        }
        
        evaluation.testosterone = {
          value: tLevel,
          status,
          targetRange: '300-700 ng/ml',
          recommendation
        };
      }
      
      // 에스트로겐
      if (measurement.estrogenLevel) {
        const eLevel = parseFloat(measurement.estrogenLevel);
        let status = '';
        let recommendation = '';
        
        if (eLevel < 30) {
          status = 'optimal';
          recommendation = '이상적으로 억제되었습니다 ✅';
        } else if (eLevel < 50) {
          status = 'moderate';
          recommendation = '약간 높습니다';
        } else {
          status = 'too_high';
          recommendation = 'AI (아로마타제 억제제) 고려';
        }
        
        evaluation.estrogen = {
          value: eLevel,
          status,
          targetRange: '< 30 pg/ml',
          recommendation
        };
      }
    }
    
    return evaluation;
  }
  
  // ========================================
  // 7. 변환 점수 계산
  // ========================================
  
  /**
   * 전체 여성화/남성화 점수 (0-100)
   */
  calculateTransformationScore(measurement) {
    if (this.mode === 'nonbinary') {
      return this.calculateNonBinaryScore(measurement);
    }
    
    let totalScore = 0;
    let factors = 0;
    
    // 신체 비율 (40점)
    const ratios = this.analyzeBodyRatios(measurement);
    
    if (ratios.whr) {
      if (this.mode === 'mtf') {
        totalScore += (ratios.whr.femininity * 0.3); // 30점
      } else {
        totalScore += ((100 - ratios.whr.femininity) * 0.3); // 30점
      }
      factors += 30;
    }
    
    if (ratios.shoulderWaist) {
      if (this.mode === 'ftm') {
        totalScore += (ratios.shoulderWaist.masculinity * 0.1); // 10점
      } else {
        totalScore += ((100 - ratios.shoulderWaist.masculinity) * 0.1); // 10점
      }
      factors += 10;
    }
    
    // 체성분 (20점)
    const composition = this.analyzeBodyComposition(measurement);
    
    if (composition.bodyFat) {
      const bfp = parseFloat(composition.bodyFat.value);
      
      if (this.mode === 'mtf') {
        // MTF: 20-28% 이상적
        if (bfp >= 20 && bfp <= 28) {
          totalScore += 20;
        } else if (bfp > 28) {
          totalScore += 15;
        } else {
          totalScore += 10;
        }
      } else if (this.mode === 'ftm') {
        // FTM: 10-18% 이상적
        if (bfp >= 10 && bfp <= 18) {
          totalScore += 20;
        } else if (bfp < 10) {
          totalScore += 15;
        } else if (bfp < 22) {
          totalScore += 10;
        } else {
          totalScore += 5;
        }
      }
      factors += 20;
    }
    
    // 호르몬 수치 (40점)
    const hormones = this.evaluateHormones(measurement);
    
    if (this.mode === 'mtf') {
      if (hormones.estrogen) {
        if (hormones.estrogen.status === 'optimal') {
          totalScore += 20;
        } else if (hormones.estrogen.status === 'high') {
          totalScore += 15;
        } else {
          totalScore += 5;
        }
        factors += 20;
      }
      
      if (hormones.testosterone) {
        if (hormones.testosterone.status === 'optimal') {
          totalScore += 20;
        } else if (hormones.testosterone.status === 'very_low') {
          totalScore += 15;
        } else {
          totalScore += 5;
        }
        factors += 20;
      }
    } else if (this.mode === 'ftm') {
      if (hormones.testosterone) {
        if (hormones.testosterone.status === 'optimal') {
          totalScore += 30;
        } else if (hormones.testosterone.status === 'high') {
          totalScore += 20;
        } else {
          totalScore += 5;
        }
        factors += 30;
      }
      
      if (hormones.estrogen) {
        if (hormones.estrogen.status === 'optimal') {
          totalScore += 10;
        } else {
          totalScore += 5;
        }
        factors += 10;
      }
    }
    
    // 최종 점수 (0-100)
    const finalScore = factors > 0 ? (totalScore / factors) * 100 : 0;
    
    return {
      score: finalScore.toFixed(1),
      category: this.getScoreCategory(finalScore),
      message: this.getScoreMessage(finalScore, this.mode),
      breakdown: {
        bodyRatios: ratios,
        bodyComposition: composition,
        hormones: hormones
      }
    };
  }
  
  /**
   * 논바이너리 점수 계산
   */
  calculateNonBinaryScore(measurement) {
    let balanceScore = 0;
    let factors = 0;
    
    // 균형 잡힌 체형 평가
    const ratios = this.analyzeBodyRatios(measurement);
    
    if (ratios.whr) {
      const whrValue = parseFloat(ratios.whr.value);
      // 0.80-0.90 사이가 중성적
      if (whrValue >= 0.80 && whrValue <= 0.90) {
        balanceScore += 30;
      } else {
        balanceScore += 30 - Math.abs(0.85 - whrValue) * 100;
      }
      factors += 30;
    }
    
    // 체성분 균형
    const composition = this.analyzeBodyComposition(measurement);
    if (composition.bodyFat) {
      const bfp = parseFloat(composition.bodyFat.value);
      // 16-24% 사이가 중성적
      if (bfp >= 16 && bfp <= 24) {
        balanceScore += 20;
      } else {
        balanceScore += 20 - Math.abs(20 - bfp) * 2;
      }
      factors += 20;
    }
    
    const finalScore = factors > 0 ? (balanceScore / factors) * 100 : 0;
    
    return {
      score: finalScore.toFixed(1),
      category: 'balanced',
      message: `균형 점수: ${finalScore.toFixed(0)}/100`,
      note: '논바이너리 모드는 균형 잡힌 중성적 체형을 목표로 합니다.'
    };
  }
  
  getScoreCategory(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'progressing';
    if (score >= 20) return 'early';
    return 'just_started';
  }
  
  getScoreMessage(score, mode) {
    const direction = mode === 'mtf' ? '여성화' : '남성화';
    
    if (score >= 80) {
      return `🎉 훌륭합니다! ${direction} 진행이 매우 잘 되고 있습니다!`;
    } else if (score >= 60) {
      return `✨ 좋습니다! ${direction}가 순조롭게 진행 중입니다.`;
    } else if (score >= 40) {
      return `📈 진행 중입니다. 꾸준히 노력하세요!`;
    } else if (score >= 20) {
      return `🌱 초기 단계입니다. 시간이 필요합니다.`;
    } else {
      return `시작 단계입니다. 인내심을 가지고 꾸준히 관리하세요.`;
    }
  }
}

// ========================================
// 8. Export
// ========================================

export default HealthEvaluator;
