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
