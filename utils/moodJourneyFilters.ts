import type { MoodInsightEntry } from '@/utils/moodInsights';

export interface JourneyFilterOptions {
  trigger?: string;
  activity?: string;
  keyword?: string;
}

const normalize = (input: string) => input.trim().toLowerCase();

export const matchesTrigger = (entry: MoodInsightEntry, trigger: string) => {
  if (!trigger) return true;
  const target = normalize(trigger);
  return (entry.triggers || []).some((t) => normalize(String(t || '')) === target);
};

export const matchesActivity = (entry: MoodInsightEntry, activity: string) => {
  if (!activity) return true;
  const target = normalize(activity);
  return (entry.activities || []).some((a) => normalize(String(a || '')) === target);
};

export const matchesKeyword = (entry: MoodInsightEntry, keyword: string) => {
  if (!keyword) return true;
  const target = normalize(keyword);
  if (!entry.notes) return false;
  return normalize(entry.notes).includes(target);
};

export const applyJourneyFilters = <T extends MoodInsightEntry>(
  entries: T[],
  filters: JourneyFilterOptions
): T[] => {
  if (!filters.trigger && !filters.activity && !filters.keyword) {
    return entries;
  }

  return entries.filter((entry) => {
    if (filters.trigger && !matchesTrigger(entry, filters.trigger)) {
      return false;
    }
    if (filters.activity && !matchesActivity(entry, filters.activity)) {
      return false;
    }
    if (filters.keyword && !matchesKeyword(entry, filters.keyword)) {
      return false;
    }
    return true;
  });
};

export default applyJourneyFilters;
