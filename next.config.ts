import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — there's an unrelated pnpm-workspace.yaml on the Desktop.
  turbopack: {
    root: __dirname,
  },
  // Keep the dev overlay button out of screenshots.
  devIndicators: false,
  // `next dev` (Next 16) blocks /_next/* asset + HMR requests from origins other
  // than localhost — which breaks styling/JS when friends open the LAN IP or a
  // tunnel URL. Allow the ones used for playtests. (A production build —
  // `next build && next start` — has no such restriction.)
  allowedDevOrigins: [
    "172.18.8.208",
    "*.loca.lt",
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.io",
  ],
};

export default nextConfig;
