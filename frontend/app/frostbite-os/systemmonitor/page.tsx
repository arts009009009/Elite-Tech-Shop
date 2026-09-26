"use client";

import dynamic from "next/dynamic";

const SystemMonitor = dynamic(
  () => import("@/components/frostbite-os/SystemMonitor"),
  { ssr: false }
);

export default function SystemMonitorPage() {
  return <SystemMonitor asApp />;
}
