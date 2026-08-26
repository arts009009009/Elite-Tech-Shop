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
        <div className="container" style={{ padding: 40, textAlign: "center" }}>
          <h1>Profile</h1>
          <p style={{ color: "#888", marginTop: 16 }}>Please log in to view your profile.</p>
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
      <div className="container" style={{ padding: 24, maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Your Profile</h1>

        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Profile Settings</h2>
          <label style={{ display: "block", fontSize: 12, color: "#888", marginBottom: 4 }}>Display Name</label>
          <input style={inputStyle} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your display name" />
          <label style={{ display: "block", fontSize: 12, color: "#888", marginTop: 12, marginBottom: 4 }}>Bio</label>
          <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself" />
          <label style={{ display: "block", fontSize: 12, color: "#888", marginTop: 12, marginBottom: 4 }}>Avatar URL</label>
          <input style={inputStyle} value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://example.com/avatar.png" />
          <button onClick={handleSaveProfile} style={{ ...btnStyle, marginTop: 16 }}>Save Profile</button>
          {message && <p style={{ color: "#39FF14", fontSize: 13, marginTop: 8 }}>{message}</p>}
        </div>

        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Change Password</h2>
          <label style={{ display: "block", fontSize: 12, color: "#888", marginBottom: 4 }}>Current Password</label>
          <input style={inputStyle} type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          <label style={{ display: "block", fontSize: 12, color: "#888", marginTop: 12, marginBottom: 4 }}>New Password (min 8 chars)</label>
          <input style={inputStyle} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <button onClick={handleChangePassword} style={{ ...btnStyle, marginTop: 16 }}>Change Password</button>
          {pwMessage && <p style={{ color: pwMessage.includes("changed") ? "#39FF14" : "#ff4040", fontSize: 13, marginTop: 8 }}>{pwMessage}</p>}
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Saved Carts</h2>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Save your current cart and restore it later.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSaveCart} style={{ ...btnStyle, background: "#ecc94b", color: "#000" }}>Save Cart</button>
            <button onClick={handleLoadCart} style={{ ...btnStyle, background: "#48bb78" }}>Load Saved Cart</button>
          </div>
          {savedCartMsg && <p style={{ color: "#39FF14", fontSize: 13, marginTop: 8 }}>{savedCartMsg}</p>}
        </div>
      </div>
    </>
  );
}
