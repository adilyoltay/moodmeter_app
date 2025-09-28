export type MoodQuickPreset = {
  key: string;
  label: string;
  description: string;
  mood: number;
  energy: number;
  anxiety: number;
};

export const QUICK_MOOD_PRESETS: MoodQuickPreset[] = [
  {
    key: 'great',
    label: 'Harika',
    description: 'Yüksek enerji, düşük stres',
    mood: 92,
    energy: 8,
    anxiety: 3,
  },
  {
    key: 'good',
    label: 'İyi',
    description: 'Dengeli ve huzurlu',
    mood: 78,
    energy: 6,
    anxiety: 4,
  },
  {
    key: 'neutral',
    label: 'Nötr',
    description: 'Sakin ve dengede',
    mood: 58,
    energy: 5,
    anxiety: 5,
  },
  {
    key: 'rough',
    label: 'Zor',
    description: 'Düşük enerji, yüksek stres',
    mood: 36,
    energy: 4,
    anxiety: 7,
  },
];

export const getQuickMoodPreset = (key: string): MoodQuickPreset | undefined =>
  QUICK_MOOD_PRESETS.find((preset) => preset.key === key);

