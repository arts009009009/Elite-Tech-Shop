const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://elite-tech.shop";
const SITE_NAME = "Elite Tech Shop";

export function generateOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    // Matches the file in public/ (public/elitetech.avif — there is no
    // .webp variant).
    logo: `${SITE_URL}/elitetech.avif`,
    // sameAs intentionally omitted: an empty array is invalid for Google's
    // rich results; add real profile URLs here if any exist.
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English", "Arabic", "Russian", "French", "Spanish"],
    },
  };
}
