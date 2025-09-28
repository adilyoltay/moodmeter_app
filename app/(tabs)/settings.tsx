import React, { lazy } from 'react';

import LazyScreenBoundary from '@/components/navigation/LazyScreenBoundary';

const LazySettingsScreen = lazy(() => import('@/features/settings/SettingsScreen'));

export default function SettingsRoute() {
  return (
    <LazyScreenBoundary screen="settings">
      <LazySettingsScreen />
    </LazyScreenBoundary>
  );
}
