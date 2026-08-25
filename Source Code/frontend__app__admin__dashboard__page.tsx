"use client";
import { useState, useCallback, useMemo, useEffect, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { useLanguage } from "@/context/LanguageContext";
import productTranslations from "@/data/products.json";
import uiStrings from "@/data/navbar-translate.json";
import DataVizDashboard from "@/components/DataVizDashboard";
import Navbar from "@/components/Navbar";

type Lang = "en" | "ar" | "ru" | "fr" | "es";
type RawProduct = { 
  id: number; 
  category?: string; 
  en: { title: string; price: number; currency: string };
  ar: { title: string; price: number; currency: string };
  ru: { title: string; price: number; currency: string };
  fr: { title: string; price: number; currency: string };
  es: { title: string; price: number; currency: string };
};
type Product = { id: number; title: string; price: number; currency: string };

function translateProducts(lang: Lang, base: RawProduct[]): Product[] {
  return base.map((p) => ({
    id: p.id,
    title: p[lang]?.title ?? p.en?.title ?? "",
    price: p[lang]?.price ?? p.en?.price ?? 0,
    currency: p[lang]?.currency ?? p.en?.currency ?? "USD",
  })  );
}

const adminDarkStyles: CSSProperties = {
  background: "var(--custom-bg, #0a0a0f)",
  color: "var(--custom-text, #e0e0e0)",
  minHeight: "100vh",
  padding: "20px",
  fontFamily: "'Courier New', monospace",
};

const adminDarkCss = `
  .admin-dashboard h2 { color: var(--custom-accent, #ffd700); margin-bottom: 16px; font-size: 22px; }
  .admin-dashboard .admin-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
  .admin-dashboard .admin-tab {
    padding: 8px 20px; border: 1px solid var(--custom-primary, #00d4ff); border-radius: var(--custom-radius, 4px);
    background: transparent; color: var(--custom-primary, #00d4ff); cursor: pointer; font-family: inherit; font-size: 14px;
  }
  .admin-dashboard .admin-tab.active { background: var(--custom-primary, #00d4ff); color: var(--custom-bg, #0a0a0f); font-weight: bold; }
  .admin-dashboard .admin-actions { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
  .admin-dashboard .admin-product-list { display: flex; flex-direction: column; gap: 12px; }
  .admin-dashboard .admin-product {
    background: color-mix(in srgb, var(--custom-bg, #1a1a2e) 85%, transparent);
    border: 1px solid var(--custom-primary, #00d4ff); border-radius: var(--custom-radius, 8px);
    padding: 16px; text-align: left;
  }
  .admin-dashboard .admin-product h3 { color: var(--custom-accent, #ffd700); margin: 0 0 4px 0; font-size: 16px; }
  .admin-dashboard .admin-product p { margin: 0 0 8px 0; font-size: 14px; opacity: 0.8; color: var(--custom-text, #e0e0e0); }
  .admin-dashboard .admin-tab:hover { filter: brightness(1.2); }
`;

export default function AdminDashboard() {
  const cartCtx = useCart();
  const userCtx = useUser();
  const { language } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => {
      if (!r.ok) router.replace("/admin?error=auth_required");
    }).catch(() => router.replace("/admin?error=auth_required"));
  }, [router]);

  const baseProducts = useMemo(() => productTranslations.products as RawProduct[], []);
  const [editedProducts, setEditedProducts] = useState<Record<number, Partial<Record<Lang, { title: string; price: number; currency: string }>>>>({});
  const products = useMemo(() => {
    const translated = translateProducts(language as Lang, baseProducts);
    return translated.map(p => {
      const override = editedProducts[p.id]?.[language as Lang];
      if (override) return { ...p, title: override.title, price: override.price, currency: override.currency };
      return p;
    });
  }, [language, baseProducts, editedProducts]);
  const [activeTab, setActiveTab] = useState<string>("analytics");

  const clearAllHistory = useCallback(() => {
    cartCtx?.clearAllOrders();
    window.dispatchEvent(new CustomEvent("notify", { detail: uiStrings["ClearHistory"]?.[language as Lang] || "All history cleared!" }));
  }, [cartCtx, language]);

  const removeUser = useCallback((username: string) => {
    if (!username) return;
    userCtx?.removeUser(username);
    window.dispatchEvent(new CustomEvent("notify", { detail: uiStrings["RemoveUser"]?.[language as Lang] || `User ${username} removed!` }));
  }, [userCtx, language]);

  const editProduct = useCallback((id: number) => {
    const title = prompt(uiStrings["NewName"]?.[language as Lang] || "New name:");
    const price = Number(prompt(uiStrings["NewPrice"]?.[language as Lang] || "New price:"));
    const currency = prompt(uiStrings["NewCurrency"]?.[language as Lang] || "New currency:");
    if (!title || !price || !currency) return;
    setEditedProducts(prev => ({
      ...prev,
      [id]: { ...prev[id], [language as Lang]: { title, price, currency } },
    }));
    window.dispatchEvent(new CustomEvent("notify", { detail: uiStrings["ProductUpdated"]?.[language as Lang] || "Product updated!" }));
  }, [language]);

  const handleRemoveUser = useCallback(() => {
    const username = prompt(uiStrings["EnterUsername"]?.[language as Lang] || "Enter username to remove:");
    if (username) removeUser(username);
  }, [language, removeUser]);

  const [showClearPw, setShowClearPw] = useState(false);
  const [clearPw, setClearPw] = useState("");
  const [clearPwError, setClearPwError] = useState(false);
  const [showClearPassword, setShowClearPassword] = useState(false);
  const [clearPwGenerated, setClearPwGenerated] = useState("");

  const openClearModal = useCallback(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    const pw = Array.from(arr, (b) => chars[b % chars.length]).join("");
    setClearPwGenerated(pw);
    setShowClearPw(true);
    setClearPw("");
    setClearPwError(false);
  }, []);

  const handleClearLocalStorage = useCallback(async () => {
    if (!clearPw) return;
    try {
      const form = new FormData();
      form.set("password", clearPw);
      form.set("generated_password", clearPwGenerated);
      console.log(`[BACKEND] ${new Date().toISOString()} | JAVA :3001 | POST /api/admin/login | called`);
      const res = await fetch("/api/admin/login", { method: "POST", body: form });
      const data = await res.json();
      console.log(`[BACKEND] ${new Date().toISOString()} | JAVA :3001 | POST /api/admin/login | ${res.ok ? 'OK' : 'FAIL'}`);
      if (data.success) {
        if (typeof window !== "undefined") {
          localStorage.clear();
          window.dispatchEvent(new Event("rewards-reset"));
          alert("Local storage wiped!");
        }
        setShowClearPw(false);
        setClearPw("");
        setClearPwError(false);
      } else {
        setClearPwError(true);
      }
    } catch {
      setClearPwError(true);
    }
  }, [clearPw, clearPwGenerated]);

  return (
    <>
      <Navbar />
      <div className="admin-dashboard" style={adminDarkStyles}>
        <style>{adminDarkCss}</style>
        <h2>{uiStrings["AdminPanel"]?.[language as Lang] || "Admin Panel"}</h2>

        <div className="admin-tabs">
          <button className={`admin-tab${activeTab === "analytics" ? " active" : ""}`} onClick={() => setActiveTab("analytics")}>
            Analytics
          </button>
          <button className={`admin-tab${activeTab === "manage" ? " active" : ""}`} onClick={() => setActiveTab("manage")}>
            Manage Products
          </button>
        </div>

        {activeTab === "analytics" ? (
          <DataVizDashboard products={products} orders={cartCtx?.orders || []} />
        ) : (
          <>
            <div className="admin-actions">
              <button onClick={clearAllHistory} style={{ fontSize: "14px", padding: "6px 12px", border: "1px solid #e53e3e", color: "#e53e3e", backgroundColor: "transparent", borderRadius: "4px", cursor: "pointer" }}>
                {uiStrings["ClearHistory"]?.[language as Lang] || "Clear All Order History"}
              </button>
              <button onClick={handleRemoveUser} style={{ fontSize: "14px", padding: "6px 12px", border: "1px solid #ed8936", color: "#ed8936", backgroundColor: "transparent", borderRadius: "4px", cursor: "pointer" }}>
                {uiStrings["RemoveUser"]?.[language as Lang] || "Remove User"}
              </button>
              <button onClick={openClearModal} style={{ fontSize: "14px", padding: "6px 12px", border: "1px solid #e53e3e", color: "#e53e3e", backgroundColor: "transparent", borderRadius: "4px", cursor: "pointer" }}>
                Clear Local Storage
              </button>
            </div>

            {showClearPw && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
                <div style={{ background: "var(--custom-bg, #1a1a2e)", border: "1px solid var(--custom-primary, #00d4ff)", borderRadius: "var(--custom-radius, 8px)", padding: 32, maxWidth: 360, width: "90%", textAlign: "center", color: "var(--custom-text, #e0e0e0)", fontFamily: "'Courier New', monospace" }}>
                  <h3 style={{ color: "var(--custom-accent, #ffd700)", marginBottom: 8 }}>Confirm Password</h3>
                  <p style={{ opacity: 0.7, fontSize: 13, marginBottom: 16, color: "var(--custom-text, #aaa)" }}>Enter admin password to clear local storage</p>
                  <div style={{ background: "color-mix(in srgb, var(--custom-primary, #00d4ff) 8%, transparent)", border: "1px dashed var(--custom-primary, #00d4ff)", borderRadius: "var(--custom-radius, 6px)", padding: "10px 14px", marginBottom: 16, fontFamily: "'Courier New', monospace", fontSize: 14, color: "var(--custom-primary, #00d4ff)", wordBreak: "break-all", letterSpacing: "1px" }}>
                    <div style={{ fontSize: 10, opacity: 0.5, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4, color: "var(--custom-text, #888)" }}>Generated Password</div>
                    {clearPwGenerated}
                  </div>
                  {clearPwError && <p style={{ color: "#fc8181", fontSize: 13, marginBottom: 8 }}>Invalid password</p>}
                  <div style={{ display: "flex", gap: 0, marginBottom: 12 }}>
                    <input
                      type={showClearPassword ? "text" : "password"}
                      value={clearPw}
                      onChange={(e) => { setClearPw(e.target.value); setClearPwError(false); }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleClearLocalStorage(); }}
                      placeholder="Admin password"
                      autoFocus
                      style={{ flex: 1, padding: "10px 14px", background: "transparent", border: "1px solid var(--custom-primary, #00d4ff)", borderRight: "none", borderRadius: "var(--custom-radius, 4px) 0 0 var(--custom-radius, 4px)", color: "var(--custom-text, #e0e0e0)", fontFamily: "inherit", fontSize: 14, boxSizing: "border-box" }}
                    />
                    <button onClick={() => setShowClearPassword(!showClearPassword)} style={{ padding: "10px 12px", background: "transparent", border: "1px solid var(--custom-primary, #00d4ff)", borderRadius: "0 var(--custom-radius, 4px) var(--custom-radius, 4px) 0", color: "var(--custom-primary, #00d4ff)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, whiteSpace: "nowrap" }}>
                      {showClearPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setShowClearPw(false); setClearPw(""); setClearPwError(false); }} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid #888", borderRadius: "var(--custom-radius, 4px)", color: "#888", cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>
                      Cancel
                    </button>
                    <button onClick={handleClearLocalStorage} style={{ flex: 1, padding: "10px", background: "#e53e3e", border: "none", borderRadius: "var(--custom-radius, 4px)", color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: "bold" }}>
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="admin-product-list">
              {products.map((p) => (
                <div key={p.id} className="admin-product">
                  <h3>{p.title}</h3>
                  <p>{p.price} {p.currency}</p>
                  <div style={{ display: "flex", flexDirection: "row", gap: "8px" }}>
                    <button onClick={() => editProduct(p.id)} style={{ border: "1px solid var(--accent)", color: "var(--accent)", background: "transparent", borderRadius: "4px", cursor: "pointer" }}>
                      {uiStrings["Edit"]?.[language as Lang] || "Edit"}
                    </button>
                    <button onClick={() =>
                      window.dispatchEvent(new CustomEvent("notify", { detail: uiStrings["DeleteNotWired"]?.[language as Lang] || "Delete not yet wired!" }))
                    } style={{ border: "1px solid #e53e3e", color: "#e53e3e", background: "transparent", borderRadius: "4px", cursor: "pointer" }}>
                      {uiStrings["Delete"]?.[language as Lang] || "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}