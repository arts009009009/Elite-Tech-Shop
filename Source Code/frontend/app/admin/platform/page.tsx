"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ChaosToggle from "@/components/ChaosToggle";
import LiveInventoryBadge from "@/components/LiveInventoryBadge";
import AbandonedCartBanner from "@/components/AbandonedCartBanner";
import BundlePicker from "@/components/BundlePicker";
import GiftCardForm from "@/components/GiftCardForm";
import FeatureFlagToggle from "@/components/FeatureFlagToggle";
import CircuitBreakerStatus from "@/components/CircuitBreakerStatus";
import MfaSetup from "@/components/MfaSetup";
import WebRtcChat from "@/components/WebRtcChat";
import TracingView from "@/components/TracingView";

const adminDarkStyles: React.CSSProperties = {
  background: "var(--custom-bg, #0a0a0f)",
  color: "var(--custom-text, #e0e0e0)",
  minHeight: "100vh",
  padding: "20px",
  fontFamily: "'Courier New', monospace",
};

const adminDarkCss = `
  .admin-platform h2 { color: var(--custom-accent, #ffd700); margin-bottom: 16px; font-size: 22px; }
  .admin-platform .section { margin-bottom: 30px; }
  .admin-platform .section h3 { color: var(--custom-accent, #ffd700); margin-bottom: 12px; font-size: 16px; border-bottom: 1px solid var(--custom-primary, #00d4ff); padding-bottom: 4px; }
  .admin-platform .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
  .admin-platform .card { background: color-mix(in srgb, var(--custom-bg, #1a1a2e) 85%, transparent); border: 1px solid var(--custom-primary, #00d4ff); border-radius: var(--custom-radius, 8px); padding: 16px; }
`;

function PlatformPageContent() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      setAuthed(r.ok);
    }).catch(() => {
      setAuthed(false);
    });
  }, [router]);

  if (authed === false) {
    router.replace("/admin?error=auth_required");
    return null;
  }
  if (authed === null) return null;

  return (
    <div className="admin-platform" style={adminDarkStyles}>
        <style>{adminDarkCss}</style>
        <h2>Elite Tech Platform — Zig Services</h2>
        <p style={{ opacity: 0.7, fontSize: 13, marginBottom: 24, color: "var(--custom-text, #aaa)" }}>
          Distributed tracing · chaos engineering · SSE inventory · abandoned cart recovery · bundles · gift cards ·
          rate limiting / circuit breakers · feature flags · A/B testing · OAuth2 + MFA · WebRTC P2P chat
        </p>

        <div className="grid">
          {/* Chaos engineering */}
          <div className="card">
            <h3>Chaos Engineering</h3>
            <ChaosToggle service="rust-backend" faultType="latency" label="Rust latency" />
            <ChaosToggle service="rust-backend" faultType="error" label="Rust errors" />
            <ChaosToggle service="go-backend" faultType="latency" label="Go latency" />
            <ChaosToggle service="go-backend" faultType="drop" label="Go drop" />
            <ChaosToggle service="java-backend" faultType="latency" label="Java latency" />
          </div>

          {/* Real-time inventory */}
          <div className="card">
            <h3>Live Inventory (SSE)</h3>
            <LiveInventoryBadge sku="DEMO-001" />
          </div>

          {/* Abandoned carts */}
          <div className="card">
            <h3>Abandoned Cart Recovery</h3>
            <AbandonedCartBanner userId="demo-user" />
          </div>

          {/* Bundles */}
          <div className="card">
            <h3>Product Bundles</h3>
            <BundlePicker />
          </div>

          {/* Gift cards */}
          <div className="card">
            <h3>Gift Cards</h3>
            <GiftCardForm />
          </div>

          {/* Feature flags */}
          <div className="card">
            <h3>Feature Flags</h3>
            <FeatureFlagToggle key="flash-sales" label="Flash Sales" />
            <FeatureFlagToggle key="ai-assistant" label="AI Assistant" />
            <FeatureFlagToggle key="glitch-mode" label="Glitch Mode" />
          </div>

          {/* Circuit breakers */}
          <div className="card">
            <h3>Circuit Breakers</h3>
            <CircuitBreakerStatus />
          </div>

          {/* MFA */}
          <div className="card">
            <h3>Two-Factor Auth</h3>
            <MfaSetup />
          </div>

          {/* WebRTC chat */}
          <div className="card" style={{ gridColumn: "span 2" }}>
            <h3>P2P Live Chat (WebRTC)</h3>
            <WebRtcChat room="support" />
          </div>

          {/* Tracing */}
          <div className="card" style={{ gridColumn: "span 2" }}>
            <h3>Distributed Tracing</h3>
            <TracingView />
          </div>
        </div>
      </div>
  );
}

export default function AdminPlatform() {
  return <PlatformPageContent />;
}
