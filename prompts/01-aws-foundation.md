# Prompt 01 — Fundação AWS (CDK, isolada e segura)

Leia primeiro `CLAUDE.md` §0 e `docs/AWS_ARCHITECTURE.md` inteiro. A conta é **Boovest** e
contém **outros projetos** — o isolamento é obrigatório.

## Objetivo
Provisionar, **só via AWS CDK (TypeScript)**, a fundação isolada `lupa-*` em `us-east-1`,
ambiente `dev` primeiro. Trabalhe de ponta a ponta, sem pedir permissão — **exceto** se algum
`cdk diff` mostrar impacto fora do prefixo `Lupa`, aí **PARE e reporte**.

## Tarefas (em `infra/` — CDK TS)
1. Inicialize o app CDK. Em `bin/lupa.ts` instancie as stacks com nomes `Lupa<Nome>-<env>`.
2. Aplique em **todos** os recursos, via Aspects, as tags `Project=lupa-noticias` e `Env=<env>`,
   e o prefixo de nome `lupa-` (helper em `lib/tags.ts`). Nada sem tag/prefixo.
3. Stacks:
   - `LupaNetwork-<env>` — VPC dedicada `lupa-vpc-<env>` (2 AZ, subnets privadas p/ Aurora,
     subnets públicas só p/ NAT/endpoints necessários), SGs `lupa-*`.
   - `LupaData-<env>` — **Aurora PostgreSQL Serverless v2** `lupa-aurora-<env>` em subnets
     privadas; credenciais em **Secrets Manager** `/lupa/<env>/aurora`; deletion protection
     LIGADO em prod, backups ≥ 7 dias. Exponha só para as Lambdas/SG do projeto.
   - `LupaStorage-<env>` — buckets `lupa-media-<env>`, `lupa-uploads-<env>`,
     `lupa-web-static-<env>` (block public access, versionamento no media); **CloudFront**
     `lupa-cdn-<env>` com OAC para servir media/estáticos. CORS no bucket de uploads p/ PUT
     via pre-signed URL. Ciclo de vida em uploads (expirar multipart incompletos).
   - `LupaAuth-<env>` — **Cognito User Pool** `lupa-users-<env>` + grupos `admin`, `diretor`,
     `jornalista`; app client; domínio hospedado. Sem federar nada por ora.
4. `cdk.json` + `package.json` do workspace `infra` com scripts `diff`, `deploy`, `synth`
   **restritos ao padrão `Lupa*-<env>`**.
5. Escreva no README de `infra/` como rodar com segurança.

## Guarda-corpos (obrigatórios)
- **Antes de qualquer deploy**: rode `cdk diff 'Lupa*-dev'` e cole o resumo do que será criado.
- Se o diff/synth listar **qualquer** stack que não comece com `Lupa`, **não faça deploy** —
  pare e reporte.
- **Nunca** referencie, importe ou modifique recursos existentes fora de `lupa-*` (buckets,
  VPCs default, roles, etc.). Se precisar de uma VPC, **crie a `lupa-vpc`** — não use a default.
- Nada de `cdk destroy`.

## Deploy
- Faça `cdk deploy 'Lupa*-dev'` (aditivo). Exporte outputs (ARNs/ids/domínios) e grave-os em
  SSM `/lupa/dev/*` e no `.env.example` (nomes das chaves, sem valores sensíveis).

## Critério de aceite
- Stacks `LupaNetwork/Data/Storage/Auth-dev` criadas, todas com tag `Project=lupa-noticias`.
- Nenhum recurso fora de `lupa-*` foi tocado (comprovar pelo `cdk diff`).
- Outputs disponíveis para os próximos prompts (bucket names, pool id, cdn domain, secret ARN).
- Commit + push (`feat: aws foundation (cdk) isolated lupa-* dev`).
