"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { openDataURL, saveDataURL } from "@/lib/file-io";
import FrostbiteOSLayout from "@/components/frostbite-os/FrostbiteOSLayout";

export default function PaintPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(4);
  const [eraser, setEraser] = useState(false);
  const [filename, setFilename] = useState("");
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !lastPos.current) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = eraser ? "#0a0a0f" : color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => {
    setDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleOpen = useCallback(async () => {
    const result = await openDataURL("image/*");
    if (result) {
      setFilename(result.name);
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      };
      img.src = result.url;
    }
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      saveDataURL(filename || "painting.png", dataUrl);
    }
  }, [filename]);

  return (
    <FrostbiteOSLayout title="Paint">
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 41px)", margin: "-16px", marginTop: 0 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 12px",
          borderBottom: "1px solid var(--border, #333)",
          flexWrap: "wrap",
        }}>
          <label style={labelStyle}>
            Color
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: 32, height: 28, border: "none", cursor: "pointer" }}
            />
          </label>
          <label style={labelStyle}>
            Size: {brushSize}
            <input
              type="range"
              min={1}
              max={50}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              style={{ width: 100 }}
            />
          </label>
          <button onClick={() => setEraser(!eraser)} style={{ ...btnStyle, background: eraser ? "var(--accent, #00d4ff)" : "var(--card-bg, #111)", color: eraser ? "#000" : "var(--text, #e0e0e0)" }}>
            {eraser ? "Eraser ON" : "Eraser OFF"}
          </button>
          <button onClick={clearCanvas} style={btnStyle}>Clear</button>
          <button onClick={handleOpen} style={btnStyle}>Open</button>
          <button onClick={handleSave} style={btnStyle}>Save</button>
          {filename && <span style={{ color: "#888", fontSize: 12 }}>{filename}</span>}
        </div>
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            style={{
              width: "100%",
              height: "100%",
              cursor: eraser ? "cell" : "crosshair",
              display: "block",
            }}
          />
        </div>
      </div>
    </FrostbiteOSLayout>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: "var(--text, #e0e0e0)",
  fontSize: 12,
};

const btnStyle: React.CSSProperties = {
  background: "var(--card-bg, #111)",
  color: "var(--text, #e0e0e0)",
  border: "1px solid var(--border, #333)",
  padding: "4px 12px",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12,
};
