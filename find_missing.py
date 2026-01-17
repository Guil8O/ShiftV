#!/usr/bin/env python3
import json
import sys

def load_translations(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def find_missing_keys(translations):
    languages = list(translations.keys())
    all_keys = set()
    for lang, keys in translations.items():
        all_keys.update(keys.keys())
    
    missing = {}
    for lang in languages:
        lang_keys = set(translations[lang].keys())
        missing[lang] = list(all_keys - lang_keys)
    
    return all_keys, missing

def main():
    translations = load_translations('translations.json')
    all_keys, missing = find_missing_keys(translations)
    
    print(f"Total unique keys: {len(all_keys)}")
    for lang, keys in missing.items():
        print(f"\n{lang}: missing {len(keys)} keys")
        if keys:
            print("  " + "\n  ".join(keys))
    
    # Save missing keys to JSON for later use
    with open('missing_keys.json', 'w', encoding='utf-8') as f:
        json.dump(missing, f, ensure_ascii=False, indent=2)
    
    # Also output a mapping of each missing key to a suggested translation from another language
    # Choose source language priority: ko -> en -> ja (if present)
    source_priority = ['ko', 'en', 'ja']
    suggestions = {}
    for lang in missing:
        suggestions[lang] = {}
        for key in missing[lang]:
            # find first source language that has this key
            source = None
            for src in source_priority:
                if src in translations and key in translations[src]:
                    source = src
                    break
            if source:
                suggestions[lang][key] = translations[source][key]
            else:
                suggestions[lang][key] = f"[MISSING: {key}]"
    
    with open('suggested_additions.json', 'w', encoding='utf-8') as f:
        json.dump(suggestions, f, ensure_ascii=False, indent=2)
    
    print("\nSuggested additions saved to suggested_additions.json")

if __name__ == '__main__':
    main()