/**
 * Recommendation Engine
 * 
 * 측정 데이터, 증상, 목표를 분석하여 개인화된 추천 생성
 * - 운동 추천
 * - 식단 추천
 * - 약물 조정 추천
 * - 습관 추천
 */

import { getSymptomById } from '../data/symptom-database.js';
import { getMedicationById } from '../data/medication-database.js';

// ========================================
// 1. 추천 엔진 클래스
// ========================================

export class RecommendationEngine {
  constructor(measurements, symptoms, medications, targets, mode, language = 'ko') {
    this.measurements = measurements;
    this.symptoms = symptoms;
    this.medications = medications;
    this.targets = targets;
    this.mode = mode;
    this.language = language;
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
  // 2. 전체 추천 생성
  // ========================================
  
  /**
   * 모든 카테고리 추천 생성
   */
  generateAllRecommendations() {
    return {
      exercise: this.recommendExercise(),
      diet: this.recommendDiet(),
      medication: this.recommendMedication(),
      habits: this.recommendHabits(),
      focus: this.selectWeeklyFocus()
    };
  }
  
  // ========================================
  // 3. 운동 추천
  // ========================================
  
  /**
   * 운동 추천 생성
   */
  recommendExercise() {
    const recommendations = [];
    
    if (this.measurements.length === 0) return recommendations;
    
    const latest = this.measurements[this.measurements.length - 1];
    const progress = this.calculateProgress();
    
    // 체중 관리 추천
    if (this.targets.weight && latest.weight) {
      const diff = latest.weight - this.targets.weight;
      
      if (diff > 2) {
        recommendations.push({
          category: 'cardio',
          priority: 'high',
          title: this._t({ko: '유산소 운동 증가', en: 'Increase aerobic exercise', ja: '有酸素運動の増加'}),
          description: this._t({ko: '체중 감소를 위한 유산소 운동', en: 'Aerobic exercise for weight loss', ja: '体重減少のための有酸素運動'}),
          details: this._t({ko: '주 3-4회, 30-45분', en: '3-4 times/week, 30-45 min', ja: '週3-4回、30-45分'}),
          exercises: [
            this._t({ko: '걷기', en: 'Walking', ja: 'ウォーキング'}),
            this._t({ko: '조깅', en: 'Jogging', ja: 'ジョギング'}),
            this._t({ko: '자전거', en: 'Cycling', ja: 'サイクリング'}),
            this._t({ko: '수영', en: 'Swimming', ja: '水泳'})
          ],
          reason: this._t({ko: '목표 체중까지 {diff}kg 남음', en: '{diff}kg remaining to target weight', ja: '目標体重まで{diff}kg'}, {diff: diff.toFixed(1)}),
          frequency: this._t({ko: '주 3-4회', en: '3-4 times/week', ja: '週3-4回'}),
          duration: this._t({ko: '30-45분', en: '30-45 min', ja: '30-45分'})
        });
      } else if (diff < -2) {
        recommendations.push({
          category: 'strength',
          priority: 'medium',
          title: this._t({ko: '근력 운동', en: 'Strength training', ja: '筋力トレーニング'}),
          description: this._t({ko: '체중 증가 및 근육 발달', en: 'Weight gain and muscle development', ja: '体重増加と筋肉発達'}),
          details: this._t({ko: '주 3회, 복합 운동 중심', en: '3 times/week, compound exercises', ja: '週3回、複合運動中心'}),
          exercises: [
            this._t({ko: '스쿼트', en: 'Squats', ja: 'スクワット'}),
            this._t({ko: '데드리프트', en: 'Deadlifts', ja: 'デッドリフト'}),
            this._t({ko: '벤치프레스', en: 'Bench press', ja: 'ベンチプレス'})
          ],
          reason: this._t({ko: '건강한 체중 증가 필요', en: 'Healthy weight gain needed', ja: '健康的な体重増加が必要'}),
          frequency: this._t({ko: '주 3회', en: '3 times/week', ja: '週3回'}),
          duration: this._t({ko: '45-60분', en: '45-60 min', ja: '45-60分'})
        });
      }
    }
    
    // 모드별 추천
    if (this.mode === 'mtf') {
      // MTF: 여성적 체형 강조
      
      // 하체 발달
      if (this.targets.hips || this.targets.thigh) {
        recommendations.push({
          category: 'lower_body',
          priority: 'high',
          title: this._t({ko: '하체 집중 운동', en: 'Lower body focused workout', ja: '下半身集中トレーニング'}),
          description: this._t({ko: '엉덩이와 허벅지 발달', en: 'Hip and thigh development', ja: 'ヒップと太ももの発達'}),
          details: this._t({ko: '여성적 곡선 만들기', en: 'Creating feminine curves', ja: '女性的な曲線づくり'}),
          exercises: [
            this._t({ko: '스쿼트 (힙 중심)', en: 'Squats (hip focus)', ja: 'スクワット（ヒップ重点）'}),
            this._t({ko: '런지', en: 'Lunges', ja: 'ランジ'}),
            this._t({ko: '힙 스러스트', en: 'Hip thrusts', ja: 'ヒップスラスト'}),
            this._t({ko: '레그 프레스', en: 'Leg press', ja: 'レッグプレス'}),
            this._t({ko: '사이드 레그 레이즈', en: 'Side leg raises', ja: 'サイドレッグレイズ'})
          ],
          reason: this._t({ko: '여성적 하체 라인 형성', en: 'Forming feminine lower body lines', ja: '女性的な下半身ラインの形成'}),
          frequency: this._t({ko: '주 3-4회', en: '3-4 times/week', ja: '週3-4回'}),
          duration: this._t({ko: '30-40분', en: '30-40 min', ja: '30-40分'}),
          tips: [
            this._t({ko: '가벼운 무게, 높은 반복', en: 'Light weight, high reps', ja: '軽い重量、高回数'}),
            this._t({ko: '힙에 집중', en: 'Focus on hips', ja: 'ヒップに集中'}),
            this._t({ko: '스트레칭 중요', en: 'Stretching is important', ja: 'ストレッチが重要'})
          ]
        });
      }
      
      // 허리 감소
      if (this.targets.waist && latest.waist > this.targets.waist) {
        recommendations.push({
          category: 'core',
          priority: 'medium',
          title: this._t({ko: '복부 운동', en: 'Abdominal exercises', ja: '腹部トレーニング'}),
          description: this._t({ko: '허리 둘레 감소', en: 'Waist circumference reduction', ja: 'ウエスト周囲の減少'}),
          details: this._t({ko: '코어 강화 및 지방 감소', en: 'Core strengthening and fat loss', ja: 'コア強化と脂肪減少'}),
          exercises: [
            this._t({ko: '플랭크', en: 'Plank', ja: 'プランク'}),
            this._t({ko: '사이드 플랭크', en: 'Side plank', ja: 'サイドプランク'}),
            this._t({ko: '레그 레이즈', en: 'Leg raises', ja: 'レッグレイズ'}),
            this._t({ko: '크런치', en: 'Crunches', ja: 'クランチ'}),
            this._t({ko: '러시안 트위스트', en: 'Russian twists', ja: 'ロシアンツイスト'})
          ],
          reason: this._t({ko: '목표 허리까지 {diff}cm 남음', en: '{diff}cm remaining to target waist', ja: '目標ウエストまで{diff}cm'}, {diff: (latest.waist - this.targets.waist).toFixed(1)}),
          frequency: this._t({ko: '주 4-5회', en: '4-5 times/week', ja: '週4-5回'}),
          duration: this._t({ko: '15-20분', en: '15-20 min', ja: '15-20分'}),
          tips: [
            this._t({ko: '복근보다 전체 코어', en: 'Full core over abs', ja: '腹筋よりコア全体'}),
            this._t({ko: '유산소 병행', en: 'Combine with cardio', ja: '有酸素運動と併用'})
          ]
        });
      }
      
      // 상체는 부드럽게
      recommendations.push({
        category: 'upper_body',
        priority: 'low',
        title: this._t({ko: '가벼운 상체 운동', en: 'Light upper body workout', ja: '軽い上半身トレーニング'}),
        description: this._t({ko: '어깨 축소 및 톤업', en: 'Shoulder reduction and toning', ja: '肩の縮小とトーンアップ'}),
        details: this._t({ko: '근육 비대 방지', en: 'Preventing muscle hypertrophy', ja: '筋肥大の防止'}),
        exercises: [
          this._t({ko: '가벼운 요가', en: 'Light yoga', ja: '軽いヨガ'}),
          this._t({ko: '필라테스', en: 'Pilates', ja: 'ピラティス'}),
          this._t({ko: '스트레칭', en: 'Stretching', ja: 'ストレッチ'}),
          this._t({ko: '가벼운 덤벨 운동', en: 'Light dumbbell exercises', ja: '軽いダンベル運動'})
        ],
        reason: this._t({ko: '여성적 상체 라인 유지', en: 'Maintaining feminine upper body lines', ja: '女性的な上半身ラインの維持'}),
        frequency: this._t({ko: '주 2-3회', en: '2-3 times/week', ja: '週2-3回'}),
        duration: this._t({ko: '20-30분', en: '20-30 min', ja: '20-30分'}),
        tips: [
          this._t({ko: '무거운 무게 피하기', en: 'Avoid heavy weights', ja: '重い重量を避ける'}),
          this._t({ko: '유연성 중심', en: 'Focus on flexibility', ja: '柔軟性中心'})
        ]
      });
      
    } else if (this.mode === 'ftm') {
      // FTM: 남성적 체형 강조
      
      // 상체 발달
      recommendations.push({
        category: 'upper_body',
        priority: 'high',
        title: this._t({ko: '상체 근력 운동', en: 'Upper body strength training', ja: '上半身筋力トレーニング'}),
        description: this._t({ko: '어깨와 가슴 발달', en: 'Shoulder and chest development', ja: '肩と胸の発達'}),
        details: this._t({ko: '남성적 상체 만들기', en: 'Building masculine upper body', ja: '男性的な上半身づくり'}),
        exercises: [
          this._t({ko: '벤치프레스', en: 'Bench press', ja: 'ベンチプレス'}),
          this._t({ko: '숄더 프레스', en: 'Shoulder press', ja: 'ショルダープレス'}),
          this._t({ko: '풀업/턱걸이', en: 'Pull-ups/chin-ups', ja: 'プルアップ/チンアップ'}),
          this._t({ko: '로우', en: 'Rows', ja: 'ロウ'}),
          this._t({ko: '딥스', en: 'Dips', ja: 'ディップス'})
        ],
        reason: this._t({ko: '남성적 V자 체형 형성', en: 'Building masculine V-shaped physique', ja: '男性的なV字体型の形成'}),
        frequency: this._t({ko: '주 4-5회', en: '4-5 times/week', ja: '週4-5回'}),
        duration: this._t({ko: '45-60분', en: '45-60 min', ja: '45-60分'}),
        tips: [
          this._t({ko: '무거운 무게', en: 'Heavy weights', ja: '重い重量'}),
          this._t({ko: '복합 운동 중심', en: 'Focus on compound exercises', ja: '複合運動中心'}),
          this._t({ko: '충분한 휴식', en: 'Adequate rest', ja: '十分な休息'})
        ]
      });
      
      // 코어 강화
      recommendations.push({
        category: 'core',
        priority: 'medium',
        title: this._t({ko: '복부 코어 운동', en: 'Core abdominal exercises', ja: '腹部コアトレーニング'}),
        description: this._t({ko: '복근 발달 및 체형 정리', en: 'Ab development and body shaping', ja: '腹筋発達と体型整理'}),
        details: this._t({ko: '남성적 복부 라인', en: 'Masculine abdominal lines', ja: '男性的な腹部ライン'}),
        exercises: [
          this._t({ko: '데드리프트', en: 'Deadlifts', ja: 'デッドリフト'}),
          this._t({ko: '스쿼트', en: 'Squats', ja: 'スクワット'}),
          this._t({ko: '플랭크', en: 'Plank', ja: 'プランク'}),
          this._t({ko: '행잉 레그 레이즈', en: 'Hanging leg raises', ja: 'ハンギングレッグレイズ'}),
          this._t({ko: '우드찹', en: 'Wood chops', ja: 'ウッドチョップ'})
        ],
        reason: this._t({ko: '남성적 코어 강화', en: 'Masculine core strengthening', ja: '男性的なコア強化'}),
        frequency: this._t({ko: '주 3-4회', en: '3-4 times/week', ja: '週3-4回'}),
        duration: this._t({ko: '30-40분', en: '30-40 min', ja: '30-40分'}),
        tips: [
          this._t({ko: '무거운 복합 운동', en: 'Heavy compound exercises', ja: '重い複合運動'}),
          this._t({ko: '체지방 감소 병행', en: 'Combine with fat loss', ja: '体脂肪減少と併用'})
        ]
      });
      
      // 하체는 균형있게
      recommendations.push({
        category: 'lower_body',
        priority: 'medium',
        title: this._t({ko: '하체 근력 운동', en: 'Lower body strength training', ja: '下半身筋力トレーニング'}),
        description: this._t({ko: '전체적인 근육 발달', en: 'Overall muscle development', ja: '全体的な筋肉発達'}),
        details: this._t({ko: '균형잡힌 하체', en: 'Balanced lower body', ja: 'バランスの取れた下半身'}),
        exercises: [
          this._t({ko: '스쿼트', en: 'Squats', ja: 'スクワット'}),
          this._t({ko: '데드리프트', en: 'Deadlifts', ja: 'デッドリフト'}),
          this._t({ko: '레그 프레스', en: 'Leg press', ja: 'レッグプレス'}),
          this._t({ko: '런지', en: 'Lunges', ja: 'ランジ'})
        ],
        reason: this._t({ko: '전체적인 남성적 체형', en: 'Overall masculine physique', ja: '全体的な男性的体型'}),
        frequency: this._t({ko: '주 2-3회', en: '2-3 times/week', ja: '週2-3回'}),
        duration: this._t({ko: '40-50분', en: '40-50 min', ja: '40-50分'}),
        tips: [
          this._t({ko: '무거운 무게', en: 'Heavy weights', ja: '重い重量'}),
          this._t({ko: '파워 중심', en: 'Power focused', ja: 'パワー中心'})
        ]
      });
      
    } else if (this.mode === 'nonbinary') {
      // Non-binary: 균형 잡힌 운동
      
      recommendations.push({
        category: 'balanced',
        priority: 'high',
        title: this._t({ko: '균형 잡힌 전신 운동', en: 'Balanced full-body workout', ja: 'バランスの取れた全身運動'}),
        description: this._t({ko: '조화로운 체형 만들기', en: 'Creating a harmonious physique', ja: '調和の取れた体型づくり'}),
        details: this._t({ko: '과도하지 않은 톤업', en: 'Moderate toning', ja: '過度でないトーンアップ'}),
        exercises: [
          this._t({ko: '요가', en: 'Yoga', ja: 'ヨガ'}),
          this._t({ko: '필라테스', en: 'Pilates', ja: 'ピラティス'}),
          this._t({ko: '수영', en: 'Swimming', ja: '水泳'}),
          this._t({ko: '가벼운 웨이트', en: 'Light weights', ja: '軽いウェイト'}),
          this._t({ko: '바디웨이트 운동', en: 'Bodyweight exercises', ja: '自重トレーニング'})
        ],
        reason: this._t({ko: '중성적이고 건강한 체형', en: 'Androgynous and healthy physique', ja: '中性的で健康的な体型'}),
        frequency: this._t({ko: '주 3-4회', en: '3-4 times/week', ja: '週3-4回'}),
        duration: this._t({ko: '30-45분', en: '30-45 min', ja: '30-45分'}),
        tips: [
          this._t({ko: '균형', en: 'Balance', ja: 'バランス'}),
          this._t({ko: '유연성', en: 'Flexibility', ja: '柔軟性'}),
          this._t({ko: '적당한 강도', en: 'Moderate intensity', ja: '適度な強度'})
        ]
      });
      
      recommendations.push({
        category: 'cardio',
        priority: 'medium',
        title: this._t({ko: '유산소 운동', en: 'Aerobic exercise', ja: '有酸素運動'}),
        description: this._t({ko: '심폐 기능 및 체지방 관리', en: 'Cardio fitness and body fat management', ja: '心肺機能と体脂肪管理'}),
        details: this._t({ko: '건강한 체형 유지', en: 'Maintaining a healthy physique', ja: '健康的な体型維持'}),
        exercises: [
          this._t({ko: '조깅', en: 'Jogging', ja: 'ジョギング'}),
          this._t({ko: '자전거', en: 'Cycling', ja: 'サイクリング'}),
          this._t({ko: '수영', en: 'Swimming', ja: '水泳'}),
          this._t({ko: '댄스', en: 'Dancing', ja: 'ダンス'})
        ],
        reason: this._t({ko: '전반적인 건강 증진', en: 'Overall health improvement', ja: '全般的な健康増進'}),
        frequency: this._t({ko: '주 2-3회', en: '2-3 times/week', ja: '週2-3回'}),
        duration: this._t({ko: '30-40분', en: '30-40 min', ja: '30-40分'})
      });
    }
    
    // 근육량 체크
    if (latest.muscleMass) {
      if (this.measurements.length >= 2) {
        const previous = this.measurements[this.measurements.length - 2];
        if (previous.muscleMass && latest.muscleMass < previous.muscleMass) {
          recommendations.push({
            category: 'strength',
            priority: 'high',
            title: this._t({ko: '근육 손실 방지', en: 'Prevent muscle loss', ja: '筋肉損失の防止'}),
            description: this._t({ko: '근력 운동 및 단백질 섭취', en: 'Strength training and protein intake', ja: '筋力トレーニングとタンパク質摂取'}),
            details: this._t({ko: '근육량 회복', en: 'Muscle mass recovery', ja: '筋肉量の回復'}),
            exercises: [
              this._t({ko: '복합 운동 중심', en: 'Focus on compound exercises', ja: '複合運動中心'}),
              this._t({ko: '충분한 단백질', en: 'Adequate protein', ja: '十分なタンパク質'})
            ],
            reason: this._t({ko: '근육량 {diff}kg 감소', en: 'Muscle mass decreased by {diff}kg', ja: '筋肉量{diff}kg減少'}, {diff: (previous.muscleMass - latest.muscleMass).toFixed(1)}),
            frequency: this._t({ko: '주 3-4회', en: '3-4 times/week', ja: '週3-4回'}),
            duration: this._t({ko: '45-60분', en: '45-60 min', ja: '45-60分'}),
            tips: [
              this._t({ko: '과도한 유산소 피하기', en: 'Avoid excessive cardio', ja: '過度な有酸素運動を避ける'}),
              this._t({ko: '충분한 칼로리', en: 'Adequate calories', ja: '十分なカロリー'}),
              this._t({ko: '단백질 1.5-2g/kg', en: 'Protein 1.5-2g/kg', ja: 'タンパク質1.5-2g/kg'})
            ]
          });
        }
      }
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
  
  // ========================================
  // 4. 식단 추천
  // ========================================
  
  /**
   * 식단 추천 생성
   */
  recommendDiet() {
    const recommendations = [];
    
    if (this.measurements.length === 0) return recommendations;
    
    const latest = this.measurements[this.measurements.length - 1];
    
    // 체중 변화 속도 확인
    if (this.measurements.length >= 2) {
      const previous = this.measurements[this.measurements.length - 2];
      if (latest.weight && previous.weight) {
        const weeklyChange = latest.weight - previous.weight;
        
        // 급격한 체중 감소
        if (weeklyChange < -0.8) {
          recommendations.push({
            priority: 'high',
            title: this._t({ko: '단백질 섭취 증가', en: 'Increase protein intake', ja: 'タンパク質摂取量の増加'}),
            description: this._t({ko: '급격한 체중 감소로 근육 손실 위험', en: 'Risk of muscle loss due to rapid weight loss', ja: '急激な体重減少による筋肉損失リスク'}),
            details: this._t({ko: '고단백 식단으로 근육 보호', en: 'Protect muscles with high-protein diet', ja: '高タンパク食で筋肉を保護'}),
            macros: {
              protein: this._t({ko: '체중 1kg당 1.5-2g', en: '1.5-2g per kg body weight', ja: '体重1kgあたり1.5-2g'}),
              carbs: this._t({ko: '적정 유지', en: 'Maintain moderate level', ja: '適正維持'}),
              fats: this._t({ko: '건강한 지방 섭취', en: 'Healthy fat intake', ja: '健康的な脂肪摂取'})
            },
            foods: [
              this._t({ko: '닭가슴살, 생선', en: 'Chicken breast, fish', ja: '鶏むね肉、魚'}),
              this._t({ko: '달걀, 두부', en: 'Eggs, tofu', ja: '卵、豆腐'}),
              this._t({ko: '그릭 요거트', en: 'Greek yogurt', ja: 'ギリシャヨーグルト'}),
              this._t({ko: '프로틴 쉐이크', en: 'Protein shake', ja: 'プロテインシェイク'}),
              this._t({ko: '견과류', en: 'Nuts', ja: 'ナッツ類'})
            ],
            reason: this._t({ko: '주간 {change}kg 감소 (권장: 0.5kg)', en: 'Weekly {change}kg loss (recommended: 0.5kg)', ja: '週間{change}kg減少（推奨: 0.5kg）'}, {change: Math.abs(weeklyChange).toFixed(1)}),
            tips: [
              this._t({ko: '매 끼니마다 단백질', en: 'Protein with every meal', ja: '毎食タンパク質を'}),
              this._t({ko: '식사 5-6회 분산', en: 'Spread meals to 5-6 times', ja: '食事を5-6回に分散'})
            ]
          });
        }
        
        // 체중 정체
        if (Math.abs(weeklyChange) < 0.1 && this.targets.weight) {
          const diff = latest.weight - this.targets.weight;
          if (Math.abs(diff) > 2) {
            recommendations.push({
              priority: 'medium',
              title: this._t({ko: '칼로리 조정 필요', en: 'Calorie adjustment needed', ja: 'カロリー調整が必要'}),
              description: this._t({ko: '체중 정체 극복', en: 'Overcoming weight plateau', ja: '体重停滞の克服'}),
              details: diff > 0 
                ? this._t({ko: '칼로리 감소', en: 'Reduce calories', ja: 'カロリー減少'}) 
                : this._t({ko: '칼로리 증가', en: 'Increase calories', ja: 'カロリー増加'}),
              reason: this._t({ko: '2주 이상 체중 변화 없음', en: 'No weight change for 2+ weeks', ja: '2週間以上体重変化なし'}),
              tips: diff > 0 
                ? [
                    this._t({ko: '하루 200-300kcal 감소', en: 'Reduce 200-300kcal per day', ja: '1日200-300kcal減少'}),
                    this._t({ko: '탄수화물 약간 줄이기', en: 'Slightly reduce carbs', ja: '炭水化物を少し減らす'})
                  ]
                : [
                    this._t({ko: '하루 200-300kcal 증가', en: 'Increase 200-300kcal per day', ja: '1日200-300kcal増加'}),
                    this._t({ko: '식사 횟수 늘리기', en: 'Increase meal frequency', ja: '食事回数を増やす'})
                  ]
            });
          }
        }
      }
    }
    
    // 체지방률 관리
    if (latest.bodyFatPercentage) {
      if (this.mode === 'mtf') {
        if (latest.bodyFatPercentage < 20) {
          recommendations.push({
            priority: 'medium',
            title: this._t({ko: '건강한 지방 섭취', en: 'Healthy fat intake', ja: '健康的な脂肪摂取'}),
            description: this._t({ko: '여성화를 위한 적정 체지방률 유지', en: 'Maintaining optimal body fat for feminization', ja: '女性化のための適正体脂肪率維持'}),
            details: this._t({ko: '호르몬 균형 및 지방 재분배', en: 'Hormone balance and fat redistribution', ja: 'ホルモンバランスと脂肪再分配'}),
            macros: {
              fats: this._t({ko: '총 칼로리의 25-30%', en: '25-30% of total calories', ja: '総カロリーの25-30%'})
            },
            foods: [
              this._t({ko: '아보카도', en: 'Avocado', ja: 'アボカド'}),
              this._t({ko: '올리브유', en: 'Olive oil', ja: 'オリーブオイル'}),
              this._t({ko: '견과류', en: 'Nuts', ja: 'ナッツ類'}),
              this._t({ko: '연어', en: 'Salmon', ja: 'サーモン'}),
              this._t({ko: '치즈 (적당량)', en: 'Cheese (moderate)', ja: 'チーズ（適量）'})
            ],
            reason: this._t({ko: '목표 체지방률: 20-28% (현재: {current}%)', en: 'Target body fat: 20-28% (current: {current}%)', ja: '目標体脂肪率: 20-28%（現在: {current}%）'}, {current: latest.bodyFatPercentage.toFixed(1)}),
            tips: [
              this._t({ko: '건강한 불포화 지방', en: 'Healthy unsaturated fats', ja: '健康的な不飽和脂肪'}),
              this._t({ko: '오메가-3 풍부 식품', en: 'Omega-3 rich foods', ja: 'オメガ3豊富な食品'})
            ]
          });
        }
      } else if (this.mode === 'ftm') {
        if (latest.bodyFatPercentage > 20) {
          recommendations.push({
            priority: 'medium',
            title: this._t({ko: '체지방 감소 식단', en: 'Fat loss diet', ja: '体脂肪減少食事'}),
            description: this._t({ko: '남성적 체형을 위한 체지방 관리', en: 'Body fat management for masculine physique', ja: '男性的な体型のための体脂肪管理'}),
            details: this._t({ko: '고단백 저탄수화물', en: 'High protein, low carb', ja: '高タンパク低炭水化物'}),
            macros: {
              protein: this._t({ko: '높게 (40%)', en: 'High (40%)', ja: '高め（40%）'}),
              carbs: this._t({ko: '중간 (30%)', en: 'Moderate (30%)', ja: '中程度（30%）'}),
              fats: this._t({ko: '적정 (30%)', en: 'Moderate (30%)', ja: '適正（30%）'})
            },
            foods: [
              this._t({ko: '닭가슴살, 소고기', en: 'Chicken breast, beef', ja: '鶏むね肉、牛肉'}),
              this._t({ko: '생선', en: 'Fish', ja: '魚'}),
              this._t({ko: '달걀', en: 'Eggs', ja: '卵'}),
              this._t({ko: '브로콜리, 시금치', en: 'Broccoli, spinach', ja: 'ブロッコリー、ほうれん草'}),
              this._t({ko: '현미, 고구마 (적정량)', en: 'Brown rice, sweet potato (moderate)', ja: '玄米、さつまいも（適量）'})
            ],
            reason: this._t({ko: '목표 체지방률: 10-18% (현재: {current}%)', en: 'Target body fat: 10-18% (current: {current}%)', ja: '目標体脂肪率: 10-18%（現在: {current}%）'}, {current: latest.bodyFatPercentage.toFixed(1)}),
            tips: [
              this._t({ko: '정제 탄수화물 피하기', en: 'Avoid refined carbs', ja: '精製炭水化物を避ける'}),
              this._t({ko: '단백질 최우선', en: 'Prioritize protein', ja: 'タンパク質を最優先'}),
              this._t({ko: '채소 많이', en: 'Lots of vegetables', ja: '野菜をたくさん'})
            ]
          });
        }
      } else if (this.mode === 'nonbinary') {
        if (latest.bodyFatPercentage < 16 || latest.bodyFatPercentage > 24) {
          recommendations.push({
            priority: 'medium',
            title: this._t({ko: '균형 잡힌 식단', en: 'Balanced diet', ja: 'バランスの取れた食事'}),
            description: this._t({ko: '중성적 체형을 위한 체지방 조절', en: 'Body fat control for androgynous physique', ja: '中性的な体型のための体脂肪調節'}),
            details: this._t({ko: '적정 범위 유지', en: 'Maintain optimal range', ja: '適正範囲の維持'}),
            macros: {
              protein: '30%',
              carbs: '40%',
              fats: '30%'
            },
            reason: this._t({ko: '목표 체지방률: 16-24% (현재: {current}%)', en: 'Target body fat: 16-24% (current: {current}%)', ja: '目標体脂肪率: 16-24%（現在: {current}%）'}, {current: latest.bodyFatPercentage.toFixed(1)}),
            tips: [
              this._t({ko: '균형', en: 'Balance', ja: 'バランス'}),
              this._t({ko: '과도하지 않게', en: 'Not excessively', ja: '過度にならないように'}),
              this._t({ko: '자연식품 위주', en: 'Focus on whole foods', ja: '自然食品中心'})
            ]
          });
        }
      }
    }
    
    // 증상 기반 식단 추천
    if (this.symptoms && this.symptoms.length > 0) {
      const latestSymptoms = this.symptoms[this.symptoms.length - 1];
      
      if (latestSymptoms && latestSymptoms.symptoms) {
        // 기분 관련 증상
        const moodSymptoms = latestSymptoms.symptoms.filter(s =>
          ['depression', 'mood_swings', 'anxiety'].includes(s.id) && s.severity >= 3
        );
        
        if (moodSymptoms.length > 0) {
          recommendations.push({
            priority: 'high',
            title: this._t({ko: '호르몬 안정화 식품', en: 'Hormone stabilizing foods', ja: 'ホルモン安定化食品'}),
            description: this._t({ko: '기분 변화 완화를 위한 영양소', en: 'Nutrients for mood stabilization', ja: '気分変化緩和のための栄養素'}),
            details: this._t({ko: '세로토닌 및 호르몬 균형', en: 'Serotonin and hormone balance', ja: 'セロトニンとホルモンバランス'}),
            nutrients: [
              this._t({ko: '오메가-3', en: 'Omega-3', ja: 'オメガ3'}),
              this._t({ko: '비타민 B군', en: 'Vitamin B complex', ja: 'ビタミンB群'}),
              this._t({ko: '마그네슘', en: 'Magnesium', ja: 'マグネシウム'}),
              this._t({ko: '트립토판', en: 'Tryptophan', ja: 'トリプトファン'})
            ],
            foods: [
              this._t({ko: '연어, 고등어', en: 'Salmon, mackerel', ja: 'サーモン、サバ'}),
              this._t({ko: '견과류', en: 'Nuts', ja: 'ナッツ類'}),
              this._t({ko: '바나나', en: 'Bananas', ja: 'バナナ'}),
              this._t({ko: '시금치', en: 'Spinach', ja: 'ほうれん草'}),
              this._t({ko: '다크 초콜릿', en: 'Dark chocolate', ja: 'ダークチョコレート'}),
              this._t({ko: '아보카도', en: 'Avocado', ja: 'アボカド'})
            ],
            reason: this._t({ko: '정신 건강 증상 완화', en: 'Mental health symptom relief', ja: '精神的健康症状の緩和'}),
            tips: [
              this._t({ko: '가공식품 피하기', en: 'Avoid processed foods', ja: '加工食品を避ける'}),
              this._t({ko: '규칙적인 식사', en: 'Regular meals', ja: '規則的な食事'}),
              this._t({ko: '수분 충분히', en: 'Stay hydrated', ja: '十分な水分摂取'})
            ]
          });
        }
        
        // 피로 증상
        const fatigueSymptoms = latestSymptoms.symptoms.filter(s =>
          ['chronic_fatigue', 'hypersomnia'].includes(s.id) && s.severity >= 3
        );
        
        if (fatigueSymptoms.length > 0) {
          recommendations.push({
            priority: 'high',
            title: this._t({ko: '에너지 증진 식단', en: 'Energy boosting diet', ja: 'エネルギー増進食事'}),
            description: this._t({ko: '피로 회복 및 에너지 증진', en: 'Fatigue recovery and energy boost', ja: '疲労回復とエネルギー増進'}),
            details: this._t({ko: '철분, 비타민 B12, 복합 탄수화물', en: 'Iron, vitamin B12, complex carbs', ja: '鉄分、ビタミンB12、複合炭水化物'}),
            nutrients: [
              this._t({ko: '철분', en: 'Iron', ja: '鉄分'}),
              this._t({ko: '비타민 B12', en: 'Vitamin B12', ja: 'ビタミンB12'}),
              this._t({ko: '코엔자임 Q10', en: 'Coenzyme Q10', ja: 'コエンザイムQ10'}),
              this._t({ko: '복합 탄수화물', en: 'Complex carbohydrates', ja: '複合炭水化物'})
            ],
            foods: [
              this._t({ko: '소고기, 간', en: 'Beef, liver', ja: '牛肉、レバー'}),
              this._t({ko: '시금치, 케일', en: 'Spinach, kale', ja: 'ほうれん草、ケール'}),
              this._t({ko: '퀴노아, 현미', en: 'Quinoa, brown rice', ja: 'キヌア、玄米'}),
              this._t({ko: '렌틸콩', en: 'Lentils', ja: 'レンズ豆'}),
              this._t({ko: '베리류', en: 'Berries', ja: 'ベリー類'})
            ],
            reason: this._t({ko: '만성 피로 개선', en: 'Chronic fatigue improvement', ja: '慢性疲労の改善'}),
            tips: [
              this._t({ko: '카페인 과다 피하기', en: 'Avoid excess caffeine', ja: 'カフェインの過剰摂取を避ける'}),
              this._t({ko: '규칙적 식사', en: 'Regular meals', ja: '規則的な食事'}),
              this._t({ko: '충분한 수면', en: 'Adequate sleep', ja: '十分な睡眠'})
            ]
          });
        }
        
        // 피부 증상
        const skinSymptoms = latestSymptoms.symptoms.filter(s =>
          ['cystic_acne', 'acne_ftm', 'xeroderma'].includes(s.id) && s.severity >= 3
        );
        
        if (skinSymptoms.length > 0) {
          recommendations.push({
            priority: 'medium',
            title: this._t({ko: '피부 건강 식단', en: 'Skin health diet', ja: '肌の健康食事'}),
            description: this._t({ko: '피부 개선을 위한 영양', en: 'Nutrition for skin improvement', ja: '肌改善のための栄養'}),
            details: this._t({ko: '항산화, 수분, 비타민', en: 'Antioxidants, hydration, vitamins', ja: '抗酸化、水分、ビタミン'}),
            nutrients: [
              this._t({ko: '비타민 A, C, E', en: 'Vitamins A, C, E', ja: 'ビタミンA, C, E'}),
              this._t({ko: '아연', en: 'Zinc', ja: '亜鉛'}),
              this._t({ko: '오메가-3', en: 'Omega-3', ja: 'オメガ3'}),
              this._t({ko: '수분', en: 'Hydration', ja: '水分'})
            ],
            foods: [
              this._t({ko: '당근, 고구마', en: 'Carrots, sweet potatoes', ja: 'にんじん、さつまいも'}),
              this._t({ko: '베리류', en: 'Berries', ja: 'ベリー類'}),
              this._t({ko: '견과류', en: 'Nuts', ja: 'ナッツ類'}),
              this._t({ko: '녹색 채소', en: 'Green vegetables', ja: '緑黄色野菜'}),
              this._t({ko: '물 (2-3L/일)', en: 'Water (2-3L/day)', ja: '水（2-3L/日）'})
            ],
            reason: this._t({ko: '피부 트러블 개선', en: 'Skin trouble improvement', ja: '肌トラブルの改善'}),
            tips: [
              this._t({ko: '유제품 줄이기', en: 'Reduce dairy', ja: '乳製品を減らす'}),
              this._t({ko: '설탕 피하기', en: 'Avoid sugar', ja: '砂糖を避ける'}),
              this._t({ko: '물 많이', en: 'Drink plenty of water', ja: '水をたくさん'}),
              this._t({ko: '가공식품 NO', en: 'No processed foods', ja: '加工食品NG'})
            ]
          });
        }
      }
    }
    
    // 기본 권장사항
    recommendations.push({
      priority: 'low',
      title: this._t({ko: '수분 섭취', en: 'Hydration', ja: '水分摂取'}),
      description: this._t({ko: '충분한 물 섭취', en: 'Adequate water intake', ja: '十分な水分摂取'}),
      details: this._t({ko: '하루 2-3리터', en: '2-3 liters per day', ja: '1日2-3リットル'}),
      benefits: [
        this._t({ko: '신진대사 촉진', en: 'Boost metabolism', ja: '新陳代謝の促進'}),
        this._t({ko: '독소 배출', en: 'Toxin elimination', ja: '毒素排出'}),
        this._t({ko: '피부 개선', en: 'Skin improvement', ja: '肌の改善'}),
        this._t({ko: '소화 개선', en: 'Improved digestion', ja: '消化の改善'}),
        this._t({ko: '체중 관리', en: 'Weight management', ja: '体重管理'})
      ],
      reason: this._t({ko: '전반적인 건강', en: 'Overall health', ja: '全般的な健康'}),
      tips: [
        this._t({ko: '식사 30분 전 물', en: 'Water 30 min before meals', ja: '食事30分前に水'}),
        this._t({ko: '운동 중 수분', en: 'Hydrate during exercise', ja: '運動中の水分補給'}),
        this._t({ko: '카페인은 탈수 주의', en: 'Caffeine causes dehydration', ja: 'カフェインは脱水に注意'})
      ]
    });
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
  
  // ========================================
  // 5. 약물 조정 추천
  // ========================================
  
  /**
   * 약물 복용량 조정 추천
   */
  recommendMedication() {
    const recommendations = [];
    
    if (this.measurements.length === 0) return recommendations;
    
    const latest = this.measurements[this.measurements.length - 1];
    
    // 호르몬 수치 기반 추천
    if (this.mode === 'mtf') {
      // 에스트로겐
      if (latest.estrogenLevel) {
        const eLevel = parseFloat(latest.estrogenLevel);
        
        if (eLevel < 100) {
          recommendations.push({
            priority: 'high',
            type: 'increase',
            medication: 'estradiol',
            title: this._t({ko: '에스트라디올 증량 고려', en: 'Consider increasing estradiol', ja: 'エストラジオール増量を検討'}),
            description: this._t({ko: '에스트로겐 수치가 목표 범위보다 낮습니다', en: 'Estrogen levels are below target range', ja: 'エストロゲン値が目標範囲より低いです'}),
            currentLevel: eLevel,
            targetRange: '100-200 pg/ml',
            action: this._t({ko: '의사와 상담하여 복용량 조정', en: 'Consult doctor to adjust dosage', ja: '医師に相談して用量調整'}),
            warnings: [
              this._t({ko: '자가 조정 금지', en: 'Do not self-adjust', ja: '自己調整禁止'}),
              this._t({ko: '정기 혈액 검사', en: 'Regular blood tests', ja: '定期的な血液検査'})
            ],
            possibleCauses: [
              this._t({ko: '복용량 부족', en: 'Insufficient dosage', ja: '用量不足'}),
              this._t({ko: '흡수율 낮음', en: 'Low absorption rate', ja: '吸収率が低い'}),
              this._t({ko: '대사 빠름', en: 'Fast metabolism', ja: '代謝が速い'})
            ]
          });
        } else if (eLevel > 200) {
          recommendations.push({
            priority: 'high',
            type: 'decrease',
            medication: 'estradiol',
            title: this._t({ko: '에스트라디올 감량 고려', en: 'Consider reducing estradiol', ja: 'エストラジオール減量を検討'}),
            description: this._t({ko: '에스트로겐 수치가 높아 혈전 위험 증가', en: 'High estrogen levels increase blood clot risk', ja: 'エストロゲン値が高く血栓リスク増加'}),
            currentLevel: eLevel,
            targetRange: '100-200 pg/ml',
            action: this._t({ko: '즉시 의사 상담 필요', en: 'Immediate doctor consultation needed', ja: '直ちに医師への相談が必要'}),
            warnings: [
              this._t({ko: '혈전 위험', en: 'Blood clot risk', ja: '血栓リスク'}),
              this._t({ko: '간 부담', en: 'Liver strain', ja: '肝臓への負担'}),
              this._t({ko: '두통', en: 'Headaches', ja: '頭痛'}),
              this._t({ko: '메스꺼움', en: 'Nausea', ja: '吐き気'})
            ],
            possibleCauses: [
              this._t({ko: '복용량 과다', en: 'Excessive dosage', ja: '用量過多'}),
              this._t({ko: '대사 느림', en: 'Slow metabolism', ja: '代謝が遅い'})
            ]
          });
        } else {
          recommendations.push({
            priority: 'low',
            type: 'maintain',
            medication: 'estradiol',
            title: this._t({ko: '에스트라디올 복용량 유지', en: 'Maintain estradiol dosage', ja: 'エストラジオール用量を維持'}),
            description: this._t({ko: '현재 수치가 이상적입니다', en: 'Current levels are ideal', ja: '現在の数値は理想的です'}),
            currentLevel: eLevel,
            targetRange: '100-200 pg/ml',
            action: this._t({ko: '현재 복용량 유지', en: 'Maintain current dosage', ja: '現在の用量を維持'})
          });
        }
      }
      
      // 테스토스테론
      if (latest.testosteroneLevel) {
        const tLevel = parseFloat(latest.testosteroneLevel);
        
        if (tLevel > 50) {
          recommendations.push({
            priority: 'high',
            type: 'increase',
            medication: 'antiAndrogen',
            title: this._t({ko: '항안드로겐 증량 고려', en: 'Consider increasing anti-androgen', ja: '抗アンドロゲン増量を検討'}),
            description: this._t({ko: '테스토스테론 억제가 충분하지 않습니다', en: 'Testosterone suppression is insufficient', ja: 'テストステロン抑制が十分ではありません'}),
            currentLevel: tLevel,
            targetRange: '< 50 ng/ml',
            action: this._t({ko: '의사와 상담하여 복용량 조정', en: 'Consult doctor to adjust dosage', ja: '医師に相談して用量調整'}),
            warnings: [
              this._t({ko: '정기 검사', en: 'Regular check-ups', ja: '定期検査'}),
              this._t({ko: '부작용 모니터링', en: 'Monitor side effects', ja: '副作用のモニタリング'})
            ],
            possibleOptions: [
              this._t({ko: '스피로노락톤 증량', en: 'Increase spironolactone', ja: 'スピロノラクトン増量'}),
              this._t({ko: '비칼루타미드 추가', en: 'Add bicalutamide', ja: 'ビカルタミド追加'}),
              this._t({ko: 'GnRH 작용제 고려', en: 'Consider GnRH agonist', ja: 'GnRH作動薬を検討'})
            ]
          });
        } else {
          recommendations.push({
            priority: 'low',
            type: 'maintain',
            medication: 'antiAndrogen',
            title: this._t({ko: '항안드로겐 복용량 유지', en: 'Maintain anti-androgen dosage', ja: '抗アンドロゲン用量を維持'}),
            description: this._t({ko: '테스토스테론 억제 효과 좋음', en: 'Testosterone suppression is effective', ja: 'テストステロン抑制効果良好'}),
            currentLevel: tLevel,
            targetRange: '< 50 ng/ml',
            action: this._t({ko: '현재 복용량 유지', en: 'Maintain current dosage', ja: '現在の用量を維持'})
          });
        }
      }
      
    } else if (this.mode === 'ftm') {
      // 테스토스테론
      if (latest.testosteroneLevel) {
        const tLevel = parseFloat(latest.testosteroneLevel);
        
        if (tLevel < 300) {
          recommendations.push({
            priority: 'high',
            type: 'increase',
            medication: 'testosterone',
            title: this._t({ko: '테스토스테론 증량 고려', en: 'Consider increasing testosterone', ja: 'テストステロン増量を検討'}),
            description: this._t({ko: '테스토스테론 수치가 목표 범위보다 낮습니다', en: 'Testosterone levels are below target range', ja: 'テストステロン値が目標範囲より低いです'}),
            currentLevel: tLevel,
            targetRange: '300-1000 ng/ml',
            action: this._t({ko: '의사와 상담하여 복용량 조정', en: 'Consult doctor to adjust dosage', ja: '医師に相談して用量調整'}),
            warnings: [
              this._t({ko: '정기 혈액 검사', en: 'Regular blood tests', ja: '定期的な血液検査'}),
              this._t({ko: '부작용 모니터링', en: 'Monitor side effects', ja: '副作用のモニタリング'})
            ],
            possibleCauses: [
              this._t({ko: '투여량 부족', en: 'Insufficient dosage', ja: '投与量不足'}),
              this._t({ko: '투여 간격 너무 김', en: 'Dosing interval too long', ja: '投与間隔が長すぎる'}),
              this._t({ko: '흡수율 낮음', en: 'Low absorption rate', ja: '吸収率が低い'})
            ]
          });
        } else if (tLevel > 1000) {
          recommendations.push({
            priority: 'high',
            type: 'decrease',
            medication: 'testosterone',
            title: this._t({ko: '테스토스테론 감량 필요', en: 'Testosterone reduction needed', ja: 'テストステロン減量が必要'}),
            description: this._t({ko: '수치가 너무 높아 부작용 위험', en: 'Levels too high, risk of side effects', ja: '数値が高すぎて副作用リスク'}),
            currentLevel: tLevel,
            targetRange: '300-1000 ng/ml',
            action: this._t({ko: '즉시 의사 상담', en: 'Immediate doctor consultation', ja: '直ちに医師に相談'}),
            warnings: [
              this._t({ko: '적혈구 증가', en: 'Increased red blood cells', ja: '赤血球増加'}),
              this._t({ko: '혈압 상승', en: 'Blood pressure increase', ja: '血圧上昇'}),
              this._t({ko: '간 부담', en: 'Liver strain', ja: '肝臓への負担'}),
              this._t({ko: '공격성 증가', en: 'Increased aggression', ja: '攻撃性の増加'})
            ],
            possibleCauses: [
              this._t({ko: '투여량 과다', en: 'Excessive dosage', ja: '投与量過多'}),
              this._t({ko: '투여 간격 짧음', en: 'Dosing interval too short', ja: '投与間隔が短い'})
            ]
          });
        } else {
          recommendations.push({
            priority: 'low',
            type: 'maintain',
            medication: 'testosterone',
            title: this._t({ko: '테스토스테론 복용량 유지', en: 'Maintain testosterone dosage', ja: 'テストステロン用量を維持'}),
            description: this._t({ko: '현재 수치가 이상적입니다', en: 'Current levels are ideal', ja: '現在の数値は理想的です'}),
            currentLevel: tLevel,
            targetRange: '300-1000 ng/ml',
            action: this._t({ko: '현재 복용량 유지', en: 'Maintain current dosage', ja: '現在の用量を維持'})
          });
        }
      }
      
      // 에스트로겐 (억제 필요 시)
      if (latest.estrogenLevel && latest.estrogenLevel > 50) {
        recommendations.push({
          priority: 'medium',
          type: 'add',
          medication: 'aromatase_inhibitor',
          title: this._t({ko: '아로마타제 억제제 고려', en: 'Consider aromatase inhibitor', ja: 'アロマターゼ阻害剤を検討'}),
          description: this._t({ko: '에스트로겐 수치가 높습니다', en: 'Estrogen levels are high', ja: 'エストロゲン値が高いです'}),
          currentLevel: latest.estrogenLevel,
          targetRange: '< 50 pg/ml',
          action: this._t({ko: '의사와 상담', en: 'Consult doctor', ja: '医師に相談'}),
          warnings: [
            this._t({ko: '관절통 주의', en: 'Watch for joint pain', ja: '関節痛に注意'}),
            this._t({ko: '뼈 건강 모니터링', en: 'Monitor bone health', ja: '骨の健康をモニタリング'})
          ],
          possibleOptions: [
            this._t({ko: '아나스트로졸 저용량', en: 'Low-dose anastrozole', ja: 'アナストロゾール低用量'}),
            this._t({ko: '테스토스테론 투여 경로 변경', en: 'Change testosterone administration route', ja: 'テストステロン投与経路の変更'})
          ]
        });
      }
      
    } else if (this.mode === 'nonbinary') {
      // 개인 목표에 따라 다름
      recommendations.push({
        priority: 'medium',
        type: 'balance',
        medication: 'custom',
        title: this._t({ko: '개인화된 호르몬 균형', en: 'Personalized hormone balance', ja: '個別化されたホルモンバランス'}),
        description: this._t({ko: '목표하는 호르몬 수치에 따라 조정', en: 'Adjust according to target hormone levels', ja: '目標ホルモン値に応じて調整'}),
        action: this._t({ko: '의사와 상세 상담 필요', en: 'Detailed doctor consultation needed', ja: '医師との詳細な相談が必要'}),
        note: this._t({ko: '논바이너리 호르몬 요법은 개인차가 크므로 전문가와 긴밀히 협의', en: 'Non-binary hormone therapy varies greatly, work closely with specialists', ja: 'ノンバイナリーホルモン療法は個人差が大きいため専門家と緊密に協議'})
      });
    }
    
    // 증상 기반 약물 추천
    if (this.symptoms && this.symptoms.length > 0) {
      const latestSymptoms = this.symptoms[this.symptoms.length - 1];
      
      if (latestSymptoms && latestSymptoms.symptoms) {
        // 여유증 증상
        const gynecoSymptoms = latestSymptoms.symptoms.filter(s =>
          s.id === 'gynecomastia' && s.severity >= 3
        );
        
        if (gynecoSymptoms.length > 0 && this.mode === 'ftm') {
          recommendations.push({
            priority: 'high',
            type: 'add',
            medication: 'serm',
            title: this._t({ko: 'SERM 사용 고려', en: 'Consider SERM use', ja: 'SERMの使用を検討'}),
            description: this._t({ko: '여유증 증상 완화', en: 'Gynecomastia symptom relief', ja: '女性化乳房症状の緩和'}),
            action: this._t({ko: '의사 상담', en: 'Consult doctor', ja: '医師に相談'}),
            possibleOptions: [
              this._t({ko: '랄록시펜 (Raloxifene) - 추천', en: 'Raloxifene - recommended', ja: 'ラロキシフェン（Raloxifene）- 推奨'}),
              this._t({ko: '타목시펜 (Tamoxifen)', en: 'Tamoxifen', ja: 'タモキシフェン（Tamoxifen）'})
            ],
            warnings: [
              this._t({ko: '시력 검사', en: 'Eye examination', ja: '視力検査'}),
              this._t({ko: '혈전 위험 낮음', en: 'Low blood clot risk', ja: '血栓リスクは低い'})
            ]
          });
        }
      }
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
  
  // ========================================
  // 6. 습관 추천
  // ========================================
  
  /**
   * 생활 습관 추천
   */
  recommendHabits() {
    const recommendations = [];
    
    // 증상 기반 습관 추천
    if (this.symptoms && this.symptoms.length > 0) {
      const latestSymptoms = this.symptoms[this.symptoms.length - 1];
      
      if (latestSymptoms && latestSymptoms.symptoms) {
        // 수면 관련
        const sleepSymptoms = latestSymptoms.symptoms.filter(s =>
          ['insomnia', 'hypersomnia', 'chronic_fatigue'].includes(s.id) && s.severity >= 3
        );
        
        if (sleepSymptoms.length > 0) {
          recommendations.push({
            category: 'sleep',
            priority: 'high',
            title: this._t({ko: '수면 개선', en: 'Improve sleep', ja: '睡眠の改善'}),
            description: this._t({ko: '호르몬 안정화와 회복을 위한 충분한 수면', en: 'Adequate sleep for hormone stabilization and recovery', ja: 'ホルモン安定化と回復のための十分な睡眠'}),
            details: this._t({ko: '7-8시간 수면, 일정한 수면 시간', en: '7-8 hours sleep, consistent sleep schedule', ja: '7-8時間の睡眠、一定の睡眠時間'}),
            benefits: [
              this._t({ko: '호르몬 균형', en: 'Hormone balance', ja: 'ホルモンバランス'}),
              this._t({ko: '스트레스 감소', en: 'Stress reduction', ja: 'ストレス軽減'}),
              this._t({ko: '근육 회복', en: 'Muscle recovery', ja: '筋肉の回復'}),
              this._t({ko: '면역력 증진', en: 'Immune system boost', ja: '免疫力増進'}),
              this._t({ko: '정신 건강', en: 'Mental health', ja: '精神的健康'})
            ],
            tips: [
              this._t({ko: '같은 시간에 자고 일어나기', en: 'Sleep and wake at the same time', ja: '同じ時間に寝て起きる'}),
              this._t({ko: '자기 2시간 전 전자기기 끄기', en: 'Turn off electronics 2 hours before bed', ja: '就寝2時間前に電子機器をオフ'}),
              this._t({ko: '침실 어둡고 시원하게', en: 'Keep bedroom dark and cool', ja: '寝室を暗く涼しく'}),
              this._t({ko: '카페인 오후 이후 피하기', en: 'Avoid caffeine after afternoon', ja: '午後以降のカフェインを避ける'}),
              this._t({ko: '낮잠 20분 이내', en: 'Naps under 20 minutes', ja: '昼寝は20分以内'})
            ]
          });
        }
        
        // 스트레스/정신 건강
        const mentalSymptoms = latestSymptoms.symptoms.filter(s =>
          ['anxiety', 'depression', 'mood_swings', 'aggression'].includes(s.id) && s.severity >= 3
        );
        
        if (mentalSymptoms.length > 0) {
          recommendations.push({
            category: 'stress',
            priority: 'high',
            title: this._t({ko: '스트레스 관리', en: 'Stress management', ja: 'ストレス管理'}),
            description: this._t({ko: '코르티솔 조절을 통한 호르몬 안정화', en: 'Hormone stabilization through cortisol control', ja: 'コルチゾール調節によるホルモン安定化'}),
            details: this._t({ko: '정신 건강 케어', en: 'Mental health care', ja: 'メンタルヘルスケア'}),
            benefits: [
              this._t({ko: '기분 안정', en: 'Mood stability', ja: '気分の安定'}),
              this._t({ko: '호르몬 균형', en: 'Hormone balance', ja: 'ホルモンバランス'}),
              this._t({ko: '수면 개선', en: 'Improved sleep', ja: '睡眠の改善'}),
              this._t({ko: '면역력 증진', en: 'Immune system boost', ja: '免疫力増進'}),
              this._t({ko: '전반적 건강', en: 'Overall health', ja: '全般的な健康'})
            ],
            activities: [
              this._t({ko: '명상 (하루 10-15분)', en: 'Meditation (10-15 min/day)', ja: '瞑想（1日10-15分）'}),
              this._t({ko: '요가', en: 'Yoga', ja: 'ヨガ'}),
              this._t({ko: '호흡 운동 (4-7-8 호흡법)', en: 'Breathing exercises (4-7-8 method)', ja: '呼吸法（4-7-8呼吸法）'}),
              this._t({ko: '산책', en: 'Walking', ja: '散歩'}),
              this._t({ko: '취미 활동', en: 'Hobbies', ja: '趣味活動'}),
              this._t({ko: '저널링', en: 'Journaling', ja: 'ジャーナリング'})
            ],
            tips: [
              this._t({ko: '매일 조금씩 실천', en: 'Practice a little every day', ja: '毎日少しずつ実践'}),
              this._t({ko: '자신에게 맞는 방법 찾기', en: 'Find what works for you', ja: '自分に合った方法を見つける'}),
              this._t({ko: '필요시 전문가 도움', en: 'Seek professional help if needed', ja: '必要に応じて専門家の助けを'}),
              this._t({ko: '지지 그룹 참여', en: 'Join support groups', ja: 'サポートグループに参加'})
            ]
          });
        }
      }
    }
    
    // 정기 측정 유지
    if (this.measurements.length >= 4) {
      recommendations.push({
        category: 'tracking',
        priority: 'low',
        title: this._t({ko: '정기 측정 유지', en: 'Maintain regular tracking', ja: '定期測定の維持'}),
        description: this._t({ko: '{count}주 연속 기록 중!', en: '{count} weeks of consecutive tracking!', ja: '{count}週連続記録中！'}, {count: this.measurements.length}),
        details: this._t({ko: '일관성 있는 측정으로 정확한 추세 파악', en: 'Accurate trend tracking through consistent measurement', ja: '一貫した測定で正確なトレンド把握'}),
        benefits: [
          this._t({ko: '정확한 변화 추적', en: 'Accurate change tracking', ja: '正確な変化の追跡'}),
          this._t({ko: '목표 달성률 향상', en: 'Improved goal achievement', ja: '目標達成率の向上'}),
          this._t({ko: '문제 조기 발견', en: 'Early problem detection', ja: '問題の早期発見'}),
          this._t({ko: '동기부여', en: 'Motivation', ja: 'モチベーション'}),
          this._t({ko: '의사 소통에 유용', en: 'Useful for doctor communication', ja: '医師とのコミュニケーションに有用'})
        ],
        tips: [
          this._t({ko: '같은 요일, 같은 시간', en: 'Same day, same time', ja: '同じ曜日、同じ時間'}),
          this._t({ko: '아침 공복 상태', en: 'Morning, empty stomach', ja: '朝の空腹状態'}),
          this._t({ko: '같은 옷 또는 속옷만', en: 'Same clothes or underwear only', ja: '同じ服か下着のみ'}),
          this._t({ko: '화장실 다녀온 후', en: 'After using the bathroom', ja: 'トイレに行った後'}),
          this._t({ko: '운동 전', en: 'Before exercise', ja: '運動前'})
        ]
      });
    }
    
    // 수분 섭취
    recommendations.push({
      category: 'hydration',
      priority: 'medium',
      title: this._t({ko: '충분한 수분 섭취', en: 'Adequate hydration', ja: '十分な水分摂取'}),
      description: this._t({ko: '하루 2-3리터 물 마시기', en: 'Drink 2-3 liters of water daily', ja: '1日2-3リットルの水を飲む'}),
      details: this._t({ko: '신진대사 및 호르몬 대사', en: 'Metabolism and hormone metabolism', ja: '新陳代謝とホルモン代謝'}),
      benefits: [
        this._t({ko: '피부 개선', en: 'Skin improvement', ja: '肌の改善'}),
        this._t({ko: '소화 개선', en: 'Improved digestion', ja: '消化の改善'}),
        this._t({ko: '독소 배출', en: 'Toxin elimination', ja: '毒素排出'}),
        this._t({ko: '체중 관리', en: 'Weight management', ja: '体重管理'}),
        this._t({ko: '신진대사 촉진', en: 'Boost metabolism', ja: '新陳代謝の促進'})
      ],
      tips: [
        this._t({ko: '아침에 물 한 잔', en: 'A glass of water in the morning', ja: '朝にコップ一杯の水'}),
        this._t({ko: '식사 30분 전 물', en: 'Water 30 min before meals', ja: '食事30分前に水'}),
        this._t({ko: '운동 시 충분히', en: 'Plenty during exercise', ja: '運動時は十分に'}),
        this._t({ko: '갈증 느끼기 전 마시기', en: 'Drink before feeling thirsty', ja: '喉が渇く前に飲む'}),
        this._t({ko: '물병 항상 휴대', en: 'Always carry a water bottle', ja: '水筒を常に携帯'})
      ]
    });
    
    // 모드별 특화 습관
    if (this.mode === 'mtf') {
      recommendations.push({
        category: 'skincare',
        priority: 'low',
        title: this._t({ko: '피부 관리', en: 'Skincare', ja: 'スキンケア'}),
        description: this._t({ko: '여성적 피부 유지', en: 'Maintaining feminine skin', ja: '女性的な肌の維持'}),
        details: this._t({ko: '보습 및 관리', en: 'Moisturizing and care', ja: '保湿とケア'}),
        tips: [
          this._t({ko: '보습제 매일', en: 'Moisturizer daily', ja: '毎日保湿剤'}),
          this._t({ko: '자외선 차단', en: 'Sun protection', ja: '紫外線対策'}),
          this._t({ko: '순한 클렌징', en: 'Gentle cleansing', ja: '優しいクレンジング'}),
          this._t({ko: '충분한 수분', en: 'Adequate hydration', ja: '十分な水分'}),
          this._t({ko: '비타민 C 세럼', en: 'Vitamin C serum', ja: 'ビタミンCセラム'})
        ]
      });
    } else if (this.mode === 'ftm') {
      recommendations.push({
        category: 'hygiene',
        priority: 'low',
        title: this._t({ko: '피부 및 위생 관리', en: 'Skin and hygiene care', ja: '肌と衛生管理'}),
        description: this._t({ko: '여드름 및 체취 관리', en: 'Acne and body odor management', ja: 'ニキビと体臭管理'}),
        details: this._t({ko: '테스토스테론 부작용 관리', en: 'Testosterone side effect management', ja: 'テストステロン副作用管理'}),
        tips: [
          this._t({ko: '하루 2회 샤워', en: 'Shower twice daily', ja: '1日2回シャワー'}),
          this._t({ko: '여드름 전용 클렌저', en: 'Acne-specific cleanser', ja: 'ニキビ専用クレンザー'}),
          this._t({ko: '데오드란트 사용', en: 'Use deodorant', ja: 'デオドラント使用'}),
          this._t({ko: '면도 관리', en: 'Shaving care', ja: 'シェービングケア'}),
          this._t({ko: '침구 자주 세탁', en: 'Wash bedding frequently', ja: '寝具を頻繁に洗濯'})
        ]
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
  
  // ========================================
  // 7. 주간 포커스 선택
  // ========================================
  
  /**
   * 이번 주 집중할 목표 선택
   */
  selectWeeklyFocus() {
    if (!this.targets || Object.keys(this.targets).length === 0) {
      return null;
    }
    
    if (this.measurements.length === 0) {
      return {
        goal: this._t({ko: '첫 측정 시작', en: 'Start first measurement', ja: '初回測定開始'}),
        tip: this._t({ko: '정확한 측정을 위해 아침 공복 상태에서 측정하세요!', en: 'Measure on an empty stomach in the morning for accuracy!', ja: '正確な測定のため朝の空腹状態で測定してください！'})
      };
    }
    
    const latest = this.measurements[this.measurements.length - 1];
    const gaps = [];
    
    // 목표와의 차이 계산
    Object.keys(this.targets).forEach(key => {
      if (latest[key]) {
        const target = parseFloat(this.targets[key]);
        const current = parseFloat(latest[key]);
        const diff = Math.abs(current - target);
        const percentGap = (diff / target) * 100;
        
        gaps.push({
          key,
          diff,
          percentGap,
          shouldIncrease: current < target
        });
      }
    });
    
    // 가장 달성하기 쉬운 목표 선택 (gap이 작지만 0은 아닌 것)
    const achievable = gaps
      .filter(g => g.diff > 0.5 && g.percentGap < 10)
      .sort((a, b) => a.percentGap - b.percentGap);
    
    if (achievable.length > 0) {
      const focus = achievable[0];
      return this.generateFocusTip(focus.key, focus.diff, focus.shouldIncrease);
    }
    
    // 아니면 가장 gap이 큰 것
    const largest = gaps.sort((a, b) => b.percentGap - a.percentGap)[0];
    if (largest) {
      return this.generateFocusTip(largest.key, largest.diff, largest.shouldIncrease);
    }
    
    return {
      goal: this._t({ko: '현재 상태 유지', en: 'Maintain current state', ja: '現在の状態を維持'}),
      tip: this._t({ko: '훌륭해요! 지금 하시는 것을 계속 유지하세요!', en: 'Great job! Keep up the good work!', ja: '素晴らしい！今のまま続けてください！'})
    };
  }
  
  generateFocusTip(key, diff, shouldIncrease) {
    const keyNames = {
      weight: this._t({ko: '체중', en: 'Weight', ja: '体重'}),
      waist: this._t({ko: '허리', en: 'Waist', ja: 'ウエスト'}),
      hips: this._t({ko: '엉덩이', en: 'Hips', ja: 'ヒップ'}),
      chest: this._t({ko: '가슴', en: 'Chest', ja: '胸'}),
      shoulder: this._t({ko: '어깨', en: 'Shoulders', ja: '肩'}),
      thigh: this._t({ko: '허벅지', en: 'Thighs', ja: '太もも'}),
      arm: this._t({ko: '팔뚝', en: 'Arms', ja: '腕'})
    };
    
    const tips = {
      weight: shouldIncrease 
        ? this._t({ko: '칼로리 증가, 근력 운동, 충분한 단백질', en: 'Increase calories, strength training, adequate protein', ja: 'カロリー増加、筋力トレーニング、十分なタンパク質'})
        : this._t({ko: '유산소 운동, 칼로리 조절, 수분 섭취', en: 'Cardio exercise, calorie control, hydration', ja: '有酸素運動、カロリー調整、水分摂取'}),
      waist: shouldIncrease
        ? this._t({ko: '코어 운동, 복부 단련', en: 'Core exercises, abdominal training', ja: 'コア運動、腹部トレーニング'})
        : this._t({ko: '유산소 + 복부 운동, 탄수화물 조절', en: 'Cardio + ab exercises, carb control', ja: '有酸素＋腹部運動、炭水化物調整'}),
      hips: shouldIncrease
        ? this._t({ko: '하체 운동 (스쿼트, 힙 스러스트), 충분한 칼로리', en: 'Lower body exercises (squats, hip thrusts), adequate calories', ja: '下半身運動（スクワット、ヒップスラスト）、十分なカロリー'})
        : this._t({ko: '유산소 운동, 칼로리 조절', en: 'Cardio exercise, calorie control', ja: '有酸素運動、カロリー調整'}),
      chest: shouldIncrease
        ? this._t({ko: '상체 운동, 충분한 영양', en: 'Upper body exercises, adequate nutrition', ja: '上半身運動、十分な栄養'})
        : this._t({ko: '상체 근력 운동, 가슴 발달', en: 'Upper body strength training, chest development', ja: '上半身筋力運動、胸の発達'}),
      shoulder: shouldIncrease
        ? this._t({ko: '숄더 프레스, 사이드 레터럴 레이즈', en: 'Shoulder press, side lateral raises', ja: 'ショルダープレス、サイドレイズ'})
        : this._t({ko: '상체 운동 줄이기, 유산소 증가', en: 'Reduce upper body exercises, increase cardio', ja: '上半身運動を減らし、有酸素増加'}),
      thigh: shouldIncrease
        ? this._t({ko: '하체 운동, 스쿼트, 런지', en: 'Lower body exercises, squats, lunges', ja: '下半身運動、スクワット、ランジ'})
        : this._t({ko: '유산소 운동, 칼로리 조절', en: 'Cardio exercise, calorie control', ja: '有酸素運動、カロリー調整'})
    };
    
    return {
      goal: this._t({ko: '{name} {dir}{diff} 목표', en: '{name} {dir}{diff} target', ja: '{name} {dir}{diff} 目標'}, {name: keyNames[key] || key, dir: shouldIncrease ? '+' : '-', diff: diff.toFixed(1)}),
      tip: tips[key] || this._t({ko: '꾸준한 노력이 중요합니다!', en: 'Consistent effort is key!', ja: '地道な努力が大切です！'})
    };
  }
  
  // ========================================
  // 8. 유틸리티
  // ========================================
  
  calculateProgress() {
    if (this.measurements.length === 0) return {};
    
    const latest = this.measurements[this.measurements.length - 1];
    const progress = {};
    
    Object.keys(this.targets).forEach(key => {
      if (latest[key]) {
        const target = parseFloat(this.targets[key]);
        const current = parseFloat(latest[key]);
        const diff = Math.abs(current - target);
        
        progress[key] = {
          current,
          target,
          diff,
          achieved: diff < 0.5
        };
      }
    });
    
    return progress;
  }
}

// ========================================
// 9. Export
// ========================================

export default RecommendationEngine;
