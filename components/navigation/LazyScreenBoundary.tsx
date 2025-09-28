import React, { Suspense } from 'react';

import { ScreenErrorBoundary } from '@/components/error';
import ScreenLoader from '@/components/ui/ScreenLoader';

type LazyScreenBoundaryProps = {
  screen: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  telemetryExtra?: Record<string, unknown>;
  onReset?: () => void;
};

export function LazyScreenBoundary({
  screen,
  children,
  fallback,
  telemetryExtra,
  onReset,
}: LazyScreenBoundaryProps) {
  const resolvedFallback = fallback ?? <ScreenLoader />;

  return (
    <ScreenErrorBoundary
      screen={screen}
      fallback={resolvedFallback}
      telemetryExtra={telemetryExtra}
      onReset={onReset}
    >
      <Suspense fallback={resolvedFallback}>{children}</Suspense>
    </ScreenErrorBoundary>
  );
}

export default LazyScreenBoundary;
