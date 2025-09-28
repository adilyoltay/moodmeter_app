import type { ErrorInfo } from 'react';

import { trackErrorEvent } from '@/services/telemetry/noopTelemetry';

export interface BoundaryTelemetryContext {
  scope: 'app' | 'screen' | 'component';
  source: string;
  extra?: Record<string, any>;
}

export function reportBoundaryError(
  { scope, source, extra = {} }: BoundaryTelemetryContext,
  error: Error,
  errorInfo?: ErrorInfo
) {
  trackErrorEvent(`boundary:${scope}`, error, {
    source,
    componentStack: errorInfo?.componentStack,
    ...extra,
  }).catch(() => {
    /* no-op */
  });
}
