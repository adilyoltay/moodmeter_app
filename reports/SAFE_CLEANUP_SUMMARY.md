# 🧹 Repo Cleanup Analysis Report

## 📊 Summary
- **Total files scanned**: 193
- **Unused files found**: 2
- **Unused dependencies**: 23
- **Unused exports**: 126
- **Duplicate file groups**: 0
- **Estimated cleanup impact**: 10KB files + 23 packages

## 🗑️ Unused Files (2)
- `scripts/audit-unused.mts`
- `features/ai-fallbacks/edgeAIService.ts`

## 📦 Unused Dependencies (23)
- `@expo/config-plugins`
- `@hookform/resolvers`
- `@react-native-clipboard/clipboard`
- `buffer`
- `expo-audio`
- `expo-background-fetch`
- `expo-blur`
- `expo-file-system`
- `expo-image`
- `expo-image-picker`
- `expo-print`
- `expo-sharing`
- `expo-task-manager`
- `expo-video`
- `i18n-js`
- `jwt-decode`
- `react-dom`
- `react-hook-form`
- `react-native-gifted-chat`
- `react-native-modal`
- `react-native-typing-animation`
- `stream-chat`
- `stream-chat-react-native`

## 🔄 Duplicate Files (0 groups)
*No duplicate files found*

## 🚫 Unused Exports (126)
- `contexts/SupabaseAuthContext.tsx:58` - `SupabaseAuthProvider`
- `contexts/NotificationContext.tsx:244` - `useNotifications`
- `contexts/LanguageContext.tsx:158` - `languageUtils`
- `lib/queryClient.ts:30` - `storage`
- `components/navigation/NavigationGuard.tsx:20` - `clearOnboardingCache`
- `components/ErrorBoundary.tsx:22` - `ErrorBoundary`
- `services/performanceMonitor.ts:470` - `performanceMonitor`
- `services/crossDeviceSync.ts:272` - `default`
- `constants/Colors.ts:97` - `Palettes`
- `components/ui/Card.tsx:104` - `default`
- `services/syncMetrics.ts:277` - `syncMetrics`
- `services/crashReporting.ts:219` - `crashReporting`
- `services/asyncStorageHygiene.ts:401` - `asyncStorageHygiene`
- `services/smartNotifications.ts:415` - `smartNotifications`
- `services/heartpy/healthSignals.ts:147` - `healthSignals`
- `services/heartpy/healthSignals.ts:308` - `get7DayMinuteActivityWindow`
- `services/heartpy/index.ts:9` - `runHeartPy`
- `services/heartpy/index.ts:41` - `healthSignals`
- `utils/timezoneUtils.ts:12` - `getUserTimezoneOffset`
- `utils/timezoneUtils.ts:19` - `getUserTimezone`

*... and 106 more*

## 🎯 Referenced Assets (4)
- `assets/icon.png`
- `assets/splash-icon.png`
- `assets/adaptive-icon.png`
- `assets/favicon.png`

## ⚠️ Risk Assessment
- **Low Risk**: Removing unused dependencies (reversible via package.json)
- **Medium Risk**: Removing unused exports (might break external integrations)
- **High Risk**: Removing unused files (thorough testing required)

## 🧪 Recommended Testing After Cleanup
1. `npm run typecheck` - TypeScript compilation
2. `npx expo-doctor` - Expo compatibility
3. `npm run test` - Unit tests
4. `npx expo start --clear` - Development build
5. Manual UI testing - All screens and features

---
*Generated on 2025-09-27T21:23:46.919Z*
