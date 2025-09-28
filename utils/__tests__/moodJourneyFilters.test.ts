import {
  applyJourneyFilters,
  matchesActivity,
  matchesKeyword,
  matchesTrigger,
} from '@/utils/moodJourneyFilters';

const entry = (overrides: Partial<{ triggers: string[]; activities: string[]; notes: string }>) => ({
  mood_score: 60,
  energy_level: 6,
  anxiety_level: 4,
  triggers: overrides.triggers ?? [],
  activities: overrides.activities ?? [],
  notes: overrides.notes ?? '',
});

describe('moodJourneyFilters', () => {
  it('matches trigger ignoring case/spacing', () => {
    expect(matchesTrigger(entry({ triggers: ['İş'] }), 'iş')).toBe(true);
    expect(matchesTrigger(entry({ triggers: ['İş'] }), ' ilişki ')).toBe(false);
  });

  it('matches activity ignoring case/spacing', () => {
    expect(matchesActivity(entry({ activities: ['Yoga'] }), 'yoga')).toBe(true);
    expect(matchesActivity(entry({ activities: ['Yoga'] }), ' yürüyüş ')).toBe(false);
  });

  it('matches keyword inside notes', () => {
    expect(matchesKeyword(entry({ notes: 'Bugün işte yoğundum' }), 'iş')).toBe(true);
    expect(matchesKeyword(entry({ notes: 'Bugün işte yoğundum' }), 'spor')).toBe(false);
  });

  it('filters entries by provided options', () => {
    const entries = [
      entry({ triggers: ['İş'], activities: ['Yoga'], notes: 'İşte yoğundum' }),
      entry({ triggers: ['Aile'], activities: ['Yürüyüş'], notes: 'Aile ile vakit' }),
    ];

    const filtered = applyJourneyFilters(entries, { trigger: 'iş', activity: 'yoga', keyword: 'yoğun' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].triggers?.[0]).toBe('İş');
  });
});
