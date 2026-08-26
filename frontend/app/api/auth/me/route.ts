import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get("cookie") || "";
    const res = await fetch("http://localhost:3001/api/auth/me", {
      headers: { cookie },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 503 });
  }
}
