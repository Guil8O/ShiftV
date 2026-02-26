/**
 * BaseModal — 모달 오버레이 공통 라이프사이클
 *
 * 제공하는 기능:
 *  - _mount(className, html, closeSelector?) → overlay 생성/마운트/애니메이션
 *  - close()                                → overlay 제거, body 클래스 복원
 *  - _onBeforeClose()                       → 서브클래스 teardown 훅 (차트 파괴 등)
 *  - $(selector)                            → this.overlay.querySelector 단축어
 *
 * 사용 패턴:
 *   class MyModal extends BaseModal {
 *       open() { this._mount('my-overlay', `<div>...</div>`, '.my-close'); }
 *       _onBeforeClose() { this._destroyCharts(); }  // 필요 시 오버라이드
 *   }
 */
export class BaseModal {
    constructor() {
        this.overlay = null;
    }

    /**
     * 오버레이 생성, DOM 마운트, 닫기 이벤트 바인딩, 페이드인 애니메이션
     * @param {string} className       루트 div의 CSS 클래스
     * @param {string} html            innerHTML 문자열
     * @param {string|null} closeSelector  닫기 버튼 querySelector (null이면 스킵)
     * @returns {HTMLElement}          마운트된 overlay 요소
     */
    _mount(className, html, closeSelector = null) {
        if (this.overlay) this.overlay.remove();

        const el = document.createElement('div');
        el.className = className;
        el.innerHTML = html;

        if (closeSelector) {
            el.querySelector(closeSelector)?.addEventListener('click', () => this.close());
        }
        el.addEventListener('click', e => { if (e.target === el) this.close(); });

        document.body.appendChild(el);
        document.body.classList.add('modal-open');
        this.overlay = el;
        requestAnimationFrame(() => el.classList.add('visible'));

        return el;
    }

    /**
     * 서브클래스에서 오버라이드: close() 전에 실행할 정리 작업
     * 예: 차트 인스턴스 파괴, 타이머 클리어 등
     */
    _onBeforeClose() {}

    /**
     * 오버레이 제거 + 스크롤 복원
     */
    close() {
        this._onBeforeClose();
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        document.body.classList.remove('modal-open');
    }

    /**
     * overlay 안에서 querySelector 단축어
     * @param {string} selector
     * @returns {Element|null}
     */
    $(selector) {
        return this.overlay?.querySelector(selector) ?? null;
    }
}
