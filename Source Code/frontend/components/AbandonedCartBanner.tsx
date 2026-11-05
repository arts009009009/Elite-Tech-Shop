"use client";

import { useEffect, useState } from "react";
import { zigPlatform } from "@/lib/zig-platform";

export default function AbandonedCartBanner({ userId }: { userId?: string }) {
  const [carts, setCarts] = useState<Array<{ cart_id: string; total_cents: number }>>([]);
  const [recovering, setRecovering] = useState<string | null>(null);

  useEffect(() => {
    zigPlatform.abandonedCarts().then(async (res) => {
      const json = await res.json();
      setCarts(json.carts ?? []);
    });
  }, []);

  const recover = async (cartId: string) => {
    setRecovering(cartId);
    await zigPlatform.recoverCart(cartId);
    setRecovering(null);
    zigPlatform.abandonedCarts().then(async (res) => {
      const json = await res.json();
      setCarts(json.carts ?? []);
    });
  };

  if (carts.length === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center gap-2 px-4 pointer-events-none">
      {carts.map((cart) => (
        <div
          key={cart.cart_id}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-900/90 border border-amber-500 text-amber-100 text-sm shadow-lg backdrop-blur"
        >
          <span>Resume cart ${(cart.total_cents / 100).toFixed(2)}?</span>
          <button
            onClick={() => recover(cart.cart_id)}
            disabled={recovering === cart.cart_id}
            className="ml-2 px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-amber-900 font-bold text-xs disabled:opacity-50"
          >
            {recovering === cart.cart_id ? "…" : "Restore"}
          </button>
        </div>
      ))}
    </div>
  );
}
