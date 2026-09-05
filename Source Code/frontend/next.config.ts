import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  // React Compiler (native Rust in Turbopack, Babel fallback)
  reactCompiler: true,

  // Controls auto-generation of AGENTS.md / CLAUDE.md
  agentRules: true,

  images: {
    deviceSizes: [640, 768, 1024, 1280, 1536],
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowLocalIP: false,
    maximumRedirects: 3,
    minimumCacheTTL: 14400,
    maximumResponseBody: 8 * 1024 * 1024,
    maximumDiskCacheSize: 256 * 1024 * 1024,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
      allowedOrigins: [],
    },

    // Turbopack memory eviction strategy
    turbopackMemoryEviction: "auto",

    // Persistent filesystem cache between dev sessions
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,

    // Native Rust React Compiler — no Babel plugin needed
    turbopackRustReactCompiler: true,

    // Tree-shaking optimizations
    turbopackRemoveUnusedImports: true,
    turbopackRemoveUnusedExports: true,
    turbopackInferModuleSideEffects: true,
    turbopackScopeHoisting: true,
  },

  async rewrites() {
    return [
      {
        source: "/api/products/:path*",
        destination: "http://localhost:3002/api/products/:path*",
      },
      {
        source: "/api/products",
        destination: "http://localhost:3002/api/products",
      },
      {
        source: "/api/categories",
        destination: "http://localhost:3002/api/categories",
      },
      {
        source: "/api/health",
        destination: "http://localhost:3002/api/health",
      },
      {
        source: "/api/auth/:path*",
        destination: "http://localhost:3001/api/auth/:path*",
      },
      {
        source: "/api/cart/:path*",
        destination: "http://localhost:3003/api/cart/:path*",
      },
      {
        source: "/api/cart",
        destination: "http://localhost:3003/api/cart",
      },
      {
        source: "/api/wishlist/:path*",
        destination: "http://localhost:3003/api/wishlist/:path*",
      },
      {
        source: "/api/wishlist",
        destination: "http://localhost:3003/api/wishlist",
      },
      {
        source: "/api/orders/:path*",
        destination: "http://localhost:3003/api/orders/:path*",
      },
      {
        source: "/api/orders",
        destination: "http://localhost:3003/api/orders",
      },
      {
        source: "/api/reviews",
        destination: "http://localhost:3003/api/reviews",
      },
      {
        source: "/api/rewards/redeem",
        destination: "http://localhost:3003/api/rewards/redeem",
      },
      {
        source: "/api/rewards",
        destination: "http://localhost:3003/api/rewards",
      },
      {
        source: "/api/discounts/:path*",
        destination: "http://localhost:3003/api/discounts/:path*",
      },
      {
        source: "/api/admin/:path*",
        destination: "http://localhost:3003/api/admin/:path*",
      },
      {
        source: "/api/admin",
        destination: "http://localhost:3003/api/admin",
      },
      {
        source: "/api/inventory",
        destination: "http://localhost:3003/api/inventory",
      },
      {
        source: "/api/analytics/:path*",
        destination: "http://localhost:3003/api/analytics/:path*",
      },
      {
        source: "/api/analytics",
        destination: "http://localhost:3003/api/analytics",
      },
      {
        source: "/api/recommendations",
        destination: "http://localhost:3003/api/recommendations",
      },
      {
        source: "/api/activity",
        destination: "http://localhost:3003/api/activity",
      },
      {
        source: "/api/profile/password",
        destination: "http://localhost:3003/api/profile/password",
      },
      {
        source: "/api/profile",
        destination: "http://localhost:3003/api/profile",
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/api/products/:path*",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" },
        ],
      },
      {
        source: "/api/products",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" },
        ],
      },
      {
        source: "/api/categories",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=120, stale-while-revalidate=600" },
        ],
      },
      {
        source: "/api/recommendations",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=300, stale-while-revalidate=600" },
        ],
      },
      {
        source: "/api/health",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=10, stale-while-revalidate=30" },
        ],
      },
    ];
  },
};

export default nextConfig;
