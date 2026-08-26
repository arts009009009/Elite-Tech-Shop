"use client";
import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from "react";

type GlitchCtx = { active: boolean; toggle: () => void };

const Ctx = createContext<GlitchCtx>({ active: false, toggle: () => {} });
export const useGlitch = () => useContext(Ctx);

const GLITCH_CHARS = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~";
const SKIP = new Set(["SCRIPT","STYLE","CANVAS","SVG","LINK","META","HEAD"]);
const origTexts = new WeakMap<Node, string>();
const origValues = new WeakMap<Element, string>();
let capturing = false;

function scrambleNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent || "";
    if (!t.trim()) return;
    if (capturing && !origTexts.has(node)) origTexts.set(node, t);
    node.textContent = t.split("").map(c => c === " " || c === "\n" || c === "\t" ? c : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]).join("");
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    if (SKIP.has(el.tagName)) return;
    if (el.classList?.contains("glitch-button") || el.closest?.(".glitch-button")) return;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
      const inp = el as HTMLInputElement;
      if (capturing && !origValues.has(el)) origValues.set(el, inp.value);
      inp.value = inp.value.split("").map(c => c === " " ? c : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]).join("");
      return;
    }
    for (const ch of Array.from(el.childNodes)) scrambleNode(ch);
  }
}

function restoreNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (origTexts.has(node)) { node.textContent = origTexts.get(node) ?? null; origTexts.delete(node); }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    if (SKIP.has(el.tagName)) return;
    if (el.classList?.contains("glitch-button") || el.closest?.(".glitch-button")) return;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
      if (origValues.has(el)) { (el as HTMLInputElement).value = origValues.get(el)!; origValues.delete(el); }
      return;
    }
    for (const ch of Array.from(el.childNodes)) restoreNode(ch);
  }
}

export function GlitchProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const [crashId] = useState("");
  const intRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const toutRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audioRef = useRef<AudioContext | null>(null);

  const playStatic = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const c = audioRef.current;
      const b = c.createBuffer(1, c.sampleRate * 0.15, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
      const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start();
    } catch {}
  }, []);

  const stopAll = useCallback(() => {
    intRef.current.forEach(clearInterval);
    toutRef.current.forEach(clearTimeout);
    intRef.current = [];
    toutRef.current = [];
  }, []);

  const activate = useCallback(() => {
    const root = document.body;
    capturing = true;
    scrambleNode(root);
    capturing = false;
    root.classList.add("glitch-active");
    const rgb = document.createElement("div"); rgb.className = "glitch-rgb"; root.appendChild(rgb);

    intRef.current.push(setInterval(() => { root.classList.add("glitch-flicker"); toutRef.current.push(setTimeout(() => root.classList.remove("glitch-flicker"), 80)); }, 2000 + Math.random() * 3000));
    intRef.current.push(setInterval(() => { root.classList.add("glitch-shake"); playStatic(); toutRef.current.push(setTimeout(() => root.classList.remove("glitch-shake"), 300)); }, 3000 + Math.random() * 4000));
    intRef.current.push(setInterval(() => { root.classList.add("glitch-invert"); toutRef.current.push(setTimeout(() => root.classList.remove("glitch-invert"), 150)); }, 5000 + Math.random() * 5000));
    intRef.current.push(setInterval(() => { const o = document.createElement("div"); o.className = "glitch-shutter"; root.appendChild(o); playStatic(); toutRef.current.push(setTimeout(() => o.remove(), 100 + Math.random() * 200)); }, 4000 + Math.random() * 6000));

    const jumpscare = () => {
      const t = setTimeout(() => {
        if (!root.classList.contains("glitch-active")) return;
        const b = document.createElement("div"); b.className = "glitch-blackout"; root.appendChild(b); playStatic();
        toutRef.current.push(setTimeout(() => { b.remove(); playStatic(); }, 1000 + Math.random() * 1000));
        jumpscare();
      }, 8000 + Math.random() * 15000);
      toutRef.current.push(t);
    };
    jumpscare();

    intRef.current.push(setInterval(() => scrambleNode(document.body), 2000));

    const intensifyTimer = setTimeout(() => {
      if (!root.classList.contains("glitch-active")) return;
      root.classList.add("glitch-overdrive");
      playStatic();

      intRef.current.push(setInterval(() => { root.classList.add("glitch-flicker"); toutRef.current.push(setTimeout(() => root.classList.remove("glitch-flicker"), 50)); }, 200 + Math.random() * 300));
      intRef.current.push(setInterval(() => { root.classList.add("glitch-shake"); playStatic(); toutRef.current.push(setTimeout(() => root.classList.remove("glitch-shake"), 150)); }, 150 + Math.random() * 200));
      intRef.current.push(setInterval(() => { root.classList.add("glitch-invert"); toutRef.current.push(setTimeout(() => root.classList.remove("glitch-invert"), 80)); }, 300 + Math.random() * 400));
      intRef.current.push(setInterval(() => { for (let i = 0; i < 3; i++) { const o = document.createElement("div"); o.className = "glitch-shutter"; root.appendChild(o); toutRef.current.push(setTimeout(() => o.remove(), 50 + Math.random() * 100)); } playStatic(); }, 200 + Math.random() * 300));
      intRef.current.push(setInterval(() => scrambleNode(document.body), 300));

      const rapidJumpscare = () => {
        const t = setTimeout(() => {
          if (!root.classList.contains("glitch-overdrive")) return;
          const b = document.createElement("div"); b.className = "glitch-blackout"; root.appendChild(b); playStatic();
          toutRef.current.push(setTimeout(() => { b.remove(); playStatic(); }, 200 + Math.random() * 300));
          rapidJumpscare();
        }, 500 + Math.random() * 1000);
        toutRef.current.push(t);
      };
      rapidJumpscare();
    }, 10000);
    toutRef.current.push(intensifyTimer);

    const crashTimer = setTimeout(() => {
      stopAll();
      root.classList.remove("glitch-active", "glitch-flicker", "glitch-shake", "glitch-invert", "glitch-overdrive");
      document.querySelectorAll(".glitch-shutter, .glitch-blackout, .glitch-rgb").forEach(e => e.remove());
      restoreNode(document.body);
      setActive(false);
    }, 20000);
    toutRef.current.push(crashTimer);
  }, [playStatic, stopAll]);

  const deactivate = useCallback(() => {
    stopAll();
    document.body.classList.remove("glitch-active", "glitch-flicker", "glitch-shake", "glitch-invert", "glitch-overdrive");
    document.querySelectorAll(".glitch-shutter, .glitch-blackout, .glitch-rgb").forEach(e => e.remove());
    restoreNode(document.body);
  }, [stopAll]);

  const reinitialize = useCallback(() => {
    setCrashed(false);
    setActive(false);
    restoreNode(document.body);
  }, []);

  useEffect(() => () => { stopAll(); if (audioRef.current) { audioRef.current.close().catch(() => {}); audioRef.current = null; } document.body.classList.remove("glitch-active","glitch-flicker","glitch-shake","glitch-invert","glitch-overdrive"); document.querySelectorAll(".glitch-shutter,.glitch-blackout,.glitch-rgb").forEach(e => e.remove()); }, [stopAll]);

  const toggle = useCallback(() => { setActive(p => { if (p) deactivate(); else activate(); return !p; }); }, [activate, deactivate]);

  const ctxValue = useMemo(() => ({ active, toggle }), [active, toggle]);

  if (crashed) {
    return (
      <>
        {children}
        <div style={crashStyles.overlay}>
          <div style={crashStyles.scanlines} />
          <div style={crashStyles.content}>
            <div style={crashStyles.errorCode}>0x{crashId}</div>
            <h1 style={crashStyles.title}>SYSTEM CRASHED</h1>
            <div style={crashStyles.divider}>{"═".repeat(30)}</div>
            <div style={crashStyles.dump}>
              <div style={crashStyles.dumpLine}><span style={{ color: "#00d4ff" }}>EXCEPTION:</span> RuntimeOverload</div>
              <div style={crashStyles.dumpLine}><span style={{ color: "#00d4ff" }}>MESSAGE:</span> Glitch broke the system — system collapse</div>
              <div style={crashStyles.dumpLine}><span style={{ color: "#00d4ff" }}>ACTION:</span> Soft reinitialize required</div>
            </div>
            <div style={crashStyles.divider}>{"═".repeat(30)}</div>
            <button onClick={reinitialize} style={crashStyles.reinitBtn}>REINITIALIZE</button>
            <p style={crashStyles.hint}>Soft reset — no data lost, no full reload</p>
          </div>
        </div>
      </>
    );
  }

  return <Ctx.Provider value={ctxValue}>{children}</Ctx.Provider>;
}

const crashStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 999999,
    background: "#050508",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Courier New', monospace",
    animation: "crash-flicker 0.15s infinite",
  },
  scanlines: {
    position: "absolute",
    inset: 0,
    background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.015) 2px, rgba(0,212,255,0.015) 4px)",
    pointerEvents: "none",
  },
  content: {
    position: "relative",
    zIndex: 1,
    maxWidth: 560,
    width: "100%",
    padding: "40px 24px",
    textAlign: "center",
    color: "#e0e0e0",
  },
  errorCode: {
    fontSize: 14,
    marginBottom: 16,
    letterSpacing: 2,
    color: "rgba(0,212,255,0.5)",
  },
  title: {
    fontSize: 36,
    fontWeight: 700,
    color: "#ff0040",
    textShadow: "0 0 10px #ff0040, 0 0 20px #ff0040, 0 0 40px #ff0040",
    margin: "0 0 20px 0",
    textTransform: "uppercase",
    letterSpacing: 4,
  },
  divider: {
    color: "rgba(0,212,255,0.3)",
    fontSize: 12,
    margin: "16px 0",
    letterSpacing: 6,
  },
  dump: {
    textAlign: "left",
    background: "rgba(0,212,255,0.03)",
    border: "1px solid rgba(0,212,255,0.12)",
    borderRadius: 4,
    padding: 16,
    margin: "16px 0",
    fontSize: 13,
    lineHeight: 1.6,
  },
  dumpLine: {
    marginBottom: 4,
    color: "#e0e0e0",
  },
  reinitBtn: {
    padding: "14px 40px",
    fontSize: 16,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 4,
    border: "2px solid #00d4ff",
    background: "transparent",
    color: "#00d4ff",
    cursor: "pointer",
    boxShadow: "0 0 10px #00d4ff, 0 0 30px rgba(0,212,255,0.3)",
    transition: "all 0.3s ease",
    borderRadius: 4,
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: "rgba(0,212,255,0.4)",
    letterSpacing: 1,
  },
};
