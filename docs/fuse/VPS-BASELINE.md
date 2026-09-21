# VPS Baseline

Medicao de leitura, sem alteracao do ambiente.

- **Host:** `72.60.10.108` (`srv953800`), Ubuntu, kernel 5.15.0-191
- **Data da coleta:** 2026-09-21, 23:02 UTC
- **Metodo:** SSH via paramiko, somente leitura
- **Evidencia bruta:** `scratchpad/baseline_vps.txt` (527 linhas, nao versionado)

## Contexto que invalida comparacao antes/depois

A VPS **foi reinstalada** pelo responsavel porque as aplicacoes a derrubaram.
Nao existe estado anterior preservado para comparar. Toda metrica abaixo e do
host **depois** da reinstalacao, com o marcela-glow-site **ausente**.

Baseline do proprio projeto: `NOT_MEASURED` — nao ha o que medir enquanto a
aplicacao nao subir. O baseline dele so pode ser coletado apos o primeiro
deploy corrigido, e e pre-requisito da fase de validacao.

## Capacidade do host

| metrica | valor | unidade | fonte | data | contexto |
|---|---|---|---|---|---|
| CPU | 4 | vCPU | `nproc` | 2026-09-21 | AMD EPYC 9354P |
| RAM total | 15988 | MiB | `free -m` | 2026-09-21 | repouso |
| RAM usada | 2789 | MiB | `free -m` | 2026-09-21 | repouso |
| RAM disponivel | 12697 | MiB | `free -m` | 2026-09-21 | repouso |
| buff/cache | 11803 | MiB | `free -m` | 2026-09-21 | repouso |
| Swap total | 2047 | MiB | `free -m` | 2026-09-21 | 33 MiB em uso |
| Disco / | 194 | GB | `df -h` | 2026-09-21 | 47 GB usados, 25% |
| Inodes / | 5 | % | `df -i` | 2026-09-21 | folga ampla |
| Load average | 1.01 / 0.51 / 0.41 | — | `/proc/loadavg` | 2026-09-21 | 4 vCPU, repouso |
| Pressure CPU some avg60 | 1.21 | % | `/proc/pressure/cpu` | 2026-09-21 | sem saturacao |
| Pressure memoria full avg60 | 0.00 | % | `/proc/pressure/memory` | 2026-09-21 | sem pressao |
| Uptime | 3 | dias | `uptime` | 2026-09-21 | pos-reinstalacao |

Host saudavel em repouso. A folga de ~12,7 GB nao e do projeto: e compartilhada
com os vizinhos listados abaixo.

## Vizinhanca — a VPS nao e dedicada

**30 containers ativos, de ~10 projetos de terceiros.** Docker 29.8.0,
Compose v5.5.1.

Projetos: `makucho`, `makucho-studio`, `m2centerauto`, `aprenderia`,
`ultrazend`/`velomail`, `digiurban`, `ferraco`, `fuse-criativos`.

Consumo somado dos vizinhos em repouso: **~2,4 GiB**. Portas ocupadas em
`127.0.0.1`: 3050, 3060, 3092, 3096, 3097, 3100, 3130 — a porta 3095 pretendida
pelo projeto esta livre.

### Limites de memoria dos vizinhos (medido)

Todos os containers de terceiros declaram limite. Amostra de `docker stats`:

| container | uso | limite | % |
|---|---|---|---|
| `makucho-api` | 93,2 MiB | 192 MiB | 48,6 |
| `makucho-web` | 83,1 MiB | 256 MiB | 32,5 |
| `makucho-postgres` | 46,9 MiB | 256 MiB | 18,3 |
| `digiurban-vps` | 295,9 MiB | 1 GiB | 28,9 |
| `ultrazend-api` | 94,1 MiB | 512 MiB | 18,4 |
| `m2centerauto-postgres-1` | 46,0 MiB | 768 MiB | 6,0 |
| `makucho-studio-nginx` | 5,0 MiB | 32 MiB | 15,8 |
| `aprenderia-web` | 136,4 MiB | 512 MiB | 26,6 |

Duas excecoes, e sao instrutivas: `ferraco-crm-vps` (695,2 MiB) e
`ferraco-postgres` (52,1 MiB) aparecem com limite `15.61GiB` — isto e, **sem
limite**, o total do host. Sao exatamente os dois containers que podem consumir
a maquina inteira.

## Estado do marcela-glow-site: AUSENTE

| verificacao | resultado |
|---|---|
| containers `marcela_*` | nenhum |
| `/opt/dramarcela` | nao existe |
| `/opt/dramarcela/current` | nao existe |
| vhost `dramarcela` em `sites-enabled` | nao existe |
| certificado do dominio em `/etc/letsencrypt/live/` | nao existe |
| `find /opt /srv /home /root -iname '*marcela*'` | vazio |

### Efeito para quem acessa o site (medido de fora)

DNS de `dramarceladuch.com.br` e `www.dramarceladuch.com.br` resolve para
`72.60.10.108`. Sem vhost para esses nomes, o nginx do host entrega o primeiro
vhost disponivel:

```
http://www.dramarceladuch.com.br   -> 301 -> https://www.velomail.com.br/
https://www.dramarceladuch.com.br  -> falha TLS (cert CN=velomail.com.br)
```

Certificado servido: `CN=velomail.com.br`, emitido por Let's Encrypt,
valido de 2026-09-19 a 2026-12-18. E o vhost `ultrazend`.

O site da clinica esta fora do ar e o dominio entrega o site de outro projeto.

## Disco: o custo de compilar na VPS

`docker system df -v` separa os projetos em dois grupos claros.

**Build no GitHub, pull na VPS** (imagens `ghcr.io/...`):

| imagem | tamanho | unique |
|---|---|---|
| `makucho-api` | 639 MB | 401 MB |
| `makucho-web` | 354 MB | 115,8 MB |
| `makucho-studio-api` | 486 MB | 246,5 MB |
| `aprenderia-web` | 780 MB | 541,5 MB |

**Build na propria VPS** (imagens locais, sem registry):

| imagem | tamanho | unique |
|---|---|---|
| `m2centerauto-plate-scraper` | 1,95 GB x2 tags | 2 kB |
| `m2centerauto-backend` | 1,37 GB x2 tags | 5,2 MB |
| `m2centerauto-alpr` | 952 MB x2 tags | 2 kB |

Somadas, as imagens do `m2centerauto` passam de **8,5 GB** — mantendo duas tags
de cada, e o unico projeto que compila na maquina. Alem do disco, o build local
consome CPU e I/O durante a compilacao, concorrendo com todos os vizinhos.

Ha tambem 4 imagens `<none>` de 355 MB cada (~1,4 GB), das quais 3 sem
container: camadas orfas de builds locais.

## Limitacoes desta medicao

- Sem serie historica: o host tem 3 dias de uptime e nao ha metrica preservada
  de antes da reinstalacao.
- Sem medicao sob carga: todos os numeros sao de repouso.
- Consumo do proprio projeto: `NOT_MEASURED`, por ausencia da aplicacao.
- Postgres, MinIO e logs do projeto: `NOT_MEASURED`, pelo mesmo motivo.
- Segunda VPS `72.60.10.112` (citada em memoria de projeto): nao verificada.
