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
