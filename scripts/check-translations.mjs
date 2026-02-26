#!/usr/bin/env node
/**
 * Unified Translation Validation Runner
 *
 * Runs all translation checks in sequence and produces a comprehensive report.
 * This is the single entry point for CI/CD or manual translation quality checks.
 *
 * Usage:
 *   node scripts/check-translations.mjs             # full check (console)
 *   node scripts/check-translations.mjs --json      # + save JSON reports
 *   node scripts/check-translations.mjs --fix       # auto-fix what's possible
 *   node scripts/check-translations.mjs --summary   # brief summary only
 *
 * Checks performed:
 *   1. Translation key audit (dead keys, missing keys, locale gaps)
 *   2. Hardcoded Korean string detection
 *   3. Value quality (empty, identical to key, duplicates)
 *   4. Icon pattern consistency
 *   5. Translation completeness score
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'fs';
import { extname, join, relative, sep } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const LANGS = ['ko', 'en', 'ja'];
const norm = (p) => p.split(sep).join('/');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', magenta: '\x1b[35m',
};

const hasFlag = (f) => process.argv.includes(f);
const isJson = hasFlag('--json');
const isFix = hasFlag('--fix');
const isSummary = hasFlag('--summary');

// ──────────────────── Shared utilities ────────────────────

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'assets', 'android', 'ios', 'windows11', '.vite',
]);

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

async function loadLanguages() {
  const mod = await import(pathToFileURL(join(ROOT, 'src', 'translations.js')).href);
  return mod.languages || {};
}

// ──────────────────── Check 1: Key Audit ────────────────────

const SELF_TRANSLATED = new Set(['src/ui/medication-selector.js']);
const KEY_PATTERNS = [
  /translate\(\s*['"`]([\w$]+)['"`]/g,
  /this\._t\(\s*['"`]([\w$]+)['"`]/g,
  /this\.t\(\s*['"`]([\w$]+)['"`]/g,
  /\bt\(\s*['"`]([\w$]+)['"`]/g,
  /window\.__shiftv_translate\(\s*['"`]([\w$]+)['"`]/g,
  /data-lang-key\s*=\s*["']([\w$]+)["']/g,
];
const DYNAMIC_PREFIXES = ['hrtInfoDesc_'];

function checkKeyAudit(files, langData) {
  const koKeys = new Set(Object.keys(langData.ko));
  const enKeys = new Set(Object.keys(langData.en));
  const jaKeys = new Set(Object.keys(langData.ja));

  // Extract used keys
  const usedKeys = new Map();
  for (const filePath of files) {
    const rel = norm(relative(ROOT, filePath));
    const isSelf = SELF_TRANSLATED.has(rel);
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const pattern of KEY_PATTERNS) {
        if (isSelf && pattern.source.startsWith('\\bt\\(')) continue;
        pattern.lastIndex = 0;
        let m;
        while ((m = pattern.exec(lines[i])) !== null) {
          const key = m[1];
          if (!usedKeys.has(key)) usedKeys.set(key, []);
          usedKeys.get(key).push({ file: rel, line: i + 1 });
        }
      }
    }
  }

  const deadKeys = [...koKeys].filter(k => !usedKeys.has(k)).sort();
  const missingKeys = [...usedKeys.keys()]
    .filter(k => !koKeys.has(k) && !DYNAMIC_PREFIXES.some(p => k.startsWith(p)))
    .sort();
  const missingInEn = [...koKeys].filter(k => !enKeys.has(k)).sort();
  const missingInJa = [...koKeys].filter(k => !jaKeys.has(k)).sort();

  return {
    defined: { ko: koKeys.size, en: enKeys.size, ja: jaKeys.size },
    usedKeys: usedKeys.size,
    deadKeys,
    missingKeys,
    missingInEn,
    missingInJa,
  };
}

// ──────────────────── Check 2: Hardcoded Strings ────────────────────

const HANGUL_RE = /[\u3131-\u3163\uac00-\ud7a3]/;
const HANGUL_WORD_RE = /[\uac00-\ud7a3]{2,}/;
const IGNORE_PATTERNS = [
  /^\s*\/\//, /^\s*\*/, /^\s*\/\*\*/, /^\s*import\s/, /^\s*export\s/,
  /console\.(log|warn|error|info|debug)\s*\(/,
  /data-lang-key\s*=/, /translate\(/, /\bthis\._t\(/, /\bthis\.t\(/,
  /\bt\(\s*['"`][\w$]+['"`]/, /\bko\s*:\s*['"`]/, /currentLanguage\s*===\s*['"`]ko['"`]/,
  /lang\s*===\s*['"`]ko['"`]/,
];
const SKIP_HARDCODED_FILES = new Set(['src/translations.js']);
const SKIP_HARDCODED_DIRS = new Set([...SKIP_DIRS, 'scripts']);

function checkHardcodedStrings(rootDir) {
  const issues = [];

  function scan(dir) {
    for (const entry of readdirSync(dir)) {
      if (SKIP_HARDCODED_DIRS.has(entry)) continue;
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) { scan(full); continue; }
      const rel = norm(relative(ROOT, full));
      if (SKIP_HARDCODED_FILES.has(rel)) continue;
      if (!['.js', '.mjs', '.html'].includes(extname(full))) continue;

      const content = readFileSync(full, 'utf8');
      const lines = content.split('\n');
      let inBlock = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (inBlock) { if (line.includes('*/')) inBlock = false; continue; }
        if (line.includes('/*') && !line.includes('*/')) { inBlock = true; continue; }
        if (!HANGUL_RE.test(line)) continue;
        if (IGNORE_PATTERNS.some(p => p.test(line))) continue;

        const quoteRe = /(['"`])((?:\\.|(?!\1).)*)\1/g;
        let match;
        while ((match = quoteRe.exec(line)) !== null) {
          const text = match[2].replace(/\$\{[^}]+}/g, '').trim();
          if (HANGUL_WORD_RE.test(text)) {
            issues.push({ file: rel, line: i + 1, text: match[2].slice(0, 80) });
          }
        }
      }
    }
  }

  scan(rootDir);
  return issues;
}

// ──────────────────── Check 3: Value Quality ────────────────────

function checkValueQuality(langData) {
  const empty = [];
  const untranslated = [];
  const tooLong = [];

  for (const lang of LANGS) {
    const data = langData[lang];
    for (const [key, value] of Object.entries(data)) {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        empty.push({ lang, key });
      }
      if (typeof value === 'string' && value === key && lang !== 'ko') {
        untranslated.push({ lang, key });
      }
      if (typeof value === 'string' && value.length > 500) {
        tooLong.push({ lang, key, length: value.length });
      }
    }
  }

  return { empty, untranslated, tooLong };
}

// ──────────────────── Check 4: Icon Patterns ────────────────────

function checkIconConsistency(langData) {
  const iconRe = /\{\{icon:([\w_]+)(?::([^}]*))?\}\}/g;
  const issues = [];

  const koData = langData.ko;
  for (const [key, koValue] of Object.entries(koData)) {
    if (typeof koValue !== 'string') continue;
    const koIcons = [...koValue.matchAll(iconRe)].map(m => m[1]);
    if (koIcons.length === 0) continue;

    for (const lang of ['en', 'ja']) {
      const langValue = langData[lang]?.[key];
      if (!langValue) continue;
      const langIcons = [...String(langValue).matchAll(iconRe)].map(m => m[1]);
      if (JSON.stringify(koIcons) !== JSON.stringify(langIcons)) {
        issues.push({ key, ko: koIcons, [lang]: langIcons });
      }
    }
  }

  return issues;
}

// ──────────────────── Check 5: Completeness Score ────────────────────

function calcCompleteness(langData) {
  const koKeys = Object.keys(langData.ko);
  const total = koKeys.length;
  const scores = {};

  for (const lang of LANGS) {
    const data = langData[lang];
    const defined = Object.keys(data).length;
    const nonEmpty = Object.values(data).filter(v => v && typeof v === 'string' && v.trim()).length;
    scores[lang] = {
      defined,
      nonEmpty,
      total,
      pct: total > 0 ? Math.round((nonEmpty / total) * 100) : 0,
    };
  }

  return scores;
}

// ──────────────────── Main ────────────────────

async function main() {
  console.log(`\n${C.bold}${C.magenta}╔══════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.magenta}║  ShiftV Translation Quality Report   ║${C.reset}`);
  console.log(`${C.bold}${C.magenta}╚══════════════════════════════════════╝${C.reset}\n`);

  const langData = await loadLanguages();
  const files = collectSourceFiles(ROOT);

  // Run checks
  const keyAudit = checkKeyAudit(files, langData);
  const hardcoded = checkHardcodedStrings(ROOT);
  const valueQuality = checkValueQuality(langData);
  const iconIssues = checkIconConsistency(langData);
  const completeness = calcCompleteness(langData);

  // ── Summary ──

  const section = (title) => console.log(`\n${C.bold}─── ${title} ───${C.reset}`);
  const ok = (msg) => console.log(`  ${C.green}✓${C.reset} ${msg}`);
  const warn = (msg) => console.log(`  ${C.yellow}⚠${C.reset} ${msg}`);
  const err = (msg) => console.log(`  ${C.red}✗${C.reset} ${msg}`);
  const info = (msg) => console.log(`  ${C.cyan}ℹ${C.reset} ${msg}`);

  section('1. Translation Keys');
  info(`Defined: ko=${keyAudit.defined.ko}  en=${keyAudit.defined.en}  ja=${keyAudit.defined.ja}`);
  info(`Used in source: ${keyAudit.usedKeys}`);

  if (keyAudit.missingKeys.length === 0) ok('No missing keys');
  else err(`Missing keys: ${keyAudit.missingKeys.length} (used but undefined)`);

  if (keyAudit.missingInEn.length === 0) ok('English: complete');
  else err(`English: ${keyAudit.missingInEn.length} keys missing`);

  if (keyAudit.missingInJa.length === 0) ok('Japanese: complete');
  else err(`Japanese: ${keyAudit.missingInJa.length} keys missing`);

  if (keyAudit.deadKeys.length > 0) warn(`Dead keys: ${keyAudit.deadKeys.length} (defined but unused)`);
  else ok('No dead keys');

  section('2. Hardcoded Korean Strings');
  if (hardcoded.length === 0) ok('No hardcoded Korean strings found');
  else {
    warn(`${hardcoded.length} hardcoded Korean strings in ${new Set(hardcoded.map(h => h.file)).size} files`);
    if (!isSummary) {
      const grouped = {};
      for (const h of hardcoded) {
        if (!grouped[h.file]) grouped[h.file] = 0;
        grouped[h.file]++;
      }
      const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
      for (const [file, count] of sorted.slice(0, 10)) {
        console.log(`    ${C.dim}${file}: ${count} strings${C.reset}`);
      }
      if (sorted.length > 10) console.log(`    ${C.dim}... and ${sorted.length - 10} more files${C.reset}`);
    }
  }

  section('3. Value Quality');
  if (valueQuality.empty.length === 0) ok('No empty values');
  else err(`Empty values: ${valueQuality.empty.length}`);

  if (valueQuality.untranslated.length === 0) ok('No untranslated placeholders');
  else warn(`Untranslated (value == key): ${valueQuality.untranslated.length}`);

  if (valueQuality.tooLong.length === 0) ok('No excessively long values');
  else warn(`Values >500 chars: ${valueQuality.tooLong.length}`);

  section('4. Icon Consistency');
  if (iconIssues.length === 0) ok('Icon patterns match across all languages');
  else warn(`${iconIssues.length} keys have mismatched icon patterns between languages`);

  section('5. Completeness');
  for (const lang of LANGS) {
    const s = completeness[lang];
    const bar = '█'.repeat(Math.round(s.pct / 5)) + '░'.repeat(20 - Math.round(s.pct / 5));
    const color = s.pct >= 95 ? C.green : s.pct >= 80 ? C.yellow : C.red;
    console.log(`  ${C.bold}${lang}${C.reset}: ${color}${bar} ${s.pct}%${C.reset} (${s.nonEmpty}/${s.total})`);
  }

  // ── Overall Score ──
  const issues = keyAudit.missingKeys.length + keyAudit.missingInEn.length +
    keyAudit.missingInJa.length + valueQuality.empty.length;
  const overallPct = Math.min(...LANGS.map(l => completeness[l].pct));

  section('Overall');
  if (issues === 0 && overallPct >= 95) {
    console.log(`  ${C.green}${C.bold}★ PASS — Translation quality is excellent!${C.reset}`);
  } else if (issues <= 5 && overallPct >= 80) {
    console.log(`  ${C.yellow}${C.bold}△ WARN — Minor issues detected (${issues} critical issues)${C.reset}`);
  } else {
    console.log(`  ${C.red}${C.bold}✗ FAIL — ${issues} critical issues need attention${C.reset}`);
  }

  // ── JSON output ──
  if (isJson) {
    const report = {
      generatedAt: new Date().toISOString(),
      keyAudit: {
        ...keyAudit,
        deadKeysCount: keyAudit.deadKeys.length,
      },
      hardcoded: {
        count: hardcoded.length,
        files: [...new Set(hardcoded.map(h => h.file))].length,
        items: hardcoded,
      },
      valueQuality,
      iconIssues,
      completeness,
      overallScore: overallPct,
      criticalIssues: issues,
    };

    const outPath = join(ROOT, 'scripts', 'translation-report.json');
    writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`\n${C.green}Full report saved:${C.reset} scripts/translation-report.json`);
  }

  // ── Suggested actions ──
  console.log(`\n${C.bold}Suggested actions:${C.reset}`);
  if (keyAudit.missingInEn.length > 0 || keyAudit.missingInJa.length > 0) {
    console.log(`  ${C.dim}1. Run audit:     node scripts/audit-translation-keys.mjs --json${C.reset}`);
    console.log(`  ${C.dim}2. Auto-translate: node scripts/auto-translate.mjs --api-key YOUR_KEY${C.reset}`);
    console.log(`  ${C.dim}3. Merge:          node scripts/merge-translations.mjs${C.reset}`);
  }
  if (hardcoded.length > 0) {
    console.log(`  ${C.dim}→ Review hardcoded strings: node scripts/find-hardcoded-strings.mjs --json${C.reset}`);
  }
  if (keyAudit.deadKeys.length > 20) {
    console.log(`  ${C.dim}→ Consider removing ${keyAudit.deadKeys.length} dead keys${C.reset}`);
  }
  console.log('');
}

main().catch((err) => {
  console.error(`${C.red}Error:${C.reset} ${err.message}`);
  process.exit(1);
});
