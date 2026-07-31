# Desapegoo × Boovest Pay — análise técnica (escrow tipo Enjoei)

**Status:** análise / design — **não implementado** no código Lupa.  
**Premissas de negócio:**

- Boovest Meios de Pagamento = **patrocinadora oficial** do Lupa Notícias
- Boovest Pay = **meio de pagamento oficial** do **Desapegoo** (C2C de usados, UX tipo Enjoei)
- Fluxo: comprador paga → **plataforma retém** → confirma entrega → libera vendedor (− taxa)

---

## 1. Fluxo alvo (igual espírito Enjoei)

```
[Vendedor] anuncia item (fotos, preço, frete/retirada, cidade)
        ↓
[Comprador] compra → checkout Boovest Pay (Pix / cartão via OWN)
        ↓
[Boovest] captura/autoriza → status payment.confirmed
        ↓
[Lupa/Desapegoo] pedido = PAGO_EM_CUSTODIA (escrow lógico)
        ↓
[Vendedor] envia / entrega → informa código rastreio ou “entregue em mãos”
        ↓
[Comprador] confirma recebimento  OR  auto-confirma após N dias
        ↓
[Boovest] split/repasse: vendedor (líquido) + taxa plataforma (+ opcional cidade)
        ↓
pedido = CONCLUIDO

Alternativas:
- Disputa → freeze escrow → mediação Master/cidade → estorno ou liberação
- Expiração / não pagamento → pedido cancelado
- Chargeback cartão → reabrir disputa + ledger
```

Estados mínimos do pedido:

`rascunho → aguardando_pagamento → em_custodia → enviado → entregue → liberado`  
(+ `disputa`, `estornado`, `cancelado`)

---

## 2. Como encaixa na Boovest Pay (hoje)

Com base no `boovest-pay` (conta Boovest):

| Capacidade Boovest | Uso no Desapegoo |
|---|---|
| `POST /v1/payments` / checkouts (Pix, cartão OWN) | Checkout do comprador |
| Webhooks `payment.confirmed` / `expired` / `declined` | Atualizar pedido → `em_custodia` |
| **Split Pix** (escrow Fidúcia + repasses) | Liberar vendedor + taxa Lupa |
| Ledger double-entry | Auditoria de retenção/repasse |
| Merchant onboarding | Merchant “Desapegoo / Lupa” (ou por cidade) |
| Portal + secrets | Chaves só em Secrets Manager (`lupa-*`) |

**Importante:** escrow de marketplace **não é só “cobrar Pix”**.  
Retenção até entrega = **estado de negócio no Lupa** + **repasse tardio** via split Boovest (ou conta escrow Fidúcia já usada no Pay).

Padrão recomendado:

1. **Cobrança** no merchant plataforma (Lupa/Desapegoo)  
2. Dinheiro fica sob controle Boovest/escrow (não vai ao vendedor no D0)  
3. No evento `entrega_confirmada`, Lupa chama API de **transfer/split** Boovest → vendedor  
4. Taxa plataforma fica no merchant Lupa  

Se split síncrono no momento da cobrança for o único modo disponível para cartão, usar:

- captura + **payout agendado**, ou  
- second-step cash-out Pix (já alinhado ao modelo Fidúcia do README Pay)

---

## 3. Domínio no Lupa (bounded context)

Não misturar com `materia` / `pauta`. Novo módulo:

```
desapego/
  anuncio { id, cidadeId, vendedorId, titulo, precoCentavos, status, fotos[] }
  pedido  { id, anuncioId, compradorId, valor, taxa, status, paymentId, tracking? }
  evento_pedido { ... auditoria }
```

Auth: Cognito com papel/`grupo` **`comprador`** / **`vendedor`** (ou flag em `author`/perfil leitor).  
Multi-cidade: anúncio e vendedor com `cidadeId` (licença local).

Infra AWS (aditivo `lupa-*`):

- Tabelas Aurora (ou Dynamo só se preferir eventos de pedido)  
- S3 fotos anúncio (mesmo padrão pre-signed)  
- Secrets: `LUPA_BOOVEST_PAY_API_KEY`, webhook secret  
- Lambda/route `POST /api/desapego/webhooks/boovest` (HMAC)  
- SQS opcional para payouts e retries  

---

## 4. Patrocínio vs meio de pagamento

| Dimensão | O que significa tecnicamente |
|---|---|
| **Patrocinadora oficial** | Branding no site/Desapegoo, selo “Pagamentos por Boovest”, possível landing |
| **Meio oficial** | Único PSP no checkout Desapegoo; sem Mercado Pago/Stripe paralelo no MVP |
| **Não confundir** | Patrocínio de mídia ≠ ledger. O contrato comercial deve cobrir MDR, split, SLA webhook, chargeback |

---

## 5. Viabilidade

| Fatia | Esforço | Dependência |
|---|---|---|
| Vitrine + anúncio + contato (sem pay) | Baixo | Lupa atual |
| Checkout Boovest + webhook → `em_custodia` | Médio | Credenciais merchant + API Pay |
| Confirma entrega + split/repasse | Médio–alto | Endpoint de payout/split estável + KYC vendedor |
| Disputa/chargeback completo | Alto | Operação + jurídico C2C |
| Paridade Enjoei (ranking, frete, app) | Muito alto | Produto à parte |

**MVP honesto “fluxo Enjoei financeiro”:**  
anúncio → pagar Boovest → custódia lógica → confirmar entrega → repasse.  
Sem frete integrado na v1 (retirada local / código Correios manual).

---

## 6. Riscos

1. **KYC do vendedor** para receber Pix (CPF/CNPJ na Boovest/Fidúcia)  
2. **Chargeback cartão** depois do repasse  
3. **Multi-cidade:** taxa compartilhada Master vs licença da cidade  
4. **LGPD** fotos + dados comprador/vendedor  
5. **Isolamento AWS:** só recursos `lupa-*`; nunca reutilizar buckets/roles de outros projetos Boovest  

---

## 7. Ordem de implementação sugerida

1. Fechar **deploy** de Pauta + Multi-cidade (hoje só no working tree)  
2. Design Doc Desapegoo (estados + contrato Boovest Pay)  
3. Schema `anuncio`/`pedido` + UI vitrine  
4. Integração checkout + webhook  
5. Confirma entrega + split  
6. Disputa mínima + painel Master  

**Conclusão:** viável na stack Lupa + Boovest Pay; **não é “uma página”** — é um bounded context de marketplace com **escrow orquestrado** pela Boovest como PSP oficial e patrocinadora.
