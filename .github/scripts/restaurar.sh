#!/usr/bin/env bash
#
# Restauracao de um backup gerado por `backup.sh`.
#
# Existe por duas razoes. A primeira e o dia em que for preciso, e ninguem
# quer descobrir o comando sob pressao. A segunda e que **backup nao testado
# nao e backup**: sem um caminho de volta exercitado, o arquivo no disco e uma
# suposicao.
#
#   bash restaurar.sh --conferir <dump>   # restaura num banco descartavel e compara
#   bash restaurar.sh --de-verdade <dump> # SUBSTITUI o banco de producao
#
# O modo `--conferir` e o que se roda periodicamente: ele nao toca em producao.
set -euo pipefail

MODO="${1:-}"
DUMP="${2:-}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-marcela_postgres}"
ENV_FILE="${ENV_FILE:-/opt/dramarcela/.env}"

uso() {
  echo "uso: bash restaurar.sh --conferir|--de-verdade <arquivo.sql.gz>" >&2
  exit 2
}

[ -n "$MODO" ] && [ -n "$DUMP" ] || uso
[ -f "$DUMP" ] || { echo "arquivo nao encontrado: $DUMP" >&2; exit 1; }

valor_env() { grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- || true; }
PG_USER="$(valor_env POSTGRES_USER)"; PG_USER="${PG_USER:-marcela}"
PG_DB="$(valor_env POSTGRES_DB)";     PG_DB="${PG_DB:-marcela_glow}"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

case "$MODO" in
  --conferir)
    # Banco temporario com nome proprio: restaurar sobre o de producao para
    # "testar" e o erro que transforma o teste no desastre.
    TEMP="restore_check_$(date +%s)"
    log "Criando banco descartavel $TEMP ..."
    docker exec "$POSTGRES_CONTAINER" psql -U "$PG_USER" -d postgres \
      -c "CREATE DATABASE $TEMP;" >/dev/null

    limpar() {
      docker exec "$POSTGRES_CONTAINER" psql -U "$PG_USER" -d postgres \
        -c "DROP DATABASE IF EXISTS $TEMP;" >/dev/null 2>&1 || true
    }
    trap limpar EXIT

    log "Restaurando $DUMP ..."
    if ! zcat "$DUMP" | docker exec -i "$POSTGRES_CONTAINER" \
         psql -U "$PG_USER" -d "$TEMP" -v ON_ERROR_STOP=1 >/dev/null 2>&1; then
      log "FALHOU: o dump nao restaura. Este backup nao serve."
      exit 1
    fi

    conta() {
      docker exec "$POSTGRES_CONTAINER" psql -U "$PG_USER" -d "$1" -t -A -c "$2" 2>/dev/null | tr -d '[:space:]'
    }

    tab_bk="$(conta "$TEMP" "select count(*) from information_schema.tables where table_schema='public'")"
    tab_prod="$(conta "$PG_DB" "select count(*) from information_schema.tables where table_schema='public'")"
    pac_bk="$(conta "$TEMP" 'select count(*) from "Patient"')"
    usr_bk="$(conta "$TEMP" 'select count(*) from "User"')"

    echo
    echo "  tabelas no backup:    ${tab_bk:-0}"
    echo "  tabelas em producao:  ${tab_prod:-0}"
    echo "  pacientes no backup:  ${pac_bk:-0}"
    echo "  usuarios no backup:   ${usr_bk:-0}"
    echo

    # Menos tabelas que producao significa dump de um schema mais antigo, ou
    # truncado. Nao e necessariamente invalido, mas quem restaurar precisa
    # saber antes, nao depois.
    if [ "${tab_bk:-0}" -lt "${tab_prod:-0}" ]; then
      log "AVISO: o backup tem menos tabelas que producao (schema mais antigo?)."
    fi
    # Sem conta de acesso ninguem entra no painel depois de restaurar.
    if [ "${usr_bk:-0}" -lt 1 ]; then
      log "FALHOU: o backup nao tem nenhum usuario; ninguem entraria no painel."
      exit 1
    fi

    log "OK: o backup restaura e traz dados. Banco de teste removido."
    ;;

  --de-verdade)
    echo "ATENCAO: isto substitui o banco '$PG_DB' em producao." >&2
    echo "Confirme digitando exatamente: substituir" >&2
    read -r resposta
    [ "$resposta" = "substituir" ] || { echo "cancelado." >&2; exit 1; }

    # Rede de seguranca: guarda o estado atual antes de sobrescrever. Se o
    # dump escolhido for o errado, ainda ha volta.
    antes="/root/backups-fuse/antes-da-restauracao-$(date +%Y%m%d-%H%M%S).sql.gz"
    mkdir -p "$(dirname "$antes")"
    log "Guardando o estado atual em $antes ..."
    docker exec "$POSTGRES_CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DB" | gzip > "$antes"

    log "Derrubando a API para ninguem escrever durante a restauracao ..."
    docker stop marcela_api >/dev/null 2>&1 || true

    log "Restaurando ..."
    docker exec "$POSTGRES_CONTAINER" psql -U "$PG_USER" -d postgres \
      -c "DROP DATABASE IF EXISTS ${PG_DB}_old;" >/dev/null 2>&1 || true
    docker exec "$POSTGRES_CONTAINER" psql -U "$PG_USER" -d postgres \
      -c "ALTER DATABASE $PG_DB RENAME TO ${PG_DB}_old;" >/dev/null
    docker exec "$POSTGRES_CONTAINER" psql -U "$PG_USER" -d postgres \
      -c "CREATE DATABASE $PG_DB;" >/dev/null
    zcat "$DUMP" | docker exec -i "$POSTGRES_CONTAINER" \
      psql -U "$PG_USER" -d "$PG_DB" -v ON_ERROR_STOP=1 >/dev/null

    log "Subindo a API ..."
    docker start marcela_api >/dev/null 2>&1 || true

    echo
    log "Restaurado. O banco anterior ficou como ${PG_DB}_old — confira a"
    log "aplicacao antes de remover, com: DROP DATABASE ${PG_DB}_old;"
    ;;

  *) uso ;;
esac
