import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — there's an unrelated pnpm-workspace.yaml on the Desktop.
  turbopack: {
    root: __dirname,
  },
  // Keep the dev overlay button out of screenshots.
  devIndicators: false,
};

export default nextConfig;
