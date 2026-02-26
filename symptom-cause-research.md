# ShiftV — 증상·약물·측정 전체 목록 & 연관관계 연구 자료

> 이 파일은 `symptom-cause-map.js` 확장을 위한 연구 기반 자료입니다.
> ChatGPT Deep Research 프롬프트도 포함되어 있습니다.

---

## 1. 기록 가능한 측정 수치 (Measurement Fields)

### 신체 사이즈 (단위: cm / kg)

| Field ID | 한국어 | 영어 |
|----------|--------|------|
| `height` | 신장 | Height |
| `weight` | 체중 | Weight |
| `shoulder` | 어깨너비 | Shoulder Width |
| `neck` | 목둘레 | Neck Circumference |
| `chest` | 윗 가슴 둘레 | Upper Chest Circumference |
| `underBustCircumference` | 아랫 가슴 둘레 | Under-Bust Circumference |
| `waist` | 허리둘레 | Waist Circumference |
| `hips` | 엉덩이둘레 | Hip Circumference |
| `thigh` | 허벅지둘레 | Thigh Circumference |
| `calf` | 종아리둘레 | Calf Circumference |
| `arm` | 팔뚝둘레 | Arm Circumference |

### 건강 지표

| Field ID | 한국어 | 단위 |
|----------|--------|------|
| `muscleMass` | 근육량 | kg |
| `bodyFatPercentage` | 체지방률 | % |
| `estrogenLevel` | 에스트로겐(E2) 수치 | pg/mL |
| `testosteroneLevel` | 테스토스테론(T) 수치 | ng/dL |
| `libido` | 성욕 척도 | 1–5 |
| `healthNotes` | 건강 상태 메모 | 텍스트 |
| `skinCondition` | 피부 상태 메모 | 텍스트 |

### 파생 지표 (계산값)

| 지표 | 계산식 | 의미 |
|------|--------|------|
| BMI | weight / (height/100)² | 비만도 |
| WHR | waist / hips | 복부 지방형 체형 지수 |
| WHtR | waist / height | 심혈관 위험 지수 (0.5 이상 주의) |
| Shoulder-Waist Ratio | shoulder / waist | 여성화/남성화 체형 지수 |

---

## 2. 증상 전체 목록 (Symptom IDs)

### 2-1. 정신 / 신경계 (MENTAL_NEUROLOGICAL)

| Symptom ID | 한국어 | 영어 | 위험도 |
|------------|--------|------|--------|
| `depression` | 우울감 / 무기력 | Depression / Lethargy | 보통 |
| `mood_swings` | 급격한 감정 기복 | Mood Swings | 낮음 |
| `aggression` | 공격성 증가 | Aggression / Roid Rage | ⚠ 높음 |
| `anxiety` | 불안 / 초조 | Anxiety / Restlessness | 낮음 |
| `brain_fog` | 브레인 포그 | Brain Fog | 낮음 |
| `insomnia` | 불면증 | Insomnia | 낮음 |
| `hypersomnia` | 과수면 | Hypersomnia | 낮음 |
| `tremor` | 손 떨림 | Tremor | ⚠ 높음 |
| `vision_impairment` | 시야 흐림 / 눈부심 | Vision Impairment | ⚠ 높음 |
| `paresthesia` | 수족냉증 / 손발 저림 | Paresthesia / Raynaud's | 낮음 |
| `headache` | 두통 | Headache | 보통 |

### 2-2. 피부 / 모발 (SKIN_HAIR)

| Symptom ID | 한국어 | 영어 |
|------------|--------|------|
| `cystic_acne` | 화농성 여드름 | Cystic / Inflammatory Acne |
| `comedones` | 좁쌀 여드름 | Comedones |
| `flushing` | 안면 홍조 | Flushing / Erythema |
| `xeroderma` | 피부 건조 / 각질 | Xeroderma |
| `seborrhea` | 지성 피부 / 피지 과다 | Seborrhea |
| `skin_atrophy` | 피부 얇아짐 / 멍 잘 듦 | Skin Atrophy |
| `male_pattern_baldness` | M자 / 정수리 탈모 | Androgenetic Alopecia |
| `hair_thinning` | 모발 가늘어짐 | Hair Thinning / Miniaturization |
| `hair_growth` | 발모 / 모발 성장 | Hair Regrowth |
| `facial_hirsutism` | 수염 / 얼굴 체모 증가 | Facial Hirsutism |
| `body_hirsutism` | 체모(가슴, 배) 증가 | Body Hirsutism |
| `body_hair_reduction` | 체모 감소 / 부드러워짐 | Body Hair Reduction |

### 2-3. 전신 / 체형 (SYSTEMIC_BODY_SHAPE)

| Symptom ID | 한국어 | 영어 |
|------------|--------|------|
| `edema` | 얼굴/몸 붓기 (수분 정체) | Edema / Water Retention |
| `weight_gain` | 급격한 체중 증가 | Rapid Weight Gain |
| `weight_loss` | 체중 감소 | Weight Loss |
| `fat_loss` | 체지방 감소 | Body Fat Loss |
| `hyperphagia` | 식욕 폭발 | Hyperphagia / Increased Appetite |
| `sarcopenia` | 근육 빠짐 / 근력 약화 | Sarcopenia / Muscle Weakness |
| `chronic_fatigue` | 비정상적 피로감 | Chronic Fatigue |
| `odor_change` | 체취 변화 | Body Odor Change |
| `hyperhidrosis` | 땀 과다 | Hyperhidrosis |
| `voice_change` | 목소리 변화 | Voice Change / Deepening |

### 2-4. 근골격계 (MUSCULOSKELETAL)

| Symptom ID | 한국어 | 영어 |
|------------|--------|------|
| `joint_pain` | 관절통 | Arthralgia / Joint Pain |
| `headache` | 두통 | Headache |

### 2-5. 소화 / 대사 (DIGESTIVE_METABOLIC)

| Symptom ID | 한국어 | 영어 |
|------------|--------|------|
| `nausea` | 메스꺼움 | Nausea |
| `vomiting` | 구토 | Vomiting |

### 2-6. 가슴 / 유방 (BREAST_CHEST)

| Symptom ID | 한국어 | 영어 |
|------------|--------|------|
| `breast_budding` | 가슴 몽우리 / 유륜 통증 | Breast Budding / Mastalgia |
| `breast_pain` | 가슴 통증 | Breast Pain |
| `gynecomastia` | 여유증 / 가슴 커짐 | Gynecomastia |
| `breast_atrophy` | 가슴 작아짐 / 처짐 | Breast Atrophy |

### 2-7. 성기능 / 생식기 (SEXUAL_GENITAL)

| Symptom ID | 한국어 | 영어 |
|------------|--------|------|
| `low_libido` | 성욕 감퇴 / 무성욕 | Low Libido |
| `hypersexuality` | 성욕 과다 | Hypersexuality |
| `erectile_dysfunction` | 발기 부전 | Erectile Dysfunction |
| `orgasm_change` | 오르가즘 감각 변화 | Orgasm Sensation Change |
| `testicular_atrophy` | 고환 위축 | Testicular Atrophy |
| `oligospermia_azoospermia` | 정액 감소 | Oligospermia / Azoospermia |
| `clitoromegaly` | 클리토리스 비대 | Clitoromegaly |
| `vaginal_atrophy_dryness` | 질 건조 / 위축 | Vaginal Atrophy / Dryness |
| `amenorrhea` | 무월경 | Amenorrhea |
| `irregular_bleeding` | 부정 출혈 | Irregular Bleeding |

### 2-8. 내장 / 순환기 — ⚠ 위험 신호 (INTERNAL_CIRCULATORY)

| Symptom ID | 한국어 | 위험 이유 |
|------------|--------|-----------|
| `palpitation` | 심계항진 / 빈맥 | 전해질 이상, 갑상선, 심혈관 |
| `dyspnea` | 호흡 곤란 | 혈전, 빈혈, 폐색전 |
| `dvt_symptoms` | 혈전 의심 (다리 붓고 아픔) | DVT / 폐색전 위험 |
| `jaundice` | 황달 | 간독성 (DILI) |
| `ruq_pain` | 우상복부 통증 | 간 비대 / 손상 |

### 2-9. MTF 특화 (긍정 효과 포함)

| Symptom ID | 한국어 | 구분 |
|------------|--------|------|
| `breast_development` | 가슴 발달 | ✅ 긍정 |
| `skin_softening` | 피부 부드러워짐 | ✅ 긍정 |
| `fat_redistribution_feminine` | 지방 여성화 재분배 | ✅ 긍정 |
| `muscle_softening` | 근육 부드러워짐 | ✅ 긍정 |
| `hot_flashes` | 열감 / 홍조 | 부작용 |
| `libido_decrease_mtf` | 성욕 감소 (MTF) | 부작용 |

### 2-10. FTM 특화 (긍정 효과 포함)

| Symptom ID | 한국어 | 구분 |
|------------|--------|------|
| `voice_deepening` | 목소리 굵어짐 | ✅ 긍정 |
| `facial_hair_growth` | 수염 성장 | ✅ 긍정 |
| `body_hair_increase` | 체모 증가 | ✅ 긍정 |
| `muscle_gain` | 근육 증가 | ✅ 긍정 |
| `fat_redistribution_masculine` | 지방 남성화 재분배 | ✅ 긍정 |
| `clitoral_growth` | 클리토리스 성장 | ✅ 긍정 |
| `menstruation_cessation` | 월경 중단 | ✅ 긍정 |
| `acne_ftm` | 여드름 (FTM) | 부작용 |
| `libido_increase_ftm` | 성욕 증가 (FTM) | 중립 |
| `irritability_ftm` | 과민성 (FTM) | 부작용 |

---

## 3. 약물 전체 목록 (Medication IDs)

### 3-1. 에스트로겐 (Estrogens)

| Medication ID | 상품명 | 경로 | 위험도 |
|---------------|--------|------|--------|
| `estradiol_valerate` | 프로기노바 (Progynova) | 경구 | 중간 |
| `estradiol_hemihydrate` | 에스트로펨 (Estrofem) | 경구 | 중간 |
| `estradiol_gel` | 디비겔, 에스트로겔 | 경피 | 낮음 |
| `estradiol_patch` | 클리마라 (Climara) | 경피 | 낮음 |
| `estradiol_valerate_injection` | EV 주사 | 근육주사 | 낮음 |
| `estradiol_enanthate` | EEn | 근육주사 | 낮음 |

### 3-2. 프로게스테론 (Progestogens)

| Medication ID | 상품명 | 경로 | 위험도 |
|---------------|--------|------|--------|
| `progesterone` | 우트로게스탄 (Utrogestan) | 경구/질정 | 낮음 |

### 3-3. 항안드로겐 (Anti-Androgens)

| Medication ID | 상품명 | 메커니즘 | 위험도 |
|---------------|--------|----------|--------|
| `spironolactone` | 알닥톤 (Aldactone) | 알도스테론 길항, AR 차단 | 중간 |
| `bicalutamide` | 카소덱스 (Casodex) | AR 직접 차단 | 중간 |
| `cyproterone_acetate` | 안드로쿨 (Androcur) | AR 차단 + 황체호르몬 | ⚠ 높음 |
| `gnrh_agonist` | 루크린, 데카펩틸 | 뇌하수체 셧다운 | ⚠ 높음 |

### 3-4. 테스토스테론 (Testosterone)

| Medication ID | 상품명 | 경로 | 주기 |
|---------------|--------|------|------|
| `testosterone_undecanoate` | 네비도 (Nebido) | 근육주사 | 10–14주 |
| `testosterone_enanthate` | 예나스테론 | 근육주사 | 주 1–2회 |
| `testosterone_cypionate` | Testosterone Cypionate | 근육주사 | 주 1–2회 |
| `testosterone_gel` | 안드로겔, 테스토겔 | 경피 | 매일 |

### 3-5. AAS (아나볼릭 스테로이드)

| Medication ID | 상품명 | 경구/주사 | 위험도 |
|---------------|--------|-----------|--------|
| `methandienone` | 다이아나볼 (Dianabol) | 경구 | ⚠ 높음 |
| `anadrol` | 아나드롤 (Oxymetholone) | 경구 | ⚠⚠ 매우 높음 |
| `oxandrolone` | 아나바 (Anavar) | 경구 | 낮음 |
| `stanozolol` | 윈스트롤 (Winstrol) | 경구/주사 | ⚠ 높음 |
| `trenbolone` | 트렌볼론 | 근육주사 | ⚠⚠ 매우 높음 |
| `masteron` | 마스테론 (Drostanolone) | 근육주사 | 중간 |

### 3-6. SERM (선택적 에스트로겐 수용체 조절제)

| Medication ID | 상품명 | 주요 용도 | 위험도 |
|---------------|--------|-----------|--------|
| `tamoxifen` | 놀바덱스 (Nolvadex) | 여유증 억제, PCT | 중간 |
| `raloxifene` | 에비스타 (Evista) | 여유증 억제 | 낮음 |
| `clomiphene` | 클로미드 (Clomid) | 고환 자극, PCT | 중간 |

### 3-7. 아로마타제 억제제 (AI)

| Medication ID | 상품명 | 강도 | 위험도 |
|---------------|--------|------|--------|
| `anastrozole` | 아리미덱스 (Arimidex) | 중간 | 중간 |
| `letrozole` | 페마라 (Femara) | 강력 | ⚠ 높음 |

### 3-8. 체지방 감소제 (Fat Loss)

| Medication ID | 상품명 | 위험도 |
|---------------|--------|--------|
| `clenbuterol` | 클렌부테롤 | ⚠ 높음 |
| `eca_stack` | 에페드린/카페인 스택 | 중간 |
| `semaglutide` | 위고비, 오젬픽 | 낮음 |
| `liraglutide` | 삭센다 | 낮음 |

### 3-9. DHT 억제제 / 탈모 치료제

| Medication ID | 상품명 | 위험도 |
|---------------|--------|--------|
| `finasteride` | 프로페시아, 핀페시아 | 중간 |
| `dutasteride` | 아보다트 | ⚠ 높음 |
| `minoxidil` | 미녹시딜 | 낮음 |

### 3-10. 보조제 및 기타

| Medication ID | 상품명 | 용도 |
|---------------|--------|------|
| `liver_protection` | 우루사, 밀크씨슬, UDCA | 간 보호 |
| `thyroid_hormone` | T3, T4, Cytomel | 갑상선 / 대사 |
| `tadalafil` | 시알리스 | 혈류 개선 |
| `sildenafil` | 비아그라 | 발기 보조 |

---

## 4. 현재 원인 분석 미구현 증상 목록 (확장 필요)

아래 증상들은 `symptom-cause-map.js`에 원인 트리가 없어서 분석 결과가 나오지 않음.

| Symptom ID | 주요 관련 약물/호르몬 | 연구 우선순위 |
|------------|----------------------|--------------|
| `headache` | E2 변동, CPA 수막종, 혈전, 혈압 상승 | 🔴 높음 |
| `joint_pain` | anastrozole/letrozole, stanozolol, E2 저하 | 🔴 높음 |
| `nausea` | 경구 에스트로겐, 간독성 초기, semaglutide | 🔴 높음 |
| `ruq_pain` | 경구 AAS, CPA, bicalutamide | 🔴 높음 |
| `xeroderma` | AI 과용, E2 저하, stanozolol | 🟠 중간 |
| `cystic_acne` | T/DHT 과다, AAS, 항안드로겐 부족 | 🟠 중간 |
| `chronic_fatigue` | AI 과용, T/E2 저하, 간독성, GnRH | 🟠 중간 |
| `hot_flashes` | GnRH, E2 저하, E2 변동 | 🟠 중간 |
| `low_libido` | spiro/CPA 과다, finasteride, E2↑+T↓ | 🟠 중간 |
| `hair_thinning` | DHT, 갑상선 저하, E2 저하 | 🟡 낮음 |
| `breast_budding` | E2, progesterone 병합 효과 | 🟡 낮음 |
| `voice_change` | T 누적 (FTM) | 🟡 낮음 |
| `sarcopenia` | T 부족, AI 과용, 칼로리 제한 | 🟡 낮음 |
| `gynecomastia` | AAS 아로마타제, T→E2, AI 부족 | 🟡 낮음 |
| `testicular_atrophy` | 외인성 T, GnRH, 에스트로겐 | 🟡 낮음 |
| `amenorrhea` | T (FTM), 저체중, 과운동 | 🟡 낮음 |
| `tremor` | clenbuterol, 갑상선 과다, E2 변동 | 🟡 낮음 |
| `irregular_bleeding` | E2/P4 비율 불균형, T 시작 초기 | 🟡 낮음 |
| `erectile_dysfunction` | E2 과다, T 저하, prolactin 상승 | 🟡 낮음 |
| `paresthesia` | 비타민 B12 결핍, 혈액순환 저하, E2 변동 | 🟡 낮음 |

---

