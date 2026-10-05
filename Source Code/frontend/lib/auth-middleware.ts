import { cookies } from "next/headers";

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

export function jsonUnauthorized(error = "Unauthorized") {
  return Response.json({ error }, { status: 401 });
}

export function jsonBadRequest(error: string) {
  return Response.json({ error }, { status: 400 });
}

export function jsonServerError(error = "Internal server error") {
  return Response.json({ error }, { status: 500 });
}
