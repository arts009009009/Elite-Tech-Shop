"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { DEV_ROASTS, USER_ROASTS, RANDOM_ROASTS } from "@/data/roasts";

type RecoveryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const GLITCH_CHARS = "!@#$%^&*()_+-=[]{}|;':\",./<>?~`";
const ROAST_LABELS: Record<string, string> = { dev: "🔥 Dev Roast", user: "😤 User Roast", random: "🎲 Random Roast" };

function randomGlitch(length = 8) {
  return Array.from({ length }, () => GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]).join("");
}

export default function Recovery({ error, reset }: RecoveryProps) {
  const router = useRouter();
  const [glitchText, setGlitchText] = useState("LOSER HACKER :D");
  const [scanLine, setScanLine] = useState(0);
  const [errorId] = useState(() => Math.floor(Math.random() * 0xffffffff).toString(16).toUpperCase().padStart(8, "0"));
  const [roast, setRoast] = useState<string | null>(null);
  const [roastType, setRoastType] = useState<string | null>(null);
  const [policeMode, setPoliceMode] = useState(false);
  const [fbiMode, setFbiMode] = useState(false);
  const [buttonVisible, setButtonVisible] = useState(false);
  const [explosionPhase, setExplosionPhase] = useState(-1);
  const [ashParticles] = useState(() =>
    Array.from({ length: 20 }, () => ({
      x: Math.random() * 100,
      drift: -5 + Math.random() * 10,
      size: 2 + Math.random() * 5,
      opacity: 0.3 + Math.random() * 0.5,
      dur: 5 + Math.random() * 8,
      delay: Math.random() * 6,
      big: Math.random() > 0.6,
    }))
  );

  useEffect(() => {
    if (!policeMode) {
      setTimeout(() => setButtonVisible(false), 0);
      return;
    }
    const timer = setTimeout(() => setButtonVisible(true), 5000);
    return () => clearTimeout(timer);
  }, [policeMode]);

  const explosionTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (explosionPhase !== 0) return;
    explosionTimers.current.forEach(clearTimeout);
    explosionTimers.current = [
      setTimeout(() => setExplosionPhase(1), 1500),
      setTimeout(() => setExplosionPhase(2), 6500),
      setTimeout(() => setExplosionPhase(3), 8000),
    ];
  }, [explosionPhase]);

  useEffect(() => {
    return () => explosionTimers.current.forEach(clearTimeout);
  }, []);

  const usedRoasts = useRef(new Set<string>());
  const currentRoast = useRef<string | null>(null);

  // Expose reset trigger for parent
  const handleReset = useCallback(() => {
    setPoliceMode(false);
    setFbiMode(false);
    setExplosionPhase(-1);
    setButtonVisible(false);
    setRoast(null);
    setRoastType(null);
    usedRoasts.current.clear();
    currentRoast.current = null;
    reset();
    router.refresh();
    }, [reset, router]);

  const showRoast = useCallback((type: string) => {
    const pool = type === "dev" ? DEV_ROASTS : type === "user" ? USER_ROASTS : RANDOM_ROASTS;
    const available = pool.filter((r) => !usedRoasts.current.has(r));
    if (available.length === 0) {
      pool.forEach((r) => usedRoasts.current.delete(r));
      const filtered = pool.filter((r) => r !== currentRoast.current);
      const next = filtered.length > 0
        ? filtered[Math.floor(Math.random() * filtered.length)]
        : pool[Math.floor(Math.random() * pool.length)];
      usedRoasts.current.add(next);
      currentRoast.current = next;
      setRoast(next);
      setRoastType(type);
      return;
    }
    const next = available[Math.floor(Math.random() * available.length)];
    usedRoasts.current.add(next);
    currentRoast.current = next;
    setRoast(next);
    setRoastType(type);
  }, []);

  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setGlitchText((prev) => {
        if (Math.random() > 0.7) return prev;
        const chars = prev.split("");
        const idx = Math.floor(Math.random() * chars.length);
        chars[idx] = Math.random() > 0.5 ? randomGlitch(1) : chars[idx];
        return chars.join("");
      });
    }, 100);
    const scanInterval = setInterval(() => {
      setScanLine((prev) => (prev >= 100 ? 0 : prev + 2));
    }, 50);
    return () => {
      clearInterval(glitchInterval);
      clearInterval(scanInterval);
    };
  }, []);

  return (
    <div style={styles.wrapper}>
      <div style={styles.scanlineOverlay} />
      <div style={{ ...styles.scanline, top: `${scanLine}%` }} />

      {policeMode && <div style={{ position: "fixed", inset: 0, zIndex: 0, animation: "police-flash-bg 0.5s linear infinite", pointerEvents: "none" }} />}
      {fbiMode && (explosionPhase >= 0 || explosionPhase === -1) && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" as const, animation: explosionPhase === 0 || explosionPhase === 2 ? "fbi-explode 0.8s ease-out" : "none" }}>
          {explosionPhase === -1 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 16, color: "#ff0040", fontFamily: "'Courier New', monospace", letterSpacing: 3 }}>
                {"☎ "}AUTHORITIES NOTIFIED{" ☎"}
              </div>
              <h1 style={{ ...styles.title, fontSize: 52, color: "#ff0040", textShadow: "0 0 10px #ff0040, 0 0 30px #ff0040, 0 0 60px #ff0000, 0 0 90px #ff0000" }}>
                FBI CALLED
              </h1>
              <p style={{ fontSize: 24, color: "#ff6600", fontFamily: "'Courier New', monospace", textShadow: "0 0 10px #ff6600, 0 0 30px #ff6600", fontWeight: 700, letterSpacing: 3 }}>
                Good luck hacker at graveyard
              </p>
              <button
                onClick={() => setExplosionPhase(0)}
                style={{ ...styles.roastBtn, padding: "12px 24px", fontSize: 14, border: "2px solid #ff6600", color: "#ff6600", boxShadow: "0 0 10px #ff6600", marginTop: 16 }}
              >
                Hide IP
              </button>
            </div>
          )}
          {explosionPhase === 0 && <div style={{ position: "fixed", inset: 0, background: "#fff", opacity: 0, animation: "fbi-flash 0.8s ease-out forwards" }} />}
          {explosionPhase === 1 && <div style={{ position: "fixed", inset: 0, background: "radial-gradient(circle at 50% 50%, #1a0000 0%, #000 60%)", opacity: 0.9 }} />}
          {explosionPhase === 2 && <div style={{ position: "fixed", inset: 0, background: "#fff", opacity: 0, animation: "fbi-flash 0.8s ease-out forwards" }} />}
          {explosionPhase === 3 && (
            <>
              <div style={{ position: "fixed", inset: 0, background: "#080000", zIndex: 1 }} />
              <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <p style={{ color: "#ff6600", fontSize: 28, fontFamily: "'Courier New', monospace", marginBottom: 24, textShadow: "0 0 20px #ff4500, 0 0 40px #ff0000, 0 0 80px #ff0000", fontWeight: 700, letterSpacing: 4 }}>
                  SYSTEM DESTROYED
                </p>
                <button onClick={handleReset} style={{ ...styles.retryButton, fontSize: 18, padding: "16px 40px" }}>
                  ↻ REINITIALIZE
                </button>
              </div>
              <div style={{ position: "fixed", inset: 0, zIndex: 99998, pointerEvents: "none" }}>
                <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
                  <defs>
                    <filter id="crack-glow">
                      <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="rgba(255,255,255,0.2)" />
                    </filter>
                  </defs>
                  <g filter="url(#crack-glow)">
                    <polyline points="500,500 490,450 510,420 495,380 515,340 500,300 525,250 510,200 530,140 520,100 540,50 530,0" stroke="#eee" strokeWidth="4" fill="none" opacity="0.95" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="510,420 540,410 560,390 590,395 620,370 660,380 690,360 730,370 760,340 800,350 830,340 860,355 890,340 920,360 950,345 980,365 1000,350" stroke="#ddd" strokeWidth="3" fill="none" opacity="0.85" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="540,410 530,380 545,360 535,330 555,310 570,280 560,250 580,220" stroke="#ccc" strokeWidth="2.5" fill="none" opacity="0.7" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="560,390 580,410 600,405 630,420 650,410" stroke="#bbb" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="620,370 640,350 630,330 650,310 670,290 660,260 680,240" stroke="#ccc" strokeWidth="2.5" fill="none" opacity="0.7" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="490,450 460,440 440,460 410,450 390,470 360,455 330,470 300,460 270,480 240,465 210,490 180,475 150,500 120,490 90,510 60,500 30,520 0,510" stroke="#eee" strokeWidth="4" fill="none" opacity="0.95" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="440,460 430,490 420,480 400,510 380,530 350,540" stroke="#ddd" strokeWidth="2.5" fill="none" opacity="0.75" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="410,450 380,440 360,455 340,440 310,430 280,440 250,430" stroke="#ccc" strokeWidth="2" fill="none" opacity="0.65" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="330,470 310,490 290,485 260,500 230,490" stroke="#bbb" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="270,480 260,510 240,520 210,540 180,530" stroke="#ccc" strokeWidth="2" fill="none" opacity="0.65" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="510,520 530,540 520,560 545,580 535,610 560,640 550,670 575,700 565,740 590,780 580,820 610,870 600,920 625,970 615,1000" stroke="#eee" strokeWidth="4.5" fill="none" opacity="0.95" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="530,540 560,545 580,565 610,555 640,575 670,560 700,580 730,570 760,585 790,570 820,590 850,575 880,595 910,580 940,600 970,585 1000,600" stroke="#ddd" strokeWidth="3" fill="none" opacity="0.85" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="560,545 580,530 600,540 620,520 640,530" stroke="#bbb" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="610,555 630,540 650,550 670,535 690,545" stroke="#ccc" strokeWidth="2.5" fill="none" opacity="0.65" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="545,580 570,600 560,620 580,645 570,670 590,700" stroke="#ccc" strokeWidth="2.5" fill="none" opacity="0.7" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="535,610 510,630 520,650 500,670 510,690" stroke="#bbb" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="480,510 460,530 470,550 450,570 460,600 440,630 450,660 430,690 410,720 420,750 400,780 415,820 395,860 410,900 390,940 405,980 395,1000" stroke="#eee" strokeWidth="3.5" fill="none" opacity="0.9" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="460,530 430,535 410,555 380,550 350,560 320,550" stroke="#ddd" strokeWidth="2.5" fill="none" opacity="0.75" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="410,555 400,580 380,590 360,610 340,600" stroke="#ccc" strokeWidth="2" fill="none" opacity="0.65" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="450,570 420,580 430,605 410,630 420,650" stroke="#bbb" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="410,720 380,715 360,730 330,720 300,740" stroke="#ccc" strokeWidth="2.5" fill="none" opacity="0.65" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="420,750 440,770 430,790 450,810 440,840" stroke="#bbb" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="830,340 840,310 860,300 880,280 870,250 890,230" stroke="#ccc" strokeWidth="2" fill="none" opacity="0.65" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="730,570 740,540 760,530 780,510 770,480 790,460" stroke="#ccc" strokeWidth="2" fill="none" opacity="0.65" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="790,570 810,550 830,560 850,540 870,555" stroke="#bbb" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="150,500 130,520 140,540 120,560 130,580 110,610 120,640 100,670 110,700 90,730 100,760 80,790 90,820 70,860 80,900 60,940 70,980 50,1000" stroke="#ddd" strokeWidth="3" fill="none" opacity="0.8" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="120,560 90,570 70,590 50,610 30,600 0,620" stroke="#ccc" strokeWidth="2.5" fill="none" opacity="0.65" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="100,670 120,690 110,710 130,730 120,760 140,790 130,820" stroke="#ccc" strokeWidth="2.5" fill="none" opacity="0.7" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="300,460 280,440 290,410 270,390 250,370 260,340 240,320" stroke="#ccc" strokeWidth="2.5" fill="none" opacity="0.7" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="240,465 220,450 230,430 210,410 220,390 200,370" stroke="#bbb" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="760,340 780,320 770,290 790,270 780,240 800,220 790,190 810,170" stroke="#ccc" strokeWidth="2" fill="none" opacity="0.65" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="500,300 470,280 480,250 460,230 470,200 450,180 460,150 440,130" stroke="#ccc" strokeWidth="2" fill="none" opacity="0.65" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="515,340 540,330 560,340 580,320 600,330" stroke="#bbb" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="180,475 170,450 190,430 180,410 200,390 190,370 210,350" stroke="#ccc" strokeWidth="2.5" fill="none" opacity="0.7" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                </svg>
              </div>
              <div style={{ position: "fixed", bottom: 0, left: "-10%", right: "-10%", height: "60%", zIndex: 99999, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 100%, rgba(180,30,0,0.7) 0%, rgba(120,20,0,0.3) 30%, rgba(60,10,0,0.1) 50%, transparent 70%)", animationName: "fbi-fire", animationDuration: "3s", animationTimingFunction: "ease-in-out", animationIterationCount: "1", animationDirection: "alternate", animationFillMode: "forwards" }} />
              <div style={{ position: "fixed", bottom: 0, left: "-5%", right: "-5%", height: "45%", zIndex: 100000, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 100%, rgba(255,80,10,0.6) 0%, rgba(200,50,0,0.25) 25%, rgba(100,20,0,0.08) 45%, transparent 65%)", filter: "blur(4px)", animationName: "fbi-fire", animationDuration: "2s", animationTimingFunction: "ease-in-out", animationIterationCount: "1", animationDirection: "alternate-reverse", animationFillMode: "forwards" }} />
              <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: "30%", zIndex: 100001, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 100%, rgba(255,180,30,0.5) 0%, rgba(255,100,10,0.2) 20%, rgba(150,40,0,0.08) 40%, transparent 60%)", filter: "blur(8px)", animationName: "fbi-fire", animationDuration: "1.5s", animationTimingFunction: "ease-in-out", animationIterationCount: "1", animationDirection: "alternate", animationFillMode: "forwards" }} />
              <div style={{ position: "fixed", bottom: 0, left: "15%", right: "15%", height: "15%", zIndex: 100002, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 100%, rgba(255,240,200,0.4) 0%, rgba(255,200,100,0.15) 25%, rgba(255,100,20,0.05) 45%, transparent 65%)", filter: "blur(6px)", animationName: "fbi-fire", animationDuration: "1s", animationTimingFunction: "ease-in-out", animationIterationCount: "1", animationDirection: "alternate-reverse", animationFillMode: "forwards" }} />
              {ashParticles.map((p, i) => (
                <div key={i} style={{
                  position: "fixed", top: 0, left: 0, zIndex: 100003, pointerEvents: "none",
                  width: `${p.size}px`, height: `${p.size}px`,
                  background: p.big ? "radial-gradient(circle, #555 0%, #222 60%, transparent 100%)" : "#333",
                  borderRadius: "50%",
                  opacity: p.opacity,
                  filter: p.big ? "blur(1px)" : "none",
                  animation: `ash-fall-${i} ${p.dur}s linear ${p.delay}s 1 forwards`,
                  transform: `translateX(${p.x}vw)`,
                }} />
              ))}
              <style>{`
                ${ashParticles.map((p, i) => `
                  @keyframes ash-fall-${i} {
                    0% { transform: translateX(${p.x}vw) translateY(-5vh); opacity: 0; }
                    10% { opacity: ${p.opacity}; }
                    80% { opacity: ${p.opacity}; }
                    100% { transform: translateX(${p.x + p.drift}vw) translateY(105vh); opacity: 0; }
                  }
                `).join("")}
              `}</style>
            </>
          )}
          <style>{`
            @keyframes fbi-flash { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0; } }
            @keyframes fbi-explode { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
            @keyframes fbi-fire { 0% { opacity: 0.7; } 100% { opacity: 1; } }
          `}</style>
        </div>
      )}
      {policeMode && !fbiMode ? (
        <div style={{ ...styles.container, maxWidth: 700, border: "2px solid rgba(255,0,0,0.3)", animation: "police-border 1s linear infinite", padding: "32px 24px" }}>
          <div style={{ fontSize: 16, marginBottom: 24, color: "#ff0040", fontFamily: "'Courier New', monospace", letterSpacing: 3 }}>
            {"☎ "}AUTHORITIES NOTIFIED{" ☎"}
          </div>
          <h1 style={{ ...styles.title, fontSize: 52, color: "#ff0040", textShadow: "0 0 10px #ff0040, 0 0 30px #ff0040, 0 0 60px #ff0000, 0 0 90px #ff0000" }}>
            POLICE CALLED
          </h1>
          <div style={{ ...styles.divider, margin: "24px 0", fontSize: 20, letterSpacing: 8, animation: "police-flash 0.5s linear infinite" }}>
            {"🚨".repeat(10)}
          </div>
          <p style={{ fontSize: 24, color: "#ff6600", fontFamily: "'Courier New', monospace", textShadow: "0 0 10px #ff6600, 0 0 30px #ff6600", fontWeight: 700, letterSpacing: 3, margin: "24px 0" }}>
            Good luck hacker at prison
          </p>
          <div style={{ ...styles.divider, margin: "24px 0", fontSize: 20, letterSpacing: 8, animation: "police-flash 0.5s linear infinite" }}>
            {"🚨".repeat(10)}
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,68,68,0.5)", fontFamily: "'Courier New', monospace", letterSpacing: 2, margin: "16px 0" }}>
            Your IP address and location have been logged.
          </p>
          {!fbiMode && buttonVisible && (
            <div style={styles.actions}>
              <button
                onClick={() => setFbiMode(true)}
                style={{ ...styles.roastBtn, padding: "12px 24px", fontSize: 14, border: "2px solid #ff6600", color: "#ff6600", boxShadow: "0 0 10px #ff6600" }}
              >
                Joking bro click this to contact the owner
              </button>
            </div>
          )}
        </div>
      ) : null}
      {!fbiMode && !policeMode ? (
        <div style={styles.container}>
          <div style={styles.errorCode}>
            <span style={{ color: "#ff0040" }}>0x{errorId}</span>
          </div>

          <h1 style={styles.title}>{glitchText}</h1>

          <div style={styles.divider}>
            {"═".repeat(30)}
          </div>

          <div style={styles.crashReport}>
            <div style={styles.dumpLine}>
              <span style={{ color: "#00d4ff" }}>EXCEPTION:</span> {error.name}
            </div>
            <div style={styles.dumpLine}>
              <span style={{ color: "#00d4ff" }}>MESSAGE:</span> {error.message}
            </div>
            {error.digest && (
              <div style={styles.dumpLine}>
                <span style={{ color: "#00d4ff" }}>DIGEST:</span> {error.digest}
              </div>
            )}
          </div>

          {roast && (
            <div style={styles.roastBox}>
              <span style={{ color: "#ffb000", fontSize: 11, letterSpacing: 2 }}>
                {"▶ "}{ROAST_LABELS[roastType ?? "random"]?.toUpperCase() ?? "ROAST"}
              </span>
              <p style={styles.roastText}>{roast}</p>
            </div>
          )}

          <div style={styles.roastActions}>
            {(["dev", "user", "random"] as const).map((type) => (
              <button key={type} onClick={() => showRoast(type)} style={styles.roastBtn}>
                {ROAST_LABELS[type]}
              </button>
            ))}
          </div>

          <div style={styles.divider}>
            {"═".repeat(30)}
          </div>

          <div style={styles.actions}>
            <button
              onClick={reset}
              style={styles.retryButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 0 20px #00d4ff, 0 0 40px #00d4ff, 0 0 60px #ff0040";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 0 10px #00d4ff";
              }}
            >
              ↻ REINITIALIZE
            </button>

            <button
              onClick={() => window.location.reload()}
              style={styles.reloadButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 0 20px #ff0040, 0 0 40px #ff0040";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 0 10px #ff0040";
              }}
            >
              ⟳ HARD REBOOT
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
            <button
              onClick={() => setPoliceMode(true)}
              style={styles.policeBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 0 20px #ff0000, 0 0 40px #ff0000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 0 8px #ff0000";
              }}
            >
              ☎ CONTACT ADMINISTRATOR
            </button>
          </div>

          <p style={{ ...styles.footer, color: "#00ff41", textShadow: "0 0 8px #00ff41, 0 0 20px #00ff41, 0 0 40px #00ff41", fontWeight: 700, letterSpacing: 4 }}>
            YOU FAILED AT CYBERSECURITY
          </p>
        </div>
      ) : null}

      <style>{`
        @keyframes recover-flicker {
          0% { opacity: 1; }
          50% { opacity: 0.97; }
          100% { opacity: 1; }
        }
        @keyframes recover-glitch-bg {
          0% { background-position: 0 0; }
          100% { background-position: 100% 100%; }
        }
        @keyframes police-flash {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes police-flash-bg {
          0% { background: rgba(255,0,0,0.08); }
          25% { background: rgba(0,0,255,0.08); }
          50% { background: rgba(255,0,0,0.12); }
          75% { background: rgba(0,0,255,0.06); }
          100% { background: rgba(255,0,0,0.08); }
        }
        @keyframes police-border {
          0%, 100% { border-color: rgba(255,0,0,0.4); box-shadow: inset 0 0 30px rgba(255,0,0,0.05); }
          50% { border-color: rgba(0,0,255,0.4); box-shadow: inset 0 0 30px rgba(0,0,255,0.05); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#050508",
    color: "#e0e0e0",
    fontFamily: "'Courier New', 'Consolas', monospace",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: "var(--z-recovery)",
    overflow: "hidden",
    animation: "recover-flicker 0.15s infinite",
  },
  scanlineOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.015) 2px, rgba(0,212,255,0.015) 4px)",
    pointerEvents: "none",
    zIndex: 10,
  },
  scanline: {
    position: "fixed",
    left: 0,
    width: "100%",
    height: "3px",
    background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.15), transparent)",
    pointerEvents: "none",
    zIndex: 11,
  },
  container: {
    maxWidth: 640,
    width: "100%",
    padding: "40px 24px",
    textAlign: "center" as const,
    position: "relative",
    zIndex: 1,
  },
  errorCode: {
    fontSize: 14,
    marginBottom: 16,
    fontFamily: "'Courier New', monospace",
    letterSpacing: 2,
  },
  title: {
    fontSize: 36,
    fontWeight: 700,
    color: "#ff0040",
    textShadow: "0 0 10px #ff0040, 0 0 20px #ff0040, 0 0 40px #ff0040",
    margin: "0 0 20px 0",
    fontFamily: "'Courier New', monospace",
    textTransform: "uppercase" as const,
    letterSpacing: 4,
  },
  divider: {
    color: "rgba(0,212,255,0.3)",
    fontSize: 12,
    margin: "16px 0",
    fontFamily: "'Courier New', monospace",
    letterSpacing: 6,
  },
  crashReport: {
    textAlign: "left" as const,
    background: "rgba(0,212,255,0.03)",
    border: "1px solid rgba(0,212,255,0.12)",
    borderRadius: 4,
    padding: 16,
    margin: "16px 0",
    fontSize: 13,
    lineHeight: 1.6,
  },
  dumpLine: {
    marginBottom: 4,
    fontFamily: "'Courier New', monospace",
    color: "#e0e0e0",
  },
  stackTrace: {
    fontFamily: "'Courier New', monospace",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    margin: "8px 0 0 0",
    padding: 0,
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-all" as const,
    lineHeight: 1.5,
    maxHeight: 120,
    overflow: "hidden",
  },
  actions: {
    display: "flex",
    gap: 16,
    justifyContent: "center",
    flexWrap: "wrap" as const,
    margin: "24px 0",
  },
  retryButton: {
    padding: "12px 32px",
    fontSize: 14,
    fontFamily: "'Courier New', monospace",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: 3,
    border: "2px solid #00d4ff",
    background: "transparent",
    color: "#00d4ff",
    cursor: "pointer",
    boxShadow: "0 0 10px #00d4ff",
    transition: "all 0.3s ease",
    borderRadius: 4,
  },
  reloadButton: {
    padding: "12px 32px",
    fontSize: 14,
    fontFamily: "'Courier New', monospace",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: 3,
    border: "2px solid #ff0040",
    background: "transparent",
    color: "#ff0040",
    cursor: "pointer",
    boxShadow: "0 0 10px #ff0040",
    transition: "all 0.3s ease",
    borderRadius: 4,
  },
  roastBox: {
    background: "rgba(255,176,0,0.06)",
    border: "1px solid rgba(255,176,0,0.2)",
    borderRadius: 4,
    padding: "12px 16px",
    margin: "12px 0",
    textAlign: "left" as const,
  },
  roastText: {
    margin: "6px 0 0 0",
    fontSize: 14,
    color: "#ffd700",
    fontFamily: "'Courier New', monospace",
    textShadow: "0 0 8px rgba(255,215,0,0.3)",
    lineHeight: 1.4,
  },
  roastActions: {
    display: "flex",
    gap: 8,
    justifyContent: "center",
    flexWrap: "wrap" as const,
    margin: "8px 0",
  },
  roastBtn: {
    padding: "6px 14px",
    fontSize: 11,
    fontFamily: "'Courier New', monospace",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: 2,
    border: "1px solid rgba(255,176,0,0.3)",
    background: "transparent",
    color: "#ffb000",
    cursor: "pointer",
    borderRadius: 4,
    transition: "all 0.2s ease",
  },
  policeBtn: {
    padding: "10px 28px",
    fontSize: 13,
    fontFamily: "'Courier New', monospace",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: 3,
    border: "2px solid #ff0000",
    background: "transparent",
    color: "#ff0000",
    cursor: "pointer",
    boxShadow: "0 0 8px #ff0000",
    transition: "all 0.3s ease",
    borderRadius: 4,
  },
  footer: {
    marginTop: 32,
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    fontFamily: "'Courier New', monospace",
    letterSpacing: 2,
  },
};
