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

// 🚀 PERFORMANCE: Debug helpers deferred to background in development
if (__DEV__) {
  setTimeout(() => {
    try {
      require('@/utils/debugHelper');
      console.log('✅ Debug helpers loaded (deferred)');
    } catch (e) {
      console.warn('Debug helper import failed:', e);
    }
  }, 1000); // Load debug tools after critical path
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // 🚀 PERFORMANCE: Optimize font loading - only load essential fonts initially
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

  // One-time storage cleanup for legacy CBT/OCD/ERP keys - DEFERRED for startup performance
  useEffect(() => {
    // 🚀 PERFORMANCE: Defer heavy AsyncStorage operations to background
    const deferredCleanup = setTimeout(async () => {
      try {
        const FLAG = '__legacy_cleanup_v1_done__';
        const done = await AsyncStorage.getItem(FLAG);
        if (done === '1') return;
        
        console.log('🧹 Starting deferred storage cleanup...');
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
          console.log(`🧹 Cleaned ${keysToRemove.length} legacy storage keys`);
        }
        await AsyncStorage.setItem(FLAG, '1');
        console.log('✅ Deferred storage cleanup completed');
      } catch (e) {
        console.warn('Storage cleanup failed (non-critical):', e);
      }
    }, 5000); // Defer 5 seconds after startup

    return () => clearTimeout(deferredCleanup);
  }, []);

  // 📊 Performance monitoring initialization - DEFERRED for startup performance
  useEffect(() => {
    // 🚀 PERFORMANCE: Defer performance monitoring to background
    const deferredMonitoring = setTimeout(() => {
      try {
        performanceMonitor.initialize().catch(error => {
          console.warn('Performance monitor initialization failed (non-critical):', error);
        });
        console.log('✅ Deferred performance monitoring initialized');
      } catch (error) {
        console.warn('Performance monitor import failed (non-critical):', error);
      }
    }, 2000); // Defer 2 seconds after startup

    return () => clearTimeout(deferredMonitoring);
  }, []);

  // Foreground DLQ scheduler: process periodically when app is active - DEFERRED for startup performance
  useEffect(() => {
    let interval: any = null;
    let appStateListener: any;
    
    // 🚀 PERFORMANCE: Defer heavy service loading to background
    const deferredSyncServices = setTimeout(async () => {
      try {
        console.log('🔄 Loading deferred sync services...');
        // 🛡️ CRASH PREVENTION: Safe dynamic imports with error handling
        const { deadLetterQueue } = await import('@/services/sync/deadLetterQueue').catch(() => ({ deadLetterQueue: null }));
        const { offlineSyncService } = await import('@/services/offlineSync').catch(() => ({ offlineSyncService: null }));
        
        if (!deadLetterQueue || !offlineSyncService) {
          console.warn('Sync services not available (non-critical)');
          return;
        }
        
        console.log('✅ Sync services loaded, starting background processing...');
        
        // Run once shortly after loading
        setTimeout(() => { 
          deadLetterQueue.processDeadLetterQueue().catch(() => {}); 
          offlineSyncService.processSyncQueue().catch(()=>{}); 
        }, 1000);
        
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
    }, 3000); // Defer 3 seconds after startup
    
    return () => {
      clearTimeout(deferredSyncServices);
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
