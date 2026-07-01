# Prompt 02 — Fundação do web app (Next.js + design system)

Leia `CLAUDE.md`, `docs/DESIGN_SYSTEM.md`, `docs/DATA_MODEL.md` e `design-reference/DESIGN_SPEC.md`.
Use `brand/tokens.css` e os SVG de `brand/`.

## Objetivo
Subir o Next.js (App Router) com o sistema de design monocromático, tipos de domínio e a camada
`repositories` com **implementação mock** (dados pt-BR extraídos do design). Ponta a ponta.

## Tarefas (em `web/`)
1. `create-next-app` (TypeScript strict, ESLint, Tailwind, App Router, `src/`, alias `@/`).
2. Copie `brand/tokens.css` → `web/src/styles/tokens.css`. Configure `tailwind.config.ts`
   com o tema derivado dos tokens (cores, `fontFamily` display/serif/mono, radius, shadow) —
   ver `docs/DESIGN_SYSTEM.md` §2/§3.
3. Fontes via `next/font/google`: Archivo (400–900), Newsreader (400–600 + itálico),
   IBM Plex Mono (400–600). `<html lang="pt-BR">` com as variáveis aplicadas.
4. Converta os SVG da marca em componentes React (`LupaMark`, `LupaLockup`, `LupaLockupWhite`).
5. Defina os tipos de `docs/DATA_MODEL.md` §1 em `src/types/`.
6. Crie `src/lib/data/repositories.ts` (a interface completa do §3) e uma implementação
   **mock** em `src/lib/data/mock/` com dados pt-BR plausíveis para: editorias, autores,
   ~12 matérias (com blocos variados), mídias (vídeos/podcasts/live/cortes), playlists,
   "mais lidas", "opinião". Exporte um `repositories` singleton (mock por enquanto).
7. `src/lib/format.ts` (datas/duração/números pt-BR) + testes Vitest.
8. `src/lib/aws.ts` stub (clientes S3/Cognito) — só as assinaturas, sem chamar AWS ainda.

## Restrições
- Sem cor fora da paleta. Sem libs de UI pesadas. Server Components por padrão.
- UI só consome `repositories`, nunca dados diretos.

## Critério de aceite
- `npm run dev` sobe; `tsc --noEmit` limpo; testes de `format` passando.
- Fontes e tokens ativos; componentes de logo renderizam.
- `repositories` mock retorna dados para todas as funções usadas pela Home.
- Commit + push (`feat: web foundation (next, tokens, types, repositories mock)`).
