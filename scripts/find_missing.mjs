import { languages } from './src/translations.js';

const langCodes = Object.keys(languages);
console.log('Languages:', langCodes);

// Collect all keys
const allKeys = new Set();
for (const lang of langCodes) {
    Object.keys(languages[lang]).forEach(key => allKeys.add(key));
}
console.log('Total unique keys:', allKeys.size);

// Find missing per language
const missing = {};
for (const lang of langCodes) {
    const langKeys = new Set(Object.keys(languages[lang]));
    missing[lang] = Array.from(allKeys).filter(key => !langKeys.has(key));
}

// Show missing counts
for (const lang of langCodes) {
    console.log(`\n${lang}: missing ${missing[lang].length} keys`);
    if (missing[lang].length > 0) {
        // Show first 20 missing keys
        console.log(missing[lang].slice(0, 20).join(', '));
        if (missing[lang].length > 20) {
            console.log(`... and ${missing[lang].length - 20} more`);
        }
    }
}

// Determine source language for translations (Korean)
const sourceLang = 'ko';
const sourceKeys = languages[sourceLang];

// Prepare additions
const additions = {};
for (const lang of langCodes) {
    if (lang === sourceLang) continue;
    additions[lang] = {};
    for (const key of missing[lang]) {
        if (sourceKeys[key] !== undefined) {
            // Use Korean translation as base
            additions[lang][key] = sourceKeys[key];
        } else {
            // Fallback to English if Korean missing (should not happen)
            const enKey = languages['en'][key];
            if (enKey !== undefined) {
                additions[lang][key] = enKey;
            } else {
                // Keep key as placeholder
                additions[lang][key] = `[${key}]`;
            }
        }
    }
}

// Output additions in a format that can be inserted into the JS file
console.log('\n\nAdditions needed:');
for (const lang of langCodes) {
    if (Object.keys(additions[lang] || {}).length === 0) continue;
    console.log(`\n// Add to ${lang}:`);
    const entries = Object.entries(additions[lang]);
    // Group by approximate line length
    let output = '';
    for (const [key, value] of entries) {
        // Escape quotes
        const escaped = value.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        output += `        ${key}: "${escaped}",\n`;
    }
    console.log(output);
}

// Also generate a patch file that can be applied to translations.js
import fs from 'fs';

let patchContent = '// PATCH for translations.js\n';
for (const lang of langCodes) {
    if (Object.keys(additions[lang] || {}).length === 0) continue;
    patchContent += `\n// ${lang} additions\n`;
    const entries = Object.entries(additions[lang]);
    for (const [key, value] of entries) {
        const escaped = value.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        patchContent += `languages.${lang}.${key} = "${escaped}";\n`;
    }
}

fs.writeFileSync('translations_patch.js', patchContent, 'utf8');
console.log('\nPatch file written to translations_patch.js');

// Write a complete merged JSON for reference
const merged = {};
for (const lang of langCodes) {
    merged[lang] = { ...languages[lang] };
    if (additions[lang]) {
        Object.assign(merged[lang], additions[lang]);
    }
}
fs.writeFileSync('translations_merged.json', JSON.stringify(merged, null, 2), 'utf8');
console.log('Merged translations written to translations_merged.json');