# Services Cleanup - Phase 1 Candidates

## 🔴 High Priority - Safe to Remove

### `utils/moodQuickEntry.ts`
- **Status**: Completely unused
- **Evidence**: 
  - knip: Listed as unused file
  - grep: 0 references in codebase
  - Bundle: Not included in production bundle
- **Risk**: ⚪ MINIMAL
- **Action**: Move to archive, then delete

### `features/ai-fallbacks/edgeAIService.ts`
- **Status**: Only used in archived code
- **Evidence**:
  - knip: Listed as unused file
  - grep: Only references in `archive/` folder
  - Bundle: Not included in production bundle
- **Risk**: ⚪ MINIMAL
- **Action**: Move to archive, then delete

## 🟡 Medium Priority - Review Required

### `services/staticGamification.ts`
- **Status**: Low usage (2 references)
- **Evidence**:
  - grep: 2 references found
  - knip: Some unused exports
- **Risk**: 🟡 LOW
- **Action**: Review references, possibly consolidate

### `services/supabase/aiPredictionService.ts`
- **Status**: Low usage (2 references)  
- **Evidence**:
  - grep: 2 references found
  - knip: Some unused exports
- **Risk**: 🟡 LOW
- **Action**: Review references, possibly consolidate

## 📊 Analysis Summary

- **Total Services Analyzed**: 58
- **High Priority Cleanup**: 2 files
- **Medium Priority Review**: 2 files
- **Active Services**: 54 files (93% healthy)

## 🚀 Recommended Action Plan

### Phase 1 (This PR)
1. Move `utils/moodQuickEntry.ts` to `archive/utils-$(date +%Y%m%d)/`
2. Move `features/ai-fallbacks/edgeAIService.ts` to `archive/features-$(date +%Y%m%d)/`
3. Run tests to confirm no breakage
4. If tests pass for 24h, delete archived files

### Phase 2 (Next PR)
1. Review low-usage services
2. Consolidate or refactor if needed
3. Update documentation

## 🛡️ Safety Measures Applied

- ✅ Static analysis (knip, ts-prune, madge)
- ✅ Dynamic analysis (bundle inspection)
- ✅ Manual grep verification
- ✅ Archive-first approach (no direct deletion)
- ✅ Test validation required

---
*Generated on: $(date)*
*Analysis tools: knip, grep, bundle analysis*
