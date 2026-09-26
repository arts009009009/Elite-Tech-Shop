"use client";

import { useState, useCallback } from "react";
import FrostbiteOSLayout from "@/components/frostbite-os/FrostbiteOSLayout";

const HOME_URL = "https://www.wikipedia.org";

export default function BrowserPage() {
  const [history, setHistory] = useState<string[]>([HOME_URL]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState(HOME_URL);

  const currentUrl = history[currentIndex];

  const navigate = useCallback((url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    let normalized = trimmed;
    if (!/^https?:\/\//i.test(trimmed) && trimmed !== "about:blank") {
      normalized = "https://" + trimmed;
    }
    setHistory((prev) => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(normalized);
      return newHistory;
    });
    setCurrentIndex((prev) => prev + 1);
    setInputValue(normalized);
  }, [currentIndex]);

  const handleGo = useCallback(() => {
    navigate(inputValue);
  }, [inputValue, navigate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleGo();
    },
    [handleGo],
  );

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setInputValue(history[newIndex]);
    }
  }, [currentIndex, history]);

  const handleForward = useCallback(() => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setInputValue(history[newIndex]);
    }
  }, [currentIndex, history]);

  const handleRefresh = useCallback(() => {
    setHistory((prev) => {
      const newHistory = [...prev];
      newHistory[currentIndex] = currentUrl + "#" + Date.now();
      return newHistory;
    });
  }, [currentIndex, currentUrl]);

  const handleHome = useCallback(() => {
    navigate(HOME_URL);
  }, [navigate]);

  return (
    <FrostbiteOSLayout title="Browser">
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderBottom: "1px solid var(--border, #333)",
            background: "var(--card-bg, #111)",
          }}
        >
          <button onClick={handleBack} disabled={currentIndex === 0} style={navBtnStyle} title="Back">
            &#9664;
          </button>
          <button onClick={handleForward} disabled={currentIndex === history.length - 1} style={navBtnStyle} title="Forward">
            &#9654;
          </button>
          <button onClick={handleRefresh} style={navBtnStyle} title="Refresh">
            &#8635;
          </button>
          <button onClick={handleHome} style={navBtnStyle} title="Home">
            &#8962;
          </button>
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter URL..."
            style={{
              flex: 1,
              background: "var(--bg, #0a0a0f)",
              color: "var(--text, #e0e0e0)",
              border: "1px solid var(--border, #333)",
              borderRadius: 4,
              padding: "6px 10px",
              fontSize: 13,
              fontFamily: "monospace",
              outline: "none",
            }}
          />
          <button onClick={handleGo} style={goBtnStyle}>
            Go
          </button>
        </div>
        <div style={{ flex: 1, position: "relative", background: "#fff" }}>
          {currentUrl === "about:blank" ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#666",
                fontSize: 14,
                fontFamily: "sans-serif",
              }}
            >
              New Tab
            </div>
          ) : (
            <iframe
              key={currentUrl}
              src={currentUrl}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title="Browser content"
            />
          )}
        </div>
      </div>
    </FrostbiteOSLayout>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: "var(--bg, #0a0a0f)",
  color: "var(--text, #e0e0e0)",
  border: "1px solid var(--border, #333)",
  borderRadius: 4,
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 14,
  flexShrink: 0,
};

const goBtnStyle: React.CSSProperties = {
  background: "var(--accent, #00d4ff)",
  color: "#000",
  border: "none",
  borderRadius: 4,
  padding: "6px 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  flexShrink: 0,
};
