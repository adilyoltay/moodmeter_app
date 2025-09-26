# 🔄 Data Sync & Offline Flow - Review Guide

## 📋 Review Checklist

### 1. OFFLINE DETECTION (`components/ui/OfflineBanner.tsx`)

#### Network Monitoring
- [ ] **Connection State Detection**
  ```typescript
  interface NetworkState {
    isConnected: boolean;
    isInternetReachable: boolean;
    type: 'wifi' | 'cellular' | 'none';
    details: {
      strength?: number;
      ipAddress?: string;
      subnet?: string;
    };
  }
  ```

- [ ] **State Transitions**
  ```
  Test Scenarios:
  ✓ Online → Offline
  ✓ Offline → Online
  ✓ Weak connection (flaky)
  ✓ Airplane mode
  ✓ WiFi only mode
  ✓ Background → Foreground
  ```

- [ ] **UI Indicators**
  - Offline banner visibility
  - Auto-hide on reconnect
  - Retry action button
  - Connection type icon
  - Sync status indicator

### 2. LOCAL STORAGE (`services/storageService.ts`)

#### Data Persistence
- [ ] **Storage Strategy**
  ```typescript
  interface StorageLayer {
    immediate: AsyncStorage;     // Critical data
    batched: SQLite;            // Structured data
    temporary: MemoryCache;     // Session data
    secure: SecureStore;        // Sensitive data
  }
  ```

- [ ] **Data Types**
  ```
  Stored Locally:
  ✓ Mood entries (encrypted)
  ✓ User profile
  ✓ Settings/preferences
  ✓ Achievement progress
  ✓ Pending sync queue
  ✓ Draft entries
  ✓ Cache data
  ```

- [ ] **Storage Limits**
  - Size monitoring
  - Auto-cleanup old data
  - Compression for large data
  - Storage quota warnings

### 3. SYNC QUEUE MANAGEMENT (`services/sync/`)

#### Queue Operations
- [ ] **Queue Structure**
  ```typescript
  interface SyncQueueItem {
    id: string;
    type: 'mood' | 'breathwork' | 'settings';
    action: 'create' | 'update' | 'delete';
    data: any;
    timestamp: Date;
    retryCount: number;
    priority: number;
    hash: string;
  }
  ```

- [ ] **Queue Processing**
  ```
  Processing Rules:
  ✓ FIFO with priority override
  ✓ Batch operations when possible
  ✓ Retry with exponential backoff
  ✓ Max retry limit (3 attempts)
  ✓ Dead letter queue for failures
  ```

- [ ] **Conflict Resolution**
  ```typescript
  enum ConflictStrategy {
    LOCAL_WINS = 'local',      // User's data wins
    REMOTE_WINS = 'remote',    // Server data wins
    MERGE = 'merge',           // Intelligent merge
    MANUAL = 'manual'          // User chooses
  }
  ```

### 4. DATA SYNCHRONIZATION (`services/offlineSync.ts`)

#### Sync Process
- [ ] **Sync Triggers**
  ```
  Automatic Sync:
  ✓ App launch
  ✓ Network restored
  ✓ Background refresh
  ✓ Pull-to-refresh
  ✓ After local changes
  ✓ Periodic (every 5 min)
  ```

- [ ] **Sync Protocol**
  ```
  Sync Steps:
  1. Check connection
  2. Get local changes
  3. Send to server
  4. Receive server changes
  5. Resolve conflicts
  6. Apply changes
  7. Update sync timestamp
  8. Clear processed queue
  ```

- [ ] **Delta Sync**
  ```typescript
  interface SyncPayload {
    lastSync: Date;
    localChanges: Change[];
    deviceId: string;
    checksum: string;
  }
  
  interface SyncResponse {
    serverChanges: Change[];
    conflicts: Conflict[];
    newSyncToken: string;
  }
  ```

### 5. CONFLICT RESOLUTION (`services/unifiedConflictResolver.ts`)

#### Conflict Types
- [ ] **Detection**
  ```
  Conflict Scenarios:
  ✓ Same record modified on two devices
  ✓ Record deleted on one, modified on other
  ✓ Ordering conflicts (timeline)
  ✓ Schema version mismatch
  ✓ Data corruption
  ```

- [ ] **Resolution Strategies**
  ```typescript
  class ConflictResolver {
    resolveMoodConflict(local: Mood, remote: Mood): Mood {
      // Business logic for mood entries
      if (local.timestamp > remote.timestamp) {
        return local; // Most recent wins
      }
      // Or merge strategy
      return {
        ...remote,
        note: this.mergeNotes(local.note, remote.note),
        triggers: [...new Set([...local.triggers, ...remote.triggers])]
      };
    }
  }
  ```

- [ ] **User Intervention**
  - Conflict notification
  - Side-by-side comparison
  - Manual selection UI
  - Merge helper
  - Undo capability

### 6. CROSS-DEVICE SYNC (`services/crossDeviceSync.ts`)

#### Device Management
- [ ] **Device Registry**
  ```typescript
  interface Device {
    id: string;
    name: string;
    type: 'iOS' | 'Android' | 'Web';
    lastSync: Date;
    syncEnabled: boolean;
    pushToken?: string;
  }
  ```

- [ ] **Sync Coordination**
  - Device priority
  - Push notification trigger
  - Sync lock mechanism
  - Version compatibility

## 🧪 Test Scenarios

### Scenario 1: Offline Entry Creation
```
1. Enable airplane mode
2. Create 3 mood entries
3. Add 1 breathwork session
4. Change settings
5. Disable airplane mode
6. Wait for sync
Expected:
- All data synced
- No duplicates
- Correct timestamps
- Order preserved
```

### Scenario 2: Conflict Resolution
```
1. Device A: Create mood entry
2. Device B: Offline, create similar entry
3. Device A: Modify entry
4. Device B: Come online
5. Observe conflict resolution
Expected:
- Conflict detected
- Resolution applied
- Both devices consistent
- No data loss
```

### Scenario 3: Large Data Sync
```
1. Offline for 7 days
2. Create 50+ entries
3. Come online on slow connection
4. Monitor sync progress
Expected:
- Progressive sync
- Resume on interruption
- No timeout errors
- Progress indicator accurate
```

### Scenario 4: Sync Failure Recovery
```
1. Start sync
2. Kill app mid-sync
3. Restart app
4. Check data integrity
Expected:
- Partial sync recovered
- No corruption
- Queue intact
- Auto-retry works
```

## 📊 Metrics to Track

### Sync Performance
```yaml
Key Metrics:
- Average sync duration
- Data volume per sync
- Sync success rate
- Conflict frequency
- Retry rate
- Queue size average
```

### Offline Usage
```yaml
Behavior Metrics:
- Offline session duration
- Entries created offline
- Feature usage offline
- Sync delay distribution
```

### Error Metrics
```yaml
Error Tracking:
- Sync failure reasons
- Conflict types distribution
- Data corruption instances
- Network timeout frequency
```

## 🔍 Code Review Points

### Idempotency
```typescript
// ✅ GOOD: Idempotent operations
class SyncService {
  async syncMoodEntry(entry: MoodEntry) {
    const idempotencyKey = this.generateKey(entry);
    
    try {
      const result = await api.post('/sync/mood', {
        ...entry,
        idempotencyKey
      });
      
      // Mark as synced only on success
      await this.markSynced(entry.id, result.serverId);
    } catch (error) {
      if (error.code !== 'DUPLICATE_KEY') {
        throw error;
      }
    }
  }
}

// ❌ BAD: Non-idempotent
async syncEntry(entry) {
  // No deduplication check
  await api.post('/entries', entry);
}
```

### Queue Management
```typescript
// ✅ GOOD: Robust queue handling
class SyncQueue {
  private queue: PriorityQueue<SyncItem>;
  private processing = false;
  
  async process() {
    if (this.processing) return;
    this.processing = true;
    
    try {
      while (!this.queue.isEmpty()) {
        const item = this.queue.dequeue();
        try {
          await this.processItem(item);
          await this.removeFromStorage(item.id);
        } catch (error) {
          if (item.retryCount < MAX_RETRIES) {
            item.retryCount++;
            item.nextRetry = this.calculateBackoff(item.retryCount);
            this.queue.enqueue(item);
          } else {
            await this.moveToDeadLetter(item);
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }
}
```

## ⚠️ Critical Data Integrity

### Consistency Checks
- [ ] Checksum validation
- [ ] Transaction atomicity
- [ ] Referential integrity
- [ ] Duplicate prevention
- [ ] Orphaned data cleanup

### Data Safety
- [ ] Backup before sync
- [ ] Rollback capability
- [ ] Audit trail
- [ ] Version tracking
- [ ] Encryption in transit

## 🔒 Security Considerations

### Sync Security
```
Requirements:
✓ TLS 1.3 for transport
✓ Certificate pinning
✓ API key rotation
✓ Device authentication
✓ End-to-end encryption option
```

### Privacy
- [ ] Minimal data transfer
- [ ] Anonymization options
- [ ] Local-only mode
- [ ] Selective sync
- [ ] Data residency compliance

## 📱 Platform-Specific Handling

### iOS Background Sync
- [ ] Background fetch API
- [ ] Silent push notifications
- [ ] Background processing task
- [ ] iCloud sync option

### Android Background Sync
- [ ] WorkManager integration
- [ ] JobScheduler for older versions
- [ ] FCM data messages
- [ ] Doze mode handling

## 🔄 Edge Cases

### Complex Scenarios
- [ ] Clock skew handling
- [ ] Daylight saving transitions
- [ ] Timezone changes
- [ ] Schema migrations mid-sync
- [ ] Partial network failure

## ✅ Sign-off Criteria

- [ ] Offline mode fully functional
- [ ] Sync completes reliably
- [ ] Conflicts resolved correctly
- [ ] No data loss scenarios
- [ ] Performance acceptable
- [ ] Queue processes correctly
- [ ] Security measures implemented
- [ ] Error recovery robust
- [ ] Analytics tracking complete
- [ ] Documentation updated

---

**Review Owner:** _________________  
**Review Date:** _________________  
**Version:** 1.0.0  
**Status:** [ ] In Progress [ ] Complete [ ] Blocked

## 📝 Sync Architecture Notes

_Document any architectural decisions, trade-offs, or known limitations:_

---
