#!/usr/bin/env python3
"""
Extract language objects from script.js and compare keys.
"""
import re
import json
import sys

def extract_js_object(content, start_idx):
    """Extract a JS object from content starting at start_idx, balancing braces."""
    if start_idx >= len(content):
        return None, start_idx
    brace_count = 0
    i = start_idx
    while i < len(content):
        ch = content[i]
        if ch == '{':
            brace_count += 1
        elif ch == '}':
            brace_count -= 1
            if brace_count == 0:
                # end of object
                return content[start_idx:i+1], i+1
        i += 1
    return None, start_idx

def parse_languages_js(content):
    """Parse the languages object from script.js."""
    # Find the start of languages object
    pattern = r'languages\s*=\s*\{'
    match = re.search(pattern, content)
    if not match:
        print("Could not find languages object")
        return {}
    start = match.end() - 1  # position of '{'
    obj_str, end = extract_js_object(content, start)
    if not obj_str:
        print("Could not extract languages object")
        return {}
    # Now we have the whole object string, parse each language
    # We'll use a simple state machine to extract each key-value pair.
    # Since the object is large, we can use regex to find each language block.
    # Pattern: 'ko': { ... } but note there may be whitespace and quotes.
    # We'll find each occurrence of language code followed by colon and object.
    lang_codes = ['ko', 'en', 'ja']
    result = {}
    for code in lang_codes:
        # regex to find code: { ... }
        pattern = rf"['\"]?{code}['\"]?\s*:\s*{{"
        match = re.search(pattern, obj_str)
        if not match:
            continue
        lang_start = match.end() - 1
        lang_obj, _ = extract_js_object(obj_str, lang_start)
        if not lang_obj:
            continue
        # Now parse the inner object as key-value pairs (simple)
        # We'll use regex to capture key: value pairs (including commas)
        # This is a hacky method; we'll assume each line contains a key-value pair.
        # Better to convert the JS object to JSON using string replacements.
        # Let's try to convert single quotes to double quotes and remove trailing commas.
        # First, remove comments? Not needed.
        # Convert single‑quoted keys to double‑quoted.
        import json5  # might not be installed
        try:
            import json5 as json
            lang_data = json.loads(lang_obj)
        except:
            # fallback: manual parsing
            lang_data = parse_simple_js_object(lang_obj)
        result[code] = lang_data
    return result

def parse_simple_js_object(obj_str):
    """Very simple JS object parser that only works with flat key-value strings."""
    # Remove outer braces
    obj_str = obj_str.strip()[1:-1].strip()
    # Split by commas but careful about nested braces
    # We'll use a tokenizer
    result = {}
    key = None
    value = None
    i = 0
    while i < len(obj_str):
        ch = obj_str[i]
        if ch == "'" or ch == '"':
            # string literal
            quote = ch
            j = i + 1
            while j < len(obj_str) and obj_str[j] != quote:
                if obj_str[j] == '\\':
                    j += 1
                j += 1
            literal = obj_str[i:j+1]
            i = j + 1
            if key is None:
                key = literal[1:-1]  # strip quotes
            else:
                value = literal[1:-1]
        elif ch == ':':
            i += 1
            continue
        elif ch == ',':
            if key and value is not None:
                result[key] = value
                key = None
                value = None
            i += 1
        else:
            i += 1
    if key and value is not None:
        result[key] = value
    return result

def load_script_js(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()

def main():
    filepath = 'script.js'
    content = load_script_js(filepath)
    print("File loaded, length:", len(content))
    # Instead of complex parsing, we can use regex to find each language block with balancing braces.
    # Use a more robust approach: find the line numbers for each language.
    # Let's split by lines and look for patterns.
    lines = content.split('\n')
    langs = {'ko': {}, 'en': {}, 'ja': {}}
    current_lang = None
    collecting = False
    block_lines = []
    brace_depth = 0
    for line in lines:
        stripped = line.strip()
        # Detect language start
        if re.match(r"'?ko'?\s*:", stripped):
            current_lang = 'ko'
            collecting = True
            brace_depth = 0
            # find opening brace
            if '{' in line:
                brace_depth += line.count('{')
            block_lines = [line]
        elif re.match(r"'?en'?\s*:", stripped):
            current_lang = 'en'
            collecting = True
            brace_depth = 0
            if '{' in line:
                brace_depth += line.count('{')
            block_lines = [line]
        elif re.match(r"'?ja'?\s*:", stripped):
            current_lang = 'ja'
            collecting = True
            brace_depth = 0
            if '{' in line:
                brace_depth += line.count('{')
            block_lines = [line]
        elif collecting:
            block_lines.append(line)
            brace_depth += line.count('{')
            brace_depth -= line.count('}')
            if brace_depth == 0:
                # end of block
                block = '\n'.join(block_lines)
                # parse block
                # extract inner object
                # find first '{' and last '}'
                start = block.find('{')
                end = block.rfind('}')
                inner = block[start:end+1]
                # parse inner as JS object using json5
                try:
                    import json5
                    data = json5.loads(inner)
                    langs[current_lang] = data
                except Exception as e:
                    print(f"Error parsing {current_lang}: {e}")
                    # fallback to simple parsing
                    # we'll just skip for now
                collecting = False
                current_lang = None
    # If json5 not installed, we'll use a simpler method.
    # Let's just count keys by regex.
    # For each language, find all lines that look like key: value,
    # but this is error-prone.
    # Instead, let's use Node to evaluate the object.
    print("Attempting to parse with Node...")
    # Write a temporary Node script
    node_script = """
    const fs = require('fs');
    const content = fs.readFileSync('script.js', 'utf-8');
    // Extract the languages object by evaluating the script in a sandbox?
    // We'll use a regex to get the whole object and then eval.
    const match = content.match(/languages\\s*=\\s*({[\\s\\S]*?};?)/);
    if (!match) {
        console.error('No match');
        process.exit(1);
    }
    let objStr = match[1];
    // Remove trailing semicolon
    if (objStr.endsWith(';')) objStr = objStr.slice(0, -1);
    // Evaluate in a new Function to avoid pollution
    const func = new Function('return ' + objStr);
    const languages = func();
    console.log(JSON.stringify(languages));
    """
    import subprocess, os
    with open('temp_parse.js', 'w', encoding='utf-8') as f:
        f.write(node_script)
    try:
        result = subprocess.run(['node', 'temp_parse.js'], capture_output=True, text=True, cwd='.')
        if result.returncode == 0:
            languages = json.loads(result.stdout)
            print("Successfully parsed languages object")
            for lang, data in languages.items():
                print(f"{lang}: {len(data)} keys")
                langs[lang] = data
        else:
            print("Node script failed:", result.stderr)
    except Exception as e:
        print(f"Error running Node: {e}")
    finally:
        if os.path.exists('temp_parse.js'):
            os.remove('temp_parse.js')
    
    # Compare keys
    all_keys = set()
    for lang, data in langs.items():
        if data:
            all_keys.update(data.keys())
    
    print(f"Total unique keys: {len(all_keys)}")
    
    missing = {}
    for lang in langs.keys():
        lang_keys = set(langs[lang].keys()) if langs[lang] else set()
        missing[lang] = sorted(all_keys - lang_keys)
    
    for lang, keys in missing.items():
        if keys:
            print(f"Missing in {lang}: {len(keys)} keys")
            for key in keys[:20]:
                print(f"  - {key}")
            if len(keys) > 20:
                print(f"  ... and {len(keys)-20} more")
        else:
            print(f"{lang}: no missing keys")
    
    # Write missing keys to file for translation
    with open('missing_keys.json', 'w', encoding='utf-8') as f:
        json.dump(missing, f, indent=2, ensure_ascii=False)
    
    # Generate translations for missing keys using existing translations from other languages.
    # We'll use Korean as source for English and Japanese, but if missing in Korean, use English.
    source_lang = 'ko'
    translations = {}
    for lang in ['ko', 'en', 'ja']:
        translations[lang] = langs[lang] if langs[lang] else {}
    
    # For each missing key, find a translation from source_lang, if not available, from another language.
    suggestions = {}
    for lang, keys in missing.items():
        if not keys:
            continue
        suggestions[lang] = {}
        for key in keys:
            # try source_lang first
            if key in translations[source_lang]:
                suggestions[lang][key] = translations[source_lang][key]
            else:
                # try any other language
                found = False
                for other_lang in ['en', 'ja', 'ko']:
                    if other_lang == lang:
                        continue
                    if key in translations[other_lang]:
                        suggestions[lang][key] = translations[other_lang][key]
                        found = True
                        break
                if not found:
                    suggestions[lang][key] = ''
    
    with open('suggested_translations.json', 'w', encoding='utf-8') as f:
        json.dump(suggestions, f, indent=2, ensure_ascii=False)
    
    print("\nSuggested translations saved to suggested_translations.json")

if __name__ == '__main__':
    main()