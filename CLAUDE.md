# marcela-glow-site

Monorepo (npm workspaces + turbo): 4 apps deployaveis e 2 pacotes.
Stack: Vite/React/TS no front, Express/Prisma/PostgreSQL na API, Docker + Nginx.

## Mapa da arquitetura

Destilado de `graphify-out/graph.json`. Regenerar com `node scripts/graph-map.js`
apos mudancas estruturais.

| Area | Nos | Hub (maior propagacao) |
|---|---|---|
| `apps/web` | 616 | `cn()` - `apps/web/src/lib/utils.ts:4` |
| `apps/admin` | 365 | `Encounter.tsx` - `apps/admin/src/components/Encounter.tsx` |
| `apps/api` | 307 | `admin.ts` - `apps/api/src/routes/admin.ts` |
| `apps/patient` | 229 | `sections.tsx` - `apps/patient/src/components/sections.tsx` |
| `packages/database` | 85 | `Tenant` (schema Prisma) |

**Acoplamento entre areas: so `apps/api -> packages/database` (31 arestas).**
Os 4 apps sao silos independentes: nao compartilham codigo, so falam por HTTP.
Consequencia pratica: uma mudanca de UI num app nunca quebra outro; uma mudanca
de rota da API pode quebrar os tres fronts, e isso o grafo NAO detecta (ver abaixo).

## Antes de mexer em codigo compartilhado

Consultar o grafo custa ~1 KB; ler os arquivos afetados custa ~160 KB. Use o grafo.

```sh
graphify affected "AppError"            # o que quebra se eu mudar isso
graphify explain "authenticate()"       # quem chama e o que chama
graphify path "authenticate()" "AppError"
node scripts/graph-map.js               # visao geral da arquitetura
```

Se o simbolo existir em mais de um app (`cn()`, por exemplo), a ferramenta pede
desambiguacao e ja imprime os ids; repita com o id completo (`apps_web_src_lib_utils_cn`).

O grafo e reconstruido sozinho por hook de `post-commit` (~7s, sem custo de LLM).

## Limites do grafo (nao confie nele para isto)

- **Nao atravessa HTTP.** `fetch('/api/...')` no front e `router.post('/...')` na
  API nao tem ligacao sintatica, entao nenhuma consulta liga front a backend.
  Para impacto de mudanca de rota, busque a string da rota com grep nos 4 apps.
- **`graphify query` em linguagem natural nao serve.** Casa nome de simbolo, nao
  intencao; pergunta em portugues nao retorna nada e a resposta vem truncada.
  Use `explain` / `affected` / `path`, que recebem o identificador direto.

## Divida conhecida

- `packages/shared` e codigo morto: ninguem importa `@marcela/shared`. O
  `TENANT_SLUG` que ele exporta nao e usado; `'marcela-duch'` esta hardcoded em
  5 arquivos: `apps/web/src/lib/api.ts`, `apps/admin/src/lib/ui.tsx`,
  `apps/patient/src/lib/api.ts`, `apps/api/src/routes/patient.ts` e
  `packages/database/src/seed.ts`.

## Convencoes

- Commits e conversa em portugues (pt-BR).
- `npm run check:encoding` valida encoding dos arquivos - roda antes de commitar.
- Rotas da API em `apps/api/src/routes/`, middlewares em `apps/api/src/middleware/`,
  erros em `apps/api/src/lib/errors.ts` (hierarquia sob `AppError`).
