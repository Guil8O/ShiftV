/**
 * Onboarding Flow — 6-step first-run wizard
 * Auto-shows when profile.onboardingCompleted !== true
 * Re-runnable from Settings tab
 */

// Import directly from shared translation module
import { translate, getCurrentLanguage, setCurrentLanguage } from '../../translations.js';
import { signInWithGoogle } from '../../firebase/auth.js';
import { svgIcon } from '../icon-paths.js';
const setLanguage = (lang) => {
    setCurrentLanguage(lang);
    // Also sync with script.js's local currentLanguage
    window.__shiftv_setLanguage?.(lang);
};

const ONBOARDING_KEY = 'shiftV_onboardingCompleted';
const TEMP_DATA_KEY = 'shiftV_onboardingTemp';

// 온보딩 내 라이브 프리븷용 PRESET_HEX (theme-manager.js와 동일하게 유지)
const OB_PRESET_HEX = {
    'rose':   '#B02F5B',
    'coral':  '#9B406B',
    'violet': '#7A4A9E',
    'indigo': '#4355B9',
    'sky':    '#006493',
    'cyan':   '#006874',
    'teal':   '#006A60',
    'lime':   '#1A6C30',
    'amber':  '#855400',
    'gold':   '#8E4E00',
};
const OB_DEFAULT_ACCENT = 'violet';
const OB_DEFAULT_THEME  = 'system';

export class OnboardingFlow {
    constructor(options = {}) {
        this.currentStep = 0;
        this.totalSteps = 6;
        this.overlay = null;
        this.onComplete = options.onComplete || (() => {});
        this.tempData = this._loadTemp();
    }

    // ── Check if onboarding needed ──
    static shouldShow() {
        return localStorage.getItem(ONBOARDING_KEY) !== 'true';
    }

    // ── Public API ──

    start() {
        this.currentStep = 0;
        this._applyDefaultsToDOM();
        this._render();
    }

    /** 온보딩 시작 시 기본 system/violet 테마를 DOM에 즉시 적용
     *  — 온보딩 화면 자체가 제대로 보이도록 */
    _applyDefaultsToDOM() {
        if (!localStorage.getItem('shiftV_accentColor')) {
            localStorage.setItem('shiftV_accentColor', OB_DEFAULT_ACCENT);
        }
        // tempData에도 기본값 세팅 (이후 _step5Theme에서 스킭 active 표시용)
        if (!this.tempData.theme)  this.tempData.theme  = OB_DEFAULT_THEME;
        if (!this.tempData.accent) this.tempData.accent = localStorage.getItem('shiftV_accentColor') || OB_DEFAULT_ACCENT;
        this._saveTemp(); // 기본값 localStorage 임시저장에도 반영
        // 메인 앱에 노출된 applyTheme로 통일 적용
        window.__shiftv_applyTheme?.();
    }

    close() {
        if (this.overlay) {
            this.overlay.classList.remove('visible');
            setTimeout(() => {
                this.overlay?.remove();
                this.overlay = null;
            }, 300);
        }
    }

    complete() {
        localStorage.setItem(ONBOARDING_KEY, 'true');
        this._applyTempData();
        this._clearTemp();
        this.close();
        this.onComplete();
    }

    // ── Temp data ──

    _loadTemp() {
        try { return JSON.parse(localStorage.getItem(TEMP_DATA_KEY) || '{}'); }
        catch { return {}; }
    }

    _saveTemp() {
        localStorage.setItem(TEMP_DATA_KEY, JSON.stringify(this.tempData));
    }

    _clearTemp() {
        localStorage.removeItem(TEMP_DATA_KEY);
    }

    _applyTempData() {
        const d = this.tempData;
        if (d.language) {
            localStorage.setItem('shiftV_Language', d.language);
            try { setLanguage(d.language); } catch {}
        }
        if (d.nickname) localStorage.setItem('shiftV_nickname', d.nickname);
        if (d.birthdate) localStorage.setItem('shiftV_birthdate', d.birthdate);
        if (d.mode) localStorage.setItem('shiftV_Mode', d.mode);
        if (d.sex) localStorage.setItem('shiftV_BiologicalSex', d.sex);
        if (d.theme) localStorage.setItem('shiftV_Theme', d.theme);
        if (d.accent) localStorage.setItem('shiftV_accentColor', d.accent);
        if (d.goalText) localStorage.setItem('shiftV_goalText', d.goalText);
    }

    // ── Rendering ──

    _render() {
        if (this.overlay) this.overlay.remove();

        const overlay = document.createElement('div');
        overlay.className = 'onboarding-overlay';
        overlay.innerHTML = `
            <div class="onboarding-surface">
                <div class="onboarding-content" id="onboarding-step-content"></div>
                <div class="onboarding-footer">
                    <div class="onboarding-dots">
                        ${Array.from({length: this.totalSteps}, (_, i) =>
                            `<span class="onboarding-dot ${i === this.currentStep ? 'active' : ''}" data-step="${i}"></span>`
                        ).join('')}
                    </div>
                    <div class="onboarding-actions">
                        <button class="btn-text onboarding-back" style="display: none;">${translate('onboardingBack')}</button>
                        <button class="btn-text onboarding-skip">${translate('onboardingSkip')}</button>
                        <button class="btn-filled onboarding-next">${translate('onboardingNext')}</button>
                    </div>
                </div>
            </div>
        `;

        overlay.querySelector('.onboarding-back').addEventListener('click', () => this._prevStep());
        overlay.querySelector('.onboarding-skip').addEventListener('click', () => this.complete());
        overlay.querySelector('.onboarding-next').addEventListener('click', () => this._nextStep());

        document.body.appendChild(overlay);
        this.overlay = overlay;
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
            this._renderStep();
        });

        // Touch swipe
        let startX = 0;
        const content = overlay.querySelector('.onboarding-content');
        content.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
        content.addEventListener('touchend', e => {
            const diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) this._nextStep();
                else this._prevStep();
            }
        }, { passive: true });
    }

    _nextStep() {
        this._collectStepData();
        if (this.currentStep >= this.totalSteps - 1) {
            this.complete();
            return;
        }
        this.currentStep++;
        this._renderStep();
    }

    _prevStep() {
        if (this.currentStep <= 0) return;
        this._collectStepData();
        this.currentStep--;
        this._renderStep();
    }

    _renderStep() {
        const content = this.overlay?.querySelector('#onboarding-step-content');
        const dotsContainer = this.overlay?.querySelector('.onboarding-dots');
        const nextBtn = this.overlay?.querySelector('.onboarding-next');
        const backBtn = this.overlay?.querySelector('.onboarding-back');
        const skipBtn = this.overlay?.querySelector('.onboarding-skip');
        if (!content) return;

        // Update dots
        dotsContainer?.querySelectorAll('.onboarding-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === this.currentStep);
        });

        // Update button text and visibility
        if (nextBtn) {
            nextBtn.textContent = this.currentStep === this.totalSteps - 1 ?
                translate('onboardingFinish') :
                translate('onboardingNext');
        }
        if (backBtn) {
            backBtn.style.display = this.currentStep > 0 ? 'inline-flex' : 'none';
            backBtn.textContent = translate('onboardingBack');
        }
        if (skipBtn) {
            skipBtn.style.display = this.currentStep === 0 ? 'inline-flex' : 'none';
            skipBtn.textContent = translate('onboardingSkip');
        }

        const steps = [
            () => this._step1Welcome(content),
            () => this._step2Account(content),
            () => this._step3Persona(content),
            () => this._step4Goals(content),
            () => this._step5Theme(content),
            () => this._step6GuideTour(content),
        ];

        content.style.opacity = '0';
        setTimeout(() => {
            steps[this.currentStep]();
            content.style.opacity = '1';
        }, 150);
    }

    // ══════════════════════════════════════════════
    // STEPS
    // ══════════════════════════════════════════════

    _step1Welcome(el) {
        const lang = this.tempData.language || getCurrentLanguage();
        el.innerHTML = `
            <div class="onboarding-step-center">
                <div class="onboarding-logo">ShiftV</div>
                <h2>${translate('onboardingWelcome')}</h2>
                <p class="onboarding-sub">${translate('onboardingWelcomeSub')}</p>
                <div class="onboarding-lang-chips">
                    <button class="onboarding-lang-chip ${lang === 'ko' ? 'active' : ''}" data-lang="ko">🇰🇷 한국어</button>
                    <button class="onboarding-lang-chip ${lang === 'en' ? 'active' : ''}" data-lang="en">🇺🇸 English</button>
                    <button class="onboarding-lang-chip ${lang === 'ja' ? 'active' : ''}" data-lang="ja">🇯🇵 日本語</button>
                </div>
            </div>
        `;
        el.querySelectorAll('.onboarding-lang-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const selectedLang = chip.dataset.lang;
                this.tempData.language = selectedLang;
                this._saveTemp();

                // Apply language immediately so the rest of the onboarding shows in chosen language
                setLanguage(selectedLang);

                // Re-render the entire step (buttons + content) with the new language
                this._renderStep();
            });
        });
    }

    _step2Account(el) {
        el.innerHTML = `
            <div class="onboarding-step-center">
                <div class="onboarding-step-icon">${svgIcon('cloud', 'mi-xl')}</div>
                <h2>${translate('onboardingAccountTitle')}</h2>
                <p class="onboarding-sub">${translate('onboardingAccountSub')}</p>
                <div class="onboarding-account-options">
                    <button class="glass-button primary onboarding-google-btn" id="onboarding-google-btn">
                        ${translate('onboardingGoogleLogin')}
                    </button>
                    <button class="btn-text onboarding-skip-account">
                        ${translate('onboardingLocalOnly')}
                    </button>
                </div>
                <p class="onboarding-hint" id="onboarding-account-hint" style="display:none;">
                    ${translate('onboardingLocalHint')}
                </p>
            </div>
        `;
        el.querySelector('.onboarding-skip-account')?.addEventListener('click', () => {
            const hint = el.querySelector('#onboarding-account-hint');
            if (hint) hint.style.display = 'block';
        });
        el.querySelector('#onboarding-google-btn')?.addEventListener('click', () => {
            try {
                Promise.resolve(signInWithGoogle()).then((user) => {
                    if (user) this._nextStep();
                });
            } catch (err) {
                console.error('Google login during onboarding:', err);
            }
        });
    }

    _step3Persona(el) {
        const d = this.tempData;
        el.innerHTML = `
            <div class="onboarding-step-center">
                <div class="onboarding-step-icon">${svgIcon('auto_awesome', 'mi-xl')}</div>
                <h2>${translate('onboardingPersonaTitle')}</h2>
                <div class="onboarding-form">
                    <div class="quest-form-group">
                        <label>${translate('nickname')}</label>
                        <input type="text" id="ob-nickname" value="${d.nickname || ''}" maxlength="20" placeholder="">
                    </div>
                    <div class="quest-form-row">
                        <div class="quest-form-group">
                            <label>${translate('biologicalSex')}</label>
                            <select id="ob-sex">
                                <option value="male" ${(d.sex || 'male') === 'male' ? 'selected' : ''}>${translate('sexMale')}</option>
                                <option value="female" ${d.sex === 'female' ? 'selected' : ''}>${translate('sexFemale')}</option>
                            </select>
                        </div>
                        <div class="quest-form-group">
                            <label>${translate('mode')}</label>
                            <select id="ob-mode">
                                <option value="mtf" ${(d.mode || 'mtf') === 'mtf' ? 'selected' : ''}>MTF</option>
                                <option value="ftm" ${d.mode === 'ftm' ? 'selected' : ''}>FTM</option>
                                <option value="nonbinary" ${d.mode === 'nonbinary' ? 'selected' : ''}>${translate('modeNb')}</option>
                            </select>
                        </div>
                    </div>
                    <div class="quest-form-group">
                        <label>${translate('birthdate')}</label>
                        <input type="date" id="ob-birthdate" value="${d.birthdate || ''}">
                    </div>
                </div>
            </div>
        `;
    }

    _step4Goals(el) {
        el.innerHTML = `
            <div class="onboarding-step-center">
                <div class="onboarding-step-icon">${svgIcon('target', 'mi-xl')}</div>
                <h2>${translate('onboardingGoalsTitle')}</h2>
                <p class="onboarding-sub">${translate('onboardingGoalsSub')}</p>
                <div class="onboarding-form">
                    <div class="quest-form-group">
                        <textarea id="ob-goal-text" rows="3" maxlength="100" placeholder="${translate('goalTextPlaceholder')}">${this.tempData.goalText || ''}</textarea>
                    </div>
                </div>
            </div>
        `;
    }

    _step5Theme(el) {
        const currentTheme = this.tempData.theme || 'system';
        const currentAccent = this.tempData.accent || 'violet';
        const accentColors = [
            { name: 'rose', label: 'Rose', color: '#B02F5B' },
            { name: 'coral', label: 'Coral', color: '#9B406B' },
            { name: 'amber', label: 'Amber', color: '#855400' },
            { name: 'gold', label: 'Gold', color: '#8E4E00' },
            { name: 'lime', label: 'Lime', color: '#1A6C30' },
            { name: 'teal', label: 'Teal', color: '#006A60' },
            { name: 'cyan', label: 'Cyan', color: '#006874' },
            { name: 'sky', label: 'Sky', color: '#006493' },
            { name: 'indigo', label: 'Indigo', color: '#4355B9' },
            { name: 'violet', label: 'Violet', color: '#7A4A9E' },
        ];

        el.innerHTML = `
            <div class="onboarding-step-center">
                <div class="onboarding-step-icon">${svgIcon('palette', 'mi-xl')}</div>
                <h2>${translate('onboardingThemeTitle')}</h2>
                <div class="onboarding-theme-toggle">
                    <button class="onboarding-theme-btn ${currentTheme === 'light' ? 'active' : ''}" data-theme="light">${svgIcon('light_mode', 'mi-inline mi-sm')} ${translate('themeLight')}</button>
                    <button class="onboarding-theme-btn ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark">${svgIcon('dark_mode', 'mi-inline mi-sm')} ${translate('themeDark')}</button>
                    <button class="onboarding-theme-btn ${currentTheme === 'system' ? 'active' : ''}" data-theme="system">${svgIcon('settings', 'mi-inline mi-sm')} ${translate('themeSystem')}</button>
                </div>
                <div class="accent-color-grid" style="margin-top:20px;">
                    ${accentColors.map(c => `
                        <button class="accent-chip ${currentAccent === c.name ? 'active' : ''}" 
                            data-accent="${c.name}" style="background:${c.color};" title="${c.name}"></button>
                    `).join('')}
                    <div class="custom-color-picker-wrapper" style="position: relative; display: inline-block;">
                        <input type="color" id="onboarding-custom-accent-picker" style="opacity: 0; position: absolute; width: 100%; height: 100%; cursor: pointer;" value="${currentAccent.startsWith('#') ? currentAccent : '#ff0000'}">
                        <button class="accent-chip custom-color-btn ${currentAccent.startsWith('#') ? 'active' : ''}" id="onboarding-custom-color-btn" style="background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red);" aria-label="Custom Color" title="Custom Color"></button>
                    </div>
                </div>
            </div>
        `;

        el.querySelectorAll('.onboarding-theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.tempData.theme = btn.dataset.theme;
                this._saveTemp();
                el.querySelectorAll('.onboarding-theme-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Live preview — apply theme to DOM immediately
                let themeToApply = btn.dataset.theme;
                if (themeToApply === 'system') {
                    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                    themeToApply = prefersDark ? 'dark' : 'light';
                }
                document.documentElement.setAttribute('data-theme', themeToApply);
                document.body.classList.remove('light-mode', 'dark-mode');
                document.body.classList.add(themeToApply === 'light' ? 'light-mode' : 'dark-mode');
                
                const themeColorMeta = document.querySelector('meta[name="theme-color"]');
                if (themeColorMeta) {
                    themeColorMeta.setAttribute('content', themeToApply === 'light' ? '#FBF8FD' : '#131316');
                }
                
                // Re-apply dynamic theme for current accent
                if (window.applyDynamicTheme) {
                    const accent = this.tempData.accent || OB_DEFAULT_ACCENT;
                    const hexColor = accent.startsWith('#') ? accent : (OB_PRESET_HEX[accent] || OB_PRESET_HEX[OB_DEFAULT_ACCENT]);
                    window.applyDynamicTheme(hexColor, themeToApply === 'dark');
                }
            });
        });

        el.querySelectorAll('.accent-chip').forEach(chip => {
            if (chip.id === 'onboarding-custom-color-btn') return;
            chip.addEventListener('click', () => {
                this.tempData.accent = chip.dataset.accent;
                this._saveTemp();
                el.querySelectorAll('.accent-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                // Live preview — set data-accent on root
                document.documentElement.setAttribute('data-accent', chip.dataset.accent);
                document.documentElement.removeAttribute('data-custom-theme');
                for (let i = document.documentElement.style.length - 1; i >= 0; i--) {
                    const name = document.documentElement.style[i];
                    if (name.startsWith('--md-sys-color-')) {
                        document.documentElement.style.removeProperty(name);
                    }
                }
                // Apply dynamic theme with current theme mode
                if (window.applyDynamicTheme) {
                    const hexColor = OB_PRESET_HEX[chip.dataset.accent] || OB_PRESET_HEX[OB_DEFAULT_ACCENT];
                    const curTheme = this.tempData.theme || OB_DEFAULT_THEME;
                    const isDark = curTheme === 'dark' || (curTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    window.applyDynamicTheme(hexColor, isDark);
                }
            });
        });

        const customPicker = el.querySelector('#onboarding-custom-accent-picker');
        const customBtn = el.querySelector('#onboarding-custom-color-btn');

        // 버튼 클릭 → 숨겨진 input[type=color] 피커 열기
        if (customBtn) {
            customBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                customPicker?.click();
            });
        }

        if (customPicker) {
            customPicker.addEventListener('input', (e) => {
                const hexColor = e.target.value;
                this.tempData.accent = hexColor;
                this._saveTemp();
                el.querySelectorAll('.accent-chip').forEach(c => c.classList.remove('active'));
                if (customBtn) customBtn.classList.add('active');
                document.documentElement.setAttribute('data-accent', hexColor);
                
                if (window.applyDynamicTheme) {
                    const isDark = this.tempData.theme === 'dark' || (this.tempData.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    window.applyDynamicTheme(hexColor, isDark);
                }
            });
        }
    }

    _step6GuideTour(el) {
        el.innerHTML = `
            <div class="onboarding-step-center">
                <div class="onboarding-step-icon">${svgIcon('home', 'mi-xl')}</div>
                <h2>${translate('onboardingTourTitle')}</h2>
                <p class="onboarding-sub">${translate('onboardingTourSub')}</p>
                <div class="onboarding-tour-cards">
                    <div class="onboarding-tour-card">
                        <span>${svgIcon('monitoring')}</span>
                        <p>${translate('onboardingTourChart')}</p>
                    </div>
                    <div class="onboarding-tour-card">
                        <span>${svgIcon('target')}</span>
                        <p>${translate('onboardingTourGuide')}</p>
                    </div>
                    <div class="onboarding-tour-card">
                        <span>${svgIcon('menu_book')}</span>
                        <p>${translate('onboardingTourDiary')}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // ══════════════════════════════════════════════
    // DATA COLLECTION
    // ══════════════════════════════════════════════

    _collectStepData() {
        switch (this.currentStep) {
            case 2: // Persona
                this.tempData.nickname = this.overlay?.querySelector('#ob-nickname')?.value?.trim() || '';
                this.tempData.sex = this.overlay?.querySelector('#ob-sex')?.value || 'male';
                this.tempData.mode = this.overlay?.querySelector('#ob-mode')?.value || 'mtf';
                this.tempData.birthdate = this.overlay?.querySelector('#ob-birthdate')?.value || '';
                this._saveTemp();
                break;
            case 3: // Goals
                this.tempData.goalText = this.overlay?.querySelector('#ob-goal-text')?.value?.trim() || '';
                this._saveTemp();
                break;
        }
    }
}
