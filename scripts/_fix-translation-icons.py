"""Replace all <span class='material-symbols-outlined ...'>ICON</span> in translations.js with ${svgIcon('ICON', 'classes')}"""
import re

FILE = '/mnt/DATA/HYNK/Personal/Personal/MtB/ShiftV_Project/src/translations.js'

with open(FILE, 'r') as f:
    content = f.read()

# Pattern: <span class='material-symbols-outlined EXTRA_CLASSES'>ICON_NAME</span>
# or:      <span class="material-symbols-outlined EXTRA_CLASSES">ICON_NAME</span>
pattern = re.compile(
    r"""<span\s+class=(['"])material-symbols-outlined(?:\s+([^'"]*?))?\1>(\w+)</span>"""
)

count = 0
lines = content.split('\n')
new_lines = []

for i, line in enumerate(lines):
    if 'material-symbols-outlined' not in line:
        new_lines.append(line)
        continue
    
    matches = list(pattern.finditer(line))
    if not matches:
        new_lines.append(line)
        continue
    
    new_line = line
    for m in reversed(matches):  # reverse to preserve indices
        quote = m.group(1)
        extra_classes = m.group(2) or ''
        icon_name = m.group(3)
        
        # Build svgIcon call
        if extra_classes.strip():
            replacement = f"${{svgIcon('{icon_name}', '{extra_classes.strip()}')}}"
        else:
            replacement = f"${{svgIcon('{icon_name}')}}"
        
        new_line = new_line[:m.start()] + replacement + new_line[m.end():]
        count += 1
    
    # The string containing the replacement must be a template literal (backticks)
    # Check if the line uses regular quotes for the value
    # Pattern: key: "...${svgIcon...}..."  or  key: '...${svgIcon...}...'
    # Need to convert to backtick template literal
    
    if '${svgIcon' in new_line:
        # Find the string value boundaries and convert to backticks
        # Match pattern: something: "..." or something: '...'
        # We need to convert the string delimiters to backticks
        
        # Strategy: find the string that contains ${svgIcon and convert its quotes to backticks
        # Look for: "...${svgIcon..." or '...${svgIcon...'
        def convert_to_template(match_str):
            # Find strings delimited by " or ' that contain ${svgIcon
            result = match_str
            
            # Replace double-quoted strings containing ${svgIcon
            def replace_dq(m):
                inner = m.group(1)
                # Escape any backticks in the inner content
                inner = inner.replace('`', '\\`')
                return '`' + inner + '`'
            
            result = re.sub(r'"([^"]*\$\{svgIcon[^"]*)"', replace_dq, result)
            
            # Replace single-quoted strings containing ${svgIcon  
            def replace_sq(m):
                inner = m.group(1)
                inner = inner.replace('`', '\\`')
                return '`' + inner + '`'
            
            result = re.sub(r"'([^']*\$\{svgIcon[^']*)'", replace_sq, result)
            
            return result
        
        new_line = convert_to_template(new_line)
    
    new_lines.append(new_line)

with open(FILE, 'w') as f:
    f.write('\n'.join(new_lines))

print(f"Replaced {count} font icon spans in translations.js")
