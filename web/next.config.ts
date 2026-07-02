import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empacota um servidor Node mínimo p/ rodar no Lambda (via AWS Lambda Web Adapter).
  // Nada de Vercel — ver docs/AWS_ARCHITECTURE.md §2.
  output: 'standalone',
  // Sem next/image remoto por ora → evita empacotar `sharp` (binário nativo por
  // plataforma). A otimização real de imagem virá dos jobs MediaConvert/S3.
  images: { unoptimized: true },
};

export default nextConfig;
