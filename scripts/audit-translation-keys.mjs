#!/usr/bin/env node
/**
 * Comprehensive translation key audit.
 *
 * Detects:
 * - Dead keys: defined in ko but never referenced in source code
 * - Missing keys: referenced in code but absent in ko
 * - Locale gaps: present in ko but missing in en/ja (or vice versa)
 * - Value quality: empty values, identical to key name, excessively long values
 * - Icon patterns: {{icon:...}} usage statistics in translation values
 * - Duplicate values: same text used by multiple keys (potential consolidation)
 *
 * Usage:
 *   node scripts/audit-translation-keys.mjs              # console summary
 *   node scripts/audit-translation-keys.mjs --json       # + save JSON report
 *   node scripts/audit-translation-keys.mjs --verbose    # + show dead keys list
 *   node scripts/audit-translation-keys.mjs --fix-empty  # auto-fill empty en/ja from ko
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { extname, join, relative, sep } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const JSON_PATH = join(ROOT, 'scripts', 'translation-audit.json');
const LANGS = ['ko', 'en', 'ja'];

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'assets', 'android', 'ios', 'windows11', '.vite',
]);

/** Normalize path separators to forward slash for cross-platform comparison */
const norm = (p) => p.split(sep).join('/');

/** Files with their own local t() + inline multilingual dict — skip bare t() matches */
const SELF_TRANSLATED_FILES = new Set([
  'src/ui/medication-selector.js',
]);

const KEY_CAPTURE_PATTERNS = [
  /translate\(\s*['"`]([\w$]+)['"`]/g,
  /this\._t\(\s*['"`]([\w$]+)['"`]/g,
  /this\.t\(\s*['"`]([\w$]+)['"`]/g,
  /\bt\(\s*['"`]([\w$]+)['"`]/g,
  /window\.__shiftv_translate\(\s*['"`]([\w$]+)['"`]/g,
  /data-lang-key\s*=\s*["']([\w$]+)["']/g,
];

/** Dynamic key prefixes — keys built at runtime via concatenation */
const DYNAMIC_KEY_PREFIXES = ['hrtInfoDesc_'];

/** Keys that may look unused but are referenced dynamically or serve as fallbacks */
const KNOWN_DYNAMIC_PATTERNS = [
  /^metric[A-Z]/,           // metricWeight, metricHeight, etc. — built dynamically
  /^mood[A-Z]/,             // moodHappy, moodSad — mood chip rendering
  /^quest[A-Z]/,            // questCategory labels
  /^onboarding/,            // onboarding step strings
  /Placeholder$/,           // xxxPlaceholder used as fallback in translateUI
  /^alert[A-Z]/,            // error/alert messages triggered conditionally
  /^confirm[A-Z]/,          // confirmation dialogs
  /^label[A-Z]/,            // dynamic labels
];

// ──────────────────── Parse translations.js ────────────────────

async function parseLangData() {
  const mod = await import(pathToFileURL(join(ROOT, 'src', 'translations.js')).href);
  const table = mod.languages || {};
  const byLang = {};
  const byLangData = {};
  for (const lang of LANGS) {
    const langMap = table[lang] || {};
    byLang[lang] = new Set(Object.keys(langMap));
    byLangData[lang] = langMap;
  }
  return { byLang, byLangData };
}

// ──────────────────── Collect source files ────────────────────

function collectSourceFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) { collectSourceFiles(full, files); continue; }
    const rel = norm(relative(ROOT, full));
    if (rel === 'src/translations.js') continue;
    if (!['.js', '.mjs', '.html'].includes(extname(full))) continue;
    files.push(full);
  }
  return files;
}

// ──────────────────── Extract used keys from source ────────────────────

function extractUsedKeys(files) {
  const used = new Map(); // key → [{ file, line }]
  for (const filePath of files) {
    const rel = norm(relative(ROOT, filePath));
    const isSelfTranslated = SELF_TRANSLATED_FILES.has(rel);
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const lineNo = i + 1;
      for (const pattern of KEY_CAPTURE_PATTERNS) {
        if (isSelfTranslated && pattern.source.startsWith('\\bt\\(')) continue;
        pattern.lastIndex = 0;
        let m;
        while ((m = pattern.exec(line)) !== null) {
          const key = m[1];
          if (!used.has(key)) used.set(key, []);
          used.get(key).push({ file: rel, line: lineNo });
        }
      }
    }
  }
  return used;
}

// ──────────────────── Value quality checks ────────────────────

function checkValueQuality(byLangData) {
  const issues = [];

  for (const lang of LANGS) {
    const data = byLangData[lang];
    for (const [key, value] of Object.entries(data)) {
      // Empty or whitespace-only value
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        issues.push({ type: 'empty', lang, key });
      }
      // Value identical to key name (likely untranslated placeholder)
      if (typeof value === 'string' && value === key && lang !== 'ko') {
        issues.push({ type: 'untranslated', lang, key, value });
      }
      // Excessively long value (>500 chars) — may indicate data, not UI string
      if (typeof value === 'string' && value.length > 500) {
        issues.push({ type: 'tooLong', lang, key, length: value.length });
      }
    }
  }

  return issues;
}

// ──────────────────── Icon pattern analysis ────────────────────

function analyzeIconPatterns(byLangData) {
  const iconRe = /\{\{icon:([\w_]+)(?::([^}]*))?\}\}/g;
  const htmlIconRe = /<span\s+class=['"][^'"]*material-symbols-outlined[^'"]*['"][^>]*>([\w_]+)<\/span>/g;
  const stats = { iconPattern: 0, htmlInline: 0, keysWithIcons: [] };

  const koData = byLangData.ko;
  for (const [key, value] of Object.entries(koData)) {
    if (typeof value !== 'string') continue;
    const hasIconPattern = value.match(iconRe);
    const hasHtmlIcon = value.match(htmlIconRe);
    if (hasIconPattern) stats.iconPattern += hasIconPattern.length;
    if (hasHtmlIcon) stats.htmlInline += hasHtmlIcon.length;
    if (hasIconPattern || hasHtmlIcon) {
      stats.keysWithIcons.push({ key, iconPattern: !!hasIconPattern, htmlInline: !!hasHtmlIcon });
    }
  }

  return stats;
}

// ──────────────────── Duplicate value detection ────────────────────

function findDuplicateValues(byLangData) {
  const dupes = [];
  const koData = byLangData.ko;
  const valueToKeys = new Map();
  for (const [key, value] of Object.entries(koData)) {
    if (typeof value !== 'string' || value.length < 4) continue; // skip short values
    const normalized = value.trim().toLowerCase();
    if (!valueToKeys.has(normalized)) valueToKeys.set(normalized, []);
    valueToKeys.get(normalized).push(key);
  }
  for (const [value, keys] of valueToKeys) {
    if (keys.length > 1) dupes.push({ value, keys });
  }
  return dupes;
}

// ──────────────────── Main ────────────────────

const hasFlag = (f) => process.argv.includes(f);
const { byLang, byLangData } = await parseLangData();
const definedKo = byLang.ko;
const files = collectSourceFiles(ROOT);
const usedKeys = extractUsedKeys(files);

// Dead keys — defined but never referenced
const allDeadKeys = [...definedKo].filter((k) => !usedKeys.has(k)).sort();
const dynamicDead = allDeadKeys.filter((k) => KNOWN_DYNAMIC_PATTERNS.some((p) => p.test(k)));
const trulyDead = allDeadKeys.filter((k) => !KNOWN_DYNAMIC_PATTERNS.some((p) => p.test(k)));

// Missing keys — used but not defined
const missingKeys = [...usedKeys.keys()]
  .filter((key) => {
    if (definedKo.has(key)) return false;
    if (DYNAMIC_KEY_PREFIXES.some((p) => key === p.slice(0, -1) || key.startsWith(p))) return false;
    return true;
  })
  .sort()
  .map((key) => ({ key, locations: usedKeys.get(key) }));

// Locale gaps
const missingInEn = [...definedKo].filter((k) => !byLang.en.has(k)).sort();
const missingInJa = [...definedKo].filter((k) => !byLang.ja.has(k)).sort();
const missingInKo = [
  ...[...byLang.en].filter((k) => !definedKo.has(k)),
  ...[...byLang.ja].filter((k) => !definedKo.has(k)),
].filter((k, i, a) => a.indexOf(k) === i).sort();

// Value quality
const valueIssues = checkValueQuality(byLangData);
const emptyValues = valueIssues.filter((i) => i.type === 'empty');
const untranslated = valueIssues.filter((i) => i.type === 'untranslated');

// Icon patterns
const iconStats = analyzeIconPatterns(byLangData);

// Duplicate values
const duplicates = findDuplicateValues(byLangData);

// ──── Console output ────

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

console.log(`\n${C.bold}═══ Translation Key Audit ═══${C.reset}\n`);

console.log(`${C.cyan}Defined keys:${C.reset}  ko=${byLang.ko.size}  en=${byLang.en.size}  ja=${byLang.ja.size}`);
console.log(`${C.cyan}Scanned files:${C.reset} ${files.length}`);
console.log(`${C.cyan}Used keys:${C.reset}     ${usedKeys.size}\n`);

const badge = (n, label, color) => {
  const c = n === 0 ? C.green : color;
  console.log(`  ${c}${n === 0 ? '✓' : '✗'} ${label}: ${n}${C.reset}`);
};

badge(missingKeys.length, 'Missing keys (used but undefined)', C.red);
badge(missingInEn, 'Missing in en', C.red);
badge(missingInJa.length, 'Missing in ja', C.red);
badge(missingInKo.length, 'Missing in ko (defined in en/ja only)', C.yellow);
badge(trulyDead.length, 'Dead keys (truly unused)', C.yellow);
badge(dynamicDead.length, 'Dead keys (possibly dynamic)', C.dim);
badge(emptyValues.length, 'Empty values', C.red);
badge(untranslated.length, 'Untranslated (value == key)', C.yellow);
badge(duplicates.length, 'Duplicate values (potential merge)', C.dim);

console.log(`\n${C.cyan}Icon patterns:${C.reset}  {{icon:...}}: ${iconStats.iconPattern}  |  HTML inline: ${iconStats.htmlInline}  |  Keys with icons: ${iconStats.keysWithIcons.length}`);

if (missingKeys.length > 0) {
  console.log(`\n${C.bold}[Missing Keys]${C.reset}`);
  for (const item of missingKeys) {
    const loc = item.locations[0];
    const extra = item.locations.length > 1 ? ` (+${item.locations.length - 1})` : '';
    console.log(`  ${C.red}✗${C.reset} ${item.key} @ ${loc.file}:${loc.line}${extra}`);
  }
}

if (hasFlag('--verbose')) {
  if (trulyDead.length > 0) {
    console.log(`\n${C.bold}[Truly Dead Keys — ${trulyDead.length}]${C.reset}`);
    for (const key of trulyDead) console.log(`  ${C.dim}- ${key}${C.reset}`);
  }
  if (dynamicDead.length > 0) {
    console.log(`\n${C.bold}[Possibly Dynamic Dead Keys — ${dynamicDead.length}]${C.reset}`);
    for (const key of dynamicDead) console.log(`  ${C.dim}- ${key}${C.reset}`);
  }
  if (emptyValues.length > 0) {
    console.log(`\n${C.bold}[Empty Values]${C.reset}`);
    for (const item of emptyValues) console.log(`  ${C.red}✗${C.reset} ${item.lang}:${item.key}`);
  }
  if (untranslated.length > 0) {
    console.log(`\n${C.bold}[Untranslated (value == key)]${C.reset}`);
    for (const item of untranslated) console.log(`  ${C.yellow}⚠${C.reset} ${item.lang}:${item.key}`);
  }
  if (duplicates.length > 0) {
    console.log(`\n${C.bold}[Duplicate Values — top 10]${C.reset}`);
    for (const item of duplicates.slice(0, 10)) {
      console.log(`  ${C.dim}"${item.value.slice(0, 50)}..." → [${item.keys.join(', ')}]${C.reset}`);
    }
  }
}

// ──── JSON output ────

if (hasFlag('--json')) {
  const payload = {
    generatedAt: new Date().toISOString(),
    summary: {
      defined: { ko: byLang.ko.size, en: byLang.en.size, ja: byLang.ja.size },
      scannedFiles: files.length,
      usedKeys: usedKeys.size,
      deadKeys: allDeadKeys.length,
      trulyDeadKeys: trulyDead.length,
      possiblyDynamicDeadKeys: dynamicDead.length,
      missingKeys: missingKeys.length,
      missingInEn: missingInEn.length,
      missingInJa: missingInJa.length,
      missingInKo: missingInKo.length,
      emptyValues: emptyValues.length,
      untranslated: untranslated.length,
      duplicateValues: duplicates.length,
      iconPatterns: iconStats.iconPattern,
      htmlInlineIcons: iconStats.htmlInline,
    },
    deadKeys: allDeadKeys,
    trulyDeadKeys: trulyDead,
    possiblyDynamicDeadKeys: dynamicDead,
    missingKeys,
    missingInEn,
    missingInJa,
    missingInKo,
    emptyValues,
    untranslated,
    duplicateValues: duplicates,
    iconStats: iconStats.keysWithIcons,
  };
  writeFileSync(JSON_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`\n${C.green}Saved:${C.reset} ${norm(relative(ROOT, JSON_PATH))}`);
}

console.log('');
process.exit(missingKeys.length > 0 ? 1 : 0);
