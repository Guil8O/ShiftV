#!/bin/bash
cd /mnt/DATA/HYNK/Personal/Personal/MtB/ShiftV_Project

echo "=== #FFFFFF / #fff / white not in var() ==="
grep -nEi '#(fff|ffffff)\b' style.css | grep -v 'var(' | grep -v '^\s*--'

echo ""
echo "=== #888 in style.css not in var() ==="
grep -n '#888' style.css | grep -v 'var(' | grep -v '^\s*--'

echo ""
echo "=== color: white in style.css ==="
grep -n 'color:\s*white' style.css

echo ""  
echo "=== All rgba() in style.css NOT in var() and NOT in variable definitions ==="
grep -nE 'rgba\(' style.css | grep -v 'var(' | grep -v '^\s*--' | grep -v '/\*' | grep -v 'box-shadow' | grep -v 'glass-shadow'

echo ""
echo "=== gradient colors ==="
grep -n 'linear-gradient' style.css | grep -v 'var(' | head -20

echo ""
echo "=== Script.js hardcoded colors ==="
grep -nE '#[0-9a-fA-F]{3,8}|rgba?\(' script.js | head -40

echo ""
echo "=== All JS files with hardcoded colors (count per file) ==="
for f in $(find src/ -name "*.js"); do
    count=$(grep -cE '#[0-9a-fA-F]{3,8}|rgba?\(' "$f" 2>/dev/null)
    if [ "$count" -gt 0 ]; then
        echo "  $f: $count"
    fi
done
