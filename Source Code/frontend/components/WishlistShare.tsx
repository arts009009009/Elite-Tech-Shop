"use client";
import { useState, useCallback, useMemo } from "react";

type Props = { wishlistIds: number[]; username: string };

export default function WishlistShare({ wishlistIds, username }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/wishlist/shared/${username}` : "";

  const shareData = useMemo(() => ({
    title: `${username}'s Wishlist - Elite Tech Shop`,
    text: `Check out my wishlist on Elite Tech Shop! I've saved ${wishlistIds.length} items.`,
    url: shareUrl,
  }), [username, wishlistIds.length, shareUrl]);

  const handleCopyLink = useCallback(async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); window.dispatchEvent(new CustomEvent("notify", { detail: "Link copied to clipboard!" })); }
    catch { window.dispatchEvent(new CustomEvent("notify", { detail: "Failed to copy link." })); }
  }, [shareUrl]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) { try { await navigator.share(shareData); window.dispatchEvent(new CustomEvent("notify", { detail: "Wishlist shared!" })); } catch {} }
    else { handleCopyLink(); }
  }, [shareData, handleCopyLink]);

  const handleShareViaEmail = useCallback(() => {
    const subject = encodeURIComponent(shareData.title);
    const body = encodeURIComponent(`${shareData.text}\n\n${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }, [shareData, shareUrl]);

  if (!username || wishlistIds.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: "4px 12px",
          fontSize: 14,
          border: "1px solid var(--accent, #00d4ff)",
          background: "transparent",
          color: "var(--accent, #00d4ff)",
          borderRadius: 8,
          cursor: "pointer",
        }}
      >
        📤 Share Wishlist
      </button>
      {isOpen && (
        <div
          style={{
            marginTop: 8,
            padding: 16,
            borderRadius: 12,
            border: "1px solid rgba(0,212,255,0.3)",
            background: "var(--v2-panel, rgba(10,10,15,0.95))",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 14, opacity: 0.7, margin: 0 }}>
              Share {wishlistIds.length} items with friends
            </p>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <button
                onClick={handleNativeShare}
                style={{
                  padding: "4px 12px",
                  fontSize: 14,
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  color: "var(--text, #e0e0e0)",
                  cursor: "pointer",
                  borderRadius: 8,
                  textAlign: "left",
                }}
              >
                📱 Share via...
              </button>
            )}
            <button
              onClick={handleCopyLink}
              style={{
                padding: "4px 12px",
                fontSize: 14,
                width: "100%",
                background: "transparent",
                border: "none",
                color: "var(--text, #e0e0e0)",
                cursor: "pointer",
                borderRadius: 8,
                textAlign: "left",
              }}
            >
              {copied ? "✅ Copied!" : "📋 Copy Link"}
            </button>
            <button
              onClick={handleShareViaEmail}
              style={{
                padding: "4px 12px",
                fontSize: 14,
                width: "100%",
                background: "transparent",
                border: "none",
                color: "var(--text, #e0e0e0)",
                cursor: "pointer",
                borderRadius: 8,
                textAlign: "left",
              }}
            >
              📧 Share via Email
            </button>
            <p
              style={{
                fontSize: 12,
                opacity: 0.6,
                fontFamily: "monospace",
                wordBreak: "break-all",
                margin: 0,
              }}
            >
              {shareUrl}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
