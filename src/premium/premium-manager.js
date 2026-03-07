/**
 * PremiumManager — 구독 상태 관리 & 기능 게이팅
 * @module src/premium/premium-manager
 *
 * Plans: 'free' | 'plus' | 'ai_plus'
 * - free:    기본 기능, 배너 광고, PDF 하루 1회, AI는 개인 API만
 * - plus:    ₩4,900 일회성, 광고 제거, PDF 무제한, 클라우드 3기기
 * - ai_plus: ₩4,900/월, AI 토큰 20회/일, 멀티기기 실시간 동기화
 */

const STORAGE_KEY = 'shiftV_subscription';
const USAGE_KEY = 'shiftV_featureUsage';

/** @type {'free'|'plus'|'ai_plus'} */
let _plan = 'free';
let _expiry = null;        // ISO string or null (plus = null = forever)
let _promoCode = null;
let _listeners = [];

// ── Feature definitions ──────────────────────────────────────────────
const FEATURES = {
    pdf_report:     { free: { daily: 1 }, plus: true, ai_plus: true },
    ai_analysis:    { free: 'personal_api', plus: 'personal_api', ai_plus: { daily: 20 } },
    cloud_sync:     { free: { devices: 1, photos: false }, plus: { devices: 3, photos: true }, ai_plus: { devices: Infinity, photos: true } },
    photo_cloud:    { free: false, plus: true, ai_plus: true },
    ad_free:        { free: false, plus: true, ai_plus: true },
    premium_badge:  { free: false, plus: true, ai_plus: true },
    priority_support: { free: false, plus: false, ai_plus: true },
};

// ── Promo codes (hashed comparison for minimal exposure) ─────────────
// Codes are compared directly but never logged or displayed
const PROMO_CODES = {
    'promo0306DIPDOGplusC0DE2O26':    { plan: 'plus', duration: null },
    'promo0306DIPDOGaiplusC0DE2O26':   { plan: 'ai_plus', duration: null },
    'thankshiftv2026':                  { plan: 'ai_plus', duration: 30 }, // 30 days trial
};

// ── Internal helpers ─────────────────────────────────────────────────

function _today() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function _loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        _plan = data.plan || 'free';
        _expiry = data.expiry || null;
        _promoCode = data.promoCode || null;
        _checkExpiry();
    } catch { /* corrupt → stay free */ }
}

function _saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            plan: _plan,
            expiry: _expiry,
            promoCode: _promoCode,
        }));
    } catch { /* storage full → ignore */ }
}

function _checkExpiry() {
    if (_expiry && new Date(_expiry) < new Date()) {
        _plan = 'free';
        _expiry = null;
        _promoCode = null;
        _saveToStorage();
    }
}

function _getUsage() {
    try {
        const raw = localStorage.getItem(USAGE_KEY);
        if (!raw) return {};
        const data = JSON.parse(raw);
        // Reset if date changed
        if (data._date !== _today()) return {};
        return data;
    } catch { return {}; }
}

function _setUsage(feature, count) {
    const usage = _getUsage();
    usage._date = _today();
    usage[feature] = count;
    try {
        localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
    } catch { /* ignore */ }
}

function _notify() {
    _listeners.forEach(fn => { try { fn(_plan); } catch { /* ignore */ } });
}

// ── Public API ───────────────────────────────────────────────────────

/** Initialise — call once at app startup */
export function initPremium() {
    _loadFromStorage();
}

/** Current plan: 'free' | 'plus' | 'ai_plus' */
export function getPlan() {
    _checkExpiry();
    return _plan;
}

/** True if plan is 'plus' or 'ai_plus' */
export function isPremium() {
    return getPlan() !== 'free';
}

/** Subscription expiry date string, or null */
export function getExpiry() {
    return _expiry;
}

/**
 * Check whether user can use a gated feature.
 * Returns: { allowed: true } | { allowed: false, reason: string, limit?: number }
 */
export function canUseFeature(featureName) {
    _checkExpiry();
    const def = FEATURES[featureName];
    if (!def) return { allowed: true }; // Unknown feature → allow

    const planDef = def[_plan];

    // Boolean gate
    if (planDef === true) return { allowed: true };
    if (planDef === false) return { allowed: false, reason: 'premium_required' };

    // String gate (e.g., 'personal_api')
    if (planDef === 'personal_api') return { allowed: true, mode: 'personal_api' };

    // Daily rate limit
    if (planDef && typeof planDef === 'object' && planDef.daily) {
        const usage = _getUsage();
        const used = usage[featureName] || 0;
        if (used >= planDef.daily) {
            return { allowed: false, reason: 'daily_limit', limit: planDef.daily, used };
        }
        return { allowed: true, remaining: planDef.daily - used };
    }

    // Object config (e.g., cloud_sync devices)
    if (planDef && typeof planDef === 'object') return { allowed: true, ...planDef };

    return { allowed: true };
}

/**
 * Record one use of a rate-limited feature. Call AFTER the action succeeds.
 */
export function recordFeatureUse(featureName) {
    const usage = _getUsage();
    const used = (usage[featureName] || 0) + 1;
    _setUsage(featureName, used);
}

/**
 * Apply a promo code. Returns { success, plan?, message }.
 */
export function applyPromoCode(code) {
    const trimmed = (code || '').trim();
    const promo = PROMO_CODES[trimmed];
    if (!promo) {
        return { success: false, message: 'invalid_promo_code' };
    }
    _plan = promo.plan;
    _promoCode = trimmed;
    if (promo.duration) {
        const d = new Date();
        d.setDate(d.getDate() + promo.duration);
        _expiry = d.toISOString();
    } else {
        _expiry = null; // permanent (for dev codes)
    }
    _saveToStorage();
    _notify();
    return { success: true, plan: _plan, expiry: _expiry };
}

/**
 * Set subscription from external source (Stripe webhook, Firestore sync, IAP).
 * @param {'free'|'plus'|'ai_plus'} plan
 * @param {string|null} expiry - ISO date string or null
 */
export function setSubscription(plan, expiry = null) {
    _plan = plan;
    _expiry = expiry;
    _promoCode = null;
    _saveToStorage();
    _notify();
}

/**
 * Sync subscription state from Firestore (call after auth).
 * @param {Function} getDocFn - async (uid) => { plan, expiry } | null
 * @param {string} uid
 */
export async function syncFromFirestore(getDocFn, uid) {
    if (!uid || !getDocFn) return;
    try {
        const remote = await getDocFn(uid);
        if (remote && remote.plan) {
            _plan = remote.plan;
            _expiry = remote.expiry || null;
            _promoCode = null;
            _saveToStorage();
            _notify();
        }
    } catch (e) {
        console.warn('[Premium] Firestore sync failed:', e);
    }
}

/** Subscribe to plan changes */
export function onPlanChange(fn) {
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter(f => f !== fn); };
}

/** Get the feature config map (read-only, for UI display) */
export function getFeatureConfig() {
    return FEATURES;
}

/** Get plan display info */
export function getPlanInfo(plan) {
    const info = {
        free:     { name: 'Free', price: null, badge: null },
        plus:     { name: 'Plus', price: '₩4,900', badge: 'plus', oneTime: true },
        ai_plus:  { name: 'AI Plus', price: '₩4,900/월', badge: 'ai_plus', monthly: '₩4,900', yearly: '₩46,800' },
    };
    return info[plan] || info.free;
}
