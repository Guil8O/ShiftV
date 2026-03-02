const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, f.name);
    if (f.isDirectory() && f.name[0] !== '.' && f.name !== 'node_modules') {
      results.push(...walk(fp));
    } else if (f.name.endsWith('.js')) {
      results.push(fp);
    }
  }
  return results;
}

const root = process.cwd();
const srcFiles = walk(path.join(root, 'src'));
srcFiles.push(path.join(root, 'script.js'));

const graph = {};

for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);
  const imports = [];

  // Match static imports: import ... from '...' or import '...'
  const lines = content.split('\n');
  let inImport = false;
  let importBuf = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('import ') || inImport) {
      importBuf += ' ' + trimmed;
      if (trimmed.includes("from '") || trimmed.includes('from "') || (trimmed.startsWith("import '") || trimmed.startsWith('import "'))) {
        // Extract the module specifier
        const fromMatch = importBuf.match(/from\s+['"]([^'"]+)['"]/);
        const directMatch = importBuf.match(/import\s+['"]([^'"]+)['"]/);
        const spec = fromMatch ? fromMatch[1] : (directMatch ? directMatch[1] : null);
        if (spec && spec.startsWith('.')) {
          const resolved = path.relative(root, path.resolve(path.dirname(file), spec));
          imports.push(resolved);
        }
        inImport = false;
        importBuf = '';
      } else {
        inImport = true;
      }
    }
  }
  graph[rel] = imports;
}

// DFS cycle detection
const cycles = [];
const WHITE = 0, GRAY = 1, BLACK = 2;
const color = {};
for (const node of Object.keys(graph)) color[node] = WHITE;

function dfs(u, pathStack) {
  color[u] = GRAY;
  pathStack.push(u);
  for (const v of (graph[u] || [])) {
    if (color[v] === GRAY) {
      const idx = pathStack.indexOf(v);
      const cycle = pathStack.slice(idx).concat(v);
      cycles.push(cycle);
    } else if (color[v] === WHITE) {
      dfs(v, pathStack);
    }
    // If color[v] === undefined, v is an external or unresolved dep — skip
  }
  pathStack.pop();
  color[u] = BLACK;
}

for (const node of Object.keys(graph)) {
  if (color[node] === WHITE) dfs(node, []);
}

console.log('=== IMPORT GRAPH (only files with imports) ===\n');
for (const [file, deps] of Object.entries(graph).sort((a, b) => a[0].localeCompare(b[0]))) {
  if (deps.length > 0) {
    console.log(file + ':');
    for (const d of deps) {
      const isInGraph = d in graph;
      console.log('  -> ' + d + (isInGraph ? '' : ' [NOT FOUND IN GRAPH]'));
    }
  }
}

console.log('\n=== CIRCULAR DEPENDENCIES (DFS back-edges) ===\n');
if (cycles.length === 0) {
  console.log('No cycles found via DFS.');
} else {
  for (const cycle of cycles) {
    console.log('CYCLE: ' + cycle.join(' -> '));
  }
}

// Direct mutual imports
console.log('\n=== MUTUAL IMPORTS (A <-> B) ===\n');
const checked = new Set();
let foundMutual = false;
for (const [file, deps] of Object.entries(graph)) {
  for (const dep of deps) {
    const pair = [file, dep].sort().join('|');
    if (checked.has(pair)) continue;
    checked.add(pair);
    if (graph[dep] && graph[dep].includes(file)) {
      console.log(file + ' <-> ' + dep);
      foundMutual = true;
    }
  }
}
if (!foundMutual) console.log('No mutual imports found.');

// Also look for longer cycles that might cause TDZ
console.log('\n=== IMPORT CHAIN ANALYSIS (all nodes reachable from each) ===\n');
// For each file, compute transitive closure and check if it can reach itself
const selfLoops = [];
function canReach(start, target, visited) {
  if (visited.has(start)) return false;
  visited.add(start);
  for (const dep of (graph[start] || [])) {
    if (dep === target) return true;
    if (canReach(dep, target, visited)) return true;
  }
  return false;
}

for (const file of Object.keys(graph)) {
  if (canReach(file, file, new Set())) {
    selfLoops.push(file);
  }
}

if (selfLoops.length > 0) {
  console.log('Files that are part of import cycles:');
  for (const f of selfLoops) console.log('  ' + f);
} else {
  console.log('No files found in import cycles.');
}
