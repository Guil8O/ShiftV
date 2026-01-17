import json

with open('script_translations.json', 'r', encoding='utf-8') as f:
    translations = json.load(f)

with open('additions.json', 'r', encoding='utf-8') as f:
    additions = json.load(f)

for lang in ['ko', 'en', 'ja']:
    if lang in translations and lang in additions:
        translations[lang].update(additions[lang])

with open('script_translations.json', 'w', encoding='utf-8') as f:
    json.dump(translations, f, ensure_ascii=False, indent=2)

print("Updated script_translations.json with additions.")