# Desapegoo — Etapa 1 (implementado)

Brechó C2C do Lupa Notícias. Design do protótipo Claude (`Desapegoo.dc.html`).

## Rotas

| Path | Função |
|---|---|
| `/desapegoo` | Home + hero + grid |
| `/desapegoo/busca?q=&cat=` | Busca e filtros |
| `/desapegoo/p/[slug]` | PDP do anúncio |
| `/desapegoo/vender` | Publicar anúncio (+ fotos) |
| `/desapegoo/lojinha/[slug]` | Perfil do vendedor |

## Stack

- Next App Router, group `(desapegoo)`
- Tokens: `web/src/styles/desapegoo.css` (navy/coral/creme)
- Dados: `lib/data/desapego` (mock in-memory; schema Aurora já no DDL)
- Upload: `POST /api/desapego/upload-url` → S3 `media/desapego/...` (fallback data URL em dev)

## Fora da Etapa 1

- Login obrigatório / KYC vendedor
- Checkout Boovest + escrow (Etapa 3)
- Avaliações reais, frete integrado
- Persistência Aurora wired no repo (DDL pronto; app usa mock até Bloco 2)

## Link no Lupa

Nav do site: item **Desapegoo** → `/desapegoo`.
