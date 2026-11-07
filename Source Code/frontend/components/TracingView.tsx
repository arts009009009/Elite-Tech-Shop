"use client";

import { useEffect, useState } from "react";
import { zigPlatform } from "@/lib/zig-platform";

export default function TracingView() {
  const [traces, setTraces] = useState<string[]>([]);

  useEffect(() => {
    zigPlatform.traceList().then(async (res) => {
      const json = await res.json();
      setTraces(json.spans ?? []);
    });
  }, []);

  return (
    <section className="p-4 rounded-xl border bg-gray-900/40">
      <h3 className="text-sm font-bold text-cyan-300 mb-2">Distributed Traces</h3>
      <div className="overflow-x-auto">
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left pb-1 text-gray-400">Trace ID</th>
              <th className="text-left pb-1 text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {traces.length === 0 ? (
              <tr><td className="py-2 text-gray-400 italic">No traces ingested yet.</td></tr>
            ) : (
              traces.map((t) => (
                <tr key={t} className="border-b border-gray-800/50">
                  <td className="py-1 font-mono text-gray-300 truncate max-w-xs">{t}</td>
                  <td className="py-1 text-green-400">ok</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
