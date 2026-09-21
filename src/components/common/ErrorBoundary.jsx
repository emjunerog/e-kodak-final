import React from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

/**
 * ErrorBoundary
 * -------------
 * Luxury fault-tolerant error boundary for E-Kodak Studio portals.
 * Catches unhandled JavaScript runtime exceptions during component render,
 * prevents the application from showing a blank/white screen, and provides
 * clear diagnostic details with one-click recovery.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[420px] w-full flex items-center justify-center p-6 font-body">
          <div className="max-w-xl w-full bg-white rounded-3xl p-8 border border-neutral-200 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-200">
              <AlertTriangle size={28} />
            </div>
            
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200 inline-flex items-center gap-1.5">
                <ShieldAlert size={12} />
                <span>Station Render Recovery</span>
              </span>
              <h2 className="text-2xl font-heading font-bold text-primary">
                Station Encountered an Unexpected Issue
              </h2>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                A display error occurred while loading this view. You can reload this station or return to the main dashboard.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-neutral-900 text-neutral-200 p-4 rounded-2xl text-xs font-mono overflow-x-auto max-h-40 border border-neutral-800">
                <p className="text-red-400 font-bold mb-1">{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="text-[10px] text-neutral-400 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack.slice(0, 500)}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-primary py-2.5 px-5 text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Retry Station</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.assign('/admin')}
                className="btn-ghost py-2.5 px-5 text-xs font-bold flex items-center gap-2 border border-neutral-200 cursor-pointer"
              >
                <Home size={14} />
                <span>Admin Hub</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
  onReset: PropTypes.func,
};
