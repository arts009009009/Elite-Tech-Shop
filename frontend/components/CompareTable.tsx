"use client";
import { useMemo, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import { useInventory } from "@/context/InventoryContext";
import { useLanguage } from "@/context/LanguageContext";
import uiStringsJson from "@/data/navbar-translate.json";

const uiStrings = uiStringsJson as Record<string, Record<string, string>>;

type Product = { id: number; title: string; price: number; currency: string; category?: string; description?: string; image?: string; specs?: { name: string; value: string }[] };

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  borderBottom: "1px solid var(--border, #333)",
  fontWeight: 600,
  minWidth: 180,
  color: "var(--text-h, #fff)",
  background: "var(--v2-panel, rgba(18, 18, 30, 0.90))",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderBottom: "1px solid var(--border, #222)",
  verticalAlign: "top",
  color: "var(--text, #e0e0e0)",
  background: "var(--v2-panel, rgba(18, 18, 30, 0.90))",
};

export default function CompareTable({ products }: { products: Product[] }) {
  const { getStock } = useInventory();
  const { language } = useLanguage();
  const ui = useCallback((key: string) => uiStrings[key]?.[language] ?? key, [language]);

  const rows = useMemo(() => {
    if (products.length === 0) return [];
    const specNames = [
      ...new Set(products.flatMap((p) => (p.specs || []).map((s) => s.name))),
    ];
    return [
      {
        label: ui("Price"),
        cells: products.map((p) => (
          <td key={p.id} style={{ ...tdStyle, color: "var(--v2-green, #39FF14)", fontWeight: 700, fontSize: 15 }}>{formatCurrency(p.price, p.currency)}</td>
        )),
      },
      {
        label: ui("Category"),
        cells: products.map((p) => (
          <td key={p.id} style={tdStyle}>{p.category || "N/A"}</td>
        )),
      },
      {
        label: ui("Stock"),
        cells: products.map((p) => {
          const stock = getStock(p.id);
          return (
            <td key={p.id} style={{ ...tdStyle, color: stock.quantity > 0 ? "var(--v2-green, #39FF14)" : "var(--v2-red, #ff4444)", fontWeight: 600 }}>
              {stock.quantity > 0 ? `${stock.quantity} ${ui("Units")}` : ui("OutOfStock")}
            </td>
          );
        }),
      },
      ...specNames.map((name) => ({
        label: name,
        cells: products.map((p) => (
          <td key={p.id} style={tdStyle}>{p.specs?.find((s) => s.name === name)?.value || "—"}</td>
        )),
      })),
      {
        label: ui("Description"),
        cells: products.map((p) => (
          <td key={p.id} style={{ ...tdStyle, maxWidth: 240 }}>{p.description || "N/A"}</td>
        )),
      },
    ];
  }, [products, getStock, ui]);

  if (products.length === 0) return null;

  return (
    <div style={{ overflowX: "auto", marginTop: 16 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            <th style={thStyle}>{ui("Feature")}</th>
            {products.map((p) => (
              <th key={p.id} style={thStyle}>{p.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{row.label}</td>
              {row.cells}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}