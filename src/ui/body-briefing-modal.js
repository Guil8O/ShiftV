/**
 * 📊 Body Briefing Modal Renderer
 * 
 * Body Briefing 모달의 요약/상세 탭 렌더링
 */

import { DoctorEngine } from '../doctor-module/core/doctor-engine.js';
import { translate, translateUI } from '../translations.js';

// ========================================
// 1. Body Briefing Modal 클래스
// ========================================

export class BodyBriefingModal {
  constructor(measurements, userSettings) {
    this.measurements = measurements;
    this.userSettings = userSettings;
    this.doctorEngine = new DoctorEngine(measurements, userSettings);
    this.modalContent = null; // 모달 컨텐츠 컨테이너 참조 저장
  }
  
  // ========================================
  // 2. 모달 열기
  // ========================================
  
  /**
   * Body Briefing 모달 열기
   */
  open() {
    const briefing = this.doctorEngine.generateHealthBriefing();
    
    // 모달 표시
    const template = document.getElementById('body-briefing-view');
    if (!template) {
      console.error('Body Briefing template not found!');
      return;
    }
    
    const modalOverlay = document.getElementById('modal-bottom-sheet-overlay');
    const modalSheet = document.getElementById('modal-bottom-sheet');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    
    if (!modalOverlay || !modalSheet || !modalTitle || !modalContent) {
      console.error('Modal elements not found!', { modalOverlay, modalSheet, modalTitle, modalContent });
      return;
    }
    
    // modalContent 참조 저장
    this.modalContent = modalContent;
    
    // 1. 먼저 템플릿 내용을 모달에 복사
    modalTitle.textContent = translate('comparisonModalTitle');
    modalContent.innerHTML = template.innerHTML;
    
    // 2. 모달 컨텐츠 번역 적용
    translateUI(modalContent);
    
    // 3. 이제 DOM 요소들이 존재하므로 렌더링
    this.render(briefing);
    
    // 4. 탭 전환 이벤트 설정
    this.setupTabSwitching();
    
    // 5. 모달 표시
    document.body.classList.add('modal-open');
    modalOverlay.classList.add('visible');
  }
  
  // ========================================
  // 3. 렌더링
  // ========================================
  
  /**
   * 전체 렌더링
   */
  render(briefing) {
    this.renderSummary(briefing);
    this.renderDetail(briefing);
  }
  
  /**
   * 요약 탭 렌더링
   */
  renderSummary(briefing) {
    // 전체 목표 달성률
    this.renderOverallProgress(briefing.summary.overallProgress);
    
    // 전체 신체 변화
    this.renderBodyChange(briefing.summary.overallBodyChange);
    
    // 목표 달성률 (부위별)
    this.renderTargetAchievement(briefing.targetAchievement);
    
    // 신체 비율 분석
    this.renderBodyRatios(briefing.bodyRatios);
    
    // 미래 예측
    this.renderPredictions(briefing.predictions);
    
    // 건강 경고 알림
    this.renderAlerts(briefing.alerts);
  }
  
  /**
   * 전체 목표 달성률 렌더링
   */
  renderOverallProgress(progress) {
    if (!this.modalContent) return;
    
    const bar = this.modalContent.querySelector('#briefing-overall-progress-bar');
    const percentage = this.modalContent.querySelector('#briefing-progress-percentage');
    const count = this.modalContent.querySelector('#briefing-progress-count');
    const weeklyChange = this.modalContent.querySelector('#briefing-weekly-change');
    const monthlyAvg = this.modalContent.querySelector('#briefing-monthly-avg');
    
    if (bar && progress) {
      const fill = bar.querySelector('.progress-fill');
      if (fill) {
        fill.style.width = `${progress.currentProgress}%`;
      }
      
      if (percentage) percentage.textContent = `${progress.currentProgress}%`;
      if (count) count.textContent = `(${progress.achievedCount}/${progress.totalCount} ${translate('target')})`;
      if (weeklyChange) weeklyChange.textContent = `${progress.weeklyChange}%`;
      if (monthlyAvg) monthlyAvg.textContent = `${progress.monthlyAvgChange}%`;
    }
  }
  
  /**
   * 전체 신체 변화 렌더링
   */
  renderBodyChange(bodyChange) {
    if (!this.modalContent) return;
    
    const bar = this.modalContent.querySelector('#briefing-body-change-bar');
    const score = this.modalContent.querySelector('#briefing-body-change-score');
    const label = this.modalContent.querySelector('#briefing-body-change-label');
    const prevWeek = this.modalContent.querySelector('#briefing-prev-week');
    const monthlyScore = this.modalContent.querySelector('#briefing-monthly-score');
    const targetScore = this.modalContent.querySelector('#briefing-target-score');
    
    if (bar && bodyChange) {
      const fill = bar.querySelector('.body-change-fill');
      if (fill) {
        fill.style.width = `${bodyChange.currentWeek}%`;
      }
      
      const mode = this.userSettings.mode || 'mtf';
      const direction = mode === 'mtf' ? translate('feminization') : (mode === 'ftm' ? translate('masculinization') : translate('balanced'));
      
      if (score) score.textContent = `${bodyChange.currentWeek.toFixed(1)}${translate('points')}`;
      if (label) label.textContent = `(${direction})`;
      if (prevWeek) prevWeek.textContent = `${bodyChange.previousWeek.toFixed(1)}${translate('points')}`;
      if (monthlyScore) monthlyScore.textContent = `${bodyChange.monthlyAvg.toFixed(1)}${translate('points')}`;
      if (targetScore) targetScore.textContent = `${bodyChange.target}${translate('points')}`;
    }
  }
  
  /**
   * 목표 달성률 (부위별) 렌더링 - 시작-전주-현재-목표 바 형태
   */
  renderTargetAchievement(targetAchievement) {
    const container = this.$('#briefing-target-achievement-list');
    if (!container || !targetAchievement) return;
    
    const items = Object.keys(targetAchievement).map(metric => {
      const achievement = targetAchievement[metric];
      if (!achievement) return null;
      
      // measurements에서 값 가져오기
      const initialValue = this.measurements.length > 0 ? this.measurements[0][metric] : null;
      const prevValue = this.measurements.length > 1 ? this.measurements[this.measurements.length - 2][metric] : null;
      const currentValue = this.measurements.length > 0 ? this.measurements[this.measurements.length - 1][metric] : null;
      const targetValue = this.userSettings.targets && this.userSettings.targets[metric] ? this.userSettings.targets[metric] : null;
      
      // 진행 바 HTML 생성
      const progressBarHTML = this.createProgressBarHTML({
        initialValue,
        prevValue,
        currentValue,
        targetValue,
        metric
      });
      
      // 상태 메시지
      const statusMessage = achievement.status === 'achieved' 
        ? `✅ ${translate('achieved')}` 
        : achievement.message || translate('inProgress');
      
      return `
        <div class="target-achievement-item">
          <div class="metric-name-row">
            <span class="metric-name">${this.getMetricName(metric)}</span>
            <span class="status-message">${statusMessage}</span>
          </div>
          ${progressBarHTML}
        </div>
      `;
    }).filter(Boolean);
    
    container.innerHTML = items.join('');
  }
  
  /**
   * 진행 바 HTML 생성 (시작-전주-현재-목표)
   */
  createProgressBarHTML(data) {
    const { initialValue, prevValue, currentValue, targetValue, metric } = data;
    
    // 값 배열 생성
    let values = [
      { key: 'initial', value: initialValue, text: translate('labelInitial') },
      { key: 'prev', value: prevValue, text: translate('labelPrev') },
      { key: 'current', value: currentValue, text: translate('labelCurrent') },
      { key: 'target', value: targetValue, text: translate('labelTarget') }
    ].filter(v => v.value !== null && !isNaN(v.value));
    
    if (values.length < 2 || (values.length > 0 && !values.find(v => v.key === 'current'))) {
      return '<div class="progress-bar-placeholder">-</div>';
    }
    
    // 동일 값 처리
    const TOLERANCE = 0.01;
    if (initialValue !== null && targetValue !== null && Math.abs(initialValue - targetValue) < TOLERANCE) {
      values = values.filter(v => v.key !== 'initial' && v.key !== 'target');
      values.push({ key: 'initialTarget', value: initialValue, text: translate('initialTargetSame') });
    }
    if (prevValue !== null && currentValue !== null && Math.abs(prevValue - currentValue) < TOLERANCE) {
      values = values.filter(v => v.key !== 'prev' && v.key !== 'current');
      values.push({ key: 'prevCurrent', value: currentValue, text: translate('prevCurrentSame'), isCurrent: true });
    }
    
    // 범위 계산
    const numericValues = values.map(v => v.value);
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const range = max - min;
    const padding = range === 0 ? 1 : range * 0.1;
    const displayMin = min - padding;
    const displayRange = (max + padding) - displayMin;
    
    if (displayRange === 0) return '<div class="progress-bar-placeholder">-</div>';
    const calcPercent = (val) => ((val - displayMin) / displayRange) * 100;
    
    // 위치 계산
    values.forEach(v => {
      v.pos = calcPercent(v.value);
      v.staggerClass = '';
    });
    values.sort((a, b) => a.pos - b.pos);
    
    // 라벨 겹침 처리
    for (let i = 1; i < values.length; i++) {
      const prev = values[i - 1];
      const curr = values[i];
      if (curr.pos - prev.pos < 15) {
        prev.staggerClass = 'stagger-left';
        curr.staggerClass = 'stagger-right';
      }
    }
    
    // 위치 계산
    const pCurrent = calcPercent(currentValue);
    const pInitial = initialValue !== null ? calcPercent(initialValue) : null;
    const pPrev = prevValue !== null ? calcPercent(prevValue) : null;
    const pTarget = targetValue !== null ? calcPercent(targetValue) : null;
    
    // 범위 바 생성
    const initialToCurrent = pInitial !== null ? `<div class="progress-bar-range range-initial" style="left: ${Math.min(pInitial, pCurrent)}%; width: ${Math.abs(pCurrent - pInitial)}%;"></div>` : '';
    const prevToCurrent = pPrev !== null ? `<div class="progress-bar-range range-prev" style="left: ${Math.min(pPrev, pCurrent)}%; width: ${Math.abs(pCurrent - pPrev)}%;"></div>` : '';
    const currentToTarget = pTarget !== null ? `<div class="progress-bar-range range-target" style="left: ${Math.min(pCurrent, pTarget)}%; width: ${Math.abs(pTarget - pCurrent)}%;"></div>` : '';
    
    // 라벨 생성
    const unit = metric ? this.getMetricUnit(metric) : '';
    const labelsHTML = values.map(v => {
      const isCurrentClass = v.key === 'current' || v.isCurrent ? 'current' : '';
      return `<div class="progress-bar-label ${isCurrentClass} ${v.staggerClass}" style="left: ${v.pos}%;">
        <span>${v.value}${unit}</span><br>${v.text}
      </div>`;
    }).join('');
    
    return `
      <div class="progress-bar-container">
        <div class="progress-bar-track"></div>
        ${initialToCurrent}
        ${prevToCurrent}
        ${currentToTarget}
        <div class="progress-bar-marker" style="left: ${pCurrent}%;"></div>
      </div>
      <div class="progress-bar-labels">${labelsHTML}</div>
    `;
  }
  
  /**
   * 신체 비율 분석 렌더링 - E/T ratio처럼 남자-여자 바 형태
   */
  renderBodyRatios(bodyRatios) {
    const container = this.$('#briefing-body-ratio-container');
    if (!container || !bodyRatios) return;
    
    const items = [];
    
    // WHR
    if (bodyRatios.whr) {
      const ratio = bodyRatios.whr;
      const position = ratio.position !== undefined ? ratio.position : this.calculateRatioPosition(ratio.value, 'whr');
      const malePercent = ratio.percentiles?.male?.text || this.calculatePercentile(ratio.value, 'whr', 'male');
      const femalePercent = ratio.percentiles?.female?.text || this.calculatePercentile(ratio.value, 'whr', 'female');
      
      items.push(this.renderRatioBar('whr', ratio.value, position, malePercent, femalePercent, ratio.evaluation));
    }
    
    // Shoulder-Waist Ratio
    if (bodyRatios.shoulderWaist) {
      const ratio = bodyRatios.shoulderWaist;
      const position = ratio.position !== undefined ? ratio.position : this.calculateRatioPosition(ratio.value, 'shoulderWaist');
      const malePercent = ratio.percentiles?.male?.text || this.calculatePercentile(ratio.value, 'shoulderWaist', 'male');
      const femalePercent = ratio.percentiles?.female?.text || this.calculatePercentile(ratio.value, 'shoulderWaist', 'female');
      
      items.push(this.renderRatioBar('shoulderWaist', ratio.value, position, malePercent, femalePercent, ratio.evaluation));
    }
    
    // Chest-Waist Ratio
    if (bodyRatios.chestWaist) {
      const ratio = bodyRatios.chestWaist;
      const position = ratio.position !== undefined ? ratio.position : this.calculateRatioPosition(ratio.value, 'chestWaist');
      const malePercent = ratio.percentiles?.male?.text || this.calculatePercentile(ratio.value, 'chestWaist', 'male');
      const femalePercent = ratio.percentiles?.female?.text || this.calculatePercentile(ratio.value, 'chestWaist', 'female');
      
      items.push(this.renderRatioBar('chestWaist', ratio.value, position, malePercent, femalePercent, ratio.evaluation));
    }
    
    container.innerHTML = items.join('');
  }
  
  /**
   * 비율 바 렌더링 (남자-여자 바 형태, 1열로 길게)
   */
  renderRatioBar(ratioType, value, position, malePercent, femalePercent, evaluation) {
    const ratioName = {
      whr: translate('ratioWHR'),
      shoulderWaist: translate('ratioShoulderWaist'),
      chestWaist: translate('ratioChestWaist')
    }[ratioType] || ratioType;
    
    return `
      <div class="body-ratio-item body-ratio-item-fullwidth">
        <div class="ratio-header">
          <div class="ratio-name">${ratioName}</div>
          <div class="ratio-value-display">
            <span class="ratio-number">${value}</span>
          </div>
        </div>
        <div class="ratio-bar-container">
          <div class="ratio-icon-group">
            <span class="ratio-icon male">♂</span>
            <span class="ratio-percentile">${malePercent}</span>
          </div>
          <div class="ratio-bar">
            <div class="ratio-bar-fill" style="width: ${position}%;"></div>
            <div class="ratio-bar-marker" style="left: ${position}%;"></div>
          </div>
          <div class="ratio-icon-group">
            <span class="ratio-icon female">♀</span>
            <span class="ratio-percentile">${femalePercent}</span>
          </div>
        </div>
        ${evaluation ? `<div class="ratio-evaluation">${evaluation}</div>` : ''}
      </div>
    `;
  }
  
  /**
   * 비율 위치 계산 (0-100%)
   */
  calculateRatioPosition(value, type) {
    // 기본 범위 설정 (실제로는 health-evaluator에서 계산해야 함)
    if (type === 'whr') {
      // WHR: 남성형(0.95) ~ 여성형(0.70)
      const min = 0.70;
      const max = 0.95;
      const position = ((value - min) / (max - min)) * 100;
      return Math.max(0, Math.min(100, 100 - position)); // 반대로 (여성=오른쪽)
    } else if (type === 'shoulderWaist') {
      // Shoulder-Waist: 여성형(1.25) ~ 남성형(1.45)
      const min = 1.25;
      const max = 1.45;
      const position = ((value - min) / (max - min)) * 100;
      return Math.max(0, Math.min(100, position)); // 남성형=오른쪽
    } else if (type === 'chestWaist') {
      // Chest-Waist: 여성형(1.0) ~ 남성형(1.3)
      const min = 1.0;
      const max = 1.3;
      const position = ((value - min) / (max - min)) * 100;
      return Math.max(0, Math.min(100, position)); // 남성형=오른쪽
    }
    return 50; // 기본값
  }
  
  /**
   * 백분률 계산 - 상위%로 고정
   */
  calculatePercentile(value, type, gender) {
    // 정확한 백분위 범위 (의학/통계 자료 기반)
    const stats = {
      whr: {
        female: { 
          p1: 0.60, p5: 0.65, p10: 0.67, p25: 0.70, p50: 0.75, p75: 0.80, p90: 0.85, p95: 0.90, p99: 0.95 
        },
        male: { 
          p1: 0.80, p5: 0.85, p10: 0.88, p25: 0.90, p50: 0.95, p75: 1.00, p90: 1.05, p95: 1.10, p99: 1.15 
        }
      },
      shoulderWaist: {
        female: { 
          p1: 1.10, p5: 1.15, p10: 1.18, p25: 1.20, p50: 1.25, p75: 1.30, p90: 1.35, p95: 1.40, p99: 1.45 
        },
        male: { 
          p1: 1.30, p5: 1.35, p10: 1.38, p25: 1.40, p50: 1.45, p75: 1.50, p90: 1.55, p95: 1.60, p99: 1.65 
        }
      },
      chestWaist: {
        female: { 
          p1: 0.90, p5: 0.95, p10: 0.98, p25: 1.00, p50: 1.05, p75: 1.10, p90: 1.15, p95: 1.20, p99: 1.25 
        },
        male: { 
          p1: 1.10, p5: 1.15, p10: 1.18, p25: 1.20, p50: 1.25, p75: 1.30, p90: 1.35, p95: 1.40, p99: 1.45 
        }
      }
    };
    
    const data = stats[type]?.[gender];
    if (!data) return '상위 50%';
    
    // 상위% 계산 (값이 낮을수록 상위%)
    let percentile = 50; // 기본값
    
    if (value <= data.p1) percentile = 99;
    else if (value <= data.p5) percentile = 95;
    else if (value <= data.p10) percentile = 90;
    else if (value <= data.p25) percentile = 75;
    else if (value <= data.p50) percentile = 50;
    else if (value <= data.p75) percentile = 25;
    else if (value <= data.p90) percentile = 10;
    else if (value <= data.p95) percentile = 5;
    else percentile = 1;
    
    // WHR의 경우 값이 낮을수록 여성형이므로 상위%로 표시
    // Shoulder-Waist, Chest-Waist의 경우 값이 높을수록 남성형이므로 반대로 계산
    if (type === 'shoulderWaist' || type === 'chestWaist') {
      percentile = 100 - percentile;
    }
    
    return `상위 ${percentile}%`;
  }
  
  /**
   * 미래 예측 렌더링 - 현재 수치 변화, 월평균 변화량, 전주 변화량 표시
   */
  renderPredictions(predictions) {
    const container = this.$('#briefing-predictions-container');
    if (!container || !predictions) return;
    
    const items = Object.keys(predictions).map(metric => {
      const prediction = predictions[metric];
      if (!prediction) return null;
      
      // 현재 수치
      const currentValue = prediction.current || this.getCurrentValue(metric);
      
      // 예측 수치
      const predictedValue = prediction.predicted || prediction.predictedValue;
      
      // 변화량 계산
      const change = predictedValue && currentValue ? (parseFloat(predictedValue) - parseFloat(currentValue)).toFixed(2) : null;
      const changeSign = change && parseFloat(change) > 0 ? '+' : '';
      
      // 월평균 변화량 (월평균 기반 예측)
      const monthlyChange = prediction.monthlyAvgChange || this.calculateMonthlyChange(metric);
      
      // 전주 변화량
      const weeklyChange = prediction.weeklyChange || this.calculateWeeklyChange(metric);
      
      // 목표 달성률 계산 (현재값에서 목표값까지의 진행률)
      const targetValue = this.userSettings.targets && this.userSettings.targets[metric] ? this.userSettings.targets[metric] : null;
      let targetProgress = null;
      
      if (targetValue && currentValue) {
        const current = parseFloat(currentValue);
        const target = parseFloat(targetValue);
        const initial = this.measurements.length > 0 ? parseFloat(this.measurements[0][metric]) : current;
        
        if (initial !== null && !isNaN(initial)) {
          // 목표까지의 진행률 계산
          const totalChange = Math.abs(target - initial);
          const currentChange = Math.abs(current - initial);
          if (totalChange > 0) {
            targetProgress = Math.min(100, Math.max(0, (currentChange / totalChange) * 100));
          }
        }
      }
      
      return `
        <div class="prediction-item">
          <div class="prediction-left">
            <div class="prediction-metric-name">${this.getMetricName(metric)}</div>
            <div class="prediction-main">
              <span class="current-value">${currentValue} ${this.getMetricUnit(metric)}</span>
              ${predictedValue ? `<span class="prediction-arrow">→</span><span class="prediction-value">${predictedValue} ${this.getMetricUnit(metric)}</span>` : ''}
            </div>
            ${targetProgress !== null ? `
              <div class="prediction-progress">
                <div class="prediction-progress-label">${translate('labelTarget')} ${targetProgress.toFixed(0)}%</div>
                <div class="prediction-progress-bar">
                  <div class="prediction-progress-fill" style="width: ${targetProgress}%"></div>
                </div>
              </div>
            ` : ''}
          </div>
          <div class="prediction-right">
            <div class="change-item">
              <span class="change-label">${translate('briefingMonthlyAvg')}</span>
              <span class="change-value ${monthlyChange && parseFloat(monthlyChange) > 0 ? 'positive' : monthlyChange && parseFloat(monthlyChange) < 0 ? 'negative' : ''}">${monthlyChange ? `${parseFloat(monthlyChange) > 0 ? '+' : ''}${monthlyChange} ${this.getMetricUnit(metric)}` : '-0.00 ${this.getMetricUnit(metric)}'}</span>
            </div>
            <div class="change-item">
              <span class="change-label">${translate('briefingPreviousWeek')}</span>
              <span class="change-value ${weeklyChange && parseFloat(weeklyChange) > 0 ? 'positive' : weeklyChange && parseFloat(weeklyChange) < 0 ? 'negative' : ''}">${weeklyChange ? `${parseFloat(weeklyChange) > 0 ? '+' : ''}${weeklyChange} ${this.getMetricUnit(metric)}` : '-'}</span>
            </div>
          </div>
        </div>
      `;
    }).filter(Boolean);
    
    container.innerHTML = items.length > 0 ? items.join('') : `<p>${translate('noPredictionData')}</p>`;
  }
  
  /**
   * 현재 값 가져오기
   */
  getCurrentValue(metric) {
    if (this.measurements.length === 0) return '-';
    const latest = this.measurements[this.measurements.length - 1];
    return latest[metric] !== null && latest[metric] !== undefined ? latest[metric] : '-';
  }
  
  /**
   * 월평균 변화량 계산
   */
  calculateMonthlyChange(metric) {
    if (this.measurements.length < 4) return null; // 최소 4주 데이터 필요
    
    // 최근 4주 데이터
    const recentData = this.measurements.slice(-4).map(m => m[metric]).filter(v => v !== null && v !== undefined);
    if (recentData.length < 2) return null;
    
    // 선형 회귀로 월평균 변화량 계산
    const n = recentData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    recentData.forEach((y, x) => {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const monthlyChange = slope * 4; // 4주 = 1개월
    
    return monthlyChange.toFixed(2);
  }
  
  /**
   * 전주 변화량 계산
   */
  calculateWeeklyChange(metric) {
    if (this.measurements.length < 2) return null;
    
    const latest = this.measurements[this.measurements.length - 1];
    const previous = this.measurements[this.measurements.length - 2];
    
    if (latest[metric] === null || latest[metric] === undefined || 
        previous[metric] === null || previous[metric] === undefined) {
      return null;
    }
    
    const change = parseFloat(latest[metric]) - parseFloat(previous[metric]);
    return change.toFixed(2);
  }
  
  /**
   * 건강 경고 알림 렌더링
   */
  renderAlerts(alerts) {
    const container = this.$('#briefing-alerts-container');
    if (!container) return;
    
    if (!alerts || alerts.length === 0) {
      container.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">${translate('noAlerts')}</p>`;
      return;
    }
    
    const items = alerts.map(alert => {
      const level = alert.level || 'info';
      const icon = level === 'critical' ? '🚨' : (level === 'warning' ? '⚠️' : 'ℹ️');
      
      return `
        <div class="alert-item ${level}">
          <div class="alert-icon">${icon}</div>
          <div class="alert-content">
            <div class="alert-title">${alert.title || ''}</div>
            <div class="alert-description">${alert.description || ''}</div>
            ${alert.action ? `<div class="alert-action" style="margin-top: 8px; font-weight: 600;">${alert.action}</div>` : ''}
          </div>
        </div>
      `;
    });
    
    container.innerHTML = items.join('');
  }
  
  /**
   * 상세 탭 렌더링 (그래프 포함)
   */
  renderDetail(briefing) {
    // 필터 컨트롤 설정
    this.setupDetailFilters();
    
    // 그래프 렌더링 (약간의 지연 후 실행하여 DOM이 준비되도록)
    setTimeout(() => {
      this.renderDetailChart();
    }, 100);
  }
  
  /**
   * 상세 탭 그래프 렌더링
   */
  renderDetailChart() {
    const canvas = this.$('#briefing-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Chart.js가 로드되어 있는지 확인
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js is not loaded');
      return;
    }
    
    // 기존 차트 인스턴스 제거
    if (this.detailChartInstance) {
      this.detailChartInstance.destroy();
      this.detailChartInstance = null;
    }
    
    if (this.measurements.length < 1) return;
    
    // 필터 키 목록 (기본적으로 모든 측정 항목)
    const filterKeys = ['weight', 'waist', 'hips', 'chest', 'shoulder', 'thigh', 'arm', 'muscleMass', 'bodyFatPercentage'];
    
    const labels = this.measurements.map(m => `${m.week}주차`);
    
    // 데이터셋 생성
    const datasets = filterKeys.map((filterKey, index) => {
      const colors = [
        'hsl(330, 70%, 60%)', // weight
        'hsl(280, 70%, 60%)', // waist
        'hsl(240, 70%, 60%)', // hips
        'hsl(200, 70%, 60%)', // chest
        'hsl(160, 70%, 60%)', // shoulder
        'hsl(120, 70%, 60%)', // thigh
        'hsl(80, 70%, 60%)',  // arm
        'hsl(40, 70%, 60%)',  // muscleMass
        'hsl(0, 70%, 60%)'    // bodyFatPercentage
      ];
      
      const metricColor = colors[index % colors.length];
      
      return {
        label: this.getMetricName(filterKey),
        data: this.measurements.map(m => m[filterKey] ?? null),
        borderColor: metricColor,
        backgroundColor: metricColor + '33',
        tension: 0.1,
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: true
      };
    });
    
    // 라이트/다크 모드 스타일 설정
    const isLightMode = document.body.classList.contains('light-mode');
    const tickColor = isLightMode ? '#5c5c8a' : 'rgba(255, 255, 255, 0.6)';
    const gridColor = isLightMode ? 'rgba(200, 200, 235, 0.5)' : 'rgba(255, 255, 255, 0.1)';
    
    // 차트 생성
    this.detailChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: tickColor,
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            ticks: {
              color: tickColor,
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              color: gridColor
            }
          },
          y: {
            ticks: {
              color: tickColor
            },
            grid: {
              color: gridColor
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  }
  
  // ========================================
  // 4. 이벤트 설정
  // ========================================
  
  /**
   * 탭 전환 설정
   */
  setupTabSwitching() {
    if (!this.modalContent) {
      console.error('Modal content not found!');
      return;
    }
    
    const tabButtons = this.modalContent.querySelectorAll('[data-tab^="briefing-"]');
    const tabViews = this.modalContent.querySelectorAll('#briefing-summary-view, #briefing-detail-view');
    
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // 버튼 활성화
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 뷰 전환
        tabViews.forEach(view => view.classList.remove('active'));
        const targetView = this.modalContent.querySelector(`#${tab}-view`);
        if (targetView) {
          targetView.classList.add('active');
        }
      });
    });
  }
  
  /**
   * 상세 탭 필터 설정
   */
  setupDetailFilters() {
    // 기존 필터 로직과 통합 필요
  }
  
  // ========================================
  // 5. 유틸리티
  // ========================================
  
  /**
   * modalContent 내부에서 요소 찾기 (헬퍼)
   */
  $(selector) {
    return this.modalContent ? this.modalContent.querySelector(selector) : null;
  }
  
  getMetricName(metric) {
    const names = {
      weight: translate('metricWeight'),
      waist: translate('metricWaist'),
      hips: translate('metricHips'),
      chest: translate('metricChest'),
      shoulder: translate('metricShoulder'),
      thigh: translate('metricThigh'),
      arm: translate('metricArm'),
      muscleMass: translate('metricMuscleMass'),
      bodyFatPercentage: translate('metricBodyFatPercentage'),
      estrogenLevel: translate('estrogenLevel'),
      testosteroneLevel: translate('testosteroneLevel')
    };
    return names[metric] || metric;
  }
  
  getMetricUnit(metric) {
    const units = {
      weight: 'kg',
      waist: 'cm',
      hips: 'cm',
      chest: 'cm',
      shoulder: 'cm',
      thigh: 'cm',
      arm: 'cm',
      muscleMass: 'kg',
      bodyFatPercentage: '%',
      estrogenLevel: 'pg/mL',
      testosteroneLevel: 'ng/dL'
    };
    return units[metric] || '';
  }
}

// ========================================
// 6. Export
// ========================================

export default BodyBriefingModal;
