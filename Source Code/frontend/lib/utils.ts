export function formatCurrency(amount: number, currency: string = "USD"): string {
  // NaN/Infinity (or a non-numeric value from a backend) would otherwise
  // render as "NaN" — and crash the fallback when `amount` isn't a number.
  const numeric = typeof amount === "number" ? amount : Number(amount);
  const safeAmount = Number.isFinite(numeric) ? numeric : 0;
  const safeCurrency = currency || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency,
    }).format(safeAmount);
  } catch {
    return `${safeAmount.toFixed(2)} ${safeCurrency}`;
  }
}
