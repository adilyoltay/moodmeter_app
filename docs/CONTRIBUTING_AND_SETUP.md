# 🤝 Contributing & Setup Guide

## Kurulum
1. Node 20 / PNPM veya NPM
2. `cp .env.example .env` ve gerekli env değerlerini doldurun:
   - EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
   - EXPO_PUBLIC_GEMINI_API_KEY, EXPO_PUBLIC_GEMINI_MODEL
3. Bağımlılıklar: `npm i`
4. Geliştirme: `npm run start`

## Kod Standartları
- TypeScript strict, erken dönüşler, 2-3 seviye derinlik sınırı
- Yorumlar “neden”i açıklar; gereksiz yorum yok
- UI: erişilebilirlik propları (`accessibilityLabel`, `accessibilityRole`)
- Stil: `StyleSheet.create`

## Özellik Geliştirme
- Feature flags üzerinden koruma (aktif olmayanları render etme)
- Offline-first: önce AsyncStorage, sonra Supabase senkron
- Telemetry: `trackAIInteraction` ile enum’a uygun event’ler

## PR Süreci
- Küçük, odaklı PR’lar; anlamlı commit mesajları
- Lint/Type hatasız
- Gerekirse doküman güncellemesi ekleyin

## Güvenlik ve Gizlilik
- PII loglama yok; telemetry sanitize eder
- Kişisel veriler yalnız cihazda/şifreli aktarım

## Yardım
- Sorunlar için Issues açın
- Döngü: Repro → Log → Ekran görüntüsü → Versiyon bilgileri
