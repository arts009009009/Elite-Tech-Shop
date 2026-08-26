"use client";
import { createContext, useState, useCallback, useContext, useMemo } from "react";
import type { ReactNode } from "react";

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

import { goFetch } from "@/lib/goFetch";

const BUILT_IN_CODES: DiscountCode[] = [
  { code: "SAVE10", type: "percentage", value: 10, minPurchase: 50, usedCount: 0 },
  { code: "SAVE20", type: "percentage", value: 20, minPurchase: 100, usedCount: 0 },
  { code: "FLAT50", type: "fixed", value: 50, minPurchase: 200, usedCount: 0 },
  { code: "WELCOME5", type: "percentage", value: 5, minPurchase: 0, usedCount: 0 },
  { code: "BIG100", type: "fixed", value: 100, minPurchase: 500, usedCount: 0, usageLimit: 50 },
];

export function DiscountProvider({ children }: { children: ReactNode }) {
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountLabel, setDiscountLabel] = useState("");

  const validateCode = useCallback(async (code: string): Promise<DiscountCode | null> => {
    try {
      const res = await goFetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const local = BUILT_IN_CODES.find(c => c.code === data.code);
      return local ? { ...local, value: data.percent, usedCount: 0 } : null;
    } catch { return null; }
  }, []);

  const applyCode = useCallback(async (code: string, subtotal: number): Promise<boolean> => {
    const found = await validateCode(code);
    if (!found) return false;
    if (subtotal < found.minPurchase) return false;
    const amount = found.type === "percentage" ? subtotal * (found.value / 100) : found.value;
    const finalAmount = amount > subtotal ? subtotal : amount;
    try { await goFetch("/api/discounts/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }); } catch {}
    const label = found.type === "percentage" ? `${found.value}% off` : `$${found.value} off`;
    setAppliedCode(found.code);
    setDiscountAmount(finalAmount);
    setDiscountLabel(label);
    return true;
  }, [validateCode]);

  const removeDiscount = useCallback(() => { setAppliedCode(null); setDiscountAmount(0); setDiscountLabel(""); }, []);

  return (
    <DiscountContext.Provider value={useMemo(() => ({ appliedCode, discountAmount, discountLabel, availableCodes: BUILT_IN_CODES, applyCode, removeDiscount, validateCode }), [appliedCode, discountAmount, discountLabel, applyCode, removeDiscount, validateCode])}>
      {children}
    </DiscountContext.Provider>
  );
}

export function useDiscount() {
  const ctx = useContext(DiscountContext);
  if (!ctx) throw new Error("useDiscount must be used within DiscountProvider");
  return ctx;
}
