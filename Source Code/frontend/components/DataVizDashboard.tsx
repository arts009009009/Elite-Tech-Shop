"use client";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

type Props = { products: Array<{ id: number; title: string; price: number; currency: string }>; orders: Array<{ id: string | number; total: number; currency?: string; date: string; items: Array<unknown> }> };
const COLORS = ["#00d4ff", "#A020F0", "#A020F0", "#fff700", "#00ff41", "#ff6600"];
const CURRENCY_COLORS = ["#A020F0", "#00d4ff", "#00ff41", "#ff6600", "#fff700"];

export default function DataVizDashboard({ products, orders }: Props) {
  const categoryStats = useMemo(() => {
    const laptops = products.filter((p) => p.title.toLowerCase().includes("laptop") || p.title.toLowerCase().includes("book") || p.title.toLowerCase().includes("blade"));
    return [{ name: "Laptops", value: laptops.length }, { name: "Smartphones", value: products.length - laptops.length }];
  }, [products]);

  const priceDistribution = useMemo(() => {
    const ranges = [{ name: "0-500", min: 0, max: 500, count: 0 }, { name: "500-1000", min: 500, max: 1000, count: 0 }, { name: "1000-1500", min: 1000, max: 1500, count: 0 }, { name: "1500-2000", min: 1500, max: 2000, count: 0 }, { name: "2000+", min: 2000, max: Infinity, count: 0 }];
    for (const p of products) { const range = ranges.find((r) => p.price >= r.min && p.price < r.max); if (range) range.count++; }
    return ranges;
  }, [products]);

  // Orders can carry mixed currencies (USD/EUR/EGP/RUB depending on the
  // product's language data), so revenue is aggregated per currency and
  // rendered with its own symbol — summing across currencies is meaningless.
  const revenueStats = useMemo(() => {
    const byCurrency: Record<string, { sum: number; count: number }> = {};
    for (const order of orders) {
      const currency = order.currency || "USD";
      const entry = byCurrency[currency] || (byCurrency[currency] = { sum: 0, count: 0 });
      entry.sum += order.total || 0;
      entry.count++;
    }
    return Object.entries(byCurrency).map(([currency, { sum, count }]) => ({
      currency,
      total: sum,
      avg: sum / count,
    }));
  }, [orders]);

  const orderTimeline = useMemo(() => {
    const byDate: Record<string, Record<string, number>> = {};
    const currencies: string[] = [];
    for (const order of orders) {
      const date = order.date?.split(",")[0] || "Unknown";
      const currency = order.currency || "USD";
      if (!currencies.includes(currency)) currencies.push(currency);
      const bucket = byDate[date] || (byDate[date] = {});
      bucket[currency] = (bucket[currency] || 0) + (order.total || 0);
    }
    const rows = Object.entries(byDate).map(([date, byCurrency]) => {
      const row: Record<string, string | number> = { date };
      for (const [currency, total] of Object.entries(byCurrency)) row[currency] = Math.round(total);
      return row;
    }).slice(-10);
    return { rows, currencies };
  }, [orders]);

  const stats = useMemo(() => ({
    totalProducts: products.length, totalOrders: orders.length,
  }), [products, orders]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Total Products", value: String(stats.totalProducts) },
          { label: "Total Orders", value: String(stats.totalOrders) },
          ...revenueStats.map((r) => ({ label: `Total Revenue (${r.currency})`, value: formatCurrency(r.total, r.currency) })),
          ...revenueStats.map((r) => ({ label: `Avg Order Value (${r.currency})`, value: formatCurrency(r.avg, r.currency) })),
        ].map((stat) => (
          <div key={stat.label} style={{ padding: "16px", border: "1px solid #bee3f8", borderRadius: "12px", textAlign: "center" }}>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>{stat.value}</p>
            <p style={{ fontSize: "0.875rem", opacity: 0.7, margin: 0 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "24px" }}>
        <div style={{ padding: "16px", border: "1px solid #edf2f7", borderRadius: "12px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "bold", margin: 0, marginBottom: "12px" }}>Category Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={categoryStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                label={({ name, percent }: { name?: string; percent?: number }) => `${name || ""} ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {categoryStats.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ padding: "16px", border: "1px solid #edf2f7", borderRadius: "12px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "bold", margin: 0, marginBottom: "12px" }}>Price Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={priceDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#00d4ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {orderTimeline.rows.length > 0 && (
          <div style={{ padding: "16px", border: "1px solid #edf2f7", borderRadius: "12px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "bold", margin: 0, marginBottom: "12px" }}>Revenue Timeline</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={orderTimeline.rows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                {orderTimeline.currencies.map((currency, i) => (
                  <Line key={currency} type="monotone" dataKey={currency} stroke={CURRENCY_COLORS[i % CURRENCY_COLORS.length]} strokeWidth={2} dot={{ fill: CURRENCY_COLORS[i % CURRENCY_COLORS.length] }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div style={{ padding: "16px", border: "1px solid #edf2f7", borderRadius: "12px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "bold", margin: 0, marginBottom: "12px" }}>Top Products by Price</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[...products].sort((a, b) => b.price - a.price).slice(0, 8).map((p) => ({ name: p.title.slice(0, 20), price: p.price }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={120} />
              <Tooltip />
              <Bar dataKey="price" fill="#A020F0" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
