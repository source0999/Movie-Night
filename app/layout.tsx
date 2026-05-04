import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist_Mono, Inter, Orbitron } from "next/font/google";
import "./globals.css";
import AuthGate from "../components/AuthGate";
import ThemeSync from "../components/ThemeSync";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Movie Night",
  description: "Search the movie database and pick something for tonight.",
  icons: {
    // Next prefixes with basePath automatically when basePath is set (production export).
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('movieNight.theme');var v=['wisteria-glow','aura-green','aqua-lounge','lavender-dream','party-mode'];if(t&&v.indexOf(t)>-1){document.documentElement.setAttribute('data-theme',t);}else{document.documentElement.setAttribute('data-theme','wisteria-glow');}}catch(e){document.documentElement.setAttribute('data-theme','wisteria-glow');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="wisteria-glow"
      // Prevent hydration errors caused by browser/extension-injected attributes.
      suppressHydrationWarning
      className={`${inter.variable} ${orbitron.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="mn-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <ThemeSync />
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
