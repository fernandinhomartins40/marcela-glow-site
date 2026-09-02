# marcela-glow-site

Monorepo (npm workspaces + turbo): 4 apps deployaveis e 2 pacotes.
Vite/React/TS no front, Express/Prisma/PostgreSQL na API, Docker + Nginx.

## Como investigar este codigo

**Consulte o grafo antes de abrir arquivos.** Medido neste repo: responder
"o que quebra se eu mudar `AppError`" custa ~1,6 KB pelo grafo contra ~166 KB
lendo os arquivos afetados (~100x). O grafo tambem acha o que o grep nao ve
(subclasses, chamadas indiretas).

```sh
graphify affected "AppError"              # o que quebra se eu mudar isto
graphify explain "authenticate()"         # quem chama, o que chama, onde mora
graphify path "authenticate()" "AppError" # como dois simbolos se ligam
node scripts/graph-map.js                 # visao geral da arquitetura
```

Ordem recomendada: `graph-map` (onde estou) -> `affected` (o que arrisco) ->
abrir **so** os arquivos que sobraram.

Simbolo repetido em varios apps (`cn()`) da "No unique node match": a ferramenta
imprime os ids; repita com o id completo (ex.: `apps_web_src_lib_utils_cn`).

### Onde o grafo NAO ajuda

- **Nao atravessa HTTP.** `fetch('/api/...')` no front e `router.post('/...')`
  na API nao tem ligacao sintatica. Para medir impacto de mudanca de rota,
  grep pela string da rota nos 4 apps.
- **`graphify query` em linguagem natural nao serve.** Casa nome de simbolo,
  nao intencao; pergunta em portugues retorna vazio e a resposta vem truncada.
  Use `explain` / `affected` / `path`.

## Mapa da arquitetura

<!-- graph-map:begin -->
<!-- Gerado por scripts/graph-map.js. Nao editar a mao: rode `node scripts/graph-map.js --write`. -->

Grafo: 1749 nos, 2936 arestas (commit `6f29dc46`).

| Area | Nos | Hub (maior propagacao de mudanca) |
|---|---|---|
| `apps/web` | 616 | `cn()` (228 arestas) - `apps/web/src/lib/utils.ts:4` |
| `apps/admin` | 365 | `Encounter.tsx` (58 arestas) - `apps/admin/src/components/Encounter.tsx:1` |
| `apps/api` | 307 | `admin.ts` (52 arestas) - `apps/api/src/routes/admin.ts:1` |
| `apps/patient` | 229 | `sections.tsx` (37 arestas) - `apps/patient/src/components/sections.tsx:1` |
| `packages/database` | 85 | `"Tenant"` (24 arestas) - `packages/database/prisma/migrations/20240429000000_init/migration.sql:8` |
| `scripts` | 47 | `graph-map.js` (19 arestas) - `scripts/graph-map.js:1` |
| `packages/shared` | 22 | `shared/src/index.ts` (12 arestas) - `packages/shared/src/index.ts:1` |
| `.github` | 8 | `rollback()` (3 arestas) - `.github/scripts/remote-deploy.sh:72` |

**Acoplamento entre areas:**
- `apps/api -> packages/database`: 31 arestas

**Onde as coisas moram** (diretorios com 5+ nos):

```
 282  apps/web/src/components/ui
 219  apps/web
 132  apps/admin
 130  apps/patient
 127  apps/api/src/lib
 126  apps/admin/src/components
  90  apps/api/src/routes
  74  apps/admin/src/lib
  72  apps/api
  47  scripts
  46  apps/web/src/components
  42  packages/database
  41  apps/patient/src/lib
  34  apps/patient/src/components
  22  apps/web/src/hooks
  16  apps/web/src/lib
  16  apps/admin/src/pages
  15  apps/admin/src
  13  packages/shared/src
  12  packages/database/prisma/migrations/20260430000000_crm_patient_pwas
  10  apps/web/src/types
  10  apps/patient/src/pages
   9  apps/api/src/middleware
   9  apps/web/src/assets/instagram
   9  packages/shared
   8  apps/patient/src/pages/sections
   8  .github/scripts
   7  apps/web/src/pages
   7  packages/database/prisma/migrations/20240429000000_init
   7  packages/database/prisma/migrations/20260430010000_security_storage_push
   6  packages/database/src
   5  apps/web/src
   5  apps/api/scripts
```

<!-- graph-map:end -->

## Divida conhecida

- `packages/shared` e codigo morto: ninguem importa `@marcela/shared`. O
  `TENANT_SLUG` que ele exporta nao e usado e `'marcela-duch'` esta hardcoded
  em 5 arquivos: `apps/web/src/lib/api.ts`, `apps/admin/src/lib/ui.tsx`,
  `apps/patient/src/lib/api.ts`, `apps/api/src/routes/patient.ts` e
  `packages/database/src/seed.ts`.

## Convencoes

- Conversa e commits em portugues (pt-BR).
- `npm run check:encoding` valida encoding — roda antes de commitar.
- Rotas em `apps/api/src/routes/`, middlewares em `apps/api/src/middleware/`,
  hierarquia de erros sob `AppError` em `apps/api/src/lib/errors.ts`.
- O grafo se reconstroi sozinho no `post-commit` (~7s, sem custo de LLM).

## Manter este arquivo vivo

A secao "Mapa da arquitetura" e gerada; o resto e escrito a mao e nunca e
sobrescrito. Depois de mudanca estrutural (novo app, pacote, modulo grande):

```sh
node scripts/graph-map.js --write   # regenera a secao entre os marcadores
node scripts/graph-map.js --check   # falha se estiver desatualizada (CI)
```

Ao terminar uma implementacao que mude arquitetura, acoplamento ou convencao,
atualize aqui: e o unico arquivo lido em toda sessao sem custo de investigacao.
