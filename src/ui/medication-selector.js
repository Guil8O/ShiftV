import { svgIcon } from './icon-paths.js';
import {
  ESTROGENS,
  PROGESTOGENS,
  ANTI_ANDROGENS,
  TESTOSTERONE,
  SERM_AND_AI,
  ANABOLIC_STEROIDS,
  FAT_LOSS_AGENTS,
  HAIR_LOSS_TREATMENTS,
  SUPPLEMENTS
} from '../doctor-module/data/medication-database.js';

function t(key, language) {
  const dict = {
    ko: {
      selectPlaceholder: '-- 약물 선택 --',
      emptyState: '추가 버튼을 눌러 약물을 선택하세요.',
      dosePlaceholder: '용량',
      rootHormone: '호르몬',
      estrogen: '에스트로겐',
      progestogen: '프로게스토겐',
      antiAndrogen: '항안드로겐',
      testosterone: '테스토스테론',
      oral: '경구',
      transdermal: '경피',
      injectable: '주사',
      longActing: '장기',
      mediumActing: '중기',
      topical: '국소',
      serm: 'SERM',
      ai: 'AI',
      hairLoss: '탈모',
      fatLoss: '다이어트',
      supplement: '보조제',
      aas: 'AAS',
      bulking: '벌킹',
      cutting: '컷팅',
      advanced: '고급'
    },
    en: {
      selectPlaceholder: '-- Select medication --',
      emptyState: 'Press Add to select a medication.',
      dosePlaceholder: 'Dose',
      rootHormone: 'Hormone',
      estrogen: 'Estrogen',
      progestogen: 'Progestogen',
      antiAndrogen: 'Anti-androgen',
      testosterone: 'Testosterone',
      oral: 'Oral',
      transdermal: 'Transdermal',
      injectable: 'Injection',
      longActing: 'Long-acting',
      mediumActing: 'Medium-acting',
      topical: 'Topical',
      serm: 'SERM',
      ai: 'AI',
      hairLoss: 'Hair Loss',
      fatLoss: 'Fat Loss',
      supplement: 'Supplement',
      aas: 'AAS',
      bulking: 'Bulking',
      cutting: 'Cutting',
      advanced: 'Advanced'
    },
    ja: {
      selectPlaceholder: '-- 薬を選択 --',
      emptyState: '追加ボタンを押して薬を選択してください。',
      dosePlaceholder: '用量',
      rootHormone: 'ホルモン',
      estrogen: 'エストロゲン',
      progestogen: 'プロゲストーゲン',
      antiAndrogen: '抗アンドロゲン',
      testosterone: 'テストステロン',
      oral: '経口',
      transdermal: '経皮',
      injectable: '注射',
      longActing: '長期',
      mediumActing: '中期',
      topical: '外用',
      serm: 'SERM',
      ai: 'AI',
      hairLoss: '脱毛',
      fatLoss: '減量',
      supplement: 'サプリ',
      aas: 'AAS',
      bulking: 'バルク',
      cutting: 'カット',
      advanced: '上級'
    }
  };

  const lang = dict[language] ? language : 'ko';
  return dict[lang][key] || dict.ko[key] || key;
}

function pickDisplayName(names, language) {
  if (!Array.isArray(names) || names.length === 0) return '';

  // 현재 언어에 맞는 이름 선택
  const mappedLang = language;

  if (mappedLang === 'ko') {
    return names.find(n => /[가-힣]/.test(n)) || names[0];
  }
  if (mappedLang === 'ja') {
    return names.find(n => /[ぁ-んァ-ン一-龯]/.test(n)) || names.find(n => /[A-Za-z]/.test(n)) || names[0];
  }
  return names.find(n => /[A-Za-z]/.test(n)) || names[0];
}

function groupLabel(group, language) {
  const root = t('rootHormone', language);
  if (group === 'estrogen_oral') return `${root}-${t('estrogen', language)}-${t('oral', language)}`;
  if (group === 'estrogen_transdermal') return `${root}-${t('estrogen', language)}-${t('transdermal', language)}`;
  if (group === 'estrogen_injectable') return `${root}-${t('estrogen', language)}-${t('injectable', language)}`;
  if (group === 'progestogen') return `${root}-${t('progestogen', language)}`;
  if (group === 'anti_androgen') return `${root}-${t('antiAndrogen', language)}`;
  if (group === 'testosterone_long') return `${root}-${t('testosterone', language)}-${t('longActing', language)}`;
  if (group === 'testosterone_medium') return `${root}-${t('testosterone', language)}-${t('mediumActing', language)}`;
  if (group === 'testosterone_topical') return `${root}-${t('testosterone', language)}-${t('topical', language)}`;
  if (group === 'serm') return `${root}-${t('serm', language)}`;
  if (group === 'ai') return `${root}-${t('ai', language)}`;
  if (group === 'hair_loss') return `Care-${t('hairLoss', language)}`;
  if (group === 'fat_loss') return `Care-${t('fatLoss', language)}`;
  if (group === 'supplement') return `Care-${t('supplement', language)}`;
  if (group === 'aas_bulking') return `Advanced-${t('aas', language)}-${t('bulking', language)}`;
  if (group === 'aas_cutting') return `Advanced-${t('aas', language)}-${t('cutting', language)}`;
  if (group === 'aas_advanced') return `Advanced-${t('aas', language)}-${t('advanced', language)}`;
  return group;
}

function buildMedicationGroups(mode) {
  const groups = [];

  const addGroup = (group, items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    groups.push({ group, items });
  };

  if (mode !== 'ftm') {
    addGroup('estrogen_oral', ESTROGENS.oral);
    addGroup('estrogen_transdermal', ESTROGENS.transdermal);
    addGroup('estrogen_injectable', ESTROGENS.injectable);
    addGroup('progestogen', PROGESTOGENS);
    addGroup('anti_androgen', ANTI_ANDROGENS);
  }

  if (mode !== 'mtf') {
    addGroup('testosterone_long', TESTOSTERONE.longActing);
    addGroup('testosterone_medium', TESTOSTERONE.mediumActing);
    addGroup('testosterone_topical', TESTOSTERONE.topical);
    addGroup('serm', SERM_AND_AI?.serm || []);
    addGroup('ai', SERM_AND_AI?.ai || []);
  }

  if (mode === 'mtf') {
    addGroup('serm', SERM_AND_AI?.serm || []);
    addGroup('ai', SERM_AND_AI?.ai || []);
  }

  addGroup('hair_loss', HAIR_LOSS_TREATMENTS || []);
  addGroup('fat_loss', FAT_LOSS_AGENTS || []);
  addGroup('supplement', SUPPLEMENTS || []);

  addGroup('aas_bulking', ANABOLIC_STEROIDS?.bulking || []);
  addGroup('aas_cutting', ANABOLIC_STEROIDS?.cutting || []);
  addGroup('aas_advanced', ANABOLIC_STEROIDS?.advanced || []);

  return groups;
}

export class MedicationSelector {
  constructor(containerId, mode = 'mtf', language = 'ko') {
    this.container = document.getElementById(containerId);
    this.mode = mode;
    this.language = language;
    this.medications = [];
    this.counter = 0;

    if (!this.container) {
      console.error(`Container with id "${containerId}" not found.`);
      return;
    }

    this.init();
  }

  init() {
    this.renderEmptyState();
    this.setupAddButton();
  }

  setupAddButton() {
    const addBtn = document.getElementById('add-medication-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.addMedication());
    }
  }

  renderEmptyState() {
    if (this.medications.length === 0) {
      this.container.innerHTML = `
        <div class="medications-empty-state">
          <div class="medications-empty-state-icon">${svgIcon('medication', 'mi-xl')}</div>
          <p>${t('emptyState', this.language)}</p>
        </div>
      `;
    } else {
      this.render();
    }
  }

  addMedication(medicationId = '', dose = '', unit = 'mg') {
    const id = ++this.counter;

    this.medications.push({
      id,
      medicationId,
      dose,
      unit
    });

    this.render();

    setTimeout(() => {
      const newSelect = document.querySelector(`#medication-select-${id}`);
      if (newSelect) newSelect.focus();
    }, 100);
  }

  removeMedication(id) {
    this.medications = this.medications.filter(m => m.id !== id);
    this.render();
  }

  updateMedication(id, patch) {
    const med = this.medications.find(m => m.id === id);
    if (!med) return;
    Object.assign(med, patch);
  }

  render() {
    if (this.medications.length === 0) {
      this.renderEmptyState();
      return;
    }

    this.container.innerHTML = this.medications.map(m => this.renderItem(m)).join('');

    this.medications.forEach(m => this.setupItemListeners(m.id));
  }

  renderItem(med) {
    return `
      <div class="medication-item" data-medication-row="${med.id}">
        ${this.renderSelect(med.id, med.medicationId)}
        <input
          type="number"
          class="medication-dose-input"
          id="medication-dose-${med.id}"
          data-medication-dose="${med.id}"
          step="0.01"
          min="0"
          placeholder="${t('dosePlaceholder', this.language)}"
          value="${med.dose ?? ''}"
        />
        ${this.renderUnitSelect(med.id, med.unit)}
        <button type="button" class="remove-medication-btn" data-remove-medication="${med.id}">${svgIcon('close', 'mi-sm')}</button>
      </div>
    `;
  }

  renderSelect(id, selectedMedicationId) {
    return `
      <select id="medication-select-${id}" class="medication-select" data-medication-select="${id}">
        <option value="">${t('selectPlaceholder', this.language)}</option>
        ${this.getMedicationOptions(selectedMedicationId)}
      </select>
    `;
  }

  renderUnitSelect(id, selectedUnit) {
    const units = ['mg', 'mcg', 'IU', 'mL', 'pump'];
    const options = units
      .map(u => `<option value="${u}" ${u === selectedUnit ? 'selected' : ''}>${u}</option>`)
      .join('');
    return `
      <select class="medication-unit-select" id="medication-unit-${id}" data-medication-unit="${id}">
        ${options}
      </select>
    `;
  }

  getMedicationOptions(selectedMedicationId) {
    const groups = buildMedicationGroups(this.mode);

    let html = '';
    groups.forEach(group => {
      const label = groupLabel(group.group, this.language);
      html += `<optgroup label="${label}">`;
      group.items.forEach(item => {
        const selected = item.id === selectedMedicationId ? 'selected' : '';
        const name = pickDisplayName(item.names, this.language);
        const optionLabel = `${label}-${name}`;
        html += `<option value="${item.id}" ${selected}>${optionLabel}</option>`;
      });
      html += `</optgroup>`;
    });

    return html;
  }

  setupItemListeners(id) {
    const select = document.querySelector(`#medication-select-${id}`);
    if (select) {
      select.addEventListener('change', e => {
        this.updateMedication(id, { medicationId: e.target.value });
      });
    }

    const doseInput = document.querySelector(`#medication-dose-${id}`);
    if (doseInput) {
      doseInput.addEventListener('input', e => {
        this.updateMedication(id, { dose: e.target.value });
      });
    }

    const unitSelect = document.querySelector(`#medication-unit-${id}`);
    if (unitSelect) {
      unitSelect.addEventListener('change', e => {
        this.updateMedication(id, { unit: e.target.value });
      });
    }

    const removeBtn = document.querySelector(`[data-remove-medication="${id}"]`);
    if (removeBtn) {
      removeBtn.addEventListener('click', () => this.removeMedication(id));
    }
  }

  getMedications() {
    return this.medications
      .filter(m => m.medicationId)
      .map(m => ({
        id: m.medicationId,
        dose: m.dose === '' || m.dose === null || m.dose === undefined ? null : parseFloat(m.dose),
        unit: m.unit || 'mg'
      }))
      .filter(m => m.dose === null || (!Number.isNaN(m.dose) && m.dose >= 0));
  }

  setMedications(medications) {
    this.medications = [];
    this.counter = 0;

    if (Array.isArray(medications) && medications.length > 0) {
      medications.forEach(m => {
        this.addMedication(m.id || '', m.dose ?? '', m.unit || 'mg');
      });
    } else {
      this.renderEmptyState();
    }
  }

  reset() {
    this.medications = [];
    this.counter = 0;
    this.renderEmptyState();
  }

  setMode(mode) {
    this.mode = mode;
    this.render();
  }

  setLanguage(language) {
    this.language = language;
    this.render();
  }
}

export default MedicationSelector;
