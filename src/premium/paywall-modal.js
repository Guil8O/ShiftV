/**
 * Paywall Modal — 프리미엄 업그레이드 유도 모달
 * @module src/premium/paywall-modal
 *
 * Usage:
 *   import { showPaywall } from './premium/paywall-modal.js';
 *   const check = canUseFeature('pdf_report');
 *   if (!check.allowed) showPaywall(check.reason, { feature: 'pdf_report', limit: check.limit });
 */

import { translate, getCurrentLanguage } from '../translations.js';
import { svgIcon } from '../ui/icon-paths.js';
import { getPlan, getPlanInfo, isPremium, applyPromoCode } from './premium-manager.js';

let _overlay = null;

function _ensureOverlay() {
    if (_overlay && document.body.contains(_overlay)) return _overlay;
    _overlay = document.createElement('div');
    _overlay.className = 'paywall-overlay';
    _overlay.addEventListener('click', (e) => {
        if (e.target === _overlay) closePaywall();
    });
    return _overlay;
}

/** Feature name i18n mapping */
function _featureLabel(feature) {
    const map = {
        pdf_report: 'featurePdfReport',
        ai_analysis: 'featureAiAnalysis',
        data_export: 'featureDataExport',
    };
    return translate(map[feature] || feature);
}

/**
 * Show the paywall modal.
 * @param {'daily_limit'|'premium_required'} reason
 * @param {Object} opts - { feature, limit, used }
 */
export function showPaywall(reason, opts = {}) {
    const overlay = _ensureOverlay();
    const currentPlan = getPlan();

    const titleKey = reason === 'daily_limit' ? 'paywallDailyLimit' : 'paywallPremiumRequired';
    const descKey = reason === 'daily_limit' ? 'paywallDailyLimitDesc' : 'paywallPremiumRequiredDesc';
    const title = translate(titleKey);
    const desc = translate(descKey, {
        feature: _featureLabel(opts.feature),
        limit: opts.limit || '',
    });

    overlay.innerHTML = `
    <div class="paywall-sheet">
        <button class="paywall-close" aria-label="Close">${svgIcon('close', 'mi-inline')}</button>
        <div class="paywall-header">
            <div class="paywall-icon">${svgIcon('workspace_premium', 'mi-lg')}</div>
            <h2 class="paywall-title">${title}</h2>
            <p class="paywall-desc">${desc}</p>
        </div>

        <div class="paywall-plans">
            ${_renderPlanCard('plus', currentPlan)}
            ${_renderPlanCard('ai_plus', currentPlan)}
        </div>

        <div class="paywall-promo">
            <details>
                <summary>${translate('promoCodeLabel')}</summary>
                <div class="paywall-promo-form">
                    <input type="text" class="paywall-promo-input" placeholder="${translate('promoCodePlaceholder')}" maxlength="40" autocomplete="off">
                    <button class="paywall-promo-btn">${translate('promoCodeApply')}</button>
                </div>
                <p class="paywall-promo-result" style="display:none"></p>
            </details>
        </div>

        <button class="paywall-later">${translate('paywallMaybeLater')}</button>
    </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));
    document.body.classList.add('modal-open');

    // Event wiring
    overlay.querySelector('.paywall-close').addEventListener('click', closePaywall);
    overlay.querySelector('.paywall-later').addEventListener('click', closePaywall);

    // Plan card buttons
    overlay.querySelectorAll('.paywall-plan-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const plan = btn.dataset.plan;
            _handleUpgrade(plan);
        });
    });

    // Promo code
    const promoBtn = overlay.querySelector('.paywall-promo-btn');
    const promoInput = overlay.querySelector('.paywall-promo-input');
    const promoResult = overlay.querySelector('.paywall-promo-result');
    promoBtn.addEventListener('click', () => {
        const code = promoInput.value.trim();
        if (!code) return;
        const result = applyPromoCode(code);
        promoResult.style.display = '';
        if (result.success) {
            const planInfo = getPlanInfo(result.plan);
            promoResult.textContent = translate('promoCodeSuccess', { plan: planInfo.name });
            promoResult.className = 'paywall-promo-result success';
            setTimeout(() => closePaywall(), 1500);
        } else {
            promoResult.textContent = translate('promoCodeInvalid');
            promoResult.className = 'paywall-promo-result error';
        }
    });
    promoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') promoBtn.click();
    });
}

export function closePaywall() {
    if (_overlay) {
        _overlay.classList.remove('visible');
        document.body.classList.remove('modal-open');
        setTimeout(() => {
            if (_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
        }, 300);
    }
}

export function isPaywallOpen() {
    return _overlay && _overlay.classList.contains('visible');
}

/* ─── Plan Cards ───────────────────────────────────────────────────── */

function _renderPlanCard(plan, currentPlan) {
    const info = getPlanInfo(plan);
    const isCurrent = currentPlan === plan;
    const features = _planFeatures(plan);

    return `
    <div class="paywall-plan ${plan === 'ai_plus' ? 'recommended' : ''} ${isCurrent ? 'current' : ''}">
        ${plan === 'ai_plus' ? '<span class="paywall-plan-badge">★ BEST</span>' : ''}
        <h3 class="paywall-plan-name">${info.name}</h3>
        <div class="paywall-plan-price">${info.price || translate('priceFree')}</div>
        ${info.oneTime ? `<span class="paywall-plan-billing">${translate('planOneTime')}</span>` : ''}
        ${info.yearly ? `<span class="paywall-plan-billing">${translate('planYearly')}: ${info.yearly}</span>` : ''}
        <ul class="paywall-plan-features">
            ${features.map(f => `<li>${svgIcon('check_circle', 'mi-inline mi-sm')} ${f}</li>`).join('')}
        </ul>
        <button class="paywall-plan-btn ${isCurrent ? 'disabled' : ''}" data-plan="${plan}" ${isCurrent ? 'disabled' : ''}>
            ${isCurrent ? translate('planCurrent') : translate('paywallUpgradeBtn')}
        </button>
    </div>`;
}

function _planFeatures(plan) {
    if (plan === 'plus') return [
        translate('featureAdFree'),
        translate('featureUnlimitedPdf'),
        translate('featureCloudMulti', { n: 3 }),
        translate('featurePhotoCloud'),
        translate('featurePremiumBadge'),
    ];
    if (plan === 'ai_plus') return [
        translate('featureAdFree'),
        translate('featureUnlimitedPdf'),
        translate('featureAiTokens', { n: 20 }),
        translate('featureCloudMulti', { n: '∞' }),
        translate('featurePhotoCloud'),
        translate('featurePremiumBadge'),
        translate('featurePrioritySupport'),
    ];
    return [];
}

/* ─── Upgrade Handler ──────────────────────────────────────────────── */

function _handleUpgrade(plan) {
    // Phase 4 backend not yet available — placeholder for Stripe / IAP integration
    // For now, show a message that payment will be available soon
    const btn = _overlay?.querySelector(`.paywall-plan-btn[data-plan="${plan}"]`);
    if (btn) {
        btn.textContent = 'Coming Soon';
        btn.disabled = true;
        btn.classList.add('disabled');
    }
}
