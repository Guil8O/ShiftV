#!/usr/bin/env python3
"""Replace all <span class="material-symbols-outlined ...">icon_name</span> in index.html with inline SVGs."""

import re, json, sys

# Read icon paths from icon-paths.js
with open('src/ui/icon-paths.js', 'r') as f:
    content = f.read()

# Extract icon name → path data
icon_paths = {}
for m in re.finditer(r"(\w+):\s*'([^']+)'", content):
    icon_paths[m.group(1)] = m.group(2)

print(f"Loaded {len(icon_paths)} icon paths")

# Read index.html
with open('index.html', 'r') as f:
    html = f.read()

# Pattern to match font icon spans
# <span class="material-symbols-outlined[ mi-inline][ mi-sm][ mi-primary][ mi-error]"[ style="..."]>icon_name</span>
pattern = re.compile(
    r'<span\s+class="material-symbols-outlined([^"]*)"'
    r'(\s+style="[^"]*")?'
    r'\s*>'
    r'(\w+)'
    r'</span>'
)

count = 0
def replace_icon(m):
    global count
    extra_classes = m.group(1).strip()
    style = m.group(2) or ''
    icon_name = m.group(3)
    
    if icon_name not in icon_paths:
        print(f"  WARNING: icon '{icon_name}' not found in icon-paths.js, skipping")
        return m.group(0)
    
    # Parse size from classes
    classes = extra_classes.split()
    size = 20
    if 'mi-sm' in classes:
        size = 18
    elif 'mi-xl' in classes:
        size = 32
    elif 'mi-2xl' in classes:
        size = 40
    
    # Build CSS class list
    svg_classes = ['svg-icon']
    for c in classes:
        if c.startswith('mi-'):
            svg_classes.append(c)
    cls_str = ' '.join(svg_classes)
    
    # Handle inline style (e.g. for the photo_camera icon)
    style_attr = ''
    if style:
        style_attr = f' {style.strip()}'
    
    d = icon_paths[icon_name]
    svg = f'<svg class="{cls_str}" viewBox="0 0 24 24" width="{size}" height="{size}" fill="currentColor" aria-hidden="true"{style_attr}><path d="{d}"/></svg>'
    
    count += 1
    print(f"  [{count}] {icon_name} (size={size}, classes={cls_str})")
    return svg

result = pattern.sub(replace_icon, html)

with open('index.html', 'w') as f:
    f.write(result)

print(f"\nReplaced {count} font icon spans with inline SVGs")
