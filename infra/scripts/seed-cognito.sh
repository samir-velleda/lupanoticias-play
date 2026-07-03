#!/usr/bin/env bash
# Seed de usuários de teste no Cognito (um por grupo). SÓ recursos lupa-*.
# NÃO commita segredo: a senha vem de $SENHA no ambiente.
# Uso: SENHA='Senha-Forte-123!' bash infra/scripts/seed-cognito.sh [dev]
set -euo pipefail

ENV="${1:-dev}"
REGION="us-east-1"
: "${SENHA:?defina SENHA (>=12, com maiúscula, minúscula, dígito e símbolo) no ambiente}"

POOL="$(aws ssm get-parameter --region "$REGION" --name "/lupa/$ENV/cognito/user-pool-id" --query Parameter.Value --output text)"
echo "User Pool: $POOL (env=$ENV)"

seed() { # email nome grupo
  local email="$1" nome="$2" grupo="$3"
  aws cognito-idp admin-create-user --region "$REGION" --user-pool-id "$POOL" \
    --username "$email" \
    --user-attributes Name=email,Value="$email" Name=email_verified,Value=true Name=name,Value="$nome" \
    --message-action SUPPRESS >/dev/null 2>&1 || echo "  (usuário $email já existe — seguindo)"
  aws cognito-idp admin-set-user-password --region "$REGION" --user-pool-id "$POOL" \
    --username "$email" --password "$SENHA" --permanent
  aws cognito-idp admin-add-user-to-group --region "$REGION" --user-pool-id "$POOL" \
    --username "$email" --group-name "$grupo"
  echo "  ok: $email ($grupo)"
}

seed "admin@lupa.dev"      "Ana Admin"      admin
seed "diretor@lupa.dev"    "Dario Diretor"  diretor
seed "jornalista@lupa.dev" "Rafael Menezes" jornalista

echo "Seed concluído. Login: e-mails acima + a SENHA definida."
