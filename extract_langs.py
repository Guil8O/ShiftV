#!/usr/bin/env python3
import re
import json

with open('script.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find line numbers for each language block
ko_start = None
ko_end = None
en_start = None
en_end = None
ja_start = None
ja_end = None

for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith('ko:') or stripped.startswith("'ko':") or stripped.startswith('"ko":'):
        ko_start = i
    if stripped.startswith('en:') or stripped.startswith("'en':") or stripped.startswith('"en":'):
        en_start = i
    if stripped.startswith('ja:') or stripped.startswith("'ja':") or stripped.startswith('"ja":'):
        ja_start = i

# Determine block ends by finding next language start or end of object
def find_block_end(start_idx):
    brace_count = 0
    i = start_idx
    while i < len(lines):
        line = lines[i]
        brace_count += line.count('{')
        brace_count -= line.count('}')
        if brace_count == 0:
            return i
        i += 1
    return len(lines) - 1

if ko_start is not None:
    ko_end = find_block_end(ko_start)
if en_start is not None:
    en_end = find_block_end(en_start)
if ja_start is not None:
    ja_end = find_block_end(ja_start)

print(f"ko block: {ko_start} to {ko_end}")
print(f"en block: {en_start} to {en_end}")
print(f"ja block: {ja_start} to {ja_end}")

# Extract block lines
ko_lines = lines[ko_start:ko_end+1] if ko_start and ko_end else []
en_lines = lines[en_start:en_end+1] if en_start and en_end else []
ja_lines = lines[ja_start:ja_end+1] if ja_start and ja_end else []

# Parse key-value pairs (simple regex)
def parse_block(block_lines):
    data = {}
    key = None
    value = None
    for line in block_lines:
        # Remove leading/trailing whitespace and commas
        line = line.strip()
        if line.startswith('//') or line == '':
            continue
        # Check for key: value pattern
        # Pattern: key: value, (comma optional)
        # Key may be quoted or unquoted
        match = re.match(r'''['"]?([\w_]+)['"]?\s*:\s*(?:['"](.*?)['"]|([\d\.]+)|([^,'"]+?))(?:\s*,)?$''', line)
        if match:
            key = match.group(1)
            # value could be in group 2 (quoted), group 3 (number), group 4 (other)
            if match.group(2) is not None:
                value = match.group(2)
            elif match.group(3) is not None:
                value = match.group(3)
            elif match.group(4) is not None:
                value = match.group(4).strip()
            else:
                value = ''
            data[key] = value
        else:
            # maybe multi-line value, ignore for simplicity
            pass
    return data

ko_data = parse_block(ko_lines)
en_data = parse_block(en_lines)
ja_data = parse_block(ja_lines)

print(f"ko keys: {len(ko_data)}")
print(f"en keys: {len(en_data)}")
print(f"ja keys: {len(ja_data)}")

# Compare keys
all_keys = set(ko_data.keys()) | set(en_data.keys()) | set(ja_data.keys())
print(f"Total unique keys: {len(all_keys)}")

missing = {}
for lang, data in [('ko', ko_data), ('en', en_data), ('ja', ja_data)]:
    missing[lang] = sorted(all_keys - set(data.keys()))

for lang, keys in missing.items():
    if keys:
        print(f"Missing in {lang}: {len(keys)} keys")
        for key in keys[:30]:
            print(f"  - {key}")
    else:
        print(f"{lang}: no missing keys")

# Save to files
with open('ko.json', 'w', encoding='utf-8') as f:
    json.dump(ko_data, f, indent=2, ensure_ascii=False)
with open('en.json', 'w', encoding='utf-8') as f:
    json.dump(en_data, f, indent=2, ensure_ascii=False)
with open('ja.json', 'w', encoding='utf-8') as f:
    json.dump(ja_data, f, indent=2, ensure_ascii=False)

with open('missing.json', 'w', encoding='utf-8') as f:
    json.dump(missing, f, indent=2, ensure_ascii=False)

print("\nSaved JSON files.")