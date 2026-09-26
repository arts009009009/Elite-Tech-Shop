"use client";
import { createContext, useState, useContext, useCallback, useEffect, useMemo } from "react";
import { goFetch } from "@/lib/goFetch";

type Product = { id: number; title: string; price: number; currency: string; category?: string; image?: string; rating?: number };

type RecommendationsContextType = {
  recommendations: Product[];
  loading: boolean;
  trackActivity: (productId: number, action: string) => void;
  refresh: () => void;
};

const RecommendationsContext = createContext<RecommendationsContextType | null>(null);

export function RecommendationsProvider({ children }: { children: React.ReactNode }) {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await goFetch("/api/recommendations");
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  const trackActivity = useCallback(async (productId: number, action: string) => {
    try {
      await goFetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, action }),
      });
      // Refresh recommendations after tracking
      setTimeout(refresh, 500);
    } catch {}
  }, [refresh]);

  useEffect(() => { refresh(); }, [refresh]); // eslint-disable-line react-hooks/set-state-in-effect -- fetch on mount

  return (
    <RecommendationsContext.Provider value={useMemo(() => ({ recommendations, loading, trackActivity, refresh }), [recommendations, loading, trackActivity, refresh])}>
      {children}
    </RecommendationsContext.Provider>
  );
}

export function useRecommendations() {
  const ctx = useContext(RecommendationsContext);
  if (!ctx) return { recommendations: [], loading: false, trackActivity: () => {}, refresh: () => {} };
  return ctx;
}
