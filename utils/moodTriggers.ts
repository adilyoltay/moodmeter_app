export type TriggerOption = {
  id: string;
  label: string;
  icon: string;
  synonyms: string[];
};

const normalize = (text: string) =>
  text
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const TRIGGER_OPTIONS: TriggerOption[] = [
  {
    id: 'work',
    label: 'İş',
    icon: 'briefcase-outline',
    synonyms: ['iş', 'okul', 'çalışma', 'işyeri', 'kariyer', 'project'],
  },
  {
    id: 'relationship',
    label: 'İlişki',
    icon: 'heart-outline',
    synonyms: ['ilişki', 'partner', 'eş', 'sevgili', 'relationship'],
  },
  {
    id: 'family',
    label: 'Aile',
    icon: 'home-heart',
    synonyms: ['aile', 'anne', 'baba', 'kardeş', 'family'],
  },
  {
    id: 'health',
    label: 'Sağlık',
    icon: 'medical-bag',
    synonyms: ['sağlık', 'hastalık', 'doktor', 'health'],
  },
  {
    id: 'financial',
    label: 'Finans',
    icon: 'cash-multiple',
    synonyms: ['para', 'finans', 'ekonomi', 'maaş', 'borç'],
  },
  {
    id: 'sleep',
    label: 'Uyku',
    icon: 'moon-waning-crescent',
    synonyms: ['uyku', 'uykusuz', 'yorgun', 'sleep'],
  },
  {
    id: 'social',
    label: 'Sosyal',
    icon: 'account-group-outline',
    synonyms: ['arkadaş', 'sosyal', 'toplum', 'friend'],
  },
  {
    id: 'exercise',
    label: 'Egzersiz',
    icon: 'run',
    synonyms: ['egzersiz', 'spor', 'antrenman', 'exercise'],
  },
  {
    id: 'other',
    label: 'Diğer',
    icon: 'dots-horizontal-circle-outline',
    synonyms: ['diğer', 'other', 'farklı'],
  },
];

const ID_TO_LABEL = new Map(TRIGGER_OPTIONS.map((option) => [option.id, option.label] as const));

/**
 * Kullanıcıya gösterilecek lokalize tetikleyici etiketlerini üretir.
 */
export const mapTriggerIdsToLabels = (ids: string[], options: TriggerOption[] = TRIGGER_OPTIONS): string[] => {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const lookup = options === TRIGGER_OPTIONS ? ID_TO_LABEL : new Map(options.map((option) => [option.id, option.label] as const));

  return ids
    .map((id) => lookup.get(id) ?? id)
    .filter((label): label is string => typeof label === 'string' && label.trim().length > 0);
};

const SYNONYM_TO_ID = (() => {
  const map = new Map<string, string>();
  TRIGGER_OPTIONS.forEach((option) => {
    map.set(normalize(option.id), option.id);
    map.set(normalize(option.label), option.id);
    option.synonyms.forEach((syn) => {
      map.set(normalize(syn), option.id);
    });
  });
  return map;
})();

/**
 * Sesli analizden gelen serbest metin tetikleyici değerlerini güvenilir ID'lere çevirir.
 */
export const mapTriggerTokensToIds = (tokens: string[]): string[] => {
  if (!Array.isArray(tokens) || tokens.length === 0) return [];
  const ids = new Set<string>();
  tokens.forEach((token) => {
    if (!token) return;
    const normalized = normalize(token.trim());
    if (!normalized) return;
    const direct = SYNONYM_TO_ID.get(normalized);
    if (direct) ids.add(direct);

    const parts = normalized.split(/[^a-z0-9ğüşöçıİ]+/i).filter(Boolean);
    parts.forEach((part) => {
      const matched = SYNONYM_TO_ID.get(part);
      if (matched) {
        ids.add(matched);
      }
    });

    SYNONYM_TO_ID.forEach((id, key) => {
      if (key.length > 2 && normalized.includes(key)) {
        ids.add(id);
      }
    });
  });
  return Array.from(ids);
};

export const normalizeTriggerToken = normalize;
