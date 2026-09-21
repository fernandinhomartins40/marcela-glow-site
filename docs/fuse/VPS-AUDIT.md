# Auditoria de eficiencia — VPS e infraestrutura

Base: `VPS-BASELINE.md` (medicao de 2026-09-21) e leitura do codigo de deploy.

Gravidade: `BLOCKER` impede operar · `HIGH` causa dano ou desperdicio grande ·
`MEDIUM` desperdicio mensuravel · `REFINEMENT` melhoria.

## Resumo

A VPS foi reinstalada porque as aplicacoes a derrubaram. A causa apontada pelo
responsavel — **build na VPS em vez de no GitHub** — esta confirmada no codigo
(`VPS-01`). Mas ela sozinha nao derruba um host: o que permite uma aplicacao
consumir a maquina inteira e a **ausencia de limite de memoria** (`VPS-02`).
Os dois unicos containers sem limite hoje na VPS, `ferraco-*`, sao a prova viva
do padrao. Os 7 containers deste projeto subiriam exatamente assim.

Ha ainda um `BLOCKER` operacional independente: o dominio esta fora do ar e
entregando o site de outro projeto (`VPS-00`).

| ID | gravidade | problema |
|---|---|---|
| `VPS-00` | `BLOCKER` | Dominio fora do ar, servindo o site do velomail |
| `VPS-01` | `BLOCKER` | Deploy compila na VPS; causa da queda do host |
| `VPS-02` | `BLOCKER` | Nenhum container declara limite de RAM/CPU |
| `VPS-03` | `HIGH` | Sem politica de rotacao de log |
| `VPS-04` | `HIGH` | `node_modules` de build inteiro na imagem da API |
| `VPS-05` | `HIGH` | Nenhum `.dockerignore` no repositorio |
| `VPS-06` | `HIGH` | Sem backup do Postgres e do MinIO |
| `VPS-07` | `MEDIUM` | `npm install` em vez de `npm ci` nos 4 Dockerfiles |
| `VPS-08` | `MEDIUM` | Front sem cache headers para assets com hash |
| `VPS-09` | `MEDIUM` | Seed de demonstracao ligado por padrao em producao |
| `VPS-10` | `MEDIUM` | Segredos com valor padrao inseguro no compose |
| `VPS-11` | `MEDIUM` | Sem retencao de releases em `/opt/dramarcela` |
| `VPS-12` | `REFINEMENT` | Deploy por senha de root SSH |

---

## `VPS-00` · `BLOCKER` · Dominio fora do ar servindo outro site

**Evidencia.** Medido em 2026-09-21: DNS de `dramarceladuch.com.br` e `www`
aponta para `72.60.10.108`; nao existe vhost, certificado nem `/opt/dramarcela`
no host. Resultado observado de fora:

```
http://www.dramarceladuch.com.br  -> 301 -> https://www.velomail.com.br/
https://www.dramarceladuch.com.br -> falha TLS (cert CN=velomail.com.br)
```

**Impacto.** Paciente que digita o endereco da clinica chega ao site de outro
projeto ou a um aviso de certificado invalido. Alem da indisponibilidade, e
exposicao de marca.

**Causa.** Sem `server_name` correspondente, o nginx entrega o primeiro vhost
(`ultrazend`). Nenhum vhost declara `default_server`, o que tornaria o destino
explicito em vez de depender da ordem alfabetica de carregamento.

**Solucao.** Publicar o projeto (depende de `VPS-01`) e criar o vhost com
certificado. Independente disso, criar um `default_server` que responda 444 ou
uma pagina neutra, para que dominio sem vhost nunca caia no site de terceiro.

**Teste.** `curl -I https://www.dramarceladuch.com.br` retorna 200 com
certificado do proprio dominio.

**Rollback.** Remover o vhost e recarregar o nginx; nenhum vizinho e tocado.

**Atencao ao criar o vhost.** Ver `vps-infra-dramarcela` na memoria do projeto:
com authenticator `webroot`, um `return 301` no nivel do bloco `server` quebra
o `/.well-known/acme-challenge/` e a renovacao falha em silencio. O redirect
precisa ficar dentro de `location / { ... }`.

---

## `VPS-01` · `BLOCKER` · O deploy compila dentro da VPS

**Evidencia.**

- `.github/workflows/deploy-production.yml:59-86` — envia o **codigo-fonte**
  por `tar | ssh`, nao uma imagem pronta.
- `.github/scripts/remote-deploy.sh:46` — `compose build` executa **na VPS**.
- `.github/scripts/remote-deploy.sh:79` — o retry roda `up -d --build`, de novo
  na VPS.
- `.github/scripts/remote-deploy.sh:130` — `docker image prune -f` tenta conter
  o acumulo depois do fato.

Cada deploy compila 4 imagens no host: 4 `npm install`, `tsc`, `prisma
generate` e 3 builds Vite — tudo competindo com os ~10 projetos vizinhos por
CPU, RAM e I/O.

**Impacto medido por comparacao.** Na mesma VPS, os projetos que constroem no
GitHub e apenas baixam a imagem (`ghcr.io/...`) mantem imagens de 354 a 780 MB.
O unico que compila localmente, `m2centerauto`, acumula **mais de 8,5 GB** em
imagens, alem do pico de CPU durante cada build. E a diferenca entre os dois
modelos de deploy presentes no host.

**Solucao.** Mover o build para o GitHub Actions e publicar em registry
(GHCR, como os vizinhos ja fazem). A VPS passa a executar apenas
`docker compose pull` e `up -d`. Referencia por digest imutavel, para que
rollback seja trocar a tag.

**Beneficio esperado.** Elimina CPU e I/O de build no host; remove o
`npm install` da VPS; torna o rollback instantaneo. Numero exato de economia:
`NOT_MEASURED` ate o primeiro deploy pelo novo caminho.

**Risco.** Arquitetura da imagem (construir para `linux/amd64`), autenticacao
no registry e o fato de o repositorio ser privado.

**Teste.** Deploy completo pelo novo fluxo, com `docker stats` durante a
operacao para confirmar que nao ha pico de build no host.

**Rollback.** O workflow antigo permanece versionado; reverter e um commit.

---

## `VPS-02` · `BLOCKER` · Nenhum container declara limite de RAM ou CPU

**Evidencia.** `docker-compose.yml` inteiro: nenhuma ocorrencia de `mem_limit`,
`cpus`, `deploy.resources` ou equivalente, para nenhum dos 7 servicos.

**Por que isto e o que derruba o host.** `VPS-01` explica o desperdicio; este
item explica a queda. Sem limite, um vazamento na API, um pico do Postgres ou
um build simultaneo consomem a RAM do host inteiro — e o OOM killer do Linux
escolhe a vitima, que pode ser o container de qualquer vizinho.

Na VPS hoje, 28 dos 30 containers declaram limite. As duas excecoes
(`ferraco-crm-vps` e `ferraco-postgres`) aparecem em `docker stats` com limite
`15.61GiB`, que e a RAM total: e assim que se ve um container sem teto.
Os 7 containers deste projeto entrariam nessa condicao.

**Solucao.** Declarar `mem_limit` e `cpus` por servico, dimensionados pelo
consumo real dos vizinhos equivalentes (que estao medidos no baseline) mais
folga. Ponto de partida a validar sob carga, nao a adotar sem medir:

| servico | `mem_limit` sugerido | base da estimativa |
|---|---|---|
| `nginx` | 64M | vizinhos: 5 MiB em 32-48M |
| `web` / `admin` / `patient` | 64M cada | sao nginx servindo estatico |
| `api` | 512M | `makucho-api` usa 93 MiB em 192M; Prisma pesa mais |
| `postgres` | 512M | `makucho-postgres` usa 47 MiB em 256M |
| `minio` | 256M | sem comparavel medido |

Total do teto: ~1,5 GB dos 15,6 GB do host.

**Regra que a skill impoe e que vale registrar:** `NODE_OPTIONS` limita o heap
do V8, nao o RSS do processo. O limite do container precisa cobrir heap mais
buffers, bibliotecas nativas e threads.

**Teste.** Subir com os limites, exercitar os fluxos principais e conferir
`docker stats` e `OOMKilled` em `docker inspect`. Limite que gera OOM esta
baixo demais — corrigir pelo medido, nao pelo palpite.

**Rollback.** Remover as linhas e recriar os containers.

---

## `VPS-03` · `HIGH` · Sem politica de rotacao de log

**Evidencia.** `docker-compose.yml` nao declara `logging:` em nenhum servico.
O driver `json-file` padrao do Docker **nao rotaciona sozinho**: o arquivo
cresce ate encher o disco.

**Impacto.** Disco cheio derruba todos os projetos do host, nao so este. Com
`/` em 25%, ha folga hoje, mas o crescimento e ilimitado e silencioso.

**Solucao.** `logging.driver: json-file` com `max-size: 10m` e `max-file: 3`
por servico, ou o `daemon.json` do host — porem alterar o daemon afeta os
vizinhos e exige autorizacao a parte.

**Teste.** Apos o deploy, conferir o tamanho de `*-json.log` dos containers.

---

## `VPS-04` · `HIGH` · `node_modules` de build inteiro na imagem de producao

**Evidencia.** `apps/api/Dockerfile:42` —
`COPY --from=builder /app/node_modules ./node_modules`.

O builder roda `npm install` sem `--omit=dev` (`apps/api/Dockerfile:18`), entao
o que vai para a imagem final inclui TypeScript, Vitest e todo o
`devDependencies` do workspace.

**Impacto.** Imagem maior que o necessario — o que significa mais tempo de
push, de pull e mais disco, em todo deploy. Tambem amplia a superficie da
imagem de producao. Tamanho exato: `NOT_MEASURED` (a imagem nao existe no host).

**Solucao.** Instalar dependencias de producao num estagio proprio
(`npm ci --omit=dev`) e copiar so essas para o runner, mantendo o Prisma Client
gerado. Validar que `prisma migrate deploy` e os seeds seguem funcionando — a
skill e explicita: aplicacao de pe nao prova migration e seed funcionais.

**Teste.** Build da imagem, `docker image ls` antes/depois, e execucao de
migration e seed em banco descartavel.

---

## `VPS-05` · `HIGH` · Nenhum `.dockerignore`

**Evidencia.** Nao existe `.dockerignore` na raiz nem em nenhum app. Os 4
Dockerfiles usam `context: .`, ou seja, a raiz do monorepo.

O contexto enviado ao daemon inclui hoje: `node_modules/`, `.git/`,
`graphify-out/`, `.turbo/` e `.kilo/worktrees/` — este ultimo contem **uma copia
inteira do repositorio**.

**Impacto.** Cada build transfere esse volume ao daemon e invalida cache de
camada a cada arquivo alterado, mesmo irrelevante. Com `VPS-01` corrigido o
custo sai da VPS, mas continua pesando no CI.

**Solucao.** `.dockerignore` na raiz excluindo `node_modules`, `.git`, `dist`,
`.turbo`, `.kilo`, `graphify-out`, `docs`, `*.md`, `kit-auditoria`.

**Atencao.** O workflow atual ja exclui esses caminhos no `tar`
(`deploy-production.yml:68-83`). Ao migrar para build no CI, essa protecao
desaparece — o `.dockerignore` passa a ser o unico filtro. Corrigir junto.

---

## `VPS-06` · `HIGH` · Sem backup de Postgres e MinIO

**Evidencia.** `crontab -l` e `/etc/cron.d/` na VPS: nenhuma tarefa de backup.
Nenhum diretorio de dump encontrado. Os volumes `marcela_postgres_data` e
`marcela_minio_data` sao nomeados (sobrevivem a `compose down`), mas nao sao
copiados para lugar nenhum.

**Impacto.** Perda de prontuario e de imagem de paciente sem recuperacao. Alem
do dano ao negocio, e dado de saude.

**Nota.** Isto entra na auditoria porque, pela regra da skill, seguranca e
recuperacao fazem parte da otimizacao — nao sao escopo separado.

**Solucao.** `pg_dump` periodico com retencao definida, copia do bucket MinIO,
destino fora da VPS, e **teste de restauracao** — backup nao verificado nao e
backup.

---

## `VPS-07` · `MEDIUM` · `npm install` em vez de `npm ci`

**Evidencia.** `apps/api/Dockerfile:18`, `apps/web/Dockerfile:17`,
`apps/admin/Dockerfile:16`, `apps/patient/Dockerfile:16`.

Agrava-se porque nenhum dos quatro copia o `package-lock.json` para o contexto:
o `npm install` resolve versoes livremente a cada build.

**Impacto.** Build nao reproduzivel — a imagem de hoje pode diferir da de
ontem a partir do mesmo commit. Tambem e mais lento que `npm ci`.

**Solucao.** Copiar `package-lock.json` e usar `npm ci`.

---

## `VPS-08` · `MEDIUM` · Front sem cache headers para assets com hash

**Evidencia.** Os tres `nginx.conf` de front servem `dist/` sem `expires` nem
`Cache-Control` para `/assets/`. O Vite ja gera nome com hash, que e o que
torna cache longo seguro.

**Impacto.** Navegador rebaixa os mesmos arquivos a cada visita: mais banda no
host e carregamento mais lento para a paciente.

**Solucao.** `Cache-Control: public, max-age=31536000, immutable` para
`/assets/`, e `no-cache` para `index.html` — que nao tem hash e precisa ser
revalidado para que a versao nova chegue. Ativar `gzip`/`brotli`.

**Teste.** `curl -I` no asset e no `index.html`, conferindo os cabecalhos.

---

## `VPS-09` · `MEDIUM` · Seed de demonstracao ligado por padrao

**Evidencia.** `docker-compose.yml` — `SEED_DEMO_DATA: ${SEED_DEMO_DATA:-1}`.
O padrao e **ligado**; desligar exige lembrar de definir a variavel.
`remote-deploy.sh:103` e `:123` executam os seeds em todo deploy.

**Impacto.** Paciente e usuario ficticios no banco de producao. Ha tambem
historico relevante: conforme o registro de 2026-09-07 no `CLAUDE.md`, os seeds
gravavam `UserPermission` por cima do papel e vazaram leitura de prontuario
para a Equipe.

**Solucao.** Inverter o padrao para `0`, exigindo opt-in explicito.

---

## `VPS-10` · `MEDIUM` · Segredos com valor padrao inseguro

**Evidencia.** `docker-compose.yml`: `JWT_SECRET` tem padrao
`change-this-jwt-secret-in-production-32chars`; `POSTGRES_PASSWORD` tem
`marcela_secure_pass_2024`; `BOOTSTRAP_TOKEN` e
`PRESCRIPTION_SIGNING_SECRET` seguem o mesmo padrao.

**Impacto.** Um `.env` ausente ou incompleto sobe producao com segredo
conhecido e versionado — JWT forjavel, banco acessivel.

**Solucao.** Remover o valor padrao dos segredos, deixando `${VAR:?erro}` para
que o compose **falhe** em vez de subir inseguro.

---

## `VPS-11` · `MEDIUM` · Sem retencao de releases

**Evidencia.** `deploy-production.yml:63` cria
`/opt/dramarcela/releases/<versao>` a cada deploy. Nao ha limpeza das antigas.

**Impacto.** Crescimento sem teto no disco compartilhado.

**Solucao.** Manter as N ultimas releases (5 e suficiente para rollback) e
remover as demais. Pela regra da skill, **nao remover o que o rollback precisa**.

---

## `VPS-12` · `REFINEMENT` · Deploy por senha de root

**Evidencia.** `deploy-production.yml:22` — `PreferredAuthentications=password`,
`VPS_USER: root`, com a senha no secret `VPS_PASSWORD`.

**Impacto.** Root por senha numa maquina com ~10 projetos de terceiros. Com
build no CI (`VPS-01`), a VPS deixa de precisar de acesso amplo.

**Solucao.** Chave SSH dedicada, usuario nao-root no grupo `docker`.

---

## Fora de escopo

- `m2centerauto`, `ferraco` e demais vizinhos: os achados de disco e limite sao
  **deles**, citados so como evidencia comparativa. Nada a alterar sem
  autorizacao do responsavel por cada um.
- `docker image prune` global e limpeza das imagens `<none>`: tocaria em
  imagens de terceiros. A skill proibe limpeza destrutiva sem autorizacao.
- Segunda VPS `72.60.10.112`: nao verificada nesta auditoria.
