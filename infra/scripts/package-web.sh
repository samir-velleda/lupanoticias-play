#!/usr/bin/env bash
# Monta o artefato do Lambda do web (Next standalone + LWA).
# Saída: infra/assets/lupa-web (usado por lib/web-stack.ts via lambda.Code.fromAsset).
# Ver docs/AWS_ARCHITECTURE.md §2. NÃO usa Docker.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # infra/
ROOT="$(cd "$HERE/.." && pwd)"
WEB="$(cd "$HERE/../web" && pwd)"
OUT="$HERE/assets/lupa-web"
STANDALONE="$WEB/.next/standalone"

echo "[package-web] build Next (standalone) em $WEB"
( cd "$WEB" && npm run build >/dev/null )

echo "[package-web] montando artefato em $OUT"
rm -rf "$OUT"
mkdir -p "$OUT"

# 1) Copia o standalone INTEIRO. Com npm workspaces + outputFileTracingRoot=raiz,
#    o Next gera: standalone/node_modules (deps içados) + standalone/web/server.js.
cp -R "$STANDALONE/." "$OUT/"

REL="$(cd "$OUT" && find . -maxdepth 2 -name server.js | head -1 | sed 's|^\./||')"  # ex: web/server.js
if [ -z "$REL" ]; then echo "[package-web] ERRO: server.js não encontrado no standalone"; exit 1; fi
SRVDIR="$(dirname "$REL")"   # ex: web  (ou "." se layout flat)

# 2) Assets do cliente e públicos, ao lado do server.js
mkdir -p "$OUT/$SRVDIR/.next"
cp -R "$WEB/.next/static" "$OUT/$SRVDIR/.next/static"
if [ -d "$WEB/public" ]; then cp -R "$WEB/public" "$OUT/$SRVDIR/public"; fi

# 3) Vendora deps de runtime externas (pg + zero-dep). NÃO rodar npm install no artefato.
mkdir -p "$OUT/$SRVDIR/node_modules"
copy_dep() {
  local dep="$1"
  local dest="$OUT/$SRVDIR/node_modules/$dep"
  if [ -d "$dest" ]; then return 0; fi
  local src=""
  for base in "$WEB/node_modules/$dep" "$ROOT/node_modules/$dep" "$OUT/node_modules/$dep"; do
    if [ -d "$base" ]; then src="$base"; break; fi
  done
  if [ -z "$src" ]; then
    echo "[package-web] AVISO: dep de runtime não encontrado: $dep"
    return 0
  fi
  mkdir -p "$(dirname "$dest")"
  cp -R "$src" "$dest"
  # Evita lixo aninhado / devDeps acidentais
  rm -rf "$dest/node_modules" 2>/dev/null || true
  echo "[package-web] vendored: $dep"
}

for dep in \
  zod aws-jwt-verify server-only \
  pg pg-connection-string pg-pool pg-protocol pg-types pgpass \
  postgres-array postgres-bytea postgres-date postgres-interval \
  pg-int8 pg-cloudflare split2 xtend
do
  copy_dep "$dep"
done

# 4) Remove sharp (binário nativo por-plataforma; imagens unoptimized → nunca usado)
rm -rf "$OUT/node_modules/sharp" "$OUT/node_modules/@img" \
       "$OUT/$SRVDIR/node_modules/sharp" "$OUT/$SRVDIR/node_modules/@img"

# 5) bootstrap do LWA
cat > "$OUT/run.sh" <<SH
#!/bin/bash
exec node $REL
SH
chmod +x "$OUT/run.sh"

echo "[package-web] OK — $(du -sh "$OUT" | cut -f1) · server: $REL"
