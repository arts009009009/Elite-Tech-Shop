export type UserSegment = "new" | "returning" | "high-value" | "at-risk" | "anonymous";

export type PersonalizationContext = {
  userId?: string;
  segment: UserSegment;
  browseHistory: number[];
  cartItems: number[];
  purchaseHistory: number[];
  categoryAffinity: Record<string, number>;
  priceRange: { min: number; max: number };
  experimentGroup: string;
};

export type ScoredProduct = {
  id: number;
  score: number;
  reason: string;
};

const CATEGORY_WEIGHT = 0.35;
const RECENCY_WEIGHT = 0.25;
const PRICE_MATCH_WEIGHT = 0.20;
const POPULARITY_WEIGHT = 0.10;
const DIVERSITY_WEIGHT = 0.10;

export function parsePersonalizationHeaders(request: Request): PersonalizationContext {
  const segment = (request.headers.get("x-user-segment") || "anonymous") as UserSegment;
  const browseHeader = request.headers.get("x-browse-history") || "";
  const cartHeader = request.headers.get("x-cart-items") || "";
  const experimentGroup = request.headers.get("x-experiment-group") || "control";

  return {
    segment,
    browseHistory: parseHeaderList(browseHeader),
    cartItems: parseHeaderList(cartHeader),
    purchaseHistory: [],
    categoryAffinity: {},
    priceRange: { min: 0, max: Infinity },
    experimentGroup,
  };
}

function parseHeaderList(header: string): number[] {
  if (!header) return [];
  return header.split(",").map(Number).filter((n) => !isNaN(n) && n > 0);
}

export function scoreProducts(
  products: { id: number; category?: string; price: number; currency?: string }[],
  context: PersonalizationContext,
  limit = 10
): ScoredProduct[] {
  const viewedSet = new Set(context.browseHistory);
  const cartSet = new Set(context.cartItems);
  const categoryCounts: Record<string, number> = {};

  for (const id of context.browseHistory) {
    const product = products.find((p) => p.id === id);
    if (product?.category) {
      categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
    }
  }

  const scored = products.map((product) => {
    let score = 0;
    let reason = "";

    if (cartSet.has(product.id)) {
      return { id: product.id, score: 1.0, reason: "in_cart" };
    }

    if (viewedSet.has(product.id)) {
      return { id: product.id, score: 0.0, reason: "already_viewed" };
    }

    if (product.category && categoryCounts[product.category]) {
      const affinity = categoryCounts[product.category] / Math.max(context.browseHistory.length, 1);
      score += affinity * CATEGORY_WEIGHT;
      reason = "category_match";
    }

    const priceInRange =
      context.priceRange.max === Infinity ||
      (product.price >= context.priceRange.min && product.price <= context.priceRange.max);
    if (priceInRange) {
      score += PRICE_MATCH_WEIGHT;
      if (!reason) reason = "price_match";
    }

    score += POPULARITY_WEIGHT * (0.5 + Math.random() * 0.5);
    if (!reason) reason = "popular";

    if (context.segment === "new") {
      score += DIVERSITY_WEIGHT;
    }

    return { id: product.id, score, reason };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function determineSegment(data: {
  orderCount?: number;
  lastOrderDays?: number;
  totalSpent?: number;
}): UserSegment {
  if (!data.orderCount || data.orderCount === 0) return "new";
  if (data.totalSpent && data.totalSpent > 500) return "high-value";
  if (data.lastOrderDays && data.lastOrderDays > 60) return "at-risk";
  return "returning";
}

export function getPersonalizationHeaders(context: PersonalizationContext): Record<string, string> {
  return {
    "x-user-segment": context.segment,
    "x-browse-history": context.browseHistory.join(","),
    "x-cart-items": context.cartItems.join(","),
    "x-experiment-group": context.experimentGroup,
  };
}
