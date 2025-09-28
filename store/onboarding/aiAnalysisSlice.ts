import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MotivationKey } from '@/features/onboarding/types';

import type { AiAnalysisSlice, SliceCreator } from './types';
import { trackOnboardingAIMetric } from './utils/telemetry';
import { readProgressiveInsights, clearProgressiveCache } from './utils/persistence';
import { STORAGE_KEYS } from './utils/storageKeys';
import {
  generateFallbackProfile as buildFallbackProfile,
  generateMotivationFallbackInsights,
  generateMoodFallbackInsights,
} from './utils/aiFallbacks';

const AI_ANALYSIS_TIMEOUT_MS = 10_000;

const resolveNetworkStatus = async (): Promise<boolean> => {
  try {
    const NetInfo = require('@react-native-community/netinfo').default;
    const state = await NetInfo.fetch();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch (error) {
    console.warn('⚠️ Failed to resolve network status for onboarding AI analysis:', error);
    return false;
  }
};

const withDisabledAIPipeline = async (step: 'motivation' | 'first_mood') => {
  return {
    insights: { therapeutic: [] },
    patterns: [],
    metadata: { source: 'disabled', step },
  };
};

const cacheInsights = async (key: string, payload: unknown) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn(`⚠️ Failed to cache onboarding insights for ${key}:`, error);
    return false;
  }
};

export const createAiAnalysisSlice: SliceCreator<AiAnalysisSlice> = (set, get) => {
  const updateProgressiveState = (partial: Record<string, unknown>) => {
    set((state) => ({
      progressiveInsights: {
        ...(state.progressiveInsights ?? {}),
        ...partial,
      },
      lastAnalysisAt: Date.now(),
    }) as Partial<AiAnalysisSlice>);
  };

const runWithFallback = async (
  step: 'motivation' | 'first_mood',
  aiPromiseFactory: () => Promise<any>,
  fallbackFactory: () => any,
): Promise<{ result: any; usedFallback: boolean }> => {
  const isOnline = await resolveNetworkStatus();
  if (!isOnline) {
    trackOnboardingAIMetric({ phase: `${step}-analysis`, status: 'offline-fallback' });
    return { result: fallbackFactory(), usedFallback: true };
  }

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error('Timeout while waiting AI analysis')), AI_ANALYSIS_TIMEOUT_MS);
    });
    const aiResult = await Promise.race([aiPromiseFactory(), timeoutPromise]);
    trackOnboardingAIMetric({ phase: `${step}-analysis`, status: 'ai-success' });
    return { result: aiResult, usedFallback: false };
  } catch (error) {
    console.warn(`⚠️ Onboarding AI analysis (${step}) failed, using fallback:`, error);
    trackOnboardingAIMetric({ phase: `${step}-analysis`, status: 'ai-fallback', error: error instanceof Error ? error.message : String(error) });
    return { result: fallbackFactory(), usedFallback: true };
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

  return {
    progressiveInsights: undefined,
    lastAnalysisAt: undefined,
    async collectProgressiveInsights() {
      trackOnboardingAIMetric({ phase: 'collect-progressive-insights' });
      const insights = await readProgressiveInsights();
      updateProgressiveState(insights);
      return insights;
    },
    async cleanupProgressiveCache() {
      await clearProgressiveCache();
      set({ progressiveInsights: undefined });
    },
    async analyzeMotivationWithFallback(motivations) {
      trackOnboardingAIMetric({ phase: 'analyze-motivation-start' });

      const fallback = () => generateMotivationFallbackInsights(motivations ?? []);
      const { result, usedFallback } = await runWithFallback('motivation', () => withDisabledAIPipeline('motivation'), fallback);

      const insights = usedFallback
        ? result
        : {
            insights: (result as any)?.insights ?? [],
            patterns: (result as any)?.patterns ?? [],
            personalizedGoals: (result as any)?.personalizedGoals ?? [],
            generatedAt: new Date().toISOString(),
            source: 'ai_analysis',
          };

      updateProgressiveState({ motivation: insights });
      await cacheInsights(STORAGE_KEYS.MOTIVATION_INSIGHTS, insights);
    },
    async analyzeFirstMoodWithFallback(score, tags) {
      if (!score) return;

      trackOnboardingAIMetric({ phase: 'analyze-first-mood-start' });

      const fallback = () => generateMoodFallbackInsights(score, tags);
      const { result, usedFallback } = await runWithFallback('first_mood', () => withDisabledAIPipeline('first_mood'), fallback);

      const insights = usedFallback
        ? result
        : {
            insights: (result as any)?.insights ?? [],
            generatedAt: new Date().toISOString(),
            source: 'ai_analysis',
          };

      updateProgressiveState({ mood: insights });
      await cacheInsights(STORAGE_KEYS.MOOD_INSIGHTS, insights);
    },
    generateFallbackProfile(payload, progressiveInsights, userId) {
      const insights = buildFallbackProfile(payload, progressiveInsights, userId);
      updateProgressiveState({ profile: insights });
      return insights;
    },
    generateMotivationFallback(motivations: MotivationKey[]) {
      const fallback = generateMotivationFallbackInsights(motivations ?? []);
      updateProgressiveState({ motivation: fallback });
      return fallback;
    },
    generateMoodFallback(score, tags) {
      const fallback = generateMoodFallbackInsights(score, tags);
      updateProgressiveState({ mood: fallback });
      return fallback;
    },
  };
};

export default createAiAnalysisSlice;
