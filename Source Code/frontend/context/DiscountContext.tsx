"use client";
import { createContext, useState, useCallback, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { goFetch } from "@/lib/goFetch";

type DiscountCode = { code: string; type: "percentage" | "fixed"; value: number; minPurchase: number; expiresAt?: string; usageLimit?: number; usedCount: number };
type DiscountState = {
  appliedCode: string | null;
  discountAmount: number;
  discountLabel: string;
  availableCodes: DiscountCode[];
  applyCode: (code: string, subtotal: number) => Promise<boolean>;
  removeDiscount: () => void;
  validateCode: (code: string) => Promise<DiscountCode | null>;
};

export const DiscountContext = createContext<DiscountState | null>(null);

// Shape returned by the backend's GET /api/discounts.
type BackendDiscount = {
  code?: string;
  type?: string;
  value?: number;
  min_purchase?: number;
  expires_at?: string;
  max_uses?: number;
  used_count?: number;
};

function normalizeServerCode(raw: BackendDiscount): DiscountCode | null {
  if (typeof raw?.code !== "string" || raw.code.length === 0) return null;
  const value = Number(raw.value);
  if (!Number.isFinite(value) || value <= 0) return null;
  return {
    code: raw.code,
    type: raw.type === "fixed" ? "fixed" : "percentage",
    value,
    minPurchase: Number.isFinite(Number(raw.min_purchase)) && Number(raw.min_purchase) > 0 ? Number(raw.min_purchase) : 0,
    expiresAt: typeof raw.expires_at === "string" ? raw.expires_at : undefined,
    usageLimit: Number.isFinite(Number(raw.max_uses)) ? Number(raw.max_uses) : undefined,
    usedCount: Number.isFinite(Number(raw.used_count)) ? Number(raw.used_count) : 0,
  };
}

export function DiscountProvider({ children }: { children: ReactNode }) {
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountLabel, setDiscountLabel] = useState("");
  const [availableCodes, setAvailableCodes] = useState<DiscountCode[]>([]);

  // Available codes come from the backend (single source of truth) so the
  // UI never advertises codes the server would reject.
  useEffect(() => {
    let cancelled = false;
    goFetch("/api/discounts")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: unknown) => {
        if (cancelled || !Array.isArray(list)) return;
        setAvailableCodes(
          list
            .map((entry) => normalizeServerCode(entry as BackendDiscount))
            .filter((entry): entry is DiscountCode => entry !== null)
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const validateCode = useCallback(async (code: string): Promise<DiscountCode | null> => {
    try {
      const res = await goFetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      // Trust the server's payload; fall back to the fetched list for the
      // min-purchase requirement when the server doesn't include it.
      const known = availableCodes.find((c) => c.code === data.code);
      const normalized = normalizeServerCode({
        code: data.code,
        type: data.type,
        value: Number(data.percent ?? data.value),
        min_purchase: known?.minPurchase ?? 0,
        expires_at: known?.expiresAt,
        max_uses: known?.usageLimit,
      });
      return normalized;
    } catch { return null; }
  }, [availableCodes]);

  const applyCode = useCallback(async (code: string, subtotal: number): Promise<boolean> => {
    const found = await validateCode(code);
    if (!found) return false;
    if (subtotal < found.minPurchase) return false;
    const amount = found.type === "percentage" ? subtotal * (found.value / 100) : found.value;
    const finalAmount = Math.min(subtotal, Math.max(0, +amount.toFixed(2)));
    try { await goFetch("/api/discounts/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: found.code }) }); } catch {}
    const label = found.type === "percentage" ? `${found.value}% off` : `$${found.value} off`;
    setAppliedCode(found.code);
    setDiscountAmount(finalAmount);
    setDiscountLabel(label);
    return true;
  }, [validateCode]);

  const removeDiscount = useCallback(() => { setAppliedCode(null); setDiscountAmount(0); setDiscountLabel(""); }, []);

  const value = useMemo(() => ({ appliedCode, discountAmount, discountLabel, availableCodes, applyCode, removeDiscount, validateCode }), [appliedCode, discountAmount, discountLabel, availableCodes, applyCode, removeDiscount, validateCode]);

  return (
    <DiscountContext.Provider value={value}>
      {children}
    </DiscountContext.Provider>
  );
}

export function useDiscount() {
  const ctx = useContext(DiscountContext);
  if (!ctx) throw new Error("useDiscount must be used within DiscountProvider");
  return ctx;
}
