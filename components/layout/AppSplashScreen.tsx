import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import SplashScreenComponent from '../SplashScreen';

interface AppSplashScreenProps {
  children: React.ReactNode;
  onReady?: () => void;
}

/**
 * 🎨 App Splash Screen Yöneticisi
 * 
 * Expo'nun native splash screen'ini ve özel React Native splash screen'imizi
 * koordine eden wrapper bileşeni.
 */
export default function AppSplashScreen({ children, onReady }: AppSplashScreenProps) {
  const [isAppReady, setIsAppReady] = useState(false);
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  useEffect(() => {
    // Expo splash screen'ini göster
    SplashScreen.preventAutoHideAsync();

    // Uygulama hazır olduğunda
    const prepareApp = async () => {
      try {
        // Burada uygulama başlatma işlemleri yapılabilir
        // Ör: font yükleme, initial data fetch, vb.
        
        // Simüle edilmiş yükleme süresi
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setIsAppReady(true);
      } catch (error) {
        console.error('App preparation error:', error);
        setIsAppReady(true);
      }
    };

    prepareApp();
  }, []);

  useEffect(() => {
    if (isAppReady) {
      // Expo splash screen'ini gizle
      SplashScreen.hideAsync();
    }
  }, [isAppReady]);

  const handleCustomSplashComplete = () => {
    setShowCustomSplash(false);
    onReady?.();
  };

  // Uygulama henüz hazır değilse loading göster
  if (!isAppReady) {
    return <View style={styles.loading} />;
  }

  // Özel splash screen göster
  if (showCustomSplash) {
    return (
      <SplashScreenComponent
        onAnimationComplete={handleCustomSplashComplete}
      />
    );
  }

  // Ana uygulama içeriğini göster
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});
