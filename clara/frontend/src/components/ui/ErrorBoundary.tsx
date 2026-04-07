"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 bg-clara-distressed-bg text-clara-distressed-text rounded-3xl border-2 border-clara-distressed-border">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="mb-6 opacity-80">I had a little trouble processing that. Let me try again.</p>
          <Button onClick={() => window.location.reload()} variant="danger" size="lg">
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
