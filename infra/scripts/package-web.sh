#!/usr/bin/env bash
# Monta o artefato do Lambda do web (Next standalone + LWA).
# Saída: infra/assets/lupa-web (usado por lib/web-stack.ts via lambda.Code.fromAsset).
# Ver docs/AWS_ARCHITECTURE.md §2. NÃO usa Docker.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # infra/
WEB="$(cd "$HERE/../web" && pwd)"
OUT="$HERE/assets/lupa-web"

echo "[package-web] build Next (standalone) em $WEB"
( cd "$WEB" && npm run build >/dev/null )

echo "[package-web] montando artefato em $OUT"
rm -rf "$OUT"
mkdir -p "$OUT"

# 1) servidor standalone (server.js + node_modules mínimos + .next/server)
cp -R "$WEB/.next/standalone/." "$OUT/"

# 2) assets do cliente e públicos (server.js serve a partir daqui)
mkdir -p "$OUT/.next"
cp -R "$WEB/.next/static" "$OUT/.next/static"
if [ -d "$WEB/public" ]; then cp -R "$WEB/public" "$OUT/public"; fi

# 3) remove sharp (binário nativo por-plataforma; imagens são unoptimized → nunca usado)
rm -rf "$OUT/node_modules/sharp" "$OUT/node_modules/@img"

# 4) bootstrap do LWA: handler = run.sh que sobe o servidor Next na porta do adapter
cat > "$OUT/run.sh" <<'SH'
#!/bin/bash
exec node server.js
SH
chmod +x "$OUT/run.sh"

echo "[package-web] OK — $(du -sh "$OUT" | cut -f1) em $OUT"
