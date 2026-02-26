import fs from 'node:fs/promises';
import path from 'node:path';

const toNumberOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const ensureTimestamp = (m) => {
  if (Number.isFinite(m?.timestamp)) return m.timestamp;
  if (typeof m?.date === 'string') {
    const t = new Date(m.date).getTime();
    if (Number.isFinite(t)) return t;
  }
  return Date.now();
};

const mapOtherMedicationNameToId = (nameRaw) => {
  const name = String(nameRaw || '').trim();
  if (!name) return null;
  if (name.includes('타목시')) return 'tamoxifen';
  if (name.toLowerCase().includes('tamox')) return 'tamoxifen';
  if (name.includes('랄록')) return 'raloxifene';
  if (name.toLowerCase().includes('ralox')) return 'raloxifene';
  if (name.includes('아나스트') || name.toLowerCase().includes('anastr')) return 'anastrozole';
  if (name.includes('레트로') || name.toLowerCase().includes('letroz')) return 'letrozole';

  const slug = name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\-가-힣]/g, '')
    .slice(0, 40);
  return slug ? `custom_${slug}` : null;
};

const symptomKeywordRules = [
  { re: /무기력|피곤|피로/, id: 'chronic_fatigue', severity: 3 },
  { re: /브레인\s*포그|brain\s*fog/i, id: 'brain_fog', severity: 3 },
  { re: /홍조|열감|안면\s*홍조/, id: 'flushing', severity: 3 },
  { re: /여유증/, id: 'gynecomastia', severity: 3 },
  { re: /가슴\s*통증|유방\s*통증/, id: 'breast_pain', severity: 3 },
  { re: /가슴\s*몽우리|유륜\s*통증/, id: 'breast_budding', severity: 3 },
  { re: /시력\s*저하|시야\s*흐림|눈\s*침침/, id: 'vision_impairment', severity: 4 },
  { re: /불면|잠\s*못|잠\s*안\s*옴/, id: 'insomnia', severity: 3 },
  { re: /불안/, id: 'anxiety', severity: 3 },
  { re: /우울/, id: 'depression', severity: 3 },
  { re: /기분\s*변동|감정\s*기복/, id: 'mood_swings', severity: 3 },
  { re: /심장\s*두근|두근거림|심박|빈맥/, id: 'palpitation', severity: 3 },
  { re: /떨림|손\s*떨/, id: 'tremor', severity: 3 },
  { re: /땀\s*과다|식은\s*땀|야간\s*땀|땀\s*많/, id: 'hyperhidrosis', severity: 3 },
  { re: /부종|붓기|붓는/, id: 'edema', severity: 3 },
  { re: /체중\s*증가|살\s*찜|증량/, id: 'weight_gain', severity: 2 },
  { re: /여드름|트러블/, id: 'cystic_acne', severity: 2 },
  { re: /지루|피지|번들|기름\s*짐/, id: 'seborrhea', severity: 2 },
  { re: /건조|푸석|각질/, id: 'xeroderma', severity: 2 },
  { re: /탈모|머리\s*빠/, id: 'hair_thinning', severity: 3 },
  { re: /M\s*자\s*탈모|정수리\s*탈모/, id: 'male_pattern_baldness', severity: 3 },
  { re: /혈전|다리\s*통증|다리\s*붓|호흡\s*곤란/, id: 'dvt_symptoms', severity: 4 }
];

const adjustSeverityFromContext = (text, base) => {
  let s = base;
  if (/(가끔|때때로|종종)/.test(text)) s = Math.max(1, s - 1);
  if (/(약간|조금|살짝)/.test(text)) s = Math.max(1, s - 1);
  if (/(지속|계속|항상|매일)/.test(text)) s = Math.min(5, s + 1);
  if (/(심각|극심|너무|매우|지독|엄청)/.test(text)) s = Math.min(5, s + 1);
  return s;
};

const extractSymptomsFromText = (textRaw) => {
  const text = String(textRaw || '').trim();
  if (!text) return null;

  const byId = new Map();
  for (const rule of symptomKeywordRules) {
    if (!rule.re.test(text)) continue;
    const sev = adjustSeverityFromContext(text, rule.severity);
    const prev = byId.get(rule.id);
    if (!prev || sev > prev.severity) byId.set(rule.id, { id: rule.id, severity: sev });
  }

  const out = [...byId.values()];
  return out.length > 0 ? out : null;
};

const mergeSymptoms = (existing, extracted) => {
  const a = Array.isArray(existing) ? existing : [];
  const b = Array.isArray(extracted) ? extracted : [];
  if (a.length === 0 && b.length === 0) return null;

  const byId = new Map();
  for (const s of [...a, ...b]) {
    const id = s?.id;
    if (!id) continue;
    const sev = Number.isFinite(Number(s?.severity)) ? Number(s.severity) : 3;
    const prev = byId.get(id);
    if (!prev || sev > prev.severity) byId.set(id, { id, severity: Math.max(1, Math.min(5, sev)) });
  }
  const out = [...byId.values()];
  return out.length > 0 ? out : null;
};

const collectSymptomText = (m) => {
  const parts = [];
  if (m?.healthNotes) parts.push(String(m.healthNotes));
  if (m?.healthStatus) parts.push(String(m.healthStatus));

  const skin = m?.skinCondition;
  if (skin !== null && skin !== undefined) {
    const skinStr = String(skin).trim();
    if (skinStr && !/^\d+(\.\d+)?$/.test(skinStr)) parts.push(skinStr);
  }

  return parts.join(' / ').trim();
};

const buildMedications = (m) => {
  const date = typeof m?.date === 'string' ? m.date : null;
  const meds = [];

  const pushIfDose = (id, dose, unit = 'mg') => {
    const d = toNumberOrNull(dose);
    if (d === null || d <= 0) return;
    meds.push({ id, dose: d, unit, date });
  };

  pushIfDose('estradiol_valerate', m.estradiol, 'mg');
  pushIfDose('progesterone', m.progesterone, 'mg');
  pushIfDose('anti_androgen', m.antiAndrogen, 'mg');
  pushIfDose('testosterone_enanthate', m.testosterone, 'mg');
  pushIfDose('anastrozole', m.antiEstrogen, 'mg');

  const otherId = mapOtherMedicationNameToId(m.medicationOtherName);
  if (otherId) pushIfDose(otherId, m.medicationOtherDose, 'mg');

  return meds.length > 0 ? meds : null;
};

const convert = (input) => {
  const out = structuredClone(input);

  const settings = out.settings && typeof out.settings === 'object' ? out.settings : {};
  const mode = settings.mode || 'mtf';
  if (!settings.biologicalSex) settings.biologicalSex = mode === 'ftm' ? 'female' : 'male';
  out.settings = settings;

  if (!out.data || typeof out.data !== 'object') out.data = {};
  const measurements = Array.isArray(out.data.measurements) ? out.data.measurements : [];

  out.data.measurements = measurements.map((m, idx) => {
    const nm = { ...m };
    nm.timestamp = ensureTimestamp(nm);
    if (typeof nm.week !== 'number') nm.week = idx;

    if (nm.menstruationActive === undefined) nm.menstruationActive = false;
    if (nm.menstruationPain === undefined) nm.menstruationPain = null;

    const symptomText = collectSymptomText(nm);
    const extractedSymptoms = extractSymptomsFromText(symptomText);
    nm.symptoms = mergeSymptoms(nm.symptoms, extractedSymptoms);
    nm.medications = nm.medications ?? buildMedications(nm);

    return nm;
  });

  out.version = out.version || '1.5';
  out.exportDate = new Date().toISOString();
  return out;
};

async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath || !outputPath) {
    console.error('Usage: node scripts/convert-shiftv-data.mjs <input.json> <output.json>');
    process.exit(1);
  }

  const inAbs = path.resolve(process.cwd(), inputPath);
  const outAbs = path.resolve(process.cwd(), outputPath);

  const raw = await fs.readFile(inAbs, 'utf8');
  const parsed = JSON.parse(raw);
  const converted = convert(parsed);

  await fs.writeFile(outAbs, JSON.stringify(converted, null, 2), 'utf8');

  const check = JSON.parse(await fs.readFile(outAbs, 'utf8'));
  const ok = check?.app === 'ShiftV' && Array.isArray(check?.data?.measurements);
  if (!ok) {
    console.error('Output validation failed');
    process.exit(2);
  }
  console.log(`Converted OK: ${outputPath}`);
  console.log(`Measurements: ${check.data.measurements.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
