/**
 * Health Modal — Health Warnings & Recommendations
 * 
 * Replaces the health alert section from body-briefing-modal.
 * Shows DoctorEngine warnings with severity chips,
 * symptom analysis, HRT target info, and hospital visit recommendations.
 */

import { DoctorEngine } from '../../doctor-module/core/doctor-engine.js';
import { translate, getCurrentLanguage } from '../../translations.js';
import { svgIcon } from '../icon-paths.js';

export class HealthModal {
    constructor(measurements, userSettings) {
        this.measurements = measurements;
        this.userSettings = userSettings;
        this.doctorEngine = new DoctorEngine(measurements, userSettings);
    }

    /**
     * Open the health modal
     */
    open() {
        let warnings = [];
        let briefing = null;
        try {
            briefing = this.doctorEngine.generateHealthBriefing();
            warnings = briefing?.alerts || [];
        } catch (e) {
            console.warn('Health briefing generation failed:', e);
        }

        if (warnings.length === 0) {
            try {
                warnings = this.doctorEngine.analyzeHealthRisks
                    ? this.doctorEngine.analyzeHealthRisks()
                    : [];
            } catch (e) {
                console.warn('Health risk analysis failed:', e);
            }
        }

        this._renderModal(warnings, briefing);
    }

    _renderModal(warnings, briefing) {
        // Create or find modal
        let overlay = document.getElementById('health-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'health-modal-overlay';
            overlay.className = 'health-modal-overlay';
            document.body.appendChild(overlay);
        }

        const warningCount = Array.isArray(warnings) ? warnings.length : 0;

        overlay.innerHTML = `
            <div class="health-modal-surface">
                <div class="health-modal-header">
                    <h2 class="health-modal-title">${svgIcon('local_hospital', 'mi-inline')} ${translate('healthModalTitle') || '건강 분석'}</h2>
                    <button class="icon-button health-modal-close" aria-label="Close">
                        <svg width="24" height="24" viewBox="0 0 24 24"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>
                    </button>
                </div>

                <div class="health-modal-content">
                    ${warningCount > 0
                        ? this._renderWarningCards(warnings)
                        : this._renderNoWarnings()
                    }

                    ${this._renderCompoundPatterns(briefing?.symptomAnalysis?.compoundPatterns)}

                    ${this._renderSymptomCauses(briefing?.symptomAnalysis?.causes)}

                    ${this._renderSymptomAnalysis(briefing?.symptomAnalysis)}

                    ${this._renderHormoneRanges(briefing?.hormoneRanges)}

                    ${this._renderHRTInfoSection()}
                </div>
            </div>
        `;

        // Bind close
        overlay.querySelector('.health-modal-close').addEventListener('click', () => this.close());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        overlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    _renderWarningCards(warnings) {
        if (!Array.isArray(warnings) || warnings.length === 0) return '';

        return `
            <div class="health-warnings-section">
                <h3 class="health-section-title">${translate('healthWarnings') || svgIcon('warning', 'mi-inline mi-sm') + ' 건강 경고'}</h3>
                ${warnings.map(w => `
                    <div class="health-warning-card severity-${w.severity || 'info'}">
                        <div class="warning-header">
                            <span class="severity-chip severity-${w.severity || 'info'}">${this._severityLabel(w.severity)}</span>
                            <span class="warning-title">${w.title || w.message || ''}</span>
                        </div>
                        ${w.description ? `<p class="warning-description">${w.description}</p>` : ''}
                        ${w.recommendation ? `<p class="warning-recommendation">${svgIcon('lightbulb', 'mi-inline mi-sm')} ${w.recommendation}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    _severityLabel(severity) {
        const labels = {
            high: translate('severityHigh') || '위험',
            medium: translate('severityMedium') || '주의',
            low: translate('severityLow') || '참고',
            info: translate('severityInfo') || '정보'
        };
        return labels[severity] || labels.info;
    }

    _renderNoWarnings() {
        return `
            <div class="health-no-warnings">
                <div style="font-size: 48px; margin-bottom: 12px;">${svgIcon('check_circle', 'mi-2xl mi-success')}</div>
                <p class="no-warnings-text">${translate('healthNoWarnings') || '현재 건강 경고가 없습니다.'}</p>
                <p class="no-warnings-hint">${translate('healthNoWarningsHint') || '건강한 상태를 유지하고 계세요!'}</p>
            </div>
        `;
    }

    _renderHRTInfoSection() {
        const mode = this.userSettings?.mode || 'mtf';
        return `
            <div class="health-hrt-section">
                <h3 class="health-section-title">${svgIcon('vaccines', 'mi-inline')} ${translate('hrtInfoTitle') || 'HRT 목표 정보'}</h3>
                <div class="hrt-info-card">
                    <p>${translate('hrtInfoDesc_' + mode) || this._getDefaultHRTInfo(mode)}</p>
                </div>
            </div>
        `;
    }

    _getDefaultHRTInfo(mode) {
        if (mode === 'mtf') {
            return '에스트라디올 목표: 100-200 pg/mL, 테스토스테론 목표: < 50 ng/dL (WPATH 가이드라인 기준)';
        } else if (mode === 'ftm') {
            return '테스토스테론 목표: 300-1000 ng/dL (시스남성 정상범위 기준)';
        }
        return '';
    }

    _renderSymptomAnalysis(symptomData) {
        if (!symptomData) return '';

        const sections = [];

        // Summary
        if (symptomData.summary) {
            sections.push(`<p class="symptom-summary-text">${symptomData.summary}</p>`);
        }

        // Insights
        if (Array.isArray(symptomData.insights) && symptomData.insights.length > 0) {
            const insightItems = symptomData.insights.map(insight => {
                if (typeof insight === 'string') {
                    return `<div class="symptom-insight-item">${svgIcon('lightbulb', 'mi-inline mi-sm')} <span>${insight}</span></div>`;
                }
                const icon = insight.icon || svgIcon('lightbulb', 'mi-inline mi-sm');
                const title = insight.title || '';
                const desc = insight.description || insight.message || insight.text || '';
                const advice = insight.advice || '';
                const symptoms = Array.isArray(insight.symptoms) ? insight.symptoms : [];
                return `
                    <div class="symptom-insight-item">
                        ${icon}
                        <div class="insight-body">
                            ${title ? `<strong>${title}</strong>` : ''}
                            ${desc ? `<span>${desc}</span>` : ''}
                            ${symptoms.length ? `<div class="insight-symptoms">${symptoms.map(s => `<span class="cause-chip">${s}</span>`).join('')}</div>` : ''}
                            ${advice ? `<p class="insight-advice">${svgIcon('lightbulb', 'mi-inline mi-sm')} ${advice}</p>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
            sections.push(insightItems);
        }

        // Trends
        if (Array.isArray(symptomData.trends) && symptomData.trends.length > 0) {
            const trendItems = symptomData.trends.map(trend => {
                const label = typeof trend === 'string' ? trend : trend.symptom || trend.name || '';
                const direction = trend.direction || trend.trend || '';
                const icon = direction === 'improving' ? 'trending_down' : direction === 'worsening' ? 'trending_up' : 'trending_flat';
                const colorClass = direction === 'improving' ? 'trend-good' : direction === 'worsening' ? 'trend-bad' : 'trend-neutral';
                return `
                    <div class="symptom-trend-chip ${colorClass}">
                        ${svgIcon(icon, 'mi-sm')}
                        <span>${label}</span>
                    </div>
                `;
            }).join('');
            sections.push(`<div class="symptom-trends-row">${trendItems}</div>`);
        }

        // Hormone cycle
        if (symptomData.hormoneCycle && typeof symptomData.hormoneCycle === 'object') {
            const cycle = symptomData.hormoneCycle;
            if (cycle.phase || cycle.recommendation) {
                sections.push(`
                    <div class="hormone-cycle-info">
                        ${cycle.phase ? `<div class="cycle-phase">${svgIcon('schedule', 'mi-inline mi-sm')} ${translate('hormoneCyclePhase') || '호르몬 주기'}: <strong>${cycle.phase}</strong></div>` : ''}
                        ${cycle.recommendation ? `<p class="cycle-recommendation">${cycle.recommendation}</p>` : ''}
                    </div>
                `);
            }
        }

        if (sections.length === 0) return '';

        return `
            <div class="health-symptom-section">
                <h3 class="health-section-title">${svgIcon('monitor_heart', 'mi-inline')} ${translate('symptomAnalysisTitle') || '증상 분석'}</h3>
                ${sections.join('')}
            </div>
        `;
    }

    // ── Phase 9: Symptom Cause Analysis ──

    _renderSymptomCauses(causes) {
        if (!Array.isArray(causes) || causes.length === 0) return '';

        const lang = getCurrentLanguage();
        const categoryIcons = {
            diet: 'restaurant',
            exercise: 'fitness_center',
            medication: 'medication',
            lifestyle: 'self_improvement'
        };
        const categoryLabels = {
            diet: lang === 'ko' ? '식단' : lang === 'ja' ? '食事' : 'Diet',
            exercise: lang === 'ko' ? '운동' : lang === 'ja' ? '運動' : 'Exercise',
            medication: lang === 'ko' ? '의약' : lang === 'ja' ? '医薬' : 'Medical',
            lifestyle: lang === 'ko' ? '생활습관' : lang === 'ja' ? '生活習慣' : 'Lifestyle'
        };

        const items = causes.map(c => {
            const causeChips = c.activeCauses.map(ac =>
                `<span class="cause-chip">${ac.label}</span>`
            ).join('');

            const resolutionSections = Object.entries(c.resolution || {})
                .filter(([, items]) => items.length > 0)
                .map(([cat, items]) => `
                    <div class="resolution-category">
                        <span class="resolution-cat-label">
                            ${svgIcon(categoryIcons[cat] || 'info', 'mi-sm')}
                            ${categoryLabels[cat] || cat}
                        </span>
                        <ul class="resolution-list">
                            ${items.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                `).join('');

            const hospitalHTML = c.hospitalAdvice ? `
                <div class="hospital-advice hospital-${c.hospitalAdvice.level}">
                    ${svgIcon(c.hospitalAdvice.level === 'critical' ? 'emergency' : 'local_hospital', 'mi-inline mi-sm')}
                    ${c.hospitalAdvice.message}
                </div>
            ` : '';

            return `
                <div class="cause-analysis-card">
                    <div class="cause-header">
                        <span class="cause-symptom-name">${c.symptomId.replace(/_/g, ' ')}</span>
                        <span class="cause-severity-badge severity-${c.severity >= 4 ? 'high' : c.severity >= 2 ? 'medium' : 'low'}">${c.severity}/5</span>
                    </div>
                    ${causeChips ? `<div class="cause-chips">${causeChips}</div>` : ''}
                    ${hospitalHTML}
                    ${resolutionSections ? `<div class="resolution-grid">${resolutionSections}</div>` : ''}
                </div>
            `;
        }).join('');

        return `
            <div class="health-causes-section">
                <h3 class="health-section-title">
                    ${svgIcon('account_tree', 'mi-inline')}
                    ${translate('symptomCauseTitle') || (lang === 'ko' ? '증상 원인 분석 & 해소 추천' : 'Symptom Causes & Recommendations')}
                </h3>
                ${items}
            </div>
        `;
    }

    _renderCompoundPatterns(patterns) {
        if (!Array.isArray(patterns) || patterns.length === 0) return '';

        const items = patterns.map(p => `
            <div class="compound-pattern-card severity-${p.severity}">
                <div class="compound-header">
                    ${svgIcon(p.severity === 'critical' ? 'emergency' : 'warning', 'mi-inline mi-sm')}
                    <strong>${p.label}</strong>
                </div>
                <p class="compound-description">${p.description}</p>
                <div class="compound-action">
                    ${svgIcon('arrow_forward', 'mi-inline mi-sm')}
                    ${p.action}
                </div>
                <div class="compound-matched">
                    ${p.matchedSymptoms.map(s => `<span class="cause-chip">${s.replace(/_/g, ' ')}</span>`).join('')}
                </div>
            </div>
        `).join('');

        return `
            <div class="health-compound-section">
                <h3 class="health-section-title">
                    ${svgIcon('hub', 'mi-inline')}
                    ${translate('compoundSymptomTitle') || '복합 증상 패턴'}
                </h3>
                ${items}
            </div>
        `;
    }

    _renderHormoneRanges(ranges) {
        if (!ranges || (!ranges.estrogen && !ranges.testosterone)) return '';

        const items = [];
        for (const [hormone, data] of Object.entries(ranges)) {
            if (!data) continue;
            const colorClass = data.isIdeal ? 'range-ideal' : data.status === 'dangerous' ? 'range-danger' : 'range-caution';
            items.push(`
                <div class="hormone-range-card ${colorClass}">
                    <div class="hormone-range-header">
                        <span class="hormone-range-name">${hormone === 'estrogen' ? 'Estradiol (E2)' : 'Testosterone (T)'}</span>
                        <span class="hormone-range-status">${data.label}</span>
                    </div>
                    <div class="hormone-range-value">${data.value} ${data.unit}</div>
                </div>
            `);
        }

        return `
            <div class="health-hormone-range-section">
                <h3 class="health-section-title">
                    ${svgIcon('labs', 'mi-inline')}
                    ${translate('hormoneRangeTitle') || '호르몬 범위 평가'}
                </h3>
                ${items.join('')}
            </div>
        `;
    }

    close() {
        const overlay = document.getElementById('health-modal-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
            document.body.style.overflow = '';
            setTimeout(() => overlay.remove(), 300);
        }
    }

    /**
     * Get warning count for badge display
     */
    getWarningCount() {
        try {
            const briefing = this.doctorEngine.generateHealthBriefing();
            const warnings = briefing?.alerts || [];
            return Array.isArray(warnings) ? warnings.length : 0;
        } catch {
            return 0;
        }
    }
}
