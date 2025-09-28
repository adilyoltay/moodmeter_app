import type { ExpoConfig } from 'expo/config'
import { loadAppConfig } from './configuration/appConfig'

// Opsiyonel: .env.local yüklemeye çalış (yoksa sessizce geç)
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config({ path: '.env.local' })
} catch {}

const appConfig = loadAppConfig()

const config: ExpoConfig = {
  name: 'MoodMeter',
  slug: 'moodmeter',
  version: '3.0.1',
  sdkVersion: '53.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-screen.png',
    resizeMode: 'cover',
    backgroundColor: '#F9FAFB',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.adilyoltay.moodmeter',
    infoPlist: {
      // Allow local dev server asset loading (HTTP) for TFLite during development
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
        NSAllowsArbitraryLoadsInWebContent: true,
        NSAllowsLocalNetworking: true,
        NSExceptionDomains: {
          // Allow Metro/IP-based dev servers (adjust if your IP changes)
          'localhost': {
            NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
            NSIncludesSubdomains: true,
          },
          '127.0.0.1': {
            NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
            NSIncludesSubdomains: true,
          },
          // Example LAN IP used by Expo/Metro; safe for development only
          '10.0.0.25': {
            NSTemporaryExceptionAllowsInsecureHTTPLoads: true,
            NSIncludesSubdomains: true,
          },
        },
      },
      NSMicrophoneUsageDescription:
        'Sesli check-in ve nefes egzersizleri için mikrofon erişimine ihtiyaç duyuyoruz. Erişim yalnızca sizin başlatmanızla kullanılır.',
      NSSpeechRecognitionUsageDescription:
        'Sesli check-in sırasında konuşmanızı cihaz üzerinde yazıya dönüştürmek için konuşma tanıma iznine ihtiyaç duyuyoruz. Veriler gizlilik odaklı işlenir.',
      NSHealthShareUsageDescription:
        'Apple Health verilerinizi (HR/HRV, adım, uyku vb.) yalnızca cihaz içinde işleyerek ruh hali ve stres tahmini yapmak için okuruz. Veriler cihaz dışına gönderilmez.',
      NSHealthUpdateUsageDescription:
        'Apple Health verilerini güncelleme izni, gerekli olduğu durumlarda sağlık verilerinizi senkronize etmek için istenir.',
    },
    entitlements: {
      'com.apple.developer.healthkit': true,
    },
  },
  scheme: 'moodmeter',
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.adilyoltay.moodmeter',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  // Ensure assets like .tflite are bundled in release builds
  assetBundlePatterns: ['**/*'],
  plugins: [
    'expo-secure-store',
    'expo-localization',
    'expo-font',
    'expo-router',
    // HealthKit entitlements & ayarlar - geçici olarak devre dışı
    // '@kingstinct/react-native-healthkit',
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '15.1',
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: '1e0473f8-f317-4813-9b20-4dbe892e3153',
    },
    appConfig,
  },
}

export default config
