# Plano mestre — otimizacao de VPS e UX/UI

Consolida `VPS-AUDIT.md` (13 achados) e `UX-UI-AUDIT.md` (19 achados).
Cada fase e aprovada e executada em separado, passando por
`fuse-quality-gate`.

Data: 2026-09-21. Estado: **F1 `VALIDATED`; F2-F7 aguardando aprovacao**.

## Ordem e por que ela e esta

A ordem nao e por gravidade, e por **dependencia**. Nao adianta corrigir
interface de um site que nao esta no ar, e nao adianta subir o site pelo mesmo
deploy que derrubou a VPS.

```
F1  desligar a armadilha (limites + log + dockerignore)  ─┐
F2  mover o build para o CI                              ─┼─ site volta ao ar
F3  publicar o dominio (vhost + TLS)                     ─┘
F4  acessibilidade e bloqueios de uso   ── independente de F1-F3
F5  consistencia de interface
F6  recuperacao (backup) e seguranca
F7  divida estrutural
```

F4 em diante nao dependem de F1-F3 e podem correr em paralelo.

---

## F1 · Impedir que a aplicacao derrube o host · `VALIDATED`

**Fecha:** `VPS-02` `BLOCKER`, `VPS-03` `HIGH`, `VPS-05` `HIGH`. Todos `DONE`
em 2026-09-21 — ver `VPS-VALIDATION.md` para as medicoes e as limitacoes.

**Por que primeiro.** E a causa de a VPS ter caido, e a unica fase que protege
os ~10 projetos de terceiros que dividem a maquina. Precisa estar pronta
**antes** de qualquer container deste projeto subir de novo.

| tarefa | arquivo | achado |
|---|---|---|
| `mem_limit` + `cpus` nos 7 servicos | `docker-compose.yml` | `VPS-02` |
| `logging` com `max-size: 10m`, `max-file: 3` | `docker-compose.yml` | `VPS-03` |
| Criar `.dockerignore` na raiz | novo | `VPS-05` |

Tetos de partida (do consumo medido dos vizinhos, no `VPS-BASELINE.md`), a
**validar sob carga**: nginx 64M · web/admin/patient 64M cada · api 512M ·
postgres 512M · minio 256M. Total ~1,5 GB de 15,6 GB.

**Risco.** Limite baixo demais gera OOM. Mitiga-se medindo: `docker stats` e
`OOMKilled` em `docker inspect` depois de exercitar os fluxos.

**Validacao.** Subir local, rodar os fluxos principais, conferir que nenhum
container foi morto e que nenhum encosta no teto.

**Rollback.** Remover as linhas e recriar.

---

## F2 · Mover o build para o GitHub Actions

**Fecha:** `VPS-01` `BLOCKER`, `VPS-04` `HIGH`, `VPS-07` `MEDIUM`,
`VPS-11` `MEDIUM`.

**Por que.** E a causa que voce apontou, confirmada em
`remote-deploy.sh:46`. Na mesma VPS, quem constroi no CI mantem imagens de
354-780 MB; o unico que constroi local acumula mais de 8,5 GB.

| tarefa | arquivo | achado |
|---|---|---|
| Build + push para GHCR no CI | `.github/workflows/deploy-production.yml` | `VPS-01` |
| VPS passa a so fazer `pull` + `up -d` | `.github/scripts/remote-deploy.sh` | `VPS-01` |
| Estagio de deps de producao no runner | `apps/api/Dockerfile:42` | `VPS-04` |
| `npm ci` + copiar `package-lock.json` | 4 Dockerfiles | `VPS-07` |
| Reter as 5 ultimas releases | `remote-deploy.sh` | `VPS-11` |

**Risco.** Plataforma da imagem (`linux/amd64`), autenticacao no GHCR,
repositorio privado. O `.dockerignore` da F1 vira o unico filtro de contexto
quando o `tar` sair do caminho — por isso F1 vem antes.

**Regra da skill que se aplica aqui.** Aplicacao de pe **nao prova** migration e
seed funcionais: `prisma migrate deploy` e os seeds precisam ser testados
separadamente, em banco descartavel, depois de mexer no runner da API.

**Validacao.** Deploy completo pelo novo caminho, com `docker stats` durante a
operacao para confirmar ausencia de pico de build no host. Comparar tamanho da
imagem antes/depois.

**Rollback.** O workflow atual fica versionado; reverter e um commit.

---

## F3 · Publicar o dominio

**Fecha:** `VPS-00` `BLOCKER`.

**Por que.** Hoje `dramarceladuch.com.br` entrega o site do velomail ou erro de
certificado.

| tarefa | onde | achado |
|---|---|---|
| vhost do dominio -> `127.0.0.1:3095` | VPS, `/etc/nginx/sites-available/` | `VPS-00` |
| Certificado Let's Encrypt | VPS, certbot | `VPS-00` |
| `default_server` que responda 444 | VPS, nginx | `VPS-00` |

**Armadilha documentada, a respeitar.** Memoria `vps-infra-dramarcela`: com
authenticator `webroot`, `return 301` **no nivel do bloco `server`** intercepta
o `/.well-known/acme-challenge/` e quebra a renovacao em silencio. O redirect
tem de ficar dentro de `location / { }`, com o bloco do acme-challenge antes.

**Cuidado com os vizinhos.** A VPS tem 24 dominios e certbot compartilhado
(memoria `vps-certbot-compartilhado`): `certbot renew` global durante o deploy
trava no lock. Emitir **so** para este dominio.

**Validacao.** `curl -I https://www.dramarceladuch.com.br` retorna 200 com
certificado proprio; os 8 vhosts vizinhos seguem respondendo.

**Rollback.** Remover o vhost e recarregar; nenhum vizinho e tocado.

---

## F4 · Acessibilidade e bloqueios de uso

**Fecha:** `UX-01` `BLOCKER`, `UX-02` `BLOCKER`, `UX-03` `HIGH`,
`UX-05` `HIGH`, `UX-06` `HIGH`, `UX-09`, `UX-10` `MEDIUM`.

**Por que.** Nao depende da infra e concentra o que mais atrapalha quem usa.
Foco no `admin`, que a clinica usa o dia inteiro.

| tarefa | onde | achado |
|---|---|---|
| `ErrorBoundary` na raiz dos 3 apps | `apps/*/src/` | `UX-01` |
| `--bronze-text` com >= 4,5:1; separar texto de decoracao nas 78 ocorrencias | `apps/admin/src/styles.css` | `UX-02` |
| `.row-actions button` de 30px para 44px | `styles.css:131` | `UX-03` |
| `<label htmlFor>` nos campos | os 3 apps | `UX-05` |
| Modais com `<form onSubmit>` | `apps/admin/src/lib/ui.tsx:52` | `UX-06` |
| `--border` >= 3:1 | `styles.css` | `UX-09` |
| Anel de foco >= 3:1 + regra global `:focus-visible` | `styles.css:37` | `UX-10` |

**Validacao.** Medicao de contraste (nao a olho), navegacao completa por
teclado com foco sempre visivel, Enter enviando em todo modal, e erro forcado
mostrando recuperacao.

---

## F5 · Consistencia de interface

**Fecha:** `UX-04` `HIGH`, `UX-07` `HIGH`, `UX-08`, `UX-11`, `UX-12`,
`UX-14`, `UX-16` `MEDIUM`, `UX-17`, `UX-19` `REFINEMENT`.

| tarefa | onde | achado |
|---|---|---|
| Trocar os 52 valores fixos por fluido | `apps/admin/src/styles.css:1121` e outros | `UX-04` |
| Sub-abas na URL, como `/settings` ja faz | `apps/admin/src/pages/` | `UX-07` |
| Decidir Tailwind no admin: remover ou adotar | `apps/admin/` | `UX-08` |
| Empty state no `web` | `apps/web/src/components/` | `UX-11` |
| Padrao unico de sucesso | `admin`, `web` | `UX-12` |
| Consolidar os 10 breakpoints | `styles.css` | `UX-14` |
| `safe-area-inset` no admin | `apps/admin/` | `UX-16` |
| `NotFound` em pt-BR | `apps/web/src/pages/NotFound.tsx` | `UX-17` |
| Usar o `Skeleton` que ja existe | `apps/web/` | `UX-19` |

**Decisao necessaria em `UX-08`.** Remover a configuracao morta e a mudanca
minima; adotar Tailwind no admin resolve junto `UX-14` mas e refatoracao
grande. Recomendo **remover** agora e tratar adocao como projeto proprio.

**Validacao — esta fase exige navegador.** O registro de 2026-09-07 do
`CLAUDE.md` e a prova: a `.app-nav` tinha 2640px de altura numa janela de 720px
e nenhum teste de estrutura pegou; so `getBoundingClientRect`. Medir em 360,
390, 430, 768 e 1280px.

---

## F6 · Recuperacao e seguranca

**Fecha:** `VPS-06` `HIGH`, `VPS-09`, `VPS-10` `MEDIUM`, `VPS-12` `REFINEMENT`.

**Por que separado.** Pela regra da skill, seguranca e recuperacao fazem parte
da otimizacao. Nao depende das outras fases, mas so faz sentido com o site no
ar (F2).

| tarefa | onde | achado |
|---|---|---|
| `pg_dump` periodico + copia do MinIO, fora da VPS | VPS | `VPS-06` |
| **Testar restauracao** | VPS | `VPS-06` |
| `SEED_DEMO_DATA` padrao `0` | `docker-compose.yml` | `VPS-09` |
| Segredos sem padrao inseguro (`${VAR:?}`) | `docker-compose.yml` | `VPS-10` |
| Chave SSH e usuario nao-root | workflow + VPS | `VPS-12` |

**Backup nao verificado nao e backup** — a restauracao faz parte da tarefa,
nao e opcional.

---

## F7 · Divida estrutural

**Fecha:** `UX-13`, `UX-15` `MEDIUM`, `UX-18` `REFINEMENT`.

| tarefa | achado |
|---|---|
| RHF + zod: usar no `web` ou remover | `UX-13` |
| Vocabulario unico de token | `UX-15` |
| Tratar a duplicacao literal entre apps | `UX-18` |
| Corrigir a redacao do `CLAUDE.md` sobre silos | `UX-18` |

**Nota sobre `UX-15` e `UX-18`.** Os apps sao silos **por construcao** (nenhum
importa de outro) mas nao **por conteudo** (ha arquivos byte-identicos). A
solucao de menor atrito e um arquivo de tokens gerado e copiado no build, nao
um `packages/ui` — que criaria justamente o acoplamento que o `CLAUDE.md`
evita deliberadamente.

---

## O que falta medir

Duas lacunas que nenhum documento preenche por leitura de codigo:

1. **Baseline do projeto: `NOT_MEASURED`.** Nao ha como medir antes/depois de
   uma aplicacao que nao esta rodando. So existe depois do primeiro deploy pela
   F2, e e pre-requisito de `VPS-VALIDATION.md`.
2. **Layout real: nao medido.** Toda a auditoria UX/UI e estatica. Os 52
   valores fixos sao candidatos, nao defeitos confirmados.

## Autorizacoes

Concedido pelo responsavel em 2026-09-21: configurar a VPS no que **nao** passa
pelo GitHub Actions (F3, parte da F6).

Fora disso, e por regra da skill, seguem exigindo aprovacao explicita:
`docker system prune` ou remocao de imagem `<none>` (tocaria em imagens de
terceiros), alteracao no `daemon.json` do host (afeta os vizinhos) e qualquer
acao sobre containers de outros projetos.

**Pendencia de seguranca:** a senha de root foi compartilhada em texto no chat
durante esta sessao. Convem troca-la ao fim dos trabalhos — a maquina hospeda
projetos de terceiros.
