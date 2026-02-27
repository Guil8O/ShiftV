/**
 * Change Roadmap Modal Renderer
 * 
 * Change Roadmap 모달의 요약/상세 탭 렌더링
 */

import { DoctorEngine } from '../../doctor-module/core/doctor-engine.js';
import { MEDICATION_DATABASE, getAllMedications } from '../../doctor-module/data/medication-database.js';
import { SYMPTOM_DATABASE } from '../../doctor-module/data/symptom-database.js';
import { translate, getCurrentLanguage } from '../../translations.js';
import { timestampToDateString } from '../../utils.js';
import { svgIcon } from '../icon-paths.js';

// ========================================
// 1. Change Roadmap Modal 클래스
// ========================================

export class ChangeRoadmapModal {
  constructor(measurements, userSettings) {
    this.measurements = measurements;
    this.userSettings = userSettings;
    this.doctorEngine = new DoctorEngine(measurements, userSettings);

    this._root = null;
    this._detailChartInstance = null;
    this._detailZoomLevel = 0;
    this._detailZoomBound = false;
    this._legendBound = false;
    this._selectedWeekIndex = null;
    this._roadmap = null;
  }

  $(selector) {
    return this._root ? this._root.querySelector(selector) : null;
  }
  
  // ========================================
  // 2. 모달 열기
  // ========================================
  
  /**
   * Change Roadmap 모달 열기
   */
  open() {
    const language = getCurrentLanguage();
    this.doctorEngine = new DoctorEngine(this.measurements, { ...this.userSettings, language });
    const roadmap = this.doctorEngine.generateRoadmap();
    this._roadmap = roadmap;
    
    // 모달 표시
    const template = document.getElementById('change-roadmap-view');
    if (!template) {
      console.error('Change Roadmap template not found!');
      return;
    }
    
    const modalOverlay = document.getElementById('modal-bottom-sheet-overlay');
    const modalSheet = document.getElementById('modal-bottom-sheet');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const closeBtn = document.getElementById('modal-close-btn');
    
    if (!modalOverlay || !modalSheet || !modalTitle || !modalContent) {
      console.error('Modal elements not found!', { modalOverlay, modalSheet, modalTitle, modalContent });
      return;
    }
    
    // 1. 먼저 템플릿 내용을 모달에 복사
    modalTitle.textContent = translate('roadmapModalTitle');
    modalContent.innerHTML = template.innerHTML;

    this._root = modalContent;
    this.applyTranslations(modalContent);
    
    // 2. 이제 DOM 요소들이 존재하므로 렌더링
    this.render(roadmap);
    
    // 3. 탭 전환 이벤트 설정
    this.setupTabSwitching();

    setTimeout(() => this.ensureDetailGraphReady(), 0);

    // 4. 날짜 선택 이벤트 설정
    this.setupDateSelector();
    
    // 5. 모달 표시
    document.body.classList.add('modal-open');
    modalOverlay.classList.add('visible');

    const cleanup = () => {
      if (this._detailChartInstance) {
        this._detailChartInstance.destroy();
        this._detailChartInstance = null;
      }
      this._root = null;
      this._detailZoomBound = false;
      this._legendBound = false;
      this._roadmap = null;
    };

    if (closeBtn) closeBtn.addEventListener('click', cleanup, { once: true });
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) cleanup();
    }, { once: true });
  }
  
  // ========================================
  // 3. 렌더링
  // ========================================
  
  /**
   * 전체 렌더링
   */
  render(roadmap) {
    this.renderSummary(roadmap.summary);
    this.renderDetail(roadmap);
  }
  
  /**
   * 요약 탭 렌더링
   */
  renderSummary(summary) {
    // 전체 진행도
    this.renderOverallProgress(summary.overallProgress);
    
    // 타임라인
    this.renderTimeline(summary.timeline);
    
    // 월별 요약
    this.renderMonthlySummary(summary.monthlySummaries);
  }
  
  /**
   * 전체 진행도 렌더링
   */
  renderOverallProgress(progress) {
    const fill = this.$('#roadmap-progress-fill');
    const currentWeek = this.$('#roadmap-current-week');
    const targetWeek = this.$('#roadmap-target-week');
    const achievementRate = this.$('#roadmap-achievement-rate');
    const achievementCount = this.$('#roadmap-achievement-count');
    const ticksContainer = this.$('#roadmap-progress-ticks');
    const segmentsContainer = this.$('#roadmap-progress-segments');
    const trajectoryEl = this.$('#roadmap-progress-trajectory');
    const currentMarker = this.$('#roadmap-progress-marker-current');
    const noteEl = this.$('#roadmap-progress-note');

    const overall = this.doctorEngine?.trendPredictor?.calculateOverallProgress?.();
    
    if (fill && progress) {
      const percentage = parseFloat(overall?.percentage ?? progress.progress) || 0;
      const clampedPct = Math.max(0, Math.min(100, percentage));
      const currentWeekNum = Number.isFinite(Number(progress.currentWeek)) ? Number(progress.currentWeek) : 0;
      fill.style.width = `${clampedPct}%`;

      if (ticksContainer) {
        ticksContainer.style.width = `${clampedPct}%`;
        ticksContainer.style.overflow = 'hidden';
      }
      if (segmentsContainer) {
        segmentsContainer.style.width = `${clampedPct}%`;
        segmentsContainer.style.overflow = 'hidden';
      }

      this.renderWeeklyTicks(progress.weeklyChanges, ticksContainer, currentWeekNum);
      this.renderProgressSegments(progress.weeklyChanges, segmentsContainer, currentWeekNum);
      this.renderProgressTrajectory(progress.weeklyChanges, trajectoryEl, currentWeekNum);
      if (currentMarker) currentMarker.style.left = `${clampedPct}%`;

      if (currentWeek) currentWeek.textContent = translate('roadmapWeekLabel', { week: String(currentWeekNum) });
      if (targetWeek) targetWeek.textContent = translate('roadmapWeekLabel', { week: String(progress.estimatedTargetWeek || currentWeekNum) });
      if (achievementRate) achievementRate.textContent = `${clampedPct.toFixed(0)}%`;
      if (achievementCount) {
        const achieved = overall?.achievedCount ?? 0;
        const total = overall?.totalCount ?? 0;
        achievementCount.textContent = translate('roadmapAchievementCount', { achieved: String(achieved), total: String(total) });
      }

      const hasNegative = Array.isArray(progress.weeklyChanges) && progress.weeklyChanges.some(c => c && c.positive === false);
      if (noteEl) {
        if (hasNegative) {
          noteEl.style.display = 'block';
          noteEl.textContent = translate('roadmapNegativeNote');
        } else {
          noteEl.style.display = 'none';
          noteEl.textContent = '';
        }
      }
    }
  }
  
  /**
   * 주간 변화 틱 렌더링
   */
  renderWeeklyTicks(weeklyChanges, container, currentWeekNum) {
    if (!container) return;
    if (!weeklyChanges || weeklyChanges.length === 0) {
      container.innerHTML = '';
      return;
    }

    const effective = weeklyChanges.slice(0, Math.max(0, Math.min(weeklyChanges.length, Number(currentWeekNum) || 0)));
    const denom = effective.length + 1;
    const ticks = effective.map((change, index) => {
      const position = ((index + 1) / denom) * 100;
      const className = change?.positive ? 'positive' : 'negative';
      return `<div class="weekly-tick ${className}" style="left: ${position}%"></div>`;
    }).join('');

    container.innerHTML = ticks;
  }

  renderProgressTrajectory(weeklyChanges, svgEl, currentWeekNum) {
    if (!svgEl) return;
    if (!weeklyChanges || weeklyChanges.length === 0) {
      svgEl.innerHTML = '';
      return;
    }

    const effective = weeklyChanges.slice(0, Math.max(0, Math.min(weeklyChanges.length, Number(currentWeekNum) || 0)));

    let x = 0;
    const points = [`${x},5`];
    const step = 6;
    let hasRollback = false;

    effective.forEach(change => {
      const prev = x;
      x += (change?.positive ? step : -step);
      x = Math.max(0, Math.min(100, x));
      if (x < prev) hasRollback = true;
      points.push(`${x},5`);
    });

    svgEl.innerHTML = `<path class="${hasRollback ? 'rollback' : ''}" d="M ${points.join(' L ')}" />`;
  }

  renderProgressSegments(weeklyChanges, container, currentWeekNum) {
    if (!container) return;
    if (!weeklyChanges || weeklyChanges.length === 0) {
      container.innerHTML = '';
      return;
    }

    const effective = weeklyChanges.slice(0, Math.max(0, Math.min(weeklyChanges.length, Number(currentWeekNum) || 0)));
    const n = Math.max(1, effective.length);
    const gapPx = 2;
    const segWidth = 100 / n;

    const html = effective.map((c, idx) => {
      const positive = c?.positive === true;
      const cls = positive ? 'positive' : 'negative';
      const left = segWidth * idx;
      const width = segWidth;
      const breakCls = !positive ? 'break' : '';
      return `<div class="roadmap-progress-segment ${cls} ${breakCls}" style="left: calc(${left}% + ${gapPx / 2}px); width: calc(${width}% - ${gapPx}px);"></div>`;
    }).join('');

    container.innerHTML = html;
  }
  
  /**
   * 타임라인 렌더링
   */
  renderTimeline(timeline) {
    const container = this.$('#roadmap-timeline-container');
    if (!container || !timeline || timeline.length === 0) return;
    
    const getTitle = (milestone) => {
      const title = String(milestone?.title || '');
      const type = milestone?.type || 'normal';
      if (type === 'start') return translate('roadmapTimelineStart') || title;
      if (type === 'current') return translate('roadmapTimelineCurrent') || title;
      if (type === 'prediction') return translate('roadmapTimelineFinalForecast') || title;
      if (type === 'warning') return translate('roadmapTimelineAwayFromGoal') || title;
      if (title === '큰 변화') return translate('roadmapTimelineBigChange') || title;
      const reached = title.match(/^(\d+)%\s*도달$/);
      if (reached) return translate('roadmapTimelineReachedPercent', { percent: reached[1] }) || title;
      return title || (translate('roadmapWeekLabel', { week: String(milestone?.week || '') }));
    };

    const getDescription = (milestone) => {
      const desc = String(milestone?.description || '');
      if (desc === '모든 목표 달성 예상 시점') return translate('roadmapTimelineAllGoalsEta') || desc;
      if (desc === '일부 지표가 목표에서 멀어졌습니다. 계획을 점검해 보세요.') return translate('roadmapTimelineAwayFromGoalDesc') || desc;
      return desc;
    };

    const items = timeline.map(milestone => {
      const type = milestone.type || 'normal';
      const icon = this.getMilestoneIcon(type);
      
      return `
        <div class="timeline-item ${type}">
          <div class="timeline-week">${icon} ${getTitle(milestone)}</div>
          <div class="timeline-date">${milestone.date || ''}</div>
          <div class="timeline-content">
            ${getDescription(milestone)}
          </div>
        </div>
      `;
    });
    
    container.innerHTML = items.join('');
  }
  
  /**
   * 월별 요약 렌더링
   */
  renderMonthlySummary(monthlySummaries) {
    const container = this.$('#roadmap-monthly-summary-container');
    const standoutContainer = this.$('#roadmap-standout-container');
    if (!container || !monthlySummaries || monthlySummaries.length === 0) return;

    if (standoutContainer) {
      const all = monthlySummaries
        .flatMap(m => Array.isArray(m?.topChanges) ? m.topChanges.map(c => ({ ...c, month: m.month })) : [])
        .filter(Boolean)
        .sort((a, b) => Math.abs(Number(b.change)) - Math.abs(Number(a.change)))
        .slice(0, 3);

      standoutContainer.innerHTML = all.map(c => {
        const sign = Number(c.change) > 0 ? '+' : '';
        return `<span class="change-item">${c.month} · ${c.metric} ${sign}${c.change}${c.unit}</span>`;
      }).join('');
    }
    
    const items = monthlySummaries.map(summary => {
      const changes = summary.topChanges || [];
      const changeItems = changes.map(change => 
        `<span class="change-item">${change.metric} ${change.change}${change.unit}</span>`
      ).join('');
      
      return `
        <div class="monthly-summary-item">
          <div class="month-name">${summary.month}</div>
          <div class="top-changes">${changeItems}</div>
        </div>
      `;
    });
    
    container.innerHTML = items.join('');
  }
  
  /**
   * 상세 탭 렌더링
   */
  renderDetail(roadmap) {
    // 상세 그래프
    this.renderDetailedGraph(roadmap.detailedGraph);
    
    // 사진 비교 탭
    this.renderPhotoComparison();
    
    // 특정일 비교 옵션
    this.renderDateSelector(roadmap.specificDateComparison);
  }

  ensureDetailGraphReady() {
    const root = this._root;
    if (!root) return;

    const isDetailTabActive = root.querySelector('#roadmap-detail-view')?.classList.contains('active') === true;
    const isGraphSubtabActive = root.querySelector('#roadmap-detail-graph-view')?.classList.contains('active') === true;
    if (!isDetailTabActive || !isGraphSubtabActive) return;

    const canvas = root.querySelector('#roadmap-chart');
    if (!canvas) return;

    const wrapper = canvas.closest('.chart-wrapper');
    const wrapperReady = (wrapper?.clientWidth || 0) > 0 && (wrapper?.clientHeight || 0) > 0;
    const needsInit = !this._detailChartInstance;
    const looksUninitialized = canvas.width === 300 && wrapperReady;
    const shouldRebuild = needsInit || !wrapperReady || looksUninitialized;
    if (shouldRebuild) {
      this.renderDetailedGraph(this._roadmap?.detailedGraph);
      return;
    }

    this._detailChartInstance.resize();
    this._detailChartInstance.update('none');
  }
  
  /**
   * 상세 그래프 렌더링
   */
  renderDetailedGraph(graphData) {
    const canvas = this.$('#roadmap-chart');
    const legendEl = this.$('#roadmap-legend-controls');
    const placeholderEl = this.$('#roadmap-data-placeholder');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (typeof Chart === 'undefined') return;

    if (this._detailChartInstance) {
      this._detailChartInstance.destroy();
      this._detailChartInstance = null;
    }

    if (!this.measurements || this.measurements.length < 1) return;

    const labels = this.measurements.map(m => `${m.week}${translate('week')}`);

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
      const color = makeColor(index);
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
        borderColor: color,
        backgroundColor: color + '33',
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

    const isLightMode = document.body.classList.contains('light-mode');
    const tickColor = isLightMode ? '#5c5c8a' : 'rgba(255, 255, 255, 0.6)';
    const gridColor = isLightMode ? 'rgba(200, 200, 235, 0.5)' : 'rgba(255, 255, 255, 0.1)';

    this.ensureTargetLinePluginRegistered();

    const wrapper = canvas.closest('.chart-wrapper') || canvas.parentElement;
    if (wrapper) {
      const container = this.ensureChartWrapperContainer(wrapper);
      let inner = wrapper.querySelector('.chart-inner-container');
      if (!inner) {
        inner = document.createElement('div');
        inner.classList.add('chart-inner-container');
        wrapper.appendChild(inner);
      }

      if (canvas.parentElement !== inner) {
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
    }

    this._detailChartInstance = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10
          }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        scales: {
          x: { ticks: { color: tickColor }, grid: { color: gridColor }, border: { color: gridColor } },
          y: { ticks: { color: tickColor }, grid: { color: gridColor }, border: { color: gridColor } }
        },
        onClick: (event) => {
          const points = this._detailChartInstance.getElementsAtEventForMode(event, 'nearest', { intersect: false }, true);
          if (!points || points.length === 0) return;
          const index = points[0]?.index;
          if (!Number.isFinite(index)) return;
          this._selectedWeekIndex = index;
          this.renderSelectedWeekData(index);
        }
      }
    });

    const wrapperAfter = canvas.closest('.chart-wrapper') || canvas.parentElement;
    if (wrapperAfter) {
      const container = this.ensureChartWrapperContainer(wrapperAfter);
      const inner = wrapperAfter.querySelector('.chart-inner-container') || canvas.parentElement;
      const pointCount = labels.length;
      this.applyDetailZoom(wrapperAfter, inner, pointCount);
      this.ensureDetailZoomControls(container, wrapperAfter, inner, pointCount);
    }

    if (legendEl) {
      this.renderLegendControls(legendEl);
      if (!this._legendBound) {
        this._legendBound = true;
        legendEl.addEventListener('click', (e) => this.handleLegendClick(e), { passive: false });
      }
    }

    if (placeholderEl) {
      placeholderEl.textContent = translate('graphClickPrompt');
    }
  }
  
  /**
   * 사진 비교 렌더링
   */
  renderPhotoComparison() {
    const leftSelect = this.$('#photo-compare-left-select');
    const rightSelect = this.$('#photo-compare-right-select');
    const grid = this.$('#photo-compare-grid');
    const swapBtn = this.$('#photo-compare-swap');
    if (!leftSelect || !rightSelect || !grid) return;

    // Collect dates that have photos
    const datesWithPhotos = this.measurements
      .filter(m => m.photos && typeof m.photos === 'object' && Object.keys(m.photos).length > 0)
      .map(m => m.date)
      .filter(Boolean);

    // Also add all dates (even without photos) for completeness
    const allDates = this.measurements.map(m => m.date).filter(Boolean);
    
    const buildOptions = (dates, selectedVal) => {
      return dates.map(d => {
        const hasPhotos = datesWithPhotos.includes(d);
        const label = hasPhotos ? `📷 ${d}` : d;
        return `<option value="${d}" ${d === selectedVal ? 'selected' : ''}>${label}</option>`;
      }).join('');
    };

    const latest = allDates[allDates.length - 1] || '';
    const first = allDates[0] || '';

    leftSelect.innerHTML = buildOptions(allDates, latest);
    rightSelect.innerHTML = buildOptions(allDates, first);

    const render = () => this._renderPhotoGrid(leftSelect.value, rightSelect.value, grid);
    leftSelect.addEventListener('change', render);
    rightSelect.addEventListener('change', render);
    if (swapBtn) {
      swapBtn.addEventListener('click', () => {
        const tmp = leftSelect.value;
        leftSelect.value = rightSelect.value;
        rightSelect.value = tmp;
        render();
      });
    }

    render();
  }

  /**
   * 사진 비교 그리드 렌더링
   */
  _renderPhotoGrid(leftDate, rightDate, container) {
    if (!container) return;
    const leftM = this.measurements.find(m => m.date === leftDate);
    const rightM = this.measurements.find(m => m.date === rightDate);
    const leftPhotos = leftM?.photos || {};
    const rightPhotos = rightM?.photos || {};

    const CATEGORIES = [
      { key: 'face', icon: 'person', label: translate('photoFace') },
      { key: 'front', icon: 'accessibility_new', label: translate('photoFront') },
      { key: 'side', icon: 'directions_run', label: translate('photoSide') },
      { key: 'back', icon: 'arrow_downward', label: translate('photoBack') },
      { key: 'other', icon: 'photo_camera', label: translate('photoOther') },
    ];

    const hasAnyPhoto = CATEGORIES.some(c => leftPhotos[c.key] || rightPhotos[c.key]);

    if (!hasAnyPhoto) {
      container.innerHTML = `
        <div class="photo-compare-empty">
          ${svgIcon('photo_camera', '', 48)}
          <p>${translate('photoCompareEmpty')}</p>
          <p class="photo-compare-hint">${translate('photoCompareHint')}</p>
        </div>
      `;
      return;
    }

    const rows = CATEGORIES.map(cat => {
      const left = leftPhotos[cat.key];
      const right = rightPhotos[cat.key];
      if (!left && !right) return '';

      const renderCell = (src, date) => {
        if (!src) return `<div class="photo-compare-cell empty"><div class="photo-compare-placeholder">${svgIcon(cat.icon, '', 32)}<span>${translate('noPhoto')}</span></div></div>`;
        return `<div class="photo-compare-cell"><img src="${src}" alt="${cat.label} ${date}" loading="lazy"><span class="photo-compare-date-label">${date}</span></div>`;
      };

      return `
        <div class="photo-compare-row">
          <div class="photo-compare-category">
            ${svgIcon(cat.icon, 'mi-inline', 18)}
            <span>${cat.label}</span>
          </div>
          <div class="photo-compare-pair">
            ${renderCell(left, leftDate)}
            ${renderCell(right, rightDate)}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = rows;
  }
  
  /**
   * 비교 결과 렌더링 (리디자인 - 카드 스타일)
   */
  renderComparisonResults(differences) {
    if (!differences) return '';

    const preferredOrder = [
      'height', 'weight', 'shoulder', 'neck', 'chest', 'underBustCircumference', 'waist', 'hips', 'thigh', 'calf', 'arm',
      'muscleMass', 'bodyFatPercentage', 'estrogenLevel', 'testosteroneLevel', 'libido'
    ];
    const rank = new Map(preferredOrder.map((k, i) => [k, i]));
    const metrics = Object.keys(differences).sort((a, b) => {
      const ra = rank.has(a) ? rank.get(a) : 9999;
      const rb = rank.has(b) ? rank.get(b) : 9999;
      if (ra !== rb) return ra - rb;
      return String(a).localeCompare(String(b));
    });

    const items = metrics.map(metric => {
      const diff = differences[metric];
      const change = parseFloat(diff.change);
      const changeClass = change > 0 ? 'positive' : (change < 0 ? 'negative' : 'neutral');
      const changeSign = change > 0 ? '+' : '';
      const pct = parseFloat(diff.percentChange);
      const bar = Number.isFinite(pct) ? Math.min(100, Math.abs(pct) * 2) : 0;
      const icon = change > 0 ? svgIcon('arrow_upward', 'delta-arrow', 14) : (change < 0 ? svgIcon('arrow_downward', 'delta-arrow', 14) : '');
      
      return `
        <div class="compare-metric-card ${changeClass}">
          <div class="compare-metric-header">
            <span class="compare-metric-name">${this.getMetricName(metric)}</span>
            <span class="compare-metric-unit">${this.getMetricUnit(metric)}</span>
          </div>
          <div class="compare-metric-values">
            <span class="compare-val compare-val--old">${diff.comparison}</span>
            <span class="compare-arrow">${svgIcon('arrow_forward', '', 14)}</span>
            <span class="compare-val compare-val--new">${diff.current}</span>
          </div>
          <div class="compare-metric-delta">
            <div class="compare-delta-bar" style="--bar-w:${bar}%"></div>
            <span class="compare-delta-text">${icon} ${changeSign}${diff.change} (${changeSign}${diff.percentChange}%)</span>
          </div>
        </div>
      `;
    });
    
    return `<div class="compare-metrics-grid">${items.join('')}</div>`;
  }
  
  /**
   * 날짜 선택기 렌더링
   */
  renderDateSelector(dateComparison) {
    const baseSelect = this.$('#roadmap-compare-base-select');
    const targetSelect = this.$('#roadmap-compare-target-select');
    if (!baseSelect || !targetSelect || !dateComparison || !dateComparison.availableDates) return;

    const dates = dateComparison.availableDates;
    const options = dates.map(date => `<option value="${date}">${date}</option>`).join('');
    baseSelect.innerHTML = options;
    targetSelect.innerHTML = '<option value=""></option>' + options;

    const latest = this.measurements[this.measurements.length - 1];
    baseSelect.value = latest?.date || dates[dates.length - 1] || '';

    const prev = this.measurements.length > 1 ? this.measurements[this.measurements.length - 2] : null;
    targetSelect.value = prev?.date || '';

    this.renderSpecificDateComparison(baseSelect.value, targetSelect.value);
  }
  
  /**
   * 특정일 비교 결과 렌더링 (리디자인)
   */
  renderSpecificDateComparison(baseDate, compareDate) {
    const container = this.$('#roadmap-compare-specific');
    if (!container) return;
    if (!baseDate || !compareDate) {
      container.innerHTML = '';
      return;
    }

    const getDateKey = (m) => m?.date || (Number.isFinite(Number(m?.timestamp)) ? timestampToDateString(Number(m.timestamp)) : '');

    const base = this.measurements.find(m => getDateKey(m) === baseDate);
    const compare = this.measurements.find(m => getDateKey(m) === compareDate);
    if (!base || !compare) {
      container.innerHTML = '';
      return;
    }

    const differences = this.calculateDifferences(base, compare);

    // ── Symptom diff ──
    const toSymptomMap = (m) => {
      const map = new Map();
      (Array.isArray(m?.symptoms) ? m.symptoms : []).forEach(s => {
        if (!s?.id) return;
        const sev = Number(s?.severity);
        map.set(s.id, Number.isFinite(sev) ? sev : null);
      });
      return map;
    };

    const renderSymptomDiff = (baseM, compM) => {
      const A = toSymptomMap(baseM);
      const B = toSymptomMap(compM);
      const allKeys = new Set([...A.keys(), ...B.keys()]);
      if (allKeys.size === 0) return '';

      const chips = [];
      allKeys.forEach(k => {
        const name = this.getSymptomName(k);
        const cur = A.get(k);
        const past = B.get(k);
        let cls = 'chip--same';
        let badge = '';
        if (cur != null && past == null) { cls = 'chip--added'; badge = '+'; }
        else if (cur == null && past != null) { cls = 'chip--removed'; badge = '−'; }
        else if (cur !== past) { cls = 'chip--changed'; badge = `${past}→${cur}`; }
        else { badge = cur != null ? `${cur}` : ''; }
        chips.push(`<span class="compare-chip ${cls}">${name}${badge ? ` <em>${badge}</em>` : ''}</span>`);
      });
      return `
        <div class="compare-section-card">
          <h4 class="compare-section-title">${svgIcon('emergency', 'mi-inline', 16)} ${translate('symptoms')}</h4>
          <div class="compare-chip-wrap">${chips.join('')}</div>
        </div>`;
    };

    // ── Medication diff ──
    const toMedicationMap = (m) => {
      const map = new Map();
      (Array.isArray(m?.medications) ? m.medications : []).forEach(x => {
        const id = x?.id || x?.medicationId;
        if (!id) return;
        const unit = x?.unit || '';
        const dose = Number(x?.dose);
        map.set(`${id}__${unit}`, { dose: Number.isFinite(dose) ? dose : null, name: this.getMedicationName(id), unit });
      });
      return map;
    };

    const renderMedicationDiff = (baseM, compM) => {
      const A = toMedicationMap(baseM);
      const B = toMedicationMap(compM);
      const allKeys = new Set([...A.keys(), ...B.keys()]);
      if (allKeys.size === 0) return '';

      const chips = [];
      allKeys.forEach(k => {
        const curVal = A.get(k);
        const pastVal = B.get(k);
        const name = curVal?.name || pastVal?.name || k;
        const unit = curVal?.unit || pastVal?.unit || '';
        let cls = 'chip--same';
        let badge = '';
        if (curVal && !pastVal) { cls = 'chip--added'; badge = `+${curVal.dose || ''}${unit}`; }
        else if (!curVal && pastVal) { cls = 'chip--removed'; badge = '−'; }
        else if (curVal?.dose !== pastVal?.dose) { cls = 'chip--changed'; badge = `${pastVal?.dose || '?'}→${curVal?.dose || '?'}${unit}`; }
        else { badge = curVal?.dose != null ? `${curVal.dose}${unit}` : ''; }
        chips.push(`<span class="compare-chip ${cls}">${name}${badge ? ` <em>${badge}</em>` : ''}</span>`);
      });
      return `
        <div class="compare-section-card">
          <h4 class="compare-section-title">${svgIcon('medication', 'mi-inline', 16)} ${translate('medications')}</h4>
          <div class="compare-chip-wrap">${chips.join('')}</div>
        </div>`;
    };

    container.innerHTML = `
      ${this.renderComparisonResults(differences)}
      ${renderSymptomDiff(base, compare)}
      ${renderMedicationDiff(base, compare)}
    `;
  }
  
  /**
   * 두 측정값의 차이 계산
   */
  calculateDifferences(current, comparison) {
    const differences = {};
    const metrics = [
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
      'estrogenLevel',
      'testosteroneLevel',
      'libido'
    ];
    
    metrics.forEach(metric => {
      const cur = Number(current?.[metric]);
      const cmp = Number(comparison?.[metric]);
      if (!Number.isFinite(cur) || !Number.isFinite(cmp)) return;
      const change = cur - cmp;
      const percentChange = cmp === 0 ? '-' : ((change / cmp) * 100).toFixed(1);
        
        differences[metric] = {
          current: cur,
          comparison: cmp,
          change: change.toFixed(2),
          percentChange
        };
    });
    
    return differences;
  }
  
  // ========================================
  // 4. 이벤트 설정
  // ========================================
  
  /**
   * 탭 전환 설정
   */
  setupTabSwitching() {
    const root = this._root;
    if (!root) return;

    const topSwitcher = root.querySelector('.modal-tab-switcher:not(.roadmap-detail-switcher)');
    const detailSwitcher = root.querySelector('.roadmap-detail-switcher');

    if (topSwitcher) {
      topSwitcher.addEventListener('click', (e) => {
        const btn = e.target.closest('.modal-tab-btn[data-tab]');
        if (!btn) return;
        const tab = btn.dataset.tab;
        topSwitcher.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        root.querySelectorAll('#roadmap-summary-view, #roadmap-detail-view').forEach(v => v.classList.remove('active'));
        const targetView = root.querySelector(`#${tab}-view`);
        if (targetView) targetView.classList.add('active');

        if (tab === 'roadmap-detail') {
          setTimeout(() => {
            this.renderDetailedGraph(this._roadmap?.detailedGraph);
            this.ensureDetailGraphReady();
          }, 50);
        }
      });
    }

    if (detailSwitcher) {
      detailSwitcher.addEventListener('click', (e) => {
        const btn = e.target.closest('.modal-tab-btn[data-subtab]');
        if (!btn) return;
        const tab = btn.dataset.subtab;
        detailSwitcher.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        root.querySelectorAll('#roadmap-detail-graph-view, #roadmap-detail-photo-view, #roadmap-detail-compare-view').forEach(v => v.classList.remove('active'));
        const targetView = root.querySelector(`#${tab}-view`);
        if (targetView) targetView.classList.add('active');

        if (tab === 'roadmap-detail-graph') {
          setTimeout(() => {
            this.renderDetailedGraph(this._roadmap?.detailedGraph);
            this.ensureDetailGraphReady();
          }, 50);
        }
      });
    }
  }
  
  /**
   * 날짜 선택기 설정
   */
  setupDateSelector() {
    const root = this._root;
    if (!root) return;
    const baseSelect = root.querySelector('#roadmap-compare-base-select');
    const targetSelect = root.querySelector('#roadmap-compare-target-select');
    if (!baseSelect || !targetSelect) return;

    const onChange = () => this.renderSpecificDateComparison(baseSelect.value, targetSelect.value);
    baseSelect.addEventListener('change', onChange);
    targetSelect.addEventListener('change', onChange);

    const actions = root.querySelector('.roadmap-compare-actions');
    if (actions) {
      actions.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        e.preventDefault();
        const action = btn.dataset.action;
        const latest = this.measurements[this.measurements.length - 1];
        const prev = this.measurements.length > 1 ? this.measurements[this.measurements.length - 2] : null;
        const first = this.measurements[0];

        if (action === 'set-base-latest') {
          baseSelect.value = latest?.date || baseSelect.value;
        } else if (action === 'set-compare-prev') {
          targetSelect.value = prev?.date || targetSelect.value;
        } else if (action === 'set-compare-first') {
          targetSelect.value = first?.date || targetSelect.value;
        } else if (action === 'swap-dates') {
          const tmp = baseSelect.value;
          baseSelect.value = targetSelect.value || baseSelect.value;
          targetSelect.value = tmp;
        }

        onChange();
      }, { passive: false });
    }
  }

  applyTranslations(root) {
    if (!root) return;
    root.querySelectorAll('[data-lang-key]').forEach(el => {
      const key = el.getAttribute('data-lang-key');
      if (!key) return;
      const t = translate(key);
      if (!t || t === key) return;
      if (el.childElementCount === 0) el.textContent = t;
    });
  }

  ensureTargetLinePluginRegistered() {
    if (typeof Chart === 'undefined') return;
    const pluginId = 'shiftvAverageLines';
    const alreadyRegistered = Chart?.registry?.plugins?.get?.(pluginId);
    if (alreadyRegistered) return;

    Chart.register({
      id: pluginId,
      afterDatasetsDraw(chart) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        const yScale = chart.scales?.y;
        if (!yScale) return;

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
  }

  ensureChartWrapperContainer(wrapper) {
    const parent = wrapper?.parentElement;
    if (!parent) return wrapper;
    if (parent.classList.contains('chart-wrapper-container')) return parent;
    const container = document.createElement('div');
    container.className = 'chart-wrapper-container';
    parent.insertBefore(container, wrapper);
    container.appendChild(wrapper);
    return container;
  }

  applyDetailZoom(wrapper, inner, pointCount) {
    if (!wrapper || !inner || !this._detailChartInstance) return;

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
    this._detailChartInstance.data.datasets.forEach(ds => {
      ds.pointRadius = hideDetails ? 0 : 4;
      ds.pointHoverRadius = hideDetails ? 0 : 6;
    });
    if (this._detailChartInstance.options?.scales?.x?.ticks) {
      this._detailChartInstance.options.scales.x.ticks.display = !hideDetails;
    }
    this._detailChartInstance.update('none');
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

  renderLegendControls(legendEl) {
    if (!legendEl || !this._detailChartInstance) return;

    const scrollPositions = {};
    legendEl.querySelectorAll('.legend-list[data-group]').forEach(list => {
      const key = list.getAttribute('data-group');
      if (key) scrollPositions[key] = list.scrollTop;
    });

    const datasets = this._detailChartInstance.data.datasets.map((d, idx) => ({ dataset: d, index: idx }));
    const groups = {
      metric: datasets.filter(x => x.dataset?._series?.kind === 'metric'),
      symptom: datasets.filter(x => x.dataset?._series?.kind === 'symptom'),
      medication: datasets.filter(x => x.dataset?._series?.kind === 'medication')
    };

    const allVisible = datasets.length > 0 && datasets.every(x => this._detailChartInstance.isDatasetVisible(x.index));
    const toggleAllText = allVisible ? translate('deselectAll') : translate('selectAll');

    const renderButtons = (items) => items.map(({ dataset, index }) => {
      const color = dataset.borderColor;
      const isActive = this._detailChartInstance.isDatasetVisible(index);
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
            <button class="legend-button legend-group-toggle" data-group="metric" data-action="toggle-group" style="background-color: var(--glass-bg); border-color: var(--glass-border); color: var(--text-dim); margin-top: 8px; width: 100%;">${groups.metric.every(({ index }) => this._detailChartInstance.isDatasetVisible(index)) ? translate('deselectAll') : translate('selectAll')}</button>
          </div>
        </div>
        <div class="legend-group-card">
          <h5 class="legend-group-title">${translate('briefingGroupSymptoms')}</h5>
          <div class="legend-list" data-group="symptom">${renderButtons(groups.symptom)}</div>
          <div class="legend-group-toolbar">
            <button class="legend-button legend-group-toggle" data-group="symptom" data-action="toggle-group" style="background-color: var(--glass-bg); border-color: var(--glass-border); color: var(--text-dim); margin-top: 8px; width: 100%;">${groups.symptom.every(({ index }) => this._detailChartInstance.isDatasetVisible(index)) ? translate('deselectAll') : translate('selectAll')}</button>
          </div>
        </div>
        <div class="legend-group-card">
          <h5 class="legend-group-title">${translate('briefingGroupMedications')}</h5>
          <div class="legend-list" data-group="medication">${renderButtons(groups.medication)}</div>
          <div class="legend-group-toolbar">
            <button class="legend-button legend-group-toggle" data-group="medication" data-action="toggle-group" style="background-color: var(--glass-bg); border-color: var(--glass-border); color: var(--text-dim); margin-top: 8px; width: 100%;">${groups.medication.every(({ index }) => this._detailChartInstance.isDatasetVisible(index)) ? translate('deselectAll') : translate('selectAll')}</button>
          </div>
        </div>
      </div>
    `;

    legendEl.querySelectorAll('.legend-list[data-group]').forEach(list => {
      const key = list.getAttribute('data-group');
      const pos = key ? scrollPositions[key] : undefined;
      if (key && typeof pos === 'number') list.scrollTop = pos;
    });
  }

  handleLegendClick(e) {
    const legendEl = e.currentTarget;
    if (!legendEl || !this._detailChartInstance) return;

    const toggleAllBtn = e.target.closest('button[data-action="toggle-all"]');
    if (toggleAllBtn) {
      e.preventDefault();
      const datasets = this._detailChartInstance.data.datasets;
      const isAllVisible = datasets.length > 0 && datasets.every((_, i) => this._detailChartInstance.isDatasetVisible(i));
      datasets.forEach((_, i) => this._detailChartInstance.setDatasetVisibility(i, !isAllVisible));
      this._detailChartInstance.update();
      this.renderLegendControls(legendEl);
      return;
    }

    const toggleGroupBtn = e.target.closest('button[data-action="toggle-group"]');
    if (toggleGroupBtn) {
      e.preventDefault();
      const group = toggleGroupBtn.dataset.group;
      const datasets = this._detailChartInstance.data.datasets;
      const groupIndices = datasets
        .map((ds, idx) => ({ ds, idx }))
        .filter(({ ds }) => ds._series?.kind === group)
        .map(({ idx }) => idx);
      if (groupIndices.length === 0) return;
      const allVisible = groupIndices.every(i => this._detailChartInstance.isDatasetVisible(i));
      groupIndices.forEach(i => {
        this._detailChartInstance.setDatasetVisibility(i, !allVisible);
      });
      this._detailChartInstance.update();
      this.renderLegendControls(legendEl);
      return;
    }

    const btn = e.target.closest('button[data-dataset-index]');
    if (!btn) return;
    e.preventDefault();
    const index = Number(btn.dataset.datasetIndex);
    if (!Number.isFinite(index)) return;
    const isVisible = this._detailChartInstance.isDatasetVisible(index);
    this._detailChartInstance.setDatasetVisibility(index, !isVisible);
    this._detailChartInstance.update();
    this.renderLegendControls(legendEl);
  }

  renderSelectedWeekData(weekIndex) {
    const titleEl = this.$('#roadmap-selected-week-data-title');
    const contentEl = this.$('#roadmap-selected-week-data-content');
    const placeholderEl = this.$('#roadmap-data-placeholder');
    if (!titleEl || !contentEl || !placeholderEl) return;

    const weekData = this.measurements?.[weekIndex];
    if (!weekData) return;

    titleEl.textContent = translate('selectedWeekDataTitle', { week: weekData.week });

    const visible = this._detailChartInstance
      ? this._detailChartInstance.data.datasets
        .map((d, i) => ({ d, i }))
        .filter(x => this._detailChartInstance.isDatasetVisible(x.i))
      : [];

    const items = visible.map(({ d }) => {
      const def = d?._series;
      if (!def) return null;
      let value = null;
      if (def.kind === 'metric') {
        value = weekData?.[def.key];
      } else if (def.kind === 'symptom') {
        const found = Array.isArray(weekData?.symptoms) ? weekData.symptoms.find(s => s?.id === def.id) : null;
        value = found?.severity;
      } else if (def.kind === 'medication') {
        const found = Array.isArray(weekData?.medications)
          ? weekData.medications.find(x => (x?.id || x?.medicationId) === def.id && (x?.unit || '') === (def.unit || ''))
          : null;
        value = found?.dose;
      }
      if (value === null || value === undefined || value === '') return null;
      return { label: d.label, value };
    }).filter(Boolean);

    contentEl.innerHTML = items.map(it => `
      <div class="data-item">
        <span class="data-item-label">${it.label}</span>
        <span class="data-item-value">${it.value}</span>
      </div>
    `).join('');

    contentEl.style.display = items.length ? 'grid' : 'none';
    placeholderEl.style.display = items.length ? 'none' : 'block';
    if (!items.length) placeholderEl.textContent = translate('graphClickPrompt');
  }

  getMetricName(key) {
    const t = translate(key);
    if (t && t !== key) return t.split('(')[0].trim();
    return key;
  }

  getMetricUnit(key) {
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
    return units[key] || '';
  }

  getMedicationName(id) {
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

    const record = this._medicationLabelById.get(id);
    if (!record) return id;

    if (record.ko || record.en || record.ja) {
      return (lang === 'ja' ? record.ja : lang === 'en' ? record.en : record.ko) || record.ko || record.en || record.ja || id;
    }

    const names = record.names;
    if (!Array.isArray(names) || names.length === 0) return id;
    if (lang === 'ko') return names.find(n => /[가-힣]/.test(n)) || names[0];
    if (lang === 'ja') return names.find(n => /[ぁ-んァ-ン一-龯]/.test(n)) || names.find(n => /[A-Za-z]/.test(n)) || names[0];
    return names.find(n => /[A-Za-z]/.test(n)) || names[0];
  }

  getSymptomName(id) {
    if (!this._symptomLabelById) {
      const map = new Map();
      Object.values(SYMPTOM_DATABASE || {}).forEach(group => {
        const symptoms = group?.symptoms;
        if (!Array.isArray(symptoms)) return;
        symptoms.forEach(s => {
          if (!s?.id) return;
          map.set(s.id, { ko: s.ko, en: s.en, ja: s.ja });
        });
      });
      this._symptomLabelById = map;
    }

    const record = this._symptomLabelById.get(id);
    if (!record) return id;
    const lang = getCurrentLanguage();
    return (lang === 'ja' ? record.ja : lang === 'en' ? record.en : record.ko) || record.ko || record.en || record.ja || id;
  }
  
  // ========================================
  // 5. 유틸리티
  // ========================================
  
  getMilestoneIcon(type) {
    const icons = {
      start: svgIcon('location_on', 'mi-sm'),
      achievement: svgIcon('celebration', 'mi-sm mi-success'),
      current: '●',
      prediction: svgIcon('auto_awesome', 'mi-sm'),
      milestone: svgIcon('target', 'mi-sm'),
      warning: svgIcon('warning', 'mi-sm mi-warning'),
      normal: '○'
    };
    return icons[type] || '○';
  }
}

// ========================================
// 6. Export
// ========================================

export default ChangeRoadmapModal;
