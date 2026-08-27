"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

const WordApp = dynamic(() => import("@/app/frostbite-os/word/page"), { ssr: false });
const ExcelApp = dynamic(() => import("@/app/frostbite-os/excel/page"), { ssr: false });
const PptApp = dynamic(() => import("@/app/frostbite-os/powerpoint/page"), { ssr: false });
const NotepadApp = dynamic(() => import("@/app/frostbite-os/notepad/page"), { ssr: false });
const CalculatorApp = dynamic(() => import("@/app/frostbite-os/calculator/page"), { ssr: false });
const PaintApp = dynamic(() => import("@/app/frostbite-os/paint/page"), { ssr: false });
const ClockApp = dynamic(() => import("@/app/frostbite-os/clock/page"), { ssr: false });
const TasksApp = dynamic(() => import("@/app/frostbite-os/tasks/page"), { ssr: false });
const MediaPlayerApp = dynamic(() => import("@/app/frostbite-os/mediaplayer/page"), { ssr: false });
const BrowserApp = dynamic(() => import("@/app/frostbite-os/browser/page"), { ssr: false });
const SystemMonitorApp = dynamic(() => import("./SystemMonitor"), { ssr: false });

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: "100%", overflow: "hidden", background: "var(--bg, #0a0a0f)", color: "var(--text, #e0e0e0)" }}>
      <style>{`
        .fs-win-body nav { display: none !important; }
        .fs-win-body > div > div { min-height: 100% !important; height: 100% !important; padding: 0 !important; }
        .fs-win-body > div > div > div { height: 100% !important; }
      `}</style>
      {children}
    </div>
  );
}

function AppWrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: "100%", overflow: "hidden", background: "var(--bg, #0a0a0f)", color: "var(--text, #e0e0e0)" }}>
      {children}
    </div>
  );
}

export const APP_COMPONENTS: Record<string, ComponentType> = {
  word: () => <Wrap><WordApp /></Wrap>,
  excel: () => <Wrap><ExcelApp /></Wrap>,
  ppt: () => <Wrap><PptApp /></Wrap>,
  notepad: () => <Wrap><NotepadApp /></Wrap>,
  calculator: () => <Wrap><CalculatorApp /></Wrap>,
  paint: () => <Wrap><PaintApp /></Wrap>,
  clock: () => <Wrap><ClockApp /></Wrap>,
  tasks: () => <Wrap><TasksApp /></Wrap>,
  media: () => <Wrap><MediaPlayerApp /></Wrap>,
  browser: () => <Wrap><BrowserApp /></Wrap>,
  sysmon: () => <AppWrap><SystemMonitorApp asApp /></AppWrap>,
};
