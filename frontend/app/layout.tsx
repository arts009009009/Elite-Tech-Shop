import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./glitch.css";
import "./classic.css";
import "./redesign.css";
import Providers from "./providers";
import LoadingScreen from "@/components/LoadingScreen";
import OfflineIndicator from "@/components/OfflineIndicator";
import EarlyScripts from "@/components/EarlyScripts";
import StructuredData from "@/components/StructuredData";
import { generateOrganizationJsonLd } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://elite-tech.shop"),
  title: {
    default: "Elite Tech Shop — Premium Cyberpunk Electronics",
    template: "%s | Elite Tech Shop",
  },
  description: "Discover cutting-edge laptops, smartphones, and gaming gear at Elite Tech Shop. Premium electronics with a cyberpunk edge.",
  keywords: ["electronics", "laptops", "smartphones", "gaming", "tech", "cyberpunk", "premium"],
  authors: [{ name: "Elite Tech Shop" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://elite-tech.shop",
    siteName: "Elite Tech Shop",
    title: "Elite Tech Shop — Premium Cyberpunk Electronics",
    description: "Discover cutting-edge laptops, smartphones, and gaming gear at Elite Tech Shop.",
    images: [
      {
        url: "/elitetech.png",
        width: 1200,
        height: 630,
        alt: "Elite Tech Shop",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elite Tech Shop — Premium Cyberpunk Electronics",
    description: "Discover cutting-edge laptops, smartphones, and gaming gear.",
    images: ["/elitetech.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const orgJsonLd = generateOrganizationJsonLd();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} darkreader-ignore`} data-darkreader-ignore="" suppressHydrationWarning>
      <head>
        <meta name="darkreader-lock" />
        <StructuredData data={orgJsonLd} />
      </head>
      <body suppressHydrationWarning>
        <EarlyScripts />
        {/*<LightModeStyles />*/}
        <OfflineIndicator />
        <LoadingScreen minimumLoad={5000} />
        <a href="#main-content" className="skip-to-content">Skip to main content</a>
        <div id="main-content" role="main">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
