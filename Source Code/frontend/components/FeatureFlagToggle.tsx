"use client";

import { usePlatform } from "@/context/PlatformContext";

interface FeatureFlagToggleProps {
  key: string;
  label: string;
}

export default function FeatureFlagToggle({ key, label }: FeatureFlagToggleProps) {
  const { flags, setFlag, checkFlag } = usePlatform();
  const flag = flags.find((f) => f.key === key);
  const enabled = flag?.enabled ?? false;

  const toggle = async () => {
    setFlag(key, !enabled);
  };

  return (
    <div className="flex items-center justify-between p-2 rounded border bg-gray-900/50 text-sm">
      <span>{label}</span>
      <button
        onClick={toggle}
        className={`rounded px-2 py-1 text-xs font-bold transition ${enabled ? "bg-cyan-600 text-white" : "bg-gray-700 text-gray-300"}`}
      >
        {enabled ? "ON" : "OFF"}
      </button>
    </div>
  );
}
