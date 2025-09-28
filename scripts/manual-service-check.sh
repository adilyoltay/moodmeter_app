#!/usr/bin/env bash

echo "🔍 Manual Services Usage Check"
echo "=============================="
echo

# High-priority suspect services based on knip
suspects=(
  "messaging.ts"
  "nativeSpeechToText.ts" 
  "unifiedComplianceService.ts"
  "unifiedConflictResolver.ts"
  "optimizedStorage.ts"
  "performanceMonitor.ts"
  "staticGamification.ts"
  "api.ts"
  "syncMetrics.ts"
  "supabase/thoughtService.ts"
  "supabase/tableClient.ts"
  "supabase/aiPredictionService.ts"
  "supabase/aiService.ts"
  "supabase/voiceService.ts"
  "supabase/compulsionService.ts"
  "supabase/breathService.ts"
  "smartNotifications.ts"
  "speechToTextService.ts"
  "crossDeviceSync.ts"
)

echo "🔍 Checking high-priority suspects..."
echo

for service in "${suspects[@]}"; do
  basename_no_ext=$(basename "$service" .ts)
  service_path="services/$service"
  
  echo "🔎 Checking: $service"
  
  # Direct import check
  direct_imports=$(grep -r "from.*$service_path\|from.*@/services/$basename_no_ext" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v "$service_path" | wc -l)
  
  # Service name usage check
  name_usage=$(grep -r "\b$basename_no_ext\b" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v "$service_path" | grep -v "\.test\." | grep -v "__tests__" | wc -l)
  
  total_refs=$((direct_imports + name_usage))
  
  if [ $total_refs -eq 0 ]; then
    echo "  🔴 UNUSED: 0 references found"
    
    # Show export info
    if [ -f "$service_path" ]; then
      exports=$(grep -E "^export|export default" "$service_path" 2>/dev/null | head -3)
      if [ ! -z "$exports" ]; then
        echo "  📤 Exports:"
        echo "$exports" | sed 's/^/    /'
      fi
    fi
  elif [ $total_refs -lt 3 ]; then
    echo "  🟡 LOW USAGE: $total_refs references"
  else
    echo "  🟢 ACTIVE: $total_refs references"
  fi
  
  echo
done

echo "📋 Manual check completed"
echo "Next: Review RED items for safe removal"
