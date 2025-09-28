import { trackAIInteraction, AIEventType, safeTrackAIInteraction } from '@/services/telemetry/noopTelemetry';

export const trackOnboardingPersistence = (event: string, extra?: Record<string, unknown>) => {
  if (typeof safeTrackAIInteraction === 'function') {
    safeTrackAIInteraction(AIEventType.SYSTEM_STATUS, {
      scope: 'onboarding_persistence',
      event,
      ...extra,
    });
  }
};

export const trackOnboardingCompletion = (extra?: Record<string, unknown>) => {
  trackAIInteraction(AIEventType.ONBOARDING_COMPLETED, {
    scope: 'onboarding_completion',
    ...extra,
  });
};

export const trackOnboardingAIMetric = (extra?: Record<string, unknown>) => {
  trackAIInteraction(AIEventType.SYSTEM_STATUS, {
    scope: 'onboarding_ai',
    ...extra,
  });
};

export const trackOnboardingEvent = (event: string, extra?: Record<string, unknown>) => {
  trackOnboardingPersistence(event, extra);
};
