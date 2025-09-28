import { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';

import { ComponentErrorBoundary } from '@/components/error';
import ConflictNotificationBanner from '@/components/ui/ConflictNotificationBanner';
import { GlobalLoading } from '@/components/ui/GlobalLoading';
import { SyncStatusNotification } from '@/components/ui/SyncStatusNotification';
import { AccentColorProvider } from '@/contexts/AccentColorContext';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ThemeProvider as AppThemeProvider } from '@/contexts/ThemeContext';
import { queryClient } from '@/lib/queryClient';

type AppProvidersChildren = ReactNode | ((appContent: ReactNode) => ReactNode);

interface AppProvidersProps {
  children?: AppProvidersChildren;
}

/**
 * Centralized provider composition for app-wide contexts and global UI layers.
 */
export function AppProviders({ children }: AppProvidersProps) {
  const isRenderProp = typeof children === 'function';
  const renderedChildren = isRenderProp
    ? (children as (appContent: ReactNode) => ReactNode)(<Slot />)
    : children;

  return (
    <ComponentErrorBoundary componentName="AppProviders">
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <LoadingProvider>
            <NotificationProvider>
              <AuthProvider>
                <AccentColorProvider>
                  {/* 🚫 AIProvider - intentionally omitted (Hard Stop AI Cleanup) */}
                  <AppThemeProvider>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      {renderedChildren}
                      {!isRenderProp && <Slot />}
                      <ConflictNotificationBanner />
                      <SyncStatusNotification />
                      <GlobalLoading />
                      <Toast />
                    </GestureHandlerRootView>
                  </AppThemeProvider>
                </AccentColorProvider>
              </AuthProvider>
            </NotificationProvider>
          </LoadingProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ComponentErrorBoundary>
  );
}

export default AppProviders;
