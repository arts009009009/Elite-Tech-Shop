/**
 * zig-platform API client
 * Talks to the new Zig backend (http://localhost:8090 in dev; relative in prod
 * via Next.js rewrites in frontend/next.config.ts).
 */
const ZIG_BASE = process.env.NEXT_PUBLIC_ZIG_API_URL ?? "/api/zig";

async function zig(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${ZIG_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  return res;
}

export const zigPlatform = {
  // health / root
  root: () => zig(""),

  // tracing
  traceList: () => zig("/trace"),
  traceIngest: (body: unknown) => zig("/trace", { method: "POST", body: JSON.stringify(body) }),

  // chaos engineering
  chaosList: () => zig("/chaos"),
  chaosToggle: (service: string, faultType: string, enabled: boolean) =>
    zig("/chaos/toggle", {
      method: "POST",
      body: JSON.stringify({ service, fault_type: faultType, enabled }),
    }),

  // real-time inventory (SSE)
  inventorySse: (onEvent: (data: string) => void) => {
    const es = new EventSource(`${ZIG_BASE}/inventory/stream`);
    es.onmessage = (e) => onEvent(e.data);
    return es;
  },

  // abandoned cart recovery
  abandonedCarts: () => zig("/abandoned-carts"),
  recoverCart: (cartId: string) =>
    zig("/abandoned-carts/recover", {
      method: "POST",
      body: JSON.stringify({ cart_id: cartId }),
    }),

  // product bundles
  bundles: () => zig("/bundles"),

  // gift cards
  giftCards: () => zig("/gift-cards"),
  validateGiftCard: (code: string) =>
    zig("/gift-cards/validate", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  // rate limiting & circuit breakers
  rateLimit: () => zig("/rate-limit"),
  circuitBreakers: () => zig("/circuit-breakers"),

  // feature flags
  flags: () => zig("/flags"),
  flagCheck: (key: string, userId?: string) =>
    zig("/flags/check", {
      method: "POST",
      body: JSON.stringify({ key, user_id: userId ?? "" }),
    }),

  // A/B testing
  abTest: () => zig("/abtest"),

  // OAuth2
  oauthAuthorize: () => zig("/oauth/authorize"),
  oauthToken: () => zig("/oauth/token", { method: "POST" }),

  // MFA
  mfaSetup: () => zig("/mfa/setup"),
  mfaVerify: (token: string) =>
    zig("/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  // WebRTC signaling
  webrtcSignal: (room: string, peerId: string, sdp: string) =>
    zig("/webrtc/signal", {
      method: "POST",
      body: JSON.stringify({ room, peer_id: peerId, sdp }),
    }),
  webrtcCandidates: (body: unknown) =>
    zig("/webrtc/candidates", { method: "POST", body: JSON.stringify(body) }),
};
