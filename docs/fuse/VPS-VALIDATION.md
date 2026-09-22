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

- **Testado com Postgres apenas.** A imagem `minio/minio:latest` exige
  autenticacao no registry e nao pode ser baixada nesta maquina; `minio` e
  `minio-init` tiveram o limite verificado na configuracao, **nao em
  execucao**. A API e os tres fronts exigem build completo e tambem nao foram
  exercitados sob limite.
- **Carga sintetica, nao de producao.** 100 mil linhas em 200 tabelas nao
  reproduzem o uso real da clinica.
- **Ambiente local, nao a VPS.** O host de producao tem 4 vCPU contra 8 locais.
  Os tetos seguem validos como configuracao, mas o comportamento sob
  concorrencia real so se confirma apos o deploy da F2.
- Os limites de `api`, `web`, `admin`, `patient` e `nginx` permanecem
  **estimativas fundamentadas** no consumo medido dos vizinhos equivalentes
  (`VPS-BASELINE.md`), a confirmar sob carga real.

### Pendencia aberta por esta fase

`minio/minio:latest` nao baixa sem `docker login`. Se isso valer tambem para a
VPS, o deploy falha ao subir o MinIO. Fora do escopo da F1 — registrado para a
F2, que trata do deploy.

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
- `minio/minio:latest` segue exigindo `docker login` nesta maquina; se valer
  para a VPS, o deploy falha ao subir o MinIO. Continua pendente.

### Resultado

**`PARTIALLY_VALIDATED`.** O que podia ser verificado localmente foi, incluindo
o caminho critico (migrations, seed, Prisma e health com a imagem enxuta). O
fluxo de registry depende do GitHub Actions voltar a executar.
