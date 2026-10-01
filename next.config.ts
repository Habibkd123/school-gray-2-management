import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,   // prevents dev double-mounting and spurious canceled requests
  // ── Security / Bandwidth ─────────────────────────────────────────
  poweredByHeader: false,   // removes "X-Powered-By: Next.js" header (security + bandwidth)
  compress: true,           // enable gzip/brotli compression for HTML/SSR responses

  allowedDevOrigins: [
    ...(process.env.NEXT_PUBLIC_DEV_ORIGIN ? [process.env.NEXT_PUBLIC_DEV_ORIGIN] : []),
    "https://school-management-one-ivory.vercel.app/",
  ],

  // ── Server External Packages ──────────────────────────────────────
  // Keep heavy packages out of server bundle chunks to reduce memory & cold starts.
  // These are required at runtime but should NOT be bundled by webpack.
  serverExternalPackages: ["pdfkit", "nodemailer", "bcryptjs", "mongoose"],

  // ── Experimental ────────────────────────────────────────────────
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // Tree-shake large packages — only bundle the exports that are actually used.
    // Client-side packages only — server packages (mongoose, cloudinary) are in serverExternalPackages.
    optimizePackageImports: [
      "lucide-react",    // 1500+ icons → only used icons bundled
      "framer-motion",   // full animation library → used components only
      "xlsx",            // spreadsheet library → used functions only
    ],
    // Client-router cache: controls how long prefetched pages stay in memory.
    // layout: 300s  — shared layout (sidebar, header) never re-fetches during a session.
    // page: 30s     — page content is fresh for 30s; back-navigation is instant.
    staleTimes: {
      dynamic: 30,    // pages with dynamic data: 30s stale-while-revalidate
      static: 300,    // fully static pages: 5 minutes
    },
    // Partial pre-rendering: static shell + streaming dynamic parts
    // ppr: "incremental",  // uncomment once stable in your Next version
  },


  // ── Turbopack (Next.js 16 default dev bundler) ───────────────────
  // Empty config acknowledges Turbopack is active — no custom loaders
  // needed for this project. Silences the Turbopack+webpack warning.
  turbopack: {},

  // ── Webpack Optimizations (production builds: next build) ────────
  webpack(config, { isServer }) {
    // Module ID determinism → stable chunk hashes across rebuilds
    config.optimization = {
      ...config.optimization,
      moduleIds: "deterministic",
      // Merge small chunks into larger ones — fewer round trips
      mergeDuplicateChunks: true,
      // On server, keep a single chunk per route to minimise module-load overhead
      ...(isServer ? {} : {
        splitChunks: {
          ...(config.optimization?.splitChunks as object || {}),
          chunks: "all",
          maxInitialRequests: 25,
          minSize: 20_000,
          cacheGroups: {
            // Vendor group: big stable node_modules chunks with long cache TTL
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
              priority: 10,
            },
            // Framer Motion in its own chunk — heavy but cached separately
            framer: {
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
              name: "framer-motion",
              chunks: "all",
              priority: 20,
            },
          },
        },
      }),
    };

    return config;
  },

  // ── Image Optimisation ───────────────────────────────────────────
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
        // Immutable Next.js built static chunks (hashed filenames)
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        // Public fonts (served from /public/fonts/)
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
      {
        // Uploaded media files
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        // Favicon, robots.txt, sitemap.xml
        source: "/:file(favicon.ico|robots.txt|sitemap.xml)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
      {
        // Security headers for all pages
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options",     value: "nosniff" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },

  // ── Redirects ────────────────────────────────────────────────────
  async redirects() {
    return [
      { source: "/signup",          destination: "/register",                     permanent: true  },
      { source: "/fees-collection", destination: "/fees-collection/collect-fees", permanent: false },
      { source: "/academic",        destination: "/academic/class-room",           permanent: false },
      { source: "/examination",     destination: "/examination/exam",              permanent: false },
      { source: "/leave",           destination: "/leave/apply",                   permanent: false },
      { source: "/reports",         destination: "/reports/fees-report",           permanent: false },
    ];
  },
};

export default nextConfig;
