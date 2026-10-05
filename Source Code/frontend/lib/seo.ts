const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://elite-tech.shop";
const SITE_NAME = "Elite Tech Shop";

export function generateOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/elitetech.webp`,
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English", "Arabic", "Russian", "French", "Spanish"],
    },
  };
}
