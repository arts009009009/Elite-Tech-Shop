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

export interface MonitorConfig {
  theme: "auto" | "fire" | "ice" | "neon" | "matrix" | "retro";
  barStyle: "gradient" | "solid" | "glow";
  cpuColor: string;
  ramColor: string;
  gpuColor: string;
  showCpu: boolean;
  showRam: boolean;
  showGpu: boolean;
  showReadout: boolean;
  showUptime: boolean;
  compactMode: boolean;
  transparency: number;
}

const DEFAULT_CONFIG: MonitorConfig = {
  theme: "auto",
  barStyle: "gradient",
  cpuColor: "#00e5ff",
  ramColor: "#00e676",
  gpuColor: "#d500f9",
  showCpu: true,
  showRam: true,
  showGpu: true,
  showReadout: true,
  showUptime: true,
  compactMode: false,
  transparency: 1,
};

const PRESET_THEMES: { id: MonitorConfig["theme"]; name: string }[] = [
  { id: "auto", name: "Auto" },
  { id: "fire", name: "Fire" },
  { id: "ice", name: "Ice" },
  { id: "neon", name: "Neon" },
  { id: "matrix", name: "Matrix" },
  { id: "retro", name: "Retro" },
];

const COLOR_PRESETS = [
  { cpu: "#00e5ff", ram: "#00e676", gpu: "#d500f9", name: "Default" },
  { cpu: "#ff6d00", ram: "#ff9100", gpu: "#ff1744", name: "Fire" },
  { cpu: "#40c4ff", ram: "#80d8ff", gpu: "#b388ff", name: "Ice" },
  { cpu: "#ff00ff", ram: "#00ffff", gpu: "#ffff00", name: "Neon" },
  { cpu: "#00ff41", ram: "#00e676", gpu: "#69f0ae", name: "Matrix" },
  { cpu: "#ff9800", ram: "#ffb74d", gpu: "#ffe082", name: "Retro" },
];

interface SystemMonitorProps {
  visible?: boolean;
  onClose?: () => void;
  asApp?: boolean;
}

export default function SystemMonitor({ visible = true, onClose, asApp = false }: SystemMonitorProps) {
  const [stats, setStats] = useState({ cpu: 0, ram: 0, gpu: 0, ramUsed: 0, ramTotal: 0 });
  const [collapsed, setCollapsed] = useState(false);
  const [uptime, setUptime] = useState(0);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<MonitorConfig>(() => {
    try {
      const saved = localStorage.getItem("fs-monitor-config");
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_CONFIG;
  });
  const dragRef = useRef<{ ox: number; oy: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    try {
      localStorage.setItem("fs-monitor-config", JSON.stringify(config));
    } catch {}
  }, [config]);

  useEffect(() => {
    const id = setInterval(() => {
      setStats(getApproxStats());
      setUptime(Date.now() - startTime.current);
    }, 2000);
    setStats(getApproxStats());
    return () => clearInterval(id);
  }, []);

  const updateConfig = useCallback((patch: Partial<MonitorConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
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
  const isFireAuto = combined > 50;
  const isHighLoad = combined > 80;

  let resolvedTheme = config.theme;
  if (config.theme === "auto") {
    resolvedTheme = isFireAuto ? "fire" : "ice";
  }

  const opacityLevels = [1, 0.7, 0.4];
  const cycleTransparency = useCallback(() => {
    setConfig((prev) => {
      const curIdx = opacityLevels.indexOf(prev.transparency);
      const nextIdx = (curIdx + 1) % opacityLevels.length;
      return { ...prev, transparency: opacityLevels[nextIdx] };
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
        opacity: config.transparency,
      };

  const themeClass = `fs-monitor-${resolvedTheme}`;
  const loadClass = isHighLoad ? "fs-monitor-high-load" : "";
  const collapseClass = collapsed ? "fs-monitor-collapsed" : "fs-monitor-expanded";
  const appClass = asApp ? "fs-monitor-as-app" : "";
  const compactClass = config.compactMode ? "fs-monitor-compact" : "";
  const barStyleClass = config.barStyle === "solid" ? "fs-monitor-bar-solid" : config.barStyle === "glow" ? "fs-monitor-bar-glow" : "";

  return (
    <div
      ref={panelRef}
      className={`fs-monitor ${themeClass} ${loadClass} ${collapseClass} ${appClass} ${compactClass} ${barStyleClass}`}
      style={panelStyle}
    >
      <div className="fs-monitor-header" onMouseDown={onMouseDown}>
        <div className="fs-monitor-title">
          <span className="fs-monitor-title-icon">{resolvedTheme === "fire" ? "🔥" : resolvedTheme === "ice" ? "❄️" : resolvedTheme === "neon" ? "💜" : resolvedTheme === "matrix" ? "🟢" : resolvedTheme === "retro" ? "🟠" : isFireAuto ? "🔥" : "❄️"}</span>
          <span>System Monitor</span>
        </div>
        <div className="fs-monitor-btns">
          {!asApp && (
            <>
              <button className="fs-monitor-btn" title="Settings" onClick={() => setShowSettings((p) => !p)}>
                ⚙
              </button>
              <button className="fs-monitor-btn" title="Toggle transparency" onClick={cycleTransparency}>
                ◎
              </button>
            </>
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

      {/* Settings Panel */}
      {showSettings && (
        <div className="fs-monitor-settings">
          <div className="fs-monitor-settings-title">Monitor Settings</div>

          {/* Theme */}
          <div className="fs-monitor-settings-group">
            <div className="fs-monitor-settings-label">Theme</div>
            <div className="fs-monitor-settings-row">
              {PRESET_THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`fs-monitor-theme-btn ${config.theme === t.id ? "fs-monitor-theme-btn-active" : ""}`}
                  onClick={() => updateConfig({ theme: t.id })}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Style */}
          <div className="fs-monitor-settings-group">
            <div className="fs-monitor-settings-label">Bar Style</div>
            <div className="fs-monitor-settings-row">
              {(["gradient", "solid", "glow"] as const).map((s) => (
                <button
                  key={s}
                  className={`fs-monitor-theme-btn ${config.barStyle === s ? "fs-monitor-theme-btn-active" : ""}`}
                  onClick={() => updateConfig({ barStyle: s })}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Color Presets */}
          <div className="fs-monitor-settings-group">
            <div className="fs-monitor-settings-label">Color Preset</div>
            <div className="fs-monitor-settings-row">
              {COLOR_PRESETS.map((cp) => (
                <button
                  key={cp.name}
                  className={`fs-monitor-theme-btn ${config.cpuColor === cp.cpu && config.ramColor === cp.ram && config.gpuColor === cp.gpu ? "fs-monitor-theme-btn-active" : ""}`}
                  onClick={() => updateConfig({ cpuColor: cp.cpu, ramColor: cp.ram, gpuColor: cp.gpu })}
                >
                  {cp.name}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="fs-monitor-settings-group">
            <div className="fs-monitor-settings-label">Custom Colors</div>
            <div className="fs-monitor-settings-row" style={{ alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 10, color: "rgba(160,200,240,0.6)", display: "flex", alignItems: "center", gap: 4 }}>
                CPU
                <input type="color" value={config.cpuColor} onChange={(e) => updateConfig({ cpuColor: e.target.value })} style={{ width: 20, height: 20, border: "none", borderRadius: "50%", cursor: "pointer", background: "transparent", padding: 0 }} />
              </label>
              <label style={{ fontSize: 10, color: "rgba(160,200,240,0.6)", display: "flex", alignItems: "center", gap: 4 }}>
                RAM
                <input type="color" value={config.ramColor} onChange={(e) => updateConfig({ ramColor: e.target.value })} style={{ width: 20, height: 20, border: "none", borderRadius: "50%", cursor: "pointer", background: "transparent", padding: 0 }} />
              </label>
              <label style={{ fontSize: 10, color: "rgba(160,200,240,0.6)", display: "flex", alignItems: "center", gap: 4 }}>
                GPU
                <input type="color" value={config.gpuColor} onChange={(e) => updateConfig({ gpuColor: e.target.value })} style={{ width: 20, height: 20, border: "none", borderRadius: "50%", cursor: "pointer", background: "transparent", padding: 0 }} />
              </label>
            </div>
          </div>

          {/* Toggles */}
          <div className="fs-monitor-settings-group">
            <div className="fs-monitor-toggle-row">
              <span className="fs-monitor-toggle-label">Show CPU</span>
              <button
                className={`fs-monitor-toggle ${config.showCpu ? "fs-monitor-toggle-on" : ""}`}
                onClick={() => updateConfig({ showCpu: !config.showCpu })}
              />
            </div>
            <div className="fs-monitor-toggle-row">
              <span className="fs-monitor-toggle-label">Show RAM</span>
              <button
                className={`fs-monitor-toggle ${config.showRam ? "fs-monitor-toggle-on" : ""}`}
                onClick={() => updateConfig({ showRam: !config.showRam })}
              />
            </div>
            <div className="fs-monitor-toggle-row">
              <span className="fs-monitor-toggle-label">Show GPU</span>
              <button
                className={`fs-monitor-toggle ${config.showGpu ? "fs-monitor-toggle-on" : ""}`}
                onClick={() => updateConfig({ showGpu: !config.showGpu })}
              />
            </div>
            <div className="fs-monitor-toggle-row">
              <span className="fs-monitor-toggle-label">Show Readout</span>
              <button
                className={`fs-monitor-toggle ${config.showReadout ? "fs-monitor-toggle-on" : ""}`}
                onClick={() => updateConfig({ showReadout: !config.showReadout })}
              />
            </div>
            <div className="fs-monitor-toggle-row">
              <span className="fs-monitor-toggle-label">Show Uptime</span>
              <button
                className={`fs-monitor-toggle ${config.showUptime ? "fs-monitor-toggle-on" : ""}`}
                onClick={() => updateConfig({ showUptime: !config.showUptime })}
              />
            </div>
            <div className="fs-monitor-toggle-row">
              <span className="fs-monitor-toggle-label">Compact Mode</span>
              <button
                className={`fs-monitor-toggle ${config.compactMode ? "fs-monitor-toggle-on" : ""}`}
                onClick={() => updateConfig({ compactMode: !config.compactMode })}
              />
            </div>
          </div>

          {/* Reset */}
          <button
            className="fs-monitor-theme-btn"
            style={{ width: "100%", textAlign: "center" }}
            onClick={() => setConfig(DEFAULT_CONFIG)}
          >
            Reset to Defaults
          </button>
        </div>
      )}

      <div className="fs-monitor-body">
        {/* CPU */}
        {config.showCpu && (
          <div className="fs-monitor-stat">
            <div className="fs-monitor-stat-header">
              <span className="fs-monitor-stat-label" style={{ color: config.cpuColor }}>CPU</span>
              <span className="fs-monitor-stat-value">{stats.cpu}%</span>
            </div>
            <div className="fs-monitor-bar-track">
              <div
                className="fs-monitor-bar-fill fs-bar-cpu"
                style={{
                  width: `${stats.cpu}%`,
                  background: config.cpuColor !== "#00e5ff" ? `linear-gradient(90deg, ${config.cpuColor}, ${config.cpuColor}cc)` : undefined,
                  boxShadow: config.cpuColor !== "#00e5ff" ? `0 0 12px ${config.cpuColor}4d` : undefined,
                }}
              />
            </div>
          </div>
        )}

        {/* RAM */}
        {config.showRam && (
          <div className="fs-monitor-stat">
            <div className="fs-monitor-stat-header">
              <span className="fs-monitor-stat-label" style={{ color: config.ramColor }}>RAM</span>
              <span className="fs-monitor-stat-value">
                {stats.ram}%{stats.ramTotal > 0 ? ` (${formatBytes(stats.ramUsed)} / ${formatBytes(stats.ramTotal)})` : ""}
              </span>
            </div>
            <div className="fs-monitor-bar-track">
              <div
                className="fs-monitor-bar-fill fs-bar-ram"
                style={{
                  width: `${stats.ram}%`,
                  background: config.ramColor !== "#00e676" ? `linear-gradient(90deg, ${config.ramColor}, ${config.ramColor}cc)` : undefined,
                  boxShadow: config.ramColor !== "#00e676" ? `0 0 12px ${config.ramColor}4d` : undefined,
                }}
              />
            </div>
          </div>
        )}

        {/* GPU */}
        {config.showGpu && (
          <div className="fs-monitor-stat">
            <div className="fs-monitor-stat-header">
              <span className="fs-monitor-stat-label" style={{ color: config.gpuColor }}>GPU</span>
              <span className="fs-monitor-stat-value">{stats.gpu}%</span>
            </div>
            <div className="fs-monitor-bar-track">
              <div
                className="fs-monitor-bar-fill fs-bar-gpu"
                style={{
                  width: `${stats.gpu}%`,
                  background: config.gpuColor !== "#d500f9" ? `linear-gradient(90deg, ${config.gpuColor}, ${config.gpuColor}cc)` : undefined,
                  boxShadow: config.gpuColor !== "#d500f9" ? `0 0 12px ${config.gpuColor}4d` : undefined,
                }}
              />
            </div>
          </div>
        )}

        {/* Readout */}
        {config.showReadout && (
          <div className="fs-monitor-readout">
            CPU {stats.cpu}% &middot; RAM {stats.ram}% &middot; GPU {stats.gpu}%
          </div>
        )}

        {/* Uptime */}
        {config.showUptime && (
          <div className="fs-monitor-uptime">Uptime {formatUptime(uptime)}</div>
        )}
      </div>
    </div>
  );
}
