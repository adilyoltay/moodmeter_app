export interface MoodInsightEntry {
  mood_score: number;
  triggers?: string[] | null;
  activities?: string[] | null;
  notes?: string | null;
  timestamp?: string;
}

export interface DominantTriggerInsight {
  trigger: string;
  count: number;
  percentage: number;
}

export interface ActivityMoodInsight {
  activity: string;
  averageMood: number;
  moodDelta: number;
  count: number;
}

export interface KeywordInsight {
  word: string;
  count: number;
}

export interface MoodInsightsSummary {
  triggers: DominantTriggerInsight[];
  bestActivity?: ActivityMoodInsight;
  challengingActivity?: ActivityMoodInsight;
  keyword?: KeywordInsight;
}

const TURKISH_STOP_WORDS = [
  've', 'veya', 'ama', 'fakat', 'ancak', 'de', 'da', 'ki', 'mi', 'mı', 'mu', 'mü',
  'bir', 'bu', 'şu', 'o', 'çok', 'daha', 'ile', 'için', 'gibi', 'hem', 'ya', 'diye',
  'ben', 'sen', 'biz', 'siz', 'onlar', 'biraz', 'artık', 'başka', 'olan', 'olanlar',
  'sanki', 'neden', 'niye', 'nasıl', 'hangi', 'her', 'birkaç', 'böyle', 'şimdi', 'hala',
  'lütfen', 'tekrar', 'bazen', 'hep', 'hiç', 'sadece', 'kadar'
];

const ENGLISH_STOP_WORDS = [
  'and', 'or', 'but', 'so', 'because', 'also', 'very', 'more', 'most', 'just', 'only',
  'with', 'about', 'into', 'onto', 'after', 'before', 'when', 'where', 'what', 'which',
  'who', 'why', 'how', 'this', 'that', 'these', 'those', 'there', 'here', 'them', 'they',
  'their', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
  'has', 'had', 'do', 'does', 'did', 'doing', 'can', 'could', 'should', 'would', 'will',
  'shall', 'may', 'might', 'than', 'then', 'too', 'also', 'still', 'again'
];

const STOP_WORDS = new Set<string>([...TURKISH_STOP_WORDS, ...ENGLISH_STOP_WORDS]);

const MIN_WORD_LENGTH = 3;

export const normalizeWord = (input: string): string => {
  const lower = input.toLocaleLowerCase('tr-TR');
  const withoutDiacritics = lower.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return withoutDiacritics.replace(/[^a-z0-9çğıöşü]/gu, '');
};

export const extractTokens = (notes: string): string[] => {
  return notes
    .split(/\s+/)
    .map(normalizeWord)
    .filter((token) => token.length >= MIN_WORD_LENGTH && !STOP_WORDS.has(token));
};

export const getDominantTriggers = (entries: MoodInsightEntry[], limit = 3): DominantTriggerInsight[] => {
  const counts = new Map<string, number>();
  let total = 0;

  entries.forEach((entry) => {
    (entry.triggers || [])
      .filter(Boolean)
      .map((trigger) => String(trigger).trim())
      .filter((trigger) => trigger.length > 0)
      .forEach((trigger) => {
        total += 1;
        counts.set(trigger, (counts.get(trigger) || 0) + 1);
      });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([trigger, count]) => ({
      trigger,
      count,
      percentage: total ? Math.round((count / total) * 100) : 0,
    }));
};

export const getActivityMoodInsights = (entries: MoodInsightEntry[]): {
  best?: ActivityMoodInsight;
  challenging?: ActivityMoodInsight;
} => {
  const activityMoodTotals = new Map<string, { totalMood: number; count: number }>();

  entries.forEach((entry) => {
    if (!Array.isArray(entry.activities) || entry.activities.length === 0) return;
    entry.activities
      .filter(Boolean)
      .map((activity) => String(activity).trim())
      .filter((activity) => activity.length > 0)
      .forEach((activity) => {
        const bucket = activityMoodTotals.get(activity) || { totalMood: 0, count: 0 };
        bucket.totalMood += entry.mood_score;
        bucket.count += 1;
        activityMoodTotals.set(activity, bucket);
      });
  });

  if (activityMoodTotals.size === 0) {
    return {};
  }

  const overallAverage = (() => {
    let totalMood = 0;
    let totalCount = 0;
    activityMoodTotals.forEach((value) => {
      totalMood += value.totalMood;
      totalCount += value.count;
    });
    return totalCount ? totalMood / totalCount : 0;
  })();

  const insights: ActivityMoodInsight[] = Array.from(activityMoodTotals.entries()).map(([activity, value]) => {
    const averageMood = value.totalMood / Math.max(1, value.count);
    return {
      activity,
      averageMood,
      moodDelta: averageMood - overallAverage,
      count: value.count,
    };
  });

  const best = insights
    .filter((insight) => insight.count >= 2)
    .sort((a, b) => b.moodDelta - a.moodDelta)[0];

  const challenging = insights
    .filter((insight) => insight.count >= 2)
    .sort((a, b) => a.moodDelta - b.moodDelta)[0];

  return { best, challenging };
};

export const getKeywordInsight = (entries: MoodInsightEntry[]): KeywordInsight | undefined => {
  const frequency = new Map<string, number>();

  entries.forEach((entry) => {
    if (!entry.notes) return;
    extractTokens(entry.notes)
      .filter((token) => token.length >= MIN_WORD_LENGTH)
      .forEach((token) => {
        frequency.set(token, (frequency.get(token) || 0) + 1);
      });
  });

  if (frequency.size === 0) return undefined;

  const [word, count] = Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])[0];

  return { word, count };
};

export const buildMoodInsights = (entries: MoodInsightEntry[]): MoodInsightsSummary => {
  const triggers = getDominantTriggers(entries);
  const { best: bestActivity, challenging: challengingActivity } = getActivityMoodInsights(entries);
  const keyword = getKeywordInsight(entries);

  return {
    triggers,
    bestActivity,
    challengingActivity,
    keyword,
  };
};

export default buildMoodInsights;
