import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api-fetch";
import { scoreProducts, parsePersonalizationHeaders } from "@/lib/personalization";

type Product = { id: number; title: string; price: number; currency: string; category?: string; image?: string };

export const runtime = "edge";

export async function GET(request: Request) {
  const context = parsePersonalizationHeaders(request);

  const data = await apiFetch<{ products: Product[]; total: number }>(
    "/api/products?lang=en",
    { timeout: 5000, retries: 2, fallback: { products: [], total: 0 } }
  );

  const products = data.products || [];

  if (products.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  if (context.browseHistory.length === 0 && context.cartItems.length === 0) {
    const shuffled = [...products].sort(() => Math.random() - 0.5).slice(0, 8);
    return NextResponse.json({ recommendations: shuffled, segment: context.segment });
  }

  const scored = scoreProducts(products, context, 8);
  const recommended = scored
    .map((s) => {
      const product = products.find((p) => p.id === s.id);
      return product ? { ...product, _score: s.score, _reason: s.reason } : null;
    })
    .filter(Boolean);

  return NextResponse.json({
    recommendations: recommended,
    segment: context.segment,
    experimentGroup: context.experimentGroup,
  });
}
