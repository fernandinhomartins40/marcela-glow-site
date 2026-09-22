#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_PORT:?DEPLOY_PORT is required}"

BASE="http://127.0.0.1:${DEPLOY_PORT}"
COMPOSE_PROJECT="dramarcela"

# Roda a partir do diretorio da release: o compose precisa achar os dois
# arquivos (base + override de producao) para resolver os servicos. O script e
# chamado por caminho absoluto, entao o cwd herdado seria /root.
if [ -n "${APP_ROOT:-}" ] && [ -n "${RELEASE:-}" ] && [ -d "$APP_ROOT/releases/$RELEASE" ]; then
  cd "$APP_ROOT/releases/$RELEASE"
fi

dump_diagnostics() {
  echo "--- containers ---" >&2
  docker compose -p "$COMPOSE_PROJECT" ps || true
  echo "--- api (ultimas 120 linhas) ---" >&2
  docker compose -p "$COMPOSE_PROJECT" logs --tail=120 api || true
  echo "--- nginx (ultimas 60 linhas) ---" >&2
  docker compose -p "$COMPOSE_PROJECT" logs --tail=60 nginx || true
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. API + banco
#
# /api/health consulta o Postgres. Aceitar so o codigo HTTP deixava passar
# deploy com o banco fora: o Express respondia "ok" sem falar com ninguem.
# ─────────────────────────────────────────────────────────────────────────────

echo "Verificando $BASE/api/health ..."
health_ok=0
for attempt in $(seq 1 30); do
  if health_body="$(curl -fsS --max-time 10 "$BASE/api/health" 2>/dev/null)"; then
    case "$health_body" in
      *'"database":"ok"'*)
        echo "API e banco respondendo."
        health_ok=1
        break
        ;;
      *)
        echo "Tentativa $attempt: API respondeu sem confirmar o banco -> $health_body"
        ;;
    esac
  else
    echo "Tentativa $attempt: API ainda nao respondeu."
  fi
  sleep 5
done

if [ "$health_ok" -ne 1 ]; then
  echo "Health check falhou: API ou banco fora do ar." >&2
  dump_diagnostics
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# 2. Migrations
#
# O entrypoint roda `prisma migrate deploy`, mas o container reinicia sozinho em
# caso de falha; sem esta conferencia o deploy passaria com o schema do banco
# atras do codigo — exatamente o que quebra a aplicacao em runtime.
# ─────────────────────────────────────────────────────────────────────────────

echo "Conferindo migrations aplicadas ..."
migrate_status="$(docker compose -p "$COMPOSE_PROJECT" exec -T api \
  npx prisma migrate status --schema=./prisma/schema.prisma 2>&1 || true)"
printf '%s\n' "$migrate_status" | tail -20

if printf '%s' "$migrate_status" | grep -qi 'not yet been applied\|pending migration'; then
  echo "Existem migrations pendentes: o schema do banco esta atras do codigo." >&2
  dump_diagnostics
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# 3. Front-ends servidos pelo nginx
#
# Cada aplicacao tem seu proprio container e seu proprio build: a API pode estar
# de pe com o site, o painel ou o portal fora do ar.
# ─────────────────────────────────────────────────────────────────────────────

check_page() {
  local path="$1"
  local label="$2"
  local code
  code="$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 10 "$BASE$path" 2>/dev/null || echo 000)"
  if [ "$code" = "200" ]; then
    echo "  ok      $label ($path)"
    return 0
  fi
  echo "  FALHOU  $label ($path) -> HTTP $code" >&2
  return 1
}

echo "Verificando as paginas ..."
failed=0
check_page "/" "site publico" || failed=1
check_page "/admin/" "painel da clinica" || failed=1
check_page "/paciente/" "portal da paciente" || failed=1

if [ "$failed" -ne 0 ]; then
  echo "Uma ou mais aplicacoes nao responderam." >&2
  dump_diagnostics
  exit 1
fi

echo "Health check completo: API, banco, migrations e as tres aplicacoes no ar."
