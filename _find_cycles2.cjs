const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  try {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const fp = path.join(dir, f.name);
      if (f.isDirectory() && f.name[0] !== '.' && f.name !== 'node_modules') {
        results.push(...walk(fp));
      } else if (f.name.endsWith('.js')) {
        results.push(fp);
      }
    }
  } catch(e) {}
  return results;
}

const root = process.cwd();
const srcFiles = walk(path.join(root, 'src'));
srcFiles.push(path.join(root, 'script.js'));

const graph = {};       // static imports
const dynamicGraph = {}; // dynamic imports

for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);
  const staticImports = [];
  const dynamicImports = [];

  // Static imports
  const lines = content.split('\n');
  let inImport = false;
  let importBuf = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('import ') || inImport) {
      importBuf += ' ' + trimmed;
      if (importBuf.includes("from '") || importBuf.includes('from "') ||
          (importBuf.match(/^import\s+['"]/) && !importBuf.includes(' from '))) {
        const fromMatch = importBuf.match(/from\s+['"]([^'"]+)['"]/);
        const directMatch = importBuf.match(/import\s+['"]([^'"]+)['"]/);
        const spec = fromMatch ? fromMatch[1] : (directMatch ? directMatch[1] : null);
        if (spec && spec.startsWith('.')) {
          const resolved = path.relative(root, path.resolve(path.dirname(file), spec));
          staticImports.push(resolved);
        }
        inImport = false;
        importBuf = '';
      } else {
        inImport = true;
      }
    }
  }

  // Dynamic imports: import('./...') or import(`./...`)
  const dynRegex = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
  let m;
  while ((m = dynRegex.exec(content)) !== null) {
    const spec = m[1];
    if (spec.startsWith('.')) {
      const resolved = path.relative(root, path.resolve(path.dirname(file), spec));
      dynamicImports.push(resolved);
    }
  }

  graph[rel] = staticImports;
  dynamicGraph[rel] = dynamicImports;
}

// ─── Cycle detection for static graph ───
function findCycles(g) {
  const cycles = [];
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = {};
  for (const node of Object.keys(g)) color[node] = WHITE;

  function dfs(u, stack) {
    color[u] = GRAY;
    stack.push(u);
    for (const v of (g[u] || [])) {
      if (color[v] === GRAY) {
        const idx = stack.indexOf(v);
        cycles.push(stack.slice(idx).concat(v));
      } else if (color[v] === WHITE) {
        dfs(v, stack);
      }
    }
    stack.pop();
    color[u] = BLACK;
  }

  for (const node of Object.keys(g)) {
    if (color[node] === WHITE) dfs(node, []);
  }
  return cycles;
}

// ─── Combined graph (static + dynamic) ───
const combinedGraph = {};
for (const file of Object.keys(graph)) {
  combinedGraph[file] = [...(graph[file] || []), ...(dynamicGraph[file] || [])];
}

console.log('=== STATIC IMPORT GRAPH ===\n');
for (const [file, deps] of Object.entries(graph).sort((a, b) => a[0].localeCompare(b[0]))) {
  if (deps.length > 0) {
    console.log(file + ':');
    for (const d of deps) console.log('  -> ' + d);
  }
}

console.log('\n=== DYNAMIC IMPORT GRAPH ===\n');
for (const [file, deps] of Object.entries(dynamicGraph).sort((a, b) => a[0].localeCompare(b[0]))) {
  if (deps.length > 0) {
    console.log(file + ':');
    for (const d of deps) console.log('  ~> ' + d);
  }
}

console.log('\n=== STATIC IMPORT CYCLES ===\n');
const staticCycles = findCycles(graph);
if (staticCycles.length === 0) {
  console.log('None found.');
} else {
  for (const c of staticCycles) console.log('CYCLE: ' + c.join(' -> '));
}

console.log('\n=== COMBINED (static + dynamic) IMPORT CYCLES ===\n');
const combinedCycles = findCycles(combinedGraph);
if (combinedCycles.length === 0) {
  console.log('None found.');
} else {
  for (const c of combinedCycles) console.log('CYCLE: ' + c.join(' -> '));
}

// ─── Check for cross-dependency patterns (A statically imports B, B dynamically imports A) ───
console.log('\n=== CROSS-DEPENDENCY PATTERNS ===\n');
let foundCross = false;
for (const [file, deps] of Object.entries(graph)) {
  for (const dep of deps) {
    // Check if dep dynamically imports file
    if (dynamicGraph[dep] && dynamicGraph[dep].includes(file)) {
      console.log(`CROSS: ${file} --static--> ${dep} --dynamic--> ${file}`);
      foundCross = true;
    }
  }
}
for (const [file, deps] of Object.entries(dynamicGraph)) {
  for (const dep of deps) {
    // Check if dep statically imports file
    if (graph[dep] && graph[dep].includes(file)) {
      console.log(`CROSS: ${file} --dynamic--> ${dep} --static--> ${file}`);
      foundCross = true;
    }
  }
}
if (!foundCross) console.log('None found.');

// ─── Check for TDZ risk within individual files ───
console.log('\n=== POTENTIAL TDZ RISKS (within-file) ===\n');
for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);
  const lines = content.split('\n');

  // Find top-level const/let declarations
  const declarations = [];
  let braceDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Track brace depth (rough approximation)
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
    }
    if (braceDepth <= 0) {
      const match = line.match(/^(export\s+)?(const|let)\s+(\w+)/);
      if (match) {
        declarations.push({ name: match[3], line: i + 1, type: match[2] });
      }
    }
  }

  // Check if any exported declaration is used before its line
  // (This is a simplified check - not comprehensive)
  for (const decl of declarations) {
    // Look for uses of this name in top-level function calls before the declaration
    for (let i = 0; i < decl.line - 1; i++) {
      const line = lines[i];
      if (line.includes(decl.name) && !line.startsWith('//') && !line.startsWith('*')) {
        // Could be a comment, import, or actual usage
        if (!line.match(/import\s/) && !line.match(/^\s*\*/) && !line.match(/^\s*\/\//)) {
          console.log(`${rel}:${i + 1} - references '${decl.name}' before declaration at line ${decl.line}`);
        }
      }
    }
  }
}

// ─── Check if import order could cause issues ───
console.log('\n=== IMPORT ORDER ANALYSIS ===\n');
console.log('Files that import the most modules (high coupling):');
const sortedByImports = Object.entries(graph)
  .map(([file, deps]) => [file, deps.length])
  .sort((a, b) => b[1] - a[1])
  .filter(([_, count]) => count > 3);
for (const [file, count] of sortedByImports) {
  console.log(`  ${file}: ${count} static imports`);
}

// ─── Shared dependency analysis ───
console.log('\n=== SHARED DEPENDENCIES (imported by 3+ files) ===\n');
const importedBy = {};
for (const [file, deps] of Object.entries(graph)) {
  for (const dep of deps) {
    if (!importedBy[dep]) importedBy[dep] = [];
    importedBy[dep].push(file);
  }
}
for (const [dep, importers] of Object.entries(importedBy).sort((a, b) => b[1].length - a[1].length)) {
  if (importers.length >= 3) {
    console.log(`  ${dep} (imported by ${importers.length} files):`);
    for (const imp of importers) console.log(`    <- ${imp}`);
  }
}
