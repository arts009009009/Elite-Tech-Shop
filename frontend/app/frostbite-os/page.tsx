"use client";

import dynamic from "next/dynamic";

const FrostbiteOSDesktop = dynamic(
  () => import("@/components/frostbite-os/FrostbiteOSDesktop"),
  { ssr: false }
);

export default function FrostbiteOSPage() {
  return <FrostbiteOSDesktop />;
}
