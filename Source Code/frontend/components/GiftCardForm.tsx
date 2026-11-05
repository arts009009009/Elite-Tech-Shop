"use client";

import { useState } from "react";
import { zigPlatform } from "@/lib/zig-platform";

export default function GiftCardForm() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ valid: boolean; balance_cents?: number } | null>(null);
  const [checking, setChecking] = useState(false);

  const validate = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    try {
      const res = await zigPlatform.validateGiftCard(code);
      const json = await res.json();
      setResult(json);
    } catch {
      setResult({ valid: false });
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="p-4 rounded-xl border bg-gray-900/40">
      <h3 className="text-sm font-bold text-cyan-300 mb-2">Gift Card</h3>
      <form onSubmit={validate} className="flex flex-col sm:flex-row gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter gift code"
          className="flex-1 px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <button
          disabled={checking || !code}
          className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-bold"
        >
          {checking ? "Checking…" : "Validate"}
        </button>
      </form>
      {result && (
        <div className={`mt-3 p-2 rounded text-sm ${result.valid ? "bg-green-900/30 text-green-300 border border-green-500/30" : "bg-red-900/30 text-red-300 border border-red-500/30"}`}>
          {result.valid ? `Valid — balance ${(result.balance_cents ?? 0) / 100}` : "Invalid or expired code"}
        </div>
      )}
    </section>
  );
}
