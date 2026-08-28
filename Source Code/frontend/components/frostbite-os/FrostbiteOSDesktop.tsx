"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { APP_COMPONENTS } from "./DesktopApps";
import { ChaosProvider, useChaos, CHAOS_PRESETS } from "./ChaosEffects";
import SystemMonitor from "./SystemMonitor";
import "./frostbite-os.css";
import "./frostbite-chaos.css";

interface WinState {
  id: string;
  title: string;
  icon: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  maximized: boolean;
  prevRect: { x: number; y: number; w: number; h: number } | null;
}

const APPS = [
  { id: "word", name: "Word", icon: "📄", color: "#2b579a", dock: true },
  { id: "excel", name: "Excel", icon: "📊", color: "#217346", dock: true },
  { id: "ppt", name: "PowerPoint", icon: "📽️", color: "#b7472a", dock: false },
  { id: "notepad", name: "Notepad", icon: "📝", color: "#3a506b", dock: true },
  { id: "calculator", name: "Calculator", icon: "🧮", color: "#4a6fa5", dock: true },
  { id: "paint", name: "Paint", icon: "🎨", color: "#6b4c8a", dock: false },
  { id: "clock", name: "Clock", icon: "🕐", color: "#2d5a7b", dock: false },
  { id: "tasks", name: "Tasks", icon: "✅", color: "#3d7a5f", dock: false },
  { id: "media", name: "Media Player", icon: "🎵", color: "#8b5cf6", dock: true },
  { id: "browser", name: "Browser", icon: "🌐", color: "#1a73e8", dock: true },
  { id: "sysmon", name: "System Monitor", icon: "🖥️", color: "#00e5ff", dock: false },
  { id: "frostcraft", name: "FrostCraft", icon: "⛏️", color: "#3d7a5f", dock: false },
];

let winCounter = 0;

export default function FrostbiteOSDesktop() {
  return (
    <ChaosProvider>
      <FrostbiteOSDesktopInner />
    </ChaosProvider>
  );
}

function FrostbiteOSDesktopInner() {
  const { chaosEnabled, activePreset, setActivePreset, toggleChaos, triggerGlitch } = useChaos();
  const [windows, setWindows] = useState<WinState[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [topbarTime, setTopbarTime] = useState("");
  const [ctxMenu, setCtxMenu] = useState({ show: false, x: 0, y: 0 });
  const [notif, setNotif] = useState({ show: false, text: "" });
  const [monitorVisible, setMonitorVisible] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const snowRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ id: string; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTopbarTime(
        now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) +
          " \u00B7 " +
          now.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = snowRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const ps = Array.from({ length: 65 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.2 + 0.4,
      s: Math.random() * 0.5 + 0.12,
      w: Math.random() * 0.2 - 0.1,
      o: Math.random() * 0.4 + 0.06,
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of ps) {
        p.y += p.s;
        p.x += p.w + Math.sin(p.y * 0.008) * 0.12;
        if (p.y > canvas.height + 8) { p.y = -8; p.x = Math.random() * canvas.width; }
        if (p.x > canvas.width + 8) p.x = -8;
        if (p.x < -8) p.x = canvas.width + 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,230,255,${p.o})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  const showNotif = useCallback((text: string) => {
    setNotif({ show: true, text });
    setTimeout(() => setNotif({ show: false, text: "" }), 3000);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => showNotif("Welcome to Frostbite OS! Double-click icons to launch apps."), 600);
    return () => clearTimeout(t);
  }, [showNotif]);

  const openApp = useCallback((appId: string) => {
    const app = APPS.find((a) => a.id === appId);
    if (!app) return;
    const isFullscreen = appId === "frostcraft";
    setWindows((prev) => {
      const ex = prev.find((w) => w.id === appId);
      if (ex) return prev.map((w) => (w.id === appId ? { ...w, minimized: false } : w));
      if (isFullscreen) {
        return [...prev, {
          id: appId, title: app.name, icon: app.icon,
          x: 0, y: 36,
          w: window.innerWidth, h: window.innerHeight - 36,
          minimized: false, maximized: true, prevRect: null,
        }];
      }
      const off = (winCounter++ % 8) * 28;
      const ww = 860, hh = 560;
      return [...prev, {
        id: appId, title: app.name, icon: app.icon,
        x: Math.max(40, (window.innerWidth - ww) / 2 + off),
        y: Math.max(52, (window.innerHeight - hh) / 2 - 20 + off),
        w: ww, h: hh, minimized: false, maximized: false, prevRect: null,
      }];
    });
    setFocusedId(appId);
    setTimeout(() => {
      const winEl = document.querySelector(`.fs-win`) as HTMLElement | null;
      if (winEl) triggerGlitch(winEl);
    }, 50);
  }, [triggerGlitch]);

  const closeWin = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
    setFocusedId((f) => (f === id ? null : f));
  }, []);

  const minimizeWin = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
    setFocusedId((f) => (f === id ? null : f));
  }, []);

  const maximizeWin = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => {
      if (w.id !== id) return w;
      const isFullscreen = id === "frostcraft";
      const fullH = window.innerHeight - 36;
      const dockH = window.innerHeight - 36 - 84;
      if (w.maximized) return { ...w, maximized: false, x: w.prevRect?.x ?? 100, y: w.prevRect?.y ?? 60, w: w.prevRect?.w ?? 860, h: w.prevRect?.h ?? 560, prevRect: null };
      return { ...w, maximized: true, prevRect: { x: w.x, y: w.y, w: w.w, h: w.h }, x: 0, y: 36, w: window.innerWidth, h: isFullscreen ? fullH : dockH };
    }));
  }, []);

  const focusWin = useCallback((id: string) => {
    setFocusedId(id);
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: false } : w)));
  }, []);

  const onDragStart = useCallback((id: string, cx: number, cy: number) => {
    const win = windows.find((w) => w.id === id);
    if (!win || win.maximized) return;
    focusWin(id);
    dragRef.current = { id, ox: cx - win.x, oy: cy - win.y };
  }, [windows, focusWin]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { id, ox, oy } = dragRef.current;
      setWindows((prev) => prev.map((w) => w.id === id ? { ...w, x: e.clientX - ox, y: Math.max(36, e.clientY - oy) } : w));
    };
    const up = () => { dragRef.current = null; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  useEffect(() => {
    const onCtx = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(".fs-win, .fs-dock, .fs-topbar")) return;
      e.preventDefault();
      setCtxMenu({ show: true, x: e.clientX, y: e.clientY });
    };
    const dismiss = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest(".fs-ctx")) return;
      setCtxMenu({ show: false, x: 0, y: 0 });
    };
    window.addEventListener("contextmenu", onCtx);
    window.addEventListener("mousedown", dismiss);
    return () => { window.removeEventListener("contextmenu", onCtx); window.removeEventListener("mousedown", dismiss); };
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && focusedId) closeWin(focusedId); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [focusedId, closeWin]);

  const dockApps = useMemo(() => APPS.filter((a) => a.dock), []);
  const runningIds = useMemo(() => new Set(windows.map((w) => w.id)), [windows]);
  const frostcraftFullscreen = useMemo(() => windows.some((w) => w.id === "frostcraft" && w.maximized), [windows]);

  return (
    <div className="fs-desktop">
      <canvas ref={snowRef} className="fs-snow" />

      {/* Top Bar */}
      <div className="fs-topbar">
        <div className="fs-topbar-left">
          <div className="fs-brand">
            <div className="fs-brand-logo">F</div>
            <span className="fs-brand-text">FROSTBITE OS</span>
          </div>
        </div>
        <div className="fs-topbar-center">
          <span className="fs-elite-label">Elite Tech Shop</span>
        </div>
        <div className="fs-topbar-right">
          <span className="fs-clock">{topbarTime}</span>
          <Link href="/" className="fs-power-btn" title="Power Off / Home">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="2" x2="12" y2="12" />
              <path d="M18.36 6.64A9 9 0 1 1 5.64 6.64" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Desktop Icons */}
      <div className="fs-icons">
        {APPS.map((app) => (
          <div
            key={app.id}
            className="fs-icon"
            role="button"
            tabIndex={0}
            onClick={() => openApp(app.id)}
            onKeyDown={(e) => { if (e.key === "Enter") openApp(app.id); }}
          >
            <div className="fs-icon-img" style={{ background: `linear-gradient(135deg, ${app.color}cc, ${app.color}88)` }}>
              <span>{app.icon}</span>
            </div>
            <span className="fs-icon-label">{app.name}</span>
          </div>
        ))}
      </div>

      {/* Windows */}
      {windows.map((win) => {
        const AppComponent = APP_COMPONENTS[win.id];
        return (
          <div
            key={win.id}
            className={`fs-win ${focusedId === win.id ? "fs-win-focus" : ""} ${win.maximized ? (win.id === "frostcraft" ? "fs-win-max-full" : "fs-win-max") : ""}`}
            style={{ left: win.x, top: win.y, width: win.w, height: win.h, display: win.minimized ? "none" : "flex", zIndex: focusedId === win.id ? 200 : 100 }}
            onMouseDown={() => focusWin(win.id)}
          >
            <div className="fs-win-header" onMouseDown={(e) => onDragStart(win.id, e.clientX, e.clientY)} onDoubleClick={() => maximizeWin(win.id)}>
              <div className="fs-win-title"><span>{win.icon}</span>{win.title}</div>
              <div className="fs-win-btns">
                <button className="fs-btn-min" title="Minimize" onClick={() => minimizeWin(win.id)} />
                <button className="fs-btn-max" title="Maximize" onClick={() => maximizeWin(win.id)} />
                <button className="fs-btn-close" title="Close" onClick={() => closeWin(win.id)} />
              </div>
            </div>
            <div className="fs-win-body">
              {AppComponent && <AppComponent />}
            </div>
          </div>
        );
      })}

      {/* Dock */}
      {!frostcraftFullscreen && <div className="fs-dock">
        {dockApps.map((app) => (
          <button
            key={app.id}
            className={`fs-dock-item ${runningIds.has(app.id) ? "fs-dock-running" : ""}`}
            title={app.name}
            onClick={() => {
              const ex = windows.find((w) => w.id === app.id);
              if (ex) {
                if (ex.minimized) focusWin(app.id);
                else if (focusedId === app.id) minimizeWin(app.id);
                else focusWin(app.id);
              } else openApp(app.id);
            }}
          >
            <span>{app.icon}</span>
            <div className="fs-dock-dot" />
          </button>
        ))}
        <div className="fs-dock-sep" />
        <button
          className={`fs-dock-item ${monitorVisible ? "fs-dock-running" : ""}`}
          title="System Monitor"
          onClick={() => setMonitorVisible((p) => !p)}
        >
          <span>🖥️</span>
          <div className="fs-dock-dot" />
        </button>
        <Link href="/" className="fs-dock-item fs-dock-power" title="Power Off">
          <span>⏻</span>
        </Link>
      </div>
      }

      {/* Context Menu */}
      <div className="fs-ctx" style={{ display: ctxMenu.show ? "block" : "none", left: ctxMenu.x, top: ctxMenu.y }}>
        <div className="fs-ctx-item" onClick={() => { setCtxMenu({ show: false, x: 0, y: 0 }); showNotif("Desktop refreshed"); }}>Refresh Desktop</div>
        <div className="fs-ctx-sep" />
        <div className="fs-ctx-item" onClick={() => { setCtxMenu({ show: false, x: 0, y: 0 }); toggleChaos(); }}>
          Toggle Chaos Mode
          <span className={`fs-ctx-chaos-indicator ${chaosEnabled ? "fs-ctx-chaos-on" : "fs-ctx-chaos-off"}`} />
        </div>
        <div
          className="fs-ctx-item"
          onClick={() => setShowPresets((p) => !p)}
          style={{ justifyContent: "space-between" }}
        >
          Chaos Presets
          <span style={{ fontSize: 10, color: "rgba(160,200,240,0.4)" }}>{showPresets ? "▲" : "▼"}</span>
        </div>
        {showPresets && (
          <div className="fs-ctx-preset-panel">
            <div className="fs-ctx-preset-label">Select Preset</div>
            {CHAOS_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className={`fs-ctx-preset-item ${activePreset.id === preset.id ? "fs-ctx-preset-item-active" : ""}`}
                onClick={() => {
                  setActivePreset(preset);
                  setCtxMenu({ show: false, x: 0, y: 0 });
                  setShowPresets(false);
                  showNotif(`Chaos preset: ${preset.name}`);
                }}
              >
                <span className="fs-ctx-preset-icon">{preset.icon}</span>
                <span className="fs-ctx-preset-name">{preset.name}</span>
                <span className="fs-ctx-preset-check">✓</span>
              </div>
            ))}
          </div>
        )}
        <div className="fs-ctx-item" onClick={() => { setCtxMenu({ show: false, x: 0, y: 0 }); setMonitorVisible((p) => !p); }}>
          Toggle System Monitor
          <span className={`fs-ctx-chaos-indicator ${monitorVisible ? "fs-ctx-chaos-on" : "fs-ctx-chaos-off"}`} />
        </div>
        <div className="fs-ctx-sep" />
        <div className="fs-ctx-item" onClick={() => { setCtxMenu({ show: false, x: 0, y: 0 }); showNotif("Frostbite OS 5.0 Canary 1 \u2014 Elite Tech Shop"); }}>About Frostbite OS</div>
      </div>

      {/* System Monitor Overlay */}
      <SystemMonitor visible={monitorVisible} onClose={() => setMonitorVisible(false)} />

      {/* Notification */}
      <div className={`fs-notif ${notif.show ? "fs-notif-show" : ""}`}>&#10052; {notif.text}</div>
    </div>
  );
}
