import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // v1 has no backend, so ship a fully static export (deployable anywhere).
  output: "export",
  // Static export can't use the optimizing image server.
  images: { unoptimized: true },
  // Emit /about-style trailing-slash dirs so static hosts serve clean URLs.
  trailingSlash: true,
};

export default nextConfig;
