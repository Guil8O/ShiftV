/**
 * Medication Database
 * 
 * HRT, AAS, 보조제 등 모든 약물 정보
 * 각 약물은 성분, 투여 방식, 효과, 부작용, 위험도 포함
 */

// ========================================
// 1. 약물 카테고리
// ========================================

export const MEDICATION_CATEGORIES = {
  estrogen: 'estrogen',              // 에스트로겐
  progestogen: 'progestogen',        // 프로게스테론/프로게스틴
  antiAndrogen: 'antiAndrogen',      // 항안드로겐
  testosterone: 'testosterone',       // 테스토스테론
  aas: 'aas',                        // 아나볼릭 스테로이드
  serm: 'serm',                      // 선택적 에스트로겐 수용체 조절제
  ai: 'ai',                          // 아로마타제 억제제
  fatLoss: 'fatLoss',               // 체지방 감소제
  hairLoss: 'hairLoss',             // 탈모 치료제
  supplement: 'supplement'           // 보조제
};

// ========================================
// 2.5. 프로게스토겐 (Progestogens)
// ========================================

export const PROGESTOGENS = [
  {
    id: 'progesterone',
    names: ['프로게스테론', 'Progesterone', 'Utrogestan', '프로게스테론(미세화)'],
    category: 'progestogen',
    route: 'oral',
    riskLevel: 'low',
    halfLife: 16,
    interactions: [],
    recommendedUnits: ['mg'],
    effects: ['수면 질 개선', '기분 안정', '유방 조직 변화 가능'],
    sideEffects: ['졸림', '어지러움', '기분 변화'],
    warnings: ['개인차 큼', '졸림이 심하면 복용 시간 조정'],
    relatedSymptoms: ['hypersomnia', 'mood_swings']
  }
];

// ========================================
// 2. 에스트로겐 (Estrogens)
// ========================================

export const ESTROGENS = {
  oral: [
    {
      id: 'estradiol_valerate',
      names: ['프로기노바', 'Progynova', 'Estradiol Valerate'],
      category: 'estrogen',
      route: 'oral',
      riskLevel: 'medium',
      halfLife: 24, // 약 12-24시간
      interactions: [],
      recommendedUnits: ['pg/mL', 'pmol/L'],
      effects: ['여성화', '가슴 발달', '피부 부드러워짐', '지방 재분배'],
      sideEffects: ['혈전 위험', '간 부담', '두통', '메스꺼움'],
      warnings: ['흡연 시 혈전 위험 급증', '간 질환 주의'],
      relatedSymptoms: ['breast_development', 'skin_softening', 'dvt_symptoms']
    },
    {
      id: 'estradiol_hemihydrate',
      names: ['에스트로펨', 'Estrofem', 'Estradiol Hemihydrate'],
      category: 'estrogen',
      route: 'oral',
      riskLevel: 'medium',
      halfLife: 24, // 약 12-24시간
      interactions: [],
      recommendedUnits: ['pg/mL', 'pmol/L'],
      effects: ['여성화', '가슴 발달', '피부 개선'],
      sideEffects: ['혈전 위험', '간 부담', '체중 증가'],
      warnings: ['흡연 금지', '정기 간 검사'],
      relatedSymptoms: ['breast_development', 'weight_gain', 'edema']
    }
  ],
  
  transdermal: [
    {
      id: 'estradiol_gel',
      names: ['디비겔', 'Divigel', '에스트로겔', 'Oestrogel'],
      category: 'estrogen',
      route: 'transdermal',
      riskLevel: 'low',
      halfLife: 36, // 도포 후 서서히 흡수
      interactions: [],
      recommendedUnits: ['pg/mL', 'pmol/L'],
      effects: ['여성화', '가슴 발달', '피부 개선'],
      sideEffects: ['피부 자극', '도포 부위 발진'],
      warnings: ['타인 접촉 주의', '샤워 전 흡수 대기'],
      relatedSymptoms: ['breast_development', 'skin_softening']
    },
    {
      id: 'estradiol_patch',
      names: ['클리마라', 'Climara'],
      category: 'estrogen',
      route: 'transdermal',
      riskLevel: 'low',
      halfLife: 84, // 부착 기간 동안 지속
      interactions: [],
      recommendedUnits: ['pg/mL', 'pmol/L'],
      effects: ['여성화', '안정적 호르몬 수치'],
      sideEffects: ['피부 자극', '패치 부착 부위 가려움'],
      warnings: ['주 2회 교체', '땀에 떨어질 수 있음'],
      relatedSymptoms: ['breast_development']
    }
  ],
  
  injectable: [
    {
      id: 'estradiol_valerate_injection',
      names: ['Estradiol Valerate', 'EV 주사'],
      category: 'estrogen',
      route: 'injectable',
      riskLevel: 'low',
      halfLife: 120, // 약 4-5일
      interactions: [],
      recommendedUnits: ['pg/mL', 'pmol/L'],
      effects: ['강력한 여성화', '안정적 수치', '간 부담 없음'],
      sideEffects: ['주사 통증', '수치 변동'],
      warnings: ['근육 주사', '무균 기법 필수'],
      relatedSymptoms: ['breast_development', 'fat_redistribution_feminine']
    },
    {
      id: 'estradiol_enanthate',
      names: ['Estradiol Enanthate', 'EEn'],
      category: 'estrogen',
      route: 'injectable',
      riskLevel: 'low',
      halfLife: 168, // 약 7일
      interactions: [],
      recommendedUnits: ['pg/mL', 'pmol/L'],
      effects: ['강력한 여성화', '장기 지속'],
      sideEffects: ['주사 통증'],
      warnings: ['근육 주사'],
      relatedSymptoms: ['breast_development']
    }
  ]
};

// ========================================
// 3. 항안드로겐 (Anti-Androgens)
// ========================================

export const ANTI_ANDROGENS = [
  {
    id: 'spironolactone',
    names: ['알닥톤', 'Aldactone', '스피로노락톤', 'Spironolactone'],
    category: 'antiAndrogen',
    riskLevel: 'medium',
    halfLife: 14, // 대사산물 포함 시 김
    interactions: [
      { category: 'potassium_supplements', message: '고칼륨혈증 위험이 있으므로 칼륨 보충제 섭취를 제한하세요.' },
      { category: 'ace_inhibitors', message: '혈압 강하 효과가 증폭될 수 있습니다.' }
    ],
    recommendedUnits: ['mg'],
    effects: ['테스토스테론 억제', '이뇨 작용', '여성화 촉진'],
    sideEffects: ['칼륨 증가', '저혈압', '어지러움', '빈뇨'],
    warnings: ['칼륨 섭취 주의', '혈압 모니터링', '신장 기능 검사'],
    relatedSymptoms: ['libido_decrease_mtf', 'erectile_dysfunction', 'edema']
  },
  {
    id: 'bicalutamide',
    names: ['비칼루타미드', 'Bicalutamide', 'Casodex'],
    category: 'antiAndrogen',
    riskLevel: 'medium',
    halfLife: 144, // 약 6일
    interactions: [
      { category: 'hepatotoxic_drugs', message: '간 독성 약물과 병용 시 주의가 필요합니다.' }
    ],
    recommendedUnits: ['mg'],
    effects: ['강력한 항안드로겐', '수용체 직접 차단'],
    sideEffects: ['간 독성', '가슴 통증', '열감'],
    warnings: ['정기 간 검사 필수', '고용량 주의'],
    relatedSymptoms: ['gynecomastia', 'breast_pain', 'jaundice']
  },
  {
    id: 'cyproterone_acetate',
    names: ['시프로테론 아세테이트', 'Cyproterone', 'Androcur'],
    category: 'antiAndrogen',
    riskLevel: 'high',
    halfLife: 38, // 약 38시간
    interactions: [],
    recommendedUnits: ['mg'],
    effects: ['강력한 테스토스테론 억제'],
    sideEffects: ['간 독성', '우울증', '체중 증가', '뇌수막종 위험'],
    warnings: ['간 검사 필수', '우울증 모니터링', '장기 사용 위험'],
    relatedSymptoms: ['depression', 'jaundice', 'weight_gain', 'chronic_fatigue']
  },
  {
    id: 'gnrh_agonist',
    names: ['루크린', 'Leuprorelin', '데카펩틸', 'Triptorelin'],
    category: 'antiAndrogen',
    riskLevel: 'high',
    halfLife: 0, // 제형에 따라 다름 (데포)
    interactions: [],
    recommendedUnits: ['mg'],
    effects: ['완전한 고환 셧다운', '테스토스테론 거세 수준'],
    sideEffects: ['뼈 손실', '열감', '기분 변화'],
    warnings: ['골밀도 검사', '비용 높음', '가역성 확인'],
    relatedSymptoms: ['hot_flashes', 'testicular_atrophy', 'libido_decrease_mtf']
  },
  {
    id: 'anti_androgen',
    names: ['항안드로겐(기타)', 'Anti-Androgen (Other)'],
    category: 'antiAndrogen',
    riskLevel: 'medium',
    halfLife: 24,
    interactions: [],
    recommendedUnits: ['mg'],
    effects: ['테스토스테론 억제'],
    sideEffects: ['개인차'],
    warnings: ['구체 약물명을 알고 있다면 해당 약물로 기록하세요'],
    relatedSymptoms: []
  }
];

// ========================================
// 4. 테스토스테론 (Testosterone)
// ========================================

export const TESTOSTERONE = {
  longActing: [
    {
      id: 'testosterone_undecanoate',
      names: ['네비도', 'Nebido', 'Testosterone Undecanoate'],
      category: 'testosterone',
      route: 'injectable',
      riskLevel: 'low',
      effects: ['남성화', '근육 증가', '목소리 변화', '체모 증가'],
      sideEffects: ['여드름', '혈압 상승', '적혈구 증가'],
      warnings: ['3개월마다 주사', '혈액 점도 모니터링'],
      relatedSymptoms: ['voice_deepening', 'muscle_gain', 'facial_hair_growth', 'acne_ftm']
    }
  ],
  
  mediumActing: [
    {
      id: 'testosterone_enanthate',
      names: ['예나스테론', 'Testosterone Enanthate'],
      category: 'testosterone',
      route: 'injectable',
      riskLevel: 'low',
      effects: ['남성화', '근육 증가', '목소리 변화'],
      sideEffects: ['여드름', '기분 변동', '수치 변동'],
      warnings: ['주 1-2회 주사', '안정적 수치 유지'],
      relatedSymptoms: ['voice_deepening', 'muscle_gain', 'mood_swings']
    },
    {
      id: 'testosterone_cypionate',
      names: ['Testosterone Cypionate'],
      category: 'testosterone',
      route: 'injectable',
      riskLevel: 'low',
      effects: ['남성화', '근육 증가'],
      sideEffects: ['여드름', '탈모'],
      warnings: ['주 1-2회 주사'],
      relatedSymptoms: ['muscle_gain', 'male_pattern_baldness']
    }
  ],
  
  topical: [
    {
      id: 'testosterone_gel',
      names: ['안드로겔', 'Androgel', '테스토겔', 'Testogel'],
      category: 'testosterone',
      route: 'topical',
      riskLevel: 'medium',
      effects: ['남성화', '안정적 수치'],
      sideEffects: ['피부 자극', '타인 전이 위험'],
      warnings: ['타인 접촉 주의', '어린이/여성 접촉 금지'],
      relatedSymptoms: ['voice_deepening', 'body_hair_increase']
    }
  ]
};

// ========================================
// 5. 아나볼릭 스테로이드 (AAS)
// ========================================

export const ANABOLIC_STEROIDS = {
  bulking: [
    {
      id: 'methandienone',
      names: ['디아나볼', 'Dianabol', 'Methandienone'],
      category: 'aas',
      riskLevel: 'high',
      effects: ['급격한 근육 증가', '체중 증가', '힘 증가'],
      sideEffects: ['간 독성', '여유증', '수분 정체', '여드름'],
      warnings: ['간 검사 필수', 'AI 병행 권장', '단기 사용'],
      relatedSymptoms: ['weight_gain', 'gynecomastia', 'edema', 'jaundice']
    },
    {
      id: 'anadrol',
      names: ['아나드롤', 'Anadrol', 'Oxymetholone'],
      category: 'aas',
      riskLevel: 'very_high',
      effects: ['극강 근육 증가', '힘 폭발'],
      sideEffects: ['최고 간 독성', '여유증', '수분 정체', '식욕 감퇴'],
      warnings: ['간 독성 최고 수준', '4주 이내 사용'],
      relatedSymptoms: ['jaundice', 'ruq_pain', 'gynecomastia', 'edema']
    }
  ],
  
  cutting: [
    {
      id: 'oxandrolone',
      names: ['아나바', 'Anavar', 'Oxandrolone'],
      category: 'aas',
      riskLevel: 'low',
      effects: ['근육 보존', '체지방 감소', '힘 유지'],
      sideEffects: ['간 독성 낮음', '콜레스테롤 영향'],
      warnings: ['여성/논바이너리도 사용', '비싸지만 안전함'],
      relatedSymptoms: ['muscle_gain', 'fat_loss']
    },
    {
      id: 'stanozolol',
      names: ['윈스트롤', 'Winstrol', 'Stanozolol'],
      category: 'aas',
      riskLevel: 'high',
      effects: ['근육 경화', '혈관 부각', '체지방 감소'],
      sideEffects: ['관절 건조', '탈모', '간 독성', '콜레스테롤 악화'],
      warnings: ['관절 보호제 병행', '지질 검사 필수'],
      relatedSymptoms: ['xeroderma', 'male_pattern_baldness', 'jaundice']
    }
  ],
  
  advanced: [
    {
      id: 'trenbolone',
      names: ['트렌볼론', 'Trenbolone'],
      category: 'aas',
      riskLevel: 'very_high',
      effects: ['극강 근육 증가', '체지방 감소', '힘 폭발'],
      sideEffects: ['로이드 레이지', '불면증', '야간 땀', '숨참', '성격 변화'],
      warnings: ['초보자 금지', '정신 건강 주의', '심혈관 부담'],
      relatedSymptoms: ['aggression', 'insomnia', 'hyperhidrosis', 'dyspnea', 'mood_swings']
    },
    {
      id: 'masteron',
      names: ['마스테론', 'Masteron', 'Drostanolone'],
      category: 'aas',
      riskLevel: 'medium',
      effects: ['근육 경화', 'DHT 효과', '탈모 위험'],
      sideEffects: ['탈모', '공격성', '전립선 비대'],
      warnings: ['DHT 유도체', '탈모 유전 시 주의'],
      relatedSymptoms: ['male_pattern_baldness', 'aggression']
    }
  ]
};

// ========================================
// 6. SERM & AI
// ========================================

export const SERM_AND_AI = {
  serm: [
    {
      id: 'tamoxifen',
      names: ['타목시펜', 'Tamoxifen', 'Nolvadex'],
      category: 'serm',
      riskLevel: 'medium',
      halfLife: 168, // 5-7일
      interactions: [
        { category: 'ssri_antidepressants', message: '일부 항우울제(SSRI)는 타목시펜의 효과를 감소시킬 수 있습니다.' }
      ],
      recommendedUnits: ['mg'],
      effects: ['여유증 억제', '고환 자극', 'PCT'],
      sideEffects: ['시력 문제', '혈전 위험', '기분 변화'],
      warnings: ['장기 사용 시 시력 검사', '혈전 위험'],
      relatedSymptoms: ['vision_impairment', 'dvt_symptoms']
    },
    {
      id: 'raloxifene',
      names: ['랄록시펜', 'Raloxifene', 'Evista'],
      category: 'serm',
      riskLevel: 'low',
      halfLife: 27, // 약 27시간
      interactions: [],
      recommendedUnits: ['mg'],
      effects: ['여유증 억제 특화', '뼈 강화', '부작용 적음'],
      sideEffects: ['혈전 위험 낮음', '간 부담 적음'],
      warnings: ['타목시펜보다 안전'],
      relatedSymptoms: ['gynecomastia']
    },
    {
      id: 'clomiphene',
      names: ['클로미펜', 'Clomid', 'Clomiphene'],
      category: 'serm',
      riskLevel: 'medium',
      halfLife: 120, // 5일
      interactions: [],
      recommendedUnits: ['mg'],
      effects: ['고환 자극', 'PCT', '자가 호르몬 생성'],
      sideEffects: ['시력 문제', '기분 변화'],
      warnings: ['PCT 전문', '단기 사용'],
      relatedSymptoms: ['vision_impairment', 'mood_swings']
    }
  ],
  
  ai: [
    {
      id: 'anastrozole',
      names: ['아리미덱스', 'Anastrozole', 'Arimidex'],
      category: 'ai',
      riskLevel: 'medium',
      effects: ['에스트로겐 억제', '수분 제거', '여유증 방지'],
      sideEffects: ['관절통', '뼈 손실', '지질 악화'],
      warnings: ['과용 시 E2 제로 위험'],
      relatedSymptoms: ['xeroderma', 'joint_pain']
    },
    {
      id: 'letrozole',
      names: ['페마라', 'Letrozole', 'Femara'],
      category: 'ai',
      riskLevel: 'high',
      effects: ['최강 에스트로겐 억제'],
      sideEffects: ['심각한 관절통', '뼈 손실', 'E2 제로 위험'],
      warnings: ['가장 강력', '매우 주의', '저용량 시작'],
      relatedSymptoms: ['joint_pain', 'xeroderma', 'chronic_fatigue']
    }
  ]
};

// ========================================
// 7. 체지방 감소제 (Fat Loss)
// ========================================

export const FAT_LOSS_AGENTS = [
  {
    id: 'clenbuterol',
    names: ['클렌부테롤', 'Clenbuterol'],
    category: 'fatLoss',
    riskLevel: 'high',
    effects: ['체지방 감소', '기관지 확장', '대사 증가'],
    sideEffects: ['심박수 증가', '극심한 떨림', '불면증', '땀'],
    warnings: ['심장 부담', '전해질 보충 필수'],
    relatedSymptoms: ['tremor', 'palpitation', 'insomnia', 'hyperhidrosis']
  },
  {
    id: 'eca_stack',
    names: ['에페드린', 'Ephedrine', 'ECA Stack'],
    category: 'fatLoss',
    riskLevel: 'medium',
    effects: ['식욕 억제', '대사 증가', '에너지 증가'],
    sideEffects: ['심박수 증가', '불안', '혈압 상승'],
    warnings: ['카페인 병행', '심혈관 주의'],
    relatedSymptoms: ['anxiety', 'palpitation', 'insomnia']
  },
  {
    id: 'semaglutide',
    names: ['위고비', 'Wegovy', '오젬픽', 'Ozempic', 'Semaglutide'],
    category: 'fatLoss',
    riskLevel: 'low',
    effects: ['강력한 식욕 억제', '체중 감소'],
    sideEffects: ['메스꺼움', '구토', '변비'],
    warnings: ['주 1회 주사', '고가'],
    relatedSymptoms: ['nausea', 'weight_loss']
  },
  {
    id: 'liraglutide',
    names: ['삭센다', 'Saxenda', 'Liraglutide'],
    category: 'fatLoss',
    riskLevel: 'low',
    effects: ['식욕 억제', '체중 감소'],
    sideEffects: ['메스꺼움', '구토'],
    warnings: ['매일 주사'],
    relatedSymptoms: ['nausea', 'weight_loss']
  }
];

// ========================================
// 8. 탈모 치료제 (Hair Loss Prevention)
// ========================================

export const HAIR_LOSS_TREATMENTS = [
  {
    id: 'finasteride',
    names: ['피나스테리드', 'Finasteride', '프로페시아', 'Propecia'],
    category: 'hairLoss',
    riskLevel: 'medium',
    effects: ['DHT 억제', '탈모 방지'],
    sideEffects: ['성욕 감퇴', '우울감', '여유증'],
    warnings: ['일부 부작용 영구', 'Post-Finasteride Syndrome'],
    relatedSymptoms: ['low_libido', 'depression', 'gynecomastia']
  },
  {
    id: 'dutasteride',
    names: ['두타스테리드', 'Dutasteride', '아보다트', 'Avodart'],
    category: 'hairLoss',
    riskLevel: 'high',
    effects: ['강력한 DHT 억제'],
    sideEffects: ['성욕 감퇴', '우울감', '반감기 김'],
    warnings: ['피나보다 강력', '중단 어려움'],
    relatedSymptoms: ['low_libido', 'depression']
  },
  {
    id: 'minoxidil',
    names: ['미녹시딜', 'Minoxidil'],
    category: 'hairLoss',
    riskLevel: 'low',
    effects: ['혈관 확장', '모발 성장'],
    sideEffects: ['초기 쉐딩', '피부 자극'],
    warnings: ['지속 사용 필요'],
    relatedSymptoms: ['hair_growth']
  }
];

// ========================================
// 9. 보조제 (Supplements)
// ========================================

export const SUPPLEMENTS = [
  {
    id: 'liver_protection',
    names: ['우루사', 'UDCA', '밀크씨슬', 'Milk Thistle', '글루타치온'],
    category: 'supplement',
    riskLevel: 'none',
    effects: ['간 보호', '해독 지원'],
    sideEffects: ['거의 없음'],
    warnings: ['경구 AAS 사용 시 필수'],
    relatedSymptoms: []
  },
  {
    id: 'thyroid_hormone',
    names: ['T3', 'Cytomel', 'T4', 'Synthroid'],
    category: 'supplement',
    riskLevel: 'medium',
    effects: ['대사 촉진', '체지방 감소'],
    sideEffects: ['심박수 증가', '불안', '근육 손실'],
    warnings: ['갑상선 기능 억제 위험'],
    relatedSymptoms: ['palpitation', 'anxiety', 'sarcopenia']
  },
  {
    id: 'tadalafil',
    names: ['시알리스', 'Cialis', 'Tadalafil'],
    category: 'supplement',
    riskLevel: 'low',
    effects: ['혈류 개선', '발기 지원', '펌핑 개선'],
    sideEffects: ['두통', '소화불량'],
    warnings: ['혈압 약과 병용 금지'],
    relatedSymptoms: ['erectile_dysfunction']
  },
  {
    id: 'sildenafil',
    names: ['비아그라', 'Viagra', 'Sildenafil'],
    category: 'supplement',
    riskLevel: 'low',
    effects: ['발기 지원'],
    sideEffects: ['두통', '안면 홍조'],
    warnings: ['혈압 약과 병용 금지'],
    relatedSymptoms: ['erectile_dysfunction']
  }
];

// ========================================
// 10. 헬퍼 함수
// ========================================

/**
 * 모든 약물 리스트 가져오기
 */
export function getAllMedications() {
  return [
    ...ESTROGENS.oral,
    ...ESTROGENS.transdermal,
    ...ESTROGENS.injectable,
    ...PROGESTOGENS,
    ...ANTI_ANDROGENS,
    ...TESTOSTERONE.longActing,
    ...TESTOSTERONE.mediumActing,
    ...TESTOSTERONE.topical,
    ...ANABOLIC_STEROIDS.bulking,
    ...ANABOLIC_STEROIDS.cutting,
    ...ANABOLIC_STEROIDS.advanced,
    ...SERM_AND_AI.serm,
    ...SERM_AND_AI.ai,
    ...FAT_LOSS_AGENTS,
    ...HAIR_LOSS_TREATMENTS,
    ...SUPPLEMENTS
  ];
}

/**
 * 특정 모드에 맞는 약물 필터링
 */
export function getMedicationsForMode(mode) {
  const all = getAllMedications();
  
  switch(mode) {
    case 'mtf':
      return all.filter(m => 
        m.category === 'estrogen' || 
        m.category === 'progestogen' ||
        m.category === 'antiAndrogen' ||
        m.category === 'supplement'
      );
      
    case 'ftm':
      return all.filter(m => 
        m.category === 'testosterone' ||
        m.category === 'supplement'
      );
      
    case 'nonbinary':
      return all; // 모든 약물 가능
      
    default:
      return all;
  }
}

/**
 * 위험도별 약물 필터링
 */
export function getMedicationsByRisk(riskLevel) {
  return getAllMedications().filter(m => m.riskLevel === riskLevel);
}

/**
 * 약물 ID로 약물 정보 찾기
 */
export function getMedicationById(medId) {
  return getAllMedications().find(m => m.id === medId);
}

/**
 * 약물 이름으로 검색 (fuzzy matching)
 */
export function searchMedicationByName(searchTerm) {
  const term = searchTerm.toLowerCase();
  return getAllMedications().filter(m => 
    m.names.some(name => name.toLowerCase().includes(term))
  );
}

// ========================================
// 8. MEDICATION_DATABASE (UI용 계층 구조)
// ========================================

/**
 * UI에서 사용하는 계층적 약물 데이터베이스
 * doctor-engine.js에서 사용
 */
export const MEDICATION_DATABASE = {
  ESTROGENS_ANTI_ANDROGENS: {
    category: '여성 호르몬 (Estrogens) & 항남성 (Anti-Androgens)',
    items: [
      { id: 'estradiol_oral', ko: '에스트로겐 경구제', en: 'Oral Estrogen', ja: '経口エストロゲン', type: 'estrogen', method: 'oral' },
      { id: 'estradiol_transdermal', ko: '에스트로겐 겔/패치', en: 'Transdermal Estrogen (Gel/Patch)', ja: '経皮エストロゲン（ゲル/パッチ）', type: 'estrogen', method: 'transdermal' },
      { id: 'estradiol_injectable', ko: '에스트로겐 주사제', en: 'Injectable Estrogen', ja: '注射用エストロゲン', type: 'estrogen', method: 'injectable' },
      { id: 'spironolactone', ko: '스피로노락톤 (알닥톤)', en: 'Spironolactone (Aldactone)', ja: 'スピロノラクトン', type: 'anti_androgen', subtype: 'aldosterone_inhibitor' },
      { id: 'bicalutamide', ko: '비칼루타미드 (카소덱스)', en: 'Bicalutamide (Casodex)', ja: 'ビカルタミド', type: 'anti_androgen', subtype: 'receptor_blocker' },
      { id: 'cyproterone_acetate', ko: '시프로테론 아세테이트 (안드로쿨)', en: 'Cyproterone Acetate (Androcur)', ja: '酢酸シプロテロン', type: 'anti_androgen', subtype: 'receptor_blocker' },
      { id: 'gnrh_agonist', ko: 'GnRH 작용제 (루크린, 데카펩틸)', en: 'GnRH Agonist (Lupron, Decapeptyl)', ja: 'GnRHアゴニスト', type: 'anti_androgen', subtype: 'gnrh_agonist' },
    ]
  },
  ANDROGENS_AAS: {
    category: '남성 호르몬 (Androgens) & 스테로이드 (AAS)',
    items: [
      { id: 'testosterone_long_acting_injectable', ko: '테스토스테론 장기 지속형 주사', en: 'Long-acting Injectable Testosterone', ja: '長期持続型テストステロン注射', type: 'testosterone', method: 'injectable' },
      { id: 'testosterone_mid_term_injectable', ko: '테스토스테론 중단기 주사', en: 'Mid-term Injectable Testosterone', ja: '中短期テストステロン注射', type: 'testosterone', method: 'injectable' },
      { id: 'testosterone_gel', ko: '테스토스테론 겔', en: 'Testosterone Gel', ja: 'テストステロンゲル', type: 'testosterone', method: 'transdermal' },
      { id: 'dianabol', ko: '디아나볼 (벌킹 AAS)', en: 'Dianabol (Bulking AAS)', ja: 'ダイアナボル', type: 'aas', subtype: 'bulking_oral' },
      { id: 'oxymetholone', ko: '옥시메톨론 (아나드롤, 벌킹 AAS)', en: 'Oxymetholone (Anadrol, Bulking AAS)', ja: 'オキシメトロン', type: 'aas', subtype: 'bulking_oral' },
      { id: 'oxandrolone', ko: '아나바 (컷팅 AAS)', en: 'Oxandrolone (Anavar, Cutting AAS)', ja: 'アナバー', type: 'aas', subtype: 'cutting_oral' },
      { id: 'stanozolol', ko: '윈스트롤 (컷팅 AAS)', en: 'Stanozolol (Winstrol, Cutting AAS)', ja: 'ウィンストロール', type: 'aas', subtype: 'cutting_oral' },
      { id: 'trenbolone', ko: '트렌볼론 (주사 AAS)', en: 'Trenbolone (Injectable AAS)', ja: 'トレンボロン', type: 'aas', method: 'injectable' },
      { id: 'masteron', ko: '마스테론 (주사 AAS)', en: 'Masteron (Injectable AAS)', ja: 'マステロン', type: 'aas', method: 'injectable' },
    ]
  },
  SERM_AI: {
    category: '선택적 호르몬 조절제 (SERM) & 아로마타제 억제제 (AI)',
    items: [
      { id: 'tamoxifen', ko: '타목시펜 (놀바덱스)', en: 'Tamoxifen (Nolvadex)', ja: 'タモキシフェン', type: 'serm' },
      { id: 'raloxifene', ko: '랄록시펜 (에비스타)', en: 'Raloxifene (Evista)', ja: 'ラロキシフェン', type: 'serm' },
      { id: 'clomiphene', ko: '클로미펜 (클로미드)', en: 'Clomiphene (Clomid)', ja: 'クロミフェン', type: 'serm' },
      { id: 'anastrozole', ko: '아리미덱스', en: 'Anastrozole (Arimidex)', ja: 'アナストロゾール', type: 'ai' },
      { id: 'letrozole', ko: '페마라 (레트로졸)', en: 'Letrozole (Femara)', ja: 'レトロゾール', type: 'ai' },
    ]
  },
  FAT_LOSS: {
    category: '다이어트 / 체지방 연소',
    items: [
      { id: 'clenbuterol', ko: '클렌부테롤', en: 'Clenbuterol', ja: 'クレンブテロール', type: 'fat_loss', subtype: 'stimulant' },
      { id: 'ephedrine_caffeine', ko: '에페드린 / 카페인 스택', en: 'Ephedrine / Caffeine Stack', ja: 'エフェドリン / カフェインスタック', type: 'fat_loss', subtype: 'stimulant' },
      { id: 'liraglutide', ko: '삭센다 (리라글루티드)', en: 'Liraglutide (Saxenda)', ja: 'リラグルチド', type: 'fat_loss', subtype: 'glp1_agonist' },
      { id: 'semaglutide', ko: '위고비 / 오젬픽 (세마글루티드)', en: 'Semaglutide (Wegovy / Ozempic)', ja: 'セマグルチド', type: 'fat_loss', subtype: 'glp1_agonist' },
    ]
  },
  DHT_BLOCKERS: {
    category: '탈모 치료제 (DHT Blockers)',
    items: [
      { id: 'finasteride', ko: '피나스테리드 (프로페시아, 핀페시아)', en: 'Finasteride (Propecia, Fpecia)', ja: 'フィナステリド', type: 'dht_blocker', method: 'oral' },
      { id: 'dutasteride', ko: '두타스테리드 (아보다트)', en: 'Dutasteride (Avodart)', ja: 'デュタステリド', type: 'dht_blocker', method: 'oral' },
      { id: 'minoxidil', ko: '미녹시딜 (국소 도포제)', en: 'Minoxidil (Topical)', ja: 'ミノキシジル', type: 'dht_blocker', method: 'topical' },
    ]
  },
  OTHER_SUPPLEMENTS: {
    category: '기타 보조제 및 관리제',
    items: [
      { id: 'thyroid_hormone', ko: '갑상선 호르몬 (T3, T4)', en: 'Thyroid Hormone (T3, T4)', ja: '甲状腺ホルモン', type: 'supplement', subtype: 'thyroid' },
      { id: 'liver_protector', ko: '간 보호제 (UDCA, 밀크씨슬, 글루타치온)', en: 'Liver Protector (UDCA, Milk Thistle, Glutathione)', ja: '肝保護剤', type: 'supplement', subtype: 'liver' },
      { id: 'sexual_enhancer', ko: '성기능 보조 (시알리스, 비아그라)', en: 'Sexual Enhancer (Cialis, Viagra)', ja: '性機能補助剤', type: 'supplement', subtype: 'sexual' },
    ]
  }
};
