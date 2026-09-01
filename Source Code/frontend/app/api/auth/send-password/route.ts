import { NextResponse } from "next/server";

const JAVA_BACKEND = process.env.JAVA_BACKEND_URL || "http://localhost:3001";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${JAVA_BACKEND}/api/auth/send-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: "backend_unavailable" }, { status: 503 });
  }
}
