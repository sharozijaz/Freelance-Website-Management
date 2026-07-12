import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "**",
        protocol: "https",
      },
      {
        hostname: "localhost",
        protocol: "http",
      },
    ],
  },
  transpilePackages: ["@agency/ui", "@agency/lib", "@agency/types"],
};

export default nextConfig;
