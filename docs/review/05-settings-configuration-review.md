# ⚙️ Settings & Configuration Flow - Review Guide

## 📋 Review Checklist

### 1. SETTINGS MAIN SCREEN (`app/(tabs)/settings.tsx`)

#### Settings Categories
- [ ] **Notification Settings**
  ```
  Configuration Options:
  ✓ Daily reminder toggle
  ✓ Reminder time picker (HH:MM)
  ✓ Reminder days selector
  ✓ Sound selection
  ✓ Vibration toggle
  ✓ Smart notifications (AI-based)
  ✓ Quiet hours setting
  ```

- [ ] **Privacy & Security**
  ```
  Security Features:
  ✓ Biometric lock (Face/Touch ID)
  ✓ PIN code option
  ✓ Auto-lock timer
  ✓ Screenshot blocking
  ✓ Data encryption status
  ✓ Privacy mode toggle
  ```

- [ ] **Appearance Settings**
  ```
  Customization Options:
  ✓ Theme (Light/Dark/Auto)
  ✓ Language (TR/EN)
  ✓ Accent color picker
  ✓ Font size adjustment
  ✓ Animation preferences
  ✓ Chart style selection
  ✓ Date format
  ```

- [ ] **Data Management**
  ```
  Data Options:
  ✓ Export data (CSV/JSON)
  ✓ Import data
  ✓ Clear cache
  ✓ Delete all data
  ✓ Backup settings
  ✓ Restore settings
  ✓ Sync preferences
  ```

### 2. NOTIFICATION SCHEDULER (`services/notificationScheduler.ts`)

#### Scheduling Logic
- [ ] **Time Calculation**
  ```typescript
  interface ReminderSchedule {
    enabled: boolean;
    time: string;        // "HH:MM"
    days: number[];      // [1,2,3,4,5] (Mon-Fri)
    timezone: string;    // User's timezone
    nextTrigger?: Date;  // Next scheduled time
  }
  ```

- [ ] **Permission Handling**
  - Initial permission request
  - Permission denied handling
  - Settings redirect option
  - Permission status check

- [ ] **Notification Content**
  ```
  Message Variations:
  ✓ Morning: "Günaydın! Bugün nasıl hissediyorsun?"
  ✓ Afternoon: "Gününüz nasıl geçiyor?"
  ✓ Evening: "Günün nasıldı?"
  ✓ Custom messages based on pattern
  ✓ Localized content (TR/EN)
  ```

### 3. THEME MANAGEMENT (`contexts/ThemeContext.tsx`)

#### Theme System
- [ ] **Theme Switching**
  ```typescript
  interface ThemeConfig {
    mode: 'light' | 'dark' | 'auto';
    accentColor: string;
    fontSize: 'small' | 'medium' | 'large';
    animations: boolean;
    reducedMotion: boolean;
  }
  ```

- [ ] **Dynamic Theming**
  - Real-time preview
  - System theme detection
  - Scheduled theme change
  - Per-screen overrides

- [ ] **Color System**
  ```
  Color Tokens:
  ✓ Primary colors
  ✓ Secondary colors
  ✓ Semantic colors (success/warning/error)
  ✓ Mood-based colors
  ✓ Accessibility compliant
  ```

### 4. LANGUAGE SETTINGS (`contexts/LanguageContext.tsx`)

#### Localization
- [ ] **Language Support**
  ```
  Supported Languages:
  ✓ Turkish (tr-TR)
  ✓ English (en-US)
  
  Verify:
  - All strings localized
  - RTL support ready
  - Number formatting
  - Date formatting
  - Currency formatting
  ```

- [ ] **Language Switching**
  - Instant UI update
  - Persisted preference
  - API language header
  - Content language sync

### 5. ACCOUNT MANAGEMENT

#### Profile Settings
- [ ] **User Profile**
  ```
  Profile Fields:
  ✓ Display name
  ✓ Email (verified status)
  ✓ Avatar/photo
  ✓ Bio/description
  ✓ Birthday (for insights)
  ✓ Gender (optional)
  ✓ Timezone
  ```

- [ ] **Account Actions**
  - Change password
  - Email verification
  - Two-factor auth
  - Logout functionality
  - Account deletion
  - Account recovery

### 6. DATA EXPORT/IMPORT

#### Export Functionality
- [ ] **Export Formats**
  ```
  Data Export Options:
  ✓ CSV format (Excel compatible)
  ✓ JSON format (structured)
  ✓ PDF report (formatted)
  ✓ Health app format
  ✓ Date range selection
  ✓ Data type filtering
  ```

- [ ] **Export Process**
  - Progress indicator
  - File size warning
  - Share options
  - Save to files
  - Email attachment

## 🧪 Test Scenarios

### Scenario 1: Notification Setup
```
1. Enable daily reminders
2. Set time to 9:00 AM
3. Select Mon-Fri only
4. Save settings
5. Check notification at 9:00 AM
Expected:
- Notification arrives on time
- Only on selected days
- Correct message content
```

### Scenario 2: Theme Change
```
1. Switch to dark mode
2. Change accent color
3. Enable reduced motion
4. Navigate through app
Expected:
- Instant theme update
- All screens affected
- Animations reduced
- Persisted on restart
```

### Scenario 3: Language Switch
```
1. Current language: English
2. Switch to Turkish
3. Check all screens
4. Restart app
Expected:
- All text in Turkish
- Dates formatted correctly
- Settings preserved
- API calls in Turkish
```

### Scenario 4: Data Export
```
1. Select last 30 days
2. Choose CSV format
3. Export data
4. Open in Excel
Expected:
- All entries included
- Proper formatting
- Headers translated
- Special characters handled
```

### Scenario 5: Account Deletion
```
1. Request account deletion
2. Confirm with password
3. Grace period warning
4. Final confirmation
Expected:
- Clear warnings shown
- 30-day grace period
- Data recovery option
- Complete removal after
```

## 📊 Metrics to Track

### Usage Metrics
```yaml
Settings Usage:
- Most changed settings
- Default vs custom ratio
- Theme preference distribution
- Language distribution
- Notification opt-in rate
```

### Performance Metrics
```yaml
Operation Times:
- Settings save: < 100ms
- Theme switch: < 50ms
- Language switch: < 200ms
- Export generation: < 5s
- Import processing: < 10s
```

## 🔍 Code Review Points

### Settings Persistence
```typescript
// ✅ GOOD: Atomic settings update
const updateSettings = async (newSettings: Partial<Settings>) => {
  const current = await getSettings();
  const updated = { ...current, ...newSettings };
  
  // Validate before saving
  if (validateSettings(updated)) {
    await AsyncStorage.setItem('settings', JSON.stringify(updated));
    notifyListeners(updated);
  }
};

// ❌ BAD: Non-atomic updates
const updateSetting = async (key: string, value: any) => {
  // Race condition possible
  const settings = await getSettings();
  settings[key] = value;
  await saveSettings(settings);
};
```

### Permission Handling
```typescript
// ✅ GOOD: Graceful permission handling
const requestNotificationPermission = async () => {
  const { status: existing } = await Notifications.getPermissionsAsync();
  
  if (existing === 'denied') {
    Alert.alert(
      'Notifications Disabled',
      'Please enable in Settings',
      [
        { text: 'Cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
    return false;
  }
  
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }
  
  return true;
};
```

## ⚠️ Critical Security Checks

### Data Protection
- [ ] Sensitive data encrypted
- [ ] Secure credential storage
- [ ] No passwords in logs
- [ ] Export data sanitized
- [ ] Biometric data not stored

### Privacy Compliance
- [ ] GDPR compliance
- [ ] KVKK compliance (Turkey)
- [ ] Data retention policy
- [ ] User consent tracking
- [ ] Audit log maintained

## 🎨 UI/UX Considerations

### Settings Organization
- [ ] Logical grouping
- [ ] Clear labels
- [ ] Helper text where needed
- [ ] Visual separators
- [ ] Search functionality

### Feedback & Confirmation
- [ ] Save confirmation
- [ ] Destructive action warnings
- [ ] Success indicators
- [ ] Error messages
- [ ] Loading states

## 📱 Platform-Specific Settings

### iOS Settings
- [ ] Settings.app integration
- [ ] Siri shortcuts
- [ ] Widget configuration
- [ ] iCloud sync toggle
- [ ] Apple Health permissions

### Android Settings
- [ ] System settings integration
- [ ] Google backup
- [ ] Widget preferences
- [ ] Google Fit permissions
- [ ] Battery optimization

## 🔄 Migration & Compatibility

### Version Migration
```typescript
interface SettingsMigration {
  fromVersion: string;
  toVersion: string;
  migrate: (oldSettings: any) => Settings;
}

// Ensure backward compatibility
const migrateSettings = async () => {
  const stored = await AsyncStorage.getItem('settings');
  const version = stored?.version || '1.0.0';
  
  if (version < CURRENT_VERSION) {
    const migrated = runMigrations(stored, version, CURRENT_VERSION);
    await saveSettings(migrated);
  }
};
```

## ✅ Sign-off Criteria

- [ ] All settings functional
- [ ] Changes persist correctly
- [ ] Permissions handled gracefully
- [ ] Theme switching smooth
- [ ] Language change complete
- [ ] Notifications working
- [ ] Export/import reliable
- [ ] Security measures in place
- [ ] Privacy compliant
- [ ] Performance optimized

---

**Review Owner:** _________________  
**Review Date:** _________________  
**Version:** 1.0.0  
**Status:** [ ] In Progress [ ] Complete [ ] Blocked

---

## 🤖 AI Agent PR Plan & Prompts

### PR Implementation Plan

#### Phase 1: Settings Infrastructure
```yaml
PR-1: Create Settings Store & Persistence
Branch: feat/settings-infrastructure
Files:
  - store/settingsStore.ts
  - services/settingsPersistence.ts
  - types/settings.ts
  - hooks/useSettings.ts
Size: ~600 lines
Priority: P0 - Critical
```

#### Phase 2: Privacy & Security Settings
```yaml
PR-2: Implement Privacy Controls
Branch: feat/privacy-settings
Files:
  - components/settings/PrivacySettings.tsx
  - components/settings/DataManagement.tsx
  - services/dataExportService.ts
  - utils/dataSanitization.ts
Size: ~700 lines
Priority: P0 - Critical
```

#### Phase 3: Notification System
```yaml
PR-3: Add Smart Notification Settings
Branch: feat/notification-settings
Files:
  - components/settings/NotificationSettings.tsx
  - services/notificationScheduler.ts
  - utils/notificationTemplates.ts
  - hooks/useNotifications.ts
Size: ~500 lines
Priority: P1 - High
```

### AI Agent Prompts

#### 🤖 Prompt 1: Settings Store Implementation
```markdown
You are building a comprehensive settings system for a mental health app.

CONTEXT:
- App: MoodMeter - Privacy-first wellness
- Settings: User preferences, privacy, notifications
- Storage: Encrypted local + cloud sync
- Compliance: GDPR, CCPA ready

TASK: Create settings management infrastructure

REQUIREMENTS:
1. Settings Structure:
   ```typescript
   interface AppSettings {
     // General
     theme: 'light' | 'dark' | 'system';
     language: 'en' | 'tr';
     hapticFeedback: boolean;
     
     // Privacy
     analytics: boolean;
     crashReports: boolean;
     dataCollection: 'minimal' | 'full' | 'none';
     biometricLock: boolean;
     
     // Notifications
     enabled: boolean;
     reminderTime: string;
     smartScheduling: boolean;
     streakReminders: boolean;
     
     // Data
     autoBackup: boolean;
     syncEnabled: boolean;
     deleteAfterDays?: number;
     
     // Accessibility
     fontSize: 'small' | 'medium' | 'large';
     highContrast: boolean;
     reduceMotion: boolean;
   }
   ```

2. Persistence Layer:
   - Encrypted storage
   - Migration support
   - Default values
   - Validation

3. State Management:
   - Zustand store
   - Optimistic updates
   - Rollback capability
   - Change listeners

4. Sync Strategy:
   - Local-first
   - Conflict resolution
   - Offline queue
   - Batch updates

DELIVERABLES:
- Settings store with actions
- Persistence service
- Migration utilities
- Type definitions
```

#### 🤖 Prompt 2: Privacy Controls
```markdown
You are implementing privacy settings for sensitive health data.

CONTEXT:
- Mental health data is sensitive
- Users need full control
- GDPR/CCPA compliance required
- Trust is paramount

TASK: Build privacy control interface

REQUIREMENTS:
1. Data Controls:
   ```typescript
   interface PrivacyControls {
     // Visibility
     profileVisibility: 'private' | 'friends' | 'public';
     moodSharingEnabled: boolean;
     anonymousMode: boolean;
     
     // Data Management
     exportFormat: 'json' | 'csv' | 'pdf';
     deleteAccount: () => Promise<void>;
     clearLocalData: () => Promise<void>;
     exportAllData: () => Promise<Blob>;
     
     // Consent
     termsAccepted: Date;
     privacyAccepted: Date;
     marketingConsent: boolean;
     researchConsent: boolean;
   }
   ```

2. UI Components:
   - Toggle switches with descriptions
   - Data export button
   - Delete account flow
   - Download all data

3. Security Features:
   - Confirmation dialogs
   - Password verification
   - 24-hour deletion grace
   - Audit log

4. Export Capabilities:
   - All mood entries
   - Settings backup
   - Media attachments
   - Analytics data

IMPLEMENTATION:
- Clear explanations for each setting
- Immediate effect indicators
- Undo options where possible
- Legal compliance badges
```

#### 🤖 Prompt 3: Smart Notifications
```markdown
You are creating an intelligent notification system for wellness reminders.

CONTEXT:
- Gentle reminders, not nagging
- Smart timing based on habits
- Respect user's schedule
- Motivational messaging

TASK: Implement adaptive notification settings

REQUIREMENTS:
1. Scheduling Options:
   ```typescript
   interface NotificationSchedule {
     // Basic
     enabled: boolean;
     times: string[];  // ["09:00", "21:00"]
     days: number[];   // [1,2,3,4,5] weekdays
     
     // Smart Features
     adaptiveScheduling: boolean;
     quietHours: { start: string; end: string; };
     contextAware: boolean;  // Based on usage
     
     // Message Types
     checkInReminders: boolean;
     streakNotifications: boolean;
     insightAlerts: boolean;
     weeklyReports: boolean;
   }
   ```

2. Message Customization:
   - Tone selection (supportive, neutral, motivating)
   - Language preference
   - Emoji usage
   - Custom messages

3. Smart Features:
   - Learn from dismissals
   - Detect optimal times
   - Respect busy calendar
   - Weather-based suggestions

4. Testing Tools:
   - Send test notification
   - Preview messages
   - Schedule simulator
   - Analytics view

FILES:
- NotificationSettings.tsx
- NotificationPreview.tsx
- smartScheduler.ts
- messageTemplates.ts
```

### PR Review Checklist

```markdown
## Settings Specific Checks

### Data Integrity
- [ ] Settings persist correctly
- [ ] Migration path tested
- [ ] Defaults appropriate
- [ ] Validation comprehensive

### Privacy Compliance
- [ ] GDPR requirements met
- [ ] Data export complete
- [ ] Deletion thorough
- [ ] Consent tracking works

### UX Considerations
- [ ] Changes take effect immediately
- [ ] Confirmations for destructive actions
- [ ] Clear descriptions
- [ ] Grouped logically
```

## 📝 Configuration Notes

_Document any platform-specific issues, edge cases, or configuration complexities:_

---
