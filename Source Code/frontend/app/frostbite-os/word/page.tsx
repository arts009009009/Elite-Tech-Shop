"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { openFile, saveFile } from "@/lib/file-io";
import FrostbiteOSLayout from "@/components/frostbite-os/FrostbiteOSLayout";

export default function WordPage() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [filename, setFilename] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [fontSize, setFontSize] = useState(16);

  const updateCounts = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || "";
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setCharCount(chars);
    setWordCount(words);
  }, []);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const handler = () => updateCounts();
    el.addEventListener("input", handler);
    return () => el.removeEventListener("input", handler);
  }, [updateCounts]);

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    updateCounts();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); execCmd("bold"); }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); execCmd("italic"); }
    if ((e.ctrlKey || e.metaKey) && e.key === "u") { e.preventDefault(); execCmd("underline"); }
  };

  const handleOpen = async () => {
    const result = await openFile(".txt,.html");
    if (result) {
      if (editorRef.current) {
        // Sanitize: only allow safe HTML tags for a word processor
        const sanitized = result.content
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
          .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
          .replace(/<embed\b[^>]*>/gi, "")
          .replace(/on\w+\s*=/gi, "data-blocked=");
        editorRef.current.innerHTML = sanitized;
      }
      setFilename(result.name);
      setTimeout(updateCounts, 50);
    }
  };

  const handleSave = () => {
    if (!editorRef.current) return;
    saveFile(filename || "document.html", editorRef.current.innerHTML, "text/html");
  };

  const title = filename ? `${filename} - Word` : "Untitled - Word";

  return (
    <FrostbiteOSLayout title="Word">
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg, #0a0a0f)", color: "var(--text, #e0e0e0)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", background: "var(--card-bg, #111)", borderBottom: "1px solid var(--border, #333)" }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleOpen} style={btnStyle}>Open</button>
            <button onClick={handleSave} style={btnStyle}>Save</button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px", background: "var(--card-bg, #111)", borderBottom: "1px solid var(--border, #333)" }}>
          <button onClick={() => execCmd("bold")} style={toolBtn} title="Bold (Ctrl+B)"><b>B</b></button>
          <button onClick={() => execCmd("italic")} style={toolBtn} title="Italic (Ctrl+I)"><i>I</i></button>
          <button onClick={() => execCmd("underline")} style={toolBtn} title="Underline (Ctrl+U)"><u>U</u></button>
          <div style={{ width: 1, height: 20, background: "var(--border, #333)" }} />
          <select
            value={fontSize}
            onChange={(e) => { setFontSize(Number(e.target.value)); execCmd("fontSize", e.target.value === "12" ? "3" : e.target.value === "16" ? "4" : e.target.value === "20" ? "5" : e.target.value === "24" ? "6" : "7"); }}
            style={{ background: "var(--bg, #0a0a0f)", color: "var(--text, #e0e0e0)", border: "1px solid var(--border, #333)", borderRadius: 4, padding: "2px 6px", fontSize: 12 }}
          >
            <option value={12}>12px</option>
            <option value={16}>16px</option>
            <option value={20}>20px</option>
            <option value={24}>24px</option>
            <option value={32}>32px</option>
          </select>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onKeyDown={handleKeyDown}
            onInput={updateCounts}
            style={{
              minHeight: 400,
              padding: 24,
              background: "var(--card-bg, #111)",
              border: "1px solid var(--border, #333)",
              borderRadius: 8,
              outline: "none",
              fontSize: fontSize,
              lineHeight: 1.6,
              color: "var(--text, #e0e0e0)",
            }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, padding: "4px 12px", background: "var(--card-bg, #111)", borderTop: "1px solid var(--border, #333)", fontSize: 12, color: "#888" }}>
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
      </div>
    </FrostbiteOSLayout>
  );
}

const btnStyle: React.CSSProperties = {
  background: "var(--bg, #0a0a0f)",
  color: "var(--text, #e0e0e0)",
  border: "1px solid var(--border, #333)",
  borderRadius: 4,
  padding: "3px 12px",
  fontSize: 12,
  cursor: "pointer",
};

const toolBtn: React.CSSProperties = {
  background: "transparent",
  color: "var(--text, #e0e0e0)",
  border: "1px solid var(--border, #333)",
  borderRadius: 4,
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 13,
};
