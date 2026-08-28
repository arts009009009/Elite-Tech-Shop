"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import Navbar from "@/components/Navbar";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const userCtx = useUser();
  const router = useRouter();

  const validateForm = useCallback(() => {
    if (!username.trim()) { setError("Username is required"); return false; }
    if (!email.trim()) { setError("Email is required"); return false; }
    if (!email.includes("@")) { setError("Please enter a valid email"); return false; }
    if (!password) { setError("Password is required"); return false; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return false; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return false; }
    setError(null);
    return true;
  }, [username, email, password, confirmPassword]);

  const handleSignup = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (res.ok && data.username) {
        userCtx.login({ username: data.username, email: data.email || email.trim() });
        window.dispatchEvent(new CustomEvent("notify", { detail: `Account created for ${data.username}!` }));
        router.push("/");
      } else {
        setError(data.error || "Signup failed");
      }
    } catch {
      setError("Connection failed. Is the Go backend running?");
    } finally {
      setLoading(false);
    }
  }, [username, email, password, userCtx, validateForm, router]);

  return (
    <>
      <Navbar />
      <div className="max-w-[384px] mx-auto py-10">
        <form className="flex flex-col gap-4" onSubmit={handleSignup}>
          <h2>Signup</h2>
          <div>
            <input className="input" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <input type="email" className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <input type="password" className="input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <input type="password" className="input" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn btn-brand w-full" disabled={loading}>
            {loading ? "Creating account..." : "Signup"}
          </button>
        </form>
      </div>
    </>
  );
}
