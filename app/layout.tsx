import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Orbitron } from "next/font/google";
import "./globals.css";
import AuthGate from "../components/AuthGate";

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
  description: "Search TMDB and pick a movie for tonight.",
  icons: {
    // Must include basePath so it resolves from sub-pages on GitHub Pages.
    icon: "/Movie-Night/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // Prevent hydration errors caused by browser/extension-injected attributes.
      suppressHydrationWarning
      className={`${inter.variable} ${orbitron.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
