import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View } from 'react-native';

import ErrorFallback from './ErrorFallback';
import { reportBoundaryError } from './reportBoundaryError';

interface RenderFallbackProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  reset: () => void;
  screen: string;
}

interface ScreenErrorBoundaryProps {
  screen: string;
  children: ReactNode;
  fallback?: ReactNode | ((props: RenderFallbackProps) => ReactNode);
  onReset?: () => void;
  telemetryExtra?: Record<string, any>;
}

interface ScreenErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ScreenErrorBoundary extends Component<ScreenErrorBoundaryProps, ScreenErrorBoundaryState> {
  state: ScreenErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ScreenErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    reportBoundaryError(
      {
        scope: 'screen',
        source: this.props.screen,
        extra: this.props.telemetryExtra,
      },
      error,
      errorInfo,
    );
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  private renderFallback() {
    const { fallback, screen } = this.props;
    const props: RenderFallbackProps = {
      error: this.state.error,
      errorInfo: this.state.errorInfo,
      reset: this.handleReset,
      screen,
    };

    if (typeof fallback === 'function') {
      return fallback(props);
    }

    if (fallback) {
      return fallback;
    }

    return (
      <ErrorFallback
        title={`${screen} ekranında bir sorun oluştu`}
        description="Sayfayı yeniden yükleyerek veya ana ekrana dönerek devam edebilirsin."
        actionLabel="Yeniden dene"
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

export default ScreenErrorBoundary;
