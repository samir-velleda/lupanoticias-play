# Multi-cidade / Licenças Lupa

Modelo de **SaaS editorial**: a plataforma Lupa é licenciada por **cidade**.

## Papéis

| Papel Cognito | Nome no produto | Escopo |
|---|---|---|
| `admin` | **Master** | Plataforma inteira: licenças, usuários, rede |
| `diretor` | **Diretor (licença)** | Uma cidade: pautas, aprovação, redação local |
| `jornalista` | **Jornalista (cidade)** | Uma cidade: produzir matérias |

## Entidades

- **`Cidade`** = tenant / licença mensal (`status`: trial · ativa · inadimplente · suspensa · cancelada)
- **`author.cidade_id`** — vínculo do usuário à licença (`null` no Master)
- **`materia.cidade_id` + `materia.escopo`** — origem + alcance (`local` \| `estadual` \| `nacional`)
- **`pauta.cidade_id`** — pautas só da redação da cidade

## Regras

1. Diretor e Jornalista **sempre** com `cidadeId`.
2. Isolamento: listagens de pendentes/pautas filtram por `cidadeId` (Master vê tudo).
3. Licença `suspensa` / `inadimplente` / `cancelada` → bloqueia escrita editorial.
4. Escopo `estadual`/`nacional` só se a licença permitir flags `permiteEstadual` / `permiteNacional`.
5. Tenant default de migração: **`cid-matriz`** (Lupa Matriz).

## UI Master

- `/admin/cidades` — lista e CRUD de licenças
- `/admin/usuarios` — criar usuário com papel + cidade
- Nav **Licenças** só para Admin

## UI Diretor / Jornalista

- Redação e pautas filtradas pela cidade do author
- Editor com seletor de **escopo**

## Próximos passos (Etapa 5)

- Gateway de pagamento (status mensal automático)
- Subdomínio por cidade
- Feed público filtrado por rede (local / UF / nacional)
