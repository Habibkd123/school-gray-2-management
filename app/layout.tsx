import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { AppProvider } from "./context/store";
import { AuthProvider } from "./context/auth";
import { ThemeProvider } from "./providers";
import { RootThemeProvider } from "./components/RootThemeProvider";
import { ServerThemeStyles } from "./components/ServerThemeStyles";

// ── Font ─────────────────────────────────────────────────────────────
// display:'swap' ensures text stays visible in the fallback font while
// Roboto loads — avoids invisible-text during font load (FOIT).
// preload:true adds a <link rel="preload"> in <head> for the primary weight.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: true,
  fallback: ["system-ui", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Portal | My School Life",
  description: "A premium, unified dashboard for managing school operations, attendance, grading, billing, and scheduling.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* DNS prefetch for Cloudinary CDN used for uploaded images / avatars */}
        <link rel="dns-prefetch" href="//res.cloudinary.com" />
        <link rel="dns-prefetch" href="//ui-avatars.com" />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <ServerThemeStyles />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <RootThemeProvider>
            <AuthProvider>
              <AppProvider>{children}</AppProvider>
            </AuthProvider>
          </RootThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
