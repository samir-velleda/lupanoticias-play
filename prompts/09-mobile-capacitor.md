# Prompt 09 — App iOS/Android (Capacitor + Codemagic)

Leia `docs/MOBILE_CAPACITOR.md` inteiro e `docs/GIT_CICD.md` §4.

## Objetivo
Empacotar o app **Lupa** (iOS e Android) com **Capacitor** (modo remote/hybrid apontando para o
domínio do app) e configurar o build/entrega via **Codemagic** disparado por Git. Ponta a ponta.

## Tarefas (em `mobile/` e raiz)
1. Instale Capacitor + plugins (push, app, splash-screen, status-bar, share, preferences).
   `npx cap init` com `appId: br.com.lupanoticias.app`, `appName: "Lupa Notícias"`.
2. `capacitor.config.ts` no **modo A** (remote), `server.url` = domínio do app
   (`app.lupanoticias.com.br` / CloudFront). Splash `#0B0B0C`, sem spinner.
3. `npx cap add ios` e `npx cap add android`. Gere ícone/splash a partir de
   `brand/lupa-mark.svg` (fundo `#0B0B0C`).
4. **Push (AWS SNS)**: endpoint `POST /api/push/register` (Lambda `lupa-*`) que registra o
   device token no SNS (plataformas APNs + FCM). Provisione as apps de plataforma SNS via CDK
   (stack `lupa-*`). Segmentar por editoria (tópicos SNS `lupa-*`).
5. **Deep links / Universal Links**: publique `apple-app-site-association` e `assetlinks.json`
   em `/.well-known/` no CloudFront. Mapeie rotas do site → telas.
6. **Codemagic**: crie `codemagic.yaml` na raiz (workflows iOS e Android do
   `docs/MOBILE_CAPACITOR.md` §3). Segredos de assinatura ficam em **grupos de variáveis do
   Codemagic**, nunca no repo. Configure para disparar em push/tag na `main`.
7. Documente no README de `mobile/` os passos p/ subir em TestFlight (iOS) e faixa interna
   (Android).

## Restrições
- Nenhum segredo de assinatura no Git. Push/SNS: só recursos `lupa-*` (cdk diff limpo).

## Critério de aceite
- `npx cap sync` roda p/ iOS e Android; app abre carregando o portal.
- `codemagic.yaml` válido; build interno gera IPA/AAB assinados via segredos do Codemagic.
- Push registra token no SNS; deep links resolvem. Commit + push
  (`feat: app mobile capacitor + codemagic (ios/android)`).
