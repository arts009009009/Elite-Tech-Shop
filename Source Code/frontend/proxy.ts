import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "admin_session";

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
