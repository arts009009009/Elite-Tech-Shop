import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Regular users authenticate against the Go backend with a `user_session`
// cookie (set by the register/login routes). The previous implementation
// forwarded `admin_session` to the Java backend instead, so after any full
// page reload every regular user appeared logged out.
const GO_BACKEND = process.env.GO_BACKEND_URL || "http://localhost:3003";

export async function GET(request: NextRequest) {
  try {
    // Forward only the cookie the backend reads (`user_session` in Go's
    // getSessionUsername) instead of leaking every cookie to the backend.
    const session = request.cookies.get("user_session")?.value;
    const res = await fetch(`${GO_BACKEND}/api/auth/me`, {
      headers: session ? { cookie: `user_session=${session}` } : {},
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 503 });
  }
}
