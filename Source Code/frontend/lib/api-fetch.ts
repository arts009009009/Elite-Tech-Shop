type ApiFetchOptions = {
  timeout?: number;
  retries?: number;
  fallback?: unknown;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  credentials?: RequestCredentials;
};

const defaults: Omit<Required<ApiFetchOptions>, "body" | "headers" | "method" | "credentials"> = {
  timeout: 5000,
  retries: 3,
  fallback: null,
};

const BACKEND_URLS: Record<string, string> = {
  products: process.env.RUST_BACKEND_URL || "http://localhost:3002",
  categories: process.env.RUST_BACKEND_URL || "http://localhost:3002",
  health: process.env.RUST_BACKEND_URL || "http://localhost:3002",
  auth: process.env.JAVA_BACKEND_URL || "http://localhost:3001",
};

function resolveBackendUrl(url: string): string {
  if (url.startsWith("http")) return url;
  if (typeof window !== "undefined") return url;
  for (const [prefix, backend] of Object.entries(BACKEND_URLS)) {
    if (url.startsWith(`/api/${prefix}`)) return `${backend}${url}`;
  }
  return `${process.env.GO_BACKEND_URL || "http://localhost:3003"}${url}`;
}

export async function apiFetch<T>(
  url: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { timeout, retries, fallback, method, headers, body, credentials } = { ...defaults, ...options };
  const resolvedUrl = resolveBackendUrl(url);

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchInit: RequestInit = { signal: controller.signal };
      if (method) fetchInit.method = method;
      if (headers) fetchInit.headers = headers;
      if (body) fetchInit.body = typeof body === "string" ? body : JSON.stringify(body);
      if (credentials) fetchInit.credentials = credentials;

      const res = await fetch(resolvedUrl, fetchInit);
      clearTimeout(timer);

      if (!res.ok) {
        if (attempt < retries) {
          await backoff(attempt);
          continue;
        }
        return fallback as T;
      }

      return await res.json() as T;
    } catch {
      clearTimeout(timer);

      if (attempt < retries) {
        await backoff(attempt);
        continue;
      }

      return fallback as T;
    }
  }

  return fallback as T;
}

function backoff(attempt: number): Promise<void> {
  const ms = Math.min(1000 * 2 ** attempt, 5000);
  return new Promise((r) => setTimeout(r, ms));
}
