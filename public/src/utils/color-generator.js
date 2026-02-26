// src/utils/color-generator.js
// Standalone HSL-based dynamic theme engine (no external dependencies).
// Generates all MD3 colour tokens from a single seed hex colour.
// - No pure white (l=100%) or pure black (l=0%) are ever emitted.
// - Three accent slots: primary (hue), secondary (hue+30°), tertiary (hue+60°).

function _hslHexToHsl(hex) {
    let r = parseInt(hex.slice(1,3),16)/255,
        g = parseInt(hex.slice(3,5),16)/255,
        b = parseInt(hex.slice(5,7),16)/255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    let h=0, s=0, l=(max+min)/2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d/(2-max-min) : d/(max+min);
        switch (max) {
            case r: h = ((g-b)/d + (g<b?6:0))/6; break;
            case g: h = ((b-r)/d + 2)/6; break;
            case b: h = ((r-g)/d + 4)/6; break;
        }
    }
    return [Math.round(h*360), Math.round(s*100), Math.round(l*100)];
}

function _clamp(v,mn,mx){ return Math.max(mn, Math.min(mx, v)); }

function _hsl(h, s, l) {
    return `hsl(${h}deg ${_clamp(s,0,100)}% ${_clamp(l,3,97)}%)`;
}

window.applyDynamicTheme = function(hexColor, isDark) {
    const [h, s] = _hslHexToHsl(hexColor);
    // Normalise saturation: keep it usable but not garish
    const sat = _clamp(s, 30, 65);
    const h2  = (h + 30) % 360; // secondary hue
    const h3  = (h + 60) % 360; // tertiary hue

    const root = document.documentElement;
    const sp = (k, v) => root.style.setProperty(k, v);

    if (isDark) {
        // ── Surfaces
        sp('--md-sys-color-background',               _hsl(h, Math.round(sat*.25),  8));
        sp('--md-sys-color-surface',                  _hsl(h, Math.round(sat*.25), 11));
        sp('--md-sys-color-surface-variant',          _hsl(h, Math.round(sat*.45), 20));
        sp('--md-sys-color-surface-container-lowest', _hsl(h, Math.round(sat*.20),  5));
        sp('--md-sys-color-surface-container-low',    _hsl(h, Math.round(sat*.20),  9));
        sp('--md-sys-color-surface-container',        _hsl(h, Math.round(sat*.25), 14));
        sp('--md-sys-color-surface-container-high',   _hsl(h, Math.round(sat*.30), 18));
        sp('--md-sys-color-surface-container-highest',_hsl(h, Math.round(sat*.35), 23));
        // ── Text
        sp('--md-sys-color-on-background',      _hsl(h, Math.round(sat*.15), 90));
        sp('--md-sys-color-on-surface',         _hsl(h, Math.round(sat*.15), 90));
        sp('--md-sys-color-on-surface-variant', _hsl(h, Math.round(sat*.20), 65));
        // ── Primary
        sp('--md-sys-color-primary',              _hsl(h, _clamp(sat+10,40,75), 72));
        sp('--md-sys-color-on-primary',           _hsl(h, Math.round(sat*.30), 12));
        sp('--md-sys-color-primary-container',    _hsl(h, Math.round(sat*.65), 28));
        sp('--md-sys-color-on-primary-container', _hsl(h, Math.round(sat*.20), 90));
        // ── Secondary
        sp('--md-sys-color-secondary',              _hsl(h2, _clamp(sat, 35, 65), 70));
        sp('--md-sys-color-on-secondary',           _hsl(h2, Math.round(sat*.25), 12));
        sp('--md-sys-color-secondary-container',    _hsl(h2, Math.round(sat*.55), 26));
        sp('--md-sys-color-on-secondary-container', _hsl(h2, Math.round(sat*.20), 90));
        // ── Tertiary
        sp('--md-sys-color-tertiary',              _hsl(h3, _clamp(sat, 30, 60), 70));
        sp('--md-sys-color-on-tertiary',           _hsl(h3, Math.round(sat*.25), 12));
        sp('--md-sys-color-tertiary-container',    _hsl(h3, Math.round(sat*.50), 26));
        sp('--md-sys-color-on-tertiary-container', _hsl(h3, Math.round(sat*.20), 90));
        // ── Borders
        sp('--md-sys-color-outline',         _hsl(h, Math.round(sat*.20), 38));
        sp('--md-sys-color-outline-variant', _hsl(h, Math.round(sat*.20), 26));
        // ── Error
        sp('--md-sys-color-error',              'hsl(0deg 65% 65%)');
        sp('--md-sys-color-error-container',    'hsl(0deg 45% 25%)');
        sp('--md-sys-color-on-error',           'hsl(0deg 20% 12%)');
        sp('--md-sys-color-on-error-container', 'hsl(0deg 20% 90%)');
    } else {
        // ── Surfaces (light mode)
        // Widen lightness gaps so cards clearly stand out from background
        sp('--md-sys-color-background',               _hsl(h, Math.round(sat*.12), 95));
        sp('--md-sys-color-surface',                  _hsl(h, Math.round(sat*.08), 97));
        sp('--md-sys-color-surface-variant',          _hsl(h, Math.round(sat*.40), 88));
        sp('--md-sys-color-surface-container-lowest', _hsl(h, Math.round(sat*.06), 97));
        sp('--md-sys-color-surface-container-low',    _hsl(h, Math.round(sat*.12), 95));
        sp('--md-sys-color-surface-container',        _hsl(h, Math.round(sat*.18), 92));
        sp('--md-sys-color-surface-container-high',   _hsl(h, Math.round(sat*.22), 88));
        sp('--md-sys-color-surface-container-highest',_hsl(h, Math.round(sat*.28), 84));
        // ── Text
        sp('--md-sys-color-on-background',      _hsl(h, Math.round(sat*.25), 12));
        sp('--md-sys-color-on-surface',         _hsl(h, Math.round(sat*.25), 12));
        sp('--md-sys-color-on-surface-variant', _hsl(h, Math.round(sat*.30), 35));
        // ── Primary
        sp('--md-sys-color-primary',              _hsl(h, _clamp(sat, 40, 70), 35));
        sp('--md-sys-color-on-primary',           _hsl(h, Math.round(sat*.15), 97));
        sp('--md-sys-color-primary-container',    _hsl(h, Math.round(sat*.50), 88));
        sp('--md-sys-color-on-primary-container', _hsl(h, Math.round(sat*.40), 15));
        // ── Secondary
        sp('--md-sys-color-secondary',              _hsl(h2, _clamp(sat*.85,30,60), 38));
        sp('--md-sys-color-on-secondary',           _hsl(h2, Math.round(sat*.15), 97));
        sp('--md-sys-color-secondary-container',    _hsl(h2, Math.round(sat*.50), 88));
        sp('--md-sys-color-on-secondary-container', _hsl(h2, Math.round(sat*.40), 15));
        // ── Tertiary
        sp('--md-sys-color-tertiary',              _hsl(h3, _clamp(sat*.85,25,55), 38));
        sp('--md-sys-color-on-tertiary',           _hsl(h3, Math.round(sat*.15), 97));
        sp('--md-sys-color-tertiary-container',    _hsl(h3, Math.round(sat*.45), 88));
        sp('--md-sys-color-on-tertiary-container', _hsl(h3, Math.round(sat*.35), 15));
        // ── Borders
        sp('--md-sys-color-outline',         _hsl(h, Math.round(sat*.20), 50));
        sp('--md-sys-color-outline-variant', _hsl(h, Math.round(sat*.20), 78));
        // ── Error
        sp('--md-sys-color-error',              'hsl(0deg 65% 38%)');
        sp('--md-sys-color-error-container',    'hsl(0deg 50% 90%)');
        sp('--md-sys-color-on-error',           'hsl(0deg 15% 97%)');
        sp('--md-sys-color-on-error-container', 'hsl(0deg 30% 15%)');
    }

    root.setAttribute('data-custom-theme', 'true');
    root.setAttribute('data-theme-color', hexColor);
};
