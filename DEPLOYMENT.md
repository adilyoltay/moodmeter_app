# 🚀 MoodMeter Production Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Environment Setup
- [ ] Copy `.env.example` to `.env.local`
- [ ] Configure Supabase URL and anon key
- [ ] Set up Google OAuth client ID
- [ ] Verify all environment variables

### ✅ Dependencies
```bash
npm install
```

### ✅ Code Quality Validation
```bash
npm run lint        # ESLint validation
npm run typecheck   # TypeScript validation
npm run test        # Run tests
```

## 🏗️ Build Process

### Development Build
```bash
npm start           # Start development server
npm run ios         # iOS simulator
npm run android     # Android emulator
```

### Production Build
```bash
# iOS Production
eas build --platform ios --profile production

# Android Production  
eas build --platform android --profile production

# Both platforms
eas build --platform all --profile production
```

## 📱 App Store Deployment

### iOS App Store
```bash
# Build and submit
eas submit --platform ios --profile production

# Or manual upload via Xcode/App Store Connect
```

### Google Play Store
```bash
# Build and submit
eas submit --platform android --profile production

# Or manual upload via Google Play Console
```

## 🔧 Configuration

### Supabase Setup
1. Create new Supabase project
2. Run migrations: `supabase db push`
3. Configure RLS policies
4. Set up Edge Functions (if needed)

### Google OAuth Setup
1. Create OAuth 2.0 client in Google Cloud Console
2. Configure authorized domains
3. Add client ID to environment variables

## 🛡️ Security

### Environment Variables
- Never commit `.env.local` to version control
- Use different keys for development/production
- Rotate keys regularly

### Database Security
- RLS policies enabled on all tables
- Encrypted sensitive data storage
- Secure API endpoints

## 📊 Monitoring

### Performance
- Monitor app startup time
- Track mood save latency
- Watch memory usage

### Quality
- Code quality metrics maintained
- Zero dead code policy
- Regular dependency audits

## 🚨 Troubleshooting

### Common Issues
1. **Build fails**: Check environment variables
2. **Auth issues**: Verify Google OAuth setup
3. **Database errors**: Check Supabase configuration
4. **Performance**: Monitor bundle size

### Support
- Check logs in EAS dashboard
- Review Supabase logs
- Use debug console for diagnostics

## 📈 Post-Deployment

### Monitoring
- Set up crash reporting
- Monitor user feedback
- Track performance metrics

### Maintenance
- Regular dependency updates
- Security patch reviews
- Performance optimization

---

**This deployment guide ensures smooth production release of the ultra-optimized MoodMeter app.**
