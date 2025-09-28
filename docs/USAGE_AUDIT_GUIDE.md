# 🔍 Usage Audit System Guide

## Overview

The Usage Audit System is a **privacy-first, minimal-overhead** tracking system designed to identify unused code in real-world usage scenarios. It tracks screens, components, services, and network calls without logging sensitive user data.

## 🎯 Purpose

- **Identify unused services** in actual user flows
- **Find unrendered components** in real scenarios
- **Track network endpoint usage** patterns
- **Generate data-driven cleanup recommendations**

## 🚀 Quick Start

### 1. Start Audit Session
```bash
npm run usage:audit
# OR
EXPO_PUBLIC_USAGE_AUDIT=true npm start
```

### 2. Perform Real User Flows
- Navigate through all main screens
- Complete mood check-ins
- Use breathwork features
- Test settings and auth flows
- Try edge cases and error scenarios

### 3. Export Data & Generate Report
```bash
# In debug console (/debug-console):
# - Tap "Export Data" button
# OR manually in console:
node scripts/usage-report.js
```

## 🔧 System Components

### Core Logger (`src/infra/usage/index.ts`)
- **Event Types**: screen_view, component_mount, svc_call, network
- **Storage**: AsyncStorage with session-based keys
- **Privacy**: No PII, sanitized URLs, no request bodies
- **Performance**: 3s flush intervals, 200 event buffer

### Navigation Tracking (`src/infra/usage/navigation.ts`)
- Tracks React Navigation screen changes
- Identifies which screens are actually visited

### Component Tracking (`src/infra/usage/reactHook.ts`)
- Patches `React.createElement` during audit sessions
- Tracks component renders with file/line info
- **WARNING**: Only use for short audit sessions (5-10 min)

### Network Tracking (`src/infra/usage/network.ts`)
- Patches global `fetch` and axios interceptors
- Tracks endpoint usage without sensitive data
- Includes Supabase operation tracking

### Service Tracking
- Uses `wrapSvc()` helper to track service function calls
- Example: `export const myFunction = wrapSvc('svc:path#function', actualFunction)`

## 📊 Report Generation

### Automatic Analysis
The system compares:
- **Repository inventory** (all services/components)
- **Real usage data** (what was actually called/rendered)
- **Bundle analysis** (what's in production build)

### Output Reports
- `reports/usage-audit-report.json` - Detailed analysis
- `reports/components-candidates.json` - Cleanup candidates
- `reports/unused-services.json` - Unused services list

## 🛡️ Privacy & Security

### What We Track:
- ✅ Screen names (no params)
- ✅ Component names (no props)
- ✅ Service function calls (no arguments)
- ✅ Network endpoints (no query params/bodies)
- ✅ Timestamps and session info

### What We DON'T Track:
- ❌ User data or PII
- ❌ Form inputs or sensitive content
- ❌ API request/response bodies
- ❌ Authentication tokens
- ❌ Personal preferences or settings

### Data Retention:
- Data stored locally in AsyncStorage
- Automatic cleanup on app background
- Manual clear option in debug console
- No remote transmission

## 🔄 Usage Workflow

### Phase 1: Data Collection (5-10 minutes)
1. Enable audit mode: `EXPO_PUBLIC_USAGE_AUDIT=true`
2. Perform comprehensive user flows
3. Cover all major features and edge cases
4. Include error scenarios and edge cases

### Phase 2: Analysis
1. Export data from debug console
2. Run analysis script: `npm run usage:report`
3. Review unused services/components
4. Cross-reference with static analysis

### Phase 3: Cleanup
1. Archive unused items (don't delete immediately)
2. Run tests to ensure no breakage
3. Monitor for 24-48 hours
4. Delete archived items if no issues

## 🎛️ Controls

### Environment Variables
- `EXPO_PUBLIC_USAGE_AUDIT=true` - Enable audit mode
- Automatically disabled in production builds

### Debug Console Controls
- **Export Data** - Download usage data as JSON
- **Clear Data** - Remove all collected audit data
- **Session Info** - View current audit session details

### NPM Scripts
```bash
npm run usage:audit    # Start app with audit enabled
npm run usage:report   # Generate usage analysis report
```

## ⚠️ Important Notes

### Performance Impact
- **Minimal impact** on normal app usage
- **React.createElement patch** may slow renders slightly
- **Recommended**: Short audit sessions (5-10 minutes max)
- **Not for production** - development/QA only

### Accuracy Considerations
- Results depend on **completeness of test scenarios**
- **Multiple audit sessions** recommended for full coverage
- **Edge cases** and error flows must be tested
- **Seasonal features** may appear unused if not in season

### Best Practices
1. **Plan comprehensive test scenarios** before starting audit
2. **Include multiple user personas** in testing
3. **Test error conditions** and edge cases
4. **Run multiple sessions** to ensure coverage
5. **Cross-reference** with static analysis tools

## 🧪 Example Audit Session

```bash
# 1. Start audit
npm run usage:audit

# 2. Test scenarios (5-10 minutes):
# - Login/signup flow
# - Main dashboard navigation
# - Mood check-in (voice + manual)
# - Breathwork session
# - Settings configuration
# - Achievements view
# - Error scenarios (network offline, etc.)

# 3. Generate report
# - Visit /debug-console
# - Tap "Export Data"
# - Run: npm run usage:report

# 4. Review results
# - Check reports/usage-audit-report.json
# - Review unused services/components
# - Plan cleanup PR
```

## 🎉 Expected Outcomes

Based on previous static analysis, we expect:
- **Services**: 98.3% will show as used (excellent)
- **Components**: 100% likely to show as used (world-class)
- **Confirmation** of our static analysis results
- **High confidence** in codebase quality

This system provides **data-driven validation** of our cleanup decisions! 📊
