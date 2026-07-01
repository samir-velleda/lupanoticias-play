# Prompt 00 — Bootstrap do monorepo e Git

Você é o Claude Code trabalhando no projeto **Lupa Notícias Play**. Antes de tudo, **leia
`CLAUDE.md` por completo**, com atenção especial ao **§0 (guarda-corpos de segurança AWS)**.
Depois leia `docs/AWS_ARCHITECTURE.md` e `docs/GIT_CICD.md`.

## Objetivo
Preparar o monorepo, o controle de versão e o esqueleto de pastas, sem provisionar nada na AWS
ainda. Trabalhe de ponta a ponta, sem pedir permissão.

## Tarefas
1. Confirme que a pasta atual já contém: `CLAUDE.md`, `docs/`, `prompts/`, `brand/`,
   `design-reference/`. Não apague nem sobrescreva esses arquivos.
2. Crie o monorepo com **npm workspaces**: `package.json` raiz com `workspaces: ["web","infra","mobile"]`.
3. Crie os diretórios `web/`, `infra/`, `mobile/` (podem ficar como stubs com um README curto
   explicando o papel de cada um, conforme `docs/AWS_ARCHITECTURE.md` §8).
4. Crie `.gitignore` conforme `docs/GIT_CICD.md` §5 e um `.env.example` (sem valores reais)
   listando as variáveis que serão usadas (Aurora secret ARN, Cognito pool id, bucket names,
   CloudFront domain, APP_URL, etc.).
5. Crie `.github/workflows/ci.yml` (lint + `tsc --noEmit` + test + build) — pode deixar os jobs
   de deploy (`deploy-dev.yml`, `deploy-prod.yml`) como esqueleto comentado por enquanto, mas já
   incluindo o **guarda-corpo de diff** do `docs/GIT_CICD.md` §3.
6. Inicialize o Git e faça o **primeiro push** conforme `docs/GIT_CICD.md` §2 para
   `https://github.com/samir-velleda/lupanoticias-play`. Se o remote já tiver conteúdo, faça
   `git pull --rebase` e **não** use `--force`. Crie e publique a branch `develop`.

## Restrições
- **Nenhuma** chamada à AWS neste prompt. Nada de `cdk deploy`.
- Não coloque segredos no repo. `.env*` (exceto `.env.example`) no `.gitignore`.

## Critério de aceite
- `npm install` na raiz funciona (workspaces resolvidos).
- `git log` mostra o commit de bootstrap; `main` e `develop` publicados no remote.
- Árvore de pastas bate com `docs/AWS_ARCHITECTURE.md` §8.
- CI `ci.yml` presente e válido (pode rodar mesmo com stubs).
