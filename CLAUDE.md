# CLAUDE.md — Lupa Notícias Play (charter do projeto)

> **LEIA ESTE ARQUIVO ANTES DE QUALQUER TAREFA.**
> Este é o projeto do **Portal Lupa Notícias** — jornalismo e informação, video-first,
> com a plataforma **Lupa Play**. Web + App (iOS/Android). Backend **100% AWS**.
>
> Ordem de leitura:
> 1. `CLAUDE.md` (este) — regras, guarda-corpos e convenções.
> 2. `docs/AWS_ARCHITECTURE.md` — arquitetura AWS (conta Boovest, projeto isolado).
> 3. `docs/EDITORIAL_WORKFLOW.md` — papéis, Diretor de Redação, aprovação, modo automático.
> 4. `docs/DATA_MODEL.md` — schema Aurora + tipos + contrato de API.
> 5. `docs/DESIGN_SYSTEM.md` — tokens, tipografia, telas (resumo do design handoff).
> 6. `docs/MOBILE_CAPACITOR.md` — app iOS/Android via Capacitor + Codemagic.
> 7. `docs/GIT_CICD.md` — fluxo Git, branches, CI/CD.
> 8. `prompts/` — execute os prompts **em ordem** (00 → 09). Um por vez.
> 9. `design-reference/` — protótipos HTML e `DESIGN_SPEC.md` (fonte de verdade de UI).

---

## 0. Guarda-corpos de segurança (NÃO NEGOCIÁVEL)

Estas regras existem para proteger a conta AWS **Boovest**, que contém **outros projetos**.

- ✅ **Isolamento total.** Tudo do Lupa vive num projeto/stack separado. Todo recurso
  criado leva a tag `Project=lupa-noticias` e o prefixo de nome `lupa-` (ex.: `lupa-media-prod`,
  `lupa-aurora-prod`, `lupa-api-*`). Nunca reutilizar recursos de outros projetos.
- ✅ **Infra como código.** Provisionar **somente** via IaC (AWS CDK em TypeScript — ver
  `docs/AWS_ARCHITECTURE.md`). Toda a stack tem o prefixo `Lupa`. Nada de cliques manuais
  no console que não estejam refletidos no código.
- ❌ **NUNCA** rodar `delete`, `destroy`, `terminate`, `rm`, `drop`, `--force` contra
  qualquer recurso que **não** tenha a tag `Project=lupa-noticias` ou o prefixo `lupa-`.
- ❌ **NUNCA** rodar `cdk destroy` sem antes confirmar, via `cdk diff`/`cdk list`, que a
  operação afeta **apenas** stacks com prefixo `Lupa`. Se qualquer stack fora desse prefixo
  aparecer no plano, **PARE** e reporte — não execute.
- ❌ **NUNCA** tocar em buckets S3, bancos, funções Lambda, roles IAM, VPCs ou security
  groups pré-existentes. Se um recurso já existe e não é `lupa-`, crie um novo em vez de reusar.
- ✅ **Antes de qualquer `cdk deploy`**, rode `cdk diff` e cole o resumo do que será
  criado/alterado. Deploys são **aditivos**; nunca alteram recursos alheios.
- ✅ **Region única e explícita** (definida em `docs/AWS_ARCHITECTURE.md`). Não criar
  recursos fora dela.
- ✅ **Segredos** (senhas Aurora, chaves) só via **AWS Secrets Manager** / SSM Parameter
  Store, nunca commitados. `.env*` está no `.gitignore`.
- ✅ Se algo estiver ambíguo e houver risco a recursos existentes, **prefira criar novo e
  isolado** a reaproveitar. Na dúvida sobre destruição: **não destrua**.

> Regra de ouro: **este projeto só ADICIONA recursos `lupa-*` isolados. Ele nunca modifica
> nem remove nada que já exista na conta Boovest.**

---

## 1. O que é o Lupa Notícias

Portal de notícias em **português (pt-BR)**, **video-first**, com a plataforma **Lupa Play**
(vídeos, podcasts, ao vivo e "Cortes" verticais) no centro. Além do site público há:

- **Portal Administrador** — dados, relatórios, cliques por matéria, visualizações, e
  gestão de **publicidade** (banners/espaços). Inclui o papel **Diretor de Redação**.
- **Portal do Jornalista** — postar e editar matérias; ver pautas do Diretor de Redação;
  ver justificativas de recusa e corrigir.
- **Lupa Estúdio** — upload/publicação de vídeo e podcast (parte do portal admin).

Identidade **monocromática** (preto, cinzas, branco). Ênfase por **inversão** (bloco preto +
texto branco), nunca por cor de destaque. Detalhes em `docs/DESIGN_SYSTEM.md`.

## 2. Papéis e permissões (resumo — detalhe em `docs/EDITORIAL_WORKFLOW.md`)

| Papel | Pode |
|---|---|
| **Admin** | tudo: usuários, publicidade, relatórios/analytics, configurações, modo automático |
| **Diretor de Redação** | pautar temas semanais, **aprovar/recusar** matérias (com justificativa), ligar/desligar **modo automático** por categoria |
| **Jornalista** | criar/editar matérias (entram como **pendentes**), ver pautas, ver recusas e corrigir |
| **Leitor (público)** | ler o site, assistir Lupa Play — sem login |

Fluxo editorial central: matéria do Jornalista → **pendente** → Diretor aprova (publica) ou
recusa (**com justificativa escrita** que aparece no portal do Jornalista) → correção → reenvio.
**Modo automático** (ligável pelo Diretor/Admin, por categoria) publica direto sem revisão.

## 3. Stack (resumo — detalhe em `docs/AWS_ARCHITECTURE.md`)

- **Frontend web**: **Next.js 14+ (App Router) + React + TypeScript (strict) + Tailwind**.
- **Hospedagem web**: **AWS** — SSR/API em **Lambda** (via AWS Lambda Web Adapter / OpenNext),
  **CloudFront** na frente, estáticos em **S3**.
- **Banco**: **Amazon Aurora (PostgreSQL Serverless v2)** — dados de matérias, usuários,
  workflow, analytics, publicidade. Acesso via **Prisma** ou **RDS Data API**.
- **Mídia (vídeo/podcast/imagens)**: **S3** + **CloudFront**. Transcodificação de vídeo com
  **AWS MediaConvert** (HLS adaptativo); ao vivo com **AWS IVS** (Interactive Video Service);
  thumbnails/legendas via jobs Lambda + MediaConvert. **Não usar Mux** (o handoff cita Mux —
  aqui substituímos por serviços AWS equivalentes).
- **Auth**: **Amazon Cognito** (User Pools) com grupos = papéis (admin, diretor, jornalista).
- **Uploads**: **S3 pre-signed URLs** (upload direto do browser, ≤ 4 GB).
- **Filas/eventos**: **SQS/EventBridge** para jobs (transcodificar, gerar legendas, indexar).
- **App mobile**: **Capacitor** empacotando o web app; build/entrega via **Codemagic** (Git).
- **IaC**: **AWS CDK (TypeScript)**. **CI/CD**: **GitHub Actions** + **Codemagic**.
- **Camada de dados desacoplada** (`src/lib/data/repositories.ts`): a UI só conhece essa
  interface; a implementação fala com Aurora. Isso mantém a UI portável.

## 4. Repositório e Git

- Remote único: **https://github.com/samir-velleda/lupanoticias-play**
- **Todo o fluxo é via Git.** Nada de deploy manual fora do pipeline.
- Branches: `main` (produção), `develop` (integração), `feature/*`, `fix/*`.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`…). PRs pequenos, por milestone.
- Detalhes em `docs/GIT_CICD.md`.

## 5. Convenções de código

- **TypeScript strict**; sem `any`. Tipos de domínio em `src/types/`.
- **Server Components por padrão**; `"use client"` só com estado/efeito/interação.
- Data fetching via `repositories`, nunca query direta na UI.
- **Nada de cor hardcoded** fora da paleta monocromática — usar classes Tailwind dos tokens.
- Acessibilidade obrigatória (landmarks, `alt`, foco visível, contraste AA).
- Segredos só via Secrets Manager/SSM. `.env*` no `.gitignore`.

## 6. Tipografia (3 famílias — não trocar)

- **Archivo** → manchetes, UI, wordmark.
- **Newsreader** → olho/standfirst, corpo do artigo, citações.
- **IBM Plex Mono** → kickers, tags, metadados (CAIXA ALTA, `letter-spacing` .12–.16em).
Auto-hospedar via `next/font/google` em produção.

## 7. Definition of Done

1. Bate com a referência em `design-reference/` (cores/tipo/espaçamento dos tokens).
2. Responsivo (o app mobile em `DESIGN_SPEC.md` é a referência para < 768px).
3. Acessível (teclado + leitor de tela + contraste AA).
4. Sem erros TypeScript/ESLint; testes do fluxo passando.
5. Estados de loading/erro/vazio implementados.
6. **Nenhum recurso AWS fora do escopo `lupa-*` foi criado, alterado ou destruído.**

## 8. O que NÃO fazer

- ❌ Tocar em recursos AWS que não sejam `lupa-*` (ver §0).
- ❌ Portar `support.js`/`image-slot.js`/`*.dc.html` para produção (são só referência visual).
- ❌ Cores fora da paleta monocromática ou gradientes decorativos.
- ❌ Libs de UI pesadas (MUI, Chakra) — design sob medida com Tailwind.
- ❌ Usar Mux/Vercel — aqui é **AWS** (MediaConvert/IVS/S3/CloudFront/Lambda/Aurora/Cognito).
- ❌ Inventar telas/conteúdo fora de `DESIGN_SPEC.md` e dos prompts sem perguntar.
