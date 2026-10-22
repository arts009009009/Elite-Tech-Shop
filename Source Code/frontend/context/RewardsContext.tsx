"use client";
import { createContext, useState, useCallback, useEffect, useContext, useMemo, useRef } from "react";
import type { ReactNode } from "react";

export type RewardTier = "bronze" | "silver" | "gold" | "platinum";
export type RewardPerk = { id: string; name: string; description: string; cost: number; tier: RewardTier; icon: string };
type RewardsState = {
  points: number; lifetimePoints: number; tier: RewardTier; redeemedPerks: string[];
  addPoints: (amount: number) => void; redeemPerk: (perkId: string) => Promise<boolean>;
  availablePerks: RewardPerk[]; nextTierProgress: number; pointsToNextTier: number;
};

export const RewardsContext = createContext<RewardsState | null>(null);

const TIER_THRESHOLDS: Record<RewardTier, number> = { bronze: 0, silver: 500, gold: 2000, platinum: 5000 };

const ALL_PERKS: RewardPerk[] = [
  { id: "free_shipping", name: "Free Shipping", description: "Free shipping on your next order", cost: 200, tier: "silver", icon: "🚚" },
  { id: "discount_10", name: "10% Discount", description: "Get 10% off your next order", cost: 500, tier: "silver", icon: "🏷️" },
  { id: "discount_20", name: "20% Discount", description: "Get 20% off your next order", cost: 1000, tier: "gold", icon: "💎" },
  { id: "exclusive_item", name: "Exclusive Item", description: "Redeem an exclusive limited-edition item", cost: 2500, tier: "gold", icon: "🎁" },
  { id: "vip_access", name: "VIP Early Access", description: "Get early access to new product drops", cost: 5000, tier: "platinum", icon: "👑" },
  { id: "free_return", name: "Free Extended Returns", description: "60-day free return window", cost: 350, tier: "bronze", icon: "🔄" },
];

import { goFetch } from "@/lib/goFetch";

export function RewardsProvider({ children }: { children: ReactNode }) {
  const [points, setPoints] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [redeemedPerks, setRedeemedPerks] = useState<string[]>([]);

  useEffect(() => {
    goFetch("/api/rewards").then(r => r.json()).then((data: { points: number; lifetime: number; redeemed: Record<string, boolean> }) => {
      setPoints(data.points || 0);
      setLifetimePoints(data.lifetime || 0);
      setRedeemedPerks(Object.keys(data.redeemed || {}));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleReset = () => { setPoints(0); setLifetimePoints(0); setRedeemedPerks([]); };
    window.addEventListener("rewards-reset", handleReset);
    // ReferralContext announces bonuses via this event (it renders outside
    // this provider's hook scope in some trees).
    const handleAddPoints = (event: Event) => {
      const amount = Number((event as CustomEvent<number>).detail);
      if (Number.isFinite(amount) && amount > 0) {
        setPoints(prev => prev + amount);
        setLifetimePoints(prev => prev + amount);
      }
    };
    window.addEventListener("add-reward-points", handleAddPoints);
    return () => {
      window.removeEventListener("rewards-reset", handleReset);
      window.removeEventListener("add-reward-points", handleAddPoints);
    };
  }, []);

  const calculateTier = useCallback((lifetime: number): RewardTier => {
    if (lifetime >= TIER_THRESHOLDS.platinum) return "platinum";
    if (lifetime >= TIER_THRESHOLDS.gold) return "gold";
    if (lifetime >= TIER_THRESHOLDS.silver) return "silver";
    return "bronze";
  }, []);

  const tier = calculateTier(lifetimePoints);

  const addPoints = useCallback(async (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const bonusMap: Record<RewardTier, number> = { bronze: 0, silver: 0.05, gold: 0.10, platinum: 0.15 };
    const bonus = bonusMap[tier];
    const totalPoints = Math.round(amount * (1 + bonus));
    setPoints(prev => prev + totalPoints);
    setLifetimePoints(prev => prev + totalPoints);
  }, [tier]);

  const redeemingRef = useRef<Set<string>>(new Set());

  const redeemPerk = useCallback(async (perkId: string): Promise<boolean> => {
    if (redeemedPerks.includes(perkId)) return false;
    if (redeemingRef.current.has(perkId)) return false;
    const perk = ALL_PERKS.find(p => p.id === perkId);
    if (!perk) return false;
    const perkTierIndex = Object.keys(TIER_THRESHOLDS).indexOf(perk.tier);
    const userTierIndex = Object.keys(TIER_THRESHOLDS).indexOf(tier);
    if (userTierIndex < perkTierIndex) return false;
    if (points < perk.cost) return false;
    redeemingRef.current.add(perkId);
    try {
      const res = await goFetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perk: perkId, cost: perk.cost }),
      });
      if (res.ok) {
        const data = await res.json();
        setPoints(data.points);
        setLifetimePoints(data.lifetime);
        setRedeemedPerks(Object.keys(data.redeemed || {}));
        window.dispatchEvent(new CustomEvent("notify", { detail: `Perk redeemed: ${perk.name}!` }));
        return true;
      }
      // The server explicitly rejected the redemption (insufficient points,
      // unknown perk, ...): never grant it client-side.
      window.dispatchEvent(new CustomEvent("notify", { detail: "Redemption rejected by the server." }));
      return false;
    } catch {
      // Network-level failure only: fall back to a local redemption so an
      // unreachable backend doesn't brick the feature.
      if (points < perk.cost) return false;
      setPoints((prev) => prev - perk.cost);
      setRedeemedPerks((prev) => [...prev, perkId]);
      window.dispatchEvent(new CustomEvent("notify", { detail: `Perk redeemed offline: ${perk.name}!` }));
      return true;
    } finally {
      redeemingRef.current.delete(perkId);
    }
  }, [points, redeemedPerks, tier]);

  const nextTierNames = Object.keys(TIER_THRESHOLDS) as RewardTier[];
  const currentTierIndex = nextTierNames.indexOf(tier);
  const nextTier = currentTierIndex < nextTierNames.length - 1 ? nextTierNames[currentTierIndex + 1] : null;
  const pointsToNextTier = nextTier ? TIER_THRESHOLDS[nextTier] - lifetimePoints : 0;
  const nextTierProgress = nextTier ? Math.min(100, (lifetimePoints / TIER_THRESHOLDS[nextTier]) * 100) : 100;
  const availablePerks = ALL_PERKS.filter(p => { const perkTierIndex = nextTierNames.indexOf(p.tier); return perkTierIndex <= currentTierIndex && !redeemedPerks.includes(p.id); });

  return (
    <RewardsContext.Provider value={useMemo(() => ({ points, lifetimePoints, tier, redeemedPerks, addPoints, redeemPerk, availablePerks, nextTierProgress, pointsToNextTier }), [points, lifetimePoints, tier, redeemedPerks, addPoints, redeemPerk, availablePerks, nextTierProgress, pointsToNextTier])}>
      {children}
    </RewardsContext.Provider>
  );
}

export function useRewards() {
  const ctx = useContext(RewardsContext);
  if (!ctx) return { points: 0, lifetimePoints: 0, tier: "bronze" as const, redeemedPerks: [], addPoints: () => {}, redeemPerk: () => Promise.resolve(false), availablePerks: [], nextTierProgress: 0, pointsToNextTier: 0 };
  return ctx;
}
