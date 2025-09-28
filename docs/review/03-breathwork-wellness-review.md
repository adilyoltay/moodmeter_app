# 🧘 Breathwork & Wellness Flow - Review Guide

## 📋 Review Checklist

### 1. BREATHWORK MAIN SCREEN (`app/(tabs)/breathwork.tsx`)

#### Functional Requirements
- [ ] **Protocol Selection**
  ```
  Available Protocols:
  ✓ Box Breathing (4-4-4-4)
  ✓ 4-7-8 Technique
  ✓ Coherent Breathing (5-5)
  ✓ Custom Protocol
  
  Verify:
  - Protocol descriptions
  - Difficulty indicators
  - Duration estimates
  - Benefits explanation
  ```

- [ ] **Session Configuration**
  - Duration selection (1-60 min)
  - Sound on/off toggle
  - Haptic feedback toggle
  - Background music selection
  - Voice guidance toggle

- [ ] **Pre-Session Checks**
  - Health warnings display
  - Contraindications notice
  - Tutorial for first-timers
  - Previous session summary

### 2. BREATHWORK SESSION (`components/breathwork/BreathworkPro.tsx`)

#### Core Functionality
- [ ] **Breathing Phases**
  ```typescript
  interface BreathingPhase {
    inhale: number;    // seconds
    hold1?: number;    // post-inhale hold
    exhale: number;    // seconds
    hold2?: number;    // post-exhale hold
  }
  
  // Test each phase transition:
  ✓ Inhale → Hold → Exhale → Hold → Repeat
  ✓ Visual indicators for each phase
  ✓ Audio cues at transitions
  ✓ Haptic pulses on phase change
  ```

- [ ] **Visual Guidance**
  ```
  Animation Elements:
  ✓ Expanding/contracting circle
  ✓ Progress ring/arc
  ✓ Phase text ("Breathe In", "Hold", etc.)
  ✓ Countdown timer
  ✓ Cycle counter
  ```

- [ ] **Session Controls**
  - Play/Pause functionality
  - Stop with confirmation
  - Skip to next cycle
  - Emergency stop (no confirmation)
  - Background/foreground handling

#### Advanced Features
- [ ] **Adaptive Pacing**
  - Heart rate integration
  - Difficulty adjustment
  - Performance tracking
  - Personalized recommendations

- [ ] **Biometric Monitoring**
  ```
  If Available:
  ✓ Heart rate tracking
  ✓ HRV measurement
  ✓ Respiratory rate
  ✓ Stress level indicator
  ```

### 3. SESSION COMPLETION

#### Post-Session Flow
- [ ] **Summary Screen**
  ```
  Display:
  ✓ Total duration
  ✓ Cycles completed
  ✓ Average breath rate
  ✓ Consistency score
  ✓ Healing points earned
  ✓ Streak update
  ```

- [ ] **Mood Check-In Prompt**
  - Optional mood entry
  - Pre vs post comparison
  - Satisfaction rating
  - Note addition

- [ ] **Data Persistence**
  - Session saved to history
  - Stats updated
  - Achievements checked
  - Sync to cloud

### 4. BREATHWORK HISTORY

#### Historical Data View
- [ ] **Session List**
  - Chronological order
  - Filter by protocol
  - Search by date
  - Stats summary

- [ ] **Progress Tracking**
  ```
  Metrics:
  ✓ Weekly minutes
  ✓ Favorite protocols
  ✓ Consistency streak
  ✓ Total sessions
  ✓ Improvement trends
  ```

## 🧪 Test Scenarios

### Scenario 1: Complete Session
```
1. Select "Box Breathing"
2. Set 5-minute duration
3. Start session
4. Complete all cycles
5. Review summary
Expected:
- Smooth animations
- Accurate timing
- Correct point calculation
```

### Scenario 2: Interruption Handling
```
1. Start 10-minute session
2. After 3 minutes, receive phone call
3. Return to app
4. Continue or restart option
Expected:
- Session paused
- Progress saved
- Resume functionality
```

### Scenario 3: Background Behavior
```
1. Start session
2. Switch to another app
3. Return after 1 minute
4. Check session state
Expected:
- Audio continues (if enabled)
- Haptics stop
- Accurate time tracking
```

### Scenario 4: Custom Protocol
```
1. Create custom protocol (3-5-6-2)
2. Save with name
3. Start session
4. Verify timing accuracy
Expected:
- Custom values respected
- Saved for future use
- Shareable
```

## 📊 Metrics to Track

### Performance Metrics
```yaml
Animation Performance:
- FPS during breathing: > 60
- Phase transition lag: < 50ms
- Audio sync accuracy: < 100ms
- Haptic response time: < 16ms
```

### Accuracy Metrics
```yaml
Timing Accuracy:
- Phase duration deviation: < 100ms
- Total session time accuracy: < 1s
- Cycle count accuracy: 100%
- Point calculation accuracy: 100%
```

### Engagement Metrics
```yaml
User Behavior:
- Session completion rate
- Average session duration
- Protocol preference distribution
- Return rate (daily/weekly)
- Feature adoption (sound/haptic)
```

## 🔍 Code Review Points

### Timer Management
```typescript
// ✅ GOOD: Accurate timing with compensation
class BreathworkTimer {
  private startTime: number;
  private expectedTime: number;
  
  tick() {
    const drift = Date.now() - this.expectedTime;
    const nextTick = Math.max(0, 1000 - drift);
    this.expectedTime += 1000;
    setTimeout(() => this.tick(), nextTick);
  }
}

// ❌ BAD: Accumulated drift
setInterval(() => {
  updateTimer(); // Will drift over time
}, 1000);
```

### Animation Performance
```typescript
// ✅ GOOD: Using native driver
Animated.timing(this.breathAnimation, {
  toValue: 1,
  duration: inhaleTime * 1000,
  useNativeDriver: true, // GPU accelerated
  easing: Easing.inOut(Easing.ease),
}).start();

// ❌ BAD: JS-driven animation
setInterval(() => {
  this.setState({ size: this.state.size + 1 }); // Causes re-renders
}, 16);
```

## ⚠️ Critical Health & Safety

### Medical Disclaimers
- [ ] Clear health warnings
- [ ] Contraindications listed
- [ ] Emergency stop visible
- [ ] Medical advice disclaimer
- [ ] Age restrictions

### Safety Features
```
Required:
✓ Maximum session duration limit
✓ Hyperventilation prevention
✓ Gradual difficulty progression
✓ Break reminders
✓ Emergency contact option
```

## 🎨 Visual & Audio Design

### Visual Requirements
- [ ] Calming color palette
- [ ] Smooth gradients
- [ ] No jarring transitions
- [ ] Dark mode support
- [ ] Reduced motion option

### Audio Design
- [ ] High-quality sounds
- [ ] Volume controls
- [ ] Ambient options
- [ ] Voice gender selection
- [ ] Offline audio assets

## 📱 Device-Specific Testing

### iOS Testing
- [ ] Silent mode behavior
- [ ] Audio session handling
- [ ] Background audio capability
- [ ] Apple Health integration
- [ ] Haptic patterns (Taptic Engine)

### Android Testing
- [ ] Audio focus handling
- [ ] Notification during session
- [ ] Various haptic motors
- [ ] Power saving mode behavior
- [ ] Split-screen support

### Wearable Integration
- [ ] Apple Watch companion
- [ ] Heart rate from watch
- [ ] Wrist tap guidance
- [ ] Standalone watch app

## 🔄 Integration Points

### Health Data
```typescript
// Verify integrations:
interface HealthIntegration {
  heartRate?: number;
  hrv?: number;
  respiratoryRate?: number;
  bloodOxygen?: number;
  stressLevel?: number;
}
```

### Mood System
- [ ] Pre/post mood comparison
- [ ] Automatic mood improvement tracking
- [ ] Correlation analysis
- [ ] Suggestion engine input

### Gamification
- [ ] Points calculation correct
- [ ] Achievements trigger
- [ ] Streak maintenance
- [ ] Leaderboard update
- [ ] Rewards unlocked

## ✅ Sign-off Criteria

- [ ] All protocols working correctly
- [ ] Timing accuracy within specs
- [ ] Smooth animations (60 FPS)
- [ ] Audio/haptic sync perfect
- [ ] Health warnings prominent
- [ ] Session data persisted
- [ ] Offline mode functional
- [ ] Accessibility compliant
- [ ] No memory leaks
- [ ] Battery usage optimized

---

**Review Owner:** _________________  
**Review Date:** _________________  
**Version:** 1.0.0  
**Status:** [ ] In Progress [ ] Complete [ ] Blocked

---

## 🤖 AI Agent PR Plan & Prompts

### PR Implementation Plan

#### Phase 1: Core Breathwork Engine
```yaml
PR-1: Implement Breathwork Engine & Patterns
Branch: feat/breathwork-engine
Files:
  - services/breathwork/BreathworkEngine.ts
  - utils/breathPatterns.ts
  - types/breathwork.ts
  - constants/breathworkPresets.ts
Size: ~600 lines
Priority: P0 - Critical
```

#### Phase 2: Visual Breathwork Component
```yaml
PR-2: Create Animated Breathing Circle
Branch: feat/breathing-circle
Files:
  - components/breathwork/BreathingCircle.tsx
  - components/breathwork/SessionControls.tsx
  - hooks/useBreathworkAnimation.ts
  - utils/breathworkAnimations.ts
Size: ~500 lines
Priority: P0 - Critical
```

#### Phase 3: HRV Integration
```yaml
PR-3: Integrate HRV Measurement with Breathwork
Branch: feat/hrv-integration
Files:
  - services/heartpy/HRVService.ts
  - components/breathwork/HRVMonitor.tsx
  - hooks/useHRVTracking.ts
  - utils/hrvCalculations.ts
Size: ~700 lines
Priority: P1 - High
```

### AI Agent Prompts

#### 🤖 Prompt 1: Breathwork Engine Implementation
```markdown
You are implementing a breathing exercise engine for a wellness app.

CONTEXT:
- App: MoodMeter - Mental health & wellness
- Feature: Guided breathing exercises
- Patterns: Box, 4-7-8, Coherent, Custom
- Integration: HRV tracking, haptic feedback

TASK: Create breathwork engine with pattern management

REQUIREMENTS:
1. Pattern Definition:
   ```typescript
   interface BreathPattern {
     name: string;
     inhale: number;     // seconds
     hold1?: number;     // optional hold after inhale
     exhale: number;     // seconds
     hold2?: number;     // optional hold after exhale
     cycles: number;     // repetitions
     hapticPattern: HapticSequence;
   }
   ```

2. Session Management:
   - Start/pause/resume/stop
   - Progress tracking
   - Time remaining
   - Cycle counter
   - Phase transitions

3. Haptic Feedback:
   - Inhale: light continuous
   - Hold: medium pulse
   - Exhale: light continuous
   - Transition: sharp tick

4. Audio Cues (optional):
   - Voice guidance
   - Ambient sounds
   - Bell on completion
   - Volume control

5. State Machine:
   ```typescript
   enum BreathPhase {
     IDLE, PREPARE, INHALE, HOLD_IN,
     EXHALE, HOLD_OUT, COMPLETE
   }
   ```

DELIVERABLES:
- BreathworkEngine class
- Pattern presets
- Session state management
- Event emitters for UI sync
```

#### 🤖 Prompt 2: Breathing Circle Animation
```markdown
You are creating an animated breathing guide visualization.

CONTEXT:
- Visual guide for breathing exercises
- Smooth, calming animations
- Responsive to breath phases
- Accessibility friendly

TASK: Implement BreathingCircle component with animations

REQUIREMENTS:
1. Visual Design:
   - Expanding/contracting circle
   - Gradient colors (phase-based)
   - Progress ring around circle
   - Phase text overlay
   - Timer display

2. Animations:
   ```typescript
   // Use react-native-reanimated
   const scale = useSharedValue(1);
   const opacity = useSharedValue(1);
   const rotation = useSharedValue(0);
   ```

3. Color Transitions:
   - Inhale: Blue gradient
   - Hold: Purple gradient
   - Exhale: Green gradient
   - Smooth transitions

4. Performance:
   - 60 FPS animations
   - GPU accelerated
   - No layout thrashing
   - Minimal re-renders

IMPLEMENTATION:
- Use Reanimated 3
- Spring animations for smoothness
- Worklets for performance
- Gesture handler for manual control
```

#### 🤖 Prompt 3: HRV Integration
```markdown
You are integrating heart rate variability tracking with breathwork.

CONTEXT:
- HRV indicates stress/relaxation
- Camera-based measurement
- Real-time feedback during breathing
- Privacy-first approach

TASK: Add HRV monitoring to breathwork sessions

REQUIREMENTS:
1. Camera PPG Detection:
   ```typescript
   interface HRVMeasurement {
     rmssd: number;      // HRV metric
     heartRate: number;  // BPM
     quality: number;    // 0-1 signal quality
     timestamp: Date;
   }
   ```

2. Real-time Processing:
   - 30 FPS camera feed
   - Color channel analysis
   - Peak detection
   - Moving average

3. Visual Feedback:
   - Live heart rate display
   - HRV trend graph
   - Signal quality indicator
   - Coherence score

4. Privacy:
   - Local processing only
   - No image storage
   - Clear permissions
   - Opt-in feature

TECHNICAL:
- expo-camera for video
- Frame processing in JS
- FFT for frequency analysis
- Butterworth filtering
```

### PR Review Checklist

```markdown
## Breathwork Specific Checks

### Timing Accuracy
- [ ] Phase durations exact
- [ ] Transitions smooth
- [ ] No timer drift
- [ ] Pause/resume maintains state

### Animation Quality
- [ ] 60 FPS maintained
- [ ] No jank or stutter
- [ ] Smooth color transitions
- [ ] Responsive to interaction

### HRV Accuracy
- [ ] Signal processing correct
- [ ] Noise filtering effective
- [ ] Measurements validated
- [ ] Error handling robust

### Accessibility
- [ ] Works without visuals
- [ ] Haptic alternatives
- [ ] Screen reader friendly
- [ ] Reduced motion support
```

## 📝 Notes

_Space for additional observations, bugs found, or improvement suggestions:_

---
