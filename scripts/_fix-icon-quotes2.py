"""
Fix v2: Comprehensive conversion of broken '..${svgIcon()}...' patterns.
Handles:
  - '${svgIcon('ICON', 'CLS')} text'  →  svgIcon('ICON', 'CLS') + ' text'
  - '${svgIcon('ICON')} text'  →  svgIcon('ICON') + ' text'
  - '<html>${svgIcon('ICON', 'CLS')}</html>'  →  `<html>${svgIcon('ICON', 'CLS')}</html>`
"""
import re, glob

files = ['script.js'] + glob.glob('src/**/*.js', recursive=True)
total = 0

for path in files:
    try:
        with open(path) as f:
            code = f.read()
    except:
        continue
    orig = code

    # ── Pattern A: '<html...>${svgIcon('I', 'C')}...</html>' → backtick template literal ──
    # These are HTML wrapper patterns like '<span class="badge">${svgIcon(...)}</span>'
    code = re.sub(
        r"'(<[^$]*?)\$\{svgIcon\('([^']+)',\s*'([^']+)'\)\}([^']*?</\w+>)'",
        r"`\1${svgIcon('\2', '\3')}\4`",
        code
    )
    code = re.sub(
        r"'(<[^$]*?)\$\{svgIcon\('([^']+)'\)\}([^']*?</\w+>)'",
        r"`\1${svgIcon('\2')}\3`",
        code
    )

    # ── Pattern B: '${svgIcon('I', 'C')} text' → svgIcon() + ' text'  ──
    # (text may be empty, followed by ' + ... or just ')
    code = re.sub(
        r"'\$\{svgIcon\('([^']+)',\s*'([^']+)'\)\}\s*'",
        r"svgIcon('\1', '\2') + ''",
        code
    )
    code = re.sub(
        r"'\$\{svgIcon\('([^']+)',\s*'([^']+)'\)\}([^']+)'",
        r"svgIcon('\1', '\2') + '\3'",
        code
    )
    code = re.sub(
        r"'\$\{svgIcon\('([^']+)'\)\}\s*'",
        r"svgIcon('\1') + ''",
        code
    )
    code = re.sub(
        r"'\$\{svgIcon\('([^']+)'\)\}([^']+)'",
        r"svgIcon('\1') + '\2'",
        code
    )

    # ── Clean up: remove redundant + '' at end of concatenations ──
    code = code.replace(" + '')", ")")
    code = code.replace(" + '',", ",")
    code = code.replace(" + '';", ";")

    if code != orig:
        changes = sum(1 for a, b in zip(orig.split('\n'), code.split('\n')) if a != b)
        with open(path, 'w') as f:
            f.write(code)
        print(f"  ✓ {path}: ~{changes} lines fixed")
        total += changes

print(f"\nTotal: ~{total} lines fixed")
