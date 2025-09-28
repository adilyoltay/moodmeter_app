import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { AppState } from 'react-native';
import 'react-native-reanimated';
import 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NavigationGuard } from '@/components/navigation/NavigationGuard';
import AppSplashScreen from '@/components/layout/AppSplashScreen';
import AppProviders from '@/components/providers/AppProviders';
import { AppErrorBoundary } from '@/components/error';

// Performance monitoring
import performanceMonitor from '@/services/performanceMonitor';

// Import debug helpers in development
if (__DEV__) {
  try {
    require('@/utils/debugHelper');
  } catch (e) {
    console.warn('Debug helper import failed:', e);
  }
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });


  useEffect(() => {
    // Suppress noisy dev-only warning from RN internals/libraries
    try { LogBox.ignoreLogs([/useInsertionEffect must not schedule updates/i]); } catch {}

    if (loaded) {
      SplashScreen.hideAsync().catch(error => {
        console.warn('Splash screen hide failed:', error);
      });
    }
  }, [loaded]);

  // One-time storage cleanup for legacy CBT/OCD/ERP keys
  useEffect(() => {
    (async () => {
      try {
        const FLAG = '__legacy_cleanup_v1_done__';
        const done = await AsyncStorage.getItem(FLAG);
        if (done === '1') return;
        
        const allKeys = await AsyncStorage.getAllKeys();
        const shouldRemove = (key: string) => (
          key === 'compulsion_logs' ||
          key === 'ybocs_history' ||
          key === 'compulsionEntries' ||
          key.startsWith('therapy_sessions_') ||
          key.startsWith('erp_sessions_') ||
          key.startsWith('compulsions_') ||
          key.startsWith('last_compulsion_') ||
          key.startsWith('thought_records_') ||
          key.startsWith('thought_record_draft_') ||
          key.startsWith('ocd_profile_')
        );
        const keysToRemove = allKeys.filter(shouldRemove);
        if (keysToRemove.length > 0) {
          await AsyncStorage.multiRemove(keysToRemove);
        }
        await AsyncStorage.setItem(FLAG, '1');
      } catch (e) {
        console.warn('Storage cleanup failed (non-critical):', e);
      }
    })();
  }, []);

  // 📊 Performance monitoring initialization - CRASH PREVENTION
  useEffect(() => {
    try {
      performanceMonitor.initialize().catch(error => {
        console.warn('Performance monitor initialization failed (non-critical):', error);
      });
    } catch (error) {
      console.warn('Performance monitor import failed (non-critical):', error);
    }
  }, []);

  // Foreground DLQ scheduler: process periodically when app is active - CRASH PREVENTION
  useEffect(() => {
    let interval: any = null;
    let appStateListener: any;
    
    (async () => {
      try {
        // 🛡️ CRASH PREVENTION: Safe dynamic imports with error handling
        const { deadLetterQueue } = await import('@/services/sync/deadLetterQueue').catch(() => ({ deadLetterQueue: null }));
        const { offlineSyncService } = await import('@/services/offlineSync').catch(() => ({ offlineSyncService: null }));
        
        if (!deadLetterQueue || !offlineSyncService) {
          console.warn('Sync services not available (non-critical)');
          return;
        }
        
        // Run once shortly after startup with error handling
        setTimeout(() => { 
          deadLetterQueue.processDeadLetterQueue().catch(() => {}); 
          offlineSyncService.processSyncQueue().catch(()=>{}); 
        }, 3000);
        
        // Then run periodically with error handling
        interval = setInterval(() => {
          deadLetterQueue.processDeadLetterQueue().catch(() => {});
          offlineSyncService.processSyncQueue().catch(()=>{});
        }, 60000);
        
        // 🔄 App state management: sync on foreground, cleanup on background
        appStateListener = AppState.addEventListener('change', (state) => {
          if (state === 'active') {
            console.log('📱 App came to foreground - triggering sync');
            offlineSyncService.processSyncQueue().catch(()=>{});
            deadLetterQueue.processDeadLetterQueue().catch(()=>{});
          } else if (state === 'background' || state === 'inactive') {
            console.log('📱 App went to background - performing cleanup');
            // 🧹 CRITICAL FIX: Cleanup on background to prevent memory leaks
            try {
              import('@/services/crossDeviceSync').then(({ crossDeviceSync }) => {
                crossDeviceSync.cleanup();
              }).catch(() => {});
              
              console.log('✅ Background cleanup completed');
            } catch (cleanupError) {
              console.error('⚠️ Background cleanup failed (non-critical):', cleanupError);
            }
          }
        });
      } catch (error) {
        console.warn('Sync service initialization failed (non-critical):', error);
      }
    })();
    
    return () => {
      if (interval) clearInterval(interval);
      try { appStateListener?.remove?.(); } catch {}
      
      // 🧹 CRITICAL FIX: Final cleanup on app termination
      try {
        console.log('🧹 App unmounting - performing final service cleanup');
        import('@/services/offlineSync').then(({ offlineSyncService }) => {
          offlineSyncService.cleanup();
        }).catch(() => {});
        
        import('@/services/crossDeviceSync').then(({ crossDeviceSync }) => {
          crossDeviceSync.cleanup();
        }).catch(() => {});
        
        console.log('✅ Final service cleanup completed');
      } catch (cleanupError) {
        console.error('⚠️ Final cleanup failed (non-critical):', cleanupError);
      }
    };
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <AppProviders>
        {(appContent) => (
          <AppSplashScreen>
            <NavigationGuard>{appContent}</NavigationGuard>
          </AppSplashScreen>
        )}
      </AppProviders>
    </AppErrorBoundary>
  );
}
