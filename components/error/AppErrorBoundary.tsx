import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View } from 'react-native';

import ErrorFallback from './ErrorFallback';
import { reportBoundaryError } from './reportBoundaryError';

interface RenderFallbackProps {
  error?: Error;
  reset: () => void;
  errorInfo?: ErrorInfo;
}

interface AppErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: RenderFallbackProps) => ReactNode);
  onReset?: () => void;
  telemetryExtra?: Record<string, any>;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    reportBoundaryError({ scope: 'app', source: 'AppErrorBoundary', extra: this.props.telemetryExtra }, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  private renderFallback() {
    const { fallback } = this.props;
    const props: RenderFallbackProps = {
      error: this.state.error,
      errorInfo: this.state.errorInfo,
      reset: this.handleReset,
    };

    if (typeof fallback === 'function') {
      return fallback(props);
    }

    if (fallback) {
      return fallback;
    }

    return (
      <ErrorFallback
        title="Uygulama beklenmeyen bir hata ile karşılaştı"
        description="Kısa süreliğine mola verelim. Tekrar denemek için butona dokunabilirsin."
        actionLabel="Tekrar dene"
        onRetry={this.handleReset}
      />
    );
  }

  render() {
    if (this.state.hasError) {
      return <View style={{ flex: 1 }}>{this.renderFallback()}</View>;
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
