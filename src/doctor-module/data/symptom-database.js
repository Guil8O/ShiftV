/**
 * Symptom Database
 * 
 * MTF, FTM, Non-binary 모드별 증상 정의
 * 각 증상은 ID, 카테고리, 심각도 범위, 관련 호르몬/약물 정보 포함
 */

// ========================================
// 1. 증상 카테고리 정의
// ========================================

export const SYMPTOM_CATEGORIES = {
  mental: 'mental',           // 정신/신경계
  skin: 'skin',              // 피부/모발
  body: 'body',              // 전신/체형
  breast: 'breast',          // 가슴/유방
  sexual: 'sexual',          // 성기능/생식기
  internal: 'internal'       // 내장/순환기
};

// ========================================
// 2. 공통 증상 (모든 모드 공통)
// ========================================

export const COMMON_SYMPTOMS = {
  // [1. 정신 / 신경계]
  mental: [
    {
      id: 'depression',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone', 'estrogen', 'cortisol'],
      warning: false
    },
    {
      id: 'mood_swings',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['estrogen', 'progesterone'],
      warning: false
    },
    {
      id: 'aggression',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone'],
      relatedMedications: ['trenbolone', 'high_dose_test'],
      warning: true // Roid Rage 위험
    },
    {
      id: 'anxiety',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['estrogen', 'cortisol'],
      warning: false
    },
    {
      id: 'brain_fog',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['estrogen', 'testosterone'],
      warning: false
    },
    {
      id: 'insomnia',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone', 'cortisol'],
      relatedMedications: ['trenbolone', 'clenbuterol'],
      warning: false
    },
    {
      id: 'hypersomnia',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['low_testosterone'],
      warning: false
    },
    {
      id: 'tremor',
      severity: [1, 2, 3, 4, 5],
      relatedMedications: ['clenbuterol', 'high_dose_stimulants'],
      warning: true
    },
    {
      id: 'vision_impairment',
      severity: [1, 2, 3, 4, 5],
      relatedMedications: ['tamoxifen', 'raloxifene'],
      warning: true // SERM 부작용
    },
    {
      id: 'paresthesia',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['estrogen'],
      warning: false
    }
  ],

  // [2. 피부 / 모발]
  skin: [
    {
      id: 'cystic_acne',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone', 'dht'],
      relatedMedications: ['aas', 'high_dose_test'],
      warning: false
    },
    {
      id: 'comedones',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone'],
      warning: false
    },
    {
      id: 'flushing',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['estrogen'],
      relatedMedications: ['gnrh'],
      warning: false
    },
    {
      id: 'xeroderma',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['low_estrogen'],
      relatedMedications: ['ai', 'winstrol'],
      warning: false
    },
    {
      id: 'seborrhea',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone', 'dht'],
      warning: false
    },
    {
      id: 'skin_atrophy',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['high_estrogen', 'low_testosterone'],
      warning: false
    },
    {
      id: 'male_pattern_baldness',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['dht'],
      relatedMedications: ['aas', 'testosterone'],
      warning: false
    },
    {
      id: 'hair_thinning',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['dht', 'estrogen'],
      warning: false
    },
    {
      id: 'facial_hirsutism',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone', 'dht'],
      warning: false
    },
    {
      id: 'body_hirsutism',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone'],
      warning: false
    },
    {
      id: 'body_hair_reduction',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['estrogen', 'anti_androgen'],
      warning: false
    }
  ],

  // [3. 전신 / 체형]
  body: [
    {
      id: 'edema',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['estrogen', 'aldosterone'],
      relatedMedications: ['high_dose_test', 'anadrol', 'dianabol'],
      warning: false
    },
    {
      id: 'weight_gain',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['estrogen', 'insulin'],
      relatedMedications: ['bulking_aas'],
      warning: false
    },
    {
      id: 'hyperphagia',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone', 'ghrelin'],
      relatedMedications: ['aas'],
      warning: false
    },
    {
      id: 'sarcopenia',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['low_testosterone', 'high_cortisol'],
      warning: true
    },
    {
      id: 'chronic_fatigue',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['low_testosterone', 'thyroid'],
      warning: true
    },
    {
      id: 'odor_change',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone', 'estrogen'],
      warning: false
    },
    {
      id: 'hyperhidrosis',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone'],
      relatedMedications: ['trenbolone', 'clenbuterol'],
      warning: false
    },
    {
      id: 'voice_change',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone'],
      warning: false
    }
  ],

  // [4. 가슴 / 유방]
  breast: [
    {
      id: 'breast_budding',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['estrogen'],
      warning: false
    },
    {
      id: 'gynecomastia',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['estrogen', 'high_test_aromatization'],
      relatedMedications: ['aas', 'no_ai_use'],
      warning: false
    },
    {
      id: 'breast_atrophy',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone', 'low_estrogen'],
      warning: false
    }
  ],

  // [5. 성기능 / 생식기]
  sexual: [
    {
      id: 'low_libido',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['low_testosterone', 'high_prolactin'],
      relatedMedications: ['ssri', 'high_dose_estrogen'],
      warning: false
    },
    {
      id: 'hypersexuality',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['high_testosterone'],
      relatedMedications: ['aas', 'high_dose_test'],
      warning: false
    },
    {
      id: 'erectile_dysfunction',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['low_testosterone', 'high_estrogen', 'high_prolactin'],
      relatedMedications: ['anti_androgen', 'ssri'],
      warning: false
    },
    {
      id: 'orgasm_change',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['estrogen', 'testosterone'],
      warning: false
    },
    {
      id: 'testicular_atrophy',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['exogenous_testosterone'],
      relatedMedications: ['aas', 'gnrh'],
      warning: false
    },
    {
      id: 'oligospermia',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone', 'estrogen'],
      relatedMedications: ['aas'],
      warning: false
    },
    {
      id: 'clitoromegaly',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone', 'dht'],
      warning: false
    },
    {
      id: 'vaginal_atrophy',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['low_estrogen', 'testosterone'],
      warning: false
    },
    {
      id: 'amenorrhea',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone', 'low_estrogen'],
      relatedMedications: ['gnrh'],
      warning: false
    },
    {
      id: 'irregular_bleeding',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['estrogen', 'progesterone'],
      warning: true
    }
  ],

  // [6. 내장 / 순환기] - 위험 신호
  internal: [
    {
      id: 'palpitation',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['thyroid', 'epinephrine'],
      relatedMedications: ['clenbuterol', 'high_dose_stimulants'],
      warning: true
    },
    {
      id: 'dyspnea',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['anemia'],
      relatedMedications: ['trenbolone', 'aas'],
      warning: true
    },
    {
      id: 'dvt_symptoms',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['estrogen'],
      relatedMedications: ['oral_estrogen', 'tamoxifen'],
      warning: true // 혈전 위험!
    },
    {
      id: 'jaundice',
      severity: [1, 2, 3, 4, 5],
      relatedMedications: ['oral_aas', 'cyproterone', 'anadrol'],
      warning: true // 간 독성!
    },
    {
      id: 'ruq_pain',
      severity: [1, 2, 3, 4, 5],
      relatedMedications: ['oral_aas', 'acetaminophen'],
      warning: true // 간 비대/손상
    }
  ]
};

// ========================================
// 3. MTF 특화 증상
// ========================================

export const MTF_SPECIFIC_SYMPTOMS = {
  positive: [ // 원하는 효과
    {
      id: 'breast_development',
      category: 'breast',
      severity: [1, 2, 3, 4, 5],
      isPositive: true,
      relatedHormones: ['estrogen', 'progesterone']
    },
    {
      id: 'skin_softening',
      category: 'skin',
      severity: [1, 2, 3, 4, 5],
      isPositive: true,
      relatedHormones: ['estrogen']
    },
    {
      id: 'fat_redistribution_feminine',
      category: 'body',
      severity: [1, 2, 3, 4, 5],
      isPositive: true,
      relatedHormones: ['estrogen']
    },
    {
      id: 'body_hair_reduction',
      category: 'skin',
      severity: [1, 2, 3, 4, 5],
      isPositive: true,
      relatedHormones: ['anti_androgen', 'estrogen']
    },
    {
      id: 'muscle_softening',
      category: 'body',
      severity: [1, 2, 3, 4, 5],
      isPositive: true,
      relatedHormones: ['estrogen', 'low_testosterone']
    }
  ],
  
  sideEffects: [ // 부작용
    {
      id: 'breast_pain',
      category: 'breast',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['estrogen'],
      warning: false
    },
    {
      id: 'hot_flashes',
      category: 'body',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['estrogen_fluctuation'],
      relatedMedications: ['gnrh'],
      warning: false
    },
    {
      id: 'libido_decrease_mtf',
      category: 'sexual',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['anti_androgen'],
      warning: false
    }
  ]
};

// ========================================
// 4. FTM 특화 증상
// ========================================

export const FTM_SPECIFIC_SYMPTOMS = {
  positive: [ // 원하는 효과
    {
      id: 'voice_deepening',
      category: 'body',
      severity: [1, 2, 3, 4, 5],
      isPositive: true,
      relatedHormones: ['testosterone']
    },
    {
      id: 'facial_hair_growth',
      category: 'skin',
      severity: [1, 2, 3, 4, 5],
      isPositive: true,
      relatedHormones: ['testosterone', 'dht']
    },
    {
      id: 'body_hair_increase',
      category: 'skin',
      severity: [1, 2, 3, 4, 5],
      isPositive: true,
      relatedHormones: ['testosterone']
    },
    {
      id: 'muscle_gain',
      category: 'body',
      severity: [1, 2, 3, 4, 5],
      isPositive: true,
      relatedHormones: ['testosterone']
    },
    {
      id: 'fat_redistribution_masculine',
      category: 'body',
      severity: [1, 2, 3, 4, 5],
      isPositive: true,
      relatedHormones: ['testosterone']
    },
    {
      id: 'clitoral_growth',
      category: 'sexual',
      severity: [1, 2, 3, 4, 5],
      isPositive: true,
      relatedHormones: ['testosterone', 'dht']
    },
    {
      id: 'menstruation_cessation',
      category: 'sexual',
      severity: [1, 2, 3, 4, 5],
      isPositive: true,
      relatedHormones: ['testosterone']
    }
  ],
  
  sideEffects: [ // 부작용
    {
      id: 'acne_ftm',
      category: 'skin',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone', 'dht'],
      warning: false
    },
    {
      id: 'libido_increase_ftm',
      category: 'sexual',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone'],
      warning: false
    },
    {
      id: 'irritability_ftm',
      category: 'mental',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['testosterone'],
      warning: false
    }
  ]
};

// ========================================
// 5. Non-Binary 증상 (균형 중심)
// ========================================

export const NONBINARY_SPECIFIC_SYMPTOMS = {
  positive: [ // 원하는 중성적 효과
    {
      id: 'androgynous_appearance',
      category: 'body',
      severity: [1, 2, 3, 4, 5],
      isPositive: true,
      relatedHormones: ['balanced_hormones']
    },
    {
      id: 'moderate_muscle_tone',
      category: 'body',
      severity: [1, 2, 3, 4, 5],
      isPositive: true,
      relatedHormones: ['moderate_testosterone']
    },
    {
      id: 'minimal_secondary_characteristics',
      category: 'body',
      severity: [1, 2, 3, 4, 5],
      isPositive: true,
      relatedHormones: ['balanced_hormones']
    }
  ],
  
  challenges: [ // 균형 유지 어려움
    {
      id: 'hormone_fluctuation',
      category: 'internal',
      severity: [1, 2, 3, 4, 5],
      relatedHormones: ['estrogen', 'testosterone'],
      warning: true
    },
    {
      id: 'identity_dysphoria',
      category: 'mental',
      severity: [1, 2, 3, 4, 5],
      warning: false
    }
  ]
};

// ========================================
// 6. 헬퍼 함수
// ========================================

/**
 * 특정 모드의 모든 증상 가져오기
 */
export function getSymptomsForMode(mode) {
  const common = Object.values(COMMON_SYMPTOMS).flat();
  
  switch(mode) {
    case 'mtf':
      return [
        ...common,
        ...MTF_SPECIFIC_SYMPTOMS.positive,
        ...MTF_SPECIFIC_SYMPTOMS.sideEffects
      ];
      
    case 'ftm':
      return [
        ...common,
        ...FTM_SPECIFIC_SYMPTOMS.positive,
        ...FTM_SPECIFIC_SYMPTOMS.sideEffects
      ];
      
    case 'nonbinary':
      return [
        ...common,
        ...NONBINARY_SPECIFIC_SYMPTOMS.positive,
        ...NONBINARY_SPECIFIC_SYMPTOMS.challenges
      ];
      
    default:
      return common;
  }
}

/**
 * 경고가 필요한 증상 필터링
 */
export function getWarningSymptoms(symptoms) {
  return symptoms.filter(s => s.warning === true);
}

/**
 * 카테고리별 증상 그룹화
 */
export function groupSymptomsByCategory(symptoms) {
  return symptoms.reduce((acc, symptom) => {
    const category = symptom.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(symptom);
    return acc;
  }, {});
}

/**
 * 증상 ID로 증상 정보 찾기
 */
export function getSymptomById(symptomId, mode = 'mtf') {
  const allSymptoms = getSymptomsForMode(mode);
  return allSymptoms.find(s => s.id === symptomId);
}

// ========================================
// 7. SYMPTOM_DATABASE (UI용 계층 구조)
// ========================================

/**
 * UI에서 사용하는 계층적 증상 데이터베이스
 * symptom-selector.js와 symptom-analyzer.js에서 사용
 */
export const SYMPTOM_DATABASE = {
  MENTAL_NEUROLOGICAL: {
    category: '정신 / 신경계',
    symptoms: [
      { id: 'depression', ko: '우울감 / 무기력', en: 'Depression / Lethargy', ja: '抑うつ感 / 無気力' },
      { id: 'mood_swings', ko: '급격한 감정 기복 / 짜증', en: 'Mood Swings / Irritability', ja: '急激な感情の起伏 / いらつき' },
      { id: 'aggression', ko: '공격성 증가 / 분노 조절 어려움', en: 'Increased Aggression / Anger Issues', ja: '攻撃性の増加 / 怒りのコントロール困難' },
      { id: 'anxiety', ko: '불안 / 초조함', en: 'Anxiety / Restlessness', ja: '不安 / 焦燥感' },
      { id: 'brain_fog', ko: '머리가 멍하고 맑지 않음', en: 'Brain Fog', ja: '頭がぼーっとする' },
      { id: 'insomnia', ko: '불면증 / 얕은 수면', en: 'Insomnia / Shallow Sleep', ja: '不眠症 / 浅い睡眠' },
      { id: 'hypersomnia', ko: '과수면 / 쏟아지는 잠', en: 'Hypersomnia / Excessive Sleepiness', ja: '過眠 / 眠気がひどい' },
      { id: 'tremor', ko: '손 떨림', en: 'Tremor', ja: '手の震え' },
      { id: 'vision_impairment', ko: '시야 흐림 / 눈부심', en: 'Vision Impairment / Photophobia', ja: '視界のぼやけ / 光過敏' },
      { id: 'paresthesia', ko: '수족냉증 / 손발 저림', en: 'Raynaud\'s / Paresthesia', ja: '手足の冷え / しびれ' },
    ]
  },
  SKIN_HAIR: {
    category: '피부 / 모발',
    symptoms: [
      { id: 'cystic_acne', ko: '화농성/염증성 여드름', en: 'Cystic Acne', ja: '化膿性/炎症性ニキビ' },
      { id: 'comedones', ko: '좁쌀 여드름', en: 'Comedones', ja: 'コメドニキビ' },
      { id: 'flushing', ko: '얼굴 붉어짐 / 홍조', en: 'Flushing / Erythema', ja: '顔の赤み / ほてり' },
      { id: 'xeroderma', ko: '피부 건조 / 각질', en: 'Xeroderma / Flaky Skin', ja: '皮膚乾燥 / 角質' },
      { id: 'seborrhea', ko: '지성 피부 / 피지 폭발', en: 'Oily Skin / Seborrhea', ja: '脂性肌 / 皮脂の増加' },
      { id: 'skin_atrophy', ko: '피부 얇아짐 / 멍이 잘 듦', en: 'Skin Atrophy / Easy Bruising', ja: '皮膚が薄くなる / あざができやすい' },
      { id: 'male_pattern_baldness', ko: 'M자/정수리 탈모 진행', en: 'Alopecia / Male Pattern Baldness', ja: 'M字/頭頂部の脱毛進行' },
      { id: 'hair_thinning', ko: '머리카락 가늘어짐', en: 'Hair Thinning', ja: '髪の毛が細くなる' },
      { id: 'hair_growth', ko: '발모 / 모발 성장', en: 'Hair Growth / Regrowth', ja: '発毛 / 毛髪の成長' },
      { id: 'facial_hirsutism', ko: '수염 / 턱수염 증가', en: 'Facial Hirsutism', ja: 'ひげ / 顎ひげの増加' },
      { id: 'body_hirsutism', ko: '몸털(가슴, 배) 증가', en: 'Body Hirsutism (Chest, Abdomen)', ja: '体毛（胸、腹）の増加' },
      { id: 'body_hair_reduction', ko: '체모 감소 / 부드러워짐', en: 'Body Hair Reduction / Softening', ja: '体毛の減少 / 柔らかくなる' },
    ]
  },
  SYSTEMIC_BODY_SHAPE: {
    category: '전신 / 체형',
    symptoms: [
      { id: 'edema', ko: '얼굴/몸 붓기 (수분 정체)', en: 'Edema / Moon Face (Water Retention)', ja: '顔/体のむくみ（水分貯留）' },
      { id: 'weight_gain', ko: '급격한 체중 증가', en: 'Rapid Weight Gain', ja: '急激な体重増加' },
      { id: 'weight_loss', ko: '체중 감소', en: 'Weight Loss', ja: '体重減少' },
      { id: 'fat_loss', ko: '체지방 감소', en: 'Body Fat Loss', ja: '体脂肪の減少' },
      { id: 'hyperphagia', ko: '식욕 폭발', en: 'Hyperphagia / Increased Appetite', ja: '食欲増加' },
      { id: 'sarcopenia', ko: '근육 빠짐 / 근력 약화', en: 'Sarcopenia / Muscle Weakness', ja: '筋肉減少 / 筋力低下' },
      { id: 'chronic_fatigue', ko: '비정상적 피로감', en: 'Chronic Fatigue', ja: '異常な疲労感' },
      { id: 'odor_change', ko: '체취 변화 (남성적/여성적)', en: 'Body Odor Change (Masculine/Feminine)', ja: '体臭の変化（男性化/女性化）' },
      { id: 'hyperhidrosis', ko: '땀 과다 분비', en: 'Hyperhidrosis / Excessive Sweating', ja: '多汗 / 過剰な発汗' },
      { id: 'voice_change', ko: '목소리 갈라짐 / 굵어짐', en: 'Voice Cracking / Deepening', ja: '声変わり / 声が低くなる' },
    ]
  },
  MUSCULOSKELETAL: {
    category: '근골격계',
    symptoms: [
      { id: 'joint_pain', ko: '관절통', en: 'Joint Pain', ja: '関節痛' },
      { id: 'headache', ko: '두통', en: 'Headache', ja: '頭痛' },
    ]
  },
  DIGESTIVE_METABOLIC: {
    category: '소화 / 대사',
    symptoms: [
      { id: 'nausea', ko: '메스꺼움 / 구역감', en: 'Nausea', ja: '吐き気' },
    ]
  },
  BREAST_CHEST: {
    category: '가슴 / 유방',
    symptoms: [
      { id: 'breast_budding', ko: '가슴 몽우리 / 유륜 통증', en: 'Breast Budding / Mastalgia', ja: '乳房のしこり / 乳輪の痛み' },
      { id: 'gynecomastia', ko: '가슴 커짐 / 여유증', en: 'Gynecomastia / Breast Enlargement', ja: '乳房の肥大 / 女性化乳房' },
      { id: 'breast_atrophy', ko: '가슴 작아짐 / 처짐', en: 'Breast Atrophy / Sagging', ja: '乳房の萎縮 / たるみ' },
    ]
  },
  SEXUAL_GENITAL: {
    category: '성기능 / 생식기',
    symptoms: [
      { id: 'low_libido', ko: '성욕 급감 / 무성욕', en: 'Low Libido / Asexuality', ja: '性欲の急減 / 無性欲' },
      { id: 'hypersexuality', ko: '성욕 폭발', en: 'Hypersexuality', ja: '性欲増加' },
      { id: 'erectile_dysfunction', ko: '아침 발기 소실 / 발기력 저하', en: 'Erectile Dysfunction / Loss of Morning Erections', ja: '朝立ちの消失 / 勃起力低下' },
      { id: 'orgasm_change', ko: '오르가즘 느낌 변화', en: 'Orgasm Sensation Change', ja: 'オーガズム感覚の変化' },
      { id: 'testicular_atrophy', ko: '고환 크기 감소 / 위축', en: 'Testicular Atrophy', ja: '睾丸の大きさ減少 / 萎縮' },
      { id: 'oligospermia_azoospermia', ko: '정액량 감소 / 투명해짐', en: 'Oligospermia / Azoospermia', ja: '精液量減少 / 透明化' },
      { id: 'clitoromegaly', ko: '클리토리스 비대', en: 'Clitoromegaly', ja: '陰核肥大' },
      { id: 'vaginal_atrophy_dryness', ko: '질 건조증 / 위축', en: 'Vaginal Atrophy / Dryness', ja: '膣乾燥症 / 萎縮' },
      { id: 'amenorrhea', ko: '월경 중단 / 무월경', en: 'Amenorrhea / Cessation of Menstruation', ja: '月経停止 / 無月経' },
      { id: 'irregular_bleeding', ko: '부정 출혈 / 피비침', en: 'Irregular Bleeding / Spotting', ja: '不正出血 / 出血' },
    ]
  },
  INTERNAL_CIRCULATORY: {
    category: '내장 / 순환기 (※ 위험 신호)',
    symptoms: [
      { id: 'palpitation', ko: '가슴 두근거림 / 빈맥', en: 'Palpitation / Tachycardia', ja: '動悸 / 頻脈' },
      { id: 'dyspnea', ko: '숨 가쁨 / 호흡 곤란', en: 'Dyspnea / Shortness of Breath', ja: '息切れ / 呼吸困難' },
      { id: 'dvt_symptoms', ko: '종아리/다리 붓고 아픔 (혈전 의심)', en: 'Calf/Leg Swelling & Pain (DVT Suspicion)', ja: 'ふくらはぎ/脚の腫れと痛み（血栓疑い）' },
      { id: 'jaundice', ko: '눈/피부가 노랗게 변함 (간 독성 신호)', en: 'Jaundice (Liver Toxicity Sign)', ja: '目/皮膚が黄色くなる（肝毒性の兆候）' },
      { id: 'ruq_pain', ko: '오른쪽 윗배 뻐근함 (간 비대 의심)', en: 'RUQ Pain (Suspected Liver Enlargement)', ja: '右上腹部の張り（肝肥大疑い）' },
    ]
  }
};
