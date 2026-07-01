# DESIGN_SYSTEM.md — Lupa Notícias Play

Resumo operacional do design. A **fonte de verdade completa** é
`design-reference/DESIGN_SPEC.md` + os protótipos em `design-reference/design/*.dc.html`
+ os tokens em `brand/tokens.css`. **Recriar** em React/Tailwind — não portar o runtime de demo.

---

## 1. Marca

- Conceito: **lupa com abertura "C" + play** (lente que abre à direita, triângulo de play dentro).
- Assets em `brand/`: `lupa-mark.svg` (símbolo), `lupa-lockup.svg` (fundo claro),
  `lupa-lockup-white.svg` (fundo escuro). `logo-original.png` = referência antiga.
- Wordmark: **Archivo** — `LUPA` 800 + `NOTÍCIAS` 500, caixa alta, `NOTÍCIAS` em cinza `#3A3A3D`.
- Converter os SVG em componentes React (`<LupaMark/>`, `<LupaLockup/>`).

## 2. Sistema visual — monocromático

Ênfase por **inversão** (bloco preto + texto branco), nunca por cor de destaque.

Cores (de `brand/tokens.css`) → `tailwind.config.ts` `theme.extend.colors`:
```
ink #0B0B0C · ink-soft #1C1C20
gray: 700 #3A3A3D · 500 #52525B · 400 #8A8A90 · 300 #9A9AA0
line #E6E6E9 · line-soft #EDEDF0
surface #FFFFFF · surface-2 #F7F7F8 · surface-3 #F1F1F3
dark-line #26262A · on-dark #F3F3F4 · on-dark-muted #8A8A90
```
Raios: sm 4 · base 8 · lg 14 · pill 999. Sombras: card / soft (ver tokens).

## 3. Tipografia (3 famílias — `next/font/google`)

- **Archivo** (400–900) → manchetes, UI, wordmark.
- **Newsreader** (400–600 + itálico) → olho/standfirst, corpo, citações.
- **IBM Plex Mono** (400–600) → kickers, tags, metadados (CAIXA ALTA, `letter-spacing` .12–.16em).

Escala (valores finais):
```
Hero manchete (desktop)  Archivo 800  38–46 / 1.05 / -0.02em
H1 categoria             Archivo 900  56   / 1.00 / -0.03em
H1 artigo                Archivo 800  46   / 1.06 / -0.02em
Card título grande       Archivo 700  20–22 / 1.15
Card título pequeno      Archivo 700  15–18 / 1.20
Olho / standfirst        Newsreader   19–22 / 1.45–1.50
Corpo do artigo          Newsreader   19   / 1.75
Pull-quote               Newsreader italic 500 27 / 1.30
Kicker / tag / meta      IBM Plex Mono 600 10–12 / spacing .12–.16em / UPPERCASE
```

## 4. Telas do site público (detalhe em `DESIGN_SPEC.md`)

1. **Cabeçalho global** (4 faixas): utilitária escura · masthead (lockup + AO VIVO + busca +
   menu) · nav de editorias + `＋ SEÇÕES` · ticker "ÚLTIMAS".
2. **Home video-first**: hero de vídeo 16:9 (AO VIVO, play Ø78, título sobreposto) + coluna
   "A seguir no Lupa Play" · grade de editorias (4 col) · faixa preta **Lupa Play** com abas
   (Vídeos/Podcasts/Ao Vivo/Cortes) · Mais lidas (1–5) · Opinião (colunistas) · rodapé.
3. **Matéria**: breadcrumb → kicker → H1 → standfirst → assinatura (avatar + compartilhar) →
   imagem 16:9 + legenda → corpo Newsreader com H2/pull-quote/imagem inline → tags → caixa do
   autor → "Leia também" (3 cards).
4. **Categoria**: masthead H1 900 56px + "＋ Seguir editoria" · sub-abas · destaque (lead +
   3 secundárias) · lista "Últimas em X" · paginação.
5. **Lupa Play (hub)** `/play`: abas + grade de cards + destaque "assistindo agora".
6. **Player** `/play/[id]`: player 16:9 + ações (curtir/enviar/salvar/baixar) + canal + "A seguir".
7. **Cortes** `/cortes`: vídeo vertical full-screen, scroll-snap, rail de ações à direita.

## 5. Telas administrativas

8. **Lupa Estúdio** (`/estudio/publicar`): topbar escura · segmented Vídeo/Podcast · dropzone
   (MP4·MOV·MP3·WAV até 4 GB) · progresso de upload · campos (título/descrição/editoria/tags) ·
   sidebar (capa 16:9, visibilidade, agendar, toggles transcrição/legendas/destaque) · publicar.
9. **Portal do Jornalista** (novo — seguir sistema visual): minhas matérias (badges de status),
   pautas da semana, editor de matéria (blocos), correções pendentes com justificativa em destaque.
10. **Portal Admin** (novo): dashboard (KPIs), relatórios (cliques/visualizações por matéria),
    publicidade (campanhas/criativos/slots + métricas), usuários, Diretor de Redação (pautas +
    fila de aprovação + modo automático por categoria), configurações.

> Os portais admin/jornalista **não** têm tela no handoff original; criá-los **no mesmo sistema
> visual monocromático** (Archivo/Newsreader/Mono, inversão preto/branco, tokens, raios, sombras).
> Reaproveitar componentes `ui/` (Pill, Tag, Kicker, SegmentedControl, Toggle, Avatar, Divider).

## 6. Componente de anúncio

- `<AdSlot slot="..."/>` renderiza criativo do `/api/ads?slot=...`, com rótulo "PUBLICIDADE"
  em IBM Plex Mono; registra impressão ao entrar em viewport e clique no clique. Mantém a
  estética do portal (sem cores fora da paleta).

## 7. Interações-chave

- **AO VIVO**: ponto branco pulsa (`@keyframes` opacidade 1→.3 / escala 1→.6 / 1.4s infinito).
- **Play**: thumb/hero abre player (`/play/[id]` ou modal).
- **Abas/sub-abas**: troca client-side; ativo = preenchimento preto (claro) ou branco (faixa escura).
- **Upload**: drag-and-drop → progresso → sucesso/erro; validação de formato/tamanho.
- **Responsivo**: grids desktop colapsam p/ 1 coluna; app mobile é referência < 768px.
- **Estados**: loading (skeletons), erro e vazio em todas as listas/players.
