import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  // Fail closed: without an explicitly configured secret this endpoint must
  // stay unusable rather than fall back to a committed default value that
  // would leave cache purges open to anyone.
  const secret = process.env.REVALIDATION_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Revalidation is not configured" }, { status: 503 });
  }

  // Header-only authentication: a body secret is fine for POST, but keeping
  // it out of the URL/query string means it never lands in access logs.
  if (request.headers.get("x-revalidation-secret") !== secret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { tags, paths } = body;

    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        if (typeof tag === "string" && tag) revalidateTag(tag, "max");
      }
    }

    // Paths are page routes, not cache tags — revalidateTag(path, "max")
    // never matched anything. A pattern such as /product/[slug] needs the
    // "page" type.
    if (paths && Array.isArray(paths)) {
      for (const path of paths) {
        if (typeof path === "string" && path.startsWith("/")) {
          revalidatePath(path, path.includes("[") ? "page" : undefined);
        }
      }
    }

    revalidateTag("products", "max");
    revalidateTag("categories", "max");

    return NextResponse.json({ revalidated: true, timestamp: Date.now() });
  } catch {
    return NextResponse.json({ error: "Revalidation failed" }, { status: 500 });
  }
}
