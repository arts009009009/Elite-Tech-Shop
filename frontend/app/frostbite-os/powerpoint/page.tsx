"use client";

import { useState } from "react";
import { openFile, saveFile } from "@/lib/file-io";
import FrostbiteOSLayout from "@/components/frostbite-os/FrostbiteOSLayout";

interface Slide {
  title: string;
  content: string;
}

const DEFAULT_SLIDES: Slide[] = [
  { title: "Welcome", content: "This is a presentation created with FrostbiteOS PowerPoint." },
  { title: "Features", content: "Create, edit, and save slides as JSON files.\nUse the sidebar to navigate between slides." },
  { title: "Getting Started", content: "Click a slide in the sidebar to select it.\nUse Add Slide to create new slides.\nUse Delete Slide to remove slides." },
];

export default function PowerPointPage() {
  const [slides, setSlides] = useState<Slide[]>(DEFAULT_SLIDES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filename, setFilename] = useState("");

  const current = slides[currentIndex];

  const updateSlide = (field: "title" | "content", value: string) => {
    setSlides((prev) => {
      const next = [...prev];
      next[currentIndex] = { ...next[currentIndex], [field]: value };
      return next;
    });
  };

  const addSlide = () => {
    setSlides((prev) => [...prev, { title: "New Slide", content: "" }]);
    setCurrentIndex(slides.length);
  };

  const deleteSlide = () => {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((_, i) => i !== currentIndex));
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const handleOpen = async () => {
    const result = await openFile(".json");
    if (result) {
      try {
        const parsed = JSON.parse(result.content);
        if (Array.isArray(parsed)) {
          setSlides(parsed.map((s: Slide) => ({
            title: s.title ?? "",
            content: s.content ?? "",
          })));
          setCurrentIndex(0);
          setFilename(result.name);
        }
      } catch {
        alert("Invalid JSON file");
      }
    }
  };

  const handleSave = () => {
    saveFile(filename || "presentation.json", JSON.stringify(slides, null, 2), "application/json");
  };

  const title = filename ? `${filename} - PowerPoint` : "Untitled - PowerPoint";

  return (
    <FrostbiteOSLayout title="PowerPoint">
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--bg, #0a0a0f)", color: "var(--text, #e0e0e0)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", background: "var(--card-bg, #111)", borderBottom: "1px solid var(--border, #333)" }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleOpen} style={btnStyle}>Open</button>
            <button onClick={handleSave} style={btnStyle}>Save</button>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div style={{ width: 200, background: "var(--card-bg, #111)", borderRight: "1px solid var(--border, #333)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", gap: 4, padding: 8 }}>
              <button onClick={addSlide} style={{ ...btnStyle, flex: 1 }}>+ Add</button>
              <button onClick={deleteSlide} style={{ ...btnStyle, flex: 1 }}>- Delete</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 4 }}>
              {slides.map((slide, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  style={{
                    padding: "8px 10px",
                    marginBottom: 4,
                    borderRadius: 6,
                    cursor: "pointer",
                    background: i === currentIndex ? "rgba(0,212,255,0.15)" : "transparent",
                    border: i === currentIndex ? "1px solid var(--accent, #00d4ff)" : "1px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>Slide {i + 1}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {slide.title || "Untitled"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24, overflow: "auto" }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Title</div>
              <input
                value={current?.title ?? ""}
                onChange={(e) => updateSlide("title", e.target.value)}
                placeholder="Slide title..."
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Content</div>
              <textarea
                value={current?.content ?? ""}
                onChange={(e) => updateSlide("content", e.target.value)}
                placeholder="Slide content..."
                style={{ ...inputStyle, flex: 1, minHeight: 200, resize: "vertical", lineHeight: 1.6 }}
              />
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: "#888" }}>
              Slide {currentIndex + 1} of {slides.length}
            </div>
          </div>
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg, #0a0a0f)",
  color: "var(--text, #e0e0e0)",
  border: "1px solid var(--border, #333)",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};
