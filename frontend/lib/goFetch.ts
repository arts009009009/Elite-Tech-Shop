const GO_URL = process.env.GO_BACKEND_URL || "http://localhost:3003";

export async function goFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${GO_URL}${path}`, { credentials: "include", ...opts });
  return res;
}
