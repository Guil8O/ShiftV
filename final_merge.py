import json
import re

with open('translations.json', 'r', encoding='utf-8') as f:
    src = json.load(f)
with open('script_translations.json', 'r', encoding='utf-8') as f:
    script = json.load(f)

languages = ['ko', 'en', 'ja']
merged = {}
for lang in languages:
    merged[lang] = {}
    # start with src keys (full set)
    merged[lang].update(src.get(lang, {}))
    # add any extra keys from script that are not in src
    for k, v in script.get(lang, {}).items():
        if k not in merged[lang]:
            merged[lang][k] = v

# Read script.js
with open('script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the languages object
match = re.search(r'const languages\s*=\s*(\{)', content, re.DOTALL)
if not match:
    print('Could not find languages object')
    exit(1)
start_pos = match.start(1)
# Find matching closing brace
brace_count = 0
i = start_pos
while i < len(content):
    if content[i] == '{':
        brace_count += 1
    elif content[i] == '}':
        brace_count -= 1
        if brace_count == 0:
            end_pos = i
            break
    i += 1
else:
    print('Could not find matching brace')
    exit(1)

print(f'Object spans from {start_pos} to {end_pos}')

# Generate JavaScript object with same formatting as original? We'll use JSON.stringify with indentation.
def js_stringify(obj, indent=0):
    if isinstance(obj, dict):
        items = []
        for k, v in obj.items():
            # key quoting
            if re.fullmatch(r'[A-Za-z_$][A-Za-z0-9_$]*', k):
                key_str = k
            else:
                key_str = json.dumps(k)
            val_str = js_stringify(v, indent + 2)
            items.append(' ' * (indent + 2) + f'{key_str}: {val_str}')
        return '{\n' + ',\n'.join(items) + '\n' + ' ' * indent + '}'
    elif isinstance(obj, str):
        # escape newlines and quotes
        return json.dumps(obj, ensure_ascii=False)
    else:
        return json.dumps(obj)

merged_js = js_stringify(merged, 0)
# Remove trailing commas
merged_js = re.sub(r',\n\s*}', '\n}', merged_js)

new_content = content[:start_pos] + merged_js + content[end_pos + 1:]

# Write backup
with open('script.js.backup2', 'w', encoding='utf-8') as f:
    f.write(content)

# Write updated file
with open('script.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Updated script.js with full translations. Backup saved as script.js.backup2.')