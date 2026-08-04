
# ⚡ Elite Tech Shop

A **full-stack demo e‑commerce application** with a **neon‑dark Elite Tech vibe**.
React frontend, Rust + Java backends, and a Minecraft Alpha voxel minigame — built for chaos, speed, and full‑stack grind energy.

---

## ✨ Features

- **Product Catalog** → multi-language JSON (EN, AR, RU, FR, ES) served by Rust
- **Cart System** → add, remove, and persist items
- **Watchlist** → save products for later using localStorage
- **Responsive UI** → cyberpunk‑inspired CSS with neon styling
- **Admin Auth** → 6-digit password login with OS notifications (Linux/Windows/macOS)
- **Minecraft Alpha Minigame** → Rust WASM voxel engine with WebGL rendering, survival physics, mining, placing, hotbar, trees, and ores

---

## 🚀 Versioning

All versions follow **Major.Minor (Build X)** format:
- Patch field removed for clarity
- Build counter reflects raw tally of fixes + commits
- Minor increments mark new feature cycles
- No double digits in minor field → overflow rolls into next major

Example: `3.8 (Build 77)`

**Current Version:** `1.4 (Build 24)` | `4.7 (Build 347)`

---

## 🛠️ Install & Run Locally

> This guide covers the **latest version only**.

1. Download the repo as a ZIP from GitHub and extract it

2. Navigate into the project folder:
   ```bash
   cd elite-shop
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Start everything (frontend + both backends):
   ```bash
   pnpm run dev
   ```

   Or start services individually:

   | Command              | What it runs              | Port |
   |----------------------|---------------------------|------|
   | `pnpm run dev`       | Frontend + Rust + Java    | 3000, 3001, 3002 |
   | `pnpm run backend`   | Rust + Java only          | 3001, 3002 |
   | `pnpm run backend:rust` | Rust products service  | 3002 |
   | `pnpm run backend:java` | Java auth service      | 3001 |

5. Open [http://localhost:3000](http://localhost:3000)

---

## 🔧 Prerequisites

| Tool    | Version  | Purpose                     |
|---------|----------|-----------------------------|
| Node    | 18+      | Frontend                    |
| pnpm    | 8+       | Package manager             |
| Rust    | stable   | WASM minigame + products    |
| Java    | 21 (compile) / 26 (run) | Spring Boot auth backend |
| wasm-pack | latest | Building WASM for minigame  |

---

## 🔮 Planned for v5.0

- **AI‑Powered Recommendations** → smart product suggestions based on user activity
- **Offline Mode** → local caching for browsing without internet
- **Expanded Theme Engine** → more neon cyberpunk palettes + custom user themes
- **Multi‑Language Support** → improved translations + locale detection
- **Enhanced Accounts** → stronger login, profile customization, and saved carts

---

💬 Elite Tech Shop marches toward its next era: **v5.0**.
Expect chaos builds, sharp release notes, and full‑stack grind energy.

---

## 🚀 Tech Stack

```
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Java](https://img.shields.io/badge/Java-007396?style=for-the-badge&logo=java&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
```
