"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import translations from "@/data/navbar-translate.json";

type Lang = "en" | "ar" | "ru" | "fr" | "es" | "de" | "zh" | "ja" | "pt" | "hi";
type TranslationEntry = Partial<Record<Lang, string>>;
type TranslationMap = Record<string, TranslationEntry>;
const typedTranslations: TranslationMap = translations;

type ChatMessage = { id: string; text: string; sender: "user" | "support"; timestamp: Date };

const AUTO_REPLIES = [
  "Thanks for your message! A support agent will be with you shortly.",
  "I can help you track your order. Could you provide your order ID?",
  "Our return policy allows returns within 30 days of purchase.",
  "Yes, we offer free shipping on orders over $100!",
  "Let me check that for you. One moment please...",
  "Is there anything else I can help you with?",
  "You can reach our support team 24/7 at https://discord.gg/BZs4MH3Wms",
  "I've escalated your issue to our senior team. They'll reach out within 24 hours.",
];

function generateId() { return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

export default function Chat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const t = useMemo(() => {
    const lang = language as Lang;
    return (key: string) => typedTranslations[key]?.[lang] ?? key;
  }, [language]);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && messages.length === 0) {
      initializedRef.current = true;
      setMessages([{ id: "welcome", text: t("WelcomeSupport"), sender: "support", timestamp: new Date() }]);
    }
  }, [t, messages.length]);

  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") { setIsOpen(false); }
        if (e.key === "Tab" && chatPanelRef.current) {
          const focusable = chatPanelRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  const addMessage = useCallback((text: string, sender: "user" | "support") => {
    setMessages((prev) => [...prev, { id: generateId(), text, sender, timestamp: new Date() }]);
  }, []);

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const simulateTyping = useCallback(() => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setIsTyping(true);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      typingTimerRef.current = null;
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      addMessage(reply, "support");
      if (!isOpen) setUnreadCount((prev) => prev + 1);
    }, 1000 + Math.random() * 2000);
  }, [addMessage, isOpen]);

  useEffect(() => {
    return () => { if (typingTimerRef.current) clearTimeout(typingTimerRef.current); };
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    addMessage(text, "user");
    setInput("");
    simulateTyping();
  }, [input, addMessage, simulateTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }, [handleSend]);

  const toggleChat = useCallback(() => { setIsOpen((prev) => { if (!prev) setUnreadCount(0); return !prev; }); }, []);

  return (
    <>
<button
        onClick={toggleChat}
        aria-label={isOpen ? "Close chat" : `Open chat${unreadCount > 0 ? ` (${unreadCount} unread messages)` : ""}`}
        aria-expanded={isOpen}
        aria-controls="chat-panel"
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: "var(--z-toast)",
          fontSize: 16,
          padding: "12px 20px",
          borderRadius: 9999,
          background: "var(--accent)",
          color: "#fff",
          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
          border: "none",
          cursor: "pointer",
        }}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isOpen ? (
            <svg viewBox="0 0 24 24" width="24" height="24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" fill="currentColor"/></svg>
          )}
          {unreadCount > 0 && !isOpen && (
            <span style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 20,
              height: 20,
              borderRadius: 9999,
              background: "#e53e3e",
              color: "#fff",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {unreadCount}
            </span>
          )}
        </div>
      </button>

{isOpen && (
        <div
          ref={chatPanelRef}
          id="chat-panel"
          role="dialog"
          aria-label={t("LiveSupport")}
          aria-modal="true"
          style={{
          position: "fixed",
          bottom: 80,
          right: 20,
          width: 350,
          maxWidth: "90vw",
          background: "var(--bg-card)",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          zIndex: "var(--z-modal)",
          overflow: "hidden",
        }}>
          <div style={{
            background: "#3182ce",
            color: "#fff",
            padding: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <p style={{ fontWeight: "bold", fontSize: 14, margin: 0 }}>{t("LiveSupport")}</p>
            <button
              onClick={toggleChat}
              style={{
                fontSize: 12,
                padding: "6px 10px",
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.8)",
                cursor: "pointer",
                borderRadius: 4,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{
            display: "flex",
            flexDirection: "column",
            height: 320,
            overflowY: "auto",
            padding: 12,
            gap: 8,
            alignItems: "stretch",
          }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{
                alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                background: msg.sender === "user" ? "#bee3f8" : "#f7fafc",
                padding: "8px 12px",
                borderRadius: 12,
                maxWidth: "80%",
              }}>
                <p style={{ fontSize: 14, margin: 0, color: "#1a202c" }}>{msg.text}</p>
                <p style={{ fontSize: 12, opacity: 0.5, margin: 0, marginTop: 4, color: "#1a202c" }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
            {isTyping && (
              <div style={{
                alignSelf: "flex-start",
                background: "#f7fafc",
                padding: "8px 12px",
                borderRadius: 12,
              }}>
                <p style={{ fontSize: 14, fontStyle: "italic", opacity: 0.6, margin: 0, color: "#1a202c" }}>{t("SupportTyping")}</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            padding: 12,
            borderTop: "1px solid var(--border)",
            gap: 8,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("TypeMessage")}
              aria-label="Chat message"
              style={{
                fontSize: 14,
                padding: "8px 12px",
                flex: 1,
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
            <button
              onClick={handleSend}
              style={{
                fontSize: 14,
                padding: "8px 12px",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {t("Send")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
