/**
 * Body Briefing Modal Renderer
 * 
 * Body Briefing 모달의 요약/상세 탭 렌더링
 */

import { DoctorEngine } from '../../doctor-module/core/doctor-engine.js';
import { translate, translateUI, getCurrentLanguage } from '../../translations.js';
import { SYMPTOM_DATABASE } from '../../doctor-module/data/symptom-database.js';
import { MEDICATION_DATABASE, getAllMedications } from '../../doctor-module/data/medication-database.js';

const ensureAverageLinePluginRegistered = () => {
  if (typeof Chart === 'undefined') return;
  const pluginId = 'shiftvAverageLines';
  const alreadyRegistered = Chart?.registry?.plugins?.get?.(pluginId);
  if (alreadyRegistered) return;

  Chart.register({
    id: pluginId,
    afterDatasetsDraw(chart) {
      const yScale = Object.values(chart.scales || {}).find(s => s?.axis === 'y') || chart.scales?.y;
      if (!yScale) return;
      const { ctx, chartArea } = chart;
      if (!ctx || !chartArea) return;

      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (!meta || !chart.isDatasetVisible(datasetIndex)) return;

        const targetValue = Number(dataset?._targetValue);
        if (!Number.isFinite(targetValue)) return;
        const y = yScale.getPixelForValue(targetValue);
        if (!Number.isFinite(y)) return;

        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = dataset.borderColor || 'rgba(255,255,255,0.6)';
        ctx.globalAlpha = 0.6;

        ctx.beginPath();
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();

        ctx.restore();
      });
    }
  });
};

// ========================================
// 1. Body Briefing Modal 클래스
// ========================================

export class BodyBriefingModal {
  constructor(measurements, userSettings) {
    this.measurements = measurements;
    this.userSettings = userSettings;
    this.doctorEngine = new DoctorEngine(measurements, userSettings);
    this.modalContent = null; // 모달 컨텐츠 컨테이너 참조 저장
    this._isDetailLegendBound = false;
    this._selectedWeekIndex = null;
    this._symptomLabelById = null;
    this._medicationLabelById = null;
    this._detailZoomLevel = 0;
    this._detailZoomBound = false;
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
    this.renderBodySilhouette();
    this.renderRadarChart(briefing);
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

    // 안전 평가 (SafetyEngine)
    this.renderSafetyAssessment(briefing.safetyAssessment);
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
    
    const preferredOrder = [
      'height', 'weight', 'shoulder', 'neck', 'chest', 'underBustCircumference', 'waist', 'hips', 'thigh', 'calf', 'arm',
      'muscleMass', 'bodyFatPercentage', 'estrogenLevel', 'testosteroneLevel', 'libido',
      'menstruationActive', 'menstruationPain'
    ];
    const rank = new Map(preferredOrder.map((k, i) => [k, i]));
    const metrics = Object.keys(targetAchievement).sort((a, b) => {
      const ra = rank.has(a) ? rank.get(a) : 9999;
      const rb = rank.has(b) ? rank.get(b) : 9999;
      if (ra !== rb) return ra - rb;
      return String(a).localeCompare(String(b));
    });

    const items = metrics.map(metric => {
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
      let statusMessage;
      if (achievement.status === 'achieved') {
        statusMessage = achievement.message ? translate(achievement.message) : `<span class="material-symbols-outlined mi-inline mi-sm mi-success">check_circle</span> ${translate('achieved')}`;
      } else {
        const params = {};
        if (achievement.weeksRemaining !== undefined) {
          params.weeks = achievement.weeksRemaining;
          params.weeksLeft = achievement.weeksRemaining;
          params.months = Math.ceil(achievement.weeksRemaining / 4);
        }
        statusMessage = achievement.message ? translate(achievement.message, params) : translate('inProgress');
      }
      
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
   * 진행 바 HTML 생성 (상하 분산 배치 및 충돌 방지)
   */
  createProgressBarHTML(data) {
    const { initialValue, prevValue, currentValue, targetValue, metric } = data;
    
    // 1. 데이터 그룹화 (Top: Current, Prev / Bottom: Initial, Target)
    const topItems = [
      { key: 'current', value: currentValue, text: translate('labelCurrent'), isCurrent: true, group: 'top' },
      { key: 'prev', value: prevValue, text: translate('labelPrev'), group: 'top' }
    ].filter(v => v.value !== null && !isNaN(v.value));

    const bottomItems = [
      { key: 'initial', value: initialValue, text: translate('labelInitial'), group: 'bottom' },
      { key: 'target', value: targetValue, text: translate('labelTarget'), group: 'bottom' }
    ].filter(v => v.value !== null && !isNaN(v.value));

    const allValues = [...topItems, ...bottomItems];
    
    if (allValues.length < 2) {
      return '<div class="progress-bar-placeholder">-</div>';
    }
    
    // 2. 범위 계산
    const numericValues = allValues.map(v => v.value);
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const range = max - min;
    const padding = range === 0 ? 1 : range * 0.1;
    const displayMin = min - padding;
    const displayRange = (max + padding) - displayMin;
    
    if (displayRange === 0) return '<div class="progress-bar-placeholder">-</div>';
    const calcPercent = (val) => ((val - displayMin) / displayRange) * 100;
    
    // 3. 포지션 계산
    allValues.forEach(v => v.pos = calcPercent(v.value));
    
    // 4. 충돌 감지 (그룹별)
    const ITEM_WIDTH_PERCENT = 18; // 예상 너비
    
    const calculateLevels = (items) => {
      items.sort((a, b) => a.pos - b.pos);
      const levels = [];
      items.forEach(item => {
        let level = 0;
        const startPos = item.pos - (ITEM_WIDTH_PERCENT / 2);
        while (true) {
          if (levels[level] === undefined || levels[level] + 2 < startPos) {
            break;
          }
          level++;
        }
        item.level = level;
        levels[level] = item.pos + (ITEM_WIDTH_PERCENT / 2);
      });
      return items.length > 0 ? Math.max(...items.map(i => i.level)) : 0;
    };

    const maxLevelTop = calculateLevels(topItems);
    const maxLevelBottom = calculateLevels(bottomItems);
    
    // 5. 높이 및 레이아웃 계산
    const WRAPPER_HEIGHT = 140; // 고정 높이 (상하 여유)
    const TRACK_Y_CENTER = WRAPPER_HEIGHT / 2; // 중앙 (70px)
    
    // 6. SVG 지시선 생성
    const svgLines = allValues.map(v => {
      // 레벨이 0이면(가장 가까우면) 지시선 생략
      if (v.level === 0) return '';
      
      const x = v.pos;
      let y1, y2;
      
      if (v.group === 'top') {
        // Top: 라벨 밑(y1) -> 트랙 위(y2)
        // Level 1: margin-bottom 55px. Label Height ~40px. 
        // Label Bottom Y = Center(70) - 55 = 15.
        // Track Top Y = Center(70) - 5 = 65.
        y1 = TRACK_Y_CENTER - 55; 
        y2 = TRACK_Y_CENTER - 10;
      } else {
        // Bottom: 라벨 위(y1) -> 트랙 아래(y2)
        // Level 1 (if exists, but user said fixed 12px for bottom, assuming level 0 mostly)
        // Let's assume standard logic applies if needed
        const marginBottom = 15 + (v.level * 40); // Not used for bottom fixed
        // But for Bottom, margin-top: 15px.
        // Label Top Y = Center(70) + 15 = 85.
        // Track Bottom Y = Center(70) + 10 = 80.
        // No line needed for Level 0 Bottom.
        return ''; 
      }
      
      return `<line x1="${x}%" y1="${y1}" x2="${x}%" y2="${y2}" 
              stroke="var(--glass-border)" stroke-width="1" stroke-dasharray="3,3" />`;
    }).join('');
    
    // 7. 라벨 HTML 생성
    const unit = metric ? this.getMetricUnit(metric) : '';
    const labelsHTML = allValues.map(v => {
      const isCurrentClass = v.isCurrent ? 'current' : '';
      let style = `left: ${v.pos}%;`;
      
      if (v.group === 'top') {
        // Top Label Style
        if (v.level > 0) {
           style += `bottom: calc(50% + 55px) !important;`; // 겹침 발생 시 높이 띄움 (중앙 기준)
        } else {
           style += `bottom: calc(50% + 15px);`; // 기본 높이 (중앙 기준)
        }
      } else {
        // Bottom Label Style
        style += `top: calc(50% + 15px);`; // 고정 (중앙 기준)
      }
      
      return `
        <div class="progress-bar-label ${isCurrentClass} ${v.group}-label" style="${style}">
          <span class="label">${v.text}</span>
          <span class="value">${v.value}${unit}</span>
        </div>
      `;
    }).join('');
    
    // 8. 트랙 및 범위 바
    const pCurrent = calcPercent(currentValue);
    const pInitial = initialValue !== null ? calcPercent(initialValue) : null;
    const pPrev = prevValue !== null ? calcPercent(prevValue) : null;
    const pTarget = targetValue !== null ? calcPercent(targetValue) : null;
    
    const initialToCurrent = pInitial !== null ? `<div class="progress-bar-range range-initial" style="left: ${Math.min(pInitial, pCurrent)}%; width: ${Math.abs(pCurrent - pInitial)}%;"></div>` : '';
    const prevToCurrent = pPrev !== null ? `<div class="progress-bar-range range-prev" style="left: ${Math.min(pPrev, pCurrent)}%; width: ${Math.abs(pCurrent - pPrev)}%;"></div>` : '';
    const currentToTarget = pTarget !== null ? `<div class="progress-bar-range range-target" style="left: ${Math.min(pCurrent, pTarget)}%; width: ${Math.abs(pTarget - pCurrent)}%;"></div>` : '';
    
    return `
      <div class="progress-bar-wrapper" style="height: ${WRAPPER_HEIGHT}px;">
        <svg class="leader-lines-svg" style="width: 100%; height: 100%;">
          ${svgLines}
        </svg>
        
        <div class="labels-container">
          ${labelsHTML}
        </div>
        
        <div class="progress-bar-track-container">
          <div class="progress-bar-track"></div>
          ${initialToCurrent}
          ${prevToCurrent}
          ${currentToTarget}
          <div class="progress-bar-marker" style="left: ${pCurrent}%;"></div>
        </div>
      </div>
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
            <span class="ratio-icon male"><span class="material-symbols-outlined mi-inline mi-sm">male</span></span>
            <span class="ratio-percentile">${malePercent}</span>
          </div>
          <div class="ratio-bar">
            <div class="ratio-bar-fill" style="width: ${position}%;"></div>
            <div class="ratio-bar-marker" style="left: ${position}%;"></div>
          </div>
          <div class="ratio-icon-group">
            <span class="ratio-icon female"><span class="material-symbols-outlined mi-inline mi-sm">female</span></span>
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
    if (!data) return translate('percentileRank', { value: 50 });
    
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
    
    return translate('percentileRank', { value: percentile });
  }
  
  /**
   * 미래 예측 렌더링 - 현재 수치 변화, 월평균 변화량, 전주 변화량 표시
   */
  renderPredictions(predictions) {
    const container = this.$('#briefing-predictions-container');
    if (!container || !predictions) return;

    const preferredOrder = [
      'height', 'weight', 'shoulder', 'neck', 'chest', 'underBustCircumference', 'waist', 'hips', 'thigh', 'calf', 'arm',
      'muscleMass', 'bodyFatPercentage', 'estrogenLevel', 'testosteroneLevel', 'libido', 'menstruationPain'
    ];
    const rank = new Map(preferredOrder.map((k, i) => [k, i]));
    const metrics = Object.keys(predictions).sort((a, b) => {
      const ra = rank.has(a) ? rank.get(a) : 9999;
      const rb = rank.has(b) ? rank.get(b) : 9999;
      if (ra !== rb) return ra - rb;
      return String(a).localeCompare(String(b));
    });

    const items = metrics.map(metric => {
      const prediction = predictions[metric];
      if (!prediction) return null;
      const unit = this.getMetricUnit(metric);
      
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
      const weeklyChangeText = weeklyChange
        ? `${parseFloat(weeklyChange) > 0 ? '+' : ''}${weeklyChange} ${unit}`
        : '-';
      
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

      const monthlyChangeText = monthlyChange
        ? `${parseFloat(monthlyChange) > 0 ? '+' : ''}${monthlyChange} ${unit}`
        : `-0.00 ${unit}`;
      const predictedValueText = predictedValue ? `${predictedValue} ${unit}` : '-';
      
      return `
        <div class="prediction-item" tabindex="0">
          <!-- Main Column (Left on Desktop, Top on Mobile) -->
          <div class="prediction-main-col">
            <div class="prediction-metric-name">${this.getMetricName(metric)}</div>
            
            <div class="prediction-values-container">
              <div class="prediction-value-item current">
                <span class="prediction-label">${translate('labelCurrent')}:</span>
                <span class="prediction-value-text">${currentValue} ${unit}</span>
              </div>
              <div class="prediction-value-item predicted">
                <span class="prediction-label">${translate('predictedNextWeek')}:</span>
                <span class="prediction-value-text highlight">${predictedValueText}</span>
              </div>
            </div>

            ${targetProgress !== null ? `
              <div class="prediction-progress-container">
                <div class="prediction-progress-bar">
                  <div class="prediction-progress-fill" style="width: ${targetProgress}%"></div>
                  <span class="prediction-progress-text">${translate('labelTarget')} ${targetProgress.toFixed(0)}%</span>
                </div>
              </div>
            ` : '<div class="prediction-progress-placeholder"></div>'}
          </div>

          <!-- Divider (Vertical on Desktop, Horizontal on Mobile) -->
          <div class="prediction-divider"></div>

          <!-- Stats Column (Right on Desktop, Bottom on Mobile) -->
          <div class="prediction-stats-col">
            <div class="prediction-stat-item monthly">
              <span class="prediction-stat-label">${translate('briefingMonthlyAvg')}</span>
              <span class="prediction-stat-value ${monthlyChange && parseFloat(monthlyChange) > 0 ? 'positive' : monthlyChange && parseFloat(monthlyChange) < 0 ? 'negative' : ''}">${monthlyChangeText}</span>
            </div>
            
            <div class="prediction-stat-divider"></div>
            
            <div class="prediction-stat-item weekly">
              <span class="prediction-stat-label">${translate('briefingPreviousWeek')}</span>
              <span class="prediction-stat-value ${weeklyChange && parseFloat(weeklyChange) > 0 ? 'positive' : weeklyChange && parseFloat(weeklyChange) < 0 ? 'negative' : ''}">${weeklyChangeText}</span>
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
      const icon = level === 'critical' ? '<span class="material-symbols-outlined mi-sm mi-error">emergency</span>' : (level === 'warning' ? '<span class="material-symbols-outlined mi-sm mi-warning">warning</span>' : '<span class="material-symbols-outlined mi-sm mi-on-surface">info</span>');
      
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
   * 안전 평가 렌더링 (SafetyEngine 결과)
   * @param {Object} safetyAssessment - SafetyEngine.runSafetyAssessment() 결과
   */
  renderSafetyAssessment(safetyAssessment) {
    const section = this.$('#briefing-safety-section');
    if (!section) return;

    if (!safetyAssessment) {
      section.style.display = 'none';
      return;
    }

    const { alerts, domainScores, recommendedTests, educationPoints, disclaimer, confidence } = safetyAssessment;

    // 의미 있는 점수가 하나라도 있는지 확인
    const hasData = alerts.length > 0 || Object.values(domainScores || {}).some(s => s > 0);
    if (!hasData) {
      section.style.display = 'none';
      return;
    }
    section.style.display = '';

    const lang = (typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : null) || 'ko';

    // ─ 도메인 점수 바 ──────────────────────────────────────
    const scoresEl = this.$('#briefing-safety-scores');
    if (scoresEl && domainScores) {
      const DOMAIN_LABELS_LOCAL = {
        vte:            { ko: '혈전/색전', en: 'VTE', ja: '血栓' },
        hyperkalemia:   { ko: '고칼륨혈증', en: 'High K⁺', ja: '高K⁺' },
        polycythemia:   { ko: '적혈구증가증', en: 'Polycythemia', ja: '赤血球増多' },
        hepatotoxicity: { ko: '간독성', en: 'Liver', ja: '肝毒性' },
        metabolic:      { ko: '대사 위험', en: 'Metabolic', ja: '代謝' },
        psychiatric:    { ko: '정신건강', en: 'Mental', ja: 'メンタル' },
        meningioma:     { ko: '수막종(CPA)', en: 'Meningioma', ja: '髄膜腫' },
        sleep_apnea:    { ko: '수면무호흡', en: 'Sleep Apnea', ja: '睡眠無呼吸' },
      };

      const bars = Object.entries(domainScores)
        .filter(([, score]) => score > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([domain, score]) => {
          const label = DOMAIN_LABELS_LOCAL[domain]?.[lang] || DOMAIN_LABELS_LOCAL[domain]?.ko || domain;
          const colorClass = score >= 65 ? 'safety-bar-critical' : score >= 30 ? 'safety-bar-warning' : 'safety-bar-info';
          return `
            <div class="safety-score-row">
              <span class="safety-score-label">${label}</span>
              <div class="safety-score-track">
                <div class="safety-score-fill ${colorClass}" style="width: ${Math.min(score, 100)}%"></div>
              </div>
              <span class="safety-score-number">${score}</span>
            </div>
          `;
        });

      scoresEl.innerHTML = bars.length > 0
        ? `<div class="safety-scores-inner">${bars.join('')}</div>`
        : '';
    }

    // ─ 안전 알림 목록 ──────────────────────────────────────
    const alertsEl = this.$('#briefing-safety-alerts');
    if (alertsEl) {
      const alertItems = alerts.map(alert => {
        const levelIcon = alert.level === 'critical'
          ? '<span class="material-symbols-outlined mi-sm mi-error">emergency</span>'
          : alert.level === 'warning'
          ? '<span class="material-symbols-outlined mi-sm mi-warning">warning</span>'
          : '<span class="material-symbols-outlined mi-sm mi-on-surface">info</span>';

        const triggeredMedTags = (alert.triggeredMeds || [])
          .map(m => `<span class="safety-tag safety-tag-med">${m.replace(/_/g, ' ')}</span>`)
          .join('');
        const triggeredSymTags = (alert.triggeredSymptoms || [])
          .map(s => `<span class="safety-tag safety-tag-sym">${s.replace(/_/g, ' ')}</span>`)
          .join('');

        return `
          <div class="alert-item ${alert.level} safety-alert-item">
            <div class="alert-icon">${levelIcon}</div>
            <div class="alert-content">
              <div class="alert-title">${alert.title || ''}</div>
              <div class="alert-description">${alert.message || ''}</div>
              ${triggeredMedTags || triggeredSymTags ? `
                <div class="safety-tags-row" style="margin-top: 6px; display:flex; flex-wrap:wrap; gap:4px;">
                  ${triggeredMedTags}${triggeredSymTags}
                </div>` : ''}
              <div class="safety-not-diagnosis" style="margin-top: 4px; font-size: 11px; opacity: 0.7;">
                ${lang === 'ko' ? '⚠ 확정 진단이 아닙니다.' : lang === 'ja' ? '⚠ 確定診断ではありません。' : '⚠ Not a confirmed diagnosis.'}
              </div>
            </div>
          </div>
        `;
      });
      alertsEl.innerHTML = alertItems.join('');
    }

    // ─ 권장 검사 목록 ──────────────────────────────────────
    const testsEl = this.$('#briefing-safety-tests');
    if (testsEl && recommendedTests && recommendedTests.length > 0) {
      const testsTitle = lang === 'ko' ? '권장 검사' : lang === 'ja' ? '推奨検査' : 'Recommended Tests';
      const testItems = recommendedTests.map(test => {
        const priorityIcon = test.priority === 'critical'
          ? '<span class="material-symbols-outlined mi-sm mi-error" style="font-size:16px;">priority_high</span>'
          : test.priority === 'warning'
          ? '<span class="material-symbols-outlined mi-sm mi-warning" style="font-size:16px;">report</span>'
          : '<span class="material-symbols-outlined mi-sm" style="font-size:16px;">check_circle</span>';

        return `
          <div class="safety-test-item safety-test-${test.priority}">
            <div class="safety-test-priority">${priorityIcon}</div>
            <div class="safety-test-content">
              <div class="safety-test-name">${test.name}</div>
              <div class="safety-test-reason">${test.reason}</div>
              ${test.urgency ? `<div class="safety-test-urgency">🕐 ${test.urgency}</div>` : ''}
            </div>
          </div>
        `;
      });
      testsEl.innerHTML = `
        <h4 class="safety-subsection-title" style="margin: 12px 0 8px; font-size: 14px; font-weight: 600;">
          <span class="material-symbols-outlined mi-inline mi-sm">labs</span>
          ${testsTitle}
        </h4>
        ${testItems.join('')}
      `;
    } else if (testsEl) {
      testsEl.innerHTML = '';
    }

    // ─ 교육 포인트 ──────────────────────────────────────────
    const eduEl = this.$('#briefing-safety-education');
    if (eduEl && educationPoints && educationPoints.length > 0) {
      const eduTitle = lang === 'ko' ? '약물 안전 정보' : lang === 'ja' ? '薬物安全情報' : 'Drug Safety Information';
      const eduItems = educationPoints.map(pt => `
        <div class="safety-edu-item">
          <span class="material-symbols-outlined mi-inline mi-sm">${pt.icon || 'info'}</span>
          <span class="safety-edu-text">${pt.text}</span>
        </div>
      `);
      eduEl.innerHTML = `
        <h4 class="safety-subsection-title" style="margin: 12px 0 8px; font-size: 14px; font-weight: 600;">
          <span class="material-symbols-outlined mi-inline mi-sm">menu_book</span>
          ${eduTitle}
        </h4>
        ${eduItems.join('')}
      `;
    } else if (eduEl) {
      eduEl.innerHTML = '';
    }

    // ─ 면책조항 ─────────────────────────────────────────────
    const disclaimerEl = this.$('#briefing-safety-disclaimer');
    if (disclaimerEl && disclaimer) {
      disclaimerEl.textContent = disclaimer;
    }
  }

  // ========================================
  // 3-B. 건강지표 레이더 차트
  // ========================================

  /**
   * 건강지표 Radar Chart 렌더링
   * Axes: BMI / Body Fat / Muscle / WHR / Hormone / Target Progress
   * Each axis is normalized to 0-100 score (higher = healthier / closer to goal)
   */
  renderRadarChart(briefing) {
    if (!this.modalContent) return;
    if (typeof Chart === 'undefined') return;

    const canvas = this.modalContent.querySelector('#briefing-radar-chart');
    if (!canvas) return;

    const lang = getCurrentLanguage();
    const mode = this.userSettings?.mode || 'mtf';
    const latest = this.measurements[this.measurements.length - 1] || {};
    const prev = this.measurements.length > 1 ? this.measurements[this.measurements.length - 2] : null;
    const targets = this.userSettings?.targets || {};

    // ── Build radar axes ──
    const axes = [];

    // 1) BMI score (ideal: 18.5-24.9 → 100, deviation reduces score)
    if (latest.weight && latest.height) {
      const bmi = latest.weight / ((latest.height / 100) ** 2);
      const ideal = 21.7;
      const score = Math.max(0, Math.round(100 - Math.abs(bmi - ideal) * 10));
      axes.push({
        label: 'BMI',
        score, value: bmi.toFixed(1),
        unit: '',
        detail: bmi < 18.5 ? translate('bmiUnderweight') :
                bmi > 30 ? translate('bmiObese') :
                bmi > 25 ? translate('bmiOverweight') :
                translate('bmiNormal')
      });
    }

    // 2) Body Fat % score (MTF ideal: 20-30%, FTM ideal: 10-20%)
    if (latest.bodyFatPercentage != null) {
      const bf = latest.bodyFatPercentage;
      const idealMid = mode === 'mtf' ? 25 : 15;
      const idealRange = 5;
      const deviation = Math.abs(bf - idealMid);
      const score = Math.max(0, Math.round(100 - (deviation / idealRange) * 25));
      axes.push({
        label: lang === 'ko' ? '체지방' : 'Body Fat',
        score, value: `${bf}%`, unit: '',
        detail: `${mode === 'mtf' ? '20-30%' : '10-20%'} ${lang === 'ko' ? '이상적' : 'ideal'}`
      });
    }

    // 3) Muscle Mass score (relative to target or body weight ratio)
    if (latest.muscleMass != null) {
      const mm = latest.muscleMass;
      const targetMM = targets.muscleMass;
      let score;
      if (targetMM) {
        score = Math.min(100, Math.round((mm / targetMM) * 100));
      } else if (latest.weight) {
        const ratio = mm / latest.weight;
        const idealRatio = mode === 'mtf' ? 0.38 : 0.45;
        score = Math.min(100, Math.round((ratio / idealRatio) * 100));
      } else {
        score = 50;
      }
      axes.push({
        label: lang === 'ko' ? '근육량' : 'Muscle',
        score: Math.max(0, score), value: `${mm}kg`, unit: '',
        detail: targetMM ? `${lang === 'ko' ? '목표' : 'Target'}: ${targetMM}kg` : ''
      });
    }

    // 4) WHR score
    if (latest.waist && latest.hips) {
      const whr = latest.waist / latest.hips;
      const idealWHR = mode === 'mtf' ? 0.73 : 0.85;
      const score = Math.max(0, Math.round(100 - Math.abs(whr - idealWHR) * 200));
      axes.push({
        label: lang === 'ko' ? '허리-엉덩이 비율' : 'WHR',
        score, value: whr.toFixed(3), unit: '',
        detail: `${lang === 'ko' ? '이상적' : 'Ideal'}: ${idealWHR}`
      });
    }

    // 5) Hormone Balance score
    if (latest.estrogenLevel != null || latest.testosteroneLevel != null) {
      let score = 50;
      const detail = [];
      if (mode === 'mtf') {
        if (latest.estrogenLevel != null) {
          // MTF ideal E2: 100-200 pg/mL
          const e2 = latest.estrogenLevel;
          const e2Score = e2 >= 100 && e2 <= 200 ? 100 :
                          e2 < 100 ? Math.round((e2 / 100) * 100) :
                          Math.max(0, Math.round(100 - ((e2 - 200) / 100) * 50));
          score = e2Score;
          detail.push(`E2: ${e2} pg/mL`);
        }
        if (latest.testosteroneLevel != null) {
          // MTF ideal T: < 50 ng/dL
          const t = latest.testosteroneLevel;
          const tScore = t <= 50 ? 100 : Math.max(0, Math.round(100 - ((t - 50) / 50) * 50));
          score = latest.estrogenLevel != null ? Math.round((score + tScore) / 2) : tScore;
          detail.push(`T: ${t} ng/dL`);
        }
      } else {
        if (latest.testosteroneLevel != null) {
          // FTM ideal T: 300-1000 ng/dL
          const t = latest.testosteroneLevel;
          const tScore = t >= 300 && t <= 1000 ? 100 :
                         t < 300 ? Math.round((t / 300) * 100) :
                         Math.max(0, Math.round(100 - ((t - 1000) / 500) * 50));
          score = tScore;
          detail.push(`T: ${t} ng/dL`);
        }
        if (latest.estrogenLevel != null) {
          const e2 = latest.estrogenLevel;
          const e2Score = e2 <= 50 ? 100 : Math.max(0, Math.round(100 - ((e2 - 50) / 50) * 50));
          score = latest.testosteroneLevel != null ? Math.round((score + e2Score) / 2) : e2Score;
          detail.push(`E2: ${e2} pg/mL`);
        }
      }
      axes.push({
        label: lang === 'ko' ? '호르몬 균형' : 'Hormones',
        score: Math.max(0, Math.min(100, score)), value: detail.join(', '), unit: '',
        detail: ''
      });
    }

    // 6) Target Progress (overall)
    const overallProgress = briefing?.summary?.overallProgress;
    if (overallProgress) {
      axes.push({
        label: lang === 'ko' ? '목표 달성' : 'Goals',
        score: Math.round(overallProgress.overallPercentage || 0),
        value: `${Math.round(overallProgress.overallPercentage || 0)}%`, unit: '',
        detail: `${overallProgress.achievedCount || 0}/${overallProgress.totalTargets || 0}`
      });
    }

    // 7) Body Change score
    const bodyChange = briefing?.summary?.overallBodyChange;
    if (bodyChange && bodyChange.score != null) {
      const normalizedScore = Math.min(100, Math.max(0, Math.round(
        mode === 'mtf' ? bodyChange.score : (100 - bodyChange.score)
      )));
      axes.push({
        label: lang === 'ko' ? '신체 변화' : 'Body Change',
        score: normalizedScore, value: `${bodyChange.score}${translate('points')}`, unit: '',
        detail: bodyChange.label || ''
      });
    }

    if (axes.length < 3) {
      // Need at least 3 axes for a meaningful radar chart
      const container = this.modalContent.querySelector('#briefing-radar-details');
      if (container) {
        container.innerHTML = `<p class="radar-no-data">${
          lang === 'ko' ? '레이더 차트를 표시하기에 데이터가 부족합니다. 더 많은 측정값을 기록하세요.' :
          'Not enough data for radar chart. Record more measurements.'
        }</p>`;
      }
      return;
    }

    // ── Render Chart.js Radar ──
    const ctx = canvas.getContext('2d');
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-primary').trim() || '#6750A4';
    const primaryRGB = this._hexToRGB(primaryColor);
    const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-tertiary').trim() || '#7D5260';
    const secondaryRGB = this._hexToRGB(secondaryColor);
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-dim').trim() || '#aaa';
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--glass-border').trim() || 'rgba(255,255,255,0.1)';

    // Previous measurement scores (for comparison if available)
    let prevScores = null;
    if (prev) {
      prevScores = axes.map(a => this._computeAxisScore(a.label, prev, mode, targets, briefing));
    }

    if (this.radarChartInstance) {
      this.radarChartInstance.destroy();
    }

    const datasets = [
      {
        label: lang === 'ko' ? '현재' : 'Current',
        data: axes.map(a => a.score),
        backgroundColor: `rgba(${primaryRGB}, 0.2)`,
        borderColor: `rgba(${primaryRGB}, 0.8)`,
        borderWidth: 2,
        pointBackgroundColor: `rgba(${primaryRGB}, 1)`,
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ];

    if (prevScores) {
      datasets.push({
        label: lang === 'ko' ? '이전' : 'Previous',
        data: prevScores,
        backgroundColor: `rgba(${secondaryRGB}, 0.1)`,
        borderColor: `rgba(${secondaryRGB}, 0.5)`,
        borderWidth: 1.5,
        borderDash: [4, 4],
        pointBackgroundColor: `rgba(${secondaryRGB}, 0.7)`,
        pointBorderColor: 'transparent',
        pointRadius: 3,
        pointHoverRadius: 5,
      });
    }

    this.radarChartInstance = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: axes.map(a => a.label),
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: prevScores != null,
            position: 'bottom',
            labels: {
              color: textColor,
              font: { size: 12 },
              boxWidth: 12,
              padding: 16
            }
          },
          tooltip: {
            backgroundColor: 'rgba(30,30,30,0.95)',
            titleColor: '#fff',
            bodyColor: '#ccc',
            borderColor: `rgba(${primaryRGB}, 0.4)`,
            borderWidth: 1,
            callbacks: {
              label: (ctx) => {
                const axis = axes[ctx.dataIndex];
                return axis ? `${axis.label}: ${ctx.raw}/100 (${axis.value})` : '';
              }
            }
          }
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 25,
              color: textColor,
              backdropColor: 'transparent',
              font: { size: 10 }
            },
            pointLabels: {
              color: textColor,
              font: { size: 12, weight: '500' }
            },
            grid: {
              color: gridColor
            },
            angleLines: {
              color: gridColor
            }
          }
        }
      }
    });

    // ── Render detail cards below chart ──
    const detailContainer = this.modalContent.querySelector('#briefing-radar-details');
    if (detailContainer) {
      detailContainer.innerHTML = axes.map(a => {
        const scoreClass = a.score >= 75 ? 'good' : a.score >= 50 ? 'moderate' : 'low';
        return `
          <div class="radar-detail-card ${scoreClass}">
            <div class="radar-detail-header">
              <span class="radar-detail-label">${a.label}</span>
              <span class="radar-detail-score">${a.score}<small>/100</small></span>
            </div>
            <div class="radar-detail-bar">
              <div class="radar-detail-fill" style="width: ${a.score}%"></div>
            </div>
            <div class="radar-detail-info">
              <span class="radar-detail-value">${a.value}</span>
              ${a.detail ? `<span class="radar-detail-note">${a.detail}</span>` : ''}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  /**
   * Compute a single axis score from a measurement (for previous comparison)
   */
  _computeAxisScore(label, m, mode, targets, briefing) {
    // Simplified re-computation — mirrors the logic above
    if (label === 'BMI' && m.weight && m.height) {
      const bmi = m.weight / ((m.height / 100) ** 2);
      return Math.max(0, Math.round(100 - Math.abs(bmi - 21.7) * 10));
    }
    const lang = getCurrentLanguage();
    if (label === (lang === 'ko' ? '체지방' : 'Body Fat') && m.bodyFatPercentage != null) {
      const idealMid = mode === 'mtf' ? 25 : 15;
      return Math.max(0, Math.round(100 - (Math.abs(m.bodyFatPercentage - idealMid) / 5) * 25));
    }
    if (label === (lang === 'ko' ? '근육량' : 'Muscle') && m.muscleMass != null) {
      const targetMM = targets.muscleMass;
      if (targetMM) return Math.min(100, Math.round((m.muscleMass / targetMM) * 100));
      if (m.weight) {
        const idealRatio = mode === 'mtf' ? 0.38 : 0.45;
        return Math.min(100, Math.round(((m.muscleMass / m.weight) / idealRatio) * 100));
      }
      return 50;
    }
    if (label === (lang === 'ko' ? '허리-엉덩이 비율' : 'WHR') && m.waist && m.hips) {
      const whr = m.waist / m.hips;
      const idealWHR = mode === 'mtf' ? 0.73 : 0.85;
      return Math.max(0, Math.round(100 - Math.abs(whr - idealWHR) * 200));
    }
    // For other axes (hormones, goals, body change) — not available for prev easily
    return 50;
  }

  /**
   * Convert hex color to RGB values string
   */
  _hexToRGB(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return '103, 80, 164';
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  }

  // ========================================
  // 3-C. 신체 측정 실루엣 오버레이 (Phase 8)
  // ========================================

  /**
   * Pre-made body-type SVG silhouettes + measurement annotations.
   * Selects body shape based on shoulder/waist/hip ratios.
   */
  renderBodySilhouette() {
    const container = this.$('#briefing-body-silhouette');
    if (!container) return;

    const lang = getCurrentLanguage();
    const latest = this.measurements[this.measurements.length - 1] || {};
    const targets = this.userSettings?.targets || {};

    // ── Body type detection ──
    const shoulder = latest.shoulder || 0;
    const waist = latest.waist || 0;
    const hips = latest.hips || 0;
    const mode = this.userSettings?.mode || 'mtf';

    let bodyType = 'average'; // average, pear, hourglass, inverted, slim
    if (shoulder && waist && hips) {
      const whr = waist / hips;
      const shr = shoulder / hips;
      if (shr > 1.08 && whr > 0.82) bodyType = 'inverted';
      else if (whr < 0.72 && shr < 1.0) bodyType = 'hourglass';
      else if (hips > shoulder * 1.05 && whr < 0.78) bodyType = 'pear';
      else if (waist < 65 && hips < 88) bodyType = 'slim';
    }

    // ── SVG body shapes (viewBox 260×230, body centered at x=130) ──
    const BODY_PATHS = {
      average: `
        <ellipse cx="130" cy="14" rx="10" ry="12" class="sil-head"/>
        <path d="M124,25 Q124,32 123,37 L137,37 Q136,32 136,25" class="sil-neck"/>
        <path d="M123,37 C113,39 98,48 95,56 L90,74 Q88,80 91,82 L95,80 Q98,74 101,65
          C103,55 105,50 107,48 L107,56 C106,68 105,82 106,96 Q107,106 109,117 L111,132
          Q113,140 115,150 L117,168 Q118,180 119,194 L119,214 Q119,217 122,218 L127,218
          Q129,217 129,214 L130,188 Q130,172 130,162 L130,162 Q130,172 130,188 L131,214
          Q131,217 133,218 L138,218 Q140,217 141,214 L141,194 Q142,180 143,168 L145,150
          Q147,140 149,132 L151,117 Q153,106 154,96 C155,82 154,68 153,56 L153,48
          C155,50 157,55 159,65 Q162,74 165,80 L169,82 Q172,80 170,74 L165,56
          C162,48 147,39 137,37 Z" class="sil-body"/>`,
      pear: `
        <ellipse cx="130" cy="14" rx="10" ry="12" class="sil-head"/>
        <path d="M124,25 Q124,32 123,37 L137,37 Q136,32 136,25" class="sil-neck"/>
        <path d="M123,37 C115,39 101,47 98,54 L93,72 Q91,78 94,80 L97,78 Q100,72 103,64
          C104,55 106,50 108,48 L108,56 C107,68 107,82 108,96 Q108,108 106,118
          C104,126 100,132 98,140 Q96,148 98,158 L105,180 Q108,190 112,200 L115,214
          Q115,217 118,218 L126,218 Q128,217 128,214 L130,188 Q130,172 130,162 L130,162
          Q130,172 130,188 L132,214 Q132,217 134,218 L142,218 Q145,217 145,214 L148,200
          Q152,190 155,180 L162,158 Q164,148 162,140 C160,132 156,126 154,118
          Q152,108 152,96 C153,82 153,68 152,56 L152,48 C154,50 156,55 157,64
          Q160,72 163,78 L166,80 Q169,78 167,72 L162,54 C159,47 145,39 137,37 Z" class="sil-body"/>`,
      hourglass: `
        <ellipse cx="130" cy="14" rx="10" ry="12" class="sil-head"/>
        <path d="M124,25 Q124,32 123,37 L137,37 Q136,32 136,25" class="sil-neck"/>
        <path d="M123,37 C112,39 96,48 93,56 L88,74 Q86,80 89,82 L93,80 Q96,74 99,65
          C101,55 104,50 106,48 L106,56 C106,66 107,76 110,86 Q114,94 118,98
          C114,104 110,112 108,122 Q105,134 104,146 L106,170 Q108,184 112,198 L116,214
          Q116,217 119,218 L127,218 Q129,217 129,214 L130,190 Q130,174 130,162 L130,162
          Q130,174 130,190 L131,214 Q131,217 133,218 L141,218 Q144,217 144,214 L148,198
          Q152,184 154,170 L156,146 Q155,134 152,122 C150,112 146,104 142,98
          Q146,94 150,86 C153,76 154,66 154,56 L154,48 C156,50 159,55 161,65
          Q164,74 167,80 L171,82 Q174,80 172,74 L167,56 C164,48 148,39 137,37 Z" class="sil-body"/>`,
      inverted: `
        <ellipse cx="130" cy="14" rx="10" ry="12" class="sil-head"/>
        <path d="M124,25 Q124,32 123,37 L137,37 Q136,32 136,25" class="sil-neck"/>
        <path d="M123,37 C111,39 93,48 89,56 L84,74 Q82,80 85,82 L89,80 Q93,74 96,65
          C98,55 102,50 105,48 L105,56 C105,68 106,82 108,96 Q110,108 112,118
          L114,132 Q115,142 116,152 L117,170 Q118,182 119,196 L119,214 Q119,217 122,218
          L127,218 Q129,217 129,214 L130,190 Q130,174 130,162 L130,162 Q130,174 130,190
          L131,214 Q131,217 133,218 L138,218 Q141,217 141,214 L141,196 Q142,182 143,170
          L144,152 Q145,142 146,132 L148,118 Q150,108 152,96 C154,82 155,68 155,56
          L155,48 C158,50 162,55 164,65 Q167,74 171,80 L175,82 Q178,80 176,74
          L171,56 C167,48 149,39 137,37 Z" class="sil-body"/>`,
      slim: `
        <ellipse cx="130" cy="14" rx="10" ry="12" class="sil-head"/>
        <path d="M124,25 Q124,32 123,37 L137,37 Q136,32 136,25" class="sil-neck"/>
        <path d="M123,37 C115,39 103,47 100,54 L95,70 Q93,76 96,78 L99,76 Q101,72 104,64
          C105,56 107,51 109,48 L109,56 C109,68 109,82 110,96 Q111,108 112,118
          L113,132 Q114,142 115,152 L116,170 Q117,182 118,196 L118,214 Q118,217 121,218
          L127,218 Q129,217 129,214 L130,190 Q130,174 130,162 L130,162 Q130,174 130,190
          L131,214 Q131,217 133,218 L139,218 Q142,217 142,214 L142,196 Q143,182 144,170
          L145,152 Q146,142 147,132 L148,118 Q149,108 150,96 C151,82 151,68 151,56
          L151,48 C153,51 155,56 156,64 Q159,72 161,76 L164,78 Q167,76 165,70
          L160,54 C157,47 145,39 137,37 Z" class="sil-body"/>`
    };

    // ── Annotation points (per body type, cx adjusted) ──
    const BASE_POINTS = [
      { key: 'neck',                   ko: '목 둘레',     en: 'Neck',        ja: '首回り',     cy: 37,  side: 'right', cx: 130 },
      { key: 'shoulder',               ko: '어깨 너비',   en: 'Shoulder',    ja: '肩幅',       cy: 52,  side: 'left',  cx: 100 },
      { key: 'chest',                  ko: '가슴 둘레',   en: 'Chest',       ja: '胸囲',       cy: 65,  side: 'right', cx: 152 },
      { key: 'underBustCircumference', ko: '언더버스트',  en: 'Under Bust',  ja: 'アンダー',   cy: 78,  side: 'left',  cx: 108 },
      { key: 'waist',                  ko: '허리 둘레',   en: 'Waist',       ja: 'ウエスト',   cy: 96,  side: 'left',  cx: 108 },
      { key: 'hips',                   ko: '엉덩이 둘레', en: 'Hips',        ja: 'ヒップ',     cy: 118, side: 'right', cx: 153 },
      { key: 'thigh',                  ko: '허벅지',      en: 'Thigh',       ja: '太腿回り',   cy: 158, side: 'left',  cx: 118 },
      { key: 'calf',                   ko: '종아리',      en: 'Calf',        ja: 'ふくらはぎ', cy: 192, side: 'right', cx: 140 },
    ];

    const POINTS = BASE_POINTS.filter(p => latest[p.key] != null);

    if (POINTS.length === 0) {
      const msg = lang === 'ko' ? '신체 측정 기록이 없습니다.' :
                  lang === 'ja' ? '身体測定記録がありません。' :
                  'No body measurement data recorded.';
      container.innerHTML = `<p class="silhouette-no-data">${msg}</p>`;
      return;
    }

    // Anti-overlap: min 16px gap
    const MIN_GAP = 16;
    const spread = (pts) => {
      if (!pts.length) return;
      pts[0].labelY = pts[0].cy;
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1].labelY;
        pts[i].labelY = Math.max(pts[i].cy, prev + MIN_GAP);
      }
    };
    const leftPts  = POINTS.filter(p => p.side === 'left').sort((a, b) => a.cy - b.cy);
    const rightPts = POINTS.filter(p => p.side === 'right').sort((a, b) => a.cy - b.cy);
    spread(leftPts);
    spread(rightPts);

    const labelYMap = new Map();
    [...leftPts, ...rightPts].forEach(p => labelYMap.set(p.key, p.labelY ?? p.cy));

    const LEFT_END  = 46;
    const RIGHT_END = 214;

    const annotations = POINTS.map(p => {
      const value  = latest[p.key];
      const target = targets[p.key];
      const label  = lang === 'ko' ? p.ko : lang === 'ja' ? p.ja : p.en;
      const valStr = `${value}cm`;
      const tgtStr = target != null ? ` → ${target}cm` : '';

      let dotColor;
      if (target == null) {
        dotColor = 'var(--md-sys-color-secondary, #625B71)';
      } else {
        const dev = Math.abs(value - target) / Math.max(target, 1);
        dotColor = dev <= 0.02 ? 'var(--success, #4CAF50)'
                 : dev <= 0.10 ? 'var(--warning, #FFB400)'
                 : 'var(--md-sys-color-error, #FF5449)';
      }

      const ly = labelYMap.get(p.key) ?? p.cy;
      const lineEndX   = p.side === 'left' ? LEFT_END : RIGHT_END;
      const textAnchor = p.side === 'left' ? 'end' : 'start';
      const textX      = p.side === 'left' ? LEFT_END - 3 : RIGHT_END + 3;

      const leader = Math.abs(ly - p.cy) < 2
        ? `<line x1="${p.cx}" y1="${p.cy}" x2="${lineEndX}" y2="${ly}" stroke="${dotColor}" stroke-width="0.6" stroke-dasharray="3,2" opacity="0.5"/>`
        : `<path d="M${p.cx},${p.cy} L${lineEndX},${p.cy} L${lineEndX},${ly}" fill="none" stroke="${dotColor}" stroke-width="0.6" stroke-dasharray="3,2" opacity="0.5"/>`;

      return `
        <circle cx="${p.cx}" cy="${p.cy}" r="3" fill="${dotColor}" opacity="0.9"/>
        <circle cx="${p.cx}" cy="${p.cy}" r="5.5" fill="${dotColor}" opacity="0.15"/>
        ${leader}
        <text x="${textX}" y="${ly - 2}" font-size="6.5" text-anchor="${textAnchor}"
              fill="var(--text-primary,#e0e0e0)" font-family="system-ui,sans-serif" font-weight="600">${label}</text>
        <text x="${textX}" y="${ly + 6.5}" font-size="6" text-anchor="${textAnchor}"
              fill="${dotColor}" font-family="system-ui,sans-serif">${valStr}${tgtStr}</text>`;
    }).join('');

    const ariaLbl = lang === 'ko' ? '신체 측정 시각화' : lang === 'ja' ? '身体測定ビジュアル' : 'Body measurement visualization';
    const bodyTypeLabel = lang === 'ko'
      ? { average: '표준', pear: '하체형', hourglass: '모래시계형', inverted: '역삼각형', slim: '슬림' }[bodyType]
      : bodyType;

    container.innerHTML = `
      <div class="silhouette-type-badge">${bodyTypeLabel}</div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 230"
           class="silhouette-svg" role="img" aria-label="${ariaLbl}">
        <defs>
          <linearGradient id="silGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(190,170,240,0.15)"/>
            <stop offset="100%" stop-color="rgba(130,110,190,0.04)"/>
          </linearGradient>
        </defs>
        <style>
          .sil-head, .sil-neck, .sil-body {
            fill: url(#silGrad);
            stroke: rgba(160,140,210,0.30);
            stroke-width: 1.2;
            stroke-linejoin: round;
            stroke-linecap: round;
          }
        </style>
        ${BODY_PATHS[bodyType]}
        ${annotations}
      </svg>`;
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
    
    const labels = this.measurements.map(m => `${m.week}주차`);

    const numericCandidates = [
      'height',
      'weight',
      'shoulder',
      'neck',
      'chest',
      'underBustCircumference',
      'waist',
      'hips',
      'thigh',
      'calf',
      'arm',
      'muscleMass',
      'bodyFatPercentage',
      'libido',
      'estrogenLevel',
      'testosteroneLevel'
    ];

    const hasAnyFiniteNumber = (key) => this.measurements.some(m => Number.isFinite(Number(m?.[key])));
    const numericKeys = numericCandidates.filter(hasAnyFiniteNumber);

    const symptomIds = [...new Set(
      this.measurements
        .flatMap(m => Array.isArray(m?.symptoms) ? m.symptoms : [])
        .map(s => s?.id)
        .filter(Boolean)
    )];

    const medKeyToMeta = new Map();
    this.measurements
      .flatMap(m => Array.isArray(m?.medications) ? m.medications : [])
      .forEach(med => {
        const id = med?.id || med?.medicationId;
        if (!id) return;
        const unit = med?.unit || '';
        const key = `${id}__${unit}`;
        if (medKeyToMeta.has(key)) return;
        medKeyToMeta.set(key, { id, unit });
      });

    const medSeries = [...medKeyToMeta.values()];

    const seriesDefs = [
      ...numericKeys.map(key => ({ kind: 'metric', key })),
      ...symptomIds.map(id => ({ kind: 'symptom', id })),
      ...medSeries.map(({ id, unit }) => ({ kind: 'medication', id, unit }))
    ];

    const makeColor = (index) => `hsl(${(index * 37) % 360}, 70%, 60%)`;

    const defaultIndex = Math.max(0, seriesDefs.findIndex(d => d.kind === 'metric' && d.key === 'weight'));

    const datasets = seriesDefs.map((def, index) => {
      const metricColor = makeColor(index);
      const data = def.kind === 'metric'
        ? this.measurements.map(m => {
          const n = Number(m?.[def.key]);
          return Number.isFinite(n) ? n : null;
        })
        : def.kind === 'symptom'
          ? this.measurements.map(m => {
            const found = Array.isArray(m?.symptoms) ? m.symptoms.find(s => s?.id === def.id) : null;
            const sev = Number(found?.severity);
            return Number.isFinite(sev) ? sev : null;
          })
          : this.measurements.map(m => {
            const found = Array.isArray(m?.medications)
              ? m.medications.find(x => (x?.id || x?.medicationId) === def.id && (x?.unit || '') === (def.unit || ''))
              : null;
            const dose = Number(found?.dose);
            return Number.isFinite(dose) ? dose : null;
          });

      const label = def.kind === 'metric'
        ? this.getMetricName(def.key)
        : def.kind === 'symptom'
          ? this.getSymptomName(def.id)
          : `${this.getMedicationName(def.id)}${def.unit ? ` (${def.unit})` : ''}`;

      const targetValue = def.kind === 'metric'
        ? Number(this.userSettings?.targets?.[def.key])
        : NaN;

      return {
        label,
        data,
        borderColor: metricColor,
        backgroundColor: metricColor + '33',
        tension: 0.1,
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: true,
        hidden: index !== defaultIndex,
        _series: def,
        _targetValue: Number.isFinite(targetValue) ? targetValue : undefined
      };
    });
    
    // 라이트/다크 모드 스타일 설정
    const isLightMode = document.body.classList.contains('light-mode');
    const tickColor = isLightMode ? '#5c5c8a' : 'rgba(255, 255, 255, 0.6)';
    const gridColor = isLightMode ? 'rgba(200, 200, 235, 0.5)' : 'rgba(255, 255, 255, 0.1)';
    
    ensureAverageLinePluginRegistered();

    const wrapper = canvas.parentElement;
    if (wrapper) {
      const container = this.ensureChartWrapperContainer(wrapper);
      let inner = wrapper.querySelector('.chart-inner-container');
      if (!inner) {
        inner = document.createElement('div');
        inner.classList.add('chart-inner-container');
        wrapper.insertBefore(inner, canvas);
        inner.appendChild(canvas);
      }

      const maxPointsPerView = 10;
      const minPointWidth = 70;
      const pointCount = labels.length;
      const neededWidth = pointCount * minPointWidth;

      if (pointCount > maxPointsPerView) {
        wrapper.style.overflowX = 'auto';
        wrapper.style.overflowY = 'hidden';
        inner.style.width = neededWidth + 'px';
      } else {
        wrapper.style.overflowX = 'hidden';
        inner.style.width = '100%';
      }
      inner.style.height = '280px';
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      this.applyDetailZoom(wrapper, inner, pointCount);
      this.ensureDetailZoomControls(container, wrapper, inner, pointCount);
    }

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
            display: false
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
        },
        onClick: (event) => {
          if (!this.detailChartInstance) return;
          const points = this.detailChartInstance.getElementsAtEventForMode(event, 'nearest', { intersect: false }, true);
          if (!points || points.length === 0) return;
          const index = points[0]?.index;
          if (!Number.isFinite(index)) return;
          this._selectedWeekIndex = index;
          this.renderSelectedWeekData(index);
        },
        onHover: (event, elements) => {
          const canvasEl = event?.native?.target;
          if (!canvasEl) return;
          canvasEl.style.cursor = elements && elements.length > 0 ? 'pointer' : 'default';
        }
      }
    });

    this.renderDetailSeriesButtons();
  }

  applyDetailZoom(wrapper, inner, pointCount) {
    if (!wrapper || !inner || !this.detailChartInstance) return;

    const level = Math.max(0, Math.min(4, Number(this._detailZoomLevel) || 0));
    this._detailZoomLevel = level;

    const basePointWidth = 70;
    const stepWidths = [basePointWidth, 60, 50, 40];
    const wrapperWidth = wrapper.clientWidth || 0;
    const availableWidth = Math.max(0, wrapperWidth - 20);

    if (level >= 4 || pointCount <= 1) {
      wrapper.style.overflowX = 'hidden';
      wrapper.style.overflowY = 'hidden';
      inner.style.width = '100%';
    } else {
      const pointWidth = stepWidths[level] || basePointWidth;
      const neededWidth = pointCount * pointWidth;
      if (neededWidth > availableWidth && availableWidth > 0) {
        wrapper.style.overflowX = 'auto';
        wrapper.style.overflowY = 'hidden';
        inner.style.width = neededWidth + 'px';
      } else {
        wrapper.style.overflowX = 'hidden';
        wrapper.style.overflowY = 'hidden';
        inner.style.width = '100%';
      }
    }

    const hideDetails = level >= 3;
    this.detailChartInstance.data.datasets.forEach(ds => {
      ds.pointRadius = hideDetails ? 0 : 4;
      ds.pointHoverRadius = hideDetails ? 0 : 6;
    });
    if (this.detailChartInstance.options?.scales?.x?.ticks) {
      this.detailChartInstance.options.scales.x.ticks.display = !hideDetails;
    }
    this.detailChartInstance.update('none');
  }

  ensureChartWrapperContainer(wrapper) {
    const parent = wrapper.parentElement;
    if (!parent) return wrapper;
    if (parent.classList.contains('chart-wrapper-container')) return parent;

    const container = document.createElement('div');
    container.className = 'chart-wrapper-container';
    parent.insertBefore(container, wrapper);
    container.appendChild(wrapper);
    return container;
  }

  ensureDetailZoomControls(container, wrapper, inner, pointCount) {
    if (!container || !wrapper) return;

    const stale = wrapper.querySelector('.chart-zoom-controls');
    if (stale) stale.remove();

    let controls = container.querySelector('.chart-zoom-controls');
    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'chart-zoom-controls';
      controls.innerHTML = `
        <button type="button" class="chart-zoom-btn zoom-in" aria-label="Zoom in">+</button>
        <button type="button" class="chart-zoom-btn zoom-out" aria-label="Zoom out">−</button>
      `;
      container.appendChild(controls);
    }

    const updateState = () => {
      const level = Math.max(0, Math.min(4, Number(this._detailZoomLevel) || 0));
      const inBtn = controls.querySelector('.zoom-in');
      const outBtn = controls.querySelector('.zoom-out');
      if (inBtn) inBtn.disabled = level <= 0;
      if (outBtn) outBtn.disabled = level >= 4;
    };

    updateState();

    if (this._detailZoomBound) return;
    this._detailZoomBound = true;

    controls.addEventListener('click', (e) => {
      const btn = e.target.closest('.chart-zoom-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();

      const isIn = btn.classList.contains('zoom-in');
      const isOut = btn.classList.contains('zoom-out');
      if (!isIn && !isOut) return;

      const next = (Number(this._detailZoomLevel) || 0) + (isOut ? 1 : -1);
      this._detailZoomLevel = Math.max(0, Math.min(4, next));
      this.applyDetailZoom(wrapper, inner, pointCount);
      updateState();
    }, { passive: false });
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
    const tabViews = this.modalContent.querySelectorAll('#briefing-summary-view, #briefing-health-view, #briefing-detail-view');
    
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

  getSymptomName(symptomId) {
    if (!this._symptomLabelById) {
      const map = new Map();
      Object.values(SYMPTOM_DATABASE || {}).forEach(group => {
        const symptoms = group?.symptoms;
        if (!Array.isArray(symptoms)) return;
        symptoms.forEach(s => {
          if (!s?.id) return;
          map.set(s.id, {
            ko: s.ko,
            en: s.en,
            ja: s.ja
          });
        });
      });
      this._symptomLabelById = map;
    }

    const record = this._symptomLabelById.get(symptomId);
    if (!record) return symptomId;
    const lang = getCurrentLanguage();
    return (lang === 'ja' ? record.ja : lang === 'en' ? record.en : record.ko) || record.ko || record.en || record.ja || symptomId;
  }

  getMedicationName(medId) {
    const lang = getCurrentLanguage();

    if (!this._medicationLabelById) {
      const map = new Map();
      if (MEDICATION_DATABASE && typeof MEDICATION_DATABASE === 'object') {
        Object.values(MEDICATION_DATABASE).forEach(group => {
          const items = group?.items;
          if (!Array.isArray(items)) return;
          items.forEach(item => {
            if (!item?.id) return;
            map.set(item.id, { ko: item.ko, en: item.en, ja: item.ja });
          });
        });
      }

      const all = getAllMedications();
      (Array.isArray(all) ? all : []).forEach(m => {
        if (!m?.id || map.has(m.id)) return;
        map.set(m.id, { names: m.names });
      });

      this._medicationLabelById = map;
    }

    const record = this._medicationLabelById.get(medId);
    if (!record) return medId;

    if (record.ko || record.en || record.ja) {
      return (lang === 'ja' ? record.ja : lang === 'en' ? record.en : record.ko) || record.ko || record.en || record.ja || medId;
    }

    const names = record.names;
    if (!Array.isArray(names) || names.length === 0) return medId;
    if (lang === 'ko') return names.find(n => /[가-힣]/.test(n)) || names[0];
    if (lang === 'ja') return names.find(n => /[ぁ-んァ-ン一-龯]/.test(n)) || names.find(n => /[A-Za-z]/.test(n)) || names[0];
    return names.find(n => /[A-Za-z]/.test(n)) || names[0];
  }

  renderDetailSeriesButtons() {
    const legendEl = this.$('#briefing-legend-controls');
    if (!legendEl || !this.detailChartInstance) return;

    const scrollPositions = {};
    legendEl.querySelectorAll('.legend-list[data-group]').forEach(list => {
      const key = list.getAttribute('data-group');
      if (key) scrollPositions[key] = list.scrollTop;
    });

    const datasets = this.detailChartInstance.data.datasets;
    const allVisible = datasets.length > 0 && datasets.every((_, i) => this.detailChartInstance.isDatasetVisible(i));
    const toggleAllText = allVisible ? translate('deselectAll') : translate('selectAll');

    const groups = {
      metric: [],
      symptom: [],
      medication: []
    };

    datasets.forEach((dataset, index) => {
      const kind = dataset?._series?.kind;
      const groupKey = kind === 'symptom' ? 'symptom' : kind === 'medication' ? 'medication' : 'metric';
      groups[groupKey].push({ dataset, index });
    });

    const renderButtons = (items) => items.map(({ dataset, index }) => {
      const color = dataset.borderColor;
      const isActive = this.detailChartInstance.isDatasetVisible(index);
      const inactive = isActive ? '' : 'inactive';
      const bg = isActive ? color : 'transparent';
      const fg = isActive ? 'white' : 'var(--text-dim)';
      return `<button class="legend-button ${inactive}" data-dataset-index="${index}" style="background-color: ${bg}; border-color: ${color}; color: ${fg};">${dataset.label}</button>`;
    }).join('');

    legendEl.innerHTML = `
      <div class="briefing-legend-toolbar">
        <button class="legend-button" data-action="toggle-all" style="background-color: var(--accent); border-color: var(--accent); color: white;">${toggleAllText}</button>
      </div>
      <div class="briefing-legend-grid">
        <div class="legend-group-card">
          <h5 class="legend-group-title">${translate('briefingGroupMeasurements')}</h5>
          <div class="legend-list" data-group="metric">${renderButtons(groups.metric)}</div>
          <div class="legend-group-toolbar">
            <button class="legend-button legend-group-toggle" data-group="metric" data-action="toggle-group" style="background-color: var(--glass-bg); border-color: var(--glass-border); color: var(--text-dim); margin-top: 8px; width: 100%;">${groups.metric.every(({ dataset, index }) => this.detailChartInstance.isDatasetVisible(index)) ? translate('deselectAll') : translate('selectAll')}</button>
          </div>
        </div>
        <div class="legend-group-card">
          <h5 class="legend-group-title">${translate('briefingGroupSymptoms')}</h5>
          <div class="legend-list" data-group="symptom">${renderButtons(groups.symptom)}</div>
          <div class="legend-group-toolbar">
            <button class="legend-button legend-group-toggle" data-group="symptom" data-action="toggle-group" style="background-color: var(--glass-bg); border-color: var(--glass-border); color: var(--text-dim); margin-top: 8px; width: 100%;">${groups.symptom.every(({ dataset, index }) => this.detailChartInstance.isDatasetVisible(index)) ? translate('deselectAll') : translate('selectAll')}</button>
          </div>
        </div>
        <div class="legend-group-card">
          <h5 class="legend-group-title">${translate('briefingGroupMedications')}</h5>
          <div class="legend-list" data-group="medication">${renderButtons(groups.medication)}</div>
          <div class="legend-group-toolbar">
            <button class="legend-button legend-group-toggle" data-group="medication" data-action="toggle-group" style="background-color: var(--glass-bg); border-color: var(--glass-border); color: var(--text-dim); margin-top: 8px; width: 100%;">${groups.medication.every(({ dataset, index }) => this.detailChartInstance.isDatasetVisible(index)) ? translate('deselectAll') : translate('selectAll')}</button>
          </div>
        </div>
      </div>
    `;

    legendEl.querySelectorAll('.legend-list[data-group]').forEach(list => {
      const key = list.getAttribute('data-group');
      const pos = key ? scrollPositions[key] : undefined;
      if (key && typeof pos === 'number') list.scrollTop = pos;
    });

    if (!this._isDetailLegendBound) {
      this._isDetailLegendBound = true;
      legendEl.addEventListener('click', (e) => {
        const button = e.target.closest('.legend-button');
        if (!button || !this.detailChartInstance) return;

        const action = button.dataset.action;
        if (action === 'toggle-all') {
          const ds = this.detailChartInstance.data.datasets;
          const isAllVisible = ds.length > 0 && ds.every((_, i) => this.detailChartInstance.isDatasetVisible(i));
          ds.forEach((_, i) => {
            this.detailChartInstance.setDatasetVisibility(i, !isAllVisible);
          });
          this.detailChartInstance.update();
          this.renderDetailSeriesButtons();
          if (Number.isFinite(this._selectedWeekIndex)) {
            this.renderSelectedWeekData(this._selectedWeekIndex);
          }
          return;
        } else if (action === 'toggle-group') {
          const group = button.dataset.group;
          const datasets = this.detailChartInstance.data.datasets;
          const groupIndices = datasets
            .map((ds, idx) => ({ ds, idx }))
            .filter(({ ds }) => ds._series?.kind === group)
            .map(({ idx }) => idx);
          if (groupIndices.length === 0) return;
          const allVisible = groupIndices.every(i => this.detailChartInstance.isDatasetVisible(i));
          groupIndices.forEach(i => {
            this.detailChartInstance.setDatasetVisibility(i, !allVisible);
          });
          this.detailChartInstance.update();
          this.renderDetailSeriesButtons();
          if (Number.isFinite(this._selectedWeekIndex)) {
            this.renderSelectedWeekData(this._selectedWeekIndex);
          }
          return;
        }

        const datasetIndex = parseInt(button.dataset.datasetIndex, 10);
        if (Number.isNaN(datasetIndex)) return;
        const isVisible = this.detailChartInstance.isDatasetVisible(datasetIndex);
        this.detailChartInstance.setDatasetVisibility(datasetIndex, !isVisible);
        this.detailChartInstance.update();
        this.renderDetailSeriesButtons();

        if (Number.isFinite(this._selectedWeekIndex)) {
          this.renderSelectedWeekData(this._selectedWeekIndex);
        }
      });
    }
  }

  renderSelectedWeekData(index) {
    const titleEl = this.$('#briefing-selected-week-data-title');
    const contentEl = this.$('#briefing-selected-week-data-content');
    const placeholderEl = this.$('#briefing-data-placeholder');
    if (!contentEl || !placeholderEl || !this.measurements[index]) return;

    const m = this.measurements[index];
    const weekValue = Number.isFinite(Number(m.week)) ? Number(m.week) : index;
    if (titleEl) titleEl.textContent = translate('selectedWeekDataTitle', { week: weekValue });

    const numericKeys = [
      'height', 'weight', 'shoulder', 'neck', 'chest', 'underBustCircumference', 'waist', 'hips', 'thigh', 'calf', 'arm',
      'muscleMass', 'bodyFatPercentage', 'libido', 'estrogenLevel', 'testosteroneLevel'
    ];

    const items = [];

    numericKeys.forEach(key => {
      const n = Number(m?.[key]);
      if (!Number.isFinite(n)) return;
      const label = translate(key).split('(')[0].trim();
      const unitMatch = translate(key).match(/\(([^)]+)\)/);
      const unit = unitMatch ? unitMatch[1] : '';
      items.push({ label, value: unit ? `${n}${unit}` : `${n}` });
    });

    const symptomsText = Array.isArray(m.symptoms) && m.symptoms.length > 0
      ? m.symptoms
        .filter(s => s && s.id)
        .map(s => {
          const sev = Number.isFinite(Number(s.severity)) ? Number(s.severity) : null;
          return sev ? `${this.getSymptomName(s.id)}(${sev})` : this.getSymptomName(s.id);
        })
        .join('\n')
      : '-';

    const medsText = Array.isArray(m.medications) && m.medications.length > 0
      ? m.medications
        .filter(x => x && (x.id || x.medicationId))
        .map(x => {
          const id = x.id || x.medicationId;
          const dose = Number.isFinite(Number(x.dose)) ? Number(x.dose) : null;
          const unit = x.unit || '';
          if (dose === null) return `${this.getMedicationName(id)}`;
          return `${this.getMedicationName(id)} ${dose}${unit}`;
        })
        .join('\n')
      : '-';

    items.push({ label: translate('symptoms'), value: symptomsText });
    items.push({ label: translate('medications'), value: medsText });

    contentEl.innerHTML = items
      .map(({ label, value }) => {
        const safeValue = String(value ?? '-');
        return `
          <div class="data-item">
            <span class="data-item-label">${label}</span>
            <span class="data-item-value">${safeValue}</span>
          </div>
        `;
      })
      .join('');

    contentEl.style.display = 'grid';
    placeholderEl.style.display = 'none';
  }
  
  getMetricName(metric) {
    const label = translate(metric);
    if (!label || label === metric) return metric;
    return label.split('(')[0].trim();
  }
  
  getMetricUnit(metric) {
    const units = {
      height: 'cm',
      weight: 'kg',
      shoulder: 'cm',
      neck: 'cm',
      waist: 'cm',
      hips: 'cm',
      chest: 'cm',
      underBustCircumference: 'cm',
      thigh: 'cm',
      calf: 'cm',
      arm: 'cm',
      muscleMass: 'kg',
      bodyFatPercentage: '%',
      libido: '',
      estrogenLevel: 'pg/mL',
      testosteroneLevel: 'ng/dL',
      menstruationPain: ''
    };
    return units[metric] || '';
  }
}

// ========================================
// 6. Export
// ========================================

export default BodyBriefingModal;
