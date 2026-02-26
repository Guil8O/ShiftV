import { languages } from './src/translations.js';

const koKeys = new Set(Object.keys(languages.ko));
const enKeys = new Set(Object.keys(languages.en));
const jaKeys = new Set(Object.keys(languages.ja));

console.log('Korean keys count:', koKeys.size);
console.log('English keys count:', enKeys.size);
console.log('Japanese keys count:', jaKeys.size);

// Keys present in Japanese but not in Korean
const jaOnly = [...jaKeys].filter(k => !koKeys.has(k));
console.log('\nKeys only in Japanese (missing in Korean):', jaOnly.length);
if (jaOnly.length > 0) console.log(jaOnly.slice(0, 20));

// Keys present in Japanese but not in English
const jaOnlyEn = [...jaKeys].filter(k => !enKeys.has(k));
console.log('\nKeys only in Japanese (missing in English):', jaOnlyEn.length);
if (jaOnlyEn.length > 0) console.log(jaOnlyEn.slice(0, 20));

// Keys present in Korean but not in Japanese
const koOnlyJa = [...koKeys].filter(k => !jaKeys.has(k));
console.log('\nKeys only in Korean (missing in Japanese):', koOnlyJa.length);
if (koOnlyJa.length > 0) console.log(koOnlyJa.slice(0, 20));

// Keys present in English but not in Japanese
const enOnlyJa = [...enKeys].filter(k => !jaKeys.has(k));
console.log('\nKeys only in English (missing in Japanese):', enOnlyJa.length);
if (enOnlyJa.length > 0) console.log(enOnlyJa.slice(0, 20));