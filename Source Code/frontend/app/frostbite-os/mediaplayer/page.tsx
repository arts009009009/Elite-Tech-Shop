"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { openBinaryFile } from "@/lib/file-io";
import FrostbiteOSLayout from "@/components/frostbite-os/FrostbiteOSLayout";

function fmtHMS(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export default function MediaPlayerPage() {
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [trackName, setTrackName] = useState<string | null>(null);
  const [skipAmount, setSkipAmount] = useState(10);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (playing && audioRef.current) {
      audioRef.current.volume = volume / 100;
      audioRef.current.play().catch(() => setPlaying(false));
    } else if (!playing && audioRef.current) {
      audioRef.current.pause();
    }
  }, [playing, volume]);

  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const onTimeUpdate = () => setPosition(Math.floor(audio.currentTime));
    const onLoaded = () => setDuration(Math.floor(audio.duration));
    const onEnded = () => { setPlaying(false); setPosition(0); };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [trackName]);

  const handleOpenFile = useCallback(async () => {
    const result = await openBinaryFile("audio/*");
    if (result) {
      if (audioRef.current) { audioRef.current.pause(); }
      const blob = new Blob([result.data], { type: "audio/*" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setTrackName(result.name);
      setPosition(0);
      setPlaying(true);
    }
  }, []);

  const stop = () => {
    setPlaying(false);
    setPosition(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <FrostbiteOSLayout title="Media Player">
      <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
        <div style={{
          background: "var(--card-bg, #111)",
          border: "1px solid var(--border, #333)",
          borderRadius: 8,
          padding: 20,
        }}>
          <div style={{ fontSize: 20, color: "var(--accent, #00d4ff)", fontWeight: 700, marginBottom: 4 }}>
            {trackName || "No Track Loaded"}
          </div>
          <div style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>
            {trackName ? "Local File" : "Open an audio file to play"}
          </div>

          {/* Progress bar */}
          <div style={{ width: "100%", height: 6, background: "#333", borderRadius: 3, marginBottom: 8, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent, #00d4ff)", borderRadius: 3, transition: "width 1s linear" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", fontFamily: "monospace", marginBottom: 16 }}>
            <span>{fmtHMS(position)}</span>
            <span>{fmtHMS(duration)}</span>
          </div>

          {/* Skip controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
            <button onClick={() => skip(-skipAmount)} style={ctrlBtnStyle}>
              ← Back {fmtHMS(skipAmount)}
            </button>
            <button onClick={() => skip(skipAmount)} style={ctrlBtnStyle}>
              Forward {fmtHMS(skipAmount)} →
            </button>
          </div>

          {/* Skip amount selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, justifyContent: "center" }}>
            <span style={{ color: "#888", fontSize: 12 }}>Jump:</span>
            {[5, 10, 30, 60, 300].map((s) => (
              <button
                key={s}
                onClick={() => setSkipAmount(s)}
                style={{
                  padding: "4px 8px", fontSize: 11, borderRadius: 4, cursor: "pointer", border: `1px solid ${s === skipAmount ? "var(--accent, #00d4ff)" : "var(--border, #333)"}`,
                  background: s === skipAmount ? "var(--accent, #00d4ff)" : "transparent", color: s === skipAmount ? "#000" : "var(--text, #e0e0e0)",
                }}
              >
                {fmtHMS(s)}
              </button>
            ))}
          </div>

          {/* Volume */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <label style={{ color: "#888", fontSize: 12 }}>Vol</label>
            <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} style={{ flex: 1 }} />
            <span style={{ color: "#888", fontSize: 12, width: 32 }}>{volume}%</span>
          </div>

          {/* Transport controls */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={handleOpenFile} style={ctrlBtnStyle}>Open File</button>
            <button onClick={() => setPlaying(!playing)} style={ctrlBtnStyle}>
              {playing ? "Pause" : "Play"}
            </button>
            <button onClick={stop} style={ctrlBtnStyle}>Stop</button>
          </div>
        </div>
      </div>
    </FrostbiteOSLayout>
  );
}

const ctrlBtnStyle: React.CSSProperties = {
  padding: "8px 24px",
  borderRadius: 6,
  border: "1px solid var(--border, #333)",
  background: "var(--accent, #00d4ff)",
  color: "#000",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};
