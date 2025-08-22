import type { AIMessage, ConversationContext } from '@/features/ai/types';

type Lang = 'tr' | 'en';
type Scenario = 'anxiety' | 'sleep' | 'generic';

const TEMPLATES: Record<Lang, Record<Scenario, string>> = {
  tr: {
    anxiety: 'Şu an zor bir an olabilir. Beraber kısa bir nefes çalışması yapalım: 4 saniye al, 4 saniye tut, 6 saniye ver. Hazır olduğunda düşünceni günlüğe not edebilirsin.',
    sleep: 'Dinlenmekte zorlanıyorsan, ekran parlaklığını azalt ve 4-7-8 nefes tekniğini dene. Kısa bir gevşeme ile uykuya hazırlanabiliriz.',
    erp: 'Terapi hedefin için küçük bir adım seç: 1) Tetikleyiciyi tanımla, 2) 2-3 dakika maruz kal, 3) Ritüeli ertele. Hazır olduğunda deneyimini not et.',
    generic: 'Şu an dış servisler yanıt veremiyor ama beraberiz. Kısa bir nefes egzersizi deneyelim: 4-4-6. İstersen günlüğe kısa bir not ekleyebilirsin.'
  },
  en: {
    anxiety: "This might be a hard moment. Let's try a short breathing: inhale 4s, hold 4s, exhale 6s. When ready, jot a quick note in your journal.",
    sleep: 'If sleep is difficult, dim your screen and try 4-7-8 breathing. A short relaxation can help prepare for rest.',
    erp: 'For Terapi, pick a tiny step: 1) define the trigger, 2) expose for 2–3 minutes, 3) delay rituals. When ready, note your experience.',
    generic: "External AI is unavailable for now, but I'm here. Try 4-4-6 breathing. You can also add a short journal note."
  }
};

export function detectScenario(messages: AIMessage[] = []): Scenario {
  const lastUser = (messages || []).filter(m => m.role === 'user').slice(-1)[0];
  const raw = (lastUser?.content || '').toLowerCase();
  if (/panik|kayg|endişe|anx/i.test(raw)) return 'anxiety';
  if (/uyku|gece|sleep/i.test(raw)) return 'sleep';
  if (/erp|maruz|exposure/i.test(raw)) return 'erp';
  return 'generic';
}

export function detectLanguage(context?: ConversationContext): Lang {
  const pref = (context as any)?.therapeuticProfile?.preferredLanguage?.toLowerCase?.();
  return pref === 'en' ? 'en' : 'tr';
}

export function getHeuristicText(messages: AIMessage[] = [], context?: ConversationContext): string {
  const lang = detectLanguage(context);
  const scenario = detectScenario(messages);
  return TEMPLATES[lang][scenario];
}


