"use client";
import { useMemo } from "react";
import { useRewards } from "@/context/RewardsContext";
import { useLanguage } from "@/context/LanguageContext";
import translations from "@/data/navbar-translate.json";

type Lang = "en" | "ar" | "ru" | "fr" | "es" | "de" | "zh" | "ja" | "pt" | "hi";
type TranslationEntry = Partial<Record<Lang, string>>;
type TranslationMap = Record<string, TranslationEntry>;
const typedTranslations: TranslationMap = translations;

const TIER_COLORS: Record<string, string> = { bronze: "#cd7f32", silver: "#c0c0c0", gold: "#ffd700", platinum: "#e5e4e2" };
const TIER_ICONS: Record<string, string> = { bronze: "🥉", silver: "🥈", gold: "🥇", platinum: "👑" };
const nextTierNames = ["bronze", "silver", "gold", "platinum"] as const;

export default function RewardsDashboard() {
  const { points, lifetimePoints, tier, redeemedPerks, addPoints, redeemPerk, availablePerks, nextTierProgress, pointsToNextTier } = useRewards();
  const { language } = useLanguage();
  const t = useMemo(() => {
    const lang = language as Lang;
    return (key: string) => typedTranslations[key]?.[lang] ?? key;
  }, [language]);
  const currentIdx = nextTierNames.indexOf(tier);

  return (
    <div className="animate-fade-in gpu" role="region" aria-label={`Rewards dashboard - ${tier} tier with ${points} points`} style={{ padding: "20px", borderRadius: "12px", border: `1px solid ${TIER_COLORS[tier]}`, maxWidth: "400px", background: "#171923", color: "#ffffff" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0 }}>
          <p style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.6, margin: 0 }}>
            {t("YourRewards")}
          </p>
          <p style={{ fontSize: "24px", fontWeight: "bold", color: TIER_COLORS[tier], margin: 0 }}>
            {TIER_ICONS[tier]} {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0 }}>
          <p style={{ fontSize: "30px", fontWeight: "bold", margin: 0 }}>{points}</p>
          <p style={{ fontSize: "12px", opacity: 0.6, margin: 0 }}>{t("Points")}</p>
        </div>
      </div>

      {currentIdx < nextTierNames.length - 1 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
            <p style={{ opacity: 0.6, margin: 0 }}>{lifetimePoints} {t("LifetimePoints")}</p>
            <p style={{ opacity: 0.6, margin: 0 }}>{pointsToNextTier} {t("ToNextTier")} {nextTierNames[currentIdx + 1]}</p>
          </div>
          <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{
              width: `${nextTierProgress}%`,
              height: "100%",
              borderRadius: "4px",
              background: `linear-gradient(90deg, ${TIER_COLORS[tier]}, ${TIER_COLORS[nextTierNames[currentIdx + 1]]})`,
              transition: "width 0.3s ease"
            }} />
          </div>
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", margin: "0 0 8px 0", opacity: 0.6 }}>
          {t("RedeemablePerks")}
        </p>
        {availablePerks.length === 0 ? (
          <p style={{ fontSize: "14px", opacity: 0.5, textAlign: "center", paddingTop: "20px", paddingBottom: "20px", margin: 0 }}>
            {t("NoPerksAvailable")}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {availablePerks.map((perk) => {
              const canAfford = points >= perk.cost;
              return (
                <div key={perk.id} style={{ width: "100%", opacity: canAfford ? 1 : 0.5 }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px",
                    borderRadius: "8px",
                    border: `1px solid ${canAfford ? "#A020F0" : "rgba(255,255,255,0.2)"}`,
                    background: canAfford ? "rgba(160,32,240,0.15)" : "transparent"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <p style={{ fontSize: "20px", margin: 0 }}>{perk.icon}</p>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0 }}>
                        <p style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>{perk.name}</p>
                        <p style={{ fontSize: "12px", opacity: 0.6, margin: 0 }}>{perk.description}</p>
                      </div>
                    </div>
                    <button
                      style={{
                        fontSize: "12px",
                        padding: "4px 8px",
                        border: "1px solid var(--accent, #00d4ff)",
                        borderRadius: "8px",
                        background: "transparent",
                        color: "var(--accent, #00d4ff)",
                        cursor: canAfford ? "pointer" : "not-allowed",
                        opacity: canAfford ? 1 : 0.5
                      }}
                      disabled={!canAfford}
                      onClick={() => redeemPerk(perk.id)}
                    >
                      {perk.cost} pts
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {redeemedPerks.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", margin: "0 0 8px 0", opacity: 0.6 }}>
            {t("Redeemed")} ({redeemedPerks.length})
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {redeemedPerks.map((id) => (
              <div key={id} style={{
                padding: "4px 8px",
                borderRadius: "9999px",
                background: "#22543d",
                border: "1px solid #68d391",
                fontSize: "12px",
                color: "#9ae6b4"
              }}>
                ✓ {id}
              </div>
            ))}
          </div>
        </div>
      )}

      {process.env.NODE_ENV === "development" && (
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            style={{
              flex: 1,
              fontSize: "12px",
              padding: "4px 8px",
              border: "1px solid var(--neon-green, #00ff41)",
              borderRadius: "8px",
              background: "transparent",
              color: "var(--neon-green, #00ff41)",
              cursor: "pointer"
            }}
            onClick={() => addPoints(100)}
          >
            +100 pts (test)
          </button>
          <button
            style={{
              flex: 1,
              fontSize: "12px",
              padding: "4px 8px",
              border: "1px solid var(--neon-yellow, #fff700)",
              borderRadius: "8px",
              background: "transparent",
              color: "var(--neon-yellow, #fff700)",
              cursor: "pointer"
            }}
            onClick={() => addPoints(500)}
          >
            +500 pts (test)
          </button>
        </div>
      )}
    </div>
  );
}
