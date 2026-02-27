/**
 * Quest Management Modal (구 Planning Notes)
 * - 퀘스트 카드 리스트 (핀/즐겨찾기/상태 정렬)
 * - 새 퀘스트 생성 다이얼로그
 * - 진행도 바 (초기→현재→목표)
 * - localStorage `shiftv_quests` 저장
 */

import { today as getToday } from '../../utils.js';
import { BaseModal } from './base-modal.js';
import { chartZoomState, ensureChartWrapperContainer, applyChartZoom, ensureChartZoomControls } from '../chart-zoom.js';
import { svgIcon } from '../icon-paths.js';

const STORAGE_KEY = 'shiftv_quests';

const LINKABLE_FIELDS = [
    { key: 'weight', ko: '체중 (kg)', en: 'Weight (kg)', ja: '体重 (kg)' },
    { key: 'bodyFatPercentage', ko: '체지방률 (%)', en: 'Body Fat (%)', ja: '体脂肪率 (%)' },
    { key: 'muscleMass', ko: '골격근량 (kg)', en: 'Muscle Mass (kg)', ja: '筋肉量 (kg)' },
    { key: 'chest', ko: '가슴 둘레 (cm)', en: 'Chest (cm)', ja: 'バスト (cm)' },
    { key: 'waist', ko: '허리 둘레 (cm)', en: 'Waist (cm)', ja: 'ウエスト (cm)' },
    { key: 'hips', ko: '엉덩이 둘레 (cm)', en: 'Hips (cm)', ja: 'ヒップ (cm)' },
    { key: 'shoulder', ko: '어깨 너비 (cm)', en: 'Shoulder (cm)', ja: '肩幅 (cm)' },
    { key: 'thigh', ko: '허벅지 둘레 (cm)', en: 'Thigh (cm)', ja: '太もも (cm)' },
    { key: 'arm', ko: '팔 둘레 (cm)', en: 'Arm (cm)', ja: '腕 (cm)' },
    { key: 'height', ko: '신장 (cm)', en: 'Height (cm)', ja: '身長 (cm)' },
    { key: 'estrogenLevel', ko: '에스트로겐 (pg/mL)', en: 'Estrogen (pg/mL)', ja: 'エストロゲン (pg/mL)' },
    { key: 'testosteroneLevel', ko: '테스토스테론 (ng/dL)', en: 'Testosterone (ng/dL)', ja: 'テストステロン (ng/dL)' },
];

const CATEGORIES = [
    { key: 'body', icon: svgIcon('fitness_center', 'category-icon'), ko: '신체', en: 'Body', ja: '身体' },
    { key: 'exercise', icon: svgIcon('directions_run', 'category-icon'), ko: '운동', en: 'Exercise', ja: '運動' },
    { key: 'diet', icon: svgIcon('restaurant', 'category-icon'), ko: '식단', en: 'Diet', ja: '食事' },
    { key: 'lifestyle', icon: svgIcon('dark_mode', 'category-icon'), ko: '생활', en: 'Lifestyle', ja: '生活' },
    { key: 'hormone', icon: svgIcon('medication', 'category-icon'), ko: '호르몬', en: 'Hormone', ja: 'ホルモン' },
    { key: 'custom', icon: svgIcon('auto_awesome', 'category-icon'), ko: '기타', en: 'Custom', ja: 'その他' },
];

const DAY_KEYS = [
    { key: 'daily', labelKey: 'questAlarmDaily' },
    { key: 'mon', labelKey: 'questAlarmMon' },
    { key: 'tue', labelKey: 'questAlarmTue' },
    { key: 'wed', labelKey: 'questAlarmWed' },
    { key: 'thu', labelKey: 'questAlarmThu' },
    { key: 'fri', labelKey: 'questAlarmFri' },
    { key: 'sat', labelKey: 'questAlarmSat' },
    { key: 'sun', labelKey: 'questAlarmSun' },
];

export class QuestModal extends BaseModal {
    constructor(options = {}) {
        super();
        this.language = options.language || 'ko';
        this.translate = options.translate || (k => k);
        this.measurements = options.measurements || [];
        this.onChange = options.onChange || null; // callback when quests change
        this.quests = this._load();
        this.sortOrder = 'pinned'; // pinned | newest | oldest | progress
        this.filterCategory = 'all';
        this.editingQuest = null;
    }

    _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const quests = raw ? JSON.parse(raw) : [];
            return this._migrate(quests);
        } catch { return []; }
    }

    // ── Schema v2 migration: add trackingType to legacy quests ──
    _migrate(quests) {
        let changed = false;
        quests.forEach(q => {
            if (!q.trackingType) {
                q.trackingType = q.linkedMeasurementField ? 'linked' : 'manual';
                changed = true;
            }
            if (q.trackingType === 'progress' && q.progressValue == null) {
                q.progressValue = 0;
                changed = true;
            }
            if (!q.alarm) {
                q.alarm = { enabled: false, days: ['daily'], time: '09:00' };
                changed = true;
            }
        });
        if (changed) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(quests)); } catch {}
        }
        return quests;
    }

    _save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.quests));
        if (typeof this.onChange === 'function') {
            try { this.onChange(); } catch (e) { console.error('[QuestModal] onChange error:', e); }
        }
    }

    _t(key) {
        return this.translate(key) || key;
    }

    _fieldLabel(fieldKey) {
        const f = LINKABLE_FIELDS.find(f => f.key === fieldKey);
        if (!f) return fieldKey;
        return f[this.language] || f.en;
    }

    _categoryInfo(catKey) {
        return CATEGORIES.find(c => c.key === catKey) || CATEGORIES[CATEGORIES.length - 1];
    }

    // ── Date / history helpers ──
    _dDayInfo(dateStr) {
        const diffDays = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
        const label = diffDays > 0 ? `D-${diffDays}` : diffDays === 0 ? 'D-Day' : `D+${Math.abs(diffDays)}`;
        const cls = diffDays > 0 ? 'remaining' : diffDays === 0 ? 'today' : 'overdue';
        return { diffDays, label, cls };
    }

    _daysSince(isoStr) {
        return Math.floor((Date.now() - (isoStr ? new Date(isoStr) : new Date()).getTime()) / 86400000);
    }

    _sortedHistory(history) {
        return (history || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    }

    // ── Auto-sync quest currentValue from latest measurement ──
    _syncLinkedQuests() {
        if (!this.measurements.length) return;
        const latest = this.measurements[this.measurements.length - 1];
        let changed = false;
        this.quests.forEach(q => {
            if (q.trackingType === 'linked' && q.linkedMeasurementField && q.status === 'active') {
                const val = parseFloat(latest[q.linkedMeasurementField]);
                if (!isNaN(val) && val !== q.currentValue) {
                    q.currentValue = val;
                    q.history = q.history || [];
                    q.history.push({ date: latest.date || getToday(), value: val });
                    changed = true;
                }
            }
        });
        if (changed) this._save();
    }

    // ── Sorting ──
    _sortedQuests() {
        let list = [...this.quests];
        if (this.filterCategory !== 'all') {
            list = list.filter(q => q.category === this.filterCategory);
        }
        switch (this.sortOrder) {
            case 'pinned':
                list.sort((a, b) => {
                    if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
                    if (a.favorited !== b.favorited) return b.favorited ? 1 : -1;
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
                break;
            case 'newest':
                list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'oldest':
                list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'progress':
                list.sort((a, b) => this._progressPct(b) - this._progressPct(a));
                break;
        }
        return list;
    }

    _progressPct(quest) {
        switch (quest.trackingType || 'manual') {
            case 'progress':
                return Math.max(0, Math.min(100, quest.progressValue ?? 0));
            case 'dday': {
                if (!quest.targetDate) return 0;
                const start = quest.createdAt ? new Date(quest.createdAt).getTime() : Date.now();
                const target = new Date(quest.targetDate).getTime();
                const total = target - start;
                if (total <= 0) return 100;
                return Math.max(0, Math.min(100, ((Date.now() - start) / total) * 100));
            }
            default: {
                const range = quest.targetValue - quest.initialValue;
                if (range === 0) return quest.currentValue === quest.targetValue ? 100 : 0;
                const pct = ((quest.currentValue - quest.initialValue) / range) * 100;
                return Math.max(0, Math.min(100, pct));
            }
        }
    }

    // ══════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════

    open() {
        this._syncLinkedQuests();
        this._renderModal();
    }

    _onBeforeClose() {
        this._destroyCharts();
    }

    openCreateDialog(defaultCategory = null) {
        this.editingQuest = null;
        this._defaultCategory = (defaultCategory && defaultCategory !== 'all') ? defaultCategory
            : (this.filterCategory !== 'all' ? this.filterCategory : null);
        this._renderCreateDialog();
    }

    getQuests() {
        return [...this.quests];
    }

    getActiveQuests() {
        return this.quests.filter(q => q.status === 'active');
    }

    // ══════════════════════════════════════════════
    // RENDER — Main List Modal
    // ══════════════════════════════════════════════

    _renderModal() {
        const overlay = this._mount('quest-modal-overlay', `
            <div class="quest-modal-surface">
                <div class="quest-modal-header">
                    <h2>${this._t('questModalTitle')}</h2>
                    <button class="quest-modal-close" aria-label="Close">&times;</button>
                </div>
                <div class="quest-modal-toolbar">
                    <div class="quest-category-tabs">
                        <button class="quest-cat-tab ${this.filterCategory === 'all' ? 'active' : ''}" data-cat="all">${this._t('questCatAll')}</button>
                        ${CATEGORIES.map(c => `
                            <button class="quest-cat-tab ${this.filterCategory === c.key ? 'active' : ''}" data-cat="${c.key}">${c.icon} ${c[this.language] || c.en}</button>
                        `).join('')}
                    </div>
                    <div class="quest-sort-bar">
                        <select class="quest-sort-select">
                            <option value="pinned" ${this.sortOrder === 'pinned' ? 'selected' : ''}>${this._t('questSortPinned')}</option>
                            <option value="newest" ${this.sortOrder === 'newest' ? 'selected' : ''}>${this._t('questSortNewest')}</option>
                            <option value="oldest" ${this.sortOrder === 'oldest' ? 'selected' : ''}>${this._t('questSortOldest')}</option>
                            <option value="progress" ${this.sortOrder === 'progress' ? 'selected' : ''}>${this._t('questSortProgress')}</option>
                        </select>
                    </div>
                </div>
                <div class="quest-list-container"></div>
                <button class="quest-add-btn">
                    <span>＋</span> ${this._t('questAddNew')}
                </button>
            </div>
        `, '.quest-modal-close');

        // Category tabs
        overlay.querySelectorAll('.quest-cat-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.filterCategory = tab.dataset.cat;
                overlay.querySelectorAll('.quest-cat-tab').forEach(t => t.classList.toggle('active', t === tab));
                this._renderList();
            });
        });

        // Sort
        overlay.querySelector('.quest-sort-select').addEventListener('change', e => {
            this.sortOrder = e.target.value;
            this._renderList();
        });

        // Add button
        overlay.querySelector('.quest-add-btn').addEventListener('click', () => {
            this.openCreateDialog();
        });

        this._renderList();
    }

    _renderList() {
        const container = this.overlay?.querySelector('.quest-list-container');
        if (!container) return;

        this._destroyCharts();
        const sorted = this._sortedQuests();
        if (sorted.length === 0) {
            container.innerHTML = `
                <div class="quest-empty-state">
                    <div class="quest-empty-icon">${svgIcon('target', 'mi-xl')}</div>
                    <p>${this._t('questEmptyMessage')}</p>
                    <p class="quest-empty-hint">${this._t('questEmptyHint')}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sorted.map(q => this._renderCard(q)).join('');

        // Card interactions
        container.querySelectorAll('.quest-card').forEach(card => {
            const id = card.dataset.id;

            // Menu toggle
            card.querySelector('.quest-card-menu-btn')?.addEventListener('click', e => {
                e.stopPropagation();
                const menu = card.querySelector('.quest-card-menu-dropdown');
                menu?.classList.toggle('visible');
                // Close other menus
                container.querySelectorAll('.quest-card-menu-dropdown.visible').forEach(m => {
                    if (m !== menu) m.classList.remove('visible');
                });
            });

            // Menu actions
            card.querySelector('[data-action="pin"]')?.addEventListener('click', () => this._togglePin(id));
            card.querySelector('[data-action="fav"]')?.addEventListener('click', () => this._toggleFavorite(id));
            card.querySelector('[data-action="edit"]')?.addEventListener('click', () => this._editQuest(id));
            card.querySelector('[data-action="complete"]')?.addEventListener('click', () => this._completeQuest(id));
            card.querySelector('[data-action="delete"]')?.addEventListener('click', () => this._deleteQuest(id));

            // 슬라이더 입력 → 라벨 실시간 갱신 (progress: %, 열 타입: 단위)
            card.querySelector('.quest-record-slider')?.addEventListener('input', e => {
                const label = card.querySelector('.quest-record-slider-label');
                if (!label) return;
                const qType = quest.trackingType || 'manual';
                const unit = quest.unit ? ` ${quest.unit}` : '';
                label.textContent = qType === 'progress' ? `${e.target.value}%` : `${parseFloat(e.target.value)}${unit}`;
            });

            // Record button: toggle panel
            card.querySelector('.quest-record-btn')?.addEventListener('click', e => {
                e.stopPropagation();
                const panel = card.querySelector('.quest-record-panel');
                if (panel) panel.style.display = panel.style.display === 'none' ? '' : 'none';
            });

            // Record save
            card.querySelector('.quest-record-save')?.addEventListener('click', () => {
                const quest = this.quests.find(q => q.id === id);
                if (!quest) return;
                const date = card.querySelector('.quest-record-date')?.value || getToday();
                const qType = quest.trackingType || 'manual';
                let value;
                if (qType === 'progress') {
                    value = parseInt(card.querySelector('.quest-record-slider')?.value || '0', 10);
                } else {
                    // linked / manual: 슬라이더 값 사용
                    value = parseFloat(card.querySelector('.quest-record-slider')?.value ?? '0');
                }
                if (!isNaN(value)) this._recordValue(id, date, value, qType);
            });

            // History list: edit
            card.querySelectorAll('.quest-history-edit-btn').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    const date = btn.dataset.date;
                    const item = btn.closest('.quest-history-item');
                    if (!item) return;
                    if (item.classList.contains('editing')) {
                        // Save
                        const input = item.querySelector('.quest-history-edit-input');
                        const newVal = parseFloat(input?.value ?? btn.dataset.value);
                        if (!isNaN(newVal)) {
                            const q = this.quests.find(q => q.id === id);
                            if (q) this._recordValue(id, date, newVal, q.trackingType || 'manual');
                        }
                    } else {
                        // Enter edit mode
                        item.classList.add('editing');
                        const wrap = item.querySelector('.quest-history-value-wrap');
                        const q = this.quests.find(q => q.id === id);
                        const isProgress = q?.trackingType === 'progress';
                        if (wrap) wrap.innerHTML = `<input class="quest-history-edit-input" type="number" value="${btn.dataset.value}" ${isProgress ? 'min="0" max="100"' : ''} step="${isProgress ? '1' : 'any'}">`;
                        const iconEl = btn.querySelector('.svg-icon');
                        if (iconEl) iconEl.outerHTML = svgIcon('check', 'mi-sm');
                    }
                });
            });

            // History list: delete
            card.querySelectorAll('.quest-history-delete-btn').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    const date = btn.dataset.date;
                    const q = this.quests.find(q => q.id === id);
                    if (!q) return;
                    q.history = (q.history || []).filter(h => h.date !== date);
                    // Recalculate currentValue/progressValue from latest remaining entry
                    const remaining = this._sortedHistory(q.history);
                    if (remaining.length > 0) {
                        if (q.trackingType === 'progress') q.progressValue = remaining[0].value;
                        else q.currentValue = remaining[0].value;
                    }
                    q.updatedAt = new Date().toISOString();
                    this._save();
                    this._renderList();
                });
            });

            // Detail panel toggle
            card.querySelector('.quest-detail-toggle')?.addEventListener('click', e => {
                e.stopPropagation();
                const panel = card.querySelector('.quest-detail-panel');
                const btn = card.querySelector('.quest-detail-toggle');
                if (!panel) return;

                const isOpen = panel.style.display !== 'none';
                if (isOpen) {
                    panel.style.display = 'none';
                    btn.classList.remove('expanded');
                    // Destroy chart
                    const canvas = panel.querySelector('.quest-history-canvas');
                    if (canvas?.__chartInstance) {
                        canvas.__chartInstance.destroy();
                        canvas.__chartInstance = null;
                    }
                } else {
                    panel.style.display = 'block';
                    btn.classList.add('expanded');
                    // Render chart
                    requestAnimationFrame(() => {
                        const canvas = panel.querySelector('.quest-history-canvas');
                        const quest = this.quests.find(q => q.id === id);
                        if (canvas && quest) this._renderHistoryChart(quest, canvas);
                    });
                }
            });
        });

        // Close menus on outside click
        document.addEventListener('click', () => {
            container.querySelectorAll('.quest-card-menu-dropdown.visible').forEach(m => m.classList.remove('visible'));
        }, { once: true });
    }

    _renderCard(quest) {
        const pct = this._progressPct(quest);
        const cat = this._categoryInfo(quest.category);
        const trackingType = quest.trackingType || 'manual';
        const statusClass = quest.status === 'completed' ? 'quest-completed' : '';
        const pinnedClass = quest.pinned ? 'quest-pinned' : '';
        const canRecord = trackingType !== 'dday' && trackingType !== 'linked' && quest.status !== 'completed';
        const today = getToday();

        // Creation elapsed
        const daysSince = this._daysSince(quest.createdAt);
        const createdStr = quest.createdAt ? quest.createdAt.split('T')[0] : '';

        // Last record info
        const sortedHist = this._sortedHistory(quest.history);
        const lastRecord = sortedHist[0];
        const lastRecordDate = lastRecord?.date || null;
        const lastRecordDaysSince = lastRecordDate
            ? Math.floor((Date.now() - new Date(lastRecordDate).getTime()) / 86400000)
            : null;

        // sideHtml: dday는 D-Day 카운트늤운 표시, 나머지는 기록 버튼
        let sideHtml = '';
        if (quest.status !== 'completed') {
            if (trackingType === 'dday') {
                const ddayInfo = quest.targetDate ? this._dDayInfo(quest.targetDate) : null;
                sideHtml = `
            <div class="quest-card-side quest-card-side--dday">
                ${ddayInfo ? `
                <div class="quest-side-dday-display ${ddayInfo.cls}">
                    <span class="quest-side-dday-badge">${ddayInfo.label}</span>
                    <span class="quest-side-label">${quest.targetDate}</span>
                </div>` : ''}
            </div>`;
            } else if (trackingType === 'linked') {
                sideHtml = `
            <div class="quest-card-side quest-card-side--linked">
                ${svgIcon('link', 'quest-linked-icon')}
                <span class="quest-side-label">${this._t('questLinkedLabel')}</span>
            </div>`;
            } else {
                sideHtml = `
            <div class="quest-card-side">
                <button class="quest-record-btn" aria-label="${this._t('questRecordBtn')}">
                    ${svgIcon('add_circle')}
                </button>
                ${lastRecordDate ? `
                <div class="quest-side-last">
                    <strong class="quest-side-dday">D+${lastRecordDaysSince}</strong>
                    <span class="quest-side-label">${this._t('questLastRecordDate')}</span>
                    <span class="quest-side-date">${lastRecordDate.replace(/-/g, '.')}</span>
                </div>` : `<div class="quest-side-last"><span class="quest-side-label">${this._t('questNoRecord')}</span></div>`}
            </div>`;
            }
        }

        return `
            <div class="quest-card ${statusClass} ${pinnedClass}" data-id="${quest.id}">
                <div class="quest-card-top">
                    <div class="quest-card-badges">
                        ${quest.pinned ? `<span class="quest-badge pin">${svgIcon('push_pin', 'mi-sm')}</span>` : ''}
                        ${quest.favorited ? `<span class="quest-badge fav">${svgIcon('star', 'mi-sm mi-filled')}</span>` : ''}
                        <span class="quest-badge cat">${cat.icon} ${cat[this.language] || cat.en}</span>
                        ${trackingType === 'linked' ? `<span class="quest-badge linked">${svgIcon('link', 'mi-sm')} ${this._fieldLabel(quest.linkedMeasurementField)}</span>` : ''}
                        ${trackingType === 'dday' ? `<span class="quest-badge dday">${svgIcon('event', 'mi-sm')} D-Day</span>` : ''}
                        ${trackingType === 'progress' ? `<span class="quest-badge progress">${svgIcon('tune', 'mi-sm')}</span>` : ''}
                        ${quest.status === 'completed' ? `<span class="quest-badge done">${svgIcon('check_circle', 'mi-sm mi-success')}</span>` : ''}
                    </div>
                    <div class="quest-card-menu">
                        <button class="quest-card-menu-btn" aria-label="Menu">⋮</button>
                        <div class="quest-card-menu-dropdown">
                            <button data-action="pin">${quest.pinned ? svgIcon('push_pin', 'mi-sm') + '' + this._t('questUnpin') : svgIcon('push_pin', 'mi-sm') + '' + this._t('questPin')}</button>
                            <button data-action="fav">${quest.favorited ? svgIcon('star', 'mi-sm mi-filled') + '' + this._t('questUnfav') : svgIcon('star_border', 'mi-sm') + '' + this._t('questFav')}</button>
                            <button data-action="edit">${svgIcon('edit', 'mi-sm')} ${this._t('edit')}</button>
                            ${quest.status !== 'completed' ? `<button data-action="complete">${svgIcon('check_circle', 'mi-sm mi-success')} ${this._t('questComplete')}</button>` : ''}
                            <button data-action="delete" class="quest-menu-danger">${svgIcon('delete', 'mi-sm')} ${this._t('delete')}</button>
                        </div>
                    </div>
                </div>
                <div class="quest-card-body">
                    <div class="quest-card-main">
                        <div class="quest-elapsed-info">
                            <strong class="quest-elapsed-badge">D+${daysSince}</strong>
                            <span class="quest-elapsed-date">${createdStr}</span>
                        </div>
                        <h3 class="quest-card-title">${this._escHtml(quest.title)}</h3>
                        ${quest.description ? `<p class="quest-card-desc">${this._escHtml(quest.description)}</p>` : ''}
                        ${this._progressSectionHtml(quest, pct)}
                        ${canRecord ? (() => {
                            const unit = quest.unit ? ` ${quest.unit}` : '';
                            const minVal = quest.initialValue ?? 0;
                            const maxVal = quest.targetValue ?? (minVal + 100);
                            const safeMax = maxVal > minVal ? maxVal : minVal + 100;
                            const curVal = quest.currentValue ?? minVal;
                            const progressVal = Math.round(quest.progressValue || 0);
                            return `
                        <div class="quest-record-panel" style="display:none;">
                            <input type="date" class="quest-record-date" value="${today}">
                            ${trackingType === 'progress'
                                ? `<div class="quest-record-slider-wrap">
                                    <div class="quest-record-slider-row">
                                        <input type="range" class="quest-record-slider" min="0" max="100" step="1" value="${progressVal}">
                                        <span class="quest-record-slider-label">${progressVal}%</span>
                                    </div>
                                    <div class="quest-record-slider-ends"><span>0%</span><span>100%</span></div>
                                   </div>`
                                : `<div class="quest-record-slider-wrap">
                                    <div class="quest-record-slider-row">
                                        <input type="range" class="quest-record-slider" min="${minVal}" max="${safeMax}" step="0.1" value="${curVal}">
                                        <span class="quest-record-slider-label">${curVal}${unit}</span>
                                    </div>
                                    <div class="quest-record-slider-ends"><span>${minVal}${unit}</span><span>${safeMax}${unit}</span></div>
                                   </div>`
                            }
                            <button class="quest-record-save btn-tonal">${this._t('questRecordSave')}</button>
                        </div>`;
                        })() : ''}
                    </div>
                    ${sideHtml}
                </div>
                <button class="quest-detail-toggle" aria-label="Toggle detail">
                    ${svgIcon('expand_more', 'mi-sm')}
                    <span class="quest-detail-label">${this._t('questDetailView')}</span>
                </button>
                <div class="quest-detail-panel" style="display:none;">
                    ${this._renderDetailContent(quest)}
                </div>
            </div>
        `;
    }

    // ══════════════════════════════════════════════
    // RENDER — Detail Panel (History Graph)
    // ══════════════════════════════════════════════

    _renderDetailContent(quest) {
        const history = quest.history || [];
        const pct = this._progressPct(quest);
        const isLinked = !!quest.linkedMeasurementField;

        // D-Day calculation
        let dDayHtml = '';
        if (quest.targetDate) {
            const { label: dDayLabel, cls: dDayClass } = this._dDayInfo(quest.targetDate);
            dDayHtml = `<div class="quest-detail-dday ${dDayClass}">
                ${svgIcon('calendar_today', 'mi-sm')}
                <span class="quest-dday-label">${dDayLabel}</span>
                <span class="quest-dday-date">${quest.targetDate}</span>
            </div>`;
        }

        // Days since start
        const daysSinceStart = this._daysSince(quest.createdAt);

        // Value delta
        const delta = quest.currentValue - quest.initialValue;
        const deltaSign = delta >= 0 ? '+' : '';
        const remaining = quest.targetValue - quest.currentValue;

        // Stats row
        const statsHtml = `
            <div class="quest-detail-stats">
                <div class="quest-stat-item">
                    <span class="quest-stat-value">${daysSinceStart}</span>
                    <span class="quest-stat-label">${this._t('questStatDays')}</span>
                </div>
                <div class="quest-stat-item">
                    <span class="quest-stat-value">${deltaSign}${delta.toFixed(1)}</span>
                    <span class="quest-stat-label">${this._t('questStatChange')}</span>
                </div>
                <div class="quest-stat-item">
                    <span class="quest-stat-value">${remaining.toFixed(1)}</span>
                    <span class="quest-stat-label">${this._t('questStatRemaining')}</span>
                </div>
                <div class="quest-stat-item">
                    <span class="quest-stat-value">${Math.round(pct)}%</span>
                    <span class="quest-stat-label">${this._t('questStatProgress')}</span>
                </div>
            </div>`;

        // Milestone bar with markers
        const milestoneHtml = `
            <div class="quest-detail-milestone">
                <div class="quest-milestone-labels">
                    <span>${this._t('questFieldInitial')}: ${quest.initialValue}${quest.unit ? ' ' + quest.unit : ''}</span>
                    <span>${this._t('questFieldTarget')}: ${quest.targetValue}${quest.unit ? ' ' + quest.unit : ''}</span>
                </div>
                <div class="quest-milestone-track">
                    <div class="quest-milestone-fill" style="width:${pct}%"></div>
                    <div class="quest-milestone-marker" style="left:${pct}%">
                        <div class="quest-milestone-tooltip">${quest.currentValue}${quest.unit ? ' ' + quest.unit : ''}</div>
                    </div>
                    ${[25, 50, 75].map(m => `<div class="quest-milestone-tick" style="left:${m}%"></div>`).join('')}
                </div>
            </div>`;

        // Chart section
        const isDday = quest.trackingType === 'dday';
        let chartHtml;
        if (isDday) {
            chartHtml = this._ddayCalendarHtml(quest);
        } else if (history.length >= 2) {
            chartHtml = `<div class="quest-detail-chart-section">
                <h4 class="quest-detail-section-title">
                    ${svgIcon('show_chart', 'mi-sm')}
                    ${this._t('questHistoryTitle')}
                </h4>
                <div class="quest-chart-wrapper">
                    <div class="quest-chart-container">
                        <canvas class="quest-history-canvas" data-quest-id="${quest.id}"></canvas>
                    </div>
                </div>
                <div class="quest-point-info-card" style="display:none" aria-live="polite"></div>
               </div>`;
        } else {
            chartHtml = `<div class="quest-detail-no-history">
                ${svgIcon('timeline', 'mi-md')}
                <p>${this._t('questNoHistory')}</p>
               </div>`;
        }

        // Linked field info
        const linkedHtml = isLinked
            ? `<div class="quest-detail-linked">
                ${svgIcon('link', 'mi-sm')}
                ${this._t('questFieldLinked')}: <strong>${this._fieldLabel(quest.linkedMeasurementField)}</strong>
               </div>` : '';

        return `
            ${dDayHtml}
            ${statsHtml}
            ${milestoneHtml}
            ${chartHtml}
            ${linkedHtml}
            ${this._historyListHtml(quest)}
        `;
    }

    _historyListHtml(quest) {
        const history = this._sortedHistory(quest.history);
        if (history.length === 0) return '';
        const type = quest.trackingType || 'manual';
        const unit = quest.unit || '';
        const rows = history.map(h => {
            const display = type === 'progress' ? Math.round(h.value) + '%' : h.value + (unit ? ' ' + unit : '');
            return `
            <div class="quest-history-item" data-date="${h.date}">
                <div class="quest-history-date">${h.date.replace(/-/g, '.')}</div>
                <div class="quest-history-info">
                    <span class="quest-history-item-title">${this._escHtml(quest.title)}</span>
                    ${quest.description ? `<span class="quest-history-item-desc">${this._escHtml(quest.description)}</span>` : ''}
                </div>
                <div class="quest-history-value-wrap">
                    <span class="quest-history-value-badge">${display}</span>
                </div>
                <button class="quest-history-edit-btn" data-date="${h.date}" data-value="${h.value}" aria-label="Edit">
                    ${svgIcon('edit', 'mi-sm')}
                </button>
                <button class="quest-history-delete-btn" data-date="${h.date}" aria-label="Delete">
                    ${svgIcon('close', 'mi-sm')}
                </button>
            </div>`;
        }).join('');
        return `
        <div class="quest-history-list-section">
            <h4 class="quest-detail-section-title">
                ${svgIcon('history', 'mi-sm')}
                기록 히스토리
            </h4>
            <div class="quest-history-list">${rows}</div>
        </div>`;
    }

    // ── Progress section HTML (type-aware) ──
    _progressSectionHtml(quest, pct) {
        const type = quest.trackingType || 'manual';
        const unitSuf = quest.unit ? ` ${quest.unit}` : '';

        if (type === 'progress') {
            return `
                <div class="quest-progress-section">
                    <div class="quest-progress-bar">
                        <div class="quest-progress-fill" style="width:${pct}%;"></div>
                    </div>
                    <div class="quest-progress-pct">${Math.round(pct)}%</div>
                </div>`;
        }

        if (type === 'dday') {
            if (!quest.targetDate) return '';
            const { label, cls } = this._dDayInfo(quest.targetDate);
            return `
                <div class="quest-dday-main">
                    <span class="quest-dday-chip ${cls}">${label}</span>
                    <span class="quest-dday-date">${svgIcon('event', 'mi-sm mi-inline')} ${quest.targetDate}</span>
                </div>
                <div class="quest-progress-bar mt-xs">
                    <div class="quest-progress-fill" style="width:${pct}%;"></div>
                </div>`;
        }

        // linked / manual — display only (editing via record panel)
        const currentHtml = `<strong>${quest.currentValue}${unitSuf}</strong>`;
        return `
            <div class="quest-progress-section">
                <div class="quest-progress-labels">
                    <span class="quest-progress-init">${quest.initialValue}${unitSuf}</span>
                    <span class="quest-progress-current">${currentHtml}</span>
                    <span class="quest-progress-target">${quest.targetValue}${unitSuf}</span>
                </div>
                <div class="quest-progress-bar">
                    <div class="quest-progress-fill" style="width:${pct}%;"></div>
                </div>
                <div class="quest-progress-pct">${Math.round(pct)}%</div>
            </div>`;
    }

    // ── Live D-Day countdown preview in the create dialog ──
    _updateDdayPreview(dialogOverlay) {
        const dateInput = dialogOverlay.querySelector('#quest-target-date');
        const preview = dialogOverlay.querySelector('#quest-dday-preview');
        if (!preview) return;
        if (!dateInput?.value) { preview.innerHTML = ''; return; }
        const { label, cls } = this._dDayInfo(dateInput.value);
        preview.innerHTML = `<span class="quest-dday-chip ${cls}">${label}</span>`;
    }

    _renderHistoryChart(quest, canvas) {
        if (typeof Chart === 'undefined') return;
        const history = (quest.history || []).slice().sort((a, b) => a.date.localeCompare(b.date));
        if (history.length < 2) return;

        const isProgress = quest.trackingType === 'progress';
        const labels = history.map(h => {
            const d = new Date(h.date);
            return `${d.getMonth() + 1}/${d.getDate()}`;
        });
        const values = history.map(h => h.value);

        const cs = getComputedStyle(document.documentElement);
        const primaryColor = cs.getPropertyValue('--primary').trim() || '#938fff';
        const tertiaryColor = cs.getPropertyValue('--tertiary').trim() || '#efb8c8';
        const textDim = cs.getPropertyValue('--text-dim2').trim() || '#999';
        const gridColor = cs.getPropertyValue('--glass-border').trim() || 'rgba(255,255,255,0.06)';

        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 200);
        gradient.addColorStop(0, primaryColor + '40');
        gradient.addColorStop(1, primaryColor + '05');

        const unit = quest.unit || '';
        const fmtVal = (v) => isProgress ? `${Math.round(v)}%` : `${v}${unit ? ' ' + unit : ''}`;

        // Main data dataset
        const datasets = [
            {
                label: this._t('questStatChange'),
                data: values,
                borderColor: primaryColor,
                backgroundColor: gradient,
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: primaryColor,
                pointBorderColor: primaryColor,
                borderWidth: 2,
            }
        ];

        // Target line
        const targetLineVal = isProgress ? 100 : quest.targetValue;
        if (targetLineVal != null) {
            datasets.push({
                label: this._t('questFieldTarget'),
                data: Array(labels.length).fill(targetLineVal),
                borderColor: tertiaryColor,
                borderDash: [6, 4],
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false,
            });
        }

        // Y axis config
        const yAxisConfig = isProgress
            ? {
                grid: { color: gridColor },
                min: 0, max: 105,
                ticks: { color: textDim, font: { size: 10 }, callback: v => v + '%' },
              }
            : {
                grid: { color: gridColor },
                ticks: { color: textDim, font: { size: 10 } },
                suggestedMin: Math.min(quest.initialValue ?? 0, ...values) * 0.95,
                suggestedMax: Math.max(quest.targetValue ?? 0, ...values) * 1.05,
              };

        // Point info card reference (resolved after chart is in DOM)
        const getInfoCard = () => canvas.closest('.quest-detail-chart-section')?.querySelector('.quest-point-info-card');

        const chart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                onClick: (_evt, elements) => {
                    if (!elements.length) return;
                    const idx = elements[0].index;
                    const h = history[idx];
                    const infoCard = getInfoCard();
                    if (!infoCard) return;
                    const curVal = isProgress ? (quest.progressValue ?? 0) : quest.currentValue;
                    const tgtVal = isProgress ? 100 : quest.targetValue;
                    infoCard.style.display = '';
                    infoCard.innerHTML = `
                        <div class="qpic-header">
                            ${svgIcon('touch_app', 'mi-sm')}
                            ${h.date.replace(/-/g, '.')}
                        </div>
                        <div class="qpic-grid">
                            <div class="qpic-col">
                                <span class="qpic-label">${this._t('questFieldInitial')}</span>
                                <span class="qpic-value">${fmtVal(quest.initialValue)}</span>
                            </div>
                            <div class="qpic-col qpic-selected">
                                <span class="qpic-label">${this._t('questPointSelected')}</span>
                                <span class="qpic-value">${fmtVal(h.value)}</span>
                            </div>
                            <div class="qpic-col">
                                <span class="qpic-label">${this._t('questFieldCurrent')}</span>
                                <span class="qpic-value">${fmtVal(curVal)}</span>
                            </div>
                            <div class="qpic-col">
                                <span class="qpic-label">${this._t('questFieldTarget')}</span>
                                <span class="qpic-value">${fmtVal(tgtVal)}</span>
                            </div>
                        </div>`;
                },
                plugins: {
                    legend: {
                        display: datasets.length > 1,
                        labels: {
                            color: textDim,
                            font: { size: 11 },
                            boxWidth: 12,
                            padding: 8,
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30,30,30,0.95)',
                        titleColor: '#fff',
                        bodyColor: '#ccc',
                        borderColor: primaryColor,
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 10,
                        callbacks: {
                            label: (item) => `${item.dataset.label}: ${fmtVal(item.raw)}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: textDim, font: { size: 10 }, maxRotation: 45 }
                    },
                    y: yAxisConfig,
                }
            }
        });

        // Store chart ref for cleanup
        canvas.__chartInstance = chart;

        // Apply zoom controls (chart-zoom.js)
        const wrapper = canvas.closest('.quest-chart-wrapper');
        const inner = canvas.closest('.quest-chart-container');
        if (wrapper && inner) {
            const chartId = `quest-chart-${quest.id}`;
            ensureChartWrapperContainer(wrapper);
            ensureChartZoomControls(chart, wrapper, inner, history.length, chartId);
            applyChartZoom(chart, wrapper, inner, history.length, chartId);
        }
    }

    _ddayCalendarHtml(quest) {
        const targetDateStr = quest.targetDate || '';
        const dDayResult = targetDateStr ? this._dDayInfo(targetDateStr) : { label: '—', cls: '' };
        const today = new Date();
        const target = targetDateStr ? new Date(targetDateStr) : null;

        const calDate = target || today;
        const year = calDate.getFullYear();
        const month = calDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const locale = this.language === 'ja' ? 'ja-JP' : this.language === 'ko' ? 'ko-KR' : 'en-US';
        const monthName = new Date(year, month, 1).toLocaleDateString(locale, { year: 'numeric', month: 'long' });

        const dayKeys = ['daySun', 'dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat'];
        const headers = dayKeys.map(k => `<div class="qcal-header-cell">${this._t(k)}</div>`).join('');

        const todayStr = today.toISOString().slice(0, 10);
        let cells = '';
        for (let i = 0; i < firstDay; i++) cells += `<div class="qcal-day qcal-empty"></div>`;
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isTargetDay = dateStr === targetDateStr;
            const isPast = dateStr < todayStr && !isToday;
            let cls = 'qcal-day';
            if (isPast) cls += ' qcal-past';
            if (isToday) cls += ' qcal-today';
            if (isTargetDay) cls += ' qcal-target';
            cells += `<div class="${cls}" title="${dateStr}">${d}</div>`;
        }

        const targetLabel = target
            ? target.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
            : '';

        return `
        <div class="quest-dday-calendar">
            <h4 class="quest-detail-section-title">
                ${svgIcon('event', 'mi-sm')}
                ${this._t('questDdayCalendar')}
            </h4>
            <div class="qcal-countdown ${dDayResult.cls}">
                <span class="qcal-dday-label">${dDayResult.label}</span>
                ${targetLabel ? `<span class="qcal-target-date">${targetLabel}</span>` : ''}
            </div>
            <div class="qcal-month-label">${monthName}</div>
            <div class="qcal-grid">
                <div class="qcal-header-row">${headers}</div>
                <div class="qcal-body">${cells}</div>
            </div>
        </div>`;
    }

    _destroyCharts() {
        if (!this.overlay) return;
        this.overlay.querySelectorAll('.quest-history-canvas').forEach(c => {
            if (c.__chartInstance) {
                c.__chartInstance.destroy();
                c.__chartInstance = null;
            }
        });
    }

    // ══════════════════════════════════════════════
    // RENDER — Create / Edit Dialog
    // ══════════════════════════════════════════════

    _renderCreateDialog() {
        const isEdit = !!this.editingQuest;
        const q = this.editingQuest || {
            title: '', description: '',
            category: this._defaultCategory || 'body',
            unit: '', initialValue: 0, currentValue: 0, targetValue: 0,
            targetDate: '', linkedMeasurementField: '',
            trackingType: 'manual', progressValue: 0,
            alarm: { enabled: false, days: ['daily'], time: '09:00' },
        };
        let currentType = q.trackingType || 'manual';
        let currentCategory = q.category || 'body';

        const TRACKING_TYPES = [
            { key: 'linked',   icon: 'link',      labelKey: 'questTypeLinked' },
            { key: 'manual',   icon: 'edit_note',  labelKey: 'questTypeManual' },
            { key: 'progress', icon: 'tune',       labelKey: 'questTypeProgress' },
            { key: 'dday',     icon: 'event',      labelKey: 'questTypeDday' },
        ];

        const typeGrid = TRACKING_TYPES.map(t => `
            <button type="button" class="quest-selector-btn ${currentType === t.key ? 'active' : ''}" data-type="${t.key}">
                ${svgIcon(t.icon)}
                <span class="quest-selector-label">${this._t(t.labelKey)}</span>
            </button>`).join('');

        const catGrid = CATEGORIES.map(c => `
            <button type="button" class="quest-selector-btn ${currentCategory === c.key ? 'active' : ''}" data-cat="${c.key}">
                ${c.icon}
                <span class="quest-selector-label">${c[this.language] || c.en}</span>
            </button>`).join('');

        const dialogOverlay = document.createElement('div');
        dialogOverlay.className = 'quest-dialog-overlay';
        dialogOverlay.innerHTML = `
            <div class="quest-dialog-surface">
                <h3>${isEdit ? this._t('questEditTitle') : this._t('questNewTitle')}</h3>
                <div class="quest-dialog-form">
                    <div class="quest-form-group">
                        <label>${this._t('questFieldTitle')}</label>
                        <input type="text" id="quest-title" value="${this._escHtml(q.title)}" placeholder="${this._t('questTitlePlaceholder')}" maxlength="100">
                    </div>
                    <div class="quest-form-group">
                        <label>${this._t('questFieldDesc')}</label>
                        <textarea id="quest-desc" rows="2" placeholder="${this._t('questDescPlaceholder')}" maxlength="300">${this._escHtml(q.description)}</textarea>
                    </div>

                    <!-- Category selector (2-col grid) -->
                    <div class="quest-form-group">
                        <label>${this._t('questFieldCategory')}</label>
                        <div class="quest-selector-grid" id="quest-category-grid">${catGrid}</div>
                    </div>

                    <!-- Tracking type selector (2-col grid) -->
                    <div class="quest-form-group">
                        <label>${this._t('questTrackingType')}</label>
                        <div class="quest-selector-grid" id="quest-type-grid">${typeGrid}</div>
                    </div>

                    <!-- Unit field (linked / manual only) -->
                    <div class="quest-form-group" id="qt-unit-group">
                        <label>${this._t('questFieldUnit')}</label>
                        <input type="text" id="quest-unit" value="${this._escHtml(q.unit)}" placeholder="kg, cm, %..." maxlength="20">
                    </div>

                    <!-- linked section -->
                    <div class="quest-tracking-section" id="qt-linked-section">
                        <div class="quest-form-group">
                            <label>${this._t('questFieldLinked')}</label>
                            <select id="quest-linked">
                                <option value="">${this._t('questLinkedNone')}</option>
                                ${LINKABLE_FIELDS.map(f => `<option value="${f.key}" ${q.linkedMeasurementField === f.key ? 'selected' : ''}>${f[this.language] || f.en}</option>`).join('')}
                            </select>
                            <small class="quest-linked-hint">${this._t('questLinkedHint')}</small>
                        </div>
                        <div class="quest-form-group">
                            <label>${this._t('questFieldTarget')}</label>
                            <input type="number" id="qt-linked-target" value="${q.targetValue || 0}" step="any">
                        </div>
                    </div>

                    <!-- manual section -->
                    <div class="quest-tracking-section" id="qt-manual-section">
                        <div class="quest-form-row quest-form-row-3">
                            <div class="quest-form-group">
                                <label>${this._t('questFieldInitial')}</label>
                                <input type="number" id="quest-initial" value="${q.initialValue}" step="any">
                            </div>
                            <div class="quest-form-group">
                                <label>${this._t('questFieldCurrent')}</label>
                                <input type="number" id="quest-current" value="${q.currentValue}" step="any">
                            </div>
                            <div class="quest-form-group">
                                <label>${this._t('questFieldTarget')}</label>
                                <input type="number" id="quest-target" value="${q.targetValue}" step="any">
                            </div>
                        </div>
                    </div>

                    <!-- progress section -->
                    <div class="quest-tracking-section" id="qt-progress-section">
                        <div class="quest-form-group">
                            <label>${this._t('questInitialProgress')}: <strong id="qt-progress-init-label">${Math.round(q.progressValue || 0)}%</strong></label>
                            <input type="range" id="qt-progress-init" min="0" max="100" step="1" value="${Math.round(q.progressValue || 0)}">
                        </div>
                        <p class="quest-tracking-hint">
                            ${svgIcon('info', 'mi-sm mi-inline')}
                            ${this._t('questProgressHint')}
                        </p>
                    </div>

                    <!-- dday section -->
                    <div class="quest-tracking-section" id="qt-dday-section">
                        <div class="quest-form-group">
                            <label>${this._t('questFieldTargetDate')}</label>
                            <input type="date" id="quest-target-date" value="${q.targetDate || ''}">
                        </div>
                        <div id="quest-dday-preview" class="quest-dday-preview"></div>
                    </div>

                    <!-- Alarm section -->
                    <div class="quest-form-group quest-alarm-section">
                        <div class="quest-alarm-header">
                            ${svgIcon('alarm', 'mi-sm')}
                            <span>${this._t('questAlarm')}</span>
                            <label class="quest-alarm-toggle-wrap">
                                <input type="checkbox" id="quest-alarm-enabled" ${q.alarm?.enabled ? 'checked' : ''}>
                                <span>${this._t('questAlarmEnabled')}</span>
                            </label>
                        </div>
                        <div id="quest-alarm-body" ${q.alarm?.enabled ? '' : 'style="display:none"'}>
                            <div class="quest-form-group">
                                <label>${this._t('questAlarmDays')}</label>
                                <div class="quest-alarm-days">
                                    ${DAY_KEYS.map(d => `<button type="button" class="quest-alarm-day-btn ${(q.alarm?.days || ['daily']).includes(d.key) ? 'active' : ''}" data-day="${d.key}">${this._t(d.labelKey)}</button>`).join('')}
                                </div>
                            </div>
                            <div class="quest-form-group">
                                <label>${this._t('questAlarmTime')}</label>
                                <input type="time" id="quest-alarm-time" value="${q.alarm?.time || '09:00'}">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="quest-dialog-actions">
                    <button class="btn-text quest-dialog-cancel">${this._t('cancel')}</button>
                    <button class="btn-filled quest-dialog-save">${this._t('save')}</button>
                </div>
            </div>
        `;

        // ── Category selection ──
        dialogOverlay.querySelectorAll('#quest-category-grid .quest-selector-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentCategory = btn.dataset.cat;
                dialogOverlay.querySelectorAll('#quest-category-grid .quest-selector-btn').forEach(b =>
                    b.classList.toggle('active', b === btn));
            });
        });

        // ── Tracking type switching ──
        const applyType = (type) => {
            currentType = type;
            dialogOverlay.querySelectorAll('#quest-type-grid .quest-selector-btn').forEach(c => {
                c.classList.toggle('active', c.dataset.type === type);
            });
            dialogOverlay.querySelectorAll('.quest-tracking-section').forEach(s => {
                s.style.display = 'none';
            });
            const sec = dialogOverlay.querySelector(`#qt-${type}-section`);
            if (sec) sec.style.display = '';
            // Unit field: only for linked / manual
            const unitGroup = dialogOverlay.querySelector('#qt-unit-group');
            if (unitGroup) unitGroup.style.display = (type === 'linked' || type === 'manual') ? '' : 'none';
            if (type === 'dday') this._updateDdayPreview(dialogOverlay);
        };

        dialogOverlay.querySelectorAll('#quest-type-grid .quest-selector-btn').forEach(btn => {
            btn.addEventListener('click', () => applyType(btn.dataset.type));
        });

        // Live D-Day preview on date change
        dialogOverlay.querySelector('#quest-target-date')?.addEventListener('input', () => {
            if (currentType === 'dday') this._updateDdayPreview(dialogOverlay);
        });

        applyType(currentType); // apply initial visibility

        // Progress init slider live label
        dialogOverlay.querySelector('#qt-progress-init')?.addEventListener('input', e => {
            const label = dialogOverlay.querySelector('#qt-progress-init-label');
            if (label) label.textContent = e.target.value + '%';
        });

        // Alarm toggle
        dialogOverlay.querySelector('#quest-alarm-enabled')?.addEventListener('change', e => {
            const body = dialogOverlay.querySelector('#quest-alarm-body');
            if (body) body.style.display = e.target.checked ? '' : 'none';
        });

        // Alarm day pill toggle
        dialogOverlay.querySelectorAll('.quest-alarm-day-btn').forEach(btn => {
            btn.addEventListener('click', () => btn.classList.toggle('active'));
        });

        // ── Dismiss ──
        dialogOverlay.querySelector('.quest-dialog-cancel').addEventListener('click', () => dialogOverlay.remove());
        dialogOverlay.addEventListener('click', e => { if (e.target === dialogOverlay) dialogOverlay.remove(); });

        // ── Save ──
        dialogOverlay.querySelector('.quest-dialog-save').addEventListener('click', () => {
            const title = dialogOverlay.querySelector('#quest-title').value.trim();
            if (!title) { dialogOverlay.querySelector('#quest-title').focus(); return; }

            const base = {
                title,
                description: dialogOverlay.querySelector('#quest-desc').value.trim(),
                category: currentCategory,
                trackingType: currentType,
                unit: '', initialValue: 0, currentValue: 0, targetValue: 0,
                progressValue: isEdit ? (this.editingQuest.progressValue ?? 0) : 0,
                targetDate: null, linkedMeasurementField: null,
            };

            switch (currentType) {
                case 'linked':
                    base.linkedMeasurementField = dialogOverlay.querySelector('#quest-linked').value || null;
                    base.targetValue = parseFloat(dialogOverlay.querySelector('#qt-linked-target').value) || 0;
                    base.unit = dialogOverlay.querySelector('#quest-unit')?.value.trim() || '';
                    break;
                case 'manual':
                    base.unit = dialogOverlay.querySelector('#quest-unit')?.value.trim() || '';
                    base.initialValue = parseFloat(dialogOverlay.querySelector('#quest-initial').value) || 0;
                    base.currentValue = parseFloat(dialogOverlay.querySelector('#quest-current').value) || 0;
                    base.targetValue = parseFloat(dialogOverlay.querySelector('#quest-target').value) || 0;
                    break;
                case 'progress':
                    base.progressValue = parseInt(dialogOverlay.querySelector('#qt-progress-init')?.value || '0', 10);
                    break;
                case 'dday':
                    base.targetDate = dialogOverlay.querySelector('#quest-target-date').value || null;
                    break;
            }

            base.alarm = {
                enabled: !!(dialogOverlay.querySelector('#quest-alarm-enabled')?.checked),
                days: [...dialogOverlay.querySelectorAll('.quest-alarm-day-btn.active')].map(b => b.dataset.day),
                time: dialogOverlay.querySelector('#quest-alarm-time')?.value || '09:00',
            };

            if (isEdit) {
                Object.assign(this.editingQuest, base);
                this.editingQuest.updatedAt = new Date().toISOString();
            } else {
                this.quests.push({
                    id: 'quest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                    ...base,
                    status: 'active',
                    pinned: false, favorited: false,
                    history: [],
                    createdAt: new Date().toISOString(),
                });
            }

            this._save();
            dialogOverlay.remove();
            this._renderList();
        });

        document.body.appendChild(dialogOverlay);
        requestAnimationFrame(() => dialogOverlay.classList.add('visible'));
    }

    // ══════════════════════════════════════════════
    // ACTIONS
    // ══════════════════════════════════════════════

    _togglePin(id) {
        const q = this.quests.find(q => q.id === id);
        if (q) { q.pinned = !q.pinned; this._save(); this._renderList(); }
    }

    _toggleFavorite(id) {
        const q = this.quests.find(q => q.id === id);
        if (q) { q.favorited = !q.favorited; this._save(); this._renderList(); }
    }

    _editQuest(id) {
        const q = this.quests.find(q => q.id === id);
        if (q) {
            this.editingQuest = q;
            this._renderCreateDialog();
        }
    }

    _completeQuest(id) {
        const q = this.quests.find(q => q.id === id);
        if (q) {
            q.status = 'completed';
            q.completedAt = new Date().toISOString();
            this._save();
            this._renderList();
        }
    }

    _deleteQuest(id) {
        if (!confirm(this._t('questDeleteConfirm'))) return;
        this.quests = this.quests.filter(q => q.id !== id);
        this._save();
        this._renderList();
    }

    _updateCurrentValue(id, value) {
        const today = getToday();
        const q = this.quests.find(q => q.id === id);
        if (!q) return;
        this._recordValue(id, today, value, q.trackingType || 'manual');
    }

    _recordValue(id, date, value, type = 'manual') {
        const q = this.quests.find(q => q.id === id);
        if (!q) return;
        q.history = q.history || [];
        const idx = q.history.findIndex(h => h.date === date);
        const entry = { date, value };
        if (idx >= 0) {
            q.history[idx] = entry;
        } else {
            q.history.push(entry);
        }
        if (type === 'progress') {
            q.progressValue = value;
        } else {
            q.currentValue = value;
        }
        q.updatedAt = new Date().toISOString();
        this._save();
        this._renderList();
    }

    // ── Utilities ──
    _escHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}
