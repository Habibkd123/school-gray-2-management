import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "./context/store";
import { AuthProvider } from "./context/auth";
import { ThemeProvider } from "./providers";
import { RootThemeProvider } from "./components/RootThemeProvider";
import { ServerThemeStyles } from "./components/ServerThemeStyles";

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
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        {/* Roboto font — loaded at runtime via CDN so build is not blocked */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        {/* DNS prefetch for CDNs used for uploaded images / avatars */}
        <link rel="dns-prefetch" href="//res.cloudinary.com" />
        <link rel="dns-prefetch" href="//ui-avatars.com" />
      </head>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <ServerThemeStyles />
        <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
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
