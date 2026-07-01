# Prompt 03 — Site público (Header/Footer, Home, Matéria, Categoria)

Leia `docs/DESIGN_SYSTEM.md` e, principalmente, `design-reference/DESIGN_SPEC.md` (fonte de
verdade de UI) + os protótipos `design-reference/design/*.dc.html` (abrir p/ referência, **não
portar** o runtime). Reutilize `repositories` (mock).

## Objetivo
Recriar, hi-fi, as telas públicas principais. Ponta a ponta, responsivas (mobile < 768px é a
referência do DESIGN_SPEC).

## Tarefas (em `web/src`)
1. `components/ui/`: `Kicker`, `Tag`, `Pill`, `Avatar`, `SegmentedControl`, `Divider`,
   `PlayButton`, `LiveBadge` (ponto branco pulsante — keyframe opacidade 1→.3 / escala 1→.6 / 1.4s).
2. `components/layout/`: `Header` (4 faixas: utilitária, masthead, nav de editorias + `＋ SEÇÕES`,
   ticker "ÚLTIMAS"), `Footer` global. `(site)/layout.tsx` monta Header+Footer.
3. **Home** `(site)/page.tsx` (video-first): `VideoHero` 16:9 (AO VIVO, play Ø78, título
   sobreposto, gradiente) + coluna "A seguir no Lupa Play"; grade de editorias (4 col); faixa
   preta **Lupa Play** com abas (Vídeos/Podcasts/Ao Vivo/Cortes); "Mais lidas" (1–5); "Opinião".
   Dados via `repositories` (getLiveDestaque, listPlayShelf, listMaisLidas, listOpiniao, etc.).
4. **Matéria** `(site)/[editoria]/[slug]/page.tsx`: breadcrumb → kicker → H1 → standfirst →
   assinatura (avatar + compartilhar) → imagem 16:9 + legenda → corpo (render de `ArticleBlock[]`
   com parágrafo/H2/pull-quote/imagem inline/embed) → tags → caixa do autor → "Leia também" (3).
   `generateMetadata` + JSON-LD `NewsArticle`.
5. **Categoria** `(site)/[editoria]/page.tsx`: masthead H1 900 56px + "＋ Seguir editoria";
   sub-abas; destaque (lead + 3 secundárias); lista "Últimas em X"; paginação. Validar slug ∈
   EditoriaSlug (404 caso contrário).
6. Estados de loading (skeletons), erro e vazio em todas as listas.

## Critério de aceite
- `/`, `/politica`, `/politica/<slug>` batem com a referência (cores/tipo/espaçamento/hierarquia).
- Responsivo (colapsa p/ 1 coluna; bate com os frames mobile do DESIGN_SPEC).
- A11y: landmarks, `alt`, foco visível, contraste AA. `tsc`/lint limpos.
- Commit + push (`feat: site publico (header/footer, home, materia, categoria)`).
