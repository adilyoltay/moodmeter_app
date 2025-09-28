import type { MotivationKey, OnboardingPayload } from '@/features/onboarding/types';

export const motivationInsightMap: Record<string, string> = {
  stress_reduction: 'Stress yönetimi konusunda odaklanmak istiyorsun. Günlük nefes egzersizleri sana yardımcı olacak.',
  mental_clarity: 'Zihinsel netlik arayışındasın. Düzenli mood takibi düşüncelerini organize etmene yardımcı olabilir.',
  emotional_regulation: 'Duygu düzenleme becerilerin geliştirmek istiyorsun. Günlük mood kayıtları bu süreçte önemli.',
  anxiety_management: 'Kaygı yönetimi önceliğin. Nefes teknikleri ve mindfulness pratikleri etkili olacak.',
  habit_formation: 'Olumlu alışkanlıklar oluşturmak istiyorsun. Küçük, tutarlı adımlarla başlayalım.',
};

export const generateMotivationFallbackInsights = (motivations: MotivationKey[]) => {
  const baseMap: Record<string, { goal: string; techniques: string[]; personalizedTip: string }> = {
    reduce_symptoms: {
      goal: 'Semptom azaltma odaklı yaklaşım',
      techniques: ['Progressive muscle relaxation', 'Mindful breathing', 'ERP exercises'],
      personalizedTip: 'Küçük adımlarla başla - her gün biraz daha fazla meydan oku',
    },
    improve_relationships: {
      goal: 'İlişkileri güçlendirme',
      techniques: ['Communication skills', 'Boundary setting', 'Social exposure'],
      personalizedTip: 'İlişkilerinde açık ve net iletişim kurmaya odaklan',
    },
    work_productivity: {
      goal: 'İş hayatında verimlilik',
      techniques: ['Time management', 'Priority setting', 'Workplace accommodations'],
      personalizedTip: 'Önceliklerini belirle ve küçük görevlere böl',
    },
    emotional_regulation: {
      goal: 'Duygu düzenleme becerisi',
      techniques: ['CBT techniques', 'Emotion tracking', 'Coping strategies'],
      personalizedTip: 'Duygularını gözlemle ve yargılamadan kabul et',
    },
    self_confidence: {
      goal: 'Özgüven artırma',
      techniques: ['Achievement tracking', 'Positive affirmations', 'Skill building'],
      personalizedTip: 'Küçük başarılarını kutla ve kaydını tut',
    },
  };

  const matched = motivations
    .map((key) => baseMap[key])
    .filter(Boolean) as Array<typeof baseMap[keyof typeof baseMap]>;

  return {
    insights: matched.map((insight) => ({
      type: 'motivation_analysis',
      title: insight.goal,
      description: insight.personalizedTip,
      actionable: true,
      confidence: 0.8,
    })),
    patterns: [
      {
        type: 'goal_pattern',
        title: `${motivations.length} temel motivasyon alanı tespit edildi`,
        description: 'Çok yönlü iyileşme yaklaşımı öneriliyor',
        actionable: true,
      },
    ],
    personalizedGoals: matched.map((insight) => insight.goal),
    generatedAt: new Date().toISOString(),
    source: 'intelligent_fallback',
  };
};

export const generateMoodFallbackInsights = (score: 1 | 2 | 3 | 4 | 5, tags?: string[]) => {
  const moodMap: Record<number, { level: string; focus: string; suggestion: string; priority: 'high' | 'medium' | 'low' }> = {
    1: {
      level: 'Çok Düşük',
      focus: 'Temel ihtiyaçlar ve güvenlik',
      suggestion: 'Önce kendini güvende hisset, küçük self-care aktivitelerine odaklan',
      priority: 'high',
    },
    2: {
      level: 'Düşük',
      focus: 'Duygusal destek ve stabil rutinler',
      suggestion: 'Günlük rutinlerini basitleştir ve destek sistemini güçlendir',
      priority: 'high',
    },
    3: {
      level: 'Orta',
      focus: 'Denge ve yapılandırılmış iyileşme',
      suggestion: 'Tedavi teknikleri ve kademeli ilerleme planı uygulamaya başla',
      priority: 'medium',
    },
    4: {
      level: 'İyi',
      focus: 'Beceri geliştirme ve ilerleme',
      suggestion: 'Mevcut başarılarını koruyarak yeni teknikleri dene',
      priority: 'medium',
    },
    5: {
      level: 'Çok İyi',
      focus: 'Sürdürülebilirlik ve uzun vadeli planlama',
      suggestion: 'Bu pozitif durumu koruyacak stratejiler geliştir',
      priority: 'low',
    },
  };

  const fallback = moodMap[score];

  return {
    insights: [
      {
        type: 'mood_baseline',
        title: `Başlangıç ruh hali: ${fallback.level}`,
        description: fallback.suggestion,
        actionable: true,
        confidence: 0.85,
        priority: fallback.priority,
        tags,
      },
    ],
    generatedAt: new Date().toISOString(),
    source: 'intelligent_fallback',
  };
};

export const generateFallbackProfile = (
  payload: OnboardingPayload,
  progressiveInsights: Record<string, any>,
  userId: string,
) => {
  try {
    console.log('🛡️ Generating intelligent fallback profile from onboarding data...');

    const motivationNarratives = payload.motivation?.map((motivation) => {
      const text = motivationInsightMap[motivation as MotivationKey];
      return text || `${motivation} konusunda hedeflerin var ve bu olumlu bir başlangıç.`;
    }) || ['MoodMeter yolculuğuna başladığın için tebrikler!'];

    let moodBaseline = 'Ruh halini takip etmeye başladın, bu önemli bir adım.';
    if (payload.first_mood?.score) {
      const score = payload.first_mood.score;
      if (score >= 4) {
        moodBaseline = `Başlangıç mood seviyeniz oldukça iyi (${score}/5). Bu pozitif enerjiyi korumaya odaklanabilirsin.`;
      } else if (score <= 2) {
        moodBaseline = `Başlangıç mood seviyeniz düşük (${score}/5). Bu sadece bir başlangıç noktası - zamanla iyileşecek.`;
      } else {
        moodBaseline = `Orta seviye mood (${score}/5) ile başlıyorsun. Günlük takiple daha iyi anlayacaksın.`;
      }
    }

    const lifestyleInsights: string[] = [];
    if (payload.lifestyle) {
      const { exercise, sleep_hours, social } = payload.lifestyle;
      if (exercise === 'regular') {
        lifestyleInsights.push('Düzenli egzersiz alışkanlığın mood stabiliten için mükemmel bir temel.');
      } else if (exercise === 'light') {
        lifestyleInsights.push('Hafif egzersiz rutinin iyi. Mood takibi ile egzersiz-ruh hali bağlantısını keşfedeceksin.');
      } else if (exercise) {
        lifestyleInsights.push('Egzersizin mood üzerindeki etkisini takip ederek motivasyonunu artırabilirsin.');
      }

      if (typeof sleep_hours === 'number') {
        if (sleep_hours < 6) {
          lifestyleInsights.push('Uyku süresi mood için kritik. Daha fazla uyumaya odaklanmak ruh halini iyileştirebilir.');
        } else if (sleep_hours >= 7) {
          lifestyleInsights.push('Yeterli uyku süresi mood stabiliteni destekliyor. Bu sağlıklı alışkanlığını koru.');
        }
      }

      if (social === 'low') {
        lifestyleInsights.push('Sosyal aktiviteler mood için önemli. Küçük sosyal etkileşimler bile fark yaratabilir.');
      } else if (social === 'high') {
        lifestyleInsights.push('Aktif sosyal hayatın mood dengen için harika bir kaynak.');
      }
    }

    const reminderInsights: string[] = [];
    if (payload.reminders?.enabled) {
      reminderInsights.push(`${payload.reminders.time || '09:00'} saatinde günlük mood kaydı için hatırlatıcı aktif. Tutarlılık başarının anahtarı.`);
    } else {
      reminderInsights.push('Mood takibini alışkanlık haline getirmek için kendi ritmini oluştur.');
    }

    const personalizedGoals = [
      'Haftada en az 5 mood kaydı yaparak ruh halindeki değişimleri fark et',
      'Mood seviyeni etkileyen faktörleri keşfet ve not al',
      ...motivationNarratives.slice(0, 1),
    ];

    return {
      insights: [
        ...motivationNarratives,
        moodBaseline,
        ...lifestyleInsights,
        ...reminderInsights,
        'Bu profil onboarding verilerinden oluşturuldu. Uygulamayı kullandıkça daha kişisel öneriler alacaksın.',
      ],
      patterns: [
        {
          type: 'onboarding_baseline',
          title: 'Başlangıç Profili',
          description: moodBaseline,
          confidence: 0.8,
          source: 'fallback_generator',
        },
      ],
      baseline: {
        motivationAnalysis: motivationNarratives,
        personalizedGoals,
        lifestyleFactors: lifestyleInsights,
      },
      generatedAt: new Date().toISOString(),
      source: 'intelligent_fallback',
      profileVersion: '2.0-fallback',
      dataPoints: {
        motivationCount: payload.motivation?.length || 0,
        hasMoodBaseline: !!payload.first_mood?.score,
        hasLifestyleData: !!payload.lifestyle,
        hasReminders: !!payload.reminders?.enabled,
        progressiveInsights: Object.keys(progressiveInsights).length,
        userId,
      },
      fallbackReason: 'AI analysis timeout/failure - generated from onboarding data',
    };
  } catch (error) {
    console.warn('⚠️ Fallback profile generation failed, using minimal profile:', error);

    return {
      insights: [
        'MoodMeter\'e hoş geldin! Mood takip yolculuğun başlıyor.',
        'Günlük mood kayıtları yaparak duygularını daha iyi anlayacaksın.',
        'Zamanla kişiselleştirilmiş öneriler almaya başlayacaksın.',
      ],
      patterns: [],
      baseline: {
        personalizedGoals: ['Mood takibine başla', 'Düzenli kayıt yap', 'Değişimleri gözlemle'],
      },
      generatedAt: new Date().toISOString(),
      source: 'minimal_fallback',
      profileVersion: '2.0-minimal',
      fallbackReason: 'Complete AI failure - minimal profile',
    };
  }
};
