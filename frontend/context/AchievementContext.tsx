"use client";

import React, { createContext, useState, useCallback, useContext, useEffect, useMemo, ReactNode } from "react";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (ctx: AchievementContextType) => boolean;
  points: number;
}

interface AchievementContextType {
  badges: Badge[];
  unlockedBadges: string[];
  totalPoints: number;
  totalOrders: number;
  totalSpent: number;
  totalReviews: number;
  wishlistCount: number;
  referralCount: number;
  discountCount: number;
  hasNightOrder: boolean;
  checkAndUnlock: (ctx: Omit<AchievementContextType, "checkAndUnlock" | "unlockedBadges" | "totalPoints" | "badges">) => void;
  isUnlocked: (id: string) => boolean;
  incrementOrders: () => void;
  addSpent: (amount: number) => void;
  incrementReviews: () => void;
  setWishlistCount: (count: number) => void;
  incrementReferrals: () => void;
  incrementDiscounts: () => void;
  markNightOrder: () => void;
}

interface AchievementProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = "elite-shop-unlocked-badges";

const BADGES: Badge[] = [
  {
    id: "first_purchase",
    name: "First Purchase",
    description: "Complete your first order",
    icon: "🛒",
    condition: (ctx) => ctx.totalOrders >= 1,
    points: 50,
  },
  {
    id: "big_spender",
    name: "Big Spender",
    description: "Spend over $500 total",
    icon: "💰",
    condition: (ctx) => ctx.totalSpent >= 500,
    points: 200,
  },
  {
    id: "reviewer",
    name: "Reviewer",
    description: "Write your first review",
    icon: "✍️",
    condition: (ctx) => ctx.totalReviews >= 1,
    points: 30,
  },
  {
    id: "top_reviewer",
    name: "Top Reviewer",
    description: "Write 10 or more reviews",
    icon: "🏆",
    condition: (ctx) => ctx.totalReviews >= 10,
    points: 250,
  },
  {
    id: "collector",
    name: "Collector",
    description: "Add 5 or more items to your wishlist",
    icon: "❤️",
    condition: (ctx) => ctx.wishlistCount >= 5,
    points: 75,
  },
  {
    id: "wishlist_master",
    name: "Wishlist Master",
    description: "Add 20 or more items to your wishlist",
    icon: "💝",
    condition: (ctx) => ctx.wishlistCount >= 20,
    points: 300,
  },
  {
    id: "power_shopper",
    name: "Power Shopper",
    description: "Complete 10 or more orders",
    icon: "⚡",
    condition: (ctx) => ctx.totalOrders >= 10,
    points: 400,
  },
  {
    id: "loyal_customer",
    name: "Loyal Customer",
    description: "Complete 25 or more orders",
    icon: "👑",
    condition: (ctx) => ctx.totalOrders >= 25,
    points: 1000,
  },
  {
    id: "referral_starter",
    name: "Referral Starter",
    description: "Refer your first friend",
    icon: "🤝",
    condition: (ctx) => ctx.referralCount >= 1,
    points: 100,
  },
  {
    id: "referral_pro",
    name: "Referral Pro",
    description: "Refer 5 or more friends",
    icon: "🌟",
    condition: (ctx) => ctx.referralCount >= 5,
    points: 500,
  },
  {
    id: "deal_hunter",
    name: "Deal Hunter",
    description: "Use 3 or more discount codes",
    icon: "🏷️",
    condition: (ctx) => ctx.discountCount >= 3,
    points: 150,
  },
  {
    id: "night_owl",
    name: "Night Owl",
    description: "Place an order between midnight and 4am",
    icon: "🦉",
    condition: (ctx) => {
      const hour = new Date().getHours();
      return ctx.hasNightOrder && hour >= 0 && hour < 4;
    },
    points: 50,
  },
];

const AchievementContext = createContext<AchievementContextType | undefined>(undefined);

function loadUnlockedBadges(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return [];
}

function saveUnlockedBadges(badges: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(badges));
  } catch {
    // ignore
  }
}

export function AchievementProvider({ children }: AchievementProviderProps) {
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>(() => loadUnlockedBadges());
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [wishlistCount, setWishlistCountState] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [discountCount, setDiscountCount] = useState(0);
  const [hasNightOrder, setHasNightOrder] = useState(false);

  useEffect(() => {
    saveUnlockedBadges(unlockedBadges);
  }, [unlockedBadges]);

  const isUnlocked = useCallback(
    (id: string) => unlockedBadges.includes(id),
    [unlockedBadges]
  );

  const totalPoints = useMemo(() => {
    return BADGES.reduce((sum, badge) => {
      if (unlockedBadges.includes(badge.id)) {
        return sum + badge.points;
      }
      return sum;
    }, 0);
  }, [unlockedBadges]);

  const checkAndUnlock = useCallback(
    (ctx: Omit<AchievementContextType, "checkAndUnlock" | "unlockedBadges" | "totalPoints" | "badges">) => {
      setUnlockedBadges((prev) => {
        const newUnlocked = [...prev];
        let changed = false;
        for (const badge of BADGES) {
          if (!newUnlocked.includes(badge.id) && badge.condition({ ...ctx, badges: BADGES, unlockedBadges: prev, totalPoints: 0, checkAndUnlock: () => {}, isUnlocked: () => false, incrementOrders: () => {}, addSpent: () => {}, incrementReviews: () => {}, setWishlistCount: () => {}, incrementReferrals: () => {}, incrementDiscounts: () => {}, markNightOrder: () => {} })) {
            newUnlocked.push(badge.id);
            changed = true;
            window.dispatchEvent(new CustomEvent("notify", { detail: `Badge unlocked: ${badge.icon} ${badge.name}! +${badge.points} points` }));
          }
        }
        return changed ? newUnlocked : prev;
      });
    },
    []
  );

  const incrementOrders = useCallback(() => {
    setTotalOrders((p) => p + 1);
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 4) setHasNightOrder(true);
  }, []);

  const addSpent = useCallback((amount: number) => {
    setTotalSpent((p) => p + amount);
  }, []);

  const incrementReviews = useCallback(() => {
    setTotalReviews((p) => p + 1);
  }, []);

  const setWishlistCountFn = useCallback((count: number) => {
    setWishlistCountState(count);
  }, []);

  const incrementReferrals = useCallback(() => {
    setReferralCount((p) => p + 1);
  }, []);

  const incrementDiscounts = useCallback(() => {
    setDiscountCount((p) => p + 1);
  }, []);

  const markNightOrder = useCallback(() => {
    setHasNightOrder(true);
  }, []);

  const value: AchievementContextType = useMemo(
    () => ({
      badges: BADGES,
      unlockedBadges,
      totalPoints,
      totalOrders,
      totalSpent,
      totalReviews,
      wishlistCount,
      referralCount,
      discountCount,
      hasNightOrder,
      checkAndUnlock,
      isUnlocked,
      incrementOrders,
      addSpent,
      incrementReviews,
      setWishlistCount: setWishlistCountFn,
      incrementReferrals,
      incrementDiscounts,
      markNightOrder,
    }),
    [unlockedBadges, totalPoints, totalOrders, totalSpent, totalReviews, wishlistCount, referralCount, discountCount, hasNightOrder, checkAndUnlock, isUnlocked, incrementOrders, addSpent, incrementReviews, setWishlistCountFn, incrementReferrals, incrementDiscounts, markNightOrder]
  );

  return (
    <AchievementContext.Provider value={value}>
      {children}
    </AchievementContext.Provider>
  );
}

export function useAchievements(): AchievementContextType {
  const context = useContext(AchievementContext);
  if (context === undefined) {
    throw new Error("useAchievements must be used within an AchievementProvider");
  }
  return context;
}

export default AchievementContext;