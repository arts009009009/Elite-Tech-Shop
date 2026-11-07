import productTranslations from "@/data/products.json";

type HttpMethod = "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";

type ApiFetchOptions<T = unknown> = {
  timeout?: number;
  retries?: number;
  fallback?: T | null;
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: Record<string, unknown> | string | null;
  credentials?: RequestCredentials;
};

const defaults = {
  timeout: 5000,
  retries: 3,
  fallback: null,
} as const;

// Retrying a POST/PUT/DELETE can duplicate a side effect when the first
// attempt actually reached the backend (a timed-out order that executed, a
// payment submitted twice). Only methods that are safe to repeat are retried
// automatically, plus callers that send an idempotency key the backend can
// deduplicate on.
const IDEMPOTENT_METHODS = new Set<HttpMethod>(["GET", "HEAD", "OPTIONS"]);

function hasIdempotencyKey(headers?: Record<string, string>): boolean {
  if (!headers) return false;
  return Object.keys(headers).some((key) => key.toLowerCase() === "idempotency-key");
}

// Separates a status failure from a network/parse failure so the retry loop
// can decide whether another attempt makes sense.
class ApiHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(`HTTP error! status: ${status}, message: ${message}`);
    this.name = "ApiHttpError";
    this.status = status;
  }
}

const BACKEND_URLS: Record<string, string> = {
  products: process.env.RUST_BACKEND_URL || "http://localhost:3002",
  categories: process.env.RUST_BACKEND_URL || "http://localhost:3002",
  health: process.env.RUST_BACKEND_URL || "http://localhost:3002",
  auth: process.env.JAVA_BACKEND_URL || "http://localhost:3001",
};

const RUST_ENABLED =
  process.env.NEXT_PUBLIC_RUST_BACKEND_ENABLED === "true" ||
  (process.env.NODE_ENV !== "development" && process.env.NEXT_PUBLIC_RUST_BACKEND_ENABLED !== "false");
const JAVA_ENABLED =
  process.env.NEXT_PUBLIC_JAVA_BACKEND_ENABLED === "true" ||
  (process.env.NODE_ENV !== "development" && process.env.NEXT_PUBLIC_JAVA_BACKEND_ENABLED !== "false");
const GO_ENABLED =
  process.env.NEXT_PUBLIC_GO_BACKEND_ENABLED === "true" ||
  (process.env.NODE_ENV !== "development" && process.env.NEXT_PUBLIC_GO_BACKEND_ENABLED !== "false");

function localRustResponse<T>(url: string): T | undefined {
  if (RUST_ENABLED) return undefined;

  const parsedUrl = new URL(url, "http://localhost");
  const lang = parsedUrl.searchParams.get("lang") || "en";
  const localizedProducts = productTranslations.products.map((rawProduct) => {
    const product = rawProduct as unknown as {
      id: number;
      category?: string;
      image?: string;
      [key: string]: unknown;
    };
    const localized = (product[lang] ?? product.en) as Record<string, unknown>;
    return { id: product.id, category: product.category, image: product.image, ...localized };
  });

  if (parsedUrl.pathname === "/api/categories") {
    return { categories: [...new Set(localizedProducts.map((product) => product.category).filter(Boolean))], total: 2 } as T;
  }

  if (parsedUrl.pathname === "/api/products") {
    return { products: localizedProducts, total: localizedProducts.length } as T;
  }

  const productMatch = parsedUrl.pathname.match(/^\/api\/products\/(\d+)$/);
  if (productMatch) {
    return (localizedProducts.find((product) => product.id === Number(productMatch[1])) ?? null) as T;
  }

  if (parsedUrl.pathname === "/api/health") {
    return { status: "ok", source: "local" } as T;
  }

  return undefined;
}

function resolveBackendUrl(url: string): string {
  if (url.startsWith("http")) return url;
  if (typeof window !== "undefined") return url;
  for (const [prefix, backend] of Object.entries(BACKEND_URLS)) {
    if (url.startsWith(`/api/${prefix}`)) return `${backend}${url}`;
  }
  const goBackendUrl = process.env.GO_BACKEND_URL || "http://localhost:3003";
  return `${goBackendUrl}${url}`;
}

export async function apiFetch<T>(
  url: string,
  options: ApiFetchOptions<T> = {},
): Promise<T> {
  const { timeout, retries, fallback, method, headers, body, credentials } = { ...defaults, ...options };
  if (/^\/?api\/(products|categories|health)(\/|\?|$)/.test(url)) {
    const localResponse = localRustResponse<T>(url);
    if (localResponse !== undefined) return localResponse;
  }
  const pathname = new URL(url, "http://localhost").pathname;
  if (pathname.startsWith("/api/auth") && !JAVA_ENABLED) {
    return fallback !== null && fallback !== undefined ? fallback : (null as T);
  }
  if (!pathname.startsWith("/api/products") && !pathname.startsWith("/api/categories") && !pathname.startsWith("/api/health") && !pathname.startsWith("/api/auth") && !GO_ENABLED) {
    return fallback !== null && fallback !== undefined ? fallback : (null as T);
  }
  const resolvedUrl = resolveBackendUrl(url);
  const httpMethod: HttpMethod = method || "GET";
  const maxRetries =
    IDEMPOTENT_METHODS.has(httpMethod) || hasIdempotencyKey(headers) ? retries : 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchInit: RequestInit = { 
        signal: controller.signal,
        method: httpMethod,
      };
      
      if (headers) {
        fetchInit.headers = { ...headers };
      }
      
      if (body !== null && body !== undefined) {
        if (typeof body === "string") {
          fetchInit.body = body;
        } else {
          fetchInit.body = JSON.stringify(body);
          if (!fetchInit.headers) fetchInit.headers = {};
          (fetchInit.headers as Record<string, string>)["Content-Type"] = "application/json";
        }
      }
      
      if (credentials) {
        fetchInit.credentials = credentials;
      }

      const res = await fetch(resolvedUrl, fetchInit);
      clearTimeout(timer);

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        // Non-OK bodies are frequently HTML error pages (an HTML 502 from a
        // proxy). A failed parse must never replace the real HTTP error or
        // escape the try/catch as a "network" failure and trigger another
        // retry.
        let errorData: { message?: string } | null = null;
        if (errorText) {
          try {
            errorData = JSON.parse(errorText) as { message?: string };
          } catch {
            errorData = null;
          }
        }

        // Only 5xx is worth another attempt, and only for requests that may
        // be repeated. 4xx responses are never retried.
        if (res.status >= 500 && attempt < maxRetries) {
          await backoff(attempt);
          continue;
        }

        if (fallback !== null && fallback !== undefined) {
          return fallback;
        }

        throw new ApiHttpError(res.status, errorData?.message || errorText.slice(0, 300) || "Unknown error");
      }

      try {
        const data = await res.json();
        return data as T;
      } catch {
        if (fallback !== null && fallback !== undefined) {
          return fallback;
        }
        throw new Error("Failed to parse response as JSON");
      }
    } catch (error) {
      clearTimeout(timer);

      // Status failures have already been decided above: never retry a 4xx,
      // nor any status of a request that must not be repeated.
      const isStatusError = error instanceof ApiHttpError;
      if (!isStatusError && attempt < maxRetries) {
        await backoff(attempt);
        continue;
      }

      if (fallback !== null && fallback !== undefined) {
        return fallback;
      }
      
      throw error;
    }
  }

  if (fallback !== null && fallback !== undefined) {
    return fallback;
  }
  
  throw new Error("Max retries exceeded");
}

function backoff(attempt: number): Promise<void> {
  const ms = Math.min(1000 * 2 ** attempt, 5000);
  return new Promise((r) => setTimeout(r, ms));
}
