"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from "react";

export interface ChaosPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  hueBase: number;
  hueRange: number;
  satBase: number;
  blurIntensity: number;
  glitchFrequency: number;
  jitterStrength: number;
  colorPulseSpeed: number;
  scanlineOpacity: number;
  iconMorphSpeed: number;
  classSuffix: string;
}

export const CHAOS_PRESETS: ChaosPreset[] = [
  {
    id: "off",
    name: "Off",
    icon: "❄️",
    description: "No chaos effects",
    hueBase: 200, hueRange: 0, satBase: 70,
    blurIntensity: 0, glitchFrequency: 0, jitterStrength: 0,
    colorPulseSpeed: 0, scanlineOpacity: 0, iconMorphSpeed: 0,
    classSuffix: "",
  },
  {
    id: "calm",
    name: "Calm",
    icon: "🌊",
    description: "Gentle ripples, soft hue shifts",
    hueBase: 200, hueRange: 40, satBase: 60,
    blurIntensity: 0.3, glitchFrequency: 0.2, jitterStrength: 0.2,
    colorPulseSpeed: 2.4, scanlineOpacity: 0.02, iconMorphSpeed: 0.8,
    classSuffix: "calm",
  },
  {
    id: "storm",
    name: "Storm",
    icon: "⛈️",
    description: "Moderate glitch, fast color cycling",
    hueBase: 180, hueRange: 80, satBase: 80,
    blurIntensity: 0.6, glitchFrequency: 0.5, jitterStrength: 0.5,
    colorPulseSpeed: 1.2, scanlineOpacity: 0.04, iconMorphSpeed: 0.5,
    classSuffix: "storm",
  },
  {
    id: "void",
    name: "Void",
    icon: "🕳️",
    description: "Deep saturation drain, dark pulses",
    hueBase: 260, hueRange: 30, satBase: 30,
    blurIntensity: 0.8, glitchFrequency: 0.3, jitterStrength: 0.3,
    colorPulseSpeed: 3.0, scanlineOpacity: 0.06, iconMorphSpeed: 1.0,
    classSuffix: "void",
  },
  {
    id: "meltdown",
    name: "Meltdown",
    icon: "☢️",
    description: "Extreme heat, fire theme, max jitter",
    hueBase: 0, hueRange: 50, satBase: 90,
    blurIntensity: 0.9, glitchFrequency: 0.8, jitterStrength: 0.9,
    colorPulseSpeed: 0.6, scanlineOpacity: 0.08, iconMorphSpeed: 0.3,
    classSuffix: "meltdown",
  },
  {
    id: "glitch",
    name: "Glitch",
    icon: "⚡",
    description: "Maximum chaos, erratic everything",
    hueBase: 120, hueRange: 180, satBase: 100,
    blurIntensity: 1.0, glitchFrequency: 1.0, jitterStrength: 1.0,
    colorPulseSpeed: 0.4, scanlineOpacity: 0.1, iconMorphSpeed: 0.2,
    classSuffix: "glitch",
  },
];

interface ChaosCtx {
  chaosEnabled: boolean;
  activePreset: ChaosPreset;
  setActivePreset: (preset: ChaosPreset) => void;
  toggleChaos: () => void;
  loadLevel: number;
  cpuLoad: number;
  ramLoad: number;
  gpuLoad: number;
  triggerGlitch: (container: HTMLElement) => void;
}

const Ctx = createContext<ChaosCtx>({
  chaosEnabled: false,
  activePreset: CHAOS_PRESETS[0],
  setActivePreset: () => {},
  toggleChaos: () => {},
  loadLevel: 0,
  cpuLoad: 0,
  ramLoad: 0,
  gpuLoad: 0,
  triggerGlitch: () => {},
});

export const useChaos = () => useContext(Ctx);

function getApproxStats() {
  let ramPct = 30;
  try {
    const perf = performance as unknown as Record<string, unknown>;
    const mem = perf.memory as { usedJSHeapSize?: number; totalJSHeapSize?: number } | undefined;
    if (mem && mem.totalJSHeapSize) {
      ramPct = Math.round((mem.usedJSHeapSize! / mem.totalJSHeapSize!) * 100);
    }
  } catch {}

  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
  const start = performance.now();
  while (performance.now() - start < 3) {}
  const elapsed = performance.now() - start;
  const cpuPct = Math.min(100, Math.round((elapsed / 3) * cores * 12 + Math.random() * 8));

  const gpuPct = Math.min(100, Math.round(cpuPct * 0.6 + Math.random() * 15 + 5));

  return { cpu: cpuPct, ram: ramPct, gpu: gpuPct };
}

export function ChaosProvider({ children }: { children: React.ReactNode }) {
  const [chaosEnabled, setChaosEnabled] = useState(false);
  const [activePreset, setActivePresetState] = useState<ChaosPreset>(CHAOS_PRESETS[0]);
  const [loadLevel, setLoadLevel] = useState(0);
  const [cpuLoad, setCpuLoad] = useState(0);
  const [ramLoad, setRamLoad] = useState(0);
  const [gpuLoad, setGpuLoad] = useState(0);
  const desktopRef = useRef<HTMLElement | null>(null);

  const toggleChaos = useCallback(() => {
    setChaosEnabled((p) => {
      if (!p) {
        setActivePresetState((cur) => (cur.id === "off" ? CHAOS_PRESETS[1] : cur));
      } else {
        setActivePresetState(CHAOS_PRESETS[0]);
      }
      return !p;
    });
  }, []);

  const setActivePreset = useCallback((preset: ChaosPreset) => {
    setActivePresetState(preset);
    if (preset.id === "off") {
      setChaosEnabled(false);
    } else {
      setChaosEnabled(true);
    }
  }, []);

  useEffect(() => {
    const el = document.querySelector(".fs-desktop") as HTMLElement | null;
    desktopRef.current = el;
  }, []);

  useEffect(() => {
    const el = desktopRef.current;
    if (!el) return;

    CHAOS_PRESETS.forEach((p) => {
      if (p.classSuffix) el.classList.remove(`fs-chaos-${p.classSuffix}`);
    });
    el.classList.remove("fs-chaos-enabled");

    if (chaosEnabled && activePreset.id !== "off") {
      el.classList.add("fs-chaos-enabled");
      el.classList.add(`fs-chaos-${activePreset.classSuffix}`);
    } else {
      el.style.removeProperty("--chaos-hue");
      el.style.removeProperty("--chaos-sat");
      el.style.removeProperty("--chaos-blur");
      el.style.removeProperty("--chaos-jitter");
      el.style.removeProperty("--chaos-scanline");
      el.style.removeProperty("--chaos-color-speed");
      el.style.removeProperty("--chaos-icon-speed");
    }
  }, [chaosEnabled, activePreset]);

  useEffect(() => {
    if (!chaosEnabled || activePreset.id === "off") return;

    const id = setInterval(() => {
      const { cpu, ram, gpu } = getApproxStats();
      setCpuLoad(cpu);
      setRamLoad(ram);
      setGpuLoad(gpu);
      const combined = Math.round(cpu * 0.5 + ram * 0.3 + gpu * 0.2);
      setLoadLevel(combined);

      const loadFactor = combined / 100;
      const hue =
        activePreset.hueBase +
        Math.round((activePreset.hueRange * loadFactor * (Math.random() > 0.5 ? 1 : -1)));
      const sat = activePreset.satBase + Math.round(loadFactor * 20);

      if (desktopRef.current) {
        desktopRef.current.style.setProperty("--chaos-hue", String(hue));
        desktopRef.current.style.setProperty("--chaos-sat", `${sat}%`);
        desktopRef.current.style.setProperty("--chaos-blur", String(activePreset.blurIntensity * loadFactor));
        desktopRef.current.style.setProperty("--chaos-jitter", String(activePreset.jitterStrength * loadFactor));
        desktopRef.current.style.setProperty("--chaos-scanline", String(activePreset.scanlineOpacity * loadFactor));
        desktopRef.current.style.setProperty("--chaos-color-speed", String(activePreset.colorPulseSpeed));
        desktopRef.current.style.setProperty("--chaos-icon-speed", String(activePreset.iconMorphSpeed));
      }
    }, 2000);
    return () => clearInterval(id);
  }, [chaosEnabled, activePreset]);

  const triggerGlitch = useCallback(
    (container: HTMLElement) => {
      if (!chaosEnabled || activePreset.id === "off") return;
      const overlay = document.createElement("div");
      overlay.className = "fs-chaos-overlay";
      container.style.position = "relative";
      container.appendChild(overlay);
      setTimeout(() => overlay.remove(), 400);
    },
    [chaosEnabled, activePreset]
  );

  const ctxValue = useMemo(
    () => ({
      chaosEnabled,
      activePreset,
      setActivePreset,
      toggleChaos,
      loadLevel,
      cpuLoad,
      ramLoad,
      gpuLoad,
      triggerGlitch,
    }),
    [chaosEnabled, activePreset, setActivePreset, toggleChaos, loadLevel, cpuLoad, ramLoad, gpuLoad, triggerGlitch]
  );

  return <Ctx.Provider value={ctxValue}>{children}</Ctx.Provider>;
}
