import {
  buildMoodInsights,
  extractTokens,
  getActivityMoodInsights,
  getDominantTriggers,
  getKeywordInsight,
  MoodInsightEntry,
} from '@/utils/moodInsights';

const makeEntry = (overrides: Partial<MoodInsightEntry>): MoodInsightEntry => ({
  mood_score: 60,
  triggers: [],
  activities: [],
  notes: '',
  ...overrides,
});

describe('moodInsights utilities', () => {
  it('extractTokens filters stop words and punctuation', () => {
    const tokens = extractTokens('Bugün ve yarın enerji doluyum, meditasyon harika!');
    expect(tokens).toEqual(expect.arrayContaining(['bugun', 'yarin', 'enerji', 'doluyum', 'meditasyon', 'harika']));
    expect(tokens).not.toContain('ve');
  });

  it('getDominantTriggers returns top triggers with percentages', () => {
    const entries: MoodInsightEntry[] = [
      makeEntry({ triggers: ['İş', 'Sağlık'], mood_score: 70 }),
      makeEntry({ triggers: ['İş'], mood_score: 65 }),
      makeEntry({ triggers: ['Aile'], mood_score: 55 }),
    ];

    const result = getDominantTriggers(entries, 2);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ trigger: 'İş', count: 2 });
    expect(result[0].percentage).toBe(50);
  });

  it('getActivityMoodInsights computes best and challenging activities', () => {
    const entries: MoodInsightEntry[] = [
      makeEntry({ mood_score: 80, activities: ['Meditasyon'] }),
      makeEntry({ mood_score: 78, activities: ['Meditasyon'] }),
      makeEntry({ mood_score: 50, activities: ['Gece Çalışması'] }),
      makeEntry({ mood_score: 52, activities: ['Gece Çalışması'] }),
      makeEntry({ mood_score: 65, activities: ['Yürüyüş'] }),
    ];

    const { best, challenging } = getActivityMoodInsights(entries);

    expect(best).toBeDefined();
    expect(best?.activity).toBe('Meditasyon');
    expect(best?.moodDelta).toBeGreaterThan(0);

    expect(challenging).toBeDefined();
    expect(challenging?.activity).toBe('Gece Çalışması');
    expect(challenging?.moodDelta).toBeLessThan(0);
  });

  it('getKeywordInsight picks the most frequent keyword', () => {
    const entries: MoodInsightEntry[] = [
      makeEntry({ notes: 'Bugün meditasyon yaptım, meditasyon beni rahatlattı.' }),
      makeEntry({ notes: 'Kısa bir yürüyüş ve meditasyon seansı yaptım.' }),
    ];

    const keyword = getKeywordInsight(entries);
    expect(keyword).toEqual({ word: 'meditasyon', count: 3 });
  });

  it('buildMoodInsights returns combined summary', () => {
    const entries: MoodInsightEntry[] = [
      makeEntry({ mood_score: 85, triggers: ['İş'], activities: ['Meditasyon'], notes: 'Harika hissediyorum.' }),
      makeEntry({ mood_score: 40, triggers: ['İş', 'Uykusuzluk'], activities: ['Gece Çalışması'], notes: 'Yorgun ve stresliyim.' }),
      makeEntry({ mood_score: 70, triggers: ['Aile'], activities: ['Meditasyon'], notes: 'Meditasyon yine iyi geldi.' }),
    ];

    const summary = buildMoodInsights(entries);
    expect(summary.triggers.length).toBeGreaterThan(0);
    expect(summary.bestActivity?.activity).toBeDefined();
    expect(summary.keyword?.word).toBe('meditasyon');
  });
});
