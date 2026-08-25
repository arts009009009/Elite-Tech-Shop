# Elite Shop 5.0 Stable

Full-stack e-commerce platform with cyberpunk UI, built with Next.js 16, Spring Boot, Rust, and Go.

## Files

All source files are in a flat structure. File names use `__` (double underscore) to replace directory separators.

### Backend
| File | Description |
|------|-------------|
| backend__go__main.go | Go server (cart, orders, wishlist, reviews, API) |
| backend__go__main_test.go | Go unit tests |
| backend__rust__src__main.rs | Rust API server (products) |
| backend__rust__products.json | Product catalog data |
| backend__src__main__java__com__eliteshop__EliteShopApplication.java | Java app entry point |
| backend__src__main__java__com__eliteshop__controller__*.java | API controllers |
| backend__src__main__java__com__eliteshop__service__*.java | Business logic |

### Frontend - App (Pages & Routes)
| File | Description |
|------|-------------|
| frontend__app__page.tsx | Home page with products |
| frontend__app__layout.tsx | Root layout |
| frontend__app__globals.css | Global styles |
| frontend__app__products__page.tsx | Product catalog |
| frontend__app__product__[id]__page.tsx | Product detail |
| frontend__app__cart__page.tsx | Shopping cart |
| frontend__app__checkout__page.tsx | Checkout flow |
| frontend__app__login__page.tsx / signup__page.tsx | Auth pages |
| frontend__app__admin__page.tsx | Admin login |
| frontend__app__orders__page.tsx | Order history |
| frontend__app__frostbite-os__*.tsx | Mini desktop apps |

### Frontend - Components
| File | Description |
|------|-------------|
| frontend__components__Navbar.tsx | Main navigation |
| frontend__components__ProductCard.tsx | Product display card |
| frontend__components__AIAssistant.tsx | AI chatbot |
| frontend__components__Chat.tsx | Live chat support |
| frontend__components__ReviewForm.tsx | Product reviews |
| frontend__components__Recommendations.tsx | AI recommendations |
| frontend__components__LoadingScreen.tsx | Loading animation |

### Frontend - Context & Lib
| File | Description |
|------|-------------|
| frontend__context__*.tsx | React context providers |
| frontend__lib__api-fetch.ts | API client |
| frontend__lib__utils.ts | Utility functions |
| frontend__data__products.json | Product catalog |

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Java**: Spring Boot, MongoDB
- **Rust**: Axum, Tokio
- **Go**: net/http, Gorilla Mux
- **Testing**: Playwright (E2E)

## Quick Start

```bash
# Install dependencies (supports npm, pnpm, yarn, bun)
yarn install

# Start all services
yarn dev
```

## License

MIT
