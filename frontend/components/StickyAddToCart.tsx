"use client";
import { useState, useEffect } from "react";

type StickyAddToCartProps = {
  productTitle: string;
  price: number;
  currency: string;
  onAddToCart: () => void;
  visible?: boolean;
};

export default function StickyAddToCart({
  productTitle,
  price,
  currency,
  onAddToCart,
  visible = true,
}: StickyAddToCartProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible) {
      setShow(false);
      return;
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const threshold = 300;
      setShow(scrollY > threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [visible]);

  if (!show) return null;

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(price);

  return (
    <div
      className="sticky-add-to-cart"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: "var(--card-bg, rgba(10,10,15,0.98))",
        borderTop: "1px solid var(--border, rgba(255,255,255,0.08))",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        animation: "slideUp 0.3s ease",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @media (min-width: 769px) {
          .sticky-add-to-cart { display: none !important; }
        }
      `}</style>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            margin: 0,
            color: "var(--text, #e0e0e0)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {productTitle}
        </p>
        <p
          style={{
            fontSize: 18,
            fontWeight: 700,
            margin: 0,
            color: "var(--accent, #00d4ff)",
          }}
        >
          {formattedPrice}
        </p>
      </div>
      <button
        onClick={onAddToCart}
        style={{
          padding: "12px 24px",
          background: "var(--accent, #00d4ff)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          gap: 8,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        Add to Cart
      </button>
    </div>
  );
}
