import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * The last line of defence.
 *
 * Without this, one exception anywhere in the tree gives the player a white page — no
 * explanation, no way back, and no sign that his work is safe. It is: whatever he saved is
 * on the server or in the on-device cache, not in this component.
 *
 * React has no hook form of this. It must be a class.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // Whoever is debugging gets the real thing; the player never sees a stack trace.
    console.error('[player-hub] render failed', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-elevated/80 border border-white/10 rounded-2xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-warning/10 border border-warning/25 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-6 h-6 text-warning" />
          </div>
          <h1 className="text-xl font-semibold mb-2">This screen would not load</h1>
          <p className="text-sm text-ink-muted leading-relaxed mb-6">
            Something broke on our side. <strong className="text-ink">Nothing you saved is
            gone.</strong> Your work is kept safely, not on this page. Try reloading. If it keeps
            happening, tell Pro Placement.
          </p>
          <button
            onClick={() => window.location.assign('/')}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-brand-sheen
                       text-white font-medium shadow-glow hover:brightness-110 transition-all"
          >
            Reload the app
          </button>
        </div>
      </div>
    );
  }
}
