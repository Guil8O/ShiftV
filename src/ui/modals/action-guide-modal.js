import { DoctorEngine } from '../../doctor-module/core/doctor-engine.js';
import { translate, getCurrentLanguage } from '../../translations.js';

export class ActionGuideModal {
  constructor(measurements, userSettings) {
    this.measurements = measurements;
    this.userSettings = userSettings;
    this.doctorEngine = new DoctorEngine(measurements, userSettings);
    this._root = null;
  }

  $(selector) {
    return this._root ? this._root.querySelector(selector) : null;
  }

  open() {
    const language = getCurrentLanguage();
    this.doctorEngine = new DoctorEngine(this.measurements, { ...this.userSettings, language });
    const guide = this.doctorEngine.generateActionGuide();

    const template = document.getElementById('action-guide-view');
    if (!template) return;

    const modalOverlay = document.getElementById('modal-bottom-sheet-overlay');
    const modalSheet = document.getElementById('modal-bottom-sheet');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const closeBtn = document.getElementById('modal-close-btn');
    if (!modalOverlay || !modalSheet || !modalTitle || !modalContent) return;

    modalTitle.textContent = translate('actionGuideModalTitle') || '액션 가이드';
    modalContent.innerHTML = template.innerHTML;
    this._root = modalContent;
    this.applyTranslations(modalContent);

    this.render(guide);

    document.body.classList.add('modal-open');
    modalOverlay.classList.add('visible');

    const cleanup = () => {
      this._root = null;
    };

    if (closeBtn) closeBtn.addEventListener('click', cleanup, { once: true });
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) cleanup();
    }, { once: true });
  }

  render(guide) {
    this._setupTabs();
    this.renderHero(guide?.nextMeasurementDate);
    this.renderRecommendations(guide?.recommendations);
    this.renderPerformance(guide?.performanceFeedback);
    this.renderMedicationAI();
    this._setupAITab();
  }

  /* ── Tab switching ── */
  _setupTabs() {
    const tabs = this._root?.querySelectorAll('.action-guide-tab');
    const panels = this._root?.querySelectorAll('.action-guide-tab-panel');
    if (!tabs || !panels) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const id = tab.getAttribute('data-ag-tab');
        const panel = this._root?.querySelector(`#ag-panel-${id}`);
        if (panel) panel.classList.add('active');
      });
    });
  }

  /* ── AI Tab setup ── */
  _setupAITab() {
    const btn = this.$('#ag-ai-generate-btn');
    if (!btn) return;
    btn.addEventListener('click', () => this._handleAIGenerate());
  }

  async _handleAIGenerate() {
    const resultsEl = this.$('#ag-ai-results');
    const promptEl = this.$('#ag-ai-prompt');
    const btn = this.$('#ag-ai-generate-btn');
    if (!resultsEl) return;

    // Check API key
    const encodedKey = localStorage.getItem('shiftV_aiApiKey') || '';
    let apiKey = '';
    try { apiKey = atob(encodedKey); } catch { apiKey = ''; }
    if (!apiKey) {
      resultsEl.innerHTML = `<div class="ag-ai-no-key"><span class="material-symbols-outlined mi-inline">key_off</span> ${translate('actionGuideAINoApiKey')}</div>`;
      return;
    }

    const userPrompt = promptEl?.value?.trim() || '';
    const lang = getCurrentLanguage();

    // Show loading
    if (btn) btn.disabled = true;
    resultsEl.innerHTML = `<div class="ag-ai-loading"><div class="ag-ai-spinner"></div> ${translate('actionGuideAILoading')}</div>`;

    try {
      const prompt = this._buildAIActionPrompt(userPrompt, lang);
      console.log('[ActionGuide AI] prompt preview:', prompt.slice(0, 400));
      const provider = localStorage.getItem('shiftV_aiProvider') || 'openai';
      const model = localStorage.getItem('shiftV_aiModel') || '';
      resultsEl.innerHTML = `<div class="ag-ai-loading"><div class="ag-ai-spinner"></div> ${translate('actionGuideAILoading')}<br><small style="opacity:0.5">${provider} / ${model || 'default'} — ${prompt.length} chars</small></div>`;
      const response = await this._callAI(prompt);
      this._renderAIResults(resultsEl, response);
    } catch (err) {
      console.error('AI Action Guide error:', err);
      const detail = err?.message || '';
      resultsEl.innerHTML = `<div class="ag-ai-error"><span class="material-symbols-outlined mi-inline">error</span> ${translate('actionGuideAIError')}${detail ? `<br><small style="opacity:0.7;word-break:break-all">${detail}</small>` : ''}<br><small style="opacity:0.4">Console(F12) 에서 상세 로그를 확인하세요</small></div>`;
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /**
   * Build a compact prompt with: current snapshot, 5-day avg change,
   * initial measurement, 1-month-ago, 2-month-ago snapshots.
   */
  _buildAIActionPrompt(userPrompt, lang) {
    const mode = this.userSettings.mode || 'mtf';
    const all = this.measurements || [];
    const langLabel = lang === 'ko' ? '한국어' : lang === 'ja' ? '日本語' : 'English';
    const modeLabel = mode === 'mtf' ? 'MTF (Male-to-Female)' : mode === 'ftm' ? 'FTM (Female-to-Male)' : 'Non-binary';
    const FIELDS = ['weight', 'bodyFatPercentage', 'muscleMass', 'chest', 'waist', 'hips', 'shoulder', 'estrogenLevel', 'testosteroneLevel'];

    // Helper: extract compact snapshot from a measurement
    const snap = (m) => {
      if (!m) return null;
      const o = { date: m.date || '?' };
      for (const f of FIELDS) { if (m[f] != null) o[f] = m[f]; }
      if (m.height) o.height = m.height;
      return o;
    };

    // Current (latest)
    const latest = all.length ? all[all.length - 1] : null;
    const currentSnap = snap(latest);

    // Initial (first)
    const initial = all.length > 1 ? all[0] : null;
    const initialSnap = snap(initial);

    // 1 month ago & 2 months ago (find closest)
    const findClosest = (daysAgo) => {
      if (!all.length) return null;
      const target = Date.now() - daysAgo * 864e5;
      let best = null, bestDiff = Infinity;
      for (const m of all) {
        if (!m.date) continue;
        const diff = Math.abs(new Date(m.date).getTime() - target);
        if (diff < bestDiff) { bestDiff = diff; best = m; }
      }
      return best === latest || best === initial ? null : best;
    };
    const oneMonthSnap = snap(findClosest(30));
    const twoMonthSnap = snap(findClosest(60));

    // 5-day average change (last 5 entries)
    const recent5 = all.slice(-5);
    let avgChanges = '';
    if (recent5.length >= 2) {
      const first = recent5[0], last = recent5[recent5.length - 1];
      const diffs = [];
      for (const f of FIELDS) {
        if (last[f] != null && first[f] != null) {
          const d = (last[f] - first[f]).toFixed(1);
          if (Number(d) !== 0) diffs.push(`${f}: ${d > 0 ? '+' : ''}${d}`);
        }
      }
      if (diffs.length) avgChanges = diffs.join(', ');
    }

    // Derived metrics
    let derived = '';
    if (latest?.weight && latest?.height) derived += `BMI: ${(latest.weight / ((latest.height / 100) ** 2)).toFixed(1)} `;
    if (latest?.waist && latest?.hips) derived += `WHR: ${(latest.waist / latest.hips).toFixed(3)}`;

    // Targets
    const targets = this.userSettings.targets || {};
    const targetStr = Object.entries(targets).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}:${v}`).join(', ');

    // Medications & symptoms (from latest only)
    let meds = '';
    if (latest?.medications?.length) {
      meds = latest.medications.map(m => `${m.id || m.medicationId || ''}${m.dose ? ' ' + m.dose + (m.unit || '') : ''}`).join(', ');
    }
    let symptoms = '';
    if (latest?.symptoms?.length) {
      symptoms = latest.symptoms.map(s => typeof s === 'string' ? s : s.id || s.name).join(', ');
    }

    // Build compact data block
    const dataLines = [
      `Mode: ${modeLabel}`,
      currentSnap ? `Current: ${JSON.stringify(currentSnap)}` : '',
      avgChanges ? `5-entry trend: ${avgChanges}` : '',
      initialSnap ? `Initial: ${JSON.stringify(initialSnap)}` : '',
      oneMonthSnap ? `~1mo ago: ${JSON.stringify(oneMonthSnap)}` : '',
      twoMonthSnap ? `~2mo ago: ${JSON.stringify(twoMonthSnap)}` : '',
      derived,
      targetStr ? `Goals: ${targetStr}` : '',
      meds ? `Meds: ${meds}` : '',
      symptoms ? `Symptoms: ${symptoms}` : '',
    ].filter(Boolean).join('\n');

    return `You are a health advisor for ${modeLabel} HRT patients.
Respond ONLY in ${langLabel}. Output valid JSON only, no markdown fences.

${dataLines}
${userPrompt ? `\nRequest: ${userPrompt}` : ''}

Return JSON: {"exercise":[{"title":"..","description":"..","details":".."}],"diet":[...],"medication":[...],"habits":[...]}
Each array 1-3 items. title=name, description=reason(1 sentence), details=action/frequency. Empty array if n/a.
JSON ONLY.`;
  }

  async _callAI(prompt) {
    const provider = localStorage.getItem('shiftV_aiProvider') || 'openai';
    const model = localStorage.getItem('shiftV_aiModel') || '';
    const customEndpoint = localStorage.getItem('shiftV_aiCustomEndpoint') || '';
    const customModel = localStorage.getItem('shiftV_aiCustomModel') || '';
    const encodedKey = localStorage.getItem('shiftV_aiApiKey') || '';
    let apiKey = '';
    try { apiKey = atob(encodedKey); } catch { apiKey = ''; }

    const PROVIDERS = {
      openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        defaultModel: 'gpt-4o-mini',
        headers: (k) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` }),
        body: (m, p) => ({ model: m, messages: [{ role: 'system', content: 'You are a health advisor. Return JSON only.' }, { role: 'user', content: p }], max_tokens: 1500, temperature: 0.7 }),
        parse: (d) => d.choices?.[0]?.message?.content || ''
      },
      anthropic: {
        endpoint: 'https://api.anthropic.com/v1/messages',
        defaultModel: 'claude-sonnet-4-20250514',
        headers: (k) => ({ 'Content-Type': 'application/json', 'x-api-key': k, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }),
        body: (m, p) => ({ model: m, max_tokens: 1500, messages: [{ role: 'user', content: p }] }),
        parse: (d) => d.content?.[0]?.text || ''
      },
      gemini: {
        endpoint: (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,
        defaultModel: 'gemini-2.0-flash',
        headers: () => ({ 'Content-Type': 'application/json' }),
        body: (_m, p) => ({ contents: [{ parts: [{ text: p }] }], generationConfig: { maxOutputTokens: 1500, temperature: 0.7 } }),
        parse: (d) => d.candidates?.[0]?.content?.parts?.[0]?.text || ''
      },
      deepseek: {
        endpoint: 'https://api.deepseek.com/chat/completions',
        defaultModel: 'deepseek-chat',
        headers: (k) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` }),
        body: (m, p) => ({ model: m, messages: [{ role: 'system', content: 'You are a health advisor. Return JSON only.' }, { role: 'user', content: p }], max_tokens: 1500, temperature: 0.7 }),
        parse: (d) => d.choices?.[0]?.message?.content || ''
      }
    };

    const cfg = PROVIDERS[provider] || PROVIDERS.openai;
    const finalModel = (provider === 'custom' && customModel) ? customModel : (model || cfg.defaultModel);

    let url;
    if (provider === 'custom' && customEndpoint) {
      url = customEndpoint;
    } else if (provider === 'gemini') {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${apiKey}`;
    } else {
      url = typeof cfg.endpoint === 'function' ? cfg.endpoint(finalModel) : cfg.endpoint;
    }

    // 45-second timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);

    // Debug: log request info
    const reqBody = cfg.body(finalModel, prompt);
    console.log('[ActionGuide AI] provider:', provider, '| model:', finalModel);
    console.log('[ActionGuide AI] prompt length:', prompt.length, 'chars | body size:', JSON.stringify(reqBody).length, 'chars');

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: cfg.headers(apiKey),
        body: JSON.stringify(reqBody),
        signal: controller.signal
      });
    } catch (fetchErr) {
      clearTimeout(timer);
      if (fetchErr.name === 'AbortError') throw new Error('Timeout: AI가 45초 내에 응답하지 않았습니다.');
      throw new Error(`Network error: ${fetchErr.message}`);
    }
    clearTimeout(timer);

    console.log('[ActionGuide AI] response status:', res.status, res.statusText);

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const errData = await res.json();
        console.log('[ActionGuide AI] error body:', errData);
        errMsg += ': ' + (errData.error?.message || errData.message || JSON.stringify(errData).slice(0, 300));
      } catch { /* ignore */ }
      throw new Error(errMsg);
    }

    const data = await res.json();
    console.log('[ActionGuide AI] raw response keys:', Object.keys(data));
    console.log('[ActionGuide AI] raw response (truncated):', JSON.stringify(data).slice(0, 500));

    const parsed = cfg.parse(data);
    console.log('[ActionGuide AI] parsed content length:', parsed?.length || 0);
    if (parsed) console.log('[ActionGuide AI] parsed (truncated):', parsed.slice(0, 300));

    if (!parsed) {
      console.error('[ActionGuide AI] EMPTY RESPONSE — full data:', JSON.stringify(data));
      throw new Error('Empty AI response — provider returned no content. Check console for raw response.');
    }
    return parsed;
  }

  _renderAIResults(container, rawResponse) {
    console.log('[ActionGuide AI] renderAIResults input length:', rawResponse?.length || 0);
    let recs;
    try {
      // Strip markdown fences if present
      let cleaned = rawResponse.trim();
      if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      recs = JSON.parse(cleaned);
    } catch (e1) {
      console.log('[ActionGuide AI] Direct JSON parse failed:', e1.message);
      // Try to extract JSON from response
      const match = rawResponse.match(/\{[\s\S]*\}/);
      if (match) {
        try { recs = JSON.parse(match[0]); } catch (e2) {
          console.log('[ActionGuide AI] Regex JSON extract also failed:', e2.message);
          recs = null;
        }
      }
    }

    if (!recs) {
      console.error('[ActionGuide AI] Could not parse response as JSON. Raw:', rawResponse?.slice(0, 500));
      container.innerHTML = `<div class="ag-ai-error">${translate('actionGuideAIError')}<br><small style="opacity:0.5">JSON 파싱 실패 — 원본 응답: ${(rawResponse || '').slice(0, 200).replace(/</g, '&lt;')}</small></div>`;
      return;
    }

    const byCategory = {
      exercise: { icon: '<span class="material-symbols-outlined category-icon">fitness_center</span>', titleKey: 'actionGuideCategoryExercise' },
      diet: { icon: '<span class="material-symbols-outlined category-icon">restaurant</span>', titleKey: 'actionGuideCategoryDiet' },
      medication: { icon: '<span class="material-symbols-outlined category-icon">medication</span>', titleKey: 'actionGuideCategoryMedication' },
      habits: { icon: '<span class="material-symbols-outlined category-icon">psychology</span>', titleKey: 'actionGuideCategoryHabits' }
    };

    const sections = Object.keys(byCategory).map(key => {
      const items = Array.isArray(recs[key]) ? recs[key] : [];
      if (items.length === 0) return '';
      const meta = byCategory[key];
      const title = translate(meta.titleKey) || key;
      const itemsHtml = items.map(it => `
        <div class="action-guide-item">
          <div class="action-guide-item-title">${it.title || ''}</div>
          ${it.description ? `<div class="action-guide-item-reason">${it.description}</div>` : ''}
          ${it.details ? `<div class="action-guide-item-detail">${it.details}</div>` : ''}
        </div>
      `).join('');
      return `
        <div class="action-guide-category">
          <div class="action-guide-category-title">${meta.icon} ${title}</div>
          ${itemsHtml}
        </div>
      `;
    }).filter(Boolean);

    if (sections.length === 0) {
      container.innerHTML = `<div class="ag-ai-error">${translate('actionGuideAIError')}</div>`;
      return;
    }

    container.innerHTML = `<div class="ag-ai-badge"><span class="material-symbols-outlined mi-inline mi-sm">auto_awesome</span> AI Generated</div>` + sections.join('');
  }

  renderHero(next) {
    const ddayEl = this.$('#action-guide-dday');
    const dateEl = this.$('#action-guide-next-date');
    const msgEl = this.$('#action-guide-next-message');
    if (!ddayEl || !dateEl || !msgEl) return;

    const days = Number(next?.daysUntil);
    const date = next?.date || '';
    const rawMessage = next?.message || '';

    let ddayText = translate('actionGuideDDayUnknown') || 'D-?';
    if (Number.isFinite(days)) {
      if (days === 0) ddayText = 'D-Day';
      else if (days > 0) ddayText = `D-${days}`;
      else ddayText = `D+${Math.abs(days)}`;
    }

    ddayEl.textContent = ddayText;
    dateEl.textContent = date;
    if (Number.isFinite(days)) {
      msgEl.textContent = days <= 0
        ? (translate('actionGuideNextMessageDue') || rawMessage)
        : translate('actionGuideNextMessageInDays', { days: String(days) });
    } else {
      msgEl.textContent = rawMessage;
    }
  }

  renderRecommendations(recs) {
    const container = this.$('#action-guide-recommendations');
    if (!container) return;

    const lang = getCurrentLanguage();
    const dictionary = {
      en: {
        // ── Exercise ──
        '유산소 운동 증가': 'Increase cardio',
        '근력 운동': 'Strength training',
        '체중 감소를 위한 유산소 운동': 'Cardio for weight loss',
        '체중 증가 및 근육 발달': 'Build muscle and gain weight',
        '주 3-4회, 30-45분': '3–4 times/week, 30–45 min',
        '주 3회, 복합 운동 중심': '3 times/week, compound-focused',
        '하체 집중 운동': 'Lower-body focused training',
        '엉덩이와 허벅지 발달': 'Hip & thigh development',
        '여성적 곡선 만들기': 'Build feminine curves',
        '여성적 하체 라인 형성': 'Build a feminine lower-body line',
        '복부 운동': 'Core exercises',
        '허리 둘레 감소': 'Reduce waist circumference',
        '코어 강화 및 지방 감소': 'Core strengthening & fat loss',
        '가벼운 상체 운동': 'Light upper-body training',
        '어깨 축소 및 톤업': 'Slim & tone shoulders',
        '근육 비대 방지': 'Prevent muscle hypertrophy',
        '여성적 상체 라인 유지': 'Maintain a feminine upper-body silhouette',
        '상체 근력 운동': 'Upper-body strength training',
        '어깨와 가슴 발달': 'Shoulder & chest development',
        '남성적 상체 만들기': 'Build a masculine upper body',
        '남성적 V자 체형 형성': 'Build a masculine V-shape',
        '복부 코어 운동': 'Core workouts',
        '복근 발달 및 체형 정리': 'Abs development & body shaping',
        '남성적 복부 라인': 'Masculine abdominal line',
        '남성적 코어 강화': 'Masculine core strengthening',
        '하체 근력 운동': 'Lower-body strength training',
        '전체적인 근육 발달': 'Overall muscle development',
        '균형잡힌 하체': 'Balanced lower body',
        '전체적인 남성적 체형': 'Overall masculine physique',
        '균형 잡힌 전신 운동': 'Balanced full-body training',
        '조화로운 체형 만들기': 'Build a harmonious physique',
        '과도하지 않은 톤업': 'Moderate toning',
        '중성적이고 건강한 체형': 'Neutral & healthy physique',
        '유산소 운동': 'Cardio',
        '심폐 기능 및 체지방 관리': 'Cardio fitness & body fat management',
        '건강한 체형 유지': 'Maintain a healthy physique',
        '전반적인 건강 증진': 'Improve overall health',
        '근육 손실 방지': 'Prevent muscle loss',
        '근력 운동 및 단백질 섭취': 'Strength training & protein intake',
        '근육량 회복': 'Recover muscle mass',
        // ── Diet ──
        '단백질 섭취 늘리기': 'Increase protein intake',
        '단백질 섭취 증가': 'Increase protein intake',
        '칼로리 섭취 조절': 'Adjust calorie intake',
        '건강한 체중 증가 필요': 'Need healthy weight gain',
        '급격한 체중 감소로 근육 손실 위험': 'Risk of muscle loss from rapid weight loss',
        '고단백 식단으로 근육 보호': 'Protect muscle with a high-protein diet',
        '칼로리 조정 필요': 'Calorie adjustment needed',
        '체중 정체 극복': 'Overcome weight plateau',
        '칼로리 감소': 'Reduce calories',
        '칼로리 증가': 'Increase calories',
        '건강한 지방 섭취': 'Healthy fat intake',
        '여성화를 위한 적정 체지방률 유지': 'Maintain optimal body fat for feminization',
        '호르몬 균형 및 지방 재분배': 'Hormone balance and fat redistribution',
        '체지방 감소 식단': 'Fat-loss diet',
        '남성적 체형을 위한 체지방 관리': 'Body fat management for a masculine physique',
        '고단백 저탄수화물': 'High-protein, low-carb',
        '균형 잡힌 식단': 'Balanced diet',
        '중성적 체형을 위한 체지방 조절': 'Body fat control for a neutral physique',
        '적정 범위 유지': 'Maintain optimal range',
        '호르몬 안정화 식품': 'Hormone-stabilizing foods',
        '기분 변화 완화를 위한 영양소': 'Nutrients to ease mood swings',
        '세로토닌 및 호르몬 균형': 'Serotonin & hormone balance',
        '정신 건강 증상 완화': 'Ease mental health symptoms',
        '에너지 증진 식단': 'Energy-boosting diet',
        '피로 회복 및 에너지 증진': 'Fatigue recovery & energy boost',
        '철분, 비타민 B12, 복합 탄수화물': 'Iron, vitamin B12, complex carbs',
        '만성 피로 개선': 'Improve chronic fatigue',
        '피부 건강 식단': 'Skin health diet',
        '피부 개선을 위한 영양': 'Nutrition for better skin',
        '항산화, 수분, 비타민': 'Antioxidants, hydration, vitamins',
        '피부 트러블 개선': 'Improve skin issues',
        '수분 섭취': 'Hydration',
        '충분한 물 섭취': 'Drink enough water',
        '전반적인 건강': 'Overall health',
        '하루 2-3리터': '2–3 liters/day',
        // ── Medication ──
        '약물 복용량 관리': 'Manage medication dosage',
        '에스트라디올 증량 고려': 'Consider increasing estradiol',
        '에스트로겐 수치가 목표 범위보다 낮습니다': 'Estrogen levels are below target range',
        '에스트라디올 감량 고려': 'Consider decreasing estradiol',
        '에스트로겐 수치가 높아 혈전 위험 증가': 'Higher estrogen increases blood clot risk',
        '에스트라디올 복용량 유지': 'Maintain estradiol dose',
        '현재 수치가 이상적입니다': 'Current level is ideal',
        '항안드로겐 증량 고려': 'Consider increasing anti-androgen',
        '테스토스테론 억제가 충분하지 않습니다': 'Testosterone suppression is insufficient',
        '항안드로겐 복용량 유지': 'Maintain anti-androgen dose',
        '테스토스테론 억제 효과 좋음': 'Testosterone suppression is effective',
        '테스토스테론 증량 고려': 'Consider increasing testosterone',
        '테스토스테론 수치가 목표 범위보다 낮습니다': 'Testosterone levels are below target range',
        '테스토스테론 감량 필요': 'Testosterone dose reduction needed',
        '수치가 너무 높아 부작용 위험': 'Levels too high — risk of side effects',
        '테스토스테론 복용량 유지': 'Maintain testosterone dose',
        '아로마타제 억제제 고려': 'Consider an aromatase inhibitor',
        '에스트로겐 수치가 높습니다': 'Estrogen levels are elevated',
        '개인화된 호르몬 균형': 'Personalized hormone balance',
        '목표하는 호르몬 수치에 따라 조정': 'Adjust based on target hormone levels',
        'SERM 사용 고려': 'Consider using a SERM',
        '여유증 증상 완화': 'Relieve gynecomastia symptoms',
        // ── Habits ──
        '습관 개선': 'Improve habits',
        '수면 개선': 'Improve sleep',
        '호르몬 안정화와 회복을 위한 충분한 수면': 'Adequate sleep for hormone stability & recovery',
        '7-8시간 수면, 일정한 수면 시간': '7–8 hours sleep, consistent schedule',
        '스트레스 관리': 'Stress management',
        '코르티솔 조절을 통한 호르몬 안정화': 'Hormone stabilization through cortisol control',
        '정신 건강 케어': 'Mental health care',
        '충분한 수분 섭취': 'Adequate hydration',
        '하루 2-3리터 물 마시기': 'Drink 2–3 L of water per day',
        '신진대사 및 호르몬 대사': 'Metabolism and hormone metabolism',
        '정기 측정 유지': 'Keep regular measurements',
        '일관성 있는 측정으로 정확한 추세 파악': 'Consistent measurements improve trend accuracy',
        '피부 관리': 'Skin care',
        '여성적 피부 유지': 'Maintain feminine skin',
        '보습 및 관리': 'Moisturizing and care',
        '피부 및 위생 관리': 'Skin & hygiene care',
        '여드름 및 체취 관리': 'Acne & body odor management',
        '테스토스테론 부작용 관리': 'Managing testosterone side effects'
      },
      ja: {
        // ── Exercise ──
        '유산소 운동 증가': '有酸素運動を増やす',
        '근력 운동': '筋力トレーニング',
        '체중 감소를 위한 유산소 운동': '減量のための有酸素運動',
        '체중 증가 및 근육 발달': '増量・筋肉増加',
        '주 3-4회, 30-45분': '週3〜4回、30〜45分',
        '주 3회, 복합 운동 중심': '週3回、複合種目中心',
        '하체 집중 운동': '下半身集中トレ',
        '엉덩이와 허벅지 발달': 'ヒップと太ももの発達',
        '여성적 곡선 만들기': '女性らしい曲線づくり',
        '여성적 하체 라인 형성': '女性らしい下半身ラインづくり',
        '복부 운동': '腹部エクササイズ',
        '허리 둘레 감소': 'ウエスト周りの減少',
        '코어 강화 및 지방 감소': '体幹強化と脂肪減少',
        '가벼운 상체 운동': '軽い上半身トレーニング',
        '어깨 축소 및 톤업': '肩の縮小とトーンアップ',
        '근육 비대 방지': '筋肥大の防止',
        '여성적 상체 라인 유지': '女性らしい上半身ラインの維持',
        '상체 근력 운동': '上半身筋力トレーニング',
        '어깨와 가슴 발달': '肩と胸の発達',
        '남성적 상체 만들기': '男性的な上半身づくり',
        '남성적 V자 체형 형성': '男性的なVシェイプ形成',
        '복부 코어 운동': '腹部コアトレーニング',
        '복근 발달 및 체형 정리': '腹筋発達と体型の整理',
        '남성적 복부 라인': '男性的な腹部ライン',
        '남성적 코어 강화': '男性的なコア強化',
        '하체 근력 운동': '下半身筋力トレーニング',
        '전체적인 근육 발달': '全体的な筋肉発達',
        '균형잡힌 하체': 'バランスの取れた下半身',
        '전체적인 남성적 체형': '全体的な男性的体型',
        '균형 잡힌 전신 운동': 'バランスの取れた全身運動',
        '조화로운 체형 만들기': '調和のとれた体型づくり',
        '과도하지 않은 톤업': '過度でないトーンアップ',
        '중성적이고 건강한 체형': '中性的で健康的な体型',
        '유산소 운동': '有酸素運動',
        '심폐 기능 및 체지방 관리': '心肺機能と体脂肪管理',
        '건강한 체형 유지': '健康的な体型の維持',
        '전반적인 건강 증진': '全体的な健康増進',
        '근육 손실 방지': '筋肉減少の防止',
        '근력 운동 및 단백질 섭취': '筋力トレーニングとタンパク質摂取',
        '근육량 회복': '筋肉量の回復',
        // ── Diet ──
        '단백질 섭취 늘리기': 'タンパク質摂取を増やす',
        '단백질 섭취 증가': 'タンパク質摂取を増やす',
        '칼로리 섭취 조절': '摂取カロリーの調整',
        '건강한 체중 증가 필요': '健康的な増量が必要',
        '급격한 체중 감소로 근육 손실 위험': '急激な体重減少で筋肉損失のリスク',
        '고단백 식단으로 근육 보호': '高タンパク食で筋肉を守る',
        '칼로리 조정 필요': 'カロリー調整が必要',
        '체중 정체 극복': '体重停滞の克服',
        '칼로리 감소': 'カロリー減少',
        '칼로리 증가': 'カロリー増加',
        '건강한 지방 섭취': '良質な脂質を摂る',
        '여성화를 위한 적정 체지방률 유지': '女性化のための適正体脂肪率の維持',
        '호르몬 균형 및 지방 재분배': 'ホルモンバランスと脂肪再分配',
        '체지방 감소 식단': '体脂肪減少食',
        '남성적 체형을 위한 체지방 관리': '男性的体型のための体脂肪管理',
        '고단백 저탄수화물': '高タンパク低炭水化物',
        '균형 잡힌 식단': 'バランスの取れた食事',
        '중성적 체형을 위한 체지방 조절': '中性的体型のための体脂肪調整',
        '적정 범위 유지': '適正範囲の維持',
        '호르몬 안정화 식품': 'ホルモン安定化食品',
        '기분 변화 완화를 위한 영양소': '気分変動緩和のための栄養素',
        '세로토닌 및 호르몬 균형': 'セロトニンとホルモンバランス',
        '정신 건강 증상 완화': 'メンタルヘルス症状の緩和',
        '에너지 증진 식단': 'エネルギー増進食',
        '피로 회복 및 에너지 증진': '疲労回復とエネルギー増進',
        '철분, 비타민 B12, 복합 탄수화물': '鉄分、ビタミンB12、複合炭水化物',
        '만성 피로 개선': '慢性疲労の改善',
        '피부 건강 식단': '肌の健康食',
        '피부 개선을 위한 영양': '肌改善のための栄養',
        '항산화, 수분, 비타민': '抗酸化、水分、ビタミン',
        '피부 트러블 개선': '肌トラブルの改善',
        '수분 섭취': '水分補給',
        '충분한 물 섭취': '十分な水分摂取',
        '전반적인 건강': '全体的な健康',
        '하루 2-3리터': '1日2〜3L',
        // ── Medication ──
        '약물 복용량 관리': '服薬量の管理',
        '에스트라디올 증량 고려': 'エストラジオール増量を検討',
        '에스트로겐 수치가 목표 범위보다 낮습니다': 'エストロゲン値が目標範囲より低い',
        '에스트라디올 감량 고려': 'エストラジオール減量を検討',
        '에스트로겐 수치가 높아 혈전 위험 증가': 'エストロゲン値が高く血栓リスク増加',
        '에스트라디올 복용량 유지': 'エストラジオール量を維持',
        '현재 수치가 이상적입니다': '現在の値は理想的です',
        '항안드로겐 증량 고려': '抗アンドロゲン増量を検討',
        '테스토스테론 억제가 충분하지 않습니다': 'テストステロン抑制が不十分です',
        '항안드로겐 복용량 유지': '抗アンドロゲン量を維持',
        '테스토스테론 억제 효과 좋음': 'テストステロン抑制効果が良好',
        '테스토스테론 증량 고려': 'テストステロン増量を検討',
        '테스토스테론 수치가 목표 범위보다 낮습니다': 'テストステロン値が目標範囲より低い',
        '테스토스테론 감량 필요': 'テストステロン減量が必要',
        '수치가 너무 높아 부작용 위험': '数値が高すぎて副作用のリスク',
        '테스토스테론 복용량 유지': 'テストステロン量を維持',
        '아로마타제 억제제 고려': 'アロマターゼ阻害薬を検討',
        '에스트로겐 수치가 높습니다': 'エストロゲン値が高い',
        '개인화된 호르몬 균형': '個別化されたホルモンバランス',
        '목표하는 호르몬 수치에 따라 조정': '目標ホルモン値に応じて調整',
        'SERM 사용 고려': 'SERMの使用を検討',
        '여유증 증상 완화': '女性化乳房症状の緩和',
        // ── Habits ──
        '습관 개선': '習慣の改善',
        '수면 개선': '睡眠の改善',
        '호르몬 안정화와 회복을 위한 충분한 수면': 'ホルモン安定と回復のための十分な睡眠',
        '7-8시간 수면, 일정한 수면 시간': '7〜8時間睡眠、一定した就寝時間',
        '스트레스 관리': 'ストレス管理',
        '코르티솔 조절을 통한 호르몬 안정화': 'コルチゾール調節によるホルモン安定化',
        '정신 건강 케어': 'メンタルヘルスケア',
        '충분한 수분 섭취': '十分な水分補給',
        '하루 2-3리터 물 마시기': '1日2〜3Lの水を飲む',
        '신진대사 및 호르몬 대사': '代謝とホルモン代謝',
        '정기 측정 유지': '定期測定を継続',
        '일관성 있는 측정으로 정확한 추세 파악': '一貫した測定で正確な傾向を把握',
        '피부 관리': 'スキンケア',
        '여성적 피부 유지': '女性らしい肌を保つ',
        '보습 및 관리': '保湿とケア',
        '피부 및 위생 관리': '肌と衛生管理',
        '여드름 및 체취 관리': 'ニキビと体臭管理',
        '테스토스테론 부작용 관리': 'テストステロン副作用の管理'
      }
    };

    const metricToken = {
      ko: {
        '키': 'height',
        '체중': 'weight',
        '허리': 'waist',
        '엉덩이': 'hips',
        '가슴': 'chest',
        '어깨': 'shoulder',
        '어깨 너비': 'shoulderWidth',
        '목': 'neck',
        '허벅지': 'thigh',
        '종아리': 'calf',
        '팔뚝': 'arm',
        '근육량': 'muscleMass',
        '체지방률': 'bodyFatPercentage',
        '에스트로겐': 'estrogenLevel',
        '테스토스테론': 'testosteroneLevel'
      },
      en: {
        height: 'Height',
        weight: 'Weight',
        waist: 'Waist',
        hips: 'Hips',
        chest: 'Chest',
        shoulder: 'Shoulder',
        shoulderWidth: 'Shoulder Width',
        neck: 'Neck',
        thigh: 'Thigh',
        calf: 'Calf',
        arm: 'Arm',
        muscleMass: 'Muscle mass',
        bodyFatPercentage: 'Body fat',
        estrogenLevel: 'Estrogen',
        testosteroneLevel: 'Testosterone'
      },
      ja: {
        height: '身長',
        weight: '体重',
        waist: 'ウエスト',
        hips: 'ヒップ',
        chest: '胸囲',
        shoulder: '肩',
        shoulderWidth: '肩幅',
        neck: '首回り',
        thigh: '太もも',
        calf: 'ふくらはぎ',
        arm: '腕',
        muscleMass: '筋肉量',
        bodyFatPercentage: '体脂肪率',
        estrogenLevel: 'エストロゲン',
        testosteroneLevel: 'テストステロン'
      }
    };

    const localizeText = (text) => {
      const s = String(text || '');
      if (!s) return s;
      if (lang === 'ko') return s;

      const direct = dictionary[lang]?.[s];
      if (direct) return direct;

      const m = s.match(/^목표\s*(.+?)까지\s*([0-9.]+)\s*(kg|cm)\s*남음$/);
      if (m) {
        const value = m[2];
        const unit = m[3];
        if (lang === 'en') return `Remaining to target: ${value}${unit}`;
        if (lang === 'ja') return `目標まであと${value}${unit}`;
      }

      const weeklyLoss = s.match(/^주간\s*([0-9.]+)kg\s*감소\s*\(권장:\s*([0-9.]+)kg\)$/);
      if (weeklyLoss) {
        const v = weeklyLoss[1];
        const r = weeklyLoss[2];
        if (lang === 'en') return `Weekly loss ${v}kg (recommended: ${r}kg)`;
        if (lang === 'ja') return `週間${v}kg減（推奨：${r}kg）`;
      }

      const metricDecrease = s.match(/^(.+?)\s*([0-9.]+)(kg|cm|%)\s*감소$/);
      if (metricDecrease) {
        const rawMetric = metricDecrease[1].trim();
        const value = metricDecrease[2];
        const unit = metricDecrease[3];
        const key = metricToken.ko[rawMetric];
        const metric = key ? metricToken[lang]?.[key] : rawMetric;
        if (lang === 'en') return `${metric} decreased by ${value}${unit}`;
        if (lang === 'ja') return `${metric}が${value}${unit}減少`;
      }

      const bodyFatTarget = s.match(/^목표\s*체지방률:\s*([0-9.]+\s*-\s*[0-9.]+)%\s*\(현재:\s*([0-9.]+)%\)$/);
      if (bodyFatTarget) {
        const range = bodyFatTarget[1].replace(/\s*/g, '');
        const current = bodyFatTarget[2];
        if (lang === 'en') return `Target body fat: ${range}% (current: ${current}%)`;
        if (lang === 'ja') return `目標体脂肪率：${range}%（現在：${current}%）`;
      }

      const streak = s.match(/^([0-9]+)주\s*연속\s*기록\s*중!$/);
      if (streak) {
        const weeks = streak[1];
        if (lang === 'en') return `${weeks}-week streak!`;
        if (lang === 'ja') return `${weeks}週連続記録中！`;
      }

      return s;
    };

    const byCategory = {
      exercise: { icon: '<span class="material-symbols-outlined category-icon">fitness_center</span>', titleKey: 'actionGuideCategoryExercise' },
      diet: { icon: '<span class="material-symbols-outlined category-icon">restaurant</span>', titleKey: 'actionGuideCategoryDiet' },
      medication: { icon: '<span class="material-symbols-outlined category-icon">medication</span>', titleKey: 'actionGuideCategoryMedication' },
      habits: { icon: '<span class="material-symbols-outlined category-icon">psychology</span>', titleKey: 'actionGuideCategoryHabits' }
    };

    const renderItems = (items) => {
      const list = Array.isArray(items) ? items.slice(0, 3) : [];
      if (list.length === 0) return '';
      return list.map(it => {
        const title = localizeText(it?.title || '');
        const reason = localizeText(it?.reason || it?.description || '');
        const detail = localizeText(it?.details || '');
        return `
          <div class="action-guide-item">
            <div class="action-guide-item-title">${title}</div>
            ${reason ? `<div class="action-guide-item-reason">${reason}</div>` : ''}
            ${detail ? `<div class="action-guide-item-detail">${detail}</div>` : ''}
          </div>
        `;
      }).join('');
    };

    const sections = Object.keys(byCategory).map(key => {
      const meta = byCategory[key];
      const itemsHtml = renderItems(recs?.[key]);
      if (!itemsHtml) return '';
      const title = translate(meta.titleKey) || key;
      return `
        <div class="action-guide-category">
          <div class="action-guide-category-title">${meta.icon} ${title}</div>
          ${itemsHtml}
        </div>
      `;
    }).filter(Boolean);

    if (sections.length === 0) {
      container.innerHTML = `<div class="action-guide-feedback">${translate('actionGuideNoRecommendations') || '추천을 만들기 위한 데이터가 부족합니다.'}</div>`;
      return;
    }

    container.innerHTML = sections.join('');
  }

  renderPerformance(perf) {
    const container = this.$('#action-guide-performance');
    if (!container) return;

    if (Array.isArray(perf)) {
      if (perf.length === 0) {
        container.innerHTML = `<div class="action-guide-feedback">${translate('actionGuideNoPerformance') || '이번 주 성과 피드백을 만들기 위한 데이터가 부족합니다.'}</div>`;
        return;
      }

      container.innerHTML = perf.map(fb => {
        const status = fb?.status || '';
        const title = fb?.message || '';
        const tip = fb?.tip || '';
        return `
          <div class="action-guide-feedback ${status}">
            <div class="action-guide-feedback-title">${title}</div>
            ${tip ? `<div class="action-guide-feedback-tip">${tip}</div>` : ''}
          </div>
        `;
      }).join('');
      return;
    }

    const msg = perf?.message || translate('actionGuideNoPerformance') || '이번 주 성과 피드백을 만들기 위한 데이터가 부족합니다.';
    container.innerHTML = `<div class="action-guide-feedback">${msg}</div>`;
  }

  renderMedicationAI() {
    const section = this.$('#action-guide-medication-ai-section');
    const btn = this.$('#ai-medication-btn');
    if (!section || !btn) return;

    // Check if user has any medication data
    const latest = Array.isArray(this.measurements) && this.measurements.length
      ? this.measurements[this.measurements.length - 1]
      : null;
    const hasMeds = latest?.medications && latest.medications.length > 0;
    // Show section always (useful even without meds, AI can advise based on hormone labs)
    section.style.display = '';

    btn.addEventListener('click', () => {
      import('./ai-advisor-modal.js').then(mod => {
        const AIAdvisorModal = mod.AIAdvisorModal || mod.default;
        new AIAdvisorModal(this.measurements, this.userSettings).open('medication');
      }).catch(err => console.error('AI Medication Advisor load error:', err));
    });
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
    root.querySelectorAll('[data-lang-key-placeholder]').forEach(el => {
      const key = el.getAttribute('data-lang-key-placeholder');
      if (!key) return;
      const t = translate(key);
      if (t && t !== key) el.placeholder = t;
    });
  }
}
