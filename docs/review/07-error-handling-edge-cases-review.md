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

---

## 🤖 AI Agent PR Plan & Prompts

### PR Implementation Plan

#### Phase 1: Error Boundary System
```yaml
PR-1: Implement Comprehensive Error Boundaries
Branch: feat/error-boundaries
Files:
  - components/ErrorBoundary.tsx
  - components/ErrorFallback.tsx
  - hooks/useErrorHandler.ts
  - utils/errorReporting.ts
Size: ~700 lines
Priority: P0 - Critical
```

#### Phase 2: Error Recovery Mechanisms
```yaml
PR-2: Add Automatic Error Recovery
Branch: feat/error-recovery
Files:
  - services/errorRecovery.ts
  - services/stateRecovery.ts
  - utils/retryStrategies.ts
  - hooks/useAutoRecovery.ts
Size: ~600 lines
Priority: P0 - Critical
```

#### Phase 3: User-Facing Error UX
```yaml
PR-3: Create User-Friendly Error States
Branch: feat/error-ux
Files:
  - components/errors/NetworkError.tsx
  - components/errors/DataError.tsx
  - components/errors/PermissionError.tsx
  - utils/errorMessages.ts
Size: ~500 lines
Priority: P1 - High
```

### AI Agent Prompts

#### 🤖 Prompt 1: Error Boundary Implementation
```markdown
You are implementing robust error handling for a React Native health app.

CONTEXT:
- App: MoodMeter - Mental health tracking
- Critical: User data must not be lost
- UX: Errors should not panic users
- Recovery: Automatic where possible

TASK: Create comprehensive error boundary system

REQUIREMENTS:
1. Error Boundary Hierarchy:
   ```typescript
   interface ErrorBoundaryState {
     hasError: boolean;
     error: Error | null;
     errorInfo: ErrorInfo | null;
     errorCount: number;
     lastErrorTime: Date;
     recovery: {
       attempted: boolean;
       successful: boolean;
       strategy: 'reload' | 'reset' | 'fallback';
     };
   }
   ```

2. Error Categories:
   - Network errors
   - State corruption
   - Permission denied
   - Storage full
   - API failures
   - Render errors

3. Recovery Strategies:
   ```typescript
   interface RecoveryStrategy {
     clearCache(): Promise<void>;
     resetState(): Promise<void>;
     reloadApp(): void;
     fallbackMode(): void;
     reportError(): Promise<void>;
   }
   ```

4. User Communication:
   - Friendly error messages
   - Recovery suggestions
   - Support contact option
   - Error ID for support

5. Monitoring:
   - Error logging
   - Crash reporting
   - Analytics events
   - Performance impact

IMPLEMENTATION:
- Multiple boundary levels
- Screen-level isolation
- Component fallbacks
- Global error handler
```

#### 🤖 Prompt 2: Automatic Recovery
```markdown
You are building self-healing error recovery for a mobile app.

CONTEXT:
- Users shouldn't need to restart app
- Data preservation is critical
- Graceful degradation preferred
- Silent recovery when possible

TASK: Implement automatic error recovery mechanisms

REQUIREMENTS:
1. Recovery Patterns:
   ```typescript
   interface RecoveryPattern {
     errorType: string;
     maxRetries: number;
     backoffStrategy: 'linear' | 'exponential';
     fallbackAction: () => Promise<void>;
     shouldRecover: (error: Error) => boolean;
   }
   ```

2. Retry Logic:
   ```typescript
   class RetryManager {
     async retry<T>(
       fn: () => Promise<T>,
       options: {
         maxAttempts: number;
         delay: number;
         backoff: number;
         onRetry?: (attempt: number) => void;
       }
     ): Promise<T>;
   }
   ```

3. State Recovery:
   - Save state before risky operations
   - Restore on failure
   - Validate restored state
   - Merge partial updates

4. Network Resilience:
   - Queue failed requests
   - Retry with backoff
   - Circuit breaker pattern
   - Offline mode activation

5. Data Integrity:
   - Transaction rollback
   - Checkpoint system
   - Data validation
   - Consistency checks

DELIVERABLES:
- Recovery service
- Retry utilities
- State snapshots
- Circuit breaker
```

#### 🤖 Prompt 3: User-Friendly Error UX
```markdown
You are designing error states for a mental health app.

CONTEXT:
- Users may be anxious/stressed
- Errors shouldn't increase anxiety
- Clear guidance needed
- Maintain user trust

TASK: Create calming, helpful error interfaces

REQUIREMENTS:
1. Error Presentation:
   ```typescript
   interface ErrorDisplay {
     icon: 'warning' | 'info' | 'error';
     title: string;
     message: string;
     suggestion: string;
     actions: ErrorAction[];
     severity: 'low' | 'medium' | 'high';
     tone: 'supportive' | 'neutral';
   }
   ```

2. Visual Design:
   - Soft colors (no harsh reds)
   - Friendly illustrations
   - Clear typography
   - Breathing space
   - Calming animations

3. Message Templates:
   ```typescript
   const errorMessages = {
     network: {
       title: "Connection Issue",
       message: "We're having trouble connecting. Your data is safe.",
       suggestion: "Check your internet and try again",
       actions: ["Retry", "Work Offline"]
     },
     // More templates...
   }
   ```

4. Recovery Actions:
   - Clear CTAs
   - Multiple options
   - Skip/dismiss when safe
   - Help/support link

5. Accessibility:
   - Screen reader friendly
   - High contrast support
   - Large touch targets
   - Clear focus states

FILES:
- ErrorDisplay.tsx
- ErrorIllustrations.tsx
- errorCopy.ts
- RecoveryActions.tsx
```

### PR Review Checklist

```markdown
## Error Handling Specific Checks

### Coverage
- [ ] All error types handled
- [ ] No uncaught exceptions
- [ ] Async errors caught
- [ ] Network failures handled

### Recovery
- [ ] Auto-recovery works
- [ ] Data preserved
- [ ] State consistent
- [ ] No infinite loops

### UX Quality
- [ ] Messages helpful
- [ ] Actions clear
- [ ] Non-alarming design
- [ ] Accessible

### Monitoring
- [ ] Errors logged
- [ ] Metrics tracked
- [ ] Alerts configured
- [ ] Debug info available
```

### Integration Test Scenarios

```typescript
// AI Agent: Include these error scenario tests

describe('Error Recovery', () => {
  test('Network failure during mood save', async () => {
    // 1. Start mood entry
    // 2. Fill data
    // 3. Simulate network failure
    // 4. Verify data cached locally
    // 5. Restore network
    // 6. Verify auto-sync
  });

  test('Storage full handling', async () => {
    // 1. Fill storage to near capacity
    // 2. Attempt new entry
    // 3. Verify cleanup prompt
    // 4. Test data prioritization
    // 5. Verify critical data preserved
  });

  test('Corrupted state recovery', async () => {
    // 1. Corrupt app state
    // 2. Trigger state access
    // 3. Verify error boundary catches
    // 4. Test state reset
    // 5. Verify app recovers
  });

  test('Permission denial graceful handling', async () => {
    // 1. Deny camera permission
    // 2. Attempt HRV measurement
    // 3. Verify fallback UI
    // 4. Test permission request flow
    // 5. Verify feature degradation
  });
});
```

## 📝 Known Issues & Workarounds

_Document any known issues, their impact, and temporary workarounds:_

---
