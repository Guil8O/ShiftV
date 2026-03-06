/**
 * Hormone Report — Analytics + Modal Renderer
 * Extracted from script.js — Phase 3-1
 */
import { translate, getCurrentLanguage } from '../translations.js';
import { svgIcon } from './icon-paths.js';
import { getCSSVar as getCssVar } from '../utils.js';
import { ensureChartWrapperContainer, ensureChartZoomControls, applyChartZoom } from './chart-zoom.js';

/* ── Dependency container ───────────────────────────────────────── */
let _d;

/**
 * Wire this module to the main app scope.
 * @param {Object} deps
 */
export function initHormoneReport(deps) {
    _d = deps;
}

// ── Advanced Hormone Analytics ──────────────────────────────────
export function calculateAdvancedHormoneAnalytics() {
    const { measurements, targets, currentMode, biologicalSex } = _d;
    const currentLanguage = getCurrentLanguage() || 'ko';
    if (measurements.length < 1) return null;

    const analytics = {
        estrogenLevel: {},
        testosteroneLevel: {},
        influence: {},
        emax: {},
        etRatio: null,
        stability: {},
        bodyRatios: {}
    };

    // 1. 기본 수치 및 변화량 계산
    const sortedMeas = [...measurements].sort((a, b) => a.timestamp - b.timestamp);
    const initial = sortedMeas[0];
    const latest = sortedMeas[sortedMeas.length - 1];
    const previous = sortedMeas.length > 1 ? sortedMeas[sortedMeas.length - 2] : null;

    const oneMonthAgoTime = latest.timestamp - (28 * 86400000);
    const monthAgoRecord = sortedMeas.slice().reverse().find(m => m.timestamp <= oneMonthAgoTime) || initial;
    const daysForMonthAvg = (latest.timestamp - monthAgoRecord.timestamp) / 86400000;

    ['estrogenLevel', 'testosteroneLevel'].forEach(h => {
        const latestVal = parseFloat(latest[h]);
        if (!isNaN(latestVal)) {
            analytics[h].current = latestVal;
            analytics[h].weeklyChange = (previous && !isNaN(parseFloat(previous[h]))) ? latestVal - parseFloat(previous[h]) : null;
            const initialVal = parseFloat(initial[h]);
            analytics[h].totalChange = !isNaN(initialVal) ? latestVal - initialVal : null;
            analytics[h].initial = !isNaN(initialVal) ? initialVal : null;

            if (daysForMonthAvg > 1 && !isNaN(parseFloat(monthAgoRecord[h]))) {
                analytics[h].monthlyAvgChange = ((latestVal - parseFloat(monthAgoRecord[h])) / daysForMonthAvg) * 7;
            } else {
                analytics[h].monthlyAvgChange = null;
            }
        }
    });

    // 2. 호르몬 안정성 분석 (Coefficient of Variation - CV)
    ['estrogenLevel', 'testosteroneLevel'].forEach(h => {
        const recentData = sortedMeas.slice(-8).map(m => parseFloat(m[h])).filter(v => !isNaN(v));
        if (recentData.length >= 3) {
            const mean = recentData.reduce((sum, v) => sum + v, 0) / recentData.length;
            const variance = recentData.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / recentData.length;
            const stdDev = Math.sqrt(variance);
            const cv = (stdDev / mean) * 100;
            analytics.stability[h] = { cv, status: cv < 10 ? 'stable' : cv < 20 ? 'moderate' : 'unstable' };
        }
    });

    // 3. E/T Ratio 계산 (표준 단위: E2 pg/mL, T ng/dL)
    const latestE_pgml = parseFloat(latest.estrogenLevel);
    const latestT_ngdL = parseFloat(latest.testosteroneLevel);

    if (!isNaN(latestE_pgml) && !isNaN(latestT_ngdL) && latestT_ngdL > 0) {
        const ratio = latestE_pgml / latestT_ngdL;
        analytics.etRatio = {
            value: ratio,
            position: Math.min(Math.max((ratio / 0.2) * 100, 0), 100),
            evaluation: ratio < 0.1 ? 'male_range' : ratio > 0.5 ? 'female_range' : 'transitioning',
            isNormal: ratio >= 0.04 && ratio <= 0.1
        };
    }

    // 백분위 계산 함수 (실제 통계 데이터 기반)
    const calculatePercentile = (value, type, gender) => {
        const stats = {
            whr: {
                female: { p10: 0.67, p25: 0.70, p50: 0.75, p75: 0.80, p90: 0.85 },
                male: { p10: 0.85, p25: 0.90, p50: 0.95, p75: 1.00, p90: 1.05 }
            },
            chestWaist: {
                female: { p10: 0.95, p25: 1.00, p50: 1.10, p75: 1.20, p90: 1.30 },
                male: { p10: 1.20, p25: 1.30, p50: 1.40, p75: 1.50, p90: 1.60 }
            },
            shoulderHip: {
                female: { p10: 0.95, p25: 1.00, p50: 1.05, p75: 1.10, p90: 1.15 },
                male: { p10: 1.15, p25: 1.25, p50: 1.30, p75: 1.35, p90: 1.45 }
            }
        };

        const data = stats[type]?.[gender];
        if (!data) return null;

        if (value <= data.p10) return { percentile: 10, text: translate('percentileTop10') };
        if (value <= data.p25) return { percentile: 25, text: translate('percentileTop25') };
        if (value <= data.p50) return { percentile: 50, text: translate('percentileAverage') };
        if (value <= data.p75) return { percentile: 75, text: translate('percentileBottom25') };
        if (value <= data.p90) return { percentile: 90, text: translate('percentileBottom10') };
        return { percentile: 95, text: translate('percentileBottom5') };
    };

    // 4. 신체 비율 분석 (어깨=너비, 나머지=둘레 인식)
    // 바 위치 계산: p99(남) ↔ p1(여) 풀레인지, 5-95% 클램핑
    const _ratioPosition = (value, type) => {
        const ranges = {
            whr:         { maleHigh: 1.15, femaleLow: 0.60 },
            chestWaist:  { maleHigh: 1.45, femaleLow: 0.90 },
            shoulderHip: { maleHigh: 1.50, femaleLow: 0.90 },
        };
        const r = ranges[type];
        if (!r) return 50;
        const span = r.maleHigh - r.femaleLow;
        if (span === 0) return 50;
        return Math.max(5, Math.min(95, Math.round(((r.maleHigh - value) / span) * 100)));
    };
    // 한줄평 생성 (바 위치 기반, 모드-인식)
    const _ratioEvaluation = (position, type) => {
        const mode = currentMode || 'mtf';
        const labels = {
            whr: {
                ko: ['허리-엉덩이 비율', '체형'], en: ['WHR', 'body shape'], ja: ['WHR', '体型']
            },
            chestWaist: {
                ko: ['가슴-허리 비율', '상체 비율'], en: ['Chest-waist ratio', 'upper body ratio'], ja: ['胸-ウエスト比', '上半身比率']
            },
            shoulderHip: {
                ko: ['어깨-엉덩이 비율', '어깨 비율'], en: ['Shoulder-hip ratio', 'shoulder ratio'], ja: ['肩-ヒップ比', '肩比率']
            },
        };
        const L = currentLanguage || 'ko';
        const lbl = labels[type]?.[L] || labels[type]?.ko || ['', ''];
        // position: 0=♂ 극단, 100=♀ 극단
        let evalText;
        if (position >= 80) evalText = { ko: `${svgIcon('celebration', 'mi-inline mi-sm mi-success')} 매우 여성적인 ${lbl[1]}입니다!`, en: `${svgIcon('celebration', 'mi-inline mi-sm mi-success')} Very feminine ${lbl[1]}!`, ja: `${svgIcon('celebration', 'mi-inline mi-sm mi-success')} とても女性的な${lbl[1]}です！` };
        else if (position >= 60) evalText = { ko: `${svgIcon('auto_awesome', 'mi-inline mi-sm')} 여성적인 ${lbl[1]}입니다.`, en: `${svgIcon('auto_awesome', 'mi-inline mi-sm')} Feminine ${lbl[1]}.`, ja: `${svgIcon('auto_awesome', 'mi-inline mi-sm')} 女性的な${lbl[1]}です。` };
        else if (position >= 40) evalText = { ko: `중간 수준의 ${lbl[1]}입니다.`, en: `Neutral ${lbl[1]}.`, ja: `中間的な${lbl[1]}です。` };
        else if (position >= 20) evalText = { ko: `남성적인 ${lbl[1]}입니다.`, en: `Masculine ${lbl[1]}.`, ja: `男性的な${lbl[1]}です。` };
        else evalText = { ko: `매우 남성적인 ${lbl[1]}입니다.`, en: `Very masculine ${lbl[1]}.`, ja: `とても男性的な${lbl[1]}です。` };
        // FTM: 반전 (♂ 쪽이 좋은 결과)
        if (mode === 'ftm') {
            if (position <= 20) evalText = { ko: `${svgIcon('celebration', 'mi-inline mi-sm mi-success')} 매우 남성적인 ${lbl[1]}입니다!`, en: `${svgIcon('celebration', 'mi-inline mi-sm mi-success')} Very masculine ${lbl[1]}!`, ja: `${svgIcon('celebration', 'mi-inline mi-sm mi-success')} とても男性的な${lbl[1]}です！` };
            else if (position <= 40) evalText = { ko: `${svgIcon('auto_awesome', 'mi-inline mi-sm')} 남성적인 ${lbl[1]}입니다.`, en: `${svgIcon('auto_awesome', 'mi-inline mi-sm')} Masculine ${lbl[1]}.`, ja: `${svgIcon('auto_awesome', 'mi-inline mi-sm')} 男性的な${lbl[1]}です。` };
        }
        return evalText[L] || evalText.ko;
    };

    // WHR (허리-엉덩이 비율): 둘레 / 둘레
    if (latest.waist && latest.hips) {
        const waistCircum = parseFloat(latest.waist);
        const hipCircum = parseFloat(latest.hips);
        const whr = waistCircum / hipCircum;

        if (!isNaN(whr)) {
            const position = _ratioPosition(whr, 'whr');
            analytics.bodyRatios.whr = {
                value: whr,
                position,
                evaluation: _ratioEvaluation(position, 'whr')
            };
        }
    }

    // Chest-Waist (가슴-허리 비율): 둘레 / 둘레
    if (latest.chest && latest.waist) {
        const chestCircum = parseFloat(latest.chest);
        const waistCircum = parseFloat(latest.waist);
        const cwr = chestCircum / waistCircum;

        if (!isNaN(cwr)) {
            const position = _ratioPosition(cwr, 'chestWaist');
            analytics.bodyRatios.chestWaist = {
                value: cwr,
                position,
                evaluation: _ratioEvaluation(position, 'chestWaist')
            };
        }
    }

    // Shoulder-Hip (어깨-엉덩이 비율): 너비 vs 둘레 - 어깨 둘레로 추정 변환
    if (latest.shoulder && latest.hips) {
        const shoulderWidth = parseFloat(latest.shoulder);
        const hipCircum = parseFloat(latest.hips);
        const shoulderCircumEstimated = shoulderWidth * 2.8;
        const shr = shoulderCircumEstimated / hipCircum;

        if (!isNaN(shr)) {
            const position = _ratioPosition(shr, 'shoulderHip');
            analytics.bodyRatios.shoulderHip = {
                value: shr,
                position,
                evaluation: _ratioEvaluation(position, 'shoulderHip')
            };
        }
    }

    // 5. 약물 영향력 분석 (개선된 알고리즘)
    if (sortedMeas.length >= 2) {
        const getMedicationDoseMap = (m) => {
            const map = {};

            if (m && Array.isArray(m.medications)) {
                m.medications.forEach(entry => {
                    const id = entry?.id || entry?.medicationId;
                    const dose = Number(entry?.dose);
                    if (!id || !Number.isFinite(dose) || dose <= 0) return;
                    map[id] = (map[id] || 0) + dose;
                });
            }

            return map;
        };

        const doseMaps = sortedMeas.map(getMedicationDoseMap);

        const allMedNames = [...new Set(doseMaps.flatMap(dm => Object.keys(dm)))];
        const drugStats = {};
        allMedNames.forEach(name => drugStats[name] = {
            eDeltaSum: 0, tDeltaSum: 0, doseSum: 0, count: 0, weightSum: 0
        });

        // 먼저 모든 호르몬 변화를 수집하여 중앙값 계산 (이상치 필터링용)
        const allEChanges = [];
        const allTChanges = [];
        for (let i = 1; i < sortedMeas.length; i++) {
            const curr = sortedMeas[i];
            const prev = sortedMeas[i - 1];
            const days = (curr.timestamp - prev.timestamp) / 86400000;
            if (days < 1) continue;

            const dE = (!isNaN(parseFloat(curr.estrogenLevel)) && !isNaN(parseFloat(prev.estrogenLevel)))
                ? (parseFloat(curr.estrogenLevel) - parseFloat(prev.estrogenLevel)) : null;
            const dT = (!isNaN(parseFloat(curr.testosteroneLevel)) && !isNaN(parseFloat(prev.testosteroneLevel)))
                ? (parseFloat(curr.testosteroneLevel) - parseFloat(prev.testosteroneLevel)) : null;
            const wE = dE !== null ? Math.abs((dE / days) * 7) : null;
            const wT = dT !== null ? Math.abs((dT / days) * 7) : null;

            if (wE !== null) allEChanges.push(wE);
            if (wT !== null) allTChanges.push(wT);
        }

        // 중앙값 계산
        const getMedian = (arr) => {
            if (arr.length === 0) return 0;
            const sorted = [...arr].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
        };
        const medianE = getMedian(allEChanges);
        const medianT = getMedian(allTChanges);

        // 본격적인 약물 영향력 계산
        for (let i = 1; i < sortedMeas.length; i++) {
            const curr = sortedMeas[i];
            const prev = sortedMeas[i - 1];
            const days = (curr.timestamp - prev.timestamp) / 86400000;
            if (days < 1) continue;

            const dE = (!isNaN(parseFloat(curr.estrogenLevel)) && !isNaN(parseFloat(prev.estrogenLevel)))
                ? (parseFloat(curr.estrogenLevel) - parseFloat(prev.estrogenLevel)) : null;
            const dT = (!isNaN(parseFloat(curr.testosteroneLevel)) && !isNaN(parseFloat(prev.testosteroneLevel)))
                ? (parseFloat(curr.testosteroneLevel) - parseFloat(prev.testosteroneLevel)) : null;
            const wE = dE !== null ? (dE / days) * 7 : 0;
            const wT = dT !== null ? (dT / days) * 7 : 0;

            // 이상치 필터링 (중앙값의 5배 이상 변화는 측정 오류로 간주)
            if (Math.abs(wE) > medianE * 5 || Math.abs(wT) > medianT * 5) {
                console.warn(`Outlier filtered at week ${i}: wE=${wE}, wT=${wT}`);
                continue;
            }

            // 각 약물의 복용량 변화 계산
            const doseChanges = {};
            const currMap = doseMaps[i] || {};
            const prevMap = doseMaps[i - 1] || {};
            allMedNames.forEach(drugName => {
                const currDose = Number(currMap[drugName] || 0);
                const prevDose = Number(prevMap[drugName] || 0);
                doseChanges[drugName] = { curr: currDose, prev: prevDose, change: Math.abs(currDose - prevDose) };
            });

            // 단일 약물 변화 감지 (가중치 부여)
            const significantChanges = Object.values(doseChanges).filter(d => d.change >= 0.5).length;

            allMedNames.forEach(drugName => {
                const { curr, prev, change } = doseChanges[drugName];
                const doseAvg = (curr + prev) / 2;
                if (doseAvg === 0) return;

                // 기본 가중치 1.0
                let weight = 1.0;

                // 복용량 변화가 유의미한 경우 가중치 증가
                if (change >= 0.5) {
                    weight *= 2.0;
                }

                // 단일 약물만 변경된 경우 가중치 대폭 증가 (효과 분리)
                if (significantChanges === 1 && change >= 0.5) {
                    weight *= 3.0;
                } else if (significantChanges >= 3) {
                    // 여러 약물이 동시 변경된 경우 신뢰도 감소
                    weight *= 0.3;
                }

                if (dE !== null) drugStats[drugName].eDeltaSum += (wE * weight);
                if (dT !== null) drugStats[drugName].tDeltaSum += (wT * weight);
                drugStats[drugName].doseSum += (doseAvg * weight);
                drugStats[drugName].weightSum += weight;
                drugStats[drugName].count++;
            });
        }

        const influences = {};
        allMedNames.forEach(drug => {
            if (drugStats[drug].count >= 2 && drugStats[drug].doseSum > 0) {
                const scoreE = drugStats[drug].eDeltaSum / drugStats[drug].doseSum;
                const scoreT = drugStats[drug].tDeltaSum / drugStats[drug].doseSum;

                // 신뢰도 계산 (0-1)
                const countFactor = Math.min(drugStats[drug].count / 10, 1);
                const weightFactor = Math.min(drugStats[drug].weightSum / 20, 1);
                const confidence = (countFactor * 0.6 + weightFactor * 0.4);

                if (Math.abs(scoreE) > 0.01 || Math.abs(scoreT) > 0.01) {
                    influences[drug] = {
                        estrogen: scoreE,
                        testosterone: scoreT,
                        confidence: confidence,
                        samples: drugStats[drug].count
                    };
                }
            }
        });
        analytics.influence = influences;
    }

    // 6. 미래 예측
    const predictDays = (current, target, weeklyRate) => {
        if (isNaN(target) || weeklyRate === 0 || weeklyRate === null) return null;
        const dailyRate = weeklyRate / 7;
        const days = (target - current) / dailyRate;
        if (Math.abs(days) > 3650) return null;
        return Math.round(days);
    };

    if (analytics.estrogenLevel.monthlyAvgChange !== null) {
        analytics.estrogenLevel.predictedNext = analytics.estrogenLevel.current + analytics.estrogenLevel.monthlyAvgChange;
        analytics.estrogenLevel.daysToTarget = predictDays(analytics.estrogenLevel.current, parseFloat(targets.estrogenLevel), analytics.estrogenLevel.monthlyAvgChange);
    } else if (analytics.estrogenLevel.weeklyChange !== null) {
        analytics.estrogenLevel.predictedNext = analytics.estrogenLevel.current + analytics.estrogenLevel.weeklyChange;
        analytics.estrogenLevel.daysToTarget = null;
    }
    if (analytics.testosteroneLevel.monthlyAvgChange !== null) {
        analytics.testosteroneLevel.predictedNext = analytics.testosteroneLevel.current + analytics.testosteroneLevel.monthlyAvgChange;
        analytics.testosteroneLevel.daysToTarget = predictDays(analytics.testosteroneLevel.current, parseFloat(targets.testosteroneLevel), analytics.testosteroneLevel.monthlyAvgChange);
    } else if (analytics.testosteroneLevel.weeklyChange !== null) {
        analytics.testosteroneLevel.predictedNext = analytics.testosteroneLevel.current + analytics.testosteroneLevel.weeklyChange;
        analytics.testosteroneLevel.daysToTarget = null;
    }

    // 7. Emax / Hill 모델 기반 분석 및 반응도(RF) 계산
    const E_max = 0.95;
    const EC_50 = 175; // 개선된 값 (WPATH SOC 8 기반)

    // T0 설정 (성별 기반) - 표준 단위: ng/dL
    let T0 = 600; // 기본값 (남성)
    if (biologicalSex === 'female') {
        T0 = 40; // 여성
    } else {
        const initialT = parseFloat(initial.testosteroneLevel);
        if (!isNaN(initialT) && initialT > 200) T0 = initialT;
    }

    if (!isNaN(latestE_pgml)) {
        const predictedSuppressionFraction = E_max * (latestE_pgml / (EC_50 + latestE_pgml));
        const predictedSuppressedAmount = T0 * predictedSuppressionFraction;
        analytics.emax.dailySuppression = -1 * predictedSuppressedAmount;

        if (!isNaN(latestT_ngdL)) {
            const actualSuppressionFraction = (T0 - latestT_ngdL) / T0;
            let rf = 0;
            let messageKey = 'rfMessage_normal';

            if (actualSuppressionFraction < 0) {
                rf = actualSuppressionFraction;
                messageKey = 'rfMessage_negative';
            } else {
                rf = actualSuppressionFraction / predictedSuppressionFraction;

                if (rf > 1.3) messageKey = 'rfMessage_very_high';
                else if (rf > 1.15) messageKey = 'rfMessage_high';
                else if (rf < 0.7) messageKey = 'rfMessage_very_low';
                else if (rf < 0.85) messageKey = 'rfMessage_low';
                else messageKey = 'rfMessage_normal';
            }

            analytics.emax.rf = rf;
            analytics.emax.messageKey = messageKey;
        } else {
            analytics.emax.rf = null;
        }
    } else {
        analytics.emax.dailySuppression = null;
        analytics.emax.rf = null;
    }

    // 8. 현재 수치 평가 (간소화 - 목표치와 현재치 비교)
    const targetE = parseFloat(targets.estrogenLevel);
    const targetT = parseFloat(targets.testosteroneLevel);

    if (!isNaN(latestE_pgml)) {
        if (!isNaN(targetE)) {
            if (latestE_pgml > 300) {
                analytics.estrogenLevel.status = 'critical_high';
            } else if (Math.abs(latestE_pgml - targetE) / targetE < 0.1) {
                analytics.estrogenLevel.status = 'optimal';
            } else if (latestE_pgml > targetE) {
                analytics.estrogenLevel.status = 'above_target';
            } else {
                analytics.estrogenLevel.status = 'below_target';
            }
        } else {
            analytics.estrogenLevel.status = 'no_target';
        }
    }

    if (!isNaN(latestT_ngdL)) {
        if (!isNaN(targetT)) {
            if (latestT_ngdL < 5) {
                analytics.testosteroneLevel.status = 'critical_low';
            } else if (Math.abs(latestT_ngdL - targetT) / targetT < 0.1) {
                analytics.testosteroneLevel.status = 'optimal';
            } else if (latestT_ngdL > targetT) {
                analytics.testosteroneLevel.status = 'above_target';
            } else {
                analytics.testosteroneLevel.status = 'below_target';
            }
        } else {
            analytics.testosteroneLevel.status = 'no_target';
        }
    }

    return analytics;
}

// ── Hormone Report Modal Renderer ───────────────────────────────
export async function renderHormoneReport() {
    const { measurements, targets, formatValue, getFilteredDisplayKeys,
            ensureMedicationNameMap, loadChartJS, ensureAverageLinePluginRegistered } = _d;
    const medicationNameMap = _d.medicationNameMap;
    const modalTitleEl = document.getElementById('hormone-modal-title');
    if (modalTitleEl) modalTitleEl.textContent = translate('hormoneModalTitle');

    const analysisEl = document.getElementById('hormone-analysis-text');
    if (!analysisEl) return;

    const analytics = calculateAdvancedHormoneAnalytics();
    let analysisHTML = '';

    if (!analytics) {
        analysisHTML = `<h4 class="table-title">${translate('hormoneAnalysisTitle')}</h4><p class="placeholder">${translate('notEnoughData')}</p>`;
    } else {
        const formatChange = (val) => {
            if (val === null || val === undefined || isNaN(val)) return '-';
            const fixedVal = val.toFixed(1);
            return val > 0 ? `+${fixedVal}` : fixedVal;
        };

        // ========================================
        // 섹션 1: 현재 수치 평가 (Current Level Evaluation)
        // ========================================
        analysisHTML += `
        <div class="hormone-section">
            <div class="hormone-section-header">
                <h2 class="hormone-section-title">
                    <span class="section-number">1</span>
                    ${translate('currentLevelEvaluation')}
                </h2>
                <p class="hormone-section-desc">${translate('currentLevelEvaluationDesc')}</p>
            </div>
            <div class="hormone-grid">`;

        // Estrogen 평가
        if (analytics.estrogenLevel.current !== undefined) {
            const targetE = parseFloat(targets.estrogenLevel);
            const currentE = analytics.estrogenLevel.current;
            let statusHTML = '';
            let statusIcon = '';

            if (analytics.estrogenLevel.status === 'critical_high') {
                statusHTML = `<div class="status-badge danger-badge">${svgIcon('warning', 'status-icon mi-error')} ${translate('estrogen_critical_high')}</div>`;
                statusIcon = svgIcon('warning', 'status-icon mi-error');
            } else if (analytics.estrogenLevel.status === 'optimal') {
                statusHTML = `<div class="status-badge optimal-badge">${svgIcon('check_circle', 'status-icon mi-success')} ${translate('estrogen_optimal')}</div>`;
                statusIcon = svgIcon('check_circle', 'status-icon mi-success');
            } else if (analytics.estrogenLevel.status === 'above_target') {
                statusHTML = `<div class="status-badge above-badge">${svgIcon('arrow_upward', 'status-icon')} ${translate('estrogen_above_target')}</div>`;
                statusIcon = svgIcon('arrow_upward', 'status-icon');
            } else if (analytics.estrogenLevel.status === 'below_target') {
                statusHTML = `<div class="status-badge below-badge">${svgIcon('arrow_downward', 'status-icon')} ${translate('estrogen_below_target')}</div>`;
                statusIcon = svgIcon('arrow_downward', 'status-icon');
            } else {
                statusHTML = `<div class="status-badge neutral-badge">${translate('no_target_set')}</div>`;
                statusIcon = svgIcon('remove', 'status-icon');
            }

            analysisHTML += `
            <div class="hormone-card highlight-card">
                <div class="hormone-card-header">
                    <h3 class="hormone-name">${translate('estrogenLevel').split('(')[0]}</h3>
                </div>
                <div class="hormone-current-value">${formatValue(currentE, 'estrogenLevel')}</div>
                ${!isNaN(targetE) ? `<div class="hormone-target">
                    <span class="target-label">${translate('svcard_label_target')}</span>
                    <span class="target-value">${formatValue(targetE, 'estrogenLevel')}</span>
                </div>` : ''}
                ${statusHTML}
            </div>`;
        }

        // Testosterone 평가
        if (analytics.testosteroneLevel.current !== undefined) {
            const targetT = parseFloat(targets.testosteroneLevel);
            const currentT = analytics.testosteroneLevel.current;
            let statusHTML = '';
            let statusIcon = '';

            if (analytics.testosteroneLevel.status === 'critical_low') {
                statusHTML = `<div class="status-badge danger-badge">${svgIcon('warning', 'status-icon mi-error')} ${translate('testosterone_critical_low')}</div>`;
                statusIcon = svgIcon('warning', 'status-icon mi-error');
            } else if (analytics.testosteroneLevel.status === 'optimal') {
                statusHTML = `<div class="status-badge optimal-badge">${svgIcon('check_circle', 'status-icon mi-success')} ${translate('testosterone_optimal')}</div>`;
                statusIcon = svgIcon('check_circle', 'status-icon mi-success');
            } else if (analytics.testosteroneLevel.status === 'above_target') {
                statusHTML = `<div class="status-badge above-badge">${svgIcon('arrow_upward', 'status-icon')} ${translate('testosterone_above_target')}</div>`;
                statusIcon = svgIcon('arrow_upward', 'status-icon');
            } else if (analytics.testosteroneLevel.status === 'below_target') {
                statusHTML = `<div class="status-badge below-badge">${svgIcon('arrow_downward', 'status-icon')} ${translate('testosterone_below_target')}</div>`;
                statusIcon = svgIcon('arrow_downward', 'status-icon');
            } else {
                statusHTML = `<div class="status-badge neutral-badge">${translate('no_target_set')}</div>`;
                statusIcon = svgIcon('remove', 'status-icon');
            }

            analysisHTML += `
            <div class="hormone-card highlight-card">
                <div class="hormone-card-header">
                    <h3 class="hormone-name">${translate('testosteroneLevel').split('(')[0]}</h3>
                </div>
                <div class="hormone-current-value">${formatValue(currentT, 'testosteroneLevel')}</div>
                ${!isNaN(targetT) ? `<div class="hormone-target">
                    <span class="target-label">${translate('svcard_label_target')}</span>
                    <span class="target-value">${formatValue(targetT, 'testosteroneLevel')}</span>
                </div>` : ''}
                ${statusHTML}
            </div>`;
        }

        analysisHTML += `
            </div>
        </div>`;

        // ========================================
        // 섹션 2: E/T Ratio
        // ========================================
        if (analytics.etRatio) {
            // E/T 비율 범위 표시
            const maleRange = '< 5';
            const femaleRange = '> 30';

            analysisHTML += `
            <div class="hormone-section">
                <div class="hormone-section-header">
                    <h2 class="hormone-section-title">
                        <span class="section-number">2</span>
                        ${translate('etRatioTitle')}
                    </h2>
                    <p class="hormone-section-desc">${translate('etRatioExplanation')}</p>
                </div>
                <div class="hormone-card ratio-card">
                    <div class="ratio-bar-container">
                        <div class="ratio-icon-group">
                            <span class="ratio-icon male">${svgIcon('male', 'mi-sm')}</span>
                            <span class="ratio-percentile">${maleRange}</span>
                        </div>
                        <div class="ratio-bar">
                            <div class="ratio-bar-fill" style="width: ${analytics.etRatio.position}%;"></div>
                            <div class="ratio-bar-marker" style="left: ${analytics.etRatio.position}%;"></div>
                        </div>
                        <div class="ratio-icon-group">
                            <span class="ratio-icon female">${svgIcon('female', 'mi-sm')}</span>
                            <span class="ratio-percentile">${femaleRange}</span>
                        </div>
                    </div>
                    <div class="ratio-value-display">
                        <span class="ratio-number">${analytics.etRatio.value.toFixed(3)}</span>
                    </div>
                </div>
            </div>`;
        }

        // ========================================
        // 섹션 3: 수치 변화량 분석 (Level Change Analysis)
        // ========================================
        analysisHTML += `
        <div class="hormone-section">
            <div class="hormone-section-header">
                <h2 class="hormone-section-title">
                    <span class="section-number">3</span>
                    ${translate('hormoneAnalysisTitleChange')}
                </h2>
                <p class="hormone-section-desc">${translate('hormoneChangeAnalysisDesc')}</p>
            </div>
            
            <div class="info-card">
                <h4 class="info-card-title">${svgIcon('lightbulb', 'mi-inline mi-sm')} ${translate('understandingHormones')}</h4>
                <div class="info-card-content">
                    <p><strong>${translate('estrogenLevel').split('(')[0]}:</strong> ${translate('estrogenExplanation')}</p>
                    <p><strong>${translate('testosteroneLevel').split('(')[0]}:</strong> ${translate('testosteroneExplanation')}</p>
                </div>
            </div>

            <div class="hormone-grid">
                <div class="hormone-card">
                    <div class="hormone-card-header">
                        <h3 class="hormone-name">${translate('estrogenLevel').split('(')[0]}</h3>
                        <span class="hormone-current-mini">${formatValue(analytics.estrogenLevel.current, 'estrogenLevel')}</span>
                    </div>
                    <div class="change-metrics">
                        <div class="change-item">
                            <span class="change-label">${translate('weeklyChange')}</span>
                            <span class="change-value ${analytics.estrogenLevel.weeklyChange > 0 ? 'positive' : analytics.estrogenLevel.weeklyChange < 0 ? 'negative' : ''}">${formatChange(analytics.estrogenLevel.weeklyChange)}</span>
                        </div>
                        <div class="change-item">
                            <span class="change-label">${translate('monthlyAvgChange')}</span>
                            <span class="change-value ${analytics.estrogenLevel.monthlyAvgChange > 0 ? 'positive' : analytics.estrogenLevel.monthlyAvgChange < 0 ? 'negative' : ''}">${formatChange(analytics.estrogenLevel.monthlyAvgChange)}</span>
                        </div>
                        <div class="change-item">
                            <span class="change-label">${translate('totalChange')}</span>
                            <span class="change-value ${analytics.estrogenLevel.totalChange > 0 ? 'positive' : analytics.estrogenLevel.totalChange < 0 ? 'negative' : ''}">${formatChange(analytics.estrogenLevel.totalChange)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="hormone-card">
                    <div class="hormone-card-header">
                        <h3 class="hormone-name">${translate('testosteroneLevel').split('(')[0]}</h3>
                        <span class="hormone-current-mini">${formatValue(analytics.testosteroneLevel.current, 'testosteroneLevel')}</span>
                    </div>
                    <div class="change-metrics">
                        <div class="change-item">
                            <span class="change-label">${translate('weeklyChange')}</span>
                            <span class="change-value ${analytics.testosteroneLevel.weeklyChange > 0 ? 'positive' : analytics.testosteroneLevel.weeklyChange < 0 ? 'negative' : ''}">${formatChange(analytics.testosteroneLevel.weeklyChange)}</span>
                        </div>
                        <div class="change-item">
                            <span class="change-label">${translate('monthlyAvgChange')}</span>
                            <span class="change-value ${analytics.testosteroneLevel.monthlyAvgChange > 0 ? 'positive' : analytics.testosteroneLevel.monthlyAvgChange < 0 ? 'negative' : ''}">${formatChange(analytics.testosteroneLevel.monthlyAvgChange)}</span>
                        </div>
                        <div class="change-item">
                            <span class="change-label">${translate('totalChange')}</span>
                            <span class="change-value ${analytics.testosteroneLevel.totalChange > 0 ? 'positive' : analytics.testosteroneLevel.totalChange < 0 ? 'negative' : ''}">${formatChange(analytics.testosteroneLevel.totalChange)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        // ========================================
        // 섹션 4: Emax / Hill 분석
        // ========================================
        if (analytics.emax && analytics.emax.dailySuppression !== null) {
            const rfValue = analytics.emax.rf !== null ? analytics.emax.rf.toFixed(2) : '-';
            const rfMessage = analytics.emax.messageKey ? translate(analytics.emax.messageKey) : '';
            const suppressionValue = formatChange(analytics.emax.dailySuppression);

            let rfColorClass = '';
            let rfIcon = svgIcon('monitoring', 'status-icon');
            if (analytics.emax.messageKey === 'rfMessage_very_high' || analytics.emax.messageKey === 'rfMessage_high') {
                rfColorClass = 'positive';
                rfIcon = svgIcon('check_circle', 'status-icon mi-success');
            } else if (analytics.emax.messageKey === 'rfMessage_low' || analytics.emax.messageKey === 'rfMessage_very_low' || analytics.emax.messageKey === 'rfMessage_negative') {
                rfColorClass = 'negative';
                rfIcon = svgIcon('warning', 'status-icon mi-error');
            }

            analysisHTML += `
            <div class="hormone-section">
                <div class="hormone-section-header">
                    <h2 class="hormone-section-title">
                        <span class="section-number">4</span>
                        ${translate('emaxTitle')}
                    </h2>
                    <p class="hormone-section-desc">${translate('emaxAnalysisDesc')}</p>
                </div>
                <div class="hormone-card highlight-card emax-special">
                    <div class="emax-metrics">
                        <div class="emax-item">
                            <div class="emax-label">${translate('dailyTSuppression')}</div>
                            <div class="emax-value primary-color">${suppressionValue}</div>
                            <div class="emax-unit">ng/dL / week</div>
                        </div>
                        <div class="emax-divider"></div>
                        <div class="emax-item">
                            <div class="emax-label">${translate('responseFactor')}</div>
                            <div class="emax-value ${rfColorClass}">${rfIcon} ${rfValue}x</div>
                            <div class="emax-message">${rfMessage}</div>
                        </div>
                    </div>
                </div>
            </div>`;
        }

        // ========================================
        // 섹션 5: 호르몬 안정성 분석 (Hormone Stability Analysis)
        // ========================================
        if (analytics.stability && (analytics.stability.estrogenLevel || analytics.stability.testosteroneLevel)) {
            analysisHTML += `
            <div class="hormone-section">
                <div class="hormone-section-header">
                    <h2 class="hormone-section-title">
                        <span class="section-number">5</span>
                        ${translate('stabilityAnalysisTitle')}
                    </h2>
                    <p class="hormone-section-desc">${translate('cvStabilityNote')}</p>
                </div>
                <div class="hormone-grid">`;

            if (analytics.stability.estrogenLevel) {
                const cv = analytics.stability.estrogenLevel.cv.toFixed(1);
                let statusText = '';
                let statusIcon = '';
                let statusClass = '';

                if (analytics.stability.estrogenLevel.status === 'stable') {
                    statusText = translate('stability_stable');
                    statusIcon = svgIcon('check_circle', 'status-icon mi-success');
                    statusClass = 'stable';
                } else if (analytics.stability.estrogenLevel.status === 'moderate') {
                    statusText = translate('stability_moderate');
                    statusIcon = svgIcon('swap_vert', 'status-icon mi-warning');
                    statusClass = 'moderate';
                } else {
                    statusText = translate('stability_unstable');
                    statusIcon = svgIcon('warning', 'status-icon mi-error');
                    statusClass = 'unstable';
                }

                analysisHTML += `
                <div class="hormone-card">
                    <div class="hormone-card-header">
                        <h3 class="hormone-name">${translate('estrogenLevel').split('(')[0]}</h3>
                    </div>
                    <div class="stability-display">
                        <div class="stability-cv">
                            <span class="stability-cv-value">${cv}%</span>
                            <span class="stability-cv-label">${translate('variationCoeff')}</span>
                        </div>
                        <div class="stability-status ${statusClass}">
                            ${statusIcon} ${statusText}
                        </div>
                    </div>
                </div>`;
            }

            if (analytics.stability.testosteroneLevel) {
                const cv = analytics.stability.testosteroneLevel.cv.toFixed(1);
                let statusText = '';
                let statusIcon = '';
                let statusClass = '';

                if (analytics.stability.testosteroneLevel.status === 'stable') {
                    statusText = translate('stability_stable');
                    statusIcon = svgIcon('check_circle', 'status-icon mi-success');
                    statusClass = 'stable';
                } else if (analytics.stability.testosteroneLevel.status === 'moderate') {
                    statusText = translate('stability_moderate');
                    statusIcon = svgIcon('swap_vert', 'status-icon mi-warning');
                    statusClass = 'moderate';
                } else {
                    statusText = translate('stability_unstable');
                    statusIcon = svgIcon('warning', 'status-icon mi-error');
                    statusClass = 'unstable';
                }

                analysisHTML += `
                <div class="hormone-card">
                    <div class="hormone-card-header">
                        <h3 class="hormone-name">${translate('testosteroneLevel').split('(')[0]}</h3>
                    </div>
                    <div class="stability-display">
                        <div class="stability-cv">
                            <span class="stability-cv-value">${cv}%</span>
                            <span class="stability-cv-label">${translate('variationCoeff')}</span>
                        </div>
                        <div class="stability-status ${statusClass}">
                            ${statusIcon} ${statusText}
                        </div>
                    </div>
                </div>`;
            }

            analysisHTML += `
                </div>
            </div>`;
        }

        // ========================================
        // 섹션 6: 미래 예측 (Future Prediction)
        // ========================================
        const getDayText = (val) => {
            if (val === null) return '-';
            return translate('daysUnit', { days: val });
        };

        analysisHTML += `
        <div class="hormone-section">
            <div class="hormone-section-header">
                <h2 class="hormone-section-title">
                    <span class="section-number">6</span>
                    ${translate('hormoneAnalysisTitlePrediction')}
                </h2>
                <p class="hormone-section-desc">${translate('predictionDisclaimer')}</p>
            </div>
            <div class="hormone-grid">
                <div class="hormone-card prediction-card">
                    <div class="hormone-card-header">
                        <h3 class="hormone-name">${translate('estrogenLevel').split('(')[0]}</h3>
                    </div>
                    <div class="prediction-display">
                        <div class="prediction-item">
                            <span class="prediction-label">${svgIcon('trending_up', 'status-icon')} ${translate('predictedNextWeek')}</span>
                            <span class="prediction-value">${analytics.estrogenLevel.predictedNext ? analytics.estrogenLevel.predictedNext.toFixed(1) : '-'}</span>
                        </div>
                        ${targets.estrogenLevel ? `
                        <div class="prediction-item">
                            <span class="prediction-label">${svgIcon('target', 'status-icon')} ${translate('daysToTarget')}</span>
                            <span class="prediction-value">${getDayText(analytics.estrogenLevel.daysToTarget)}</span>
                            <span class="prediction-target">${translate('targetLabelShort', { value: targets.estrogenLevel })}</span>
                        </div>` : ''}
                    </div>
                </div>
                
                <div class="hormone-card prediction-card">
                    <div class="hormone-card-header">
                        <h3 class="hormone-name">${translate('testosteroneLevel').split('(')[0]}</h3>
                    </div>
                    <div class="prediction-display">
                        <div class="prediction-item">
                            <span class="prediction-label">${svgIcon('trending_up', 'status-icon')} ${translate('predictedNextWeek')}</span>
                            <span class="prediction-value">${analytics.testosteroneLevel.predictedNext ? analytics.testosteroneLevel.predictedNext.toFixed(1) : '-'}</span>
                        </div>
                        ${targets.testosteroneLevel ? `
                        <div class="prediction-item">
                            <span class="prediction-label">${svgIcon('target', 'status-icon')} ${translate('daysToTarget')}</span>
                            <span class="prediction-value">${getDayText(analytics.testosteroneLevel.daysToTarget)}</span>
                            <span class="prediction-target">${translate('targetLabelShort', { value: targets.testosteroneLevel })}</span>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        </div>`;

        // ========================================
        // 섹션 7: 약물 영향력 분석 (Drug Influence Analysis)
        // ========================================
        if (analytics.influence) {
            const influenceEntries = Object.entries(analytics.influence);
            if (influenceEntries.length > 0) {
                analysisHTML += `
                <div class="hormone-section">
                    <div class="hormone-section-header">
                        <h2 class="hormone-section-title">
                            <span class="section-number">7</span>
                            ${translate('hormoneAnalysisTitleInfluence')}
                        </h2>
                        <p class="hormone-section-desc">${translate('drugInfluenceDesc')}</p>
                    </div>
                    
                    <div class="info-card-grid">
                        <div class="info-card mini">
                            <h4 class="info-card-title">${svgIcon('info', 'mi-inline mi-sm')} ${translate('drugInfluenceHowItWorks')}</h4>
                            <p class="info-card-text">${translate('drugInfluenceHowItWorksDesc')}</p>
                        </div>
                        <div class="info-card mini">
                            <h4 class="info-card-title">${svgIcon('monitoring', 'mi-inline mi-sm')} ${translate('drugInfluenceConfidence')}</h4>
                            <p class="info-card-text">${translate('drugInfluenceConfidenceDesc')}</p>
                        </div>
                    </div>

                    <div class="drug-grid">`;

                try { ensureMedicationNameMap(); } catch (e) { console.warn('[Analysis] Medication name map load failed:', e); }

                const translateIfExists = (key) => {
                    const t = translate(key);
                    return t && t !== key ? t : null;
                };

                analysisHTML += influenceEntries.map(([drug, effects]) => {
                    const confidencePercent = Math.round(effects.confidence * 100);
                    let confidenceClass = '';
                    if (confidencePercent >= 80) confidenceClass = 'high';
                    else if (confidencePercent >= 50) confidenceClass = 'medium';
                    else confidenceClass = 'low';

                    const drugLabel = translateIfExists(drug) || medicationNameMap?.get?.(drug) || drug;

                    return `
                    <div class="drug-card">
                        <div class="drug-card-header">
                            <h3 class="drug-name">${svgIcon('medication', 'mi-inline mi-sm')} ${drugLabel}</h3>
                            <div class="drug-samples">${effects.samples} ${translate('samples')}</div>
                        </div>
                        <div class="drug-influences">
                            <div class="drug-influence-item">
                                <span class="drug-hormone-label">E₂</span>
                                <span class="drug-influence-value ${effects.estrogen >= 0 ? 'positive' : 'negative'}">
                                    ${effects.estrogen >= 0 ? '+' : ''}${effects.estrogen.toFixed(2)}
                                </span>
                                <span class="drug-influence-unit">pg/mL / mg</span>
                            </div>
                            <div class="drug-influence-item">
                                <span class="drug-hormone-label">T</span>
                                <span class="drug-influence-value ${effects.testosterone >= 0 ? 'positive' : 'negative'}">
                                    ${effects.testosterone >= 0 ? '+' : ''}${effects.testosterone.toFixed(2)}
                                </span>
                                <span class="drug-influence-unit">ng/dL / mg</span>
                            </div>
                        </div>
                        <div class="drug-confidence ${confidenceClass}">
                            <span class="confidence-label">${translate('confidence')}</span>
                            <span class="confidence-value">${confidencePercent}%</span>
                        </div>
                    </div>`;
                }).join('');

                analysisHTML += `
                    </div>
                </div>`;
            }
        }

        // ========================================
        // 섹션 8: 신체 비율 분석 (Body Ratio Analysis)
        // ========================================
        if (analytics.bodyRatios && (analytics.bodyRatios.whr || analytics.bodyRatios.chestWaist || analytics.bodyRatios.shoulderHip)) {
            // 비율 카드 렌더 헬퍼 (바디 브리핑과 동일 스타일)
            const _ratioCardHtml = (ratio, nameKey) => `
                <div class="body-ratio-card">
                    <h3 class="body-ratio-name">${svgIcon('straighten', 'mi-inline mi-sm')} ${translate(nameKey)}</h3>
                    <div class="ratio-bar-container">
                        <div class="ratio-icon-group">
                            <span class="ratio-icon male">${svgIcon('male', 'mi-sm')}</span>
                        </div>
                        <div class="ratio-bar">
                            <div class="ratio-bar-fill" style="width: ${ratio.position}%;"></div>
                            <div class="ratio-bar-marker" style="left: ${ratio.position}%;"></div>
                        </div>
                        <div class="ratio-icon-group">
                            <span class="ratio-icon female">${svgIcon('female', 'mi-sm')}</span>
                        </div>
                    </div>
                    <div class="ratio-value-display">
                        <span class="ratio-number">${ratio.value.toFixed(2)}</span>
                    </div>
                    ${ratio.evaluation ? `<div class="ratio-evaluation">${ratio.evaluation}</div>` : ''}
                </div>`;

            analysisHTML += `
            <div class="hormone-section">
                <div class="hormone-section-header">
                    <h2 class="hormone-section-title">
                        <span class="section-number">8</span>
                        ${translate('bodyRatioAnalysisTitle')}
                    </h2>
                    <p class="hormone-section-desc">${translate('bodyRatioAnalysisDesc')}</p>
                </div>
                <div class="body-ratio-container">`;

            if (analytics.bodyRatios.whr) analysisHTML += _ratioCardHtml(analytics.bodyRatios.whr, 'waistHipRatio');
            if (analytics.bodyRatios.chestWaist) analysisHTML += _ratioCardHtml(analytics.bodyRatios.chestWaist, 'chestWaistRatio');
            if (analytics.bodyRatios.shoulderHip) analysisHTML += _ratioCardHtml(analytics.bodyRatios.shoulderHip, 'shoulderHipRatio');

            analysisHTML += `
                </div>
            </div>`;
        }
    }
    analysisEl.innerHTML = analysisHTML;



    // --- 그래프 렌더링 로직 (여기가 핵심 수정) ---
    const medicationCtx = document.getElementById('medication-chart')?.getContext('2d');
    const hormoneCtx = document.getElementById('hormone-chart')?.getContext('2d');
    const selectedDataContainer = document.getElementById('selected-week-data-container');
    const selectedDataTitle = document.getElementById('selected-week-data-title');
    const selectedDataContent = document.getElementById('selected-week-data-content');
    const hormonePlaceholderEl = document.getElementById('hormone-data-placeholder');

    if (!medicationCtx || !hormoneCtx || !selectedDataContainer || !hormonePlaceholderEl) return;

    if (_d.medicationChartInstance) _d.medicationChartInstance.destroy();
    if (_d.hormoneChartInstance) _d.hormoneChartInstance.destroy();

    selectedDataContainer.style.display = 'block';
    selectedDataTitle.innerHTML = '';
    selectedDataContent.innerHTML = '';
    selectedDataContent.style.display = 'none';
    hormonePlaceholderEl.style.display = 'block';
    hormonePlaceholderEl.textContent = translate('graphClickPrompt');

    const labels = measurements.map(m => `${m.week}${translate('week')}`);

    try {
        if (!medicationNameMap) {
            ensureMedicationNameMap().then(map => {
                if (!map) return;
                const overlay = document.getElementById('hormone-modal-overlay');
                if (!overlay?.classList?.contains('visible')) return;
                try { renderHormoneReport(); } catch (e) { console.warn('[HormoneReport] Re-render after medication map failed:', e); }
            });
        } else {
            ensureMedicationNameMap();
        }
    } catch (e) { console.warn('[HormoneReport] Medication name map init failed:', e); }
    const translateIfExists = (key) => {
        const t = translate(key);
        return t && t !== key ? t : null;
    };

    const baseColors = ['#ff8fcd', '#ff60a8', '#ff5577', '#e04f9e', '#dc143c'];
    const medKeyToMeta = new Map();
    measurements.forEach(m => {
        if (!m || !Array.isArray(m.medications)) return;
        m.medications.forEach(entry => {
            const id = entry?.id || entry?.medicationId;
            if (!id) return;
            const unit = entry?.unit || '';
            const key = `${id}__${unit}`;
            if (medKeyToMeta.has(key)) return;
            medKeyToMeta.set(key, { id, unit });
        });
    });

    const medSeries = Array.from(medKeyToMeta.values());

    let allDatasets = medSeries.map((def, index) => {
        const color = baseColors[index % baseColors.length] || `hsl(${(index * 37) % 360}, 70%, 60%)`;
        const name = translateIfExists(def.id) || medicationNameMap?.get?.(def.id) || def.id;
        const label = `${name}${def.unit ? ` (${def.unit})` : ''}`;

        const data = measurements.map(m => {
            const found = Array.isArray(m?.medications)
                ? m.medications.find(x => (x?.id || x?.medicationId) === def.id && (x?.unit || '') === (def.unit || ''))
                : null;
            const dose = Number(found?.dose);
            return Number.isFinite(dose) ? dose : null;
        });

        return {
            label,
            data,
            borderColor: color,
            backgroundColor: color + '33',
            tension: 0.1,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            spanGaps: true,
            _series: { kind: 'medication', id: def.id, unit: def.unit }
        };
    });

    // 호르몬 데이터셋 (기존 동일)
    const hormoneKeys = ['estrogenLevel', 'testosteroneLevel'];
    const hormoneColors = ['#55f0d0', '#8888ff'];
    const hormoneDatasets = hormoneKeys.map((key, index) => ({
        label: translate(key).split('(')[0].trim(),
        data: measurements.map(m => m[key] ? parseFloat(m[key]) : NaN),
        borderColor: hormoneColors[index],
        backgroundColor: hormoneColors[index] + '33',
        tension: 0.1,
        borderWidth: 2,
        spanGaps: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        _series: { kind: 'metric', key },
        _targetValue: (targets && Number.isFinite(Number(targets[key]))) ? Number(targets[key]) : undefined
    }));

    const onChartClick = (event, chartInstance) => {
        const points = chartInstance.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
        if (points.length) {
            const firstPoint = points[0];
            const weekIndex = firstPoint.index;
            const weekData = measurements[weekIndex];
            if (weekData) {
                selectedDataTitle.textContent = translate('selectedWeekDataTitle', { week: weekData.week });
                let contentHTML = '';
                getFilteredDisplayKeys().forEach(key => {
                    if (weekData[key] !== null && weekData[key] !== undefined && weekData[key] !== '') {
                        contentHTML += `
        <div class="data-item">
            <span class="data-item-label">${translate(key).split('(')[0].trim()}</span>
            <span class="data-item-value">${formatValue(weekData[key], key)}</span>
        </div>`;
                    }
                });
                selectedDataContent.innerHTML = contentHTML;
                selectedDataContent.style.display = 'grid';
                hormonePlaceholderEl.style.display = 'none';
            }
        }
    };

    const chartOptions = (chartInstanceProvider) => {
        const isLightMode = document.body.classList.contains('light-mode');
        const tickColor = isLightMode ? '#5c5c8a' : getCssVar('--text-dim2');
        const gridColor = isLightMode ? 'rgba(200, 200, 235, 0.5)' : getCssVar('--glass-border');

        return {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: tickColor }, grid: { color: gridColor }, border: { color: gridColor } },
                y: { ticks: { color: tickColor }, grid: { color: gridColor }, border: { color: gridColor } }
            },
            plugins: { legend: { display: false } },
            onClick: (event) => onChartClick(event, chartInstanceProvider())
        }
    };

    // 호르몬 차트들 스크롤 기능
    const maxPointsPerView = 20;
    const minPointWidth = 42;
    const medicationWrapper = medicationCtx.canvas.closest('.chart-wrapper');
    const hormoneWrapper = hormoneCtx.canvas.closest('.chart-wrapper');

    // Medication 차트 컨테이너 설정
    let medInnerContainer = medicationCtx.canvas.parentElement;
    if (!medInnerContainer || !medInnerContainer.classList.contains('chart-inner-container')) {
        medInnerContainer = document.createElement('div');
        medInnerContainer.classList.add('chart-inner-container');
        const parent = medicationCtx.canvas.parentElement;
        parent.insertBefore(medInnerContainer, medicationCtx.canvas);
        medInnerContainer.appendChild(medicationCtx.canvas);
    }

    // Hormone 차트 컨테이너 설정
    let hormoneInnerContainer = hormoneCtx.canvas.parentElement;
    if (!hormoneInnerContainer || !hormoneInnerContainer.classList.contains('chart-inner-container')) {
        hormoneInnerContainer = document.createElement('div');
        hormoneInnerContainer.classList.add('chart-inner-container');
        const parent = hormoneCtx.canvas.parentElement;
        parent.insertBefore(hormoneInnerContainer, hormoneCtx.canvas);
        hormoneInnerContainer.appendChild(hormoneCtx.canvas);
    }

    if (measurements.length > maxPointsPerView) {
        const neededWidth = measurements.length * minPointWidth;

        if (medicationWrapper) {
            medicationWrapper.style.overflowX = 'auto';
            medicationWrapper.style.overflowY = 'hidden';
        }
        medInnerContainer.style.width = neededWidth + 'px';
        medInnerContainer.style.height = '230px';
        medicationCtx.canvas.style.width = '100%';
        medicationCtx.canvas.style.height = '100%';

        if (hormoneWrapper) {
            hormoneWrapper.style.overflowX = 'auto';
            hormoneWrapper.style.overflowY = 'hidden';
        }
        hormoneInnerContainer.style.width = neededWidth + 'px';
        hormoneInnerContainer.style.height = '230px';
        hormoneCtx.canvas.style.width = '100%';
        hormoneCtx.canvas.style.height = '100%';
    } else {
        if (medicationWrapper) {
            medicationWrapper.style.overflowX = 'hidden';
        }
        medInnerContainer.style.width = '100%';
        medInnerContainer.style.height = '230px';
        medicationCtx.canvas.style.width = '100%';
        medicationCtx.canvas.style.height = '100%';

        if (hormoneWrapper) {
            hormoneWrapper.style.overflowX = 'hidden';
        }
        hormoneInnerContainer.style.width = '100%';
        hormoneInnerContainer.style.height = '230px';
        hormoneCtx.canvas.style.width = '100%';
        hormoneCtx.canvas.style.height = '100%';
    }

    await loadChartJS();
    ensureAverageLinePluginRegistered();
    _d.medicationChartInstance = new Chart(medicationCtx, { type: 'line', data: { labels, datasets: allDatasets }, options: chartOptions(() => _d.medicationChartInstance) });
    _d.hormoneChartInstance = new Chart(hormoneCtx, { type: 'line', data: { labels, datasets: hormoneDatasets }, options: chartOptions(() => _d.hormoneChartInstance) });

    const medicationLegendEl = document.getElementById('medication-legend-controls');
    const hormoneLegendEl = document.getElementById('hormone-legend-controls');
    if (!medicationLegendEl || !hormoneLegendEl) return;

    const createGroupedLegend = (chart, container, titleKey) => {
        const allVisible = chart.data.datasets.length > 0 && chart.data.datasets.every((_, i) => chart.isDatasetVisible(i));
        const toggleText = allVisible ? translate('deselectAll') : translate('selectAll');
        const groupKey = chart.canvas.id === 'medication-chart' ? 'medication' : 'metric';
        const groupIndices = chart.data.datasets
            .map((ds, idx) => ({ ds, idx }))
            .filter(({ ds }) => (ds?._series?.kind || groupKey) === groupKey)
            .map(({ idx }) => idx);
        const groupAllVisible = groupIndices.length > 0 && groupIndices.every(i => chart.isDatasetVisible(i));
        const groupToggleText = groupAllVisible ? translate('deselectAll') : translate('selectAll');
        const items = chart.data.datasets.map((dataset, index) => {
            const color = dataset.borderColor;
            const isActive = chart.isDatasetVisible(index);
            const inactive = isActive ? '' : 'inactive';
            const bg = isActive ? color : 'transparent';
            const fg = isActive ? 'white' : getCssVar('--text-dim');
            return `<button class="legend-button ${inactive}" data-dataset-index="${index}" style="background-color: ${bg}; border-color: ${color}; color: ${fg};">${dataset.label}</button>`;
        }).join('');

        container.innerHTML = `
            <div class="briefing-legend-toolbar">
                <button class="legend-button" data-action="toggle-all" style="background-color: var(--accent); border-color: var(--accent); color: white;">${toggleText}</button>
            </div>
            <div class="briefing-legend-grid">
                <div class="legend-group-card">
                    <h5 class="legend-group-title">${translate(titleKey)}</h5>
                    <div class="legend-list" data-group="${groupKey}">${items}</div>
                    <div class="legend-group-toolbar">
                        <button class="legend-button legend-group-toggle" data-group="${groupKey}" data-action="toggle-group" style="background-color: var(--glass-bg); border-color: var(--glass-border); color: var(--text-dim); margin-top: 8px; width: 100%;">${groupToggleText}</button>
                    </div>
                </div>
            </div>
        `;
    };

    createGroupedLegend(_d.medicationChartInstance, medicationLegendEl, 'briefingGroupMedications');
    createGroupedLegend(_d.hormoneChartInstance, hormoneLegendEl, 'briefingGroupMeasurements');

    const pointCount = labels.length;
    const medContainer = ensureChartWrapperContainer(medicationWrapper);
    const hormoneContainer = ensureChartWrapperContainer(hormoneWrapper);
    ensureChartZoomControls(_d.medicationChartInstance, medicationWrapper, medInnerContainer, pointCount, 'medication-chart');
    ensureChartZoomControls(_d.hormoneChartInstance, hormoneWrapper, hormoneInnerContainer, pointCount, 'hormone-chart');
    applyChartZoom(_d.medicationChartInstance, medicationWrapper, medInnerContainer, pointCount, 'medication-chart');
    applyChartZoom(_d.hormoneChartInstance, hormoneWrapper, hormoneInnerContainer, pointCount, 'hormone-chart');
}
