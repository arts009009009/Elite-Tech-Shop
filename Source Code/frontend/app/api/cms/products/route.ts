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
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 100);
    const skip = parseInt(searchParams.get("skip") || "0");

    const products = await getProducts(limit, skip);
    return NextResponse.json({ configured: true, products, total: products.length });
  } catch {
    return NextResponse.json({ error: "Failed to fetch CMS products" }, { status: 500 });
  }
}
