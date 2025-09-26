# 🧠 MoodMeter - Mental Sağlık Takip Uygulaması

> **ObsessLess** - OKB ile yaşayan bireyler için dijital sığınak ve mental sağlık destek platformu

[![React Native](https://img.shields.io/badge/React%20Native-0.79.5-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-53.0.0-black.svg)](https://expo.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📱 Proje Hakkında

**MoodMeter**, Obsesif Kompulsif Bozukluk (OKB) ile yaşayan bireyler için özel olarak tasarlanmış, kapsamlı bir mental sağlık takip ve destek uygulamasıdır. Uygulama, kullanıcıların günlük ruh hallerini takip etmelerini, kompulsif davranışlarını yönetmelerini ve mental sağlıklarını iyileştirmelerine yardımcı olacak araçlar sunmaktadır.

### ✨ Ana Özellikler

- 📊 **Ruh Hali Takibi** - Günlük mood skorları ve analiz
- 🎯 **Kompulsiyon Yönetimi** - Davranış kalıplarını takip etme
- 🗣️ **Sesli Check-in** - AI destekli konuşma analizi
- 🫁 **Nefes Egzersizleri** - Rehberli mindfulness teknikleri
- 🧭 **CBT Araçları** - Bilişsel davranışçı terapi desteği
- 🏆 **Gamifikasyon** - Motivasyonu artıran ödül sistemi
- 🔒 **Gizlilik Odaklı** - End-to-end şifreleme ile veri güvenliği
- 🌍 **Çoklu Dil** - Türkçe ve İngilizce dil desteği

### 🎯 Hedef Kitle

- OKB ile mücadele eden bireyler
- Mental sağlık takibi yapmak isteyen kişiler
- Terapi sürecini desteklemek isteyen hastalar
- Mental sağlık profesyonelleri (veri analizi için)

## 🚀 Teknoloji Stack

### Frontend
- **React Native** `0.79.5` - Cross-platform mobile development
- **Expo** `53.0.0` - Development platform ve build tools
- **TypeScript** `5.8.3` - Type-safe JavaScript
- **React Native Reanimated** - Performanslı animasyonlar
- **Expo Router** - File-based navigation

### Backend & Database
- **Supabase** - PostgreSQL database + Auth + Real-time
- **Row Level Security (RLS)** - Veri güvenliği
- **Edge Functions** - Serverless API endpoints

### AI & Analytics
- **Google Gemini API** - Doğal dil işleme
- **On-device Processing** - Gizlilik odaklı AI analiz
- **TensorFlow Lite** - Mobil ML modelleri

### Kimlik Doğrulama
- **Supabase Auth** - Email/password authentication
- **Google OAuth** - Social login
- **Expo Local Authentication** - Biometric security

## 🛠️ Kurulum ve Geliştirme

### Gereksinimler

- **Node.js** >= 18.14.0
- **npm** veya **yarn**
- **Expo CLI**
- **iOS Simulator** (macOS) veya **Android Emulator**
- **Supabase Account**

### 1. Repository'yi Klonlayın

```bash
git clone https://github.com/adilyoltay/moodmeter_app.git
cd moodmeter_app
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Environment Variables

`.env.local` dosyası oluşturun:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google OAuth
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# Optional: AI Features
OPENAI_API_KEY=your_openai_api_key
```

### 4. Supabase Setup

1. [Supabase Dashboard](https://supabase.com/dashboard)'da yeni proje oluşturun
2. Database migrations'ları çalıştırın:
```bash
npx supabase db push
```

3. Google OAuth Provider'ı etkinleştirin
4. RLS policies'leri aktif edin

### 5. Uygulamayı Çalıştırın

```bash
# Development server'ı başlat
npx expo start

# iOS Simulator
npx expo run:ios

# Android Emulator
npx expo run:android
```

## 📁 Proje Yapısı

```
moodmeter_app/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main app tabs
│   └── _layout.tsx        # Root layout
├── components/            # React components
│   ├── ui/               # UI components
│   ├── mood/             # Mood tracking components
│   └── breathwork/       # Breathwork components
├── contexts/             # React contexts
├── hooks/                # Custom hooks
├── services/             # API services
│   ├── supabase/         # Supabase services
│   ├── ai/              # AI services
│   └── sync/            # Data synchronization
├── store/                # State management (Zustand)
├── utils/                # Utility functions
├── types/                # TypeScript definitions
└── supabase/             # Database schema & functions
    ├── migrations/       # SQL migrations
    └── functions/        # Edge functions
```

## 🔧 Geliştirme Komutları

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Testing
npm run test

# Build for production
npx expo build

# Database migrations
npx supabase db push

# Generate TypeScript types from database
npx supabase gen types typescript
```

## 🏗️ Database Schema

Ana veritabanı tabloları:

- `users` - Kullanıcı profilleri
- `mood_entries` - Günlük ruh hali kayıtları
- `compulsion_records` - Kompulsif davranış kayıtları
- `voice_sessions` - Sesli check-in oturumları
- `breath_sessions` - Nefes egzersizi oturumları
- `thought_records` - CBT düşünce kayıtları
- `gamification_profiles` - Kullanıcı ödül/seviye bilgileri

## 🔒 Güvenlik & Gizlilik

- **End-to-End Şifreleme** - Hassas veriler şifrelenerek saklanır
- **Row Level Security** - Kullanıcı verilerine yalnızca kendisi erişebilir
- **On-Device Processing** - AI analizler mümkün olan durumlarda cihazda yapılır
- **GDPR Compliant** - Avrupa veri koruma standartlarına uygun
- **No Data Selling** - Kullanıcı verileri asla üçüncü taraflara satılmaz

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Branch'i push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 📞 İletişim & Destek

- **Geliştirici:** Adil Yoltay
- **GitHub:** [@adilyoltay](https://github.com/adilyoltay)
- **Proje Repository:** [moodmeter_app](https://github.com/adilyoltay/moodmeter_app)

## 🙏 Teşekkürler

- [Supabase](https://supabase.com/) - Backend altyapısı
- [Expo](https://expo.dev/) - Development platform
- [React Native Community](https://reactnative.dev/) - Açık kaynak katkıları
- Mental sağlık alanındaki tüm araştırmacılar ve terapistler

---

<p align="center">
  <strong>Mental sağlık, bir yolculuktur. Bu yolculukta yalnız değilsiniz. 💚</strong>
</p>