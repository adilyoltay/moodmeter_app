# 🔐 Authentication & Onboarding Flow - Review Guide

## 📋 Review Checklist

### 1. SIGNUP FLOW (`app/(auth)/signup.tsx`)

#### Functional Requirements
- [ ] **Email/Password Registration**
  - Validate email format (RFC 5322 compliant)
  - Password strength requirements (min 8 chars, 1 uppercase, 1 number, 1 special)
  - Real-time validation feedback
  - Duplicate email check
  - Success confirmation

- [ ] **Google OAuth Integration**
  - Google Sign-In button functionality
  - OAuth token handling
  - Profile data extraction
  - Error handling for cancelled/failed auth

- [ ] **Form Validation**
  ```
  Test Cases:
  ✓ Empty fields submission
  ✓ Invalid email formats (test@, @test.com, test..test@gmail.com)
  ✓ Weak passwords
  ✓ Password confirmation mismatch
  ✓ SQL injection attempts
  ✓ XSS attempts in form fields
  ```

- [ ] **Error Handling**
  - Network timeout (>5 seconds)
  - Server errors (500, 503)
  - Rate limiting (429)
  - User-friendly error messages in TR/EN

#### UI/UX Requirements
- [ ] **Visual Design**
  - Consistent with design system
  - Proper spacing and alignment
  - Keyboard avoidance
  - Loading states during submission
  - Disabled state while processing

- [ ] **Accessibility**
  - Screen reader labels
  - Keyboard navigation (Tab order)
  - Color contrast (WCAG 2.1 AA)
  - Touch target size (min 44x44)

#### Security Requirements
- [ ] **Data Protection**
  - HTTPS only
  - Password hashing (client-side pre-hash?)
  - Secure token storage
  - No sensitive data in logs
  - Rate limiting implementation

### 2. LOGIN FLOW (`app/(auth)/login.tsx`)

#### Functional Requirements
- [ ] **Standard Login**
  - Email/password authentication
  - Remember me functionality
  - Auto-fill support
  - Session persistence

- [ ] **Biometric Authentication**
  - FaceID/TouchID integration
  - Fallback to password
  - Biometric availability check
  - Permission handling

- [ ] **Password Recovery**
  - Forgot password link
  - Email verification flow
  - Password reset token expiry
  - Success confirmation

#### Edge Cases
- [ ] **Account States**
  ```
  Test Scenarios:
  ✓ Locked account (too many attempts)
  ✓ Deactivated account
  ✓ Email not verified
  ✓ Expired session
  ✓ Multiple device login
  ```

### 3. AUTH NAVIGATION GUARD (`components/navigation/NavigationGuard.tsx`)

#### Functional Requirements
- [ ] **Route Protection**
  - Unauthorized redirect to login
  - Deep link handling
  - Return URL preservation
  - Role-based access control

- [ ] **Session Management**
  - Token refresh logic
  - Silent refresh implementation
  - Session timeout handling
  - Logout propagation

#### Performance Requirements
- [ ] **Loading Performance**
  - Initial auth check < 100ms
  - Token refresh < 500ms
  - No UI flicker during auth check
  - Smooth transitions

### 4. ONBOARDING FLOW (`components/onboarding/`)

#### Functional Requirements
- [ ] **Profile Setup**
  - Name/nickname collection
  - Avatar selection/upload
  - Timezone detection
  - Language preference

- [ ] **Permission Requests**
  ```
  Permission Flow:
  1. Notifications (timing matters!)
  2. Health data access
  3. Microphone (for voice features)
  4. Camera (if needed)
  ```

- [ ] **Initial Configuration**
  - Reminder time selection
  - Theme preference
  - Privacy settings
  - Data sharing consent

#### Progress Tracking
- [ ] **Onboarding State**
  - Progress persistence
  - Skip options
  - Back navigation
  - Completion tracking

## 🧪 Test Scenarios

### Scenario 1: Happy Path
```
1. User opens app first time
2. Taps "Sign Up"
3. Enters valid email/password
4. Receives verification email
5. Completes onboarding
6. Lands on home screen
Expected: Smooth flow, <3 seconds total
```

### Scenario 2: Network Issues
```
1. User fills signup form
2. Turn off internet
3. Submit form
4. Turn on internet
5. Retry submission
Expected: Graceful error, retry works
```

### Scenario 3: OAuth Flow
```
1. Tap "Sign in with Google"
2. Select Google account
3. Grant permissions
4. Complete profile
Expected: Auto-fill from Google data
```

### Scenario 4: Security Attack
```
1. Try SQL injection in email field
2. Try XSS in name field
3. Try brute force login (10+ attempts)
4. Try expired token usage
Expected: All attacks blocked, user locked after attempts
```

## 📊 Metrics to Track

- **Conversion Metrics**
  - Signup start → completion rate
  - Average time to complete
  - Drop-off points
  - OAuth vs Email ratio

- **Error Metrics**
  - Failed login attempts
  - Network errors
  - Validation errors
  - Crash rate

- **Performance Metrics**
  - Time to interactive (TTI)
  - API response times
  - Token refresh success rate
  - Biometric success rate

## 🔍 Code Review Points

```typescript
// Check for these patterns:

// ✅ GOOD: Secure password handling
const hashedPassword = await hashPassword(password);
await supabase.auth.signUp({ email, password: hashedPassword });

// ❌ BAD: Logging sensitive data
console.log('User password:', password);

// ✅ GOOD: Proper error boundaries
try {
  await signUp(data);
} catch (error) {
  if (error.code === 'auth/email-already-in-use') {
    showLocalizedError('auth.errors.email_exists');
  }
}

// ❌ BAD: Generic error messages
catch (error) {
  alert('Error occurred');
}
```

## ⚠️ Critical Security Checks

1. **No hardcoded secrets** in code
2. **Rate limiting** on auth endpoints
3. **Secure token storage** (Keychain/Keystore)
4. **Certificate pinning** for production
5. **Obfuscation** of sensitive logic
6. **CAPTCHA** for repeated failures
7. **Session invalidation** on logout
8. **Password policy** enforcement

## 📱 Device-Specific Testing

### iOS Testing
- [ ] FaceID on iPhone X+
- [ ] TouchID on older devices
- [ ] Keychain integration
- [ ] ASWebAuthenticationSession for OAuth

### Android Testing
- [ ] Fingerprint on Android 6+
- [ ] Face unlock on supported devices
- [ ] KeyStore integration
- [ ] Chrome Custom Tabs for OAuth

## ✅ Sign-off Criteria

- [ ] All functional requirements pass
- [ ] Zero critical security issues
- [ ] Performance metrics within targets
- [ ] Accessibility audit pass
- [ ] Error handling comprehensive
- [ ] Documentation complete
- [ ] Analytics tracking verified

---

**Review Owner:** _________________  
**Review Date:** _________________  
**Version:** 1.0.0  
**Status:** [ ] In Progress [ ] Complete [ ] Blocked

---

## 🤖 AI Agent PR Plan & Prompts

### PR Implementation Plan

#### Phase 1: Security & Validation PRs
```yaml
PR-1: Implement Secure Authentication Foundation
Branch: feat/auth-security-foundation
Files:
  - app/(auth)/signup.tsx
  - app/(auth)/login.tsx
  - services/supabase/authService.ts
  - utils/validation.ts
Size: ~500 lines
Priority: P0 - Critical
```

#### Phase 2: OAuth Integration PRs  
```yaml
PR-2: Add Google OAuth Integration
Branch: feat/google-oauth
Files:
  - components/ui/GoogleSignInButton.tsx
  - services/supabase/oauthService.ts
  - app/(auth)/_layout.tsx
Size: ~300 lines
Priority: P0 - Critical
```

#### Phase 3: Biometric Authentication PRs
```yaml
PR-3: Implement Biometric Authentication
Branch: feat/biometric-auth
Files:
  - services/biometric.ts
  - hooks/useBiometric.ts
  - app/(auth)/login.tsx (update)
Size: ~400 lines
Priority: P1 - High
```

#### Phase 4: Onboarding Flow PRs
```yaml
PR-4: Create Onboarding Experience
Branch: feat/onboarding-flow
Files:
  - components/onboarding/OnboardingFlow.tsx
  - components/onboarding/PermissionRequests.tsx
  - store/onboardingStore.ts
Size: ~600 lines
Priority: P1 - High
```

### AI Agent Prompts

#### 🤖 Prompt 1: Secure Authentication Implementation
```markdown
You are implementing secure authentication for a React Native mental health app using Supabase.

CONTEXT:
- App Name: MoodMeter
- Stack: React Native (Expo), TypeScript, Supabase
- Auth Requirements: Email/password, Google OAuth, biometric
- Security: OWASP compliance required

TASK: Implement the signup flow in app/(auth)/signup.tsx

REQUIREMENTS:
1. Form Validation:
   - Email: RFC 5322 compliant
   - Password: Min 8 chars, 1 uppercase, 1 number, 1 special char
   - Real-time validation with debouncing
   - Turkish and English error messages

2. Security:
   - Implement rate limiting (max 5 attempts per 15 min)
   - SQL injection prevention
   - XSS prevention in all inputs
   - Secure password hashing (use Supabase's built-in)
   - HTTPS only

3. UX Requirements:
   - Loading states during submission
   - Keyboard avoiding view
   - Auto-focus on first field
   - Success haptic feedback
   - Error animations

4. Error Handling:
   - Network timeout (30s)
   - Duplicate email
   - Server errors
   - Validation errors

5. Code Standards:
   - TypeScript strict mode
   - Comments in Turkish
   - Follow project's style guide
   - Add comprehensive error logging

EXISTING CODE REFERENCES:
- Check components/ui/Button.tsx for button component
- Use hooks/useTranslation.ts for i18n
- Follow patterns in services/supabase/
- Use utils/validation.ts for validators

DELIVERABLES:
1. Complete signup.tsx implementation
2. Unit tests for validation logic
3. Integration with Supabase auth
4. Error handling with user-friendly messages
```

#### 🤖 Prompt 2: OAuth Integration
```markdown
You are adding Google OAuth to an existing React Native authentication system.

CONTEXT:
- Existing email/password auth working
- Using Supabase for backend
- Google Client ID configured in app.config.ts
- Must support both iOS and Android

TASK: Implement Google Sign-In in components/ui/GoogleSignInButton.tsx

REQUIREMENTS:
1. Platform-Specific Implementation:
   - iOS: Use ASWebAuthenticationSession
   - Android: Use Chrome Custom Tabs
   - Web: Standard OAuth flow

2. Integration Points:
   - Trigger from GoogleSignInButton component
   - Handle response in authService
   - Store tokens securely
   - Sync with Supabase auth

3. Error Cases:
   - User cancellation
   - Network failure
   - Invalid configuration
   - Token expiration

4. Profile Data:
   - Extract email, name, avatar
   - Create/update user profile
   - Handle existing email conflict

EXISTING PATTERNS:
- Check app/(auth)/signup.tsx for auth flow
- Use contexts/SupabaseAuthContext.tsx
- Follow error handling in services/

OUTPUT:
- Updated GoogleSignInButton with OAuth flow
- Service integration in authService.ts
- Error handling and user feedback
```

#### 🤖 Prompt 3: Biometric Authentication
```markdown
You are implementing biometric authentication for a mental health tracking app.

CONTEXT:
- Users already logged in with email/password
- Need quick access for daily mood entries
- Privacy is critical - mental health data
- Must work offline

TASK: Add FaceID/TouchID support to the login flow

REQUIREMENTS:
1. Biometric Setup:
   - Check device capability
   - Request permission gracefully
   - Fallback to password
   - Remember user preference

2. Security Implementation:
   - Store refresh token in Keychain/Keystore
   - Encrypt sensitive data
   - Auto-lock after 5 minutes inactive
   - Clear on logout

3. UX Flow:
   - Prompt on second login
   - Settings toggle for enable/disable
   - Clear messaging about data security
   - Smooth animation transitions

4. Edge Cases:
   - Biometric change/update
   - Multiple failed attempts
   - Device doesn't support
   - Permission denied

IMPLEMENTATION FILES:
- services/biometric.ts - Core logic
- hooks/useBiometric.ts - React integration
- Update app/(auth)/login.tsx
- Update app/(tabs)/settings.tsx

TESTING REQUIREMENTS:
- Test on devices with/without biometric
- Test permission denial flow
- Test fallback mechanisms
- Verify secure storage
```

#### 🤖 Prompt 4: Onboarding Flow
```markdown
You are creating an onboarding experience for first-time users of a mood tracking app.

CONTEXT:
- Target users: People managing mental health
- Sensitive topic - need empathetic approach
- Collect minimal necessary data
- Progressive disclosure principle

TASK: Implement onboarding flow in components/onboarding/

REQUIREMENTS:
1. Information Collection:
   - Name (optional)
   - Notification preferences
   - Primary mood tracking goal
   - Privacy preferences

2. Permission Requests (Strategic Timing):
   ```typescript
   Step 1: Welcome & app benefits
   Step 2: Name & basic preferences
   Step 3: Notification permission (explain value first)
   Step 4: Health data access (if applicable)
   Step 5: Success & first mood entry prompt
   ```

3. UI/UX Requirements:
   - Progress indicator
   - Skip options where appropriate
   - Back navigation
   - Smooth transitions (60 FPS)
   - Illustrations for each step

4. State Management:
   - Persist progress
   - Resume from interruption
   - Complete flag in profile
   - Analytics tracking

5. Copy Guidelines:
   - Empathetic tone
   - Clear value propositions
   - No medical claims
   - Bilingual (TR/EN)

FILES TO CREATE:
- components/onboarding/OnboardingFlow.tsx
- components/onboarding/WelcomeStep.tsx
- components/onboarding/ProfileStep.tsx
- components/onboarding/PermissionStep.tsx
- components/onboarding/CompletionStep.tsx
- store/onboardingStore.ts

SUCCESS CRITERIA:
- 80%+ completion rate
- < 2 minutes to complete
- Accessible (VoiceOver/TalkBack)
- Works offline
```

### PR Review Checklist for AI Agents

```markdown
Before submitting PR, ensure:

## Code Quality
- [ ] TypeScript strict mode - no any types
- [ ] All functions have JSDoc comments
- [ ] Error handling on every async operation
- [ ] Loading states for all async UI
- [ ] Memoization where appropriate

## Security
- [ ] Input validation on all forms
- [ ] XSS prevention measures
- [ ] SQL injection prevention
- [ ] Sensitive data encrypted
- [ ] No secrets in code

## Testing
- [ ] Unit tests for utilities
- [ ] Integration tests for auth flow
- [ ] E2E test for happy path
- [ ] Error scenario tests
- [ ] Offline scenario tests

## Performance
- [ ] Bundle size impact < 50KB
- [ ] No memory leaks
- [ ] Animations at 60 FPS
- [ ] API calls have timeout
- [ ] Images optimized

## Accessibility
- [ ] Screen reader labels
- [ ] Keyboard navigation
- [ ] Color contrast WCAG AA
- [ ] Touch targets 44x44 minimum
- [ ] Focus indicators visible

## Documentation
- [ ] README updated
- [ ] API docs for new services
- [ ] Inline code comments
- [ ] CHANGELOG entry
- [ ] Migration guide if breaking
```

### Automated PR Description Template

```markdown
## 🎯 Purpose
[AI Agent: Describe the business value and user impact]

## 📝 Changes
[AI Agent: List key changes with bullet points]
- Implemented X feature in Y component
- Added Z validation for security
- Updated A to support B

## 🧪 Testing
[AI Agent: Describe testing approach]
- [ ] Manual testing on iOS simulator
- [ ] Manual testing on Android emulator  
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated

## 📸 Screenshots/Videos
[AI Agent: Attach relevant UI changes]

## 🔗 Related Issues
Fixes #[issue-number]
Part of epic #[epic-number]

## ⚠️ Breaking Changes
[AI Agent: List any breaking changes or "None"]

## 🚀 Deployment Notes
[AI Agent: Special deployment considerations or "Standard deployment"]

## 📋 Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests passing
- [ ] Documentation updated
- [ ] No console.logs left
- [ ] Translations added for new strings
```
