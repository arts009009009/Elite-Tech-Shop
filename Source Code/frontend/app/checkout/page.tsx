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

  return (
    <>
      <Navbar />
      <div className="container max-w-[768px] py-6">
        <div className="page-card">
          <h2 className="mb-4">Checkout</h2>
          {!userCtx.user && <p className="mb-4">You must login to place an order.</p>}
          {cartCtx.cart.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {cartCtx.cart.map((item) => (
                <div key={item.id} className="card">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm">{item.quantity} x {formatCurrency(item.price, item.currency)} = {formatCurrency(item.price * item.quantity, item.currency)}</p>
                  <p className="text-xs mt-1"><strong>Reviews:</strong> {reviewCtx.reviews?.[item.id]?.length || 0}</p>
                </div>
              ))}

              <div className="card">
                <p className="font-semibold text-sm mb-2">Discount Code</p>
                <div className="flex items-center gap-2">
                  <input className="input text-sm" value={discountInput} onChange={(e) => setDiscountInput(e.target.value.toUpperCase())} placeholder="Enter code..." onKeyDown={(e) => e.key === "Enter" && handleApplyDiscount()} />
                  <button className="btn btn-sm btn-outline-brand" onClick={handleApplyDiscount}>Apply</button>
                </div>
                {discountError && <p className="text-xs mt-1 text-red-500">{discountError}</p>}
                {appliedCode && (
                  <div className="flex items-center justify-between mt-2 p-2 rounded-lg" style={{ background: "rgba(0,255,65,0.05)" }}>
                    <p className="text-sm" style={{ color: "var(--neon-green)" }}>✅ {appliedCode}: {discountLabel}</p>
                    <button className="btn btn-xs btn-ghost-red" onClick={removeDiscount}>✕</button>
                  </div>
                )}
                <div className="mt-2 text-xs opacity-60">
                  <details>
                    <summary className="cursor-pointer">Available codes</summary>
                    <div className="flex flex-col gap-1 mt-1">
                      {availableCodes.map((c) => (
                        <div key={c.code} className="flex items-center justify-between w-full">
                          <p className="font-semibold">{c.code}</p>
                          <p>{c.type === "percentage" ? `${c.value}% off` : `$${c.value} off`}{c.minPurchase > 0 ? ` (min $${c.minPurchase})` : ""}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              </div>

              <div className="card">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between w-full">
                    <p className="text-sm">Subtotal</p>
                    <p className="text-sm">{formatCurrency(subtotal)}</p>
                  </div>
                  {appliedCode && (
                    <div className="flex items-center justify-between w-full" style={{ color: "var(--neon-green)" }}>
                      <p className="text-sm">Discount ({discountLabel})</p>
                      <p className="text-sm">-{formatCurrency(discountAmount)}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between w-full font-bold text-lg border-t pt-2" style={{ borderColor: "var(--border, #e5e4e7)" }}>
                    <p>Total</p>
                    <p>{formatCurrency(total)}</p>
                  </div>
                  <p className="text-xs opacity-50 text-right">You&apos;ll earn ~{Math.round(total)} rewards points</p>
                </div>
              </div>

              <button className="btn btn-brand btn-lg" onClick={handleCheckout} disabled={placing || !userCtx.user}>
                {placing ? "Placing order..." : "Place Order"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
