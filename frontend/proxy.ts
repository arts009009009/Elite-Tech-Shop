import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "admin_session";
const USER_COOKIE = "user_session";

function generateExperimentGroup(request: NextRequest): string {
  const existing = request.cookies.get("experiment_group")?.value;
  if (existing && ["control", "a", "b"].includes(existing)) return existing;

  const group = Math.random() < 0.5 ? "control" : "a";
  return group;
}

function determineUserSegment(request: NextRequest): string {
  const session = request.cookies.get(USER_COOKIE)?.value;
  if (!session) return "anonymous";
  return "returning";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/dashboard")) {
    const session = request.cookies.get(SESSION_COOKIE)?.value;

    if (!session || session.length === 0) {
      const loginUrl = new URL("/admin", request.url);
      loginUrl.searchParams.set("error", "auth_required");
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  const response = NextResponse.next();

  const segment = determineUserSegment(request);
  const experimentGroup = generateExperimentGroup(request);

  response.headers.set("x-user-segment", segment);
  response.headers.set("x-experiment-group", experimentGroup);

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
  matcher: ["/admin/:path*", "/product/:path*", "/", "/products", "/categories"],
};
