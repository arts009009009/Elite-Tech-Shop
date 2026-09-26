import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET || "elite-revalidation-secret";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { secret, tags, paths } = body;

    if (secret !== REVALIDATION_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        revalidateTag(tag, "max");
      }
    }

    if (paths && Array.isArray(paths)) {
      for (const path of paths) {
        revalidateTag(path, "max");
      }
    }

    revalidateTag("products", "max");
    revalidateTag("categories", "max");

    return NextResponse.json({ revalidated: true, timestamp: Date.now() });
  } catch {
    return NextResponse.json({ error: "Revalidation failed" }, { status: 500 });
  }
}
