import React, { lazy } from 'react';

import LazyScreenBoundary from '@/components/navigation/LazyScreenBoundary';

const LazyBreathworkTab = lazy(() => import('@/features/breathwork/BreathworkTab'));

export default function BreathworkRoute() {
  return (
    <LazyScreenBoundary screen="breathwork">
      <LazyBreathworkTab />
    </LazyScreenBoundary>
  );
}
