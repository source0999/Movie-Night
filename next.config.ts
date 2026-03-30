import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // GitHub Pages static-only; disable Next.js image optimization.
  images: { unoptimized: true },
};

export default nextConfig;
