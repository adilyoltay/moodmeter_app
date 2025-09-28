import type { HealthPermissionState, MotivationKey, OnboardingPayload } from '@/features/onboarding/types';

export const createInitialOnboardingPayload = (): OnboardingPayload => ({
  motivation: [],
  health: { status: 'not_requested' as HealthPermissionState },
  meta: { version: 1, created_at: new Date().toISOString() },
});

export type ReminderInput = OnboardingPayload['reminders'];

export const normalizeReminderUpdate = (
  previous: ReminderInput | undefined,
  incoming: ReminderInput | undefined,
): ReminderInput | undefined => {
  if (!incoming) return previous;

  const next = { ...(previous ?? {}), ...incoming } as ReminderInput;
  next.enabled = !!incoming.enabled;

  if (typeof incoming.time !== 'undefined') {
    next.time = incoming.time;
  }

  if (typeof incoming.days !== 'undefined') {
    next.days = incoming.days;
  }

  if (typeof incoming.timezone !== 'undefined') {
    next.timezone = incoming.timezone;
  }

  if (typeof incoming.permissionStatus !== 'undefined') {
    next.permissionStatus = incoming.permissionStatus;
  } else if (previous?.permissionStatus && typeof next.permissionStatus === 'undefined') {
    next.permissionStatus = previous.permissionStatus;
  }

  if (next.permissionStatus === 'denied') {
    next.enabled = false;
  }

  return next;
};

export const shouldQueueMotivationAnalysis = (motivations: MotivationKey[] | undefined) =>
  Array.isArray(motivations) && motivations.length > 0;

export const shouldQueueMoodAnalysis = (score?: 1 | 2 | 3 | 4 | 5) => typeof score === 'number';
