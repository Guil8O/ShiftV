/**
 * SV Tab Card Renderers
 * Extracted from script.js — Phase 3-1
 *
 * All render functions close over a dependency object (_d) that
 * is set once via initSvTab().  State values use getters so each
 * render call sees the latest data.
 */
import { translate, getCurrentLanguage } from '../../translations.js';
import { svgIcon } from '../icon-paths.js';

/* ── Dependency container (set by initSvTab) ─────────────────────── */
let _d;

/**
 * Wire this module to the main app scope.
 * Call once after DOMContentLoaded state is ready.
 *
 * @param {Object} deps
 * @param {Array}    deps.measurements      – getter
 * @param {Object}   deps.targets           – getter
 * @param {string}   deps.currentMode       – getter ('mtf'|'ftm')
 * @param {string}   deps.biologicalSex     – getter ('male'|'female')
 * @param {Array<string>} deps.comparisonKeys
 * @param {Function} deps.formatValue
 * @param {Function} deps.escapeHTML
 * @param {Function} deps.toLocalDayIndex
 * @param {Function} deps.getMeasurementBaseDate
 * @param {Function} deps.calculateAdvancedHormoneAnalytics
 * @param {Function} deps.addNotification
 * @param {Function} deps._svRenderPersonaCard
 */
export function initSvTab(deps) {
    _d = deps;
}

// ── Highlights Card ─────────────────────────────────────────────
function renderHighlightsCard() {
    const { measurements, comparisonKeys, formatValue } = _d;
    const card = document.getElementById('sv-card-highlights');
    const titleEl = document.getElementById('sv-card-highlights-title');
    const contentEl = document.getElementById('sv-card-highlights-content');
    const dotsEl = document.getElementById('sv-card-highlights-dots');

    if (!card || !titleEl || !contentEl || !dotsEl) return;

    const icon = '';
    const title = translate('svcard_title_highlights');
    titleEl.innerHTML = `${icon} ${title}`;

    if (measurements.length < 2) {
        contentEl.innerHTML = `<div class="carousel-item"><p class="placeholder">${translate('svcard_no_data_for_highlights')}</p></div>`;
        dotsEl.innerHTML = '';
        return;
    }

    const latest = measurements[measurements.length - 1];
    const previous = measurements[measurements.length - 2];
    const allChanges = [];

    comparisonKeys.forEach(key => {
        const latestValue = parseFloat(latest[key]);
        const prevValue = parseFloat(previous[key]);

        if (!isNaN(latestValue) && !isNaN(prevValue) && prevValue !== 0) {
            const change = latestValue - prevValue;
            const percentageChange = Math.abs((change / prevValue) * 100);
            if (percentageChange > 0.1) { // 0.1% 이상 변화만 의미있는 것으로 간주
                allChanges.push({
                    key: key,
                    percentageChange: percentageChange,
                    value: latestValue,
                    diff: change
                });
            }
        }
    });



    // 변화율이 가장 큰 순서대로 정렬하고, 상위 3개만 선택
    allChanges.sort((a, b) => b.percentageChange - a.percentageChange);
    const topChanges = allChanges.slice(0, 4);

    if (topChanges.length === 0) {
        contentEl.innerHTML = `<div class="carousel-item"><p class="placeholder">${translate('svcard_no_major_changes')}</p></div>`; // 수정
        dotsEl.innerHTML = '';
        return;
    }

    // 캐러셀 아이템과 점(dot) 생성
    contentEl.innerHTML = topChanges.map(item => {
        const changeText = item.diff > 0 ? `+${item.diff.toFixed(1)}` : `${item.diff.toFixed(1)}`;
        const changeClass = item.diff > 0 ? 'positive-change' : 'negative-change';
        const changeIcon = item.diff > 0 ? 'trending_up' : 'trending_down';
        const pctText = `${item.percentageChange.toFixed(1)}%`;
        return `
    <div class="carousel-item sv-metric-slide">
        <div class="sv-metric-header">
            <span class="sv-metric-title">${translate(item.key).split('(')[0]}</span>
            <span class="sv-metric-pct ${changeClass}">${item.diff > 0 ? '+' : '-'}${pctText}</span>
        </div>
        <div class="sv-metric-body">
            <span class="sv-metric-value">${formatValue(item.value, item.key)}</span>
        </div>
        <div class="sv-metric-footer">
            ${svgIcon(changeIcon, 'sv-metric-icon ' + changeClass)}
            <span class="sv-metric-change ${changeClass}">${translate('svcard_change_vs_last_week')} ${changeText}</span>
        </div>
    </div>`;
    }).join('');

    dotsEl.innerHTML = topChanges.map((_, index) => `<div class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`).join('');

    // 스크롤 이벤트 리스너 추가 (이벤트 중복 방지)
    contentEl.removeEventListener('scroll', handleCarouselScroll); // 기존 리스너 제거
    contentEl.addEventListener('scroll', handleCarouselScroll); // 새 리스너 추가
    contentEl.scrollLeft = 0;
}

// 캐러셀 스크롤 이벤트 핸들러 (유틸리티 함수 섹션에 추가해도 좋습니다)
function handleCarouselScroll(event) {
    const contentEl = event.target;
    const dots = contentEl.closest('.carousel-container').querySelectorAll('.carousel-dot');
    if (!dots.length) return;

    const itemWidth = contentEl.querySelector('.carousel-item').offsetWidth;
    const scrollLeft = contentEl.scrollLeft;
    const currentIndex = Math.round(scrollLeft / itemWidth);

    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentIndex);
    });
}


function renderGuideCard() {
    const { measurements, targets, currentMode, biologicalSex } = _d;
    const currentLanguage = getCurrentLanguage() || 'ko';
    const card = document.getElementById('sv-card-guide');
    const titleEl = document.getElementById('sv-card-guide-title');
    const contentEl = document.getElementById('sv-card-guide-content');
    const dotsEl = document.getElementById('sv-card-guide-dots');

    if (!card || !titleEl || !contentEl || !dotsEl) return;

    const renderId = (renderGuideCard._renderId = (renderGuideCard._renderId || 0) + 1);

    const localizeActionGuideText = (text) => {
        const s = String(text || '');
        if (!s) return s;
        const lang = currentLanguage || 'ko';
        if (lang === 'ko') return s;

        const dictionary = {
            en: {
                '하체 집중 운동': 'Lower-body focused training',
                '여성적 하체 라인 형성': 'Build a feminine lower-body line',
                '여성적 곡선 만들기': 'Build feminine curves',
                '근육 손실 방지': 'Prevent muscle loss',
                '근육량 회복': 'Recover muscle mass',
                '건강한 체중 증가 필요': 'Need healthy weight gain',
                '주 3회, 복합 운동 중심': '3 times/week, compound-focused',
                '단백질 섭취 늘리기': 'Increase protein intake',
                '단백질 섭취 증가': 'Increase protein intake',
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
                '보습 및 관리': 'Moisturizing and care',
                '근력 운동': 'Strength training',
                '유산소 운동 증가': 'Increase cardio',
                '체중 감소를 위한 유산소 운동': 'Cardio for weight loss',
                '체중 증가 및 근육 발달': 'Build muscle and gain weight',
                '주 3-4회, 30-45분': '3–4 times/week, 30–45 min',
                '칼로리 섭취 조절': 'Adjust calorie intake',
                '약물 복용량 관리': 'Manage medication dosage',
                '습관 개선': 'Improve habits'
            },
            ja: {
                '하체 집중 운동': '下半身集中トレ',
                '여성적 하체 라인 형성': '女性らしい下半身ラインづくり',
                '여성적 곡선 만들기': '女性らしい曲線づくり',
                '근육 손실 방지': '筋肉減少の防止',
                '근육량 회복': '筋肉量の回復',
                '건강한 체중 증가 필요': '健康的な増量が必要',
                '주 3회, 복합 운동 중심': '週3回、複合種目中心',
                '단백질 섭취 늘리기': 'タンパク質摂取を増やす',
                '단백질 섭취 증가': 'タンパク質摂取を増やす',
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
                '보습 및 관리': '保湿とケア',
                '근력 운동': '筋力トレーニング',
                '유산소 운동 증가': '有酸素運動を増やす',
                '체중 감소를 위한 유산소 운동': '減量のための有酸素運動',
                '체중 증가 및 근육 발달': '増量・筋肉増加',
                '주 3-4회, 30-45분': '週3〜4回、30〜45分',
                '칼로리 섭취 조절': '摂取カロリーの調整',
                '약물 복용량 관리': '服薬量の管理',
                '습관 개선': '習慣の改善'
            }
        };

        const direct = dictionary[lang]?.[s];
        if (direct) return direct;

        const metricToken = {
            ko: { '체중': 'weight', '허리': 'waist', '엉덩이': 'hips', '가슴': 'chest', '어깨': 'shoulder', '허벅지': 'thigh', '팔뚝': 'arm', '근육량': 'muscleMass', '체지방률': 'bodyFatPercentage' },
            en: { 'weight': 'Weight', 'waist': 'Waist', 'hips': 'Hips', 'chest': 'Chest', 'shoulder': 'Shoulder', 'thigh': 'Thigh', 'arm': 'Arm', 'muscleMass': 'Muscle Mass', 'bodyFatPercentage': 'Body Fat %' },
            ja: { 'weight': '体重', 'waist': 'ウエスト', 'hips': 'ヒップ', 'chest': '胸囲', 'shoulder': '肩幅', 'thigh': '太もも', 'arm': '腕', 'muscleMass': '筋肉量', 'bodyFatPercentage': '体脂肪率' }
        };

        const patterns = [
            {
                regex: /^([0-9]+)주\s*연속\s*기록\s*중!$/,
                replace: (m) => lang === 'en' ? `${m[1]}-week streak!` : `${m[1]}週連続記録中！`
            },
            {
                regex: /^(.+?)\s*([0-9.]+)(kg|cm|%)\s*감소$/,
                replace: (m) => {
                    const rawMetric = m[1].trim();
                    const key = metricToken.ko[rawMetric];
                    const metric = key ? metricToken[lang]?.[key] : rawMetric;
                    return lang === 'en' ? `${metric} decreased by ${m[2]}${m[3]}` : `${metric}が${m[2]}${m[3]}減少`;
                }
            },
            {
                regex: /^주간\s*([0-9.]+)kg\s*감소\s*\(권장:\s*([0-9.]+)kg\)$/,
                replace: (m) => lang === 'en' ? `Weekly loss ${m[1]}kg (recommended: ${m[2]}kg)` : `週間${m[1]}kg減（推奨：${m[2]}kg）`
            },
            {
                regex: /^목표\s*체지방률:\s*([0-9.]+\s*-\s*[0-9.]+)%\s*\(현재:\s*([0-9.]+)%\)$/,
                replace: (m) => lang === 'en' ? `Target body fat: ${m[1].replace(/\s*/g, '')}% (current: ${m[2]}%)` : `目標体脂肪率：${m[1].replace(/\s*/g, '')}%（現在：${m[2]}%）`
            },
            {
                regex: /^거의\s*다\s*왔어요!\s*약\s*([0-9]+)주\s*남았습니다!$/,
                replace: (m) => lang === 'en' ? `Almost there! About ${m[1]} weeks left!` : `もうすぐです！あと約${m[1]}週間！`
            },
            {
                regex: /^현재\s*추세로는\s*목표에서\s*멀어지고\s*있습니다\.$/,
                replace: () => lang === 'en' ? `Trending away from target.` : `現在の傾向では目標から遠ざかっています。`
            },
            {
                regex: /^<span[^>]*>trending_up<\/span>\s*순조롭게\s*진행\s*중입니다\.\s*약\s*([0-9]+)주\s*예상됩니다\.$/,
                replace: (m) => lang === 'en' ? `On track. Estimated ${m[1]} weeks.` : `順調です。約${m[1]}週間と予想されます。`
            }
        ];

        for (const p of patterns) {
            const match = s.match(p.regex);
            if (match) return p.replace(match);
        }

        return s;
    };

    card.className = 'sv-card sv-card-widget carousel-container sv-card-with-image sv-card-image-normal sv-card--clickable';
    titleEl.innerHTML = `${translate('svcard_title_action_guide')}`;

    const metaByCategory = {
        exercise: { icon: svgIcon('fitness_center', 'category-icon'), titleKey: 'actionGuideCategoryExercise' },
        diet: { icon: svgIcon('restaurant', 'category-icon'), titleKey: 'actionGuideCategoryDiet' },
        medication: { icon: svgIcon('medication', 'category-icon'), titleKey: 'actionGuideCategoryMedication' },
        habits: { icon: svgIcon('psychology', 'category-icon'), titleKey: 'actionGuideCategoryHabits' }
    };

    const categoryKeys = ['exercise', 'diet', 'medication', 'habits'];

    const renderSlides = (recs) => {
        return categoryKeys.map((key) => {
            const meta = metaByCategory[key];
            const title = translate(meta.titleKey) || key;
            const list = Array.isArray(recs?.[key]) ? recs[key].slice(0, 3) : [];
            const itemsHtml = list.length > 0
                ? list.map((it) => {
                    const itemTitle = localizeActionGuideText(it?.title || '');
                    const reason = localizeActionGuideText(it?.reason || it?.description || '');
                    return `
                        <div class="sv-action-item">
                            <div class="sv-action-item-title">${itemTitle}</div>
                            ${reason ? `<div class="sv-action-item-reason">${reason}</div>` : ''}
                        </div>
                    `;
                }).join('')
                : `<div class="sv-action-empty">${translate('notEnoughData')}</div>`;

            return `
                <div class="carousel-item sv-action-slide">
                    <div class="sv-action-category">${meta.icon} ${title}</div>
                    <div class="sv-action-items">${itemsHtml}</div>
                </div>
            `;
        }).join('');
    };

    contentEl.innerHTML = renderSlides(null);
    dotsEl.innerHTML = categoryKeys.map((_, index) => `<div class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`).join('');

    contentEl.removeEventListener('scroll', handleCarouselScroll);
    contentEl.addEventListener('scroll', handleCarouselScroll);
    contentEl.scrollLeft = 0;

    const userSettings = {
        mode: currentMode || 'mtf',
        biologicalSex: biologicalSex || 'male',
        language: currentLanguage || 'ko',
        targets: targets || {}
    };

    import('../../doctor-module/core/doctor-engine.js').then((module) => {
        if (renderGuideCard._renderId !== renderId) return;
        const DoctorEngine = module.DoctorEngine || module.default;
        const engine = new DoctorEngine(measurements || [], userSettings);
        const guide = engine.generateActionGuide();
        const recs = guide?.recommendations || null;
        contentEl.innerHTML = renderSlides(recs);
        contentEl.scrollLeft = 0;
    }).catch(() => {
        if (renderGuideCard._renderId !== renderId) return;
        contentEl.innerHTML = renderSlides(null);
    });
}

// 목표 달성도 카드 렌더링 함수
function renderTargetsCard() {
    const { measurements, targets } = _d;
    const svCardTargets = document.getElementById('sv-card-targets');
    if (!svCardTargets) return;

    let content = `<h3>${translate('svcard_title_targets')}</h3>`;
    const targetKeys = Object.keys(targets);

    if (measurements.length < 1 || targetKeys.length === 0) {
        content += `<div class="sv-card-content"><p>${translate('svcard_no_targets_set')}</p></div>`;
        svCardTargets.innerHTML = content;
        return;
    }

    const initial = measurements[0];
    const latest = measurements[measurements.length - 1];
    let totalProgress = 0;
    let validTargets = 0;

    targetKeys.forEach(key => {
        const targetValue = parseFloat(targets[key]);
        const initialValue = parseFloat(initial[key]);
        const latestValue = parseFloat(latest[key]);

        if (![targetValue, initialValue, latestValue].some(isNaN)) {
            const totalChangeNeeded = targetValue - initialValue;
            const currentChange = latestValue - initialValue;

            let progress = 0;
            if (Math.abs(totalChangeNeeded) > 0.01) {
                progress = (currentChange / totalChangeNeeded) * 100;
            } else if (Math.abs(currentChange) < 0.01) {
                progress = 100;
            }
            totalProgress += Math.max(0, Math.min(progress, 100)); // 0~100%로 제한
            validTargets++;
        }
    });

    const overallProgress = validTargets > 0 ? Math.round(totalProgress / validTargets) : 0;

    // M3 circular progress: r=38, circumference = 2*π*38 ≈ 238.76
    const circumference = 238.76;
    const dashOffset = (circumference * (1 - overallProgress / 100)).toFixed(2);
    content += `
    <div class="sv-card-content">
        <div class="m3-circular-progress"
             role="progressbar"
             aria-valuenow="${overallProgress}"
             aria-valuemin="0"
             aria-valuemax="100">
            <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
                <circle class="m3-progress-track" cx="48" cy="48" r="38"/>
                <circle class="m3-progress-indicator" cx="48" cy="48" r="38"
                        style="stroke-dashoffset:${dashOffset}"/>
            </svg>
            <span class="m3-progress-label">${overallProgress}%</span>
        </div>
        <p class="m3-progress-desc">${translate('svcard_overall_progress')}</p>
    </div>
`;

    svCardTargets.innerHTML = content;
}

// 호르몬 카드 렌더링 함수
function renderHormonesCard() {
    const { measurements, targets, calculateAdvancedHormoneAnalytics, formatValue } = _d;
    const card = document.getElementById('sv-card-hormones');
    if (!card) return;

    // Convert from carousel-container to a simple clickable card
    card.className = 'sv-card sv-card--clickable sv-card-hormones-compact';

    const analytics = calculateAdvancedHormoneAnalytics();
    const title = `<h3>${translate('svcard_title_hormones')}</h3>`;

    if (measurements.length < 1) {
        card.innerHTML = `${title}<p class="placeholder">${translate('svcard_no_hormone_data')}</p>`;
        return;
    }

    const getStatusBadge = (hormoneKey, status) => {
        const isE = hormoneKey === 'estrogenLevel';
        if (status === 'critical_high') return { cls: 'danger-badge', icon: 'warning', text: translate('estrogen_critical_high') };
        if (status === 'critical_low') return { cls: 'danger-badge', icon: 'warning', text: translate('testosterone_critical_low') };
        if (status === 'optimal') return { cls: 'optimal-badge', icon: 'check_circle', text: isE ? translate('estrogen_optimal') : translate('testosterone_optimal') };
        if (status === 'above_target') return { cls: 'above-badge', icon: 'arrow_upward', text: isE ? translate('estrogen_above_target') : translate('testosterone_above_target') };
        if (status === 'below_target') return { cls: 'below-badge', icon: 'arrow_downward', text: isE ? translate('estrogen_below_target') : translate('testosterone_below_target') };
        return { cls: 'neutral-badge', icon: 'remove', text: translate('no_target_set') };
    };

    const hormones = [
        { key: 'estrogenLevel', abbr: 'E₂', name: translate('estrogenLevel').split('(')[0] },
        { key: 'testosteroneLevel', abbr: 'T', name: translate('testosteroneLevel').split('(')[0] }
    ];

    const rowsHtml = hormones.map(h => {
        const current = analytics?.[h.key]?.current;
        const target = parseFloat(targets?.[h.key]);
        const status = analytics?.[h.key]?.status;
        const badge = getStatusBadge(h.key, status);
        const showTarget = Number.isFinite(target);

        return `
            <div class="shc-row">
                <div class="shc-label">
                    <span class="shc-abbr">${h.abbr}</span>
                    <span class="shc-name">${h.name}</span>
                </div>
                <div class="shc-data">
                    <span class="shc-value">${Number.isFinite(current) ? formatValue(current, h.key) : '-'}</span>
                    ${showTarget ? `<span class="shc-target">${translate('svcard_label_target')} ${formatValue(target, h.key)}</span>` : ''}
                </div>
                <div class="shc-badge status-badge ${badge.cls}">
                    ${svgIcon(badge.icon)}
                </div>
            </div>`;
    }).join('');

    // E/T ratio mini bar
    let ratioHtml = '';
    if (analytics?.etRatio) {
        ratioHtml = `
            <div class="shc-ratio">
                <div class="shc-ratio-bar">
                    <div class="shc-ratio-track">
                        <div class="shc-ratio-marker" style="left:${analytics.etRatio.position}%"></div>
                    </div>
                    <div class="shc-ratio-labels">
                        <span>♂</span>
                        <span class="shc-ratio-val">E/T ${analytics.etRatio.value.toFixed(2)}</span>
                        <span>♀</span>
                    </div>
                </div>
            </div>`;
    }

    card.innerHTML = `${title}
        <div class="shc-grid">
            ${rowsHtml}
        </div>
        ${ratioHtml}`;
}



// ═══════════════════════════════════════════════════════════════
// SV 카드 통합 렌더 헬퍼
// 모든 sv-card 렌더 함수는 이 헬퍼를 사용해야 합니다.
// - null guard 중앙화
// - 에러 자동 catch + fallback
// - card.className 일관성 보장
// 사용: _svCard('sv-card-diary', 'sv-card--clickable', () => `<h3>...</h3>...`)
// ═══════════════════════════════════════════════════════════════
function _svCard(id, extraClasses, buildFn) {
    const card = document.getElementById(id);
    if (!card) return;
    card.className = `sv-card${extraClasses ? ' ' + extraClasses : ''}`;
    try {
        card.innerHTML = buildFn();
    } catch (e) {
        console.error(`[SV Card #${id}] render error:`, e);
        card.innerHTML = `<p class="placeholder">${translate('unexpectedError') || '표시 오류'}</p>`;
    }
}

/** svcard_title_* 키는 icon span 포함 HTML → innerHTML에 사용 */
function _svCardTitle(key) {
    return `<h3>${translate(key)}</h3>`;
}

// ─── Diary Card — Mini Calendar Grid with Animated Emojis ─────
const _NOTO_BASE = 'https://fonts.gstatic.com/s/e/notoemoji/latest';
const _notoGif = cp => `${_NOTO_BASE}/${cp}/512.gif`;
const _EVAL_CP = { great:'1f604', good:'1f60a', okay:'1f610', bad:'1f61e', terrible:'1f616' };
const _EMO_CP  = { sad:'1f622', dizzy:'1f635', angry:'1f621', surprised:'1f62e',
                   shocked:'1f631', bored:'1f611', excited:'1f970', love:'2764_fe0f' };
const _LEGACY_MOOD = { happy:'good', neutral:'okay', sad:'bad',
                       angry:'bad', tired:'bad', energetic:'good', hopeful:'good' };

function renderDiaryCard() {
    _svCard('sv-card-diary', 'sv-card--clickable', () => {
        let diary = {};
        try { diary = JSON.parse(localStorage.getItem('shiftv_diary') || '{}'); } catch { /**/ }

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const todayDate = now.getDate();
        const firstDow = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const totalCount = Object.keys(diary).filter(k => {
            const e = diary[k];
            return e && (e.evaluation || e.mood || e.emotion);
        }).length;

        // Day-of-week headers
        const lang = getCurrentLanguage?.() || 'ko';
        const dowLabels = lang === 'en' ? ['S','M','T','W','T','F','S']
                        : lang === 'ja' ? ['日','月','火','水','木','金','土']
                        : ['일','월','화','수','목','금','토'];
        const dowHTML = dowLabels.map(d => `<span class="svcard-cal-dow">${d}</span>`).join('');

        // Build cells
        let cellsHTML = '';
        for (let i = 0; i < firstDow; i++) cellsHTML += `<span class="svcard-cal-cell empty"></span>`;
        for (let day = 1; day <= daysInMonth; day++) {
            const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const raw = diary[ds];
            const entry = raw
                ? (raw.evaluation ? raw
                   : raw.mood && _LEGACY_MOOD[raw.mood] ? { ...raw, evaluation: _LEGACY_MOOD[raw.mood] } : raw)
                : null;
            const isToday = day === todayDate;

            let inner = `<span class="svcard-cal-num${isToday ? ' today' : ''}">${day}</span>`;
            if (entry) {
                let cp = null;
                if (entry.evaluation && _EVAL_CP[entry.evaluation]) cp = _EVAL_CP[entry.evaluation];
                else if (entry.emotion) {
                    const emo = Array.isArray(entry.emotion) ? entry.emotion[0] : entry.emotion;
                    cp = _EMO_CP[emo];
                }
                if (cp) inner = `<img class="svcard-cal-emoji" src="${_notoGif(cp)}" alt="" loading="lazy">`;
                else inner = `<span class="svcard-cal-dot"></span>`;
            }
            cellsHTML += `<span class="svcard-cal-cell${isToday ? ' today' : ''}${entry ? ' has-entry' : ''}">${inner}</span>`;
        }

        // Month label
        const mNames = lang === 'en'
            ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
            : lang === 'ja'
            ? ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
            : ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
        const monthLabel = lang === 'en' ? `${mNames[month]} ${year}` : `${year}${lang === 'ja' ? '年' : '년'} ${mNames[month]}`;

        return `
            <div class="svcard-diary-calendar">
                <div class="svcard-cal-header">
                    <h3>${translate('svcard_title_diary')}</h3>
                    <span class="svcard-cal-month">${monthLabel}</span>
                </div>
                <div class="svcard-cal-grid">
                    ${dowHTML}
                    ${cellsHTML}
                </div>
                <p class="sv-card-desc">${translate('totalEntries') || '총'} ${totalCount}${translate('entrySuffix') || '건'}</p>
            </div>`;
    });
}

// ─── Quest Card ────────────────────────────────────────────────
function renderQuestCard() {
    const { escapeHTML } = _d;
    _svCard('sv-card-quest', 'sv-card--clickable sv-card-with-image sv-card-image-quest', () => {
        let quests = [];
        try { quests = JSON.parse(localStorage.getItem('shiftv_quests') || '[]'); } catch { /**/ }

        const title = _svCardTitle('svcard_title_quest');
        const activeQuests = quests.filter(q => q.status !== 'completed').slice(0, 3);

        if (activeQuests.length === 0) {
            return `${title}<p class="placeholder">${translate('svcard_no_quest_yet')}</p>`;
        }

        const content = activeQuests.map(q => {
            let pct = 0;
            const tt = q.trackingType || 'manual';
            if (tt === 'progress') {
                pct = Math.max(0, Math.min(100, q.progressValue ?? 0));
            } else if (tt === 'dday' && q.targetDate) {
                const start = q.createdAt ? new Date(q.createdAt).getTime() : Date.now();
                const target = new Date(q.targetDate).getTime();
                const total = target - start;
                pct = total <= 0 ? 100 : Math.max(0, Math.min(100, ((Date.now() - start) / total) * 100));
            } else {
                const range = (q.targetValue || 0) - (q.initialValue || 0);
                pct = range === 0 ? 0 : Math.max(0, Math.min(100, (((q.currentValue || 0) - (q.initialValue || 0)) / range) * 100));
            }
            pct = Math.round(pct);
            return `
                <div class="quest-preview-item">
                    <div class="quest-preview-header">
                        <span class="quest-preview-title">${escapeHTML(q.title || q.name || '')}</span>
                        <span class="quest-preview-pct">${pct}%</span>
                    </div>
                    <div class="quest-preview-bar"><div class="quest-preview-fill" style="width:${pct}%"></div></div>
                </div>`;
        }).join('');

        return title + content;
    });
}

// ─── Health Card ───────────────────────────────────────────────
function renderHealthCard() {
    const { measurements, currentMode, biologicalSex, targets, addNotification } = _d;
    const currentLanguage = getCurrentLanguage() || 'ko';
    _svCard('sv-card-health', 'sv-card--clickable', () => {
        const title = _svCardTitle('svcard_title_health');

        if (!measurements || measurements.length === 0) {
            return `${title}<p class="placeholder">${translate('svcard_no_health_data')}</p>`;
        }

        return `${title}
            <div class="health-preview">
                ${svgIcon('shield', 'mi-sm')}
                <span>${translate('svcard_health_tap')}</span>
            </div>
            <div id="health-card-alerts" class="health-card-alerts-container"></div>`;
    });

    // Async: load symptom/alert data for the widget
    if (measurements && measurements.length > 0) {
        import('../../doctor-module/core/doctor-engine.js').then(module => {
            const DoctorEngine = module.DoctorEngine || module.default;
            const userSettings = {
                mode: currentMode || 'mtf',
                biologicalSex: biologicalSex || 'male',
                language: currentLanguage || 'ko',
                targets: targets || {}
            };
            const engine = new DoctorEngine(measurements, userSettings);
            const briefing = engine.generateHealthBriefing();
            const alertsEl = document.getElementById('health-card-alerts');
            if (!alertsEl) return;

            const alerts = briefing?.alerts || [];
            const criticalAlerts = alerts.filter(a => a.level === 'critical');
            const warningAlerts = alerts.filter(a => a.level === 'warning');
            const infoAlerts = alerts.filter(a => a.level === 'info' || a.level === 'good');

            if (criticalAlerts.length === 0 && warningAlerts.length === 0) {
                const okLabel = translate('health_no_issues') || (currentLanguage === 'ja' ? '特に問題なし' : currentLanguage === 'en' ? 'No issues detected' : '특이사항 없음');
                alertsEl.innerHTML = `
                    <div class="health-chip health-chip--good">
                        ${svgIcon('check_circle')}
                        <span>${okLabel}</span>
                    </div>`;
                return;
            }

            let html = '';
            const maxShow = 3;
            const topAlerts = [...criticalAlerts.slice(0, maxShow), ...warningAlerts.slice(0, Math.max(0, maxShow - criticalAlerts.length))].slice(0, maxShow);

            topAlerts.forEach(alert => {
                const isCritical = alert.level === 'critical';
                const icon = isCritical ? 'error' : 'warning';
                const cls = isCritical ? 'health-chip--critical' : 'health-chip--warning';
                const msg = alert.title || alert.message || alert.description || '';
                html += `
                    <div class="health-chip ${cls}">
                        ${svgIcon(icon)}
                        <span>${msg}</span>
                    </div>`;
            });

            const remaining = (criticalAlerts.length + warningAlerts.length) - topAlerts.length;
            if (remaining > 0) {
                html += `<div class="health-chip health-chip--more">+${remaining} ${translate('more') || (currentLanguage === 'ja' ? '件' : currentLanguage === 'en' ? 'more' : '건')}</div>`;
            }

            alertsEl.innerHTML = html;

            // Push health notification for new critical issues (session-once)
            if (criticalAlerts.length > 0 && !sessionStorage.getItem('healthNotifSent')) {
                sessionStorage.setItem('healthNotifSent', '1');
                if (typeof addNotification === 'function') {
                    addNotification({
                        type: 'health',
                        title: `건강 이슈 ${criticalAlerts.length}건 발견`,
                        body: criticalAlerts[0]?.title || criticalAlerts[0]?.message || '건강 분석 탭을 확인하세요.',
                    });
                }
            }
        }).catch(e => {
            console.warn('[HealthCard] Failed to load alerts:', e);
        });
    }
}

// 모든 SV 카드를 한번에 렌더링하는 마스터 함수
export function renderSvTab() {
    const { measurements, targets, currentMode, _svRenderPersonaCard } = _d;
    const svGrid = document.querySelector('.sv-grid');
    if (!svGrid) return;

    renderShortcutCard();
    renderHighlightsCard();
    renderGuideCard();
    renderTargetsCard();
    renderHormonesCard();
    renderDiaryCard();
    renderQuestCard();
    renderHealthCard();

    // 계정/프로필 카드 (sv-cards.js 모듈에서 렌더링)
    const svCardPersona = document.getElementById('sv-card-persona');
    if (svCardPersona) {
        try {
            _svRenderPersonaCard(svCardPersona, { measurements, targets, currentMode });
        } catch (e) {
            console.error('[SV Card #sv-card-persona] render error:', e);
        }
    }
}

function renderShortcutCard() {
    const { measurements, toLocalDayIndex, getMeasurementBaseDate } = _d;
    const svCardShortcut = document.getElementById('sv-card-shortcut');
    if (!svCardShortcut) return;

    try {
        svCardShortcut.className = 'sv-card sv-card--clickable';

        if (!measurements || measurements.length === 0) {
            // No data yet — show first-entry prompt with icon
            svCardShortcut.style.setProperty('--shortcut-bg-pct', '8%');
            svCardShortcut.innerHTML = `
                <div class="shortcut-card shortcut--new">
                    ${svgIcon('add_circle', 'shortcut-new-icon')}
                    <div class="shortcut-detail">${translate('svcard_shortcut_new')}</div>
                </div>`;
            return;
        }

        const lastMeasurement = measurements[measurements.length - 1];

        let lastTimestamp = lastMeasurement.timestamp;
        if (!lastTimestamp || isNaN(new Date(lastTimestamp).getTime())) {
            if (lastMeasurement.date) {
                lastTimestamp = new Date(lastMeasurement.date).getTime();
            } else {
                lastTimestamp = Date.now();
            }
        }

        const todayBase = new Date();
        todayBase.setHours(0, 0, 0, 0);
        const todayIndex = toLocalDayIndex(todayBase);
        const lastBase = getMeasurementBaseDate(lastMeasurement) || todayBase;
        const lastIndex = toLocalDayIndex(lastBase) ?? todayIndex;
        const daysSinceLast = todayIndex - lastIndex;
        const nextIndex = lastIndex + 7;
        const daysUntil = nextIndex - todayIndex;

        // Progressive background: 5% per day since last measurement
        const bgPct = Math.min(Math.max(daysSinceLast * 5, 0), 50);
        svCardShortcut.style.setProperty('--shortcut-bg-pct', `${bgPct}%`);

        let ddayLabel = '';
        let ddayClass = '';
        let detailText = '';

        if (daysUntil <= 0) {
            const overdue = Math.abs(daysUntil);
            if (daysUntil === 0) {
                ddayLabel = 'D-Day';
                ddayClass = 'shortcut-dday--dday';
                detailText = translate('svcard_shortcut_dday');
            } else {
                ddayLabel = `D+${overdue}`;
                ddayClass = 'shortcut-dday--overdue';
                detailText = translate('svcard_shortcut_overdue', { days: overdue });
            }
        } else {
            ddayLabel = `D-${daysUntil}`;
            if (daysUntil <= 1) { ddayClass = 'shortcut-dday--urgent'; }
            else if (daysUntil <= 3) { ddayClass = 'shortcut-dday--soon'; }
            else { ddayClass = 'shortcut-dday--ok'; }
            detailText = translate('svcard_shortcut_countdown', { days: daysUntil });
        }

        svCardShortcut.innerHTML = `
            <div class="shortcut-card">
                <div class="shortcut-dday ${ddayClass}">${ddayLabel}</div>
                <div class="shortcut-detail">${detailText}</div>
            </div>`;
    } catch (error) {
        console.error('Error in renderShortcutCard:', error);
        svCardShortcut.innerHTML = `<div class="shortcut-detail">${translate('svcard_shortcut_new')}</div>`;
    }
}


export { renderQuestCard };
