import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    root: "./",
  },
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
