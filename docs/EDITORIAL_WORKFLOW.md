# EDITORIAL_WORKFLOW.md — Lupa Notícias Play

Papéis, fluxo de aprovação, Diretor de Redação, modo automático, publicidade e analytics.
Esta é a **fonte de verdade** do comportamento editorial. A UI segue `DESIGN_SPEC.md`.

---

## 1. Papéis (grupos Cognito)

| Papel | Grupo Cognito | Acesso |
|---|---|---|
| **Admin** | `admin` | Portal Admin completo: usuários, publicidade, relatórios/analytics, configurações globais, modo automático. Herdará também poderes de Diretor. |
| **Diretor de Redação** | `diretor` | Pautar temas da semana, aprovar/recusar matérias (com justificativa), ligar/desligar modo automático por categoria, ver fila de pendências. |
| **Jornalista** | `jornalista` | Criar/editar matérias (entram **pendentes**), ver pautas da semana, ver recusas com justificativa e corrigir/reenviar, acompanhar status das próprias matérias. |
| **Leitor** | — (sem login) | Site público + Lupa Play. (Fase 2: conta de leitor p/ Salvos/assinatura.) |

Autorização aplicada por grupo em: rotas de página (middleware) e rotas de API (verificação
de claim `cognito:groups`). Admin ⊇ Diretor em permissões de aprovação.

---

## 2. Estados de uma matéria (máquina de estados)

```
            cria/edita                 envia p/ revisão
  [rascunho] ───────────► [rascunho] ───────────────► [pendente]
      ▲                                                   │
      │                                    Diretor recusa │  Diretor aprova
      │        justificativa escrita               ┌──────┴───────┐
      │◄───────────────────────────────────────────┤              ▼
  [em_correcao] ◄─── [recusada] ◄──────────────────┘        [aprovada] ──► [publicada]
      │  (jornalista corrige)                                                   ▲
      └──────────────► [pendente] ───────────────────────────────────────► (auto-mode)
```

Enum `StatusMateria`:
`rascunho` · `pendente` · `aprovada` · `publicada` · `recusada` · `em_correcao` · `arquivada`.

Regras:
- Toda matéria criada por **Jornalista** entra como **`pendente`** ao ser enviada (nunca
  publica direto), **exceto** quando o **modo automático** está ligado para a categoria dela.
- **Aprovar** → `aprovada` → publica (`publicada`) imediatamente ou na data agendada.
- **Recusar** → `recusada` + **`justificativa` obrigatória (texto)**. A justificativa aparece
  no **Portal do Jornalista** vinculada à matéria. Jornalista corrige (`em_correcao`) e reenvia
  (`pendente`). Todo histórico de recusas/justificativas é preservado (`RevisaoMateria`).
- Admin/Diretor podem `arquivar` qualquer matéria.

---

## 3. Diretor de Redação

### 3.1 Pautas da semana (sugestões de temas)
- O Diretor cria **pautas** (`Pauta`): tema, descrição, categoria sugerida, prazo, prioridade,
  e opcionalmente atribui a um ou mais jornalistas.
- As pautas aparecem no **Portal do Jornalista** ("Pautas da semana") para ele explorar.
- Estados da pauta: `aberta` · `em_producao` (quando um jornalista vincula uma matéria) ·
  `concluida` · `cancelada`.
- Um jornalista pode vincular sua matéria a uma pauta ao criá-la.

### 3.2 Fila de aprovação
- O Diretor vê a **fila de pendências** (todas as matérias `pendente`), ordenável por
  categoria/prazo/jornalista.
- Ações: **Aprovar** (opcional: editar antes de publicar; agendar) · **Recusar** (abre campo
  de **justificativa obrigatória**).
- Ao recusar, gravar `RevisaoMateria { materiaId, revisorId, decisao:'recusada', justificativa, criadoEm }`.

### 3.3 Modo automático (auto-publicação)
- O Diretor (e o Admin) podem **ligar o modo automático por categoria**.
- Config `ModoAutomatico { categoria, ativo, ativadoPor, ativadoEm }` (uma linha por categoria).
- Enquanto **ativo** para a categoria X: matérias novas de jornalistas nessa categoria
  **pulam a revisão** e vão direto para **`publicada`** (respeitando agendamento).
- Pode ser desligado a qualquer momento; matérias já pendentes continuam pendentes.
- **Não** se aplica a mídia de vídeo/podcast a menos que explicitamente configurado (default:
  vídeo/podcast sempre passam por revisão, salvo toggle equivalente por categoria).

---

## 4. Portal do Jornalista — telas

1. **Minhas matérias** — lista com status (badge: pendente/recusada/publicada…), filtro por status.
2. **Pautas da semana** — cards das pautas abertas atribuídas/gerais; botão "Escrever matéria".
3. **Editor de matéria** — título, standfirst, corpo em blocos (parágrafo, H2, pull-quote,
   imagem inline, embed de vídeo), categoria, tags, imagem principal + legenda, vincular pauta.
   Ações: **Salvar rascunho** · **Enviar para revisão**.
4. **Correções pendentes** — matérias `recusada`/`em_correcao` com a **justificativa do Diretor**
   em destaque; abrir para corrigir e reenviar.

O editor deve refletir os tipos de bloco de `DATA_MODEL.md` (`ArticleBlock[]`).

---

## 5. Portal Admin — telas

1. **Dashboard** — visão geral: matérias publicadas, pendentes, views totais, cliques,
   top matérias, top categorias, atividade recente.
2. **Relatórios / Analytics** (detalhe em §7):
   - **Cliques por matéria**, **visualizações por matéria**, views por categoria, por autor,
   por período; vídeos mais assistidos; retenção do Lupa Play (fase 2).
3. **Publicidade** (detalhe em §6) — criar campanhas/banners, alocar em espaços, agendar,
   ver impressões/cliques/CTR.
4. **Usuários** — criar/gerir contas Cognito e papéis (admin/diretor/jornalista).
5. **Diretor de Redação** (o Admin também acessa) — pautas + fila de aprovação + modo automático.
6. **Configurações** — categorias, modo automático por categoria, marca, SEO.

---

## 6. Publicidade

- **Espaços de anúncio** (`AdSlot`) pré-definidos no layout do site e do app. Ex.:
  `home_topo`, `home_meio`, `home_sidebar`, `artigo_topo`, `artigo_meio`, `artigo_rodape`,
  `categoria_topo`, `play_pre_roll` (fase 2 vídeo), `app_home_banner`.
  Cada slot tem dimensões-alvo e formatos aceitos (imagem estática / HTML / vídeo curto).
- **Campanha** (`AdCampaign`) e **Criativo** (`AdCreative`):
  ```
  AdCampaign  { id, nome, anunciante, inicio, fim, status, ativadoPor }
  AdCreative  { id, campanhaId, slot, tipoMidia:'imagem'|'html'|'video',
                assetUrl, linkDestino, peso, ativo }
  ```
- **Publicação**: o Admin cria a campanha, adiciona criativos, escolhe **slot** + período
  + peso (rotação). Assets de imagem/vídeo vão para `lupa-media-{env}` (S3) via pre-signed URL.
- **Servir anúncios**: endpoint `GET /api/ads?slot=home_topo` retorna o criativo ativo
  (respeita datas/peso). O componente `<AdSlot slot="home_topo" />` renderiza e **registra
  impressão**; clique → `POST /api/ads/:creativeId/click` (registra e redireciona).
- **Métricas de anúncio**: impressões, cliques, CTR por criativo/campanha/slot/período.
- Manter o visual monocromático do portal; anúncios ficam claramente em **áreas de publicidade**
  demarcadas (rótulo "Publicidade" em Mono, conforme padrão jornalístico).

---

## 7. Analytics (cliques & visualizações)

- **Eventos** capturados no site/app e gravados em Aurora (tabela `EventoAnalytics`) via
  endpoint `POST /api/analytics/event` (batch, sem PII sensível):
  ```
  EventoAnalytics { id, tipo, entidade:'materia'|'video'|'ad'|'categoria',
                    entidadeId, categoria?, autorId?, path, referrer?,
                    sessaoHash, dispositivo:'web'|'ios'|'android', criadoEm }
  tipos: 'view' | 'click' | 'ad_impression' | 'ad_click' | 'video_play' | 'video_complete'
  ```
- **Contadores agregados** (para performance de leitura): manter contadores em `Materia`
  (`views`, `cliques`) atualizados por Lambda de agregação (EventBridge schedule) a partir dos
  eventos brutos — evita `SELECT COUNT` caro em cada request.
- **Relatórios** do Admin leem tanto agregados (rápidos) quanto brutos (drill-down por período).
- Respeitar privacidade: sem armazenar IP cru/identificadores pessoais; `sessaoHash` é derivado
  e rotativo. Consentimento de cookies conforme LGPD (fase de lançamento).

---

## 8. Contratos de API (resumo — schema completo em `DATA_MODEL.md`)

```
# Jornalista
POST   /api/materias                     # cria rascunho
PUT    /api/materias/:id                  # edita (dono ou diretor/admin)
POST   /api/materias/:id/enviar           # rascunho/em_correcao -> pendente (ou auto-publica se modo automático)
GET    /api/materias/minhas               # lista do jornalista logado
GET    /api/pautas                        # pautas abertas p/ o jornalista

# Diretor / Admin
GET    /api/revisao/pendentes             # fila de aprovação
POST   /api/materias/:id/aprovar          # -> aprovada/publicada (opcional agendamento)
POST   /api/materias/:id/recusar          # body: { justificativa } (obrigatória) -> recusada
POST   /api/pautas                        # cria pauta
PUT    /api/pautas/:id                     # edita/atribui/encerra
GET    /api/config/modo-automatico        # estado por categoria
PUT    /api/config/modo-automatico        # body: { categoria, ativo }

# Admin — publicidade
POST   /api/ads/campanhas · PUT /api/ads/campanhas/:id
POST   /api/ads/criativos  · PUT /api/ads/criativos/:id
GET    /api/ads?slot=...                  # servir criativo ativo (público)
POST   /api/ads/:creativeId/click         # registrar clique (público)

# Analytics
POST   /api/analytics/event               # ingest de eventos (público, rate-limited)
GET    /api/analytics/relatorio           # admin: agregados por período/entidade

# Mídia (Estúdio) — ver AWS_ARCHITECTURE.md §4/§5
POST   /api/media/upload-url              # pre-signed S3
POST   /api/media                         # cria registro de mídia (liga ao upload)
GET    /api/live/:id/viewers              # "assistindo agora" (IVS)
```

Todas as rotas mutadoras exigem grupo Cognito adequado. `recusar` **rejeita** se
`justificativa` estiver vazia.
