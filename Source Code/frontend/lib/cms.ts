import type { CMSProduct, CMSCategory, CMSPage, CMSResponse, CMSSiteImage } from "./cms-types";

const CONTENTFUL_SPACE = process.env.CONTENTFUL_SPACE_ID || "";
const CONTENTFUL_ACCESS_TOKEN = process.env.CONTENTFUL_ACCESS_TOKEN || "";
const CONTENTFUL_PREVIEW = process.env.CONTENTFUL_PREVIEW === "true";

const BASE_URL = CONTENTFUL_SPACE
  ? `https://${CONTENTFUL_SPACE}.cdn.contentful.com`
  : "";

const isConfigured = Boolean(CONTENTFUL_SPACE && CONTENTFUL_ACCESS_TOKEN);

async function fetchContentful<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  if (!isConfigured) return null;

  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("access_token", CONTENTFUL_ACCESS_TOKEN);
  if (CONTENTFUL_PREVIEW) url.searchParams.set("preview", "true");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    // Draft/preview content must never be served from the shared cache.
    const res = await fetch(url.toString(), CONTENTFUL_PREVIEW ? { cache: "no-store" } : { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

type ContentfulEntry<T = Record<string, unknown>> = {
  sys: { id: string };
  fields: T;
};

type ContentfulProductFields = {
  title: string;
  slug: string;
  description: string;
  richDescription?: Record<string, unknown>;
  price: number;
  currency: string;
  category: string;
  images?: { fields: { file: { url: string }; title: string; description: string; width: number; height: number } }[];
  specs?: { label: string; value: string }[];
  features?: string[];
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  publishedAt: string;
  updatedAt: string;
};

function mapProduct(entry: ContentfulEntry<ContentfulProductFields>): CMSProduct {
  const f = entry.fields;
  return {
    id: entry.sys.id,
    title: f.title,
    slug: f.slug,
    description: f.description,
    richDescription: f.richDescription,
    price: f.price,
    currency: f.currency,
    category: f.category,
    // A single malformed asset (no fields/file/url) must not throw and blank
    // the whole product list — skip just that image.
    images: (f.images || [])
      .map((img): CMSSiteImage | null => {
        const url = img?.fields?.file?.url;
        if (!url || typeof url !== "string") return null;
        return {
          url: url.startsWith("//") ? `https:${url}` : url,
          alt: img?.fields?.description || img?.fields?.title || "",
          width: img?.fields?.width || 0,
          height: img?.fields?.height || 0,
        };
      })
      .filter((img): img is CMSSiteImage => img !== null),
    specs: f.specs,
    features: f.features,
    tags: f.tags,
    seoTitle: f.seoTitle,
    seoDescription: f.seoDescription,
    publishedAt: f.publishedAt,
    updatedAt: f.updatedAt,
  };
}

export async function getProducts(limit = 100, skip = 0): Promise<CMSProduct[]> {
  const data = await fetchContentful<{ items: ContentfulEntry<ContentfulProductFields>[]; total: number }>(
    "/content_types/product/entries",
    { limit: String(limit), skip: String(skip), order: "-fields.publishedAt" }
  );
  if (!data || !Array.isArray(data.items)) return [];
  return data.items
    .map((item) => {
      // One malformed entry must not blank the whole list.
      try {
        return mapProduct(item);
      } catch {
        return null;
      }
    })
    .filter((product): product is CMSProduct => product !== null);
}

export type { CMSProduct, CMSCategory, CMSPage, CMSResponse };
