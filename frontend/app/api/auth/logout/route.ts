import { NextResponse } from "next/server";

export async function POST() {
  try {
    await fetch("http://localhost:3003/api/auth/logout", { method: "POST" });
  } catch {
    // Backend may be down, still clear cookies
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set("user_session", "", { path: "/", maxAge: 0 });
  response.cookies.set("admin_session", "", { path: "/", maxAge: 0 });
  return response;
}
