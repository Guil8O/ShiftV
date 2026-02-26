/**
 * PDF Monthly Report Generator
 * Generates a monthly report PDF with body changes, quest progress, diary mood calendar, and streak stats.
 * Uses jsPDF loaded from CDN.
 */

const JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';

async function loadJsPDF() {
    if (window.jspdf) return window.jspdf;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = JSPDF_CDN;
        script.onload = () => resolve(window.jspdf);
        script.onerror = () => reject(new Error('Failed to load jsPDF'));
        document.head.appendChild(script);
    });
}

export class PDFReportGenerator {
    constructor({ measurements, diary, quests, targets, translate, language }) {
        this.measurements = measurements || [];
        this.diary = diary || {};
        this.quests = quests || [];
        this.targets = targets || {};
        this.t = translate || (k => k);
        this.lang = language || 'ko';
    }

    async generate(year, month) {
        const jspdf = await loadJsPDF();
        const { jsPDF } = jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const pageW = doc.internal.pageSize.getWidth();
        const margin = 15;
        let y = margin;

        // ── Title ──
        doc.setFontSize(20);
        doc.setTextColor(100, 50, 200);
        const monthNames = {
            ko: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
            en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            ja: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
        };
        const monthName = (monthNames[this.lang] || monthNames.ko)[month];
        doc.text(`ShiftV ${year} ${monthName} Report`, pageW / 2, y, { align: 'center' });
        y += 12;

        // ── Monthly Measurements ──
        const monthData = this._getMonthData(year, month);
        doc.setFontSize(14);
        doc.setTextColor(50, 50, 50);
        doc.text(this.t('pdfBodyChanges') || '신체 변화', margin, y);
        y += 8;

        if (monthData.length === 0) {
            doc.setFontSize(10);
            doc.setTextColor(120, 120, 120);
            doc.text(this.t('pdfNoData') || '이번 달 측정 데이터가 없습니다.', margin, y);
            y += 8;
        } else {
            const fields = [
                { key: 'weight', label: this.t('weight') || '체중', unit: 'kg' },
                { key: 'bodyFat', label: this.t('bodyFat') || '체지방률', unit: '%' },
                { key: 'bust', label: this.t('bust') || '가슴둘레', unit: 'cm' },
                { key: 'waist', label: this.t('waist') || '허리둘레', unit: 'cm' },
                { key: 'hip', label: this.t('hip') || '엉덩이둘레', unit: 'cm' },
                { key: 'shoulder', label: this.t('shoulder') || '어깨너비', unit: 'cm' },
            ];

            doc.setFontSize(9);
            const colW = (pageW - margin * 2) / (fields.length + 1);

            // Header row
            doc.setTextColor(100, 100, 100);
            doc.text(this.t('date') || '날짜', margin, y);
            fields.forEach((f, i) => {
                doc.text(f.label, margin + colW * (i + 1), y);
            });
            y += 5;
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, y, pageW - margin, y);
            y += 4;

            // Data rows
            doc.setTextColor(30, 30, 30);
            const rows = monthData.slice(-10); // Last 10 entries max
            rows.forEach(entry => {
                const dateStr = (entry.date || entry.recordDate || '').slice(5);
                doc.text(dateStr, margin, y);
                fields.forEach((f, i) => {
                    const val = entry[f.key];
                    doc.text(val != null ? `${val}${f.unit}` : '-', margin + colW * (i + 1), y);
                });
                y += 5;
                if (y > 270) { doc.addPage(); y = margin; }
            });

            // Summary
            y += 4;
            const first = monthData[0];
            const last = monthData[monthData.length - 1];
            doc.setFontSize(10);
            doc.setTextColor(80, 40, 160);
            const changes = fields.map(f => {
                const v1 = first[f.key], v2 = last[f.key];
                if (v1 != null && v2 != null) {
                    const diff = (v2 - v1).toFixed(1);
                    const sign = diff > 0 ? '+' : '';
                    return `${f.label}: ${sign}${diff}${f.unit}`;
                }
                return null;
            }).filter(Boolean);
            if (changes.length) {
                doc.text(`${this.t('pdfChange') || '변화'}: ${changes.join(' | ')}`, margin, y);
                y += 8;
            }
        }

        // ── Quest Progress ──
        if (y > 250) { doc.addPage(); y = margin; }
        doc.setFontSize(14);
        doc.setTextColor(50, 50, 50);
        doc.text(this.t('pdfQuestProgress') || '퀘스트 달성', margin, y);
        y += 8;

        const activeQuests = this.quests.filter(q => !q.completed);
        if (activeQuests.length === 0) {
            doc.setFontSize(10);
            doc.setTextColor(120, 120, 120);
            doc.text(this.t('pdfNoQuests') || '활성 퀘스트가 없습니다.', margin, y);
            y += 6;
        } else {
            doc.setFontSize(9);
            activeQuests.slice(0, 8).forEach(q => {
                const pct = q.targetValue > 0 ? Math.min(100, Math.round((q.currentValue / q.targetValue) * 100)) : 0;
                const barX = margin;
                const barW = pageW - margin * 2 - 40;
                const barH = 4;

                doc.setTextColor(30, 30, 30);
                doc.text(q.title || 'Quest', margin, y);
                y += 3;

                // Background bar
                doc.setFillColor(230, 230, 230);
                doc.roundedRect(barX, y, barW, barH, 2, 2, 'F');
                // Progress fill
                doc.setFillColor(100, 50, 200);
                doc.roundedRect(barX, y, barW * (pct / 100), barH, 2, 2, 'F');
                // Percentage text
                doc.setTextColor(100, 50, 200);
                doc.text(`${pct}%`, barX + barW + 3, y + 3);
                y += 8;
                if (y > 270) { doc.addPage(); y = margin; }
            });
        }

        // ── Diary Mood Calendar ──
        if (y > 230) { doc.addPage(); y = margin; }
        doc.setFontSize(14);
        doc.setTextColor(50, 50, 50);
        doc.text(this.t('pdfMoodCalendar') || '기분 달력', margin, y);
        y += 8;

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cellSize = Math.min(8, (pageW - margin * 2) / 7 - 1);
        const moodSymbols = { great: '++', good: '+', neutral: '~', bad: '-', terrible: '--' };
        const moodColors = { great: [76, 175, 80], good: [139, 195, 74], neutral: [158, 158, 158], bad: [255, 152, 0], terrible: [244, 67, 54] };
        const startDow = new Date(year, month, 1).getDay();

        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        const dayLabels = this.lang === 'ja' ? ['日', '月', '火', '水', '木', '金', '土'] :
            this.lang === 'en' ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] :
                ['일', '월', '화', '수', '목', '금', '토'];
        dayLabels.forEach((d, i) => {
            doc.text(d, margin + i * (cellSize + 1) + cellSize / 2, y, { align: 'center' });
        });
        y += 4;

        let col = startDow;
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const diaryEntry = this.diary[dateKey];
            const x = margin + col * (cellSize + 1);

            doc.setDrawColor(220, 220, 220);
            doc.setFillColor(248, 248, 248);
            doc.roundedRect(x, y, cellSize, cellSize, 1, 1, 'FD');

            doc.setFontSize(6);
            doc.setTextColor(60, 60, 60);
            doc.text(String(day), x + 1, y + 3);

            if (diaryEntry && diaryEntry.mood) {
                const mc = moodColors[diaryEntry.mood] || [100, 100, 100];
                doc.setFontSize(8);
                doc.setTextColor(mc[0], mc[1], mc[2]);
                doc.text(moodSymbols[diaryEntry.mood] || '·', x + cellSize / 2, y + cellSize - 1, { align: 'center' });
                doc.setTextColor(60, 60, 60);
            }

            col++;
            if (col >= 7) {
                col = 0;
                y += cellSize + 1;
                if (y > 270) { doc.addPage(); y = margin; }
            }
        }
        y += cellSize + 6;

        // ── Streak Stats ──
        if (y > 260) { doc.addPage(); y = margin; }
        doc.setFontSize(14);
        doc.setTextColor(50, 50, 50);
        doc.text(this.t('pdfStreakStats') || '기록 통계', margin, y);
        y += 8;

        const totalRecords = monthData.length;
        const diaryDays = Object.keys(this.diary).filter(k => k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length;
        doc.setFontSize(10);
        doc.setTextColor(30, 30, 30);
        doc.text(`${this.t('pdfMeasurementCount') || '측정 횟수'}: ${totalRecords}`, margin, y);
        y += 6;
        doc.text(`${this.t('pdfDiaryDays') || '다이어리 작성일'}: ${diaryDays}${this.t('pdfDaysUnit') || '일'}`, margin, y);
        y += 6;

        const completedQuests = this.quests.filter(q => q.completed).length;
        doc.text(`${this.t('pdfQuestsCompleted') || '완료된 퀘스트'}: ${completedQuests}`, margin, y);
        y += 12;

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated by ShiftV • ${new Date().toLocaleDateString()}`, pageW / 2, 285, { align: 'center' });

        // Save
        const fileName = `ShiftV_Report_${year}_${String(month + 1).padStart(2, '0')}.pdf`;
        doc.save(fileName);
        return fileName;
    }

    _getMonthData(year, month) {
        return this.measurements.filter(entry => {
            const d = entry.date || entry.recordDate;
            if (!d) return false;
            const dt = new Date(d);
            return dt.getFullYear() === year && dt.getMonth() === month;
        }).sort((a, b) => new Date(a.date || a.recordDate) - new Date(b.date || b.recordDate));
    }
}
