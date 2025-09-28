import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useMoodOnboardingStore } from '@/store/moodOnboardingStore';

const STEP_ROUTES = [
  '/(auth)/onboarding/welcome',
  '/(auth)/onboarding/motivation',
  '/(auth)/onboarding/first-mood',
  '/(auth)/onboarding/lifestyle',
  '/(auth)/onboarding/notifications',
  '/(auth)/onboarding/summary',
] as const;

export default function OnboardingIndex() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth() as any;
  const hydrateFromStorage = useMoodOnboardingStore((state) => state.hydrateFromStorage);
  const isHydrated = useMoodOnboardingStore((state) => state.isHydrated);
  const isLoading = useMoodOnboardingStore((state) => state.isLoading);
  const step = useMoodOnboardingStore((state) => state.step);

  useEffect(() => {
    hydrateFromStorage(user?.id);
  }, [hydrateFromStorage, user?.id]);

  const targetRoute = useMemo(() => {
    if (!isHydrated) return null;
    const clampedStep = Number.isFinite(step)
      ? Math.min(Math.max(Math.floor(step), 0), STEP_ROUTES.length - 1)
      : 0;
    return STEP_ROUTES[clampedStep];
  }, [isHydrated, step]);

  useEffect(() => {
    if (!isHydrated || !targetRoute) return;
    if (pathname === targetRoute) return;
    router.replace(targetRoute as any);
  }, [isHydrated, pathname, router, targetRoute]);

  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color="#10B981" />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
});
