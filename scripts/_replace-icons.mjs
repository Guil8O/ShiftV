/**
 * Automated replacement of Material Symbols font-icon spans → svgIcon() calls
 * Run: node scripts/_replace-icons.mjs
 */
import { readFileSync, writeFileSync } from 'fs';

const files = [
  'script.js',
  'src/ui/components/sv-cards.js',
  'src/ui/components/streak-strip.js',
  'src/ui/modals/quest-modal.js',
  'src/ui/modals/health-modal.js',
  'src/ui/modals/onboarding-flow.js',
  'src/ui/modals/change-roadmap-modal.js',
  'src/ui/modals/ai-advisor-modal.js',
  'src/ui/modals/body-briefing-modal.js',
  'src/ui/modals/action-guide-modal.js',
  'src/ui/symptom-selector.js',
  'src/ui/medication-selector.js',
  'src/ui/utils/card-frame.js',
  'src/doctor-module/core/trend-predictor.js',
  'src/doctor-module/core/symptom-analyzer.js',
  'src/doctor-module/core/mtf-analyzer.js',
  'src/doctor-module/core/ftm-analyzer.js',
  'src/doctor-module/core/health-evaluator.js',
  'src/doctor-module/core/doctor-engine.js',
  'src/translations.js',
];

let totalReplacements = 0;

for (const file of files) {
  let code;
  try { code = readFileSync(file, 'utf8'); } catch { continue; }
  const orig = code;
  let count = 0;

  // ─────────────────────────────────────────────────────
  // Step 1: Single-quoted standalone string assignments
  //   '<span class="material-symbols-outlined CLASSES">ICON</span>'
  //   → svgIcon('ICON', 'CLASSES')
  // ─────────────────────────────────────────────────────
  code = code.replace(
    /'<span class="material-symbols-outlined\s+([\w\s-]+)">(\w+)<\/span>'/g,
    (_, cls, icon) => { count++; return `svgIcon('${icon}', '${cls.trim()}')`; }
  );
  code = code.replace(
    /'<span class="material-symbols-outlined">(\w+)<\/span>'/g,
    (_, icon) => { count++; return `svgIcon('${icon}')`; }
  );

  // ─────────────────────────────────────────────────────
  // Step 2: Template literals — special cases first
  // ─────────────────────────────────────────────────────

  // 2a: style attribute with dynamic content
  //   <span class="material-symbols-outlined" style="...">...</span>
  code = code.replace(
    /<span class="material-symbols-outlined"\s+style="[^"]*">\$\{([\w.]+)\}<\/span>/g,
    (_, v) => { count++; return `\${svgIcon(${v})}`; }
  );

  // 2b: dynamic class + dynamic icon (the changeClass pattern)
  //   <span class="material-symbols-outlined sv-metric-icon ${changeClass}">${changeIcon}</span>
  code = code.replace(
    /<span class="material-symbols-outlined\s+([\w-]+)\s+\$\{(\w+)\}">\$\{(\w+)\}<\/span>/g,
    (_, staticCls, dynCls, v) => { count++; return `\${svgIcon(${v}, '${staticCls} ' + ${dynCls})}`; }
  );

  // 2c: static classes + static icon (most common)
  //   <span class="material-symbols-outlined status-icon mi-error">warning</span>
  code = code.replace(
    /<span class="material-symbols-outlined\s+([\w\s-]+)">(\w+)<\/span>/g,
    (_, cls, icon) => { count++; return `\${svgIcon('${icon}', '${cls.trim()}')}`; }
  );

  // 2d: static classes + dynamic icon
  //   <span class="material-symbols-outlined status-icon">${icon}</span>
  code = code.replace(
    /<span class="material-symbols-outlined\s+([\w\s-]+)">\$\{([\w.[\]]+)\}<\/span>/g,
    (_, cls, v) => { count++; return `\${svgIcon(${v}, '${cls.trim()}')}`; }
  );

  // 2e: no classes + dynamic icon
  //   <span class="material-symbols-outlined">${badge.icon}</span>
  code = code.replace(
    /<span class="material-symbols-outlined">\$\{([\w.[\]]+)\}<\/span>/g,
    (_, v) => { count++; return `\${svgIcon(${v})}`; }
  );

  // 2f: no classes + static icon
  //   <span class="material-symbols-outlined">check_circle</span>
  code = code.replace(
    /<span class="material-symbols-outlined">(\w+)<\/span>/g,
    (_, icon) => { count++; return `\${svgIcon('${icon}')}`; }
  );

  if (code !== orig) {
    writeFileSync(file, code);
    console.log(`  ✓ ${file}: ${count} replacements`);
    totalReplacements += count;
  }
}

console.log(`\nTotal: ${totalReplacements} replacements across all files`);
