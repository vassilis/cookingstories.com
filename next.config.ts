import type { NextConfig } from "next";

const r2PublicUrl = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL) : null;

const nextConfig: NextConfig = {
  // Self-hosted on Hetzner via Coolify: ship a minimal Node server in the Docker image.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: r2PublicUrl
      ? [{ protocol: r2PublicUrl.protocol.replace(":", "") as "https" | "http", hostname: r2PublicUrl.hostname }]
      : [],
  },
};

export default nextConfig;
