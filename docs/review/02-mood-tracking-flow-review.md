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

---

## 🤖 AI Agent PR Plan & Prompts

### PR Implementation Plan

#### Phase 1: Core Dashboard PRs
```yaml
PR-1: Implement Mind Score Card Component
Branch: feat/mind-score-card
Files:
  - components/MindScoreCard.tsx
  - utils/scoreCalculation.ts
  - hooks/useMoodData.ts
  - types/mood.ts
Size: ~800 lines
Priority: P0 - Critical
```

#### Phase 2: VA Pad Input System
```yaml
PR-2: Create VA Pad Mood Input Component
Branch: feat/va-pad-input
Files:
  - components/va/VAPad.tsx
  - utils/colorMapping.ts
  - contexts/AccentColorContext.tsx
  - components/checkin/MoodCheckin.tsx
Size: ~600 lines
Priority: P0 - Critical
```

#### Phase 3: Voice Check-in Feature
```yaml
PR-3: Implement Voice-Based Mood Entry
Branch: feat/voice-checkin
Files:
  - components/checkin/VoiceCheckin.tsx
  - services/speechToTextService.ts
  - services/ai/emotionExtraction.ts
  - hooks/useAudioRecording.ts
Size: ~700 lines
Priority: P1 - High
```

#### Phase 4: Mood Journey Timeline
```yaml
PR-4: Create Mood Journey Timeline Component
Branch: feat/mood-journey
Files:
  - components/today/MoodJourneyCard.tsx
  - components/mood/MoodEntryCard.tsx
  - utils/timelineHelpers.ts
  - hooks/useMoodHistory.ts
Size: ~500 lines
Priority: P1 - High
```

### AI Agent Prompts

#### 🤖 Prompt 1: Mind Score Card Implementation
```markdown
You are building a mental wellness dashboard component for a React Native app.

CONTEXT:
- App: MoodMeter - Mental health tracking
- Component: MindScoreCard - Main dashboard metric display
- Data: 7-day mood history with score calculation
- Design: Apple Health inspired, calming colors

TASK: Implement MindScoreCard component with real-time data

REQUIREMENTS:
1. Score Calculation:
   ```typescript
   interface MoodMetrics {
     currentScore: number;      // 0-100 current mood
     weeklyAverage: number;     // 7-day average
     delta: number;             // Change from yesterday
     stability: 'stable' | 'variable' | 'highly-variable';
     trend: 'improving' | 'declining' | 'stable';
   }
   ```

2. Visual Elements:
   - Animated score display (large, centered)
   - Sparkline chart (7-day trend)
   - Delta indicator with arrow
   - Stability badge
   - Streak counter
   - Energy level indicator

3. Data Integration:
   - Real-time updates from Zustand store
   - Offline-first with AsyncStorage
   - Optimistic updates
   - Error states handling

4. Animations:
   - Score change animation (spring)
   - Sparkline draw animation
   - Haptic on interactions
   - 60 FPS performance

5. Accessibility:
   - VoiceOver announcements
   - Dynamic type support
   - High contrast mode
   - Reduced motion support

EXISTING PATTERNS:
- Use store/gamificationStore.ts for state
- Follow components/ui/Card.tsx for styling
- Use hooks/useThemeColor.ts for theming
- Check utils/scoreCalculation.ts

DELIVERABLES:
- MindScoreCard.tsx with full functionality
- Unit tests for score calculation
- Storybook stories for different states
- Performance optimization (memo, callbacks)
```

#### 🤖 Prompt 2: VA Pad Implementation
```markdown
You are implementing an innovative mood input system using Valence-Arousal model.

CONTEXT:
- Theory: Russell's Circumplex Model of Affect
- Input: 2D grid (X: valence, Y: arousal)
- Output: Mood score (0-100) + Energy level (0-100)
- UX: Inspired by color pickers, smooth interaction

TASK: Create VA Pad component for intuitive mood entry

REQUIREMENTS:
1. Interaction Mechanics:
   ```typescript
   interface VAPoint {
     x: number;        // -1 to 1 (sad to happy)
     y: number;        // -1 to 1 (calm to energetic)
     color: string;    // Calculated gradient color
     mood: number;     // 0-100 converted value
     energy: number;   // 0-100 converted value
   }
   ```

2. Visual Design:
   - 260x180 interactive grid
   - Color gradient background
   - Draggable dot indicator
   - Grid lines (subtle)
   - Emotion labels at corners
   - Real-time color feedback

3. Touch Handling:
   - Pan gesture recognition
   - Boundary constraints
   - Smooth drag (no jumping)
   - Haptic feedback on move
   - Release animation

4. Color Mapping:
   ```typescript
   // Top-right: Yellow (Happy + Energetic)
   // Top-left: Red (Angry + Energetic)
   // Bottom-right: Green (Happy + Calm)
   // Bottom-left: Blue (Sad + Calm)
   ```

5. State Management:
   - Controlled component
   - onChange callback
   - Initial value support
   - Reset capability

IMPLEMENTATION DETAILS:
- Use react-native-gesture-handler for pan
- Use react-native-reanimated for animations
- Use expo-haptics for feedback
- Calculate colors with HSL interpolation

FILES TO CREATE:
- components/va/VAPad.tsx
- components/va/VAGrid.tsx (visual grid)
- utils/vaCalculations.ts
- utils/colorInterpolation.ts

TESTING:
- Test all quadrants
- Test edge cases (corners, boundaries)
- Test gesture responsiveness
- Verify color accuracy
```

#### 🤖 Prompt 3: Voice Check-in Implementation
```markdown
You are adding voice-based mood journaling to a mental health app.

CONTEXT:
- Users want quick, natural mood entry
- Voice reveals emotional state
- Privacy is paramount
- Must work offline

TASK: Implement voice recording and emotion analysis

REQUIREMENTS:
1. Recording Flow:
   ```typescript
   interface VoiceSession {
     audioUri: string;
     duration: number;
     transcript: string;
     emotions: EmotionResult[];
     language: 'tr' | 'en';
     timestamp: Date;
   }
   ```

2. Audio Recording:
   - Start/stop with visual feedback
   - Waveform visualization
   - 3-minute max duration
   - Pause/resume capability
   - Background recording prevention

3. Speech Processing:
   - Speech-to-text (Google/Azure)
   - Language detection
   - Emotion extraction from text
   - Keyword highlighting
   - Sentiment analysis

4. Privacy & Security:
   - Local processing option
   - Audio encrypted before upload
   - Auto-delete after processing
   - No cloud storage of audio
   - Explicit user consent

5. UI Components:
   - Record button with pulse animation
   - Timer display
   - Waveform visualizer
   - Transcript review screen
   - Emotion tags display

TECHNICAL STACK:
- expo-av for recording
- Google Cloud Speech-to-Text
- Local emotion detection fallback
- Encrypted AsyncStorage

ERROR HANDLING:
- Microphone permission denied
- Recording interrupted
- API failures (fallback to local)
- Network issues (queue for later)
- Storage full

FILES:
- components/checkin/VoiceCheckin.tsx
- components/checkin/AudioVisualizer.tsx
- services/audioRecording.ts
- services/speechToText.ts
- services/emotionAnalysis.ts
```

#### 🤖 Prompt 4: Mood Journey Timeline
```markdown
You are creating a timeline view for mood history in a wellness app.

CONTEXT:
- Users track multiple moods daily
- Need to see patterns over time
- Visual storytelling important
- Quick access to past entries

TASK: Build MoodJourneyCard timeline component

REQUIREMENTS:
1. Data Structure:
   ```typescript
   interface MoodEntry {
     id: string;
     timestamp: Date;
     mood: number;
     energy: number;
     emotions: string[];
     triggers: string[];
     note?: string;
     method: 'va_pad' | 'voice' | 'slider';
   }
   ```

2. Timeline Design:
   - Vertical scrolling timeline
   - Grouped by time periods (morning/afternoon/evening)
   - Today at top, older below
   - Infinite scroll with pagination
   - Pull-to-refresh

3. Entry Cards:
   - Mood score badge (colored)
   - Time stamp (relative)
   - Emotion emoji/icon
   - Trigger tags
   - Note preview (expandable)
   - Method indicator icon

4. Interactions:
   - Tap to expand full details
   - Swipe to delete (with confirm)
   - Long press for options menu
   - Edit capability (last 24h only)
   - Share individual entry

5. Visual Features:
   - Smooth scroll animations
   - Fade in on load
   - Color-coded by mood
   - Connecting line between entries
   - Today marker

PERFORMANCE:
- Virtualized list for long histories
- Lazy loading (20 items at a time)
- Image optimization for avatars
- Memoized entry components
- Skeleton loading states

FILES TO CREATE:
- components/today/MoodJourneyCard.tsx
- components/mood/MoodEntryCard.tsx
- components/mood/TimeGroupHeader.tsx
- hooks/useMoodHistory.ts
- utils/timeFormatting.ts
```

### PR Review Checklist for AI Agents

```markdown
## Mood Tracking Specific Checks

### Data Integrity
- [ ] Score calculations accurate
- [ ] Timezone handling correct
- [ ] Duplicate prevention working
- [ ] Offline entries sync properly
- [ ] Data validation comprehensive

### UX Polish
- [ ] Animations smooth (60 FPS)
- [ ] Haptic feedback appropriate
- [ ] Loading states clear
- [ ] Empty states helpful
- [ ] Error messages actionable

### Accessibility
- [ ] VA Pad usable with VoiceOver
- [ ] Color not sole indicator
- [ ] Text alternatives provided
- [ ] Focus management correct
- [ ] Announcements meaningful

### Performance
- [ ] List virtualization working
- [ ] Images lazy loaded
- [ ] Calculations memoized
- [ ] Re-renders minimized
- [ ] Memory usage stable

### Privacy
- [ ] Voice data encrypted
- [ ] Local processing available
- [ ] Data deletion works
- [ ] Consent clearly obtained
- [ ] No PII in logs
```

### Integration Test Scenarios

```typescript
// AI Agent: Include these integration tests

describe('Mood Tracking Flow', () => {
  test('Complete mood entry via VA Pad', async () => {
    // 1. Open mood check-in
    // 2. Interact with VA Pad
    // 3. Add triggers
    // 4. Save entry
    // 5. Verify dashboard updates
    // 6. Check timeline shows entry
  });

  test('Voice entry with emotion detection', async () => {
    // 1. Start voice recording
    // 2. Speak for 30 seconds
    // 3. Stop and process
    // 4. Review transcript
    // 5. Confirm emotions
    // 6. Save and verify
  });

  test('Offline mood entry sync', async () => {
    // 1. Go offline
    // 2. Create mood entry
    // 3. Verify local save
    // 4. Go online
    // 5. Verify sync
    // 6. Check for duplicates
  });

  test('Edit recent mood entry', async () => {
    // 1. Create entry
    // 2. Open in timeline
    // 3. Edit values
    // 4. Save changes
    // 5. Verify updates
    // 6. Check history preserved
  });
});
```
