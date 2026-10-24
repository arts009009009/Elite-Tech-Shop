import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "admin_session";
const USER_COOKIE = "user_session";

function generateExperimentGroup(request: NextRequest): string {
  const existing = request.cookies.get("experiment_group")?.value;
  if (existing && ["control", "a", "b"].includes(existing)) return existing;

  // Three equal buckets so every accepted value ("control" | "a" | "b") is
  // actually reachable — the old two-way split could never produce "b".
  const roll = Math.random();
  if (roll < 1 / 3) return "control";
  if (roll < 2 / 3) return "a";
  return "b";
}

function determineUserSegment(request: NextRequest): string {
  const session = request.cookies.get(USER_COOKIE)?.value;
  if (!session) return "anonymous";
  return "returning";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/")) {
    // Convenience gate only: it skips a pointless round-trip for anonymous
    // visitors. /admin/dashboard still validates the session server-side.
    const session = request.cookies.get(SESSION_COOKIE)?.value;

    if (!session || session.length === 0) {
      const loginUrl = new URL("/admin", request.url);
      loginUrl.searchParams.set("error", "auth_required");
      return NextResponse.redirect(loginUrl);
    }
  }

  const segment = determineUserSegment(request);
  const experimentGroup = generateExperimentGroup(request);

  // Personalization has to be set on the REQUEST that continues to the route
  // handlers: headers on the response are never visible to them, which is why
  // the old response-header wiring was dead code. The edge has no source for
  // x-browse-history / x-cart-items — those are forwarded unchanged when a
  // caller supplies them, and routes additionally accept the
  // ?segment=&history=&cart= query params (lib/personalization.ts).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-segment", segment);
  requestHeaders.set("x-experiment-group", experimentGroup);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (!request.cookies.get("experiment_group")) {
    response.cookies.set("experiment_group", experimentGroup, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
  }

  if (pathname.startsWith("/product/")) {
    response.headers.set("x-preload-product", "true");
  }

  if (pathname === "/" || pathname === "/products") {
    response.headers.set("x-preload-catalog", "true");
  }

  return response;
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/product/:path*",
    "/",
    "/products",
    "/categories",
    // Recommended-route requests need the personalization headers injected.
    "/api/recommendations/personalized",
  ],
};
