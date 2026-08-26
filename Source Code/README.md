<div align="center">

# ⚡ Elite Tech Shop

### *The Triple Backend Fusion — Rust × Java × Go*

**A full‑stack demo e‑commerce application with a neon‑dark Elite Tech vibe.**

React 19 · **Triple Backend** (Rust + Java + Go) · Minecraft Alpha Voxel Minigame · 10‑language i18n

*Built for chaos, speed, and full‑stack grind energy.*

---

💬 <a href="https://github.com/arts009009009/Elite-Tech-Shop/discussions">Discussions</a> · ⭐ <a href="https://github.com/arts009009009/Elite-Tech-Shop">Star this repo</a> · 🏆 <a href="https://github.com/arts009009009/Elite-Tech-Shop/discussions/11">Hall of Fame</a>

---

<a href="https://nextjs.org"><img alt="Next.js" src="https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white" /></a>
<a href="https://react.dev"><img alt="React" src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" /></a>
<a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" /></a>
<a href="https://www.rust-lang.org/"><img alt="Rust" src="https://img.shields.io/badge/Rust-CE412B?style=for-the-badge&logo=rust&logoColor=white" /></a>
<a href="https://openjdk.org/"><img alt="Java" src="https://img.shields.io/badge/Java_21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" /></a>
<a href="https://golang.org/"><img alt="Go" src="https://img.shields.io/badge/Go_1.22-00ADD8?style=for-the-badge&logo=go&logoColor=white" /></a>
<a href="https://webassembly.org/"><img alt="WebAssembly" src="https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white" /></a>

---

## 🚀 Elite Tech Shop 5.0 Stable — Release Summary

**Highlights**
- Multi‑manager support: **npm, pnpm, yarn, bun, deno**  
- Next.js 16 frontend with React 19.2 and TypeScript 5.9  
- Performance boosts (Bun + pnpm friendly)  
- Cross‑platform: Linux, macOS, Windows, WSL  
- Browser compatibility: **Firefox + Chrome verified**  
- Extension compatibility: **uBlock Origin** tested and working  
- **Backends moved into the same repo** (no external folder; no more `cd` hassles)

---

<p>
<a href="https://www.npmjs.com/"><img alt="npm" src="https://img.shields.io/badge/npm-compatible-red?logo=npm" /></a>
<a href="https://pnpm.io/"><img alt="pnpm" src="https://img.shields.io/badge/pnpm-compatible-orange?logo=pnpm" /></a>
<a href="https://yarnpkg.com/"><img alt="yarn" src="https://img.shields.io/badge/yarn-compatible-blue?logo=yarn" /></a>
<a href="https://bun.sh/"><img alt="bun" src="https://img.shields.io/badge/bun-compatible-black?logo=bun" /></a>
<a href="https://deno.com/"><img alt="deno" src="https://img.shields.io/badge/deno-compatible-gray?logo=deno" /></a>
<a href="https://www.mozilla.org/firefox/"><img alt="firefox" src="https://img.shields.io/badge/firefox-supported-orange?logo=firefox" /></a>
<a href="https://www.google.com/chrome/"><img alt="chrome" src="https://img.shields.io/badge/chrome-supported-green?logo=google-chrome" /></a>
<a href="https://ublockorigin.com/"><img alt="uBlock Origin" src="https://img.shields.io/badge/uBlock-Origin-purple?logo=ublockorigin" /></a>
</p>

---

## 📸 Showcase

Hacker Theme · Fire Theme · Default Theme  
![Hacker](Hacker.png)
![Fire](Fire.png)
![Default](Default.png)

---

## ✨ Features

### 🛒 Core Commerce
- Product catalog (Rust/Axum)  
- Cart system (Go)  
- Checkout, orders, order history & PDF export (Go)  
- Wishlist (per‑user persistence)  
- Product comparison, flash sales, stock alerts

### 🎯 Engagement
- Reviews & ratings  
- Rewards & referral program  
- Discount codes and promo system

### 🔐 Admin & Analytics
- Admin dashboard (Go)  
- Admin auth & user management (Java/Spring)

### 🎨 UI & UX
- Multi‑theme system (Modern, Classic, Cyberpunk, Neon Green, Synthwave, Matrix, Vaporwave, Crimson, etc.)  
- Theme customizer (real‑time color/font/style)  
- Light/Dark/High contrast + `prefers-reduced-motion` respect  
- RTL support and 10 languages (EN, AR, RU, FR, ES, DE, ZH, JA, PT, HI)  
- Live search, voice search, AI shopping assistant, live chat, push notifications

### 💻 Frostbite OS (Mini Desktop)
Browser‑based mini OS: calculator, notepad, spreadsheet, presentation, word processor, media player, paint, task manager, web browser, WASM minigame

### Performance & Accessibility
- GPU acceleration with fallbacks  
- Lazy loading with Suspense boundaries  
- Keyboard navigation, skip‑to‑content, high contrast mode

---

## 🏗️ Architecture

<pre><code>
Frontend (Next.js 16) → localhost:3000
 ├─ Rust / Axum → localhost:3002  (Products API, multi‑language JSON)
 ├─ Java / Spring → localhost:3001 (Auth, admin)
 └─ Go → localhost:3003 (Cart, orders, reviews, rewards)
</code></pre>

Request flow: **Browser → Next.js API Routes (proxy) → Backend Service → JSON response**  
All backend calls logged with `[BACKEND]` prefix for debugging.

---

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+  
- Rust (stable) for WASM & Rust backend  
- Java 21+ (compile) / 26+ (run) for Spring Boot auth  
- Go 1.22+ for orders/cart  
- wasm-pack for WASM builds

### Quick Start (choose one package manager)

<div align="center">

#### pnpm (recommended)

<pre><code>
git clone [https://github.com/arts009009009/Elite-Tech-Shop.git](https://github.com/arts009009009/Elite-Tech-Shop.git)
cd Elite-Tech-Shop
pnpm install
pnpm run dev
# Frontend → http://localhost:3000
</code></pre>

#### npm

<pre><code>
git clone [https://github.com/arts009009009/Elite-Tech-Shop.git](https://github.com/arts009009009/Elite-Tech-Shop.git)
cd Elite-Tech-Shop
npm install
# If the repo uses pnpm workspace scripts, run via npx:
npx pnpm -w install
npx pnpm -w run dev
# Or run individual scripts if available:
npm run dev
</code></pre>

#### yarn

<pre><code>
git clone [https://github.com/arts009009009/Elite-Tech-Shop.git](https://github.com/arts009009009/Elite-Tech-Shop.git)
cd Elite-Tech-Shop
yarn install
# If using workspaces:
yarn workspaces focus --all
yarn dev
</code></pre>

#### bun

<pre><code>
git clone [https://github.com/arts009009009/Elite-Tech-Shop.git](https://github.com/arts009009009/Elite-Tech-Shop.git)
cd Elite-Tech-Shop
bun install
bun run dev
</code></pre>

#### Deno (task runner)

<pre><code>
git clone [https://github.com/arts009009009/Elite-Tech-Shop.git](https://github.com/arts009009009/Elite-Tech-Shop.git)
cd Elite-Tech-Shop
# If a deno task is provided for setup
deno task setup
deno task dev
</code></pre>

</div>

### Start individual services (all managers)

<pre><code>
# Start all backends (Rust + Java + Go)
pnpm run backend          # or npm run backend / yarn backend / bun run backend / deno task backend

# Start single backend services
pnpm run backend:rust     # Rust API → :3002
pnpm run backend:java     # Java Auth → :3001
pnpm run backend:go       # Go Orders/Cart → :3003
</code></pre>

### Production build notes

<pre><code>
# Frontend
cd frontend && pnpm run build   # or npm run build / yarn build / bun run build

# Rust WASM
cd backend/rust && wasm-pack build --target web

# Docker
docker-compose up --build
</code></pre>

**Notes**  
- If your environment defaults to a different package manager, use the matching commands above.  
- For monorepo/workspace setups some managers require `npx pnpm -w` or `yarn workspaces` equivalents — use the manager‑specific workspace commands if you see workspace errors.  
- All services are configured to run on ports `:3000` (frontend), `:3001` (Java), `:3002` (Rust), `:3003` (Go).

---

## 🔧 Infrastructure

- pnpm workspace (monorepo) with compatibility for npm, yarn, bun, deno  
- Turbopack for fast dev builds  
- Experimental React Compiler (Rust‑native in Turbopack)  
- Playwright E2E testing scaffold  
- Docker & Docker Compose support

---

## ⚠️ Breaking Changes (Next.js 16)

- `middleware.ts` renamed to `proxy.ts` (function renamed from `middleware` to `proxy`)

---

## 🧪 Quality

- ✅ TypeScript: 0 errors  
- ✅ ESLint: 0 errors (1 acceptable warning: `eval` in calculator)  
- ✅ Hydration: SSR‑safe, no mismatches  
- ✅ Auth Flow: Java‑backed register/login/logout  
- ✅ i18n Coverage: 130 translation keys, 10 languages

---

## 🏆 Hall of Fame

First commenter gets immortalized → <a href="https://github.com/arts009009009/Elite-Tech-Shop/discussions/3">Discussion #3</a>

---

## 🏷️ Identity & Copyright

© **arts009009009** 2026 — Inventor of Triple Backend (Java + Rust + Go)  
© **Elite Tech** 2026 — Chaos Collective Branding

---

**Chaos Verdict:** Elite Shop 5.0 Stable is here — fast, solid, universal, browser‑ready, extension‑safe, and backend‑simplified.

</div>
