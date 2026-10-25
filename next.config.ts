import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Email attachments (up to 10 MB of files) travel base64-encoded, which adds about a third
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
