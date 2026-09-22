#!/usr/bin/env bash
#
# Backup do banco e do storage da clinica.
#
# Roda por cron na VPS, uma vez por dia. Mora no repositorio, e nao solto na
# maquina, para que a proxima reinstalacao da VPS nao leve o backup consigo —
# foi o que aconteceu com o monitor de certificado, que a memoria do projeto
# descrevia e que a reinstalacao apagou.
#
# O que ele guarda:
#   - `pg_dump` do Postgres (prontuario, agenda, financeiro)
#   - copia do bucket do MinIO (foto, documento, logo)
#
# O que ele NAO faz: enviar para fora da VPS. Um backup no mesmo disco protege
# contra erro humano e contra defeito de aplicacao, mas nao contra perda da
# maquina. Enquanto nao houver destino externo, isto esta declarado no
# `VPS-VALIDATION.md` como limitacao, nao como resolvido.
set -euo pipefail

DESTINO="${BACKUP_DIR:-/root/backups-fuse}"
RETER_DIAS="${BACKUP_RETER_DIAS:-14}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-marcela_postgres}"
MINIO_CONTAINER="${MINIO_CONTAINER:-marcela_minio}"
ENV_FILE="${ENV_FILE:-/opt/dramarcela/.env}"

marca="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DESTINO"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# ─────────────────────────────────────────────────────────────────────────────
# Credenciais
#
# Saem do .env do servidor, nao do script: senha em arquivo de codigo vaza no
# git. Se o .env nao existir, o backup falha alto em vez de gravar um dump
# vazio que so se descobre inutil na hora de restaurar.
# ─────────────────────────────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  log "ERRO: $ENV_FILE nao encontrado; sem credenciais nao ha backup."
  exit 1
fi

valor_env() { grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- || true; }

PG_USER="$(valor_env POSTGRES_USER)";        PG_USER="${PG_USER:-marcela}"
PG_DB="$(valor_env POSTGRES_DB)";            PG_DB="${PG_DB:-marcela_glow}"
S3_KEY="$(valor_env S3_ACCESS_KEY_ID)"
S3_SECRET="$(valor_env S3_SECRET_ACCESS_KEY)"
S3_BUCKET="$(valor_env S3_BUCKET)";          S3_BUCKET="${S3_BUCKET:-marcela-files}"

# ─────────────────────────────────────────────────────────────────────────────
# Banco
# ─────────────────────────────────────────────────────────────────────────────
dump="$DESTINO/banco-$marca.sql.gz"
log "Salvando o banco em $dump ..."
if ! docker exec "$POSTGRES_CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DB" | gzip > "$dump"; then
  log "ERRO: pg_dump falhou."
  rm -f "$dump"
  exit 1
fi

# Dump que nao abre nao e backup. `gzip -t` pega arquivo truncado, que e o que
# acontece quando o disco enche no meio da escrita.
if ! gzip -t "$dump"; then
  log "ERRO: o dump saiu corrompido."
  rm -f "$dump"
  exit 1
fi

# Um dump de banco vazio tambem "abre". Conferir que ele traz as tabelas
# evita descobrir na restauracao que se guardou um arquivo sem dados.
tabelas="$(zcat "$dump" | grep -c '^CREATE TABLE' || true)"
if [ "${tabelas:-0}" -lt 10 ]; then
  log "ERRO: o dump tem apenas ${tabelas:-0} tabelas; esperado 30 ou mais."
  rm -f "$dump"
  exit 1
fi
log "Banco salvo: $(du -h "$dump" | cut -f1), $tabelas tabelas."

# ─────────────────────────────────────────────────────────────────────────────
# Storage
#
# `mc mirror` roda dentro do container do MinIO, que ja tem o binario — assim
# o backup nao depende de baixar imagem nenhuma. Mas o **tar e feito no host**:
# a imagem do MinIO nao tem `tar` (medido em 22/09/2026, `command -v tar` da
# 127), e a primeira versao deste script falhava exatamente ali, em silencio.
# ─────────────────────────────────────────────────────────────────────────────
arquivos="$DESTINO/arquivos-$marca.tar.gz"
if [ -z "$S3_KEY" ] || [ -z "$S3_SECRET" ]; then
  log "AVISO: sem credenciais de S3 no .env; storage nao copiado."
else
  log "Espelhando o bucket $S3_BUCKET ..."
  objetos="$(docker exec "$MINIO_CONTAINER" sh -c "
      mc alias set bk http://127.0.0.1:9000 '$S3_KEY' '$S3_SECRET' >/dev/null 2>&1
      mc ls --recursive bk/$S3_BUCKET 2>/dev/null | wc -l" | tr -d '[:space:]')"

  if [ "${objetos:-0}" -eq 0 ]; then
    # Bucket vazio nao rende arquivo, e tambem nao e falha: a clinica ainda nao
    # subiu imagem nenhuma. Dizer isso e melhor que gravar um .tar.gz vazio que
    # passa por backup.
    log "Storage esta vazio (0 objetos); nada a copiar."
  else
    temp_host="$(mktemp -d)"
    if docker exec "$MINIO_CONTAINER" sh -c "
          set -e
          rm -rf /tmp/bk && mkdir -p /tmp/bk
          mc mirror --quiet bk/$S3_BUCKET /tmp/bk >/dev/null 2>&1
        " && docker cp "$MINIO_CONTAINER:/tmp/bk/." "$temp_host/" >/dev/null 2>&1 \
       && tar -czf "$arquivos" -C "$temp_host" . ; then
      log "Storage salvo: $(du -h "$arquivos" | cut -f1), $objetos objetos."
    else
      # Falha aqui nao descarta o backup do banco: o prontuario e o que nao se
      # refaz, e a imagem costuma ter origem no dispositivo de quem enviou.
      log "AVISO: o storage nao pudo ser copiado; o backup do banco esta feito."
      rm -f "$arquivos"
    fi
    docker exec "$MINIO_CONTAINER" sh -c 'rm -rf /tmp/bk' >/dev/null 2>&1 || true
    rm -rf "$temp_host"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Retencao
#
# Remove so o que este script criou (prefixos `banco-` e `arquivos-`), por
# nome e por idade. Nunca um `rm` no diretorio inteiro: a VPS e compartilhada e
# `find -delete` num caminho errado apaga o que nao e nosso.
# ─────────────────────────────────────────────────────────────────────────────
log "Removendo backups com mais de $RETER_DIAS dias ..."
find "$DESTINO" -maxdepth 1 -type f \( -name 'banco-*.sql.gz' -o -name 'arquivos-*.tar.gz' \) \
  -mtime "+$RETER_DIAS" -print -delete || true

log "Pronto. $(ls -1 "$DESTINO"/banco-*.sql.gz 2>/dev/null | wc -l) backups de banco em $DESTINO."
