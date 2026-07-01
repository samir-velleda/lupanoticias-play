# Prompt 06 — Auth (Cognito) + Portais Admin e Jornalista (shells)

Leia `docs/AWS_ARCHITECTURE.md` §6, `docs/EDITORIAL_WORKFLOW.md` §1/§4/§5 e `docs/DESIGN_SYSTEM.md`
§5 (portais no mesmo sistema visual monocromático).

## Objetivo
Ligar autenticação **Amazon Cognito** (grupos = papéis) e criar as cascas navegáveis do **Portal
Admin** e do **Portal do Jornalista**, com autorização por papel. Ponta a ponta.

## Tarefas
1. **Auth Cognito**: integre o User Pool `lupa-users-<env>` (Hosted UI ou fluxo próprio).
   Middleware de rota lê `cognito:groups` e protege: `(studio)/*`, `(admin)/*`, `(jornalista)/*`.
   Site público continua aberto. Helpers: `getUsuarioAtual()`, `exigirGrupo('admin'|'diretor'|'jornalista')`.
   `admin` herda permissões de `diretor`.
2. **Seed de usuários** (script CDK/CLI, só `lupa-*`): crie usuários de teste em cada grupo.
3. **Portal do Jornalista** `(jornalista)/`:
   - `/jornalista` (Minhas matérias — lista com badges de status, filtro).
   - `/jornalista/pautas` (Pautas da semana — cards).
   - `/jornalista/materia/nova` e `/jornalista/materia/[id]` (editor de matéria por blocos:
     parágrafo/H2/pull-quote/imagem/embed; título, standfirst, editoria, tags, imagem principal,
     vincular pauta; ações Salvar rascunho / Enviar para revisão).
   - `/jornalista/correcoes` (matérias recusadas/em correção com a **justificativa em destaque**).
4. **Portal Admin** `(admin)/`:
   - `/admin` (dashboard — KPIs placeholder por ora).
   - navegação para: Relatórios, Publicidade, Usuários, **Diretor de Redação**, Configurações
     (páginas podem ser shells; a lógica vem nos prompts 07/08).
   - `/admin/usuarios` funcional: listar/criar/gerir papéis via Cognito.
5. Todos os portais no **sistema visual monocromático** (Archivo/Newsreader/Mono, inversão,
   tokens, componentes `ui/`).

## Critério de aceite
- Login Cognito funciona; rotas protegidas por grupo (jornalista não acessa `/admin`, etc.).
- Cascas de ambos os portais navegáveis e fiéis ao sistema visual.
- Editor de matéria salva rascunho via `repositories`.
- Commit + push (`feat: cognito auth + portais admin/jornalista (shells)`).
