"use client";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { formatCurrency } from "@/lib/utils";
import Navbar from "@/components/Navbar";

export default function CartPage() {
  const cartCtx = useCart();
  const userCtx = useUser();


  const handleCheckout = (e: React.MouseEvent) => {
    if (!userCtx?.user) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("notify", { detail: "Please login to checkout!" }));
    }
  };

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="page-card">
          <h2 className="mb-4">Shopping Cart</h2>

          {cartCtx.cart.length === 0 ? (
            <div className="flex flex-col gap-4" style={{ paddingTop: 48, paddingBottom: 48, textAlign: "center" }}>
              <p className="text-lg opacity-60">Your cart is empty</p>
              <Link href="/" className="btn btn-outline-brand">Continue Shopping</Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 mb-4">
                {cartCtx.cart.map((item) => (
                  <div key={item.id} className="card" style={{ borderWidth: 1, borderRadius: 8 }}>
                    <div className="flex items-center gap-4 flex-wrap">
                      {item.image && (
                        <Image src={item.image} alt={item.title} width={80} height={80} style={{ objectFit: "cover", borderRadius: 8 }} />
                      )}
                      <div className="flex flex-col gap-1 flex-1 items-start">
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-sm font-bold" style={{ color: "#39FF14" }}>{formatCurrency(item.price, item.currency)}</p>
                        <span className="badge badge-subtle-brand" style={{ background: "rgba(179,0,255,0.12)", color: "var(--brand)", padding: "2px 8px", borderRadius: 9999, fontSize: "0.75rem", fontWeight: 600 }}>Qty: {item.quantity}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="btn btn-sm btn-outline-brand" aria-label="Decrease quantity"
                          onClick={() => cartCtx.updateQuantity(item.id, item.quantity - 1)}
                        >−</button>
                        <p style={{ minWidth: 24, textAlign: "center" }}>{item.quantity}</p>
                        <button className="btn btn-sm btn-outline-brand" aria-label="Increase quantity"
                          onClick={() => cartCtx.updateQuantity(item.id, item.quantity + 1)}
                        >+</button>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <p className="font-bold">{formatCurrency(item.price * item.quantity, item.currency)}</p>
                        <button className="btn btn-xs btn-ghost-red" onClick={() => cartCtx.removeFromCart(item.id)}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <hr className="separator mb-4" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col gap-1 items-start">
                  <p className="text-sm opacity-60">{cartCtx.itemCount} item{cartCtx.itemCount !== 1 ? "s" : ""}</p>
                  <button className="btn btn-xs btn-ghost-red" onClick={cartCtx.clearCart}>Clear Cart</button>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <p className="text-2xl font-bold">{formatCurrency(cartCtx.cartTotal)}</p>
                  <p className="text-xs opacity-50">Total</p>
                </div>
              </div>

              <div className="flex items-center gap-4 justify-end">
                <Link href="/" className="btn btn-outline-brand">Continue Shopping</Link>
                <Link href="/checkout" className="btn btn-brand btn-lg" onClick={handleCheckout}>Proceed to Checkout</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
