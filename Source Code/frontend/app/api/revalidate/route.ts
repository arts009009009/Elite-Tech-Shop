import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function GET(request: NextRequest) {
  // Fail closed: without an explicitly configured secret this endpoint must
  // stay unusable rather than fall back to a committed default value that
  // would leave cache purges open to anyone.
  const secret = process.env.REVALIDATION_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Revalidation is not configured" }, { status: 503 });
  }

  // The secret is only accepted from a header: query strings end up in access
  // logs, and a GET with ?secret= is CSRF-triggerable via <img src>.
  if (request.headers.get("x-revalidation-secret") !== secret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const path = searchParams.get("path");
  const tag = searchParams.get("tag");

  // Paths are page routes, not cache tags — revalidateTag(path, "max") never
  // matched anything. A pattern such as /product/[slug] needs the "page" type.
  if (path) {
    revalidatePath(path, path.includes("[") ? "page" : undefined);
  }
  if (tag) {
    revalidateTag(tag, "max");
  }

  revalidateTag("products", "max");
  revalidateTag("categories", "max");

  return NextResponse.json({ revalidated: true, path, timestamp: Date.now() });
}
