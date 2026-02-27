/**
 * Streak Strip — Gamification chips for home tab
 * 
 * Shows:
 * - Consecutive recording days (diary + measurements)
 * - This month's measurement count
 * - Top quest achievement percentage
 */

import { dateToString, today as getToday } from '../../utils.js';
import { svgIcon } from '../icon-paths.js';

const DIARY_KEY = 'shiftv_diary';
const DATA_KEY = 'shiftV_Data_v1_1';

export class StreakStrip {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn('[StreakStrip] Container not found:', containerId);
            return;
        }
        this.render();
    }

    render() {
        if (!this.container) return;

        const streak = this._calculateStreak();
        const monthCount = this._getMonthMeasurementCount();
        const questPct = this._getTopQuestProgress();

        this.container.innerHTML = `
            <div class="streak-strip">
                <div class="streak-chip ${streak > 0 ? 'active' : 'inactive'}">
                    <span class="streak-chip-icon">${streak > 0 ? svgIcon('local_fire_department', 'mi-sm mi-primary') : svgIcon('hotel', 'mi-sm')}</span>
                    <span class="streak-chip-value">${streak}</span>
                    <span class="streak-chip-label">${streak > 0 ? 'day streak' : 'start today!'}</span>
                </div>
                <div class="streak-chip">
                    <span class="streak-chip-icon">${svgIcon('monitoring', 'mi-sm')}</span>
                    <span class="streak-chip-value">${monthCount}</span>
                    <span class="streak-chip-label">this month</span>
                </div>
                ${questPct !== null ? `
                <div class="streak-chip">
                    <span class="streak-chip-icon">${svgIcon('target', 'mi-sm')}</span>
                    <span class="streak-chip-value">${questPct}%</span>
                    <span class="streak-chip-label">quest</span>
                </div>` : ''}
            </div>
        `;
    }

    _calculateStreak() {
        const recordedDates = new Set();

        // Diary dates
        try {
            const raw = localStorage.getItem(DIARY_KEY);
            if (raw) {
                const diary = JSON.parse(raw);
                Object.keys(diary).forEach(d => recordedDates.add(d));
            }
        } catch {}

        // Measurement dates
        try {
            const raw = localStorage.getItem(DATA_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                const measurements = data?.measurements || data || [];
                if (Array.isArray(measurements)) {
                    measurements.forEach(m => {
                        if (m.date) recordedDates.add(m.date);
                    });
                }
            }
        } catch {}

        if (recordedDates.size === 0) return 0;

        // Count consecutive days ending today or yesterday
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        
        let streak = 0;
        let checkDate = new Date(today);
        
        // Allow streak to start from today or yesterday
        if (!recordedDates.has(dateToString(checkDate))) {
            checkDate.setDate(checkDate.getDate() - 1);
            if (!recordedDates.has(dateToString(checkDate))) {
                return 0;
            }
        }

        while (recordedDates.has(dateToString(checkDate))) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }

        return streak;
    }

    _getMonthMeasurementCount() {
        try {
            const prefix = getToday().substring(0, 7);
            
            const raw = localStorage.getItem(DATA_KEY);
            if (!raw) return 0;
            
            const data = JSON.parse(raw);
            const measurements = data?.measurements || data || [];
            if (!Array.isArray(measurements)) return 0;

            return measurements.filter(m => m.date && m.date.startsWith(prefix)).length;
        } catch {
            return 0;
        }
    }

    _getTopQuestProgress() {
        // Check quests from localStorage
        try {
            const raw = localStorage.getItem('shiftv_quests');
            if (!raw) return null;
            const quests = JSON.parse(raw);
            if (!Array.isArray(quests) || quests.length === 0) return null;

            // Find quest with highest progress
            let best = 0;
            quests.forEach(q => {
                if (q.targetValue && q.currentValue !== undefined) {
                    const pct = Math.min(100, Math.round((q.currentValue / q.targetValue) * 100));
                    if (pct > best) best = pct;
                }
            });
            return best;
        } catch {
            return null;
        }
    }

    /** Refresh the strip (call after data changes) */
    refresh() {
        this.render();
    }
}
