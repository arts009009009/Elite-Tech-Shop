"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useUser } from "@/context/UserContext";
import { useCart } from "@/context/CartContext";
import { goFetch } from "@/lib/goFetch";

type Profile = { display_name: string; avatar: string; bio: string; theme: string };

export default function ProfilePage() {
  const { user, isAuthenticated, updateProfile, saveCurrentCart, loadSavedCart } = useUser();
  const { cart } = useCart();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [message, setMessage] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMessage, setPwMessage] = useState("");
  const [savedCartMsg, setSavedCartMsg] = useState("");

  useEffect(() => {
    if (user) {
      goFetch("/api/profile").then(r => r.json()).then((data: Profile) => {
        setDisplayName(data.display_name || user.username);
        setBio(data.bio || "");
        setAvatar(data.avatar || "");
      }).catch(() => {});
    }
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      const res = await goFetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, bio, avatar, theme: "" }),
      });
      if (res.ok) {
        updateProfile({ displayName, bio, avatar });
        setMessage("Profile updated!");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch { setMessage("Failed to update profile"); }
  };

  const handleChangePassword = async () => {
    setPwMessage("");
    if (newPassword.length < 8) { setPwMessage("Password must be at least 8 characters"); return; }
    try {
      const res = await goFetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) { setPwMessage("Password changed!"); setOldPassword(""); setNewPassword(""); }
      else { setPwMessage(data.error || "Failed"); }
    } catch { setPwMessage("Failed to change password"); }
  };

  const handleSaveCart = () => {
    if (!user) return;
    const cartData = cart.map(item => ({ id: item.id, title: item.title, price: item.price, currency: item.currency, quantity: item.quantity }));
    saveCurrentCart(user.username, cartData);
    setSavedCartMsg("Cart saved locally!");
    setTimeout(() => setSavedCartMsg(""), 3000);
  };

  const handleLoadCart = () => {
    if (!user) return;
    const saved = loadSavedCart(user.username);
    if (saved) { setSavedCartMsg("Loaded " + saved.length + " saved items"); }
    else { setSavedCartMsg("No saved cart found"); }
    setTimeout(() => setSavedCartMsg(""), 3000);
  };

  if (!isAuthenticated) {
    return (
      <>
        <Navbar />
        <div className="container py-10 text-center">
          <h1>Profile</h1>
          <p className="text-[#888] mt-4">Please log in to view your profile.</p>
        </div>
      </>
    );
  }

  const cardStyle = { background: "var(--card-bg, #111)", border: "1px solid var(--border, #333)", borderRadius: 8, padding: 24 };
  const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid var(--border, #333)", borderRadius: 4, background: "var(--bg, #0a0a0a)", color: "var(--text, #e0e0e0)", fontSize: 14 };
  const btnStyle = { padding: "8px 16px", background: "var(--accent, #00d4ff)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 14 };

  return (
    <>
      <Navbar />
      <div className="container max-w-[640px] mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Your Profile</h1>

        <div className="mb-4 p-6 rounded-lg" style={{ background: "var(--card-bg, #111)", border: "1px solid var(--border, #333)" }}>
          <h2 className="text-lg mb-4">Profile Settings</h2>
          <label className="block text-xs text-[#888] mb-1">Display Name</label>
          <input className="input w-full" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your display name" />
          <label className="block text-xs text-[#888] mt-3 mb-1">Bio</label>
          <textarea className="input w-full min-h-[80px] resize-y" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself" />
          <label className="block text-xs text-[#888] mt-3 mb-1">Avatar URL</label>
          <input className="input w-full" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://example.com/avatar.png" />
          <button onClick={handleSaveProfile} className="mt-4 px-4 py-2 bg-[var(--accent,#00d4ff)] text-white border-none rounded cursor-pointer text-sm">Save Profile</button>
          {message && <p className="text-[13px] mt-2 text-[#39FF14]">{message}</p>}
        </div>

        <div className="mb-4 p-6 rounded-lg" style={{ background: "var(--card-bg, #111)", border: "1px solid var(--border, #333)" }}>
          <h2 className="text-lg mb-4">Change Password</h2>
          <label className="block text-xs text-[#888] mb-1">Current Password</label>
          <input className="input w-full" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          <label className="block text-xs text-[#888] mt-3 mb-1">New Password (min 8 chars)</label>
          <input className="input w-full" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <button onClick={handleChangePassword} className="mt-4 px-4 py-2 bg-[var(--accent,#00d4ff)] text-white border-none rounded cursor-pointer text-sm">Change Password</button>
          {pwMessage && <p className="text-[13px] mt-2" style={{ color: pwMessage.includes("changed") ? "#39FF14" : "#ff4040" }}>{pwMessage}</p>}
        </div>

        <div className="p-6 rounded-lg" style={{ background: "var(--card-bg, #111)", border: "1px solid var(--border, #333)" }}>
          <h2 className="text-lg mb-4">Saved Carts</h2>
          <p className="text-[13px] text-[#888] mb-4">Save your current cart and restore it later.</p>
          <div className="flex gap-2">
            <button onClick={handleSaveCart} className="px-4 py-2 text-white border-none rounded cursor-pointer text-sm" style={{ background: "#ecc94b", color: "#000" }}>Save Cart</button>
            <button onClick={handleLoadCart} className="px-4 py-2 text-white border-none rounded cursor-pointer text-sm bg-[#48bb78]">Load Saved Cart</button>
          </div>
          {savedCartMsg && <p className="text-[13px] mt-2 text-[#39FF14]">{savedCartMsg}</p>}
        </div>
      </div>
    </>
  );
}
