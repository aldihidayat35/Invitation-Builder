"use client";

import { Component, type ReactNode } from "react";

export interface WidgetErrorBoundaryProps {
  readonly widgetType: string;
  readonly children: ReactNode;
}

interface State {
  readonly failed: boolean;
}

/**
 * Isolates a failing widget so one broken widget never takes down the whole
 * invitation page (NFR-REL-001, P-09). The fallback is an empty, hidden node.
 */
export class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  // Failure details are intentionally not logged/shown: nothing internal reaches the public page.

  override render(): ReactNode {
    if (this.state.failed) {
      return <div data-widget-error={this.props.widgetType} aria-hidden="true" />;
    }
    return this.props.children;
  }
}
