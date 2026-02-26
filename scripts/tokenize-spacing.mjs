/**
 * Tokenize hardcoded px spacing values in style.css → CSS custom properties.
 * Run: node scripts/tokenize-spacing.mjs
 */
import { readFileSync, writeFileSync } from 'fs';

const FILE = 'style.css';

const tokenMap = {
  '2': 'var(--spacing-xxs)',
  '4': 'var(--spacing-xs)',
  '6': 'var(--spacing-1-5)',
  '8': 'var(--spacing-sm)',
  '10': 'var(--spacing-2-5)',
  '12': 'var(--spacing-3)',
  '16': 'var(--spacing-md)',
  '20': 'var(--spacing-5)',
  '24': 'var(--spacing-lg)',
  '32': 'var(--spacing-xl)',
  '48': 'var(--spacing-2xl)',
  '64': 'var(--spacing-3xl)',
};

// Values to skip tokenizing (special-purpose exact values)
const SKIP_VALUES = new Set(['15', '14']);

function tok(px) {
  return tokenMap[px] || `${px}px`;
}

function replacePxValue(val) {
  const trimmed = val.trim();
  const m = trimmed.match(/^(\d+)px$/);
  if (m && tokenMap[m[1]]) return tok(m[1]);
  return null;
}

// Replace individual px values in a multi-value string like "8px 16px"
function tokenizeMultiValue(valueStr) {
  const parts = valueStr.trim().split(/\s+/);
  let changed = false;
  const result = parts.map(part => {
    const m = part.match(/^(\d+)px$/);
    if (m && tokenMap[m[1]] && !SKIP_VALUES.has(m[1])) {
      changed = true;
      return tok(m[1]);
    }
    // Also handle 0 (leave as 0)
    if (part === '0' || part === '0px') return '0';
    return part;
  });
  return changed ? result.join(' ') : null;
}

let css = readFileSync(FILE, 'utf-8');
let count = 0;

// Properties to tokenize
const spacingProps = [
  'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
  'margin-block', 'margin-inline',
  'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
  'padding-block', 'padding-inline',
  'gap', 'row-gap', 'column-gap',
];

const propPattern = spacingProps.map(p => p.replace(/-/g, '\\-')).join('|');

// Match: property: <value with px>;
// Careful not to match inside values that contain calc(), var(), etc.
const regex = new RegExp(
  `((?:${propPattern})\\s*:\\s*)([^;]*\\d+px[^;]*)(;)`,
  'g'
);

css = css.replace(regex, (match, prefix, value, semi) => {
  // Skip if value already contains var(
  if (value.includes('var(')) return match;
  // Skip calc() expressions
  if (value.includes('calc(')) return match;

  const tokenized = tokenizeMultiValue(value);
  if (tokenized) {
    count++;
    return `${prefix}${tokenized}${semi}`;
  }
  return match;
});

writeFileSync(FILE, css, 'utf-8');
console.log(`✅ Tokenized ${count} spacing declarations in ${FILE}`);
