import React, { lazy } from 'react';

import LazyScreenBoundary from '@/components/navigation/LazyScreenBoundary';

const LazyAchievementsScreen = lazy(() => import('@/features/achievements/AchievementsScreen'));

export default function AchievementsRoute() {
  return (
    <LazyScreenBoundary screen="achievements">
      <LazyAchievementsScreen />
    </LazyScreenBoundary>
  );
}
