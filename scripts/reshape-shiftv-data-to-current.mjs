import fs from 'node:fs/promises';
import path from 'node:path';

const readJson = async (p) => JSON.parse(await fs.readFile(path.resolve(process.cwd(), p), 'utf8'));
const writeJson = async (p, obj) => fs.writeFile(path.resolve(process.cwd(), p), JSON.stringify(obj, null, 2), 'utf8');

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
  { re: /체중\s*감소|살\s*빠|감량/, id: 'weight_loss', severity: 2 },
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

  const idMap = {
    depression_lethargy: 'depression',
    anxiety_restlessness: 'anxiety',
    raynauds_paresthesia: 'paresthesia',
    flushing_erythema: 'flushing',
    skin_atrophy_bruising: 'skin_atrophy',
    alopecia_mpb: 'male_pattern_baldness',
    edema_moon_face: 'edema',
    sarcopenia_weakness: 'sarcopenia',
    voice_cracking_deepening: 'voice_change',
    breast_budding_mastalgia: 'breast_budding',
    gynecomastia_enlargement: 'gynecomastia',
    palpitation_tachycardia: 'palpitation',
    dvt_suspicion: 'dvt_symptoms'
  };

  const byId = new Map();
  for (const s of [...a, ...b]) {
    const rawId = s?.id;
    if (!rawId) continue;
    const id = idMap[rawId] || rawId;
    const sev = Number.isFinite(Number(s?.severity)) ? Number(s.severity) : 3;
    const prev = byId.get(id);
    const next = { id, severity: Math.max(1, Math.min(5, sev)) };
    if (!prev || next.severity > prev.severity) byId.set(id, next);
  }
  const out = [...byId.values()];
  return out.length > 0 ? out : null;
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
  return null;
};

const buildMedicationsFromLegacyFields = (m) => {
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

const reshapeMeasurement = (m, templateKeys, index) => {
  const out = {};
  for (const key of templateKeys) {
    out[key] = m && Object.prototype.hasOwnProperty.call(m, key) ? m[key] : null;
  }

  out.timestamp = ensureTimestamp({ ...m, ...out });
  if (typeof out.week !== 'number') out.week = index;
  if (typeof out.date !== 'string' || !out.date) out.date = new Date(out.timestamp).toISOString().slice(0, 10);

  if (out.menstruationActive === null) out.menstruationActive = false;
  if (out.menstruationPain === undefined) out.menstruationPain = null;

  const symptomText = collectSymptomText(m);
  const extractedSymptoms = extractSymptomsFromText(symptomText);
  out.symptoms = mergeSymptoms(m?.symptoms, extractedSymptoms);

  const medsFromLegacy = buildMedicationsFromLegacyFields(m);
  out.medications = Array.isArray(m?.medications) && m.medications.length > 0 ? m.medications : medsFromLegacy;

  return out;
};

async function main() {
  const inputPath = process.argv[2];
  const dummyPath = process.argv[3];
  const outputPath = process.argv[4];
  if (!inputPath || !dummyPath || !outputPath) {
    console.error('Usage: node scripts/reshape-shiftv-data-to-current.mjs <input.json> <dummy.json> <output.json>');
    process.exit(1);
  }

  const input = await readJson(inputPath);
  const dummy = await readJson(dummyPath);

  const templateMeas = dummy?.data?.measurements?.[0];
  if (!templateMeas || typeof templateMeas !== 'object') {
    console.error('Dummy file does not contain data.measurements[0]');
    process.exit(2);
  }

  const templateKeys = Object.keys(templateMeas);
  const measurements = Array.isArray(input?.data?.measurements) ? input.data.measurements : [];
  const reshaped = measurements.map((m, idx) => reshapeMeasurement(m, templateKeys, idx));

  const out = {
    app: 'ShiftV',
    version: input?.version || '1.5',
    exportDate: new Date().toISOString(),
    settings: {
      language: input?.settings?.language ?? 'ko',
      mode: input?.settings?.mode ?? 'mtf',
      theme: input?.settings?.theme ?? 'dark',
      biologicalSex: input?.settings?.biologicalSex ?? (input?.settings?.mode === 'ftm' ? 'female' : 'male'),
      selectedMetrics: Array.isArray(input?.settings?.selectedMetrics) ? input.settings.selectedMetrics : ['weight']
    },
    data: {
      measurements: reshaped,
      targets: input?.data?.targets && typeof input.data.targets === 'object' ? input.data.targets : {},
      notes: Array.isArray(input?.data?.notes) ? input.data.notes : []
    }
  };

  await writeJson(outputPath, out);

  const check = await readJson(outputPath);
  const ok = check?.app === 'ShiftV' && Array.isArray(check?.data?.measurements);
  if (!ok) {
    console.error('Output validation failed');
    process.exit(3);
  }
  console.log(`Reshaped OK: ${outputPath}`);
  console.log(`Measurements: ${check.data.measurements.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

