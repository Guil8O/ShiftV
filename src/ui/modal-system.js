/**
 * ShiftV Modal System
 * 
 * 모달 열기/닫기 로직을 중앙 집중화합니다.
 * script.js의 기존 모달 함수를 대체합니다.
 * 
 * @module modal-system
 */

/**
 * 모달 시스템을 생성합니다.
 * @param {Object} deps - DOM 요소 및 콜백 의존성
 * @param {HTMLElement} deps.modalOverlay - 기본 모달 오버레이
 * @param {HTMLElement} deps.modalTitle - 모달 타이틀 요소
 * @param {HTMLElement} deps.modalContent - 모달 콘텐츠 컨테이너
 * @param {HTMLElement} deps.hormoneModalOverlay - 호르몬 모달 오버레이
 * @param {HTMLElement} deps.bodyElement - document.body
 * @param {Function} deps.translateUI - UI 번역 함수
 * @param {Function} [deps.onHormoneModalClose] - 호르몬 모달 닫힐 때 콜백 (차트 인스턴스 정리 등)
 * @returns {Object} 모달 시스템 API
 */
export function createModalSystem(deps) {
    const {
        modalOverlay,
        modalTitle,
        modalContent,
        hormoneModalOverlay,
        bodyElement,
        translateUI,
        onHormoneModalClose
    } = deps;

    /**
     * 기본 바텀시트 모달 열기
     * @param {string} title - 모달 제목
     * @param {string} contentHTML - 모달 HTML 콘텐츠
     */
    function openModal(title, contentHTML) {
        if (!modalOverlay || !modalTitle || !modalContent) return;

        modalTitle.textContent = title;
        modalContent.innerHTML = contentHTML;

        if (translateUI) translateUI(modalContent);

        bodyElement.classList.add('modal-open');
        modalOverlay.classList.add('visible');
    }

    /**
     * 기본 바텀시트 모달 닫기
     */
    function closeModal() {
        if (!modalOverlay || !modalOverlay.classList.contains('visible')) return;

        const state = history.state;
        if (state && typeof state.type === 'string' && state.type.startsWith('modal')) {
            history.back();
        } else {
            closeAllModalsVisually();
        }
    }

    /**
     * 호르몬 모달 열기
     * @param {Function} [renderFn] - 모달 열기 전 렌더링 함수
     */
    function openHormoneModal(renderFn) {
        if (!hormoneModalOverlay) return;

        if (renderFn) renderFn();

        const hormoneModalContent = hormoneModalOverlay.querySelector('.modal-content');
        if (hormoneModalContent) {
            hormoneModalContent.scrollTop = 0;
            if (translateUI) translateUI(hormoneModalContent);
        }

        bodyElement.classList.add('modal-open');
        hormoneModalOverlay.classList.add('visible');
    }

    /**
     * 호르몬 모달 닫기
     */
    function closeHormoneModal() {
        if (!hormoneModalOverlay || !hormoneModalOverlay.classList.contains('visible')) return;

        const state = history.state;
        if (state && state.type === 'modal-hormone') {
            history.back();
        } else {
            closeAllModalsVisually();
        }
    }

    /**
     * 모든 모달을 시각적으로 닫기 (뒤로가기 핸들러에서 호출)
     * @returns {boolean} 하나 이상의 모달이 닫혔으면 true
     */
    function closeAllModalsVisually() {
        let aModalWasClosed = false;

        const allModalOverlays = [
            modalOverlay,
            hormoneModalOverlay
        ].filter(Boolean);

        allModalOverlays.forEach(overlay => {
            if (overlay && overlay.classList.contains('visible')) {
                overlay.classList.remove('visible');
                aModalWasClosed = true;

                // 호르몬 모달 후처리 (차트 파괴 등)
                if (overlay === hormoneModalOverlay && onHormoneModalClose) {
                    onHormoneModalClose();
                }
            }
        });

        if (aModalWasClosed) {
            bodyElement.classList.remove('modal-open');
        }

        return aModalWasClosed;
    }

    return {
        openModal,
        closeModal,
        openHormoneModal,
        closeHormoneModal,
        closeAllModalsVisually
    };
}
