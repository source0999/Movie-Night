import type { NextConfig } from "next";

const isProdBuild = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  // GitHub Pages uses /Movie-Night — only apply in production builds so `next dev`
  // serves from http://localhost:3000/ (no 404 on /).
  ...(isProdBuild
    ? {
        basePath: "/Movie-Night",
        assetPrefix: "/Movie-Night/",
      }
    : {}),
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
