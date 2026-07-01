# Prompt 05 — Lupa Estúdio (upload S3 → MediaConvert)

Leia `docs/AWS_ARCHITECTURE.md` §4, `docs/DESIGN_SYSTEM.md` §5 (tela do Estúdio) e
`design-reference/DESIGN_SPEC.md` (Estúdio). Vídeo é **AWS** (S3 + MediaConvert + CloudFront),
não Mux.

## Objetivo
Fluxo real de upload de vídeo/podcast: pre-signed S3 → transcodificação MediaConvert → registro
"pronto" no banco. Ponta a ponta. (Auth completa vem no prompt 06; aqui pode proteger com um
guard temporário e ligar ao Cognito depois.)

## Tarefas
1. **Infra (CDK, stack `LupaMedia-<env>`)**: role/queue do **MediaConvert**; regra
   **EventBridge** `s3:ObjectCreated` no bucket `lupa-uploads-<env>` → Lambda `lupa-mc-submit`
   (cria job HLS multi-bitrate + thumbnails + legendas VTT quando marcado, saída em
   `lupa-media-<env>`); regra `MediaConvert Job State COMPLETE` → Lambda `lupa-mc-complete`
   (grava `playbackUrl`/`duracaoSeg`/`coverUrl`/status em Aurora). Também um canal **IVS**
   `lupa-ivs-channel-<env>` para live. Tudo `lupa-*`, tags aplicadas. `cdk diff` antes de deploy;
   abortar se tocar algo fora de `Lupa*`.
2. **API (web)**: `POST /api/media/upload-url` (gera pre-signed PUT no `lupa-uploads`, valida
   MP4/MOV/MP3/WAV e ≤ 4 GB via Zod); `POST /api/media` (cria registro `Media` ligado ao
   `uploadKey`, com título/editoria/tags/visibilidade/agendar/toggles); `GET /api/live/:id/viewers`
   (liga ao IVS/mock).
3. **UI Estúdio** `(studio)/estudio/publicar`: topbar escura; segmented Vídeo/Podcast; dropzone
   (drag-and-drop + selecionar arquivo; formatos em Mono "MP4 · MOV · MP3 · WAV · até 4 GB");
   barra de progresso real do upload; campos (título/descrição/editoria/tags com chips); sidebar
   (capa 16:9, visibilidade, agendar, toggles transcrição/legendas/destaque); botões Publicar /
   Salvar rascunho. Estados: enviando → processando → pronto/erro.
4. Bibliteca `(studio)/estudio/midia` listando mídias e status.

## Critério de aceite
- Upload real chega ao S3 `lupa-uploads-<env>`; MediaConvert processa; `playbackUrl` gravado;
  a mídia aparece tocável no Lupa Play.
- Validações (formato/tamanho/título) e estados corretos. Nenhum recurso fora de `lupa-*` tocado.
- Commit + push (`feat: lupa estudio upload (s3 presigned + mediaconvert)`).
