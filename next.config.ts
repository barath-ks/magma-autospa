import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  env: {
    NEXTAUTH_URL: "https://magma-autospa.vercel.app",
  },
};

export default nextConfig;
