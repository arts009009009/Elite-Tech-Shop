type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";

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
  const goBackendUrl = process.env.GO_BACKEND_URL || "http://localhost:3003";
  return `${goBackendUrl}${url}`;
}

export async function apiFetch<T>(
  url: string,
  options: ApiFetchOptions<T> = {},
): Promise<T> {
  const { timeout, retries, fallback, method, headers, body, credentials } = { ...defaults, ...options };
  const resolvedUrl = resolveBackendUrl(url);

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchInit: RequestInit = { 
        signal: controller.signal,
        method: method || "GET",
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
        const errorData = errorText ? JSON.parse(errorText) : null;
        
        if (attempt < retries) {
          await backoff(attempt);
          continue;
        }
        
        if (fallback !== null && fallback !== undefined) {
          return fallback;
        }
        
        throw new Error(`HTTP error! status: ${res.status}, message: ${errorData?.message || errorText || "Unknown error"}`);
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

      if (attempt < retries) {
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
