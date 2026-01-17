import fs from 'node:fs/promises';
import path from 'node:path';

const read = async (p) => fs.readFile(path.resolve(process.cwd(), p), 'utf8');

const extractIds = (text) => {
  const ids = new Set();
  const re = /\bid\s*:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text))) ids.add(m[1]);
  return ids;
};

const extractRelatedSymptoms = (text) => {
  const out = new Set();
  const re = /relatedSymptoms\s*:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(text))) {
    const inside = m[1];
    const strRe = /['"]([^'"]+)['"]/g;
    let s;
    while ((s = strRe.exec(inside))) out.add(s[1]);
  }
  return out;
};

async function main() {
  const medText = await read('src/doctor-module/data/medication-database.js');
  const symText = await read('src/doctor-module/data/symptom-database.js');

  const symptomIds = extractIds(symText);
  const related = extractRelatedSymptoms(medText);
  const missing = [...related].filter(x => !symptomIds.has(x)).sort();

  console.log(`symptom ids: ${symptomIds.size}`);
  console.log(`relatedSymptoms refs: ${related.size}`);
  console.log(`missing: ${missing.length}`);
  missing.forEach(x => console.log(`- ${x}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
