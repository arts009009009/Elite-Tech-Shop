"use client";

import { useEffect, useState } from "react";
import { zigPlatform } from "@/lib/zig-platform";

export default function BundlePicker() {
  const [bundles, setBundles] = useState<Array<{ id: string; name: string; bundle_price_cents: number }>>([]);

  useEffect(() => {
    zigPlatform.bundles().then(async (res) => {
      const json = await res.json();
      setBundles(json.bundles ?? []);
    });
  }, []);

  if (bundles.length === 0)
    return <p className="text-xs text-gray-400 italic">No bundles available.</p>;

  return (
    <section className="p-4 rounded-xl border bg-gray-900/40">
      <h3 className="text-sm font-bold text-cyan-300 mb-2">Product Bundles</h3>
      <div className="grid gap-2">
        {bundles.map((b) => (
          <div key={b.id} className="flex items-center justify-between p-2 rounded border border-gray-700/50 text-sm">
            <span>{b.name}</span>
            <span className="font-mono">${(b.bundle_price_cents / 100).toFixed(2)}</span>
            <button className="px-2 py-1 rounded bg-cyan-900/50 hover:bg-cyan-800 text-cyan-300 text-xs border border-cyan-500/30">
              Add to cart
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
