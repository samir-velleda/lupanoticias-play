# AWS_ARCHITECTURE.md — Lupa Notícias Play

Arquitetura **100% AWS**, na conta **Boovest**, em **projeto/stack isolado** (`lupa-*`).
Leia `CLAUDE.md` §0 (guarda-corpos) antes de provisionar qualquer coisa.

---

## 1. Princípios

- **Isolamento**: todo recurso tem a tag `Project=lupa-noticias` e prefixo de nome `lupa-`.
- **IaC**: **AWS CDK (TypeScript)**. Stacks com prefixo `Lupa`. Nada de recurso manual.
- **Aditivo**: o projeto só **cria** recursos novos. Nunca altera/remove recursos alheios.
- **Region**: **`us-east-1`** (definir aqui e não sair dela). IVS e MediaConvert disponíveis lá.
- **Ambientes**: `dev` e `prod` (sufixos `-dev` / `-prod` nos nomes e stacks).

## 2. Serviços AWS por função

| Função | Serviço AWS | Recurso `lupa-*` |
|---|---|---|
| Banco relacional | **Aurora PostgreSQL Serverless v2** | `lupa-aurora-{env}` |
| Armazenamento de mídia/estáticos | **S3** | `lupa-media-{env}`, `lupa-web-static-{env}`, `lupa-uploads-{env}` |
| CDN | **CloudFront** | `lupa-cdn-{env}` (distribuição para web + mídia) |
| Compute web (SSR/API) | **Lambda** (Next via OpenNext/Lambda Web Adapter) | `lupa-web-{env}`, `lupa-api-*-{env}` |
| Transcodificação vídeo | **AWS Elemental MediaConvert** | jobs `lupa-mc-*` |
| Ao vivo (live) | **Amazon IVS** | `lupa-ivs-channel-{env}` |
| Autenticação | **Amazon Cognito** (User Pool + grupos) | `lupa-users-{env}` |
| Filas / eventos | **SQS** + **EventBridge** | `lupa-jobs-{env}`, bus `lupa-events-{env}` |
| Segredos | **Secrets Manager** / **SSM Parameter Store** | `/lupa/{env}/*` |
| Busca (fase 2) | **OpenSearch Serverless** | `lupa-search-{env}` |
| Observabilidade | **CloudWatch** (logs/metrics/alarms) | grupos `/lupa/{env}/*` |
| Entrega de e-mail (newsletter) | **SES** | identidade `lupa-*` |
| DNS/TLS | **Route 53** + **ACM** | zona `lupanoticias.com.br` (se gerida na conta) |

> **Substituições ao handoff de design** (que assumia Mux/Vercel):
> - Vídeo VOD Mux → **S3 + MediaConvert (HLS) + CloudFront**.
> - Ao vivo Mux → **Amazon IVS** (contagem "assistindo agora" via métricas IVS/DynamoDB).
> - Deploy Vercel/ISR → **Lambda (OpenNext) + CloudFront** (cache/edge equivalente ao ISR).
> - Auth.js → **Cognito** (mantém a ideia de "só área logada exige auth").
> A camada `repositories` isola tudo isso da UI.

## 3. Topologia (alto nível)

```
                       ┌──────────────────────────────┐
   Usuário (web/app) → │        CloudFront (lupa-cdn)  │
                       └───────┬───────────────┬───────┘
                               │               │
                   estáticos S3│               │SSR/API
              (lupa-web-static) │               │
                               ▼               ▼
                     ┌──────────────┐   ┌───────────────────────┐
                     │  S3 buckets  │   │ Lambda (Next/OpenNext) │
                     │ media/upload │   │  + API routes          │
                     └──────┬───────┘   └───────┬───────────────┘
                            │                   │
             pre-signed URL │                   │ Prisma / RDS Data API
             (upload direto)│                   ▼
                            │            ┌───────────────────┐
                            │            │ Aurora PostgreSQL │ (lupa-aurora)
                            │            │  Serverless v2    │
                            │            └───────────────────┘
                            ▼
                   ┌─────────────────┐   evento S3 → EventBridge/SQS
                   │  MediaConvert   │◄──── job de transcodificação (HLS + legendas)
                   │  (VOD → HLS)    │────► grava playbackUrl/duração em Aurora (Lambda)
                   └─────────────────┘
                   ┌─────────────────┐
                   │   Amazon IVS    │  ao vivo → HLS + "assistindo agora"
                   └─────────────────┘
   Auth: Amazon Cognito (grupos: admin, diretor, jornalista)
```

## 4. Fluxo de vídeo (VOD) — substitui o Mux

1. **Estúdio** pede URL de upload → `POST /api/media/upload-url` gera **S3 pre-signed URL**
   no bucket `lupa-uploads-{env}` (valida formato MP4/MOV/MP3/WAV e ≤ 4 GB).
2. Browser envia o arquivo direto pro S3 (barra de progresso = evento de upload do S3).
3. `s3:ObjectCreated` → **EventBridge** → Lambda `lupa-mc-submit` cria job **MediaConvert**
   (HLS multi-bitrate + thumbnails + legendas VTT se o toggle estiver ligado).
4. `MediaConvert COMPLETE` → EventBridge → Lambda `lupa-mc-complete` grava em Aurora:
   `playbackUrl` (CloudFront do HLS), `duracaoSeg`, `coverUrl`, status `pronto`.
5. UI mostra estados: enviando → processando → pronto/erro.

## 5. Fluxo ao vivo — Amazon IVS

- Canal `lupa-ivs-channel-{env}`; stream key em Secrets Manager.
- Player consome o **playback URL do IVS** (HLS).
- "Assistindo agora": Lambda lê métricas do IVS (ou tabela DynamoDB de sessões) → endpoint
  `GET /api/live/:id/viewers` (polling ~15s no client). Badge **AO VIVO** pulsa (keyframe).

## 6. Auth — Amazon Cognito

- User Pool `lupa-users-{env}`. **Grupos = papéis**: `admin`, `diretor`, `jornalista`.
- Site público é aberto. Portais (admin/diretor/jornalista/estúdio) exigem login Cognito.
- Autorização por grupo nas rotas de API e nas páginas dos portais (middleware).
- Leitores comuns não precisam de conta (fase 2: contas de leitor p/ "Salvos"/assinatura).

## 7. Banco — Aurora PostgreSQL Serverless v2

- Cluster `lupa-aurora-{env}` em subnets privadas; acesso só da VPC / Lambdas do projeto.
- Migrations com **Prisma Migrate** (ou Drizzle). Schema completo em `docs/DATA_MODEL.md`.
- Credenciais em Secrets Manager `/lupa/{env}/aurora`. Rotação habilitada.
- Backups automáticos (retenção ≥ 7 dias) e deletion protection **ligado** em `prod`.

## 8. Estrutura de pastas (monorepo)

```
lupanoticias-play/
├─ CLAUDE.md
├─ docs/                      # toda a documentação (este pacote)
├─ prompts/                   # prompts sequenciais para o Claude terminal
├─ brand/                     # logos SVG + tokens.css
├─ design-reference/          # protótipos HTML + DESIGN_SPEC.md (não portar runtime)
├─ infra/                     # AWS CDK (TypeScript) — stacks lupa-*
│  ├─ bin/lupa.ts
│  ├─ lib/
│  │  ├─ network-stack.ts     # VPC, subnets, SGs
│  │  ├─ data-stack.ts        # Aurora + Secrets
│  │  ├─ storage-stack.ts     # S3 (media/uploads/static) + CloudFront
│  │  ├─ media-stack.ts       # MediaConvert roles + IVS + EventBridge/SQS + Lambdas de job
│  │  ├─ auth-stack.ts        # Cognito User Pool + grupos
│  │  ├─ web-stack.ts         # Lambda (OpenNext) + API + CloudFront behaviors
│  │  └─ tags.ts              # aplica Project=lupa-noticias em tudo
│  └─ cdk.json
├─ web/                       # Next.js (App Router) — site + portais + estúdio
│  ├─ src/app/
│  │  ├─ (site)/              # público: home, [editoria], [slug], play, cortes
│  │  ├─ (admin)/             # portal admin + Diretor de Redação + publicidade + analytics
│  │  ├─ (jornalista)/        # portal do jornalista (pendências, pautas, recusas)
│  │  ├─ (studio)/            # Lupa Estúdio (upload vídeo/podcast)
│  │  └─ api/                 # rotas: upload-url, media, live viewers, ads, analytics
│  ├─ src/components/         # layout, video, play, article, category, studio, admin, ui
│  ├─ src/lib/data/           # repositories.ts + impl Aurora (mock inicial)
│  ├─ src/lib/{aws,format}.ts
│  ├─ src/types/
│  └─ src/styles/tokens.css
├─ mobile/                    # Capacitor (iOS/Android) apontando p/ o web build
│  ├─ capacitor.config.ts
│  ├─ ios/ · android/
│  └─ codemagic.yaml (na raiz do repo)
├─ .github/workflows/         # CI/CD (lint/test/build/deploy CDK + web)
├─ codemagic.yaml             # pipeline de build do app (iOS/Android)
└─ package.json (workspaces: web, infra, mobile)
```

## 9. Ambientes & deploy (via Git — ver `docs/GIT_CICD.md`)

- `develop` → deploy **dev** (`cdk deploy Lupa*-dev` + web dev).
- `main` → deploy **prod** (`cdk deploy Lupa*-prod` + web prod).
- **Sempre** `cdk diff` antes de `cdk deploy`; abortar se aparecer stack não-`Lupa`.
- `cdk destroy` é **proibido** em CI. Se necessário em dev, só manual e só stacks `Lupa*-dev`.

## 10. Custos & guarda-corpos operacionais

- Aurora Serverless v2 com min ACU baixo em dev. IVS/MediaConvert sob demanda.
- **Budgets/alarms** `lupa-*` no CloudWatch para não impactar orçamento de outros projetos.
- Todos os logs em grupos `/lupa/{env}/*` (nunca escrever em log groups alheios).
