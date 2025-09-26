# 🔍 Error Handling & Edge Cases - Review Guide

## 📋 Review Checklist

### 1. ERROR BOUNDARY (`components/ErrorBoundary.tsx`)

#### Error Catching
- [ ] **Component Error Handling**
  ```typescript
  interface ErrorInfo {
    componentStack: string;
    errorBoundary: boolean;
    errorBoundaryName: string;
    componentName: string;
    fileName: string;
    lineNumber: number;
  }
  ```

- [ ] **Error Recovery**
  ```
  Recovery Actions:
  ✓ Automatic retry (3 attempts)
  ✓ Fallback UI display
  ✓ Safe mode activation
  ✓ Cache clear option
  ✓ Force restart option
  ✓ Report to developer
  ```

- [ ] **Error Logging**
  - Stack trace capture
  - Device info collection
  - User action history
  - Network state
  - Memory usage
  - Battery level

### 2. CRASH REPORTING (`services/crashReporting.ts`)

#### Crash Detection
- [ ] **Crash Types**
  ```
  Monitored Crashes:
  ✓ JavaScript errors
  ✓ Native crashes
  ✓ ANR (App Not Responding)
  ✓ Memory crashes
  ✓ Deadlocks
  ✓ Infinite loops
  ```

- [ ] **Crash Data**
  ```typescript
  interface CrashReport {
    id: string;
    timestamp: Date;
    errorType: string;
    message: string;
    stack: string;
    deviceInfo: DeviceInfo;
    appVersion: string;
    breadcrumbs: Action[];
    customData: Record<string, any>;
  }
  ```

- [ ] **Crash Recovery**
  - Auto-save state
  - Session restoration
  - Data recovery
  - User notification
  - Safe mode boot

### 3. NETWORK ERROR HANDLING

#### Connection Errors
- [ ] **Error Types**
  ```
  Network Errors:
  ✓ Timeout (configurable)
  ✓ Connection refused
  ✓ DNS failure
  ✓ SSL/TLS errors
  ✓ 4xx client errors
  ✓ 5xx server errors
  ✓ Rate limiting (429)
  ```

- [ ] **Retry Logic**
  ```typescript
  class RetryManager {
    async executeWithRetry<T>(
      operation: () => Promise<T>,
      options: {
        maxAttempts: number;
        backoffMs: number;
        maxBackoffMs: number;
        shouldRetry: (error: Error) => boolean;
      }
    ): Promise<T> {
      let lastError: Error;
      
      for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error;
          
          if (!options.shouldRetry(error) || attempt === options.maxAttempts - 1) {
            throw error;
          }
          
          const delay = Math.min(
            options.backoffMs * Math.pow(2, attempt),
            options.maxBackoffMs
          );
          
          await this.delay(delay);
        }
      }
      
      throw lastError;
    }
  }
  ```

### 4. EMPTY STATES

#### No Data Scenarios
- [ ] **Empty State Types**
  ```
  Scenarios:
  ✓ First time user (onboarding)
  ✓ No mood entries (call to action)
  ✓ No achievements (motivation)
  ✓ No internet (offline message)
  ✓ Search no results (suggestions)
  ✓ Filtered view empty (clear filters)
  ```

- [ ] **Empty State UI**
  - Illustration/icon
  - Descriptive message
  - Action button
  - Help link
  - Alternative suggestions

### 5. LOADING STATES

#### Loading Indicators
- [ ] **Loading Types**
  ```
  Loading Patterns:
  ✓ Full screen loader
  ✓ Skeleton screens
  ✓ Progressive loading
  ✓ Lazy loading
  ✓ Optimistic UI
  ✓ Partial loading
  ```

- [ ] **Loading Performance**
  ```typescript
  interface LoadingMetrics {
    perceived: number;      // Time to first paint
    interactive: number;    // Time to interactive
    complete: number;       // Full load time
    timeout: number;        // Max wait time
  }
  ```

### 6. PERMISSION ERRORS

#### Permission Handling
- [ ] **Permission Types**
  ```
  Required Permissions:
  ✓ Notifications
  ✓ Microphone (voice)
  ✓ Camera (avatar)
  ✓ Health data
  ✓ Location (timezone)
  ✓ Biometric
  ```

- [ ] **Denial Handling**
  ```
  User Denies Permission:
  1. Explain why needed
  2. Offer alternative
  3. Continue without feature
  4. Settings redirect option
  5. Remember choice
  ```

### 7. VALIDATION ERRORS

#### Input Validation
- [ ] **Validation Types**
  ```
  Validation Rules:
  ✓ Required fields
  ✓ Format validation (email, phone)
  ✓ Range validation (0-100)
  ✓ Length limits
  ✓ Character restrictions
  ✓ Business rules
  ```

- [ ] **Error Display**
  - Inline error messages
  - Field highlighting
  - Error summary
  - Real-time validation
  - Clear error descriptions

## 🧪 Test Scenarios

### Scenario 1: App Crash Recovery
```
1. Trigger a crash (dev menu)
2. App restarts automatically
3. Check recovered state
4. Verify no data loss
Expected:
- Crash logged
- User notified
- State recovered
- Can continue using app
```

### Scenario 2: Network Timeout
```
1. Start mood sync
2. Simulate slow network (throttle)
3. Wait for timeout (30s)
4. Check retry behavior
Expected:
- Timeout after 30s
- Retry 3 times
- User notification
- Offline mode activated
```

### Scenario 3: Memory Pressure
```
1. Open app
2. Load many mood entries
3. Simulate memory warning
4. Check app behavior
Expected:
- Graceful degradation
- Cache cleared
- No crash
- Core features work
```

### Scenario 4: Corrupt Data
```
1. Manually corrupt local storage
2. Open app
3. Check recovery
Expected:
- Corruption detected
- Backup restored
- User notified
- Clean state achieved
```

## 📊 Error Metrics

### Error Tracking
```yaml
Key Metrics:
- Crash-free rate (target: >99.5%)
- Error frequency by type
- MTTR (Mean Time To Recovery)
- Error impact (users affected)
- Recovery success rate
```

### Performance Under Error
```yaml
Measure:
- Recovery time
- Retry success rate
- Fallback usage
- User abandonment rate
```

## 🔍 Code Review Points

### Defensive Programming
```typescript
// ✅ GOOD: Defensive with fallbacks
function getMoodScore(entry?: MoodEntry): number {
  if (!entry) {
    console.warn('No entry provided, returning default');
    return 50; // Default neutral mood
  }
  
  const score = entry.mood ?? entry.score ?? 50;
  
  // Ensure valid range
  return Math.max(0, Math.min(100, score));
}

// ❌ BAD: Assumes everything works
function getMoodScore(entry) {
  return entry.mood; // Will crash if entry is null
}
```

### Error Context
```typescript
// ✅ GOOD: Rich error context
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public context: Record<string, any>,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
      timestamp: new Date().toISOString()
    };
  }
}

// Usage
throw new AppError(
  'Failed to save mood entry',
  'MOOD_SAVE_ERROR',
  {
    userId: user.id,
    entryData: entry,
    attemptNumber: retryCount
  },
  true // Recoverable
);
```

## ⚠️ Critical Error Scenarios

### Data Loss Prevention
- [ ] Auto-save drafts
- [ ] Transaction rollback
- [ ] Backup before operations
- [ ] Recovery checkpoints
- [ ] Undo functionality

### Security Errors
- [ ] Token expiration
- [ ] Invalid certificates
- [ ] MITM detection
- [ ] Jailbreak/root detection
- [ ] Tampering detection

## 🎯 Edge Cases Matrix

### Time-Related
| Edge Case | Expected Behavior |
|-----------|------------------|
| DST change | Correct time display |
| Timezone change | Entries maintain time |
| Year boundary | Proper date handling |
| Leap year | February 29 works |
| Future dates | Validation prevents |

### Data Limits
| Edge Case | Expected Behavior |
|-----------|------------------|
| 1000+ entries | Pagination works |
| 500MB storage | Warning shown |
| No storage space | Graceful error |
| Huge note (10k chars) | Truncation |
| 100 triggers | UI handles scroll |

### Concurrency
| Edge Case | Expected Behavior |
|-----------|------------------|
| Double tap submit | Single submission |
| Race conditions | Last write wins |
| Parallel syncs | Queue serialization |
| Multiple devices | Conflict resolution |

## 📱 Platform-Specific Errors

### iOS Specific
- [ ] App suspension handling
- [ ] Memory pressure response
- [ ] Background task expiration
- [ ] Keychain errors
- [ ] FaceID failures

### Android Specific
- [ ] Activity destruction
- [ ] Doze mode handling
- [ ] Permission revocation
- [ ] Storage access framework
- [ ] OEM-specific issues

## 🔄 Recovery Strategies

### Graceful Degradation
```
Priority Order:
1. Core functionality (mood entry)
2. Data sync
3. Analytics
4. Gamification
5. Animations
6. Nice-to-haves
```

### Safe Mode
- [ ] Minimal UI
- [ ] Local only
- [ ] No animations
- [ ] Basic features
- [ ] Debug info visible

## ✅ Sign-off Criteria

- [ ] All errors handled gracefully
- [ ] No unhandled promises
- [ ] No silent failures
- [ ] Recovery paths tested
- [ ] Error messages helpful
- [ ] Logging comprehensive
- [ ] Crash rate acceptable
- [ ] Edge cases covered
- [ ] Performance maintained
- [ ] Security preserved

---

**Review Owner:** _________________  
**Review Date:** _________________  
**Version:** 1.0.0  
**Status:** [ ] In Progress [ ] Complete [ ] Blocked

## 📝 Known Issues & Workarounds

_Document any known issues, their impact, and temporary workarounds:_

---
