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

Grafo: 1784 nos, 3157 arestas (commit `c0c48cd2`).

| Area | Nos | Hub (maior propagacao de mudanca) |
|---|---|---|
| `apps/web` | 616 | `cn()` (228 arestas) - `apps/web/src/lib/utils.ts:4` |
| `apps/admin` | 377 | `lib/ui.tsx` (57 arestas) - `apps/admin/src/lib/ui.tsx:1` |
| `apps/api` | 326 | `admin.ts` (55 arestas) - `apps/api/src/routes/admin.ts:1` |
| `apps/patient` | 231 | `sections.tsx` (38 arestas) - `apps/patient/src/components/sections.tsx:1` |
| `packages/database` | 85 | `"Tenant"` (24 arestas) - `packages/database/prisma/migrations/20240429000000_init/migration.sql:8` |
| `scripts` | 48 | `graph-map.js` (20 arestas) - `scripts/graph-map.js:1` |
| `.github` | 8 | `rollback()` (3 arestas) - `.github/scripts/remote-deploy.sh:72` |

**Acoplamento entre areas:**
- `apps/api -> packages/database`: 31 arestas

**Onde as coisas moram** (diretorios com 5+ nos):

```
 282  apps/web/src/components/ui
 219  apps/web
 138  apps/api/src/lib
 132  apps/admin
 130  apps/patient
  90  apps/api/src/routes
  81  apps/admin/src/components
  80  apps/api
  74  apps/admin/src/lib
  48  scripts
  46  apps/web/src/components
  42  apps/patient/src/lib
  42  packages/database
  35  apps/patient/src/components
  22  apps/web/src/hooks
  19  apps/admin/src/components/patients
  19  apps/admin/src/components/landing
  19  apps/admin/src/components/encounter
  16  apps/web/src/lib
  16  apps/admin/src/pages
  15  apps/admin/src
  12  packages/database/prisma/migrations/20260430000000_crm_patient_pwas
  10  apps/web/src/types
  10  apps/patient/src/pages
   9  apps/api/src/middleware
   9  apps/web/src/assets/instagram
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

- O slug da clinica (`'marcela-duch'`) esta hardcoded em 5 arquivos:
  `apps/web/src/lib/api.ts`, `apps/admin/src/lib/ui.tsx`,
  `apps/patient/src/lib/api.ts`, `apps/api/src/routes/patient.ts` e
  `packages/database/src/seed.ts`. Os apps sao silos independentes (nao
  compartilham codigo), entao so vale unificar quando houver um segundo tenant.

## Auditoria

Pedido de auditoria — de um fluxo, de um painel ou do sistema inteiro — segue
este caminho. Ele nasceu da auditoria dos dois paineis, que encontrou duas
lacunas reais que a leitura do codigo nao tinha revelado.

**1. Inventariar antes de julgar.** Listar as rotas, os eventos e quem consome
cada um. `graphify affected` mostra o que depende de um simbolo; para o que
atravessa HTTP, grep pela string da rota nos quatro apps.

**2. Testar contra a API, nao ler o codigo.** Ler prova que a chamada existe;
so a execucao prova que os dois lados se falam. O script sobe banco descartavel,
seeds e servidor, faz login com cada papel e verifica, para cada acao de um
lado, se o outro enxerga o resultado. Um caso por linha, com OK ou FALHA — e o
formato que faz a lacuna saltar.

```sh
node scripts/auditar-sincronia.mjs   # exige API no ar e banco descartavel
```

Nao confie no grep para concluir ausencia. Na auditoria dos paineis um `grep`
numa janela curta demais me fez afirmar que o cancelamento nao avisava a
paciente; ele avisava, por uma funcao compartilhada. Verifique executando.

**3. Corrigir a causa, nao o caso.** As duas lacunas eram do mesmo tipo:
`notification.create` e `sendPatientPush` escritos aos pares, rota a rota, e
bastava esquecer um. A correcao foi `avisarPaciente`, que junta o par — nao
dois remendos.

**4. Travar com teste, nao com relatorio.** Relatorio envelhece; teste falha.
`apps/api/src/lib/sincronia.test.ts` guarda o contrato entre os paineis. Sao
testes de codigo-fonte de proposito: protegem a ligacao — que alguem, ao
acrescentar uma rota, nao esqueca o aviso —, nao o comportamento em execucao,
que fica nos scripts de auditoria.

**5. Documentar aqui.** Toda auditoria acrescenta abaixo o que encontrou, o que
corrigiu e o que ficou pendente. Sem isso a proxima refaz o mesmo caminho.

### Registro

**2026-09-08 — sincronia entre painel medico e portal da paciente**

31 verificacoes: pedido de horario, confirmacao, cancelamento, mensagem,
procedimento, plano, fluxo do dia entre recepcao e consultorio, balcao ate o
caixa, privacidade e permissoes. Passaram 29.

Encontrado: procedimento registrado e plano de tratamento criado apareciam no
portal sem avisar a paciente — ela so descobriria abrindo o app por acaso. Causa
comum: o par notificacao+push escrito rota a rota.

Corrigido: `avisarPaciente` em `apps/api/src/lib/push.ts` junta o par;
`admin.ts` (sessoes) e `plans.ts` passam a usa-lo. Depois: 31/31.

Travado: nove testes em `sincronia.test.ts`.

Confirmado sao: privacidade da jornada (`internalNotes` nao vaza), isolamento
entre pacientes, 403 da recepcao em prontuario e planos, separacao entre operar
e supervisionar o caixa, e o fluxo chegada → consultorio → saida → cobranca.

Pendente: a tela para a medica montar o `fieldSchema` pela interface, e o
relatorio de caixa por periodo.

## Convencoes

- **Sempre conversar em portugues do Brasil (pt-BR) no chat**, em toda resposta
  e em qualquer contexto — inclusive apos compactacao da conversa, ao retomar
  uma sessao antiga ou ao responder sobre codigo escrito em ingles. Nao mudar de
  idioma por causa do idioma da pergunta, dos nomes de simbolos ou de mensagens
  de erro em ingles.
- Commits e comentarios de codigo tambem em pt-BR.
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
