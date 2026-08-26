// "use client";
// import { useEffect } from "react";

// const CSS = `
// /* Light Mode - Wallpaper with white overlay + Light UI + Dark Text */

// /* Keep wallpaper visible with white overlay */
// body.light-mode {
//   background: linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url('/wallpaper.png') no-repeat center center fixed !important;
//   background-size: cover !important;
// }

// body.light-mode.design-system-classic {
//   background: linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.85)), url('/classic wallpaper.png') no-repeat center center fixed !important;
//   background-size: cover !important;
// }

// /* Set CSS variables for light mode */
// body.light-mode {
//   --bg: #ffffff !important;
//   --text: #1a1a2e !important;
//   --text-h: #111122 !important;
//   --accent: #A020F0 !important;
//   --border: #e5e7eb !important;
//   --custom-bg: #ffffff !important;
//   --custom-bg-card: rgba(255, 255, 255, 0.97) !important;
//   --custom-text: #1a1a2e !important;
//   --custom-border: rgba(0, 0, 0, 0.08) !important;
//   --v2-bg: #ffffff !important;
//   --v2-panel: rgba(255, 255, 255, 0.97) !important;
//   --v2-panel-2: rgba(255, 255, 255, 0.98) !important;
//   --v2-text: #1a1a2e !important;
//   --v2-muted: #555 !important;
//   --v2-cyan: #A020F0 !important;
//   --v2-magenta: #e04090 !important;
//   --v2-green: #16a34a !important;
//   --v2-red: #ef4444 !important;
// }

// /* Override hardcoded dark colors in CompareTable */
// body.light-mode th { background: var(--v2-panel) !important; color: var(--v2-cyan) !important; }
// body.light-mode td { background: var(--v2-panel) !important; color: var(--v2-text) !important; }
// `;

// export default function LightModeStyles() {
//   useEffect(() => {
//     let tag = document.getElementById("light-mode-inject");
//     if (!tag) {
//       tag = document.createElement("style");
//       tag.id = "light-mode-inject";
//       document.head.appendChild(tag);
//     }
//     function apply() { tag!.textContent = CSS; }
//     apply();
//     const observer = new MutationObserver(apply);
//     observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
//     return () => { observer.disconnect(); if (tag) tag.textContent = ""; };
//   }, []);
//   return null;
// }
