# Lupa Notícias Play

Portal de jornalismo **video-first** com a plataforma **Lupa Play** — web + app (iOS/Android),
backend **100% AWS**, na conta **Boovest**, em projeto **isolado** (`lupa-*`).

> **Comece por [`CLAUDE.md`](./CLAUDE.md)** e depois abra [`prompts/README.md`](./prompts/README.md).

## O que tem aqui

- **`CLAUDE.md`** — charter do projeto + **guarda-corpos de segurança AWS** (não negociáveis).
- **`docs/`** — arquitetura e especificações:
  - `AWS_ARCHITECTURE.md` — Aurora, S3, CloudFront, Lambda, MediaConvert, IVS, Cognito, CDK.
  - `EDITORIAL_WORKFLOW.md` — papéis, Diretor de Redação, aprovação/recusa, modo automático,
    publicidade, analytics.
  - `DATA_MODEL.md` — schema Aurora + tipos + contrato `repositories`.
  - `DESIGN_SYSTEM.md` — tokens, tipografia e telas (resumo).
  - `MOBILE_CAPACITOR.md` — app iOS/Android via Capacitor + Codemagic.
  - `GIT_CICD.md` — fluxo Git, branches, CI/CD.
- **`prompts/`** — prompts sequenciais (00→09) para o **Claude terminal** desenvolver.
- **`brand/`** — logos SVG + `tokens.css`.
- **`design-reference/`** — protótipos HTML e `DESIGN_SPEC.md` (fonte de verdade de UI).
- **`infra/`** — AWS CDK (será scaffoldado no prompt 01).

## Como usar (fluxo)

1. Suba esta pasta para o repositório
   **https://github.com/samir-velleda/lupanoticias-play** (o prompt 00 faz isso).
2. Abra o **Claude terminal** dentro desta pasta e execute os prompts de `prompts/` **em ordem**,
   um por vez.
3. O terminal já tem acesso à conta AWS **Boovest** e provisiona **somente** recursos `lupa-*`
   isolados, via CDK, sem tocar em outros projetos.

## Princípios inegociáveis

- **Isolamento AWS**: tudo `lupa-*`, tag `Project=lupa-noticias`, só via CDK, **aditivo**.
  Nunca altera/remove recursos de outros projetos. `cdk diff` antes de todo deploy; nada de `cdk destroy` em CI.
- **AWS-only**: Aurora, S3, CloudFront, Lambda, MediaConvert, IVS, Cognito, SNS, SQS/EventBridge.
- **Git-first**: todo o fluxo pelo repositório; app mobile via Codemagic disparado por Git.
- **Design monocromático** hi-fi, 3 tipografias (Archivo/Newsreader/IBM Plex Mono).
