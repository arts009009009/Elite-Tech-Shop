"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import translations from "@/data/navbar-translate.json";

type Lang = "en" | "ar" | "ru" | "fr" | "es" | "de" | "zh" | "ja" | "pt" | "hi";
type TranslationEntry = Partial<Record<Lang, string>>;
type TranslationMap = Record<string, TranslationEntry>;
const typedTranslations: TranslationMap = translations;

type AIChatMessage = { id: string; text: string; sender: "bot" | "user" };

const SUGGESTIONS = ["What's your return policy?", "How do I track my order?", "Do you offer international shipping?", "What payment methods do you accept?", "Can I cancel my order?"];

const BOT_RESPONSES: Record<string, string> = {
  "return policy": "Our return policy allows you to return any item within 30 days of purchase. Items must be in original condition with all accessories.",
  "track my order": "You can track your order from the Order History page after logging in. You'll receive email updates at every step.",
  "international shipping": "Yes, we ship to over 50 countries worldwide! Shipping rates and times vary by destination.",
  "payment methods": "We accept Visa, Mastercard, American Express, PayPal, Apple Pay, and Google Pay. All transactions are encrypted.",
  "cancel my order": "You can cancel your order within 1 hour of placing it. After that, please contact our support team.",
};

function generateId() { return `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

function findBestResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const [key, response] of Object.entries(BOT_RESPONSES)) { if (lower.includes(key)) return response; }
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) return "Hello! I'm your AI shopping assistant. How can I help you today?";
  if (lower.includes("price") || lower.includes("cost") || lower.includes("cheap") || lower.includes("discount")) return "We have competitive prices on all our products! Check out our catalog for current pricing.";
  if (lower.includes("thank")) return "You're welcome! Is there anything else I can help you with?";
  return "I'm not sure about that. Could you please rephrase your question? You can also contact our live support team for more detailed assistance.";
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { language } = useLanguage();
  const t = useMemo(() => {
    const lang = language as Lang;
    return (key: string) => typedTranslations[key]?.[lang] ?? key;
  }, [language]);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && messages.length === 0) {
      initializedRef.current = true;
      setMessages([{ id: "ai-welcome", text: t("AIWelcome"), sender: "bot" }]);
    }
  }, [t, messages.length]);

  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    return () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") { setIsOpen(false); }
        if (e.key === "Tab" && panelRef.current) {
          const focusable = panelRef.current.querySelectorAll<HTMLElement>(
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

  const addMessage = useCallback((text: string, sender: "bot" | "user") => { setMessages((prev) => [...prev, { id: generateId(), text, sender }]); }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    addMessage(text, "user");
    setInput("");
    const timer = setTimeout(() => { addMessage(findBestResponse(text), "bot"); }, 500 + Math.random() * 500);
    timersRef.current.push(timer);
  }, [input, addMessage]);

  const handleSuggestion = useCallback((suggestion: string) => {
    addMessage(suggestion, "user");
    setInput("");
    const timer = setTimeout(() => { addMessage(findBestResponse(suggestion), "bot"); }, 400);
    timersRef.current.push(timer);
  }, [addMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }, [handleSend]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label={t("OpenAIShoppingAssistant")}
        aria-haspopup="dialog"
        title={t("AIAssistant")}
        style={{
          position: "fixed",
          bottom: 16,
          left: 16,
          zIndex: "var(--z-toast)",
          fontSize: 16,
          padding: "12px 20px",
          borderRadius: 9999,
          background: "#A020F0",
          color: "#fff",
          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l2 7h7l-5.5 4 2 7-5.5-4-5.5 4 2-7L3 9h7z" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("AIAssistant")}
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: "var(--z-modal-backdrop)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 400,
              maxWidth: "90vw",
              background: "var(--bg-card)",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
              zIndex: "var(--z-modal)",
            }}
          >
            <div style={{
              background: "#805ad5",
              color: "#fff",
              padding: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <p style={{ fontWeight: "bold", margin: 0 }}>{t("AIAssistant")}</p>
              <button
                onClick={() => setIsOpen(false)}
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
              padding: 16,
              gap: 12,
              alignItems: "stretch",
            }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{
                  alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                  background: msg.sender === "user" ? "#e9d8fd" : "#f7fafc",
                  padding: "8px 12px",
                  borderRadius: 12,
                  maxWidth: "80%",
                }}>
                  <p style={{ fontSize: 14, margin: 0 }}>{msg.text}</p>
                </div>
              ))}

              <div style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}>
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestion(suggestion)}
                    style={{
                      fontSize: 12,
                      padding: "6px 10px",
                      background: "transparent",
                      border: "1px solid #A020F0",
                      color: "#A020F0",
                      borderRadius: 9999,
                      cursor: "pointer",
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <div ref={messagesEndRef} />
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              padding: 16,
              borderTop: "1px solid var(--border)",
              gap: 8,
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("AskMeAnything")}
                aria-label={t("AskMeAnything")}
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
                  background: "#A020F0",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                {t("Ask")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
