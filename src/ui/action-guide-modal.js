import { DoctorEngine } from '../doctor-module/core/doctor-engine.js';
import { translate, getCurrentLanguage } from '../translations.js';

export class ActionGuideModal {
  constructor(measurements, userSettings) {
    this.measurements = measurements;
    this.userSettings = userSettings;
    this.doctorEngine = new DoctorEngine(measurements, userSettings);
    this._root = null;
  }

  $(selector) {
    return this._root ? this._root.querySelector(selector) : null;
  }

  open() {
    const language = getCurrentLanguage();
    this.doctorEngine = new DoctorEngine(this.measurements, { ...this.userSettings, language });
    const guide = this.doctorEngine.generateActionGuide();

    const template = document.getElementById('action-guide-view');
    if (!template) return;

    const modalOverlay = document.getElementById('modal-bottom-sheet-overlay');
    const modalSheet = document.getElementById('modal-bottom-sheet');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const closeBtn = document.getElementById('modal-close-btn');
    if (!modalOverlay || !modalSheet || !modalTitle || !modalContent) return;

    modalTitle.textContent = translate('actionGuideModalTitle') || '액션 가이드';
    modalContent.innerHTML = template.innerHTML;
    this._root = modalContent;
    this.applyTranslations(modalContent);

    this.render(guide);

    document.body.classList.add('modal-open');
    modalOverlay.classList.add('visible');

    const cleanup = () => {
      this._root = null;
    };

    if (closeBtn) closeBtn.addEventListener('click', cleanup, { once: true });
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) cleanup();
    }, { once: true });
  }

  render(guide) {
    this.renderHero(guide?.nextMeasurementDate);
    this.renderRecommendations(guide?.recommendations);
    this.renderPerformance(guide?.performanceFeedback);
    this.renderMotivation(guide?.motivation);
  }

  renderHero(next) {
    const ddayEl = this.$('#action-guide-dday');
    const dateEl = this.$('#action-guide-next-date');
    const msgEl = this.$('#action-guide-next-message');
    if (!ddayEl || !dateEl || !msgEl) return;

    const days = Number(next?.daysUntil);
    const date = next?.date || '';
    const rawMessage = next?.message || '';

    let ddayText = translate('actionGuideDDayUnknown') || 'D-?';
    if (Number.isFinite(days)) {
      if (days === 0) ddayText = 'D-Day';
      else if (days > 0) ddayText = `D-${days}`;
      else ddayText = `D+${Math.abs(days)}`;
    }

    ddayEl.textContent = ddayText;
    dateEl.textContent = date;
    if (Number.isFinite(days)) {
      msgEl.textContent = days <= 0
        ? (translate('actionGuideNextMessageDue') || rawMessage)
        : translate('actionGuideNextMessageInDays', { days: String(days) });
    } else {
      msgEl.textContent = rawMessage;
    }
  }

  renderRecommendations(recs) {
    const container = this.$('#action-guide-recommendations');
    if (!container) return;

    const lang = getCurrentLanguage();
    const dictionary = {
      en: {
        '유산소 운동 증가': 'Increase cardio',
        '근력 운동': 'Strength training',
        '체중 감소를 위한 유산소 운동': 'Cardio for weight loss',
        '체중 증가 및 근육 발달': 'Build muscle and gain weight',
        '주 3-4회, 30-45분': '3–4 times/week, 30–45 min',
        '주 3회, 복합 운동 중심': '3 times/week, compound-focused',
        '단백질 섭취 늘리기': 'Increase protein intake',
        '단백질 섭취 증가': 'Increase protein intake',
        '칼로리 섭취 조절': 'Adjust calorie intake',
        '약물 복용량 관리': 'Manage medication dosage',
        '습관 개선': 'Improve habits',
        '하체 집중 운동': 'Lower-body focused training',
        '여성적 하체 라인 형성': 'Build a feminine lower-body line',
        '여성적 곡선 만들기': 'Build feminine curves',
        '근육 손실 방지': 'Prevent muscle loss',
        '근육량 회복': 'Recover muscle mass',
        '건강한 체중 증가 필요': 'Need healthy weight gain',
        '고단백 식단으로 근육 보호': 'Protect muscle with a high-protein diet',
        '건강한 지방 섭취': 'Healthy fat intake',
        '호르몬 균형 및 지방 재분배': 'Hormone balance and fat redistribution',
        '수분 섭취': 'Hydration',
        '전반적인 건강': 'Overall health',
        '하루 2-3리터': '2–3 liters/day',
        '항안드로겐 증량 고려': 'Consider increasing anti-androgen',
        '테스토스테론 억제가 충분하지 않습니다': 'Testosterone suppression is insufficient',
        '에스트라디올 복용량 유지': 'Maintain estradiol dose',
        '현재 수치가 이상적입니다': 'Current level is ideal',
        '충분한 수분 섭취': 'Adequate hydration',
        '하루 2-3리터 물 마시기': 'Drink 2–3 L of water per day',
        '신진대사 및 호르몬 대사': 'Metabolism and hormone metabolism',
        '정기 측정 유지': 'Keep regular measurements',
        '일관성 있는 측정으로 정확한 추세 파악': 'Consistent measurements improve trend accuracy',
        '피부 관리': 'Skin care',
        '여성적 피부 유지': 'Maintain feminine skin',
        '보습 및 관리': 'Moisturizing and care'
      },
      ja: {
        '유산소 운동 증가': '有酸素運動を増やす',
        '근력 운동': '筋力トレーニング',
        '체중 감소를 위한 유산소 운동': '減量のための有酸素運動',
        '체중 증가 및 근육 발달': '増量・筋肉増加',
        '주 3-4회, 30-45분': '週3〜4回、30〜45分',
        '주 3회, 복합 운동 중심': '週3回、複合種目中心',
        '단백질 섭취 늘리기': 'タンパク質摂取を増やす',
        '단백질 섭취 증가': 'タンパク質摂取を増やす',
        '칼로리 섭취 조절': '摂取カロリーの調整',
        '약물 복용량 관리': '服薬量の管理',
        '습관 개선': '習慣の改善',
        '하체 집중 운동': '下半身集中トレ',
        '여성적 하체 라인 형성': '女性らしい下半身ラインづくり',
        '여성적 곡선 만들기': '女性らしい曲線づくり',
        '근육 손실 방지': '筋肉減少の防止',
        '근육량 회복': '筋肉量の回復',
        '건강한 체중 증가 필요': '健康的な増量が必要',
        '고단백 식단으로 근육 보호': '高タンパク食で筋肉を守る',
        '건강한 지방 섭취': '良質な脂質を摂る',
        '호르몬 균형 및 지방 재분배': 'ホルモンバランスと脂肪再分配',
        '수분 섭취': '水分補給',
        '전반적인 건강': '全体的な健康',
        '하루 2-3리터': '1日2〜3L',
        '항안드로겐 증량 고려': '抗アンドロゲン増量を検討',
        '테스토스테론 억제가 충분하지 않습니다': 'テストステロン抑制が不十分です',
        '에스트라디올 복용량 유지': 'エストラジオール量を維持',
        '현재 수치가 이상적입니다': '現在の値は理想的です',
        '충분한 수분 섭취': '十分な水分補給',
        '하루 2-3리터 물 마시기': '1日2〜3Lの水を飲む',
        '신진대사 및 호르몬 대사': '代謝とホルモン代謝',
        '정기 측정 유지': '定期測定を継続',
        '일관성 있는 측정으로 정확한 추세 파악': '一貫した測定で正確な傾向を把握',
        '피부 관리': 'スキンケア',
        '여성적 피부 유지': '女性らしい肌を保つ',
        '보습 및 관리': '保湿とケア'
      }
    };

    const metricToken = {
      ko: {
        '키': 'height',
        '체중': 'weight',
        '허리': 'waist',
        '엉덩이': 'hips',
        '가슴': 'chest',
        '어깨': 'shoulder',
        '어깨 너비': 'shoulderWidth',
        '목': 'neck',
        '허벅지': 'thigh',
        '종아리': 'calf',
        '팔뚝': 'arm',
        '근육량': 'muscleMass',
        '체지방률': 'bodyFatPercentage',
        '에스트로겐': 'estrogenLevel',
        '테스토스테론': 'testosteroneLevel'
      },
      en: {
        height: 'Height',
        weight: 'Weight',
        waist: 'Waist',
        hips: 'Hips',
        chest: 'Chest',
        shoulder: 'Shoulder',
        shoulderWidth: 'Shoulder Width',
        neck: 'Neck',
        thigh: 'Thigh',
        calf: 'Calf',
        arm: 'Arm',
        muscleMass: 'Muscle mass',
        bodyFatPercentage: 'Body fat',
        estrogenLevel: 'Estrogen',
        testosteroneLevel: 'Testosterone'
      },
      ja: {
        height: '身長',
        weight: '体重',
        waist: 'ウエスト',
        hips: 'ヒップ',
        chest: '胸囲',
        shoulder: '肩',
        shoulderWidth: '肩幅',
        neck: '首回り',
        thigh: '太もも',
        calf: 'ふくらはぎ',
        arm: '腕',
        muscleMass: '筋肉量',
        bodyFatPercentage: '体脂肪率',
        estrogenLevel: 'エストロゲン',
        testosteroneLevel: 'テストステロン'
      }
    };

    const localizeText = (text) => {
      const s = String(text || '');
      if (!s) return s;
      if (lang === 'ko') return s;

      const direct = dictionary[lang]?.[s];
      if (direct) return direct;

      const m = s.match(/^목표\s*(.+?)까지\s*([0-9.]+)\s*(kg|cm)\s*남음$/);
      if (m) {
        const value = m[2];
        const unit = m[3];
        if (lang === 'en') return `Remaining to target: ${value}${unit}`;
        if (lang === 'ja') return `目標まであと${value}${unit}`;
      }

      const weeklyLoss = s.match(/^주간\s*([0-9.]+)kg\s*감소\s*\(권장:\s*([0-9.]+)kg\)$/);
      if (weeklyLoss) {
        const v = weeklyLoss[1];
        const r = weeklyLoss[2];
        if (lang === 'en') return `Weekly loss ${v}kg (recommended: ${r}kg)`;
        if (lang === 'ja') return `週間${v}kg減（推奨：${r}kg）`;
      }

      const metricDecrease = s.match(/^(.+?)\s*([0-9.]+)(kg|cm|%)\s*감소$/);
      if (metricDecrease) {
        const rawMetric = metricDecrease[1].trim();
        const value = metricDecrease[2];
        const unit = metricDecrease[3];
        const key = metricToken.ko[rawMetric];
        const metric = key ? metricToken[lang]?.[key] : rawMetric;
        if (lang === 'en') return `${metric} decreased by ${value}${unit}`;
        if (lang === 'ja') return `${metric}が${value}${unit}減少`;
      }

      const bodyFatTarget = s.match(/^목표\s*체지방률:\s*([0-9.]+\s*-\s*[0-9.]+)%\s*\(현재:\s*([0-9.]+)%\)$/);
      if (bodyFatTarget) {
        const range = bodyFatTarget[1].replace(/\s*/g, '');
        const current = bodyFatTarget[2];
        if (lang === 'en') return `Target body fat: ${range}% (current: ${current}%)`;
        if (lang === 'ja') return `目標体脂肪率：${range}%（現在：${current}%）`;
      }

      const streak = s.match(/^([0-9]+)주\s*연속\s*기록\s*중!$/);
      if (streak) {
        const weeks = streak[1];
        if (lang === 'en') return `${weeks}-week streak!`;
        if (lang === 'ja') return `${weeks}週連続記録中！`;
      }

      return s;
    };

    const byCategory = {
      exercise: { icon: '💪', titleKey: 'actionGuideCategoryExercise' },
      diet: { icon: '🥗', titleKey: 'actionGuideCategoryDiet' },
      medication: { icon: '💊', titleKey: 'actionGuideCategoryMedication' },
      habits: { icon: '🧠', titleKey: 'actionGuideCategoryHabits' }
    };

    const renderItems = (items) => {
      const list = Array.isArray(items) ? items.slice(0, 3) : [];
      if (list.length === 0) return '';
      return list.map(it => {
        const title = localizeText(it?.title || '');
        const reason = localizeText(it?.reason || it?.description || '');
        const detail = localizeText(it?.details || '');
        return `
          <div class="action-guide-item">
            <div class="action-guide-item-title">${title}</div>
            ${reason ? `<div class="action-guide-item-reason">${reason}</div>` : ''}
            ${detail ? `<div class="action-guide-item-detail">${detail}</div>` : ''}
          </div>
        `;
      }).join('');
    };

    const sections = Object.keys(byCategory).map(key => {
      const meta = byCategory[key];
      const itemsHtml = renderItems(recs?.[key]);
      if (!itemsHtml) return '';
      const title = translate(meta.titleKey) || key;
      return `
        <div class="action-guide-category">
          <div class="action-guide-category-title">${meta.icon} ${title}</div>
          ${itemsHtml}
        </div>
      `;
    }).filter(Boolean);

    if (sections.length === 0) {
      container.innerHTML = `<div class="action-guide-feedback">${translate('actionGuideNoRecommendations') || '추천을 만들기 위한 데이터가 부족합니다.'}</div>`;
      return;
    }

    container.innerHTML = sections.join('');
  }

  renderPerformance(perf) {
    const container = this.$('#action-guide-performance');
    if (!container) return;

    if (Array.isArray(perf)) {
      if (perf.length === 0) {
        container.innerHTML = `<div class="action-guide-feedback">${translate('actionGuideNoPerformance') || '이번 주 성과 피드백을 만들기 위한 데이터가 부족합니다.'}</div>`;
        return;
      }

      container.innerHTML = perf.map(fb => {
        const status = fb?.status || '';
        const title = fb?.message || '';
        const tip = fb?.tip || '';
        return `
          <div class="action-guide-feedback ${status}">
            <div class="action-guide-feedback-title">${title}</div>
            ${tip ? `<div class="action-guide-feedback-tip">${tip}</div>` : ''}
          </div>
        `;
      }).join('');
      return;
    }

    const msg = perf?.message || translate('actionGuideNoPerformance') || '이번 주 성과 피드백을 만들기 위한 데이터가 부족합니다.';
    container.innerHTML = `<div class="action-guide-feedback">${msg}</div>`;
  }

  renderMotivation(motivation) {
    const container = this.$('#action-guide-motivation');
    if (!container) return;

    const list = Array.isArray(motivation) ? motivation : [];
    const itemsHtml = list.map(m => {
      const icon = m?.icon || '✨';
      const text = m?.text || '';
      return `<div class="action-guide-motivation-item">${icon} ${text}</div>`;
    }).join('');

    const closing = translate('actionGuideMotivationClosing') || '훌륭해요! 이 페이스를 유지하세요!';

    container.innerHTML = `
      <div class="action-guide-motivation-list">${itemsHtml || ''}</div>
      <div class="action-guide-motivation-message">${closing}</div>
    `;
  }

  applyTranslations(root) {
    if (!root) return;
    root.querySelectorAll('[data-lang-key]').forEach(el => {
      const key = el.getAttribute('data-lang-key');
      if (!key) return;
      const t = translate(key);
      if (!t || t === key) return;
      if (el.childElementCount === 0) el.textContent = t;
    });
  }
}
