"use client";

import { useState, useCallback } from "react";
import { openFile, saveFile } from "@/lib/file-io";
import FrostbiteOSLayout from "@/components/frostbite-os/FrostbiteOSLayout";

export default function NotepadPage() {
  const [text, setText] = useState("");
  const [wordWrap, setWordWrap] = useState(true);
  const [filename, setFilename] = useState("");

  const handleOpen = useCallback(async () => {
    const result = await openFile(".txt");
    if (result) {
      setText(result.content);
      setFilename(result.name);
    }
  }, []);

  const handleSave = useCallback(() => {
    saveFile(filename || "document.txt", text);
  }, [filename, text]);

  const lineCount = text.split("\n").length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text.split("\n");

  return (
    <FrostbiteOSLayout title="Notepad">
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", gap: 8, padding: "8px 12px", borderBottom: "1px solid var(--border, #333)", alignItems: "center" }}>
          <button onClick={handleSave} style={btnStyle}>Save</button>
          <button onClick={handleOpen} style={btnStyle}>Open</button>
          <button onClick={() => setWordWrap(!wordWrap)} style={{ ...btnStyle, marginLeft: "auto" }}>
            Wrap: {wordWrap ? "ON" : "OFF"}
          </button>
          {filename && <span style={{ color: "#888", fontSize: 12 }}>{filename}</span>}
        </div>
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div style={{
            padding: "8px 4px",
            textAlign: "right",
            color: "#666",
            fontFamily: "monospace",
            fontSize: 14,
            lineHeight: "21px",
            userSelect: "none",
            borderRight: "1px solid var(--border, #333)",
            minWidth: 40,
            overflow: "hidden",
          }}>
            {lines.map((_, i) => (
              <div key={i} style={{ height: 21 }}>{i + 1}</div>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              flex: 1,
              background: "var(--bg, #0a0a0f)",
              color: "var(--text, #e0e0e0)",
              border: "none",
              padding: 8,
              fontFamily: "monospace",
              fontSize: 14,
              lineHeight: "21px",
              resize: "none",
              whiteSpace: wordWrap ? "pre-wrap" : "pre",
              overflowWrap: wordWrap ? "break-word" : "normal",
              overflowX: "auto",
              outline: "none",
            }}
          />
        </div>
        <div style={{
          display: "flex",
          gap: 16,
          padding: "4px 12px",
          borderTop: "1px solid var(--border, #333)",
          color: "#888",
          fontSize: 12,
        }}>
          <span>Lines: {lineCount}</span>
          <span>Words: {wordCount}</span>
        </div>
      </div>
    </FrostbiteOSLayout>
  );
}

const btnStyle: React.CSSProperties = {
  background: "var(--card-bg, #111)",
  color: "var(--text, #e0e0e0)",
  border: "1px solid var(--border, #333)",
  padding: "4px 12px",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12,
};
