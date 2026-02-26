#!/usr/bin/env node
/**
 * Auto-translate missing/specified keys using LLM APIs.
 *
 * Supports: DeepSeek (default), OpenAI, Google Gemini
 *
 * Usage:
 *   # Translate missing keys detected by audit:
 *   node scripts/auto-translate.mjs --api-key sk-xxx
 *   node scripts/auto-translate.mjs --api-key sk-xxx --to en,ja
 *
 *   # Translate specific keys (comma-separated):
 *   node scripts/auto-translate.mjs --api-key sk-xxx --keys "save,cancel,close"
 *
 *   # Translate ALL keys (full retranslation):
 *   node scripts/auto-translate.mjs --api-key sk-xxx --all
 *
 *   # Use different provider:
 *   node scripts/auto-translate.mjs --provider openai --api-key sk-xxx
 *   node scripts/auto-translate.mjs --provider gemini --api-key AIza-xxx
 *
 *   # Environment variable for API key:
 *   DEEPSEEK_API_KEY=sk-xxx node scripts/auto-translate.mjs
 *   OPENAI_API_KEY=sk-xxx node scripts/auto-translate.mjs --provider openai
 *
 * Options:
 *   --provider  deepseek|openai|gemini  (default: deepseek)
 *   --from      Source language          (default: ko)
 *   --to        Target languages         (default: en,ja)
 *   --api-key   API key
 *   --keys      Comma-separated key list to translate
 *   --all       Translate ALL keys (not just missing)
 *   --batch     Batch size per request   (default: 30)
 *   --dry-run   Show what would be translated without calling API
 *
 * Output: scripts/translations-patch.json
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const AUDIT_PATH = join(ROOT, 'scripts', 'translation-audit.json');
const OUTPUT_PATH = join(ROOT, 'scripts', 'translations-patch.json');

// ──────────────────── Provider configs ────────────────────

const PROVIDERS = {
  deepseek: {
    url: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    envKey: 'DEEPSEEK_API_KEY',
    buildBody: (model, systemPrompt, userPrompt) => ({
      model,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
    extractContent: (data) => data?.choices?.[0]?.message?.content,
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    envKey: 'OPENAI_API_KEY',
    buildBody: (model, systemPrompt, userPrompt) => ({
      model,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
    extractContent: (data) => data?.choices?.[0]?.message?.content,
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    model: 'gemini-2.0-flash',
    envKey: 'GEMINI_API_KEY',
    buildBody: (model, systemPrompt, userPrompt) => ({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    }),
    extractContent: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text,
  },
};

// ──────────────────── Args ────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    if (key === 'all' || key === 'dry-run') { args[key] = true; continue; }
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
    args[key] = value;
    if (value !== true) i += 1;
  }
  return args;
}

// ──────────────────── Translation ────────────────────

const LANG_NAMES = { ko: 'Korean', en: 'English', ja: 'Japanese' };

function buildPrompt(from, to, payload) {
  const fromName = LANG_NAMES[from] || from;
  const toName = LANG_NAMES[to] || to;
  return [
    `Translate the following UI strings from ${fromName} to ${toName}.`,
    `This is for a health/body tracking progressive web app called "ShiftV" used by transgender individuals.`,
    '',
    'Return ONLY a JSON object mapping each key to its translated string.',
    '',
    'Rules:',
    '- Keep template placeholders unchanged: {name}, {week}, {value}, {count}, {date}, etc.',
    '- Keep icon patterns unchanged: {{icon:NAME}} or {{icon:NAME:CLASSES}}',
    '- Keep HTML tags unchanged: <br>, <strong>, <span>, etc.',
    '- Use natural, concise tone appropriate for mobile UI (buttons, labels, dialogs)',
    '- Do NOT translate the JSON key names',
    '- For medical/hormone terminology, use proper localized terms',
    `- Target audience speaks ${toName} natively`,
    '',
    'Input JSON:',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

async function callProvider({ provider, apiKey, from, to, payload }) {
  const config = PROVIDERS[provider];
  const systemPrompt = 'You are a professional app localization engine. You translate UI strings precisely and naturally.';
  const userPrompt = buildPrompt(from, to, payload);

  let url = config.url.replace('{model}', config.model);
  const headers = { 'Content-Type': 'application/json' };

  if (provider === 'gemini') {
    url += `?key=${apiKey}`;
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(config.buildBody(config.model, systemPrompt, userPrompt)),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${provider} API error (${response.status}): ${detail.slice(0, 400)}`);
  }

  const data = await response.json();
  const content = config.extractContent(data);
  if (!content) throw new Error(`${provider} API returned empty content.`);

  // Parse JSON — handle potential markdown code blocks
  const cleaned = content.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

function chunkEntries(entries, size) {
  const out = [];
  for (let i = 0; i < entries.length; i += size) out.push(entries.slice(i, i + size));
  return out;
}

// ──────────────────── Main ────────────────────

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

async function main() {
  const args = parseArgs(process.argv);
  const provider = (args.provider || 'deepseek').toString().toLowerCase();
  const from = (args.from || 'ko').toString();
  const to = (args.to || 'en,ja').toString().split(',').map((x) => x.trim()).filter(Boolean);
  const batchSize = Math.max(1, Number(args.batch || 30));
  const dryRun = !!args['dry-run'];
  const translateAll = !!args.all;
  const specificKeys = args.keys ? args.keys.toString().split(',').map(k => k.trim()).filter(Boolean) : null;

  if (!PROVIDERS[provider]) {
    throw new Error(`Unknown provider: ${provider}. Available: ${Object.keys(PROVIDERS).join(', ')}`);
  }

  const config = PROVIDERS[provider];
  const apiKey = (args['api-key'] || process.env[config.envKey] || '').toString().trim();

  if (!apiKey && !dryRun) {
    throw new Error(`API key missing. Use --api-key or set ${config.envKey} environment variable.`);
  }

  console.log(`\n${C.bold}═══ Auto Translate ═══${C.reset}`);
  console.log(`${C.cyan}Provider:${C.reset} ${provider} (${config.model})`);
  console.log(`${C.cyan}From:${C.reset} ${from} → ${C.cyan}To:${C.reset} ${to.join(', ')}`);

  const languages = await (async () => {
    const mod = await import(pathToFileURL(join(ROOT, 'src', 'translations.js')).href);
    return mod.languages || {};
  })();

  const fromMap = new Map(Object.entries(languages[from] || {}));
  if (fromMap.size === 0) throw new Error(`Cannot parse source language: ${from}`);

  // Determine which keys to translate
  let keysToTranslate = {};
  for (const target of to) {
    if (specificKeys) {
      // Specific keys requested
      keysToTranslate[target] = specificKeys.filter(k => fromMap.has(k));
    } else if (translateAll) {
      // All keys
      keysToTranslate[target] = [...fromMap.keys()];
    } else {
      // Missing keys from audit
      if (!existsSync(AUDIT_PATH)) {
        console.log(`${C.yellow}⚠ Audit JSON not found. Run audit first: node scripts/audit-translation-keys.mjs --json${C.reset}`);
        console.log(`  Falling back to cross-comparing defined keys...`);
        const targetKeys = new Set(Object.keys(languages[target] || {}));
        keysToTranslate[target] = [...fromMap.keys()].filter(k => !targetKeys.has(k));
      } else {
        const audit = JSON.parse(readFileSync(AUDIT_PATH, 'utf8'));
        const field = `missingIn${target[0].toUpperCase()}${target.slice(1)}`;
        keysToTranslate[target] = Array.isArray(audit[field]) ? audit[field].filter(k => fromMap.has(k)) : [];
      }
    }
  }

  // Summary
  const totalKeys = Object.values(keysToTranslate).reduce((s, arr) => s + arr.length, 0);
  console.log(`${C.cyan}Keys to translate:${C.reset} ${totalKeys}`);
  for (const [lang, keys] of Object.entries(keysToTranslate)) {
    console.log(`  ${lang}: ${keys.length} keys`);
  }

  if (totalKeys === 0) {
    console.log(`\n${C.green}✓ Nothing to translate — all languages are in sync!${C.reset}\n`);
    return;
  }

  if (dryRun) {
    console.log(`\n${C.yellow}[DRY RUN] Would translate:${C.reset}`);
    for (const [lang, keys] of Object.entries(keysToTranslate)) {
      console.log(`\n  ${C.bold}${lang}:${C.reset}`);
      for (const key of keys.slice(0, 20)) {
        const value = fromMap.get(key);
        const preview = typeof value === 'string' ? value.slice(0, 60) : String(value).slice(0, 60);
        console.log(`    ${key}: ${C.dim}"${preview}${value?.length > 60 ? '...' : ''}"${C.reset}`);
      }
      if (keys.length > 20) console.log(`    ${C.dim}... and ${keys.length - 20} more${C.reset}`);
    }
    console.log('');
    return;
  }

  // Translate
  const patch = {
    meta: {
      provider,
      model: config.model,
      generatedAt: new Date().toISOString(),
      from,
      to,
      batchSize,
      mode: specificKeys ? 'specific' : translateAll ? 'all' : 'missing',
    },
    translations: {},
  };

  for (const target of to) {
    const keys = keysToTranslate[target];
    patch.translations[target] = {};
    if (keys.length === 0) continue;

    const entries = keys.map(key => [key, fromMap.get(key)]);
    const chunks = chunkEntries(entries, batchSize);

    for (let i = 0; i < chunks.length; i += 1) {
      const payload = Object.fromEntries(chunks[i]);
      const label = `${target} batch ${i + 1}/${chunks.length} (${Object.keys(payload).length} keys)`;
      process.stdout.write(`  ${C.cyan}→${C.reset} Translating ${label}...`);

      try {
        const translated = await callProvider({ provider, apiKey, from, to: target, payload });
        let added = 0;
        for (const [key, value] of Object.entries(translated)) {
          if (!keys.includes(key)) continue;
          patch.translations[target][key] = String(value);
          added += 1;
        }
        process.stdout.write(` ${C.green}✓ ${added} keys${C.reset}\n`);
      } catch (err) {
        process.stdout.write(` ${C.red}✗ ${err.message.slice(0, 100)}${C.reset}\n`);
      }

      // Rate limiting: 500ms between batches
      if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 500));
    }
  }

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(patch, null, 2)}\n`, 'utf8');

  const stats = Object.fromEntries(
    to.map(lang => [lang, Object.keys(patch.translations[lang] || {}).length]),
  );
  console.log(`\n${C.green}✓ Patch saved:${C.reset} scripts/translations-patch.json`);
  console.log(`${C.cyan}Counts:${C.reset}`, stats);
  console.log(`\n${C.yellow}Next steps:${C.reset}`);
  console.log(`  1. Review: ${C.dim}cat scripts/translations-patch.json${C.reset}`);
  console.log(`  2. Merge:  ${C.dim}node scripts/merge-translations.mjs${C.reset}`);
  console.log(`  3. Audit:  ${C.dim}node scripts/audit-translation-keys.mjs --json${C.reset}\n`);
}

main().catch((err) => {
  console.error(`${C.red}Error:${C.reset} ${err.message}`);
  process.exit(1);
});
