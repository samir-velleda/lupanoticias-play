#!/usr/bin/env bash
# Monta o artefato do Lambda do web (Next standalone + LWA).
# Saída: infra/assets/lupa-web (usado por lib/web-stack.ts via lambda.Code.fromAsset).
# Ver docs/AWS_ARCHITECTURE.md §2. NÃO usa Docker.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # infra/
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
#    Preservamos a estrutura e localizamos o server.js para montar o run.sh.
cp -R "$STANDALONE/." "$OUT/"

REL="$(cd "$OUT" && find . -maxdepth 2 -name server.js | head -1 | sed 's|^\./||')"  # ex: web/server.js ou server.js
if [ -z "$REL" ]; then echo "[package-web] ERRO: server.js não encontrado no standalone"; exit 1; fi
SRVDIR="$(dirname "$REL")"   # ex: web  (ou "." se layout flat)

# 2) Assets do cliente e públicos, ao lado do server.js (server serve a partir de __dirname)
mkdir -p "$OUT/$SRVDIR/.next"
cp -R "$WEB/.next/static" "$OUT/$SRVDIR/.next/static"
if [ -d "$WEB/public" ]; then cp -R "$WEB/public" "$OUT/$SRVDIR/public"; fi

# 3) Vendora deps de runtime de SERVIDOR que o tracing do standalone (Turbopack +
#    monorepo) às vezes não inclui. Todos zero-dependência. `@aws-sdk/*` NÃO é
#    vendorado: o runtime do Lambda Node 20 já o fornece.
mkdir -p "$OUT/$SRVDIR/node_modules"
for dep in zod aws-jwt-verify server-only; do
  dest="$OUT/$SRVDIR/node_modules/$dep"
  if [ ! -d "$dest" ]; then
    src=""
    for base in "$WEB/node_modules/$dep" "$WEB/../node_modules/$dep"; do
      [ -d "$base" ] && { src="$base"; break; }
    done
    if [ -n "$src" ]; then cp -R "$src" "$dest"; echo "[package-web] vendored: $dep"; \
    else echo "[package-web] AVISO: dep de runtime não encontrado: $dep"; fi
  fi
done

# 4) Remove sharp (binário nativo por-plataforma; imagens unoptimized → nunca usado)
rm -rf "$OUT/node_modules/sharp" "$OUT/node_modules/@img" \
       "$OUT/$SRVDIR/node_modules/sharp" "$OUT/$SRVDIR/node_modules/@img"

# 4) bootstrap do LWA: handler = run.sh que sobe o servidor Next na porta do adapter
cat > "$OUT/run.sh" <<SH
#!/bin/bash
exec node $REL
SH
chmod +x "$OUT/run.sh"

echo "[package-web] OK — $(du -sh "$OUT" | cut -f1) · server: $REL"
