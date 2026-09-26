import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "better-sqlite3",
    "playwright-core",
    "@browserbasehq/sdk",
    "llamaindex",
    "spectrum-ts",
  ],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
