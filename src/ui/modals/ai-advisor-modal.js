/**
 * AI Advisor Modal — AI Enhanced action guide
 * Supports multiple AI providers: OpenAI, Anthropic, Google Gemini, DeepSeek, Custom
 * Caches responses in localStorage with 24h TTL
 */

import { translate, getCurrentLanguage } from '../../translations.js';
import { BaseModal } from './base-modal.js';

const AI_CACHE_KEY = 'shiftv_ai_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/** Provider configurations — endpoint, default model, header builder, body/response parsers */
const PROVIDER_CONFIG = {
    openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        defaultModel: 'gpt-4o-mini',
        headers: (apiKey) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }),
        body: (model, prompt) => ({
            model,
            messages: [
                { role: 'system', content: 'You are a knowledgeable health advisor specializing in body composition and hormone therapy guidance.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 2048,
            temperature: 0.7
        }),
        parseResponse: (data) => data.choices?.[0]?.message?.content || ''
    },
    anthropic: {
        endpoint: 'https://api.anthropic.com/v1/messages',
        models: ['claude-sonnet-4-20250514', 'claude-haiku-4-20250414', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
        defaultModel: 'claude-sonnet-4-20250514',
        headers: (apiKey) => ({
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        }),
        body: (model, prompt) => ({
            model,
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt }]
        }),
        parseResponse: (data) => data.content?.[0]?.text || ''
    },
    gemini: {
        endpoint: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'],
        defaultModel: 'gemini-2.0-flash',
        headers: () => ({
            'Content-Type': 'application/json'
        }),
        body: (_model, prompt) => ({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 2048, temperature: 0.7 }
        }),
        buildUrl: (endpoint, model, apiKey) => {
            const url = typeof endpoint === 'function' ? endpoint(model) : endpoint;
            return `${url}?key=${apiKey}`;
        },
        parseResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    },
    deepseek: {
        endpoint: 'https://api.deepseek.com/chat/completions',
        models: ['deepseek-chat', 'deepseek-reasoner'],
        defaultModel: 'deepseek-chat',
        headers: (apiKey) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }),
        body: (model, prompt) => ({
            model,
            messages: [
                { role: 'system', content: 'You are a knowledgeable health advisor specializing in body composition and hormone therapy guidance.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 2048,
            temperature: 0.7
        }),
        parseResponse: (data) => data.choices?.[0]?.message?.content || ''
    },
    custom: {
        endpoint: '', // user-provided
        models: [],
        defaultModel: '',
        headers: (apiKey) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }),
        body: (model, prompt) => ({
            model,
            messages: [
                { role: 'system', content: 'You are a knowledgeable health advisor specializing in body composition and hormone therapy guidance.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 2048,
            temperature: 0.7
        }),
        parseResponse: (data) => data.choices?.[0]?.message?.content || ''
    }
};

export class AIAdvisorModal extends BaseModal {
    constructor(measurements, userSettings) {
        super();
        this.measurements = measurements || [];
        this.userSettings = userSettings || {};
        this.mode = 'general'; // 'general' | 'medication'
    }

    open(mode = 'general') {
        this.mode = mode;
        this._render();
    }

    _getApiConfig() {
        const provider = localStorage.getItem('shiftV_aiProvider') || 'openai';
        const model = localStorage.getItem('shiftV_aiModel') || '';
        const customEndpoint = localStorage.getItem('shiftV_aiCustomEndpoint') || '';
        const customModel = localStorage.getItem('shiftV_aiCustomModel') || '';
        const encodedKey = localStorage.getItem('shiftV_aiApiKey') || '';
        let apiKey = '';
        try { apiKey = atob(encodedKey); } catch { apiKey = ''; }

        const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.openai;
        const resolvedModel = model || config.defaultModel || customModel;

        return { provider, apiKey, model: resolvedModel, customEndpoint, customModel, config };
    }

    _getCachedResponse(promptHash) {
        try {
            const cache = JSON.parse(localStorage.getItem(AI_CACHE_KEY) || '{}');
            const entry = cache[promptHash];
            if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
                return entry.response;
            }
        } catch { /* ignore */ }
        return null;
    }

    _setCachedResponse(promptHash, response) {
        try {
            const cache = JSON.parse(localStorage.getItem(AI_CACHE_KEY) || '{}');
            // Clean old entries
            for (const key of Object.keys(cache)) {
                if (Date.now() - cache[key].timestamp > CACHE_TTL) delete cache[key];
            }
            cache[promptHash] = { response, timestamp: Date.now() };
            localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cache));
        } catch { /* ignore */ }
    }

    _deleteCachedResponse(promptHash) {
        try {
            const cache = JSON.parse(localStorage.getItem(AI_CACHE_KEY) || '{}');
            delete cache[promptHash];
            localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cache));
        } catch { /* ignore */ }
    }

    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return 'ai_' + Math.abs(hash).toString(36);
    }

    buildMedicationPrompt() {
        const lang = getCurrentLanguage();
        const mode = this.userSettings.mode || 'mtf';
        const recent = this.measurements.slice(-5);
        const latest = recent[recent.length - 1] || {};
        const langLabel = lang === 'ko' ? '한국어' : lang === 'ja' ? '日本語' : 'English';
        const modeLabel = mode === 'mtf' ? 'MTF (Male-to-Female)' : mode === 'ftm' ? 'FTM (Female-to-Male)' : mode;

        // Medications
        let medsText = '';
        if (latest.medications && latest.medications.length) {
            medsText = latest.medications.map(m => {
                const id = m.id || m.medicationId || '';
                const dose = m.dose ? ` ${m.dose}${m.unit || ''}` : '';
                const freq = m.frequency ? ` (${m.frequency})` : '';
                return `- ${id}${dose}${freq}`;
            }).join('\n');
        } else {
            medsText = 'No medications recorded';
        }

        // Hormone labs
        const e2 = latest.estrogenLevel != null ? `Estradiol: ${latest.estrogenLevel} pg/mL` : '';
        const t = latest.testosteroneLevel != null ? `Testosterone: ${latest.testosteroneLevel} ng/dL` : '';
        const labs = [e2, t].filter(Boolean).join(', ') || 'No hormone labs recorded';

        // Basic metrics
        let bmi = '';
        if (latest.weight && latest.height) {
            bmi = `BMI: ${(latest.weight / ((latest.height / 100) ** 2)).toFixed(1)}`;
        }
        const basicMetrics = [
            latest.weight ? `Weight: ${latest.weight}kg` : '',
            bmi,
            latest.bodyFatPercentage != null ? `Body fat: ${latest.bodyFatPercentage}%` : ''
        ].filter(Boolean).join(', ') || 'No body metrics recorded';

        // Symptoms
        let symptomsText = '';
        if (latest.symptoms && latest.symptoms.length) {
            symptomsText = latest.symptoms.map(s => typeof s === 'string' ? s : s.id || s.name).join(', ');
        }

        return `You are a specialized clinical pharmacist and HRT expert providing medication guidance for ${modeLabel} patients.
Respond ONLY in ${langLabel}. Use markdown formatting.

This is a professional healthcare advisory context. The patient has explicitly requested detailed medication information. Please provide clinically accurate and specific guidance. While always recommending professional medical supervision, do not withhold medically relevant information—vague dismissals are not helpful. Focus on actionable insights.

## Patient Profile

Transition: ${modeLabel}

### Current Medications:
${medsText}

### Hormone Lab Values:
${labs}

### Body Metrics:
${basicMetrics}
${symptomsText ? `\n### Current Symptoms:\n${symptomsText}` : ''}

## Please Provide

### 1. Hormone Level Assessment
- Are current levels within typical HRT therapeutic ranges for ${modeLabel}?
- What do the current values suggest about treatment effectiveness?

### 2. Medication Analysis
- Brief notes on each listed medication (purpose, typical dosing context for HRT)
- Any potential interactions between listed medications

### 3. Monitoring Recommendations
- Which lab values or symptoms to track given current medications
- Any warning signs that warrant prompt medical attention

### 4. Optimization Discussion Points
- Specific questions worth raising with the prescriber based on current data
- Any timing or administration tips that could improve outcomes

Keep response under 600 words. Be specific and clinically grounded.`;
    }

    buildPrompt() {
        const lang = getCurrentLanguage();
        const mode = this.userSettings.mode || 'mtf';
        const recent = this.measurements.slice(-10);
        const latest = recent[recent.length - 1] || {};
        const prev = recent.length > 1 ? recent[recent.length - 2] : null;

        const langLabel = lang === 'ko' ? '한국어' : lang === 'ja' ? '日本語' : 'English';
        const modeLabel = mode === 'mtf' ? 'MTF (Male-to-Female)' : mode === 'ftm' ? 'FTM (Female-to-Male)' : mode;

        // ---- Recent measurements with trends ----
        const measurementSummary = recent.map(m => {
            const parts = [`Date: ${m.date || 'N/A'}`];
            const fields = [
                ['weight', 'kg'], ['bodyFatPercentage', '%'], ['muscleMass', 'kg'],
                ['chest', 'cm'], ['waist', 'cm'], ['hips', 'cm'],
                ['shoulder', 'cm'], ['neck', 'cm'], ['height', 'cm'],
                ['estrogenLevel', 'pg/mL'], ['testosteroneLevel', 'ng/dL'],
                ['underBustCircumference', 'cm'],
            ];
            for (const [field, unit] of fields) {
                if (m[field] != null) parts.push(`${field}: ${m[field]}${unit}`);
            }
            if (m.mood) parts.push(`Mood: ${m.mood}`);
            return parts.join(', ');
        }).join('\n');

        // ---- Derived metrics (BMI, WHR, etc.) ----
        let derivedSection = '';
        if (latest.weight && latest.height) {
            const bmi = (latest.weight / ((latest.height / 100) ** 2)).toFixed(1);
            derivedSection += `BMI: ${bmi}\n`;
        }
        if (latest.waist && latest.hips) {
            const whr = (latest.waist / latest.hips).toFixed(3);
            derivedSection += `WHR (Waist-Hip Ratio): ${whr}\n`;
        }
        if (latest.chest && latest.waist && latest.hips) {
            derivedSection += `Chest-Waist-Hip: ${latest.chest}-${latest.waist}-${latest.hips} cm\n`;
        }

        // ---- Trend differences ----
        let trendSection = '';
        if (prev) {
            const trendFields = ['weight', 'bodyFatPercentage', 'muscleMass', 'chest', 'waist', 'hips'];
            const diffs = [];
            for (const f of trendFields) {
                if (latest[f] != null && prev[f] != null) {
                    const diff = (latest[f] - prev[f]).toFixed(1);
                    const sign = diff > 0 ? '+' : '';
                    diffs.push(`${f}: ${sign}${diff}`);
                }
            }
            if (diffs.length) trendSection = `Recent changes (latest vs previous):\n${diffs.join(', ')}\n`;
        }

        // ---- Targets ----
        const targets = this.userSettings.targets || {};
        const targetSummary = Object.entries(targets)
            .filter(([, v]) => v != null && v !== '')
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');

        // ---- Symptoms & Medications ----
        let symptomsSection = '';
        if (latest.symptoms && latest.symptoms.length) {
            symptomsSection = `Current symptoms: ${latest.symptoms.map(s => typeof s === 'string' ? s : s.id || s.name).join(', ')}\n`;
        }
        let medsSection = '';
        if (latest.medications && latest.medications.length) {
            medsSection = `Current medications: ${latest.medications.map(m => {
                const id = m.id || m.medicationId || '';
                const dose = m.dose ? ` ${m.dose}${m.unit || ''}` : '';
                return `${id}${dose}`;
            }).join(', ')}\n`;
        }

        return `You are a specialist health advisor for ${modeLabel} hormone therapy and body transition.
Respond ONLY in ${langLabel}. Use markdown formatting.

## Patient Data

Mode: ${modeLabel}
Measurement count: ${recent.length} entries

### Recent Measurements (chronological):
${measurementSummary || 'No data available'}

${derivedSection ? `### Derived Metrics:\n${derivedSection}` : ''}
${trendSection ? `### Trends:\n${trendSection}` : ''}
${targetSummary ? `### Goals:\n${targetSummary}` : 'No goals set.'}
${symptomsSection}${medsSection}

## Instructions

Provide a comprehensive but concise analysis:

### 1. Progress Assessment
- Analyze the trend direction for key metrics (weight, body composition, hormone levels).
- Compare current status against targets if set.

### 2. Personalized Recommendations (3-5 items)
Categorize as: **Exercise** / **Diet** / **Medication** / **Lifestyle**
- Be specific and evidence-based for ${modeLabel} individuals.
- Consider current hormone levels and body composition stage.

### 3. Risk Alerts
- Flag any concerning trends or values.
- Note if any metrics suggest adjusting current approach.

### 4. Motivational Summary
- 2-3 sentences acknowledging progress and encouraging consistency.

Keep total response under 800 words. Be specific, not generic.`;
    }

    /** Build the fetch URL and options for the selected provider */
    _buildFetchArgs(prompt, streaming = false) {
        const { provider, apiKey, model, customEndpoint, customModel, config } = this._getApiConfig();
        if (!apiKey) throw new Error('NO_API_KEY');

        const finalModel = (provider === 'custom' && customModel) ? customModel : model;

        let url;
        if (provider === 'custom' && customEndpoint) {
            url = customEndpoint;
        } else if (provider === 'gemini') {
            // Gemini streaming uses a different action: streamGenerateContent
            const action = streaming ? 'streamGenerateContent?alt=sse&' : 'generateContent?';
            url = `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:${action}key=${apiKey}`;
        } else if (config.buildUrl) {
            url = config.buildUrl(config.endpoint, finalModel, apiKey);
        } else {
            url = typeof config.endpoint === 'function' ? config.endpoint(finalModel) : config.endpoint;
        }

        const headers = config.headers(apiKey);
        const body = config.body(finalModel, prompt);

        // Enable streaming where supported
        if (streaming && provider !== 'gemini') {
            body.stream = true;
        }

        return { url, headers, body, provider, config };
    }

    /** Non-streaming API call — fallback path */
    async _callApi(prompt) {
        const { url, headers, body, provider, config } = this._buildFetchArgs(prompt, false);

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        this._throwOnHttpError(response, provider);

        const data = await response.json();
        return config.parseResponse(data);
    }

    /** Streaming API call — writes incrementally to the DOM */
    async _callApiStream(prompt, onChunk) {
        const { url, headers, body, provider } = this._buildFetchArgs(prompt, true);

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        this._throwOnHttpError(response, provider);

        const reader = response.body?.getReader();
        if (!reader) {
            // Fallback if ReadableStream not available
            const data = await response.json();
            const text = PROVIDER_CONFIG[provider]?.parseResponse(data) || '';
            onChunk(text, true);
            return text;
        }

        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]') continue;
                if (!trimmed.startsWith('data: ')) continue;

                try {
                    const json = JSON.parse(trimmed.slice(6));
                    let chunk = '';

                    if (provider === 'anthropic') {
                        // Anthropic SSE: event types 'content_block_delta'
                        chunk = json.delta?.text || '';
                    } else if (provider === 'gemini') {
                        chunk = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    } else {
                        // OpenAI / DeepSeek / Custom — standard chat completion SSE
                        chunk = json.choices?.[0]?.delta?.content || '';
                    }

                    if (chunk) {
                        fullText += chunk;
                        onChunk(fullText, false);
                    }
                } catch { /* skip malformed SSE line */ }
            }
        }

        onChunk(fullText, true);
        return fullText;
    }

    /** Throw a descriptive error for HTTP error codes */
    _throwOnHttpError(response, provider) {
        if (response.ok) return;

        const code = response.status;
        let userMessage;

        switch (code) {
            case 401:
                userMessage = translate('aiError401') || 'API 키가 유효하지 않거나 만료되었습니다. 설정에서 키를 확인하세요.';
                break;
            case 403:
                userMessage = translate('aiError403') || '이 모델에 대한 접근 권한이 없습니다.';
                break;
            case 404:
                userMessage = translate('aiError404') || '모델 또는 엔드포인트를 찾을 수 없습니다. 모델명을 확인하세요.';
                break;
            case 429:
                userMessage = translate('aiError429') || '요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.';
                break;
            case 500: case 502: case 503:
                userMessage = translate('aiError5xx') || 'AI 서버에 문제가 발생했습니다. 잠시 후 다시 시도하세요.';
                break;
            default:
                userMessage = `${translate('aiErrorGeneric') || 'API 오류'} (${code})`;
        }

        const err = new Error(userMessage);
        err.statusCode = code;
        err.provider = provider;
        throw err;
    }

    // ─── Rendering ────────────────────────────────────────────

    _render() {
        const isMed = this.mode === 'medication';
        const headerTitle = isMed
            ? `<span class="material-symbols-outlined mi-inline">medication</span> ${translate('aiMedicationTitle') || 'AI 약물 조언'}`
            : `<span class="material-symbols-outlined mi-inline">auto_awesome</span> AI ${translate('actionGuideModalTitle') || 'Action Guide'}`;

        const overlay = this._mount('ai-advisor-overlay', `
            <div class="ai-advisor-surface">
                <div class="ai-advisor-header">
                    <h2>${headerTitle}</h2>
                    <button class="ai-advisor-close">&times;</button>
                </div>
                <div class="ai-advisor-content">
                    <div class="ai-advisor-loading">
                        <div class="ai-advisor-spinner"></div>
                        <p>${translate('aiAnalyzing') || 'AI가 분석 중...'}</p>
                    </div>
                </div>
            </div>
        `, '.ai-advisor-close');

        // Refresh function — accessible from the rendered button
        overlay.__refreshFn = () => {
            const prompt = this.mode === 'medication' ? this.buildMedicationPrompt() : this.buildPrompt();
            const hash = this._simpleHash(prompt);
            // Clear cache for this prompt
            this._deleteCachedResponse(hash);
            const contentEl = this.overlay?.querySelector('.ai-advisor-content');
            if (contentEl) {
                contentEl.innerHTML = `
                    <div class="ai-advisor-loading">
                        <div class="ai-advisor-spinner"></div>
                        <p>${translate('aiAnalyzing') || 'AI가 분석 중...'}</p>
                    </div>`;
            }
            this._loadContent();
        };

        this._loadContent();
    }

    async _loadContent() {
        const contentEl = this.overlay?.querySelector('.ai-advisor-content');
        if (!contentEl) return;

        const prompt = this.mode === 'medication' ? this.buildMedicationPrompt() : this.buildPrompt();
        const hash = this._simpleHash(prompt);

        // Check cache first
        const cached = this._getCachedResponse(hash);
        if (cached) {
            contentEl.innerHTML = this._wrapResponse(this._formatMarkdown(cached), true);
            return;
        }

        // Check API key
        const { apiKey } = this._getApiConfig();
        if (!apiKey) {
            contentEl.innerHTML = `
                <div class="ai-advisor-error">
                    <div class="ai-advisor-error-icon"><span class="material-symbols-outlined mi-xl">vpn_key</span></div>
                    <p>${translate('aiNoApiKey') || 'API 키가 설정되지 않았습니다'}</p>
                    <p class="ai-advisor-error-hint">${translate('aiNoApiKeyHint') || '설정 → AI API에서 키를 입력하세요'}</p>
                </div>
            `;
            return;
        }

        try {
            // Attempt streaming first
            let fullText = '';
            const responseDiv = document.createElement('div');
            responseDiv.className = 'ai-advisor-response ai-advisor-streaming';
            contentEl.innerHTML = '';
            contentEl.appendChild(responseDiv);

            fullText = await this._callApiStream(prompt, (text, isDone) => {
                responseDiv.innerHTML = this._formatMarkdown(text);
                if (isDone) {
                    responseDiv.classList.remove('ai-advisor-streaming');
                }
                // Auto-scroll to bottom during streaming
                contentEl.scrollTop = contentEl.scrollHeight;
            });

            this._setCachedResponse(hash, fullText);

            // Add refresh button after streaming completes
            contentEl.innerHTML = this._wrapResponse(this._formatMarkdown(fullText), false);
        } catch (error) {
            console.error('AI Advisor error:', error);

            // Pick error icon based on status code
            const icon = error.statusCode === 401 ? 'vpn_key_off' :
                         error.statusCode === 429 ? 'hourglass_top' :
                         'warning';

            contentEl.innerHTML = `
                <div class="ai-advisor-error">
                    <div class="ai-advisor-error-icon"><span class="material-symbols-outlined mi-xl">${icon}</span></div>
                    <p>${translate('aiError') || 'AI 응답을 받을 수 없습니다'}</p>
                    <p class="ai-advisor-error-hint">${this._escHtml(error.message)}</p>
                    <button class="ai-advisor-refresh btn-filled-tonal" onclick="this.closest('.ai-advisor-overlay').__refreshFn?.()">
                        <span class="material-symbols-outlined mi-inline mi-sm">refresh</span> ${translate('aiRetry') || '다시 시도'}
                    </button>
                </div>
            `;
        }
    }

    // ─── Markdown Rendering ───────────────────────────────────

    /** Full markdown → HTML conversion */
    _formatMarkdown(raw) {
        if (!raw) return '';
        const lines = raw.split('\n');
        const out = [];
        let inCodeBlock = false;
        let codeLang = '';
        let codeLines = [];
        let inList = null; // 'ul' | 'ol' | null

        const closeList = () => {
            if (inList) { out.push(`</${inList}>`); inList = null; }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // ─ Fenced code blocks ─
            if (/^```/.test(line)) {
                if (!inCodeBlock) {
                    closeList();
                    inCodeBlock = true;
                    codeLang = line.slice(3).trim();
                    codeLines = [];
                } else {
                    out.push(`<pre><code${codeLang ? ` class="language-${this._escHtml(codeLang)}"` : ''}>${this._escHtml(codeLines.join('\n'))}</code></pre>`);
                    inCodeBlock = false;
                }
                continue;
            }
            if (inCodeBlock) { codeLines.push(line); continue; }

            // ─ Horizontal rule ─
            if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
                closeList();
                out.push('<hr>');
                continue;
            }

            // ─ Headings ─
            const headMatch = line.match(/^(#{1,4})\s+(.+)$/);
            if (headMatch) {
                closeList();
                const level = headMatch[1].length;
                const tag = `h${level + 1}`; // # → h2, ## → h3, etc.
                out.push(`<${tag}>${this._inlineFormat(headMatch[2])}</${tag}>`);
                continue;
            }

            // ─ Unordered list ─
            const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
            if (ulMatch) {
                if (inList !== 'ul') { closeList(); inList = 'ul'; out.push('<ul>'); }
                out.push(`<li>${this._inlineFormat(ulMatch[2])}</li>`);
                continue;
            }

            // ─ Ordered list ─
            const olMatch = line.match(/^(\s*)\d+[.)]\s+(.+)$/);
            if (olMatch) {
                if (inList !== 'ol') { closeList(); inList = 'ol'; out.push('<ol>'); }
                out.push(`<li>${this._inlineFormat(olMatch[2])}</li>`);
                continue;
            }

            // ─ Empty line → paragraph break ─
            if (line.trim() === '') {
                closeList();
                out.push('');
                continue;
            }

            // ─ Normal paragraph line ─
            closeList();
            out.push(`<p>${this._inlineFormat(line)}</p>`);
        }

        // Close any open blocks
        if (inCodeBlock) {
            out.push(`<pre><code>${this._escHtml(codeLines.join('\n'))}</code></pre>`);
        }
        closeList();

        // Merge consecutive <p> tags separated by empty strings into paragraphs
        return out.filter(l => l !== '').join('\n');
    }

    /** Inline markdown formatting: bold, italic, code, links */
    _inlineFormat(text) {
        let s = this._escHtml(text);
        // inline code
        s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
        // bold + italic
        s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        // bold
        s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // italic
        s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
        // links [text](url)
        s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        return s;
    }

    /** Wrap formatted HTML with cache badge and refresh button */
    _wrapResponse(html, fromCache) {
        const cacheLabel = fromCache ?
            `<div class="ai-advisor-cache-badge"><span class="material-symbols-outlined mi-inline mi-sm">schedule</span> ${translate('aiCached') || '캐시됨 (24시간)'}</div>` : '';

        return `
            ${cacheLabel}
            <div class="ai-advisor-response">${html}</div>
            <button class="ai-advisor-refresh btn-text" onclick="this.closest('.ai-advisor-overlay').__refreshFn?.()">
                <span class="material-symbols-outlined mi-inline mi-sm">refresh</span> ${translate('aiRefresh') || '새로 분석하기'}
            </button>
        `;
    }

    _escHtml(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}
