const fs = require('fs');
const path = require('path');

// Analyze a single file for TDZ risks:
// Find all top-level const/let declarations and check if they're used
// during top-level evaluation before their declaration line.

function analyzeTDZ(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  // Parse: track scope depth (0 = top level)
  let scopeDepth = 0;
  const topLevelDeclarations = []; // { name, line, type }
  const topLevelCalls = [];       // { line, content } - function calls at top level
  const topLevelRefs = [];        // { name, line } - variable references at top level

  // First pass: find all top-level const/let declarations
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

    // Track scope depth (rough approximation - not perfect for template literals etc.)
    // Count braces outside strings
    let inStr = false;
    let strCh = '';
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (inStr) {
        if (ch === strCh && line[j-1] !== '\\') inStr = false;
      } else {
        if (ch === "'" || ch === '"' || ch === '`') { inStr = true; strCh = ch; }
        else if (ch === '{') scopeDepth++;
        else if (ch === '}') scopeDepth--;
      }
    }

    if (scopeDepth <= 0) {
      // Top-level declaration
      const declMatch = trimmed.match(/^(export\s+)?(const|let)\s+(\{[^}]+\}|\[[\s\S]*?\]|(\w+))/);
      if (declMatch) {
        if (declMatch[4]) {
          topLevelDeclarations.push({ name: declMatch[4], line: i + 1, type: declMatch[2] });
        } else if (declMatch[3].startsWith('{')) {
          // Destructuring: extract names
          const names = declMatch[3].match(/\b(\w+)\b/g) || [];
          for (const name of names) {
            if (name !== 'const' && name !== 'let' && name !== 'export') {
              topLevelDeclarations.push({ name, line: i + 1, type: declMatch[2] });
            }
          }
        }
      }

      // Top-level function call (not a function declaration)
      if (trimmed.match(/^\w+\(/) || trimmed.match(/^\w+\.\w+\(/) || trimmed.match(/^await\s/)) {
        topLevelCalls.push({ line: i + 1, content: trimmed.substring(0, 100) });
      }
    }
  }

  // Second pass: for each declaration, check if it's referenced at top-level BEFORE its line
  for (const decl of topLevelDeclarations) {
    // At top level, before decl.line, is decl.name used?
    scopeDepth = 0;
    for (let i = 0; i < decl.line - 1; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Track scope
      let inStr = false;
      let strCh = '';
      for (let j = 0; j < line.length; j++) {
        const ch = line[j];
        if (inStr) {
          if (ch === strCh && line[j-1] !== '\\') inStr = false;
        } else {
          if (ch === "'" || ch === '"' || ch === '`') { inStr = true; strCh = ch; }
          else if (ch === '{') scopeDepth++;
          else if (ch === '}') scopeDepth--;
        }
      }

      if (scopeDepth <= 0) {
        // Check if this line references the variable at top level
        // AND it's a function call or assignment (not just in a function def)
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
        if (trimmed.startsWith('import ')) continue;
        if (trimmed.startsWith('export ')) continue;
        if (trimmed.startsWith('function ')) continue;
        if (trimmed.startsWith('class ')) continue;

        const regex = new RegExp('\\b' + decl.name + '\\b');
        if (regex.test(trimmed)) {
          // This is a potential TDZ issue
          issues.push({
            variable: decl.name,
            declLine: decl.line,
            useLine: i + 1,
            useCode: trimmed.substring(0, 120),
            type: decl.type
          });
        }
      }
    }
  }

  return { topLevelDeclarations, issues, topLevelCalls };
}

// Analyze script.js
const root = process.cwd();
const result = analyzeTDZ(path.join(root, 'script.js'));

console.log('=== TOP-LEVEL DECLARATIONS in script.js ===\n');
for (const d of result.topLevelDeclarations.slice(0, 50)) {
  console.log(`  L${d.line}: ${d.type} ${d.name}`);
}
if (result.topLevelDeclarations.length > 50) {
  console.log(`  ... and ${result.topLevelDeclarations.length - 50} more`);
}

console.log('\n=== TOP-LEVEL FUNCTION CALLS in script.js ===\n');
for (const c of result.topLevelCalls) {
  console.log(`  L${c.line}: ${c.content}`);
}

console.log('\n=== POTENTIAL TDZ ISSUES in script.js ===\n');
if (result.issues.length === 0) {
  console.log('None found.');
} else {
  for (const issue of result.issues) {
    console.log(`  '${issue.variable}' used at L${issue.useLine} before ${issue.type} declaration at L${issue.declLine}`);
    console.log(`    Code: ${issue.useCode}`);
  }
}

// Also analyze all other src files
console.log('\n\n=== ANALYSIS OF ALL SRC FILES ===\n');

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

const allFiles = walk(path.join(root, 'src'));
for (const file of allFiles) {
  const rel = path.relative(root, file);
  const res = analyzeTDZ(file);
  if (res.issues.length > 0) {
    console.log(`${rel}:`);
    for (const issue of res.issues) {
      console.log(`  '${issue.variable}' used at L${issue.useLine} before ${issue.type} declaration at L${issue.declLine}`);
      console.log(`    Code: ${issue.useCode}`);
    }
  }
}
