import { NextResponse } from "next/server";
import { getProducts } from "@/lib/cms";

export async function GET(request: Request) {
  const isConfigured = Boolean(process.env.CONTENTFUL_SPACE_ID && process.env.CONTENTFUL_ACCESS_TOKEN);

  if (!isConfigured) {
    return NextResponse.json({
      configured: false,
      message: "Contentful not configured. Set CONTENTFUL_SPACE_ID and CONTENTFUL_ACCESS_TOKEN in .env.local",
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    // Parse defensively: Number.parseInt("abc") is NaN, and Math.min(NaN, 100)
    // stays NaN — which the backend answers with a 400 that used to surface as
    // an empty 200 here. Fall back to the defaults and clamp to sane bounds.
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "100", 10);
    const parsedSkip = Number.parseInt(searchParams.get("skip") || "0", 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 100;
    const skip = Number.isFinite(parsedSkip) ? Math.max(parsedSkip, 0) : 0;

    const products = await getProducts(limit, skip);
    return NextResponse.json({ configured: true, products, total: products.length });
  } catch {
    return NextResponse.json({ error: "Failed to fetch CMS products" }, { status: 500 });
  }
}
