"use client";
import { useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";

const Recovery = dynamic(() => import("@/components/recovery"), { ssr: false });

function AdminLoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");
  const [showRecovery, setShowRecovery] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"send" | "login">("send");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSendPassword = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      console.log(`[BACKEND] ${new Date().toISOString()} | JAVA :3001 | POST /api/auth/send-password | called`);
      const res = await fetch("/api/auth/send-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin" }),
      });
      const data = await res.json();
      console.log(`[BACKEND] ${new Date().toISOString()} | JAVA :3001 | POST /api/auth/send-password | ${res.ok ? 'OK' : 'FAIL'}`);
      if (data.success) {
        setStep("login");
      } else {
        setErrorMsg(data.error || "Failed");
      }
    } catch {
      setErrorMsg("Cannot reach server");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    const form = new FormData(e.currentTarget);
    const password = form.get("password") as string;
    try {
      console.log(`[BACKEND] ${new Date().toISOString()} | JAVA :3001 | POST /api/admin/login | called`);
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin", password }),
      });
      const data = await res.json();
      console.log(`[BACKEND] ${new Date().toISOString()} | JAVA :3001 | POST /api/admin/login | ${res.ok ? 'OK' : 'FAIL'}`);
      if (data.success) {
        router.push(data.redirect || "/admin/dashboard");
      } else {
        setErrorMsg(data.error === "invalid_credentials" ? "Invalid password." : data.error);
        setShowRecovery(true);
      }
    } catch {
      setErrorMsg("Cannot reach server");
      setShowRecovery(true);
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (showRecovery || error) {
    return (
      <Recovery
        error={{ name: "AuthError", message: error === "auth_required" ? "Session expired." : errorMsg || "Access denied." }}
        reset={() => { setShowRecovery(false); setResetKey((k) => k + 1); }}
      />
    );
  }

  return (
    <>
      <Navbar />
      <div className="admin-login-wrap">
        <style>{`
          .admin-login-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 80vh;
            padding: 40px 16px;
          }
          .admin-card {
            background: var(--bg, rgba(26, 26, 46, 0.85));
            backdrop-filter: blur(12px);
            border: 1px solid var(--accent, #00d4ff);
            border-radius: var(--custom-radius, 8px);
            padding: 40px;
            max-width: 440px;
            width: 100%;
            text-align: center;
            color: var(--text, #e0e0e0);
          }
          .admin-card h1 {
            color: var(--accent, #ffd700);
            margin-bottom: 8px;
            font-size: 24px;
          }
          .admin-card .subtitle {
            color: var(--text, #aaa);
            opacity: 0.7;
            margin-bottom: 24px;
          }
          .admin-card .input-group {
            margin-bottom: 16px;
          }
          .admin-card .input-group input {
            width: 100%;
            padding: 12px 16px;
            background: transparent;
            border: 1px solid var(--accent, #00d4ff);
            border-radius: var(--custom-radius, 4px);
            color: var(--text, #e0e0e0);
            font-family: inherit;
            font-size: 16px;
            box-sizing: border-box;
          }
          .admin-card .input-group input::placeholder {
            color: var(--text, #aaa);
            opacity: 0.5;
          }
          .admin-card .input-group input:focus {
            outline: none;
            box-shadow: 0 0 10px color-mix(in srgb, var(--accent, #00d4ff) 40%, transparent);
          }
          .admin-card .submit-btn {
            width: 100%;
            padding: 12px;
            background: var(--accent, #00d4ff);
            border: none;
            border-radius: var(--custom-radius, 4px);
            color: #0a0a0f;
            font-family: inherit;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.2s;
          }
          .admin-card .submit-btn:hover {
            filter: brightness(1.1);
          }
          .admin-card .submit-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .admin-card .send-btn {
            width: 100%;
            padding: 16px;
            background: var(--accent, #00d4ff);
            border: none;
            border-radius: var(--custom-radius, 4px);
            color: #0a0a0f;
            font-family: inherit;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.2s;
          }
          .admin-card .send-btn:hover {
            filter: brightness(1.1);
          }
          .admin-card .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .admin-card .back-btn {
            margin-top: 12px;
            background: none;
            border: none;
            color: var(--text, #aaa);
            cursor: pointer;
            font-size: 13px;
          }
        `}</style>
        <div className="admin-card" key={resetKey}>
          <h1>Admin Login</h1>

          {step === "send" && (
            <>
              <p className="subtitle">Click to receive your password</p>
              <button className="send-btn" onClick={handleSendPassword} disabled={loading}>
                {loading ? "Generating..." : "Send Password"}
              </button>
            </>
          )}

          {step === "login" && (
            <>
              <p className="subtitle">Enter the password you received</p>

              <form onSubmit={handleLogin}>
                <div className="input-group">
                  <input
                    type="password"
                    name="password"
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>
              <button className="back-btn" onClick={() => { setStep("send"); setErrorMsg(""); }}>
                ← Get a new password
              </button>
            </>
          )}

          {errorMsg && (
            <p style={{ marginTop: "16px", fontSize: "13px", color: "#f87171" }}>{errorMsg}</p>
          )}
        </div>
      </div>
    </>
  );
}

export default function AdminLogin() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--accent, #00d4ff)", fontFamily: "'Courier New', monospace" }}>Loading...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}
