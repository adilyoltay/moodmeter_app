# 🏆 Gamification & Achievements Flow - Review Guide

## 📋 Review Checklist

### 1. ACHIEVEMENT SYSTEM (`app/achievements.tsx`)

#### Display & Organization
- [ ] **Achievement Categories**
  ```
  Categories to Verify:
  ✓ Mood Tracking (Daily, Weekly, Monthly)
  ✓ Breathwork (Sessions, Duration, Streak)
  ✓ Consistency (Streaks, Regular Use)
  ✓ Wellness (Improvement, Stability)
  ✓ Social (Sharing, Community)
  ✓ Special (Milestones, Seasonal)
  ```

- [ ] **Achievement States**
  - Locked (grayed out, requirements shown)
  - In Progress (progress bar, percentage)
  - Unlocked (celebration animation)
  - Claimed (rewards collected)
  - Hidden (secret achievements)

- [ ] **Visual Design**
  ```
  UI Elements:
  ✓ Badge icon/illustration
  ✓ Title and description
  ✓ Progress indicator
  ✓ Unlock date/time
  ✓ Rarity indicator
  ✓ Points value
  ```

### 2. GAMIFICATION STORE (`store/gamificationStore.ts`)

#### State Management
- [ ] **Profile Structure**
  ```typescript
  interface GamificationProfile {
    level: number;              // 1-100
    experience: number;         // Current XP
    experienceToNext: number;  // XP needed
    healingPointsTotal: number;
    healingPointsToday: number;
    streakCurrent: number;
    streakBest: number;
    unlockedAchievements: string[];
    badges: Badge[];
    multiplier: number;         // Point multiplier
  }
  ```

- [ ] **Point Calculation**
  ```
  Point Sources:
  ✓ Mood entry: 10 base points
  ✓ Voice entry: +5 bonus
  ✓ Complete entry: +3 bonus
  ✓ Breathwork minute: 2 points
  ✓ Daily streak: 20 points
  ✓ Achievement unlock: Variable
  ```

- [ ] **Level Progression**
  ```
  Level Formula:
  - Level 1: 0 XP
  - Level 2: 100 XP
  - Level 3: 250 XP
  - Level n: (n-1)² × 50 + 100
  
  Test:
  ✓ XP accumulation
  ✓ Level up animation
  ✓ Rewards on level up
  ```

### 3. MICRO REWARDS (`components/gamification/MicroRewardAnimation.tsx`)

#### Reward Triggers
- [ ] **Instant Rewards**
  ```
  Trigger Events:
  ✓ First entry of day (+20)
  ✓ Complete weekly goal (+50)
  ✓ Streak milestone (×2 multiplier)
  ✓ Perfect day (all modules) (+100)
  ✓ Mood improvement (+15)
  ✓ Achievement unlock (varies)
  ```

- [ ] **Animation System**
  - Floating points animation
  - Particle effects
  - Sound effects
  - Haptic feedback
  - Screen flash/glow

- [ ] **Reward Queue**
  - Multiple rewards handling
  - Sequential animation
  - No overlap/collision
  - Performance optimization

### 4. STREAK SYSTEM

#### Streak Tracking
- [ ] **Streak Types**
  ```
  Different Streaks:
  ✓ Daily check-in streak
  ✓ Breathwork streak
  ✓ Weekly active days
  ✓ Consistency streak
  ✓ Improvement streak
  ```

- [ ] **Streak Rules**
  - Reset time (midnight local)
  - Grace period (until 2 AM)
  - Freeze tokens (vacation mode)
  - Recovery options
  - Calendar visualization

- [ ] **Streak Rewards**
  ```
  Milestones:
  - 3 days: Bronze badge
  - 7 days: Silver badge
  - 30 days: Gold badge
  - 100 days: Diamond badge
  - 365 days: Master badge
  ```

### 5. ACHIEVEMENT ENGINE

#### Achievement Logic
- [ ] **Progress Tracking**
  ```typescript
  interface AchievementProgress {
    id: string;
    current: number;
    target: number;
    percentage: number;
    lastUpdated: Date;
    metadata: Record<string, any>;
  }
  ```

- [ ] **Unlock Conditions**
  ```
  Complex Conditions:
  ✓ Time-based (morning person: 5 AM entries)
  ✓ Pattern-based (steady improvement)
  ✓ Combination (mood + breathwork)
  ✓ Rare events (perfect month)
  ✓ Social (refer friends)
  ```

- [ ] **Notification System**
  - Achievement unlocked toast
  - Push notification (if enabled)
  - In-app celebration modal
  - Share functionality

## 🧪 Test Scenarios

### Scenario 1: New User Journey
```
1. Complete first mood entry
2. Receive "First Steps" achievement
3. See points animation
4. Check profile for XP
5. View locked achievements
Expected:
- Immediate reward feedback
- Clear next goals
- Motivation to continue
```

### Scenario 2: Streak Maintenance
```
1. 6-day streak active
2. Day 7: Entry at 11:45 PM
3. Day 8: Entry at 12:30 AM
4. Check streak status
Expected:
- 7-day achievement unlocked
- Streak continues to day 8
- No reset at midnight
```

### Scenario 3: Level Progression
```
1. User at Level 4 (90/150 XP)
2. Complete perfect day (100 points)
3. Level up to 5
4. Check rewards
Expected:
- Level up animation plays
- New badge unlocked
- Bonus healing points
- Share option appears
```

### Scenario 4: Achievement Hunting
```
1. View locked achievement
2. Tap for requirements
3. Complete required actions
4. Return to achievements
Expected:
- Progress visible
- Real-time updates
- Unlock celebration
- Points awarded
```

## 📊 Metrics to Track

### Engagement Metrics
```yaml
Key Metrics:
- Achievement completion rate
- Average achievements per user
- Most/least unlocked achievements
- Time to first achievement
- Achievement sharing rate
```

### Retention Metrics
```yaml
Correlation Analysis:
- Streak length vs retention
- Achievement count vs DAU
- Level vs engagement
- Points vs session length
```

### Balance Metrics
```yaml
Game Balance:
- Point inflation rate
- Level distribution curve
- Achievement difficulty spread
- Reward frequency
```

## 🔍 Code Review Points

### Achievement Detection
```typescript
// ✅ GOOD: Efficient checking
class AchievementChecker {
  private readonly checks = new Map<string, () => boolean>();
  
  checkAchievements() {
    const unlocked = [];
    for (const [id, check] of this.checks) {
      if (!this.isUnlocked(id) && check()) {
        unlocked.push(id);
      }
    }
    return unlocked;
  }
}

// ❌ BAD: Checking everything always
function checkAllAchievements() {
  // Checking all 100+ achievements on every action
  achievements.forEach(achievement => {
    // Heavy computation for each
  });
}
```

### Point Calculation
```typescript
// ✅ GOOD: Transparent calculation
interface PointBreakdown {
  base: number;
  bonuses: Array<{reason: string, points: number}>;
  multiplier: number;
  total: number;
}

const calculatePoints = (action: Action): PointBreakdown => {
  const breakdown = {
    base: getBasePoints(action),
    bonuses: getBonuses(action),
    multiplier: getMultiplier(user),
    total: 0
  };
  breakdown.total = (breakdown.base + 
    breakdown.bonuses.reduce((s, b) => s + b.points, 0)) * 
    breakdown.multiplier;
  return breakdown;
};
```

## ⚠️ Critical Balance Checks

### Economy Balance
- [ ] No point inflation
- [ ] Meaningful progression
- [ ] No pay-to-win elements
- [ ] Fair daily limits
- [ ] Anti-gaming measures

### Psychological Balance
- [ ] Positive reinforcement only
- [ ] No punishment for breaks
- [ ] Inclusive difficulty
- [ ] No addiction mechanics
- [ ] Mental health first

## 🎮 Gamification Psychology

### Motivation Principles
```
Core Loops:
✓ Action → Reward → Progress
✓ Short-term goals (daily)
✓ Mid-term goals (weekly)
✓ Long-term goals (badges)
✓ Surprise rewards (random)
```

### Player Types
- [ ] Achievers (completionists)
- [ ] Explorers (find hidden)
- [ ] Socializers (share/compete)
- [ ] Casual (low pressure)

## 📱 Platform-Specific Features

### iOS
- [ ] Game Center integration
- [ ] Achievement notifications
- [ ] Widget progress display
- [ ] SharePlay support
- [ ] iCloud sync

### Android
- [ ] Google Play Games
- [ ] Achievement snapshots
- [ ] Widget support
- [ ] Nearby sharing
- [ ] Cloud save

## 🔄 Integration Testing

### Cross-System Validation
- [ ] Mood → Points → Level
- [ ] Breathwork → Streak → Achievement
- [ ] Daily use → Multiplier → Rewards
- [ ] Social share → Referral → Bonus
- [ ] Settings → Notifications → Celebrations

## ✅ Sign-off Criteria

- [ ] All achievements unlockable
- [ ] Point math accurate
- [ ] Streaks track correctly
- [ ] Animations performant
- [ ] Rewards feel rewarding
- [ ] Balance is fair
- [ ] No exploits possible
- [ ] Accessibility compliant
- [ ] Analytics tracking working
- [ ] Social sharing functional

---

**Review Owner:** _________________  
**Review Date:** _________________  
**Version:** 1.0.0  
**Status:** [ ] In Progress [ ] Complete [ ] Blocked

---

## 🤖 AI Agent PR Plan & Prompts

### PR Implementation Plan

#### Phase 1: Achievement System Core
```yaml
PR-1: Implement Achievement Engine
Branch: feat/achievement-engine
Files:
  - services/achievementService.ts
  - store/gamificationStore.ts
  - types/achievements.ts
  - utils/achievementCalculations.ts
Size: ~800 lines
Priority: P1 - High
```

#### Phase 2: Streak System
```yaml
PR-2: Add Streak Tracking System
Branch: feat/streak-system
Files:
  - services/streakService.ts
  - components/gamification/StreakCounter.tsx
  - utils/streakCalculations.ts
  - hooks/useStreak.ts
Size: ~500 lines
Priority: P1 - High
```

#### Phase 3: Visual Rewards
```yaml
PR-3: Create Reward Animations & UI
Branch: feat/reward-visuals
Files:
  - components/gamification/AchievementModal.tsx
  - components/gamification/MicroRewardAnimation.tsx
  - utils/confettiEffects.ts
  - hooks/useRewardAnimation.ts
Size: ~600 lines
Priority: P2 - Medium
```

### AI Agent Prompts

#### 🤖 Prompt 1: Achievement System Implementation
```markdown
You are building a gamification system for a mental health app.

CONTEXT:
- App: MoodMeter - Mood tracking
- Goal: Encourage consistent usage
- Balance: Engaging but not addictive
- Ethical: Mental health appropriate

TASK: Implement achievement tracking system

REQUIREMENTS:
1. Achievement Types:
   ```typescript
   interface Achievement {
     id: string;
     category: 'streak' | 'milestone' | 'special' | 'social';
     title: string;
     description: string;
     icon: string;
     points: number;
     tier: 'bronze' | 'silver' | 'gold' | 'platinum';
     unlockedAt?: Date;
     progress: number;  // 0-100
     requirement: AchievementRequirement;
   }
   ```

2. Progress Tracking:
   - Real-time updates
   - Offline capability
   - Retroactive unlocks
   - Progress persistence

3. Unlock Conditions:
   - Streak-based (7, 30, 100 days)
   - Count-based (10, 50, 100 entries)
   - Time-based (morning person)
   - Pattern-based (consistency)

4. Notifications:
   - Achievement unlocked
   - Near completion (90%)
   - Milestone approaching
   - Streak at risk

5. Ethical Considerations:
   - No pressure messaging
   - Skip day allowance
   - Focus on progress
   - Celebrate small wins

DELIVERABLES:
- Achievement service
- Progress calculator
- Unlock checker
- Notification triggers
```

#### 🤖 Prompt 2: Streak System
```markdown
You are implementing a streak tracking system for daily engagement.

CONTEXT:
- Track consecutive days of mood entries
- Allow grace periods (skip 1 day)
- Multiple streak types
- Motivational but not stressful

TASK: Build comprehensive streak tracking

REQUIREMENTS:
1. Streak Logic:
   ```typescript
   interface StreakData {
     current: number;
     longest: number;
     startDate: Date;
     lastEntryDate: Date;
     freezesAvailable: number;
     freezeUsedToday: boolean;
     type: 'daily' | 'weekly' | 'check-in';
   }
   ```

2. Grace Periods:
   - 1 skip day per week
   - Weekend flexibility
   - Timezone handling
   - Retroactive recovery

3. Visual Indicators:
   - Flame icon with number
   - Color intensity (heat)
   - Animation on increment
   - Risk indicator

4. Motivational Features:
   - Milestone celebrations
   - Encouraging messages
   - Recovery prompts
   - Personal records

IMPLEMENTATION:
- Calculate at app launch
- Check on each entry
- Store in Zustand
- Sync with backend
```

#### 🤖 Prompt 3: Reward Animations
```markdown
You are creating delightful reward animations for achievements.

CONTEXT:
- Celebrate user progress
- Non-intrusive animations
- Performance conscious
- Accessibility friendly

TASK: Implement reward animation system

REQUIREMENTS:
1. Animation Types:
   - Confetti burst
   - Badge reveal
   - Points counter
   - Streak fire
   - Star shower

2. Lottie Animations:
   ```typescript
   interface RewardAnimation {
     type: 'confetti' | 'badge' | 'stars';
     duration: number;
     intensity: 'subtle' | 'normal' | 'celebration';
     colors: string[];
     haptic: boolean;
   }
   ```

3. Performance:
   - Lazy load animations
   - GPU accelerated
   - Auto-cleanup
   - FPS monitoring

4. Accessibility:
   - Reduced motion option
   - Screen reader announce
   - Skip animation button
   - Success sound alternative

FILES:
- MicroRewardAnimation.tsx
- AchievementModal.tsx
- confettiEffects.ts
- soundEffects.ts
```

### PR Review Checklist

```markdown
## Gamification Specific Checks

### Engagement Balance
- [ ] Not overly addictive
- [ ] Mental health appropriate
- [ ] Positive reinforcement only
- [ ] No dark patterns

### Data Integrity
- [ ] Streak calculation accurate
- [ ] Progress saved correctly
- [ ] Achievements persistent
- [ ] Sync conflicts handled

### Performance
- [ ] Animations smooth
- [ ] No memory leaks
- [ ] Lazy loading works
- [ ] Background calculations
```

## 📝 Balance Notes

_Record any balance issues, exploit possibilities, or user feedback:_

---
