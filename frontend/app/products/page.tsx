import Link from "next/link";
import Navbar from "@/components/Navbar";
import { apiFetch } from "@/lib/api-fetch";

type Product = {
  id: number;
  title: string;
  price: number;
  currency: string;
  category?: string;
};

type ProductsApiResponse = {
  products: Product[];
  total: number;
};

const FALLBACK_PRODUCTS: Product[] = [];

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  console.log(`[BACKEND] ${new Date().toISOString()} | RUST :3002 | GET /api/products?lang=en | called`);
  const data = await apiFetch<ProductsApiResponse>(
    "/api/products?lang=en",
    { timeout: 5000, retries: 3, fallback: { products: FALLBACK_PRODUCTS, total: 0 } },
  );
  console.log(`[BACKEND] ${new Date().toISOString()} | RUST :3002 | GET /api/products?lang=en | OK`);
  const products = data.products ?? FALLBACK_PRODUCTS;

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2>Products ({products.length})</h2>
            <Link href="/categories" prefetch style={{ color: "var(--accent, #00d4ff)", textDecoration: "underline", fontSize: 14 }}>
              Browse Categories →
            </Link>
          </div>

          <div style={{ fontSize: 12, color: "#888" }}>
            live from Rust backend • 3 retries • 5s timeout
          </div>

          {products.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
              <p>No products available. The Rust backend may be starting up.</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>Try refreshing in a few seconds.</p>
            </div>
          ) : (
            <div className="flex items-stretch gap-4 flex-wrap justify-center">
              {products.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.id}`}
                  prefetch
                  className="w-full"
                  style={{
                    flex: "1 1 23%",
                    minWidth: 200,
                    display: "flex",
                    padding: 16,
                    border: "1px solid #333",
                    borderRadius: 8,
                    background: "#111",
                    color: "#eee",
                    textDecoration: "none",
                    flexDirection: "column",
                  }}
                >
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>{p.title}</h3>
                  <p style={{ fontSize: 18, fontWeight: "bold", color: "#39FF14", marginTop: 8 }}>
                    {p.currency} {p.price.toFixed(2)}
                  </p>
                  {p.category && (
                    <span style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                      {p.category}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}