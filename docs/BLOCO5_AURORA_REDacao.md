# Bloco 5 — Aurora + Redação (implementado)

## O que mudou
- `LUPA_USE_AURORA=true` passa a usar repositório Aurora (`web/src/lib/data/aurora/`).
- Schema + seed idempotentes no primeiro request (mantém Home com dados seed).
- Portal `/admin/redacao` com fila (título + standfirst/trecho) e detalhe com **corpo completo**.
- Server actions: `aprovarMateria`, `recusarMateria` (justificativa obrigatória).
- Autor real via Cognito `sub` → `author.cognito_sub`.
- Validação: enviar para revisão exige corpo com conteúdo.
- `dynamicParams=true` para matérias/mídia novas.

## Deploy seguro (sem tocar outros projetos)
```bash
# só código da Lambda lupa-web-dev (preserva VPC/IAM/env)
bash infra/scripts/package-web.sh
cd infra/assets/lupa-web && zip -qr /tmp/lupa-web-dev.zip .
aws lambda update-function-code --function-name lupa-web-dev --zip-file fileb:///tmp/lupa-web-dev.zip
```
Não rodar `cdk destroy`. `cdk deploy` só em stacks `Lupa*`.

## Teste E2E manual
1. Login jornalista → Nova matéria (título + parágrafos) → Enviar para revisão.
2. Login diretor/admin → `/admin/redacao` → abrir matéria → ver corpo completo.
3. Aprovar → Home/`/{editoria}/{slug}` mostra a matéria.
4. Ou recusar com justificativa → jornalista em `/jornalista/correcoes`.

## Pós-Bloco 5 (polish)
- Ownership: jornalista só edita as próprias matérias; staff (admin/diretor) pode editar.
- Status: rascunho/pendente/recusada/em_correcao editáveis; publicadas bloqueadas ao jornalista.
- Nav separada: diretor vê Painel + Fila + Relatórios; admin vê menu completo.
