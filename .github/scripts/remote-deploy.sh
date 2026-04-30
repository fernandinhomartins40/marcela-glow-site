#!/usr/bin/env bash
set -euo pipefail

: "${APP_ROOT:?APP_ROOT is required}"
: "${RELEASE:?RELEASE is required}"
: "${DEPLOY_PORT:?DEPLOY_PORT is required}"

RELEASE_DIR="$APP_ROOT/releases/$RELEASE"
ENV_FILE="$APP_ROOT/.env"
CURRENT_LINK="$APP_ROOT/current"

if [ ! -d "$RELEASE_DIR" ]; then
  echo "Release directory not found: $RELEASE_DIR" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Environment file not found: $ENV_FILE" >&2
  exit 1
fi

ln -sfn "$ENV_FILE" "$RELEASE_DIR/.env"

cd "$RELEASE_DIR"

echo "Building and starting Docker services for release $RELEASE on port $DEPLOY_PORT..."
docker compose --env-file "$ENV_FILE" -p dramarcela up -d --build --remove-orphans

ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

echo "Pruning old Docker artifacts..."
docker image prune -f >/dev/null || true

echo "Keeping the 5 most recent releases..."
mkdir -p "$APP_ROOT/releases"
find "$APP_ROOT/releases" -mindepth 1 -maxdepth 1 -type d | sort -r | tail -n +6 | xargs -r rm -rf

echo "Release $RELEASE deployed."
