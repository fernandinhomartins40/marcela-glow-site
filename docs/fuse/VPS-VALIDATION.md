# Validacao

## F1 — Impedir que a aplicacao derrube o host · `VALIDATED`

Data: 2026-09-21. Ambiente: Docker 29.1.3 local (9,6 GB, 8 CPU).
Achados fechados: `VPS-02` `BLOCKER`, `VPS-03` `HIGH`, `VPS-05` `HIGH`.

### O que mudou

| arquivo | mudanca |
|---|---|
| `docker-compose.yml` | `mem_limit` + `cpus` + `logging` nos 8 servicos, via ancora `x-log` |
| `.dockerignore` | criado na raiz |

Diff: **49 insercoes, 0 remocoes**. Nenhuma funcionalidade, variavel de
ambiente, porta, volume ou healthcheck foi alterada.

### `VPS-02` — limites de RAM e CPU · `DONE`

Cobertura verificada em `docker compose config` (configuracao resolvida, nao o
arquivo-fonte): **8 de 8 servicos** com `mem_limit`, `cpus` e `logging`.

| servico | `mem_limit` | `cpus` |
|---|---|---|
| `api` | 512M | 1.0 |
| `postgres` | 512M | 1.0 |
| `minio` | 256M | 0.5 |
| `web` · `admin` · `patient` · `nginx` · `minio-init` | 64M cada | 0.5 |

Teto somado: **1600 MiB**; em regime (sem `minio-init`, que sai apos rodar):
**1536 MiB** — 10,0% dos 15988 MiB do host.

**Comportamento sob limite, medido em execucao:**

| momento | uso | limite | % | OOM | restart |
|---|---|---|---|---|---|
| repouso, apos subir | 33,81 MiB | 512 MiB | 6,6 | nao | 0 |
| 200 tabelas, 100 mil linhas | 61,26 MiB | 512 MiB | 12,0 | nao | 0 |
| consulta pesada, `work_mem=32MB` | 62,95 MiB | 512 MiB | 12,3 | nao | 0 |

Container `healthy` em todos os momentos. Pico observado a **12,3%** do teto —
folga de 8x sobre a carga testada.

Limite confirmado no runtime, nao so no arquivo:
`docker inspect` retorna `OOMKilled=false`, `RestartCount=0`, `Status=running`.

### `VPS-03` — rotacao de log · `DONE`

Aplicado por ancora YAML (`x-log`), para que um servico novo nao nasca sem
politica. Confirmado no container em execucao:

```json
{"Type":"json-file","Config":{"max-file":"3","max-size":"10m"}}
```

Teto de log: 30 MB por container (3 arquivos de 10 MB), contra crescimento
ilimitado antes.

### `VPS-05` — `.dockerignore` · `DONE`

Medido com um build de contexto puro (`FROM scratch` + `COPY . /x`), mesma
maquina, mesmo repositorio:

| condicao | contexto transferido | tempo |
|---|---|---|
| **com** `.dockerignore` | **5,32 MB** | **3,2 s** |
| **sem** `.dockerignore` | nao concluiu | **> 10 min (timeout)** |

O build sem o arquivo foi interrompido por timeout de 600 s **sem terminar de
transferir o contexto**. Por isso o ganho e registrado como **limite inferior**:
de mais de 10 minutos para 3,2 segundos. O numero exato do contexto sem
filtro permanece `NOT_MEASURED` — a medicao nao terminou.

A causa esta identificada: sem filtro o contexto inclui `node_modules/`,
`.git/`, `graphify-out/` e `.kilo/worktrees/`, este ultimo com uma copia
inteira do repositorio.

### Verificacoes de regressao

- `docker compose config --quiet`: valido.
- `npm run check:encoding`: passou.
- `git diff --stat`: 49 insercoes, 0 remocoes — nenhuma remocao de
  funcionalidade.
- Ambiente de teste desmontado (`down -v`); nenhum container, volume ou imagem
  de terceiros foi tocado. As imagens de teste criadas nesta validacao foram
  removidas.

### Limitacoes desta validacao

- **Testado com Postgres apenas.** `minio` e `minio-init` nao baixavam nesta
  maquina e tiveram o limite verificado so na configuracao. **Corrigido na
  F2.1**, que achou a causa real (as imagens sairam do Docker Hub, nao era
  falta de login) e exercitou os dois em execucao. A API e os tres fronts
  exigem build completo e tambem nao foram exercitados sob limite aqui — a API
  foi coberta depois, na F2.
- **Carga sintetica, nao de producao.** 100 mil linhas em 200 tabelas nao
  reproduzem o uso real da clinica.
- **Ambiente local, nao a VPS.** O host de producao tem 4 vCPU contra 8 locais.
  Os tetos seguem validos como configuracao, mas o comportamento sob
  concorrencia real so se confirma apos o deploy da F2.
- Os limites de `api`, `web`, `admin`, `patient` e `nginx` permanecem
  **estimativas fundamentadas** no consumo medido dos vizinhos equivalentes
  (`VPS-BASELINE.md`), a confirmar sob carga real.

### Pendencia aberta por esta fase

`minio/minio:latest` nao baixa nesta maquina. Se isso valer tambem para a VPS,
o deploy falha ao subir o MinIO. Fora do escopo da F1 — registrado para a F2,
que trata do deploy.

> **Desfecho (F2.1):** valeu para a VPS, e o deploy falhou exatamente aqui. A
> causa registrada acima — "exige `docker login`" — estava **errada**: era a
> leitura literal da mensagem do Docker, e nenhum login resolveria. Ver a
> secao da F2.1.

### Resultado

**`VALIDATED`** no escopo declarado: os tres achados estao fechados e o
comportamento sob limite foi verificado em execucao para o servico testavel.
A confirmacao sob carga real de todos os servicos depende da F2.

---

## F2 — Mover o build para o GitHub Actions · `PARTIALLY_VALIDATED`

Data: 2026-09-21. Ambiente: Docker 29.1.3 local (9,6 GB, 8 CPU).
Achados: `VPS-01` `BLOCKER`, `VPS-04` `HIGH`, `VPS-07` `MEDIUM`,
`VPS-11` `MEDIUM`.

### O que mudou

| arquivo | mudanca |
|---|---|
| `deploy-production.yml` | um job virou tres: `version` -> `build` (matriz de 4) -> `deploy` |
| `docker-compose.prod.yml` | **novo**: override que troca `build:` por `image:` do GHCR |
| `remote-deploy.sh` | `compose build` virou `compose pull`; rollback por tag de imagem |
| `remote-health-check.sh` | roda a partir do diretorio da release |
| 4 Dockerfiles | `npm install` -> `npm ci`, com `package-lock.json` no contexto |
| `apps/api/Dockerfile` | estagio `prod-deps` com `npm ci --omit=dev` |

### `VPS-01` — build fora da VPS · `DONE` (nao verificado em execucao)

Estrutura dos jobs, confirmada por leitura do YAML resolvido:

```
version (calcula a tag uma vez)
   └─ build  [api, web, admin, patient]  -> push para o GHCR
        └─ deploy  -> a VPS so faz pull + up -d
```

A tag e calculada **num job proprio** porque os dois seguintes precisam da
mesma string; calculada em cada um, o timestamp divergiria.

O override foi verificado: com os dois arquivos, `docker compose config` nao
devolve `build:` em nenhum dos quatro servicos, e todos apontam para
`ghcr.io/...`. O `!reset` e o que apaga a chave herdada — sem ele o compose
ainda aceitaria `--build`.

O passo de upload deixou de enviar o monorepo e envia **4 caminhos**:
`docker-compose.yml`, `docker-compose.prod.yml`, `nginx/` e `.github/scripts/`.

**Nao verificado:** o fluxo completo nao rodou. O GitHub Actions esta bloqueado
por faturamento (ver "Impedimento" abaixo), entao o push para o GHCR, o pull na
VPS e o login no registry seguem `NOT_MEASURED`.

### `VPS-04` — devDependencies fora da imagem · `DONE`

Medido na imagem construida:

| pacote | na imagem de producao |
|---|---|
| `typescript` | ausente |
| `vitest` | ausente |
| `@types/node` | ausente |
| `tsx` | ausente |

Antes, `COPY --from=builder /app/node_modules` levava tudo isso para producao.

**O que precisava continuar funcionando, e funciona** — a skill e explicita que
aplicacao de pe nao prova migration e seed:

| verificacao | resultado |
|---|---|
| `require('@prisma/client')` | `PrismaClient: function` |
| `require('@marcela/database')` | `object` (wrapper CommonJS intacto) |
| `prisma migrate deploy` | **All migrations have been successfully applied** |
| `seed-demo-users.js` | exit 0, credenciais criadas |
| tabelas no banco apos migrar | **37** |
| `GET /api/health` | `{"status":"ok","database":"ok"}` |

Tamanho da imagem da API depois: **513 MB**. O valor de antes nao foi medido
(a imagem anterior nao existia nesta maquina), entao a reducao em MB fica
`NOT_MEASURED` — o que esta provado e a **ausencia** dos devDependencies.

### `VPS-07` — `npm ci` · `DONE`

Os quatro Dockerfiles passaram a copiar `package-lock.json` e usar `npm ci`.
Build completo verificado em dois: `web` e `api`. `admin` e `patient` tem
Dockerfile de mesma estrutura do `web` e **nao foram construidos**.

### `VPS-11` — retencao de releases · `DONE` (ja existia)

A retencao das 5 ultimas ja estava implementada no fim do `remote-deploy.sh`.
O que mudou foi o `docker image prune -f`, que era **global**: numa VPS com ~10
projetos de terceiros, apagava camada penduradas de qualquer um. Agora leva
`--filter until=168h`, restringindo ao que esta orfao ha mais de uma semana.

### Defeito encontrado e corrigido durante esta fase

O rollback estava quebrado pela propria mudanca. `compose up` no diretorio da
release anterior usava `--env-file "$ENV_FILE"`, e esse `.env` **ja tinha sido
reescrito com a tag nova** pelo passo anterior do workflow. O rollback voltaria
o diretorio e subiria a imagem que acabou de falhar.

Corrigido gravando `.image-tag` em cada release e passando
`IMAGE_TAG="$PREVIOUS_IMAGE_TAG"` como variavel de ambiente no rollback.
Precedencia confirmada por teste: variavel de ambiente sobrescreve
`--env-file`.

### Efeito colateral verificado: o limite da API da F1

A F1 fechou com o limite da API como **estimativa** — nao havia imagem para
exercitar. Agora houve:

| momento | uso | limite | % | OOM |
|---|---|---|---|---|
| apos subir | 29,87 MiB | 512 MiB | 5,8 | nao |
| apos 40 requisicoes | 31,39 MiB | 512 MiB | 6,1 | nao |

O teto de 512M da F1 esta confirmado para a API, com folga de 16x.

### Impedimento

O GitHub Actions **nao executa**: o run 35669818795 foi recusado em 3 segundos,
sem iniciar passo algum, com a anotacao

> *The job was not started because recent account payments have failed or your
> spending limit needs to be increased.*

O ultimo deploy bem-sucedido foi em **08/09/2026**. Isto explica o site fora do
ar: o deploy nao quebrou, parou de rodar.

Enquanto o faturamento nao for resolvido, estes pontos seguem `NOT_MEASURED`:
build e push para o GHCR, `docker login` na VPS, `compose pull`, tempo total do
deploy e pico de recursos no host durante a operacao.

### Limitacoes

- Nenhuma etapa rodou no GitHub Actions nem na VPS.
- `admin` e `patient` nao foram construidos.
- Nao ha comparacao de tamanho de imagem antes/depois.
- O rollback foi corrigido por leitura e teste de precedencia do compose,
  **nao exercitado de ponta a ponta**.
- `minio/minio:latest` nao baixa nesta maquina; se valer para a VPS, o deploy
  falha ao subir o MinIO. Continua pendente. **Foi o que aconteceu** — tratado
  na F2.1 abaixo.

### Resultado

**`PARTIALLY_VALIDATED`.** O que podia ser verificado localmente foi, incluindo
o caminho critico (migrations, seed, Prisma e health com a imagem enxuta). O
fluxo de registry depende do GitHub Actions voltar a executar.

---

## F2.1 — MinIO fora do Docker Hub · `VALIDATED`

Data: 2026-09-22. Ambiente: **a propria VPS** (72.60.10.108), que e onde o
defeito aparecia.

### O que aconteceu

Com o faturamento do GitHub Actions resolvido, o deploy do commit `93311ed`
rodou de ponta a ponta e parou no `compose pull`:

```
Image ghcr.io/...-web:93311ed-...      Pulling
Image minio/minio:latest               Error pull access denied for minio/minio,
                                       repository does not exist or may require 'docker login'
Falha ao baixar as imagens: a versao em producao segue intacta.
```

As quatro imagens do GHCR autenticaram e comecaram a baixar. O pull abortou por
causa de uma imagem de terceiro.

**O comportamento de seguranca funcionou como projetado:** o `compose pull`
vem antes do `compose up` justamente para que uma imagem faltando aborte o
deploy sem tocar no que esta servindo. A mensagem final confirma.

### Causa: nao era falta de login

A F1 registrou esta pendencia como "exige `docker login`". Era a leitura
literal da mensagem do Docker, e estava **errada**. Medido na VPS:

| verificacao | resultado |
|---|---|
| `docker pull postgres:16-alpine` | **baixou** (mesmo Hub, mesma maquina, mesmo momento) |
| `docker pull minio/minio:latest` | pull access denied |
| `hub.docker.com/v2/repositories/minio/minio/` | `{"message":"object not found"}` |
| `hub.docker.com/v2/repositories/minio/mc/` | `{"message":"object not found"}` |
| manifesto de `latest` no registry do Hub | HTTP 400 |

Postgres baixar no mesmo instante elimina rate limit e elimina rede. A API do
Hub responde `object not found`: **os repositorios `minio/minio` e `minio/mc`
nao existem mais la**. A MinIO os retirou do Docker Hub.

O Docker Hub responde a mesma frase — *"repository does not exist or may
require 'docker login'"* — para repositorio inexistente e para repositorio sem
permissao. A frase oferece as duas hipoteses e a F1 registrou so a segunda,
sem testar. Nenhum `docker login` teria resolvido.

### Correcao

| servico | antes | depois |
|---|---|---|
| `minio` | `minio/minio:latest` | `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z` |
| `minio-init` | `minio/mc:latest` | `quay.io/minio/mc:RELEASE.2025-08-13T08-35-41Z` |

Quay e o registry que a propria MinIO publica hoje; responde sem autenticacao.

**Por que tag de release e nao `:latest`.** `latest` e mutavel: a versao que
sobe em producao nao e necessariamente a que foi testada, e foi a imagem
mudando debaixo do deploy que produziu esta falha. Os digests foram conferidos
— as tags fixas apontam para exatamente o mesmo conteudo que `latest` servia
em 22/09/2026, entao fixar **nao muda a versao**, so congela:

```
quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z  sha256:14cea493...8936e
quay.io/minio/minio:latest                        sha256:14cea493...8936e
quay.io/minio/mc:RELEASE.2025-08-13T08-35-41Z     sha256:a7fe349e...11727
quay.io/minio/mc:latest                           sha256:a7fe349e...11727
```

Versoes reais, lidas dos binarios: MinIO `RELEASE.2025-09-07T16-13-09Z`
(go1.24.6), mc `RELEASE.2025-08-13T08-35-41Z`.

### Verificado em execucao, nao so na configuracao

Os dois servicos foram exercitados na VPS sob os limites da F1, com os mesmos
comandos do `minio-init`:

| verificacao | resultado |
|---|---|
| `minio` sobe e se mantem | `status=running`, `OOMKilled=false`, `restarts=0` |
| `mc alias set` | `Added 'local' successfully` |
| `mc mb local/marcela-files` | `Bucket created successfully` |
| `mc anonymous set download .../public` | aplicada; leitura confirma `download` |
| segunda execucao (todo deploy repete) | idempotente, sem erro |

Consumo sob o teto de 256M da F1: **64,88 MiB (25,3%)** ao subir, **71,32 MiB
(27,9%)** apos as operacoes do `mc`. Sem OOM.

Isto fecha uma limitacao declarada na F1: `minio` e `minio-init` tinham o
limite verificado **so na configuracao**. Agora foi em execucao.

### Regressao

- `docker compose config --quiet`: valido.
- `docker compose -f base -f prod config`: as duas imagens resolvem para o quay.
- Nenhuma outra `image: ...:latest` restou nos composes.
- `npm run check:encoding`: passou.
- Ambiente de teste desmontado; nenhum container, volume ou imagem de terceiros
  foi tocado.

### Limitacoes

- O deploy completo pelo workflow **ainda nao rodou** com esta correcao. O que
  esta provado e que as imagens baixam e funcionam na VPS; o `compose pull` do
  deploy real segue `NOT_MEASURED` ate o proximo push.
- As imagens do GHCR autenticaram no deploy que falhou, mas nenhuma terminou de
  baixar — o `compose pull` completo continua por confirmar.

### Licao

**Mensagem de erro que oferece duas hipoteses nao e diagnostico.** O Docker
dizia "nao existe **ou** precisa de login"; registrei a segunda e a carreguei
por duas fases. O teste que desfez o engano levou segundos: baixar outra imagem
do mesmo registry na mesma maquina. Quando a mensagem lista causas
alternativas, a que elimina uma delas e barata — e obrigatoria antes de
registrar a outra como pendencia.

---

## F2.2 — Corrida de inicializacao do MinIO · `VALIDATED`

Data: 2026-09-22. Ambiente: **a propria VPS**.

### O que aconteceu

Com o MinIO vindo do quay (F2.1), o deploy passou do `compose pull` pela
primeira vez, construiu as 4 imagens, criou **todos** os containers — e morreu
em:

```
Container marcela_minio_init  Error
service "minio-init" didn't complete successfully: exit 1
```

Log do `minio-init`:

```
mc: <ERROR> Unable to initialize new alias from the provided credentials.
Get "http://minio:9000/probe-.../?location=": dial tcp 172.28.0.3:9000:
connect: connection refused.
```

Log do `minio`, no mesmo instante: `INFO: Formatting 1st pool, 1 set(s)`.

### Causa

`depends_on: - minio` (forma curta) espera o container **iniciar**, nao ficar
pronto. O MinIO inicia em milissegundos mas so aceita conexao depois de
formatar o pool. O `mc` corria contra essa formatacao.

O defeito sempre esteve no compose; nenhum deploy anterior tinha chegado longe
o suficiente para revela-lo.

### Como o teste da F2.1 deixou isto passar

Na F2.1 os mesmos comandos do `mc` passaram. O teste tinha um `sleep 12` antes
de roda-los — **exatamente a espera que faltava no compose**. O teste
reproduziu a espera em vez do defeito.

A licao e especifica: ao testar um servico que o orquestrador inicia, a espera
tem de vir do mesmo mecanismo que o orquestrador usa. Um `sleep` no teste
substitui a dependencia que se quer verificar.

### Correcao

| onde | mudanca |
|---|---|
| `minio` | `healthcheck` com `mc ready local` (binario presente na imagem) |
| `minio-init` | `depends_on: minio: condition: service_healthy` |
| `minio-init` | `set -e` e remocao do `exit 0` |
| `minio-init` | comentario `#` retirado de dentro do bloco YAML `>` |

**O healthcheck distingue os dois estados** — medido com volume novo:

| instante | `mc ready local` |
|---|---|
| 0s | `The cluster 'local' is unreachable: ... connection refused` |
| 1s em diante | `The cluster 'local' is ready` |

Nao e espera cega: o comando falha durante a formatacao e passa depois.

### Dois defeitos vizinhos, achados ao ler o entrypoint

1. **Falha silenciosa.** Os comandos eram separados por `;` e terminavam em
   `exit 0`: cada um rodava mesmo com o anterior falhando, e o servico
   reportaria **sucesso** de qualquer jeito. No deploy que falhou, o `mc mb`
   tentou `localhost:9000` depois de o alias ja ter falhado. O exit 1 veio por
   acaso, do ultimo comando. Sem bucket nao ha upload de imagem nem de
   documento — isto precisa derrubar o deploy, nao passar calado.
2. **Comentario que virava comando.** Em bloco YAML `>` as linhas com `#` sao
   texto do comando, nao comentario. Movido para fora.

### Verificacao

Pelo proprio compose, na VPS, com volume novo e **sem espera artificial**:

```
minio-1 Starting -> Started -> Waiting -> Healthy
minio-init-1 Starting -> Started
Added `local` successfully.
Bucket created successfully `local/marcela-files`.
```

Idempotente: `up -d --force-recreate minio-init` repete sem erro.

### Armadilha do ambiente de teste, registrada

Dois testes intermediarios deram `Access Key Id does not exist` e me levaram a
uma hipotese errada (credencial residual no volume). A causa era outra:
`docker-compose.yml` fixa `name: marcela_internal` para a rede e
`container_name` para cada servico, entao **um teste na VPS reusa a rede do
deploy real**, onde o nome `minio` resolve para o container do deploy — com
outra senha. O teste so ficou valido depois de renomear rede, volume e
container.

Quem for testar este compose na VPS precisa isolar os tres, ou estara medindo
o deploy em producao sem perceber.

### Regressao

- `docker compose config --quiet`: valido.
- Demais `depends_on` auditados: `api`, `web`, `admin`, `patient` e `nginx` ja
  usavam condicao adequada. `minio` era o unico na forma curta.
- `npm run check:encoding`: passou.
- Ambiente de teste desmontado (`down -v`), rede e volume proprios removidos;
  nada de terceiros tocado.

### Limitacoes

- O deploy completo com esta correcao **ainda nao terminou** no momento deste
  registro. O que esta provado e o comportamento do compose na VPS.
- `api`, `web`, `admin`, `patient` e `nginx` ainda nao subiram em producao;
  seus limites de memoria seguem `NOT_MEASURED` sob carga real.

---

## F2 (conclusao) e F3 — o site voltou ao ar · `VALIDATED`

Data: 2026-09-22. Ambiente: **producao**, VPS 72.60.10.108.

Deploy `ok` no run 35672665534 (commit `c1ea35c`) — o **primeiro bem-sucedido
desde 08/09/2026**.

### Uma quarta falha antes de passar: rede, nao senha

O deploy do `c1ea35c` falhou no passo "Verify VPS password access", cuja
mensagem manda conferir o secret `VPS_PASSWORD` e o `PasswordAuthentication`.
A linha real do erro dizia outra coisa:

```
ssh: connect to host 72.60.10.108 port 22: Connection timed out
```

Timeout de conexao: nada foi autenticado porque o pacote nao chegou. Medido na
VPS: `ufw` inativo, sem `fail2ban`, sem regras DROP/REJECT, sshd escutando em
`0.0.0.0:22` — e o log do `sshd` **nao registra tentativa alguma** daquele
runner.

O que descartou bloqueio permanente: no mesmo periodo o log mostra conexoes
**aceitas** de tres IPs Azure do GitHub Actions (`20.161.28.99`,
`68.154.115.182`, `172.215.217.192`, com 7, 7 e 6 sessoes). Outros runners
alcancaram a VPS sem problema. E intermitente e vem de fora da maquina.

Resolvido com re-run do job, que reaproveitou as 4 imagens ja no GHCR.

**Correcao levada ao workflow:** tres tentativas com 15s de intervalo e, na
falha, uma mensagem que separa os casos — testa a porta 22 com `nc` e so
culpa autenticacao se a porta abrir. Se o runner nao tiver `nc`, nao afirma
causa nenhuma. Os quatro cenarios foram testados com stubs.

### O deploy, medido em producao

| verificacao | resultado |
|---|---|
| `GET /api/health` | `{"status":"ok","database":"ok"}` |
| `/`, `/admin/`, `/paciente/` | 200, 200, 200 |
| `minio-init` | `Exited (0)` — antes era `Exited (1)` |
| bucket | `marcela-files` criado; `public/` com `download` |
| `minio` recriado com healthcheck | sim (`config-hash` mudou, como previsto) |
| `current` | `releases/c1ea35c-20260922003644` |

### Os limites da F1, agora medidos sob a aplicacao real

A F1 fechou com `api`, `web`, `admin`, `patient` e `nginx` como **estimativas**
tiradas do consumo dos vizinhos. Medicao em producao:

| container | uso | limite | % do teto |
|---|---|---|---|
| `nginx` | 4,40 MiB | 64 MiB | 6,9 |
| `web` | 4,42 MiB | 64 MiB | 6,9 |
| `admin` | 4,37 MiB | 64 MiB | 6,8 |
| `patient` | 5,40 MiB | 64 MiB | 8,4 |
| `api` | 32,20 MiB | 512 MiB | 6,3 |
| `minio` | 71,25 MiB | 256 MiB | 27,8 |
| `postgres` | 39,95 MiB | 512 MiB | 7,8 |

**Total ~162 MiB de 15988 MiB do host — cerca de 1%.** `OOMKilled=false` e
`RestartCount=0` nos 8 containers. O mais apertado e o MinIO, com folga de
3,6x. Nenhum teto precisa de ajuste.

Host depois de tudo: disco 27% (era 25% no baseline), carga 0,51.

**Ressalva:** e consumo em repouso, logo apos subir. Uso real da clinica —
varias usuarias, upload de imagem, relatorio — ainda nao foi exercido.

### F3 — dominio publicado

| verificacao | antes | depois |
|---|---|---|
| `https://www.dramarceladuch.com.br/` | site do velomail | **200, site da clinica** |
| `<title>` | (velomail) | `Dra. Marcela Duch \| Medicina Estetica em Chapadao do Sul/MS` |
| `/admin/`, `/paciente/`, `/api/health` | — | 200, 200, 200 |
| certificado | ausente | Let's Encrypt, `CN=dramarceladuch.com.br` + `www`, ate **20/12/2026** |

**A armadilha do `return 301` foi verificada, nao presumida.** Com um arquivo
de teste em `/var/www/certbot/.well-known/acme-challenge/`:

```
challenge -> HTTP 200   (conteudo correto)
raiz      -> HTTP 301 -> https://www.dramarceladuch.com.br/
```

O desafio passa e o resto redireciona — a renovacao automatica nao vai quebrar
em silencio.

Certbot chamado **so para este dominio** (`certonly --cert-name`), nunca
`renew` global: sao 9 dominios na maquina com lock compartilhado.

**Os vizinhos nao foram afetados.** Linha de base colhida antes da mudanca e
conferida depois — os 8 devolvem exatamente os mesmos codigos (velomail 200,
aprenderia 200, digiurban 307, ferraco 301, fusesite 200, m2center 301,
makucho 200, studio.makucho 200).

### Descoberta: a F3 ja estava automatizada

O vhost que eu escrevi a mao foi **sobrescrito pelo proprio deploy**, que
configura o nginx do host. A versao do repositorio e melhor que a minha:
`client_max_body_size 50m` alinhado com o teto da API (a minha punha 25m),
`acme-challenge` nos dois blocos e comentarios explicando a mesma armadilha.

Ou seja, a F3 nunca foi trabalho manual pendente — faltava o deploy rodar. O
`VPS-AUDIT.md` classificou `VPS-00` como configuracao ausente na VPS; a causa
real era a mesma das outras: **o deploy nao executava desde 08/09**.

### Estado dos achados de VPS

| achado | estado |
|---|---|
| `VPS-00` dominio servindo outro site | **fechado** |
| `VPS-01` build na VPS | **fechado** (build no CI, VPS so baixa) |
| `VPS-02` sem limites | **fechado e medido em producao** |
| `VPS-03` log sem rotacao | fechado |
| `VPS-04` devDeps na imagem | fechado |
| `VPS-05` sem `.dockerignore` | fechado |
| `VPS-07` `npm install` | fechado |
| `VPS-11` retencao de releases | fechado |
| `VPS-06` backup | **aberto** (F6) |
| `VPS-08` cache headers | aberto |
| `VPS-09` `SEED_DEMO_DATA=1` | **aberto** — esta `1` em producao agora |
| `VPS-10` segredos com padrao inseguro | aberto (F6) |
| `VPS-12` SSH com senha de root | aberto (F6) |

### O que continua sem medicao

- Comportamento sob uso real da clinica.
- Tempo total do deploy e pico de recursos do host durante a operacao.
- Rollback de ponta a ponta: nao exercitado (e agora ha versao anterior no ar
  para voltar, o que antes nao existia).

---

## Extra — hash de senha nas respostas da API · `VALIDATED`

Data: 2026-09-22. Ambiente: **producao**.

**Nao estava em nenhuma auditoria.** Apareceu ao conferir se o painel
continuava funcionando depois da limpeza dos dados de demonstracao: a resposta
de `/api/admin/patients` trazia `passwordHash`.

### Medido endpoint a endpoint, com token real

| endpoint | resultado |
|---|---|
| `/api/admin/patients` | **vazava** |
| `/api/admin/patients/:id` | **vazava** |
| `/api/admin/users` | **vazava** — hash de toda a equipe |
| `/api/patient/me` | **vazava** |
| `/api/admin/dashboard` | ok |
| `/api/patient/profile` | ok |

O mais grave e `/api/admin/users`: qualquer pessoa logada no painel — inclusive
a recepcao — recebia o hash bcrypt de todas as contas, a medica incluida.

### Causa e por que a correcao nao foi rota a rota

`include` sem `select` traz a tabela inteira, e `res.json(registro)` a devolve.
Sao 32 usos de `prisma.patient.*` so nas rotas; corrigir os quatro casos
medidos deixaria o quinto nascer igual.

O campo passou a sair na **saida do cliente Prisma**, com `$extends`
(`packages/database/src/index.ts`). Consulta existente e futura ficam seguras
por padrao; escrita nao e afetada.

`omit` global seria mais direto, mas exige Prisma 6 ou a preview feature
`omitApi` — o projeto esta no `@prisma/client@5.22.0`, e habilitar preview +
regenerar cliente no caminho critico de um deploy que acabou de estabilizar
nao se justificava. `$extends` resolve na versao instalada.

### A excecao, e o defeito que ela quase causou

O login precisa do hash; para isso existe `prismaAuth`. Tres pontos: login da
equipe (`auth.ts`), login da paciente e **ativacao de conta** (`patient.ts`).

A ativacao decide por `existing?.passwordHash` se a conta ja tem senha. Com o
cliente comum o campo seria `undefined`, a conta ativada pareceria nova e a
senha seria sobrescrita por quem soubesse apenas o e-mail — o furo que o
comentario daquele trecho proibe explicitamente. **A correcao teria criado uma
falha pior que a original** se eu nao tivesse lido o trecho antes de trocar o
cliente.

### O wrapper da imagem, que e o que roda em producao

O Dockerfile reescreve `@marcela/database` como CommonJS dentro da imagem.
Sem a mesma extensao ali, `prismaAuth` seria `undefined` e **nenhum login
funcionaria** — a repeticao exata da armadilha registrada em 08/09/2026 no
`CLAUDE.md`: o build local nao e o build do deploy.

### Verificacao em runtime, no container de producao

10 casos, todos OK:

| caso | resultado |
|---|---|
| `prisma.patient` com `include` | hash `undefined` e ausente do JSON |
| `prisma.user` com `include` | hash `undefined` e ausente do JSON |
| `prismaAuth.user` | hash legivel, prefixo `$2` (bcrypt) |
| `prismaAuth.patient` | hash legivel |
| `bcrypt.compare` do login da medica | confere |
| deteccao de conta ativada via `prismaAuth` | funciona |
| a mesma deteccao via `prisma` comum | **nao funcionaria** (por isso a excecao) |
| escrita (`update`/`create`) | segue disponivel |

### Travado com teste

`apps/api/src/lib/segredos.test.ts`, 11 casos, no padrao de `sincronia.test.ts`
(teste de codigo-fonte, para proteger a ligacao). Inclui uma regra que permite
`res.json(patient)` onde o registro vem do cliente comum e o proibe entre um
`prismaAuth.*.findUnique` e o `res.json` seguinte, que e onde o objeto tem o
hash.

**Os testes foram verificados falhando**, nao so passando:

| defeito injetado | resultado |
|---|---|
| exportar o cliente cru como `prisma` | 2 testes falham |
| trocar `prismaAuth` por `prisma` no login da paciente | 1 teste falha |
| restaurado | 11 passam |

Suite completa depois: **113 testes em 11 arquivos**, typecheck limpo.

### Provado em producao

Deploy `ok` no run 35679152878. Medido no site publico depois dele:

| verificacao | resultado |
|---|---|
| login da medica | **HTTP 200**, token de 875 chars |
| login da paciente | **HTTP 200** |
| `/api/admin/patients` | **limpo** |
| `/api/admin/users` | **limpo** |
| `/api/patient/me` (token de admin e de paciente) | **limpo** |
| resposta segue util | `name`, `email`, `phone`, `isActive`, `lastLoginAt`, `birthDate` presentes |
| erros na API | 0 |

O login era o risco real da mudanca: se o wrapper CommonJS da imagem nao
exportasse `prismaAuth`, ninguem entraria. Entra.

### Licao

O vazamento existia desde antes desta sessao e nenhuma auditoria o pegou: a
de UX/UI olhou interface, a de VPS olhou infraestrutura, e a de acessos e
sincronia testou **quem pode fazer o que**, nao **o que a resposta carrega**.
Apareceu porque, apos uma mudanca de dados, fui conferir a tela e olhei o
corpo do JSON.

Vale como criterio proprio: alem de verificar se o endpoint responde e se o
papel certo tem acesso, **olhar o que a resposta traz**. Campo sensivel sai
por descuido de `include`, nao por decisao.

---

## F6 — Recuperacao e seguranca · `PARTIALLY_VALIDATED`

Data: 2026-09-22. Ambiente: **a propria VPS**, com a aplicacao no ar.
Achados: `VPS-06` `HIGH`, `VPS-09` e `VPS-10` `MEDIUM`, `VPS-12` `REFINEMENT`.

### `VPS-06` — backup · `DONE`

Antes: **nenhum backup**, nem nosso nem de vizinho. Medido: `crontab -l` de root
vazio, `/etc/cron.d/` com apenas certbot, e2scrub_all e monarx-update, nenhum
`pg_dump` agendado na maquina.

Agora ha dois scripts, **versionados no repositorio** e instalados em
`/opt/dramarcela/bin/`:

| script | o que faz |
|---|---|
| `.github/scripts/backup.sh` | `pg_dump` + espelho do bucket, com retencao de 14 dias |
| `.github/scripts/restaurar.sh` | `--conferir` (banco descartavel) e `--de-verdade` (producao) |

Ficam no repositorio de proposito: o monitor de certificado que a memoria do
projeto descrevia **nao existe mais** — a reinstalacao da VPS o levou. Script
de operacao que mora so na maquina se perde na proxima reinstalacao.

**O backup se recusa a gravar lixo.** Tres verificacoes antes de considerar
feito: `gzip -t` (pega arquivo truncado por disco cheio), contagem de
`CREATE TABLE` (pega dump vazio, que tambem "abre") e, no storage, contagem de
objetos antes de empacotar.

**Medido em execucao:**

| verificacao | resultado |
|---|---|
| `pg_dump` | 20 KB, **37 tabelas** |
| espelho do bucket com 2 objetos de teste | `public/` e `docs/` preservados; conteudo do arquivo extraido confere |
| bucket vazio | diz "0 objetos; nada a copiar" em vez de gravar tar vazio |
| retencao | remove so `banco-*` e `arquivos-*` por idade, nunca o diretorio |

**Defeito encontrado e corrigido durante a fase:** a primeira versao empacotava
dentro do container do MinIO, e **essa imagem nao tem `tar`** (`command -v tar`
retorna 127). O backup do banco funcionava e o do storage falhava em silencio.
So apareceu porque testei com o bucket **tendo objetos** — com o bucket vazio,
como estava, o caminho quebrado nunca era alcancado. Agora o `mc mirror` roda
no container e o `tar` no host.

**A restauracao foi exercitada, nao suposta:**

```
[03:24:22] Criando banco descartavel restore_check_1790047462 ...
[03:24:22] Restaurando banco-20260922-032406.sql.gz ...
  tabelas no backup:    37
  tabelas em producao:  37
  pacientes no backup:  1
  usuarios no backup:   5
[03:24:24] OK: o backup restaura e traz dados. Banco de teste removido.
```

Producao intacta depois (37 tabelas, `/api/health` 200) e nenhum banco
`restore_check%` deixado para tras. O modo `--conferir` falha se o backup nao
trouxer usuario nenhum — sem conta de acesso, restaurar nao devolve o painel.

**O cron foi provado executando**, nao so instalado. Agendado um teste para o
minuto seguinte e observado o log que **ele** gerou:

```
[2026-09-22 03:27:01] Salvando o banco em .../banco-20260922-032701.sql.gz ...
[2026-09-22 03:27:02] Banco salvo: 20K, 37 tabelas.
```

Agenda definitiva em `/etc/cron.d/dramarcela-backup`: backup as 03:30 todos os
dias e **conferencia de restauracao aos domingos as 04:30**. Arquivo proprio,
nao o crontab de root, para nao haver risco de sobrescrever agendamento de
vizinho — os 3 crons de terceiros foram conferidos intactos depois.

As 03:30 tambem evita o `certbot.timer` das 22:56, que revalida 9 dominios.

### `VPS-09` — dados de demonstracao · `DONE`

`SEED_DEMO_DATA` tinha padrao `1`: bastava a variavel nao estar no `.env` — e
nao estava — para cada deploy recriar 16 pacientes e 34 agendamentos ficticios
num site publico. Padrao agora e `0`.

Os dados ja criados foram removidos com `pg_dump` antes (15 pacientes, 7
prontuarios, 6 receitas, 38 sessoes, 34 agendamentos, 20 planos, 12 mensagens),
preservando tenant, expediente, catalogo e **os logins do sistema**.

A distincao que evitou quebrar o acesso: o filtro foi `@exemplo.com.br`, e
`paciente@exemplo.com` — **sem o `.br`** — e o login do portal, criado pelo
seed essencial. Um caractere separa limpar de trancar a paciente fora.

**Confirmado depois de dois deploys:** os dados nao voltaram (1 paciente, 0
agendamentos, 9 procedimentos preservados).

### `VPS-10` — segredos com padrao inseguro · `DONE`

Oito pontos do compose caiam em valor publicado no repositorio quando a
variavel faltava. O pior era `JWT_SECRET:-change-this-jwt-secret-in-production-32chars`:
com segredo conhecido, **qualquer pessoa forja token de administradora**.

Trocados por `${VAR:?mensagem}` em 5 variaveis (8 ocorrencias):
`POSTGRES_PASSWORD`, `JWT_SECRET`, `BOOTSTRAP_TOKEN`,
`PRESCRIPTION_SIGNING_SECRET`, `S3_SECRET_ACCESS_KEY`.

**Verificado que nao quebra nada:**

| verificacao | resultado |
|---|---|
| as 5 existem no `.env` de producao | sim, com 64 chars cada (valores proprios) |
| as 5 estao no `.env.example` | sim — quem clona copia o arquivo e funciona |
| compose sem `.env` | recusa e **diz qual variavel falta** |
| compose com `.env` completo | valido, base e base+prod |

Falhar alto e melhor que servir com segredo conhecido.

### `VPS-12` — SSH com senha de root · **decisao do responsavel**

Fica como esta. O deploy autentica com o secret `VPS_PASSWORD`, que ja funciona,
e o responsavel decidiu em 22/09/2026 **nao criar secret nova**. O workflow
forca `PubkeyAuthentication=no`, entao migrar para chave exigiria mudar o
workflow e adicionar `VPS_SSH_KEY`.

Nao e pendencia tecnica em aberto, e escolha registrada. O que permanece
valendo como recomendacao: **trocar a senha de root**, que foi digitada em
texto no chat durante esta sessao, numa maquina que hospeda ~10 projetos de
terceiros.

### Limitacoes

- **O backup nao sai da VPS.** Protege contra erro humano e defeito de
  aplicacao, nao contra perda da maquina. Um destino externo (outra VPS,
  bucket remoto) precisaria de credencial que nao existe hoje.
- **O `--de-verdade` da restauracao nao foi exercitado** — ele substitui o
  banco de producao. O `--conferir`, que e o que roda semanalmente, foi.
- **Retencao de 14 dias nao foi observada ao longo do tempo:** a logica do
  `find` foi lida e os nomes conferem, mas nenhum arquivo chegou a 14 dias
  ainda.
- Backup do storage testado com **2 objetos de 24 bytes**. Volume real da
  clinica (fotos de celular) nao foi exercitado.
