#!/usr/bin/env bash
set -euo pipefail

: "${APP_ROOT:?APP_ROOT is required}"
: "${RELEASE:?RELEASE is required}"
: "${DEPLOY_PORT:?DEPLOY_PORT is required}"

RELEASE_DIR="$APP_ROOT/releases/$RELEASE"
ENV_FILE="$APP_ROOT/.env"
CURRENT_LINK="$APP_ROOT/current"
COMPOSE_PROJECT="dramarcela"

if [ ! -d "$RELEASE_DIR" ]; then
  echo "Release directory not found: $RELEASE_DIR" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Environment file not found: $ENV_FILE" >&2
  exit 1
fi

# Guarda para onde o current aponta hoje: se esta versao nao subir, volta.
PREVIOUS_RELEASE_DIR=""
if [ -L "$CURRENT_LINK" ]; then
  PREVIOUS_RELEASE_DIR="$(readlink -f "$CURRENT_LINK" || true)"
fi

ln -sfn "$ENV_FILE" "$RELEASE_DIR/.env"

cd "$RELEASE_DIR"

compose() {
  docker compose --env-file "$ENV_FILE" -p "$COMPOSE_PROJECT" "$@"
}

# ─────────────────────────────────────────────────────────────────────────────
# Build antes de derrubar o que esta no ar
#
# `up --build` compila com os containers antigos ja parando: um erro de
# compilacao deixava o site fora do ar ate alguem intervir. Compilando antes,
# uma falha de build aborta o deploy sem tocar na versao em producao.
# ─────────────────────────────────────────────────────────────────────────────

echo "Compilando as imagens da release $RELEASE..."
if ! compose build; then
  echo "Build falhou: a versao em producao segue intacta." >&2
  exit 1
fi

echo "Subindo os servicos na porta $DEPLOY_PORT..."
compose up -d --remove-orphans

# ─────────────────────────────────────────────────────────────────────────────
# Espera a API responder
#
# O entrypoint roda `prisma migrate deploy` antes de servir; sem esperar, o seed
# abaixo corria contra um container que ainda nem tinha aplicado o schema.
# ─────────────────────────────────────────────────────────────────────────────

echo "Aguardando a API ficar pronta..."
api_ready=0
for attempt in $(seq 1 40); do
  if curl -fsS --max-time 5 "http://127.0.0.1:${DEPLOY_PORT}/api/health" 2>/dev/null | grep -q '"database":"ok"'; then
    echo "API pronta (tentativa $attempt)."
    api_ready=1
    break
  fi
  sleep 5
done

rollback() {
  echo "--- logs da api ---" >&2
  compose logs --tail=150 api >&2 || true

  if [ -n "$PREVIOUS_RELEASE_DIR" ] && [ -d "$PREVIOUS_RELEASE_DIR" ] && [ "$PREVIOUS_RELEASE_DIR" != "$RELEASE_DIR" ]; then
    echo "Voltando para a release anterior: $PREVIOUS_RELEASE_DIR" >&2
    cd "$PREVIOUS_RELEASE_DIR"
    if docker compose --env-file "$ENV_FILE" -p "$COMPOSE_PROJECT" up -d --build --remove-orphans; then
      echo "Rollback concluido." >&2
    else
      echo "Rollback tambem falhou: intervencao manual necessaria." >&2
    fi
  else
    echo "Sem release anterior para voltar." >&2
  fi
}

if [ "$api_ready" -ne 1 ]; then
  echo "A API nao respondeu apos o deploy." >&2
  rollback
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Dados base
#
# Falha aqui derruba o deploy: sem tenant a aplicacao inteira responde 404 de
# clinica nao encontrada, e sem expediente a agenda nao oferece horario nenhum.
# ─────────────────────────────────────────────────────────────────────────────

echo "Garantindo tenant, usuarios e expediente..."
if ! compose exec -T api node scripts/seed-demo-users.js; then
  echo "Seed dos dados base falhou." >&2
  rollback
  exit 1
fi

ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

echo "Limpando imagens orfas..."
docker image prune -f >/dev/null || true

echo "Mantendo a release atual e as 4 anteriores mais recentes..."
mkdir -p "$APP_ROOT/releases"
find "$APP_ROOT/releases" -mindepth 1 -maxdepth 1 -type d ! -name "$RELEASE" -printf '%T@ %p\n' | \
  sort -rn | \
  tail -n +5 | \
  cut -d' ' -f2- | \
  xargs -r rm -rf

echo "Release $RELEASE no ar."
