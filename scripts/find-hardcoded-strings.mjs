#!/usr/bin/env node
/**
 * Find hardcoded Korean strings that bypass translation keys.
 *
 * Usage:
 *   node scripts/find-hardcoded-strings.mjs             # console summary
 *   node scripts/find-hardcoded-strings.mjs --json      # + save JSON report
 *   node scripts/find-hardcoded-strings.mjs --verbose   # show all strings
 *   node scripts/find-hardcoded-strings.mjs --ui-only   # UI files only (skip doctor-module data)
 *
 * Categorizes findings by priority:
 *   🔴 HIGH   — UI-facing files (script.js, modals, tabs, components)
 *   🟡 MEDIUM — Engine/analysis code (doctor-engine, analyzers, predictors)
 *   🟢 LOW    — Data files (medication-database, symptom-database, etc.)
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { extname, join, relative, sep } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const OUTPUT_PATH = join(ROOT, 'scripts', 'hardcoded-strings-report.json');
const HANGUL_RE = /[\u3131-\u3163\uac00-\ud7a3]/;
const HANGUL_WORD_RE = /[\uac00-\ud7a3]{2,}/;

const norm = (p) => p.split(sep).join('/');

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'scripts', 'assets', 'android', 'ios', 'windows11', '.vite',
]);

const SKIP_FILES = new Set(['src/translations.js']);

const IGNORE_LINE_PATTERNS = [
  /^\s*\/\//,
  /^\s*\*/,
  /^\s*\/\*\*/,
  /^\s*import\s/,
  /^\s*export\s/,
  /console\.(log|warn|error|info|debug)\s*\(/,
  /data-lang-key\s*=/,
  /translate\(/,
  /\bthis\._t\(/,
  /\bthis\.t\(/,
  /\bt\(\s*['"`][\w$]+['"`]/,
  /\bko\s*:\s*['"`]/,
  /currentLanguage\s*===\s*['"`]ko['"`]/,
  /lang\s*===\s*['"`]ko['"`]/,
];

/** File path patterns for priority classification */
const PRIORITY_RULES = [
  { priority: 'high', pattern: /^(script\.js|index\.html|src\/ui\/|src\/data\/)/ },
  { priority: 'medium', pattern: /^src\/doctor-module\/core\// },
  { priority: 'low', pattern: /^src\/doctor-module\/data\// },
];

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

function classifyPriority(filePath) {
  for (const rule of PRIORITY_RULES) {
    if (rule.pattern.test(filePath)) return rule.priority;
  }
  return 'medium';
}

function collectSourceFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) { collectSourceFiles(full, files); continue; }
    const rel = norm(relative(ROOT, full));
    if (SKIP_FILES.has(rel)) continue;
    if (!['.js', '.mjs', '.html'].includes(extname(full))) continue;
    files.push(full);
  }
  return files;
}

function extractQuotedKoreanStrings(line) {
  const found = [];
  const quoteRe = /(['"`])((?:\\.|(?!\1).)*)\1/g;
  let match;
  while ((match = quoteRe.exec(line)) !== null) {
    const raw = match[2];
    const text = raw.trim();
    if (!text) continue;
    if (!HANGUL_RE.test(text)) continue;
    const cleaned = text.replace(/\$\{[^}]+}/g, '').trim();
    if (!HANGUL_WORD_RE.test(cleaned)) continue;
    found.push(text);
  }
  return found;
}

function scanFile(filePath) {
  const rel = norm(relative(ROOT, filePath));
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineNo = i + 1;

    if (inBlockComment) {
      if (line.includes('*/')) inBlockComment = false;
      continue;
    }
    if (line.includes('/*') && !line.includes('*/')) {
      inBlockComment = true;
      continue;
    }
    if (!HANGUL_RE.test(line)) continue;
    if (IGNORE_LINE_PATTERNS.some(p => p.test(line))) continue;

    const strings = extractQuotedKoreanStrings(line);
    if (strings.length === 0) continue;

    issues.push({
      file: rel,
      line: lineNo,
      priority: classifyPriority(rel),
      strings,
      context: line.trim().slice(0, 160),
    });
  }

  return issues;
}

const hasFlag = (f) => process.argv.includes(f);
const isVerbose = hasFlag('--verbose');
const isUiOnly = hasFlag('--ui-only');

const files = collectSourceFiles(ROOT);
let issues = files.flatMap(scanFile);

if (isUiOnly) {
  issues = issues.filter(i => i.priority === 'high');
}

const byPriority = { high: [], medium: [], low: [] };
for (const i of issues) byPriority[i.priority].push(i);

const grouped = issues.reduce((acc, item) => {
  if (!acc[item.file]) acc[item.file] = [];
  acc[item.file].push(item);
  return acc;
}, {});

console.log(`\n${C.bold}═══ Hardcoded Korean String Audit ═══${C.reset}\n`);
console.log(`${C.cyan}Scanned files:${C.reset} ${files.length}`);
console.log(`${C.cyan}Total findings:${C.reset} ${issues.length}`);
console.log(`  ${C.red}🔴 HIGH (UI):${C.reset}     ${byPriority.high.length}`);
console.log(`  ${C.yellow}🟡 MEDIUM (Engine):${C.reset} ${byPriority.medium.length}`);
console.log(`  ${C.green}🟢 LOW (Data):${C.reset}    ${byPriority.low.length}`);

if (issues.length > 0) {
  // Show HIGH priority first
  for (const priority of ['high', 'medium', 'low']) {
    const items = byPriority[priority];
    if (items.length === 0) continue;

    const icon = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
    const color = priority === 'high' ? C.red : priority === 'medium' ? C.yellow : C.green;

    console.log(`\n${C.bold}${icon} ${priority.toUpperCase()} Priority${C.reset}`);

    const byFile = {};
    for (const item of items) {
      if (!byFile[item.file]) byFile[item.file] = [];
      byFile[item.file].push(item);
    }

    for (const [file, rows] of Object.entries(byFile)) {
      console.log(`  ${color}[${file}]${C.reset} ${rows.length} strings`);
      if (isVerbose || priority === 'high') {
        for (const row of rows.slice(0, priority === 'high' ? 30 : 5)) {
          const joined = row.strings.map(s => `"${s.slice(0, 50)}"`).join(', ');
          console.log(`    ${C.dim}L${row.line}: ${joined}${C.reset}`);
        }
        const remaining = rows.length - (priority === 'high' ? 30 : 5);
        if (remaining > 0) console.log(`    ${C.dim}... +${remaining} more${C.reset}`);
      }
    }
  }
}

// Suggest key names for HIGH priority strings
if (byPriority.high.length > 0 && !hasFlag('--no-suggest')) {
  console.log(`\n${C.bold}─── Suggested Translation Keys (HIGH priority) ───${C.reset}`);
  const seen = new Set();
  let count = 0;
  for (const item of byPriority.high) {
    for (const str of item.strings) {
      const short = str.slice(0, 40);
      if (seen.has(short)) continue;
      seen.add(short);
      // Generate a suggested key name
      const suggested = str
        .replace(/[^가-힣a-zA-Z0-9\s]/g, '')
        .trim()
        .slice(0, 20);
      console.log(`  ${C.dim}${item.file}:${item.line}${C.reset} "${short}${str.length > 40 ? '...' : ''}"`);
      if (++count >= 20) { console.log(`  ${C.dim}... +${byPriority.high.reduce((s, i) => s + i.strings.length, 0) - 20} more${C.reset}`); break; }
    }
    if (count >= 20) break;
  }
}

if (hasFlag('--json')) {
  const payload = {
    generatedAt: new Date().toISOString(),
    scannedFiles: files.length,
    totalFindings: issues.length,
    byPriority: {
      high: byPriority.high.length,
      medium: byPriority.medium.length,
      low: byPriority.low.length,
    },
    findings: issues,
  };
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`\n${C.green}Saved:${C.reset} scripts/hardcoded-strings-report.json`);
}

console.log('');
process.exit(byPriority.high.length > 0 ? 1 : 0);
