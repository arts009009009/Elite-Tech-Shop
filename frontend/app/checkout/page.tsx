"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useDiscount } from "@/context/DiscountContext";
import { useReviews } from "@/context/ReviewContext";
import { useUser } from "@/context/UserContext";
import { useInventory } from "@/context/InventoryContext";
import { useRewards } from "@/context/RewardsContext";
import { formatCurrency } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import OneTapPayment from "@/components/OneTapPayment";

const checkoutCss = `
  .co-page { padding: 24px 16px 120px; max-width: 768px; margin: 0 auto; }
  .co-card {
    background: var(--card-bg, rgba(15,15,30,0.92));
    border: 1px solid var(--border, rgba(255,255,255,0.08));
    border-radius: 12px;
    padding: 20px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .co-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-bottom: 1px solid var(--border, rgba(255,255,255,0.06));
  }
  .co-item:last-child { border-bottom: none; }
  .co-item-title { font-weight: 600; font-size: 14px; }
  .co-item-detail { font-size: 13px; opacity: 0.7; }
  .co-item-price { font-weight: 700; font-size: 15px; white-space: nowrap; }
  .co-summary-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 14px;
  }
  .co-summary-total {
    display: flex;
    justify-content: space-between;
    padding: 12px 0 0;
    font-size: 18px;
    font-weight: 700;
    border-top: 1px solid var(--border, rgba(255,255,255,0.1));
    margin-top: 8px;
  }
  .co-discount-row {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  .co-discount-input {
    flex: 1;
    padding: 10px 14px;
    font-size: 14px;
    background: var(--bg, rgba(255,255,255,0.06));
    border: 1px solid var(--border, rgba(255,255,255,0.15));
    border-radius: 8px;
    color: var(--text, #e0e0e0);
    font-family: inherit;
    outline: none;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .co-discount-input:focus { border-color: var(--accent, #00d4ff); }
  .co-discount-btn {
    padding: 10px 20px;
    background: transparent;
    border: 1px solid var(--accent, #00d4ff);
    color: var(--accent, #00d4ff);
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.2s;
  }
  .co-discount-btn:hover { background: rgba(0,212,255,0.1); }
  .co-apply-btn {
    width: 100%;
    padding: 16px;
    background: var(--accent, #00d4ff);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: filter 0.2s;
    min-height: 52px;
  }
  .co-apply-btn:hover { filter: brightness(1.1); }
  .co-apply-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .co-section-title {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 12px;
    color: var(--text-h, var(--text, #e0e0e0));
  }
  .co-empty {
    text-align: center;
    padding: 48px 20px;
    color: var(--text, #888);
  }
  .co-empty-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
  .co-login-note {
    padding: 12px 16px;
    background: rgba(255,200,0,0.08);
    border: 1px solid rgba(255,200,0,0.2);
    border-radius: 8px;
    font-size: 13px;
    color: #ffc800;
    margin-bottom: 16px;
  }
  .co-discount-success {
    padding: 8px 12px;
    background: rgba(0,255,65,0.05);
    border-radius: 8px;
    font-size: 13px;
    color: var(--neon-green);
    margin-top: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .co-points-note {
    font-size: 12px;
    opacity: 0.5;
    text-align: right;
    margin-top: 4px;
  }
  @media (min-width: 769px) {
    .co-page { padding: 32px 24px 48px; }
  }
  .light-mode .co-card {
    background: rgba(255,255,255,0.95);
    border-color: rgba(0,0,0,0.08);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  }
  .light-mode .co-discount-input {
    background: #fff;
    border-color: #ddd;
    color: #1a1a2e;
  }
`;

export default function Checkout() {
  const cartCtx = useCart();
  const reviewCtx = useReviews();
  const userCtx = useUser();
  const { appliedCode, discountAmount, discountLabel, applyCode, removeDiscount, availableCodes } = useDiscount();
  const { addPoints } = useRewards();
  const { initializeStock } = useInventory();
  const router = useRouter();
  const [discountInput, setDiscountInput] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const subtotal = cartCtx.cart.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
  const total = Math.max(0, subtotal - discountAmount);

  const handleApplyDiscount = useCallback(async () => {
    const code = discountInput.trim();
    if (!code) return;
    const success = await applyCode(code, subtotal);
    if (success) { setDiscountInput(""); setDiscountError(""); window.dispatchEvent(new CustomEvent("notify", { detail: "Discount applied!" })); }
    else { setDiscountError("Invalid or expired code. Check minimum purchase requirement."); }
  }, [discountInput, subtotal, applyCode]);

  const handleCheckout = useCallback(async () => {
    if (!userCtx.user) { window.dispatchEvent(new CustomEvent("notify", { detail: "Please login before checkout!" })); return; }
    if (placing) return;
    setPlacing(true);
    initializeStock(cartCtx.cart.map((item) => item.id));
    await cartCtx.placeOrder(userCtx.user.username);
    const earnedPoints = Math.round(total);
    addPoints(earnedPoints);
    window.dispatchEvent(new CustomEvent("notify", { detail: `Order placed successfully! Earned ${earnedPoints} rewards points.` }));
    setPlacing(false);
    router.push("/orders");
  }, [cartCtx, userCtx, total, addPoints, initializeStock, placing, router]);

  const handlePaymentSuccess = useCallback(async (paymentId: string) => {
    window.dispatchEvent(new CustomEvent("notify", { detail: `Payment successful! ID: ${paymentId}` }));
    if (!userCtx.user) return;
    initializeStock(cartCtx.cart.map((item) => item.id));
    await cartCtx.placeOrder(userCtx.user.username);
    const earnedPoints = Math.round(total);
    addPoints(earnedPoints);
    router.push("/orders");
  }, [cartCtx, userCtx, total, addPoints, initializeStock, router]);

  const handlePaymentError = useCallback((error: string) => {
    window.dispatchEvent(new CustomEvent("notify", { detail: `Payment failed: ${error}` }));
  }, []);

  return (
    <>
      <Navbar />
      <style>{checkoutCss}</style>
      <div className="co-page">
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: "var(--text-h, var(--text, #e0e0e0))" }}>
          Checkout
        </h2>

        {!userCtx.user && (
          <div className="co-login-note">
            You must login to place an order.
          </div>
        )}

        {cartCtx.cart.length === 0 ? (
          <div className="co-card co-empty">
            <p className="co-empty-title">Your cart is empty</p>
            <p>Add some products to get started.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="co-card">
              <h3 className="co-section-title">Order Items ({cartCtx.cart.length})</h3>
              {cartCtx.cart.map((item) => (
                <div key={item.id} className="co-item">
                  <div style={{ flex: 1 }}>
                    <p className="co-item-title">{item.title}</p>
                    <p className="co-item-detail">
                      {item.quantity} x {formatCurrency(item.price, item.currency)}
                    </p>
                  </div>
                  <p className="co-item-price" style={{ color: "var(--accent, #00d4ff)" }}>
                    {formatCurrency(item.price * item.quantity, item.currency)}
                  </p>
                </div>
              ))}
            </div>

            <div className="co-card">
              <h3 className="co-section-title">Discount Code</h3>
              <div className="co-discount-row">
                <input
                  className="co-discount-input"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                  placeholder="Enter code..."
                  onKeyDown={(e) => e.key === "Enter" && handleApplyDiscount()}
                />
                <button className="co-discount-btn" onClick={handleApplyDiscount}>Apply</button>
              </div>
              {discountError && <p style={{ color: "#ff4444", fontSize: 12, marginTop: 8 }}>{discountError}</p>}
              {appliedCode && (
                <div className="co-discount-success">
                  <span>{appliedCode}: {discountLabel}</span>
                  <button onClick={removeDiscount} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 16 }}>&#10005;</button>
                </div>
              )}
              <details style={{ marginTop: 12, fontSize: 12 }}>
                <summary style={{ cursor: "pointer", opacity: 0.6 }}>Available codes</summary>
                <div style={{ marginTop: 8 }}>
                  {availableCodes.map((c) => (
                    <div key={c.code} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                      <span style={{ fontWeight: 600 }}>{c.code}</span>
                      <span>{c.type === "percentage" ? `${c.value}% off` : `$${c.value} off`}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>

            <div className="co-card">
              <div className="co-summary-row">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {appliedCode && (
                <div className="co-summary-row" style={{ color: "var(--neon-green)" }}>
                  <span>Discount ({discountLabel})</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="co-summary-total">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <p className="co-points-note">You&apos;ll earn ~{Math.round(total)} rewards points</p>
            </div>

            {userCtx.user && orderId && (
              <div className="co-card">
                <h3 className="co-section-title">Quick Pay</h3>
                <OneTapPayment
                  amount={total}
                  currency={cartCtx.cart[0]?.currency || "USD"}
                  orderId={orderId}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </div>
            )}

            <button
              className="co-apply-btn"
              onClick={handleCheckout}
              disabled={placing || !userCtx.user}
            >
              {placing ? "Placing order..." : "Place Order"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
