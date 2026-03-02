# Hardcoded UI Strings Audit Report

**Generated for:** ShiftV_Project  
**Scope:** 16 JavaScript source files  
**Excludes:** `console.log/warn/error`, `translations.js`, object keys, technical identifiers

---

## Severity Legend

| Severity | Description |
|----------|-------------|
| **🔴 CRITICAL** | Korean-only strings with no translation — entire doctor module sections |
| **🟠 HIGH** | `translate('key') \|\| 'Korean fallback'` — fallback visible to non-Korean users if key missing |
| **🟡 MEDIUM** | Inline ternary `lang === 'ko' ? ... : ...` — works but not using central translate() |
| **🟢 LOW** | Hardcoded English UI text (e.g., 'D-Day', 'AI Generated', 'N/A') |

---

## Summary by File

| File | 🔴 | 🟠 | 🟡 | 🟢 | Total |
|------|----|----|----|----|-------|
| recommendation-engine.js | ~120 | 0 | 0 | 0 | ~120 |
| symptom-analyzer.js | ~90 | 0 | 0 | 0 | ~90 |
| mtf-analyzer.js | ~85 | 0 | 0 | 0 | ~85 |
| ftm-analyzer.js | ~95 | 0 | 0 | 0 | ~95 |
| doctor-engine.js | ~30 | 0 | 0 | 0 | ~30 |
| trend-predictor.js | ~13 | 0 | 0 | 0 | ~13 |
| script.js | 0 | ~15 | 0 | 2 | ~17 |
| onboarding-flow.js | 0 | ~25 | 0 | 6 | ~31 |
| health-modal.js | 0 | ~15 | ~8 | 2 | ~25 |
| change-roadmap-modal.js | 0 | ~15 | 0 | 0 | ~15 |
| action-guide-modal.js | 3 | ~5 | ~130 | 2 | ~140 |
| ai-advisor-modal.js | 0 | ~6 | 0 | 4 | ~10 |
| quest-modal.js | 0 | 0 | ~42 | 0 | ~42 |
| body-briefing-modal.js | 0 | 0 | ~30 | 0 | ~30 |
| health-evaluator.js | 0 | 0 | ~47 | 0 | ~47 |
| safety-engine.js | 0 | 0 | ~50 | 0 | ~50 |

---

## 1. `src/doctor-module/core/recommendation-engine.js` 🔴 CRITICAL

**Problem:** ALL strings are Korean-only. No `_t()` or `translate()` used at all.  
**Impact:** Entire exercise, diet, medication, habit recommendations display only in Korean.

### Exercise Recommendations (Lines 67–253)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 67 | `'유산소 운동 증가'` | `rec_exercise_increase_cardio` |
| 68 | `'체중 감소를 위한 유산소 운동'` | `rec_exercise_cardio_for_weight_loss` |
| 69 | `'주 3-4회, 30-45분'` | `rec_exercise_3_4_times_30_45min` |
| 70 | `['걷기', '조깅', '자전거', '수영']` | `rec_exercise_walking`, `rec_exercise_jogging`, `rec_exercise_cycling`, `rec_exercise_swimming` |
| 72 | `'주 3-4회'` | `rec_frequency_3_4_per_week` |
| 79 | `'근력 운동'` | `rec_exercise_strength_training` |
| 80 | `'체중 증가 및 근육 발달'` | `rec_exercise_muscle_gain` |
| 81 | `'주 3회, 복합 운동 중심'` | `rec_exercise_3_times_compound` |
| 82 | `['스쿼트', '데드리프트', '벤치프레스']` | `rec_exercise_squat`, `rec_exercise_deadlift`, `rec_exercise_bench_press` |
| 83 | `'건강한 체중 증가 필요'` | `rec_reason_healthy_weight_gain` |
| 99 | `'하체 집중 운동'` | `rec_exercise_lower_body_focus` |
| 100 | `'엉덩이와 허벅지 발달'` | `rec_exercise_hip_thigh_dev` |
| 101 | `'여성적 곡선 만들기'` | `rec_exercise_feminine_curves` |
| 103–107 | `'스쿼트 (힙 중심)', '런지', '힙 스러스트', '레그 프레스', '사이드 레그 레이즈'` | `rec_exercise_hip_squat`, `rec_exercise_lunge`, `rec_exercise_hip_thrust`, `rec_exercise_leg_press`, `rec_exercise_side_leg_raise` |
| 109 | `'여성적 하체 라인 형성'` | `rec_reason_feminine_lower_body` |
| 112 | `['가벼운 무게, 높은 반복', '힙에 집중', '스트레칭 중요']` | `rec_tip_light_weight_high_rep`, `rec_tip_focus_hips`, `rec_tip_stretching_important` |
| 121 | `'복부 운동'` | `rec_exercise_core` |
| 122 | `'허리 둘레 감소'` | `rec_exercise_waist_reduction` |
| 123 | `'코어 강화 및 지방 감소'` | `rec_exercise_core_strengthen_fat_loss` |
| 125–129 | `'플랭크', '사이드 플랭크', '레그 레이즈', '크런치', '러시안 트위스트'` | `rec_exercise_plank`, `rec_exercise_side_plank`, `rec_exercise_leg_raise`, `rec_exercise_crunch`, `rec_exercise_russian_twist` |
| 134 | `['복근보다 전체 코어', '유산소 병행']` | `rec_tip_full_core`, `rec_tip_combine_cardio` |
| 142 | `'가벼운 상체 운동'` | `rec_exercise_light_upper_body` |
| 143 | `'어깨 축소 및 톤업'` | `rec_exercise_slim_shoulders` |
| 144 | `'근육 비대 방지'` | `rec_exercise_prevent_hypertrophy` |
| 146–149 | `'가벼운 요가', '필라테스', '스트레칭', '가벼운 덤벨 운동'` | `rec_exercise_yoga`, `rec_exercise_pilates`, `rec_exercise_stretching`, `rec_exercise_light_dumbbells` |
| 151 | `'여성적 상체 라인 유지'` | `rec_reason_feminine_upper_body` |
| 154 | `['무거운 무게 피하기', '유연성 중심']` | `rec_tip_avoid_heavy`, `rec_tip_flexibility_focus` |
| 164 | `'상체 근력 운동'` | `rec_exercise_upper_strength` |
| 165 | `'어깨와 가슴 발달'` | `rec_exercise_shoulder_chest_dev` |
| 166 | `'남성적 상체 만들기'` | `rec_exercise_masculine_upper` |
| 168–172 | `'벤치프레스', '숄더 프레스', '풀업/턱걸이', '로우', '딥스'` | `rec_exercise_bench`, `rec_exercise_shoulder_press`, `rec_exercise_pullup`, `rec_exercise_row`, `rec_exercise_dips` |
| 174 | `'남성적 V자 체형 형성'` | `rec_reason_masculine_vshape` |
| 177 | `['무거운 무게', '복합 운동 중심', '충분한 휴식']` | `rec_tip_heavy_weight`, `rec_tip_compound_focus`, `rec_tip_enough_rest` |
| 184 | `'복부 코어 운동'` | `rec_exercise_core_workout` |
| 186 | `'남성적 복부 라인'` | `rec_exercise_masculine_abs` |
| 188–192 | `'데드리프트', '스쿼트', '플랭크', '행잉 레그 레이즈', '우드찹'` | (individual exercise keys) |
| 194 | `'남성적 코어 강화'` | `rec_reason_masculine_core` |
| 204 | `'하체 근력 운동'` | `rec_exercise_lower_strength` |
| 206 | `'균형잡힌 하체'` | `rec_exercise_balanced_lower` |
| 213 | `'전체적인 남성적 체형'` | `rec_reason_masculine_physique` |
| 225 | `'균형 잡힌 전신 운동'` | `rec_exercise_balanced_full_body` |
| 226 | `'조화로운 체형 만들기'` | `rec_exercise_harmonious_body` |
| 227 | `'과도하지 않은 톤업'` | `rec_exercise_moderate_toning` |
| 235 | `'중성적이고 건강한 체형'` | `rec_reason_neutral_healthy` |
| 244 | `'유산소 운동'` | `rec_exercise_cardio` |
| 245 | `'심폐 기능 및 체지방 관리'` | `rec_exercise_cardio_fat_mgmt` |
| 253 | `'전반적인 건강 증진'` | `rec_reason_overall_health` |
| 267 | `'근육 손실 방지'` | `rec_exercise_prevent_muscle_loss` |
| 269 | `'근육량 회복'` | `rec_exercise_recover_muscle` |

### Diet Recommendations (Lines 310–500)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 310 | `'단백질 섭취 증가'` | `rec_diet_increase_protein` |
| 311 | `'급격한 체중 감소로 근육 손실 위험'` | `rec_diet_rapid_loss_risk` |
| 312 | `'고단백 식단으로 근육 보호'` | `rec_diet_high_protein_protect` |
| 319–323 | `['닭가슴살, 생선', '달걀, 두부', '그릭 요거트', '프로틴 쉐이크', '견과류']` | `rec_food_chicken_fish`, `rec_food_egg_tofu`, etc. |
| 325 | `` `주간 ${...}kg 감소 (권장: 0.5kg)` `` | `rec_reason_weekly_loss` |
| 326 | `['매 끼니마다 단백질', '식사 5-6회 분산']` | `rec_tip_protein_every_meal`, `rec_tip_5_6_meals` |
| 336 | `'칼로리 조정 필요'` | `rec_diet_calorie_adjust` |
| 337 | `'체중 정체 극복'` | `rec_diet_overcome_plateau` |
| 338 | `'칼로리 감소' / '칼로리 증가'` | `rec_diet_reduce_calories`, `rec_diet_increase_calories` |
| 340 | `['하루 200-300kcal 감소', '탄수화물 약간 줄이기']` | `rec_tip_reduce_200_300kcal`, `rec_tip_reduce_carbs` |
| 356 | `'건강한 지방 섭취'` | `rec_diet_healthy_fats` |
| 357 | `'여성화를 위한 적정 체지방률 유지'` | `rec_diet_maintain_bf_feminization` |
| 364–368 | `['아보카도', '올리브유', '견과류', '연어', '치즈 (적당량)']` | (individual food keys) |
| 380 | `'체지방 감소 식단'` | `rec_diet_fat_loss` |
| 381 | `'남성적 체형을 위한 체지방 관리'` | `rec_diet_bf_masculine` |
| 389–393 | `['닭가슴살, 소고기', '생선', '달걀', '브로콜리, 시금치', '현미, 고구마 (적정량)']` | (individual food keys) |
| 406 | `'균형 잡힌 식단'` | `rec_diet_balanced` |
| 420 | `'호르몬 안정화 식품'` | `rec_diet_hormone_stabilizing` |
| 421 | `'기분 변화 완화를 위한 영양소'` | `rec_diet_mood_nutrients` |
| 430–435 | `['연어, 고등어', '견과류', '바나나', '시금치', '다크 초콜릿', '아보카도']` | (individual food keys) |
| 437 | `'정신 건강 증상 완화'` | `rec_reason_mental_health` |
| 449 | `'에너지 증진 식단'` | `rec_diet_energy_boost` |
| 461–465 | `['소고기, 간', '시금치, 케일', '퀴노아, 현미', '렌틸콩', '베리류']` | (individual food keys) |
| 467 | `'만성 피로 개선'` | `rec_reason_chronic_fatigue` |
| 479 | `'피부 건강 식단'` | `rec_diet_skin_health` |
| 497 | `'수분 섭취'` | `rec_diet_hydration` |
| 498 | `'충분한 물 섭취'` | `rec_diet_drink_water` |
| 499 | `'하루 2-3리터'` | `rec_diet_2_3_liters` |
| 500–504 | `['신진대사 촉진', '독소 배출', '피부 개선', '소화 개선', '체중 관리']` | (individual benefit keys) |

### Medication Recommendations (Lines 540–750)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 547 | `'에스트라디올 증량 고려'` | `rec_med_increase_estradiol` |
| 548 | `'에스트로겐 수치가 목표 범위보다 낮습니다'` | `rec_med_estrogen_below_target` |
| 553 | `['자가 조정 금지', '정기 혈액 검사']` | `rec_warn_no_self_adjust`, `rec_warn_regular_blood_test` |
| 554–556 | `['복용량 부족', '흡수율 낮음', '대사 빠름']` | `rec_cause_low_dose`, `rec_cause_low_absorption`, `rec_cause_fast_metabolism` |
| 562 | `'에스트라디올 감량 고려'` | `rec_med_decrease_estradiol` |
| 563 | `'에스트로겐 수치가 높아 혈전 위험 증가'` | `rec_med_estrogen_high_clot_risk` |
| 567 | `['혈전 위험', '간 부담', '두통', '메스꺼움']` | `rec_warn_clot`, `rec_warn_liver`, `rec_warn_headache`, `rec_warn_nausea` |
| 576 | `'에스트라디올 복용량 유지'` | `rec_med_maintain_estradiol` |
| 577 | `'현재 수치가 이상적입니다'` | `rec_med_ideal_level` |
| 607 | `'항안드로겐 증량 고려'` | `rec_med_increase_antiandrogen` |
| 608 | `'테스토스테론 억제가 충분하지 않습니다'` | `rec_med_testosterone_suppression_insufficient` |
| 613 | `['스피로노락톤 증량', '비칼루타미드 추가', 'GnRH 작용제 고려']` | (individual option keys) |
| 621 | `'항안드로겐 복용량 유지'` | `rec_med_maintain_antiandrogen` |
| 622 | `'테스토스테론 억제 효과 좋음'` | `rec_med_testosterone_well_suppressed` |
| 637 | `'테스토스테론 증량 고려'` | `rec_med_increase_testosterone` |
| 638 | `'테스토스테론 수치가 목표 범위보다 낮습니다'` | `rec_med_testosterone_below_target` |
| 644 | `['투여량 부족', '투여 간격 너무 김', '흡수율 낮음']` | `rec_cause_low_dose`, `rec_cause_long_interval`, etc. |
| 651 | `'테스토스테론 감량 필요'` | `rec_med_decrease_testosterone` |
| 652 | `'수치가 너무 높아 부작용 위험'` | `rec_med_too_high_side_effects` |
| 657 | `['적혈구 증가', '혈압 상승', '간 부담', '공격성 증가']` | (individual warning keys) |
| 670 | `'테스토스테론 복용량 유지'` | `rec_med_maintain_testosterone` |
| 683 | `'아로마타제 억제제 고려'` | `rec_med_consider_ai` |
| 684 | `'에스트로겐 수치가 높습니다'` | `rec_med_estrogen_elevated` |
| 699 | `'개인화된 호르몬 균형'` | `rec_med_personalized_balance` |
| 700 | `'목표하는 호르몬 수치에 따라 조정'` | `rec_med_adjust_to_target` |
| 713 | `'SERM 사용 고려'` | `rec_med_consider_serm` |
| 714 | `'여유증 증상 완화'` | `rec_med_relieve_gynecomastia` |

### Habit Recommendations (Lines 750–1000)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 767 | `'수면 개선'` | `rec_habit_improve_sleep` |
| 768 | `'호르몬 안정화와 회복을 위한 충분한 수면'` | `rec_habit_sleep_for_hormones` |
| 769 | `'7-8시간 수면, 일정한 수면 시간'` | `rec_habit_7_8_hours` |
| 770–774 | `['호르몬 균형', '스트레스 감소', '근육 회복', '면역력 증진', '정신 건강']` | (individual benefit keys) |
| 776–780 | `['같은 시간에 자고 일어나기', ...]` | (individual tip keys) |
| 795 | `'스트레스 관리'` | `rec_habit_stress_mgmt` |
| 796 | `'코르티솔 조절을 통한 호르몬 안정화'` | `rec_habit_cortisol_hormones` |
| 797 | `'정신 건강 케어'` | `rec_habit_mental_health_care` |
| 807–812 | `['명상 (하루 10-15분)', '요가', '호흡 운동 (4-7-8 호흡법)', ...]` | (individual activity keys) |
| 822 | `'정기 측정 유지'` | `rec_habit_keep_measuring` |
| 826 | `'일관성 있는 측정으로 정확한 추세 파악'` | `rec_habit_consistent_tracking` |
| 835–840 | `['같은 요일, 같은 시간', '아침 공복 상태', ...]` | (individual tip keys) |
| 844 | `'충분한 수분 섭취'` | `rec_habit_hydration` |
| 845 | `'하루 2-3리터 물 마시기'` | `rec_habit_2_3_liters` |
| 858 | `'피부 관리'` | `rec_habit_skincare` |
| 859 | `'여성적 피부 유지'` | `rec_habit_feminine_skin` |
| 860 | `'보습 및 관리'` | `rec_habit_moisturize_care` |
| 868 | `'피부 및 위생 관리'` | `rec_habit_skin_hygiene` |
| 869 | `'여드름 및 체취 관리'` | `rec_habit_acne_odor_mgmt` |
| 870 | `'테스토스테론 부작용 관리'` | `rec_habit_testosterone_side_effects` |

### Weekly Focus (Lines 950–1059)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 955 | `'첫 측정 시작'` | `rec_focus_first_measurement` |
| 956 | `'정확한 측정을 위해 아침 공복 상태에서 측정하세요!'` | `rec_focus_measure_fasted` |
| 984 | `'현재 상태 유지'` | `rec_focus_maintain` |
| 985 | `'훌륭해요! 지금 하시는 것을 계속 유지하세요!'` | `rec_focus_keep_going` |
| 989–996 | `keyNames` object: `'체중', '허리', '엉덩이', '가슴', '어깨', '허벅지', '팔뚝'` | Use existing metric name keys |
| 999–1014 | `tips` object: All Korean exercise/diet tips per metric | (individual tip keys per metric) |

---

## 2. `src/doctor-module/core/symptom-analyzer.js` 🔴 CRITICAL

**Problem:** ALL alert/tip/action strings are Korean-only. No `_t()` or `translate()` used.

### Symptom Correlation (Lines 112–171)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 112 | `` `3-4주 전 테스토스테론 수치의 급격한 변화(${...})가 원인일 수 있습니다.` `` | `symptom_testosterone_change_cause` |
| 153 | `'두통'` | `symptom_headache` |
| 156 | `'두통과 부종이 동반되어 혈압 상승이나 수분 정체가 의심됩니다.'` | `symptom_headache_edema_msg` |
| 157 | `'혈압을 측정하고 나트륨 섭취를 줄이세요.'` | `symptom_check_bp_reduce_sodium` |
| 167 | `'여드름'` | `symptom_acne` |
| 171 | `'호르몬 수치 조절이 필요합니다.'` | `symptom_hormone_adjust_needed` |

### Critical Alerts (Lines 197–420)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 199 | `'심부정맥 혈전증 의심'` | `alert_dvt_suspected` |
| 200 | `'종아리 또는 다리의 부기와 통증은 혈전의 징후일 수 있습니다.'` | `alert_dvt_description` |
| 201 | `'즉시 병원 응급실을 방문하세요!'` | `alert_visit_er_immediately` |
| 202 | `'생명에 위험할 수 있습니다'` | `alert_life_threatening` |
| 203 | `['에스트로겐 복용', '장시간 앉아있기', '흡연']` | `alert_related_estrogen`, `alert_related_sitting`, `alert_related_smoking` |
| 215 | `'간 기능 이상 의심'` | `alert_liver_dysfunction` |
| 216 | `'황달 증상은 간 독성의 징후일 수 있습니다.'` | `alert_jaundice_liver_toxicity` |
| 217 | `'즉시 의사와 상담하고 혈액 검사를 받으세요'` | `alert_consult_doctor_blood_test` |
| 218 | `'간 손상 가능성'` | `alert_liver_damage_possible` |
| 219 | `['경구 호르몬 복용', 'AAS 사용', '알코올']` | `alert_related_oral_hormones`, etc. |
| 230 | `'간 비대 의심'` | `alert_hepatomegaly` |
| 231 | `'오른쪽 윗배의 통증은 간 비대의 징후일 수 있습니다.'` | `alert_hepatomegaly_desc` |
| 249 | `'심혈관 증상 주의'` | `alert_cardiovascular_warning` |
| 250 | `'심한 두근거림 또는 호흡 곤란은 심혈관 문제를 나타낼 수 있습니다.'` | `alert_cardiovascular_desc` |
| 282 | `'정신 건강 증상 주의'` | `alert_mental_health_warning` |
| 285 | `'호르몬 용량 조정 또는 전문가 상담 고려'` | `alert_adjust_dose_or_consult` |
| 287–290 | `['충분한 수면', '규칙적인 운동', '명상 및 스트레스 관리', '필요시 심리 상담']` | `tip_enough_sleep`, `tip_regular_exercise`, `tip_meditation`, `tip_counseling` |
| 293 | `['시프로테론 (Androcur)', '급격한 호르몬 변화']` | `alert_related_cyproterone`, `alert_related_rapid_change` |
| 309 | `'피부 트러블'` | `alert_skin_trouble` |
| 314–318 | `['하루 2회 클렌징', '비코메도제닉 제품 사용', '충분한 수분', '유제품 및 설탕 줄이기', '필요시 피부과 상담']` | (individual skincare tip keys) |
| 337 | `'성기능 변화'` | `alert_sexual_function_change` |
| 340 | `'예상되는 변화이지만 심한 경우 의사 상담'` | `alert_expected_change_consult` |
| 343–352 | All sexual health tips in Korean | (individual tip keys) |
| 371 | `'근력 및 체력 저하'` | `alert_muscle_stamina_decline` |
| 372 | `'근육량 감소 또는 피로감이 있습니다.'` | `alert_muscle_fatigue_desc` |
| 376–380 | `['단백질 섭취 증가...', '근력 운동 추가', '충분한 수면', '비타민 D, B12 검사', '호르몬 수치 확인']` | (individual tip keys) |
| 397 | `'탈모 진행'` | `alert_hair_loss` |
| 398 | `'탈모가 진행되고 있습니다.'` | `alert_hair_loss_desc` |
| 403–413 | All hair loss treatment tips | (individual tip keys) |

### Summary Messages (Lines 433–483)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 433 | `'기록된 증상이 없습니다. 건강 상태가 양호한 것으로 보입니다.'` | `symptom_no_symptoms_healthy` |
| 453 | `'증상이 경미하거나 없습니다. 잘 관리하고 계시네요!'` | `symptom_mild_well_managed` |
| 480 | `'예상 밖의 증상'` | `insight_unexpected_symptom` |
| 483 | `'의사와 상담하여 원인을 파악하세요...'` | `insight_consult_doctor` |

---

## 3. `src/doctor-module/core/mtf-analyzer.js` 🔴 CRITICAL

**Problem:** ALL evaluation strings Korean-only. No `_t()`.

### Body Ratio Evaluations (Lines 114–163)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 114 | `'매우 여성적 (< 0.75)'` | `mtf_whr_very_feminine` |
| 117 | `'여성적 (< 0.80)'` | `mtf_whr_feminine` |
| 120 | `'진행 중 (< 0.85)'` | `mtf_whr_in_progress` |
| 123 | `'초기 단계 (>= 0.85)'` | `mtf_whr_early_stage` |
| 134 | `'매우 부드러운 비율 (< 1.25)'` | `mtf_shoulder_very_soft` |
| 137 | `'여성적 비율 (< 1.35)'` | `mtf_shoulder_feminine` |
| 140 | `'진행 중 (< 1.45)'` | `mtf_shoulder_in_progress` |
| 143 | `'아직 넓은 어깨 (>= 1.45)'` | `mtf_shoulder_still_broad` |
| 154 | `'뚜렷한 곡선 (> 1.3)'` | `mtf_hip_prominent_curve` |
| 157 | `'여성적 곡선 (> 1.2)'` | `mtf_hip_feminine_curve` |
| 160 | `'약간의 곡선 (> 1.1)'` | `mtf_hip_slight_curve` |
| 163 | `'직선형 (<= 1.1)'` | `mtf_hip_straight` |

### Breast/Body Fat/Hormone (Lines 208–428)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 208 | `'가슴 둘레 측정이 필요합니다.'` | `mtf_chest_measurement_needed` |
| 230 | `'이상적인 여성 체지방률 (20-28%)'` | `mtf_bf_ideal_female` |
| 233 | `'약간 낮음 (18-20%) - 여성 곡선 형성에 불리'` | `mtf_bf_slightly_low` |
| 236 | `'약간 높음 (28-32%) - 여성적이지만 건강 주의'` | `mtf_bf_slightly_high` |
| 239 | `'너무 낮음 (< 18%) - 여성 곡선 형성 어려움'` | `mtf_bf_too_low` |
| 242 | `'높음 (> 32%) - 건강을 위해 감소 필요'` | `mtf_bf_high` |
| 270 | `'이상적 (100-200 pg/ml)'` | `mtf_estrogen_ideal` |
| 273 | `'약간 낮음 (80-100 pg/ml)'` | `mtf_estrogen_slightly_low` |
| 276 | `'약간 높음 (200-250 pg/ml) - 혈전 주의'` | `mtf_estrogen_slightly_high` |
| 279 | `'낮음 (< 80 pg/ml) - 증량 필요'` | `mtf_estrogen_low` |
| 282 | `'높음 (> 250 pg/ml) - 위험, 감량 필요'` | `mtf_estrogen_high_danger` |
| 293 | `'이상적 (< 50 ng/ml) - 잘 억제됨'` | `mtf_testosterone_ideal` |
| 296 | `'보통 (50-100 ng/ml) - 항안드로겐 조정 고려'` | `mtf_testosterone_moderate` |
| 299 | `'높음 (100-200 ng/ml) - 억제 부족'` | `mtf_testosterone_high` |
| 302 | `'매우 높음 (> 200 ng/ml) - 즉시 조정 필요'` | `mtf_testosterone_very_high` |

### Breast Development (Lines 385–428)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 385 | `'진행도를 확인하기 위해 더 많은 데이터가 필요합니다.'` | `mtf_need_more_data` |
| 397 | `'빠른 발달 (평균 이상)'` | `mtf_breast_rapid` |
| 399 | `'정상적인 발달'` | `mtf_breast_normal` |
| 401 | `'느린 발달 (프로게스테론 고려)'` | `mtf_breast_slow` |
| 403 | `'정체 또는 감소 (전문가 상담 필요)'` | `mtf_breast_stalled` |
| 428 | `'측정 필요'` | `mtf_measurement_needed` |

### HRT Timeline (Lines 637–698)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 637–641 | `['성욕 감소', '아침 발기 감소/소실', '피부 부드러워짐', '유방 봉오리 시작 (통증)', '정서적 변화']` | `mtf_timeline_1_3mo_*` |
| 649–653 | `['가슴 지속 발달 (A컵)', '체지방 재분배 시작', '근육량 감소', '체모 감소/부드러워짐', '얼굴 변화 시작']` | `mtf_timeline_3_6mo_*` |
| 661–665 | `['가슴 계속 발달 (A-B컵)', '엉덩이/허벅지 발달', ...]` | `mtf_timeline_6_12mo_*` |
| 673–677 | `['가슴 발달 둔화 (B컵 이상)', '체형 여성적으로 안정화', ...]` | `mtf_timeline_12_24mo_*` |
| 685–688 | `['가슴 최종 크기 도달 (2-5년)', '체형 완전 안정화', ...]` | `mtf_timeline_24mo_plus_*` |
| 698 | `'개인차가 크며, 이는 평균적인 예상 타임라인입니다...'` | `mtf_timeline_note` |

### Phase Labels (Lines 707–711)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 707 | `'초기 (1-3개월)'` | `phase_early` |
| 708 | `'초중기 (3-6개월)'` | `phase_early_mid` |
| 709 | `'중기 (6-12개월)'` | `phase_mid` |
| 710 | `'중후기 (12-24개월)'` | `phase_mid_late` |
| 711 | `'후기 (24개월+)'` | `phase_late` |

### MTF-Specific Recommendations (Lines 732–832)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 732 | `'가슴 발달 촉진'` | `mtf_rec_breast_growth` |
| 734–737 | `['프로게스테론 추가 고려 (의사와 상담)', '충분한 체지방률 유지 (20-28%)', '가슴 마사지', '브래지어 착용 (발달 도움)']` | (individual tip keys) |
| 750 | `'여성적 곡선 만들기'` | `mtf_rec_feminine_curves` |
| 766 | `'에스트라디올 증량 고려'` | `mtf_rec_increase_estradiol` |
| 780 | `'테스토스테론 억제 강화'` | `mtf_rec_stronger_antiandrogen` |
| 794 | `'여성적 피부 관리'` | `mtf_rec_feminine_skincare` |
| 832 | `'시작 단계입니다. 꾸준한 관리가 중요합니다.'` | `mtf_starting_stage_msg` |

---

## 4. `src/doctor-module/core/ftm-analyzer.js` 🔴 CRITICAL

**Problem:** Mirrors mtf-analyzer.js — ALL strings Korean-only.

### Body Ratio Evaluations (Lines 115–219)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 115 | `'매우 남성적 (> 0.95)'` | `ftm_whr_very_masculine` |
| 118 | `'남성적 (> 0.90)'` | `ftm_whr_masculine` |
| 121 | `'진행 중 (> 0.85)'` | `ftm_whr_in_progress` |
| 124 | `'아직 여성적 (<= 0.85)'` | `ftm_whr_still_feminine` |
| 135 | `'매우 넓은 어깨 (> 1.50) - V자 체형!'` | `ftm_shoulder_very_broad` |
| 138 | `'남성적 어깨 (> 1.40)'` | `ftm_shoulder_masculine` |
| 144 | `'어깨 발달 필요 (<= 1.30)'` | `ftm_shoulder_needs_dev` |
| 155 | `'매우 평탄 (< 1cm)'` | `ftm_chest_very_flat` |
| 158 | `'상당히 평탄 (< 2cm)'` | `ftm_chest_quite_flat` |
| 164 | `'바인더 또는 수술 고려 (>= 3cm)'` | `ftm_chest_binder_surgery` |
| 187–199 | Muscle mass evaluations (6 levels) | `ftm_muscle_very_high` through `ftm_muscle_very_low` |
| 210–219 | Muscle percentage evaluations (4 levels) | `ftm_muscle_pct_*` |

### Body Fat & Hormones (Lines 242–306)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 242 | `'이상적인 남성 체지방률 (10-15%)'` | `ftm_bf_ideal_male` |
| 245 | `'매우 낮음 (< 10%) - 건강 주의, 너무 낮음'` | `ftm_bf_very_low` |
| 248 | `'좋음 (15-18%)'` | `ftm_bf_good` |
| 251 | `'약간 높음 (18-22%) - 감소 필요'` | `ftm_bf_slightly_high` |
| 254 | `'높음 (> 22%) - 적극적인 감소 필요'` | `ftm_bf_high` |
| 277 | `'이상적 (300-700 ng/ml)'` | `ftm_testosterone_ideal` |
| 280 | `'약간 높음 (700-1000 ng/ml) - 부작용 주의'` | `ftm_testosterone_slightly_high` |
| 283 | `'낮음 (200-300 ng/ml) - 증량 필요'` | `ftm_testosterone_low` |
| 286 | `'매우 낮음 (< 200 ng/ml) - 즉시 증량 필요'` | `ftm_testosterone_very_low` |
| 289 | `'너무 높음 (> 1000 ng/ml) - 위험, 감량 필요'` | `ftm_testosterone_too_high` |
| 300 | `'이상적 (< 30 pg/ml) - 잘 억제됨'` | `ftm_estrogen_ideal` |
| 303 | `'약간 높음 (30-50 pg/ml)'` | `ftm_estrogen_slightly_high` |
| 306 | `'높음 (> 50 pg/ml) - AI 고려'` | `ftm_estrogen_high` |

### Muscle Growth Analysis (Lines 354–372)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 354 | `'진행도를 확인하기 위해 더 많은 데이터가 필요합니다.'` | `ftm_need_more_data` |
| 366 | `'매우 빠른 성장 (테스토스테론 + 운동 효과 우수)'` | `ftm_muscle_rapid_growth` |
| 368 | `'정상적인 성장 (순조로운 진행)'` | `ftm_muscle_normal_growth` |
| 370 | `'느린 성장 (운동 강도 증가 필요)'` | `ftm_muscle_slow_growth` |
| 372 | `'정체 또는 감소 (운동 및 영양 재검토 필요)'` | `ftm_muscle_stalled` |

### Voice Change Timeline (Lines 614–617)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 614 | `{ period: '1-3개월', change: '목이 간질거림, 약간의 변화' }` | `ftm_voice_1_3mo` |
| 615 | `{ period: '3-6개월', change: '목소리 갈라짐, 눈에 띄는 변화' }` | `ftm_voice_3_6mo` |
| 616 | `{ period: '6-12개월', change: '상당한 낮아짐, 불안정' }` | `ftm_voice_6_12mo` |
| 617 | `{ period: '12-18개월', change: '변화 완료, 안정화' }` | `ftm_voice_12_18mo` |

### HRT Timeline (Lines 636–701)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 636–641 | `['생리 중단 (1-6개월)', '성욕 증가', '클리토리스 비대 시작', '피부 지성화, 여드름 시작', '체모 증가 시작', '목소리 변화 시작 (갈라짐)']` | `ftm_timeline_1_3mo_*` |
| 649–654 | `['목소리 눈에 띄게 낮아짐', '여드름 증가 (피크)', '체모 증가 지속', '근육량 증가 시작', '얼굴형 변화 시작', '체지방 재분배 시작']` | `ftm_timeline_3_6mo_*` |
| 662–667 | (6-12 months changes) | `ftm_timeline_6_12mo_*` |
| 675–680 | (12-24 months changes) | `ftm_timeline_12_24mo_*` |
| 688–691 | (24+ months changes) | `ftm_timeline_24mo_plus_*` |
| 701 | `'개인차가 크며, 이는 평균적인 예상 타임라인입니다...'` | `ftm_timeline_note` |

### Phase Labels & Recommendations (Lines 710–800)

Same pattern as mtf-analyzer.js — all Korean. Lines 710–714 (phase labels), 733 (`'근육량 증가'`), 750–757 (V-shape exercises), 768 (`'테스토스테론 증량 필요'`), 782 (`'테스토스테론 조정 필요'`), 796 (`'여드름 관리 (FTM 흔한 부작용)'`).

---

## 5. `src/doctor-module/core/doctor-engine.js` 🔴 + 🟡 MIXED

**Problem:** Mix of Korean-only strings and properly translated `_t()` patterns.

### Korean-Only Strings

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 122 | `medication: '에스트로겐'` | `med_estrogen` |
| 124 | `message: '흡연은 에스트로겐 복용 중 혈전 위험을 치명적으로 높입니다. 즉시 금연하세요.'` | `alert_smoking_estrogen_clot` |
| 159 | `'측정 데이터가 없습니다. 첫 측정을 시작하세요!'` | `msg_no_data_start_measuring` |
| 193 | `` `월경이 기록되었습니다. 강도: ${severity}/5` `` | `msg_menstruation_recorded` |
| 323 | `'안정적인 농도입니다.'` | `hormone_cycle_stable` |
| 328 | `'호르몬 농도가 가장 높은 시기(Peak)입니다. 기분 변화나 과민 반응이 있을 수 있습니다.'` | `hormone_cycle_peak_msg` |
| 333 | `'호르몬 농도가 낮아지는 시기(Trough)입니다. 피로감이나 감정 저하가 올 수 있습니다.'` | `hormone_cycle_trough_msg` |
| 694 | `'측정 데이터가 없습니다.'` | `msg_no_data` |
| 1126 | `'비교할 데이터가 부족합니다.'` | `msg_insufficient_comparison_data` |
| 1134 | `'지난 주'` | `comparison_last_week` |
| 1135 | `'처음'` | `comparison_first` |
| 1200 | `'날짜를 선택하여 비교하세요.'` | `msg_select_date_compare` |
| 1285–1289 | Daily checklist text: `'약물 규칙적으로 복용하기'`, `'주 3회 운동하기'`, `'하루 2-3L 물 마시기'`, `'충분한 수면 (7-8시간)'`, `'정기 측정 기록하기'` | `checklist_medication`, `checklist_exercise`, `checklist_water`, `checklist_sleep`, `checklist_measurement` |

### Properly Translated `_t()` Strings (NOT issues, already multilingual)

Lines 812, 846, 856, 877, 889, 900–901, 980, 1250, 1267, 1301, 1368, 1410, 1427, 1443–1461, 1496–1498, 1506–1532 — these all use `_t({ ko: '...', en: '...', ja: '...' })` and are OK.

---

## 6. `src/doctor-module/core/trend-predictor.js` 🔴 CRITICAL

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 32 | `'예측을 위해서는 최소 2회 이상의 측정 데이터가 필요합니다.'` | `trend_min_2_measurements` |
| 409 | `` `모든 목표 달성! (${achieved}/${total})` `` | `trend_all_achieved` |
| 411 | `` `절반 이상 달성! (${achieved}/${total})` `` | `trend_more_than_half` |
| 413 | `` `진행 중 (${achieved}/${total} 달성)` `` | `trend_in_progress` |
| 415 | `` `시작 단계 (${achieved}/${total} 달성)` `` | `trend_just_started` |
| 417 | `'목표를 설정하지 않았습니다.'` | `trend_no_targets` |
| 419 | `'측정 데이터가 없습니다.'` | `trend_no_data` |
| 485 | `'증가' / '감소'` | `trend_increasing` / `trend_decreasing` |
| 490 | `` `변화가 거의 없습니다. (주당 ${...})` `` | `trend_change_minimal` |
| 492 | `` `천천히 ${direction}하고 있습니다. (주당 ${...})` `` | `trend_change_slow` |
| 494 | `` `[OK] 이상적인 속도로 ${direction}하고 있습니다. (주당 ${...})` `` | `trend_change_ideal` |
| 496 | `` `[WARN] 매우 빠르게 ${direction}하고 있습니다. (주당 ${...}) 건강에 주의하세요.` `` | `trend_change_rapid` |

---

## 7. `script.js` 🟠 HIGH + 🟢 LOW

### translate() Fallback Patterns

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 607 | `translate('scorePlaceholder') \|\| 'Number'` | Fix `scorePlaceholder` key |
| 610 | `translate('unitMgPlaceholder') \|\| 'mg'` | Fix `unitMgPlaceholder` key |
| 616 | `translate('notesPlaceholder') \|\| 'Text'` | Fix `notesPlaceholder` key |
| 3140 | `translate('unexpectedError') \|\| '표시 오류'` | Fix `unexpectedError` key |
| 3299 | `'건강 분석 탭을 확인하세요.'` | `notify_check_health_tab` |
| 6175 | `translate('cloudSyncing') \|\| '처리 중...'` | Fix `cloudSyncing` key |
| 6178 | `translate('cloudSyncDone') \|\| '완료!'` | Fix `cloudSyncDone` key |
| 6182 | `translate('cloudSyncError') \|\| '실패'` | Fix `cloudSyncError` key |
| 6189 | `translate('cloudUpload') \|\| '클라우드에 저장'` | Fix `cloudUpload` key |
| 6196 | `translate('cloudDownload') \|\| '클라우드에서 불러오기'` | Fix `cloudDownload` key |
| 6278 | `user.displayName \|\| 'User'` | `default_user_name` |
| 6293 | `translate('accountLocalUser') \|\| '로컬 사용자'` | Fix `accountLocalUser` key |
| 6294 | `translate('accountNotLoggedIn') \|\| '로그인하지 않음'` | Fix `accountNotLoggedIn` key |
| 6307 | `translate('loginError') \|\| '로그인 중 오류가 발생했습니다.'` | Fix `loginError` key |
| 6326 | `translate('avatarSizeWarning') \|\| '이미지 파일이 5MB를 초과합니다.'` | Fix `avatarSizeWarning` key |

### Inline Korean→English/Japanese Dictionary (Lines 2784–2870)

Lines 2784–2870: A ~90-entry dictionary mapping Korean recommendation strings to English and Japanese. **Same pattern as action-guide-modal.js.** Both the keys (Korean strings) and the values (English/Japanese strings) are hardcoded.

### Language Name (Line 667)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 667 | `'한국어'` | `lang_name_korean` (or use native language names by convention) |

---

## 8. `src/ui/modals/onboarding-flow.js` 🟠 HIGH

### Button Fallbacks

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 137 | `translate('onboardingPrev') \|\| '이전'` | Fix `onboardingPrev` key |
| 138 | `translate('onboardingSkip') \|\| '건너뛰기'` | Fix `onboardingSkip` key |
| 139 | `translate('onboardingNext') \|\| '다음'` | Fix `onboardingNext` key |
| 202–211 | Button text with Korean fallbacks for all steps | Fix translation keys |

### Step Content — Hardcoded Korean NOT in translate()

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 239 | `'환영합니다!'` | `onboarding_welcome_title` |
| 240 | `'당신의 여정을 함께 기록해요'` | `onboarding_welcome_subtitle` |
| 267 | `'계정 연동'` | `onboarding_account_title` |
| 268 | `'데이터를 안전하게 클라우드에 백업하세요'` | `onboarding_account_subtitle` |
| 271 | `'Google로 시작하기'` ⚠️ **NOT wrapped in translate()** | `onboarding_google_login` |
| 274 | `'나중에 (로컬 전용 모드)'` | `onboarding_local_only` |
| 278 | `'기기 데이터만 저장돼요...'` | `onboarding_local_warning` |
| 302 | `'프로필 설정'` | `onboarding_profile_title` |
| 305 | `'닉네임'` | `onboarding_nickname` |
| 308 | `'생물학적 성별'` | `onboarding_biological_sex` |
| 312–316 | `"Male"`, `"Female"` (hardcoded English option text) | `onboarding_sex_male`, `onboarding_sex_female` |
| 317 | `'모드'` | `onboarding_mode` |
| 319–321 | `"MTF"`, `"FTM"`, `"Non-binary"` (hardcoded English) | `onboarding_mode_mtf`, `onboarding_mode_ftm`, `onboarding_mode_nonbinary` |
| 325 | `'생년월일'` | `onboarding_birthday` |
| 337 | `'나의 목표'` | `onboarding_goal_title` |
| 339 | `'달성하고 싶은 목표를 간단히 적어보세요'` | `onboarding_goal_subtitle` |
| 343 | `'목표를 적어보세요...'` (placeholder) | `onboarding_goal_placeholder` |
| 369 | `'테마 선택'` | `onboarding_theme_title` |
| 371–373 | `"Light"`, `"Dark"`, `"System"` (hardcoded English) | `onboarding_theme_light`, `onboarding_theme_dark`, `onboarding_theme_system` |
| 455 | `'준비 완료!'` | `onboarding_ready_title` |
| 456 | `'홈 화면에서 시작해보세요'` | `onboarding_ready_subtitle` |
| 459–467 | Tour card text (Korean) | `onboarding_tour_*` keys |

---

## 9. `src/ui/modals/health-modal.js` 🟠 HIGH

### translate() Fallbacks

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 61 | `translate('healthAnalysis') \|\| '건강 분석'` | Fix `healthAnalysis` key |
| 118 | `'위험'` | Fix `riskLevelDanger` key |
| 119 | `'주의'` | Fix `riskLevelWarning` key |
| 120 | `'참고'` | Fix `riskLevelNote` key |
| 121 | `'정보'` | Fix `riskLevelInfo` key |
| 130 | `'현재 건강 경고가 없습니다.'` | `health_no_warnings` |
| 131 | `'건강한 상태를 유지하고 계세요!'` | `health_stay_healthy` |
| 140 | `translate('hrtGoalInfo') \|\| 'HRT 목표 정보'` | Fix `hrtGoalInfo` key |
| 149–153 | Default HRT info text (Korean) | `health_default_hrt_info` |
| 216 | `translate('hormoneCycleTitle') \|\| '호르몬 주기'` | Fix `hormoneCycleTitle` key |
| 227 | `translate('symptomAnalysisTitle') \|\| '증상 분석'` | Fix `symptomAnalysisTitle` key |
| 326 | `translate('multiSymptomPatterns') \|\| '복합 증상 패턴'` | Fix `multiSymptomPatterns` key |
| 343 | `translate('hormoneRangeEvaluation') \|\| '호르몬 범위 평가'` | Fix `hormoneRangeEvaluation` key |

### Inline Ternary / Hardcoded English

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 249–253 | `lang === 'ko' ? '식단' : ... / '운동' / '의약' / '생활습관'` | `category_diet`, `category_exercise`, `category_medication`, `category_lifestyle` |
| 345 | `'Estradiol (E2)'`, `'Testosterone (T)'` (hardcoded English) | `hormone_estradiol`, `hormone_testosterone` |

---

## 10. `src/ui/modals/change-roadmap-modal.js` 🟠 HIGH

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 69 | `translate('changeRoadmapTitle') \|\| '변화 로드맵'` | Fix `changeRoadmapTitle` key |
| 183 | `'목표에서 멀어지는 구간이 감지되었습니다...'` | `roadmap_regression_detected` |
| 274–278 | `'큰 변화'`, `'도달'` regex patterns (Korean-specific) | `roadmap_big_change`, `roadmap_reached` |
| 279 | `` `Week ${num}` `` fallback | `roadmap_week` |
| 284 | `'모든 목표 달성 예상 시점'` | `roadmap_all_goals_forecast` |
| 285 | `'일부 지표가 목표에서 멀어졌습니다...'` | `roadmap_some_regressed` |
| 403 | `'주차'` | `roadmap_week_label` |
| 659–663 | `['얼굴', '정면', '측면', '후면', '기타']` | `photo_face`, `photo_front`, `photo_side`, `photo_back`, `photo_other` |

---

## 11. `src/ui/modals/action-guide-modal.js` 🟠 + 🟡 MEDIUM

### Korean Error/UI Strings

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 32 | `translate('actionGuide') \|\| '액션 가이드'` | Fix `actionGuide` key |
| 119 | `'Console(F12) 에서 상세 로그를 확인하세요'` | `actionGuide_check_console` |
| 298 | `'Timeout: AI가 45초 내에 응답하지 않았습니다.'` | `actionGuide_ai_timeout` |
| 352 | `'JSON 파싱 실패 — 원본 응답:'` | `actionGuide_json_parse_fail` |
| 388 | `'AI Generated'` (hardcoded English) 🟢 | `actionGuide_ai_badge` |
| 401 | `'D-?'` fallback | `actionGuide_dday_unknown` |
| 403 | `'D-Day'` (hardcoded English) 🟢 | `actionGuide_dday_today` |

### Inline Korean→English/Japanese Dictionary (Lines 425–580)

~130 entries mapping Korean → English and Japanese. This is a translation workaround for recommendation-engine.js output. **Both the Korean keys and translation values are hardcoded inline.** Should be moved to central translation system.

---

## 12. `src/ui/modals/ai-advisor-modal.js` 🟠 + 🟢

### Hardcoded English (in AI prompt context)

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 196 | `'No medications recorded'` | `ai_no_medications` |
| 202 | `'No hormone labs recorded'` | `ai_no_hormone_labs` |
| 213 | `'No body metrics recorded'` | `ai_no_body_metrics` |
| 347 | `'No data available'` | `ai_no_data` |

### translate() Fallbacks

| Line | Hardcoded String | Suggested Key |
|------|-----------------|---------------|
| 497 | `'API 키가 유효하지 않거나 만료되었습니다...'` | Fix `aiError401` key |
| 500 | `'이 모델에 대한 접근 권한이 없습니다.'` | Fix `aiError403` key |
| 503 | `'모델 또는 엔드포인트를 찾을 수 없습니다...'` | Fix `aiError404` key |
| 509 | `'AI 서버에 문제가 발생했습니다...'` | Fix `aiError5xx` key |
| 584 | `'API 키가 설정되지 않았습니다'` | Fix `aiNoApiKey` key |

---

## 13. `src/ui/modals/quest-modal.js` 🟡 MEDIUM

### LINKABLE_FIELDS Array (Lines 17–29)

12 entries with hardcoded `{ ko: '...', en: '...', ja: '...' }` — all 3 languages present but not using central translate():

| Line | ko | en | ja | Suggested Key |
|------|----|----|----|----|
| 17 | `'체중 (kg)'` | `'Weight (kg)'` | `'体重 (kg)'` | `questField_weight` |
| 18 | `'체지방률 (%)'` | `'Body Fat (%)'` | `'体脂肪率 (%)'` | `questField_bodyFat` |
| 19 | `'골격근량 (kg)'` | `'Muscle Mass (kg)'` | `'筋肉量 (kg)'` | `questField_muscleMass` |
| 20 | `'가슴 둘레 (cm)'` | `'Chest (cm)'` | `'バスト (cm)'` | `questField_chest` |
| 21 | `'허리 둘레 (cm)'` | `'Waist (cm)'` | `'ウエスト (cm)'` | `questField_waist` |
| 22 | `'엉덩이 둘레 (cm)'` | `'Hips (cm)'` | `'ヒップ (cm)'` | `questField_hips` |
| 23 | `'어깨 너비 (cm)'` | `'Shoulder (cm)'` | `'肩幅 (cm)'` | `questField_shoulder` |
| 24 | `'허벅지 둘레 (cm)'` | `'Thigh (cm)'` | `'太もも (cm)'` | `questField_thigh` |
| 25 | `'팔 둘레 (cm)'` | `'Arm (cm)'` | `'腕 (cm)'` | `questField_arm` |
| 26 | `'신장 (cm)'` | `'Height (cm)'` | `'身長 (cm)'` | `questField_height` |
| 27 | `'에스트로겐 (pg/mL)'` | `'Estrogen (pg/mL)'` | `'エストロゲン (pg/mL)'` | `questField_estrogen` |
| 28 | `'테스토스테론 (ng/dL)'` | `'Testosterone (ng/dL)'` | `'テストステロン (ng/dL)'` | `questField_testosterone` |

### CATEGORIES Array (Lines 31–38)

| Line | ko | en | ja | Suggested Key |
|------|----|----|----|----|
| 32 | `'신체'` | `'Body'` | `'身体'` | `questCat_body` |
| 33 | `'운동'` | `'Exercise'` | `'運動'` | `questCat_exercise` |
| 34 | `'식단'` | `'Diet'` | `'食事'` | `questCat_diet` |
| 35 | `'생활습관'` | `'Lifestyle'` | `'生活習慣'` | `questCat_lifestyle` |
| 36 | `'호르몬'` | `'Hormones'` | `'ホルモン'` | `questCat_hormones` |
| 37 | `'기타'` | `'Other'` | `'その他'` | `questCat_other` |

---

## 14. `src/ui/modals/body-briefing-modal.js` 🟡 MEDIUM

### Inline Ternary Patterns

| Line | Korean | English | Suggested Key |
|------|--------|---------|---------------|
| 902 | `'권장 검사'` | `'Recommended Tests'` | `briefing_recommended_tests` |
| 935 | `'약물 안전 정보'` | `'Drug Safety Information'` | `briefing_drug_safety` |
| 1009 | `'체지방'` | `'Body Fat'` | `briefing_body_fat` |
| 1011 | `'이상적'` | `'ideal'` | `briefing_ideal` |
| 1030 | `'근육량'` | `'Muscle'` | `briefing_muscle` |
| 1032 | `'목표'` | `'Target'` | `briefing_target` |
| 1042 | `'허리-엉덩이 비율'` | `'WHR'` | `briefing_whr` |
| 1087 | `'호르몬 균형'` | `'Hormones'` | `briefing_hormones` |
| 1097 | `'목표 달성'` | `'Goals'` | `briefing_goals` |
| 1111 | `'신체 변화'` | `'Body Change'` | `briefing_body_change` |
| 1122 | `'레이더 차트를 표시하기에 데이터가 부족합니다...'` | (English) | `briefing_radar_no_data` |
| 1150 | `'현재'` | `'Current'` | `briefing_current` |
| 1164 | `'이전'` | `'Previous'` | `briefing_previous` |
| 1409 | `'신체 측정 기록이 없습니다.'` | (English/Japanese) | `briefing_no_measurements` |
| 1473 | `'신체 측정 시각화'` | `'Body measurement visualization'` | `briefing_body_viz_aria` |

### Body Type Labels (Line 1475)

| Korean | Suggested Key |
|--------|---------------|
| `'표준'` | `bodyType_average` |
| `'하체형'` | `bodyType_pear` |
| `'모래시계형'` | `bodyType_hourglass` |
| `'역삼각형'` | `bodyType_inverted` |
| `'슬림'` | `bodyType_slim` |

### Anatomy Measurement Labels (Lines 1396–1403)

8 entries with `{ ko: '...', en: '...', ja: '...' }` — hardcoded but multilingual:
`목 둘레`, `어깨 너비`, `가슴 둘레`, `언더버스트`, `허리 둘레`, `엉덩이 둘레`, `허벅지`, `종아리`

### Safety Domain Labels (Lines 830–837)

8 entries with `{ ko: '...', en: '...', ja: '...' }` — properly multilingual: `혈전/색전`, `고칼륨혈증`, `적혈구증가증`, `간독성`, `대사 위험`, `정신건강`, `수막종(CPA)`, `수면무호흡`

---

## 15. `src/doctor-module/core/health-evaluator.js` 🟡 MEDIUM

Uses `_t({ ko: '...', en: '...', ja: '...' })` throughout — all 3 languages present inline. ~47 multilingual string objects. Not using central translate() but IS translated. Lower priority.

---

## 16. `src/doctor-module/core/safety-engine.js` 🟡 MEDIUM

Uses proper `{ ko: '...', en: '...', ja: '...' }` pattern for all `RECOMMENDED_TESTS`, `DOMAIN_LABELS`, `DISCLAIMER`. ~50 string objects. Not using central translate() but IS translated. Lower priority.

---

## Priority Action Plan

### Phase 1 — 🔴 CRITICAL (Korean-only files, ~400+ strings)
1. **recommendation-engine.js** — Refactor all strings to use `_t()` or externalize to translation keys
2. **symptom-analyzer.js** — All alert/tip/action text needs multilingual support
3. **mtf-analyzer.js** — All evaluation strings, timeline, recommendations
4. **ftm-analyzer.js** — All evaluation strings, timeline, recommendations
5. **trend-predictor.js** — Progress/change-rate messages
6. **doctor-engine.js** — ~30 Korean-only strings (rest already uses `_t()`)

### Phase 2 — 🟠 HIGH (translate() fallback strings)
7. **script.js** — Ensure all translation keys exist so fallbacks aren't needed
8. **onboarding-flow.js** — Many hardcoded Korean labels, especially "Google로 시작하기", "Male"/"Female" options
9. **health-modal.js** — Multiple Korean fallbacks
10. **change-roadmap-modal.js** — Timeline labels, photo labels
11. **action-guide-modal.js** — Error messages
12. **ai-advisor-modal.js** — Error fallbacks + hardcoded English in prompt

### Phase 3 — 🟡 MEDIUM (workaround dictionaries)
13. **action-guide-modal.js dictionary** — 130-entry Korean→English/Japanese dictionary should be eliminated once recommendation-engine outputs multilingual
14. **script.js dictionary** — Same 90-entry dictionary, eliminate once source is fixed
15. **quest-modal.js** — Move LINKABLE_FIELDS/CATEGORIES to central translation
16. **body-briefing-modal.js** — Move inline ternaries to translate()
17. **health-evaluator.js** — Consider moving `_t()` strings to central translation (optional)
18. **safety-engine.js** — Consider moving `_t()` strings to central translation (optional)
