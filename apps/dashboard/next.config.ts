import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
    workerThreads: false,
  },

  output: "standalone",

  headers() {
    return Promise.resolve([
      {
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
        ],
        source: "/:path*",
      },
    ]);
  },

  transpilePackages: [
    "@agency/auth",
    "@agency/database",
    "@agency/ui",
    "@agency/lib",
    "@agency/types",
  ],
};

export default nextConfig;
