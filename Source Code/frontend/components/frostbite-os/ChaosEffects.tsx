"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from "react";

interface ChaosCtx {
  chaosEnabled: boolean;
  toggleChaos: () => void;
  loadLevel: number;
  cpuLoad: number;
  ramLoad: number;
  gpuLoad: number;
  triggerGlitch: (container: HTMLElement) => void;
}

const Ctx = createContext<ChaosCtx>({
  chaosEnabled: false,
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
  const [loadLevel, setLoadLevel] = useState(0);
  const [cpuLoad, setCpuLoad] = useState(0);
  const [ramLoad, setRamLoad] = useState(0);
  const [gpuLoad, setGpuLoad] = useState(0);
  const desktopRef = useRef<HTMLElement | null>(null);

  const toggleChaos = useCallback(() => {
    setChaosEnabled((p) => !p);
  }, []);

  useEffect(() => {
    const el = document.querySelector(".fs-desktop") as HTMLElement | null;
    desktopRef.current = el;
  }, []);

  useEffect(() => {
    const el = desktopRef.current;
    if (!el) return;
    if (chaosEnabled) {
      el.classList.add("fs-chaos-enabled");
    } else {
      el.classList.remove("fs-chaos-enabled");
      el.style.removeProperty("--chaos-hue");
    }
  }, [chaosEnabled]);

  useEffect(() => {
    if (!chaosEnabled) return;
    const id = setInterval(() => {
      const { cpu, ram, gpu } = getApproxStats();
      setCpuLoad(cpu);
      setRamLoad(ram);
      setGpuLoad(gpu);
      const combined = Math.round(cpu * 0.5 + ram * 0.3 + gpu * 0.2);
      setLoadLevel(combined);

      const hue = Math.round(200 - (combined / 100) * 200);
      if (desktopRef.current) {
        desktopRef.current.style.setProperty("--chaos-hue", String(hue));
      }
    }, 2000);
    return () => clearInterval(id);
  }, [chaosEnabled]);

  const triggerGlitch = useCallback(
    (container: HTMLElement) => {
      if (!chaosEnabled) return;
      const overlay = document.createElement("div");
      overlay.className = "fs-chaos-overlay";
      container.style.position = "relative";
      container.appendChild(overlay);
      setTimeout(() => overlay.remove(), 400);
    },
    [chaosEnabled]
  );

  const ctxValue = useMemo(
    () => ({ chaosEnabled, toggleChaos, loadLevel, cpuLoad, ramLoad, gpuLoad, triggerGlitch }),
    [chaosEnabled, toggleChaos, loadLevel, cpuLoad, ramLoad, gpuLoad, triggerGlitch]
  );

  return <Ctx.Provider value={ctxValue}>{children}</Ctx.Provider>;
}
