"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import Navbar from "@/components/Navbar";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const userCtx = useUser();
  const router = useRouter();

  const validateForm = useCallback(() => {
    if (!username.trim()) { setError("Username is required"); return false; }
    if (!password) { setError("Password is required"); return false; }
    setError(null);
    return true;
  }, [username, password]);

  const handleLogin = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (res.ok && data.username) {
        userCtx.login({ username: data.username, email: data.email || "" });
        window.dispatchEvent(new CustomEvent("notify", { detail: `Welcome ${data.username}!` }));
        router.push("/");
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Connection failed. Is the Go backend running?");
    } finally {
      setLoading(false);
    }
  }, [username, password, userCtx, validateForm, router]);

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 384, margin: "0 auto", paddingTop: 40, paddingBottom: 40 }}>
        <form className="flex flex-col gap-4" onSubmit={handleLogin}>
          <h2>Login</h2>
          <div>
            <input className="input" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <input type="password" className="input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p style={{ color: "#ff4444" }} className="text-sm">{error}</p>}
          <button type="submit" className="btn btn-brand w-full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </>
  );
}
