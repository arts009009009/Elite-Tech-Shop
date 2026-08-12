
<div align="center">

# ⚡ Elite Tech Shop

**A full‑stack demo e‑commerce application with a neon‑dark Elite Tech vibe.**

React 19 frontend · **Triple Backend Fusion** (Rust + Java + Go) · Minecraft Alpha Voxel Minigame

Built for chaos, speed, and full‑stack grind energy.

---

💬 **Cloned this repo?** Drop feedback in [Discussions](https://github.com/arts009009009/Elite-Tech-Shop/discussions)!
⭐ **Like this repo?** Smash that star!
🏆 **First commenter** gets immortalized in the [Hall of Fame](https://github.com/arts009009009/Elite-Tech-Shop/discussions/11)!

---

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-CE412B?style=for-the-badge&logo=rust&logoColor=white)
![Java](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Go](https://img.shields.io/badge/Go-1.22-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white)

**Current Version:** `4.9 (Build 544)`

</div>

---

<div align="center">

## ✨ Features

### 🛒 Core Commerce

| Feature | Details |
|:-------:|:-------:|
| **Product Catalog** | 50+ products, multi‑language JSON (EN, AR, RU, FR, ES, DE, ZH, JA, PT, HI) via Rust Axum |
| **Cart System** | Add, remove, update quantity, persist via Go backend |
| **Order Processing** | History + status tracking via Go backend |
| **Wishlist** | Save products locally per user |
| **Checkout Flow** | Debounce protection, stock validation, redirect to orders |

### 🎯 Engagement

| Feature | Details |
|:-------:|:-------:|
| **Reviews & Ratings** | Submit/view reviews per product via Go backend |
| **Rewards Program** | Earn points, tier progression (Bronze → Platinum), redeem perks |
| **Discount Codes** | Built‑in codes: `SAVE10` `SAVE20` `FLAT50` `WELCOME5` `BIG100` |

### 🔐 Admin & Analytics

| Feature | Details |
|:-------:|:-------:|
| **Admin Dashboard** | Analytics, product management, secure local storage clear |
| **Admin Auth** | Two‑step login with OS notifications via Java backend |

### 🎨 UI & UX

| Feature | Details |
|:-------:|:-------:|
| **Responsive UI** | Cyberpunk CSS, theme customizer, high contrast, reduced motion |
| **Live Search** | Debounced instant results |
| **AI Shopping Assistant** | FAQ chatbot with smart responses |
| **Live Support Chat** | Simulated support with typing indicators |
| **Multi‑Language** | 10 languages + full RTL support |
| **Notifications** | Real‑time toast alerts + push notification support |
| **Offline Indicator** | Connection status display |

### 💻 Chaos OS

| Feature | Details |
|:-------:|:-------:|
| **Minecraft Minigame** | Rust WASM voxel engine, survival physics, arrow/WASD controls |
| **Excel Clone** | Spreadsheet with cell styling |
| **Paint App** | Fullscreen canvas drawing |
| **Word Editor** | Rich text editor with formatting |
| **Calculator** | Basic calculator with history |
| **Notepad** | Simple text editor |
| **Clock** | Digital clock display |
| **Tasks** | Todo list manager |
| **Media Player** | Music player UI |

</div>

---

<div align="center">

## 🚀 Versioning

All versions follow **`Major.Minor (Build X)`** format:

| Rule | Description |
|:----:|:-----------:|
| Patch field | Removed for clarity |
| Build counter | Raw tally of fixes + commits |
| Minor increments | New feature cycles |
| Overflow | Rolls into next major |

**Current Version:** `4.9 (Build 544)`

</div>

---

<div align="center">

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (Next.js 16)                     │
│                 localhost:3000 · Turbopack                   │
│       App Router · React 19 · TypeScript · i18n             │
└───────────┬──────────────────┬──────────────────┬───────────┘
            │                  │                  │
            ▼                  ▼                  ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│    Rust / Axum    │ │   Java / Spring   │ │    Go Backend     │
│    localhost:3002 │ │    localhost:3001 │ │    localhost:3003 │
│                   │ │                   │ │                   │
│  • Products       │ │  • Auth           │ │  • Cart           │
│  • Categories     │ │  • Login          │ │  • Orders         │
│  • Minigame WASM  │ │  • Password Reset │ │  • Reviews        │
│                   │ │  • Admin Verify   │ │  • Rewards        │
│                   │ │                   │ │  • Discounts      │
└───────────────────┘ └───────────────────┘ └───────────────────┘
```

**Request Flow:**
```
Browser → Next.js API Routes (proxy) → Backend Service → JSON Response
```

All backend calls logged with `[BACKEND]` prefix for debugging.

</div>

---

<div align="center">

## 📦 Installation & Setup

### Prerequisites

| Tool | Version | Purpose |
|:----:|:-------:|:-------:|
| **Node.js** | 18+ | Frontend runtime |
| **pnpm** | 8+ | Package manager (monorepo) |
| **Rust** | stable | WASM minigame + products API |
| **Java** | 21 (compile) / 26 (run) | Spring Boot auth backend |
| **Go** | 1.22+ | Orders + checkout backend |
| **wasm-pack** | latest | Building WASM for minigame |

### Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/arts009009009/Elite-Tech-Shop.git
cd Elite-Tech-Shop

# 2. Install all dependencies
pnpm install

# 3. Start everything (frontend + all 3 backends)
pnpm run dev

# 4. Open in browser
open http://localhost:3000
```

### Individual Services

```bash
# Start all backends only (Rust + Java + Go)
pnpm run backend

# Start services individually
pnpm run backend:rust    # Products API       → :3002
pnpm run backend:java    # Auth Service        → :3001
pnpm run backend:go      # Orders + Cart API   → :3003
pnpm run dev             # Frontend only       → :3000
```

### Build for Production

```bash
# Build frontend
cd frontend
pnpm run build

# Build Rust WASM module
cd backend/rust
wasm-pack build --target web
```

</div>

---

<div align="center">

## 🧪 Quality

| Check | Status |
|:-----:|:------:|
| **TypeScript** | ✅ 0 errors |
| **ESLint** | ✅ 0 errors (1 acceptable warning: `eval` in calculator) |
| **Hydration** | ✅ SSR-safe, no mismatches |
| **Auth Flow** | ✅ Full Java-backed register/login/logout |
| **i18n Coverage** | ✅ 130 translation keys, 10 languages |

</div>

---

<div align="center">

## 🔧 Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-CE412B?style=for-the-badge&logo=rust&logoColor=white)
![Java](https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Go](https://img.shields.io/badge/Go-1.22-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

</div>

---

<div align="center">

## 🔮 Roadmap → v5.0

| Feature | Description |
|:-------:|:-----------:|
| **AI Recommendations** | Smart product suggestions based on user activity |
| **Offline Mode** | Service worker + cached catalog browsing |
| **Expanded Theme Engine** | More cyberpunk palettes + custom theme builder |
| **Enhanced Accounts** | OAuth, profile customization, session management |
| **Go Analytics** | Order tracking + real‑time performance metrics |
| **E2E Testing** | Playwright tests for critical user flows |
| **WebSocket Support** | Live cart updates, real‑time inventory |

> 💬 Elite Tech Shop marches toward its next era: **v5.0**.
> Expect chaos builds, sharp release notes, and full‑stack grind energy.

</div>

---

<div align="center">

## 🏆 Hall of Fame

First commenter gets immortalized here → [Discussion #3](https://github.com/arts009009009/Elite-Tech-Shop/discussions/3)

---

## 🏷️ Identity & Copyright

© **arts009009009** 2026 — Inventor of **Triple Backend (Java + Rust + Go)**
© **Elite Tech** 2026 — Chaos Collective Branding

</div>
