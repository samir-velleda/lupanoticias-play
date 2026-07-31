# Runbook — Lupa Notícias Produção

## Isolamento (obrigatório)

- Conta: Boovest · Região: `us-east-1`
- Só stacks `Lupa*-prod` e recursos `lupa-*-prod` / tag `Project=lupa-noticias`
- **Nunca** `cdk destroy` em CI; **nunca** tocar stacks de outros projetos

## URLs e parâmetros (atualizado no go-live)

| Item | Valor / onde |
|------|------|
| **URL web PROD** | https://d49e3n8xzbfoy.cloudfront.net |
| CDN mídia PROD | https://dhonmwf3rdyv2.cloudfront.net (SSM `/lupa/prod/cdn/domain`) |
| Cognito domain | https://lupa-users-prod.auth.us-east-1.amazoncognito.com |
| Cognito pool | `us-east-1_BeRtry058` (SSM `/lupa/prod/cognito/user-pool-id`) |
| Lambda | `lupa-web-prod` |
| Aurora | `lupa-aurora-prod` |
| URL web DEV (staging) | https://d38vv9f8v1kb7v.cloudfront.net |

### Stacks prod ativas

`LupaNetwork-prod` · `LupaStorage-prod` · `LupaData-prod` · `LupaAuth-prod` · `LupaWeb-prod`

### Nota de rede

Conta no **limite de 5 NAT Gateways**. Prod usa **0 NAT** (Lambda em subnet pública + Aurora isolado). Não criar NATs extras sem liberar cota.

## Deploy (só Lupa)

```bash
export AWS_PROFILE=boovest
export CDK_DEFAULT_ACCOUNT=242218429698
export CDK_DEFAULT_REGION=us-east-1

# 1) Build do artefato web
bash infra/scripts/package-web.sh

# 2) Diff (guarde-corpo)
cd infra
npx cdk diff 'Lupa*-prod' -c env=prod -c appBaseUrl=https://<WEB_CDN>

# 3) Deploy (após revisar diff)
npx cdk deploy 'Lupa*-prod' -c env=prod -c appBaseUrl=https://<WEB_CDN> --require-approval broadening
```

Atualização **só código** Lambda (sem tocar outras stacks):

```bash
bash infra/scripts/package-web.sh
cd infra/assets/lupa-web && zip -qr /tmp/lupa-web-prod.zip .
aws lambda update-function-code \
  --function-name lupa-web-prod \
  --zip-file fileb:///tmp/lupa-web-prod.zip \
  --region us-east-1
```

## Rollback

1. Redeploy da versão anterior do zip da Lambda, **ou**
2. `cdk deploy LupaWeb-prod` com o commit anterior do monorepo
3. Não destruir Aurora/S3

## Criar usuário da redação

Portal `/admin/usuarios` (grupo admin) **ou**:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <POOL_PROD> \
  --username redacao@exemplo.com \
  --user-attributes Name=email,Value=redacao@exemplo.com Name=email_verified,Value=true \
  --region us-east-1
aws cognito-idp admin-add-user-to-group \
  --user-pool-id <POOL_PROD> \
  --username <USERNAME> \
  --group-name jornalista \
  --region us-east-1
```

## Incidentes comuns

| Sintoma | Ação |
|---------|------|
| 403 no site | Header `x-lupa-origin` / secret CloudFront↔Lambda |
| Upload 403 | CORS no bucket mídia + IAM `media/articles/*` |
| Timeout / cold start | Aurora ACU; logs `/aws/lambda/lupa-web-prod` |
| Foto quebrada | URL deve ser `https://{cdn-midia}/media/articles/...` |

## Domínio custom (quando houver)

1. ACM em `us-east-1`
2. `cdk deploy LupaWeb-prod -c webDomainNames=... -c webCertArn=... -c appBaseUrl=https://...`
3. Atualizar callbacks Cognito (`LupaAuth-prod` com mesmo `appBaseUrl`)
4. DNS CNAME/Alias → CloudFront
