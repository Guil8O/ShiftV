#!/usr/bin/env python3
"""Audit translation patterns across ShiftV project."""
import re, os, json

BASE = '/mnt/DATA/HYNK/Personal/Personal/MtB/ShiftV_Project'
KOREAN_RE = re.compile(r'[\uac00-\ud7af\u3131-\u3163\u1100-\u11ff]+')

def read(path):
    with open(os.path.join(BASE, path), 'r', encoding='utf-8') as f:
        return f.read()

def read_lines(path):
    with open(os.path.join(BASE, path), 'r', encoding='utf-8') as f:
        return f.readlines()

print("=" * 80)
print("SHIFTV TRANSLATION AUDIT REPORT")
print("=" * 80)

# 1. Count translate() calls in script.js
content = read('script.js')
all_calls = re.findall(r'translate\(', content)
func_defs = re.findall(r'function translate\(', content)
_translate_calls = re.findall(r'_translate\(', content)
translate_count = len(all_calls) - len(func_defs) - len(_translate_calls)
print(f"\n1. translate() calls in script.js: {translate_count}")
print(f"   (also {len(_translate_calls)} _translate() calls)")

# 2. Count this._t() calls in doctor-module
print(f"\n2. this._t() calls in doctor-module files:")
total_t = 0
for root, dirs, files in os.walk(os.path.join(BASE, 'src/doctor-module')):
    for f in sorted(files):
        if f.endswith('.js'):
            path = os.path.join(root, f)
            c = open(path, 'r', encoding='utf-8').read()
            cnt = len(re.findall(r'this\._t\(', c))
            if cnt > 0:
                relpath = os.path.relpath(path, BASE)
                print(f"   {relpath}: {cnt}")
                total_t += cnt
print(f"   TOTAL: {total_t}")

# 3. Count data-lang-key in index.html
content = read('index.html')
lang_keys = re.findall(r'data-lang-key="([^"]+)"', content)
print(f"\n3. data-lang-key attributes in index.html: {len(lang_keys)}")

# 4. Find hardcoded Korean in script.js
print(f"\n4. Hardcoded Korean strings in script.js:")
lines = read_lines('script.js')
korean_in_script = []
in_localize_dict = False
for i, line in enumerate(lines, 1):
    stripped = line.strip()
    # Track if we're inside the localizeActionGuideText dictionary
    if 'localizeActionGuideText' in stripped and '{' in stripped:
        in_localize_dict = True
    if in_localize_dict:
        if stripped == '};' or stripped == '}':
            in_localize_dict = False
        continue
    # Skip comments
    if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
        continue
    # Skip console.log lines
    if 'console.' in stripped:
        continue
    # Check for Korean
    if KOREAN_RE.search(line):
        korean_in_script.append((i, stripped[:150]))

print(f"   Found {len(korean_in_script)} lines with Korean text:")
for lineno, text in korean_in_script:
    print(f"   L{lineno}: {text}")

# 5. Hardcoded Korean in service-worker.js
print(f"\n5. Hardcoded Korean strings in service-worker.js:")
lines = read_lines('service-worker.js')
sw_korean = []
for i, line in enumerate(lines, 1):
    stripped = line.strip()
    if stripped.startswith('//') or stripped.startswith('*'):
        continue
    if KOREAN_RE.search(line):
        sw_korean.append((i, stripped[:150]))
print(f"   Found {len(sw_korean)} lines:")
for lineno, text in sw_korean:
    print(f"   L{lineno}: {text}")

# 6. Hardcoded Korean in doctor-module (outside of this._t() inline dicts)
print(f"\n6. Hardcoded Korean in doctor-module .js files:")
print("   (Note: Korean inside this._t({{ ko: '...', en: '...' }}) is EXPECTED - it's the translation pattern)")
print("   Looking for Korean OUTSIDE of this._t() calls...")
for root, dirs, files in os.walk(os.path.join(BASE, 'src/doctor-module')):
    for f in sorted(files):
        if not f.endswith('.js'):
            continue
        path = os.path.join(root, f)
        relpath = os.path.relpath(path, BASE)
        lines_list = open(path, 'r', encoding='utf-8').readlines()
        non_t_korean = []
        for i, line in enumerate(lines_list, 1):
            stripped = line.strip()
            if stripped.startswith('//') or stripped.startswith('*'):
                continue
            if 'console.' in stripped:
                continue
            if KOREAN_RE.search(line):
                # Check if it's inside this._t({ ko: '...' }) pattern - these are fine
                if 'this._t(' not in line and '_t(' not in line:
                    non_t_korean.append((i, stripped[:150]))
        if non_t_korean:
            print(f"\n   {relpath}:")
            for lineno, text in non_t_korean:
                print(f"     L{lineno}: {text}")

# 7. Hardcoded Korean in src/ui/ files
print(f"\n7. Hardcoded Korean in src/ui/ files:")
for root, dirs, files in os.walk(os.path.join(BASE, 'src/ui')):
    for f in sorted(files):
        if not f.endswith('.js'):
            continue
        path = os.path.join(root, f)
        relpath = os.path.relpath(path, BASE)
        lines_list = open(path, 'r', encoding='utf-8').readlines()
        ui_korean = []
        for i, line in enumerate(lines_list, 1):
            stripped = line.strip()
            if stripped.startswith('//') or stripped.startswith('*'):
                continue
            if 'console.' in stripped:
                continue
            if KOREAN_RE.search(line):
                ui_korean.append((i, stripped[:200]))
        if ui_korean:
            print(f"\n   {relpath}: ({len(ui_korean)} lines)")
            for lineno, text in ui_korean:
                print(f"     L{lineno}: {text}")

# 8. Count translation keys in ko section of translations.js
print(f"\n8. Translation keys in translations.js:")
content = read('src/translations.js')
# Find the ko section and count keys
# Try to count keys by finding the ko: { ... } block
ko_match = re.search(r'\bko\s*:\s*\{', content)
if ko_match:
    start = ko_match.end()
    depth = 1
    pos = start
    while pos < len(content) and depth > 0:
        if content[pos] == '{':
            depth += 1
        elif content[pos] == '}':
            depth -= 1
        pos += 1
    ko_block = content[start:pos-1]
    # Count top-level keys (lines with key: 'value' or key: "value")
    keys = re.findall(r'^\s*(\w+)\s*:', ko_block, re.MULTILINE)
    print(f"   Keys in 'ko' section: {len(keys)}")
else:
    # Maybe try another pattern
    # Count unique keys referenced by data-lang-key and translate()
    print("   Could not parse ko section directly")

print("\n" + "=" * 80)
print("END OF REPORT")
print("=" * 80)
