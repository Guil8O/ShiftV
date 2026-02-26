/**
 * Safety Engine — ShiftV DoctorModule
 *
 * 근거 기반 HRT 안전 모니터링 엔진
 * 보고서: "제한된 사용자 입력만으로 HRT 환자관리 진단 모듈을 안전·근거기반으로 강화하는 설계 보고서"
 *
 * ─ 8개 위험 도메인 ─────────────────────────────────────
 *  1. VTE         혈전/색전 (에스트로겐 · CPA · SERM)
 *  2. HYPERKALEMIA 고칼륨혈증 (스피로노락톤)
 *  3. POLYCYTHEMIA 적혈구증가증 (테스토스테론)
 *  4. HEPATOTOXICITY 간독성 (비칼루타미드 · CPA · 경구 AAS)
 *  5. METABOLIC    대사 위험 (비만 + HRT 복합)
 *  6. PSYCHIATRIC  정신건강 (자살 사고 · 우울 클러스터)
 *  7. MENINGIOMA   수막종 (CPA 장기·고용량)
 *  8. SLEEP_APNEA  수면무호흡 (테스토스테론 + 비만·목둘레)
 *
 * ─ 설계 원칙 ──────────────────────────────────────────
 *  - 민감도(Recall) 우선: 검사값 없이도 보수적으로 경고
 *  - 확정 진단 표현 금지: 모든 출력에 DISCLAIMER 고정
 *  - 약물 기반 기본점수 + 증상 클러스터 점수 → 가중합 0-100
 *  - 시간지연 휴리스틱: 약물 시작/증량 14일 이내 위험 상향
 *  - 다국어: ko / en / ja 전부 제공
 */

// ══════════════════════════════════════════════════════════
//  0. 상수 및 면책조항
// ══════════════════════════════════════════════════════════

export const DISCLAIMER = {
  ko: '이 정보는 의학적 자문을 대체할 수 없습니다. 확정 진단·치료 결정은 반드시 담당 의료진에게 확인하세요.',
  en: 'This information cannot replace medical advice. Always confirm diagnosis and treatment decisions with your healthcare provider.',
  ja: 'この情報は医療的アドバイスの代替ではありません。確定診断・治療の決定は必ず担当医にご確認ください。',
};

/** 위험 도메인 열거형 */
export const RISK_DOMAIN = {
  VTE:            'vte',
  HYPERKALEMIA:   'hyperkalemia',
  POLYCYTHEMIA:   'polycythemia',
  HEPATOTOXICITY: 'hepatotoxicity',
  METABOLIC:      'metabolic',
  PSYCHIATRIC:    'psychiatric',
  MENINGIOMA:     'meningioma',
  SLEEP_APNEA:    'sleep_apnea',
};

/** 알림 레벨: critical → warning → info */
export const ALERT_LEVEL = { CRITICAL: 'critical', WARNING: 'warning', INFO: 'info' };

// ══════════════════════════════════════════════════════════
//  1. 약물 위험 가중치 맵
//     각 약물 ID → 도메인별 기본 점수 + 시간창 플래그
// ══════════════════════════════════════════════════════════

/**
 * DRUG_RISK_MAP[medId] = {
 *   domain: RISK_DOMAIN,
 *   baseScore: number,          // 약물 복용만으로 부여되는 점수
 *   highDoseThreshold?: number, // mg 이상이면 highDoseBonus 추가
 *   highDoseBonus?: number,
 *   recentWindowDays: number,   // 시작/증량 N일 이내 → 시간창 점수 추가
 *   windowBonus: number,
 * }[]
 */
export const DRUG_RISK_MAP = {
  // ── 에스트로겐 계열 ─────────────────────────────────────
  // 경구 에스트로겐: VTE 위험 높음 (간 first-pass → 응고인자 영향)
  estradiol_valerate:   [{ domain: RISK_DOMAIN.VTE, baseScore: 22, highDoseThreshold: 4, highDoseBonus: 8, recentWindowDays: 30, windowBonus: 5 }],
  estradiol_hemihydrate:[{ domain: RISK_DOMAIN.VTE, baseScore: 22, highDoseThreshold: 4, highDoseBonus: 8, recentWindowDays: 30, windowBonus: 5 }],
  // 경피 에스트로겐: VTE 위험 낮음 (간 우회)
  estradiol_gel:        [{ domain: RISK_DOMAIN.VTE, baseScore: 10, recentWindowDays: 30, windowBonus: 3 }],
  estradiol_patch:      [{ domain: RISK_DOMAIN.VTE, baseScore: 10, recentWindowDays: 30, windowBonus: 3 }],
  // 주사 에스트로겐: 중간 VTE 위험
  estradiol_valerate_injection: [{ domain: RISK_DOMAIN.VTE, baseScore: 15, recentWindowDays: 14, windowBonus: 5 }],
  estradiol_enanthate:  [{ domain: RISK_DOMAIN.VTE, baseScore: 15, recentWindowDays: 14, windowBonus: 5 }],

  // ── 항안드로겐 계열 ─────────────────────────────────────
  // 스피로노락톤: 고칼륨혈증 (라벨: 시작/증량 1주 내 K⁺ 모니터링 명시)
  spironolactone: [
    { domain: RISK_DOMAIN.HYPERKALEMIA, baseScore: 35, highDoseThreshold: 100, highDoseBonus: 10, recentWindowDays: 14, windowBonus: 15 }
  ],
  // 비칼루타미드: 간독성 (DILI 케이스 보고: 수일~수개월 발생 가능)
  bicalutamide: [
    { domain: RISK_DOMAIN.HEPATOTOXICITY, baseScore: 25, highDoseThreshold: 50, highDoseBonus: 10, recentWindowDays: 90, windowBonus: 5 }
  ],
  // CPA: VTE + 간독성 + 수막종 (EMA 경고: 고용량 장기 수막종 위험)
  cyproterone_acetate: [
    { domain: RISK_DOMAIN.VTE,            baseScore: 20, highDoseThreshold: 50, highDoseBonus: 10, recentWindowDays: 30, windowBonus: 5 },
    { domain: RISK_DOMAIN.HEPATOTOXICITY, baseScore: 15, highDoseThreshold: 100, highDoseBonus: 15, recentWindowDays: 90, windowBonus: 5 },
    { domain: RISK_DOMAIN.MENINGIOMA,     baseScore: 20, highDoseThreshold: 50, highDoseBonus: 20, recentWindowDays: 365, windowBonus: 5 }
  ],
  // GnRH 작용제: 뼈 건강 (별도 경고, 낮은 baseScore)
  gnrh_agonist: [
    { domain: RISK_DOMAIN.METABOLIC, baseScore: 8, recentWindowDays: 90, windowBonus: 3 }
  ],

  // ── 테스토스테론 계열 ────────────────────────────────────
  // 주사 테스토스테론: 적혈구증가증 (라벨: polycythemia 위험 명시)
  testosterone_undecanoate: [
    { domain: RISK_DOMAIN.POLYCYTHEMIA, baseScore: 28, highDoseThreshold: 1000, highDoseBonus: 10, recentWindowDays: 60, windowBonus: 8 },
    { domain: RISK_DOMAIN.SLEEP_APNEA,  baseScore: 10, recentWindowDays: 60, windowBonus: 3 }
  ],
  testosterone_enanthate: [
    { domain: RISK_DOMAIN.POLYCYTHEMIA, baseScore: 30, highDoseThreshold: 250, highDoseBonus: 10, recentWindowDays: 60, windowBonus: 8 },
    { domain: RISK_DOMAIN.SLEEP_APNEA,  baseScore: 12, recentWindowDays: 60, windowBonus: 3 }
  ],
  testosterone_cypionate: [
    { domain: RISK_DOMAIN.POLYCYTHEMIA, baseScore: 30, highDoseThreshold: 200, highDoseBonus: 10, recentWindowDays: 60, windowBonus: 8 },
    { domain: RISK_DOMAIN.SLEEP_APNEA,  baseScore: 12, recentWindowDays: 60, windowBonus: 3 }
  ],
  // 경피 테스토스테론: 낮은 적혈구증가증 위험
  testosterone_gel: [
    { domain: RISK_DOMAIN.POLYCYTHEMIA, baseScore: 15, highDoseThreshold: 50, highDoseBonus: 5, recentWindowDays: 60, windowBonus: 5 },
    { domain: RISK_DOMAIN.SLEEP_APNEA,  baseScore: 8, recentWindowDays: 60, windowBonus: 2 }
  ],

  // ── AAS (동화스테로이드) ─────────────────────────────────
  // 경구 알킬화 AAS: 간독성 극고위험
  methandienone: [
    { domain: RISK_DOMAIN.HEPATOTOXICITY, baseScore: 40, highDoseThreshold: 30, highDoseBonus: 15, recentWindowDays: 60, windowBonus: 8 },
    { domain: RISK_DOMAIN.POLYCYTHEMIA,   baseScore: 15, recentWindowDays: 60, windowBonus: 5 }
  ],
  anadrol: [ // oxymetholone
    { domain: RISK_DOMAIN.HEPATOTOXICITY, baseScore: 45, highDoseThreshold: 50, highDoseBonus: 15, recentWindowDays: 60, windowBonus: 8 },
    { domain: RISK_DOMAIN.POLYCYTHEMIA,   baseScore: 20, recentWindowDays: 60, windowBonus: 5 }
  ],
  oxandrolone: [
    { domain: RISK_DOMAIN.HEPATOTOXICITY, baseScore: 15, recentWindowDays: 60, windowBonus: 5 }
  ],
  stanozolol: [
    { domain: RISK_DOMAIN.HEPATOTOXICITY, baseScore: 20, highDoseThreshold: 30, highDoseBonus: 10, recentWindowDays: 60, windowBonus: 5 }
  ],
  trenbolone: [
    { domain: RISK_DOMAIN.POLYCYTHEMIA,   baseScore: 20, recentWindowDays: 60, windowBonus: 5 },
    { domain: RISK_DOMAIN.HEPATOTOXICITY, baseScore: 15, recentWindowDays: 60, windowBonus: 5 }
  ],
  masteron: [
    { domain: RISK_DOMAIN.POLYCYTHEMIA, baseScore: 12, recentWindowDays: 60, windowBonus: 4 }
  ],

  // ── SERM / AI ────────────────────────────────────────────
  tamoxifen: [
    { domain: RISK_DOMAIN.VTE, baseScore: 18, recentWindowDays: 30, windowBonus: 5 }
  ],
  raloxifene: [
    { domain: RISK_DOMAIN.VTE, baseScore: 15, recentWindowDays: 30, windowBonus: 5 }
  ],
  clomiphene: [
    { domain: RISK_DOMAIN.VTE, baseScore: 10, recentWindowDays: 30, windowBonus: 3 }
  ],

  // ── 5-알파 환원효소 억제제 ────────────────────────────────
  // 핀아스테리드/두타스테리드: 포스트-피나스테리드 증후군 위험 (우울/성기능)
  finasteride: [
    { domain: RISK_DOMAIN.PSYCHIATRIC, baseScore: 12, recentWindowDays: 90, windowBonus: 5 }
  ],
  dutasteride: [
    { domain: RISK_DOMAIN.PSYCHIATRIC, baseScore: 10, recentWindowDays: 90, windowBonus: 5 }
  ],

  // ── 프로게스테론 ──────────────────────────────────────────
  progesterone: [
    { domain: RISK_DOMAIN.PSYCHIATRIC, baseScore: 5, recentWindowDays: 30, windowBonus: 3 }
  ],

  // ── 지방 감량제 ───────────────────────────────────────────
  clenbuterol: [
    { domain: RISK_DOMAIN.PSYCHIATRIC, baseScore: 8, recentWindowDays: 30, windowBonus: 5 }
  ],
};

// ══════════════════════════════════════════════════════════
//  2. 증상 클러스터 → 위험 도메인 맵
//     각 증상 ID에 domain별 점수 부여
// ══════════════════════════════════════════════════════════

/**
 * SYMPTOM_RISK_SCORES[symptomId][domain] = {
 *   score: number,    // 이 증상이 해당 도메인에 추가하는 점수
 *   critical: bool,   // true → 이 증상 하나만으로도 level 상향 고려
 * }
 */
export const SYMPTOM_RISK_SCORES = {
  // ── VTE 클러스터 ─────────────────────────────────────────
  dvt_symptoms:       { vte: { score: 30, critical: true } },
  palpitations:       { vte: { score: 10 }, hyperkalemia: { score: 15 }, polycythemia: { score: 10 } },
  palpitation:        { vte: { score: 10 }, hyperkalemia: { score: 15 }, polycythemia: { score: 10 } },
  // 호흡 곤란 / 흉통은 dvt_symptoms에 통합되어 있음, 별도 증상도 대응
  chest_pain:         { vte: { score: 25, critical: true }, polycythemia: { score: 10 } },
  dyspnea:            { vte: { score: 20, critical: true }, polycythemia: { score: 10 }, sleep_apnea: { score: 15 } },
  shortness_of_breath:{ vte: { score: 20, critical: true }, polycythemia: { score: 10 }, sleep_apnea: { score: 15 } },

  // ── 고칼륨혈증 클러스터 ──────────────────────────────────
  muscle_weakness:    { hyperkalemia: { score: 20, critical: false } },
  syncope:            { hyperkalemia: { score: 20, critical: true }, vte: { score: 10 } },
  nausea:             { hyperkalemia: { score: 10 }, hepatotoxicity: { score: 8 } },
  vomiting:           { hyperkalemia: { score: 15 }, hepatotoxicity: { score: 8 } },
  edema:              { hyperkalemia: { score: 5 }, vte: { score: 5 } },

  // ── 적혈구증가증/테스토스테론 클러스터 ──────────────────
  flushing:           { polycythemia: { score: 15 } },
  hot_flashes:        { polycythemia: { score: 8 } },
  brain_fog:          { polycythemia: { score: 8 }, psychiatric: { score: 5 } },
  headache:           { polycythemia: { score: 10 }, meningioma: { score: 10 } },
  vision_impairment:  { meningioma: { score: 25, critical: true }, polycythemia: { score: 5 } },
  tremor:             { meningioma: { score: 15 }, psychiatric: { score: 5 } },

  // ── 간독성 클러스터 ──────────────────────────────────────
  jaundice:           { hepatotoxicity: { score: 35, critical: true } },
  dark_urine:         { hepatotoxicity: { score: 30, critical: true } },
  right_upper_pain:   { hepatotoxicity: { score: 25, critical: true } },
  severe_pruritus:    { hepatotoxicity: { score: 20, critical: false } },
  fatigue:            { hepatotoxicity: { score: 5 }, polycythemia: { score: 5 }, metabolic: { score: 5 } },
  chronic_fatigue:    { hepatotoxicity: { score: 8 }, polycythemia: { score: 8 }, metabolic: { score: 8 } },

  // ── 대사 위험 클러스터 ───────────────────────────────────
  weight_gain:        { metabolic: { score: 8 }, sleep_apnea: { score: 8 } },
  polydipsia:         { metabolic: { score: 15 } },
  polyuria:           { metabolic: { score: 15 } },
  blurred_vision:     { metabolic: { score: 10 } },

  // ── 정신건강 클러스터 ────────────────────────────────────
  suicidal_ideation:  { psychiatric: { score: 100, critical: true } },
  self_harm:          { psychiatric: { score: 100, critical: true } },
  depression:         { psychiatric: { score: 15 } },
  anxiety:            { psychiatric: { score: 12 } },
  insomnia:           { psychiatric: { score: 10 } },
  mood_swings:        { psychiatric: { score: 10 } },
  panic_attack:       { psychiatric: { score: 20, critical: true } },

  // ── 수면무호흡 클러스터 ──────────────────────────────────
  snoring:            { sleep_apnea: { score: 15 } },
  daytime_sleepiness: { sleep_apnea: { score: 12 } },
  morning_headache:   { sleep_apnea: { score: 10 } },

  // ── 수막종 클러스터 (CPA 특화) ───────────────────────────
  progressive_headache: { meningioma: { score: 20, critical: true } },
  seizure:            { meningioma: { score: 35, critical: true } },
  hearing_loss:       { meningioma: { score: 15 } },
  neurological_deficit: { meningioma: { score: 30, critical: true } },
};

// ══════════════════════════════════════════════════════════
//  3. 도메인별 임계값 및 레벨 정의
// ══════════════════════════════════════════════════════════

export const DOMAIN_THRESHOLDS = {
  vte:            { critical: 65, warning: 30 },
  hyperkalemia:   { critical: 60, warning: 35 },
  polycythemia:   { critical: 65, warning: 35 },
  hepatotoxicity: { critical: 55, warning: 25 },
  metabolic:      { critical: 75, warning: 45 },
  psychiatric:    { critical: 100, warning: 30 }, // 자살사고 즉시 critical
  meningioma:     { critical: 55, warning: 30 },
  sleep_apnea:    { critical: 70, warning: 40 },
};

// ══════════════════════════════════════════════════════════
//  4. 권장 검사 맵
// ══════════════════════════════════════════════════════════

export const RECOMMENDED_TESTS = {
  vte: {
    label: { ko: '혈전/색전 평가', en: 'VTE Assessment', ja: '血栓塞栓症評価' },
    tests: [
      {
        name: { ko: 'D-이합체 (D-dimer)', en: 'D-dimer', ja: 'Dダイマー' },
        priority: 'critical',
        reason: { ko: '혈전 형성 선별 검사', en: 'Blood clot screening', ja: '血栓形成スクリーニング' }
      },
      {
        name: { ko: '하지 정맥 초음파', en: 'Lower limb venous ultrasound', ja: '下肢静脈超音波' },
        priority: 'critical',
        reason: { ko: '다리 혈전(DVT) 확인', en: 'Confirm DVT in leg', ja: '深部静脈血栓確認' }
      },
      {
        name: { ko: '응고 기능 검사 (PT/aPTT)', en: 'Coagulation (PT/aPTT)', ja: '凝固機能（PT/aPTT）' },
        priority: 'warning',
        reason: { ko: '혈액 응고 상태 평가', en: 'Evaluate coagulation status', ja: '凝固状態評価' }
      },
    ]
  },
  hyperkalemia: {
    label: { ko: '전해질 검사', en: 'Electrolyte Panel', ja: '電解質検査' },
    tests: [
      {
        name: { ko: '혈청 칼륨 (K⁺)', en: 'Serum Potassium (K⁺)', ja: '血清カリウム（K⁺）' },
        priority: 'critical',
        urgency: { ko: '가능한 빨리 (1주 내)', en: 'As soon as possible (within 1 week)', ja: 'できるだけ早く（1週間以内）' },
        reason: { ko: '스피로노락톤 FDA 라벨: 시작/증량 후 1주 내 K⁺ 모니터링 필수', en: 'Spironolactone FDA label mandates K⁺ monitoring within 1 week of start/increase', ja: 'スピロノラクトンFDAラベル：開始/増量後1週間以内のK⁺モニタリング必須' }
      },
      {
        name: { ko: '혈청 크레아티닌 (Cr)', en: 'Serum Creatinine (Cr)', ja: '血清クレアチニン（Cr）' },
        priority: 'warning',
        reason: { ko: '신기능 저하는 고칼륨혈증 위험을 높임', en: 'Impaired kidney function increases hyperkalemia risk', ja: '腎機能低下がカリウム上昇リスクを高める' }
      },
    ]
  },
  polycythemia: {
    label: { ko: '혈액 검사', en: 'Blood Count', ja: '血液検査' },
    tests: [
      {
        name: { ko: '전혈구 계산 (CBC) — 특히 Hb/Hct', en: 'Complete Blood Count (CBC) — especially Hb/Hct', ja: '全血球計算（CBC）—特にHb/Hct' },
        priority: 'warning',
        reason: { ko: '테스토스테론 치료는 적혈구증가증(Hct 상승) 유발 가능 — 혈전 위험 증가', en: 'Testosterone therapy may cause erythrocytosis (elevated Hct) — increased thrombosis risk', ja: 'テストステロン治療は赤血球増多症（Hct上昇）を誘発する可能性 — 血栓リスク増加' }
      },
    ]
  },
  hepatotoxicity: {
    label: { ko: '간 기능 검사', en: 'Liver Function Tests', ja: '肝機能検査' },
    tests: [
      {
        name: { ko: '간 기능 검사 (LFT: AST, ALT, ALP, Bilirubin)', en: 'Liver Function Tests (LFT: AST, ALT, ALP, Bilirubin)', ja: '肝機能検査（LFT: AST, ALT, ALP, ビリルビン）' },
        priority: 'critical',
        reason: { ko: '비칼루타미드/CPA/경구 AAS: 약물 유발 간손상(DILI) 위험', en: 'Bicalutamide/CPA/Oral AAS: drug-induced liver injury (DILI) risk', ja: 'ビカルタミド/CPA/経口AAS：薬物性肝障害（DILI）リスク' }
      },
    ]
  },
  metabolic: {
    label: { ko: '대사 검사', en: 'Metabolic Panel', ja: '代謝検査' },
    tests: [
      {
        name: { ko: '공복 혈당 / HbA1c', en: 'Fasting glucose / HbA1c', ja: '空腹時血糖 / HbA1c' },
        priority: 'warning',
        reason: { ko: '대사증후군 및 인슐린 저항성 평가', en: 'Evaluate metabolic syndrome and insulin resistance', ja: '代謝症候群・インスリン抵抗性評価' }
      },
      {
        name: { ko: '지질 패널 (총콜레스테롤, LDL, HDL, 중성지방)', en: 'Lipid panel (Total-C, LDL, HDL, TG)', ja: '脂質パネル（総コレステロール, LDL, HDL, TG）' },
        priority: 'warning',
        reason: { ko: 'HRT는 지질 대사에 영향 가능', en: 'HRT may affect lipid metabolism', ja: 'HRTは脂質代謝に影響する可能性' }
      },
      {
        name: { ko: '혈압 측정', en: 'Blood pressure measurement', ja: '血圧測定' },
        priority: 'info',
        reason: { ko: '심혈관 위험 기초 평가', en: 'Basic cardiovascular risk evaluation', ja: '心血管リスク基礎評価' }
      },
    ]
  },
  psychiatric: {
    label: { ko: '정신건강 평가', en: 'Mental Health Evaluation', ja: 'メンタルヘルス評価' },
    tests: [
      {
        name: { ko: '정신건강 전문의 상담 (즉시)', en: 'Mental health professional (immediate)', ja: '精神科専門医（即時）' },
        priority: 'critical',
        reason: { ko: '자살 사고/자해 충동 감지 — SOC-8: 다학제 지원 원칙', en: 'Suicidal ideation/self-harm detected — SOC-8: multidisciplinary support principle', ja: '自殺念慮/自傷衝動検出 — SOC-8：多職種支援の原則' }
      },
      {
        name: { ko: '우울/불안 평가 척도 (PHQ-9, GAD-7)', en: 'Depression/Anxiety scales (PHQ-9, GAD-7)', ja: 'うつ/不安評価尺度（PHQ-9, GAD-7）' },
        priority: 'warning',
        reason: { ko: '호르몬 변동과 정신건강의 상관관계 평가', en: 'Evaluate correlation between hormone changes and mental health', ja: 'ホルモン変動と精神健康の相関評価' }
      },
    ]
  },
  meningioma: {
    label: { ko: '신경계 평가', en: 'Neurological Assessment', ja: '神経系評価' },
    tests: [
      {
        name: { ko: '뇌 MRI (조영 포함)', en: 'Brain MRI (with contrast)', ja: '脳MRI（造影あり）' },
        priority: 'critical',
        reason: { ko: 'CPA 장기·고용량: EMA 수막종 위험 경고 — 신경학적 증상 시 즉시 평가', en: 'CPA long-term/high-dose: EMA meningioma risk warning — immediate evaluation if neurological symptoms', ja: 'CPA長期・高用量：EMA髄膜腫リスク警告 — 神経学的症状時は直ちに評価' }
      },
    ]
  },
  sleep_apnea: {
    label: { ko: '수면 평가', en: 'Sleep Assessment', ja: '睡眠評価' },
    tests: [
      {
        name: { ko: '수면 다원검사 (PSG) 또는 가정용 수면검사', en: 'Polysomnography (PSG) or home sleep test', ja: '睡眠ポリグラフ（PSG）または在宅睡眠検査' },
        priority: 'warning',
        reason: { ko: '테스토스테론 + 비만/목둘레 증가: 수면무호흡 위험 복합', en: 'Testosterone + obesity/increased neck: compounded sleep apnea risk', ja: 'テストステロン＋肥満/頸部増加：睡眠時無呼吸リスク複合' }
      },
      {
        name: { ko: '전혈구 계산 (CBC) — Hb/Hct', en: 'CBC — Hb/Hct', ja: 'CBC — Hb/Hct' },
        priority: 'warning',
        reason: { ko: '수면무호흡은 적혈구증가증과 상승 작용 가능', en: 'Sleep apnea may synergize with polycythemia', ja: '睡眠時無呼吸は赤血球増多症と相乗作用の可能性' }
      },
    ]
  },
};

// ══════════════════════════════════════════════════════════
//  5. 도메인 레이블 및 설명 (다국어)
// ══════════════════════════════════════════════════════════

export const DOMAIN_LABELS = {
  vte: {
    ko: { title: '혈전/색전 위험', short: 'VTE' },
    en: { title: 'VTE / Thromboembolism Risk', short: 'VTE' },
    ja: { title: '血栓塞栓症リスク', short: 'VTE' },
  },
  hyperkalemia: {
    ko: { title: '고칼륨혈증 위험 (추정)', short: '고K⁺' },
    en: { title: 'Hyperkalemia Risk (estimated)', short: 'High K⁺' },
    ja: { title: '高カリウム血症リスク（推定）', short: '高K⁺' },
  },
  polycythemia: {
    ko: { title: '적혈구증가증 위험 (추정)', short: '적혈구 ↑' },
    en: { title: 'Polycythemia Risk (estimated)', short: 'RBC ↑' },
    ja: { title: '赤血球増多症リスク（推定）', short: '赤血球↑' },
  },
  hepatotoxicity: {
    ko: { title: '간독성 위험 (추정)', short: '간 ⚠' },
    en: { title: 'Hepatotoxicity Risk (estimated)', short: 'Liver ⚠' },
    ja: { title: '肝毒性リスク（推定）', short: '肝臓⚠' },
  },
  metabolic: {
    ko: { title: '대사 위험 (추정)', short: '대사' },
    en: { title: 'Metabolic Risk (estimated)', short: 'Metabolic' },
    ja: { title: '代謝リスク（推定）', short: '代謝' },
  },
  psychiatric: {
    ko: { title: '정신건강 위험', short: '정신건강' },
    en: { title: 'Mental Health Risk', short: 'Mental' },
    ja: { title: 'メンタルヘルスリスク', short: 'メンタル' },
  },
  meningioma: {
    ko: { title: '수막종 위험 신호 (CPA)', short: '수막종' },
    en: { title: 'Meningioma Risk Signal (CPA)', short: 'Meningioma' },
    ja: { title: '髄膜腫リスクシグナル（CPA）', short: '髄膜腫' },
  },
  sleep_apnea: {
    ko: { title: '수면무호흡 위험 (추정)', short: '수면무호흡' },
    en: { title: 'Sleep Apnea Risk (estimated)', short: 'Sleep Apnea' },
    ja: { title: '睡眠時無呼吸リスク（推定）', short: '睡眠無呼吸' },
  },
};

// ══════════════════════════════════════════════════════════
//  6. Critical 룰 메시지 (도메인 × 레벨)
// ══════════════════════════════════════════════════════════

export const DOMAIN_MESSAGES = {
  vte: {
    critical: {
      ko: '⚠️ 혈전/색전 가능성 — 즉시 응급실 방문 권장. 에스트로겐/CPA/SERM 복용 중 흉통·호흡곤란·편측 다리 통증·부종·갑작스런 두통·편측 마비는 혈전색전증 징후일 수 있습니다. 확정 진단이 아닙니다.',
      en: '⚠️ Possible VTE — Immediate ER visit recommended. Chest pain, dyspnea, unilateral leg pain/swelling, sudden severe headache, or unilateral weakness while on estrogen/CPA/SERM may indicate thromboembolism. This is NOT a confirmed diagnosis.',
      ja: '⚠️ 血栓塞栓症の可能性 — 直ちに救急受診を推奨。エストロゲン/CPA/SERM服用中の胸痛・呼吸困難・片側脚痛・腫脹・突然の激しい頭痛・片側麻痺は血栓塞栓症の徴候の可能性があります。確定診断ではありません。',
    },
    warning: {
      ko: '에스트로겐/CPA/tamoxifen 등 혈전 위험 관련 약물을 복용 중입니다. 혈전 증상 교육이 중요하며, 정기 검진 시 의사에게 알리세요. 흡연은 혈전 위험을 크게 높입니다.',
      en: 'You are taking medications associated with VTE risk (estrogen/CPA/tamoxifen). Thrombosis symptom education is important. Inform your doctor at regular checkups. Smoking significantly increases VTE risk.',
      ja: 'VTEリスク関連薬（エストロゲン/CPA/タモキシフェン）を服用中です。血栓症状の教育が重要です。定期検診時に医師に知らせてください。喫煙はVTEリスクを大幅に高めます。',
    },
    info: {
      ko: '혈전 위험이 있는 약물을 복용 중입니다. 경피 에스트로겐은 경구 대비 VTE 위험이 낮습니다. 의사와 제형 선택을 논의하세요.',
      en: 'You are taking a medication with VTE risk. Transdermal estrogen has lower VTE risk compared to oral. Discuss formulation options with your doctor.',
      ja: 'VTEリスクのある薬を服用中です。経皮エストロゲンは経口と比較してVTEリスクが低いです。医師と剤形の選択を相談してください。',
    }
  },
  hyperkalemia: {
    critical: {
      ko: '⚠️ 고칼륨혈증 가능성 — 즉시 평가 필요. 스피로노락톤 복용 중 심한 심계항진·근력 저하·마비감·실신은 고칼륨혈증 징후일 수 있습니다. 혈청 K⁺/크레아티닌 검사를 오늘 받으세요.',
      en: '⚠️ Possible Hyperkalemia — Immediate evaluation needed. Severe palpitations, muscle weakness, paralysis, or syncope while on spironolactone may indicate hyperkalemia. Serum K⁺/Cr testing today.',
      ja: '⚠️ 高カリウム血症の可能性 — 直ちに評価が必要。スピロノラクトン服用中の重篤な動悸・筋力低下・麻痺感・失神は高カリウム血症の徴候の可能性があります。本日中に血清K⁺/Cr検査を。',
    },
    warning: {
      ko: '스피로노락톤은 칼륨 상승 위험이 있습니다 (FDA 라벨). 시작 또는 증량 후 1주 이내에 혈청 칼륨(K⁺) 검사를 받으세요. 이후에도 정기 모니터링이 필요합니다.',
      en: 'Spironolactone carries a risk of elevated potassium (FDA label). Get serum K⁺ tested within 1 week of starting or increasing dose. Ongoing monitoring is required.',
      ja: 'スピロノラクトンにはカリウム上昇リスクがあります（FDAラベル）。開始または増量後1週間以内に血清K⁺検査を受けてください。継続的なモニタリングが必要です。',
    },
    info: {
      ko: '스피로노락톤 복용 중 칼륨 수치 정기 검사를 권장합니다. 고칼륨 식품(바나나, 오렌지, 감자 등)의 과다 섭취에 주의하세요.',
      en: 'Regular potassium level monitoring is recommended while on spironolactone. Avoid excessive high-potassium foods (bananas, oranges, potatoes).',
      ja: 'スピロノラクトン服用中は定期的なカリウム値モニタリングを推奨します。高カリウム食品（バナナ、オレンジ、じゃがいも等）の過剰摂取に注意してください。',
    }
  },
  polycythemia: {
    critical: {
      ko: '⚠️ 적혈구증가증/혈전 위험 가능성 — 즉시 평가 권장. 테스토스테론 치료 중 두통·안면홍조·흉통·호흡곤란이 동반되면 Hct 상승 가능성이 있습니다. CBC 검사를 빠른 시일 내에 받으세요.',
      en: '⚠️ Possible polycythemia/thrombosis risk — Prompt evaluation recommended. Headache, facial flushing, chest pain, and dyspnea during testosterone therapy may indicate elevated Hct. Get CBC soon.',
      ja: '⚠️ 赤血球増多症/血栓リスクの可能性 — 早急な評価を推奨。テストステロン治療中の頭痛・顔面紅潮・胸痛・呼吸困難はHct上昇の可能性があります。早急にCBC検査を。',
    },
    warning: {
      ko: '테스토스테론 치료는 적혈구증가증(헤마토크릿 상승) 위험이 있습니다 (FDA 라벨). 정기적인 CBC 검사를 받으세요. 특히 용량이 높거나 체중이 증가하는 경우 위험이 증가할 수 있습니다.',
      en: 'Testosterone therapy carries polycythemia (elevated Hct) risk (FDA label). Regular CBC monitoring is needed. Risk may increase with higher doses or weight gain.',
      ja: 'テストステロン治療には赤血球増多症（Hct上昇）リスクがあります（FDAラベル）。定期的なCBC検査が必要です。高用量または体重増加時にリスクが増加する可能性があります。',
    },
    info: {
      ko: '테스토스테론 치료 중 정기적인 혈액 검사(CBC)를 통해 헤마토크릿 수치를 모니터링하세요.',
      en: 'Monitor hematocrit levels regularly through CBC blood tests during testosterone therapy.',
      ja: 'テストステロン治療中は定期的な血液検査（CBC）でヘマトクリット値をモニタリングしてください。',
    }
  },
  hepatotoxicity: {
    critical: {
      ko: '⚠️ 약물 유발 간손상(DILI) 가능성 — 즉시 평가 권장. 비칼루타미드/CPA/경구 AAS 복용 중 황달·암뇨·회색변·우상복부 통증·심한 피로·전신 가려움은 간손상 징후일 수 있습니다. 즉시 간 기능 검사(LFT)를 받으세요.',
      en: '⚠️ Possible Drug-Induced Liver Injury (DILI) — Immediate evaluation recommended. Jaundice, dark urine, pale stools, right upper quadrant pain, severe fatigue, or generalized itching while on bicalutamide/CPA/oral AAS may indicate liver damage. Get LFT immediately.',
      ja: '⚠️ 薬物性肝障害（DILI）の可能性 — 直ちに評価を推奨。ビカルタミド/CPA/経口AAS服用中の黄疸・黒色尿・灰色便・右上腹部痛・重篤な疲労・全身性かゆみは肝障害の徴候の可能性があります。直ちにLFT検査を。',
    },
    warning: {
      ko: '비칼루타미드/CPA는 드물지만 약물 유발 간손상(DILI) 가능성이 있습니다. 정기 간 기능 검사(LFT) 모니터링이 권장됩니다. 황달·암뇨 증상 시 즉시 의사에게 알리세요.',
      en: 'Bicalutamide/CPA carry a rare but possible risk of drug-induced liver injury (DILI). Regular LFT monitoring is recommended. Report jaundice or dark urine to your doctor immediately.',
      ja: 'ビカルタミド/CPAはまれながら薬物性肝障害（DILI）の可能性があります。定期的なLFTモニタリングが推奨されます。黄疸や黒色尿の症状が出た場合は直ちに医師に連絡してください。',
    },
    info: {
      ko: '경구 AAS는 간독성 위험이 높습니다. 음주를 피하고 정기적인 간 기능 검사(LFT)를 받으세요.',
      en: 'Oral AAS carry significant hepatotoxicity risk. Avoid alcohol and get regular LFT tests.',
      ja: '経口AASには肝毒性リスクが高くあります。飲酒を避け、定期的なLFT検査を受けてください。',
    }
  },
  metabolic: {
    critical: {
      ko: '⚠️ 대사 이상 가능성 — 다뇨·다음·극심한 피로가 복합적으로 나타납니다. 공복 혈당 및 HbA1c 검사를 빠른 시일 내에 받으세요.',
      en: '⚠️ Possible Metabolic Abnormality — Polyuria, polydipsia, and extreme fatigue occurring together. Get fasting glucose and HbA1c checked soon.',
      ja: '⚠️ 代謝異常の可能性 — 頻尿・多飲・極度の疲労が複合的に現れています。早急に空腹時血糖とHbA1cを検査してください。',
    },
    warning: {
      ko: '체질량지수 또는 허리-키 비율이 대사 위험 범위에 있습니다. 혈압·혈당·지질 검사를 정기적으로 받으세요. HRT는 대사 지표에 영향을 줄 수 있습니다.',
      en: 'BMI or waist-to-height ratio is in the metabolic risk range. Regular monitoring of blood pressure, blood sugar, and lipids is recommended. HRT can affect metabolic markers.',
      ja: 'BMIまたは腹囲身長比が代謝リスク範囲にあります。血圧・血糖・脂質の定期検査を受けてください。HRTは代謝マーカーに影響を与える可能性があります。',
    },
    info: {
      ko: '대사 지표 정기 모니터링이 권장됩니다. 규칙적인 운동과 균형 잡힌 식사가 도움이 됩니다.',
      en: 'Regular monitoring of metabolic markers is recommended. Regular exercise and balanced diet are helpful.',
      ja: '代謝マーカーの定期モニタリングが推奨されます。定期的な運動とバランスの取れた食事が役立ちます。',
    }
  },
  psychiatric: {
    critical: {
      ko: '⚠️ 자살 사고 / 심각한 정신건강 위기 감지 — 즉시 전문 정신건강 도움을 받으세요. 한국 자살예방상담전화: 1393 (24시간). 호르몬 변동이 기분에 영향을 줄 수 있으나 전문 평가가 필요합니다.',
      en: '⚠️ Suicidal ideation / severe mental health crisis detected — Seek professional mental health help immediately. Korea Crisis Hotline: 1393 (24h). Hormone changes may affect mood but professional evaluation is needed.',
      ja: '⚠️ 自殺念慮/重篤なメンタルヘルス危機を検出 — 直ちに専門的なメンタルヘルスの支援を受けてください。ホルモン変動が気分に影響することがありますが、専門的な評価が必要です。',
    },
    warning: {
      ko: '여러 정신건강 증상이 함께 나타나고 있습니다. 정신건강 전문의 상담을 권장합니다. 호르몬 변동과 기분의 연관성을 의사에게 알리세요.',
      en: 'Multiple mental health symptoms are co-occurring. Mental health professional consultation is recommended. Inform your doctor about the correlation between hormone changes and mood.',
      ja: '複数のメンタルヘルス症状が同時に現れています。精神科専門医への相談を推奨します。ホルモン変動と気分の相関関係を医師に伝えてください。',
    },
    info: {
      ko: '호르몬 치료 초기에 기분 변동이 있을 수 있습니다. 증상이 지속되거나 심해지면 의사와 상담하세요.',
      en: 'Mood fluctuations may occur early in hormone therapy. Consult your doctor if symptoms persist or worsen.',
      ja: 'ホルモン治療初期に気分変動が起こる可能性があります。症状が持続または悪化する場合は医師に相談してください。',
    }
  },
  meningioma: {
    critical: {
      ko: '⚠️ 수막종 경고 증상 감지 — 즉시 신경과 평가 권장. EMA는 CPA 고용량·장기 사용에서 수막종 위험 경고를 발표했습니다. 진행성 두통·시야 변화·발작·신경학적 이상이 나타나면 즉시 뇌 MRI가 필요합니다.',
      en: '⚠️ Meningioma warning symptoms detected — Immediate neurological evaluation recommended. EMA has issued meningioma risk warning for high-dose, long-term CPA use. Progressive headache, vision changes, seizures, or neurological deficits require immediate brain MRI.',
      ja: '⚠️ 髄膜腫警告症状を検出 — 直ちに神経科評価を推奨。EMAはCPA高用量・長期使用での髄膜腫リスク警告を発表しています。進行性頭痛・視野変化・痙攣・神経学的異常がある場合は直ちに脳MRIが必要です。',
    },
    warning: {
      ko: 'CPA(시프로테론 아세테이트) 장기 복용은 수막종 위험이 있습니다 (EMA 경고). 정기 신경학적 모니터링과 의사 상담이 권장됩니다.',
      en: 'Long-term CPA (cyproterone acetate) use carries meningioma risk (EMA warning). Regular neurological monitoring and doctor consultation are recommended.',
      ja: 'CPA（酢酸シプロテロン）の長期服用は髄膜腫リスクがあります（EMA警告）。定期的な神経学的モニタリングと医師相談が推奨されます。',
    },
    info: {
      ko: 'CPA 복용 중 신경학적 증상(두통, 시야 변화 등)이 나타나면 즉시 의사에게 알리세요.',
      en: 'Inform your doctor immediately if neurological symptoms (headache, vision changes, etc.) occur while on CPA.',
      ja: 'CPA服用中に神経学的症状（頭痛、視野変化等）が現れた場合は直ちに医師に知らせてください。',
    }
  },
  sleep_apnea: {
    critical: {
      ko: 'テストステロン + 비만 + 수면 증상 복합 — 수면무호흡 위험이 높습니다. 수면 다원검사(PSG)를 받으세요. 수면무호흡은 적혈구증가증 위험과 상승 작용을 할 수 있습니다.',
      en: 'Testosterone + obesity + sleep symptoms combined — High sleep apnea risk. Polysomnography (PSG) is recommended. Sleep apnea may synergize with polycythemia risk.',
      ja: 'テストステロン＋肥満＋睡眠症状の複合 — 睡眠時無呼吸リスクが高い。睡眠ポリグラフ（PSG）を受けてください。睡眠時無呼吸は赤血球増多症リスクと相乗作用する可能性があります。',
    },
    warning: {
      ko: '테스토스테론 치료는 수면무호흡 위험을 높일 수 있습니다. 코골이·주간 졸음·아침 두통이 있다면 수면 검사를 권장합니다.',
      en: 'Testosterone therapy may increase sleep apnea risk. If snoring, daytime sleepiness, or morning headaches occur, a sleep study is recommended.',
      ja: 'テストステロン治療は睡眠時無呼吸リスクを高める可能性があります。いびき・日中の眠気・朝の頭痛がある場合は睡眠検査を推奨します。',
    },
    info: {
      ko: '테스토스테론 치료 중 수면 증상을 모니터링하고 이상 시 의사와 상담하세요.',
      en: 'Monitor sleep symptoms during testosterone therapy and consult your doctor if abnormalities occur.',
      ja: 'テストステロン治療中は睡眠症状をモニタリングし、異常があれば医師に相談してください。',
    }
  },
};

// ══════════════════════════════════════════════════════════
//  7. SafetyEngine 클래스
// ══════════════════════════════════════════════════════════

export class SafetyEngine {
  /**
   * @param {string} language - 'ko' | 'en' | 'ja'
   * @param {string} mode - 'mtf' | 'ftm'
   */
  constructor(language = 'ko', mode = 'mtf') {
    this.language = language;
    this.mode = mode;
  }

  // ─────────────────────────────────────────────────────
  //  공개 API
  // ─────────────────────────────────────────────────────

  /**
   * 안전 평가 전체 실행
   * @param {Object}   snapshot  최신 측정 스냅샷 (measurement obj)
   * @param {Object[]} history   과거 측정 배열 (시간순 오름차순)
   * @returns {Object} { alerts, domainScores, recommendedTests, educationPoints, disclaimer }
   */
  runSafetyAssessment(snapshot, history = []) {
    if (!snapshot) return this._emptyResult();

    const feats = this._buildFeatures(snapshot, history);
    const domainScores = this._scoreAllDomains(feats);
    const alerts = this._buildAlerts(domainScores, feats);
    const recommendedTests = this._buildRecommendedTests(domainScores, feats);
    const educationPoints = this._buildEducationPoints(feats);

    return {
      alerts,
      domainScores,
      recommendedTests,
      educationPoints,
      disclaimer: DISCLAIMER[this.language] || DISCLAIMER.ko,
      confidence: feats.confidence,
    };
  }

  // ─────────────────────────────────────────────────────
  //  내부: 피처 빌드
  // ─────────────────────────────────────────────────────

  _buildFeatures(snapshot, history) {
    const meds = this._normalizeMeds(snapshot.medications || []);
    const symptoms = this._normalizeSymptoms(snapshot.symptoms || []);
    const symptomIds = new Set(symptoms.map(s => s.id));

    // 신체 지표
    const height = snapshot.height ?? 165;
    const weight = snapshot.weight ?? 0;
    const bmi = weight > 0 && height > 0 ? weight / ((height / 100) ** 2) : null;
    const waist = snapshot.waist ?? null;
    const hips  = snapshot.hips  ?? null;
    const neck  = snapshot.neck  ?? null;
    const whtR  = (waist && height) ? waist / height : null;

    // 호르몬
    const e2 = snapshot.estrogenLevel ?? snapshot.estradiol ?? null;
    const t  = snapshot.testosteroneLevel ?? snapshot.testosterone ?? null;
    const libido = typeof snapshot.libido === 'number' ? snapshot.libido : null;

    // 측정 기록 추세 (delta 30일)
    const prev = history.length > 0 ? history[history.length - 1] : null;
    const weightDelta = (prev && weight && prev.weight) ? weight - prev.weight : 0;
    const bodyFatDelta = (prev && snapshot.bodyFat != null && prev.bodyFat != null) ? snapshot.bodyFat - prev.bodyFat : 0;

    // 약물 최근 시작/증량 감지
    const recentMedChanges = this._detectRecentMedChanges(meds, history);

    // 확신도 (결측 입력이 많을수록 낮아짐)
    let confidenceFields = 0;
    let totalFields = 8;
    if (bmi != null) confidenceFields++;
    if (e2 != null) confidenceFields++;
    if (t  != null) confidenceFields++;
    if (waist != null) confidenceFields++;
    if (meds.length > 0) confidenceFields++;
    if (symptoms.length > 0) confidenceFields++;
    if (history.length > 2) confidenceFields++;
    if (snapshot.date) confidenceFields++;
    const confidence = Math.round((confidenceFields / totalFields) * 100);

    return {
      meds, symptoms, symptomIds,
      bmi, waist, hips, neck, whtR,
      e2, t, libido,
      weightDelta, bodyFatDelta,
      recentMedChanges,
      confidence,
      snapshot,
    };
  }

  /** 약물 배열 정규화 */
  _normalizeMeds(raw) {
    return raw.map(m => {
      if (typeof m === 'string') return { id: m, dose: null, unit: 'mg' };
      return { id: m.id || m.medicationId || '', dose: m.dose ?? m.dosage ?? null, unit: m.unit || 'mg' };
    }).filter(m => m.id);
  }

  /** 증상 배열 정규화 */
  _normalizeSymptoms(raw) {
    return raw.map(s => {
      if (typeof s === 'string') return { id: s, severity: 3 };
      return { id: s.id || s.symptomId || '', severity: Number(s.severity) || 3 };
    }).filter(s => s.id);
  }

  /** 약물 최근 시작/증량 감지 (히스토리 기반) */
  _detectRecentMedChanges(meds, history) {
    if (!history || history.length === 0) return {};
    const changes = {};
    const prevMeds = this._normalizeMeds((history[history.length - 1]?.medications) || []);
    const prevById = Object.fromEntries(prevMeds.map(m => [m.id, m]));
    const now = new Date();

    meds.forEach(m => {
      const prev = prevById[m.id];
      if (!prev) {
        // 새로 추가된 약물
        changes[m.id] = { type: 'new', daysSince: 0 };
      } else if (m.dose != null && prev.dose != null && m.dose > prev.dose * 1.1) {
        // 증량 (10% 이상)
        changes[m.id] = { type: 'increased', daysSince: 0 };
      }
    });

    return changes;
  }

  // ─────────────────────────────────────────────────────
  //  내부: 도메인별 점수 계산
  // ─────────────────────────────────────────────────────

  _scoreAllDomains(feats) {
    const scores = {};
    Object.values(RISK_DOMAIN).forEach(d => { scores[d] = 0; });

    // (A) 약물 기반 기본 점수
    feats.meds.forEach(med => {
      const riskEntries = DRUG_RISK_MAP[med.id] || [];
      riskEntries.forEach(entry => {
        let s = entry.baseScore;

        // 고용량 보너스
        if (entry.highDoseThreshold && med.dose != null && med.dose >= entry.highDoseThreshold) {
          s += entry.highDoseBonus || 0;
        }

        // 시간창 보너스 (최근 시작/증량)
        if (feats.recentMedChanges[med.id]) {
          s += entry.windowBonus || 0;
        }

        scores[entry.domain] = Math.min(100, scores[entry.domain] + s);
      });
    });

    // (B) 증상 클러스터 점수
    feats.symptoms.forEach(sym => {
      const domainPts = SYMPTOM_RISK_SCORES[sym.id] || {};
      Object.entries(domainPts).forEach(([domain, { score }]) => {
        const weighted = score * (sym.severity / 3); // severity 1-5, 기준 3
        scores[domain] = Math.min(100, scores[domain] + weighted);
      });
    });

    // (C) 체형 지표 점수
    if (feats.bmi != null) {
      if (feats.bmi >= 30) {
        scores[RISK_DOMAIN.METABOLIC] = Math.min(100, scores[RISK_DOMAIN.METABOLIC] + 20);
        scores[RISK_DOMAIN.SLEEP_APNEA] = Math.min(100, scores[RISK_DOMAIN.SLEEP_APNEA] + 15);
        scores[RISK_DOMAIN.VTE] = Math.min(100, scores[RISK_DOMAIN.VTE] + 8);
      } else if (feats.bmi >= 25) {
        scores[RISK_DOMAIN.METABOLIC] = Math.min(100, scores[RISK_DOMAIN.METABOLIC] + 10);
        scores[RISK_DOMAIN.SLEEP_APNEA] = Math.min(100, scores[RISK_DOMAIN.SLEEP_APNEA] + 5);
      }
    }

    if (feats.whtR != null) {
      if (feats.whtR >= 0.6)       scores[RISK_DOMAIN.METABOLIC] = Math.min(100, scores[RISK_DOMAIN.METABOLIC] + 15);
      else if (feats.whtR >= 0.5)  scores[RISK_DOMAIN.METABOLIC] = Math.min(100, scores[RISK_DOMAIN.METABOLIC] + 8);
    }

    // 목둘레 수면무호흡 프록시 (남성 >40cm, 여성 >35cm)
    if (feats.neck != null) {
      const threshold = this.mode === 'ftm' ? 40 : 35;
      if (feats.neck > threshold) {
        scores[RISK_DOMAIN.SLEEP_APNEA] = Math.min(100, scores[RISK_DOMAIN.SLEEP_APNEA] + 15);
      }
    }

    // (D) 급격한 체중/체지방 증가
    if (feats.weightDelta > 5) {
      scores[RISK_DOMAIN.METABOLIC]  = Math.min(100, scores[RISK_DOMAIN.METABOLIC] + 8);
      scores[RISK_DOMAIN.SLEEP_APNEA]= Math.min(100, scores[RISK_DOMAIN.SLEEP_APNEA] + 5);
    }

    // 반올림
    Object.keys(scores).forEach(d => { scores[d] = Math.round(scores[d]); });
    return scores;
  }

  // ─────────────────────────────────────────────────────
  //  내부: 알림 빌드
  // ─────────────────────────────────────────────────────

  _buildAlerts(domainScores, feats) {
    const alerts = [];
    const lang = this.language;

    Object.entries(domainScores).forEach(([domain, score]) => {
      if (score === 0) return;

      const threshold = DOMAIN_THRESHOLDS[domain];
      if (!threshold) return;

      let level = null;
      if (score >= threshold.critical) level = ALERT_LEVEL.CRITICAL;
      else if (score >= threshold.warning) level = ALERT_LEVEL.WARNING;
      else level = ALERT_LEVEL.INFO;

      // 개별 증상 중 critical 단독 트리거 확인
      const hasSingleCritical = feats.symptoms.some(sym => {
        const entry = SYMPTOM_RISK_SCORES[sym.id]?.[domain];
        return entry?.critical === true;
      });
      if (hasSingleCritical && level !== ALERT_LEVEL.CRITICAL) {
        level = ALERT_LEVEL.CRITICAL;
      }

      const messages = DOMAIN_MESSAGES[domain];
      if (!messages) return;

      const msgObj = messages[level] || messages.info;
      const message = msgObj[lang] || msgObj.ko;

      const triggeredMeds = feats.meds
        .filter(m => (DRUG_RISK_MAP[m.id] || []).some(e => e.domain === domain))
        .map(m => m.id);

      const triggeredSymptoms = feats.symptoms
        .filter(s => SYMPTOM_RISK_SCORES[s.id]?.[domain])
        .map(s => s.id);

      alerts.push({
        domain,
        level,
        score,
        title: DOMAIN_LABELS[domain]?.[lang]?.title || domain,
        message,
        triggeredMeds,
        triggeredSymptoms,
        isNotDiagnosis: true,
      });
    });

    // Critical 먼저, 점수 내림차순 정렬
    return alerts.sort((a, b) => {
      const levelOrder = { critical: 0, warning: 1, info: 2 };
      if (levelOrder[a.level] !== levelOrder[b.level]) return levelOrder[a.level] - levelOrder[b.level];
      return b.score - a.score;
    });
  }

  // ─────────────────────────────────────────────────────
  //  내부: 권장 검사 빌드
  // ─────────────────────────────────────────────────────

  _buildRecommendedTests(domainScores, feats) {
    const lang = this.language;
    const tests = [];
    const seen = new Set();

    // 점수 높은 도메인부터 처리
    const sortedDomains = Object.entries(domainScores)
      .filter(([, score]) => score > 0)
      .sort(([, a], [, b]) => b - a);

    sortedDomains.forEach(([domain, score]) => {
      const threshold = DOMAIN_THRESHOLDS[domain];
      if (!threshold || score < 15) return; // 최소 임계

      const testDef = RECOMMENDED_TESTS[domain];
      if (!testDef) return;

      testDef.tests.forEach(test => {
        const name = test.name[lang] || test.name.ko;
        if (seen.has(name)) return;
        seen.add(name);

        tests.push({
          domain,
          domainLabel: DOMAIN_LABELS[domain]?.[lang]?.title || domain,
          name,
          priority: score >= threshold.critical ? 'critical' : (score >= threshold.warning ? 'warning' : 'info'),
          urgency: test.urgency?.[lang] || test.urgency?.ko || null,
          reason: test.reason[lang] || test.reason.ko,
        });
      });
    });

    return tests.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return (order[a.priority] || 2) - (order[b.priority] || 2);
    });
  }

  // ─────────────────────────────────────────────────────
  //  내부: 교육 포인트 (약물 특화 안전 정보)
  // ─────────────────────────────────────────────────────

  _buildEducationPoints(feats) {
    const lang = this.language;
    const points = [];
    const medIds = new Set(feats.meds.map(m => m.id));

    // 스피로노락톤 복용 시
    if (medIds.has('spironolactone')) {
      points.push({
        type: 'drug_monitoring',
        icon: 'monitor_heart',
        text: {
          ko: '스피로노락톤: 시작/증량 후 1주 이내 혈청 K⁺·크레아티닌 검사 필수 (FDA 라벨)',
          en: 'Spironolactone: Serum K⁺ & creatinine must be checked within 1 week of start/dose increase (FDA label)',
          ja: 'スピロノラクトン：開始/増量後1週間以内に血清K⁺・クレアチニン検査必須（FDAラベル）',
        }[lang]
      });
    }

    // 비칼루타미드 복용 시
    if (medIds.has('bicalutamide')) {
      points.push({
        type: 'drug_monitoring',
        icon: 'science',
        text: {
          ko: '비칼루타미드: 황달·암뇨가 나타나면 즉시 복용 중단 후 병원 방문하세요 (DILI 위험)',
          en: 'Bicalutamide: If jaundice or dark urine occurs, stop immediately and visit a doctor (DILI risk)',
          ja: 'ビカルタミド：黄疸や黒色尿が現れたら直ちに服用中断し病院受診してください（DILIリスク）',
        }[lang]
      });
    }

    // CPA 복용 시
    if (medIds.has('cyproterone_acetate')) {
      points.push({
        type: 'drug_monitoring',
        icon: 'neurology',
        text: {
          ko: 'CPA(시프로테론): EMA는 고용량·장기 사용에서 수막종 위험 경고. 신경학적 증상 발생 시 즉시 신경과 평가',
          en: 'CPA (Cyproterone): EMA warns of meningioma risk with high-dose, long-term use. Seek immediate neurology evaluation if neurological symptoms occur',
          ja: 'CPA（シプロテロン）：EMAは高用量・長期使用での髄膜腫リスクを警告。神経学的症状が出たら直ちに神経科評価を',
        }[lang]
      });
    }

    // 경구 에스트로겐 복용 시
    const hasOralE2 = medIds.has('estradiol_valerate') || medIds.has('estradiol_hemihydrate');
    if (hasOralE2) {
      points.push({
        type: 'drug_education',
        icon: 'health_and_safety',
        text: {
          ko: '경구 에스트로겐은 경피(겔/패치) 대비 혈전 위험이 더 높습니다. 제형 변경은 의사와 상담하세요',
          en: 'Oral estrogen has higher VTE risk than transdermal (gel/patch). Discuss formulation change with your doctor',
          ja: '経口エストロゲンは経皮（ゲル/パッチ）よりVTEリスクが高いです。剤形変更は医師に相談してください',
        }[lang]
      });
    }

    // 테스토스테론 복용 시
    const hasT = feats.meds.some(m => m.id.includes('testosterone'));
    if (hasT) {
      points.push({
        type: 'drug_monitoring',
        icon: 'bloodtype',
        text: {
          ko: '테스토스테론: 정기 CBC(헤마토크릿) 검사 필수. 두통·홍조·호흡곤란 시 즉시 보고',
          en: 'Testosterone: Regular CBC (hematocrit) monitoring required. Report headache, flushing, or dyspnea immediately',
          ja: 'テストステロン：定期的なCBC（ヘマトクリット）検査必須。頭痛・紅潮・呼吸困難は直ちに報告',
        }[lang]
      });
    }

    // 경구 AAS 복용 시
    const hasOralAAS = ['methandienone', 'anadrol', 'oxandrolone', 'stanozolol'].some(id => medIds.has(id));
    if (hasOralAAS) {
      points.push({
        type: 'drug_monitoring',
        icon: 'warning',
        text: {
          ko: '경구 AAS: 간독성 위험이 매우 높습니다. 정기 LFT 검사와 금주가 필수입니다',
          en: 'Oral AAS: Very high hepatotoxicity risk. Regular LFT testing and alcohol abstinence are essential',
          ja: '経口AAS：肝毒性リスクが非常に高い。定期的なLFT検査と禁酒が必須です',
        }[lang]
      });
    }

    return points;
  }

  // ─────────────────────────────────────────────────────
  //  유틸
  // ─────────────────────────────────────────────────────

  _emptyResult() {
    return {
      alerts: [],
      domainScores: Object.fromEntries(Object.values(RISK_DOMAIN).map(d => [d, 0])),
      recommendedTests: [],
      educationPoints: [],
      disclaimer: DISCLAIMER[this.language] || DISCLAIMER.ko,
      confidence: 0,
    };
  }

  /** 최고 위험 도메인 반환 */
  getTopRisk(domainScores) {
    return Object.entries(domainScores)
      .sort(([,a],[,b]) => b - a)
      .filter(([,s]) => s > 0)
      .map(([d, s]) => ({ domain: d, score: s }))[0] || null;
  }

  /** 도메인 레이블 반환 */
  getDomainLabel(domain) {
    return DOMAIN_LABELS[domain]?.[this.language]?.title || domain;
  }
}

export default SafetyEngine;
