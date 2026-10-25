"use client";
import { createContext, useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";

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

const REFERRAL_CODE_RE = /^ET-[A-Z0-9]{6}$/;

type StoredReferralState = { myCode: string; referralCount: number; referredBy: string | null };

export function ReferralProvider({ children }: { children: ReactNode }) {
  // Default-init (SSR-safe); hydrated from localStorage after mount.
  const [state, setState] = useState<StoredReferralState>({ myCode: "", referralCount: 0, referredBy: null });
  const hydratedRef = useRef(false);
  const { myCode, referralCount, referredBy } = state;

  useEffect(() => {
    try {
      const stored = localStorage.getItem("referral_data");
      if (stored) {
        const data = JSON.parse(stored) as Partial<StoredReferralState>;
        setState({
          myCode: typeof data.myCode === "string" ? data.myCode : "",
          referralCount: Number.isFinite(Number(data.referralCount)) ? Number(data.referralCount) : 0,
          referredBy: typeof data.referredBy === "string" ? data.referredBy : null,
        });
      }
    } catch {}
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    // Don't persist until after hydration, or the mount-pass default would
    // wipe any previously saved state.
    if (!hydratedRef.current) return;
    try { localStorage.setItem("referral_data", JSON.stringify(state)); } catch {}
  }, [state]);

  const generateCode = useCallback(() => {
    if (myCode) {
      window.dispatchEvent(new CustomEvent("notify", { detail: "You already have a referral code." }));
      return;
    }
    const code = generateUniqueCode();
    setState((prev) => ({ ...prev, myCode: code }));
    window.dispatchEvent(new CustomEvent("notify", { detail: "Referral code generated!" }));
  }, [myCode]);

  const applyCode = useCallback(async (code: string): Promise<boolean> => {
    const normalized = code.trim().toUpperCase();
    if (!REFERRAL_CODE_RE.test(normalized)) {
      window.dispatchEvent(new CustomEvent("notify", { detail: "Invalid referral code format." }));
      return false;
    }
    if (normalized === myCode) {
      window.dispatchEvent(new CustomEvent("notify", { detail: "You cannot use your own referral code." }));
      return false;
    }
    // Referral bonuses are a client-side demo feature: there is no referral
    // API on the backend, so we no longer pretend to validate remotely.
    setState((prev) => ({ ...prev, referralCount: prev.referralCount + 1, referredBy: normalized }));
    window.dispatchEvent(new CustomEvent("notify", { detail: "Referral code applied! +100 points" }));
    window.dispatchEvent(new CustomEvent("add-reward-points", { detail: 100 }));
    return true;
  }, [myCode]);

  const getShareUrl = useCallback((): string => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/signup?ref=${myCode}`;
  }, [myCode]);

  return (
    <ReferralContext.Provider value={useMemo(() => ({ myCode, referralCount, referredBy, generateCode, applyCode, getShareUrl }), [myCode, referralCount, referredBy, generateCode, applyCode, getShareUrl])}>
      {children}
    </ReferralContext.Provider>
  );
}
