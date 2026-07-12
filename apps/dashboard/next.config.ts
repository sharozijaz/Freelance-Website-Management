import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@agency/auth",
    "@agency/database",
    "@agency/ui",
    "@agency/lib",
    "@agency/types",
  ],
};

export default nextConfig;
