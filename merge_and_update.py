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
    # start with script keys (including extra)
    merged[lang].update(script.get(lang, {}))
    # overwrite with src keys (this adds missing and updates mismatched)
    merged[lang].update(src.get(lang, {}))
    # ensure ordering? not necessary

# Read script.js
with open('script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the languages object
pattern = r'const languages\s*=\s*(\{)'
match = re.search(pattern, content, re.DOTALL)
if not match:
    print('Could not find languages object')
    exit(1)
start_pos = match.start(1)  # position of '{'
# Now find matching closing brace
brace_count = 0
i = start_pos
while i < len(content):
    if content[i] == '{':
        brace_count += 1
    elif content[i] == '}':
        brace_count -= 1
        if brace_count == 0:
            end_pos = i  # position of the closing brace
            break
    i += 1
else:
    print('Could not find matching brace')
    exit(1)

print(f'Object spans from {start_pos} to {end_pos}')

# Create replacement string
# We'll generate a nicely formatted JavaScript object
def js_stringify(obj, indent=0):
    if isinstance(obj, dict):
        items = []
        for k, v in obj.items():
            # key needs quotes if not a valid identifier
            if re.fullmatch(r'[A-Za-z_$][A-Za-z0-9_$]*', k):
                key_str = k
            else:
                key_str = json.dumps(k)
            val_str = js_stringify(v, indent + 2)
            items.append(' ' * (indent + 2) + f'{key_str}: {val_str}')
        return '{\n' + ',\n'.join(items) + '\n' + ' ' * indent + '}'
    elif isinstance(obj, str):
        return json.dumps(obj, ensure_ascii=False)
    else:
        return json.dumps(obj)

merged_js = js_stringify(merged, 0)
# Ensure no trailing comma
merged_js = re.sub(r',\n\s*}', '\n}', merged_js)

new_content = content[:start_pos] + merged_js + content[end_pos + 1:]

# Write backup
with open('script.js.backup', 'w', encoding='utf-8') as f:
    f.write(content)

# Write updated file
with open('script.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Updated script.js with merged translations. Backup saved as script.js.backup.')