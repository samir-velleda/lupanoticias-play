# prompts/ — Como usar

Estes são os **prompts sequenciais** para o **Claude terminal (Claude Code)** desenvolver o
Lupa Notícias Play. O Claude terminal já tem acesso à conta AWS **Boovest**.

## Como rodar

1. Abra o Claude terminal **dentro da pasta deste projeto** (`lupanoticias-play/`):
   ```bash
   cd caminho/para/lupanoticias-play
   claude
   ```
2. Na **primeira mensagem** da sessão, cole o conteúdo de `prompts/00-bootstrap.md`.
3. Deixe concluir, revise o resultado, faça commit, e só então passe ao próximo prompt.
4. **Um prompt por vez, em ordem (00 → 09).** Não pule. Cada prompt tem um "Critério de aceite".

## Regras que valem para TODOS os prompts

Cole isto (ou confie no `CLAUDE.md`, que o terminal deve ler primeiro) como lembrete:

> - Leia `CLAUDE.md` inteiro antes de agir, com atenção ao **§0 (guarda-corpos AWS)**.
> - **Não** crie/altere/destrua nenhum recurso AWS que não seja `lupa-*` na conta Boovest.
> - Provisione só via **CDK** (`cdk diff` antes de todo `cdk deploy`; aborte se aparecer stack
>   fora do prefixo `Lupa`). **Nunca** `cdk destroy` em CI.
> - Faça tudo **de ponta a ponta**, sem parar para pedir permissão, **exceto** se uma ação
>   puder afetar recursos fora de `lupa-*` — aí **pare e reporte**.
> - Commits em Conventional Commits; push para
>   `https://github.com/samir-velleda/lupanoticias-play`.

## Ordem

| # | Arquivo | Entrega |
|---|---|---|
| 00 | `00-bootstrap.md` | Estrutura do monorepo, Git, `.gitignore`, workspaces, primeiro push |
| 01 | `01-aws-foundation.md` | CDK: network, storage (S3/CloudFront), Aurora, Cognito, tags `lupa-*` |
| 02 | `02-web-foundation.md` | Next.js + Tailwind (tokens) + fontes + tipos + `repositories` (mock) + format |
| 03 | `03-site-publico.md` | Header/Footer, Home video-first, Matéria, Categoria |
| 04 | `04-lupa-play.md` | Hub `/play`, Player (HLS), Cortes; player de vídeo AWS |
| 05 | `05-estudio-upload.md` | Lupa Estúdio: upload S3 pre-signed → MediaConvert → pronto |
| 06 | `06-auth-e-portais.md` | Cognito auth + Portal Jornalista + Portal Admin (shells + navegação) |
| 07 | `07-workflow-editorial.md` | Diretor de Redação, pautas, aprovação/recusa, modo automático, Aurora real |
| 08 | `08-publicidade-analytics.md` | Publicidade (slots/campanhas) + Analytics (cliques/views/relatórios) |
| 09 | `09-mobile-capacitor.md` | Capacitor iOS/Android + `codemagic.yaml` + push/deep links |

Depois do 09: revisão de qualidade (a11y, SEO, estados de loading/erro/vazio) e deploy prod
via `main` (ver `docs/GIT_CICD.md`).
