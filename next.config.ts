import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Skip Next's bundled eslint pass during `next build`. The pinned
  // eslint-config-next@15.0.3 plus eslint@9 combo trips the unused-expressions
  // rule loader; we still run typecheck and can run lint separately.
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
