/**
 * Symptom Cause Map & Resolution Recommendations
 * 
 * Phase 9 DoctorEngine 강화:
 * - 증상별 원인 트리 (cause tree per symptom)
 * - 증상 해소 추천 (diet / exercise / medication / lifestyle)
 * - 복합 증상 패턴 (compound symptom analysis)
 * - MTF/FTM 이상적 호르몬 범위
 */

// ════════════════════════════════════════════
//  1. 이상적 호르몬 범위 (MTF / FTM)
// ════════════════════════════════════════════

export const HORMONE_RANGES = {
  mtf: {
    estrogen: {
      low: { min: 0, max: 100, label: { ko: '부족', en: 'Low', ja: '不足' } },
      ideal: { min: 100, max: 200, label: { ko: '이상적', en: 'Ideal', ja: '理想的' } },
      high: { min: 200, max: 500, label: { ko: '과다', en: 'High', ja: '過多' } },
      dangerous: { min: 500, max: Infinity, label: { ko: '위험', en: 'Dangerous', ja: '危険' } },
      unit: 'pg/mL'
    },
    testosterone: {
      suppressed: { min: 0, max: 50, label: { ko: '억제 (이상적)', en: 'Suppressed (ideal)', ja: '抑制（理想的）' } },
      moderate: { min: 50, max: 100, label: { ko: '부분 억제', en: 'Partially suppressed', ja: '部分抑制' } },
      high: { min: 100, max: Infinity, label: { ko: '미억제', en: 'Not suppressed', ja: '未抑制' } },
      unit: 'ng/dL'
    }
  },
  ftm: {
    testosterone: {
      low: { min: 0, max: 300, label: { ko: '부족', en: 'Low', ja: '不足' } },
      ideal: { min: 300, max: 1000, label: { ko: '이상적', en: 'Ideal', ja: '理想的' } },
      high: { min: 1000, max: 1500, label: { ko: '과다', en: 'High', ja: '過多' } },
      dangerous: { min: 1500, max: Infinity, label: { ko: '위험', en: 'Dangerous', ja: '危険' } },
      unit: 'ng/dL'
    },
    estrogen: {
      suppressed: { min: 0, max: 50, label: { ko: '억제 (이상적)', en: 'Suppressed (ideal)', ja: '抑制（理想的）' } },
      moderate: { min: 50, max: 100, label: { ko: '부분 억제', en: 'Partially suppressed', ja: '部分抑制' } },
      high: { min: 100, max: Infinity, label: { ko: '미억제', en: 'Not suppressed', ja: '未抑制' } },
      unit: 'pg/mL'
    }
  }
};

// ════════════════════════════════════════════
//  2. 증상별 원인 트리 + 해소 추천
// ════════════════════════════════════════════

/**
 * SYMPTOM_CAUSES[symptomId] = {
 *   causes: [{ 
 *     id, condition, label, modeRelevance? 
 *   }],
 *   resolution: {
 *     diet: [string],
 *     exercise: [string],
 *     medication: [string],
 *     lifestyle: [string]
 *   },
 *   hospitalThreshold: number (severity level at which to recommend hospital visit)
 * }
 * 
 * condition(m, mode): boolean — evaluates whether this cause is likely active given a measurement + mode
 */
export const SYMPTOM_CAUSES = {
  // ── 정신·신경계 ─────────────────────────
  depression: {
    causes: [
      { id: 'low_estrogen', label: { ko: '에스트로겐 부족', en: 'Low estrogen', ja: '低エストロゲン' },
        condition: (m, mode) => mode === 'mtf' && m.estrogenLevel != null && m.estrogenLevel < 80 },
      { id: 'low_testosterone', label: { ko: '테스토스테론 부족', en: 'Low testosterone', ja: '低テストステロン' },
        condition: (m, mode) => mode === 'ftm' && m.testosteroneLevel != null && m.testosteroneLevel < 250 },
      { id: 'hormone_fluctuation', label: { ko: '호르몬 변동', en: 'Hormone fluctuation', ja: 'ホルモン変動' },
        condition: () => true },
      { id: 'social_stress', label: { ko: '사회적 스트레스', en: 'Social stress', ja: '社会的ストレス' },
        condition: () => true },
      // 신규: 연구보고서 기반
      { id: 'androgen_withdrawal', label: { ko: '안드로겐 금단 우울', en: 'Androgen withdrawal depression', ja: 'アンドロゲン離脱うつ' },
        condition: (m, mode) => mode === 'ftm' && m.testosteroneLevel != null && m.testosteroneLevel < 150 },
      { id: 'finasteride_mood_risk', label: { ko: '피나스테리드 기분 저하 위험', en: 'Finasteride-associated mood risk', ja: 'フィナステリド気分リスク' },
        condition: (m) => m.medications?.some(med => { const id = typeof med === 'object' ? med.id : med; return ['finasteride','dutasteride'].includes(id); }) },
      { id: 'hypoestrogen_mood', label: { ko: '저에스트로겐 폐경 유사 기분 저하', en: 'Hypoestrogenic mood symptoms', ja: '低E2閉経様気分低下' },
        condition: (m) => m.medications?.some(med => { const id = typeof med === 'object' ? med.id : med; return ['anastrozole','letrozole','gnrh_agonist'].includes(id); }) || (m.estrogenLevel != null && m.estrogenLevel < 50) }
    ],
    resolution: {
      diet: ['omega_3', 'vitamin_d', 'magnesium'],
      exercise: ['cardio_30min', 'outdoor_walk'],
      medication: ['consult_hrt_adjustment', 'mental_health_consult'],
      lifestyle: ['sleep_hygiene', 'social_support', 'mindfulness']
    },
    hospitalThreshold: 3
  },

  anxiety: {
    causes: [
      { id: 'high_estrogen', label: { ko: '에스트로겐 과다', en: 'High estrogen', ja: '高エストロゲン' },
        condition: (m, mode) => mode === 'mtf' && m.estrogenLevel != null && m.estrogenLevel > 250 },
      { id: 'hormone_start', label: { ko: '호르몬 초기 적응', en: 'Early hormone adjustment', ja: 'ホルモン初期適応' },
        condition: () => true },
      { id: 'caffeine', label: { ko: '카페인 과다', en: 'Excess caffeine', ja: 'カフェイン過多' },
        condition: () => true },
      // 신규: 연구보고서 기반
      { id: 'adrenergic_stimulants', label: { ko: '교감신경 자극제 (클렌/에페드린)', en: 'Adrenergic stimulants (clen/ephedrine)', ja: '交感神経刺激薬（クレン/エフェドリン）' },
        condition: (m) => m.medications?.some(med => { const id = typeof med === 'object' ? med.id : med; return ['clenbuterol','eca_stack'].includes(id); }) },
      { id: 'thyroid_excess_anxiety', label: { ko: '갑상선호르몬 과량 불안', en: 'Thyroid hormone excess anxiety', ja: '甲状腺過量不安' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'thyroid_hormone') }
    ],
    resolution: {
      diet: ['reduce_caffeine', 'chamomile_tea', 'magnesium'],
      exercise: ['yoga', 'deep_breathing'],
      medication: ['consult_anxiolytic', 'consult_dose_adjustment'],
      lifestyle: ['limit_screen_time', 'grounding_techniques', 'avoid_stimulants']
    },
    hospitalThreshold: 4
  },

  mood_swings: {
    causes: [
      { id: 'hormone_fluctuation', label: { ko: '호르몬 변동', en: 'Hormone fluctuation', ja: 'ホルモン変動' },
        condition: () => true },
      { id: 'injection_cycle', label: { ko: '주사 주기 영향', en: 'Injection cycle effect', ja: '注射周期の影響' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med : {}).route === 'injectable') }
    ],
    resolution: {
      diet: ['balanced_blood_sugar', 'complex_carbs'],
      exercise: ['regular_aerobic'],
      medication: ['consider_shorter_injection_interval'],
      lifestyle: ['mood_tracking', 'stress_management']
    },
    hospitalThreshold: 5
  },

  insomnia: {
    causes: [
      { id: 'progesterone_change', label: { ko: '프로게스테론 변화', en: 'Progesterone changes', ja: 'プロゲステロン変化' },
        condition: () => true },
      { id: 'anxiety_related', label: { ko: '불안 관련', en: 'Anxiety-related', ja: '不安関連' },
        condition: () => true },
      // 신규: 연구보고서 기반
      { id: 'stimulant_insomnia', label: { ko: '자극제 유발 불면 (클렌/에핵/갑상선)', en: 'Stimulant-induced insomnia', ja: '刺激薬による不眠' },
        condition: (m) => m.medications?.some(med => { const id = typeof med === 'object' ? med.id : med; return ['clenbuterol','eca_stack','thyroid_hormone'].includes(id); }) },
      { id: 'ai_insomnia', label: { ko: 'AI(아로마타제 억제제) 관련 불면', en: 'Aromatase inhibitor insomnia', ja: 'AI関連不眠' },
        condition: (m) => m.medications?.some(med => { const id = typeof med === 'object' ? med.id : med; return ['anastrozole','letrozole'].includes(id); }) }
    ],
    resolution: {
      diet: ['tryptophan_foods', 'avoid_late_eating', 'reduce_caffeine'],
      exercise: ['morning_exercise', 'avoid_evening_workout'],
      medication: ['melatonin_consideration', 'consult_dose_adjustment'],
      lifestyle: ['sleep_hygiene', 'blue_light_filter', 'avoid_stimulants']
    },
    hospitalThreshold: 4
  },

  // ── 피부·모발 ────────────────────────────
  cystic_acne: {
    causes: [
      { id: 'high_androgen', label: { ko: '안드로겐 과다', en: 'High androgen', ja: '高アンドロゲン' },
        condition: (m, mode) => mode === 'mtf' && m.testosteroneLevel != null && m.testosteroneLevel > 80 },
      { id: 'testosterone_dose', label: { ko: '테스토스테론 용량', en: 'Testosterone dosage', ja: 'テストステロン用量' },
        condition: (m, mode) => mode === 'ftm' && m.testosteroneLevel != null && m.testosteroneLevel > 1000 },
      { id: 'diet', label: { ko: '식단 (유제품/고GI)', en: 'Diet (dairy/high GI)', ja: '食事（乳製品/高GI）' },
        condition: () => true }
    ],
    resolution: {
      diet: ['reduce_dairy', 'low_glycemic', 'zinc_rich_foods'],
      exercise: ['shower_after_workout'],
      medication: ['topical_retinoid', 'consult_dermatologist'],
      lifestyle: ['clean_pillowcase', 'gentle_skincare']
    },
    hospitalThreshold: 4
  },

  hair_loss: {
    causes: [
      { id: 'dht', label: { ko: 'DHT 영향', en: 'DHT effect', ja: 'DHT影響' },
        condition: (m, mode) => mode === 'mtf' && m.testosteroneLevel != null && m.testosteroneLevel > 50 },
      { id: 'high_testosterone', label: { ko: '테스토스테론 과다', en: 'Excess testosterone', ja: '高テストステロン' },
        condition: (m, mode) => mode === 'ftm' && m.testosteroneLevel != null && m.testosteroneLevel > 1200 },
      { id: 'nutritional', label: { ko: '영양 결핍 (철분/비오틴)', en: 'Nutritional deficiency', ja: '栄養不足' },
        condition: () => true }
    ],
    resolution: {
      diet: ['iron_rich_foods', 'biotin', 'protein_adequate'],
      exercise: ['scalp_massage'],
      medication: ['finasteride_consideration', 'minoxidil'],
      lifestyle: ['gentle_styling', 'stress_reduction']
    },
    hospitalThreshold: 3
  },

  dry_skin: {
    causes: [
      { id: 'testosterone_effect', label: { ko: '안드로겐 저하 효과', en: 'Low androgen effect', ja: '低アンドロゲン効果' },
        condition: (m, mode) => mode === 'mtf' },
      { id: 'dehydration', label: { ko: '수분 부족', en: 'Dehydration', ja: '水分不足' },
        condition: () => true }
    ],
    resolution: {
      diet: ['hydration_2l', 'omega_3'],
      exercise: [],
      medication: ['moisturizer'],
      lifestyle: ['humidifier', 'lukewarm_shower']
    },
    hospitalThreshold: null
  },

  // ── 순환기·내장 ──────────────────────────
  dvt_symptoms: {
    causes: [
      { id: 'estrogen_thrombosis', label: { ko: '에스트로겐 혈전 위험', en: 'Estrogen thrombosis risk', ja: 'エストロゲン血栓リスク' },
        condition: (m, mode) => mode === 'mtf' },
      { id: 'immobility', label: { ko: '장시간 비활동', en: 'Prolonged immobility', ja: '長時間の不動' },
        condition: () => true },
      { id: 'smoking', label: { ko: '흡연', en: 'Smoking', ja: '喫煙' },
        condition: () => true }
    ],
    resolution: {
      diet: ['hydration', 'fiber'],
      exercise: ['regular_walking', 'calf_exercises'],
      medication: ['EMERGENCY_visit'],
      lifestyle: ['quit_smoking', 'compression_stockings']
    },
    hospitalThreshold: 2 // Very low threshold for DVT
  },

  jaundice: {
    causes: [
      { id: 'liver_toxicity', label: { ko: '간독성', en: 'Liver toxicity', ja: '肝毒性' },
        condition: () => true },
      { id: 'oral_estrogen', label: { ko: '경구 에스트로겐 부작용', en: 'Oral estrogen side effect', ja: '経口エストロゲン副作用' },
        condition: (m, mode) => mode === 'mtf' }
    ],
    resolution: {
      diet: ['liver_support_foods'],
      exercise: ['light_activity'],
      medication: ['EMERGENCY_visit', 'liver_function_test'],
      lifestyle: ['avoid_alcohol']
    },
    hospitalThreshold: 2
  },

  palpitations: {
    causes: [
      { id: 'high_estrogen', label: { ko: '에스트로겐 과다', en: 'High estrogen', ja: '高エストロゲン' },
        condition: (m, mode) => mode === 'mtf' && m.estrogenLevel != null && m.estrogenLevel > 300 },
      { id: 'electrolyte', label: { ko: '전해질 불균형', en: 'Electrolyte imbalance', ja: '電解質不均衡' },
        condition: () => true },
      { id: 'anxiety_related', label: { ko: '불안 관련', en: 'Anxiety-related', ja: '不安関連' },
        condition: () => true },
      // 신규: 연구보고서 기반
      { id: 'stimulant_palpitations', label: { ko: '자극제 심계항진 (β-agonist)', en: 'Stimulant palpitations', ja: '刺激薬動悸' },
        condition: (m) => m.medications?.some(med => { const id = typeof med === 'object' ? med.id : med; return ['clenbuterol','eca_stack'].includes(id); }) },
      { id: 'thyroid_palpitations', label: { ko: '갑상선호르몬 과량 빈맥', en: 'Thyroid hormone excess tachycardia', ja: '甲状腺過量頻脈' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'thyroid_hormone') },
      { id: 'vte_pe_flag', label: { ko: '⚠ PE/혈전 감별 필요', en: '⚠ Consider PE/VTE', ja: '⚠ PE/VTE鑑別必要' },
        condition: (m, mode) => mode === 'mtf' && m.medications?.some(med => { const id = typeof med === 'object' ? med.id : med; return ['estradiol_valerate','estradiol_hemihydrate','tamoxifen','cyproterone_acetate'].includes(id); }) },
      { id: 'spiro_electrolyte_k', label: { ko: '스피로놀락톤 고칼륨혈증 위험', en: 'Spironolactone hyperkalemia risk', ja: 'スピロ高カリウム血症リスク' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'spironolactone') }
    ],
    resolution: {
      diet: ['potassium_foods', 'magnesium', 'reduce_caffeine'],
      exercise: ['moderate_only'],
      medication: ['EMERGENCY_visit', 'consult_cardiologist'],
      lifestyle: ['stress_management', 'avoid_stimulants']
    },
    hospitalThreshold: 3
  },

  // ── 유방·가슴 ────────────────────────────
  breast_tenderness: {
    causes: [
      { id: 'breast_growth', label: { ko: '유방 발달 (정상)', en: 'Breast growth (normal)', ja: '乳房発達（正常）' },
        condition: (m, mode) => mode === 'mtf' },
      { id: 'high_estrogen', label: { ko: '에스트로겐 과다', en: 'High estrogen', ja: '高エストロゲン' },
        condition: (m, mode) => mode === 'mtf' && m.estrogenLevel != null && m.estrogenLevel > 250 }
    ],
    resolution: {
      diet: ['reduce_sodium', 'evening_primrose_oil'],
      exercise: ['supportive_bra_during_exercise'],
      medication: ['otc_pain_relief'],
      lifestyle: ['supportive_clothing', 'cold_compress']
    },
    hospitalThreshold: null
  },

  // ── 성기능·생식기 ─────────────────────────
  libido_decrease: {
    causes: [
      { id: 'testosterone_suppression', label: { ko: '테스토스테론 억제', en: 'Testosterone suppression', ja: 'テストステロン抑制' },
        condition: (m, mode) => mode === 'mtf' },
      { id: 'dosage_issue', label: { ko: '호르몬 용량 문제', en: 'Hormone dosage issue', ja: 'ホルモン用量問題' },
        condition: () => true }
    ],
    resolution: {
      diet: ['zinc_rich_foods', 'maca_root'],
      exercise: ['strength_training'],
      medication: ['consult_hrt_adjustment'],
      lifestyle: ['communication', 'stress_reduction']
    },
    hospitalThreshold: null
  },

  erectile_difficulty: {
    causes: [
      { id: 'antiandrogen_effect', label: { ko: '항안드로겐 효과', en: 'Anti-androgen effect', ja: '抗アンドロゲン効果' },
        condition: (m, mode) => mode === 'mtf' },
      { id: 'low_testosterone', label: { ko: '테스토스테론 부족', en: 'Low testosterone', ja: '低テストステロン' },
        condition: (m) => m.testosteroneLevel != null && m.testosteroneLevel < 30 }
    ],
    resolution: {
      diet: ['l_arginine_foods'],
      exercise: ['pelvic_floor_exercises'],
      medication: ['consult_urologist'],
      lifestyle: ['expectation_adjustment']
    },
    hospitalThreshold: null
  },

  // ── 전신·체형 ────────────────────────────
  fatigue: {
    causes: [
      { id: 'hormonal', label: { ko: '호르몬 적응기', en: 'Hormonal adjustment', ja: 'ホルモン適応期' },
        condition: () => true },
      { id: 'iron_deficiency', label: { ko: '철분 결핍', en: 'Iron deficiency', ja: '鉄分不足' },
        condition: (m, mode) => mode === 'ftm' },
      { id: 'low_b12', label: { ko: 'B12/D 결핍', en: 'B12/D deficiency', ja: 'B12/D不足' },
        condition: () => true }
    ],
    resolution: {
      diet: ['iron_rich_foods', 'b12_foods', 'vitamin_d'],
      exercise: ['light_walking', 'gradual_increase'],
      medication: ['blood_test_recommended'],
      lifestyle: ['sleep_8hours', 'hydration']
    },
    hospitalThreshold: 4
  },

  hot_flashes: {
    causes: [
      { id: 'hormone_fluctuation', label: { ko: '호르몬 변동', en: 'Hormone fluctuation', ja: 'ホルモン変動' },
        condition: () => true },
      { id: 'antiandrogen_effect', label: { ko: '항안드로겐 효과', en: 'Anti-androgen effect', ja: '抗アンドロゲン効果' },
        condition: (m, mode) => mode === 'mtf' },
      // 신규: 연구보고서 기반
      { id: 'gnrh_vasomotor', label: { ko: 'GnRH agonist 열감/혈관운동 증상', en: 'GnRH agonist vasomotor symptoms', ja: 'GnRH作動薬ほてり' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'gnrh_agonist') },
      { id: 'ai_hot_flashes', label: { ko: 'AI(아로마타제 억제제) 유발 열감', en: 'AI-induced hot flashes', ja: 'AI誘発ホットフラッシュ' },
        condition: (m) => m.medications?.some(med => { const id = typeof med === 'object' ? med.id : med; return ['anastrozole','letrozole'].includes(id); }) },
      { id: 'estrogen_trough', label: { ko: '에스트로겐 트로프/주기 끝 저하', en: 'Estrogen trough / missed dose', ja: 'E2トラフ/飲み忘れ' },
        condition: (m, mode) => mode === 'mtf' && m.estrogenLevel != null && m.estrogenLevel < 60 }
    ],
    resolution: {
      diet: ['soy_phytoestrogens', 'avoid_spicy', 'cold_drinks'],
      exercise: ['cooling_exercises'],
      medication: ['hrt_timing_adjustment', 'consult_hrt_adjustment'],
      lifestyle: ['layered_clothing', 'fan_nearby']
    },
    hospitalThreshold: 4
  },

  edema: {
    causes: [
      { id: 'spironolactone', label: { ko: '스피로노락톤 부작용', en: 'Spironolactone side effect', ja: 'スピロノラクトン副作用' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return id === 'spironolactone';
        })
      },
      { id: 'estrogen_retention', label: { ko: '에스트로겐 수분 저류', en: 'Estrogen water retention', ja: 'エストロゲン水分貯留' },
        condition: (m, mode) => mode === 'mtf' },
      { id: 'sodium_excess', label: { ko: '나트륨 과다', en: 'Excess sodium', ja: 'ナトリウム過多' },
        condition: () => true }
    ],
    resolution: {
      diet: ['reduce_sodium', 'potassium_foods', 'hydration'],
      exercise: ['walking', 'leg_elevation'],
      medication: ['consult_dose_adjustment'],
      lifestyle: ['compression_socks', 'avoid_standing_long']
    },
    hospitalThreshold: 4
  },

  weight_gain: {
    causes: [
      { id: 'fat_redistribution', label: { ko: '지방 재분배 (정상)', en: 'Fat redistribution (normal)', ja: '脂肪再分配（正常）' },
        condition: (m, mode) => mode === 'mtf' },
      { id: 'muscle_loss', label: { ko: '근육 감소', en: 'Muscle loss', ja: '筋肉減少' },
        condition: (m, mode) => mode === 'mtf' },
      { id: 'metabolic_change', label: { ko: '대사 변화', en: 'Metabolic change', ja: '代謝変化' },
        condition: () => true }
    ],
    resolution: {
      diet: ['calorie_awareness', 'protein_adequate', 'reduce_processed'],
      exercise: ['resistance_training', 'cardio_3x_week'],
      medication: ['thyroid_check'],
      lifestyle: ['meal_planning', 'portion_control']
    },
    hospitalThreshold: null
  },

  // ════════════════════════════════════════
  //  신규 증상 원인 트리 (Deep Research 기반)
  // ════════════════════════════════════════

  // ── 두통 ────────────────────────────────
  headache: {
    causes: [
      { id: 'estrogen_withdrawal_headache',
        label: { ko: '에스트로겐 급감 두통', en: 'Estrogen-withdrawal headache', ja: 'エストロゲン離脱頭痛' },
        condition: (m, mode) => mode === 'mtf' && m.estrogenLevel != null && m.estrogenLevel < 60 },
      { id: 'high_estrogen_headache',
        label: { ko: '에스트로겐 과다 두통', en: 'High estrogen headache', ja: '高エストロゲン頭痛' },
        condition: (m) => m.estrogenLevel != null && m.estrogenLevel > 200 },
      { id: 'cpa_meningioma_signal',
        label: { ko: '⚠ CPA 수막종 위험 신호 (EMA 경고)', en: '⚠ CPA meningioma risk (EMA warning)', ja: '⚠ CPA髄膜腫リスク（EMA警告）' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'cyproterone_acetate') },
      { id: 'vte_stroke_warning',
        label: { ko: '⚠ 혈전/뇌혈관 사건 경고', en: '⚠ VTE or stroke warning', ja: '⚠ 血栓/脳血管イベント警告' },
        condition: (m, mode) => mode === 'mtf' && m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['estradiol_valerate','estradiol_hemihydrate','tamoxifen'].includes(id);
        }) },
      { id: 'pde5_headache',
        label: { ko: 'PDE5 억제제 두통 (혈관확장)', en: 'PDE5 inhibitor headache (vasodilation)', ja: 'PDE5阻害薬の頭痛' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['sildenafil','tadalafil'].includes(id);
        }) }
    ],
    resolution: {
      diet: ['hydration', 'reduce_sodium', 'reduce_caffeine'],
      exercise: ['light_walking'],
      medication: ['blood_pressure_check', 'consult_hrt_adjustment'],
      lifestyle: ['stress_management', 'sleep_hygiene']
    },
    hospitalThreshold: 3
  },

  // ── 관절통 ───────────────────────────────
  joint_pain: {
    causes: [
      { id: 'ai_arthralgia',
        label: { ko: 'AI(아로마타제 억제제) 관절통 — 흔한 부작용', en: 'AI arthralgia — common AE', ja: 'AI関節痛（よくある副作用）' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['anastrozole','letrozole'].includes(id);
        }) },
      { id: 'hypoestrogen_joint',
        label: { ko: '저에스트로겐 관절통 (E2<50)', en: 'Hypoestrogenic joint pain (E2<50)', ja: '低E2関節痛' },
        condition: (m) => m.estrogenLevel != null && m.estrogenLevel < 50 },
      { id: 'gnrh_joint',
        label: { ko: 'GnRH agonist 저성호르몬 관절통', en: 'GnRH hypogonadal joint pain', ja: 'GnRH低ゴナドトロピン関節痛' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'gnrh_agonist') },
      { id: 'stanozolol_joint',
        label: { ko: '스타노졸롤 관절 건조 (근거 약함)', en: 'Stanozolol joint dryness (weak evidence)', ja: 'スタノゾロール関節症状（弱い根拠）' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'stanozolol') }
    ],
    resolution: {
      diet: ['omega_3', 'hydration', 'anti_inflammatory_foods'],
      exercise: ['light_walking', 'yoga', 'moderate_only'],
      medication: ['consult_hrt_adjustment', 'consult_dose_adjustment'],
      lifestyle: ['joint_care', 'warm_compress']
    },
    hospitalThreshold: 4
  },

  // ── 오심 ─────────────────────────────────
  nausea: {
    causes: [
      { id: 'glp1_nausea',
        label: { ko: 'GLP-1 작용제 오심 — 매우 흔함', en: 'GLP-1 agonist nausea — very common', ja: 'GLP-1の悪心（非常に多い）' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['semaglutide','liraglutide'].includes(id);
        }) },
      { id: 'oral_estrogen_nausea',
        label: { ko: '경구 에스트로겐 오심 (간 1차 통과)', en: 'Oral estrogen nausea (hepatic first-pass)', ja: '経口E2悪心（初回通過効果）' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['estradiol_valerate','estradiol_hemihydrate'].includes(id);
        }) },
      { id: 'dili_prodrome_nausea',
        label: { ko: '⚠ 간손상 전구 오심 (AAS/CPA/비칼/타목시펜)', en: '⚠ DILI prodrome nausea', ja: '⚠ 肝障害前駆の悪心' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['methandienone','anadrol','oxandrolone','stanozolol','cyproterone_acetate','bicalutamide','tamoxifen'].includes(id);
        }) }
    ],
    resolution: {
      diet: ['small_frequent_meals', 'ginger_tea', 'avoid_fatty_foods'],
      exercise: ['light_walking'],
      medication: ['consult_dose_adjustment', 'EMERGENCY_visit'],
      lifestyle: ['rest', 'hydration']
    },
    hospitalThreshold: 4
  },

  // ── 우상복부 통증 (간 독성 경고) ──────────────
  ruq_pain: {
    causes: [
      { id: 'aas_hepatotoxicity',
        label: { ko: '⚠ 경구 AAS 간독성 (즉시 중단 고려)', en: '⚠ Oral AAS hepatotoxicity (consider stopping)', ja: '⚠ 経口AAS肝毒性（中断検討）' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['methandienone','anadrol','oxandrolone','stanozolol'].includes(id);
        }) },
      { id: 'cpa_hepatotoxicity',
        label: { ko: '⚠ CPA 간독성 (DILI)', en: '⚠ CPA hepatotoxicity (DILI)', ja: '⚠ CPA肝毒性（DILI）' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'cyproterone_acetate') },
      { id: 'bicalutamide_hepatitis',
        label: { ko: '⚠ 비칼루타미드 간염 위험 (초기 4개월)', en: '⚠ Bicalutamide hepatitis risk (first 4 months)', ja: '⚠ ビカルタミド肝炎リスク（初期4か月）' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'bicalutamide') },
      { id: 'glp1_gallbladder',
        label: { ko: '⚠ GLP-1 담낭 질환 (FDA 경고)', en: '⚠ GLP-1 gallbladder disease (FDA warning)', ja: '⚠ GLP-1胆嚢疾患（FDA警告）' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['semaglutide','liraglutide'].includes(id);
        }) },
      { id: 'tamoxifen_liver',
        label: { ko: '타목시펜 간 부작용', en: 'Tamoxifen hepatic effects', ja: 'タモキシフェン肝作用' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'tamoxifen') }
    ],
    resolution: {
      diet: ['avoid_alcohol', 'liver_support_foods', 'avoid_fatty_foods'],
      exercise: ['light_activity'],
      medication: ['EMERGENCY_visit', 'liver_function_test'],
      lifestyle: ['stop_hepatotoxic_meds_consult']
    },
    hospitalThreshold: 2
  },

  // ── 피부 건조 ─────────────────────────────
  xeroderma: {
    causes: [
      { id: 'hypoestrogen_skin_dry',
        label: { ko: '저에스트로겐 피부 건조 (E2<50)', en: 'Hypoestrogenic skin dryness (E2<50)', ja: '低E2皮膚乾燥' },
        condition: (m) => m.estrogenLevel != null && m.estrogenLevel < 50 },
      { id: 'ai_estrogen_crash',
        label: { ko: 'AI 에스트로겐 급락 (anastrozole/letrozole)', en: 'AI-induced estrogen crash', ja: 'AI由来E2急低下' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['anastrozole','letrozole'].includes(id);
        }) },
      { id: 'gnrh_hypogonadal_skin',
        label: { ko: 'GnRH 저성호르몬 피부 변화', en: 'GnRH hypogonadal skin changes', ja: 'GnRH低ゴナドトロピン皮膚変化' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'gnrh_agonist') }
    ],
    resolution: {
      diet: ['omega_3', 'hydration_2l', 'vitamin_d'],
      exercise: [],
      medication: ['moisturizer', 'consult_hrt_adjustment'],
      lifestyle: ['humidifier', 'lukewarm_shower', 'gentle_skincare']
    },
    hospitalThreshold: null
  },

  // ── 만성 피로 ─────────────────────────────
  chronic_fatigue: {
    causes: [
      { id: 'dili_fatigue',
        label: { ko: '⚠ 약물유발 간손상 전구 피로 (AAS/CPA/비칼/타목)', en: '⚠ DILI prodrome fatigue', ja: '⚠ 薬物性肝障害前駆疲労' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['methandienone','anadrol','oxandrolone','stanozolol','cyproterone_acetate','bicalutamide','tamoxifen'].includes(id);
        }) },
      { id: 'spiro_electrolyte',
        label: { ko: '스피로놀락톤 전해질 이상 (고칼륨혈증)', en: 'Spironolactone electrolyte abnormality', ja: 'スピロ電解質異常' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'spironolactone') },
      { id: 'androgen_withdrawal_fatigue',
        label: { ko: '안드로겐 금단 피로 (T 중단/감량)', en: 'Androgen withdrawal fatigue', ja: 'アンドロゲン離脱疲労' },
        condition: (m, mode) => mode === 'ftm' && m.testosteroneLevel != null && m.testosteroneLevel < 200 },
      { id: 'low_estrogen_fatigue',
        label: { ko: '저에스트로겐 피로 (GnRH/AI)', en: 'Hypoestrogenic fatigue (GnRH/AI)', ja: '低E2による疲労' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['gnrh_agonist','anastrozole','letrozole'].includes(id);
        }) || (m.estrogenLevel != null && m.estrogenLevel < 70) }
    ],
    resolution: {
      diet: ['iron_rich_foods', 'b12_foods', 'liver_support_foods'],
      exercise: ['light_walking', 'gradual_increase'],
      medication: ['liver_function_test', 'blood_test_recommended', 'EMERGENCY_visit'],
      lifestyle: ['sleep_8hours', 'hydration', 'avoid_alcohol']
    },
    hospitalThreshold: 3
  },

  // ── 손 떨림 ───────────────────────────────
  tremor: {
    causes: [
      { id: 'clenbuterol_toxicity',
        label: { ko: '⚠ 클렌부테롤 독성 (β-agonist 과다)', en: '⚠ Clenbuterol β-agonist toxicity', ja: '⚠ クレンブテロールβ-agonist毒性' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'clenbuterol') },
      { id: 'thyroid_excess_tremor',
        label: { ko: '갑상선호르몬 과량 떨림 (FDA 라벨 명시)', en: 'Thyroid hormone excess tremor (FDA label)', ja: '甲状腺ホルモン過量振戦' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'thyroid_hormone') },
      { id: 'ephedrine_stimulant',
        label: { ko: '에페드린/카페인 스택 교감신경 자극', en: 'Ephedrine/caffeine stack stimulation', ja: 'エフェドリン/カフェインスタック刺激' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'eca_stack') },
      { id: 'estrogen_fluctuation_tremor',
        label: { ko: '에스트로겐 급변 (자율신경 영향)', en: 'E2 rapid fluctuation (autonomic effects)', ja: 'E2急変（自律神経影響）' },
        condition: (m, mode) => mode === 'mtf' && m.estrogenLevel != null && (m.estrogenLevel > 400 || m.estrogenLevel < 30) }
    ],
    resolution: {
      diet: ['reduce_caffeine', 'potassium_foods', 'magnesium'],
      exercise: ['light_activity'],
      medication: ['EMERGENCY_visit', 'consult_dose_adjustment'],
      lifestyle: ['avoid_stimulants', 'stress_management']
    },
    hospitalThreshold: 3
  },

  // ── 근감소 ─────────────────────────────────
  sarcopenia: {
    causes: [
      { id: 'low_androgens',
        label: { ko: '저안드로겐 / 성선기능저하 (T<300)', en: 'Low androgens/hypogonadism (T<300)', ja: '低アンドロゲン/性腺機能低下' },
        condition: (m, mode) => mode === 'ftm' && m.testosteroneLevel != null && m.testosteroneLevel < 300 },
      { id: 'post_aas_crash',
        label: { ko: 'AAS 중단 후 HPG 축 억제 회복 (금단)', en: 'Post-AAS HPG axis crash', ja: 'AAS後HPG軸クラッシュ' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['methandienone','anadrol','oxandrolone','stanozolol','trenbolone'].includes(id);
        }) && m.muscleMass != null && m.muscleMass < 40 },
      { id: 'ai_caloric_deficit',
        label: { ko: 'AI + 칼로리 적자 근손실', en: 'AI + caloric deficit muscle loss', ja: 'AI＋エネルギー不足による筋肉減少' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['anastrozole','letrozole'].includes(id);
        }) && m.weight != null }
    ],
    resolution: {
      diet: ['protein_adequate', 'calorie_awareness', 'iron_rich_foods'],
      exercise: ['resistance_training', 'strength_training'],
      medication: ['consult_hrt_adjustment', 'blood_test_recommended'],
      lifestyle: ['progressive_overload', 'recovery_sleep']
    },
    hospitalThreshold: 4
  },

  // ── 성욕 감퇴 ─────────────────────────────
  low_libido: {
    causes: [
      { id: 'excessive_androgen_suppression',
        label: { ko: '과도한 안드로겐 억제 (T<20, GnRH/CPA)', en: 'Excessive androgen suppression (T<20)', ja: '過度なアンドロゲン抑制' },
        condition: (m, mode) => mode === 'mtf' && m.testosteroneLevel != null && m.testosteroneLevel < 20 },
      { id: 'gnrh_libido_suppression',
        label: { ko: 'GnRH agonist 성욕 억제 (저성호르몬)', en: 'GnRH agonist libido suppression', ja: 'GnRH作動薬性欲抑制' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'gnrh_agonist') },
      { id: 'finasteride_sexual_ae',
        label: { ko: '5α 억제제 성기능 부작용 (FDA 라벨)', en: '5α-reductase inhibitor sexual AEs (FDA)', ja: '5α阻害薬性機能副作用' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['finasteride','dutasteride'].includes(id);
        }) },
      { id: 'hypoestrogen_sexual',
        label: { ko: '저에스트로겐 성기능 저하 + 질건조', en: 'Hypoestrogenic sexual dysfunction + vaginal dryness', ja: '低E2性機能低下＋膣乾燥' },
        condition: (m) => m.estrogenLevel != null && m.estrogenLevel < 50 },
      { id: 'depression_secondary_libido',
        label: { ko: '우울 2차 성욕 감퇴', en: 'Depression-secondary libido loss', ja: '抑うつ二次的性欲低下' },
        condition: () => true }
    ],
    resolution: {
      diet: ['zinc_rich_foods', 'maca_root', 'omega_3'],
      exercise: ['strength_training'],
      medication: ['consult_hrt_adjustment', 'mental_health_consult'],
      lifestyle: ['communication', 'stress_reduction']
    },
    hospitalThreshold: null
  },

  // ── 여유증 ─────────────────────────────────
  gynecomastia: {
    causes: [
      { id: 'spiro_gynecomastia',
        label: { ko: '스피로놀락톤 여유증 (용량 의존, 1~12개월)', en: 'Spironolactone gynecomastia (dose-dependent)', ja: 'スピロ女性化乳房（用量依存）' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'spironolactone') },
      { id: 'bicalutamide_gynecomastia',
        label: { ko: '비칼루타미드 여유증 (AR 차단 → E2 상대 우세)', en: 'Bicalutamide gynecomastia (AR block → E2 dominance)', ja: 'ビカルタミド女性化乳房' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'bicalutamide') },
      { id: 'aas_aromatization',
        label: { ko: 'AAS 아로마타이제이션 (T→E2 전환)', en: 'AAS aromatization (T→E2 conversion)', ja: 'AASアロマタイゼーション' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['methandienone','anadrol','testosterone_enanthate','testosterone_cypionate'].includes(id);
        }) && m.estrogenLevel != null && m.estrogenLevel > 150 },
      { id: 'ai_insufficient',
        label: { ko: 'AI 용량 부족 (테스토스테론 병합 시)', en: 'Insufficient AI dosing (with testosterone)', ja: 'AI不足（テストステロン併用）' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['testosterone_enanthate','testosterone_cypionate'].includes(id);
        }) && m.estrogenLevel != null && m.estrogenLevel > 200 }
    ],
    resolution: {
      diet: ['reduce_alcohol', 'anti_inflammatory_foods'],
      exercise: ['strength_training', 'cardio_3x_week'],
      medication: ['consult_dose_adjustment', 'consult_hrt_adjustment'],
      lifestyle: ['monitor_e2_levels']
    },
    hospitalThreshold: 4
  },

  // ── 가슴 몽우리 ───────────────────────────
  breast_budding: {
    causes: [
      { id: 'estrogen_development',
        label: { ko: '에스트로겐 유방 발달 시작 (정상, 1~6개월)', en: 'Estrogen breast development onset (normal)', ja: 'エストロゲン乳房発達開始（正常）' },
        condition: (m, mode) => mode === 'mtf' && m.estrogenLevel != null && m.estrogenLevel > 80 },
      { id: 'progesterone_stimulation',
        label: { ko: '프로게스테론 병합 자극 효과', en: 'Progesterone combined stimulation effect', ja: 'プロゲステロン併用刺激効果' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'progesterone') }
    ],
    resolution: {
      diet: ['evening_primrose_oil'],
      exercise: ['supportive_bra_during_exercise'],
      medication: ['otc_pain_relief'],
      lifestyle: ['supportive_clothing', 'cold_compress']
    },
    hospitalThreshold: null
  },

  // ── 고환 위축 ─────────────────────────────
  testicular_atrophy: {
    causes: [
      { id: 'exogenous_t_suppression',
        label: { ko: '외인성 T → HPG 축 억제 → 고환 위축', en: 'Exogenous T → HPG suppression → atrophy', ja: '外因性T→HPG抑制→精巣萎縮' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['testosterone_enanthate','testosterone_cypionate','testosterone_undecanoate','testosterone_gel'].includes(id);
        }) },
      { id: 'aas_hpg_suppression',
        label: { ko: 'AAS HPG 축 억제 (무정자증 동반 가능)', en: 'AAS HPG suppression (possible azoospermia)', ja: 'AAS HPG軸抑制（無精子症）' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['methandienone','anadrol','oxandrolone','stanozolol','trenbolone','masteron'].includes(id);
        }) },
      { id: 'gnrh_testicular',
        label: { ko: 'GnRH agonist 고환 억제 (가역적)', en: 'GnRH agonist testicular suppression (reversible)', ja: 'GnRH作動薬精巣抑制（可逆的）' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'gnrh_agonist') }
    ],
    resolution: {
      diet: ['zinc_rich_foods'],
      exercise: ['moderate_only'],
      medication: ['fertility_consult'],
      lifestyle: ['fertility_preservation_discussion']
    },
    hospitalThreshold: null
  },

  // ── 무월경 ─────────────────────────────────
  amenorrhea: {
    causes: [
      { id: 't_induced_amenorrhea',
        label: { ko: '테스토스테론 유발 무월경 (6개월 내 대부분 도달)', en: 'Testosterone-induced amenorrhea (most within 6mo)', ja: 'T誘発無月経（6か月内到達多い）' },
        condition: (m, mode) => mode === 'ftm' && m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['testosterone_enanthate','testosterone_cypionate','testosterone_gel','testosterone_undecanoate'].includes(id);
        }) },
      { id: 'low_body_fat_hypothalamic',
        label: { ko: '저체지방/에너지 결핍성 시상하부 무월경', en: 'Hypothalamic amenorrhea (low energy/body fat)', ja: '低体脂肪/エネルギー不足による視床下部性無月経' },
        condition: (m) => (m.bodyFatPercentage != null && m.bodyFatPercentage < 15) ||
                          (m.weight != null && m.height != null && (m.weight / ((m.height / 100) ** 2)) < 18.5) }
    ],
    resolution: {
      diet: ['calorie_awareness', 'protein_adequate', 'iron_rich_foods'],
      exercise: ['moderate_only'],
      medication: ['fertility_consult', 'gynecology_consult'],
      lifestyle: ['fertility_preservation_discussion']
    },
    hospitalThreshold: null
  },

  // ── 부정 출혈 ─────────────────────────────
  irregular_bleeding: {
    causes: [
      { id: 't_early_bleeding',
        label: { ko: '테스토스테론 초기 spotting (3개월 내 흔함)', en: 'Early testosterone spotting (common ≤3mo)', ja: 'テストステロン開始初期の出血（3か月内多い）' },
        condition: (m, mode) => mode === 'ftm' && m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['testosterone_enanthate','testosterone_cypionate','testosterone_gel','testosterone_undecanoate'].includes(id);
        }) },
      { id: 'tamoxifen_uterine',
        label: { ko: '⚠ 타목시펜 자궁내막 출혈 (즉시 평가 권장)', en: '⚠ Tamoxifen uterine bleeding (immediate evaluation)', ja: '⚠ タモキシフェン子宮内膜出血（即時評価推奨）' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'tamoxifen') },
      { id: 'e2_p4_imbalance',
        label: { ko: 'E2/P4 불균형 (에스트로겐 우세)', en: 'E2/P4 imbalance (estrogen dominance)', ja: 'E2/P4不均衡（エストロゲン優位）' },
        condition: (m, mode) => mode === 'mtf' && m.estrogenLevel != null && m.estrogenLevel > 300 }
    ],
    resolution: {
      diet: ['iron_rich_foods'],
      exercise: ['moderate_only'],
      medication: ['gynecology_consult', 'consult_hrt_adjustment'],
      lifestyle: ['track_bleeding_pattern']
    },
    hospitalThreshold: 3
  },

  // ── 발기 부전 ─────────────────────────────
  erectile_dysfunction: {
    causes: [
      { id: 'low_androgen_ed',
        label: { ko: '저안드로겐 발기 부전 (T<300)', en: 'ED from low androgens (T<300)', ja: '低アンドロゲンED' },
        condition: (m) => m.testosteroneLevel != null && m.testosteroneLevel < 300 },
      { id: 'antiandrogen_ed',
        label: { ko: '항안드로겐 발기 부전 (스피로/비칼/CPA/GnRH)', en: 'Antiandrogen-related ED', ja: '抗アンドロゲンED' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['spironolactone','bicalutamide','cyproterone_acetate','gnrh_agonist'].includes(id);
        }) },
      { id: 'finasteride_ed',
        label: { ko: '피나스테리드/두타스테리드 발기 부전 (FDA 라벨)', en: 'Finasteride/dutasteride ED (FDA label)', ja: 'フィナステリドED（FDA）' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['finasteride','dutasteride'].includes(id);
        }) },
      { id: 'vascular_proxy_ed',
        label: { ko: '혈관성 위험 (복부비만 지수 WHtR≥0.5)', en: 'Vascular risk proxy (WHtR≥0.5)', ja: '血管性リスク（WHtR≥0.5）' },
        condition: (m) => m.waist != null && m.height != null && (m.waist / m.height) >= 0.5 }
    ],
    resolution: {
      diet: ['l_arginine_foods', 'reduce_processed', 'omega_3'],
      exercise: ['cardio_30min', 'pelvic_floor_exercises'],
      medication: ['consult_hrt_adjustment', 'consult_urologist'],
      lifestyle: ['stress_reduction', 'sleep_hygiene']
    },
    hospitalThreshold: null
  },

  // ── 손발 저림 / 감각 이상 ─────────────────
  paresthesia: {
    causes: [
      { id: 'clenbuterol_hypokalemia',
        label: { ko: '⚠ 클렌부테롤 저칼륨혈증 (전해질 이상)', en: '⚠ Clenbuterol-related hypokalemia', ja: '⚠ クレンブテロール低K血症' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'clenbuterol') },
      { id: 'gnrh_neuro_effects',
        label: { ko: 'GnRH agonist 신경 증상 (leuprolide 보고)', en: 'GnRH agonist neurological effects (leuprolide)', ja: 'GnRH作動薬神経症状' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'gnrh_agonist') },
      { id: 'stimulant_adrenergic',
        label: { ko: '자극제 교감신경 항진 (저림/경련)', en: 'Stimulant adrenergic effects (tingling/cramps)', ja: '刺激薬交感神経亢進' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['eca_stack','clenbuterol'].includes(id);
        }) }
    ],
    resolution: {
      diet: ['potassium_foods', 'magnesium', 'b12_foods'],
      exercise: ['light_walking'],
      medication: ['EMERGENCY_visit', 'blood_test_recommended'],
      lifestyle: ['avoid_stimulants']
    },
    hospitalThreshold: 3
  },

  // ── 모발 가늘어짐 ─────────────────────────
  hair_thinning: {
    causes: [
      { id: 'androgen_miniaturization',
        label: { ko: '안드로겐성 모발 미니어처화 (DHT)', en: 'Androgenic hair miniaturization (DHT)', ja: 'アンドロゲン性軟毛化（DHT）' },
        condition: (m, mode) => mode === 'ftm' && m.testosteroneLevel != null && m.testosteroneLevel > 500 },
      { id: 'dht_male_pattern',
        label: { ko: 'DHT 매개 남성형 탈모 (5α 전환)', en: 'DHT-mediated androgenetic alopecia', ja: 'DHT媒介男性型脱毛' },
        condition: (m) => m.testosteroneLevel != null && m.testosteroneLevel > 700 },
      { id: 'thyroid_hair_loss',
        label: { ko: '갑상선호르몬 관련 모발 변화 (비특이)', en: 'Thyroid-related hair changes (nonspecific)', ja: '甲状腺関連毛髪変化（非特異）' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'thyroid_hormone') },
      { id: 'low_estrogen_hair',
        label: { ko: '저에스트로겐 모발 변화 (AI/GnRH)', en: 'Low estrogen hair changes (AI/GnRH)', ja: '低E2毛髪変化' },
        condition: (m) => m.estrogenLevel != null && m.estrogenLevel < 50 }
    ],
    resolution: {
      diet: ['biotin', 'iron_rich_foods', 'protein_adequate'],
      exercise: ['scalp_massage'],
      medication: ['minoxidil', 'consult_dermatologist'],
      lifestyle: ['gentle_styling', 'stress_reduction']
    },
    hospitalThreshold: null
  },

  // ── 지성 피부 / 피지 과다 ──────────────────
  seborrhea: {
    causes: [
      { id: 'androgen_sebum',
        label: { ko: '안드로겐성 피지 과다 (T>700)', en: 'Androgen-driven seborrhea (T>700)', ja: 'アンドロゲン性皮脂過多' },
        condition: (m) => m.testosteroneLevel != null && m.testosteroneLevel > 700 },
      { id: 'inadequate_antiandrogen_sebum',
        label: { ko: '항안드로겐 억제 불충분 (MTF, T>60)', en: 'Insufficient anti-androgen (MTF, T>60)', ja: '抗アンドロゲン不足（MTF）' },
        condition: (m, mode) => mode === 'mtf' && m.testosteroneLevel != null && m.testosteroneLevel > 60 }
    ],
    resolution: {
      diet: ['reduce_dairy', 'low_glycemic', 'zinc_rich_foods'],
      exercise: ['shower_after_workout'],
      medication: ['consult_dermatologist', 'consult_hrt_adjustment'],
      lifestyle: ['gentle_skincare', 'clean_pillowcase']
    },
    hospitalThreshold: null
  },

  // ── 심계항진 (표준 ID: palpitation) ──────────
  palpitation: {
    causes: [
      { id: 'stimulant_palpitations_direct',
        label: { ko: '⚠ 클렌부테롤/ECA 심계항진', en: '⚠ Clenbuterol/ECA palpitations', ja: '⚠ クレンブテロール/ECA動悸' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['clenbuterol','eca_stack'].includes(id);
        }) },
      { id: 'thyroid_tachycardia',
        label: { ko: '갑상선호르몬 과량 빈맥 (FDA 라벨)', en: 'Thyroid excess tachycardia (FDA label)', ja: '甲状腺過量頻脈' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'thyroid_hormone') },
      { id: 'vte_pe_signal',
        label: { ko: '⚠ 에스트로겐/타목시펜 혈전 신호 (PE 감별)', en: '⚠ Estrogen/tamoxifen VTE signal (PE differential)', ja: '⚠ エストロゲン/タモキシフェン血栓シグナル' },
        condition: (m, mode) => mode === 'mtf' && m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['estradiol_valerate','estradiol_hemihydrate','tamoxifen','cyproterone_acetate'].includes(id);
        }) },
      { id: 'spiro_k_imbalance',
        label: { ko: '스피로놀락톤 칼륨 불균형', en: 'Spironolactone potassium imbalance', ja: 'スピロニカリウム不均衡' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'spironolactone') }
    ],
    resolution: {
      diet: ['potassium_foods', 'magnesium', 'reduce_caffeine'],
      exercise: ['moderate_only'],
      medication: ['EMERGENCY_visit', 'consult_cardiologist'],
      lifestyle: ['avoid_stimulants', 'stress_management']
    },
    hospitalThreshold: 3
  },

  // ── 호흡 곤란 ─────────────────────────────
  dyspnea: {
    causes: [
      { id: 'pe_suspected',
        label: { ko: '⚠⚠ 폐색전 의심 (즉시 응급)', en: '⚠⚠ Suspected pulmonary embolism (ER now)', ja: '⚠⚠ 肺塞栓疑い（即時救急）' },
        condition: (m, mode) => mode === 'mtf' && m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['estradiol_valerate','estradiol_hemihydrate','tamoxifen','cyproterone_acetate'].includes(id);
        }) },
      { id: 'anastrozole_dyspnea',
        label: { ko: 'anastrozole 호흡곤란 (흔한 보고)', en: 'Anastrozole dyspnea (commonly reported)', ja: 'アナストロゾール呼吸困難' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'anastrozole') }
    ],
    resolution: {
      diet: ['hydration'],
      exercise: [],
      medication: ['EMERGENCY_visit'],
      lifestyle: ['call_emergency_services']
    },
    hospitalThreshold: 2
  },

  // ── 뇌 안개 (brain_fog 표준 ID) ─────────────
  brain_fog: {
    causes: [
      { id: 'sleep_disruption_fog',
        label: { ko: '수면 장애 연관 (브레인 포그 주요 원인)', en: 'Sleep disruption (major cause)', ja: '睡眠障害（主原因）' },
        condition: () => true },
      { id: 'finasteride_fog',
        label: { ko: '피나스테리드 인지 저하 보고 (불확실)', en: 'Finasteride cognitive fog (uncertain)', ja: 'フィナステリド認知低下報告（不確実）' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['finasteride','dutasteride'].includes(id);
        }) },
      { id: 'hypoestrogen_cognitive',
        label: { ko: '저에스트로겐 인지 저하 (AI/GnRH)', en: 'Hypoestrogenic cognitive effects (AI/GnRH)', ja: '低E2認知影響' },
        condition: (m) => m.estrogenLevel != null && m.estrogenLevel < 50 }
    ],
    resolution: {
      diet: ['omega_3', 'b12_foods', 'magnesium'],
      exercise: ['cardio_30min', 'outdoor_walk'],
      medication: ['blood_test_recommended'],
      lifestyle: ['sleep_hygiene', 'stress_management']
    },
    hospitalThreshold: 4
  },

  // ── 홍조 (flushing 표준 ID) ─────────────────
  flushing: {
    causes: [
      { id: 'pde5_flushing',
        label: { ko: 'PDE5 억제제 홍조 (혈관 확장)', en: 'PDE5 inhibitor flushing (vasodilation)', ja: 'PDE5阻害薬紅潮' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['sildenafil','tadalafil'].includes(id);
        }) },
      { id: 'vasomotor_hypoestrogen',
        label: { ko: '저에스트로겐 혈관운동 홍조 (E2<50)', en: 'Vasomotor flushing (E2<50)', ja: '血管運動性紅潮（低E2）' },
        condition: (m) => m.estrogenLevel != null && m.estrogenLevel < 50 },
      { id: 'gnrh_flushing',
        label: { ko: 'GnRH agonist 열감/홍조 (FDA 라벨)', en: 'GnRH agonist hot flashes/flushing (FDA)', ja: 'GnRH作動薬のほてり/紅潮' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'gnrh_agonist') }
    ],
    resolution: {
      diet: ['avoid_spicy', 'cold_drinks'],
      exercise: ['cooling_exercises'],
      medication: ['hrt_timing_adjustment'],
      lifestyle: ['layered_clothing', 'fan_nearby']
    },
    hospitalThreshold: null
  },

  // ── 과다 발한 (hyperhidrosis 표준 ID) ─────────
  hyperhidrosis: {
    causes: [
      { id: 'thyroid_sweating',
        label: { ko: '갑상선호르몬 과량 발한 (FDA 라벨)', en: 'Thyroid hormone excess sweating (FDA)', ja: '甲状腺過量発汗' },
        condition: (m) => m.medications?.some(med => (typeof med === 'object' ? med.id : med) === 'thyroid_hormone') },
      { id: 'vasomotor_sweats',
        label: { ko: '저에스트로겐 혈관운동 발한 (AI/GnRH)', en: 'Vasomotor sweating (AI/GnRH/low E2)', ja: '低E2血管運動性発汗' },
        condition: (m) => m.estrogenLevel != null && m.estrogenLevel < 50 },
      { id: 'stimulant_sweating',
        label: { ko: '자극제 과다 발한 (클렌/ECA)', en: 'Stimulant-induced sweating (clen/ECA)', ja: '刺激薬による発汗' },
        condition: (m) => m.medications?.some(med => {
          const id = typeof med === 'object' ? med.id : med;
          return ['clenbuterol','eca_stack'].includes(id);
        }) }
    ],
    resolution: {
      diet: ['hydration_2l', 'avoid_spicy'],
      exercise: ['cooling_exercises'],
      medication: ['thyroid_check', 'consult_hrt_adjustment'],
      lifestyle: ['layered_clothing', 'fan_nearby']
    },
    hospitalThreshold: null
  }
};


// ════════════════════════════════════════════
//  3. 복합 증상 패턴 (Compound Analysis)
// ════════════════════════════════════════════

/**
 * Each pattern: trigger symptoms → combined diagnosis + severity + recommendations
 */
export const COMPOUND_PATTERNS = [
  {
    id: 'dvt_cluster',
    symptoms: ['dvt_symptoms', 'edema', 'palpitations'],
    minMatch: 2,
    severity: 'critical',
    label: { ko: '혈전 위험 클러스터', en: 'DVT Risk Cluster', ja: '血栓リスククラスター' },
    description: {
      ko: '여러 순환기 증상이 동시에 나타나고 있습니다. 즉시 병원을 방문하세요.',
      en: 'Multiple circulatory symptoms detected simultaneously. Visit a hospital immediately.',
      ja: '複数の循環器症状が同時に出現しています。直ちに病院を受診してください。'
    },
    action: { ko: '응급실 방문', en: 'Visit ER', ja: '緊急外来受診' }
  },
  {
    id: 'liver_cluster',
    symptoms: ['jaundice', 'fatigue', 'nausea'],
    minMatch: 2,
    severity: 'critical',
    label: { ko: '간 기능 이상 의심', en: 'Suspected Liver Dysfunction', ja: '肝機能異常疑い' },
    description: {
      ko: '간 관련 증상이 복합적으로 나타납니다. 간 기능 검사가 필요합니다.',
      en: 'Multiple liver-related symptoms detected. Liver function tests needed.',
      ja: '肝関連症状が複合的に現れています。肝機能検査が必要です。'
    },
    action: { ko: '간 기능 검사 (LFT)', en: 'Liver Function Test (LFT)', ja: '肝機能検査（LFT）' }
  },
  {
    id: 'mental_health_cluster',
    symptoms: ['depression', 'anxiety', 'insomnia', 'mood_swings'],
    minMatch: 3,
    severity: 'warning',
    label: { ko: '정신건강 복합 증상', en: 'Mental Health Cluster', ja: 'メンタルヘルス複合症状' },
    description: {
      ko: '여러 정신건강 증상이 함께 나타나고 있어 전문 상담이 권장됩니다.',
      en: 'Multiple mental health symptoms co-occurring. Professional consultation recommended.',
      ja: '複数のメンタルヘルス症状が同時に出現しており、専門相談が推奨されます。'
    },
    action: { ko: '정신건강 전문 상담', en: 'Mental health consultation', ja: 'メンタルヘルス専門相談' }
  },
  {
    id: 'estrogen_excess_cluster',
    symptoms: ['breast_tenderness', 'mood_swings', 'edema', 'headache'],
    minMatch: 3,
    severity: 'warning',
    modeFilter: 'mtf',
    label: { ko: '에스트로겐 과다 의심', en: 'Suspected Estrogen Excess', ja: 'エストロゲン過多疑い' },
    description: {
      ko: '에스트로겐 과다 복용 시 나타나는 전형적인 증상 패턴입니다. 호르몬 수치 확인이 필요합니다.',
      en: 'Classic pattern of estrogen excess. Hormone level check needed.',
      ja: 'エストロゲン過多の典型的な症状パターンです。ホルモン値の確認が必要です。'
    },
    action: { ko: '에스트로겐 수치 검사', en: 'Estrogen level test', ja: 'エストロゲン値検査' }
  },
  {
    id: 'androgen_excess_cluster',
    symptoms: ['cystic_acne', 'aggression', 'oily_skin', 'hair_loss'],
    minMatch: 2,
    severity: 'warning',
    modeFilter: 'ftm',
    label: { ko: '안드로겐 과다 의심', en: 'Suspected Androgen Excess', ja: 'アンドロゲン過多疑い' },
    description: {
      ko: '테스토스테론 용량이 과다할 수 있습니다. 호르몬 검사가 권장됩니다.',
      en: 'Testosterone dosage may be too high. Hormone testing recommended.',
      ja: 'テストステロン用量が過多の可能性があります。ホルモン検査が推奨されます。'
    },
    action: { ko: '테스토스테론 수치 검사', en: 'Testosterone level test', ja: 'テストステロン値検査' }
  },
  {
    id: 'cardiovascular_risk',
    symptoms: ['palpitations', 'headache', 'high_blood_pressure'],
    minMatch: 2,
    severity: 'critical',
    label: { ko: '심혈관 위험', en: 'Cardiovascular Risk', ja: '心血管リスク' },
    description: {
      ko: '심혈관계 위험 증상이 감지되었습니다. 즉시 의사와 상담하세요.',
      en: 'Cardiovascular risk symptoms detected. Consult a doctor immediately.',
      ja: '心血管系リスク症状が検出されました。直ちに医師に相談してください。'
    },
    action: { ko: '심장 검사', en: 'Cardiac examination', ja: '心臓検査' }
  },

  // ── 약물 특화 안전 패턴 (safety-engine.js 연동) ────────────

  {
    id: 'spiro_hyperkalemia_cluster',
    symptoms: ['palpitations', 'muscle_weakness', 'syncope', 'edema'],
    minMatch: 2,
    severity: 'critical',
    requiredMeds: ['spironolactone'],
    label: { ko: '고칼륨혈증 가능성 (스피로노락톤)', en: 'Possible Hyperkalemia (Spironolactone)', ja: '高カリウム血症の可能性（スピロノラクトン）' },
    description: {
      ko: '스피로노락톤 복용 중 이 증상들이 함께 나타나면 혈청 칼륨(K⁺) 상승을 의심해야 합니다. 즉시 혈액 검사를 받으세요.',
      en: 'These symptoms together while on spironolactone suggest possible elevated serum K⁺. Get blood tests immediately.',
      ja: 'スピロノラクトン服用中にこれらの症状が同時に現れる場合、血清K⁺上昇を疑う必要があります。直ちに血液検査を。'
    },
    action: { ko: '혈청 K⁺·크레아티닌 검사 (오늘)', en: 'Serum K⁺ & Cr test (today)', ja: '血清K⁺・クレアチニン検査（本日中）' }
  },
  {
    id: 'testosterone_polycythemia_cluster',
    symptoms: ['flushing', 'brain_fog', 'palpitations', 'headache'],
    minMatch: 2,
    severity: 'warning',
    requiredMeds: ['testosterone_enanthate', 'testosterone_cypionate', 'testosterone_undecanoate', 'testosterone_gel'],
    label: { ko: '적혈구증가증 가능성 (테스토스테론)', en: 'Possible Polycythemia (Testosterone)', ja: '赤血球増多症の可能性（テストステロン）' },
    description: {
      ko: '테스토스테론 치료 중 이 증상들은 적혈구증가증(Hct 상승)을 시사할 수 있습니다. CBC(헤마토크릿 포함) 검사를 받으세요.',
      en: 'These symptoms during testosterone therapy may suggest polycythemia (elevated Hct). Get a CBC including hematocrit.',
      ja: 'テストステロン治療中のこれらの症状は赤血球増多症（Hct上昇）を示唆する可能性があります。Hct含むCBC検査を。'
    },
    action: { ko: 'CBC (헤마토크릿) 검사', en: 'CBC (hematocrit) test', ja: 'CBC（ヘマトクリット）検査' }
  },
  {
    id: 'bicalutamide_dili_cluster',
    symptoms: ['jaundice', 'fatigue', 'nausea', 'dark_urine', 'severe_pruritus'],
    minMatch: 2,
    severity: 'critical',
    requiredMeds: ['bicalutamide'],
    label: { ko: '약물 유발 간손상 의심 (비칼루타미드)', en: 'Suspected DILI (Bicalutamide)', ja: '薬物性肝障害疑い（ビカルタミド）' },
    description: {
      ko: '비칼루타미드 복용 중 이 증상 조합은 약물 유발 간손상(DILI)을 시사합니다. 즉시 복용을 중단하고 간 기능 검사를 받으세요.',
      en: 'This symptom combination while on bicalutamide suggests drug-induced liver injury (DILI). Stop immediately and get LFT.',
      ja: 'ビカルタミド服用中のこの症状の組み合わせは薬物性肝障害（DILI）を示唆します。直ちに服用中断しLFT検査を。'
    },
    action: { ko: '간 기능 검사 (LFT) + 복용 중단 상담', en: 'LFT + consult stopping medication', ja: 'LFT + 服用中断相談' }
  },
  {
    id: 'cpa_meningioma_cluster',
    symptoms: ['vision_impairment', 'brain_fog', 'headache', 'progressive_headache', 'seizure', 'neurological_deficit'],
    minMatch: 2,
    severity: 'critical',
    requiredMeds: ['cyproterone_acetate'],
    label: { ko: '수막종 경고 증상 (CPA)', en: 'Meningioma Warning Signal (CPA)', ja: '髄膜腫警告シグナル（CPA）' },
    description: {
      ko: 'CPA 복용 중 이 신경학적 증상들은 수막종 가능성을 시사합니다 (EMA 경고). 즉시 신경과 전문의에게 평가를 받으세요.',
      en: 'These neurological symptoms while on CPA suggest possible meningioma (EMA warning). Immediate neurology evaluation needed.',
      ja: 'CPA服用中のこれらの神経学的症状は髄膜腫の可能性を示唆します（EMA警告）。直ちに神経科専門医の評価が必要です。'
    },
    action: { ko: '신경과 전문의 평가 + 뇌 MRI', en: 'Neurology evaluation + Brain MRI', ja: '神経科専門医評価 + 脳MRI' }
  },
  {
    id: 'finasteride_depression_cluster',
    symptoms: ['depression', 'anxiety', 'insomnia', 'mood_swings'],
    minMatch: 2,
    severity: 'warning',
    requiredMeds: ['finasteride', 'dutasteride'],
    label: { ko: '정신건강 영향 가능성 (피나스테리드/두타스테리드)', en: 'Possible Psychiatric Effects (Finasteride/Dutasteride)', ja: '精神的影響の可能性（フィナステリド/デュタステリド）' },
    description: {
      ko: '피나스테리드/두타스테리드 복용 중 자속되는 우울·불안·수면 이상은 약물과 연관될 수 있습니다 (포스트-피나스테리드 패턴). 의사와 상담하세요.',
      en: 'Persistent depression, anxiety, or sleep issues while on finasteride/dutasteride may be drug-related (post-finasteride pattern). Consult your doctor.',
      ja: 'フィナステリド/デュタステリド服用中の持続的なうつ・不安・睡眠異常は薬物と関連している可能性があります。医師に相談してください。'
    },
    action: { ko: '정신건강 전문 상담 + 의사 약물 재검토', en: 'Mental health consultation + medication review', ja: 'メンタルヘルス相談 + 薬物見直し' }
  },
  {
    id: 'aas_oral_hepatotoxicity_cluster',
    symptoms: ['jaundice', 'fatigue', 'nausea', 'dark_urine', 'right_upper_pain'],
    minMatch: 2,
    severity: 'critical',
    requiredMeds: ['methandienone', 'anadrol', 'oxandrolone', 'stanozolol'],
    label: { ko: '경구 AAS 간독성 의심', en: 'Suspected Oral AAS Hepatotoxicity', ja: '経口AAS肝毒性疑い' },
    description: {
      ko: '경구 AAS 복용 중 이 증상들은 간독성/간손상을 시사합니다. 즉시 복용을 중단하고 간 기능 검사(LFT, 특히 AST/ALT/Bilirubin)를 받으세요.',
      en: 'These symptoms while on oral AAS suggest hepatotoxicity/liver damage. Stop immediately and get LFT (especially AST/ALT/Bilirubin).',
      ja: '経口AAS服用中のこれらの症状は肝毒性/肝障害を示唆します。直ちに服用中断しLFT（特にAST/ALT/ビリルビン）検査を。'
    },
    action: { ko: 'LFT 검사 + 즉시 복용 중단', en: 'LFT + stop immediately', ja: 'LFT + 直ちに服用中断' }
  },

  // ════════════════════════════════════════
  //  신규 복합 패턴 (Deep Research 기반)
  // ════════════════════════════════════════

  {
    id: 'hypoestrogenism_cluster',
    symptoms: ['xeroderma', 'hot_flashes', 'joint_pain', 'flushing', 'brain_fog'],
    minMatch: 2,
    severity: 'warning',
    label: { ko: '저에스트로겐 증후군 (AI/GnRH)', en: 'Hypoestrogenism Syndrome (AI/GnRH)', ja: '低エストロゲン症候群（AI/GnRH）' },
    description: {
      ko: 'AI 또는 GnRH agonist 사용 관련 저에스트로겐 증상 패턴입니다. 열감·관절통·피부건조·홍조가 동반될 수 있으며 약물 재평가가 필요합니다.',
      en: 'Hypoestrogenic symptom cluster likely due to AI or GnRH agonist. Hot flashes, joint pain, skin dryness, and flushing may cluster. Medication reassessment needed.',
      ja: 'AI/GnRH作動薬関連の低エストロゲン症状クラスター。薬剤再評価が必要です。'
    },
    action: { ko: 'E2 수치 확인 + AI/GnRH 용량 재평가', en: 'Check E2 levels + reassess AI/GnRH dose', ja: 'E2確認＋AI/GnRH用量再評価' }
  },
  {
    id: 'thyrotoxicosis_pattern',
    symptoms: ['tremor', 'palpitation', 'palpitations', 'insomnia', 'hyperhidrosis'],
    minMatch: 3,
    severity: 'critical',
    label: { ko: '⚠ 갑상선 독성 / 자극제 독성 패턴', en: '⚠ Thyrotoxicosis / Stimulant Toxicity Pattern', ja: '⚠ 甲状腺毒性/刺激薬毒性パターン' },
    description: {
      ko: '갑상선호르몬 과량 또는 클렌부테롤/에페드린 복용과 관련된 응급 패턴입니다. 떨림·빈맥·불면·발한이 동반됩니다. 즉시 평가가 필요합니다.',
      en: 'Emergency pattern linked to thyroid hormone excess or clenbuterol/ephedrine. Tremor, palpitations, insomnia, sweating cluster. Immediate evaluation needed.',
      ja: '甲状腺過量またはクレン/エフェドリン関連の救急パターン。直ちに評価が必要です。'
    },
    action: { ko: '즉시 응급 평가 + 자극제/갑상선 약물 중단 상담', en: 'Immediate ER evaluation + stop stimulants/thyroid meds', ja: '即時救急評価＋刺激薬/甲状腺中断相談' }
  },
  {
    id: 'suspected_dili_cluster',
    symptoms: ['chronic_fatigue', 'fatigue', 'jaundice', 'ruq_pain', 'nausea'],
    minMatch: 2,
    severity: 'critical',
    label: { ko: '⚠ 약물유발 간손상(DILI) 의심', en: '⚠ Suspected Drug-Induced Liver Injury (DILI)', ja: '⚠ 薬物性肝障害（DILI）疑い' },
    description: {
      ko: '경구 AAS·CPA·비칼루타미드·타목시펜 복용 중 이 증상 패턴이 나타나면 간손상을 즉시 의심해야 합니다. 황달+피로+오심+우상복부통 조합 시 응급입니다.',
      en: 'On hepatotoxic drugs (oral AAS, CPA, bicalutamide, tamoxifen) this symptom pattern demands urgent liver injury evaluation.',
      ja: '肝毒性薬服用中のこのパターンは即時肝障害評価が必要です。'
    },
    action: { ko: '긴급 LFT(AST/ALT/빌리루빈) + 간독성 약물 중단 상담', en: 'Urgent LFT + consult stopping hepatotoxic meds', ja: '緊急LFT＋肝毒性薬中断相談' }
  },
  {
    id: 'neuro_emergency_cluster',
    symptoms: ['paresthesia', 'vision_impairment', 'headache'],
    minMatch: 2,
    severity: 'critical',
    label: { ko: '⚠ 신경과적 응급 패턴 (CPA/뇌혈관)', en: '⚠ Neurological Emergency Pattern', ja: '⚠ 神経科救急パターン' },
    description: {
      ko: '손발 저림·시야장애·두통이 함께 나타나면 뇌혈관 사건, 수막종(CPA), 신경독성 가능성이 있습니다. 즉시 신경과 평가가 필요합니다.',
      en: 'Co-occurring paresthesia, vision impairment, and headache suggest cerebrovascular events, meningioma (CPA), or neurotoxicity. Immediate evaluation needed.',
      ja: '感覚異常・視覚障害・頭痛の共発は脳血管イベント・髄膜腫・神経毒性を示唆。即時評価。'
    },
    action: { ko: '즉시 응급실 / 신경과 평가 (뇌 MRI 고려)', en: 'ER / neurology now (consider brain MRI)', ja: '即時救急/神経科評価（脳MRI検討）' }
  },
  {
    id: 'vte_pe_stroke_cluster',
    symptoms: ['headache', 'dyspnea', 'dvt_symptoms', 'vision_impairment', 'palpitation', 'palpitations'],
    minMatch: 2,
    severity: 'critical',
    label: { ko: '⚠⚠ VTE/PE/뇌졸중 응급 (에스트로겐/타목시펜)', en: '⚠⚠ VTE/PE/Stroke Emergency', ja: '⚠⚠ VTE/PE/脳卒中緊急' },
    description: {
      ko: '에스트로겐·타목시펜·CPA 복용 중 두통·호흡곤란·시야장애·다리통증·빈맥이 조합되면 즉시 응급실로 가야 합니다.',
      en: 'On thrombogenic meds (estrogens/tamoxifen/CPA), headache + dyspnea + vision change + leg pain + palpitations = immediate ER.',
      ja: '血栓リスク薬服用中、頭痛・呼吸困難・視覚変化の組合せは即時救急外来。'
    },
    action: { ko: '지금 즉시 응급실 (PE/DVT/뇌졸중 배제)', en: 'Go to ER now (rule out PE/DVT/stroke)', ja: '今すぐ救急外来（PE/DVT/脳卒中除外）' }
  },
  {
    id: 'bleeding_vte_risk',
    symptoms: ['irregular_bleeding', 'dyspnea', 'dvt_symptoms'],
    minMatch: 2,
    severity: 'critical',
    label: { ko: '⚠ 출혈 + 혈전 위험 (타목시펜)', en: '⚠ Bleeding + VTE Risk (Tamoxifen)', ja: '⚠ 出血＋VTEリスク（タモキシフェン）' },
    description: {
      ko: '타목시펜 복용 중 부정출혈 + 호흡곤란/혈전 증상이 나타나면 자궁내막 이상과 혈전 사건을 동시에 배제해야 합니다.',
      en: 'On tamoxifen, irregular bleeding + dyspnea/DVT symptoms requires simultaneous evaluation for uterine pathology and thromboembolism.',
      ja: 'タモキシフェン服用中の不正出血＋呼吸困難/DVT症状は婦人科＋血栓評価が必要。'
    },
    action: { ko: '산부인과 + 혈전 평가 동시', en: 'Concurrent gynecologic + thromboembolism evaluation', ja: '婦人科＋血栓評価を同時に' }
  },
  {
    id: 'androgen_excess_derm',
    symptoms: ['cystic_acne', 'seborrhea', 'hair_thinning', 'hair_loss'],
    minMatch: 2,
    severity: 'warning',
    label: { ko: '안드로겐 과다 피부/모발 패턴', en: 'Androgen Excess Dermatological Pattern', ja: 'アンドロゲン過多皮膚/毛髪パターン' },
    description: {
      ko: '낭종성 여드름·지루·탈모가 함께 나타나면 안드로겐 과다(AAS 과량 또는 MTF에서 항안드로겐 억제 부족)를 의심합니다. 호르몬 수치 확인이 권장됩니다.',
      en: 'Cystic acne + seborrhea + hair thinning suggest androgen excess (AAS overdose or insufficient anti-androgen in MTF). Hormone check recommended.',
      ja: '嚢胞性痤瘡・脂漏・薄毛の共発はアンドロゲン過多を疑います。ホルモン確認推奨。'
    },
    action: { ko: 'T + SHBG 수치 확인 + 항안드로겐 억제 상태 평가', en: 'Check T/SHBG levels + anti-androgen suppression status', ja: 'T/SHBG確認＋抗アンドロゲン中抑制評価' }
  },
  {
    id: 'sexual_function_cluster',
    symptoms: ['low_libido', 'erectile_dysfunction', 'depression', 'libido_decrease', 'erectile_difficulty'],
    minMatch: 2,
    severity: 'warning',
    label: { ko: '성기능 + 정신건강 복합 (5α 억제제?)', en: 'Sexual + Mental Health Cluster (5α-RI?)', ja: '性機能＋精神健康複合（5α阻害薬？）' },
    description: {
      ko: '성욕 저하·발기 부전·우울이 함께 나타나면, 특히 피나스테리드/두타스테리드 복용 중이라면 포스트-피나스테리드 패턴을 고려해야 합니다.',
      en: 'Low libido + ED + depression, especially on finasteride/dutasteride, may indicate post-finasteride syndrome. Professional consultation recommended.',
      ja: '性欲低下・ED・抑うつの共発はフィナステリド使用時にポストフィナステリド症候群を検討。専門相談推奨。'
    },
    action: { ko: '정신건강 + 호르몬 전문 상담', en: 'Mental health + hormone specialist consultation', ja: 'メンタル＋ホルモン専門相談' }
  },
  {
    id: 'systemic_decline_cluster',
    symptoms: ['sarcopenia', 'chronic_fatigue', 'fatigue', 'weight_loss'],
    minMatch: 2,
    severity: 'warning',
    label: { ko: '전신 쇠약 패턴 (DILI / 호르몬 저하)', en: 'Systemic Decline Pattern (DILI / hormone deficiency)', ja: '全身衰弱パターン（DILI/ホルモン低下）' },
    description: {
      ko: '근감소·만성 피로·체중감소가 함께 나타나면 간손상(DILI), 호르몬 결핍, 영양 결핍 등 전신적 원인을 배제해야 합니다.',
      en: 'Muscle loss + chronic fatigue + weight loss co-occurring: evaluate for systemic causes — DILI, hormone deficiency, or malnutrition.',
      ja: '筋減少・慢性疲労・体重減少の共発は全身的原因（DILI・ホルモン低下・栄養不足）を除外。'
    },
    action: { ko: '혈액 검사 (LFT, CBC, 호르몬 패널)', en: 'Blood tests: LFT, CBC, hormone panel', ja: '血液検査（LFT、CBC、ホルモンパネル）' }
  }
];


// ════════════════════════════════════════════
//  4. 해소 추천 라벨 (Resolution Labels)
// ════════════════════════════════════════════

export const RESOLUTION_LABELS = {
  // Diet
  omega_3: { ko: '오메가-3 섭취 (연어, 호두, 아마씨)', en: 'Omega-3 intake (salmon, walnuts, flaxseed)', ja: 'オメガ3摂取（サーモン、くるみ、亜麻仁）' },
  vitamin_d: { ko: '비타민 D 섭취·일광욕 15분', en: 'Vitamin D / 15min sunlight', ja: 'ビタミンD摂取・日光浴15分' },
  magnesium: { ko: '마그네슘 풍부 식품 (견과류, 시금치)', en: 'Magnesium-rich foods (nuts, spinach)', ja: 'マグネシウム豊富食品（ナッツ、ほうれん草）' },
  reduce_caffeine: { ko: '카페인 줄이기 (하루 1잔 이하)', en: 'Reduce caffeine (max 1 cup/day)', ja: 'カフェイン削減（1日1杯以下）' },
  chamomile_tea: { ko: '카모마일 차', en: 'Chamomile tea', ja: 'カモミールティー' },
  reduce_dairy: { ko: '유제품 줄이기', en: 'Reduce dairy', ja: '乳製品を減らす' },
  low_glycemic: { ko: '저혈당 지수 식단', en: 'Low glycemic diet', ja: '低GI食' },
  zinc_rich_foods: { ko: '아연 풍부 식품 (굴, 호박씨)', en: 'Zinc-rich foods (oysters, pumpkin seeds)', ja: '亜鉛豊富食品（牡蠣、かぼちゃの種）' },
  iron_rich_foods: { ko: '철분 풍부 식품 (시금치, 적색 고기)', en: 'Iron-rich foods (spinach, red meat)', ja: '鉄分豊富食品（ほうれん草、赤身肉）' },
  biotin: { ko: '비오틴 (비타민 B7) 섭취', en: 'Biotin (vitamin B7) intake', ja: 'ビオチン（ビタミンB7）摂取' },
  protein_adequate: { ko: '충분한 단백질 섭취', en: 'Adequate protein intake', ja: '十分なたんぱく質摂取' },
  hydration_2l: { ko: '하루 2L 수분 섭취', en: 'Drink 2L water daily', ja: '1日2L水分摂取' },
  hydration: { ko: '충분한 수분 섭취', en: 'Adequate hydration', ja: '十分な水分摂取' },
  reduce_sodium: { ko: '나트륨 줄이기', en: 'Reduce sodium', ja: 'ナトリウムを減らす' },
  potassium_foods: { ko: '칼륨 풍부 식품 (바나나, 감자)', en: 'Potassium foods (banana, potato)', ja: 'カリウム豊富食品（バナナ、じゃがいも）' },
  balanced_blood_sugar: { ko: '규칙적 식사 (혈당 안정)', en: 'Regular meals (stable blood sugar)', ja: '規則的食事（血糖安定）' },
  complex_carbs: { ko: '복합 탄수화물 섭취', en: 'Complex carbohydrates', ja: '複合炭水化物摂取' },
  tryptophan_foods: { ko: '트립토판 식품 (우유, 바나나)', en: 'Tryptophan foods (milk, banana)', ja: 'トリプトファン食品（牛乳、バナナ）' },
  avoid_late_eating: { ko: '취침 3시간 전 식사 마무리', en: 'Stop eating 3h before bed', ja: '就寝3時間前に食事終了' },
  fiber: { ko: '식이섬유 섭취', en: 'Fiber intake', ja: '食物繊維摂取' },
  liver_support_foods: { ko: '간 건강 식품 (브로콜리, 마늘)', en: 'Liver support foods (broccoli, garlic)', ja: '肝臓サポート食品（ブロッコリー、にんにく）' },
  b12_foods: { ko: '비타민 B12 식품', en: 'Vitamin B12 foods', ja: 'ビタミンB12食品' },
  soy_phytoestrogens: { ko: '콩 식품 (두부, 에다마메)', en: 'Soy foods (tofu, edamame)', ja: '大豆食品（豆腐、枝豆）' },
  avoid_spicy: { ko: '매운 음식 피하기', en: 'Avoid spicy food', ja: '辛い食べ物を避ける' },
  cold_drinks: { ko: '차가운 음료', en: 'Cold drinks', ja: '冷たい飲み物' },
  l_arginine_foods: { ko: 'L-아르기닌 식품 (견과류, 닭가슴살)', en: 'L-arginine foods (nuts, chicken breast)', ja: 'L-アルギニン食品（ナッツ、鶏胸肉）' },
  calorie_awareness: { ko: '적정 칼로리 관리', en: 'Calorie awareness', ja: 'カロリー管理' },
  reduce_processed: { ko: '가공식품 줄이기', en: 'Reduce processed foods', ja: '加工食品を減らす' },
  evening_primrose_oil: { ko: '달맞이꽃 오일', en: 'Evening primrose oil', ja: '月見草オイル' },
  maca_root: { ko: '마카 루트', en: 'Maca root', ja: 'マカルート' },
  avoid_alcohol: { ko: '금주', en: 'Avoid alcohol', ja: '禁酒' },

  // Exercise
  cardio_30min: { ko: '유산소 운동 30분/일', en: '30min cardio/day', ja: '有酸素運動30分/日' },
  outdoor_walk: { ko: '야외 산책 (햇빛 노출)', en: 'Outdoor walk (sunlight)', ja: '屋外散歩（日光浴）' },
  yoga: { ko: '요가·스트레칭', en: 'Yoga / Stretching', ja: 'ヨガ・ストレッチ' },
  deep_breathing: { ko: '심호흡 운동', en: 'Deep breathing exercises', ja: '深呼吸エクササイズ' },
  regular_aerobic: { ko: '규칙적 유산소 운동', en: 'Regular aerobic exercise', ja: '規則的有酸素運動' },
  morning_exercise: { ko: '아침 운동 습관', en: 'Morning exercise habit', ja: '朝の運動習慣' },
  avoid_evening_workout: { ko: '취침 4시간 전 운동 금지', en: 'No exercise 4h before bed', ja: '就寝4時間前の運動禁止' },
  shower_after_workout: { ko: '운동 후 바로 샤워', en: 'Shower immediately after workout', ja: '運動後すぐにシャワー' },
  scalp_massage: { ko: '두피 마사지', en: 'Scalp massage', ja: '頭皮マッサージ' },
  regular_walking: { ko: '규칙적 걷기 (30분/일)', en: 'Regular walking (30min/day)', ja: '規則的ウォーキング（30分/日）' },
  calf_exercises: { ko: '종아리 운동 (혈전 예방)', en: 'Calf exercises (DVT prevention)', ja: 'ふくらはぎ運動（血栓予防）' },
  moderate_only: { ko: '중강도 운동까지만', en: 'Moderate intensity only', ja: '中強度運動まで' },
  walking: { ko: '걷기', en: 'Walking', ja: 'ウォーキング' },
  leg_elevation: { ko: '다리 높이기', en: 'Leg elevation', ja: '脚挙上' },
  light_walking: { ko: '가벼운 산책', en: 'Light walking', ja: '軽い散歩' },
  gradual_increase: { ko: '점진적 강도 증가', en: 'Gradual intensity increase', ja: '段階的な強度増加' },
  light_activity: { ko: '가벼운 활동만', en: 'Light activity only', ja: '軽い活動のみ' },
  cooling_exercises: { ko: '시원한 환경에서 운동', en: 'Exercise in cool environment', ja: '涼しい環境で運動' },
  strength_training: { ko: '근력 운동', en: 'Strength training', ja: '筋力トレーニング' },
  resistance_training: { ko: '저항 운동', en: 'Resistance training', ja: 'レジスタンストレーニング' },
  cardio_3x_week: { ko: '유산소 주 3회', en: 'Cardio 3x/week', ja: '有酸素週3回' },
  supportive_bra_during_exercise: { ko: '운동 시 스포츠 브라', en: 'Sports bra during exercise', ja: '運動時スポーツブラ' },
  pelvic_floor_exercises: { ko: '골반저 운동', en: 'Pelvic floor exercises', ja: '骨盤底運動' },

  // Medication
  consult_hrt_adjustment: { ko: '호르몬 용량 조절 상담', en: 'Consult: HRT dosage adjustment', ja: 'ホルモン用量調整相談' },
  consult_anxiolytic: { ko: '항불안제 상담 고려', en: 'Consider anti-anxiety medication consult', ja: '抗不安薬相談検討' },
  consider_shorter_injection_interval: { ko: '주사 간격 단축 검토', en: 'Consider shorter injection intervals', ja: '注射間隔短縮検討' },
  melatonin_consideration: { ko: '멜라토닌 복용 고려', en: 'Consider melatonin', ja: 'メラトニン検討' },
  topical_retinoid: { ko: '국소 레티노이드 (트레티노인)', en: 'Topical retinoid (tretinoin)', ja: '局所レチノイド（トレチノイン）' },
  consult_dermatologist: { ko: '피부과 상담', en: 'Dermatologist consultation', ja: '皮膚科相談' },
  finasteride_consideration: { ko: '피나스테리드 검토 (의사 상담)', en: 'Finasteride consideration (consult doctor)', ja: 'フィナステリド検討（医師相談）' },
  minoxidil: { ko: '미녹시딜 고려', en: 'Consider minoxidil', ja: 'ミノキシジル検討' },
  moisturizer: { ko: '보습 크림 사용', en: 'Use moisturizer', ja: '保湿クリーム使用' },
  EMERGENCY_visit: { ko: '⚠️ 즉시 병원 방문', en: '⚠️ Visit hospital immediately', ja: '⚠️ 直ちに病院受診' },
  liver_function_test: { ko: '간 기능 검사 (LFT)', en: 'Liver function test (LFT)', ja: '肝機能検査（LFT）' },
  consult_cardiologist: { ko: '심장 전문의 상담', en: 'Cardiologist consultation', ja: '心臓専門医相談' },
  consult_dose_adjustment: { ko: '약물 용량 조절 상담', en: 'Consult: Dose adjustment', ja: '薬物用量調整相談' },
  blood_test_recommended: { ko: '혈액 검사 권장', en: 'Blood test recommended', ja: '血液検査推奨' },
  thyroid_check: { ko: '갑상선 기능 검사', en: 'Thyroid function test', ja: '甲状腺機能検査' },
  hrt_timing_adjustment: { ko: 'HRT 투여 시간 조절', en: 'HRT timing adjustment', ja: 'HRT投与時間調整' },
  otc_pain_relief: { ko: '일반 진통제 (이부프로펜)', en: 'OTC pain relief (ibuprofen)', ja: '一般鎮痛剤（イブプロフェン）' },
  consult_urologist: { ko: '비뇨기과 상담', en: 'Urologist consultation', ja: '泌尿器科相談' },
  gynecology_consult: { ko: '산부인과/성건강 전문 상담', en: 'Gynecology / sexual health consultation', ja: '婦人科/性健康専門相談' },
  fertility_consult: { ko: '생식/임신 전문의 상담', en: 'Fertility specialist consultation', ja: '生殖専門医相談' },
  fertility_preservation_discussion: { ko: '가임력 보존 상담 (정자/난자 냉동 논의)', en: 'Fertility preservation discussion (sperm/egg freezing)', ja: '妊孕性温存相談（精子/卵子凍結）' },
  mental_health_consult: { ko: '정신건강 전문의 상담 (자살사고 시 즉시)', en: 'Mental health specialist consultation (immediate if suicidal)', ja: 'メンタルヘルス専門医相談（自殺念慮なら即時）' },
  call_emergency_services: { ko: '119 응급 신고', en: 'Call emergency services (911/119)', ja: '119救急連絡' },
  stop_hepatotoxic_meds_consult: { ko: '간독성 약물 중단 여부 의사 상담 (즉시)', en: 'Consult doctor about stopping hepatotoxic meds (urgent)', ja: '肝毒性薬の中断を医師に相談（緊急）' },
  blood_pressure_check: { ko: '혈압 측정 (약국/병원)', en: 'Blood pressure check (pharmacy/clinic)', ja: '血圧測定（薬局/病院）' },
  monitor_e2_levels: { ko: 'E2 수치 정기 모니터링', en: 'Regular E2 level monitoring', ja: 'E2値の定期モニタリング' },
  track_bleeding_pattern: { ko: '출혈 패턴 기록 (날짜·양·특성)', en: 'Track bleeding pattern (date, amount, nature)', ja: '出血パターン記録（日時・量・性質）' },
  minoxidil: { ko: '미녹시딜 국소 도포 (모발)', en: 'Minoxidil topical (hair)', ja: 'ミノキシジル外用（毛髪）' },
  consult_dermatologist: { ko: '피부과 전문의 상담', en: 'Dermatologist consultation', ja: '皮膚科専門医相談' },
  moisturizer: { ko: '보습제 정기 사용', en: 'Regular moisturizer use', ja: '保湿剤の定期使用' },

  // Diet
  anti_inflammatory_foods: { ko: '항염 식품 (생선·강황·베리류)', en: 'Anti-inflammatory foods (fish, turmeric, berries)', ja: '抗炎症食品（魚・ターメリック・ベリー）' },
  small_frequent_meals: { ko: '소량씩 자주 먹기 (6회/일)', en: 'Small frequent meals (6x/day)', ja: '少量頻回食（6回/日）' },
  ginger_tea: { ko: '생강차 (오심 완화)', en: 'Ginger tea (nausea relief)', ja: '生姜湯（悪心緩和）' },
  avoid_fatty_foods: { ko: '고지방 음식 피하기', en: 'Avoid high-fat foods', ja: '高脂肪食を避ける' },
  reduce_alcohol: { ko: '금주 또는 음주 최소화', en: 'Eliminate or minimize alcohol', ja: '禁酒または飲酒最小化' },

  // Exercise & Physical
  joint_care: { ko: '관절 보호 (저충격 운동, 보조기)', en: 'Joint protection (low-impact exercise, bracing)', ja: '関節保護（低衝撃運動、サポーター）' },
  warm_compress: { ko: '온찜질 (관절통 완화)', en: 'Warm compress (joint pain relief)', ja: '温湿布（関節痛緩和）' },
  progressive_overload: { ko: '점진적 과부하 훈련 원칙', en: 'Progressive overload training principle', ja: '漸進的過負荷トレーニング' },
  recovery_sleep: { ko: '충분한 회복 수면 (8-9시간)', en: 'Recovery sleep (8-9 hours)', ja: '回復睡眠（8-9時間）' },

  // Lifestyle
  sleep_hygiene: { ko: '수면 위생 개선', en: 'Sleep hygiene improvement', ja: '睡眠衛生改善' },
  social_support: { ko: '사회적 지지 네트워크 구축', en: 'Build social support network', ja: '社会的支援ネットワーク構築' },
  mindfulness: { ko: '마음챙김 명상 (5-10분/일)', en: 'Mindfulness meditation (5-10min/day)', ja: 'マインドフルネス瞑想（5-10分/日）' },
  limit_screen_time: { ko: '취침 전 스크린 제한', en: 'Limit screen before bed', ja: '就寝前のスクリーン制限' },
  grounding_techniques: { ko: '그라운딩 기법 (5-4-3-2-1)', en: 'Grounding techniques (5-4-3-2-1)', ja: 'グラウンディング技法（5-4-3-2-1）' },
  mood_tracking: { ko: '기분 일기 기록', en: 'Mood journal tracking', ja: '気分日記記録' },
  stress_management: { ko: '스트레스 관리', en: 'Stress management', ja: 'ストレス管理' },
  blue_light_filter: { ko: '블루라이트 차단', en: 'Blue light filter', ja: 'ブルーライトフィルター' },
  clean_pillowcase: { ko: '베개커버 자주 교체', en: 'Change pillowcase often', ja: '枕カバーをこまめに交換' },
  gentle_skincare: { ko: '순한 스킨케어', en: 'Gentle skincare routine', ja: '低刺激スキンケア' },
  gentle_styling: { ko: '부드러운 헤어 스타일링', en: 'Gentle hair styling', ja: '優しいヘアスタイリング' },
  stress_reduction: { ko: '스트레스 해소', en: 'Stress reduction', ja: 'ストレス解消' },
  humidifier: { ko: '가습기 사용', en: 'Use humidifier', ja: '加湿器使用' },
  lukewarm_shower: { ko: '미지근한 물 샤워', en: 'Lukewarm shower', ja: 'ぬるいシャワー' },
  quit_smoking: { ko: '금연', en: 'Quit smoking', ja: '禁煙' },
  compression_stockings: { ko: '압박 스타킹 착용', en: 'Wear compression stockings', ja: '着圧ストッキング着用' },
  compression_socks: { ko: '압박 양말', en: 'Compression socks', ja: '着圧ソックス' },
  avoid_standing_long: { ko: '오래 서있기 피하기', en: 'Avoid standing for long', ja: '長時間の立ちっぱなしを避ける' },
  sleep_8hours: { ko: '8시간 수면', en: '8 hours sleep', ja: '8時間睡眠' },
  layered_clothing: { ko: '레이어드 의류', en: 'Layered clothing', ja: 'レイヤード服' },
  fan_nearby: { ko: '선풍기/부채 가까이', en: 'Keep fan nearby', ja: '扇風機/うちわを近くに' },
  communication: { ko: '파트너와의 소통', en: 'Communication with partner', ja: 'パートナーとのコミュニケーション' },
  expectation_adjustment: { ko: '기대치 조정', en: 'Expectation adjustment', ja: '期待値調整' },
  supportive_clothing: { ko: '편안한 옷 착용', en: 'Supportive clothing', ja: 'サポート力のある服' },
  cold_compress: { ko: '냉찜질', en: 'Cold compress', ja: '冷湿布' },
  meal_planning: { ko: '식단 계획', en: 'Meal planning', ja: '食事計画' },
  portion_control: { ko: '적절한 식사량', en: 'Portion control', ja: '適切な食事量' },
  avoid_stimulants: { ko: '자극제 (클렌/에페드린/카페인) 섭취 중단', en: 'Avoid stimulants (clen/ephedrine/caffeine)', ja: '刺激薬（クレン/エフェドリン/カフェイン）を避ける' },
  rest: { ko: '충분한 휴식', en: 'Adequate rest', ja: '十分な休息' }
};


// ════════════════════════════════════════════
//  5. 병원 방문 권장 메시지
// ════════════════════════════════════════════

export const HOSPITAL_MESSAGES = {
  critical: {
    ko: '즉시 병원（응급실）을 방문하세요.',
    en: 'Visit a hospital (ER) immediately.',
    ja: '直ちに病院（救急外来）を受診してください。'
  },
  warning: {
    ko: '가능한 빨리 의사와 상담하세요.',
    en: 'Consult a doctor as soon as possible.',
    ja: 'できるだけ早く医師に相談してください。'
  },
  regular: {
    ko: '다음 정기 진료 시 의사에게 말씀하세요.',
    en: 'Mention to your doctor at next regular visit.',
    ja: '次の定期診察時に医師に伝えてください。'
  }
};
