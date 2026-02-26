/**
 * carousel-frame.js — Reusable Carousel Utilities
 *
 * Exports:
 *   - addCarouselArrows(wrapEl, trackSelector)  → adds ‹ › nav buttons
 *   - addCarouselDots(wrapEl, trackSelector, count) → syncs dot indicators
 *   - createCarousel({ slides, showArrows, showDots, className, slideClass })
 *       → creates a full carousel DOM fragment
 *
 * CSS required (in style.css or component sheet):
 *   .carousel-frame            — wrapper (position: relative)
 *   .carousel-frame__track     — scroll container (overflow-x: auto; scroll-snap-type: x mandatory)
 *   .carousel-frame__slide     — each slide (scroll-snap-align: start)
 *   .carousel-frame__arrow     — arrow button base
 *   .carousel-frame__arrow--prev / --next
 *   .carousel-frame__dots      — dots bar
 *   .carousel-frame__dot       — individual dot
 *   .carousel-frame__dot.active
 *   .hidden                    — display: none
 */

// ─── Arrow helper ──────────────────────────────────────────────────────────────

/**
 * Append ‹ › arrow buttons to `wrapEl`, controlling scroll on `trackSelector`.
 * Arrows auto-hide when at start / end of scroll.
 *
 * @param {HTMLElement} wrapEl          - positioned container to receive arrow buttons
 * @param {string}      trackSelector  - querySelector string for the scroll track
 */
export function addCarouselArrows(wrapEl, trackSelector) {
    requestAnimationFrame(() => {
        const track = wrapEl.querySelector(trackSelector);
        if (!track) return;

        const prev = document.createElement('button');
        prev.className = 'carousel-frame__arrow carousel-frame__arrow--prev svcard-arrow svcard-arrow-prev';
        prev.innerHTML = '‹';
        prev.setAttribute('aria-label', 'Previous');

        const next = document.createElement('button');
        next.className = 'carousel-frame__arrow carousel-frame__arrow--next svcard-arrow svcard-arrow-next';
        next.innerHTML = '›';
        next.setAttribute('aria-label', 'Next');

        wrapEl.style.position = 'relative';
        wrapEl.appendChild(prev);
        wrapEl.appendChild(next);

        const amount = () => track.offsetWidth * 0.85;

        prev.addEventListener('click', e => { e.stopPropagation(); track.scrollBy({ left: -amount(), behavior: 'smooth' }); });
        next.addEventListener('click', e => { e.stopPropagation(); track.scrollBy({ left:  amount(), behavior: 'smooth' }); });

        const sync = () => {
            prev.classList.toggle('hidden', track.scrollLeft <= 2);
            next.classList.toggle('hidden', track.scrollLeft + track.offsetWidth >= track.scrollWidth - 2);
        };

        track.addEventListener('scroll', sync, { passive: true });
        sync();
    });
}

// ─── Dot helper ───────────────────────────────────────────────────────────────

/**
 * Sync dot indicators inside `.carousel-frame__dots` / `.svcard-dots` in `wrapEl`.
 *
 * @param {HTMLElement} wrapEl
 * @param {string}      trackSelector
 * @param {number}      count          - total number of slides (skip if ≤ 1)
 */
export function addCarouselDots(wrapEl, trackSelector, count) {
    if (count <= 1) return;
    requestAnimationFrame(() => {
        const track = wrapEl.querySelector(trackSelector);
        if (!track) return;

        const dotsEl = wrapEl.querySelector('.carousel-frame__dots, .svcard-dots');
        if (!dotsEl) return;

        track.addEventListener('scroll', () => {
            const idx = Math.round(track.scrollLeft / (track.offsetWidth || 1));
            dotsEl.querySelectorAll('.carousel-frame__dot, .svcard-dot').forEach((d, i) =>
                d.classList.toggle('active', i === idx)
            );
        }, { passive: true });
    });
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Build a full carousel DOM element from an array of slide content.
 *
 * @param {object}   opts
 * @param {string[]|HTMLElement[]} opts.slides      - slide HTML strings or Elements
 * @param {boolean}  [opts.showArrows=true]          - render ‹ › arrow buttons
 * @param {boolean}  [opts.showDots=false]           - render dot indicator bar
 * @param {string}   [opts.className='']             - extra classes on the wrapper
 * @param {string}   [opts.slideClass='']            - extra classes on each slide
 * @returns {HTMLElement} the assembled carousel wrapper element
 *
 * @example
 * const el = createCarousel({ slides: ['<p>A</p>', '<p>B</p>'], showArrows: true });
 * document.body.appendChild(el);
 */
export function createCarousel({ slides = [], showArrows = true, showDots = false, className = '', slideClass = '' } = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = `carousel-frame${className ? ' ' + className : ''}`;

    const track = document.createElement('div');
    track.className = 'carousel-frame__track';

    slides.forEach(s => {
        const slide = document.createElement('div');
        slide.className = `carousel-frame__slide${slideClass ? ' ' + slideClass : ''}`;
        if (typeof s === 'string') slide.innerHTML = s;
        else slide.appendChild(s);
        track.appendChild(slide);
    });

    wrapper.appendChild(track);

    if (showDots && slides.length > 1) {
        const dots = document.createElement('div');
        dots.className = 'carousel-frame__dots';
        slides.forEach((_, i) => {
            const d = document.createElement('span');
            d.className = `carousel-frame__dot${i === 0 ? ' active' : ''}`;
            dots.appendChild(d);
        });
        wrapper.appendChild(dots);
        addCarouselDots(wrapper, '.carousel-frame__track', slides.length);
    }

    if (showArrows) addCarouselArrows(wrapper, '.carousel-frame__track');

    return wrapper;
}
