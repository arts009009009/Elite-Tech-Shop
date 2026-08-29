import { NextResponse } from "next/server";

const JAVA = "http://localhost:3001";
const GO = "http://localhost:3003";

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get("cookie") || "";
    let res: Response;
    try {
      res = await fetch(`${JAVA}/api/auth/me`, { headers: { cookie } });
    } catch {
      res = await fetch(`${GO}/api/auth/me`, { headers: { cookie } });
    }
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 503 });
  }
}
