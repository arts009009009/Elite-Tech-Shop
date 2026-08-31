import { NextResponse } from "next/server";
import { validateSession, jsonUnauthorized, jsonServerError } from "@/lib/auth-middleware";

const GO_BACKEND = process.env.GO_BACKEND_URL || "http://localhost:3003";

export async function GET() {
  const auth = await validateSession();
  if (!auth.authenticated) return jsonUnauthorized();

  try {
    const res = await fetch(`${GO_BACKEND}/api/profile`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return jsonServerError("Profile service unavailable");
  }
}

export async function PUT(request: Request) {
  const auth = await validateSession();
  if (!auth.authenticated) return jsonUnauthorized();

  try {
    const body = await request.json();

    if (body.email && typeof body.email === "string") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
      }
    }

    if (body.username && typeof body.username === "string") {
      if (body.username.length < 3 || body.username.length > 30) {
        return NextResponse.json({ error: "Username must be 3-30 characters" }, { status: 400 });
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(body.username)) {
        return NextResponse.json({ error: "Username can only contain letters, numbers, underscores, and hyphens" }, { status: 400 });
      }
    }

    const res = await fetch(`${GO_BACKEND}/api/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ error: data.error || "Failed to update profile" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return jsonServerError("Profile service unavailable");
  }
}
