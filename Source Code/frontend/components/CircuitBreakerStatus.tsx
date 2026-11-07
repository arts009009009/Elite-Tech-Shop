"use client";

import { useEffect, useState } from "react";
import { zigPlatform } from "@/lib/zig-platform";

export default function CircuitBreakerStatus() {
  const [breakers, setBreakers] = useState<Array<{ service: string; state: string }>>([]);

  useEffect(() => {
    zigPlatform.circuitBreakers().then(async (res) => {
      const json = await res.json();
      setBreakers(json.breakers ?? []);
    });
  }, []);

  return (
    <section className="p-4 rounded-xl border bg-gray-900/40">
      <h3 className="text-sm font-bold text-cyan-300 mb-2">Circuit Breakers</h3>
      <div className="grid gap-2">
        {breakers.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No breakers.</p>
        ) : (
          breakers.map((b) => (
            <div key={b.service} className="flex items-center justify-between p-2 rounded border border-gray-700/50 text-xs">
              <span className="font-mono">{b.service}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  b.state === "open" ? "bg-red-900/50 text-red-400 border border-red-500/30" : "bg-green-900/50 text-green-400 border border-green-500/30"
                }`}
              >
                {b.state}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
