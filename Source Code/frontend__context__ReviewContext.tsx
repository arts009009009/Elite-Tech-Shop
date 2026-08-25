"use client";
import { createContext, useState, useCallback, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";

export type Review = { id: number; product_id: number; username: string; rating: number; comment: string; created_at: string };
export type ReviewState = {
  reviews: Record<number, Review[]>;
  addReview: (productId: number, author: string, rating: number, comment: string) => void;
  getAverageRating: (productId: number) => number;
  getReviewCount: (productId: number) => number;
  recentReviews: Review[];
};

export const ReviewContext = createContext<ReviewState | null>(null);

import { goFetch } from "@/lib/goFetch";

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [reviews, setReviews] = useState<Record<number, Review[]>>({});

  useEffect(() => {
    goFetch("/api/reviews").then(r => r.json()).then((data: Review[]) => {
      if (!Array.isArray(data)) return;
      const grouped: Record<number, Review[]> = {};
      for (const rev of data) {
        if (!grouped[rev.product_id]) grouped[rev.product_id] = [];
        grouped[rev.product_id].push(rev);
      }
      setReviews(grouped);
    }).catch(() => {});
  }, []);

  const addReview = useCallback(async (productId: number, author: string, rating: number, comment: string) => {
    try {
      const res = await goFetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, username: author, rating, comment }),
      });
      const newReview: Review = await res.json();
      setReviews(prev => ({
        ...prev,
        [productId]: [...(prev[productId] || []), newReview],
      }));
    } catch {}
  }, []);

  const getAverageRating = useCallback((productId: number): number => {
    const productReviews = reviews[productId];
    if (!productReviews || productReviews.length === 0) return 0;
    const sum = productReviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / productReviews.length) * 10) / 10;
  }, [reviews]);

  const getReviewCount = useCallback((productId: number): number => reviews[productId]?.length || 0, [reviews]);

  const recentReviews = Object.values(reviews).flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

  return (
    <ReviewContext.Provider value={useMemo(() => ({ reviews, addReview, getAverageRating, getReviewCount, recentReviews }), [reviews, addReview, getAverageRating, getReviewCount, recentReviews])}>
      {children}
    </ReviewContext.Provider>
  );
}

export function useReviews() {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error("useReviews must be used within ReviewProvider");
  return ctx;
}
