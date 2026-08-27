"use client";

import { useState, useEffect, useRef, useCallback } from "react";

function getApproxStats() {
  let ramPct = 30;
  let ramUsed = 0;
  let ramTotal = 0;
  try {
    const perf = performance as unknown as Record<string, unknown>;
    const mem = perf.memory as { usedJSHeapSize?: number; totalJSHeapSize?: number } | undefined;
    if (mem && mem.totalJSHeapSize) {
      ramUsed = mem.usedJSHeapSize!;
      ramTotal = mem.totalJSHeapSize!;
      ramPct = Math.round((ramUsed / ramTotal) * 100);
    }
  } catch {}

  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
  const start = performance.now();
  while (performance.now() - start < 3) {}
  const elapsed = performance.now() - start;
  const cpuPct = Math.min(100, Math.round((elapsed / 3) * cores * 12 + Math.random() * 8));

  const gpuPct = Math.min(100, Math.round(cpuPct * 0.6 + Math.random() * 15 + 5));

  return { cpu: cpuPct, ram: ramPct, gpu: gpuPct, ramUsed, ramTotal };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

interface SystemMonitorProps {
  visible?: boolean;
  onClose?: () => void;
  asApp?: boolean;
}

export default function SystemMonitor({ visible = true, onClose, asApp = false }: SystemMonitorProps) {
  const [stats, setStats] = useState({ cpu: 0, ram: 0, gpu: 0, ramUsed: 0, ramTotal: 0 });
  const [collapsed, setCollapsed] = useState(false);
  const [transparency, setTransparency] = useState(1);
  const [uptime, setUptime] = useState(0);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ ox: number; oy: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setStats(getApproxStats());
      setUptime(Date.now() - startTime.current);
    }, 2000);
    setStats(getApproxStats());
    return () => clearInterval(id);
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (asApp) return;
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;
      dragRef.current = { ox: e.clientX - rect.left, oy: e.clientY - rect.top };
      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        setDragPos({
          x: ev.clientX - dragRef.current.ox,
          y: Math.max(40, ev.clientY - dragRef.current.oy),
        });
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [asApp]
  );

  const combined = Math.round(stats.cpu * 0.5 + stats.ram * 0.3 + stats.gpu * 0.2);
  const isFire = combined > 50;
  const isHighLoad = combined > 80;
  const opacityLevels = [1, 0.7, 0.4];
  const [transIdx, setTransIdx] = useState(0);

  const cycleTransparency = useCallback(() => {
    setTransIdx((p) => {
      const next = (p + 1) % opacityLevels.length;
      setTransparency(opacityLevels[next]);
      return next;
    });
  }, []);

  if (!visible) return null;

  const panelStyle: React.CSSProperties = asApp
    ? { width: "100%", height: "100%", borderRadius: 0, border: "none", boxShadow: "none", position: "relative", top: 0, right: 0, opacity: 1 }
    : {
        position: "fixed",
        top: dragPos?.y ?? 48,
        right: dragPos ? undefined : 16,
        left: dragPos ? dragPos.x : undefined,
        width: 280,
        opacity: transparency,
      };

  const themeClass = isFire ? "fs-monitor-fire" : "fs-monitor-ice";
  const loadClass = isHighLoad ? "fs-monitor-high-load" : "";
  const collapseClass = collapsed ? "fs-monitor-collapsed" : "fs-monitor-expanded";
  const appClass = asApp ? "fs-monitor-as-app" : "";

  return (
    <div
      ref={panelRef}
      className={`fs-monitor ${themeClass} ${loadClass} ${collapseClass} ${appClass}`}
      style={panelStyle}
    >
      <div className="fs-monitor-header" onMouseDown={onMouseDown}>
        <div className="fs-monitor-title">
          <span className="fs-monitor-title-icon">{isFire ? "🔥" : "❄️"}</span>
          <span>System Monitor</span>
        </div>
        <div className="fs-monitor-btns">
          {!asApp && (
            <button className="fs-monitor-btn" title="Toggle transparency" onClick={cycleTransparency}>
              ◎
            </button>
          )}
          <button className="fs-monitor-btn" title={collapsed ? "Expand" : "Collapse"} onClick={() => setCollapsed((p) => !p)}>
            {collapsed ? "□" : "−"}
          </button>
          {!asApp && onClose && (
            <button className="fs-monitor-btn" title="Close" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="fs-monitor-body">
        {/* CPU */}
        <div className="fs-monitor-stat">
          <div className="fs-monitor-stat-header">
            <span className="fs-monitor-stat-label" style={{ color: "#00e5ff" }}>CPU</span>
            <span className="fs-monitor-stat-value">{stats.cpu}%</span>
          </div>
          <div className="fs-monitor-bar-track">
            <div className="fs-monitor-bar-fill fs-bar-cpu" style={{ width: `${stats.cpu}%` }} />
          </div>
        </div>

        {/* RAM */}
        <div className="fs-monitor-stat">
          <div className="fs-monitor-stat-header">
            <span className="fs-monitor-stat-label" style={{ color: "#00e676" }}>RAM</span>
            <span className="fs-monitor-stat-value">
              {stats.ram}%{stats.ramTotal > 0 ? ` (${formatBytes(stats.ramUsed)} / ${formatBytes(stats.ramTotal)})` : ""}
            </span>
          </div>
          <div className="fs-monitor-bar-track">
            <div className="fs-monitor-bar-fill fs-bar-ram" style={{ width: `${stats.ram}%` }} />
          </div>
        </div>

        {/* GPU */}
        <div className="fs-monitor-stat">
          <div className="fs-monitor-stat-header">
            <span className="fs-monitor-stat-label" style={{ color: "#d500f9" }}>GPU</span>
            <span className="fs-monitor-stat-value">{stats.gpu}%</span>
          </div>
          <div className="fs-monitor-bar-track">
            <div className="fs-monitor-bar-fill fs-bar-gpu" style={{ width: `${stats.gpu}%` }} />
          </div>
        </div>

        {/* Readout */}
        <div className="fs-monitor-readout">
          CPU {stats.cpu}% &middot; RAM {stats.ram}% &middot; GPU {stats.gpu}%
        </div>

        {/* Uptime */}
        <div className="fs-monitor-uptime">Uptime {formatUptime(uptime)}</div>
      </div>
    </div>
  );
}
