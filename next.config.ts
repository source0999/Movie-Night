import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // GitHub Pages repo URL subpath: https://<user>.github.io/Movie-Night/
  basePath: "/Movie-Night",
  assetPrefix: "/Movie-Night/",
  // GitHub Pages static-only; disable Next.js image optimization.
  images: { unoptimized: true },
};

export default nextConfig;
