"use client";
import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { useUser } from "@/context/UserContext";
import { goFetch } from "@/lib/goFetch";

type Summary = {
  total_orders: number;
  total_revenue: number;
  total_users: number;
  total_products: number;
  total_reviews: number;
  avg_order_value: number;
  orders_by_status: Record<string, number>;
  top_products: { name: string; count: number; revenue: number }[];
  revenue_by_day: { date: string; revenue: number; orders: number }[];
};

export default function AnalyticsPage() {
  const { isAuthenticated } = useUser();
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await goFetch("/api/analytics/summary");
      if (res.ok) {
        const d = await res.json();
        setData(d);
      } else {
        setError("Access denied — admin only");
      }
    } catch { setError("Failed to load analytics"); }
  }, []);

  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]); // eslint-disable-line react-hooks/set-state-in-effect -- fetch on mount

  if (!isAuthenticated) {
    return (
      <>
        <Navbar />
        <div className="container" style={{ padding: 40, textAlign: "center" }}>
          <h1>Analytics</h1>
          <p style={{ color: "#888", marginTop: 16 }}>Please log in to view analytics.</p>
        </div>
      </>
    );
  }

  const card = { background: "var(--card-bg, #111)", border: "1px solid var(--border, #333)", borderRadius: 8, padding: 20 };
  const statLabel = { fontSize: 12, color: "#888", textTransform: "uppercase" as const, letterSpacing: 1 };
  const statValue = { fontSize: 28, fontWeight: 700, color: "var(--accent, #00d4ff)", marginTop: 4 };

  return (
    <>
      <Navbar />
      <div className="container" style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Go-Powered Analytics</h1>

        {error && <p style={{ color: "#ff4040" }}>{error}</p>}

        {data && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Total Orders", value: data.total_orders },
                { label: "Revenue", value: "$" + data.total_revenue.toFixed(2) },
                { label: "Avg Order", value: "$" + data.avg_order_value.toFixed(2) },
                { label: "Users", value: data.total_users },
                { label: "Products", value: data.total_products },
                { label: "Reviews", value: data.total_reviews },
              ].map((s) => (
                <div key={s.label} style={card}>
                  <div style={statLabel}>{s.label}</div>
                  <div style={statValue}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={card}>
                <h3 style={{ fontSize: 16, marginBottom: 12 }}>Orders by Status</h3>
                {Object.entries(data.orders_by_status).map(([status, count]) => (
                  <div key={status} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border, #333)", fontSize: 14 }}>
                    <span style={{ textTransform: "capitalize" }}>{status}</span>
                    <span style={{ color: "var(--accent, #00d4ff)" }}>{count}</span>
                  </div>
                ))}
              </div>

              <div style={card}>
                <h3 style={{ fontSize: 16, marginBottom: 12 }}>Top Products</h3>
                {data.top_products.slice(0, 5).map((p) => (
                  <div key={p.name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border, #333)", fontSize: 14 }}>
                    <span>{p.name}</span>
                    <span style={{ color: "#39FF14" }}>${p.revenue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
