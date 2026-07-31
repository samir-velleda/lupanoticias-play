# E2E Editorial — checklist de go-live

Fluxo completo (texto + foto) em **dev** e **prod**. Conta AWS Boovest, só recursos `lupa-*`.

## Pré-requisitos

- Usuários Cognito nos grupos: `jornalista`, `diretor` (ou `admin`)
- URL do portal (CloudFront) e CDN de mídia
- Browser logado com cookies de sessão

## Roteiro

1. **Jornalista** → `/jornalista` → Nova matéria  
   - Título + 2 parágrafos  
   - Upload de imagem principal (arquivo JPEG/PNG)  
   - Preview da imagem no editor  
   - **Enviar para revisão**

2. **Diretor/Admin** → `/admin/redacao`  
   - Vê título + trecho na fila  
   - Abre matéria → corpo completo + foto  
   - **Aprovar e publicar** *ou* **Recusar** com justificativa obrigatória

2b. **Diretor/Admin → Pautas** (`/admin/redacao/pautas` → **Sugerir pauta**)  
   - Tema + orientação (+ opcional: editoria, prioridade, prazo, jornalistas)  
   - Sem jornalista selecionado → pauta **geral** (toda a redação)  
   - Com seleção → só os atribuídos veem em `/jornalista/pautas`  
   - Jornalista → **Confirmar pauta e escrever matéria**

3. Se **recusa**:  
   - Jornalista → `/jornalista/correcoes` vê justificativa  
   - Corrige → reenvia → diretor aprova

4. **Público** (sem login) → `/{editoria}/{slug}`  
   - Título, corpo e **imagem do CDN de mídia** (HTTP 200, `image/*`)  
   - Matéria inexistente → **HTTP 404**

5. **Modo automático** (opcional):  
   - `/admin/configuracoes` → ligar editoria → matéria dessa editoria publica direto

## Critérios de aceite

- [ ] Upload S3 pre-signed funciona (sem erro CORS/403)
- [ ] Foto aparece na redação e no site público
- [ ] Recusa exige justificativa
- [ ] Aprovar/recusar só em `pendente`
- [ ] Nenhum recurso fora de `lupa-*` foi alterado
