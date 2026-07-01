# Prompt 07 — Workflow editorial + Aurora real

Leia `docs/EDITORIAL_WORKFLOW.md` inteiro e `docs/DATA_MODEL.md` (§2 schema, §3 repositories).

## Objetivo
Implementar o fluxo editorial completo (Diretor de Redação, pautas, aprovação/recusa com
justificativa, pendências, modo automático por categoria) e **trocar o `repositories` mock pela
implementação Aurora** (Prisma), sem alterar a UI. Ponta a ponta.

## Tarefas
1. **Prisma + Aurora**: modele o schema de `docs/DATA_MODEL.md` §2 (materia, revisao_materia,
   pauta, pauta_atribuido, modo_automatico, media, editoria, author, etc.). Rode migrations
   contra `lupa-aurora-<env>` (credenciais de Secrets Manager `/lupa/<env>/aurora`). Seed pt-BR.
2. **Implementação `repositories` Aurora** (`src/lib/data/cms/` ou `.../aurora/`) cobrindo o
   contrato do §3 — inclusive as funções de workflow. Faça o singleton `repositories` apontar
   para Aurora (mantendo o mock para testes). **UI não muda.**
3. **Máquina de estados** (`docs/EDITORIAL_WORKFLOW.md` §2): implemente transições e regras.
   - Jornalista `enviarParaRevisao` → `pendente`, **exceto** se `modo_automatico` da categoria
     estiver ativo → publica direto (`publicada`, respeitando agendamento).
   - `recusar` exige `justificativa` (Zod rejeita vazio) e grava `revisao_materia`.
   - `aprovar` → publica (ou agenda).
4. **APIs** (`docs/EDITORIAL_WORKFLOW.md` §8): materias (criar/editar/enviar/minhas),
   revisao/pendentes, aprovar, recusar, pautas (listar/criar/editar), config/modo-automatico.
   Autorização por grupo Cognito.
5. **UI Diretor de Redação** `(admin)/admin/redacao`:
   - Pautas da semana (criar/atribuir/encerrar).
   - Fila de aprovação (aprovar; recusar com justificativa obrigatória).
   - Modo automático por categoria (toggles) — refletindo `modo_automatico`.
6. **Portal do Jornalista**: ligar de verdade — status reais, pautas reais, e a **justificativa
   do Diretor** aparecendo em `/jornalista/correcoes`; corrigir e reenviar.

## Critério de aceite
- Fluxo completo demonstrável: jornalista cria → pendente → diretor recusa c/ justificativa →
  aparece p/ jornalista → corrige → reenvia → diretor aprova → publica no site.
- Modo automático por categoria publica direto quando ligado.
- `repositories` roda contra Aurora; UI intacta; migrations versionadas. `cdk diff` limpo (só `Lupa*`).
- Commit + push (`feat: workflow editorial + aurora (prisma) real`).
