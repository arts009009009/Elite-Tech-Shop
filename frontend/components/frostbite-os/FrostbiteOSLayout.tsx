"use client";
import type { ReactNode } from "react";
import Link from "next/link";

export default function FrostbiteOSLayout({ children, title, embedded }: { children: ReactNode; title: string; embedded?: boolean }) {
  if (embedded) {
    return <div style={{ height: "100%", overflow: "auto" }}>{children}</div>;
  }
  return (
    <div style={{ minHeight: "100vh" }}>
      <nav style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", borderBottom: "1px solid var(--border, #e5e4e7)", background: "var(--card-bg, #111)", flexWrap: "wrap" }}>
        <Link href="/frostbite-os" style={{ color: "var(--accent, #00d4ff)", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>Frostbite OS</Link>
        <span style={{ fontSize: 14, opacity: 0.5 }}>|</span>
        <span style={{ fontSize: 14 }}>{title}</span>
        <div style={{ flex: 1 }} />
      </nav>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}
