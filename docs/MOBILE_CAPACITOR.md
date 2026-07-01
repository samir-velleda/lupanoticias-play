# MOBILE_CAPACITOR.md — App iOS/Android (Capacitor + Codemagic)

O app **Lupa** (iOS e Android) empacota o web app com **Capacitor** e é construído/entregue
pelo **Codemagic**, disparado via **Git**. Todo o fluxo é Git → Codemagic → lojas.

---

## 1. Estratégia

- **Um código, dois alvos**: o mesmo Next.js do site alimenta o app. Duas opções (decidir no
  prompt 08):
  - **A) Remote/hybrid (recomendado p/ notícias):** o app carrega o site de produção
    (CloudFront/`app.lupanoticias.com.br`) via `server.url` do Capacitor, com uma casca nativa
    (splash, ícone, push, deep links, tab bar nativa opcional). Conteúdo sempre atualizado sem
    republicar nas lojas.
  - **B) Bundle estático:** exportar o front como estático e empacotar offline. Só se exigirem
    funcionamento offline; perde ISR/SSR. Para portal de notícias, **preferir A**.
- **Plugins Capacitor**: `@capacitor/push-notifications` (via **Amazon SNS** / APNs+FCM),
  `@capacitor/app` (deep links), `@capacitor/splash-screen`, `@capacitor/status-bar`,
  `@capacitor/share`, `@capacitor/preferences`.
- **AO VIVO / vídeo**: HLS do IVS/CloudFront toca no player web dentro do webview.

## 2. Estrutura (`mobile/`)

```
mobile/
├─ capacitor.config.ts     # appId: br.com.lupanoticias.app · appName: "Lupa Notícias"
├─ ios/                     # projeto Xcode gerado (npx cap add ios)
├─ android/                 # projeto Gradle gerado (npx cap add android)
└─ resources/               # ícone (lupa-mark) + splash monocromático p/ gerar assets
```

`capacitor.config.ts` (modo A):
```ts
import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'br.com.lupanoticias.app',
  appName: 'Lupa Notícias',
  webDir: 'public',                    // casca mínima
  server: { url: process.env.APP_URL ?? 'https://app.lupanoticias.com.br', cleartext: false },
  ios: { contentInset: 'always' },
  plugins: { SplashScreen: { backgroundColor: '#0B0B0C', showSpinner: false } },
};
export default config;
```

## 3. Codemagic — `codemagic.yaml` (raiz do repo)

Dois workflows (iOS e Android), disparados por push/tag no Git.

```yaml
workflows:
  android-lupa:
    name: Lupa Android
    instance_type: mac_mini_m2
    environment:
      groups: [lupa_signing, lupa_env]      # variáveis/segredos no Codemagic (não no repo)
      node: 20
    triggering:
      events: [push, tag]
      branch_patterns: [{ pattern: 'main', include: true }]
    scripts:
      - name: Install
        script: npm ci
      - name: Sync Capacitor (Android)
        script: |
          cd mobile
          npx cap sync android
      - name: Build AAB
        script: |
          cd mobile/android
          ./gradlew bundleRelease
    artifacts: [mobile/android/app/build/outputs/**/*.aab]
    publishing:
      google_play:
        credentials: $GCLOUD_SERVICE_ACCOUNT_CREDENTIALS
        track: internal                      # subir para faixa interna primeiro

  ios-lupa:
    name: Lupa iOS
    instance_type: mac_mini_m2
    environment:
      groups: [lupa_signing, lupa_env]
      node: 20
      xcode: latest
    integrations: { app_store_connect: lupa_asc_key }
    triggering:
      events: [push, tag]
      branch_patterns: [{ pattern: 'main', include: true }]
    scripts:
      - name: Install
        script: npm ci
      - name: Sync Capacitor (iOS)
        script: |
          cd mobile
          npx cap sync ios
      - name: Set up signing
        script: xcode-project use-profiles
      - name: Build IPA
        script: |
          cd mobile/ios/App
          xcode-project build-ipa --workspace App.xcworkspace --scheme App
    artifacts: [build/ios/ipa/*.ipa]
    publishing:
      app_store_connect:
        auth: integration
        submit_to_testflight: true
```

> **Segredos** (keystore Android, chave App Store Connect, service account Google Play) ficam
> em **grupos de variáveis do Codemagic** — nunca no repositório. O repo só referencia por nome.

## 4. Ligação com AWS

- **Push**: **Amazon SNS** com plataformas APNs (iOS) e FCM (Android); token do dispositivo
  registrado via `POST /api/push/register` (Lambda) → SNS endpoint. Segmentar por editorias.
- **Deep links / Universal Links**: hospedar `apple-app-site-association` e
  `assetlinks.json` no CloudFront (`/.well-known/`). Mapear rotas do site → telas do app.
- **Analytics do app**: eventos vão para o mesmo `POST /api/analytics/event` com
  `dispositivo:'ios'|'android'`.

## 5. Passos (executados no prompt 08)

1. `npm i @capacitor/core @capacitor/cli` + plugins; `npx cap init`.
2. `npx cap add ios && npx cap add android`.
3. Gerar ícone/splash a partir de `brand/lupa-mark.svg` (fundo `#0B0B0C`).
4. Configurar `capacitor.config.ts` (modo A) apontando p/ o domínio do app.
5. Commit + push; configurar workflows/segredos no Codemagic; disparar build interno.
6. Validar em TestFlight (iOS) e faixa interna (Android) antes de produção.
