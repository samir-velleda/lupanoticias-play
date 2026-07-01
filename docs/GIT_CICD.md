# GIT_CICD.md — Fluxo Git & CI/CD

Todo o fluxo é via **Git**. Remote: **https://github.com/samir-velleda/lupanoticias-play**.

---

## 1. Branches

- `main` — produção. Protegida. Merge só via PR aprovado + CI verde.
- `develop` — integração / ambiente `dev`.
- `feature/*`, `fix/*`, `chore/*` — trabalho por milestone/prompt.

Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
PRs pequenos, um por milestone/prompt quando possível.

## 2. Primeiro push (bootstrap — prompt 00)

```bash
git init
git add .
git commit -m "chore: bootstrap Lupa Notícias Play (docs, brand, prompts, infra scaffold)"
git branch -M main
git remote add origin https://github.com/samir-velleda/lupanoticias-play.git
git push -u origin main
git checkout -b develop && git push -u origin develop
```

> Se o remote já tiver conteúdo, **não** forçar push. Fazer `git pull --rebase origin main`,
> resolver e então push. Nunca `push --force` em `main`/`develop`.

## 3. GitHub Actions (`.github/workflows/`)

- **`ci.yml`** (todos os PRs): `npm ci` → `lint` → `tsc --noEmit` → `test` → `build` (web).
- **`deploy-dev.yml`** (push em `develop`): `cdk diff Lupa*-dev` (log) → **`cdk deploy Lupa*-dev`**
  → deploy do web dev. **Aborta** se o diff listar qualquer stack fora do prefixo `Lupa`.
- **`deploy-prod.yml`** (push em `main`): igual, mas `-prod`, com aprovação manual (environment
  protection rule `production`).
- Credenciais AWS via **OIDC** (role `lupa-deploy-role`, escopo mínimo, só recursos `lupa-*`).
  Sem chaves estáticas no repo.

### Guarda-corpo de deploy (obrigatório nos workflows)
```bash
# Falha o job se cdk diff mencionar stack não-Lupa
npx cdk diff 'Lupa*-'$ENV > cdk.diff 2>&1 || true
if grep -E '^Stack ' cdk.diff | grep -qv '^Stack Lupa'; then
  echo "ABORT: diff toca stack fora do escopo Lupa"; exit 1
fi
```

`cdk destroy` **não existe** em nenhum workflow. Nunca automatizar destruição.

## 4. Codemagic (app mobile)

- Disparado por push/tag em `main` (ver `docs/MOBILE_CAPACITOR.md`).
- Segredos (assinatura iOS/Android) em grupos de variáveis do Codemagic, não no repo.

## 5. `.gitignore` (essencial)

```
node_modules/
.env
.env.*
!.env.example
web/.next/
web/out/
infra/cdk.out/
mobile/ios/App/Pods/
mobile/android/.gradle/
mobile/android/app/build/
*.keystore
*.p8
*.mobileprovision
.DS_Store
```

## 6. Segredos & configuração

- AWS: **Secrets Manager** / SSM (`/lupa/{env}/*`). App: variáveis do Codemagic.
- CI: **GitHub OIDC** → role `lupa-deploy-role`. Nada de credencial longa no repo.
- `.env.example` versionado (sem valores reais) documentando as variáveis necessárias.
