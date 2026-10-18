import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Last-resort render guard: a crash in a component tree used to yield a blank
 * page with no way back. This shows a recovery screen (with a Reset button
 * that clears the saved session so a corrupt local payload can't brick the
 * app on every reload).
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // No telemetry backend; console only so local debugging is possible.
    console.error('ApexRetire crashed:', error, info.componentStack);
  }

  handleReset = () => {
    try {
      window.localStorage.removeItem('apexretire-saved-state-v1');
      window.localStorage.removeItem('apexretire-scenarios-v1');
      window.sessionStorage.clear();
    } catch {
      // storage may be blocked — the in-memory reset still helps
    }
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
          <div className="max-w-lg space-y-4 text-center">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-slate-400 text-sm">
              ApexRetire hit an unexpected error while rendering. Your inputs are saved locally
              automatically. If the problem repeats (often caused by a corrupted saved session,
              a share link, or an imported file), use the reset button — it clears the saved
              session and restores the defaults.
            </p>
            <pre className="text-left text-xs bg-slate-900 border border-slate-800 rounded-lg p-3 overflow-auto max-h-40">
              {this.state.error.message}
            </pre>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-500 transition"
              >
                Reset saved session
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 font-semibold hover:bg-slate-700 transition"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
