#!/usr/bin/env node
/**
 * verify-icons.mjs
 * Extracts all Material Symbols icon names from the codebase and validates
 * them against the official Google Material Symbols Outlined codepoints.
 *
 * Usage:  node scripts/verify-icons.mjs
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ── 1. Fetch official codepoints ────────────────────────────────────
const CODEPOINTS_URL =
  'https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints';

async function fetchCodepoints() {
  const res = await fetch(CODEPOINTS_URL);
  if (!res.ok) throw new Error(`Failed to fetch codepoints: ${res.status}`);
  const text = await res.text();
  const names = new Set();
  for (const line of text.split('\n')) {
    const name = line.split(/\s+/)[0]?.trim();
    if (name) names.add(name);
  }
  return names;
}

// ── 2. Walk project files ───────────────────────────────────────────
const SCAN_EXTENSIONS = new Set(['.html', '.js', '.mjs', '.cjs', '.css', '.json']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'android', 'ios', 'windows11', 'dist']);

function walkFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (SKIP_DIRS.has(entry)) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkFiles(full));
    } else if (SCAN_EXTENSIONS.has(extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

// ── 3. Extract icon names ───────────────────────────────────────────
// Patterns:
//  - HTML: <span class="material-symbols-outlined ...">ICON_NAME</span>
//  - JS string literals containing the above pattern
//  - JS: textContent/innerText/innerHTML assignments containing icon names
const ICON_REGEX =
  /material[-_]symbols[-_]outlined[^>]*>\s*([a-z0-9_]+)\s*</gi;

// Also catch cases like: .textContent = 'icon_name'  or  innerText = "icon_name"
const TEXT_CONTENT_REGEX =
  /(?:textContent|innerText)\s*=\s*['"]([a-z_][a-z0-9_]*)['"];?/g;

function extractIcons(content, file) {
  const found = new Map(); // iconName → [{file, line}]

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Primary pattern
    let m;
    const re1 = new RegExp(ICON_REGEX.source, 'gi');
    while ((m = re1.exec(line)) !== null) {
      const name = m[1].toLowerCase();
      if (!found.has(name)) found.set(name, []);
      found.get(name).push({ file: file.replace(ROOT + '/', ''), line: i + 1 });
    }

    // textContent pattern — only if inside a .material-symbols context
    const re2 = new RegExp(TEXT_CONTENT_REGEX.source, 'g');
    while ((m = re2.exec(line)) !== null) {
      const name = m[1].toLowerCase();
      // Quick filter: must look like an icon name (all lowercase/underscore, ≥2 chars)
      if (name.length >= 2 && /^[a-z][a-z0-9_]*$/.test(name)) {
        // Check surrounding context for material-symbols
        const ctx = lines.slice(Math.max(0, i - 5), i + 5).join(' ');
        if (/material.symbols|icon/i.test(ctx)) {
          if (!found.has(name)) found.set(name, []);
          found.get(name).push({ file: file.replace(ROOT + '/', ''), line: i + 1 });
        }
      }
    }
  }

  return found;
}

// ── 4. Main ─────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Fetching official Material Symbols codepoints...');
  const validNames = await fetchCodepoints();
  console.log(`   ✅ ${validNames.size} valid icon names loaded\n`);

  console.log('📂 Scanning project files...');
  const files = walkFiles(ROOT);
  console.log(`   Found ${files.length} files to scan\n`);

  const allIcons = new Map(); // iconName → locations[]

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const icons = extractIcons(content, file);
    for (const [name, locs] of icons) {
      if (!allIcons.has(name)) allIcons.set(name, []);
      allIcons.get(name).push(...locs);
    }
  }

  // Deduplicate locations
  for (const [name, locs] of allIcons) {
    const seen = new Set();
    allIcons.set(
      name,
      locs.filter((l) => {
        const key = `${l.file}:${l.line}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
    );
  }

  const sortedNames = [...allIcons.keys()].sort();
  const invalid = sortedNames.filter((n) => !validNames.has(n));
  const valid = sortedNames.filter((n) => validNames.has(n));

  console.log(`📊 Results:`);
  console.log(`   Total unique icon names found: ${sortedNames.length}`);
  console.log(`   ✅ Valid: ${valid.length}`);
  console.log(`   ❌ Invalid: ${invalid.length}\n`);

  if (invalid.length > 0) {
    console.log('❌ INVALID ICONS (not in Material Symbols Outlined):');
    console.log('─'.repeat(60));
    for (const name of invalid) {
      const locs = allIcons.get(name);
      console.log(`\n  ⚠️  "${name}"  (${locs.length} usage${locs.length > 1 ? 's' : ''})`);
      for (const loc of locs.slice(0, 5)) {
        console.log(`      → ${loc.file}:${loc.line}`);
      }
      if (locs.length > 5) console.log(`      … and ${locs.length - 5} more`);
    }
    console.log('\n');
  }

  console.log('✅ VALID ICONS:');
  console.log('─'.repeat(60));
  console.log(valid.join(', '));
  console.log('\n');

  // Summary
  if (invalid.length === 0) {
    console.log('🎉 All icons are valid Material Symbols Outlined names!');
  } else {
    console.log(`⚠️  ${invalid.length} icon(s) need replacement. See above for details.`);
  }
}

main().catch(console.error);
