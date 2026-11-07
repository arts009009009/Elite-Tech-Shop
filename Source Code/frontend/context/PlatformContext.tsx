"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { zigPlatform } from "@/lib/zig-platform";

type FeatureFlag = { key: string; enabled: boolean; rollout: number };
type ChaosRule = { service: string; fault_type: string; enabled: boolean; rate: number; latency_ms: number };
type CircuitBreaker = { service: string; state: string; failures: number; threshold: number };

interface PlatformContextValue {
  flags: FeatureFlag[];
  setFlag: (key: string, enabled: boolean) => void;
  checkFlag: (key: string, userId?: string) => Promise<boolean>;
  chaosRules: ChaosRule[];
  toggleChaos: (service: string, faultType: string, enabled: boolean) => void;
  circuitBreakers: CircuitBreaker[];
  rateLimited: (key: string) => Promise<boolean>;
  loading: boolean;
}

const PlatformContext = createContext<PlatformContextValue | undefined>(undefined);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [chaosRules, setChaosRules] = useState<ChaosRule[]>([]);
  const [circuitBreakers, setCircuitBreakers] = useState<CircuitBreaker[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFlags = useCallback(async () => {
    try {
      const res = await zigPlatform.flags();
      const json = await res.json();
      setFlags(json.flags ?? []);
    } catch {
      setFlags([]);
    }
  }, []);

  const loadChaos = useCallback(async () => {
    try {
      const res = await zigPlatform.chaosList();
      const json = await res.json();
      setChaosRules(json.rules ?? []);
    } catch {
      setChaosRules([]);
    }
  }, []);

  const loadBreakers = useCallback(async () => {
    try {
      const res = await zigPlatform.circuitBreakers();
      const json = await res.json();
      setCircuitBreakers(json.breakers ?? []);
    } catch {
      setCircuitBreakers([]);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadFlags(), loadChaos(), loadBreakers()]).finally(() => setLoading(false));
  }, [loadFlags, loadChaos, loadBreakers]);

  const setFlag = useCallback(async (key: string, enabled: boolean) => {
    try {
      const res = await zigPlatform.flagCheck(key, "admin");
      const json = await res.json();
      setFlags((prev) =>
        prev.map((f) => (f.key === key ? { ...f, enabled } : f)),
      );
    } catch {
      // no-op
    }
  }, []);

  const checkFlag = useCallback(async (key: string, userId?: string) => {
    const flag = flags.find((f) => f.key === key);
    if (flag) return flag.enabled;
    try {
      const res = await zigPlatform.flagCheck(key, userId);
      const json = await res.json();
      return Boolean(json.enabled);
    } catch {
      return false;
    }
  }, [flags]);

  const toggleChaos = useCallback(async (service: string, faultType: string, enabled: boolean) => {
    try {
      await zigPlatform.chaosToggle(service, faultType, enabled);
      await loadChaos();
    } catch {
      // no-op
    }
  }, [loadChaos]);

  const rateLimited = useCallback(async (key: string) => {
    try {
      const res = await zigPlatform.rateLimit();
      const json = await res.json();
      const entry = (json.limits ?? []).find((l: any) => l.key === key);
      return entry ? entry.count >= 60 : false;
    } catch {
      return false;
    }
  }, []);

  return (
    <PlatformContext.Provider
      value={{
        flags,
        setFlag,
        checkFlag,
        chaosRules,
        toggleChaos,
        circuitBreakers,
        rateLimited,
        loading,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
}

export const usePlatform = () => {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used within PlatformProvider");
  return ctx;
};
