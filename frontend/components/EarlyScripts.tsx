"use client";
import { useEffect } from "react";

export default function EarlyScripts() {
  useEffect(() => {
    document.documentElement.dataset.perf = "high";

    try {
      const ds = localStorage.getItem("elite_design_system");
      if (ds === "classic") {
        document.body.classList.add("design-system-classic");
      }
    } catch {
      // Error loading design system preference
    }
  }, []);
  return null;
}
