"use client";
import { createContext, useState, useCallback, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { goFetch } from "@/lib/goFetch";

type ReferralState = {
  myCode: string;
  referralCount: number;
  referredBy: string | null;
  generateCode: () => void;
  applyCode: (code: string) => Promise<boolean>;
  getShareUrl: () => string;
};

export const ReferralContext = createContext<ReferralState | null>(null);

function generateUniqueCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "ET-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function ReferralProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem("referral_data");
      if (stored) {
        const data = JSON.parse(stored) as { myCode: string; referralCount: number; referredBy: string | null };
        return { myCode: data.myCode || "", referralCount: data.referralCount || 0, referredBy: data.referredBy || null };
      }
    } catch {}
    return { myCode: "", referralCount: 0, referredBy: null as string | null };
  });
  const { myCode, referralCount, referredBy } = state;

  useEffect(() => {
    try { localStorage.setItem("referral_data", JSON.stringify(state)); } catch {}
  }, [state]);

  const generateCode = useCallback(() => {
    if (myCode) return;
    const code = generateUniqueCode();
    setState((prev) => ({ ...prev, myCode: code }));
    window.dispatchEvent(new CustomEvent("notify", { detail: "Referral code generated!" }));
  }, [myCode]);

  const applyCode = useCallback(async (code: string): Promise<boolean> => {
    try {
      const res = await goFetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perk: "referral_bonus", code }),
      });
      if (!res.ok) return false;
      setState((prev) => ({ ...prev, referralCount: prev.referralCount + 1, referredBy: code }));
      window.dispatchEvent(new CustomEvent("notify", { detail: "Referral code applied! +100 points" }));
      window.dispatchEvent(new CustomEvent("add-reward-points", { detail: 100 }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const getShareUrl = useCallback((): string => {
    return `${window.location.origin}/signup?ref=${myCode}`;
  }, [myCode]);

  return (
    <ReferralContext.Provider value={useMemo(() => ({ myCode, referralCount, referredBy, generateCode, applyCode, getShareUrl }), [myCode, referralCount, referredBy, generateCode, applyCode, getShareUrl])}>
      {children}
    </ReferralContext.Provider>
  );
}

export function useReferral(): ReferralState {
  const ctx = useContext(ReferralContext);
  if (!ctx) return { myCode: "", referralCount: 0, referredBy: null, generateCode: () => {}, applyCode: async () => false, getShareUrl: () => "" };
  return ctx;
}
