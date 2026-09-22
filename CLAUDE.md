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

**2026-09-22 — o hash de senha saia nas respostas da API**

Encontrado sem procurar, ao conferir se o painel funcionava depois de uma
limpeza de dados: `/api/admin/patients` devolvia `passwordHash`. Medido
endpoint a endpoint, eram quatro — a listagem de pacientes, o detalhe,
`/api/patient/me` e **`/api/admin/users`, que entregava o hash bcrypt de toda
a equipe a qualquer pessoa logada no painel**, recepcao inclusive.

A causa nao era rota distraida: **`include` sem `select` traz a tabela
inteira**, e `res.json(registro)` a devolve. Sao 32 usos de `prisma.patient.*`
so nas rotas, entao corrigir os quatro casos deixaria o quinto nascer igual. O
campo passou a sair na saida do cliente Prisma (`$extends` em
`packages/database/src/index.ts`): consulta existente e futura ficam seguras
por padrao, e escrita nao e afetada.

O login precisa do hash para o `bcrypt.compare`, e para isso existe
**`prismaAuth`** — tres pontos, e so eles: login da equipe, login da paciente
e ativacao de conta no portal.

**A excecao que quase virou defeito maior.** A ativacao decide por
`existing?.passwordHash` se a conta ja tem senha. Com o cliente comum o campo
vira `undefined`, a conta ativada pareceria nova e a senha seria sobrescrita
por quem soubesse apenas o e-mail — exatamente o que o comentario daquele
trecho proibe. Ler o trecho antes de trocar o cliente foi o que evitou trocar
um vazamento por uma tomada de conta.

O wrapper CommonJS do `apps/api/Dockerfile` foi junto, pelo motivo do registro
de 08/09 abaixo: e ele que roda em producao, e sem a extensao ali `prismaAuth`
seria `undefined` e nenhum login funcionaria.

Travado com 11 testes em `apps/api/src/lib/segredos.test.ts`, **verificados
falhando**: exportar o cliente cru como `prisma` quebra 2; trocar `prismaAuth`
por `prisma` no login quebra 1.

Aprendido, e vale como criterio de auditoria: **olhar o que a resposta carrega,
nao so se ela responde.** As auditorias de acessos e de sincronia testaram quem
pode fazer o que e se os dois lados se falam — nenhuma olhou o corpo do JSON.
Campo sensivel vaza por descuido de `include`, nao por decisao, e por isso nao
aparece lendo a rota com atencao ao que ela *quis* devolver.

**2026-09-08 — o build local nao e o build do deploy**

Um teste novo em `apps/admin/src/` derrubou o deploy. O build roda
`tsc --noEmit` sobre `src` inteiro, testes junto; o Dockerfile instala so as
dependencias do proprio app e o `vitest` mora na raiz do monorepo. Dentro do
container o tipo nao resolvia:

    src/navegacao.test.ts(1,38): error TS2307: Cannot find module 'vitest'

**Localmente passava** — `turbo run build` resolve o `vitest` pela raiz. Esse
e o ponto cego: verificar o build nao e o mesmo que verificar o build **como o
deploy o executa**. Quando um app e compilado em container com instalacao
propria, o unico teste que vale e o do container.

Corrigido excluindo `*.test.ts(x)` do `tsconfig.app.json` dos tres apps de
front — todos tem o mesmo `include` e o mesmo Dockerfile, entao o primeiro
teste colocado em `src/` repetiria a queda. Travado com tres testes.

Duas coisas que atrapalharam o diagnostico, ambas resolvidas:

- **O site respondia 200 em tudo e parecia intacto.** Estava: servindo a versao
  anterior. O `remote-deploy.sh` compila antes de derrubar o que esta no ar, e
  fez o certo. Para saber o que esta publicado, compare
  `readlink -f /opt/dramarcela/current` com o commit, ou procure no bundle uma
  string que so exista na versao nova.
- **Nao havia como ler o log do CI**, e a falha acabou deduzida por SSH
  comparando data de imagem Docker com data de release. Agora ha:
  `scripts/ver-deploy.mjs` (ver "Quando o deploy falha").

**2026-09-07 — navegacao do painel**

A sidebar fora desenhada olhando para a ADMIN, que ve os doze itens. Medido
papel a papel, o agrupamento se desfazia para os outros seis: **seis dos sete
terminavam com "grupos de um"** — um cabecalho em caixa-alta ocupando mais
altura que o item que anunciava. A editora de conteudo via "DIVULGACAO" sozinho
sobre um unico botao "Site".

Corrigido: quatro grupos viraram tres, em ordem de trabalho — **O dia**
(cronologico: chega, e atendida, paga), **Pacientes**, **Configuracao**.
"Cadastros" saiu de "Clinico": e configuracao mensal, nao atendimento com a
paciente na sala. O rotulo agora so aparece quando ha mais de um grupo E algum
deles agrupa de fato; o `eyebrow` do cabecalho segue a mesma regra, senao
nomeia uma divisao que a pessoa nao ve.

**Encontrado so pela medicao no navegador:** a `.app-nav` e celula de grid e
esticava ate a altura do `main` — **2640px de faixa escura numa janela de
720px**, com o "Sair" descendo junto para fora do alcance. Nenhum teste de
estrutura pegaria isso; so `getBoundingClientRect` no navegador. Corrigido com
`position: sticky` + `height: 100vh` + `align-self: start`, e a gaveta do
celular anula os tres. Depois: 720px em 720px, "Sair" visivel sem rolar nos
tres papeis medidos.

Travado: dez testes em `apps/admin/src/navegacao.test.ts`.

Aprendido: **menu se audita papel a papel, nao pela conta de admin.** A conta
mais poderosa e a unica para quem o desenho sempre fecha — e a que menos
revela. E layout se verifica medindo no navegador: a estrutura do menu estava
certa o tempo todo enquanto a barra tinha quase quatro telas de altura.

**2026-09-07 — usuarios e niveis de acesso**

40 verificacoes: para cada um dos sete papeis, o que ele precisa alcancar para
fazer o trabalho e o que deve ser barrado. Passaram 39.

Encontrado: a "Equipe" (STAFF) lia prontuario. O papel declara 6 permissoes e o
token trazia 12 — os dois seeds gravavam `UserPermission` por cima do papel,
entre elas `RECORD_READ` e `RECORD_WRITE`. Nada no codigo dizia isso: quem
lesse `rolePermissions` veria o mapa certo e o sistema fazia outra coisa.

Do mesmo tipo, achados junto: a dica na tela prometia ao STAFF "leitura das
fichas" (o seed cumpria a promessa que o papel nao fazia); o menu "Cadastros"
exigia `SETTINGS_WRITE` para abrir `/clinical/catalog`, que a API protege com
`RECORD_WRITE` — a medica nao via a propria tela de procedimentos; e "Recepcao"
exigia `APPOINTMENT_WRITE`, que a medica tambem tem, entao o balcao aparecia
para quem nao trabalha nele.

Corrigido: overrides removidos dos dois seeds, menu alinhado a permissao que a
rota cobra, dica reescrita. Depois: 40/40.

Travado: dez testes em `acessos.test.ts`.

Confirmado sao: o middleware — `requireStaff` decide por `subjectType`, nao por
lista de papeis, e `requirePermission`/`requireAnyPermission` separam "todas" de
"qualquer uma" corretamente; a separacao entre operar e supervisionar o caixa;
e `USER_MANAGE`/`AUDIT_READ` so na ADMIN.

Aprendido: **papel e a fonte de verdade; override e excecao de pessoa.** Um seed
que redefine um papel inteiro torna o mapa decorativo, e o vazamento fica
invisivel a leitura do codigo. O teste que guarda isso e o que proibe
`userPermission.create` em seed.

Pendente: nao existe conta DOCTOR no seed — a medica usa ADMIN, o que esconde
em producao qualquer defeito especifico do papel dela (ADMIN passa direto por
`requirePermission`). Criar a conta e usa-la.

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

## Quando o deploy falha

```sh
node scripts/ver-deploy.mjs              # ultimas execucoes, com o run id
node scripts/ver-deploy.mjs falhas       # so as que falharam
node scripts/ver-deploy.mjs <run_id>     # passo que quebrou + linhas de erro
node scripts/ver-deploy.mjs <run_id> --tudo   # log inteiro daquele passo
```

O token sai de `~/.git-credentials`, o mesmo que o `git push` usa — nao ha
credencial a gerenciar. Se o helper do git mudar, defina `GITHUB_TOKEN`
(escopos `repo` e `workflow`).

**Nao investigue deploy por SSH na VPS.** `gh` nao esta instalado e o
repositorio e privado (a API publica devolve 404), o que uma vez levou a deduzir
a falha comparando data de imagem Docker com data de release — quatro conexoes
para chegar ao que o log dizia numa linha.

Duas armadilhas ao ler o resultado:

- **O site responder 200 nao significa que a versao subiu.** O
  `remote-deploy.sh` compila antes de derrubar o que esta no ar, entao um build
  quebrado deixa a versao anterior servindo normalmente. Para saber o que esta
  publicado, compare `readlink -f /opt/dramarcela/current` com o commit, ou
  procure no bundle uma string que so exista na versao nova.
- **O erro raramente esta na ultima linha.** Um build quebra no meio e o resto
  do log e ruido de rollback; por isso o script filtra as linhas de erro em vez
  de so dar `tail`.

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
