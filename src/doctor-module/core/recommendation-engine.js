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
  constructor(measurements, symptoms, medications, targets, mode) {
    this.measurements = measurements;
    this.symptoms = symptoms;
    this.medications = medications;
    this.targets = targets;
    this.mode = mode;
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
          title: '유산소 운동 증가',
          description: '체중 감소를 위한 유산소 운동',
          details: '주 3-4회, 30-45분',
          exercises: ['걷기', '조깅', '자전거', '수영'],
          reason: `목표 체중까지 ${diff.toFixed(1)}kg 남음`,
          frequency: '주 3-4회',
          duration: '30-45분'
        });
      } else if (diff < -2) {
        recommendations.push({
          category: 'strength',
          priority: 'medium',
          title: '근력 운동',
          description: '체중 증가 및 근육 발달',
          details: '주 3회, 복합 운동 중심',
          exercises: ['스쿼트', '데드리프트', '벤치프레스'],
          reason: `건강한 체중 증가 필요`,
          frequency: '주 3회',
          duration: '45-60분'
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
          title: '하체 집중 운동',
          description: '엉덩이와 허벅지 발달',
          details: '여성적 곡선 만들기',
          exercises: [
            '스쿼트 (힙 중심)',
            '런지',
            '힙 스러스트',
            '레그 프레스',
            '사이드 레그 레이즈'
          ],
          reason: '여성적 하체 라인 형성',
          frequency: '주 3-4회',
          duration: '30-40분',
          tips: ['가벼운 무게, 높은 반복', '힙에 집중', '스트레칭 중요']
        });
      }
      
      // 허리 감소
      if (this.targets.waist && latest.waist > this.targets.waist) {
        recommendations.push({
          category: 'core',
          priority: 'medium',
          title: '복부 운동',
          description: '허리 둘레 감소',
          details: '코어 강화 및 지방 감소',
          exercises: [
            '플랭크',
            '사이드 플랭크',
            '레그 레이즈',
            '크런치',
            '러시안 트위스트'
          ],
          reason: `목표 허리까지 ${(latest.waist - this.targets.waist).toFixed(1)}cm 남음`,
          frequency: '주 4-5회',
          duration: '15-20분',
          tips: ['복근보다 전체 코어', '유산소 병행']
        });
      }
      
      // 상체는 부드럽게
      recommendations.push({
        category: 'upper_body',
        priority: 'low',
        title: '가벼운 상체 운동',
        description: '어깨 축소 및 톤업',
        details: '근육 비대 방지',
        exercises: [
          '가벼운 요가',
          '필라테스',
          '스트레칭',
          '가벼운 덤벨 운동'
        ],
        reason: '여성적 상체 라인 유지',
        frequency: '주 2-3회',
        duration: '20-30분',
        tips: ['무거운 무게 피하기', '유연성 중심']
      });
      
    } else if (this.mode === 'ftm') {
      // FTM: 남성적 체형 강조
      
      // 상체 발달
      recommendations.push({
        category: 'upper_body',
        priority: 'high',
        title: '상체 근력 운동',
        description: '어깨와 가슴 발달',
        details: '남성적 상체 만들기',
        exercises: [
          '벤치프레스',
          '숄더 프레스',
          '풀업/턱걸이',
          '로우',
          '딥스'
        ],
        reason: '남성적 V자 체형 형성',
        frequency: '주 4-5회',
        duration: '45-60분',
        tips: ['무거운 무게', '복합 운동 중심', '충분한 휴식']
      });
      
      // 코어 강화
      recommendations.push({
        category: 'core',
        priority: 'medium',
        title: '복부 코어 운동',
        description: '복근 발달 및 체형 정리',
        details: '남성적 복부 라인',
        exercises: [
          '데드리프트',
          '스쿼트',
          '플랭크',
          '행잉 레그 레이즈',
          '우드찹'
        ],
        reason: '남성적 코어 강화',
        frequency: '주 3-4회',
        duration: '30-40분',
        tips: ['무거운 복합 운동', '체지방 감소 병행']
      });
      
      // 하체는 균형있게
      recommendations.push({
        category: 'lower_body',
        priority: 'medium',
        title: '하체 근력 운동',
        description: '전체적인 근육 발달',
        details: '균형잡힌 하체',
        exercises: [
          '스쿼트',
          '데드리프트',
          '레그 프레스',
          '런지'
        ],
        reason: '전체적인 남성적 체형',
        frequency: '주 2-3회',
        duration: '40-50분',
        tips: ['무거운 무게', '파워 중심']
      });
      
    } else if (this.mode === 'nonbinary') {
      // Non-binary: 균형 잡힌 운동
      
      recommendations.push({
        category: 'balanced',
        priority: 'high',
        title: '균형 잡힌 전신 운동',
        description: '조화로운 체형 만들기',
        details: '과도하지 않은 톤업',
        exercises: [
          '요가',
          '필라테스',
          '수영',
          '가벼운 웨이트',
          '바디웨이트 운동'
        ],
        reason: '중성적이고 건강한 체형',
        frequency: '주 3-4회',
        duration: '30-45분',
        tips: ['균형', '유연성', '적당한 강도']
      });
      
      recommendations.push({
        category: 'cardio',
        priority: 'medium',
        title: '유산소 운동',
        description: '심폐 기능 및 체지방 관리',
        details: '건강한 체형 유지',
        exercises: [
          '조깅',
          '자전거',
          '수영',
          '댄스'
        ],
        reason: '전반적인 건강 증진',
        frequency: '주 2-3회',
        duration: '30-40분'
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
            title: '근육 손실 방지',
            description: '근력 운동 및 단백질 섭취',
            details: '근육량 회복',
            exercises: ['복합 운동 중심', '충분한 단백질'],
            reason: `근육량 ${(previous.muscleMass - latest.muscleMass).toFixed(1)}kg 감소`,
            frequency: '주 3-4회',
            duration: '45-60분',
            tips: ['과도한 유산소 피하기', '충분한 칼로리', '단백질 1.5-2g/kg']
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
            title: '단백질 섭취 증가',
            description: '급격한 체중 감소로 근육 손실 위험',
            details: '고단백 식단으로 근육 보호',
            macros: {
              protein: '체중 1kg당 1.5-2g',
              carbs: '적정 유지',
              fats: '건강한 지방 섭취'
            },
            foods: [
              '닭가슴살, 생선',
              '달걀, 두부',
              '그릭 요거트',
              '프로틴 쉐이크',
              '견과류'
            ],
            reason: `주간 ${Math.abs(weeklyChange).toFixed(1)}kg 감소 (권장: 0.5kg)`,
            tips: ['매 끼니마다 단백질', '식사 5-6회 분산']
          });
        }
        
        // 체중 정체
        if (Math.abs(weeklyChange) < 0.1 && this.targets.weight) {
          const diff = latest.weight - this.targets.weight;
          if (Math.abs(diff) > 2) {
            recommendations.push({
              priority: 'medium',
              title: '칼로리 조정 필요',
              description: '체중 정체 극복',
              details: diff > 0 ? '칼로리 감소' : '칼로리 증가',
              reason: `2주 이상 체중 변화 없음`,
              tips: diff > 0 
                ? ['하루 200-300kcal 감소', '탄수화물 약간 줄이기']
                : ['하루 200-300kcal 증가', '식사 횟수 늘리기']
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
            title: '건강한 지방 섭취',
            description: '여성화를 위한 적정 체지방률 유지',
            details: '호르몬 균형 및 지방 재분배',
            macros: {
              fats: '총 칼로리의 25-30%'
            },
            foods: [
              '아보카도',
              '올리브유',
              '견과류',
              '연어',
              '치즈 (적당량)'
            ],
            reason: `목표 체지방률: 20-28% (현재: ${latest.bodyFatPercentage.toFixed(1)}%)`,
            tips: ['건강한 불포화 지방', '오메가-3 풍부 식품']
          });
        }
      } else if (this.mode === 'ftm') {
        if (latest.bodyFatPercentage > 20) {
          recommendations.push({
            priority: 'medium',
            title: '체지방 감소 식단',
            description: '남성적 체형을 위한 체지방 관리',
            details: '고단백 저탄수화물',
            macros: {
              protein: '높게 (40%)',
              carbs: '중간 (30%)',
              fats: '적정 (30%)'
            },
            foods: [
              '닭가슴살, 소고기',
              '생선',
              '달걀',
              '브로콜리, 시금치',
              '현미, 고구마 (적정량)'
            ],
            reason: `목표 체지방률: 10-18% (현재: ${latest.bodyFatPercentage.toFixed(1)}%)`,
            tips: ['정제 탄수화물 피하기', '단백질 최우선', '채소 많이']
          });
        }
      } else if (this.mode === 'nonbinary') {
        if (latest.bodyFatPercentage < 16 || latest.bodyFatPercentage > 24) {
          recommendations.push({
            priority: 'medium',
            title: '균형 잡힌 식단',
            description: '중성적 체형을 위한 체지방 조절',
            details: '적정 범위 유지',
            macros: {
              protein: '30%',
              carbs: '40%',
              fats: '30%'
            },
            reason: `목표 체지방률: 16-24% (현재: ${latest.bodyFatPercentage.toFixed(1)}%)`,
            tips: ['균형', '과도하지 않게', '자연식품 위주']
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
            title: '호르몬 안정화 식품',
            description: '기분 변화 완화를 위한 영양소',
            details: '세로토닌 및 호르몬 균형',
            nutrients: [
              '오메가-3',
              '비타민 B군',
              '마그네슘',
              '트립토판'
            ],
            foods: [
              '연어, 고등어',
              '견과류',
              '바나나',
              '시금치',
              '다크 초콜릿',
              '아보카도'
            ],
            reason: '정신 건강 증상 완화',
            tips: ['가공식품 피하기', '규칙적인 식사', '수분 충분히']
          });
        }
        
        // 피로 증상
        const fatigueSymptoms = latestSymptoms.symptoms.filter(s =>
          ['chronic_fatigue', 'hypersomnia'].includes(s.id) && s.severity >= 3
        );
        
        if (fatigueSymptoms.length > 0) {
          recommendations.push({
            priority: 'high',
            title: '에너지 증진 식단',
            description: '피로 회복 및 에너지 증진',
            details: '철분, 비타민 B12, 복합 탄수화물',
            nutrients: [
              '철분',
              '비타민 B12',
              '코엔자임 Q10',
              '복합 탄수화물'
            ],
            foods: [
              '소고기, 간',
              '시금치, 케일',
              '퀴노아, 현미',
              '렌틸콩',
              '베리류'
            ],
            reason: '만성 피로 개선',
            tips: ['카페인 과다 피하기', '규칙적 식사', '충분한 수면']
          });
        }
        
        // 피부 증상
        const skinSymptoms = latestSymptoms.symptoms.filter(s =>
          ['cystic_acne', 'acne_ftm', 'xeroderma'].includes(s.id) && s.severity >= 3
        );
        
        if (skinSymptoms.length > 0) {
          recommendations.push({
            priority: 'medium',
            title: '피부 건강 식단',
            description: '피부 개선을 위한 영양',
            details: '항산화, 수분, 비타민',
            nutrients: [
              '비타민 A, C, E',
              '아연',
              '오메가-3',
              '수분'
            ],
            foods: [
              '당근, 고구마',
              '베리류',
              '견과류',
              '녹색 채소',
              '물 (2-3L/일)'
            ],
            reason: '피부 트러블 개선',
            tips: ['유제품 줄이기', '설탕 피하기', '물 많이', '가공식품 NO']
          });
        }
      }
    }
    
    // 기본 권장사항
    recommendations.push({
      priority: 'low',
      title: '수분 섭취',
      description: '충분한 물 섭취',
      details: '하루 2-3리터',
      benefits: [
        '신진대사 촉진',
        '독소 배출',
        '피부 개선',
        '소화 개선',
        '체중 관리'
      ],
      reason: '전반적인 건강',
      tips: ['식사 30분 전 물', '운동 중 수분', '카페인은 탈수 주의']
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
            title: '에스트라디올 증량 고려',
            description: '에스트로겐 수치가 목표 범위보다 낮습니다',
            currentLevel: eLevel,
            targetRange: '100-200 pg/ml',
            action: '의사와 상담하여 복용량 조정',
            warnings: ['자가 조정 금지', '정기 혈액 검사'],
            possibleCauses: [
              '복용량 부족',
              '흡수율 낮음',
              '대사 빠름'
            ]
          });
        } else if (eLevel > 200) {
          recommendations.push({
            priority: 'high',
            type: 'decrease',
            medication: 'estradiol',
            title: '에스트라디올 감량 고려',
            description: '에스트로겐 수치가 높아 혈전 위험 증가',
            currentLevel: eLevel,
            targetRange: '100-200 pg/ml',
            action: '즉시 의사 상담 필요',
            warnings: ['혈전 위험', '간 부담', '두통', '메스꺼움'],
            possibleCauses: [
              '복용량 과다',
              '대사 느림'
            ]
          });
        } else {
          recommendations.push({
            priority: 'low',
            type: 'maintain',
            medication: 'estradiol',
            title: '에스트라디올 복용량 유지',
            description: '현재 수치가 이상적입니다',
            currentLevel: eLevel,
            targetRange: '100-200 pg/ml',
            action: '현재 복용량 유지'
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
            title: '항안드로겐 증량 고려',
            description: '테스토스테론 억제가 충분하지 않습니다',
            currentLevel: tLevel,
            targetRange: '< 50 ng/ml',
            action: '의사와 상담하여 복용량 조정',
            warnings: ['정기 검사', '부작용 모니터링'],
            possibleOptions: [
              '스피로노락톤 증량',
              '비칼루타미드 추가',
              'GnRH 작용제 고려'
            ]
          });
        } else {
          recommendations.push({
            priority: 'low',
            type: 'maintain',
            medication: 'antiAndrogen',
            title: '항안드로겐 복용량 유지',
            description: '테스토스테론 억제 효과 좋음',
            currentLevel: tLevel,
            targetRange: '< 50 ng/ml',
            action: '현재 복용량 유지'
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
            title: '테스토스테론 증량 고려',
            description: '테스토스테론 수치가 목표 범위보다 낮습니다',
            currentLevel: tLevel,
            targetRange: '300-1000 ng/ml',
            action: '의사와 상담하여 복용량 조정',
            warnings: ['정기 혈액 검사', '부작용 모니터링'],
            possibleCauses: [
              '투여량 부족',
              '투여 간격 너무 김',
              '흡수율 낮음'
            ]
          });
        } else if (tLevel > 1000) {
          recommendations.push({
            priority: 'high',
            type: 'decrease',
            medication: 'testosterone',
            title: '테스토스테론 감량 필요',
            description: '수치가 너무 높아 부작용 위험',
            currentLevel: tLevel,
            targetRange: '300-1000 ng/ml',
            action: '즉시 의사 상담',
            warnings: [
              '적혈구 증가',
              '혈압 상승',
              '간 부담',
              '공격성 증가'
            ],
            possibleCauses: [
              '투여량 과다',
              '투여 간격 짧음'
            ]
          });
        } else {
          recommendations.push({
            priority: 'low',
            type: 'maintain',
            medication: 'testosterone',
            title: '테스토스테론 복용량 유지',
            description: '현재 수치가 이상적입니다',
            currentLevel: tLevel,
            targetRange: '300-1000 ng/ml',
            action: '현재 복용량 유지'
          });
        }
      }
      
      // 에스트로겐 (억제 필요 시)
      if (latest.estrogenLevel && latest.estrogenLevel > 50) {
        recommendations.push({
          priority: 'medium',
          type: 'add',
          medication: 'aromatase_inhibitor',
          title: '아로마타제 억제제 고려',
          description: '에스트로겐 수치가 높습니다',
          currentLevel: latest.estrogenLevel,
          targetRange: '< 50 pg/ml',
          action: '의사와 상담',
          warnings: ['관절통 주의', '뼈 건강 모니터링'],
          possibleOptions: [
            '아나스트로졸 저용량',
            '테스토스테론 투여 경로 변경'
          ]
        });
      }
      
    } else if (this.mode === 'nonbinary') {
      // 개인 목표에 따라 다름
      recommendations.push({
        priority: 'medium',
        type: 'balance',
        medication: 'custom',
        title: '개인화된 호르몬 균형',
        description: '목표하는 호르몬 수치에 따라 조정',
        action: '의사와 상세 상담 필요',
        note: '논바이너리 호르몬 요법은 개인차가 크므로 전문가와 긴밀히 협의'
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
            title: 'SERM 사용 고려',
            description: '여유증 증상 완화',
            action: '의사 상담',
            possibleOptions: [
              '랄록시펜 (Raloxifene) - 추천',
              '타목시펜 (Tamoxifen)'
            ],
            warnings: ['시력 검사', '혈전 위험 낮음']
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
            title: '수면 개선',
            description: '호르몬 안정화와 회복을 위한 충분한 수면',
            details: '7-8시간 수면, 일정한 수면 시간',
            benefits: [
              '호르몬 균형',
              '스트레스 감소',
              '근육 회복',
              '면역력 증진',
              '정신 건강'
            ],
            tips: [
              '같은 시간에 자고 일어나기',
              '자기 2시간 전 전자기기 끄기',
              '침실 어둡고 시원하게',
              '카페인 오후 이후 피하기',
              '낮잠 20분 이내'
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
            title: '스트레스 관리',
            description: '코르티솔 조절을 통한 호르몬 안정화',
            details: '정신 건강 케어',
            benefits: [
              '기분 안정',
              '호르몬 균형',
              '수면 개선',
              '면역력 증진',
              '전반적 건강'
            ],
            activities: [
              '명상 (하루 10-15분)',
              '요가',
              '호흡 운동 (4-7-8 호흡법)',
              '산책',
              '취미 활동',
              '저널링'
            ],
            tips: [
              '매일 조금씩 실천',
              '자신에게 맞는 방법 찾기',
              '필요시 전문가 도움',
              '지지 그룹 참여'
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
        title: '정기 측정 유지',
        description: `${this.measurements.length}주 연속 기록 중!`,
        details: '일관성 있는 측정으로 정확한 추세 파악',
        benefits: [
          '정확한 변화 추적',
          '목표 달성률 향상',
          '문제 조기 발견',
          '동기부여',
          '의사 소통에 유용'
        ],
        tips: [
          '같은 요일, 같은 시간',
          '아침 공복 상태',
          '같은 옷 또는 속옷만',
          '화장실 다녀온 후',
          '운동 전'
        ]
      });
    }
    
    // 수분 섭취
    recommendations.push({
      category: 'hydration',
      priority: 'medium',
      title: '충분한 수분 섭취',
      description: '하루 2-3리터 물 마시기',
      details: '신진대사 및 호르몬 대사',
      benefits: [
        '피부 개선',
        '소화 개선',
        '독소 배출',
        '체중 관리',
        '신진대사 촉진'
      ],
      tips: [
        '아침에 물 한 잔',
        '식사 30분 전 물',
        '운동 시 충분히',
        '갈증 느끼기 전 마시기',
        '물병 항상 휴대'
      ]
    });
    
    // 모드별 특화 습관
    if (this.mode === 'mtf') {
      recommendations.push({
        category: 'skincare',
        priority: 'low',
        title: '피부 관리',
        description: '여성적 피부 유지',
        details: '보습 및 관리',
        tips: [
          '보습제 매일',
          '자외선 차단',
          '순한 클렌징',
          '충분한 수분',
          '비타민 C 세럼'
        ]
      });
    } else if (this.mode === 'ftm') {
      recommendations.push({
        category: 'hygiene',
        priority: 'low',
        title: '피부 및 위생 관리',
        description: '여드름 및 체취 관리',
        details: '테스토스테론 부작용 관리',
        tips: [
          '하루 2회 샤워',
          '여드름 전용 클렌저',
          '데오드란트 사용',
          '면도 관리',
          '침구 자주 세탁'
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
        goal: '첫 측정 시작',
        tip: '정확한 측정을 위해 아침 공복 상태에서 측정하세요!'
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
      goal: '현재 상태 유지',
      tip: '훌륭해요! 지금 하시는 것을 계속 유지하세요!'
    };
  }
  
  generateFocusTip(key, diff, shouldIncrease) {
    const keyNames = {
      weight: '체중',
      waist: '허리',
      hips: '엉덩이',
      chest: '가슴',
      shoulder: '어깨',
      thigh: '허벅지',
      arm: '팔뚝'
    };
    
    const tips = {
      weight: shouldIncrease 
        ? '칼로리 증가, 근력 운동, 충분한 단백질'
        : '유산소 운동, 칼로리 조절, 수분 섭취',
      waist: shouldIncrease
        ? '코어 운동, 복부 단련'
        : '유산소 + 복부 운동, 탄수화물 조절',
      hips: shouldIncrease
        ? '하체 운동 (스쿼트, 힙 스러스트), 충분한 칼로리'
        : '유산소 운동, 칼로리 조절',
      chest: shouldIncrease
        ? '상체 운동, 충분한 영양'
        : '상체 근력 운동, 가슴 발달',
      shoulder: shouldIncrease
        ? '숄더 프레스, 사이드 레터럴 레이즈'
        : '상체 운동 줄이기, 유산소 증가',
      thigh: shouldIncrease
        ? '하체 운동, 스쿼트, 런지'
        : '유산소 운동, 칼로리 조절'
    };
    
    return {
      goal: `${keyNames[key] || key} ${shouldIncrease ? '+' : '-'}${diff.toFixed(1)} 목표`,
      tip: tips[key] || '꾸준한 노력이 중요합니다!'
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
