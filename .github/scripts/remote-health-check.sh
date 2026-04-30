#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_PORT:?DEPLOY_PORT is required}"

URL="http://127.0.0.1:${DEPLOY_PORT}/api/health"

echo "Checking $URL ..."
for attempt in $(seq 1 30); do
  if curl -fsS "$URL" >/dev/null; then
    echo "Health check passed."
    exit 0
  fi

  echo "Health check attempt $attempt failed, retrying..."
  sleep 5
done

echo "Health check failed after 30 attempts." >&2
docker compose -p dramarcela ps || true
docker compose -p dramarcela logs --tail=120 api nginx || true
exit 1
