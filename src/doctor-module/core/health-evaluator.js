/**
 * Health Evaluator
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
  constructor(measurements, mode, biologicalSex = 'male', language = 'ko') {
    this.measurements = measurements;
    this.mode = mode;
    this.biologicalSex = biologicalSex;
    this.language = language || 'ko';
  }

  _t(texts, params = {}) {
    const lang = this.language || 'ko';
    let text = (texts && (texts[lang] || texts.ko)) || '';
    Object.keys(params).forEach(k => {
      text = text.replaceAll(`{${k}}`, String(params[k]));
    });
    return text;
  }

  normalizeUnit(metric, value, fromUnit) {
    if (value === null || value === undefined || value === '') return null;
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (Number.isNaN(num)) return null;

    const unit = (fromUnit || '').toString().trim().toLowerCase();

    const round = (n, decimals) => {
      if (n === null || n === undefined || Number.isNaN(n)) return null;
      const factor = Math.pow(10, decimals);
      return Math.round(n * factor) / factor;
    };

    const decimalsByMetric = {
      estrogenLevel: 1,
      testosteroneLevel: 1,
      weight: 2,
      height: 1
    };
    const decimals = decimalsByMetric[metric] ?? 2;

    let normalized = num;

    if (metric === 'testosteroneLevel') {
      // Standard: ng/dL
      if (unit === 'nmol/l') {
        normalized = num * 28.85;
      } else if (unit === 'ng/ml') {
        normalized = num * 100;
      } else if (unit === 'ng/dl' || unit === 'ng/dl.') {
        normalized = num;
      }

      return round(normalized, decimals);
    }

    if (metric === 'estrogenLevel') {
      // Standard: pg/mL
      if (unit === 'pmol/l') {
        normalized = num * 0.2724;
      } else if (unit === 'ng/ml') {
        normalized = num * 1000;
      } else if (unit === 'pg/ml' || unit === 'pg/ml.') {
        normalized = num;
      }

      return round(normalized, decimals);
    }

    if (metric === 'weight') {
      // Standard: kg
      if (unit === 'lbs' || unit === 'lb' || unit === 'pound' || unit === 'pounds') {
        normalized = num * 0.45359237;
      } else if (unit === 'kg') {
        normalized = num;
      }

      return round(normalized, decimals);
    }

    if (metric === 'height') {
      // Standard: cm
      if (unit === 'm') {
        normalized = num * 100;
      } else if (unit === 'in' || unit === 'inch' || unit === 'inches') {
        normalized = num * 2.54;
      } else if (unit === 'cm') {
        normalized = num;
      }

      return round(normalized, decimals);
    }

    return round(normalized, decimals);
  }

  /*
   * Example: input processing (UI -> 저장)
   *
   * const evaluator = new HealthEvaluator(measurements, mode, biologicalSex);
   * const normalizedE2 = evaluator.normalizeUnit('estrogenLevel', rawEstrogenValue, estrogenUnit); // 'pmol/L' -> 표준 pg/mL
   * const normalizedT  = evaluator.normalizeUnit('testosteroneLevel', rawTestosteroneValue, testosteroneUnit); // 'nmol/L' -> 표준 ng/dL
   * const normalizedWt = evaluator.normalizeUnit('weight', rawWeightValue, weightUnit); // 'lbs' -> 표준 kg
   *
   * measurement.estrogenLevel = normalizedE2;
   * measurement.testosteroneLevel = normalizedT;
   * measurement.weight = normalizedWt;
   */

  /*
   * Example: DoctorEngine 측(분석 시작 전)에서 방어적으로 정규화
   *
   * // const latest = measurements[measurements.length - 1];
   * // latest.estrogenLevel = this.healthEvaluator.normalizeUnit('estrogenLevel', latest.estrogenLevel, latest.estrogenUnit);
   * // latest.testosteroneLevel = this.healthEvaluator.normalizeUnit('testosteroneLevel', latest.testosteroneLevel, latest.testosteroneUnit);
   */
  
  // ========================================
  // 2. 전체 건강 평가
  // ========================================
  
  /**
   * 전체 건강 상태 평가
   */
  evaluateAll() {
    if (this.measurements.length === 0) {
      return {
        message: this._t({
          ko: '평가할 데이터가 없습니다.',
          en: 'No data to evaluate.',
          ja: '評価できるデータがありません。'
        }),
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
      healthStatus = this._t({ ko: '저체중', en: 'Underweight', ja: '低体重' });
    } else if (bmi < 23) { // 아시아 기준
      category = 'normal';
      healthStatus = this._t({ ko: '정상', en: 'Normal', ja: '正常' });
    } else if (bmi < 25) {
      category = 'overweight';
      healthStatus = this._t({ ko: '과체중', en: 'Overweight', ja: '過体重' });
    } else if (bmi < 30) {
      category = 'obese_1';
      healthStatus = this._t({ ko: '비만 1단계', en: 'Obese (Class I)', ja: '肥満 1段階' });
    } else {
      category = 'obese_2';
      healthStatus = this._t({ ko: '비만 2단계', en: 'Obese (Class II)', ja: '肥満 2段階' });
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
        return this._t({
          ko: '체중 증가를 위해 칼로리 섭취를 늘리고 근력 운동을 하세요.',
          en: 'To gain weight, increase calorie intake and do strength training.',
          ja: '体重を増やすために、摂取カロリーを増やし筋力トレーニングを行いましょう。'
        });
      case 'normal':
        return this._t({
          ko: '건강한 체중입니다. 현재 생활 습관을 유지하세요.',
          en: 'Healthy weight. Keep your current lifestyle habits.',
          ja: '健康的な体重です。現在の生活習慣を維持しましょう。'
        });
      case 'overweight':
      case 'obese_1':
        return this._t({
          ko: '체중 감량을 위해 유산소 운동과 식단 조절이 필요합니다.',
          en: 'For weight loss, aerobic exercise and dietary adjustments are recommended.',
          ja: '減量のために、有酸素運動と食事調整が必要です。'
        });
      case 'obese_2':
        return this._t({
          ko: '건강을 위해 체중 감량이 필요합니다. 의사와 상담하세요.',
          en: 'Weight loss is recommended for your health. Consult a doctor.',
          ja: '健康のために減量が必要です。医師に相談してください。'
        });
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
    const upperChest = measurement?.upperChest ?? measurement?.chest;
    
    // WHR (Waist-Hip Ratio)
    if (measurement.waist && measurement.hips) {
      ratios.whr = this.calculateWHR(measurement.waist, measurement.hips);
    }
    
    // Shoulder-Waist Ratio
    if (measurement.shoulder && measurement.waist) {
      ratios.shoulderWaist = this.calculateShoulderWaistRatio(measurement.shoulder, measurement.waist);
    }
    
    // Chest-Waist Ratio
    if (upperChest && measurement.waist) {
      ratios.chestWaist = this.calculateChestWaistRatio(upperChest, measurement.waist);
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
          return this._t({ ko: '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> 매우 여성적인 체형입니다!', en: '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> Very feminine body shape!', ja: '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> とても女性的な体型です！' });
        case 'feminine':
          return this._t({ ko: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 여성적인 체형입니다.', en: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> Feminine body shape.', ja: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 女性的な体型です。' });
        case 'neutral':
          return this._t({
            ko: '진행 중 - 더 여성적인 체형을 위해 노력하세요.',
            en: 'In progress — keep working toward a more feminine shape.',
            ja: '進行中 — より女性的な体型を目指して続けましょう。'
          });
        case 'masculine':
          return this._t({
            ko: '아직 남성적 체형입니다. 꾸준한 노력이 필요합니다.',
            en: 'Still a masculine shape. Consistent effort is needed.',
            ja: 'まだ男性的な体型です。継続的な努力が必要です。'
          });
      }
    } else if (mode === 'ftm') {
      switch (category) {
        case 'very_masculine':
          return this._t({ ko: '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> 매우 남성적인 체형입니다!', en: '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> Very masculine body shape!', ja: '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> とても男性的な体型です！' });
        case 'masculine':
          return this._t({ ko: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 남성적인 체형입니다.', en: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> Masculine body shape.', ja: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 男性的な体型です。' });
        case 'neutral':
          return this._t({
            ko: '진행 중 - 더 남성적인 체형을 위해 노력하세요.',
            en: 'In progress — keep working toward a more masculine shape.',
            ja: '進行中 — より男性的な体型を目指して続けましょう。'
          });
        case 'feminine':
          return this._t({
            ko: '아직 여성적 체형입니다. 꾸준한 노력이 필요합니다.',
            en: 'Still a feminine shape. Consistent effort is needed.',
            ja: 'まだ女性的な体型です。継続的な努力が必要です。'
          });
      }
    }
    return this._t({ ko: '균형 잡힌 체형입니다.', en: 'Balanced body shape.', ja: 'バランスの取れた体型です。' });
  }
  
  getWHRTarget(mode) {
    if (mode === 'mtf') {
      return this._t({ ko: '< 0.80 (여성적 곡선)', en: '< 0.80 (feminine curve)', ja: '< 0.80（女性的な曲線）' });
    } else if (mode === 'ftm') {
      return this._t({ ko: '> 0.90 (남성적 직선)', en: '> 0.90 (masculine straight)', ja: '> 0.90（男性的な直線）' });
    }
    return this._t({ ko: '0.85 (중성)', en: '0.85 (neutral)', ja: '0.85（中性）' });
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
          return this._t({
            ko: '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> 매우 넓은 어깨! V자 체형 완성!',
            en: '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> Very broad shoulders! V-shape achieved!',
            ja: '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> とても広い肩幅！V字体型の完成！'
          });
        case 'masculine':
          return this._t({ ko: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 남성적인 어깨입니다.', en: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> Masculine shoulders.', ja: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 男性的な肩です。' });
        case 'neutral':
          return this._t({
            ko: '진행 중 - 어깨 운동을 늘리세요.',
            en: 'In progress — increase shoulder training.',
            ja: '進行中 — 肩のトレーニングを増やしましょう。'
          });
        case 'feminine':
          return this._t({
            ko: '아직 어깨가 좁습니다. 숄더 프레스를 하세요.',
            en: 'Shoulders are still narrow. Try shoulder presses.',
            ja: 'まだ肩が狭いです。ショルダープレスを行いましょう。'
          });
      }
    } else if (mode === 'mtf') {
      switch (category) {
        case 'very_feminine':
          return this._t({ ko: '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> 여성적인 어깨 비율입니다!', en: '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> Feminine shoulder ratio!', ja: '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> 女性的な肩の比率です！' });
        case 'feminine':
          return this._t({ ko: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 좋은 비율입니다.', en: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> Great ratio.', ja: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 良い比率です。' });
        case 'neutral':
          return this._t({
            ko: '진행 중 - 허리를 줄이는 데 집중하세요.',
            en: 'In progress — focus on reducing waist size.',
            ja: '進行中 — ウエストを細くすることに集中しましょう。'
          });
        case 'masculine':
          return this._t({
            ko: '어깨가 넓습니다. 허리 감소 운동이 필요합니다.',
            en: 'Shoulders are broad. Waist-focused training may help.',
            ja: '肩が広いです。ウエストを絞る運動が役立ちます。'
          });
      }
    }
    return this._t({ ko: '균형 잡힌 비율입니다.', en: 'Balanced ratio.', ja: 'バランスの取れた比率です。' });
  }
  
  getShoulderWaistTarget(mode) {
    if (mode === 'ftm') {
      return this._t({ ko: '> 1.40 (V자 체형)', en: '> 1.40 (V-shape)', ja: '> 1.40（V字体型）' });
    } else if (mode === 'mtf') {
      return this._t({ ko: '< 1.30 (부드러운 곡선)', en: '< 1.30 (soft curve)', ja: '< 1.30（柔らかい曲線）' });
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
      evaluation: this._t(
        { ko: '가슴-허리 비율: {value}', en: 'Chest–waist ratio: {value}', ja: '胸-ウエスト比: {value}' },
        { value: ratio.toFixed(2) }
      )
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
          healthStatus = this._t({
            ko: '여성화를 위해 체지방률을 높이는 것이 좋습니다.',
            en: 'Increasing body fat percentage may support feminization.',
            ja: '女性化のために体脂肪率を少し上げるのが望ましいです。'
          });
        } else if (measurement.bodyFatPercentage < 25) {
          fatCategory = 'optimal';
          healthStatus = this._t({ ko: '[OK] 이상적인 체지방률입니다!', en: '[OK] Ideal body fat percentage!', ja: '[OK] 理想的な体脂肪率です！' });
        } else if (measurement.bodyFatPercentage < 32) {
          fatCategory = 'good';
          healthStatus = this._t({ ko: '여성적 체형에 적합합니다.', en: 'Suitable for a feminine body shape.', ja: '女性的な体型に適しています。' });
        } else {
          fatCategory = 'high';
          healthStatus = this._t({
            ko: '건강을 위해 체지방 감소가 필요할 수 있습니다.',
            en: 'Reducing body fat may be beneficial for health.',
            ja: '健康のために体脂肪を減らす必要があるかもしれません。'
          });
        }
      } else if (this.mode === 'ftm') {
        if (measurement.bodyFatPercentage < 10) {
          fatCategory = 'very_low';
          healthStatus = this._t({ ko: '[WARN] 너무 낮습니다. 건강에 주의하세요.', en: '[WARN] Too low. Watch your health.', ja: '[WARN] 低すぎます。健康に注意してください。' });
        } else if (measurement.bodyFatPercentage < 15) {
          fatCategory = 'optimal';
          healthStatus = this._t({ ko: '[OK] 이상적인 남성적 체지방률입니다!', en: '[OK] Ideal male body fat percentage!', ja: '[OK] 理想的な男性の体脂肪率です！' });
        } else if (measurement.bodyFatPercentage < 20) {
          fatCategory = 'good';
          healthStatus = this._t({ ko: '좋은 범위입니다.', en: 'Good range.', ja: '良い範囲です。' });
        } else {
          fatCategory = 'high';
          healthStatus = this._t({ ko: '체지방 감소가 필요합니다.', en: 'Body fat reduction is recommended.', ja: '体脂肪を減らす必要があります。' });
        }
      } else {
        if (measurement.bodyFatPercentage < 16 || measurement.bodyFatPercentage > 24) {
          fatCategory = 'outside_range';
          healthStatus = this._t({ ko: '균형 잡힌 범위를 벗어났습니다.', en: 'Outside the balanced range.', ja: 'バランス範囲から外れています。' });
        } else {
          fatCategory = 'balanced';
          healthStatus = this._t({ ko: '[OK] 균형 잡힌 체지방률입니다.', en: '[OK] Balanced body fat percentage.', ja: '[OK] バランスの取れた体脂肪率です。' });
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
          return this._t({ ko: '<span class="material-symbols-outlined mi-inline mi-sm">fitness_center</span> 매우 높은 근육량!', en: '<span class="material-symbols-outlined mi-inline mi-sm">fitness_center</span> Very high muscle mass!', ja: '<span class="material-symbols-outlined mi-inline mi-sm">fitness_center</span> とても高い筋肉量！' });
        case 'high':
          return this._t({ ko: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 좋은 근육량입니다.', en: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> Good muscle mass.', ja: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 良い筋肉量です。' });
        case 'normal':
          return this._t({ ko: '보통 수준입니다.', en: 'Average level.', ja: '普通のレベルです。' });
        case 'low':
          return this._t({
            ko: '근육량이 부족합니다. 근력 운동을 늘리세요.',
            en: 'Low muscle mass. Increase strength training.',
            ja: '筋肉量が不足しています。筋トレを増やしましょう。'
          });
      }
    } else if (mode === 'mtf') {
      switch (category) {
        case 'very_high':
          return this._t({
            ko: '근육량이 매우 높습니다. 과도한 운동은 피하세요.',
            en: 'Muscle mass is very high. Avoid excessive training.',
            ja: '筋肉量が非常に高いです。過度な運動は避けましょう。'
          });
        case 'high':
          return this._t({ ko: '약간 높습니다.', en: 'Slightly high.', ja: 'やや高めです。' });
        case 'normal':
          return this._t({ ko: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 적절한 수준입니다.', en: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> Appropriate level.', ja: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 適切なレベルです。' });
        case 'low':
          return this._t({
            ko: '<span class="material-symbols-outlined mi-inline mi-sm mi-warning">warning</span> 근육량이 너무 낮습니다. 건강을 위해 약간의 근력 운동이 필요합니다.',
            en: '<span class="material-symbols-outlined mi-inline mi-sm mi-warning">warning</span> Muscle mass is too low. Some strength training is recommended for health.',
            ja: '<span class="material-symbols-outlined mi-inline mi-sm mi-warning">warning</span> 筋肉量が低すぎます。健康のために軽い筋トレが推奨されます。'
          });
      }
    }
    return this._t({ ko: '보통 수준입니다.', en: 'Average level.', ja: '普通のレベルです。' });
  }
  
  getBodyFatTarget(mode) {
    if (mode === 'mtf') {
      return this._t({ ko: '20-28% (여성 범위)', en: '20–28% (female range)', ja: '20–28%（女性範囲）' });
    } else if (mode === 'ftm') {
      return this._t({ ko: '10-18% (남성 범위)', en: '10–18% (male range)', ja: '10–18%（男性範囲）' });
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
          recommendation = this._t({
            ko: '에스트라디올 증량 고려',
            en: 'Consider increasing estradiol dose',
            ja: 'エストラジオールの増量を検討'
          });
        } else if (eLevel < 200) {
          status = 'optimal';
          recommendation = this._t({ ko: '이상적인 범위입니다 [OK]', en: 'Ideal range [OK]', ja: '理想的な範囲です [OK]' });
        } else if (eLevel < 300) {
          status = 'high';
          recommendation = this._t({
            ko: '약간 높습니다. 혈전 위험 주의',
            en: 'Slightly high. Be cautious about clot risk.',
            ja: 'やや高めです。血栓リスクに注意。'
          });
        } else {
          status = 'too_high';
          recommendation = this._t({
            ko: '[WARN] 위험 수준. 즉시 의사 상담',
            en: '[WARN] Risk level. Consult a doctor immediately.',
            ja: '[WARN] 危険水準。直ちに医師に相談してください。'
          });
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
          recommendation = this._t({
            ko: '[WARN] 너무 낮습니다. 피로감 주의',
            en: '[WARN] Too low. Watch for fatigue.',
            ja: '[WARN] 低すぎます。疲労に注意。'
          });
        } else if (tLevel < 50) {
          status = 'optimal';
          recommendation = this._t({ ko: '이상적인 범위입니다 [OK]', en: 'Ideal range [OK]', ja: '理想的な範囲です [OK]' });
        } else if (tLevel < 100) {
          status = 'moderate';
          recommendation = this._t({
            ko: '억제가 부족합니다. 항안드로겐 조정 고려',
            en: 'Suppression is insufficient. Consider adjusting anti-androgens.',
            ja: '抑制が不十分です。抗アンドロゲンの調整を検討。'
          });
        } else {
          status = 'too_high';
          recommendation = this._t({
            ko: '[WARN] 억제 실패. 항안드로겐 증량 필요',
            en: '[WARN] Suppression failed. Increase anti-androgens may be needed.',
            ja: '[WARN] 抑制不十分。抗アンドロゲン増量が必要かもしれません。'
          });
        }
        
        evaluation.testosterone = {
          value: tLevel,
          status,
          targetRange: '< 50 ng/dL',
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
          recommendation = this._t({ ko: '테스토스테론 증량 필요', en: 'Increase testosterone dose may be needed', ja: 'テストステロン増量が必要' });
        } else if (tLevel < 700) {
          status = 'optimal';
          recommendation = this._t({ ko: '이상적인 범위입니다 [OK]', en: 'Ideal range [OK]', ja: '理想的な範囲です [OK]' });
        } else if (tLevel < 1000) {
          status = 'high';
          recommendation = this._t({
            ko: '약간 높습니다. 부작용 주의',
            en: 'Slightly high. Watch for side effects.',
            ja: 'やや高めです。副作用に注意。'
          });
        } else {
          status = 'too_high';
          recommendation = this._t({
            ko: '[WARN] 위험 수준. 즉시 의사 상담',
            en: '[WARN] Risk level. Consult a doctor immediately.',
            ja: '[WARN] 危険水準。直ちに医師に相談してください。'
          });
        }
        
        evaluation.testosterone = {
          value: tLevel,
          status,
          targetRange: '300-700 ng/dL',
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
          recommendation = this._t({ ko: '이상적으로 억제되었습니다 [OK]', en: 'Optimally suppressed [OK]', ja: '理想的に抑制されています [OK]' });
        } else if (eLevel < 50) {
          status = 'moderate';
          recommendation = this._t({ ko: '약간 높습니다', en: 'Slightly high', ja: 'やや高めです' });
        } else {
          status = 'too_high';
          recommendation = this._t({
            ko: 'AI (아로마타제 억제제) 고려',
            en: 'Consider an AI (aromatase inhibitor)',
            ja: 'AI（アロマターゼ阻害薬）を検討'
          });
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
      message: this._t(
        { ko: '균형 점수: {score}/100', en: 'Balance score: {score}/100', ja: 'バランススコア: {score}/100' },
        { score: finalScore.toFixed(0) }
      ),
      note: this._t({
        ko: '논바이너리 모드는 균형 잡힌 중성적 체형을 목표로 합니다.',
        en: 'Non-binary mode aims for a balanced, neutral body shape.',
        ja: 'ノンバイナリーモードは、バランスの取れた中性的な体型を目指します。'
      })
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
    const direction = mode === 'mtf'
      ? this._t({ ko: '여성화', en: 'feminization', ja: '女性化' })
      : this._t({ ko: '남성화', en: 'masculinization', ja: '男性化' });
    
    if (score >= 80) {
      return this._t(
        { ko: '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> 훌륭합니다! {direction} 진행이 매우 잘 되고 있습니다!', en: '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> Excellent! Your {direction} is going very well!', ja: '<span class="material-symbols-outlined mi-inline mi-sm mi-success">celebration</span> 素晴らしいです！{direction}の進行はとても順調です！' },
        { direction }
      );
    } else if (score >= 60) {
      return this._t(
        { ko: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 좋습니다! {direction}가 순조롭게 진행 중입니다.', en: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> Great! Your {direction} is progressing smoothly.', ja: '<span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> 良い感じです！{direction}は順調に進んでいます。' },
        { direction }
      );
    } else if (score >= 40) {
      return this._t({ ko: '<span class="material-symbols-outlined mi-inline mi-sm">trending_up</span> 진행 중입니다. 꾸준히 노력하세요!', en: '<span class="material-symbols-outlined mi-inline mi-sm">trending_up</span> In progress. Keep it up!', ja: '<span class="material-symbols-outlined mi-inline mi-sm">trending_up</span> 進行中です。継続して頑張りましょう！' });
    } else if (score >= 20) {
      return this._t({ ko: '<span class="material-symbols-outlined mi-inline mi-sm">spa</span> 초기 단계입니다. 시간이 필요합니다.', en: '<span class="material-symbols-outlined mi-inline mi-sm">spa</span> Early stage. It takes time.', ja: '<span class="material-symbols-outlined mi-inline mi-sm">spa</span> 初期段階です。時間が必要です。' });
    } else {
      return this._t({ ko: '시작 단계입니다. 인내심을 가지고 꾸준히 관리하세요.', en: 'Just getting started. Be patient and stay consistent.', ja: '開始段階です。焦らず継続して管理しましょう。' });
    }
  }
}

// ========================================
// 8. Export
// ========================================

export default HealthEvaluator;
