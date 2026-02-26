#!/usr/bin/env node
/**
 * Replaces inline <span class='material-symbols-outlined ...'>icon</span>
 * in translations.js with {{icon:NAME}} or {{icon:NAME:CLASSES}} pattern.
 *
 * Default classes = "mi-inline mi-sm" → {{icon:NAME}}
 * Other classes → {{icon:NAME:CLASSES}}
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FILE = join(__dirname, '..', 'src', 'translations.js');

const DEFAULT_CLASSES = 'mi-inline mi-sm';

let content = readFileSync(FILE, 'utf-8');

let count = 0;

// Match: <span class='material-symbols-outlined CLASSES'>ICON_NAME</span>
const regex = /<span\s+class=['"]material-symbols-outlined\s+([^'"]*?)['"]>([a-z0-9_]+)<\/span>/g;

content = content.replace(regex, (match, classes, iconName) => {
  count++;
  const trimmed = classes.trim();
  if (trimmed === DEFAULT_CLASSES) {
    return `{{icon:${iconName}}}`;
  } else {
    return `{{icon:${iconName}:${trimmed}}}`;
  }
});

writeFileSync(FILE, content, 'utf-8');
console.log(`✅ Replaced ${count} inline icon spans with {{icon:...}} patterns.`);

// Verify
const verify = readFileSync(FILE, 'utf-8');
const remaining = (verify.match(/material-symbols-outlined/g) || []).length;
console.log(`   Remaining "material-symbols-outlined" in file: ${remaining}`);
const patterns = (verify.match(/\{\{icon:[^}]+\}\}/g) || []).length;
console.log(`   Total {{icon:...}} patterns: ${patterns}`);
