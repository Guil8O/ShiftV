#!/usr/bin/env node
/**
 * Merge translation patches into src/translations.js
 *
 * Reads scripts/translations-patch.json and applies new/updated keys
 * directly into the translations.js source file.
 *
 * Usage:
 *   node scripts/merge-translations.mjs                 # merge + write
 *   node scripts/merge-translations.mjs --dry-run       # preview only
 *   node scripts/merge-translations.mjs --patch path    # custom patch file
 *   node scripts/merge-translations.mjs --backup        # create .bak before writing
 *
 * The patch file format (translations-patch.json):
 * {
 *   "meta": { ... },
 *   "translations": {
 *     "en": { "key1": "value1", ... },
 *     "ja": { "key1": "値1", ... }
 *   }
 * }
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const TRANSLATIONS_PATH = join(ROOT, 'src', 'translations.js');
const DEFAULT_PATCH_PATH = join(ROOT, 'scripts', 'translations-patch.json');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    if (key === 'dry-run' || key === 'backup') { args[key] = true; continue; }
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
    args[key] = value;
    if (value !== true) i += 1;
  }
  return args;
}

/**
 * Parse translations.js into { header, langBlocks: { ko, en, ja }, footer }
 * Each langBlock is a Map<string, string> preserving insertion order.
 */
function parseTranslationsFile(source) {
  const lines = source.split(/\r?\n/);

  // Find the `export const languages = {` line
  let langStartLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/export\s+const\s+languages\s*=\s*\{/.test(lines[i])) {
      langStartLine = i;
      break;
    }
  }
  if (langStartLine < 0) throw new Error('Cannot find `export const languages = {` in translations.js');

  // Find each language block: `ko: {`, `en: {`, `ja: {`
  const LANGS = ['ko', 'en', 'ja'];
  const blocks = {};
  const blockRanges = {};

  for (const lang of LANGS) {
    const openRe = new RegExp(`^\\s*${lang}\\s*:\\s*\\{`);
    let startIdx = -1;
    for (let i = langStartLine; i < lines.length; i++) {
      if (openRe.test(lines[i])) { startIdx = i; break; }
    }
    if (startIdx < 0) throw new Error(`Cannot find "${lang}: {" block`);

    // Find matching close brace
    let depth = 0;
    let endIdx = -1;
    for (let i = startIdx; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') depth++;
        if (ch === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
      }
      if (endIdx >= 0) break;
    }
    if (endIdx < 0) throw new Error(`Cannot find closing brace for "${lang}" block`);

    // Parse key-value pairs from the block body
    const entries = new Map();
    // Regex for single key: value per line
    const singleRe = /^\s*([\w$]+)\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)\s*,?\s*$/;
    // Regex for multiple key: value pairs on one line (e.g., daySun: "일", dayMon: "월", ...)
    const multiRe = /([\w$]+)\s*:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;

    for (let i = startIdx + 1; i < endIdx; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

      if (singleRe.test(line)) {
        // Single key per line (most common)
        const m = line.match(singleRe);
        entries.set(m[1], unquote(m[2]));
      } else {
        // Multiple keys on one line — use global regex
        multiRe.lastIndex = 0;
        let m;
        while ((m = multiRe.exec(line)) !== null) {
          entries.set(m[1], unquote(m[2]));
        }
      }
    }

    blocks[lang] = entries;
    blockRanges[lang] = { start: startIdx, end: endIdx };
  }

  // Header = everything before the first language block
  const firstBlockStart = Math.min(...Object.values(blockRanges).map(r => r.start));
  // Footer = everything after the last language block's closing `};`
  const lastBlockEnd = Math.max(...Object.values(blockRanges).map(r => r.end));

  // Find the `};` that closes `export const languages = {`
  let langEndLine = lastBlockEnd;
  for (let i = lastBlockEnd + 1; i < lines.length; i++) {
    if (/^\s*\}\s*;?\s*$/.test(lines[i])) { langEndLine = i; break; }
  }

  const header = lines.slice(0, langStartLine + 1).join('\n'); // includes `export const languages = {`
  const footer = lines.slice(langEndLine + 1).join('\n');       // includes functions

  return { header, blocks, footer, langEndLine };
}

/** Remove surrounding quotes and unescape */
function unquote(raw) {
  const quote = raw[0];
  let value = raw.slice(1, -1);
  if (quote === '"') value = value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  else if (quote === "'") value = value.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  return value;
}

/**
 * Serialize language blocks back into JS source.
 */
function serializeBlocks(header, blocks, footer) {
  const parts = [header];

  const LANGS = ['ko', 'en', 'ja'];
  for (let li = 0; li < LANGS.length; li++) {
    const lang = LANGS[li];
    const entries = blocks[lang];
    const isLast = li === LANGS.length - 1;

    parts.push(`  ${lang}: {`);
    const keys = [...entries.keys()];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = entries.get(key);
      // Escape for double quotes
      const escaped = value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
      const comma = i < keys.length - 1 ? ',' : '';
      parts.push(`    ${key}: "${escaped}"${comma}`);
    }
    parts.push(isLast ? '  }' : '  },');
  }

  parts.push('};');
  parts.push(footer);

  return parts.join('\n');
}

// ──────────────────── Main ────────────────────

async function main() {
  const args = parseArgs(process.argv);
  const dryRun = !!args['dry-run'];
  const createBackup = !!args.backup;
  const patchPath = args.patch ? String(args.patch) : DEFAULT_PATCH_PATH;

  console.log(`\n${C.bold}═══ Merge Translations ═══${C.reset}\n`);

  // Read patch
  if (!existsSync(patchPath)) {
    console.error(`${C.red}✗ Patch file not found:${C.reset} ${patchPath}`);
    console.log(`  Run ${C.dim}node scripts/auto-translate.mjs${C.reset} first to generate it.\n`);
    process.exit(1);
  }

  const patch = JSON.parse(readFileSync(patchPath, 'utf8'));
  const patchTranslations = patch.translations || {};

  if (Object.keys(patchTranslations).length === 0) {
    console.log(`${C.yellow}⚠ Patch file has no translations to merge.${C.reset}\n`);
    return;
  }

  console.log(`${C.cyan}Patch file:${C.reset} ${patchPath}`);
  if (patch.meta) {
    console.log(`${C.cyan}Generated:${C.reset} ${patch.meta.generatedAt || 'unknown'}`);
    console.log(`${C.cyan}Provider:${C.reset}  ${patch.meta.provider || 'unknown'} (${patch.meta.model || ''})`);
    console.log(`${C.cyan}Mode:${C.reset}      ${patch.meta.mode || 'missing'}`);
  }

  // Read and parse translations.js
  const source = readFileSync(TRANSLATIONS_PATH, 'utf8');
  const { header, blocks, footer } = parseTranslationsFile(source);

  console.log(`\n${C.cyan}Current keys:${C.reset}  ko=${blocks.ko.size}  en=${blocks.en.size}  ja=${blocks.ja.size}`);

  // Apply patches
  let totalAdded = 0;
  let totalUpdated = 0;
  const details = {};

  for (const [lang, translations] of Object.entries(patchTranslations)) {
    if (!blocks[lang]) {
      console.log(`${C.yellow}⚠ Skipping unknown language: ${lang}${C.reset}`);
      continue;
    }

    let added = 0;
    let updated = 0;

    for (const [key, value] of Object.entries(translations)) {
      if (blocks[lang].has(key)) {
        const existing = blocks[lang].get(key);
        if (existing !== value) {
          blocks[lang].set(key, value);
          updated++;
        }
      } else {
        blocks[lang].set(key, value);
        added++;
      }
    }

    details[lang] = { added, updated, total: Object.keys(translations).length };
    totalAdded += added;
    totalUpdated += updated;
  }

  // Report
  console.log('');
  for (const [lang, stat] of Object.entries(details)) {
    const addStr = stat.added > 0 ? `${C.green}+${stat.added} new${C.reset}` : `${C.dim}+0 new${C.reset}`;
    const updStr = stat.updated > 0 ? `${C.yellow}~${stat.updated} updated${C.reset}` : `${C.dim}~0 updated${C.reset}`;
    console.log(`  ${C.bold}${lang}:${C.reset} ${addStr}, ${updStr} (${stat.total} in patch)`);
  }

  console.log(`\n${C.cyan}After merge:${C.reset}   ko=${blocks.ko.size}  en=${blocks.en.size}  ja=${blocks.ja.size}`);

  if (totalAdded === 0 && totalUpdated === 0) {
    console.log(`\n${C.green}✓ Nothing to change — translations already up to date.${C.reset}\n`);
    return;
  }

  if (dryRun) {
    console.log(`\n${C.yellow}[DRY RUN] No files were modified.${C.reset}`);
    console.log(`  Remove ${C.dim}--dry-run${C.reset} to apply changes.\n`);
    return;
  }

  // Backup
  if (createBackup) {
    const backupPath = TRANSLATIONS_PATH + '.bak';
    copyFileSync(TRANSLATIONS_PATH, backupPath);
    console.log(`\n${C.dim}Backup: ${backupPath}${C.reset}`);
  }

  // Serialize and write
  const output = serializeBlocks(header, blocks, footer);
  writeFileSync(TRANSLATIONS_PATH, output, 'utf8');

  console.log(`\n${C.green}✓ translations.js updated successfully!${C.reset}`);
  console.log(`  ${C.dim}Added: ${totalAdded} | Updated: ${totalUpdated}${C.reset}`);
  console.log(`\n${C.yellow}Next:${C.reset} ${C.dim}node scripts/audit-translation-keys.mjs --json${C.reset} to verify.\n`);
}

main().catch((err) => {
  console.error(`${C.red}Error:${C.reset} ${err.message}`);
  process.exit(1);
});
