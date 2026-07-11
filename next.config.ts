import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Security / Bandwidth ─────────────────────────────────────────
  poweredByHeader: false,   // remove "X-Powered-By: Next.js" from every response
  compress: true,            // enable gzip/brotli compression for all responses

  allowedDevOrigins: ["moustache-dentist-twilight.ngrok-free.dev", "https://school-management-one-ivory.vercel.app/"],

  // ── Increase body size limit for file uploads (10MB) ─────────────
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Tree-shake large packages — only import the exports that are actually used
    // instead of bundling the entire library. Cuts JS payload significantly.
    optimizePackageImports: [
      "lucide-react",   // 1500+ icons → only used icons
      "framer-motion",  // full animation library → used components only
      "xlsx",           // spreadsheet library → used functions only
    ],
  },

  // ── Image optimisation ───────────────────────────────────────────
  images: {
    dangerouslyAllowSVG: true,
    // Serve AVIF first (50% smaller than WebP), then WebP, fallback to original
    formats: ["image/avif", "image/webp"],
    // Cache optimised images for 7 days — avatars and logos rarely change
    minimumCacheTTL: 604_800,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "http",  hostname: "localhost" },
    ],
  },

  // ── HTTP Cache Headers ────────────────────────────────────────────
  // Immutable static chunks get a 1-year cache (hash in filename guarantees
  // uniqueness on every build). Media and fonts get 7-day caches.
  async headers() {
    if (process.env.NODE_ENV === "development") return [];
    return [
      {
        // Next.js content-hashed JS/CSS chunks — safe to cache forever
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Public static assets (fonts, images in /public)
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Favicon and other root-level static files
        source: "/:file(favicon.ico|robots.txt|sitemap.xml)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
    ];
  },

  // ── Redirects ────────────────────────────────────────────────────
  async redirects() {
    return [
      { source: "/fees-collection", destination: "/fees-collection/collect-fees", permanent: false },
      { source: "/academic",        destination: "/academic/class-room",          permanent: false },
      { source: "/examination",     destination: "/examination/exam",             permanent: false },
      { source: "/leave",           destination: "/leave/apply",                  permanent: false },
      { source: "/reports",         destination: "/reports/fees-report",          permanent: false },
    ];
  },
};

export default nextConfig;
