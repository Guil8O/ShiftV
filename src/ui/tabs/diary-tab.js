/**
 * ShiftV Diary Tab  Calendar & Bottom Sheet logic (v2)
 *
 * - Renders a monthly calendar grid with large emoji mood indicators
 * - Two-tier emotion system: evaluation (5 moods) + secondary emotion (8 tags)
 * - Score slider 1-10 with badge on calendar cell
 * - Stores data in localStorage (shiftv_diary) with date-keyed entries
 */

import { today as getToday } from '../../utils.js';

const DIARY_STORAGE_KEY = 'shiftv_diary';

// ── Noto Animated Emoji ──────────────────────────────────────────────────────
const NOTO_BASE = 'https://fonts.gstatic.com/s/e/notoemoji/latest';
function notoGif(cp) { return `${NOTO_BASE}/${cp}/512.gif`; }

// localStorage availability check (Edge Tracking Prevention 대응)
let _storageAvailable = null;
function isStorageAvailable() {
    if (_storageAvailable !== null) return _storageAvailable;
    try {
        const testKey = '__diary_test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        _storageAvailable = true;
    } catch {
        _storageAvailable = false;
    }
    return _storageAvailable;
}
const _inMemoryStore = {};

// Evaluation (평가 계열)
const EVALUATION_CFG = {
    great:    { emoji: String.fromCodePoint(0x1F604), cp: '1f604', cssClass: 'mood-great' },   // 😄
    good:     { emoji: String.fromCodePoint(0x1F60A), cp: '1f60a', cssClass: 'mood-good' },    // 😊
    okay:     { emoji: String.fromCodePoint(0x1F610), cp: '1f610', cssClass: 'mood-okay' },    // 😐
    bad:      { emoji: String.fromCodePoint(0x1F61E), cp: '1f61e', cssClass: 'mood-bad' },     // 😞
    terrible: { emoji: String.fromCodePoint(0x1F616), cp: '1f616', cssClass: 'mood-terrible' }, // 😖
};

// Secondary Emotion (주요 감정)
const EMOTION_CFG = {
    sad:       { emoji: String.fromCodePoint(0x1F622), cp: '1f622' }, // 😢
    dizzy:     { emoji: String.fromCodePoint(0x1F635), cp: '1f635' }, // 😵
    angry:     { emoji: String.fromCodePoint(0x1F621), cp: '1f621' }, // 😡
    surprised: { emoji: String.fromCodePoint(0x1F62E), cp: '1f62e' }, // 😮
    shocked:   { emoji: String.fromCodePoint(0x1F631), cp: '1f631' }, // 😱
    bored:     { emoji: String.fromCodePoint(0x1F611), cp: '1f611' }, // 😑
    excited:   { emoji: String.fromCodePoint(0x1F970), cp: '1f970' }, // 🥰
    love:      { emoji: '\u2764\uFE0F',               cp: '2764_fe0f' }, // ❤️
};

// Legacy mood  evaluation mapping
const LEGACY_MOOD_MAP = {
    happy: 'good', neutral: 'okay', sad: 'bad',
    angry: 'bad', tired: 'bad', energetic: 'good', hopeful: 'good',
};

export class DiaryTab {
    constructor() {
        const now = new Date();
        this.year  = now.getFullYear();
        this.month = now.getMonth();

        this.monthTitle  = document.getElementById('diary-month-title');
        this.dayGrid     = document.getElementById('diary-day-grid');
        this.prevBtn     = document.getElementById('diary-prev-month');
        this.nextBtn     = document.getElementById('diary-next-month');
        this.emptyState  = document.getElementById('diary-empty-state');

        this.sheet           = document.getElementById('diary-bottom-sheet');
        this.backdrop        = document.getElementById('diary-sheet-backdrop');
        this.sheetDate       = document.getElementById('diary-sheet-date');
        this.closeBtn        = document.getElementById('diary-sheet-close');
        this.evalSelector    = document.getElementById('diary-mood-selector');
        this.emotionSelector = document.getElementById('diary-emotion-selector');
        this.scoreSlider     = document.getElementById('diary-score-slider');
        this.scoreDisplay    = document.getElementById('diary-score-display');
        this.textArea        = document.getElementById('diary-text');
        this.charCount       = document.getElementById('diary-char-count');
        this.saveBtn         = document.getElementById('diary-save-btn');
        this.deleteBtn       = document.getElementById('diary-delete-btn');

        this.selectedDate = null;
        this.scoreActive  = false;
        this.diaryData    = this._loadFromStorage();

        this._bindEvents();
        this.render();
    }

    _loadFromStorage() {
        try {
            if (isStorageAvailable()) {
                return JSON.parse(localStorage.getItem(DIARY_STORAGE_KEY) || '{}');
            }
            return _inMemoryStore[DIARY_STORAGE_KEY] ? JSON.parse(_inMemoryStore[DIARY_STORAGE_KEY]) : {};
        } catch { return {}; }
    }

    _saveToStorage() {
        try {
            const data = JSON.stringify(this.diaryData);
            if (isStorageAvailable()) {
                localStorage.setItem(DIARY_STORAGE_KEY, data);
            } else {
                _inMemoryStore[DIARY_STORAGE_KEY] = data;
            }
        } catch (e) { console.warn('[Diary] Storage unavailable:', e.message); }
    }

    _bindEvents() {
        this.prevBtn?.addEventListener('click', () => {
            this.month--;
            if (this.month < 0) { this.month = 11; this.year--; }
            this.render();
        });
        this.nextBtn?.addEventListener('click', () => {
            this.month++;
            if (this.month > 11) { this.month = 0; this.year++; }
            this.render();
        });

        this.closeBtn?.addEventListener('click', () => this.closeSheet());
        this.backdrop?.addEventListener('click', () => this.closeSheet());

        this.evalSelector?.addEventListener('click', e => {
            const chip = e.target.closest('.diary-eval-chip');
            if (!chip) return;
            const wasActive = chip.classList.contains('active');
            this.evalSelector.querySelectorAll('.diary-eval-chip').forEach(c => c.classList.remove('active'));
            if (!wasActive) chip.classList.add('active');
        });

        this.emotionSelector?.addEventListener('click', e => {
            const chip = e.target.closest('.diary-emotion-chip');
            if (chip) chip.classList.toggle('active');
        });

        this.scoreSlider?.addEventListener('input', () => {
            this.scoreActive = true;
            if (this.scoreDisplay) this.scoreDisplay.textContent = this.scoreSlider.value;
        });

        this.textArea?.addEventListener('input', () => {
            if (this.charCount) this.charCount.textContent = this.textArea.value.length;
        });

        this.saveBtn?.addEventListener('click', () => this._handleSave());
        this.deleteBtn?.addEventListener('click', () => this._handleDelete());
    }

    render() {
        this._renderTitle();
        this._renderGrid();
        if (this.emptyState) this.emptyState.style.display = 'none';
    }

    _renderTitle() {
        if (!this.monthTitle) return;
        const lang = window.currentLanguage || 'ko';
        const namesKo = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
        const namesEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const namesJa = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
        if (lang === 'en') {
            this.monthTitle.textContent = `${namesEn[this.month]} ${this.year}`;
        } else if (lang === 'ja') {
            this.monthTitle.textContent = `${this.year}年${namesJa[this.month]}`;
        } else {
            this.monthTitle.textContent = `${this.year}년 ${namesKo[this.month]}`;
        }
    }

    _renderGrid() {
        if (!this.dayGrid) return;
        this.dayGrid.innerHTML = '';

        const firstDay    = new Date(this.year, this.month, 1).getDay();
        const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
        const todayStr    = getToday();

        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'diary-day-cell empty';
            const inner = document.createElement('div');
            inner.className = 'diary-cell-inner';
            empty.appendChild(inner);
            const num = document.createElement('span');
            num.className = 'diary-day-num';
            empty.appendChild(num);
            this.dayGrid.appendChild(empty);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${this.year}-${String(this.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const entry   = this._resolvedEntry(this.diaryData[dateStr]);

            const cell = document.createElement('div');
            cell.className = 'diary-day-cell';
            cell.dataset.date = dateStr;
            if (dateStr === todayStr) cell.classList.add('today');
            if (entry) cell.classList.add('has-entry');
            if (entry?.evaluation) cell.classList.add(EVALUATION_CFG[entry.evaluation]?.cssClass || '');
            if (entry?.text?.trim()) cell.classList.add('has-text');

            const inner = document.createElement('div');
            inner.className = 'diary-cell-inner';

            // Score-based background: score 1 = 0%, score 10 = 80% opacity of --primary
            if (entry?.score != null) {
                const pct = ((entry.score - 1) / 9 * 80).toFixed(1);
                inner.style.setProperty('--score-opacity', `${pct}%`);
            }

            if (entry?.evaluation) {
                const cfg = EVALUATION_CFG[entry.evaluation];
                const emojiEl = document.createElement('img');
                emojiEl.className = 'diary-cell-emoji noto-emoji';
                emojiEl.src = notoGif(cfg.cp);
                emojiEl.alt = cfg.emoji;
                emojiEl.loading = 'lazy';
                inner.appendChild(emojiEl);

                // Mood dot below emoji
                const dot = document.createElement('span');
                dot.className = 'diary-mood-dot';
                inner.appendChild(dot);
            } else if (entry?.emotion) {
                const emotions = Array.isArray(entry.emotion) ? entry.emotion : [entry.emotion];
                if (emotions.length) {
                    const ecfg = EMOTION_CFG[emotions[0]];
                    if (ecfg) {
                        const emojiEl = document.createElement('img');
                        emojiEl.className = 'diary-cell-emoji noto-emoji';
                        emojiEl.src = notoGif(ecfg.cp);
                        emojiEl.alt = ecfg.emoji;
                        emojiEl.loading = 'lazy';
                        inner.appendChild(emojiEl);
                    }
                }
            }

            if (entry?.score != null) {
                const badge = document.createElement('span');
                badge.className = 'diary-score-badge';
                badge.textContent = entry.score;
                inner.appendChild(badge);
            }

            cell.appendChild(inner);

            const dayNum = document.createElement('span');
            dayNum.className = 'diary-day-num';
            dayNum.textContent = day;
            cell.appendChild(dayNum);

            cell.addEventListener('click', () => this.openSheet(dateStr));
            this.dayGrid.appendChild(cell);
        }
    }

    _resolvedEntry(entry) {
        if (!entry) return null;
        if (!entry.evaluation && entry.mood && LEGACY_MOOD_MAP[entry.mood]) {
            return { ...entry, evaluation: LEGACY_MOOD_MAP[entry.mood] };
        }
        return entry;
    }

    openSheet(dateStr) {
        this.selectedDate = dateStr;
        if (this.sheetDate) this.sheetDate.textContent = dateStr;

        const raw   = this.diaryData[dateStr] || {};
        const entry = this._resolvedEntry(raw);

        this.evalSelector?.querySelectorAll('.diary-eval-chip').forEach(c => {
            c.classList.toggle('active', c.dataset.evaluation === entry?.evaluation);
        });

        const activeEmotions = Array.isArray(entry?.emotion)
            ? entry.emotion
            : (entry?.emotion ? [entry.emotion] : []);
        this.emotionSelector?.querySelectorAll('.diary-emotion-chip').forEach(c => {
            c.classList.toggle('active', activeEmotions.includes(c.dataset.emotion));
        });

        this.scoreActive = entry?.score != null;
        if (this.scoreSlider) this.scoreSlider.value = entry?.score ?? 5;
        if (this.scoreDisplay) this.scoreDisplay.textContent = entry?.score != null ? entry.score : '';

        if (this.textArea) {
            this.textArea.value = entry?.text || '';
            if (this.charCount) this.charCount.textContent = (entry?.text || '').length;
        }

        if (this.deleteBtn) {
            const hasData = !!(entry?.evaluation || entry?.emotion || entry?.score != null || entry?.text);
            this.deleteBtn.style.display = hasData ? 'inline-flex' : 'none';
        }

        this.sheet?.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    closeSheet() {
        this.sheet?.classList.remove('open');
        document.body.style.overflow = '';
        this.selectedDate = null;
    }

    _handleSave() {
        if (!this.selectedDate) return;

        const evaluation = this.evalSelector?.querySelector('.diary-eval-chip.active')?.dataset.evaluation || null;
        const emotions   = [...(this.emotionSelector?.querySelectorAll('.diary-emotion-chip.active') || [])].map(c => c.dataset.emotion);
        const text       = this.textArea?.value?.trim() || null;
        // Always save slider value if any content is being saved (fix: empty text shouldn't skip score)
        const hasContent = !!(evaluation || emotions.length || text || this.scoreActive);
        const score      = hasContent ? Number(this.scoreSlider?.value ?? 5) : null;

        if (!evaluation && !emotions.length && score == null && !text) {
            delete this.diaryData[this.selectedDate];
        } else {
            this.diaryData[this.selectedDate] = {
                ...(this.diaryData[this.selectedDate] || {}),
                date:      this.selectedDate,
                evaluation,
                emotion:   emotions.length ? emotions : null,
                score,
                text,
                updatedAt: Date.now(),
            };
        }

        this._saveToStorage();
        this.render();

        // Notification hook (window.addNotification exposed by script.js)
        if (typeof window.addNotification === 'function' && (evaluation || emotions.length || text)) {
            window.addNotification({
                type: 'diary',
                title: `${this.selectedDate} 다이어리 저장됨`,
                body: text ? text.slice(0, 60) : (evaluation ? `기분: ${evaluation}` : '감정 기록이 저장됐어요.'),
            });
        }

        this.closeSheet();
    }

    _handleDelete() {
        if (!this.selectedDate) return;
        delete this.diaryData[this.selectedDate];
        this._saveToStorage();
        this.render();
        this.closeSheet();
    }

    setMoodForDate(dateStr, legacyMood) {
        if (!dateStr) return;
        const evaluation = LEGACY_MOOD_MAP[legacyMood] || 'okay';
        this.diaryData[dateStr] = {
            ...(this.diaryData[dateStr] || {}),
            date: dateStr, evaluation,
            updatedAt: Date.now(),
        };
        this._saveToStorage();
        const [y, m] = dateStr.split('-').map(Number);
        if (y === this.year && m === this.month + 1) this.render();
    }

    getDiaryEntry(dateStr) { return this.diaryData[dateStr] || null; }

    getMonthData(year, month) {
        const prefix = `${year}-${String(month).padStart(2,'0')}`;
        return Object.fromEntries(
            Object.entries(this.diaryData).filter(([k]) => k.startsWith(prefix))
        );
    }

    refreshFromStorage() {
        this.diaryData = this._loadFromStorage();
        this.render();
    }
}
