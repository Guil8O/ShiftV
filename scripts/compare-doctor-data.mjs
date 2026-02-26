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

const diff = (a, b) => {
  const onlyA = [...a].filter(x => !b.has(x)).sort();
  const onlyB = [...b].filter(x => !a.has(x)).sort();
  return { onlyA, onlyB };
};

const summarize = (labelA, labelB, d) => {
  console.log(`\n=== ${labelA} vs ${labelB} ===`);
  console.log(`${labelA} only: ${d.onlyA.length}`);
  d.onlyA.slice(0, 200).forEach(x => console.log(`  - ${x}`));
  if (d.onlyA.length > 200) console.log(`  ... +${d.onlyA.length - 200} more`);
  console.log(`${labelB} only: ${d.onlyB.length}`);
  d.onlyB.slice(0, 200).forEach(x => console.log(`  + ${x}`));
  if (d.onlyB.length > 200) console.log(`  ... +${d.onlyB.length - 200} more`);
};

async function main() {
  const pairs = [
    {
      name: 'Medication DB',
      a: 'original/doctor-module/data/medication-database.js',
      b: 'src/doctor-module/data/medication-database.js'
    },
    {
      name: 'Symptom DB',
      a: 'original/doctor-module/data/symptom-database.js',
      b: 'src/doctor-module/data/symptom-database.js'
    }
  ];

  for (const p of pairs) {
    const aText = await read(p.a);
    const bText = await read(p.b);
    const aIds = extractIds(aText);
    const bIds = extractIds(bText);
    const d = diff(aIds, bIds);
    console.log(`\n## ${p.name}`);
    console.log(`old count: ${aIds.size}, current count: ${bIds.size}`);
    summarize('old', 'current', d);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

