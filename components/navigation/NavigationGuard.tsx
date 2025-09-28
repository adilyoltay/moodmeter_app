import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import supabaseService from '@/services/supabase';

interface NavigationGuardProps {
  children: React.ReactNode;
}

// Cache for onboarding check results to prevent excessive remote calls
const onboardingCheckCache = new Map<string, { result: boolean; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds cache

/**
 * 🔄 Clear onboarding check cache for a specific user
 * Called when user's onboarding status changes (e.g., new user signup)
 */
export function clearOnboardingCache(userId: string): void {
  const keys = Array.from(onboardingCheckCache.keys()).filter(key => key.includes(userId));
  keys.forEach(key => onboardingCheckCache.delete(key));
  console.log(`🔄 Cleared onboarding cache for user ${userId}: ${keys.length} entries removed`);
}

/**
 * 🛡️ Robust Onboarding Completion Check (Cached)
 * 
 * Implements multi-layer validation with caching:
 * 1. Check cache first (prevent excessive calls)
 * 2. Local AsyncStorage cache (fast)
 * 3. Remote Supabase verification (authoritative, cached)
 * 4. Integrity validation and recovery
 */
async function checkOnboardingCompletion(userId: string, localKey: string): Promise<boolean> {
  try {
    // LAYER 0: Memory cache check (prevent excessive calls)
    const cacheKey = `${userId}_${localKey}`;
    const cached = onboardingCheckCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('🔍 Layer 0 - Cache hit:', { result: cached.result });
      return cached.result;
    }

    // LAYER 1: Local storage check (fast path)
    const localValue = await AsyncStorage.getItem(localKey);
    let localCompleted = localValue === 'true';
    
    console.log('🔍 Layer 1 - Local check:', { localKey, localValue, localCompleted });
    
    // Check generic fallback key if local is not completed
    if (!localCompleted) {
      try {
        const generic = await AsyncStorage.getItem('ai_onboarding_completed');
        if (generic === 'true') {
          console.log('🔄 Generic fallback key confirms completion');
          localCompleted = true;
          // Update specific key for future
          await AsyncStorage.setItem(localKey, 'true');
        }
      } catch (error) {
        console.warn('Generic fallback key check failed (non-critical):', error);
      }
    }
    
    // LAYER 2: Remote verification (only when needed)  
    let remoteCompleted = false;
    let remoteCheckFailed = false;
    
    const shouldVerifyRemote = !localCompleted || !cached || Math.random() < 0.1;

    // Only do remote check if local is false or we explicitly need verification
    if (shouldVerifyRemote) {
      try {
        // Check authoritative onboarding completion in user_profiles
        const { data: profile, error } = await supabaseService.supabaseClient
          .from('user_profiles')
          .select('user_id, onboarding_completed, onboarding_completed_at, onboarding_version')
          .eq('user_id', userId)
          .single();
          
        if (!error && profile) {
          const profileCompleted = Boolean(
            (profile as any)?.onboarding_completed === true ||
            (profile as any)?.onboarding_completed_at
          );

          remoteCompleted = profileCompleted;
          console.log('✅ Layer 2 - Remote verification:', {
            profileFound: true,
            onboarding_completed: (profile as any)?.onboarding_completed,
            onboarding_completed_at: (profile as any)?.onboarding_completed_at,
            remoteCompleted,
          });

          if (!profileCompleted) {
            try {
              await AsyncStorage.removeItem(localKey);
              await AsyncStorage.removeItem('ai_onboarding_completed');
            } catch (clearErr) {
              console.warn('⚠️ Failed to clear local onboarding cache after remote incomplete:', clearErr);
            }
          }
        } else {
          console.log('⚠️ Layer 2 - Remote verification: No profile found');
        }
      } catch (remoteError) {
        console.warn('⚠️ Layer 2 - Remote verification failed (network/auth issue):', remoteError);
        remoteCheckFailed = true;
      }
    }

    if (!shouldVerifyRemote) {
      console.log('⚡ Skipping remote check - local completed and cached recently');
      remoteCompleted = localCompleted;
    }

    // Final decision: prioritize remote when available, fallback to local
    const finalDecision = remoteCheckFailed ? localCompleted : (remoteCompleted || localCompleted);
    
    // Update cache with result
    onboardingCheckCache.set(cacheKey, { result: finalDecision, timestamp: Date.now() });
    
    console.log('🎯 Final onboarding decision:', {
      localCompleted,
      remoteCompleted,
      remoteCheckFailed,
      finalDecision,
      cached: true
    });
    
    return finalDecision;
    
  } catch (error) {
    console.error('❌ Onboarding check failed completely:', error);
    
    // Last resort: check generic key and cache negative result briefly
    try {
      const generic = await AsyncStorage.getItem('ai_onboarding_completed');
      const fallback = generic === 'true';
      console.log('🆘 Last resort fallback:', { generic, fallback });
      
      // Cache negative results for a shorter period to avoid infinite checks
      const cacheKeyLocal = `${userId}_${localKey}`;
      onboardingCheckCache.set(cacheKeyLocal, { result: fallback, timestamp: Date.now() });
      
      return fallback;
    } catch (fallbackError) {
      console.error('❌ Even fallback check failed:', fallbackError);
      // Cache false result briefly to prevent rapid retries
      const cacheKeyLocal2 = `${userId}_${localKey}`;
      onboardingCheckCache.set(cacheKeyLocal2, { result: false, timestamp: Date.now() });
      return false; // Fail safe - require onboarding
    }
  }
}

export function NavigationGuard({ children }: NavigationGuardProps) {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading: authLoading } = useAuth();
  const [hasPerformedNavigation, setHasPerformedNavigation] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const currentPath = segments.join('/');
    const isAuthStack = segments[0] === '(auth)';
    const isOnboardingRoute = segments.includes('onboarding');
    const isAtRoot = currentPath === '' || currentPath === 'index';

    // Skip while loading auth
    if (authLoading) {
      return;
    }

    // Handle authenticated user stuck on auth screens (e.g., login)
    if (!isAtRoot && user && isAuthStack) {
      if (isOnboardingRoute) {
        console.log('🧭 Authenticated user on onboarding route — allow pending completion');
      } else {
        console.log('🚀 Auth user detected on auth stack, redirecting to tabs');
        router.replace('/(tabs)');
        setIsInitialLoad(false);
        return;
      }
    }

    // Handle signed-out user landing on protected stacks
    if (!isAtRoot && !user && !isAuthStack) {
      console.log('🚪 Signed-out user on protected stack, redirecting to login');
      router.replace('/(auth)/login');
      setIsInitialLoad(false);
      return;
    }

    // Skip if navigation already performed and we are not at root
    if (!isAtRoot || hasPerformedNavigation) {
      if (!isAtRoot) {
        console.log('✅ Not at root, no fresh navigation needed:', currentPath);
      }
      setIsInitialLoad(false);
      return;
    }

    const performInitialNavigation = async () => {
      console.log('🔍 NavigationGuard - Initial navigation check');
      
      // Prevent any further navigation attempts
      setHasPerformedNavigation(true);

      try {
        if (!user) {
          console.log('🚀 No user, navigate to login');
          router.replace('/(auth)/login');
        } else {
          const aiKey = `ai_onboarding_completed_${user.id}`;
          const completed = await checkOnboardingCompletion(user.id, aiKey);

          if (!completed) {
            console.log('🚀 Onboarding needed (after state validation)');
            router.replace('/(auth)/onboarding');
          } else {
            console.log('🚀 Navigate to main app (onboarding already complete)');
            router.replace('/(tabs)');
          }
        }
      } catch (error) {
        console.error('❌ Navigation error:', error);
        router.replace('/(auth)/login');
      } finally {
        setIsInitialLoad(false);
      }
    };

    // Small delay to ensure everything is ready
    const timer = setTimeout(performInitialNavigation, 300);
    return () => clearTimeout(timer);
  }, [authLoading, hasPerformedNavigation, segments, user, router]);

  if (authLoading || isInitialLoad) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return <>{children}</>;
}
