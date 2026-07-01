# Handoff: Lupa Notícias — Portal (video-first) + Lupa Play + App Mobile

> **Este é o pacote de desenvolvimento para o Claude Code.** Comece por `CLAUDE.md`.
>
> Índice da documentação:
> 1. **`CLAUDE.md`** — charter do projeto, regras e convenções (ler primeiro).
> 2. **`README.md`** (este) — especificação visual detalhada de todas as telas (fonte da verdade de UI).
> 3. **`ARCHITECTURE.md`** — stack, estrutura de pastas, rotas, Mux, Tailwind.
> 4. **`DATA_MODEL.md`** — tipos de domínio, contrato `repositories`, API interna, formatação pt-BR.
> 5. **`ROADMAP.md`** — plano de execução em milestones M0–M9 (trabalhar em ordem).
> 6. **`GETTING_STARTED.md`** — comandos para criar e subir o projeto.
> 7. **`design/`** — protótipos HTML de referência · **`assets/tokens.css`** — tokens.

## Visão geral
**Lupa Notícias** é um portal de notícias em português com **vídeo em primeiro plano** e a plataforma **Lupa Play** (vídeos, podcasts, ao vivo e "Cortes" verticais) no centro da experiência. Este pacote entrega a identidade da marca (logo modernizado), o sistema visual monocromático e o design de todas as telas principais — web e mobile — mais o **Estúdio**, o painel de upload de vídeo/podcast.

## Sobre os arquivos de design
Os arquivos em `design/` são **referências de design feitas em HTML** (protótipos que mostram o visual e o comportamento pretendidos) — **não são código de produção para copiar diretamente**. Eles usam um pequeno runtime de componentes (`support.js`) e um placeholder de imagem (`image-slot.js`) só para a demonstração.

A tarefa é **recriar estes designs no ambiente do seu projeto**, usando os padrões e bibliotecas já estabelecidos ali. Se ainda não houver um projeto, a recomendação para um portal de notícias com vídeo é **Next.js (App Router) + React + TypeScript**, com um CMS headless (ex.: Sanity/Strapi) e um provedor de vídeo (ex.: Mux/Cloudflare Stream) para o Lupa Play. Estilização com CSS Modules ou Tailwind — os tokens em `assets/tokens.css` mapeiam direto para qualquer um dos dois.

## Fidelidade
**Alta fidelidade (hi-fi).** Cores, tipografia, espaçamento e hierarquia são finais. Recriar pixel-a-pixel usando as bibliotecas do seu código. As **imagens** são placeholders (`<image-slot>`) — no produto real virão do CMS / upload do usuário.

## Marca / Logo
- Conceito: **lupa com abertura "C" + play** (a "lente" que abre para a direita, com o triângulo de play dentro). Conecta *investigação/apuração* com *vídeo/ao vivo*.
- Assets vetoriais prontos em `assets/`:
  - `lupa-mark.svg` — só o símbolo (use em favicon, app icon, avatar de canal).
  - `lupa-lockup.svg` — símbolo + wordmark (fundo claro).
  - `lupa-lockup-white.svg` — versão para fundo escuro.
- Wordmark: **Archivo** — `LUPA` peso 800 + `NOTÍCIAS` peso 500, caixa alta, `NOTÍCIAS` em cinza `#3A3A3D`.
- `assets/logo-original.png` = logo antigo (apenas referência de "antes").

## Sistema visual
- **Monocromático**: preto `#0B0B0C`, escala de cinzas e branco. Ênfase se cria por **inversão** (bloco preto, texto branco), nunca por cor de destaque.
- **Tipografia** (3 famílias):
  - `Archivo` (sans grotesca) — manchetes, UI, wordmark.
  - `Newsreader` (serifada) — olho/standfirst, corpo do artigo, citações.
  - `IBM Plex Mono` — kickers, tags, metadados, timestamps (sempre CAIXA ALTA, `letter-spacing` .12–.16em).
- Todos os valores exatos em **`assets/tokens.css`**.

---

## Telas (web)

### 1. Cabeçalho (global)
Três faixas empilhadas:
1. **Barra utilitária** (fundo `--lupa-ink`, texto `#CFCFD4`, Mono 11px): data/cidade/temperatura à esquerda; `Newsletters · Assine · Entrar` à direita.
2. **Masthead** (fundo branco, padding 18×28): lockup à esquerda; à direita pill **AO VIVO** (ponto branco pulsante), ícone de busca, ícone de menu (hambúrguer).
3. **Nav** (borda 1px topo/base, altura 46px, Archivo 600 13.5px): `Início` (ativo: peso 800 + borda inferior 2px preta) · Política · Economia · Mundo · Esportes · Cultura · Tecnologia · Ciência · Saúde · Opinião · **Vídeos**. `＋ SEÇÕES` à direita.
4. **Ticker "ÚLTIMAS"** (faixa `--lupa-surface-2`): tag preta + manchetes separadas por `•`.

### 2. Capa / Home — **video-first**
- **Hero de vídeo** (grid `1fr 340px`): player 16:9 grande (raio 8, `overflow:hidden`) com gradiente inferior, badge **AO VIVO** (topo-esq), duração (topo-dir), **botão de play central** (círculo Ø78, `rgba(11,11,12,.5)` + borda branca .7), e **título sobreposto** no rodapé (Archivo 800 38px, branco). Abaixo: standfirst (Newsreader 19px) + "12,4 mil assistindo agora".
  - Sob o hero: 2 cards de vídeo (thumb + play Ø42 + duração + kicker + título).
  - Coluna direita: **"A seguir no Lupa Play"** — playlist de 4 itens (thumb 118×70 com duração + kicker Mono + título) + card **AO VIVO** preto ("Lupa News 24h").
- **Grade de editorias** (após divisória preta 1px): 4 colunas (Economia, Mundo, Esportes, Cultura), cada uma com rótulo (Mono, borda inferior 2px), 1 imagem + manchete + 2 links.
- **Faixa Lupa Play** (bloco `--lupa-ink`, full-bleed): cabeçalho com símbolo + "Lupa Play" + subtítulo Mono "VÍDEOS · PODCASTS · AO VIVO" + "Ver tudo"; **abas** (Vídeos ativo / Podcasts / Ao Vivo / Cortes — pills, ativo branco); grade de 4 cards de vídeo (thumb + play + duração + tag "VÍDEO/PODCAST · EDITORIA" + título branco).
- **Mais lidas** (lista numerada 1–5) + **Opinião** (3 colunistas com avatar circular + citação serifada itálica).
- **Rodapé** global.

### 3. Matéria (artigo)
- Breadcrumb (Mono) → kicker da editoria → **H1** (Archivo 800 46px) → standfirst (Newsreader 22px).
- Linha de **assinatura**: avatar + "por <autor>" + timestamp Mono + ícones de compartilhar (f / X / salvar).
- **Imagem principal** 16:9 (largura ~1000, maior que a coluna de texto ~720) + legenda Mono.
- Corpo em **Newsreader 19px / 1.75**, com `<h2>` (Archivo 800 26px), **pull-quote** (Newsreader itálico 500 27px, borda esquerda 3px preta), imagem inline + legenda, e **tags** (pills com borda).
- **Caixa do autor** (fundo `--lupa-surface-2`). **"Leia também"** (3 cards). Rodapé.

### 4. Categoria (ex.: Política)
- **Masthead da editoria**: breadcrumb + **H1** (Archivo 900 56px) + descrição (Newsreader 18px) + botão "＋ Seguir editoria" (preto). Borda inferior 2px preta.
- **Sub-abas** (pills): Tudo (ativo preto) / Congresso / Governo / Eleições / Justiça / Estados.
- **Destaque** (grid `1.4fr 1fr`): lead grande (imagem 360 + H2 34px) + 3 secundárias (título + thumb 96×72).
- **Lista "Últimas em Política"**: linhas com thumb 200×120 + kicker + H3 22px + standfirst, separadas por hairline.
- **Paginação** (1 ativo, 2, 3, →). Rodapé.

### 5. Estúdio — Upload de vídeo & podcast (área administrativa / CMS)
URL: `studio.lupanoticias.com.br/publicar`. Barra superior escura (símbolo + `LUPA ESTÚDIO` + nav Conteúdo/Publicar/Mídia/Análises + "Salvo há 2 min" + avatar).
- **Segmented control** `Vídeo` (ativo) / `Podcast` (com ícones).
- **Dropzone** (borda tracejada 2px `#CFCFD4`, raio 14, fundo `--lupa-surface-2`): ícone de upload em círculo preto, "Arraste o arquivo de vídeo ou áudio aqui", botão "Selecionar arquivo", formatos aceitos em Mono: **MP4 · MOV · MP3 · WAV · até 4 GB**.
- **Estado de envio**: linha com ícone do arquivo, nome, **barra de progresso** (trilho `#EDEDF0`, preenchimento preto), "1,3 GB de 1,8 GB · 00:48 restantes", botão cancelar (✕).
- Campos: **Título**, **Descrição** (textarea), **Editoria** (select), **Tags** (input com chips removíveis).
- **Sidebar** (card com borda): **Capa 16:9** (upload), **Visibilidade** (radio: Público / Somente assinantes / Rascunho), **Agendar publicação** (data/hora), **toggles**: Transcrição automática (on), Gerar legendas VTT (on), Destacar no Lupa Play (off). Botões **Publicar** (preto) e **Salvar rascunho** (contorno).

---

## Telas (mobile — app)
Frame de referência: 390×844 (iPhone), status bar + dynamic island. **Tab bar** inferior: Início · Play · Buscar · Salvos · Perfil.

### M1. Home (video-first)
Header compacto (menu · lockup · busca + ponto AO VIVO). **Hero de vídeo** 16:9 (~216px) com AO VIVO, play central, título sobreposto. Trilho horizontal **Lupa Play** (cards 158×96 com play + duração). Feed vertical "Últimos vídeos" (card grande 16:9 + card compacto thumb 132×82). Tab bar (Início ativo).

### M2. Lupa Play
Header ("Lupa Play" + busca) + **abas** (Vídeos ativo / Podcasts / Ao Vivo / Cortes). Card em destaque 16:9 (play + AO VIVO + duração) + título + "12,4 mil assistindo". Lista de vídeos (thumb 130×80 + duração + kicker + título + "X views · há Y"). Tab bar (Play ativo).

### M3. Player / Assistir
**Player** 16:9 no topo (fundo preto, play central, **barra de controles**: play, scrubber com knob em 32%, "4:12 / 18:24", fullscreen). Título + "24 mil visualizações · há 3 h". **Ações**: Curtir (1,2 mil) · Enviar · Salvar · Baixar (ícone + rótulo). Linha do canal (avatar + "Lupa · Política" + botão **Seguir**). **"A seguir"** (2 itens). Indicador de home.

### M4. Cortes (vídeo vertical, full-screen)
Vídeo full-bleed com gradiente. Topo: status bar branca + abas "Seguindo / Para você" + rótulo "CORTES" com símbolo. **Rail de ações à direita** (avatar, ❤ 3,4 mil, 💬 128, ➤ Enviar, disco de áudio). Rodapé-esq: `@lupa.politica`, legenda, "Áudio original · Lupa Play". Indicador de home branco.

---

## Interações & comportamento
- **Play**: clicar em qualquer thumb/hero abre o player (rota `/video/[id]` ou modal). Hover no desktop: leve elevação/`opacity` do overlay de play.
- **AO VIVO**: ponto branco pulsa (`@keyframes` opacidade 1→.3, escala 1→.6, 1.4s infinito).
- **Abas / sub-abas**: troca de conteúdo client-side; ativo = preenchimento preto (mobile) ou branco sobre fundo escuro (faixa Lupa Play).
- **Seguir / Salvar / Curtir**: toggles com estado; contadores otimistas.
- **Upload (Estúdio)**: drag-and-drop + seleção de arquivo → progresso → estados de sucesso/erro; validação de formato e tamanho (≤4 GB); toggles disparam jobs (transcrição, legendas VTT).
- **Responsivo**: grids do desktop colapsam para 1 coluna; o app mobile é a referência para < 768px.

## Estado / dados (sugestão)
- `Article { id, editoria, titulo, standfirst, corpo, autor, publishedAt, updatedAt, heroImage, tags[] }`
- `Media { id, tipo: 'video'|'podcast'|'live'|'short', titulo, descricao, editoria, capa, duracaoSeg, provedorId, transcricao?, legendasVTT?, visibilidade, agendadoPara?, destaque }`
- `Editoria { slug, nome, descricao }` · `Author { id, nome, bio, avatar }`
- Home: 1 `live/video` em destaque + playlists ("A seguir", "Lupa Play"), editorias, "Mais lidas".

## Design tokens
Ver **`assets/tokens.css`** (cores, tipografia, raio, sombra, espaçamento e a escala tipográfica com os tamanhos exatos de cada tela).

## Assets
- `assets/lupa-mark.svg`, `assets/lupa-lockup.svg`, `assets/lupa-lockup-white.svg` — logo (vetor).
- `assets/logo-original.png` — logo antigo (referência).
- `assets/tokens.css` — tokens.
- Fontes (Google Fonts): **Archivo** (400–900), **Newsreader** (400–600 + itálico), **IBM Plex Mono** (400–600). Auto-hospede em produção.
- Imagens das matérias/vídeos: placeholders — virão do CMS/upload.

## Arquivos de referência (em `design/`)
- `Lupa Noticias.dc.html` — arquivo principal: estudo do logo, capa video-first, matéria, categoria, Estúdio de upload e as 4 telas mobile.
- `LupaHeaderA.dc.html` — cabeçalho global. `LupaFooter.dc.html` — rodapé global.
- `image-slot.js`, `support.js` — runtime só da demonstração (não portar).
> Abra `Lupa Noticias.dc.html` em um navegador para ver tudo. As áreas de imagem aceitam arrastar-e-soltar para pré-visualizar com fotos reais.
