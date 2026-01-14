/**
 * 🗺️ Change Roadmap Modal Renderer
 * 
 * Change Roadmap 모달의 요약/상세 탭 렌더링
 */

import { DoctorEngine } from '../doctor-module/core/doctor-engine.js';
import { translate } from '../translations.js';

// ========================================
// 1. Change Roadmap Modal 클래스
// ========================================

export class ChangeRoadmapModal {
  constructor(measurements, userSettings) {
    this.measurements = measurements;
    this.userSettings = userSettings;
    this.doctorEngine = new DoctorEngine(measurements, userSettings);
  }
  
  // ========================================
  // 2. 모달 열기
  // ========================================
  
  /**
   * Change Roadmap 모달 열기
   */
  open() {
    const roadmap = this.doctorEngine.generateRoadmap();
    
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
    
    if (!modalOverlay || !modalSheet || !modalTitle || !modalContent) {
      console.error('Modal elements not found!', { modalOverlay, modalSheet, modalTitle, modalContent });
      return;
    }
    
    // 1. 먼저 템플릿 내용을 모달에 복사
    modalTitle.textContent = translate('roadmapModalTitle') || '변화 로드맵';
    modalContent.innerHTML = template.innerHTML;
    
    // 2. 이제 DOM 요소들이 존재하므로 렌더링
    this.render(roadmap);
    
    // 3. 탭 전환 이벤트 설정
    this.setupTabSwitching();
    
    // 4. 날짜 선택 이벤트 설정
    this.setupDateSelector();
    
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
    const fill = document.getElementById('roadmap-progress-fill');
    const currentWeek = document.getElementById('roadmap-current-week');
    const targetWeek = document.getElementById('roadmap-target-week');
    const achievementRate = document.getElementById('roadmap-achievement-rate');
    const achievementCount = document.getElementById('roadmap-achievement-count');
    
    if (fill && progress) {
      const percentage = parseFloat(progress.progress) || 0;
      fill.style.width = `${percentage}%`;
      
      // 주간 변화 틱 렌더링
      this.renderWeeklyTicks(progress.weeklyChanges, fill);
      
      if (currentWeek) currentWeek.textContent = `Week ${progress.currentWeek || 0}`;
      if (targetWeek) targetWeek.textContent = `Week ${progress.estimatedTargetWeek || 24}`;
      if (achievementRate) achievementRate.textContent = `${percentage.toFixed(0)}%`;
      if (achievementCount) {
        const achieved = progress.achievedCount || 0;
        const total = progress.totalCount || 0;
        achievementCount.textContent = `(${achieved}/${total} 목표)`;
      }
    }
  }
  
  /**
   * 주간 변화 틱 렌더링
   */
  renderWeeklyTicks(weeklyChanges, container) {
    if (!weeklyChanges || weeklyChanges.length === 0) return;
    
    const ticks = weeklyChanges.map((change, index) => {
      const position = ((index + 1) / (weeklyChanges.length + 1)) * 100;
      const className = change.positive ? 'positive' : 'negative';
      
      return `<div class="weekly-tick ${className}" style="left: ${position}%"></div>`;
    }).join('');
    
    container.innerHTML = ticks;
  }
  
  /**
   * 타임라인 렌더링
   */
  renderTimeline(timeline) {
    const container = document.getElementById('roadmap-timeline-container');
    if (!container || !timeline || timeline.length === 0) return;
    
    const items = timeline.map(milestone => {
      const type = milestone.type || 'normal';
      const icon = this.getMilestoneIcon(type);
      
      return `
        <div class="timeline-item ${type}">
          <div class="timeline-week">${icon} ${milestone.title || `Week ${milestone.week}`}</div>
          <div class="timeline-date">${milestone.date || ''}</div>
          <div class="timeline-content">
            ${milestone.description || ''}
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
    const container = document.getElementById('roadmap-monthly-summary-container');
    if (!container || !monthlySummaries || monthlySummaries.length === 0) return;
    
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
    
    // 변화 비교
    this.renderChangeComparison(roadmap.changeComparison);
    
    // 특정일 비교 옵션
    this.renderDateSelector(roadmap.specificDateComparison);
  }
  
  /**
   * 상세 그래프 렌더링
   */
  renderDetailedGraph(graphData) {
    // Chart.js를 사용한 그래프 렌더링
    // 기존 script.js의 그래프 로직과 통합 필요
  }
  
  /**
   * 변화 비교 렌더링
   */
  renderChangeComparison(comparison) {
    const previousContainer = document.getElementById('roadmap-compare-previous');
    const firstContainer = document.getElementById('roadmap-compare-first');
    
    if (previousContainer && comparison.withPreviousWeek) {
      previousContainer.innerHTML = this.renderComparisonResults(comparison.withPreviousWeek.differences);
    }
    
    if (firstContainer && comparison.withFirstMeasurement) {
      firstContainer.innerHTML = this.renderComparisonResults(comparison.withFirstMeasurement.differences);
    }
  }
  
  /**
   * 비교 결과 렌더링
   */
  renderComparisonResults(differences) {
    if (!differences) return '';
    
    const items = Object.keys(differences).map(metric => {
      const diff = differences[metric];
      const change = parseFloat(diff.change);
      const changeClass = change > 0 ? 'positive' : (change < 0 ? 'negative' : '');
      const changeSign = change > 0 ? '+' : '';
      
      return `
        <div class="comparison-result-item">
          <div class="metric-name">${this.getMetricName(metric)}</div>
          <div class="comparison-values">
            <span>${diff.comparison} ${this.getMetricUnit(metric)}</span>
            <span>→</span>
            <span>${diff.current} ${this.getMetricUnit(metric)}</span>
          </div>
          <div class="comparison-change ${changeClass}">
            ${changeSign}${diff.change} ${this.getMetricUnit(metric)} (${changeSign}${diff.percentChange}%)
          </div>
        </div>
      `;
    });
    
    return items.join('');
  }
  
  /**
   * 날짜 선택기 렌더링
   */
  renderDateSelector(dateComparison) {
    const select = document.getElementById('roadmap-compare-date-select');
    if (!select || !dateComparison || !dateComparison.availableDates) return;
    
    const options = dateComparison.availableDates.map(date => 
      `<option value="${date}">${date}</option>`
    ).join('');
    
    select.innerHTML = '<option value="">-- 날짜 선택 --</option>' + options;
  }
  
  /**
   * 특정일 비교 결과 렌더링
   */
  renderSpecificDateComparison(selectedDate) {
    if (!selectedDate) return;
    
    // 선택된 날짜와 현재 비교
    const selectedMeasurement = this.measurements.find(m => m.date === selectedDate);
    const latestMeasurement = this.measurements[this.measurements.length - 1];
    
    if (!selectedMeasurement || !latestMeasurement) return;
    
    const differences = this.calculateDifferences(latestMeasurement, selectedMeasurement);
    const container = document.getElementById('roadmap-compare-specific');
    
    if (container) {
      container.innerHTML = this.renderComparisonResults(differences);
    }
  }
  
  /**
   * 두 측정값의 차이 계산
   */
  calculateDifferences(current, comparison) {
    const differences = {};
    const metrics = ['weight', 'waist', 'hips', 'chest', 'shoulder', 'thigh', 'arm', 'muscleMass', 'bodyFatPercentage'];
    
    metrics.forEach(metric => {
      if (current[metric] && comparison[metric]) {
        const change = current[metric] - comparison[metric];
        const percentChange = ((change / comparison[metric]) * 100).toFixed(1);
        
        differences[metric] = {
          current: current[metric],
          comparison: comparison[metric],
          change: change.toFixed(2),
          percentChange
        };
      }
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
    const tabButtons = document.querySelectorAll('[data-tab^="roadmap-"]');
    const tabViews = document.querySelectorAll('#roadmap-summary-view, #roadmap-detail-view');
    
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // 버튼 활성화
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 뷰 전환
        tabViews.forEach(view => view.classList.remove('active'));
        const targetView = document.getElementById(`${tab}-view`);
        if (targetView) {
          targetView.classList.add('active');
        }
      });
    });
  }
  
  /**
   * 날짜 선택기 설정
   */
  setupDateSelector() {
    const select = document.getElementById('roadmap-compare-date-select');
    if (select) {
      select.addEventListener('change', (e) => {
        const selectedDate = e.target.value;
        if (selectedDate) {
          this.renderSpecificDateComparison(selectedDate);
        } else {
          const container = document.getElementById('roadmap-compare-specific');
          if (container) {
            container.innerHTML = '';
          }
        }
      });
    }
  }
  
  // ========================================
  // 5. 유틸리티
  // ========================================
  
  getMilestoneIcon(type) {
    const icons = {
      start: '📍',
      achievement: '🎉',
      current: '●',
      prediction: '✨',
      normal: '○'
    };
    return icons[type] || '○';
  }
  
  getMetricName(metric) {
    const names = {
      weight: '체중',
      waist: '허리',
      hips: '엉덩이',
      chest: '가슴',
      shoulder: '어깨',
      thigh: '허벅지',
      arm: '팔뚝',
      muscleMass: '근육량',
      bodyFatPercentage: '체지방률'
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
      bodyFatPercentage: '%'
    };
    return units[metric] || '';
  }
}

// ========================================
// 6. Export
// ========================================

export default ChangeRoadmapModal;
