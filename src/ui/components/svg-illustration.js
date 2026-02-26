/**
 * SVG Illustration Component Wrapper
 * 
 * SVG 파일을 인라인으로 로드하고 애니메이션을 제어하는 유틸리티 클래스
 */

export class SvgIllustration {
  constructor(containerId, svgPath, options = {}) {
    this.container = document.getElementById(containerId);
    this.svgPath = svgPath;
    this.options = {
      animate: true,
      ...options
    };
    
    if (this.container) {
      this.loadSVG();
    }
  }

  async loadSVG() {
    try {
      const response = await fetch(this.svgPath);
      if (!response.ok) throw new Error(`Failed to load SVG: ${this.svgPath}`);
      
      const svgText = await response.text();
      this.container.innerHTML = svgText;
      
      this.svgElement = this.container.querySelector('svg');
      
      if (!this.options.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.disableAnimation();
      }
    } catch (error) {
      console.error('Error loading SVG illustration:', error);
    }
  }

  disableAnimation() {
    if (!this.svgElement) return;
    
    // SVG 내부의 style 태그에서 애니메이션 관련 클래스 제거 또는 덮어쓰기
    const styleTags = this.svgElement.querySelectorAll('style');
    styleTags.forEach(style => {
      style.textContent += `
        * {
          animation: none !important;
          transition: none !important;
        }
      `;
    });
  }

  enableAnimation() {
    if (!this.svgElement) return;
    
    // 원래 SVG를 다시 로드하여 애니메이션 복구
    this.loadSVG();
  }
}
