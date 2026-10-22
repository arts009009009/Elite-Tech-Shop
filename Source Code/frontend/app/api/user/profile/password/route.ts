import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession, jsonUnauthorized, jsonServerError } from "@/lib/auth-middleware";

const GO_BACKEND = process.env.GO_BACKEND_URL || "http://localhost:3003";

export async function PUT(request: Request) {
  const auth = await validateSession();
  if (!auth.authenticated) return jsonUnauthorized();

  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;
    const cookieStore = await cookies();
    const session = cookieStore.get("user_session")?.value;

    if (!currentPassword || typeof currentPassword !== "string") {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json({ error: "New password is required" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    if (newPassword.length > 128) {
      return NextResponse.json({ error: "New password must be under 128 characters" }, { status: 400 });
    }

    const res = await fetch(`${GO_BACKEND}/api/profile/password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Cookie: `user_session=${session}` } : {}),
      },
      body: JSON.stringify({ old_password: currentPassword, new_password: newPassword }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ error: data.error || "Failed to change password" }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: "Password changed successfully" });
  } catch {
    return jsonServerError("Profile service unavailable");
  }
}
