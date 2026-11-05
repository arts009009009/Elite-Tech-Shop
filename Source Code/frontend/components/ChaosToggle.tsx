"use client";

import { usePlatform } from "@/context/PlatformContext";

interface ChaosToggleProps {
  service: string;
  faultType: "latency" | "error" | "drop";
  label: string;
}

export default function ChaosToggle({ service, faultType, label }: ChaosToggleProps) {
  const { chaosRules, toggleChaos } = usePlatform();
  const rule = chaosRules.find((r) => r.service === service && r.fault_type === faultType);
  const enabled = rule?.enabled ?? false;

  return (
    <div className="flex items-center gap-2 p-2 rounded border bg-gray-900/50 text-sm">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={() => toggleChaos(service, faultType, !enabled)}
          className="accent-cyan-400"
        />
        {label} ({enabled ? "ACTIVE" : "off"})
      </label>
      {enabled && (
        <span className="text-xs text-red-400 animate-pulse">chaos injecting</span>
      )}
    </div>
  );
}
