import fs from 'node:fs/promises';
import path from 'node:path';

const read = async (p) => fs.readFile(path.resolve(process.cwd(), p), 'utf8');

const extractDbIds = (text) => {
  const ids = new Set();
  const re = /\bid\s*:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text))) ids.add(m[1]);
  return ids;
};

const extractLiteralSymptomIds = (text) => {
  const ids = new Set();
  const re = /\b(?:id\s*===\s*|id\s*!==\s*|id\s*===\s*)['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text))) ids.add(m[1]);

  const re2 = /\bid\s*:\s*['"]([^'"]+)['"]/g;
  while ((m = re2.exec(text))) ids.add(m[1]);

  return ids;
};

async function main() {
  const dbText = await read('src/doctor-module/data/symptom-database.js');
  const analyzerText = await read('src/doctor-module/core/symptom-analyzer.js');
  const dbIds = extractDbIds(dbText);
  const refs = extractLiteralSymptomIds(analyzerText);
  const missing = [...refs].filter(x => !dbIds.has(x)).sort();

  console.log(`db ids: ${dbIds.size}`);
  console.log(`analyzer literal ids: ${refs.size}`);
  console.log(`missing in db: ${missing.length}`);
  missing.forEach(x => console.log(`- ${x}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

