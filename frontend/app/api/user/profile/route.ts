import { NextResponse } from "next/server";
import {
  validateSession,
  jsonUnauthorized,
  jsonServerError,
} from "@/lib/auth-middleware";

const GO_BACKEND =
  process.env.GO_BACKEND_URL || "http://localhost:3003";

const MAX_EMAIL_LENGTH = 254;
const MAX_USERNAME_LENGTH = 30;

function isValidEmail(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  // RFC-style maximum length prevents excessively large attacker input.
  if (value.length === 0 || value.length > MAX_EMAIL_LENGTH) {
    return false;
  }

  // Avoid a backtracking-heavy regex. Validate the basic structure
  // using bounded string operations instead.
  const atIndex = value.indexOf("@");

  if (atIndex <= 0 || atIndex !== value.lastIndexOf("@")) {
    return false;
  }

  const localPart = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);

  if (localPart.length === 0 || domain.length === 0) {
    return false;
  }

  if (
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..")
  ) {
    return false;
  }

  if (
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.includes("..")
  ) {
    return false;
  }

  const dotIndex = domain.lastIndexOf(".");

  // Require a domain suffix such as ".com".
  if (dotIndex <= 0 || dotIndex === domain.length - 1) {
    return false;
  }

  // Reject whitespace and obviously invalid email characters.
  const invalidCharacters = [
    " ",
    "\t",
    "\n",
    "\r",
    "<",
    ">",
    "(",
    ")",
    "[",
    "]",
    "\\",
    '"',
    ",",
    ";",
  ];

  for (const character of invalidCharacters) {
    if (value.includes(character)) {
      return false;
    }
  }

  return true;
}

function isValidUsername(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  if (
    value.length < 3 ||
    value.length > MAX_USERNAME_LENGTH
  ) {
    return false;
  }

  // Every character is checked individually, avoiding
  // regex processing on uncontrolled input.
  for (const character of value) {
    const isLowercaseLetter =
      character >= "a" && character <= "z";

    const isUppercaseLetter =
      character >= "A" && character <= "Z";

    const isNumber =
      character >= "0" && character <= "9";

    const isAllowedSymbol =
      character === "_" || character === "-";

    if (
      !isLowercaseLetter &&
      !isUppercaseLetter &&
      !isNumber &&
      !isAllowedSymbol
    ) {
      return false;
    }
  }

  return true;
}

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function GET() {
  const auth = await validateSession();

  if (!auth.authenticated) {
    return jsonUnauthorized();
  }

  try {
    const res = await fetch(`${GO_BACKEND}/api/profile`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json(data);
  } catch {
    return jsonServerError("Profile service unavailable");
  }
}

export async function PUT(request: Request) {
  const auth = await validateSession();

  if (!auth.authenticated) {
    return jsonUnauthorized();
  }

  try {
    const body: unknown = await request.json();

    if (!isObject(body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if ("email" in body) {
      if (!isValidEmail(body.email)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }
    }

    if ("username" in body) {
      if (!isValidUsername(body.username)) {
        return NextResponse.json(
          {
            error:
              "Username must be 3-30 characters and can only contain letters, numbers, underscores, and hyphens",
          },
          { status: 400 }
        );
      }
    }

    const res = await fetch(`${GO_BACKEND}/api/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));

      const errorMessage =
        isObject(data) && typeof data.error === "string"
          ? data.error
          : "Failed to update profile";

      return NextResponse.json(
        { error: errorMessage },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json(data);
  } catch {
    return jsonServerError("Profile service unavailable");
  }
}
