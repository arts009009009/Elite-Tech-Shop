"use client";

import React, { memo } from "react";

interface OrderItem {
  title: string;
  price: number;
  quantity: number;
  currency: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  currency: string;
  date: string;
  user: string;
}

function generateInvoiceHTML(order: Order): string {
  const orderShort = order.id.slice(-8);
  const itemsHTML = order.items
    .map((item) => {
      const subtotal = (item.price * item.quantity).toFixed(2);
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;">${item.title}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">${item.price.toFixed(2)} ${item.currency}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;">${subtotal} ${item.currency}</td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice #${orderShort}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#fff;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#222;">
  <div style="max-width:700px;margin:40px auto;padding:32px 40px;background:#fff;border:1px solid #e0e0e0;border-radius:4px;">

    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;">
      <div>
        <h1 style="margin:0;font-size:24px;font-weight:700;color:#00d4ff;">Elite Tech Shop</h1>
      </div>
      <div style="text-align:right;">
        <h2 style="margin:0;font-size:28px;font-weight:700;color:#333;letter-spacing:2px;">INVOICE</h2>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #00d4ff;">
      <div>
        <p style="margin:0 0 4px 0;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">Order</p>
        <p style="margin:0 0 12px 0;font-size:16px;font-weight:600;color:#333;">#${orderShort}</p>
        <p style="margin:0 0 4px 0;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">Date</p>
        <p style="margin:0;font-size:15px;color:#444;">${order.date}</p>
      </div>
      <div style="text-align:right;">
        <p style="margin:0 0 4px 0;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">Customer</p>
        <p style="margin:0;font-size:15px;color:#444;">${order.user}</p>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr style="background:#f7f7f9;">
          <th style="padding:10px 12px;text-align:left;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#888;border-bottom:2px solid #ddd;">Item</th>
          <th style="padding:10px 12px;text-align:center;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#888;border-bottom:2px solid #ddd;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#888;border-bottom:2px solid #ddd;">Price</th>
          <th style="padding:10px 12px;text-align:right;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#888;border-bottom:2px solid #ddd;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:14px 12px;text-align:right;font-size:16px;font-weight:700;color:#333;border-top:2px solid #333;">Total</td>
          <td style="padding:14px 12px;text-align:right;font-size:16px;font-weight:700;color:#00d4ff;border-top:2px solid #333;">${order.total.toFixed(2)} ${order.currency}</td>
        </tr>
      </tfoot>
    </table>

    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #eee;text-align:center;">
      <p style="margin:0;font-size:15px;color:#888;">Thank you for your purchase!</p>
    </div>
  </div>

  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;
}

function OrderPDF({ order }: { order: Order }) {
  const handlePrint = () => {
    const html = generateInvoiceHTML(order);
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <button
      onClick={handlePrint}
      style={{
        background: "transparent",
        color: "var(--accent, #00d4ff)",
        border: "1px solid var(--accent, #00d4ff)",
        borderRadius: "6px",
        padding: "10px 20px",
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
        letterSpacing: "0.5px",
        transition: "all 0.2s ease",
        boxShadow: "0 0 8px rgba(0,212,255,0.15)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.background = "rgba(0,212,255,0.1)";
        el.style.boxShadow = "0 0 16px rgba(0,212,255,0.3)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.background = "transparent";
        el.style.boxShadow = "0 0 8px rgba(0,212,255,0.15)";
      }}
    >
      Download Invoice
    </button>
  );
}

export default memo(OrderPDF);
