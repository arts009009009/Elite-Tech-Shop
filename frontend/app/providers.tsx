"use client";
import { useEffect, Suspense, lazy } from "react";
import { OProgress } from "@oprogress/next";
import { ThemeModeProvider } from "@/context/ThemeModeContext";
import { ThemeCustomizerProvider } from "@/context/ThemeCustomizerContext";
import { ThemeProfileProvider } from "@/context/ThemeProfileContext";
import { SearchProvider } from "@/context/SearchContext";
import { UserProvider } from "@/context/UserContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { CartProvider } from "@/context/CartContext";
import { DiscountProvider } from "@/context/DiscountContext";
import { InventoryProvider } from "@/context/InventoryContext";
import { RewardsProvider } from "@/context/RewardsContext";
import { ReviewProvider } from "@/context/ReviewContext";
import { RecommendationsProvider } from "@/context/RecommendationsContext";
import { AchievementProvider } from "@/context/AchievementContext";
import { ReferralProvider } from "@/context/ReferralContext";
import Notification from "@/components/Notification";
import StockAlerts from "@/components/StockAlerts";
import { GlitchProvider } from "@/components/GlitchMode";
import DesignSystemSync from "@/components/DesignSystemSync";

const Chat = lazy(() => import("@/components/Chat"));
const AIAssistant = lazy(() => import("@/components/AIAssistant"));
const ThemeCustomizer = lazy(() => import("@/components/ThemeCustomizer"));

function GlobalErrorHandler() {
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      console.error("[Global] Uncaught error:", event.error ?? event.message);
    };
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      console.error("[Global] Unhandled rejection:", event.reason);
    };
    window.addEventListener("error", handler);
    window.addEventListener("unhandledrejection", rejectionHandler);
    return () => {
      window.removeEventListener("error", handler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
    };
  }, []);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GlitchProvider>
    <ThemeModeProvider>
      <OProgress height="4px" color="#00d4ff" shallowRouting />
      <GlobalErrorHandler />
      <ThemeCustomizerProvider>
        <DesignSystemSync />
        <ThemeProfileProvider>
        <SearchProvider>
          <UserProvider>
            <LanguageProvider>
              <CartProvider>
                <DiscountProvider>
                  <InventoryProvider>
                    <RewardsProvider>
                      <ReviewProvider>
                        <RecommendationsProvider>
                        <AchievementProvider>
                        <ReferralProvider>
                        {children}
                        <Notification />
                        <StockAlerts />
                        <Suspense fallback={null}><Chat /></Suspense>
                        <Suspense fallback={null}><AIAssistant /></Suspense>
                        <Suspense fallback={null}><ThemeCustomizer /></Suspense>
                        </ReferralProvider>
                        </AchievementProvider>
                        </RecommendationsProvider>
                      </ReviewProvider>
                    </RewardsProvider>
                  </InventoryProvider>
                </DiscountProvider>
              </CartProvider>
            </LanguageProvider>
          </UserProvider>
        </SearchProvider>
        </ThemeProfileProvider>
      </ThemeCustomizerProvider>
    </ThemeModeProvider>
    </GlitchProvider>
  );
}
