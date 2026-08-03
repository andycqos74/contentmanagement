"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; resetKey?: unknown; fallback?: ReactNode };
type State = { hasError: boolean; key: unknown };

// Contains render errors in the preview/canvas so a bad transient value doesn't
// blank the whole editor. Resets automatically when `resetKey` changes.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, key: this.props.resetKey };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.key) return { hasError: false, key: props.resetKey };
    return null;
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="grid h-40 place-items-center rounded-xl border border-red-200 bg-red-50 px-4 text-center text-sm text-red-600">
            Couldn&rsquo;t render the preview — adjust your settings and it will retry.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
