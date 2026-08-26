"use client";
import Image from "next/image";
import Navbar from "@/components/Navbar";

const LOGO_W = "min(22vw, 26vh)";
const CENTER_W = "min(28vw, 35vh)";
const BE_LOGO_W = "min(22vw, 24vh)";
const TEXT_S = "clamp(18px, 3.5vw, 40px)";
const BE_TEXT_S = "clamp(14px, 2.5vw, 28px)";
const TITLE_S = "clamp(20px, 4vw, 40px)";
const SUB_S = "clamp(13px, 2.2vw, 24px)";
const ELITE_S = "clamp(22px, 5vw, 56px)";
const COPY_S = "clamp(10px, 1.4vw, 15px)";

export default function Credits() {
  const year = String(new Date().getFullYear());
  return (
    <>
      <Navbar />
      <div className="credits-page" style={{ minHeight: "calc(100dvh - 60px)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "clamp(8px, 1.5vh, 20px)", padding: "clamp(8px, 1vh, 16px) 1.5rem", overflow: "auto" }}>
        <h1 className="text1" style={{ fontSize: TITLE_S, margin: 0 }}>Project Credits</h1>
        <p className="credits-sub fade-in" style={{ fontSize: SUB_S, margin: 0 }}>
          Built with passion, powered by modern tech
        </p>

        <div style={{ display: "flex", justifyContent: "space-evenly", alignItems: "center", width: "100%", maxWidth: "min(95vw, 800px)", gap: "clamp(12px, 3vw, 60px)" }}>
          <div className="logo-block slide-left" style={{ transition: "transform 0.3s, filter 0.3s", cursor: "default" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.filter = "drop-shadow(0 0 20px #00ffff)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.filter = "none"; }}
          >
            <Image src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" alt="React" width={360} height={360} style={{ width: LOGO_W, height: LOGO_W }} unoptimized />
            <p className="react" style={{ fontSize: TEXT_S }}>React</p>
          </div>
          <div className="logo-block slide-right" style={{ transition: "transform 0.3s, filter 0.3s", cursor: "default" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.filter = "drop-shadow(0 0 20px #ffffff)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.filter = "none"; }}
          >
            <Image src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg" alt="Next.js" width={360} height={360} style={{ width: LOGO_W, height: LOGO_W }} unoptimized />
            <p className="next-grad" style={{ fontSize: TEXT_S }}>Next.js</p>
          </div>
        </div>

        <div className="slide-top" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="logo-block" style={{ transition: "transform 0.3s, filter 0.3s", cursor: "default" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.filter = "drop-shadow(0 0 30px #aa3bff)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.filter = "none"; }}
          >
            <Image
              src="/elitetech.png"
              alt="Elite Tech"
              width={500}
              height={500}
              style={{ width: CENTER_W, height: CENTER_W }}
              priority
            />
          </div>
          <div className="elite-logo-text" style={{ marginTop: "clamp(0px, 0.3vh, 4px)" }}>
            <span className="elite-part" style={{ fontSize: ELITE_S }}>Elite</span>
            <span className="tech-part" style={{ fontSize: ELITE_S }}>Tech</span>
          </div>
        </div>

        <div style={{ width: "100%", maxWidth: "min(95vw, 700px)", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "clamp(10px, 1.5vh, 20px)", marginTop: "clamp(4px, 0.5vh, 8px)" }}>
          <p className="backend-title fade-in" style={{ fontSize: SUB_S, margin: "0 0 clamp(8px, 1.2vh, 16px)", textAlign: "center" }}>
            Backend Credits
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "clamp(20px, 5vw, 60px)", marginBottom: "clamp(8px, 1.5vh, 16px)" }}>
            <div key="rust" className="logo-block" style={{ transition: "transform 0.3s, filter 0.3s", cursor: "default", display: "flex", flexDirection: "column", alignItems: "center" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.filter = "drop-shadow(0 0 20px #ff4f00)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.filter = "none"; }}
            >
              <Image src="/rust.png" alt="Rust" width={300} height={300} style={{ width: BE_LOGO_W, height: BE_LOGO_W }} unoptimized />
              <p className="rust-text" style={{ fontSize: BE_TEXT_S, margin: "clamp(2px, 0.3vh, 6px) 0 0" }}>Rust</p>
            </div>
            <div key="go" className="logo-block" style={{ transition: "transform 0.3s, filter 0.3s", cursor: "default", display: "flex", flexDirection: "column", alignItems: "center" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.filter = "drop-shadow(0 0 20px #00add8)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.filter = "none"; }}
            >
              <Image src="/GO.png" alt="Go" width={300} height={300} style={{ width: BE_LOGO_W, height: BE_LOGO_W }} unoptimized />
              <p className="go-text" style={{ fontSize: BE_TEXT_S, margin: "clamp(2px, 0.3vh, 6px) 0 0" }}>Go</p>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "clamp(20px, 5vw, 60px)" }}>
            <div key="java" className="logo-block" style={{ transition: "transform 0.3s, filter 0.3s", cursor: "default", display: "flex", flexDirection: "column", alignItems: "center" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.filter = "drop-shadow(0 0 20px #f89820)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.filter = "none"; }}
            >
              <Image src="/java.png" alt="Java" width={300} height={300} style={{ width: BE_LOGO_W, height: BE_LOGO_W }} unoptimized />
              <p className="java-text" style={{ fontSize: BE_TEXT_S, margin: "clamp(2px, 0.3vh, 6px) 0 0" }}>Java</p>
            </div>
            <div key="springboot" className="logo-block" style={{ transition: "transform 0.3s, filter 0.3s", cursor: "default", display: "flex", flexDirection: "column", alignItems: "center" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.filter = "drop-shadow(0 0 20px #6db33f)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.filter = "none"; }}
            >
              <Image src="/springboot.png" alt="Spring Boot" width={600} height={300} style={{ width: `calc(${BE_LOGO_W} * 1.4)`, height: BE_LOGO_W }} unoptimized />
              <p className="spring-text" style={{ fontSize: BE_TEXT_S, margin: "clamp(2px, 0.3vh, 6px) 0 0" }}>Spring Boot</p>
            </div>
          </div>
        </div>

        <p className="fade-in" style={{ fontSize: COPY_S, opacity: 0.4, margin: 0 }}>
          &copy; {year} Elite Tech. All rights reserved.
        </p>
      </div>
    </>
  );
}
