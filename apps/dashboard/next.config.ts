import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@agency/ui", "@agency/lib", "@agency/types"],
};

export default nextConfig;
