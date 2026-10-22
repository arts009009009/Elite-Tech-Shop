import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JAVA_BACKEND = process.env.JAVA_BACKEND_URL || "http://localhost:3001";

export async function GET(request: NextRequest) {
  try {
    // Forward only the session cookie the backend actually reads — mirroring
    // lib/auth-middleware.ts — instead of leaking every cookie the browser
    // sent to this origin.
    const session = request.cookies.get("user_session")?.value;
    const res = await fetch(`${JAVA_BACKEND}/api/auth/me`, {
      headers: session ? { cookie: `user_session=${session}` } : {},
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 503 });
  }
}
