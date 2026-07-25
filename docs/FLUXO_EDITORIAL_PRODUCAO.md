# Fluxo editorial — produção (Jornalista → Diretor/Admin)

## Happy path

1. **Jornalista** faz login Cognito (grupo `jornalista`) → `/jornalista`
2. **Nova matéria** → título + corpo (blocos) → **Enviar para revisão**
3. Status vira `pendente` (ou `publicada` se modo automático da editoria estiver ON)
4. **Admin/Diretor** → `/admin/redacao` → abre matéria → lê corpo completo
5. **Aprovar e publicar** → status `publicada` + registro em `revisao_materia` → Home/`/{editoria}/{slug}`
6. Ou **Recusar** + justificativa → status `recusada` → jornalista em `/jornalista/correcoes`

## Regras

| Ação | Quem | Status de entrada | Status de saída |
|------|------|-------------------|-----------------|
| Salvar rascunho | jornalista (+ staff) | — / editável | `rascunho` |
| Enviar revisão | jornalista (+ staff) | rascunho, pendente, recusada, em_correcao | `pendente` |
| Aprovar | admin, diretor | `pendente` | `publicada` |
| Recusar | admin, diretor | `pendente` | `recusada` |
| Corrigir | jornalista | recusada → em_correcao | reenvia → pendente |

- Autor sempre ligado ao Cognito `sub` (`author.cognito_sub`).
- Corpo obrigatório no envio (não só título).
- Aprovar/recusar são **transacionais** e **idempotentes** (reenvio seguro).
- `revalidatePath` no Lambda é best-effort (FS read-only); páginas de portal são `force-dynamic`.

## Deploy

```bash
bash infra/scripts/package-web.sh
cd infra/assets/lupa-web && zip -qr /tmp/lupa-web-dev.zip .
aws lambda update-function-code --profile boovest --region us-east-1 \
  --function-name lupa-web-dev --zip-file fileb:///tmp/lupa-web-dev.zip
```

Somente recursos `lupa-*`. Não tocar outros projetos da conta Boovest.
