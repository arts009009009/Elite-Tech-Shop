import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export type AuthUser = {
  username: string;
  email?: string;
  role?: string;
};

export type AuthResult = {
  authenticated: boolean;
  user: AuthUser | null;
  error?: string;
};

const GO_BACKEND = process.env.GO_BACKEND_URL || "http://localhost:3003";
const JAVA_BACKEND = process.env.JAVA_BACKEND_URL || "http://localhost:3001";

export async function validateSession(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("user_session")?.value;

    if (!session) {
      return { authenticated: false, user: null, error: "No session cookie" };
    }

    const res = await fetch(`${GO_BACKEND}/api/auth/me`, {
      headers: { Cookie: `user_session=${session}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return { authenticated: false, user: null, error: "Invalid session" };
    }

    const data = await res.json();
    return {
      authenticated: true,
      user: {
        username: data.username || data.user?.username,
        email: data.email || data.user?.email,
        role: data.role || data.user?.role || "user",
      },
    };
  } catch {
    return { authenticated: false, user: null, error: "Auth service unavailable" };
  }
}

export async function validateAdminSession(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session")?.value;

    if (!session) {
      return { authenticated: false, user: null, error: "No admin session" };
    }

    const res = await fetch(`${JAVA_BACKEND}/api/auth/me`, {
      headers: { Cookie: `admin_session=${session}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return { authenticated: false, user: null, error: "Invalid admin session" };
    }

    const data = await res.json();
    return {
      authenticated: true,
      user: {
        username: data.username || data.user?.username,
        email: data.email || data.user?.email,
        role: "admin",
      },
    };
  } catch {
    return { authenticated: false, user: null, error: "Admin auth unavailable" };
  }
}

export function validateSessionFromRequest(request: NextRequest): AuthResult {
  const session = request.cookies.get("user_session")?.value;

  if (!session) {
    return { authenticated: false, user: null, error: "No session cookie" };
  }

  return { authenticated: true, user: { username: "session_user" } };
}

export function jsonUnauthorized(error = "Unauthorized") {
  return Response.json({ error }, { status: 401 });
}

export function jsonForbidden(error = "Forbidden") {
  return Response.json({ error }, { status: 403 });
}

export function jsonBadRequest(error: string) {
  return Response.json({ error }, { status: 400 });
}

export function jsonServerError(error = "Internal server error") {
  return Response.json({ error }, { status: 500 });
}
