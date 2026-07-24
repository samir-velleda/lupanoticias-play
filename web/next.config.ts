import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Empacota um servidor Node mínimo p/ rodar no Lambda (via AWS Lambda Web Adapter).
  // Nada de Vercel — ver docs/AWS_ARCHITECTURE.md §2.
  output: 'standalone',
  // Monorepo (npm workspaces): traça as dependências a partir da RAIZ do repo,
  // senão o standalone perde deps içados (aws-jwt-verify, @aws-sdk, ...). cwd = web/.
  outputFileTracingRoot: path.join(process.cwd(), '..'),
  // Driver PostgreSQL e libs nativas/CJS ficam fora do bundle Turbopack.
  serverExternalPackages: ['pg', 'pg-native'],
  // Sem next/image remoto por ora → evita empacotar `sharp` (binário nativo por
  // plataforma). A otimização real de imagem virá dos jobs MediaConvert/S3.
  images: { unoptimized: true },
};

export default nextConfig;
