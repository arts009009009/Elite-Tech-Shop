"use client";
import { useState, useCallback } from "react";

type OneTapPaymentProps = {
  amount: number;
  currency: string;
  orderId: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
};

export default function OneTapPayment({
  amount,
  currency,
  orderId,
  onSuccess,
  onError,
}: OneTapPaymentProps) {
  const [processing, setProcessing] = useState(false);

  const handlePayment = useCallback(async () => {
    if (processing) return;
    setProcessing(true);

    try {
      const res = await fetch("/api/payments/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency,
          orderId,
          paymentMethodId: "demo_card",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        onError?.(data.error || "Payment failed");
        return;
      }

      if (data.success) {
        onSuccess?.(data.paymentIntentId);
      } else {
        onError?.("Payment was not completed");
      }
    } catch {
      onError?.("Payment service unavailable");
    } finally {
      setProcessing(false);
    }
  }, [processing, amount, currency, orderId, onSuccess, onError]);

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <button
        onClick={handlePayment}
        disabled={processing}
        style={{
          width: "100%",
          padding: "16px 24px",
          background: "#000",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 600,
          cursor: processing ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          minHeight: 52,
          opacity: processing ? 0.7 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {processing ? (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite" }}>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
            </svg>
            Processing...
          </span>
        ) : (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
            </svg>
            Pay {formattedAmount}
          </>
        )}
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontSize: 12,
          color: "var(--text, #888)",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Secure payment
      </div>
    </div>
  );
}
