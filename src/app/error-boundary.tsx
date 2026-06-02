"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    if (
      error.message?.includes("ethereum") ||
      error.message?.includes("Cannot set property") ||
      error.message?.includes("getter")
    ) {
      console.warn("Wallet extension error suppressed:", error.message);
      this.setState({ hasError: false, error: null });
      return;
    }
    console.error("ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
          <div className="bg-[#0e0e0e] border border-[#1e1e1e] p-8 max-w-md text-center">
            <h2 className="font-display text-lg text-[#f2ede6] mb-2">
              Something went wrong
            </h2>
            <p className="font-mono text-sm text-[#5a5a5a] mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-[#00d9ff] text-[#0a0e27] font-mono text-[11px] tracking-widest px-4 py-2 hover:bg-[#00e6ff] transition-colors font-semibold"
            >
              TRY AGAIN
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
