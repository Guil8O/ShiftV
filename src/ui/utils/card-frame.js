/**
 * card-frame.js — MD3 Card Factory Utility
 *
 * Exports:
 *   - createCard(opts) → HTMLElement
 *
 * Usage pattern:
 *   const card = createCard({
 *       type: 'elevated',   // 'filled' | 'outlined' | 'elevated' (default)
 *       icon: 'fitness_center',
 *       title: '운동 목표',
 *       desc:  '오늘의 운동 계획',
 *       clickable: true,
 *       onClick: () => openQuestModal(),
 *       className: 'my-custom-class',
 *       body: '<p>Custom inner HTML</p>',   // overrides icon/title/desc layout
 *   });
 *   container.appendChild(card);
 *
 * CSS classes produced:
 *   .card-filled / .card-outlined / .card-elevated  (MD3 base — from style.css)
 *   .card-frame                                     (frame utility marker)
 *   .card-frame__icon                               — material symbol icon
 *   .card-frame__title                              — primary text
 *   .card-frame__desc                               — supporting text
 */

/**
 * HTML-escape helper
 * @param {*} s
 * @returns {string}
 */
function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, m =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
    );
}

/**
 * Create an MD3 card element.
 *
 * @param {object}          opts
 * @param {'filled'|'outlined'|'elevated'} [opts.type='elevated']
 * @param {string}          [opts.icon]        material symbol name (e.g. 'fitness_center')
 * @param {string}          [opts.title]       primary label text
 * @param {string}          [opts.desc]        secondary supporting text
 * @param {boolean}         [opts.clickable]   add role=button + tabindex + cursor
 * @param {Function}        [opts.onClick]     click handler (implies clickable=true)
 * @param {string}          [opts.className]   extra CSS classes for the card root
 * @param {string}          [opts.body]        raw HTML string for card body (replaces default layout)
 * @returns {HTMLElement}
 */
export function createCard({
    type = 'elevated',
    icon = null,
    title = '',
    desc = '',
    clickable = false,
    onClick = null,
    className = '',
    body = null,
} = {}) {
    const card = document.createElement('div');
    const isClickable = clickable || typeof onClick === 'function';

    card.className = [
        `card-${type}`,
        'card-frame',
        isClickable ? '' : '',
        className,
    ].filter(Boolean).join(' ');

    if (isClickable) {
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.style.cursor = 'pointer';
    }

    if (body !== null) {
        card.innerHTML = body;
    } else {
        const parts = [];
        if (icon) {
            parts.push(`<span class="card-frame__icon material-symbols-outlined mi-md">${_esc(icon)}</span>`);
        }
        if (title) {
            parts.push(`<div class="card-frame__title">${_esc(title)}</div>`);
        }
        if (desc) {
            parts.push(`<div class="card-frame__desc">${_esc(desc)}</div>`);
        }
        card.innerHTML = parts.join('');
    }

    if (typeof onClick === 'function') {
        card.addEventListener('click', onClick);
        card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); }
        });
    }

    return card;
}

/**
 * Create a row of cards inside a container element.
 *
 * @param {HTMLElement}  container       target element to append into
 * @param {object[]}     cardOptionsList array of options objects for createCard()
 * @returns {HTMLElement[]} the created card elements
 */
export function renderCardList(container, cardOptionsList) {
    container.innerHTML = '';
    return cardOptionsList.map(opts => {
        const card = createCard(opts);
        container.appendChild(card);
        return card;
    });
}
