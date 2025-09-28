import React from 'react';
import { View } from 'react-native';
import MindScoreCard, { DayMetrics } from '@/components/MindScoreCard';

const sampleWeek: DayMetrics[] = [
  { date: '2025-09-01', mood: 72, energy: 6, anxiety: 35 },
  { date: '2025-09-02', mood: 68, energy: 7, anxiety: 40 },
  { date: '2025-09-03', mood: 76, energy: 8, anxiety: 25 },
  { date: '2025-09-04', mood: 70, energy: 6, anxiety: 30 },
  { date: '2025-09-05', mood: 78, energy: 7, anxiety: 22 },
  { date: '2025-09-06', mood: 82, energy: 8, anxiety: 18 },
  { date: '2025-09-07', mood: 80, energy: 7, anxiety: 20 },
];

export default {
  title: 'Components/MindScoreCard',
  component: MindScoreCard,
};

export const Hero = () => (
  <View style={{ padding: 16 }}>
    <MindScoreCard
      week={sampleWeek}
      variant="hero"
      dominantLabel="Sakin"
      streakCurrent={5}
      streakBest={12}
      streakLevel="warrior"
      showSparkline
      colorized
    />
  </View>
);

export const White = () => (
  <View style={{ padding: 16 }}>
    <MindScoreCard
      week={sampleWeek}
      variant="white"
      coloredBackground
      streakCurrent={7}
      streakBest={20}
      showSparkline
    />
  </View>
);

export const Loading = () => (
  <View style={{ padding: 16 }}>
    <MindScoreCard
      week={[]}
      variant="white"
      loading
    />
  </View>
);
