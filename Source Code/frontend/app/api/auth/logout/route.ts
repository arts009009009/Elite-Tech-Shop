import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GO_BACKEND = process.env.GO_BACKEND_URL || "http://localhost:3003";

export async function POST() {
  try {
    // Forward the session cookie so the backend can invalidate the
    // server-side session, not just the browser cookie.
    const cookieStore = await cookies();
    const session = cookieStore.get("user_session")?.value;
    await fetch(`${GO_BACKEND}/api/auth/logout`, {
      method: "POST",
      headers: session ? { Cookie: `user_session=${session}` } : {},
    });
  } catch {
    // Backend may be down, still clear cookies
  }
  const response = NextResponse.json({ success: true });
  const clearOptions = {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };
  response.cookies.set("user_session", "", { ...clearOptions, maxAge: 0 });
  response.cookies.set("admin_session", "", { ...clearOptions, maxAge: 0 });
  response.cookies.set("guest_id", "", { ...clearOptions, maxAge: 0 });
  return response;
}
