import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const path = searchParams.get("path");

  if (secret !== (process.env.REVALIDATION_SECRET || "elite-revalidation-secret")) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  if (path) {
    revalidateTag(path, "max");
  }

  revalidateTag("products", "max");
  revalidateTag("categories", "max");

  return NextResponse.json({ revalidated: true, path, timestamp: Date.now() });
}
