/**
 * MD3 Ripple Effect Module
 * 
 * Applies Material Design 3 ripple feedback on interactive elements.
 * Uses a CSS-animated expanding circle from the touch/click point.
 * 
 * Supported selectors (auto-attached on init):
 *   .btn-filled, .btn-filled-tonal, .btn-text, .btn-outlined, .btn-elevated,
 *   .glass-button, .icon-button, .diary-action-btn, .tab-button,
 *   .chip-assist, .chip-filter, .chip-input, .chip-suggestion,
 *   .card-filled[role="button"], .card-outlined[role="button"], .card-elevated[role="button"],
 *   [data-ripple]
 * 
 * Usage:
 *   import { initRipple } from './src/ui/ripple.js';
 *   initRipple();                     — attach to all matching elements
 *   initRipple(containerEl);          — attach only within a container
 *   attachRipple(singleButton);       — attach to one element
 */

const RIPPLE_SELECTORS = [
  '.btn-filled', '.btn-filled-tonal', '.btn-text', '.btn-outlined', '.btn-elevated',
  '.glass-button', '.icon-button', '.diary-action-btn',
  '.chip-assist', '.chip-filter', '.chip-input', '.chip-suggestion',
  '.card-filled[role="button"]', '.card-outlined[role="button"]', '.card-elevated[role="button"]',
  '.modal-tab-btn', '.legend-button',
  '[data-ripple]'
].join(',');

/** Duration matches MD3 motion-duration-medium2 (300ms) */
const RIPPLE_DURATION = 450;

/**
 * Attach ripple behaviour to a single element.
 * Safe to call multiple times — idempotent.
 */
export function attachRipple(el) {
  if (!el || el._rippleAttached) return;
  el._rippleAttached = true;

  // Ensure the element can contain the ripple circle.
  // Only set inline styles when CSS doesn't already provide them,
  // to avoid overriding layout-sensitive values (e.g. tab indicators).
  const cs = getComputedStyle(el);
  if (cs.position === 'static' || cs.position === '') {
    el.style.position = 'relative';
  }
  if (cs.overflow === 'visible') {
    el.style.overflow = 'hidden';
  }

  el.addEventListener('pointerdown', handleRipple, { passive: true });
}

/**
 * Init ripple on all matching elements within a root.
 * @param {HTMLElement|Document} [root=document]
 */
export function initRipple(root = document) {
  const els = root.querySelectorAll(RIPPLE_SELECTORS);
  els.forEach(attachRipple);
}

// --- internal ---

function handleRipple(e) {
  const el = e.currentTarget;
  if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;

  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2.2;

  // Pointer position relative to element
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;

  const circle = document.createElement('span');
  circle.className = 'md3-ripple';
  circle.style.cssText = `
    width:${size}px;
    height:${size}px;
    left:${x}px;
    top:${y}px;
  `;

  el.appendChild(circle);

  // Clean up after animation
  circle.addEventListener('animationend', () => circle.remove(), { once: true });
  // Fallback removal
  setTimeout(() => { if (circle.parentNode) circle.remove(); }, RIPPLE_DURATION + 100);
}

/**
 * Observe the DOM for dynamically added elements and attach ripple.
 * Call once at startup.
 */
export function observeRipple() {
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        // Check the node itself
        if (node.matches?.(RIPPLE_SELECTORS)) {
          attachRipple(node);
        }
        // Check descendants
        if (node.querySelectorAll) {
          node.querySelectorAll(RIPPLE_SELECTORS).forEach(attachRipple);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}
