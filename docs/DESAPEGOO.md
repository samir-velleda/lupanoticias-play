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

## Persistência

- `LUPA_USE_AURORA=true` (prod) → tabelas `desapego_vendedor` / `desapego_anuncio` (seed se vazio)
- Local sem Aurora → mock em memória

## Login + KYC vendedor (implementado)

| Path | Função |
|---|---|
| `/api/auth/login?next=/desapegoo/...` | Cognito com retorno |
| `/desapegoo/kyc` | CPF, telefone, Pix, lojinha |
| `/desapegoo/minha-lojinha` | Anúncios do usuário logado |
| `/desapegoo/vender` | Exige login + KYC completo |

- Sessão: cookie `lupa_session` (mesmo Cognito da redação)
- KYC auto-aprovado ao preencher dados válidos (repasse Boovest = etapa seguinte)
- CPF mascarado na UI; Pix/telefone só no painel do vendedor

## Pedido + wallet (sem split) — implementado

Fluxo combinado:
1. Comprador cria pedido (`aguardando_pagamento`)
2. Confirma pagamento na **master** → `em_custodia` + **bloqueado** na wallet do vendedor
3. Vendedor marca enviado (rastreio)
4. Comprador confirma entrega → **bloqueado → disponível**
5. Cashout wallet → conta bancária **mesma titularidade** (CPF KYC)

| Path | Função |
|---|---|
| `/desapegoo/pedido/[id]` | Detalhe + ações |
| `/desapegoo/compras` | Pedidos do comprador |
| `/desapegoo/vendas` | Pedidos da lojinha |
| `/desapegoo/wallet` | Saldos + cashout |

Sem split Celcoin. Pagamento master e cashout bancário externo ficam para integração Boovest/Celcoin (ledger Lupa já opera bloqueio/liberação/saque).

## Próximo

- Webhook real Boovest/Celcoin no lugar de “confirmar pagamento (master)”
- Liquidação bancária real do cashout
- Avaliações, frete, moderação Master KYC

## Link no Lupa

Nav do site: item **Desapegoo** → `/desapegoo`.
