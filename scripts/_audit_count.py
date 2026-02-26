#!/usr/bin/env python3
import re, os, sys
BASE = '/mnt/DATA/HYNK/Personal/Personal/MtB/ShiftV_Project'

# 1. style.css stats
with open(os.path.join(BASE, 'style.css'), encoding='utf-8') as f:
    css = f.read()
print("=== style.css ===")
print("var(-- count:", css.count('var(--'))
print("hardcoded hex:", len(re.findall(r'#[0-9a-fA-F]{3,8}', css)))
# Button variants
for v in ['btn-filled','btn-outlined','btn-text','btn-tonal','btn-elevated','glass-button']:
    print(f"  .{v}:", css.count(f'.{v}'))

# 2. Emoji count in script.js and index.html
emoji_pattern = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "\U00002700-\U000027BF"
    "\U0001F900-\U0001F9FF"
    "\U0001FA00-\U0001FA6F"
    "\U0001FA70-\U0001FAFF"
    "\U00002600-\U000026FF"
    "\U0000FE00-\U0000FE0F"
    "\U0000200D"
    "\U00002702-\U000027B0"
    "\U0000231A-\U0000231B"
    "\U00002934-\U00002935"
    "\U000025AA-\U000025FE"
    "\U00002B05-\U00002B07"
    "\U00002B1B-\U00002B1C"
    "\U00002328"
    "\U000023CF"
    "\U000023E9-\U000023F3"
    "\U000023F8-\U000023FA"
    "✏✨⚠✅❌⬆⬇↑↓"
    "]+", flags=re.UNICODE)

for fname in ['script.js', 'index.html']:
    fpath = os.path.join(BASE, fname)
    if not os.path.exists(fpath):
        print(f"\n{fname}: FILE NOT FOUND")
        continue
    with open(fpath, encoding='utf-8') as f:
        txt = f.read()
    emojis = emoji_pattern.findall(txt)
    total = sum(len(e) for e in emojis)
    print(f"\n=== {fname} emoji count ===")
    print(f"  Total emoji chars: {total}")
    if emojis:
        # Show first 30 unique
        unique = list(dict.fromkeys(c for e in emojis for c in e))[:50]
        print(f"  Unique emojis ({len(unique)}): {''.join(unique)}")

# 3. Material Icons check
with open(os.path.join(BASE, 'index.html'), encoding='utf-8') as f:
    html = f.read()
print("\n=== Google Material Icons ===")
print("Material Symbols loaded:", 'Material+Symbols' in html or 'material-icons' in html or 'Material Symbols' in html)
print("material-symbols-outlined used:", html.count('material-symbols-outlined'))
print("span.material-symbols:", html.count('material-symbols'))

# 4. Tab diary existence
print("\n=== tab-diary HTML ===")
print("tab-diary div:", 'id="tab-diary"' in html or "id='tab-diary'" in html)

# 5. Onboarding templates
for i in range(1, 7):
    print(f"onboarding-step-{i} template:", f'onboarding-step-{i}' in html)
