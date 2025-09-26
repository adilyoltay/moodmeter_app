# 🎯 Core Mood Tracking Flow - Review Guide

## 📋 Review Checklist

### 1. TODAY SCREEN - MAIN DASHBOARD (`app/(tabs)/index.tsx`)

#### Functional Requirements
- [ ] **Mind Score Card Display**
  ```
  Verify:
  ✓ Current score calculation (0-100)
  ✓ 7-day trend visualization
  ✓ Delta/change indicator
  ✓ Stability label (Stabil/Dalgalı/Çok Dalgalı)
  ✓ Streak counter accuracy
  ✓ Energy level indicator
  ```

- [ ] **Data Loading States**
  - Initial load skeleton
  - Pull-to-refresh functionality
  - Error state handling
  - Empty state (no data)
  - Partial data handling

- [ ] **Real-time Updates**
  - New mood entry reflection
  - Score recalculation
  - Animation transitions
  - Cache invalidation

#### UI/UX Requirements
- [ ] **Visual Hierarchy**
  - Primary CTA prominence
  - Information density
  - Color psychology usage
  - Responsive to screen sizes

- [ ] **Animations**
  - Score change animations
  - Card transitions
  - Sparkline rendering
  - Haptic feedback on interactions

### 2. MOOD CHECK-IN FLOW (`components/checkin/`)

#### A. VA PAD INPUT (`components/va/VAPad.tsx`)
- [ ] **Interaction Mechanics**
  ```
  Test Points:
  ✓ Touch tracking accuracy
  ✓ Drag gesture responsiveness
  ✓ Color gradient calculation
  ✓ Coordinate to emotion mapping
  ✓ Visual feedback (dot position)
  ✓ Haptic feedback intensity
  ```

- [ ] **Value Mapping**
  - X-axis: Valence (-1 to 1) → Mood (0-100)
  - Y-axis: Arousal (-1 to 1) → Energy (0-100)
  - Color interpolation accuracy
  - Grid guidelines visibility

- [ ] **State Management**
  ```typescript
  // Verify these state transitions:
  interface VAState {
    valence: number;    // -1 to 1
    arousal: number;    // -1 to 1
    mood: number;       // 0 to 100
    energy: number;     // 0 to 100
    color: string;      // Calculated hex
  }
  ```

#### B. VOICE CHECK-IN (`components/checkin/VoiceCheckin.tsx`)
- [ ] **Recording Flow**
  ```
  Functional Tests:
  ✓ Microphone permission request
  ✓ Recording start/stop
  ✓ Audio level visualization
  ✓ Max duration limit (3 min)
  ✓ Minimum duration (3 sec)
  ✓ Background recording prevention
  ```

- [ ] **Transcription & Analysis**
  - Speech-to-text accuracy
  - Language detection (TR/EN)
  - Emotion extraction
  - Keyword highlighting
  - Error handling for API failures

- [ ] **Data Privacy**
  - Audio file encryption
  - Local processing option
  - Deletion after processing
  - User consent verification

#### C. SLIDER INPUT (`components/mood/MoodSlider.tsx`)
- [ ] **Multi-Slider System**
  ```
  Sliders to Test:
  1. Mood: 0-100 (happiness level)
  2. Energy: 0-100 (energy level)
  3. Anxiety: 0-100 (anxiety level)
  ```

- [ ] **Interaction Design**
  - Thumb size (min 44x44)
  - Track tap to position
  - Visual feedback on drag
  - Value label display
  - Snap points (25, 50, 75)

#### D. ADDITIONAL DATA COLLECTION
- [ ] **Trigger Selection**
  ```
  Categories:
  ✓ İş/Work
  ✓ İlişki/Relationship  
  ✓ Sağlık/Health
  ✓ Uyku/Sleep
  ✓ Sosyal/Social
  ✓ Diğer/Other
  ```

- [ ] **Note Entry**
  - Character limit (500)
  - Emoji support
  - Auto-save draft
  - Privacy indicator

- [ ] **Activity Tracking**
  - Pre-defined activities
  - Custom activity input
  - Multiple selection
  - Icon representation

### 3. MOOD JOURNEY CARD (`components/today/MoodJourneyCard.tsx`)

#### Functional Requirements
- [ ] **Timeline Display**
  - Chronological ordering
  - Time grouping (Morning/Afternoon/Evening)
  - Relative time display
  - Infinite scroll/pagination

- [ ] **Entry Interaction**
  - Tap to expand details
  - Swipe to delete
  - Long press for options
  - Edit capability

- [ ] **Data Visualization**
  ```
  Visual Elements:
  ✓ Mood score badge
  ✓ Energy indicator
  ✓ Emotion emoji/icon
  ✓ Trigger tags
  ✓ Note preview
  ✓ Timestamp
  ```

### 4. BOTTOM CHECK-IN CTA (`components/today/BottomCheckinCTA.tsx`)

#### Functional Requirements
- [ ] **CTA Behavior**
  - Always visible positioning
  - Animation on scroll
  - Loading state during submission
  - Success feedback
  - Error handling

- [ ] **Quick Entry Options**
  - One-tap mood levels
  - Recent mood repeat
  - Voice quick record
  - Smart suggestions

## 🧪 Test Scenarios

### Scenario 1: Complete Mood Entry
```
1. Tap "Mood Check-in" CTA
2. Use VA Pad to select mood (75, 60)
3. Add trigger "İş"
4. Add note "Productive day"
5. Submit entry
Expected: 
- Entry saved < 2 seconds
- Score updates immediately
- Success haptic feedback
```

### Scenario 2: Voice Entry Flow
```
1. Tap voice record button
2. Speak for 30 seconds
3. Review transcription
4. Confirm emotion detection
5. Submit entry
Expected:
- Accurate transcription
- Emotion correctly identified
- Audio deleted after processing
```

### Scenario 3: Offline Entry
```
1. Enable airplane mode
2. Create mood entry
3. Close app
4. Disable airplane mode
5. Open app
Expected:
- Entry saved locally
- Syncs when online
- No data loss
```

### Scenario 4: Bulk Entry Handling
```
1. Create 10 entries rapidly
2. Check score calculation
3. Verify deduplication
4. Review timeline order
Expected:
- All entries processed
- No duplicates
- Correct chronological order
```

## 📊 Metrics to Track

### Performance Metrics
```yaml
Target Values:
- VA Pad response time: < 16ms (60 FPS)
- Score calculation: < 100ms
- Entry submission: < 2s
- Timeline load: < 500ms
- Voice processing: < 5s
```

### Accuracy Metrics
```yaml
Measure:
- Emotion detection accuracy: > 80%
- Transcription accuracy: > 90%
- Score calculation accuracy: 100%
- Sync success rate: > 99%
```

### Usage Metrics
```yaml
Track:
- Preferred input method distribution
- Average entries per day
- Entry completion rate
- Feature adoption rate
```

## 🔍 Code Review Points

### State Management
```typescript
// ✅ GOOD: Optimistic updates
const optimisticUpdate = () => {
  // Update UI immediately
  updateLocalState(newMood);
  // Then sync with backend
  syncMoodEntry(newMood).catch(rollback);
};

// ❌ BAD: Blocking UI for sync
const blockingUpdate = async () => {
  setLoading(true);
  await syncMoodEntry(newMood); // UI freezes
  updateLocalState(newMood);
  setLoading(false);
};
```

### Data Validation
```typescript
// ✅ GOOD: Comprehensive validation
interface MoodEntry {
  mood: number;      // 0-100
  energy: number;    // 0-100
  anxiety?: number;  // 0-100
  triggers: string[];// Max 5
  note?: string;     // Max 500 chars
  timestamp: Date;   // Valid date
}

const validateMoodEntry = (entry: MoodEntry): ValidationResult => {
  const errors = [];
  if (entry.mood < 0 || entry.mood > 100) {
    errors.push('Invalid mood value');
  }
  // ... more validations
  return { valid: errors.length === 0, errors };
};
```

## ⚠️ Critical UX Checks

### Accessibility
- [ ] VoiceOver/TalkBack compatibility
- [ ] Contrast ratios (WCAG 2.1 AA)
- [ ] Touch targets (min 44x44)
- [ ] Focus indicators
- [ ] Motion reduction support

### Error Prevention
- [ ] Confirmation for destructive actions
- [ ] Auto-save for long forms
- [ ] Input constraints
- [ ] Clear error messages
- [ ] Recovery options

### Performance
- [ ] 60 FPS animations
- [ ] No jank on scroll
- [ ] Lazy loading for lists
- [ ] Image optimization
- [ ] Memory leak prevention

## 📱 Platform-Specific Testing

### iOS
- [ ] 3D Touch/Haptic Touch
- [ ] Dynamic Type support
- [ ] Safe area handling
- [ ] iOS 14+ widgets

### Android
- [ ] Back button handling
- [ ] Material Design compliance
- [ ] Various screen densities
- [ ] Android 6+ permissions

## ✅ Sign-off Criteria

- [ ] All input methods functional
- [ ] Data accuracy verified
- [ ] Performance targets met
- [ ] Offline mode works
- [ ] Accessibility compliant
- [ ] No data loss scenarios
- [ ] Analytics implemented
- [ ] Error handling complete

---

**Review Owner:** _________________  
**Review Date:** _________________  
**Version:** 1.0.0  
**Status:** [ ] In Progress [ ] Complete [ ] Blocked
