import Link from "next/link";
import Navbar from "@/components/Navbar";
import { apiFetch } from "@/lib/api-fetch";
import { generateCollectionMetadata } from "@/lib/seo";
import StructuredData from "@/components/StructuredData";
import { generateBreadcrumbJsonLd } from "@/lib/seo";

type CategoriesResponse = { categories: string[]; total: number };
type ProductsResponse = { products: { id: number; category?: string }[]; total: number };

const categoryEmojis: Record<string, string> = {
  laptops: "💻",
  smartphones: "📱",
};

export const revalidate = 120;

export const metadata = generateCollectionMetadata(
  "Categories",
  "Browse products by category. Find the perfect laptop or smartphone.",
  "/categories"
);

export default async function CategoriesPage() {
  const [catData, prodData] = await Promise.all([
    apiFetch<CategoriesResponse>("/api/categories", {
      timeout: 5000, retries: 3, fallback: { categories: [], total: 0 },
    }),
    apiFetch<ProductsResponse>("/api/products?lang=en", {
      timeout: 5000, retries: 3, fallback: { products: [], total: 0 },
    }),
  ]);

  const categories = catData.categories ?? [];
  const counts: Record<string, number> = {};
  for (const p of prodData.products ?? []) {
    const cat = (p.category as string) || "uncategorized";
    counts[cat] = (counts[cat] || 0) + 1;
  }

  const breadcrumbLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Categories", url: "/categories" },
  ]);

  return (
    <>
      <Navbar />
      <StructuredData data={breadcrumbLd} />
      <div className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2>Categories ({categories.length})</h2>
            <Link href="/products" prefetch style={{ color: "var(--accent, #00d4ff)", textDecoration: "underline", fontSize: 14 }}>
              All Products →
            </Link>
          </div>

          <div style={{ fontSize: 12, color: "#888" }}>
            live from Rust backend • ISR enabled (revalidate: 120s)
          </div>

          {categories.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
              <p>No categories available. The Rust backend may be starting up.</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>Try refreshing in a few seconds.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={`/products?category=${cat}`}
                  prefetch
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: 20,
                    border: "1px solid #333",
                    borderRadius: 8,
                    background: "#111",
                    color: "#eee",
                    textDecoration: "none",
                  }}
                >
                  <span style={{ fontSize: 32 }}>{categoryEmojis[cat] || "📦"}</span>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, textTransform: "capitalize" }}>{cat}</h3>
                    <p style={{ fontSize: 14, color: "#888" }}>{counts[cat] || 0} products</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
