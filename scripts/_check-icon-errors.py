import re, sys

with open('script.js') as f:
    lines = f.readlines()

problems = []
for i, line in enumerate(lines, 1):
    if 'svgIcon' not in line or line.strip().startswith('import'):
        continue
    # Check if svgIcon appears between regular quotes (not template literal)
    # A problematic pattern: '...${svgIcon(...)}...'
    # The ${} syntax only works in backtick template literals
    if "'${svgIcon" in line or '"${svgIcon' in line:
        problems.append((i, line.rstrip()))

for num, line in problems:
    print(f"L{num}: {line.strip()[:150]}")

if not problems:
    print("No problems found in script.js")

# Also check all other src files
import glob
for path in glob.glob('src/**/*.js', recursive=True):
    with open(path) as f:
        for i, line in enumerate(f.readlines(), 1):
            if 'svgIcon' not in line:
                continue
            if "'${svgIcon" in line or '"${svgIcon' in line:
                print(f"\n{path} L{i}: {line.strip()[:150]}")
