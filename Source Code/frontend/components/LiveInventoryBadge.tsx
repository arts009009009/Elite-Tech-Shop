"use client";

import { useEffect, useState } from "react";
import { zigPlatform } from "@/lib/zig-platform";

export default function LiveInventoryBadge({ sku = "DEMO-001" }: { sku?: string }) {
  const [stock, setStock] = useState<number | null>(null);

  useEffect(() => {
    const es = zigPlatform.inventorySse((data) => {
      try {
        const json = JSON.parse(data);
        if (json.sku === sku) setStock(json.stock);
      } catch {
        // ignore malformed SSE frames
      }
    });
    return () => es.close();
  }, [sku]);

  if (stock === null) return <span className="text-xs text-gray-400">stock: --</span>;
  const low = stock < 10;
  return (
    <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${low ? "bg-red-900/30 text-red-400 border-red-500/50" : "bg-green-900/30 text-green-400 border-green-500/50"}`}>
      stock: {stock}
    </span>
  );
}
