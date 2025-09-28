import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MoodMeterColors, Spacing } from '@/constants/DesignSystem';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

/**
 * 🎨 MoodMeter Modern Splash Screen
 * 
 * Sakinlik ve mental sağlık temasına uygun, yumuşak animasyonlarla
 * tasarlanmış modern splash screen bileşeni.
 */
export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringScale1 = useRef(new Animated.Value(0.8)).current;
  const ringScale2 = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Ana animasyon sekansı
    const startAnimation = () => {
      // Logo giriş animasyonu
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      // Metin giriş animasyonu (logo sonrası)
      setTimeout(() => {
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 400);

      // Sürekli animasyonlar
      startContinuousAnimations();

      // Animasyon tamamlandığında callback çağır
      setTimeout(() => {
        onAnimationComplete?.();
      }, 2500);
    };

    startAnimation();
  }, []);

  const startContinuousAnimations = () => {
    // Logo nabız animasyonu
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Halka animasyonları
    Animated.loop(
      Animated.timing(ringScale1, {
        toValue: 1.2,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(ringScale2, {
        toValue: 1.4,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  };

  return (
    <View style={styles.container}>
      {/* Gradient Arka Plan */}
      <LinearGradient
        colors={['#F0FDF4', '#ECFDF5', '#F9FAFB']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Animasyonlu Halkalar */}
      <Animated.View
        style={[
          styles.ring,
          styles.ring1,
          {
            transform: [{ scale: ringScale1 }],
            opacity: logoOpacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          styles.ring2,
          {
            transform: [{ scale: ringScale2 }],
            opacity: logoOpacity,
          },
        ]}
      />

      {/* Ana İçerik Konteyneri */}
      <View style={styles.content}>
        {/* Logo Bölgesi */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: Animated.multiply(logoScale, pulseAnim) }],
              opacity: logoOpacity,
            },
          ]}
        >
          <View style={styles.logoBackground}>
            {/* Mood Meter İkonu */}
            <View style={styles.iconContainer}>
              <View style={[styles.moodDot, styles.dot1]} />
              <View style={[styles.moodDot, styles.dot2]} />
              <View style={[styles.moodDot, styles.dot3]} />
              <View style={styles.centerPulse} />
            </View>
          </View>
        </Animated.View>

        {/* Uygulama Adı ve Tagline */}
        <Animated.View
          style={[
            styles.textContainer,
            { opacity: textOpacity },
          ]}
        >
          <Text style={styles.appName}>MoodMeter</Text>
          <Text style={styles.tagline}>Ruh halinizi takip edin</Text>
        </Animated.View>

        {/* Yükleme İndikatörü */}
        <Animated.View
          style={[
            styles.loadingContainer,
            { opacity: textOpacity },
          ]}
        >
          <LoadingDots />
        </Animated.View>
      </View>
    </View>
  );
}

/**
 * Animasyonlu yükleme noktaları bileşeni
 */
function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDots = () => {
      const dotAnimation = (dot: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        );

      setTimeout(() => dotAnimation(dot1, 0).start(), 0);
      setTimeout(() => dotAnimation(dot2, 0).start(), 200);
      setTimeout(() => dotAnimation(dot3, 0).start(), 400);
    };

    animateDots();
  }, []);

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, { opacity: dot1 }]} />
      <Animated.View style={[styles.dot, { opacity: dot2 }]} />
      <Animated.View style={[styles.dot, { opacity: dot3 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 1000,
    borderWidth: 1,
  },
  ring1: {
    width: 300,
    height: 300,
    borderColor: `${MoodMeterColors.primary}20`,
    backgroundColor: `${MoodMeterColors.primary}05`,
  },
  ring2: {
    width: 200,
    height: 200,
    borderColor: `${MoodMeterColors.primary}15`,
    backgroundColor: `${MoodMeterColors.primary}03`,
  },
  logoContainer: {
    marginBottom: Spacing.xl,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: MoodMeterColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: MoodMeterColors.primary,
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.15,
    shadowRadius: 60,
    elevation: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodDot: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: MoodMeterColors.primary,
  },
  dot1: {
    width: 8,
    height: 8,
    top: 10,
    left: 15,
  },
  dot2: {
    width: 8,
    height: 8,
    top: 10,
    right: 15,
  },
  dot3: {
    width: 6,
    height: 6,
    bottom: 15,
    left: 27,
  },
  centerPulse: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: MoodMeterColors.primary,
    position: 'absolute',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: MoodMeterColors.darkerBg,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    color: MoodMeterColors.secondaryText,
    letterSpacing: 0.2,
  },
  loadingContainer: {
    marginTop: Spacing.lg,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: MoodMeterColors.primary,
    marginHorizontal: 4,
  },
});
