"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import translations from "@/data/navbar-translate.json";

type Lang = "en" | "ar" | "ru" | "fr" | "es" | "de" | "zh" | "ja" | "pt" | "hi";
type TranslationEntry = Partial<Record<Lang, string>>;
type TranslationMap = Record<string, TranslationEntry>;
const typedTranslations: TranslationMap = translations;

type SearchResult = { id: number; title: string; price: number; currency: string; category: string };
type Props = { onSearch: (query?: string) => void; results: SearchResult[]; loading?: boolean };

export default function LiveSearch({ onSearch, results, loading }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isOpen = query.trim().length > 0;
  const { language } = useLanguage();
  const t = useMemo(() => {
    const lang = language as Lang;
    return (key: string) => typedTranslations[key]?.[lang] ?? key;
  }, [language]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim()) {
      debounceRef.current = setTimeout(() => onSearch(query.trim()), 300);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, onSearch]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setQuery(""); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
const selectResult = useCallback((id: number) => { setQuery(""); }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") setQuery("");
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("SearchProducts")}
          style={{
            paddingLeft: "40px",
            paddingRight: "40px",
            borderRadius: "12px",
            border: "1px solid var(--v2-border, #90cdf4)",
            background: "var(--v2-panel, rgba(10,10,15,0.98))",
            color: "var(--v2-text, inherit)",
            width: "100%",
            height: "40px",
            outline: "none",
            boxSizing: "border-box",
            fontSize: "14px"
          }}
        />
        <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", opacity: 0.5, pointerEvents: "none" }}>
          🔍
        </div>
        {loading && (
          <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }}>
            <div className="spinner" style={{
              width: "16px",
              height: "16px",
              border: "2px solid #4299E1",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.6s linear infinite",
            }} />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: "4px",
          borderRadius: "10px",
          border: "1px solid var(--v2-border, rgba(0,212,255,0.3))",
          background: "var(--v2-panel, rgba(10,10,15,0.98))",
          overflow: "hidden",
          zIndex: "var(--z-dropdown)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {results.map((result) => (
              <Link
                key={result.id}
                href={`/product/${result.id}`}
                style={{
                  display: "flex",
                  width: "100%",
                  justifyContent: "space-between",
                  padding: "12px",
                  textDecoration: "none",
                  color: "inherit",
                  boxSizing: "border-box",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer"
                }}
                onClick={() => selectResult(result.id)}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0 }}>
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>{result.title}</span>
                  <span style={{ fontSize: "12px", opacity: 0.6, color: "var(--v2-muted, inherit)" }}>{result.category}</span>
                </div>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--v2-green, #39FF14)" }}>
                  {formatCurrency(result.price, result.currency)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
