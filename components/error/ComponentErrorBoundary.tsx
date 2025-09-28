import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View } from 'react-native';

import ErrorFallback from './ErrorFallback';
import { reportBoundaryError } from './reportBoundaryError';

interface RenderFallbackProps {
  error?: Error;
  errorInfo?: ErrorInfo;
  reset: () => void;
  componentName: string;
}

interface ComponentErrorBoundaryProps {
  componentName: string;
  children: ReactNode | ((reset: () => void) => ReactNode);
  fallback?: ReactNode | ((props: RenderFallbackProps) => ReactNode);
  onReset?: () => void;
  telemetryExtra?: Record<string, any>;
}

interface ComponentErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ComponentErrorBoundary extends Component<ComponentErrorBoundaryProps, ComponentErrorBoundaryState> {
  state: ComponentErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ComponentErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    reportBoundaryError(
      {
        scope: 'component',
        source: this.props.componentName,
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
    const { fallback, componentName } = this.props;
    const props: RenderFallbackProps = {
      error: this.state.error,
      errorInfo: this.state.errorInfo,
      reset: this.handleReset,
      componentName,
    };

    if (typeof fallback === 'function') {
      return fallback(props);
    }

    if (fallback) {
      return fallback;
    }

    return (
      <ErrorFallback
        title={`${componentName} bileşeninde hata oluştu`}
        description="Bu bölümü yeniden yüklemeyi veya ana ekrana dönmeyi deneyebilirsin."
        actionLabel="Tekrar dene"
        onRetry={this.handleReset}
      />
    );
  }

  render() {
    if (this.state.hasError) {
      return <View style={{ flex: 1 }}>{this.renderFallback()}</View>;
    }

    if (typeof this.props.children === 'function') {
      return this.props.children(this.handleReset);
    }

    return this.props.children;
  }
}

export default ComponentErrorBoundary;
