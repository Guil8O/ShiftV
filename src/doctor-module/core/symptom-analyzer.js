/**
 * Symptom Analyzer
 * 
 * 기록된 증상을 분석하여 건강 경고 및 인사이트 제공
 * - 증상 추세 분석
 * - 위험 증상 탐지
 * - 호르몬 부작용 분석
 * - 모드별 증상 해석
 */

import { SYMPTOM_DATABASE } from '../data/symptom-database.js';
import { svgIcon } from '../../ui/icon-paths.js';

// ========================================
// 1. 증상 분석기 클래스
// ========================================

export class SymptomAnalyzer {
  constructor(measurements, mode, language = 'ko') {
    this.measurements = measurements;
    this.mode = mode;
    this.language = language;
    this.symptomDB = SYMPTOM_DATABASE;
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
  // 2. 전체 증상 분석
  // ========================================
  
  /**
   * 최신 증상 전체 분석
   * @param {Array} currentMeds - 현재 복용 중인 약물 목록 (선택 사항)
   */
  analyzeAll(currentMeds = []) {
    if (this.measurements.length === 0) {
      return {
        summary: 'No data to analyze.',
        criticalAlerts: [],
        warnings: [],
        insights: [],
        lagAnalysis: [],
        crossValidation: []
      };
    }
    
    const latest = this.measurements[this.measurements.length - 1];
    
    // 추가 분석 실행
    const lagAnalysis = this.runLagEffectAnalysis(latest);
    const crossValidation = this.crossValidateSymptoms(latest, currentMeds);

    return {
      summary: this.generateSummary(latest),
      criticalAlerts: this.detectCriticalSymptoms(latest),
      warnings: this.detectWarningSymptoms(latest),
      insights: this.generateInsights(latest),
      trends: this.analyzeTrends(),
      lagAnalysis,
      crossValidation
    };
  }

  // ========================================
  // 2.5. 고급 분석 (Lag Effect & Cross-Validation)
  // ========================================

  /**
   * 전체 증상에 대한 시간차 분석 실행
   */
  runLagEffectAnalysis(latest) {
    if (!latest.symptoms || latest.symptoms.length === 0) return [];
    
    const results = [];
    for (const symptom of latest.symptoms) {
      if (symptom.severity >= 3) {
        const analysis = this.analyzeTimeLag(symptom.id, this.measurements);
        if (analysis) {
          results.push(analysis);
        }
      }
    }
    return results;
  }

  /**
   * 개별 증상에 대한 시간차(Lag Effect) 분석
   * @param {string} symptomId - 증상 ID
   * @param {Array} history - 측정 기록
   */
  analyzeTimeLag(symptomId, history) {
    if (history.length < 3) return null; // 최소 3주 데이터 필요

    // 2주 ~ 4주 전 데이터 확인
    const currentWeek = history.length - 1;
    const startWeek = Math.max(0, currentWeek - 4);
    const endWeek = Math.max(0, currentWeek - 2);
    
    const relevantHistory = history.slice(startWeek, endWeek + 1);
    
    // 1. 호르몬 수치 급변 확인
    for (let i = 1; i < relevantHistory.length; i++) {
      const prev = relevantHistory[i-1];
      const curr = relevantHistory[i];
      
      // 테스토스테론 급증/급감
      if (curr.testosteroneLevel && prev.testosteroneLevel) {
        const change = curr.testosteroneLevel - prev.testosteroneLevel;
        if (Math.abs(change) > 100) { // 예: 100ng/dL 이상 변화
           return {
             symptomId,
             cause: 'hormone_fluctuation',
             detail: this._t({ko: '3-4주 전 테스토스테론 수치의 급격한 변화({direction})가 원인일 수 있습니다.', en: 'A rapid change ({direction}) in testosterone levels 3-4 weeks ago may be the cause.', ja: '3〜4週間前のテストステロン値の急激な変化（{direction}）が原因の可能性があります。'}, {direction: change > 0 ? this._t({ko: '증가', en: 'increase', ja: '増加'}) : this._t({ko: '감소', en: 'decrease', ja: '減少'})}),
             confidence: 'high'
           };
        }
      }
      
      // 에스트로겐 급증/급감
      if (curr.estrogenLevel && prev.estrogenLevel) {
        const change = curr.estrogenLevel - prev.estrogenLevel;
        if (Math.abs(change) > 50) { // 예: 50pg/mL 이상 변화
           return {
             symptomId,
             cause: 'hormone_fluctuation',
             detail: this._t({ko: '3-4주 전 에스트로겐 수치의 급격한 변화가 원인일 수 있습니다.', en: 'A rapid change in estrogen levels 3-4 weeks ago may be the cause.', ja: '3〜4週間前のエストロゲン値の急激な変化が原因の可能性があります。'}),
             confidence: 'medium'
           };
        }
      }
    }
    
    // 2. 약물 변경 확인 (데이터 구조에 따라 다름, 여기서는 placeholder)
    // if (medicationChanged) ...

    return null;
  }

  /**
   * 교차 검증 (Cross-Validation)
   * 증상 + 수치 + 약물 3요소 조합 분석
   */
  crossValidateSymptoms(measurement, currentMeds) {
    const validations = [];
    if (!measurement.symptoms) return validations;

    // 시나리오 1: 두통 + 혈압 약물/이슈 + 수분 정체
    const hasHeadache = measurement.symptoms.some(s => s.id === 'headache' && s.severity >= 3);
    const hasEdema = measurement.symptoms.some(s => s.id === 'edema');
    // const takingBPMeds = currentMeds.includes('blood_pressure_meds'); // 예시
    
    if (hasHeadache && hasEdema) {
      validations.push({
        symptom: this._t({ko: '두통', en: 'Headache', ja: '頭痛'}),
        type: 'cross_validated',
        cause: 'fluid_retention',
        message: this._t({ko: '두통과 부종이 동반되어 혈압 상승이나 수분 정체가 의심됩니다.', en: 'Headache accompanied by edema suggests possible blood pressure elevation or fluid retention.', ja: '頭痛とむくみが併発しており、血圧上昇や水分貯留が疑われます。'}),
        action: this._t({ko: '혈압을 측정하고 나트륨 섭취를 줄이세요.', en: 'Check your blood pressure and reduce sodium intake.', ja: '血圧を測定し、ナトリウム摂取を減らしてください。'})
      });
    }

    // 시나리오 2: 여드름 + 높은 T 수치
    const hasAcne = measurement.symptoms.some(s => s.id === 'cystic_acne' && s.severity >= 3);
    const highT = measurement.testosteroneLevel > (this.mode === 'mtf' ? 50 : 800);
    
    if (hasAcne && highT) {
       validations.push({
        symptom: this._t({ko: '여드름', en: 'Acne', ja: 'ニキビ'}),
        type: 'cross_validated',
        cause: 'high_androgen',
        message: this._t({ko: '높은 테스토스테론 수치({level})가 여드름의 직접적인 원인으로 보입니다.', en: 'High testosterone level ({level}) appears to be the direct cause of acne.', ja: '高いテストステロン値（{level}）がニキビの直接的な原因と考えられます。'}, {level: measurement.testosteroneLevel}),
        action: this._t({ko: '호르몬 수치 조절이 필요합니다.', en: 'Hormone level adjustment is needed.', ja: 'ホルモン値の調整が必要です。'})
      });
    }

    return validations;
  }

  // ========================================
  // 3. 위험 증상 탐지
  // ========================================
  
  /**
   * 즉시 의료 조치가 필요한 위험 증상 탐지
   */
  detectCriticalSymptoms(measurement) {
    const alerts = [];
    
    if (!measurement.symptoms || measurement.symptoms.length === 0) {
      return alerts;
    }
    
    // Blood clot suspicion symptoms
    const dvtSymptom = measurement.symptoms.find(s => s.id === 'dvt_symptoms');
    if (dvtSymptom && dvtSymptom.severity >= 4) {
      alerts.push({
        level: 'critical',
        category: 'circulatory',
        icon: svgIcon('emergency', 'mi-sm mi-error'),
        title: this._t({ko: '심부정맥 혈전증 의심', en: 'Suspected deep vein thrombosis', ja: '深部静脈血栓症の疑い'}),
        description: this._t({ko: '종아리 또는 다리의 부기와 통증은 혈전의 징후일 수 있습니다.', en: 'Swelling and pain in the calf or leg may be a sign of a blood clot.', ja: 'ふくらはぎや脚のむくみと痛みは血栓の兆候である可能性があります。'}),
        action: this._t({ko: '즉시 병원 응급실을 방문하세요!', en: 'Visit the emergency room immediately!', ja: '直ちに病院の救急外来を受診してください！'}),
        risk: this._t({ko: '생명에 위험할 수 있습니다', en: 'Can be life-threatening', ja: '生命に危険を及ぼす可能性があります'}),
        relatedTo: [this._t({ko: '에스트로겐 복용', en: 'Estrogen use', ja: 'エストロゲン服用'}), this._t({ko: '장시간 앉아있기', en: 'Prolonged sitting', ja: '長時間の座位'}), this._t({ko: '흡연', en: 'Smoking', ja: '喫煙'})],
        prevention: []
      });
    }
    
    // Liver toxicity signs
    const jaundiceSymptom = measurement.symptoms.find(s => s.id === 'jaundice');
    if (jaundiceSymptom && jaundiceSymptom.severity >= 3) {
      alerts.push({
        level: 'critical',
        category: 'liver',
        icon: svgIcon('warning', 'mi-sm mi-warning'),
        title: this._t({ko: '간 기능 이상 의심', en: 'Suspected liver dysfunction', ja: '肝機能異常の疑い'}),
        description: this._t({ko: '황달 증상은 간 독성의 징후일 수 있습니다.', en: 'Jaundice symptoms may be a sign of liver toxicity.', ja: '黄疸症状は肝毒性の兆候である可能性があります。'}),
        action: this._t({ko: '즉시 의사와 상담하고 혈액 검사를 받으세요', en: 'Consult a doctor immediately and get a blood test', ja: '直ちに医師に相談し、血液検査を受けてください'}),
        risk: this._t({ko: '간 손상 가능성', en: 'Possible liver damage', ja: '肝障害の可能性'}),
        relatedTo: [this._t({ko: '경구 호르몬 복용', en: 'Oral hormone use', ja: '経口ホルモン服用'}), this._t({ko: 'AAS 사용', en: 'AAS use', ja: 'AAS使用'}), this._t({ko: '알코올', en: 'Alcohol', ja: 'アルコール'})],
        prevention: []
      });
    }
    
    const ruqPainSymptom = measurement.symptoms.find(s => s.id === 'ruq_pain');
    if (ruqPainSymptom && ruqPainSymptom.severity >= 4) {
      alerts.push({
        level: 'critical',
        category: 'liver',
        icon: svgIcon('warning', 'mi-sm mi-warning'),
        title: this._t({ko: '간 비대 의심', en: 'Suspected hepatomegaly', ja: '肝腫大の疑い'}),
        description: this._t({ko: '오른쪽 윗배의 통증은 간 비대의 징후일 수 있습니다.', en: 'Pain in the right upper abdomen may be a sign of hepatomegaly.', ja: '右上腹部の痛みは肝腫大の兆候である可能性があります。'}),
        action: this._t({ko: '의사 상담 및 간 기능 검사 필요', en: 'Doctor consultation and liver function test needed', ja: '医師への相談と肝機能検査が必要です'}),
        risk: this._t({ko: '간 손상', en: 'Liver damage', ja: '肝障害'}),
        relatedTo: [this._t({ko: '경구 AAS', en: 'Oral AAS', ja: '経口AAS'}), this._t({ko: '고용량 약물', en: 'High-dose medications', ja: '高用量薬物'})],
        prevention: []
      });
    }
    
    // Cardiovascular symptoms
    const palpitationSymptom = measurement.symptoms.find(s => s.id === 'palpitation');
    const dyspneaSymptom = measurement.symptoms.find(s => s.id === 'dyspnea');
    
    if ((palpitationSymptom && palpitationSymptom.severity >= 4) ||
        (dyspneaSymptom && dyspneaSymptom.severity >= 4)) {
      alerts.push({
        level: 'critical',
        category: 'cardiovascular',
        icon: svgIcon('favorite', 'mi-sm mi-error'),
        title: this._t({ko: '심혈관 증상 주의', en: 'Cardiovascular symptom warning', ja: '心血管症状に注意'}),
        description: this._t({ko: '심한 두근거림 또는 호흡 곤란은 심혈관 문제를 나타낼 수 있습니다.', en: 'Severe palpitations or difficulty breathing may indicate cardiovascular problems.', ja: '激しい動悸や呼吸困難は心血管の問題を示している可能性があります。'}),
        action: this._t({ko: '즉시 의사 상담 필요', en: 'Immediate doctor consultation needed', ja: '直ちに医師への相談が必要です'}),
        risk: this._t({ko: '심장 문제', en: 'Heart problems', ja: '心臓の問題'}),
        relatedTo: [this._t({ko: '고용량 호르몬', en: 'High-dose hormones', ja: '高用量ホルモン'}), this._t({ko: '스테로이드', en: 'Steroids', ja: 'ステロイド'}), this._t({ko: '클렌부테롤', en: 'Clenbuterol', ja: 'クレンブテロール'})],
        prevention: []
      });
    }
    
    return alerts;
  }
  
  /**
   * 주의가 필요한 증상 탐지
   */
  detectWarningSymptoms(measurement) {
    const warnings = [];
    
    if (!measurement.symptoms || measurement.symptoms.length === 0) {
      return warnings;
    }
    
    // 정신 건강 증상
    const mentalSymptoms = measurement.symptoms.filter(s =>
      ['depression', 'mood_swings', 'aggression', 'anxiety'].includes(s.id) &&
      s.severity >= 3
    );
    
    if (mentalSymptoms.length >= 2) {
      warnings.push({
        level: 'warning',
        category: 'mental_health',
        icon: svgIcon('psychology', 'mi-sm'),
        title: this._t({ko: '정신 건강 증상 주의', en: 'Mental health symptom warning', ja: 'メンタルヘルス症状に注意'}),
        description: this._t({ko: '{count}개의 정신 건강 관련 증상이 보고되었습니다.', en: '{count} mental health-related symptom(s) have been reported.', ja: '{count}件のメンタルヘルス関連症状が報告されています。'}, {count: mentalSymptoms.length}),
        symptoms: mentalSymptoms.map(s => this.getSymptomName(s.id)),
        action: this._t({ko: '호르몬 용량 조정 또는 전문가 상담 고려', en: 'Consider hormone dose adjustment or specialist consultation', ja: 'ホルモン用量の調整または専門家への相談を検討してください'}),
        tips: [
          this._t({ko: '충분한 수면', en: 'Get enough sleep', ja: '十分な睡眠'}),
          this._t({ko: '규칙적인 운동', en: 'Regular exercise', ja: '規則的な運動'}),
          this._t({ko: '명상 및 스트레스 관리', en: 'Meditation and stress management', ja: '瞑想とストレス管理'}),
          this._t({ko: '필요시 심리 상담', en: 'Psychological counseling if needed', ja: '必要に応じて心理カウンセリング'})
        ],
        relatedTo: this.mode === 'mtf' 
          ? [this._t({ko: '시프로테론 (Androcur)', en: 'Cyproterone (Androcur)', ja: 'シプロテロン（アンドロクール）'}), this._t({ko: '급격한 호르몬 변화', en: 'Rapid hormone changes', ja: '急激なホルモン変化'})]
          : [this._t({ko: '테스토스테론 과다 (Roid Rage)', en: 'Testosterone excess (Roid Rage)', ja: 'テストステロン過多（ロイドレイジ）'}), this._t({ko: '에스트로겐 억제', en: 'Estrogen suppression', ja: 'エストロゲン抑制'})]
      });
    }
    
    // 피부 트러블
    const skinSymptoms = measurement.symptoms.filter(s =>
      ['cystic_acne', 'comedones', 'seborrhea'].includes(s.id) &&
      s.severity >= 3
    );
    
    if (skinSymptoms.length >= 1) {
      warnings.push({
        level: 'warning',
        category: 'skin',
        icon: svgIcon('dermatology', 'mi-sm'),
        title: this._t({ko: '피부 트러블', en: 'Skin troubles', ja: '肌トラブル'}),
        description: this._t({ko: '호르몬 변화로 인한 피부 트러블이 있습니다.', en: 'Skin troubles due to hormonal changes.', ja: 'ホルモン変化による肌トラブルがあります。'}),
        symptoms: skinSymptoms.map(s => this.getSymptomName(s.id)),
        action: this._t({ko: '피부 관리 루틴 개선', en: 'Improve skincare routine', ja: 'スキンケアルーティンの改善'}),
        tips: [
          this._t({ko: '하루 2회 클렌징', en: 'Cleanse twice daily', ja: '1日2回クレンジング'}),
          this._t({ko: '비코메도제닉 제품 사용', en: 'Use non-comedogenic products', ja: 'ノンコメドジェニック製品を使用'}),
          this._t({ko: '충분한 수분', en: 'Stay hydrated', ja: '十分な水分補給'}),
          this._t({ko: '유제품 및 설탕 줄이기', en: 'Reduce dairy and sugar', ja: '乳製品と砂糖を減らす'}),
          this._t({ko: '필요시 피부과 상담', en: 'Consult a dermatologist if needed', ja: '必要に応じて皮膚科を受診'})
        ],
        relatedTo: this.mode === 'ftm'
          ? [this._t({ko: '테스토스테론 증가', en: 'Testosterone increase', ja: 'テストステロン増加'}), this._t({ko: '피지 분비 증가', en: 'Increased sebum production', ja: '皮脂分泌の増加'})]
          : [this._t({ko: '초기 호르몬 변화', en: 'Early hormonal changes', ja: '初期ホルモン変化'}), this._t({ko: '호르몬 불균형', en: 'Hormonal imbalance', ja: 'ホルモンバランスの乱れ'})]
      });
    }
    
    // 성기능 증상
    const sexualSymptoms = measurement.symptoms.filter(s =>
      ['low_libido', 'erectile_dysfunction', 'vaginal_atrophy_dryness'].includes(s.id) &&
      s.severity >= 3
    );
    
    if (sexualSymptoms.length >= 1) {
      warnings.push({
        level: 'warning',
        category: 'sexual_health',
        icon: svgIcon('favorite', 'mi-sm'),
        title: this._t({ko: '성기능 변화', en: 'Sexual function changes', ja: '性機能の変化'}),
        description: this._t({ko: '호르몬 변화로 인한 성기능 변화가 있습니다.', en: 'Sexual function changes due to hormonal changes.', ja: 'ホルモン変化による性機能の変化があります。'}),
        symptoms: sexualSymptoms.map(s => this.getSymptomName(s.id)),
        action: this._t({ko: '예상되는 변화이지만 심한 경우 의사 상담', en: 'Expected changes, but consult a doctor if severe', ja: '予想される変化ですが、ひどい場合は医師に相談してください'}),
        tips: this.mode === 'mtf' 
          ? [
              this._t({ko: '성욕 감소는 정상', en: 'Decreased libido is normal', ja: '性欲の減少は正常です'}),
              this._t({ko: '윤활제 사용', en: 'Use lubricant', ja: '潤滑剤の使用'}),
              this._t({ko: '꾸준한 사용으로 위축 방지', en: 'Prevent atrophy with regular use', ja: '定期的な使用で萎縮を防止'}),
              this._t({ko: '프로게스테론이 도움이 될 수 있음', en: 'Progesterone may help', ja: 'プロゲステロンが助けになる場合があります'})
            ]
          : [
              this._t({ko: '테스토스테론 수치 확인', en: 'Check testosterone levels', ja: 'テストステロン値を確認'}),
              this._t({ko: '충분한 수분', en: 'Stay hydrated', ja: '十分な水分補給'}),
              this._t({ko: '질 윤활제', en: 'Vaginal lubricant', ja: '膣潤滑剤'}),
              this._t({ko: '정기 검진', en: 'Regular check-ups', ja: '定期検診'})
            ],
        relatedTo: this.mode === 'mtf'
          ? [this._t({ko: '항안드로겐', en: 'Anti-androgen', ja: '抗アンドロゲン'}), this._t({ko: '에스트로겐', en: 'Estrogen', ja: 'エストロゲン'})]
          : [this._t({ko: '테스토스테론', en: 'Testosterone', ja: 'テストステロン'}), this._t({ko: '에스트로겐 억제', en: 'Estrogen suppression', ja: 'エストロゲン抑制'})]
      });
    }
    
    // 근육/체력 감소
    const muscleSymptoms = measurement.symptoms.filter(s =>
      ['sarcopenia', 'chronic_fatigue'].includes(s.id) &&
      s.severity >= 3
    );
    
    if (muscleSymptoms.length >= 1) {
      warnings.push({
        level: 'warning',
        category: 'fitness',
        icon: svgIcon('fitness_center', 'mi-sm'),
        title: this._t({ko: '근력 및 체력 저하', en: 'Muscle strength and stamina decline', ja: '筋力・体力の低下'}),
        description: this._t({ko: '근육량 감소 또는 피로감이 있습니다.', en: 'Muscle mass loss or fatigue is present.', ja: '筋肉量の減少または疲労感があります。'}),
        symptoms: muscleSymptoms.map(s => this.getSymptomName(s.id)),
        action: this._t({ko: '운동 및 영양 개선', en: 'Improve exercise and nutrition', ja: '運動と栄養の改善'}),
        tips: [
          this._t({ko: '단백질 섭취 증가 (체중 1kg당 1.5-2g)', en: 'Increase protein intake (1.5-2g per kg body weight)', ja: 'タンパク質摂取量の増加（体重1kgあたり1.5〜2g）'}),
          this._t({ko: '근력 운동 추가', en: 'Add strength training', ja: '筋力トレーニングの追加'}),
          this._t({ko: '충분한 수면', en: 'Get enough sleep', ja: '十分な睡眠'}),
          this._t({ko: '비타민 D, B12 검사', en: 'Check vitamin D and B12', ja: 'ビタミンD、B12検査'}),
          this._t({ko: '호르몬 수치 확인', en: 'Check hormone levels', ja: 'ホルモン値の確認'})
        ],
        relatedTo: [this._t({ko: '과도한 칼로리 제한', en: 'Excessive calorie restriction', ja: '過度なカロリー制限'}), this._t({ko: '호르몬 변화', en: 'Hormonal changes', ja: 'ホルモン変化'}), this._t({ko: '운동 부족', en: 'Lack of exercise', ja: '運動不足'})]
      });
    }
    
    // 탈모
    const hairLossSymptoms = measurement.symptoms.filter(s =>
      ['male_pattern_baldness', 'hair_thinning'].includes(s.id) &&
      s.severity >= 3
    );
    
    if (hairLossSymptoms.length >= 1) {
      warnings.push({
        level: 'warning',
        category: 'hair',
        icon: svgIcon('content_cut', 'mi-sm'),
        title: '탈모 진행',
        description: '탈모가 진행되고 있습니다.',
        symptoms: hairLossSymptoms.map(s => this.getSymptomName(s.id)),
        action: '탈모 치료 고려',
        tips: this.mode === 'ftm'
          ? [
              '피나스테리드 (DHT 억제)',
              '미녹시딜 (국소 도포)',
              '두타스테리드 (강력한 억제)',
              '스트레스 관리',
              '충분한 영양'
            ]
          : [
              '에스트로겐이 탈모를 막아줌',
              '충분한 영양',
              '스트레스 관리',
              '미녹시딜 고려'
            ],
        relatedTo: this.mode === 'ftm'
          ? ['테스토스테론 → DHT 전환', '유전적 요인']
          : ['초기 호르몬 변화', '영양 부족']
      });
    }
    
    return warnings;
  }
  
  // ========================================
  // 4. 증상 요약 생성
  // ========================================
  
  /**
   * 증상 요약 텍스트 생성
   */
  generateSummary(measurement) {
    if (!measurement.symptoms || measurement.symptoms.length === 0) {
      return this._t({ko: '기록된 증상이 없습니다. 건강 상태가 양호한 것으로 보입니다.', en: 'No symptoms recorded. Your health appears to be in good condition.', ja: '記録された症状はありません。健康状態は良好と思われます。'});
    }
    
    const symptoms = measurement.symptoms;
    const severeCount = symptoms.filter(s => s.severity >= 4).length;
    const moderateCount = symptoms.filter(s => s.severity === 3).length;
    const mildCount = symptoms.filter(s => s.severity <= 2).length;
    
    if (severeCount > 0) {
      return `${svgIcon('warning', 'mi-inline mi-sm mi-warning')} ${this._t({ko: '{count}개의 심각한 증상이 보고되었습니다. 즉시 의사와 상담하세요.', en: '{count} severe symptom(s) reported. Consult a doctor immediately.', ja: '{count}件の深刻な症状が報告されています。直ちに医師に相談してください。'}, {count: severeCount})}`;
    }
    
    if (moderateCount >= 3) {
      return this._t({ko: '주의: {count}개의 중간 정도 증상이 있습니다. 호르몬 조정이나 생활 습관 개선이 필요할 수 있습니다.', en: 'Caution: {count} moderate symptom(s) present. Hormone adjustment or lifestyle changes may be needed.', ja: '注意：{count}件の中程度の症状があります。ホルモン調整や生活習慣の改善が必要な場合があります。'}, {count: moderateCount});
    }
    
    if (moderateCount > 0 || mildCount > 0) {
      return this._t({ko: '{count}개의 증상이 기록되었습니다. 대부분 관리 가능한 수준입니다.', en: '{count} symptom(s) recorded. Most are at manageable levels.', ja: '{count}件の症状が記録されています。ほとんどは管理可能なレベルです。'}, {count: symptoms.length});
    }
    
    return this._t({ko: '증상이 경미하거나 없습니다. 잘 관리하고 계시네요!', en: 'Symptoms are mild or absent. You are managing well!', ja: '症状は軽度またはありません。よく管理できていますね！'});
  }
  
  // ========================================
  // 5. 인사이트 생성
  // ========================================
  
  /**
   * 증상 패턴 분석 및 인사이트
   */
  generateInsights(measurement) {
    const insights = [];
    
    if (!measurement.symptoms || measurement.symptoms.length === 0) {
      return insights;
    }
    
    // 예상되는 증상 vs 예상 밖 증상
    const expectedSymptoms = this.getExpectedSymptoms();
    const unexpectedSymptoms = measurement.symptoms.filter(s =>
      !expectedSymptoms.includes(s.id) && s.severity >= 3
    );
    
    if (unexpectedSymptoms.length > 0) {
      insights.push({
        type: 'unexpected',
        icon: svgIcon('search', 'mi-sm'),
        title: this._t({ko: '예상 밖의 증상', en: 'Unexpected symptoms', ja: '予想外の症状'}),
        description: this._t({ko: '{mode} 전환에서 흔하지 않은 증상이 나타났습니다.', en: 'Uncommon symptoms have appeared during {mode} transition.', ja: '{mode}への移行では珍しい症状が現れています。'}, {mode: this.mode === 'mtf' ? 'MTF' : 'FTM'}),
        symptoms: unexpectedSymptoms.map(s => this.getSymptomName(s.id)),
        advice: this._t({ko: '의사와 상담하여 원인을 파악하세요. 약물 상호작용이나 다른 건강 문제일 수 있습니다.', en: 'Consult a doctor to identify the cause. It could be drug interactions or other health issues.', ja: '医師に相談して原因を特定してください。薬物の相互作用や他の健康問題の可能性があります。'})
      });
    }
    
    // 긍정적인 변화
    if (this.measurements.length >= 2) {
      const previous = this.measurements[this.measurements.length - 2];
      if (previous.symptoms) {
        const improvedSymptoms = previous.symptoms.filter(ps => {
          const current = measurement.symptoms.find(cs => cs.id === ps.id);
          return current && current.severity < ps.severity;
        });
        
        if (improvedSymptoms.length > 0) {
          insights.push({
            type: 'improvement',
            icon: svgIcon('auto_awesome', 'mi-sm mi-success'),
            title: this._t({ko: '증상 개선', en: 'Symptom improvement', ja: '症状の改善'}),
            description: this._t({ko: '{count}개의 증상이 지난주보다 호전되었습니다!', en: '{count} symptom(s) have improved since last week!', ja: '{count}件の症状が先週より改善しました！'}, {count: improvedSymptoms.length}),
            symptoms: improvedSymptoms.map(s => this.getSymptomName(s.id)),
            advice: this._t({ko: '현재 하고 계신 관리를 계속 유지하세요!', en: 'Keep up your current management!', ja: '現在の管理を続けてください！'})
          });
        }
      }
    }
    
    // 호르몬 수치와 증상 연관성
    if (measurement.estrogenLevel || measurement.testosteroneLevel) {
      const hormoneInsight = this.analyzeHormoneSymptomCorrelation(measurement);
      if (hormoneInsight) {
        insights.push(hormoneInsight);
      }
    }
    
    // 모드별 전형적인 증상 패턴
    const typicalInsight = this.analyzeTypicalPattern(measurement);
    if (typicalInsight) {
      insights.push(typicalInsight);
    }
    
    return insights;
  }
  
  /**
   * 호르몬 수치와 증상의 연관성 분석
   */
  analyzeHormoneSymptomCorrelation(measurement) {
    if (this.mode === 'mtf') {
      // MTF: E2 낮으면 hot flashes, 기분 변화
      if (measurement.estrogenLevel < 100) {
        const moodSymptoms = measurement.symptoms.filter(s =>
          ['depression', 'anxiety', 'mood_swings'].includes(s.id)
        );
        
        if (moodSymptoms.length > 0) {
          return {
            type: 'correlation',
            icon: svgIcon('link', 'mi-sm'),
            title: this._t({ko: '호르몬 수치와 증상 연관성', en: 'Hormone level and symptom correlation', ja: 'ホルモン値と症状の関連性'}),
            description: this._t({ko: '낮은 에스트로겐 수치가 기분 변화와 관련이 있을 수 있습니다.', en: 'Low estrogen levels may be related to mood changes.', ja: '低いエストロゲン値が気分の変化に関連している可能性があります。'}),
            estrogenLevel: measurement.estrogenLevel,
            targetRange: '100-200 pg/ml',
            advice: this._t({ko: '의사와 상담하여 에스트라디올 용량 조정을 고려하세요.', en: 'Consult a doctor to consider adjusting estradiol dosage.', ja: '医師に相談してエストラジオールの用量調整を検討してください。'})
          };
        }
      }
      
      // MTF: T 높으면 남성화 증상
      if (measurement.testosteroneLevel > 50) {
        const masculineSymptoms = measurement.symptoms.filter(s =>
          ['facial_hirsutism', 'body_hirsutism', 'oily_skin_ftm'].includes(s.id)
        );
        
        if (masculineSymptoms.length > 0) {
          return {
            type: 'correlation',
            icon: svgIcon('link', 'mi-sm'),
            title: this._t({ko: '테스토스테론 억제 부족', en: 'Insufficient testosterone suppression', ja: 'テストステロン抑制不足'}),
            description: this._t({ko: '높은 테스토스테론 수치가 원치 않는 남성화 증상을 유발할 수 있습니다.', en: 'High testosterone levels may be causing unwanted masculinizing symptoms.', ja: '高いテストステロン値が望まない男性化症状を引き起こしている可能性があります。'}),
            testosteroneLevel: measurement.testosteroneLevel,
            targetRange: '< 50 ng/dL',
            advice: this._t({ko: '항안드로겐 용량 조정이 필요할 수 있습니다.', en: 'Anti-androgen dose adjustment may be needed.', ja: '抗アンドロゲンの用量調整が必要な場合があります。'})
          };
        }
      }
      
    } else if (this.mode === 'ftm') {
      // FTM: T 너무 높으면 공격성, 여드름
      if (measurement.testosteroneLevel > 800) {
        const highTSymptoms = measurement.symptoms.filter(s =>
          ['aggression', 'cystic_acne', 'oily_skin_ftm'].includes(s.id) && s.severity >= 3
        );
        
        if (highTSymptoms.length > 0) {
          return {
            type: 'correlation',
            icon: svgIcon('link', 'mi-sm'),
            title: this._t({ko: '높은 테스토스테론 부작용', en: 'High testosterone side effects', ja: '高テストステロンの副作用'}),
            description: this._t({ko: '테스토스테론 수치가 높아 부작용이 나타나고 있습니다.', en: 'High testosterone levels are causing side effects.', ja: 'テストステロン値が高く、副作用が現れています。'}),
            testosteroneLevel: measurement.testosteroneLevel,
            targetRange: '300-700 ng/dL',
            advice: this._t({ko: '테스토스테론 용량 감소를 고려하세요.', en: 'Consider reducing testosterone dosage.', ja: 'テストステロンの用量減少を検討してください。'})
          };
        }
      }
      
      // FTM: T 너무 낮으면 피로, 우울
      if (measurement.testosteroneLevel < 300) {
        const lowTSymptoms = measurement.symptoms.filter(s =>
          ['depression', 'chronic_fatigue', 'low_libido'].includes(s.id) && s.severity >= 3
        );
        
        if (lowTSymptoms.length > 0) {
          return {
            type: 'correlation',
            icon: svgIcon('link', 'mi-sm'),
            title: this._t({ko: '낮은 테스토스테론 증상', en: 'Low testosterone symptoms', ja: '低テストステロン症状'}),
            description: this._t({ko: '테스토스테론 수치가 낮아 관련 증상이 나타날 수 있습니다.', en: 'Low testosterone levels may be causing related symptoms.', ja: 'テストステロン値が低く、関連する症状が現れている可能性があります。'}),
            testosteroneLevel: measurement.testosteroneLevel,
            targetRange: '300-700 ng/dL',
            advice: this._t({ko: '테스토스테론 용량 증가 또는 투여 간격 조정이 필요할 수 있습니다.', en: 'Testosterone dose increase or dosing interval adjustment may be needed.', ja: 'テストステロンの用量増加または投与間隔の調整が必要な場合があります。'})
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * 모드별 전형적인 증상 패턴 분석
   */
  analyzeTypicalPattern(measurement) {
    const symptoms = measurement.symptoms;
    
    if (this.mode === 'mtf') {
      // MTF 초기 (첫 3-6개월): 유방 통증, 성욕 감소, 기분 변화
      const earlyMTFSymptoms = symptoms.filter(s =>
        ['breast_budding', 'low_libido', 'mood_swings'].includes(s.id)
      );
      
      if (earlyMTFSymptoms.length >= 2) {
        return {
          type: 'typical',
          icon: svgIcon('assignment', 'mi-sm'),
          title: this._t({ko: 'MTF 전형적인 초기 증상', en: 'Typical early MTF symptoms', ja: 'MTFの典型的な初期症状'}),
          description: this._t({ko: '이러한 증상은 MTF 전환 초기에 매우 흔합니다.', en: 'These symptoms are very common in early MTF transition.', ja: 'これらの症状はMTFへの移行初期に非常によく見られます。'}),
          symptoms: earlyMTFSymptoms.map(s => this.getSymptomName(s.id)),
          advice: this._t({ko: '대부분 시간이 지나면 안정됩니다. 심한 경우 의사와 상담하세요.', en: 'Most will stabilize over time. Consult a doctor if severe.', ja: 'ほとんどは時間が経てば安定します。ひどい場合は医師に相談してください。'}),
          timeline: this._t({ko: '3-6개월 후 대부분 안정화됩니다.', en: 'Most stabilize after 3-6 months.', ja: '3〜6ヶ月後にほとんど安定します。'})
        };
      }
      
    } else if (this.mode === 'ftm') {
      // FTM 초기: 여드름, 목소리 변화, 생리 중단
      const earlyFTMSymptoms = symptoms.filter(s =>
        ['cystic_acne', 'voice_change', 'amenorrhea'].includes(s.id)
      );
      
      if (earlyFTMSymptoms.length >= 2) {
        return {
          type: 'typical',
          icon: svgIcon('assignment', 'mi-sm'),
          title: this._t({ko: 'FTM 전형적인 초기 증상', en: 'Typical early FTM symptoms', ja: 'FTMの典型的な初期症状'}),
          description: this._t({ko: '이러한 증상은 FTM 전환 초기에 매우 흔합니다.', en: 'These symptoms are very common in early FTM transition.', ja: 'これらの症状はFTMへの移行初期に非常によく見られます。'}),
          symptoms: earlyFTMSymptoms.map(s => this.getSymptomName(s.id)),
          advice: this._t({ko: '여드름은 피부과 치료로 관리 가능합니다. 목소리 변화는 정상입니다.', en: 'Acne can be managed with dermatological treatment. Voice changes are normal.', ja: 'ニキビは皮膚科の治療で管理可能です。声の変化は正常です。'}),
          timeline: this._t({ko: '여드름은 1년 이내 대부분 안정화됩니다.', en: 'Acne mostly stabilizes within 1 year.', ja: 'ニキビはほとんどが1年以内に安定します。'})
        };
      }
    }
    
    return null;
  }
  
  // ========================================
  // 6. 증상 추세 분석
  // ========================================
  
  /**
   * 시간에 따른 증상 변화 추세
   */
  analyzeTrends() {
    if (this.measurements.length < 2) {
      return null;
    }
    
    const trends = {
      improving: [],
      worsening: [],
      stable: []
    };
    
    const latest = this.measurements[this.measurements.length - 1];
    const previous = this.measurements[this.measurements.length - 2];
    
    if (!latest.symptoms || !previous.symptoms) {
      return null;
    }
    
    // 각 증상별 비교
    const allSymptomIds = new Set([
      ...latest.symptoms.map(s => s.id),
      ...previous.symptoms.map(s => s.id)
    ]);
    
    allSymptomIds.forEach(id => {
      const latestSymptom = latest.symptoms.find(s => s.id === id);
      const previousSymptom = previous.symptoms.find(s => s.id === id);
      
      const latestSeverity = latestSymptom ? latestSymptom.severity : 0;
      const previousSeverity = previousSymptom ? previousSymptom.severity : 0;
      
      if (latestSeverity < previousSeverity) {
        trends.improving.push({
          id,
          name: this.getSymptomName(id),
          change: previousSeverity - latestSeverity
        });
      } else if (latestSeverity > previousSeverity) {
        trends.worsening.push({
          id,
          name: this.getSymptomName(id),
          change: latestSeverity - previousSeverity
        });
      } else if (latestSeverity > 0) {
        trends.stable.push({
          id,
          name: this.getSymptomName(id),
          severity: latestSeverity
        });
      }
    });
    
    return trends;
  }
  
  // ========================================
  // 7. 유틸리티
  // ========================================
  
  /**
   * 모드별 예상 증상 목록
   */
  getExpectedSymptoms() {
    if (this.mode === 'mtf') {
      return [
        'breast_budding',
        'low_libido',
        'erectile_dysfunction',
        'testicular_atrophy',
        'mood_swings',
        'skin_softening',
        'body_hair_reduction'
      ];
    } else if (this.mode === 'ftm') {
      return [
        'voice_change',
        'facial_hirsutism',
        'body_hirsutism',
        'cystic_acne',
        'amenorrhea',
        'clitoromegaly',
        'hypersexuality',
        'aggression'
      ];
    } else {
      return [];
    }
  }
  
  /**
   * 증상 ID로 이름 가져오기
   */
  getSymptomName(id) {
    for (const category in this.symptomDB) {
      const symptom = this.symptomDB[category].symptoms.find(s => s.id === id);
      if (symptom) {
        return symptom[this.language] || symptom.ko;
      }
    }
    return id;
  }
  
  /**
   * 증상 카테고리 가져오기
   */
  getSymptomCategory(id) {
    for (const category in this.symptomDB) {
      const symptom = this.symptomDB[category].symptoms.find(s => s.id === id);
      if (symptom) {
        return category;
      }
    }
    return 'UNKNOWN';
  }
}

// ========================================
// 8. Export
// ========================================

export default SymptomAnalyzer;
