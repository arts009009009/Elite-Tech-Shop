---

# ⚡ Elite Tech Shop

A **full‑stack demo e‑commerce application** with a **neon‑dark Elite Tech vibe**.
React 19 frontend, **triple backend fusion** (Rust + Java + Go), and a **Minecraft Alpha voxel minigame** — built for chaos, speed, and full‑stack grind energy.

💬 **Cloned this repo? Drop feedback in [Discussions](https://github.com/arts009009009/Elite-Tech-Shop/discussions)!**
⭐ **Like this repo? Smash that star!**
🏆 **First commenter gets immortalized in the [Hall of Fame](https://github.com/arts009009009/Elite-Tech-Shop/discussions/11)!**

---

## ✨ Features

### Core Commerce
- **Product Catalog** → 50+ products, multi‑language JSON (EN, AR, RU, FR, ES, DE, ZH, JA, PT, HI) via Rust Axum
- **Cart System** → add, remove, update, persist via Go backend
- **Order Processing** → history + status tracking via Go backend
- **Wishlist** → save products locally per user
- **Checkout Flow** → debounce protection, stock validation, redirect to orders

### Engagement
- **Reviews & Ratings** → submit/view reviews per product via Go backend
- **Rewards Program** → earn points, tier progression (Bronze → Platinum), redeem perks
- **Discount Codes** → built‑in codes (SAVE10, SAVE20, FLAT50, WELCOME5, BIG100)

### Admin & Analytics
- **Admin Dashboard** → analytics, product management, secure local storage clear
- **Admin Auth** → two‑step login with OS notifications via Java backend

### UI & UX
- **Responsive UI** → cyberpunk CSS, theme customizer, high contrast, reduced motion
- **Live Search** → debounced instant results
- **AI Shopping Assistant** → FAQ chatbot
- **Live Support Chat** → simulated support with typing indicators
- **Multi‑Language** → 10 languages + full RTL support
- **Notifications** → real‑time toast alerts + push notification support
- **Offline Indicator** → connection status display

### Chaos OS
- **Minecraft Minigame** → Rust WASM voxel engine, survival physics, arrow/WASD controls, pause overlay with blur
- **Excel Clone** → spreadsheet with cell styling
- **Paint App** → fullscreen canvas drawing

---

## 🚀 Versioning

All versions follow **Major.Minor (Build X)** format:
- Patch field removed for clarity
- Build counter = raw tally of fixes + commits
- Minor increments = new feature cycles
- Overflow rolls into next major

**Current Version:** `4.8 (Build 429)`

---

## 🏗️ Architecture

```
Frontend (Next.js 16 + Turbopack) → localhost:3000
   │
   ├─ Rust/Axum     :3002  → Products, Categories, Minigame WASM
   ├─ Java/Spring   :3001  → Auth, Login, Password Reset
   └─ Go Backend    :3003  → Cart, Orders, Reviews, Rewards, Discounts
```

**Request flow:** Frontend → Next.js API routes (proxy) → backend service → JSON response
All backend calls logged with `[BACKEND]` prefix for debugging.

---

## 🔧 Prerequisites

| Tool       | Version                       | Purpose                     |
|------------|-------------------------------|-----------------------------|
| Node       | 18+                           | Frontend runtime            |
| pnpm       | 8+                            | Package manager (monorepo)  |
| Rust       | stable                        | WASM minigame + products    |
| Java       | 21 (compile) / 26 (run)       | Spring Boot auth backend    |
| Go         | 1.22+                         | Orders + checkout backend   |
| wasm-pack  | latest                        | Building WASM for minigame  |

---

## 🧪 Quality

- **TypeScript** → 0 errors
- **ESLint** → 0 errors (1 acceptable warning: `eval` in calculator, React Compiler limitation)
- **Hydration** → SSR-safe client components, no mismatches
- **Auth Flow** → full Java-backed register/login/logout with Go session cookie

---

## 🚀 Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-CE412B?style=for-the-badge&logo=rust&logoColor=white)
![Java](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Go](https://img.shields.io/badge/Go-1.22-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

---

## 🔮 Planned for v5.0

- **AI Recommendations** → smart product suggestions
- **Offline Mode** → service worker + cached catalog browsing
- **Expanded Theme Engine** → more cyberpunk palettes + custom theme builder
- **Enhanced Accounts** → OAuth, profile customization, session management
- **Go Analytics** → order tracking + real-time performance metrics
- **E2E Testing** → Playwright tests for critical user flows
- **WebSocket Support** → live cart updates, real-time inventory

💬 Elite Tech Shop marches toward its next era: **v5.0**.
Expect chaos builds, sharp release notes, and full‑stack grind energy.

---

## 🏆 Hall of Fame

First commenter gets immortalized here → [Discussion #3](https://github.com/arts009009009/Elite-Tech-Shop/discussions/3)

---

## 🏷️ Identity & Copyright

© arts009009009 2026 — Inventor of **Triple Backend (Java + Rust + Go)**
© Elite Tech 2026 — Chaos Collective Branding

---
