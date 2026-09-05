"use client";
import { useState, useEffect, useCallback, useRef } from "react";

export default function LoadingScreen({ minimumLoad = 1500 }: { minimumLoad?: number }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    setMounted(true);
    setVisible(true);
  }, []);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setVisible(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(finish, minimumLoad);
    return () => clearTimeout(timer);
  }, [minimumLoad, finish]);

  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(finish, 300);
      return () => clearTimeout(timeout);
    }
  }, [progress, finish]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        const next = prev + Math.random() * 20;
        return next >= 100 ? 100 : next;
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);

  if (!mounted || !visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0f",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          animation: "none",
        }}
      >
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="35" stroke="#00d4ff" strokeWidth="2">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 40 40"
              to="360 40 40"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="40" cy="40" r="20" stroke="#A020F0" strokeWidth="2">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="360 40 40"
              to="0 40 40"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <text x="40" y="45" textAnchor="middle" fill="#00d4ff" fontSize="14" fontFamily="monospace">
            ET
          </text>
        </svg>
      </div>
      <p
        style={{
          color: "#63b3ed",
          fontSize: 14,
          letterSpacing: "0.1em",
          margin: "16px 0 0",
        }}
      >
        INITIALIZING SYSTEM...
      </p>
      <div style={{ width: 256, marginTop: 16 }}>
        <div
          style={{
            width: "100%",
            height: 8,
            background: "rgba(255,255,255,0.1)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "linear-gradient(90deg, #00d4ff, #A020F0)",
              borderRadius: 4,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}
