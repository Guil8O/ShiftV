/**
 * Rename accent IDs in md3-tokens.css to match Plan.md spec.
 * Run: node scripts/rename-accents.mjs
 * 
 * Mapping: pink→coral, purple→violet, deep-purple→(remove), blue→(remove),
 *          light-blue→sky, green→lime
 * New:     amber, gold
 */
import { readFileSync, writeFileSync } from 'fs';

const FILE = 'src/styles/md3-tokens.css';
let css = readFileSync(FILE, 'utf-8');

// 1. Rename accents
const renames = [
  ['pink', 'coral'],
  ['purple', 'violet'],     // must come AFTER deep-purple removal
  ['light-blue', 'sky'],
  ['green', 'lime'],
];

// First, remove deep-purple and blue blocks entirely
const blockPattern = (name) => {
  // Match from the comment header to the end of the dark theme block
  const escaped = name.replace(/-/g, '\\-');
  return new RegExp(
    `/\\*\\s*={3,}\\s*\\n\\s*Accent:\\s*${escaped}\\b[\\s\\S]*?\\n\\}\\n(?=\\n/\\*)`,
    'gi'
  );
};

// Remove deep-purple block
css = css.replace(blockPattern('Deep Purple'), '');
// Remove blue block (but not light-blue)  
css = css.replace(blockPattern('Blue'), '');

// Now rename in order
for (const [from, to] of renames) {
  const titleFrom = from.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const titleTo = to.charAt(0).toUpperCase() + to.slice(1);
  
  css = css.replaceAll(`data-accent="${from}"`, `data-accent="${to}"`);
  css = css.replaceAll(`Accent: ${titleFrom}`, `Accent: ${titleTo}`);
}

// Fix the comment at top
css = css.replace(
  /Accents:.*$/m,
  'Accents: rose, violet, sky, teal, lime, amber, coral, indigo, cyan, gold'
);

// 2. Add amber and gold blocks before the file ends
const amberBlock = `
/* =========================================
   Accent: Amber
   ========================================= */
:root[data-accent="amber"][data-theme="light"] {
  --md-sys-color-primary: #855400;
  --md-sys-color-on-primary: #FFFFFF;
  --md-sys-color-primary-container: #FFDDB3;
  --md-sys-color-on-primary-container: #2B1700;
  --md-sys-color-secondary: #6F5B40;
  --md-sys-color-on-secondary: #FFFFFF;
  --md-sys-color-secondary-container: #FADDBC;
  --md-sys-color-on-secondary-container: #271904;
  --md-sys-color-tertiary: #516440;
  --md-sys-color-on-tertiary: #FFFFFF;
  --md-sys-color-tertiary-container: #D4EABB;
  --md-sys-color-on-tertiary-container: #0F2004;
}
:root[data-accent="amber"][data-theme="dark"] {
  --md-sys-color-primary: #FFB951;
  --md-sys-color-on-primary: #462B00;
  --md-sys-color-primary-container: #654000;
  --md-sys-color-on-primary-container: #FFDDB3;
  --md-sys-color-secondary: #D8C1A1;
  --md-sys-color-on-secondary: #3B2D16;
  --md-sys-color-secondary-container: #53442A;
  --md-sys-color-on-secondary-container: #FADDBC;
  --md-sys-color-tertiary: #B8CEA1;
  --md-sys-color-on-tertiary: #243516;
  --md-sys-color-tertiary-container: #3A4C2B;
  --md-sys-color-on-tertiary-container: #D4EABB;
}

/* =========================================
   Accent: Gold
   ========================================= */
:root[data-accent="gold"][data-theme="light"] {
  --md-sys-color-primary: #8E4E00;
  --md-sys-color-on-primary: #FFFFFF;
  --md-sys-color-primary-container: #FFDCBE;
  --md-sys-color-on-primary-container: #2E1500;
  --md-sys-color-secondary: #755845;
  --md-sys-color-on-secondary: #FFFFFF;
  --md-sys-color-secondary-container: #FFDCBE;
  --md-sys-color-on-secondary-container: #2B1508;
  --md-sys-color-tertiary: #616036;
  --md-sys-color-on-tertiary: #FFFFFF;
  --md-sys-color-tertiary-container: #E7E5B0;
  --md-sys-color-on-tertiary-container: #1D1D00;
}
:root[data-accent="gold"][data-theme="dark"] {
  --md-sys-color-primary: #FFB871;
  --md-sys-color-on-primary: #4C2700;
  --md-sys-color-primary-container: #6C3A00;
  --md-sys-color-on-primary-container: #FFDCBE;
  --md-sys-color-secondary: #E4BFA8;
  --md-sys-color-on-secondary: #42291A;
  --md-sys-color-secondary-container: #5B402F;
  --md-sys-color-on-secondary-container: #FFDCBE;
  --md-sys-color-tertiary: #CBC896;
  --md-sys-color-on-tertiary: #33320E;
  --md-sys-color-tertiary-container: #494821;
  --md-sys-color-on-tertiary-container: #E7E5B0;
}
`;

// Insert before final newline
css = css.trimEnd() + '\n' + amberBlock.trim() + '\n';

writeFileSync(FILE, css, 'utf-8');
console.log('✅ Accents renamed and amber/gold added');
