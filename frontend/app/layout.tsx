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
// import LightModeStyles from "@/components/LightModeStyles";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Elite Tech Shop — Premium Cyberpunk Electronics",
    template: "%s | Elite Tech Shop",
  },
  description: "Discover cutting-edge laptops, smartphones, and gaming gear at Elite Tech Shop. Premium electronics with a cyberpunk edge.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
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
