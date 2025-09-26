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
