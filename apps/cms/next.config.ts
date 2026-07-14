import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  headers() {
    return Promise.resolve([
      {
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
        source: "/:path*",
      },
    ]);
  },
  transpilePackages: ["@agency/auth", "@agency/database", "@agency/lib"],
};

export default withPayload(nextConfig);
