"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import OrderErrorBoundary from "@/components/OrderErrorBoundary";
import ReviewForm from "@/components/ReviewForm";
import Navbar from "@/components/Navbar";
import OrderPDF from "@/components/OrderPDF";
import { formatCurrency } from "@/lib/utils";

const statuses = [
  { label: "All Status", value: "all" },
  { label: "Processing", value: "processing" },
  { label: "Shipped", value: "shipped" },
  { label: "In Transit", value: "in transit" },
  { label: "Delivered", value: "delivered" },
];

type OrderItem = { id: number; title: string; price: number; currency: string; quantity: number };
type Order = { id: string; items: OrderItem[]; total: number; currency: string; date: string; user: string };

function getStatusColor(date: string): { label: string; color: string } {
  const orderDate = new Date(date);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 1) return { label: "Processing", color: "#ffd700" };
  if (daysDiff <= 3) return { label: "Shipped", color: "#00d4ff" };
  if (daysDiff <= 7) return { label: "In Transit", color: "#A020F0" };
  return { label: "Delivered", color: "#00ff41" };
}

function OrderCard({ order }: { order: Order }) {
  const totalLabel = formatCurrency(order.total, order.currency);
  const status = getStatusColor(order.date);
  const [showReview, setShowReview] = useState(false);

  return (
    <div>
      <div className="card mb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-bold text-sm">Order #{order.id.toString().slice(-8)}</p>
            <p className="text-xs opacity-60">{order.date}</p>
          </div>
          <span className="badge" style={{
            background: status.label === "Delivered" ? "rgba(0,255,65,0.15)" : status.label === "Processing" ? "rgba(255,215,0,0.15)" : "rgba(0,212,255,0.15)",
            color: status.label === "Delivered" ? "var(--neon-green)" : status.label === "Processing" ? "#ffd700" : "var(--neon-cyan)"
          }}>{status.label}</span>
        </div>
        {order.items.length > 0 ? (
          <div className="flex flex-col gap-1 mb-2">
            {order.items.map((item, idx) => {
              const itemTotal = item.price * item.quantity;
              const itemLabel = formatCurrency(itemTotal, item.currency || order.currency);
              return (
                  <div key={item.id || idx} className="flex items-center justify-between text-sm border-b pb-1" style={{ borderColor: "var(--border, #e5e4e7)" }}>
                  <p>{item.title} x {item.quantity}</p>
                  <p className="font-semibold">{itemLabel}</p>
                </div>
              );
            })}
          </div>
        ) : <p className="text-sm opacity-50">No items recorded for this order.</p>}
        <div className="flex items-center justify-between">
          <p className="font-bold">Total: {totalLabel}</p>
          <div className="flex gap-2">
            <OrderPDF order={order} />
            <button className="btn btn-xs btn-outline-brand" onClick={() => setShowReview(!showReview)}>
              {showReview ? "Cancel" : "Review"}
            </button>
          </div>
        </div>
        {showReview && order.items.length > 0 && (
          <div className="mt-3">
            <ReviewForm productId={order.items[0].id} author={order.user} onSubmitted={() => setShowReview(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

function OrderHistoryContent() {
  const cartCtx = useCart();
  const userCtx = useUser();
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const username = userCtx.user?.username ?? null;

  const loadOrders = useCallback(() => {
    if (!username) return;
    setError(null);
    cartCtx.loadOrdersForUser(username);
  }, [username, cartCtx]);

  const [ordersLoaded, setOrdersLoaded] = useState(false);

  useEffect(() => {
    if (!ordersLoaded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- loadOrders triggers state update internally via cart context
      loadOrders();
      setOrdersLoaded(true);
    }
  }, [loadOrders, ordersLoaded]);

  const userOrders: Order[] = useMemo(() => {
    const raw = cartCtx.orders;
    return Array.isArray(raw) ? raw : [];
  }, [cartCtx.orders]);

  const filteredOrders = useMemo(() => {
    return userOrders.filter((order) => {
      if (filterStatus !== "all") { const status = getStatusColor(order.date).label.toLowerCase(); if (status !== filterStatus) return false; }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesItem = order.items.some((item) => item.title.toLowerCase().includes(q));
        if (!matchesItem && !order.id.toString().includes(q)) return false;
      }
      return true;
    });
  }, [userOrders, filterStatus, searchTerm]);

  if (!username) return <div><h2>Order History</h2><p>Please login to view your orders.</p></div>;
  if (error) return <div><h2>Order History</h2><p style={{ color: "#ff4444" }}>{error}</p><button className="btn btn-sm" onClick={loadOrders}>Retry</button></div>;

  return (
    <div>
      <h2 className="mb-2">Order History</h2>
      <p className="text-sm opacity-60 mb-4">{userOrders.length} order{userOrders.length !== 1 ? "s" : ""} found</p>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input className="input max-w-[300px]" placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          {statuses.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </div>

      {filteredOrders.length === 0 ? (
        <p>{searchTerm || filterStatus !== "all" ? "No orders match your filters." : "No orders yet. Start shopping!"}</p>
      ) : (
        <div className="flex flex-col gap-0">
          {filteredOrders.map((order) => (
            <OrderErrorBoundary key={order.id} fallbackMessage="This order could not be displayed." onReset={loadOrders}>
              <OrderCard order={order} />
            </OrderErrorBoundary>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrderHistory() {
  return (
    <>
      <Navbar />
      <div className="container max-w-[768px] py-6">
        <div className="page-card">
          <OrderErrorBoundary fallbackMessage="Order History failed to load. Please try again.">
            <OrderHistoryContent />
          </OrderErrorBoundary>
        </div>
      </div>
    </>
  );
}
