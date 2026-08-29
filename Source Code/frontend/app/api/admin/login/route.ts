import { NextResponse } from "next/server";

const JAVA = "http://localhost:3001";
const GO = "http://localhost:3003";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let body: Record<string, string>;
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const form = await request.formData();
      body = Object.fromEntries(form.entries()) as Record<string, string>;
    }

    let res: Response;
    try {
      res = await fetch(`${JAVA}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      const goBody = { username: body.email || "admin", password: body.password };
      res = await fetch(`${GO}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goBody),
      });
    }

    const data = await res.json();
    const token = data.token;
    if (token) {
      const response = NextResponse.json({
        success: true,
        token,
        username: data.username,
        role: data.role,
        redirect: "/admin/dashboard",
      });
      response.cookies.set("admin_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
      return response;
    }
    return NextResponse.json({ success: false, error: data.error || "login_failed" }, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: "backend_unavailable" }, { status: 503 });
  }
}
