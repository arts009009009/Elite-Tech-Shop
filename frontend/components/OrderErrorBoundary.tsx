"use client";
import React from "react";

type Props = { children: React.ReactNode; fallbackMessage?: string; onReset?: () => void };
type State = { hasError: boolean };

export default class OrderErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(): State { return { hasError: true }; }
  componentDidCatch(error: Error) { if (process.env.NODE_ENV === "development") console.error("Order render error:", error.message); }
  handleReset = () => { this.setState({ hasError: false }); this.props.onReset?.(); };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            padding: 20,
            borderWidth: 1,
            borderStyle: "solid",
            borderRadius: 12,
            borderColor: "#00d4ff",
            background: "rgba(0,212,255,0.1)",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: "var(--neon-blue, #00d4ff)", fontWeight: 600, marginBottom: 8 }}>
            {this.props.fallbackMessage ?? "Unable to display this order."}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              marginTop: 8,
              fontSize: 12,
              padding: "4px 8px",
              background: "transparent",
              border: "1px solid var(--neon-blue, #00d4ff)",
              borderRadius: 4,
              color: "var(--neon-blue, #00d4ff)",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
