import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log(`[BACKEND] ${new Date().toISOString()} | JAVA :3001 | POST /api/auth/send-password | calling`);
    const res = await fetch("http://localhost:3001/api/auth/send-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    console.log(`[BACKEND] ${new Date().toISOString()} | JAVA :3001 | POST /api/auth/send-password | ${res.ok ? 'OK' : 'FAIL'}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: "backend_unavailable" }, { status: 503 });
  }
}
