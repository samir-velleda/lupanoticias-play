# Plano para 100% em produção — Lupa Notícias

**Data:** 2026-07-25  
**Conta:** Boovest (`242218429698`) · Região: `us-east-1`  
**Regra:** só stacks `Lupa*` / recursos `lupa-*` · tag `Project=lupa-noticias`

---

## 1. Estado atual (foto)

| Ambiente | URL | Stacks | Código editorial (aprovar/recusar hardened) |
|----------|-----|--------|-----------------------------------------------|
| **DEV / staging** | https://d38vv9f8v1kb7v.cloudfront.net | `Lupa*-dev` + Media | Atualizado (Lambda ~17:04 UTC 25/07) |
| **PROD** | https://d49e3n8xzbfoy.cloudfront.net | `Lupa*-prod` (sem Media) | **Atrasado** (Lambda ~12:23 UTC — antes do fix editorial) |

### Já funciona (núcleo)

- Site público (Home, editorias, matérias, Play seed)
- Cognito + grupos (`admin`, `diretor`, `jornalista`)
- Aurora PostgreSQL (dev e prod)
- Fluxo editorial no **código** (criar → pendente → aprovar/recusar)
- Origin secret CloudFront → Lambda
- Isolamento na conta Boovest

### Ainda não é “100%”

| Gap | Severidade | Onde |
|-----|------------|------|
| Código hardened **não promovido a prod** | **P0** | `lupa-web-prod` |
| E2E logado assinado em **prod** | **P0** | Operação |
| Domínio custom + ACM + DNS | P1 | Marca / SEO |
| OAC forte (origem Lambda) | P1 | Segurança charter |
| Estúdio vídeo (UI + MediaConvert) | P1 | Produto |
| `LupaMedia-prod` (só existe Media-dev) | P1 | Vídeo |
| Relatórios reais | P2 | Admin |
| Publicidade real | P2 | Admin |
| App mobile Capacitor | P2 | Canal |
| CI/CD OIDC deploy | P2 | Ops |
| NAT / Lambda em subnet privada (prod sem NAT) | P2 | Rede (cota conta) |
| Senhas bootstrap trocadas | P0 ops | Cognito prod |
| Observabilidade (alarms + on-call) | P1 | Ops |

---

## 2. Definição de “100% pronto”

Só declarar **produção 100%** quando:

1. **Código** em `lupa-web-prod` = `main` estável (inclui fix editorial).  
2. **E2E prod** (3 papéis) passa e fica registrado.  
3. **Senhas bootstrap** trocadas.  
4. **Rollback** testado (zip anterior da Lambda).  
5. **Alarmes** CloudWatch ativos e checados.  
6. **Domínio** (ou decisão formal de ficar em CloudFront por fase).  
7. Módulos de produto do roadmap da fase (Estúdio se vídeo for must-have no lançamento).

**MVP de lançamento editorial** (menor que 100% produto): itens 1–5 + decisão sobre domínio e Estúdio.

---

## 3. Plano por fases

### Fase 0 — Congelar e alinhar (0,5–1 dia) · **obrigatório agora**

**Objetivo:** prod = mesmo código estável do dev + checklist de risco.

| # | Tarefa | Dono | Critério de pronto |
|---|--------|------|--------------------|
| 0.1 | Tag git `v1.0.0-editorial` no `main` atual (`da9ca9e` ou posterior) | Eng | Tag no GitHub |
| 0.2 | `package-web.sh` + `update-function-code` em **`lupa-web-prod`** | Eng | Lambda Active, home prod 200 |
| 0.3 | Smoke prod: home, matéria seed/rota dinâmica, `/admin` 307 | Eng | Tabela smoke verde |
| 0.4 | Confirmar Cognito prod callbacks = URL prod CloudFront | Eng | Login redireciona certo |
| 0.5 | Trocar senhas bootstrap (admin/diretor/jornalista) | Ops | Login com senha nova |
| 0.6 | E2E prod assinado (script abaixo) | Ops + Eng | Checklist assinado |

**E2E prod (assinatura):**

```
[ ] Jornalista: login → nova matéria (título+corpo) → enviar
[ ] Diretor: /admin/redacao → abre corpo completo → aprovar
[ ] Público: Home e /{editoria}/{slug} mostram matéria
[ ] Jornalista: outra matéria → diretor recusa com justificativa
[ ] Jornalista: /jornalista/correcoes → corrige → reenvia → aprova
[ ] (Se upload imagem ativo) foto aparece no CDN mídia prod
```

**Comando deploy só código (prod):** ver `docs/RUNBOOK_PRODUCAO.md`.

---

### Fase 1 — Produção editorial segura (1–3 dias) · **P0/P1**

**Objetivo:** operação diária da redação sem surpresa.

| # | Tarefa | Detalhe | Critério |
|---|--------|---------|----------|
| 1.1 | Alarmes | Erros Lambda, 5xx CF, Aurora CPU/ACU, falhas Cognito | SNS/e-mail |
| 1.2 | Logs estruturados | Correlacionar `materiaId` / `sub` em actions | Query CloudWatch |
| 1.3 | Backup / restore drill | Snapshot Aurora prod; documentar restore | Runbook testado |
| 1.4 | Rate limit / abuso | WAF básico no CloudFront (opcional mas recomendado) | Regras ativas |
| 1.5 | Política de usuários | Só staff Cognito; sem self-signup | Pool config |
| 1.6 | Decisão domínio | Ficar em `*.cloudfront.net` **ou** ACM + Route53 | Decisão escrita |
| 1.7 | OAC / origem | Fortalecer CloudFront→Lambda (charter) | Diff só `LupaWeb-prod` |

**Saída da Fase 1:** “Produção editorial oficial” (mesmo sem Estúdio/ads).

---

### Fase 2 — Produto completo (1–2 semanas) · **P1**

**Objetivo:** fechar módulos ainda `EmBreve`.

| # | Módulo | Escopo | Stacks |
|---|--------|--------|--------|
| 2.1 | **Estúdio** | Upload pre-signed → MediaConvert → HLS → listagem status | `LupaMedia-prod` + UI |
| 2.2 | **Ao vivo** | IVS (se must-have) ou adiar | Media/Auth |
| 2.3 | **Relatórios** | Views/cliques por matéria (analytics ingest + UI) | Web + Aurora |
| 2.4 | **Publicidade** | Campanhas/slots/CTR (modelo já no DATA_MODEL) | Web + S3 |
| 2.5 | **Pautas** | Diretor cria pauta na UI (API já existe em repositório) | Web |

Ordem sugerida: **2.5 → 2.1 → 2.3 → 2.4 → 2.2**.

---

### Fase 3 — Escala e polish (contínuo) · **P2**

| # | Tarefa |
|---|--------|
| 3.1 | Domínio `lupanoticias.com.br` + redirects |
| 3.2 | CI/CD GitHub Actions OIDC → deploy `Lupa*-prod` com gate manual |
| 3.3 | App mobile Capacitor + Codemagic |
| 3.4 | Cota NAT + Lambda em subnet privada (sair de public subnet) |
| 3.5 | OpenSearch / busca (fase 2 do DATA_MODEL) |
| 3.6 | Multi-ambiente formal: PR → dev → prod |

---

## 4. Ordem de execução recomendada (resumo)

```
HOJE          Fase 0: promover código a prod + E2E + senhas
ESTA SEMANA   Fase 1: alarmes, backup drill, domínio (decisão), OAC
PRÓX. SPRINT  Fase 2: pautas UI → estúdio → relatórios → ads
DEPOIS        Fase 3: domínio final, CI, mobile, rede
```

---

## 5. Riscos e guarda-corpos

| Risco | Mitigação |
|-------|-----------|
| Deploy CDK toca recurso alheio | `cdk diff 'Lupa*-prod'` só; nunca `destroy` |
| Prod sem o fix de aprovar/recusar | **Fase 0.2 obrigatória** |
| Prod sem NAT / Lambda pública | Aceitar risco documentado ou liberar cota NAT |
| Dados de teste no seed | Seed só se DB vazio; não re-seed em prod com dados reais |
| Segredos em logs | Nunca logar token/secret |

---

## 6. Critérios de aceite por fase

### Fase 0 — “Pronto para usar em prod de verdade”

- [ ] `lupa-web-prod` com build atual  
- [ ] Home prod 200  
- [ ] E2E 6 passos verde  
- [ ] Senhas bootstrap trocadas  

### Fase 1 — “Produção editorial oficial”

- [ ] Alarmes + runbook de incidente  
- [ ] Restore drill  
- [ ] Decisão domínio + OAC (ou ticket explícito adiado)  

### Fase 2 — “Produto 100% escopo portal”

- [ ] Zero `EmBreve` em rotas do menu admin/estúdio usadas no lançamento  
- [ ] Estúdio ou decisão “vídeo só fase 2” assinado  

### Fase 3 — “Plataforma completa”

- [ ] Domínio, CI, mobile conforme roadmap de negócio  

---

## 7. Estimativa de esforço (ordem de grandeza)

| Fase | Esforço | Dependências |
|------|---------|--------------|
| 0 | 0,5–1 dia | AWS access |
| 1 | 1–3 dias | Fase 0 |
| 2 | 5–10 dias eng | MediaConvert/IVS se vídeo |
| 3 | 2–4 semanas | Domínio, store mobile |

---

## 8. Próxima ação imediata (1 comando mental)

1. **Promover o código atual para `lupa-web-prod`.**  
2. **Rodar E2E nos 3 usuários Cognito prod.**  
3. **Trocar senhas.**  

Sem isso, “prod” existe na infra, mas o **fix editorial mais recente ainda está só no dev**.

---

## 9. Referências

- `docs/RUNBOOK_PRODUCAO.md` — deploy/rollback  
- `docs/FLUXO_EDITORIAL_PRODUCAO.md` — regras do workflow  
- `docs/E2E_EDITORIAL.md` / `docs/GO_LIVE.md` — histórico go-live  
- `docs/AWS_ARCHITECTURE.md` · `CLAUDE.md` §0 (isolamento)  
