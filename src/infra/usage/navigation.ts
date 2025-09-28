/**
 * 🧭 Navigation Tracking for Usage Audit
 * 
 * Tracks screen navigation events to identify
 * which screens are actually visited in real usage.
 */

import { NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import { trackScreen } from './index';

/**
 * Create navigation state change handler
 */
export const createNavStateChangeHandler = (ref: NavigationContainerRef<ParamListBase>) => () => {
  try {
    const route = ref.getCurrentRoute();
    if (route?.name) {
      trackScreen(route.name);
    }
  } catch (error) {
    console.warn('🔍 Navigation tracking failed:', error);
  }
};

/**
 * Track manual navigation events (for programmatic navigation)
 */
export const trackNavigation = (screenName: string, params?: any) => {
  trackScreen(screenName);
};
