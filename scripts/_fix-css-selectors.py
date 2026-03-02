"""Add .svg-icon alternate selectors to CSS rules that reference .material-symbols-outlined"""
import re

CSS_FILE = '/mnt/DATA/HYNK/Personal/Personal/MtB/ShiftV_Project/style.css'

with open(CSS_FILE, 'r') as f:
    content = f.read()

# Pattern: any CSS selector containing .material-symbols-outlined
# Replace .material-symbols-outlined with .material-symbols-outlined, PARENT .svg-icon
# where PARENT is whatever precedes .material-symbols-outlined

# Strategy: for each line containing .material-symbols-outlined in a selector context,
# duplicate the selector with .svg-icon
# We'll work on selector groups (comma-separated selectors before {)

count = 0

def add_svg_selector(match):
    """For each selector line containing .material-symbols-outlined, add a .svg-icon variant"""
    global count
    line = match.group(0)
    # Replace .material-symbols-outlined with .svg-icon to create the alternate selector
    svg_variant = line.replace('.material-symbols-outlined', '.svg-icon')
    # Append both: original + svg variant
    # If the line ends with { we need to handle it differently
    if line.rstrip().endswith('{'):
        # This is the last selector line before the rule body
        # Original: ".foo .material-symbols-outlined {"
        # Result: ".foo .material-symbols-outlined,\n.foo .svg-icon {"
        original_selector = line.rstrip().rstrip('{').rstrip()
        svg_selector = svg_variant.rstrip().rstrip('{').rstrip()
        indent = len(line) - len(line.lstrip())
        count += 1
        return f"{original_selector},\n{' ' * indent}{svg_selector} {{"
    elif line.rstrip().endswith(','):
        # This is a middle selector line in a group
        # Original: ".foo .material-symbols-outlined,"
        # Result: ".foo .material-symbols-outlined,\n.foo .svg-icon,"
        original = line.rstrip()
        svg_sel = svg_variant.rstrip()
        indent = len(line) - len(line.lstrip())
        count += 1
        return f"{original}\n{' ' * indent}{svg_sel}"
    else:
        # Just return original (shouldn't happen in valid CSS for this pattern)
        return line

# Match lines containing .material-symbols-outlined (but not inside .svg-icon rules)
content = re.sub(
    r'^.*\.material-symbols-outlined.*$',
    add_svg_selector,
    content,
    flags=re.MULTILINE
)

with open(CSS_FILE, 'w') as f:
    f.write(content)

print(f"Added {count} .svg-icon alternate selectors")
