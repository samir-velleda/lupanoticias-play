import type { NextConfig } from "next";
import path from "node:path";

/**
 * Origins permitidos para Server Actions (CSRF).
 * CloudFront remove/altera Host → sem allowedOrigins:
 * "Invalid Server Actions request" /
 * "An unexpected response was received from the server."
 */
const SERVER_ACTION_ORIGINS = [
  "d38vv9f8v1kb7v.cloudfront.net", // dev
  "d49e3n8xzbfoy.cloudfront.net", // prod
  "localhost:3000",
  "127.0.0.1:3000",
  ...(process.env.LUPA_SERVER_ACTION_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
];

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(process.cwd(), ".."),
  serverExternalPackages: ["pg", "pg-native"],
  images: { unoptimized: true },
  experimental: {
    serverActions: {
      allowedOrigins: SERVER_ACTION_ORIGINS,
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
