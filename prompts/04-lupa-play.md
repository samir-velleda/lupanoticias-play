# Prompt 04 — Lupa Play (hub, player HLS, Cortes)

Leia `docs/DESIGN_SYSTEM.md` §4, `design-reference/DESIGN_SPEC.md` (telas Lupa Play, Player,
Cortes) e `docs/AWS_ARCHITECTURE.md` §4/§5 (vídeo é **AWS**, não Mux).

## Objetivo
Construir o hub de vídeo, o player (HLS via CloudFront/IVS) e o feed de Cortes. Ponta a ponta.

## Tarefas
1. Player de vídeo baseado em **HLS** (ex.: `hls.js` num `<video>` estilizado, ou player
   compatível) — **não** usar Mux. Consome `Media.playbackUrl` (HLS do MediaConvert/CloudFront
   p/ VOD, ou do IVS p/ live). Controles: play, scrubber com knob, tempo, fullscreen, legendas VTT.
2. `/play` (hub): abas Vídeos/Podcasts/Ao Vivo/Cortes (`?tab=`), grade de cards, item em
   destaque com "X mil assistindo agora" (para live).
3. `/play/[id]` (Player/Assistir): player + título + "X visualizações · há Y"; ações
   (curtir/enviar/salvar/baixar); linha do canal (avatar + "Lupa · Editoria" + Seguir);
   "A seguir" (`getNext`). Para `tipo:'live'`, faça polling de `GET /api/live/[id]/viewers`
   (~15s) — o endpoint pode retornar mock por ora (será ligado ao IVS depois).
4. `/cortes`: feed vertical full-screen, scroll-snap, autoplay do item visível
   (IntersectionObserver), muted-autoplay + tap p/ som, rail de ações à direita, handle/legenda
   no rodapé. Pausar itens fora da viewport.
5. JSON-LD `VideoObject` no player; OG image = thumbnail.

## Critério de aceite
- Vídeo HLS toca de verdade (use um HLS de teste público enquanto não há assets reais).
- `/play`, `/play/[id]`, `/cortes` batem com o design; abas trocam client-side.
- Cortes com "snap" fluido; só o vídeo visível toca. A11y por teclado no player.
- Commit + push (`feat: lupa play (hub, player hls, cortes)`).
