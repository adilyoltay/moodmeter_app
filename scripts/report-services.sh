#!/usr/bin/env bash
set -e

echo "🔍 Services Cleanup Analysis Report"
echo "=================================="
echo

# Services dosyalarını listele
echo "📁 Services Files Count:"
find services -name "*.ts" -type f | wc -l | xargs echo "Total:"
echo

# knip'den services ile ilgili unused files
echo "🗑️  Unused Files (knip):"
grep "^services/" reports/knip.txt 2>/dev/null || echo "No unused files found in services/"
echo

# knip'den services ile ilgili unused exports
echo "📤 Unused Exports in Services (knip):"
grep -A 200 "Unused exports" reports/knip.txt | grep "^[[:space:]]*[^[:space:]].*services/" | head -20 || echo "No unused exports found in services/"
echo

# ts-prune'dan services ile ilgili
echo "🔍 ts-prune Results for Services:"
if [ -s reports/ts-prune.txt ]; then
    grep "services/" reports/ts-prune.txt | head -20 || echo "No results from ts-prune for services/"
else
    echo "ts-prune output is empty"
fi
echo

# Her bir servis için referans sayısı (hızlı check)
echo "📊 Quick Reference Check (top 10 potentially unused):"
for file in $(find services -name "*.ts" -type f | head -10); do
    basename_no_ext=$(basename "$file" .ts)
    count=$(rg -c "$basename_no_ext" --glob "**/*.{ts,tsx}" --glob "!$file" . 2>/dev/null || echo 0)
    echo "$file: $count references"
done
echo

echo "📋 Report generated at: $(date)"
echo "Next: Review these candidates and create detailed analysis"
