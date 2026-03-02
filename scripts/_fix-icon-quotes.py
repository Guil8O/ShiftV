"""
Fix: Convert broken '${svgIcon(...)}' patterns to proper svgIcon() + 'text' concatenation.
The _replace-icons.mjs script incorrectly put ${svgIcon()} inside single-quoted strings.
"""
import re, glob

files = [
    'script.js',
    *glob.glob('src/**/*.js', recursive=True),
]

total = 0
for path in files:
    with open(path) as f:
        code = f.read()
    orig = code

    # Pattern 1: '${svgIcon('ICON', 'CLS')} TEXT'  →  svgIcon('ICON', 'CLS') + ' TEXT'
    code = re.sub(
        r"'\$\{svgIcon\('([^']+)',\s*'([^']+)'\)\}(\s*)([^']*)(?<!\s)'",
        lambda m: "svgIcon('{}', '{}') + '{}{}'"
            .format(m.group(1), m.group(2), m.group(3), m.group(4)),
        code
    )

    # Pattern 2: '${svgIcon('ICON')} TEXT'  →  svgIcon('ICON') + ' TEXT'
    code = re.sub(
        r"'\$\{svgIcon\('([^']+)'\)\}(\s*)([^']*)(?<!\s)'",
        lambda m: "svgIcon('{}') + '{}{}'"
            .format(m.group(1), m.group(2), m.group(3)),
        code
    )

    # Pattern 3: '${svgIcon('ICON', 'CLS')}'  (no text after)  →  svgIcon('ICON', 'CLS')
    code = re.sub(
        r"'\$\{svgIcon\('([^']+)',\s*'([^']+)'\)\}'",
        lambda m: "svgIcon('{}', '{}')".format(m.group(1), m.group(2)),
        code
    )

    # Pattern 4: '${svgIcon('ICON')}'  →  svgIcon('ICON')
    code = re.sub(
        r"'\$\{svgIcon\('([^']+)'\)\}'",
        lambda m: "svgIcon('{}')".format(m.group(1)),
        code
    )

    if code != orig:
        changes = sum(1 for a, b in zip(orig.split('\n'), code.split('\n')) if a != b)
        with open(path, 'w') as f:
            f.write(code)
        print(f"  ✓ {path}: ~{changes} lines fixed")
        total += changes

print(f"\nTotal: ~{total} lines fixed")
