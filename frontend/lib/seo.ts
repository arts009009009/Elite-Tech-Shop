import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://elite-tech.shop";
const SITE_NAME = "Elite Tech Shop";
const DEFAULT_OG_IMAGE = "/elitetech.png";

type ProductSEO = {
  id: number | string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  image?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
};

export function generateProductMetadata(product: ProductSEO, lang = "en"): Metadata {
  const url = `${SITE_URL}/product/${product.id}`;
  const title = `${product.title} | ${SITE_NAME}`;
  const description = product.description || `Buy ${product.title} at ${SITE_NAME}. Premium quality, fast shipping.`;
  const image = product.image?.startsWith("http") ? product.image : `${SITE_URL}${product.image || DEFAULT_OG_IMAGE}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: product.title,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: product.title }],
      type: "website",
      locale: lang === "ar" ? "ar_SA" : lang === "ru" ? "ru_RU" : lang === "fr" ? "fr_FR" : lang === "es" ? "es_ES" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description,
      images: [image],
    },
  };
}

export function generateCollectionMetadata(title: string, description: string, path: string): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: `${SITE_URL}${DEFAULT_OG_IMAGE}`, width: 1200, height: 630, alt: title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function generateProductJsonLd(product: ProductSEO) {
  const availability = product.inStock !== false
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || "",
    image: product.image?.startsWith("http") ? product.image : `${SITE_URL}${product.image || DEFAULT_OG_IMAGE}`,
    sku: String(product.id),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/product/${product.id}`,
      priceCurrency: product.currency,
      price: product.price,
      availability,
      seller: { "@type": "Organization", name: SITE_NAME },
    },
    ...(product.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount || 1,
          },
        }
      : {}),
  };
}

export function generateBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

export function generateOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/elitetech.png`,
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English", "Arabic", "Russian", "French", "Spanish"],
    },
  };
}
