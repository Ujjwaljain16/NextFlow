'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  context?: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px] gap-4 text-white/40">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500/60">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <div className="text-center">
            <p className="text-sm font-medium text-white/60 mb-1">
              Something went wrong{this.props.context ? ` in ${this.props.context}` : ''}
            </p>
            <p className="text-xs text-white/30 max-w-xs font-mono">
              {this.state.error?.message ?? 'Unknown error'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-all border border-white/[0.08]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M21 21v-5h-5" />
            </svg>
            Try again
          </button>
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="text-[10px] text-white/20 max-w-sm overflow-auto">
              <summary className="cursor-pointer">Stack trace</summary>
              <pre className="mt-2 whitespace-pre-wrap font-mono">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export function CanvasErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary context="canvas">
      {children}
    </ErrorBoundary>
  );
}

export function NodeErrorBoundary({ children, nodeId }: { children: React.ReactNode; nodeId: string }) {
  return (
    <ErrorBoundary
      context={`node:${nodeId}`}
      fallback={
        <div className="w-48 h-16 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <span className="text-xs text-red-400">Node error</span>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
