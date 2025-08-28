/**
 * Onboarding Sync Error Service Fallback - Phase 2
 */

export const onboardingSyncErrorService = {
  reportSyncError: async (error: any) => {
    // AI onboarding sync error service disabled
    console.warn('Onboarding sync error (AI disabled):', error);
  },
  
  trackSyncError: async (...args: any[]) => {
    // AI onboarding sync error tracking disabled
    console.warn('Onboarding sync error tracking (AI disabled):', args);
  }
};
