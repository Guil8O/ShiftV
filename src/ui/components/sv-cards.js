/**
 * SV Tab — Card Renderers (Modularized)
 *
 * Self-contained render functions for SV tab widget cards:
 *   - Diary Card   → yesterday vs today mood emojis
 *   - Quest Card   → category-grouped swipeable carousel
 *   - Health Card  → current warnings summary
 *   - Persona Card → account info + circular-progress targets
 *
 * All carousels support swipe + mouse-hover arrow navigation.
 */

import { translate, getCurrentLanguage } from '../../translations.js';
import { addCarouselArrows, addCarouselDots } from '../utils/carousel-frame.js';
import { svgIcon } from '../icon-paths.js';

// ─── Helpers ──────────────────────────────────────────
function esc(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
    );
}

const MOOD_EMOJI = {
    happy: '😊', neutral: '😐', sad: '😢', angry: '😤',
    tired: '😴', energetic: '💪', hopeful: '🌿',
    great: '😊', good: '🙂', bad: '😟', terrible: '😢'
};

const QUEST_CATEGORIES = [
    { key: 'body',      icon: 'fitness_center', ko: '신체',    en: 'Body',      ja: '身体' },
    { key: 'exercise',  icon: 'directions_run',  ko: '운동',    en: 'Exercise',  ja: '運動' },
    { key: 'diet',      icon: 'restaurant',      ko: '식단',    en: 'Diet',      ja: '食事' },
    { key: 'lifestyle', icon: 'dark_mode',       ko: '생활',    en: 'Lifestyle', ja: '生活' },
    { key: 'hormone',   icon: 'medication',      ko: '호르몬',  en: 'Hormone',   ja: 'ホルモン' },
    { key: 'custom',    icon: 'auto_awesome',    ko: '기타',    en: 'Custom',    ja: 'その他' },
];

function _catLabel(key) {
    const lang = getCurrentLanguage?.() || 'ko';
    const c = QUEST_CATEGORIES.find(c => c.key === key);
    if (!c) return key;
    return c[lang] || c.ko;
}

function _catIcon(key) {
    const c = QUEST_CATEGORIES.find(c => c.key === key);
    return c?.icon || 'category';
}

// _addCarouselArrows and _addDots are now provided by carousel-frame.js (imported above)


// ═══════════════════════════════════════════════════════
// ─── Diary Card — Yesterday & Today Emojis ─────────────
// ═══════════════════════════════════════════════════════
export function renderDiaryCard(cardEl) {
    if (!cardEl) return;
    cardEl.className = 'sv-card sv-card--clickable';

    let diary = {};
    try { diary = JSON.parse(localStorage.getItem('shiftv_diary') || '{}'); } catch { /* */ }

    // Get today & yesterday dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const fmt = d => d.toISOString().slice(0, 10); // YYYY-MM-DD
    const todayKey = fmt(today);
    const yesterdayKey = fmt(yesterday);

    const todayEntry = diary[todayKey];
    const yesterdayEntry = diary[yesterdayKey];

    const todayEmoji = todayEntry?.mood ? (MOOD_EMOJI[todayEntry.mood] || '📝') : null;
    const yesterdayEmoji = yesterdayEntry?.mood ? (MOOD_EMOJI[yesterdayEntry.mood] || '📝') : null;

    const labelYesterday = translate('svcard_diary_yesterday') || '하루 전';
    const labelToday = translate('svcard_diary_today') || '오늘';

    if (!todayEmoji && !yesterdayEmoji) {
        // Empty state
        cardEl.innerHTML = `
            <div class="sv-card-content svcard-diary-empty">
                ${svgIcon('add_circle', 'mi-2xl mi-primary', 40)}
                <h3 class="sv-card-label">${translate('diaryTabTitle') || '다이어리'}</h3>
                <p class="sv-card-desc">${translate('svcard_diary_add') || '감정 일기 추가'}</p>
            </div>`;
        return;
    }

    const totalCount = Object.keys(diary).filter(k => diary[k]?.mood).length;

    cardEl.innerHTML = `
        <div class="sv-card-content">
            <div class="svcard-diary-row">
                <div class="svcard-diary-day">
                    <span class="svcard-diary-emoji ${yesterdayEmoji ? 'svcard-mood-small' : 'svcard-mood-empty'}">${yesterdayEmoji || '—'}</span>
                    <span class="svcard-diary-label">${labelYesterday}</span>
                </div>
                <div class="svcard-diary-day svcard-diary-today">
                    <span class="svcard-diary-emoji ${todayEmoji ? 'svcard-mood-big' : 'svcard-mood-empty'}">${todayEmoji || '—'}</span>
                    <span class="svcard-diary-label">${labelToday}</span>
                </div>
            </div>
            <h3 class="sv-card-label">${translate('diaryTabTitle') || '다이어리'}</h3>
            <p class="sv-card-desc">${translate('totalEntries') || '총'} ${totalCount}${translate('entrySuffix') || '건'}</p>
        </div>`;
}


// ═══════════════════════════════════════════════════════
// ─── Quest Card — Category-Grouped Carousel ──────────
// ═══════════════════════════════════════════════════════
export function renderQuestCard(cardEl) {
    if (!cardEl) return;
    cardEl.className = 'sv-card sv-card--clickable';

    let quests = [];
    try { quests = JSON.parse(localStorage.getItem('shiftv_quests') || '[]'); } catch { /* */ }

    if (!Array.isArray(quests) || quests.length === 0) {
        cardEl.innerHTML = `
            <div class="sv-card-content">
                ${svgIcon('emoji_events', 'mi-xl mi-primary')}
                <h3 class="sv-card-label">${translate('questTitle') || '퀘스트'}</h3>
                <p class="sv-card-desc">${translate('svcard_quest_empty') || '퀘스트를 시작해보세요'}</p>
            </div>`;
        return;
    }

    // Group quests by category (only categories that have quests)
    const grouped = {};
    quests.forEach(q => {
        const cat = q.category || 'custom';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(q);
    });

    const categoryKeys = Object.keys(grouped);

    // Build one slide per category
    const slides = categoryKeys.map(catKey => {
        const catQuests = grouped[catKey];
        const icon = _catIcon(catKey);
        const label = _catLabel(catKey);
        const active = catQuests.filter(q => !q.completed).length;
        const total = catQuests.length;

        const questListHTML = catQuests.slice(0, 4).map(q => {
            const progress = q.progress || 0;
            const target = q.target || 1;
            const pct = Math.min(100, Math.round((progress / target) * 100));
            const done = q.completed;

            return `
                <div class="svcard-quest-item ${done ? 'done' : ''}">
                    ${svgIcon(done ? 'check_circle' : 'radio_button_unchecked', 'svcard-quest-item-icon mi-sm')}
                    <span class="svcard-quest-item-title">${esc(q.title || q.name || '')}</span>
                    <span class="svcard-quest-item-pct">${pct}%</span>
                </div>`;
        }).join('');

        return `
            <div class="svcard-quest-slide">
                <div class="svcard-quest-slide-header">
                    ${svgIcon(icon, 'mi-sm mi-primary')}
                    <span class="svcard-quest-cat-label">${label}</span>
                    <span class="svcard-quest-count">${active}/${total}</span>
                </div>
                <div class="svcard-quest-list">
                    ${questListHTML}
                </div>
            </div>`;
    }).join('');

    const totalActive = quests.filter(q => !q.completed).length;

    // Dots
    const dotsHTML = categoryKeys.length > 1
        ? `<div class="svcard-dots">${categoryKeys.map((_, i) =>
            `<span class="svcard-dot ${i === 0 ? 'active' : ''}"></span>`
        ).join('')}</div>`
        : '';

    cardEl.innerHTML = `
        <div class="svcard-quest-header">
            ${svgIcon('emoji_events', 'mi-primary')}
            <h3 class="sv-card-label">${translate('questTitle') || '퀘스트'}</h3>
            <span class="svcard-quest-total">${totalActive}</span>
        </div>
        <div class="svcard-quest-carousel">${slides}</div>
        ${dotsHTML}`;

    addCarouselArrows(cardEl, '.svcard-quest-carousel');
    addCarouselDots(cardEl, '.svcard-quest-carousel', categoryKeys.length);
}


// ═══════════════════════════════════════════════════════
// ─── Health Card — Current Warnings ───────────────────
// ═══════════════════════════════════════════════════════
export function renderHealthCard(cardEl, measurements) {
    if (!cardEl) return;
    cardEl.className = 'sv-card sv-card--clickable';

    if (!measurements || measurements.length === 0) {
        cardEl.innerHTML = `
            <div class="sv-card-content">
                ${svgIcon('local_hospital', 'mi-xl mi-primary')}
                <h3 class="sv-card-label">${translate('healthModalTitle') || '건강 분석'}</h3>
                <p class="sv-card-desc">${translate('svcard_health_empty') || '기록을 추가하면 건강 분석이 시작됩니다'}</p>
            </div>`;
        return;
    }

    const latest = measurements[measurements.length - 1];
    const warnings = [];

    if (latest.bodyFatPercentage && (latest.bodyFatPercentage > 35 || latest.bodyFatPercentage < 10)) {
        warnings.push({ icon: 'monitor_weight', text: translate('healthBfWarning') || '체지방률 주의' });
    }
    if (latest.estrogenLevel && latest.estrogenLevel > 400) {
        warnings.push({ icon: 'science', text: translate('healthE2Warning') || 'E2 수치 높음' });
    }
    if (latest.weight && measurements.length >= 2) {
        const prev = measurements[measurements.length - 2];
        if (prev.weight && Math.abs(latest.weight - prev.weight) > 3) {
            warnings.push({ icon: 'trending_up', text: translate('healthWeightWarning') || '체중 급변' });
        }
    }
    if (latest.testosteroneLevel) {
        const mode = localStorage.getItem('shiftV_mode') || 'mtf';
        if (mode === 'mtf' && latest.testosteroneLevel > 50) {
            warnings.push({ icon: 'science', text: translate('healthTWarning') || 'T 수치 높음' });
        }
    }

    const statusIcon  = warnings.length > 0 ? 'warning' : 'check_circle';
    const statusColor = warnings.length > 0 ? 'var(--warning, #FFB400)' : 'var(--success, #4CAF50)';

    const warningListHTML = warnings.length > 0
        ? `<div class="svcard-health-warnings">
            ${warnings.map(w => `
                <div class="svcard-health-warning-item">
                    ${svgIcon(w.icon, 'mi-sm mi-warning')}
                    <span>${w.text}</span>
                </div>`).join('')}
           </div>`
        : `<p class="sv-card-desc" style="color:${statusColor}">${translate('healthAllGood') || '양호'}</p>`;

    cardEl.innerHTML = `
        <div class="sv-card-content">
            <span style="color:${statusColor}">${svgIcon(statusIcon, 'mi-xl')}</span>
            <h3 class="sv-card-label">${translate('healthModalTitle') || '건강 분석'}</h3>
            ${warningListHTML}
        </div>`;
}


// ═══════════════════════════════════════════════════════
// ─── Persona Card — Account + Circular Progress ──────
// ═══════════════════════════════════════════════════════

/** SVG circular progress ring */
function _circularProgress(pct, size = 56) {
    const r = (size - 6) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - Math.max(0, Math.min(pct, 100)) / 100);
    return `
        <svg class="svcard-circular" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <circle cx="${size/2}" cy="${size/2}" r="${r}"
                stroke="var(--md-sys-color-surface-variant, rgba(255,255,255,0.1))"
                stroke-width="5" fill="none"/>
            <circle cx="${size/2}" cy="${size/2}" r="${r}"
                stroke="var(--md-sys-color-primary)"
                stroke-width="5" fill="none"
                stroke-linecap="round"
                stroke-dasharray="${circ}"
                stroke-dashoffset="${offset}"
                transform="rotate(-90 ${size/2} ${size/2})"/>
            <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
                fill="var(--md-sys-color-on-surface)" font-size="13" font-weight="600">
                ${Math.round(pct)}%
            </text>
        </svg>`;
}

export function renderPersonaCard(cardEl, { measurements, targets, currentMode }) {
    if (!cardEl) return;
    cardEl.className = 'sv-card sv-card--clickable';

    const nickname = localStorage.getItem('shiftV_nickname') || '';
    const user = window.__shiftv_auth_user || null;
    const displayName = nickname || (user?.displayName) || translate('accountLocalUser') || '로컬 사용자';
    const avatarUrl = user?.photoURL || '';

    const modeLabels = {
        mtf: translate('modeMtf') || '여성화',
        ftm: translate('modeFtm') || '남성화',
        nb:  translate('modeNb')  || '논바이너리'
    };
    const modeLabel = modeLabels[currentMode] || modeLabels.mtf;
    const modeIcon = currentMode === 'ftm' ? 'male' : currentMode === 'nb' ? 'transgender' : 'female';
    const goalText = localStorage.getItem('shiftV_goalText') || '';

    // Slide 1: Account info
    const avatarHTML = avatarUrl
        ? `<img class="svcard-persona-avatar" src="${esc(avatarUrl)}" alt="">`
        : `<div class="svcard-persona-avatar svcard-persona-avatar--default">
               ${svgIcon('person', '', 28)}
           </div>`;

    let slide1 = `
        <div class="svcard-persona-slide">
            ${avatarHTML}
            <div class="svcard-persona-name">${esc(displayName)}</div>
            <div class="svcard-persona-mode">
                ${svgIcon(modeIcon, 'mi-sm')}
                ${modeLabel}
            </div>
            ${goalText ? `<div class="svcard-persona-goal">${esc(goalText)}</div>` : ''}
        </div>`;

    // Slide 2: Target measurements with bar progress (scrollable)
    let slide2 = '';
    if (targets && Object.keys(targets).length > 0 && measurements && measurements.length > 0) {
        const latest = measurements[measurements.length - 1];
        const initial = measurements[0];

        const targetItems = Object.entries(targets).map(([key, targetVal]) => {
            const tVal = parseFloat(targetVal);
            const curVal = parseFloat(latest[key]);
            const initVal = parseFloat(initial[key]);
            if ([tVal, curVal].some(isNaN)) return '';

            let pct = 0;
            const totalNeeded = tVal - (isNaN(initVal) ? curVal : initVal);
            if (Math.abs(totalNeeded) > 0.01) {
                pct = Math.round(((curVal - (isNaN(initVal) ? curVal : initVal)) / totalNeeded) * 100);
            } else {
                pct = 100;
            }
            pct = Math.max(0, Math.min(pct, 100));

            const label = translate(key) || key.replace(/([A-Z])/g, ' $1').trim();
            const unit = key.includes('eight') || key === 'muscleMass' ? 'kg'
                : key.includes('ercentage') ? '%' : 'cm';
            return `
                <div class="svcard-target-row">
                    <div class="svcard-target-row-header">
                        <span class="svcard-target-label">${esc(label)}</span>
                        <span class="svcard-target-values">${curVal} / ${tVal}${unit}</span>
                    </div>
                    <div class="svcard-target-bar">
                        <div class="svcard-target-fill" style="width:${pct}%"></div>
                    </div>
                    <div class="svcard-target-pct">${pct}%</div>
                </div>`;
        }).filter(Boolean).join('');

        if (targetItems) {
            slide2 = `
                <div class="svcard-persona-slide">
                    <h4 class="svcard-persona-target-title">
                        ${svgIcon('flag', 'mi-sm')}
                        ${translate('svcard_persona_targets') || '목표 달성률'}
                    </h4>
                    <div class="svcard-target-scroll">
                        ${targetItems}
                    </div>
                </div>`;
        }
    }

    // Build carousel
    const hasSlide2 = slide2 !== '';
    const dotsHTML = hasSlide2
        ? `<div class="svcard-dots">
            <span class="svcard-dot active"></span>
            <span class="svcard-dot"></span>
           </div>`
        : '';

    cardEl.innerHTML = `
        <div class="svcard-persona-carousel">${slide1}${slide2}</div>
        ${dotsHTML}`;

    if (hasSlide2) {
        addCarouselArrows(cardEl, '.svcard-persona-carousel');
        addCarouselDots(cardEl, '.svcard-persona-carousel', 2);
    }
}
