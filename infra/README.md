# infra/ — AWS CDK (isolado `lupa-*`)

Provisiona **somente** recursos `lupa-*` na conta Boovest, em `us-east-1`. Ver
`../docs/AWS_ARCHITECTURE.md` e `../CLAUDE.md` §0.

## Stacks (`Lupa*-<env>`)

| Stack | Recursos |
|---|---|
| `LupaNetwork-<env>` | VPC `lupa-vpc-<env>` (2 AZ: pública, app c/ egress, data isolada), NAT, SGs `lupa-app-sg` / `lupa-db-sg` (5432 só do app-sg) |
| `LupaData-<env>` | Aurora PostgreSQL Serverless v2 `lupa-aurora-<env>` (subnets isoladas), segredo `/lupa/<env>/aurora`, backups ≥ 7d, deletion protection **on** em prod |
| `LupaStorage-<env>` | Buckets `lupa-media` (versionado), `lupa-uploads` (CORS PUT + expira multipart), `lupa-web-static` — todos block-public + TLS-only; CloudFront `lupa-cdn` c/ OAC |
| `LupaAuth-<env>` | Cognito User Pool `lupa-users-<env>` + grupos `admin`/`diretor`/`jornalista`, app client web, domínio hospedado |

Toda a árvore recebe tags `Project=lupa-noticias`, `Env=<env>`, `ManagedBy=cdk`
via `lib/tags.ts`. Nomes físicos via `lib/config.ts` (`resourceName`/`stackName`).

## Como rodar (com segurança)

```bash
cd infra
npm install

# Sempre inspecionar ANTES de deploy:
npm run list                 # deve listar só LupaNetwork/Data/Storage/Auth-dev
npm run synth                # cdk synth 'Lupa*-dev'
npm run diff                 # cdk diff 'Lupa*-dev'  <-- LEIA o diff

# Só depois de revisar o diff (aditivo, tudo lupa-*):
npm run deploy               # cdk deploy 'Lupa*-dev'
```

Ambiente via contexto (`dev` é o default): `npx cdk diff 'Lupa*-prod' -c env=prod`.
Scripts `:prod` já existem no `package.json`.

## Guarda-corpos (obrigatório — CLAUDE.md §0)

- **Antes de qualquer deploy**: rode `npm run diff` e leia o resumo.
- Se o `diff`/`list` mostrar **QUALQUER** stack fora do prefixo `Lupa`, **PARE** e reporte.
  Não faça deploy.
- Deploys são **aditivos**: só criam recursos `lupa-*`. Nunca referenciam, importam
  ou alteram recursos alheios (buckets, VPC default, roles pré-existentes).
- **Nunca** `cdk destroy` (proibido em CI; em dev, só manual e só `Lupa*-dev`).
- Region **sempre** `us-east-1`.

## Bootstrap (pré-requisito do primeiro deploy)

O deploy exige o ambiente CDK bootstrapado nesta conta/region. Bootstrap é
**aditivo** (cria a stack `CDKToolkit` + bucket/role `cdk-*`, não toca em nada `lupa-*`
nem em outros projetos):

```bash
npx cdk bootstrap aws://<ACCOUNT_ID>/us-east-1
```

## Outputs

Após o deploy, os identificadores ficam em **SSM** sob `/lupa/<env>/*`
(bucket names, CDN domain/id, Aurora endpoint/secret ARN, Cognito pool/client/domain)
e como **CfnOutputs** de cada stack. As chaves esperadas estão em `.env.example`.
