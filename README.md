
<div align="center">

<a name="top"></a>

# ⚡ Elite Tech Shop

### *The Triple Backend Fusion — Rust × Java × Go*

<br>

**A full‑stack demo e‑commerce application with a neon‑dark Elite Tech vibe.**

React 19 · **Triple Backend** (Rust + Java + Go) · Minecraft Alpha Voxel Minigame · 10‑Language i18n

*Built for chaos, speed, and full‑stack grind energy.*

<br>

---

<br>

💬 **Cloned this repo?** Drop feedback in [Discussions](https://github.com/arts009009009/Elite-Tech-Shop/discussions) &nbsp;|&nbsp;
⭐ **Like this repo?** Smash that star &nbsp;|&nbsp;
🏆 **First commenter** gets immortalized in the [Hall of Fame](https://github.com/arts009009009/Elite-Tech-Shop/discussions/11)

<br>

---

<br>

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-CE412B?style=for-the-badge&logo=rust&logoColor=white)
![Java](https://img.shields.io/badge/Java_21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Go](https://img.shields.io/badge/Go_1.22-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

<br>

### 📌 `4.9 (Build 544)` &nbsp;|&nbsp; 🌐 10 Languages &nbsp;|&nbsp; 🎮 WASM Minigame &nbsp;|&nbsp; 🧩 130+ Translations

</div>

---

<div align="center">

## 📸 Showcase

</div>

### 🖥️ Hacker Theme

<div align="center">

![Hacker Theme](Hacker.png)

</div>

---

### 🔥 Fire Theme

<div align="center">

![Fire Theme](Fire.png)

</div>

---

### 🎨 Default Theme

<div align="center">

![Default Theme](Default.png)

</div>

---

<div align="center">

## ✨ Features

</div>

<details>
<summary><b>🛒 Core Commerce</b></summary>
<br>

| Feature | Details | Backend |
|:-------:|:-------:|:-------:|
| **Product Catalog** | 50+ products, multi‑language JSON (EN, AR, RU, FR, ES, DE, ZH, JA, PT, HI) | Rust/Axum `:3002` |
| **Cart System** | Add, remove, update quantity, persist across sessions | Go `:3003` |
| **Order Processing** | Full history + status tracking | Go `:3003` |
| **Wishlist** | Save products locally per user | localStorage |
| **Checkout Flow** | Debounce protection, stock validation, redirect to orders | Go `:3003` |

</details>

<details>
<summary><b>🎯 Engagement</b></summary>
<br>

| Feature | Details | Backend |
|:-------:|:-------:|:-------:|
| **Reviews & Ratings** | Submit and view product reviews | Go `:3003` |
| **Rewards Program** | Earn points, tier progression (Bronze → Silver → Gold → Platinum), redeem perks | Go `:3003` |
| **Discount Codes** | Built‑in validation: `SAVE10` `SAVE20` `FLAT50` `WELCOME5` `BIG100` | Go `:3003` |

</details>

<details>
<summary><b>🔐 Admin & Analytics</b></summary>
<br>

| Feature | Details | Backend |
|:-------:|:-------:|:-------:|
| **Admin Dashboard** | Analytics, product CRUD, secure storage clear | Go `:3003` |
| **Admin Auth** | Two‑step login with OS notifications | Java/Spring `:3001` |

</details>

<details>
<summary><b>🎨 UI & UX</b></summary>
<br>

| Feature | Details |
|:-------:|:-------:|
| **Responsive UI** | Cyberpunk CSS, theme customizer (11 palettes), high contrast, reduced motion |
| **Live Search** | Debounced instant results |
| **AI Shopping Assistant** | FAQ chatbot with smart responses |
| **Live Support Chat** | Simulated support with typing indicators |
| **Multi‑Language** | 10 languages with full RTL support (Arabic) |
| **Push Notifications** | Real‑time toast alerts + browser push with infinite test mode |
| **Offline Indicator** | Live connection status display |

</details>

<details>
<summary><b>💻 Chaos OS</b></summary>
<br>

| App | Description |
|:---:|:-----------:|
| 🎮 **Minecraft Minigame** | Rust WASM voxel engine, survival physics, arrow/WASD controls, pause overlay |
| 📊 **Excel Clone** | Spreadsheet with cell styling |
| 🎨 **Paint App** | Fullscreen canvas drawing |
| 📄 **Word Editor** | Rich text editor with formatting toolbar |
| 🧮 **Calculator** | Basic calculator with history |
| 📝 **Notepad** | Simple text editor |
| 🕐 **Clock** | Digital clock display |
| ✅ **Tasks** | Todo list manager |
| 🎵 **Media Player** | Music player UI |

</details>

---

<div align="center">

## 🚀 Versioning

</div>

<div align="center">

All versions follow **`Major.Minor (Build X)`** format.

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

</div>

<div align="center">

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js 16)                      │
│                localhost:3000 · Turbopack · React 19            │
│          App Router · TypeScript · i18n (130 keys)              │
└─────────────┬───────────────────┬───────────────────┬───────────┘
              │                   │                   │
              ▼                   ▼                   ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│    🦀 Rust / Axum   │ │   ☕ Java / Spring   │ │    🐹 Go Backend    │
│   localhost:3002    │ │   localhost:3001    │ │   localhost:3003    │
│                     │ │                     │ │                     │
│  • Products API     │ │  • Register/Login   │ │  • Cart CRUD        │
│  • Categories       │ │  • Password Reset   │ │  • Orders           │
│  • Minigame WASM    │ │  • Admin Verify     │ │  • Reviews          │
│  • Multi-language   │ │  • Session Mgmt     │ │  • Rewards/Tiers    │
│    JSON catalog     │ │  • OS Notifications │ │  • Discount Codes   │
│                     │ │                     │ │                     │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

**Request Flow:**
```
Browser ──► Next.js API Routes (proxy) ──► Backend Service ──► JSON Response
```

All backend calls logged with `[BACKEND]` prefix for debugging.

</div>

---

<div align="center">

## 📦 Installation & Setup

</div>

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
pnpm run backend          # All backends (Rust + Java + Go) → :3001, :3002, :3003
pnpm run backend:rust     # Products API                    → :3002
pnpm run backend:java     # Auth Service                    → :3001
pnpm run backend:go       # Orders + Cart API               → :3003
pnpm run dev              # Frontend only                   → :3000
```

### Build for Production

```bash
# Frontend
cd frontend && pnpm run build

# Rust WASM module
cd backend/rust && wasm-pack build --target web
```

---

<div align="center">

## 🧪 Quality

</div>

| Check | Status |
|:-----:|:------:|
| **TypeScript** | ✅ 0 errors |
| **ESLint** | ✅ 0 errors (1 acceptable warning: `eval` in calculator) |
| **Hydration** | ✅ SSR-safe, no mismatches |
| **Auth Flow** | ✅ Full Java-backed register/login/logout |
| **i18n Coverage** | ✅ 130 translation keys, 10 languages, full RTL |

---

<div align="center">

## 🔧 Tech Stack

</div>

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-CE412B?style=for-the-badge&logo=rust&logoColor=white)
![Java](https://img.shields.io/badge/Java_21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Go](https://img.shields.io/badge/Go_1.22-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

</div>

---

<div align="center">

## 🔮 Roadmap → v5.0

</div>

| Feature | Description |
|:-------:|:-----------:|
| 🤖 **AI Recommendations** | Smart product suggestions based on user activity |
| 📴 **Offline Mode** | Service worker + cached catalog browsing |
| 🎨 **Expanded Theme Engine** | More cyberpunk palettes + custom theme builder |
| 👤 **Enhanced Accounts** | OAuth, profile customization, session management |
| 📈 **Go Analytics** | Order tracking + real‑time performance metrics |
| 🧪 **E2E Testing** | Playwright tests for critical user flows |
| 🔌 **WebSocket Support** | Live cart updates, real‑time inventory |

<div align="center">

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

<br>

[⬆ Back to Top](#top)

</div>
