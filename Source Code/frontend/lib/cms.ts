import type { CMSProduct, CMSCategory, CMSPage, CMSResponse } from "./cms-types";

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
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
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
    images: (f.images || []).map((img) => ({
      url: img.fields.file.url.startsWith("//") ? `https:${img.fields.file.url}` : img.fields.file.url,
      alt: img.fields.description || img.fields.title,
      width: img.fields.width,
      height: img.fields.height,
    })),
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
  if (!data) return [];
  return data.items.map(mapProduct);
}

export async function getProductBySlug(slug: string): Promise<CMSProduct | null> {
  const data = await fetchContentful<{ items: ContentfulEntry<ContentfulProductFields>[] }>(
    "/content_types/product/entries",
    { "fields.slug": slug, limit: "1" }
  );
  if (!data || data.items.length === 0) return null;
  return mapProduct(data.items[0]);
}

export async function getProductById(id: string): Promise<CMSProduct | null> {
  const data = await fetchContentful<ContentfulEntry<ContentfulProductFields>>(`/entries/${id}`);
  if (!data) return null;
  return mapProduct(data);
}

export async function getCategories(): Promise<CMSCategory[]> {
  const data = await fetchContentful<{ items: ContentfulEntry<{ name: string; slug: string; description?: string; image?: { fields: { file: { url: string }; title: string; width: number; height: number } } }>[] }>(
    "/content_types/category/entries",
    { limit: "100" }
  );
  if (!data) return [];
  return data.items.map((entry) => ({
    id: entry.sys.id,
    name: entry.fields.name,
    slug: entry.fields.slug,
    description: entry.fields.description,
    image: entry.fields.image
      ? {
          url: entry.fields.image.fields.file.url.startsWith("//")
            ? `https:${entry.fields.image.fields.file.url}`
            : entry.fields.image.fields.file.url,
          alt: entry.fields.image.fields.title,
          width: entry.fields.image.fields.width,
          height: entry.fields.image.fields.height,
        }
      : undefined,
  }));
}

export async function getPageBySlug(slug: string): Promise<CMSPage | null> {
  const data = await fetchContentful<{ items: ContentfulEntry<{ title: string; slug: string; content: Record<string, unknown>; seoTitle?: string; seoDescription?: string; publishedAt: string }>[] }>(
    "/content_types/page/entries",
    { "fields.slug": slug, limit: "1" }
  );
  if (!data || data.items.length === 0) return null;
  const entry = data.items[0];
  return {
    id: entry.sys.id,
    title: entry.fields.title,
    slug: entry.fields.slug,
    content: entry.fields.content,
    seoTitle: entry.fields.seoTitle,
    seoDescription: entry.fields.seoDescription,
    publishedAt: entry.fields.publishedAt,
  };
}

export async function isCMSConfigured(): Promise<boolean> {
  return isConfigured;
}

export type { CMSProduct, CMSCategory, CMSPage, CMSResponse };
