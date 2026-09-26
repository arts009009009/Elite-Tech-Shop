"use client";
import { createContext, useState, useContext, useCallback, useEffect, useMemo } from "react";

export type User = { username: string; email: string };
export type UserProfile = { displayName: string; avatar: string; bio: string };
export type UserContextType = {
  user: User | null; login: (user: User) => void; logout: () => void; removeUser: (username: string) => void;
  savedCarts: Record<string, Array<{ id: number; title: string; price: number; currency: string; quantity: number }>>;
  saveCurrentCart: (username: string, cart: Array<{ id: number; title: string; price: number; currency: string; quantity: number }>) => void;
  loadSavedCart: (username: string) => Array<{ id: number; title: string; price: number; currency: string; quantity: number }> | null;
  profile: UserProfile; updateProfile: (profile: Partial<UserProfile>) => void; isAuthenticated: boolean;
};

export const UserContext = createContext<UserContextType | null>(null);

import { goFetch } from "@/lib/goFetch";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [savedCarts, setSavedCarts] = useState<Record<string, Array<{ id: number; title: string; price: number; currency: string; quantity: number }>>>({});
  const [profile, setProfile] = useState<UserProfile>({ displayName: "", avatar: "", bio: "" });

  useEffect(() => {
    goFetch("/api/auth/me").then(r => {
      if (r.ok) return r.json();
      throw new Error("not logged in");
    }).then((data: { username: string; email: string }) => {
      setUser({ username: data.username, email: data.email });
    }).catch(() => {});
  }, []);

  const login = useCallback(async (u: User) => {
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    try { await goFetch("/api/auth/logout", { method: "POST" }); } catch {}
  }, []);

  const removeUser = useCallback(async (username: string) => {
    if (user?.username === username) { setUser(null); }
    try { await goFetch(`/api/admin/users/${username}`, { method: "DELETE" }); } catch {}
  }, [user]);

  const saveCurrentCart = useCallback((username: string, cart: Array<{ id: number; title: string; price: number; currency: string; quantity: number }>) => {
    setSavedCarts(prev => ({ ...prev, [username]: cart }));
  }, []);

  const loadSavedCart = useCallback((username: string) => {
    return savedCarts[username] || null;
  }, [savedCarts]);

  const updateProfile = useCallback((partial: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...partial }));
  }, []);

  return (
    <UserContext.Provider value={useMemo(() => ({ user, login, logout, removeUser, savedCarts, saveCurrentCart, loadSavedCart, profile, updateProfile, isAuthenticated: user !== null }), [user, login, logout, removeUser, savedCarts, saveCurrentCart, loadSavedCart, profile, updateProfile])}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) return { user: null, login: () => {}, logout: () => {}, removeUser: () => {}, savedCarts: {}, saveCurrentCart: () => {}, loadSavedCart: () => null, profile: { displayName: "", avatar: "", bio: "" }, updateProfile: () => {}, isAuthenticated: false };
  return ctx;
};
