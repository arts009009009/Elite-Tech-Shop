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
const PRICE_MATCH_WEIGHT = 0.20;
const POPULARITY_WEIGHT = 0.10;
const DIVERSITY_WEIGHT = 0.10;

const USER_SEGMENTS: UserSegment[] = ["new", "returning", "high-value", "at-risk", "anonymous"];

function normalizeSegment(value: string | null | undefined): UserSegment | null {
  if (!value) return null;
  const candidate = value.trim().toLowerCase() as UserSegment;
  return USER_SEGMENTS.includes(candidate) ? candidate : null;
}

function safeSearchParams(request: Request): URLSearchParams {
  try {
    return new URL(request.url).searchParams;
  } catch {
    return new URLSearchParams();
  }
}

export function parsePersonalizationHeaders(request: Request): PersonalizationContext {
  // The same route is reachable through proxy-injected request headers (see
  // proxy.ts) and through plain fetch() calls where a caller can only pass
  // query params — accept either so the route is actually reachable with
  // context. Explicit query params win because the proxy overwrites the
  // segment header with its own cookie-derived value.
  const searchParams = safeSearchParams(request);

  const segment =
    normalizeSegment(searchParams.get("segment")) ||
    normalizeSegment(request.headers.get("x-user-segment")) ||
    "anonymous";

  const browseSource =
    searchParams.get("history") || request.headers.get("x-browse-history") || "";
  const cartSource = searchParams.get("cart") || request.headers.get("x-cart-items") || "";
  const experimentGroup =
    searchParams.get("experiment") ||
    request.headers.get("x-experiment-group") ||
    "control";

  return {
    segment,
    browseHistory: parseHeaderList(browseSource),
    cartItems: parseHeaderList(cartSource),
    purchaseHistory: [],
    categoryAffinity: {},
    priceRange: { min: 0, max: Infinity },
    experimentGroup,
  };
}

function parseHeaderList(header: string): number[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.trunc(n));
}

// Fisher–Yates shuffle: unlike sort(() => Math.random() - 0.5) every
// permutation is equally likely.
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
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
