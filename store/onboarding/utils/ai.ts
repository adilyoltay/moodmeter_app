import type { MotivationKey, OnboardingPayload } from '@/features/onboarding/types';

const MOTIVATION_MESSAGES: Record<string, string> = {
  stress_reduction:
    'Stress yönetimi konusunda odaklanmak istiyorsun. Günlük nefes egzersizleri sana yardımcı olacak.',
  mental_clarity:
    'Zihinsel netlik arayışındasın. Düzenli mood takibi düşüncelerini organize etmene yardımcı olabilir.',
  emotional_regulation:
    'Duygu düzenleme becerilerin geliştirmek istiyorsun. Günlük mood kayıtları bu süreçte önemli.',
  anxiety_management:
    'Kaygı yönetimi önceliğin. Nefes teknikleri ve mindfulness pratikleri etkili olacak.',
  habit_tracking:
    'Olumlu alışkanlıklar oluşturmak istiyorsun. Küçük, tutarlı adımlarla başlayalım.',
  self_awareness:
    'Kendini tanıma yolculuğundasın. Mood takibi öz-farkındalığını artıracak.',
  goal_achievement:
    'Hedeflerine ulaşmak için motivasyon arıyorsun. Günlük takip ilerleme görmeni sağlayacak.',
  better_relationships:
    'İlişkilerini iyileştirmek istiyorsun. Duygusal farkındalık bu konuda önemli.',
  therapy_report:
    'Terapi ilerlemeni kayıt altına almak için doğru yerdesin. Düzenli raporlamayla gelişimini göreceksin.',
};

const motivationalInsight = (motivation: MotivationKey): string =>
  MOTIVATION_MESSAGES[motivation] ?? `${motivation} konusunda hedeflerin var ve bu olumlu bir başlangıç.`;

const moodBaselineInsight = (score?: 1 | 2 | 3 | 4 | 5): string => {
  if (typeof score !== 'number') {
    return 'Ruh halini takip etmeye başladın, bu önemli bir adım.';
  }

  if (score >= 4) {
    return `Başlangıç mood seviyeniz oldukça iyi (${score}/5). Bu pozitif enerjiyi korumaya odaklanabilirsin.`;
  }

  if (score <= 2) {
    return `Başlangıç mood seviyeniz düşük (${score}/5). Bu sadece bir başlangıç noktası - zamanla iyileşecek.`;
  }

  return `Orta seviye mood (${score}/5) ile başlıyorsun. Günlük takiple daha iyi anlayacaksın.`;
};

const lifestyleInsights = (payload: OnboardingPayload): string[] => {
  const insights: string[] = [];
  const lifestyle = payload.lifestyle;

  if (!lifestyle) return insights;

  if (lifestyle.exercise) {
    if (lifestyle.exercise === 'regular') {
      insights.push('Düzenli egzersiz alışkanlığın mood stabiliten için mükemmel bir temel.');
    } else if (lifestyle.exercise === 'light') {
      insights.push('Hafif egzersiz rutinin iyi. Mood takibi ile egzersiz-ruh hali bağlantısını keşfedeceksin.');
    } else {
      insights.push('Egzersizin mood üzerindeki etkisini takip ederek motivasyonunu artırabilirsin.');
    }
  }

  if (typeof lifestyle.sleep_hours === 'number') {
    if (lifestyle.sleep_hours < 6) {
      insights.push('Uyku süresi mood için kritik. Daha fazla uyumaya odaklanmak ruh halini iyileştirebilir.');
    } else if (lifestyle.sleep_hours >= 7) {
      insights.push('Yeterli uyku süresi mood stabiliteni destekliyor. Bu sağlıklı alışkanlığını koru.');
    }
  }

  if (lifestyle.social) {
    if (lifestyle.social === 'high') {
      insights.push('Sosyal destek ağın güçlü görünüyor. Bunu bir kaynak olarak kullanabilirsin.');
    } else if (lifestyle.social === 'low') {
      insights.push('Sosyal etkileşimlerini artırmak mood stabiliteni destekleyebilir.');
    }
  }

  return insights;
};

export const generateMotivationFallback = (motivations: MotivationKey[] = []): string[] =>
  motivations.length ? motivations.map(motivationalInsight) : ['MoodMeter yolculuğuna başladığın için tebrikler!'];

export const generateMoodFallback = (score?: 1 | 2 | 3 | 4 | 5): string => moodBaselineInsight(score);

export const generateFallbackProfile = (
  payload: OnboardingPayload,
  progressiveInsights: Record<string, unknown>,
  userId: string,
) => {
  const motivationInsightTexts = generateMotivationFallback(payload.motivation);
  const moodBaseline = generateMoodFallback(payload.first_mood?.score);
  const lifestyleInsightTexts = lifestyleInsights(payload);

  const insights: string[] = [
    ...motivationInsightTexts,
    moodBaseline,
    ...lifestyleInsightTexts,
  ];

  const patterns = Array.isArray(progressiveInsights?.patterns)
    ? (progressiveInsights.patterns as string[])
    : [];

  return {
    insights,
    patterns,
    baseline: {
      personalizedGoals: [
        'Mood takibine başla',
        'Düzenli kayıt yap',
        'Değişimleri gözlemle',
      ],
    },
    generatedAt: new Date().toISOString(),
    source: 'fallback_profile',
    profileVersion: '2.0-fallback',
    userId,
  };
};
