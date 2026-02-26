/**
 * PDF Monthly Report Generator — InBody-Style Comprehensive Report
 * Renders HTML → html2canvas → jsPDF for full CJK font support.
 *
 * Sections: Monthly Trend, Body Measurements, Health Metrics, Symptoms,
 * Medications, Target Achievement, Change Roadmap, Body Briefing,
 * Health Analysis, Hormone Journal, Mood Calendar.
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { DoctorEngine } from '../doctor-module/core/doctor-engine.js';
import { SYMPTOM_DATABASE } from '../doctor-module/data/symptom-database.js';
import { getMedicationById } from '../doctor-module/data/medication-database.js';

/* ═══════════ Palette — DARKER for print readability ═══════════ */
const P = {
    pri: '#7C3AED', priL: '#EDE9FE', priD: '#4C1D95',
    pk: '#DB2777', pkL: '#FCE7F3',
    gn: '#059669', gnL: '#D1FAE5',
    yw: '#D97706', ywL: '#FEF3C7',
    rd: '#DC2626', rdL: '#FEE2E2',
    bl: '#2563EB', blL: '#DBEAFE',
    g50: '#F9FAFB', g100: '#F3F4F6', g200: '#E5E7EB',
    tx: '#111827',   // main body text — near-black
    tx2: '#1F2937',  // secondary text — very dark gray
    tx3: '#374151',  // tertiary — dark gray
    txM: '#4B5563',  // muted text
    w: '#FFFFFF',
};

/* ═══════════ Field Definitions ═══════════ */
const BODY_FIELDS = [
    { k: 'height',                 l: { ko: '신장',   en: 'Height',    ja: '身長' },       u: 'cm' },
    { k: 'weight',                 l: { ko: '체중',   en: 'Weight',    ja: '体重' },       u: 'kg' },
    { k: 'shoulder',               l: { ko: '어깨',   en: 'Shoulder',  ja: '肩幅' },       u: 'cm' },
    { k: 'neck',                   l: { ko: '목',     en: 'Neck',      ja: '首' },         u: 'cm' },
    { k: 'chest',                  l: { ko: '윗가슴', en: 'U.Chest',   ja: '上胸' },       u: 'cm' },
    { k: 'underBustCircumference', l: { ko: '밑가슴', en: 'L.Chest',   ja: '下胸' },       u: 'cm' },
    { k: 'waist',                  l: { ko: '허리',   en: 'Waist',     ja: 'ウエスト' },   u: 'cm' },
    { k: 'hips',                   l: { ko: '엉덩이', en: 'Hips',      ja: 'ヒップ' },     u: 'cm' },
    { k: 'thigh',                  l: { ko: '허벅지', en: 'Thigh',     ja: '太もも' },     u: 'cm' },
    { k: 'calf',                   l: { ko: '종아리', en: 'Calf',      ja: 'ふくらはぎ' }, u: 'cm' },
    { k: 'arm',                    l: { ko: '팔뚝',   en: 'Arm',       ja: '腕' },         u: 'cm' },
];

const HEALTH_FIELDS = [
    { k: 'muscleMass',        l: { ko: '근육량', en: 'Muscle',  ja: '筋肉量' }, u: 'kg' },
    { k: 'bodyFatPercentage', l: { ko: '체지방', en: 'Fat%',    ja: '体脂肪' }, u: '%' },
    { k: 'estrogenLevel',     l: { ko: 'E₂',    en: 'E₂',      ja: 'E₂' },     u: 'pg/ml' },
    { k: 'testosteroneLevel', l: { ko: 'T',      en: 'T',       ja: 'T' },      u: 'ng/dl' },
    { k: 'libido',            l: { ko: '성욕',   en: 'Libido',  ja: '性欲' },   u: '/wk' },
];

/* key body metrics for monthly trend */
const TREND_KEYS = ['weight', 'chest', 'underBustCircumference', 'waist', 'hips', 'bodyFatPercentage', 'estrogenLevel', 'testosteroneLevel'];

/* ═══════════ Helpers ═══════════ */
function _medName(id, lang) {
    try {
        const m = getMedicationById(id);
        if (!m?.names) return id;
        const n = m.names;
        if (lang === 'ko') return n.find(s => /[가-힣]/.test(s)) || n[0] || id;
        if (lang === 'ja') return n.find(s => /[ぁ-んァ-ン]/.test(s)) || n[0] || id;
        return n.find(s => /[A-Za-z]/.test(s)) || n[0] || id;
    } catch { return id; }
}

function _symName(id, lang) {
    try {
        for (const g of Object.values(SYMPTOM_DATABASE)) {
            const s = g.symptoms?.find(x => x.id === id);
            if (s) return s[lang] || s.ko || s.en || id;
        }
    } catch { /* ignore */ }
    return id;
}

/** Strip HTML tags — handles `<span class="...">text</span>` from translations */
const _strip = s => String(s || '').replace(/<[^>]*>/g, '').trim();

const _d  = s => { if (!s) return '-'; const d = new Date(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
const _n  = (v, dp = 1) => (v == null || isNaN(v)) ? '-' : Number(v).toFixed(dp);
const _df = (a, b) => {
    if (a == null || b == null || isNaN(a) || isNaN(b)) return '';
    const d = (b - a).toFixed(1);
    return (d > 0 ? '+' : '') + d;
};
const _pc = p => p >= 80 ? P.gn : p >= 50 ? P.yw : p >= 25 ? P.bl : P.txM;
const _e  = s => _strip(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* shared inline-CSS tokens */
const TH = `padding:7px 5px;font-size:10px;font-weight:700;color:${P.priD};text-align:center;border-bottom:2px solid ${P.pri};`;
const TD = `padding:5px 4px;font-size:11px;text-align:center;border-bottom:1px solid ${P.g200};color:${P.tx};`;
const SEC = 'margin:0 30px;';
const CARD = `background:${P.w};border:1px solid ${P.g200};border-radius:10px;padding:14px;margin:6px 0;`;
/* page-break safety: each major section is a break-inside:avoid block */
const BRK = 'page-break-inside:avoid;break-inside:avoid;';

/* ═══════════ Main Class ═══════════ */
export class PDFReportGenerator {
    constructor({ measurements, diary, quests, targets, translate, language, mode, biologicalSex }) {
        this.m       = measurements || [];
        this.diary   = diary || {};
        this.quests  = quests || [];
        this.targets = targets || {};
        this.t       = translate || (k => k);
        this.lang    = language || 'ko';
        this.mode    = mode || 'mtf';
        this.sex     = biologicalSex || 'male';
    }

    /* ── public entry point ── */
    async generate(year, month) {
        /* 1. Run doctor-engine analysis */
        let briefing = null, roadmap = null;
        try {
            const eng = new DoctorEngine(this.m, {
                mode: this.mode,
                biologicalSex: this.sex,
                language: this.lang,
                targets: this.targets,
            });
            briefing = eng.generateHealthBriefing();
            roadmap  = eng.generateRoadmap();
        } catch (e) {
            console.warn('[PDF] DoctorEngine error:', e);
        }

        /* 2. Build HTML string */
        const monthData  = this._monthData(year, month);
        const recentData = monthData.slice(-5);
        const html = this._html(year, month, recentData, monthData, briefing, roadmap);

        /* 3. Render off-screen — collect section heights for smart page breaks */
        const el = document.createElement('div');
        el.innerHTML = html;
        el.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;';
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 100));

        /* 3b. Gather section boundary positions for smart slicing */
        const sectionEls = el.querySelectorAll('[data-pdf-section]');
        const sectionTops = [];
        sectionEls.forEach(s => sectionTops.push(s.offsetTop));

        const canvas = await html2canvas(el, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
        });
        document.body.removeChild(el);

        /* 4. Smart page-break slicing: avoid cutting mid-section */
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pw = 210, ph = 297;
        const pxPerMm = canvas.width / pw;
        const pageHpx = Math.floor(ph * pxPerMm);

        /* Build slice points that respect section boundaries */
        const slices = [];
        let cursor = 0;
        while (cursor < canvas.height) {
            let idealEnd = cursor + pageHpx;
            if (idealEnd >= canvas.height) {
                slices.push({ y: cursor, h: canvas.height - cursor });
                break;
            }
            /* Find best section boundary just before idealEnd (in 2x scale) */
            let bestBreak = idealEnd;
            const scaledSections = sectionTops.map(t => Math.round(t * 2)); // scale:2
            for (let i = scaledSections.length - 1; i >= 0; i--) {
                const st = scaledSections[i];
                if (st > cursor + 100 && st <= idealEnd && st >= idealEnd - pageHpx * 0.25) {
                    bestBreak = st;
                    break;
                }
            }
            slices.push({ y: cursor, h: bestBreak - cursor });
            cursor = bestBreak;
        }

        slices.forEach((s, i) => {
            if (i > 0) doc.addPage();
            const pc = document.createElement('canvas');
            pc.width  = canvas.width;
            pc.height = pageHpx;
            const ctx = pc.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, pc.width, pc.height);
            ctx.drawImage(canvas, 0, s.y, canvas.width, s.h, 0, 0, canvas.width, s.h);
            doc.addImage(pc.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pw, ph);
        });

        const fn = `ShiftV_Report_${year}_${String(month + 1).padStart(2, '0')}.pdf`;
        doc.save(fn);
        return fn;
    }

    /* ── data helpers ── */
    _monthData(y, m) {
        return this.m
            .filter(e => {
                const d = e.date || e.recordDate;
                if (!d) return false;
                const dt = new Date(d);
                return dt.getFullYear() === y && dt.getMonth() === m;
            })
            .sort((a, b) => new Date(a.date || a.recordDate) - new Date(b.date || b.recordDate));
    }

    _allDataSorted() {
        return [...this.m].sort((a, b) => new Date(a.date || a.recordDate) - new Date(b.date || b.recordDate));
    }

    /* ── full HTML assembly ── */
    _html(year, month, recent, all, br, rm) {
        const mn = ({
            ko: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
            en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
            ja: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
        }[this.lang] || [])[month] || `${month + 1}`;

        return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans KR','Noto Sans JP',sans-serif;color:${P.tx};line-height:1.5;background:#fff;">
${this._header(year, mn, all)}
${this._monthlyTrend()}
${this._table(BODY_FIELDS, recent, this.t('pdfBodyChanges') || '신체 변화', 'body')}
${this._table(HEALTH_FIELDS, recent, this.t('pdfHealthMetrics') || '건강 수치', 'health')}
${this._symptoms(recent)}
${this._medications(recent)}
${this._targetSection(br)}
${this._roadmapSection(rm)}
${this._bodyBriefing(br)}
${this._healthAnalysis(br)}
${this._hormoneJournal(br)}
${this._moodCalendar(year, month)}
${this._footer()}
</div>`;
    }

    /* ── reusable sub-components ── */
    _secH(icon, text) {
        return `<div data-pdf-section style="${BRK}display:flex;align-items:center;gap:8px;margin:24px 30px 10px;padding-bottom:7px;border-bottom:2px solid ${P.pri};">
<span style="font-size:16px;font-weight:800;color:${P.priD};">${icon}</span>
<span style="font-size:15px;font-weight:700;color:${P.priD};">${text}</span></div>`;
    }

    _noData(msg) {
        return `<div style="margin:4px 30px;padding:12px;background:${P.g50};border-radius:8px;color:${P.txM};font-size:12px;text-align:center;">${msg || '-'}</div>`;
    }

    /* ═══════════ 1. Header ═══════════ */
    _header(year, mn, all) {
        const mc = all.length;
        const qc = this.quests.filter(q => q.completed).length;
        return `<div data-pdf-section style="background:linear-gradient(135deg,${P.pri},${P.priD});padding:30px 30px 24px;color:#fff;">
<div style="display:flex;justify-content:space-between;align-items:flex-start;">
<div><div style="font-size:28px;font-weight:800;letter-spacing:-0.5px;">ShiftV</div>
<div style="font-size:18px;font-weight:600;margin-top:4px;">${year} ${mn} Report</div></div>
<div style="text-align:right;font-size:11px;opacity:.85;">${new Date().toLocaleDateString()}</div>
</div>
<div style="display:flex;gap:10px;margin-top:16px;">
<div style="background:rgba(255,255,255,.2);border-radius:10px;padding:12px 20px;text-align:center;">
<div style="font-size:24px;font-weight:700;">${mc}</div>
<div style="font-size:10px;opacity:.9;">${_strip(this.t('pdfMeasurementCount')) || '측정'}</div></div>
<div style="background:rgba(255,255,255,.2);border-radius:10px;padding:12px 20px;text-align:center;">
<div style="font-size:24px;font-weight:700;">${qc}</div>
<div style="font-size:10px;opacity:.9;">${_strip(this.t('pdfQuestsCompleted')) || '퀘스트 완료'}</div></div>
</div></div>`;
    }

    /* ═══════════ 1b. Monthly Trend Overview ═══════════ */
    _monthlyTrend() {
        const L = this.lang;
        let h = this._secH('&#9670;', { ko: '전체 추이', en: 'Overall Trend', ja: '全体推移' }[L] || '전체 추이');
        const sorted = this._allDataSorted();
        if (sorted.length < 2) return h + this._noData({ ko: '추이 데이터 부족 (2개 이상 필요)', en: 'Need 2+ records', ja: 'データ不足' }[L]);

        /* group by month */
        const groups = {};
        sorted.forEach(m => {
            const dt = new Date(m.date || m.recordDate);
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(m);
        });

        const months = Object.keys(groups).sort().slice(-6); // last 6 months
        if (months.length < 1) return h + this._noData('-');

        /* compute monthly averages */
        const allFields = [...BODY_FIELDS, ...HEALTH_FIELDS].filter(f => TREND_KEYS.includes(f.k));
        const avgData = months.map(mk => {
            const entries = groups[mk];
            const avg = {};
            allFields.forEach(f => {
                const vals = entries.map(e => parseFloat(e[f.k])).filter(v => !isNaN(v));
                avg[f.k] = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null;
            });
            return { month: mk, avg, count: entries.length };
        });

        /* render as table */
        const mlabels = avgData.map(a => {
            const [y, m] = a.month.split('-');
            return `${m}월`;
        });

        h += `<div style="${SEC}${BRK}overflow-x:auto;"><table style="width:100%;border-collapse:collapse;">`;
        h += `<tr style="background:${P.priL};">`;
        h += `<th style="${TH}text-align:left;width:70px;">${{ ko: '항목', en: 'Item', ja: '項目' }[L] || '항목'}</th>`;
        h += `<th style="${TH}width:30px;"></th>`;
        mlabels.forEach(ml => { h += `<th style="${TH}">${ml}</th>`; });
        const first = avgData[0], last = avgData[avgData.length - 1];
        h += `<th style="${TH}width:52px;color:${P.pri};">총Δ</th></tr>`;

        allFields.forEach((f, i) => {
            const bg = i % 2 === 0 ? P.w : P.g50;
            h += `<tr style="background:${bg};">`;
            h += `<td style="${TD}text-align:left;font-weight:600;font-size:10px;">${f.l[L] || f.l.ko}</td>`;
            h += `<td style="${TD}color:${P.txM};font-size:9px;">${f.u}</td>`;
            avgData.forEach(a => { h += `<td style="${TD}">${_n(a.avg[f.k])}</td>`; });
            const ch = _df(first.avg[f.k], last.avg[f.k]);
            const cc = !ch ? P.txM : ch.startsWith('+') ? P.gn : ch.startsWith('-') ? P.rd : P.tx3;
            h += `<td style="${TD}font-weight:700;color:${cc};">${ch || '-'}</td></tr>`;
        });

        /* record count row */
        h += `<tr style="background:${P.g100};"><td style="${TD}text-align:left;font-size:9px;color:${P.txM};">${{ ko: '기록수', en: 'Records', ja: '記録数' }[L] || '기록수'}</td><td style="${TD}"></td>`;
        avgData.forEach(a => { h += `<td style="${TD}font-size:9px;color:${P.txM};">${a.count}</td>`; });
        h += `<td style="${TD}"></td></tr>`;

        h += '</table></div>';
        return h;
    }

    /* ═══════════ 2 & 3. Data Tables (body / health) ═══════════ */
    _table(fields, entries, title, sectionId) {
        let h = this._secH(sectionId === 'body' ? '&#9997;' : '&#9883;', title);
        if (!entries.length) return h + this._noData(_strip(this.t('pdfNoData')) || '데이터가 없습니다.');

        const dates = entries.map(e => _d(e.date || e.recordDate));
        const first = entries[0], last = entries[entries.length - 1];
        const cw = entries.length <= 3 ? '80px' : '62px';

        h += `<div style="${SEC}${BRK}overflow-x:auto;"><table style="width:100%;border-collapse:collapse;">`;

        /* header row */
        h += `<tr style="background:${P.priL};">`;
        h += `<th style="${TH}text-align:left;width:70px;">${{ ko: '항목', en: 'Item', ja: '項目' }[this.lang] || '항목'}</th>`;
        h += `<th style="${TH}width:35px;color:${P.txM};font-size:9px;"></th>`;
        dates.forEach(d => { h += `<th style="${TH}width:${cw};">${d}</th>`; });
        h += `<th style="${TH}width:52px;color:${P.pri};">Δ</th></tr>`;

        /* data rows */
        fields.forEach((f, i) => {
            const bg = i % 2 === 0 ? P.w : P.g50;
            h += `<tr style="background:${bg};">`;
            h += `<td style="${TD}text-align:left;font-weight:600;font-size:10px;">${f.l[this.lang] || f.l.ko}</td>`;
            h += `<td style="${TD}color:${P.txM};font-size:9px;">${f.u}</td>`;
            entries.forEach(e => { h += `<td style="${TD}">${_n(e[f.k])}</td>`; });
            const ch = _df(first[f.k], last[f.k]);
            const cc = !ch ? P.txM : ch.startsWith('+') ? P.gn : ch.startsWith('-') ? P.rd : P.tx3;
            h += `<td style="${TD}font-weight:700;color:${cc};">${ch || '-'}</td></tr>`;
        });

        h += '</table></div>';
        return h;
    }

    /* ═══════════ 4. Symptoms ═══════════ */
    _symptoms(entries) {
        const lang = this.lang;
        let h = this._secH('&#9764;', _strip(this.t('symptoms')) || '증상');
        const hasAny = entries.some(e => e.symptoms?.length > 0);
        if (!hasAny) return h + this._noData({ ko: '기록된 증상 없음', en: 'No symptoms', ja: '症状なし' }[lang]);

        h += `<div style="${SEC}${BRK}">`;
        entries.forEach(e => {
            if (!e.symptoms?.length) return;
            h += `<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid ${P.g200};">`;
            h += `<div style="width:45px;font-weight:700;color:${P.tx2};font-size:11px;padding-top:2px;">${_d(e.date || e.recordDate)}</div>`;
            h += `<div style="flex:1;display:flex;flex-wrap:wrap;gap:4px;">`;
            e.symptoms.forEach(s => {
                const name = _symName(s.id, lang);
                const sev  = s.severity || '';
                const bg   = sev >= 4 ? P.rdL : sev >= 3 ? P.ywL : P.priL;
                const fg   = sev >= 4 ? P.rd  : sev >= 3 ? P.yw  : P.pri;
                h += `<span style="background:${bg};color:${fg};padding:3px 9px;border-radius:12px;font-size:10px;font-weight:600;">${_e(name)}${sev ? ` (${sev})` : ''}</span>`;
            });
            h += '</div></div>';
        });
        h += '</div>';
        return h;
    }

    /* ═══════════ 5. Medications ═══════════ */
    _medications(entries) {
        const lang = this.lang;
        let h = this._secH('&#9883;', _strip(this.t('medications')) || '투여 약물');
        const hasAny = entries.some(e => e.medications?.length > 0);
        if (!hasAny) return h + this._noData({ ko: '기록된 약물 없음', en: 'No medications', ja: '薬物なし' }[lang]);

        h += `<div style="${SEC}${BRK}">`;
        entries.forEach(e => {
            if (!e.medications?.length) return;
            h += `<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid ${P.g200};">`;
            h += `<div style="width:45px;font-weight:700;color:${P.tx2};font-size:11px;padding-top:2px;">${_d(e.date || e.recordDate)}</div>`;
            h += `<div style="flex:1;display:flex;flex-wrap:wrap;gap:4px;">`;
            e.medications.forEach(med => {
                const id   = med.id || med.medicationId;
                const name = _medName(id, lang);
                const dose = Number.isFinite(Number(med.dose)) ? Number(med.dose) : null;
                const unit = med.unit || '';
                const lbl  = dose ? `${name} ${dose}${unit}` : name;
                h += `<span style="background:${P.blL};color:${P.bl};padding:3px 9px;border-radius:12px;font-size:10px;font-weight:600;">${_e(lbl)}</span>`;
            });
            h += '</div></div>';
        });
        h += '</div>';
        return h;
    }

    /* ═══════════ 6. Target Achievement ═══════════ */
    _targetSection(br) {
        let h = this._secH('&#9678;', _strip(this.t('reportTargetTitle')) || '목표 달성도');
        const ta = br?.targetAchievement;
        if (!ta || !Object.keys(ta).length) return h + this._noData(_strip(this.t('reportNeedTarget')) || '목표가 설정되지 않았습니다.');

        h += `<div style="${SEC}${BRK}">`;
        Object.entries(ta).forEach(([key, info]) => {
            if (!info) return;
            const pct = Math.min(100, Math.max(0, Math.round(info.percentage || 0)));
            const label = _strip(this.t(key) || key);
            h += `<div style="margin:8px 0;">`;
            h += `<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">`;
            h += `<span style="font-weight:700;color:${P.tx2};">${_e(label)}</span>`;
            h += `<span style="color:${P.tx3};">${_n(info.current)} / ${_n(info.target)} (${pct}%)</span></div>`;
            h += `<div style="background:${P.g200};border-radius:6px;height:12px;overflow:hidden;">`;
            h += `<div style="background:${_pc(pct)};height:100%;width:${pct}%;border-radius:6px;"></div></div></div>`;
        });
        h += '</div>';
        return h;
    }

    /* ═══════════ 7. Change Roadmap ═══════════ */
    _roadmapSection(rm) {
        const L = this.lang;
        let h = this._secH('&#9654;', { ko: '변화 로드맵', en: 'Change Roadmap', ja: '変化ロードマップ' }[L] || '변화 로드맵');
        const s = rm?.summary;
        if (!s) return h + this._noData({ ko: '데이터 부족', en: 'Insufficient data', ja: 'データ不足' }[L]);

        /* overall progress */
        const op = s.overallProgress;
        if (op) {
            const pct = Math.min(100, Math.max(0, Math.round(op.percentage || 0)));
            h += `<div style="${SEC}${BRK}${CARD}">`;
            h += `<div style="font-size:13px;font-weight:800;color:${P.priD};margin-bottom:8px;">${{ ko: '전체 진행도', en: 'Overall Progress', ja: '全体進捗' }[L] || '전체 진행도'}</div>`;
            h += `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">`;
            h += `<span style="color:${P.tx2};">${op.achieved || 0} / ${op.total || 0} ${{ ko: '달성', en: 'achieved', ja: '達成' }[L] || ''}</span>`;
            h += `<span style="font-weight:700;color:${_pc(pct)};">${pct}%</span></div>`;
            h += `<div style="background:${P.g200};border-radius:6px;height:14px;overflow:hidden;">`;
            h += `<div style="background:${_pc(pct)};height:100%;width:${pct}%;border-radius:6px;"></div></div>`;
            if (op.message) h += `<div style="margin-top:6px;font-size:11px;color:${P.tx3};">${_e(op.message)}</div>`;
            h += '</div>';
        }

        /* positive / negative change cards */
        const cc = rm?.changeComparison;
        if (cc && typeof cc === 'object') {
            const hasPos = cc.positive?.length;
            const hasNeg = cc.negative?.length;
            if (hasPos || hasNeg) {
                h += `<div style="${SEC}display:flex;gap:8px;margin-top:8px;">`;
                if (hasPos) {
                    h += `<div style="flex:1;${CARD}border-left:3px solid ${P.gn};">`;
                    h += `<div style="font-size:11px;font-weight:700;color:${P.gn};margin-bottom:6px;">${{ ko: '긍정적 변화', en: 'Positive', ja: 'ポジティブ' }[L] || '긍정적'} ▲</div>`;
                    cc.positive.slice(0, 5).forEach(c => {
                        h += `<div style="font-size:10px;color:${P.tx2};margin:3px 0;">${_e(c.metric || c.label || '')}: <span style="color:${P.gn};font-weight:700;">${_e(c.change || '')}</span></div>`;
                    });
                    h += '</div>';
                }
                if (hasNeg) {
                    h += `<div style="flex:1;${CARD}border-left:3px solid ${P.rd};">`;
                    h += `<div style="font-size:11px;font-weight:700;color:${P.rd};margin-bottom:6px;">${{ ko: '주의 변화', en: 'Caution', ja: '注意' }[L] || '주의'} ▼</div>`;
                    cc.negative.slice(0, 5).forEach(c => {
                        h += `<div style="font-size:10px;color:${P.tx2};margin:3px 0;">${_e(c.metric || c.label || '')}: <span style="color:${P.rd};font-weight:700;">${_e(c.change || '')}</span></div>`;
                    });
                    h += '</div>';
                }
                h += '</div>';
            }
        }
        return h;
    }

    /* ═══════════ 8. Body Briefing ═══════════ */
    _bodyBriefing(br) {
        const L = this.lang;
        let h = this._secH('&#9899;', { ko: '바디 브리핑', en: 'Body Briefing', ja: 'ボディブリーフィング' }[L] || '바디 브리핑');
        const ratios = br?.bodyRatios;
        const bmi    = br?.bodyComposition?.bmi || br?.bmi;
        const score  = br?.transformationScore;

        if (!ratios && !bmi && !score) {
            return h + this._noData({ ko: '분석 데이터 부족', en: 'Insufficient data', ja: 'データ不足' }[L]);
        }

        /* BMI + Transformation score cards */
        h += `<div style="${SEC}${BRK}display:flex;flex-wrap:wrap;gap:8px;">`;
        if (bmi) {
            h += `<div style="flex:1;min-width:200px;${CARD}">`;
            h += `<div style="font-size:11px;font-weight:700;color:${P.tx2};margin-bottom:6px;">BMI</div>`;
            h += `<div style="font-size:24px;font-weight:800;color:${P.pri};">${_n(bmi.value ?? bmi, 1)}</div>`;
            if (bmi.category) h += `<div style="font-size:11px;color:${P.tx3};margin-top:2px;">${_e(bmi.category)}</div>`;
            h += '</div>';
        }
        if (score) {
            const sv = score.score ?? score.value ?? score;
            h += `<div style="flex:1;min-width:200px;${CARD}">`;
            h += `<div style="font-size:11px;font-weight:700;color:${P.tx2};margin-bottom:6px;">${{ ko: '변환 점수', en: 'Transform Score', ja: '変換スコア' }[L] || '변환 점수'}</div>`;
            h += `<div style="font-size:24px;font-weight:800;color:${P.pk};">${typeof sv === 'number' ? sv.toFixed(0) : sv}</div>`;
            if (score.category) h += `<div style="font-size:11px;color:${P.tx3};margin-top:2px;">${_e(score.category)}</div>`;
            if (score.message)  h += `<div style="font-size:11px;color:${P.tx3};margin-top:2px;">${_e(score.message)}</div>`;
            h += '</div>';
        }
        h += '</div>';

        /* ratio spectrum gauges */
        if (ratios) {
            h += `<div style="${SEC}${BRK}">`;
            const gauges = [
                { k: 'whr',           lbl: { ko: '허리-엉덩이 비율 (WHR)', en: 'Waist-Hip Ratio', ja: 'WHR' } },
                { k: 'shoulderWaist', lbl: { ko: '어깨-허리 비율',          en: 'Shoulder-Waist',  ja: '肩-ウエスト比' } },
                { k: 'chestWaist',    lbl: { ko: '가슴-허리 비율',          en: 'Chest-Waist',     ja: '胸-ウエスト比' } },
            ];

            gauges.forEach(g => {
                const r = ratios[g.k];
                if (!r) return;
                const raw = r.value ?? r.ratio;
                if (raw == null) return;
                const val = Number(raw);
                if (isNaN(val)) return;

                let pos = 50;
                if (g.k === 'whr')                pos = Math.min(100, Math.max(0, ((1.0 - val) / (1.0 - 0.7)) * 100));
                else if (g.k === 'chestWaist')    pos = Math.min(100, Math.max(0, ((val - 1.0) / (1.5 - 1.0)) * 100));
                else if (g.k === 'shoulderWaist') pos = Math.min(100, Math.max(0, ((1.35 - val) / (1.35 - 1.0)) * 100));

                h += `<div style="margin:14px 0;">`;
                h += `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;">`;
                h += `<span style="font-weight:700;color:${P.tx2};">${g.lbl[L] || g.lbl.ko}</span>`;
                h += `<span style="color:${P.pri};font-weight:800;">${val.toFixed(2)}</span></div>`;

                /* spectrum bar */
                h += `<div style="position:relative;height:18px;border-radius:9px;overflow:hidden;">`;
                h += `<div style="position:absolute;inset:0;display:flex;">`;
                h += `<div style="flex:1;background:${P.bl};"></div>`;
                h += `<div style="flex:1;background:${P.pri};"></div>`;
                h += `<div style="flex:1;background:${P.pk};"></div></div>`;
                h += `<div style="position:absolute;top:0;left:${pos}%;transform:translateX(-50%);width:4px;height:100%;background:${P.tx};border-radius:2px;"></div></div>`;
                h += `<div style="display:flex;justify-content:space-between;font-size:10px;color:${P.txM};margin-top:3px;">`;
                h += `<span>Male</span><span>Female</span></div>`;
                if (r.evaluation || r.category) h += `<div style="font-size:11px;color:${P.tx3};margin-top:3px;">${_e(r.evaluation || r.category)}</div>`;
                h += '</div>';
            });
            h += '</div>';
        }

        /* safety alerts */
        const sa = br?.safetyAssessment;
        if (sa?.alerts?.length) {
            h += `<div style="${SEC}${BRK}margin-top:8px;">`;
            h += `<div style="font-size:13px;font-weight:800;color:${P.rd};margin-bottom:6px;">${{ ko: '!! 안전성 알림', en: '!! Safety Alerts', ja: '!! 安全性アラート' }[L] || '!! 안전성'}</div>`;
            sa.alerts.slice(0, 5).forEach(a => {
                const bg = a.level === 'critical' ? P.rdL : a.level === 'warning' ? P.ywL : P.g100;
                const fg = a.level === 'critical' ? P.rd  : a.level === 'warning' ? P.yw  : P.tx3;
                h += `<div style="background:${bg};border-radius:8px;padding:8px 12px;margin:4px 0;font-size:11px;color:${fg};font-weight:500;">${_e(a.message || a.text || '')}</div>`;
            });
            h += '</div>';
        }
        return h;
    }

    /* ═══════════ 9. Health Analysis ═══════════ */
    _healthAnalysis(br) {
        const L = this.lang;
        let h = this._secH('&#9830;', { ko: '건강 분석', en: 'Health Analysis', ja: '健康分析' }[L] || '건강 분석');
        const sa = br?.symptomAnalysis;
        if (!sa) return h + this._noData({ ko: '증상 데이터 부족', en: 'No symptom data', ja: '症状データ不足' }[L]);

        h += `<div style="${SEC}${BRK}">`;

        /* summary */
        if (sa.summary) {
            h += `<div style="${CARD}border-left:3px solid ${P.pri};"><div style="font-size:12px;color:${P.tx2};">${_e(sa.summary)}</div></div>`;
        }

        /* insights */
        if (sa.insights?.length) {
            h += `<div style="margin-top:10px;">`;
            h += `<div style="font-size:12px;font-weight:700;color:${P.priD};margin-bottom:5px;">${{ ko: '인사이트', en: 'Insights', ja: 'インサイト' }[L] || '인사이트'}</div>`;
            sa.insights.slice(0, 6).forEach(ins => {
                const t = typeof ins === 'string' ? ins : ins.message || ins.text || '';
                if (t) h += `<div style="font-size:11px;color:${P.tx2};padding:3px 0;border-bottom:1px solid ${P.g200};">&bull; ${_e(t)}</div>`;
            });
            h += '</div>';
        }

        /* alerts */
        const alerts = [...(sa.criticalAlerts || []), ...(br?.alerts || [])].slice(0, 5);
        if (alerts.length) {
            h += `<div style="margin-top:10px;">`;
            h += `<div style="font-size:12px;font-weight:700;color:${P.rd};margin-bottom:5px;">${{ ko: '!! 경고', en: '!! Alerts', ja: '!! 警告' }[L] || '!! 경고'}</div>`;
            alerts.forEach(a => {
                const t = typeof a === 'string' ? a : a.message || a.text || '';
                if (t) h += `<div style="background:${P.rdL};border-radius:6px;padding:8px 12px;margin:4px 0;font-size:11px;color:${P.rd};font-weight:500;">${_e(t)}</div>`;
            });
            h += '</div>';
        }

        /* causes */
        if (sa.causes?.length) {
            h += `<div style="margin-top:10px;">`;
            h += `<div style="font-size:12px;font-weight:700;color:${P.tx2};margin-bottom:5px;">${{ ko: '원인 분석', en: 'Cause Analysis', ja: '原因分析' }[L] || '원인 분석'}</div>`;
            sa.causes.slice(0, 5).forEach(c => {
                const t = typeof c === 'string' ? c : c.description || c.message || c.text || '';
                if (t) h += `<div style="font-size:11px;color:${P.tx2};padding:3px 0;">&bull; ${_e(t)}</div>`;
            });
            h += '</div>';
        }

        /* compound patterns */
        if (sa.compoundPatterns?.length) {
            h += `<div style="margin-top:10px;">`;
            h += `<div style="font-size:12px;font-weight:700;color:${P.yw};margin-bottom:5px;">${{ ko: '복합 증상 패턴', en: 'Compound Patterns', ja: '複合症状' }[L] || '복합 증상'}</div>`;
            sa.compoundPatterns.slice(0, 4).forEach(cp => {
                h += `<div style="background:${P.ywL};border-radius:6px;padding:8px 12px;margin:4px 0;font-size:11px;color:${P.tx2};">`;
                h += `<strong>${_e(cp.label || '')}</strong>`;
                if (cp.description) h += ` &mdash; ${_e(cp.description)}`;
                h += '</div>';
            });
            h += '</div>';
        }

        h += '</div>';
        return h;
    }

    /* ═══════════ 10. Hormone Journal ═══════════ */
    _hormoneJournal(br) {
        const L = this.lang;
        let h = this._secH('&#9830;', { ko: '호르몬 저널', en: 'Hormone Journal', ja: 'ホルモンジャーナル' }[L] || '호르몬 저널');
        const hs = br?.hormoneStatus;
        if (!hs) return h + this._noData({ ko: '호르몬 데이터 부족', en: 'No hormone data', ja: 'ホルモンデータ不足' }[L]);

        h += `<div style="${SEC}${BRK}display:flex;flex-wrap:wrap;gap:8px;">`;

        /* E2 card */
        const eData = hs.estrogen || hs.estrogenLevel;
        if (eData) {
            const cur = eData.current ?? eData.value ?? eData;
            h += `<div style="flex:1;min-width:150px;${CARD}">`;
            h += `<div style="font-size:11px;color:${P.tx3};font-weight:600;">E2 (Estrogen)</div>`;
            h += `<div style="font-size:22px;font-weight:800;color:${P.pk};margin:4px 0;">${_n(cur, 0)} <span style="font-size:11px;font-weight:400;">pg/ml</span></div>`;
            if (eData.weeklyChange != null) {
                const up = eData.weeklyChange >= 0;
                h += `<div style="font-size:11px;color:${up ? P.gn : P.rd};font-weight:600;">${up ? '+' : ''}${eData.weeklyChange.toFixed(1)} /wk</div>`;
            }
            if (eData.stability) {
                const sc = eData.stability.status === 'stable' ? P.gn : eData.stability.status === 'moderate' ? P.yw : P.rd;
                h += `<div style="font-size:10px;margin-top:3px;color:${sc};font-weight:500;">${_e(eData.stability.status || '')} (CV: ${_n(eData.stability.cv, 1)}%)</div>`;
            }
            h += '</div>';
        }

        /* T card */
        const tData = hs.testosterone || hs.testosteroneLevel;
        if (tData) {
            const cur = tData.current ?? tData.value ?? tData;
            h += `<div style="flex:1;min-width:150px;${CARD}">`;
            h += `<div style="font-size:11px;color:${P.tx3};font-weight:600;">T (Testosterone)</div>`;
            h += `<div style="font-size:22px;font-weight:800;color:${P.bl};margin:4px 0;">${_n(cur, 0)} <span style="font-size:11px;font-weight:400;">ng/dl</span></div>`;
            if (tData.weeklyChange != null) {
                const down = tData.weeklyChange <= 0;
                h += `<div style="font-size:11px;color:${down ? P.gn : P.rd};font-weight:600;">${tData.weeklyChange > 0 ? '+' : ''}${tData.weeklyChange.toFixed(1)} /wk</div>`;
            }
            if (tData.stability) {
                const sc = tData.stability.status === 'stable' ? P.gn : tData.stability.status === 'moderate' ? P.yw : P.rd;
                h += `<div style="font-size:10px;margin-top:3px;color:${sc};font-weight:500;">${_e(tData.stability.status || '')} (CV: ${_n(tData.stability.cv, 1)}%)</div>`;
            }
            h += '</div>';
        }

        /* E/T ratio card */
        if (hs.etRatio) {
            const r = hs.etRatio;
            h += `<div style="flex:1;min-width:150px;${CARD}">`;
            h += `<div style="font-size:11px;color:${P.tx3};font-weight:600;">E/T Ratio</div>`;
            h += `<div style="font-size:22px;font-weight:800;color:${P.pri};margin:4px 0;">${_n(r.value, 3)}</div>`;
            if (r.evaluation) {
                const ec = r.evaluation === 'female_range' ? P.pk : r.evaluation === 'male_range' ? P.bl : P.yw;
                h += `<div style="font-size:11px;color:${ec};font-weight:700;">${_e(r.evaluation.replace(/_/g, ' '))}</div>`;
            }
            h += '</div>';
        }
        h += '</div>';

        /* hormone range evaluation */
        if (br?.hormoneRanges && typeof br.hormoneRanges === 'object') {
            h += `<div style="${SEC}margin-top:6px;">`;
            Object.entries(br.hormoneRanges).forEach(([key, info]) => {
                if (!info) return;
                const label  = key === 'estrogen' ? 'E2' : key === 'testosterone' ? 'T' : key;
                const status = _strip(info.status || info.evaluation || '');
                const sc = /optimal|normal/i.test(status) ? P.gn : /high|low/i.test(status) ? P.yw : P.tx3;
                h += `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:11px;">`;
                h += `<span style="font-weight:700;width:30px;color:${P.tx2};">${label}</span>`;
                h += `<span style="color:${sc};font-weight:700;">${_e(status)}</span>`;
                if (info.message) h += `<span style="color:${P.tx3};">${_e(info.message)}</span>`;
                h += '</div>';
            });
            h += '</div>';
        }
        return h;
    }

    /* ═══════════ 11. Mood Calendar ═══════════ */
    _moodCalendar(year, month) {
        const L = this.lang;
        let h = this._secH('&#9632;', _strip(this.t('pdfMoodCalendar')) || '기분 달력');
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDow    = new Date(year, month, 1).getDay();
        const moodC = { great: P.gn, good: '#059669', neutral: P.txM, bad: P.yw, terrible: P.rd };
        const moodL = { ko: { great: '최고', good: '좋음', neutral: '보통', bad: '나쁨', terrible: '최악' },
                        en: { great: 'Great', good: 'Good', neutral: 'OK', bad: 'Bad', terrible: 'Awful' },
                        ja: { great: '最高', good: '良い', neutral: '普通', bad: '悪い', terrible: '最悪' } };
        const labels = L === 'ja' ? ['日','月','火','水','木','金','土']
                     : L === 'en' ? ['S','M','T','W','T','F','S']
                     : ['일','월','화','수','목','금','토'];

        h += `<div style="${SEC}${BRK}">`;

        /* day-of-week labels */
        h += `<div style="display:flex;gap:3px;margin-bottom:3px;">`;
        labels.forEach(l => {
            h += `<div style="width:calc((100% - 18px)/7);text-align:center;font-size:10px;color:${P.tx3};font-weight:700;">${l}</div>`;
        });
        h += '</div>';

        /* calendar cells */
        h += `<div style="display:flex;flex-wrap:wrap;gap:3px;">`;
        for (let i = 0; i < startDow; i++) {
            h += `<div style="width:calc((100% - 18px)/7);height:34px;"></div>`;
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dk   = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const mood = this.diary[dk]?.mood;
            const bg   = mood ? (moodC[mood] || P.g200) : P.g100;
            const fg   = mood ? '#fff' : P.txM;
            h += `<div style="width:calc((100% - 18px)/7);height:34px;background:${bg};border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:${fg};font-weight:${mood ? '700' : '400'};">${day}</div>`;
        }
        h += '</div>';

        /* legend — text labels instead of emoji */
        const ml = moodL[L] || moodL.ko;
        h += `<div style="display:flex;gap:14px;justify-content:center;margin-top:10px;font-size:10px;color:${P.tx3};">`;
        [['great', ml.great], ['good', ml.good], ['neutral', ml.neutral], ['bad', ml.bad], ['terrible', ml.terrible]].forEach(([k, lbl]) => {
            h += `<span style="display:flex;align-items:center;gap:3px;"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${moodC[k]};"></span><span>${lbl}</span></span>`;
        });
        h += '</div></div>';
        return h;
    }

    /* ═══════════ 12. Footer ═══════════ */
    _footer() {
        return `<div data-pdf-section style="margin:30px 0 20px;text-align:center;font-size:11px;color:${P.txM};">
<div style="margin-bottom:4px;color:${P.g200};">────────────────────────────</div>
Generated by ShiftV &bull; ${new Date().toLocaleDateString()} &bull; v2.0.0a</div>`;
    }
}
