# Prompt 08 — Publicidade + Analytics (cliques/visualizações/relatórios)

Leia `docs/EDITORIAL_WORKFLOW.md` §6 (publicidade), §7 (analytics), §8 (APIs) e
`docs/DATA_MODEL.md` (tipos Ad*/EventoAnalytics).

## Objetivo
Entregar (a) publicidade em espaços do portal gerida pelo Admin e (b) analytics de cliques e
visualizações com relatórios no Admin. Ponta a ponta.

## Tarefas
1. **Schema Aurora**: `ad_campaign`, `ad_creative`, `evento_analytics`, `agregado_diario`
   (migrations Prisma). Implementar `repositories.ads` e `repositories.analytics`.
2. **Publicidade**:
   - Slots `AdSlotId` no layout do site/app (home, artigo, categoria, sidebar, app banner).
   - Componente `<AdSlot slot=.../>` — busca `/api/ads?slot=...`, renderiza com rótulo
     "PUBLICIDADE" (Mono), registra **impressão** ao entrar na viewport; clique →
     `POST /api/ads/:id/click` (registra + redireciona). Mantém a paleta monocromática.
   - Admin `(admin)/admin/publicidade`: CRUD de campanhas e criativos; upload de asset
     (imagem/vídeo) via pre-signed S3 (`lupa-media`); escolher slot/período/peso; ver
     impressões/cliques/CTR por criativo/campanha/slot.
3. **Analytics**:
   - `POST /api/analytics/event` (batch, rate-limited, sem PII; `sessaoHash` rotativo;
     `dispositivo` web/ios/android). Instrumentar views de matéria/vídeo/categoria e cliques.
   - Lambda de **agregação** (EventBridge schedule) preenchendo `agregado_diario` e atualizando
     contadores `views`/`cliques` em `materia`/`media` (stack `lupa-*`).
   - Admin `(admin)/admin/relatorios`: **cliques por matéria**, **visualizações por matéria**,
     por categoria, por autor, por período; vídeos mais assistidos. Dashboard `/admin` consome
     os agregados (KPIs reais).
4. LGPD: banner de consentimento de cookies no site; não armazenar IP cru.

## Critério de aceite
- Anúncio aparece no slot certo; impressões/cliques contabilizados; CTR no Admin.
- Relatórios mostram cliques e visualizações reais por matéria/categoria/autor/período.
- Agregação roda agendada; contadores atualizados. Só recursos `lupa-*` (cdk diff limpo).
- Commit + push (`feat: publicidade + analytics (cliques/views/relatorios)`).
