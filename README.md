# ⚡ Elite Tech Shop

A **full-stack demo e-commerce application** with a **neon-dark Elite Tech vibe**.
React frontend, three independent backends (Rust + Java + Go), and a Minecraft Alpha voxel minigame — built for chaos, speed, and full-stack grind energy.

---

## ✨ Features

- **Product Catalog** → multi-language JSON (EN, AR, RU, FR, ES) served by Rust Axum on port 3002
- **Cart System** → add, remove, update quantity, persist via Go backend
- **Order Processing** → place orders, order history, status tracking via Go backend on port 3003
- **Wishlist** → save products for later using localStorage per user
- **Reviews & Ratings** → submit and view product reviews via Go backend
- **Rewards Program** → earn points, tier progression (Bronze → Platinum), redeem perks via Go backend
- **Discount Codes** → built-in codes (SAVE10, SAVE20, FLAT50, WELCOME5, BIG100) with validation via Go backend
- **Admin Dashboard** → analytics, product management, clear local storage with password confirmation
- **Admin Auth** → two-step login (Send Password → enter code) with OS notifications via Java on port 3001
- **Responsive UI** → cyberpunk-inspired CSS with neon styling, theme customizer, high contrast mode, reduced motion
- **Live Search** → debounced search with instant results
- **AI Shopping Assistant** → chatbot with FAQ responses
- **Live Support Chat** → simulated support with typing indicators
- **Minecraft Alpha Minigame** → Rust WASM voxel engine with WebGL rendering, survival physics, mining, placing, hotbar, trees, and ores
- **Multi-Language** → 10 languages (EN, AR, RU, FR, ES, DE, ZH, JA, PT, HI) with RTL support
- **Notifications** → real-time toast notifications for all user actions

---

## 🚀 Versioning

All versions follow **Major.Minor (Build X)** format:
- Patch field removed for clarity
- Build counter reflects raw tally of fixes + commits
- Minor increments mark new feature cycles
- No double digits in minor field → overflow rolls into next major

Example: `3.8 (Build 77)`

**Current Version:** `1.4 (Build 35)` | `4.7 (Build 382)`

---

## 🛠️ Install & Run Locally

> This guide covers the **latest version only including latest pre-release**.

1. Download the repo as a ZIP from GitHub and extract it

2. Navigate into the project folder:
   ```bash
   cd elite-shop
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Start everything (frontend + all backends):
   ```bash
   pnpm run dev
   ```

   Or start services individually:

   | Command                  | What it runs                  | Port        |
   |--------------------------|-------------------------------|-------------|
   | `pnpm run dev`           | Frontend + Rust + Java + Go   | 3000, 3001, 3002, 3003 |
   | `pnpm run backend`       | Rust + Java + Go only         | 3001, 3002, 3003 |
   | `pnpm run backend:rust`  | Rust products service         | 3002 |
   | `pnpm run backend:java`  | Java auth service             | 3001 |
   | `pnpm run backend:go`    | Go orders service             | 3003 |

5. Open [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│                Frontend (Next.js)                │
│              localhost:3000                      │
│  App Router · Cache Components · React Compiler  │
└──────┬──────────────┬──────────────┬─────────────┘
       │              │              │
       ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Rust/Axum  │ │  Java/Spring│ │  Go Backend │
│  :3002      │ │  :3001      │ │  :3003      │
│             │ │             │ │             │
│ • Products  │ │ • Auth      │ │ • Cart      │
│ • Categories│ │ • Login     │ │ • Orders    │
│ • Minigame  │ │ • Password  │ │ • Reviews   │
│   WASM      │ │   Reset     │ │ • Rewards   │
│             │ │             │ │ • Discounts │
└─────────────┘ └─────────────┘ └─────────────┘
```

**Request flow:** Frontend → Next.js rewrites → backend service → JSON response
All frontend→backend calls are logged with `[BACKEND]` prefix for debugging.

---

## 🔧 Prerequisites

| Tool       | Version  | Purpose                        |
|------------|----------|--------------------------------|
| Node       | 18+      | Frontend                       |
| pnpm       | 8+       | Package manager                |
| Rust       | stable   | WASM minigame + products       |
| Java       | 21 (compile) / 26 (run) | Spring Boot auth backend |
| Go         | 1.22+    | Orders + checkout backend      |
| wasm-pack  | latest   | Building WASM for minigame     |

---

## 🔮 Planned for v5.0

- **AI-Powered Recommendations** → smart product suggestions based on user activity
- **Offline Mode** → local caching for browsing without internet
- **Expanded Theme Engine** → more neon cyberpunk palettes + custom user themes
- **Enhanced Accounts** → stronger login, profile customization, and saved carts
- **Go-powered Analytics** → order tracking + performance metrics
- **E2E Testing** → Playwright tests for critical user flows

---

💬 Elite Tech Shop marches toward its next era: **v5.0**.
Expect chaos builds, sharp release notes, and full-stack grind energy.

---
##Showcase

![Hacker](Hacker.png)
![Fire](Fire.png)
![Fire](Default.png)
---

## 🚀 Tech Stack

<p>
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" alt="Rust" />
  <img src="https://img.shields.io/badge/Java-007396?style=for-the-badge&logo=java&logoColor=white" alt="Java" />
  <img src="https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Go" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/WASM-654FF0?style=for-the-badge&logo=webassembly&logoColor=white" alt="WASM" />
</p>

---

## 🏷️ Identity & Copyright

© arts009009009 2026 — Inventor of Triple Backend (Java + Rust + Go)

© Elite Tech 2026 — Chaos Collective Branding

If you cloned this repo, drop a comment or star so I know you’re here.
