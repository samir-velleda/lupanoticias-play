# Go-live Lupa Notícias — status

Data: 2026-07-25 · Conta Boovest · Só recursos `lupa-*` / stacks `Lupa*`.

## Produção no ar

| Ambiente | URL |
|----------|-----|
| **PROD** | https://d49e3n8xzbfoy.cloudfront.net |
| DEV (staging) | https://d38vv9f8v1kb7v.cloudfront.net |

## O que foi entregue nas 3 etapas

### Etapa 1 — Produto
- Upload de imagem de matéria (pre-signed S3 → CDN)
- Editor com “Enviar arquivo” (hero + bloco imagem)
- Guards de status (aprovar/recusar só pendente)
- `em_correcao` ao reabrir matéria recusada
- Cover com fallback (sem foto quebrada)
- Modo automático na UI (`/admin/configuracoes`)
- Seed fictício sem paths de imagem inválidos
- Deploy de código em `lupa-web-dev`

### Etapa 2 — Infra prod
- Stacks `Lupa*-prod` (Network, Storage, Data, Auth, Web)
- Aurora Serverless v2 16.8, deletion protection, backup 14d
- Cognito prod + grupos
- Buckets `lupa-*-prod` + CDN mídia
- Origin secret CloudFront → Lambda
- Alarme CloudWatch `lupa-web-prod-errors`
- Rede prod **sem NAT** (cota da conta)

### Etapa 3 — Cutover
- Usuários staff no Cognito prod (admin / diretor / jornalista)
- Callbacks Cognito apontando para a URL CloudFront prod
- Documentação: este arquivo, `RUNBOOK_PRODUCAO.md`, `E2E_EDITORIAL.md`

## Contas bootstrap (trocar senha no 1º login)

Criadas em `lupa-users-prod`. **Altere as senhas imediatamente.**

| Papel | E-mail |
|-------|--------|
| Admin | `admin@lupanoticias.prod` |
| Diretor | `diretor@lupanoticias.prod` |
| Jornalista | `jornalista@lupanoticias.prod` |

Senhas iniciais foram definidas no bootstrap do deploy (política Cognito: 12+ com maiúscula, minúscula, número e símbolo). Se precisar redefinir:

```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_BeRtry058 \
  --username admin@lupanoticias.prod \
  --password 'NovaSenhaSegura2026!' \
  --permanent --region us-east-1 --profile boovest
```

## Checklist pós-go-live (você)

1. [ ] Abrir https://d49e3n8xzbfoy.cloudfront.net — home carrega
2. [ ] Login jornalista → nova matéria + upload de foto → enviar
3. [ ] Login diretor → `/admin/redacao` → ler e aprovar
4. [ ] Público vê matéria com foto no CDN
5. [ ] Trocar senhas bootstrap
6. [ ] Quando tiver domínio: ACM + `-c webDomainNames` + DNS (ver runbook)
7. [ ] (Opcional) aumentar cota NAT e migrar Lambda prod para subnet privada

## Fora deste go-live (próximas iterações)

- Domínio custom `lupanoticias.com.br`
- Estúdio vídeo completo na UI
- Publicidade / analytics reais
- App mobile Capacitor
- CI deploy OIDC (`deploy-dev.yml` ainda desligado)
