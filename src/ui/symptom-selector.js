/**
 * Symptom Selector UI
 * 
 * 사용자가 증상을 선택하고 심각도를 표시할 수 있는 UI 컴포넌트
 */

import { SYMPTOM_DATABASE } from '../doctor-module/data/symptom-database.js';
import { translateUI, setCurrentLanguage, translate } from '../translations.js';

// 카테고리 번역 맵
const SYMPTOM_CATEGORY_TRANSLATIONS = {
  MENTAL_NEUROLOGICAL: {
    ko: '정신 / 신경계',
    en: 'Mental / Neurological',
    ja: '精神 / 神経系'
  },
  SKIN_HAIR: {
    ko: '피부 / 모발',
    en: 'Skin / Hair',
    ja: '皮膚 / 毛髪'
  },
  SYSTEMIC_BODY_SHAPE: {
    ko: '전신 / 체형',
    en: 'Systemic / Body Shape',
    ja: '全身 / 体型'
  },
  MUSCULOSKELETAL: {
    ko: '근골격계',
    en: 'Musculoskeletal',
    ja: '筋骨格系'
  },
  DIGESTIVE_METABOLIC: {
    ko: '소화 / 대사',
    en: 'Digestive / Metabolic',
    ja: '消化 / 代謝'
  },
  BREAST_CHEST: {
    ko: '가슴 / 유방',
    en: 'Breast / Chest',
    ja: '胸 / 乳房'
  },
  SEXUAL_GENITAL: {
    ko: '성기능 / 생식기',
    en: 'Sexual / Genital',
    ja: '性機能 / 生殖器'
  },
  INTERNAL_CIRCULATORY: {
    ko: '내장 / 순환기 (※ 위험 신호)',
    en: 'Internal / Circulatory (※ Danger Signs)',
    ja: '内臓 / 循環器 (※ 危険信号)'
  }
};

// ========================================
// 1. 증상 선택기 클래스
// ========================================

export class SymptomSelector {
  constructor(containerId, mode = 'mtf', language = 'ko') {
    this.container = document.getElementById(containerId);
    this.mode = mode;
    this.language = language;
    this.symptoms = [];
    this.symptomCounter = 0;
    
    if (!this.container) {
      console.error(`Container with id "${containerId}" not found.`);
      return;
    }
    
    this.init();
  }
  
  // ========================================
  // 2. 초기화
  // ========================================
  
  init() {
    this.renderEmptyState();
    this.setupAddButton();
  }
  
  /**
   * 빈 상태 렌더링
   */
  renderEmptyState() {
    if (this.symptoms.length === 0) {
      this.container.innerHTML = `
        <div class="symptoms-empty-state">
          <div class="symptoms-empty-state-icon"><span class="material-symbols-outlined mi-xl">stethoscope</span></div>
          <p data-lang-key="symptomsEmptyState">증상이 없으면 추가 버튼을 눌러 증상을 선택하세요.</p>
        </div>
      `;
    } else {
      this.render();
    }
  }
  
  /**
   * 추가 버튼 설정
   */
  setupAddButton() {
    const addBtn = document.getElementById('add-symptom-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.addSymptom());
    }
  }
  
  // ========================================
  // 3. 증상 추가
  // ========================================
  
  /**
   * 새로운 증상 항목 추가
   */
  addSymptom(symptomId = '', severity = 0) {
    const id = ++this.symptomCounter;
    
    this.symptoms.push({
      id,
      symptomId,
      severity
    });
    
    this.render();
    
    // 새로 추가된 항목에 포커스
    setTimeout(() => {
      const newSelect = document.querySelector(`#symptom-select-${id}`);
      if (newSelect) {
        newSelect.focus();
      }
    }, 100);
  }
  
  /**
   * 증상 제거
   */
  removeSymptom(id) {
    this.symptoms = this.symptoms.filter(s => s.id !== id);
    this.render();
  }
  
  /**
   * 증상 업데이트
   */
  updateSymptom(id, symptomId, severity) {
    const symptom = this.symptoms.find(s => s.id === id);
    if (symptom) {
      if (symptomId !== undefined) symptom.symptomId = symptomId;
      if (severity !== undefined) symptom.severity = severity;
    }
  }
  
  // ========================================
  // 4. 렌더링
  // ========================================
  
  /**
   * 전체 증상 목록 렌더링
   */
  render() {
    if (this.symptoms.length === 0) {
      this.renderEmptyState();
      // 번역 적용
      if (this.container) {
        setCurrentLanguage(this.language);
        translateUI(this.container);
      }
      return;
    }
    
    this.container.innerHTML = this.symptoms.map(symptom => 
      this.renderSymptomItem(symptom)
    ).join('');
    
    // 번역 적용
    setCurrentLanguage(this.language);
    translateUI(this.container);
    
    // 이벤트 리스너 설정
    this.symptoms.forEach(symptom => {
      this.setupSymptomListeners(symptom.id);
    });
  }
  
  /**
   * 개별 증상 항목 렌더링
   */
  renderSymptomItem(symptom) {
    return `
      <div class="symptom-item" data-symptom-id="${symptom.id}">
        ${this.renderSymptomSelect(symptom.id, symptom.symptomId)}
        ${this.renderSeveritySelector(symptom.id, symptom.severity)}
        <button type="button" class="remove-symptom-btn" data-remove-id="${symptom.id}">
          <span class="material-symbols-outlined mi-sm">close</span>
        </button>
      </div>
    `;
  }
  
  /**
   * 증상 선택 드롭다운 렌더링
   */
  renderSymptomSelect(id, selectedSymptomId) {
    const options = this.getSymptomOptions(selectedSymptomId);
    
    // 언어별 플레이스홀더 텍스트
    const placeholderText = {
      ko: '-- 증상 선택 --',
      en: '-- Select Symptom --',
      ja: '-- 症状選択 --'
    }[this.language] || '-- 증상 선택 --';
    
    return `
      <select id="symptom-select-${id}" class="symptom-select" data-symptom-select="${id}">
        <option value="">${placeholderText}</option>
        ${options}
      </select>
    `;
  }
  
  /**
   * 증상 옵션 HTML 생성
   */
  getSymptomOptions(selectedSymptomId) {
    let html = '';
    
    // 모드별 증상 필터링
    const relevantCategories = this.getRelevantCategories();
    
    relevantCategories.forEach(categoryKey => {
      const category = SYMPTOM_DATABASE[categoryKey];
      if (!category) return;
      
      const categoryLabel = SYMPTOM_CATEGORY_TRANSLATIONS[categoryKey]?.[this.language] || category.category;
      html += `<optgroup label="${categoryLabel}">`;
      
      category.symptoms.forEach(symptom => {
        const selected = symptom.id === selectedSymptomId ? 'selected' : '';
        // 현재 언어에 맞는 라벨 선택
        const label = symptom[this.language] || symptom.ko;
        html += `<option value="${symptom.id}" ${selected}>${label}</option>`;
      });
      
      html += `</optgroup>`;
    });
    
    return html;
  }
  
  /**
   * 모드별 관련 카테고리 반환
   */
  getRelevantCategories() {
    // 모든 카테고리 표시 (MTF/FTM 공통 + 특화)
    return Object.keys(SYMPTOM_DATABASE);
  }
  
  /**
   * 심각도 선택기 렌더링
   */
  renderSeveritySelector(id, severity) {
    return `
      <div class="severity-container">
        <span class="severity-label" data-lang-key="severityLabel">심각도</span>
        <div class="severity-stars" data-severity-selector="${id}">
          ${this.renderStars(id, severity)}
        </div>
      </div>
    `;
  }
  
  /**
   * 별점 렌더링
   */
  renderStars(id, severity) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      const filled = i <= severity ? 'filled' : 'empty';
      html += `
        <span class="severity-star ${filled}" 
              data-star="${id}" 
              data-value="${i}">
          <span class="material-symbols-outlined mi-sm${i <= severity ? ' mi-filled' : ''}">${i <= severity ? 'star' : 'star_border'}</span>
        </span>
      `;
    }
    return html;
  }
  
  // ========================================
  // 5. 이벤트 리스너
  // ========================================
  
  /**
   * 증상 항목의 이벤트 리스너 설정
   */
  setupSymptomListeners(id) {
    // 증상 선택 드롭다운
    const select = document.querySelector(`#symptom-select-${id}`);
    if (select) {
      select.addEventListener('change', (e) => {
        this.updateSymptom(id, e.target.value, undefined);
      });
    }
    
    // 심각도 별점
    const stars = document.querySelectorAll(`[data-star="${id}"]`);
    stars.forEach(star => {
      star.addEventListener('click', () => {
        const value = parseInt(star.dataset.value);
        this.updateSymptom(id, undefined, value);
        this.updateStars(id, value);
      });
    });
    
    // 삭제 버튼
    const removeBtn = document.querySelector(`[data-remove-id="${id}"]`);
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        this.removeSymptom(id);
      });
    }
  }
  
  /**
   * 별점 업데이트
   */
  updateStars(id, severity) {
    const stars = document.querySelectorAll(`[data-star="${id}"]`);
    stars.forEach((star, index) => {
      const value = index + 1;
      if (value <= severity) {
        star.classList.remove('empty');
        star.classList.add('filled');
        star.innerHTML = '<span class="material-symbols-outlined mi-sm mi-filled">star</span>';
      } else {
        star.classList.remove('filled');
        star.classList.add('empty');
        star.innerHTML = '<span class="material-symbols-outlined mi-sm">star_border</span>';
      }
    });
  }
  
  // ========================================
  // 6. 데이터 가져오기/설정
  // ========================================
  
  /**
   * 현재 선택된 증상 데이터 가져오기
   */
  getSymptoms() {
    return this.symptoms
      .filter(s => s.symptomId && s.severity > 0)
      .map(s => ({
        id: s.symptomId,
        severity: s.severity
      }));
  }
  
  /**
   * 증상 데이터 설정 (수정 시 사용)
   */
  setSymptoms(symptoms) {
    this.symptoms = [];
    this.symptomCounter = 0;
    
    if (symptoms && symptoms.length > 0) {
      symptoms.forEach(symptom => {
        this.addSymptom(symptom.id, symptom.severity);
      });
    } else {
      this.renderEmptyState();
    }
  }
  
  /**
   * 초기화
   */
  reset() {
    this.symptoms = [];
    this.symptomCounter = 0;
    this.renderEmptyState();
  }
  
  /**
   * 모드 변경
   */
  setMode(mode) {
    this.mode = mode;
    this.render();
  }
  
  /**
   * 언어 변경
   */
  setLanguage(language) {
    this.language = language;
    setCurrentLanguage(language);
    this.render();
  }
}

// ========================================
// 7. Export
// ========================================

export default SymptomSelector;
