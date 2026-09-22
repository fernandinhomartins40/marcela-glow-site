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

# Guarda tambem QUAL IMAGEM a versao no ar usa.
#
# O .env e global e o workflow ja o reescreveu com a tag nova antes de chegar
# aqui. Sem gravar a anterior, o rollback voltaria o diretorio mas subiria a
# imagem que acabou de falhar — ou seja, nao seria rollback nenhum.
PREVIOUS_IMAGE_TAG=""
if [ -n "$PREVIOUS_RELEASE_DIR" ] && [ -f "$PREVIOUS_RELEASE_DIR/.image-tag" ]; then
  PREVIOUS_IMAGE_TAG="$(cat "$PREVIOUS_RELEASE_DIR/.image-tag" 2>/dev/null || true)"
fi

ln -sfn "$ENV_FILE" "$RELEASE_DIR/.env"

# Marca qual imagem esta release usa, para que o deploy seguinte saiba a que
# voltar se precisar.
grep '^IMAGE_TAG=' "$ENV_FILE" | cut -d= -f2- > "$RELEASE_DIR/.image-tag" || true

cd "$RELEASE_DIR"

# O override de producao troca `build:` por `image:` do GHCR — a VPS nao
# compila nada. Os dois arquivos sao obrigatorios: sem o segundo o compose
# tentaria compilar e nao acharia o codigo-fonte, que nao e mais enviado.
compose() {
  docker compose \
    --env-file "$ENV_FILE" \
    -f docker-compose.yml \
    -f docker-compose.prod.yml \
    -p "$COMPOSE_PROJECT" "$@"
}

# ─────────────────────────────────────────────────────────────────────────────
# Baixar antes de derrubar o que esta no ar
#
# Mesma logica de antes, quando aqui se compilava: buscar tudo primeiro, para
# que uma imagem faltando ou um registry fora do ar abortem o deploy sem tocar
# na versao que esta servindo.
#
# A diferenca e que agora isto e download, nao compilacao — sem npm install,
# sem tsc, sem Vite disputando CPU com os outros projetos do host.
# ─────────────────────────────────────────────────────────────────────────────

echo "Baixando as imagens da release $RELEASE..."
if ! compose pull; then
  echo "Falha ao baixar as imagens: a versao em producao segue intacta." >&2
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
    # Sem `--build`: a imagem da release anterior ja esta no disco da VPS, e
    # e justamente ela que se quer de volta. Recompilar aqui seria lento e
    # poderia produzir algo diferente do que estava no ar.
    #
    # IMAGE_TAG sobrescreve o valor do .env (que ja e o da versao que falhou).
    if IMAGE_TAG="${PREVIOUS_IMAGE_TAG:-}" \
       docker compose --env-file "$ENV_FILE" \
         -f docker-compose.yml -f docker-compose.prod.yml \
         -p "$COMPOSE_PROJECT" up -d --remove-orphans; then
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

# ─────────────────────────────────────────────────────────────────────────────
# Dados de demonstracao
#
# Diferente do seed acima, falha aqui NAO derruba o deploy: sao dados de
# vitrine, e a aplicacao funciona sem eles. O que ele resolve e a tabela de
# procedimentos vazia, que deixa agendamento, catalogo e atendimento sem opcao
# nenhuma para escolher.
#
# Quando a clinica tiver o proprio catalogo e as proprias pacientes, ponha
# SEED_DEMO_DATA=0 no .env do servidor: dado ficticio nao deve conviver com
# prontuario real.
# ─────────────────────────────────────────────────────────────────────────────

echo "Populando dados de demonstracao..."
if ! compose exec -T api node scripts/seed-demo-data.js; then
  echo "Aviso: o seed de demonstracao falhou; o deploy segue sem ele." >&2
fi

ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

# Limpeza conservadora.
#
# `docker image prune -f` sem filtro apaga camadas penduradas de QUALQUER
# projeto do host — e esta VPS e compartilhada com ~10 outros. O `until=168h`
# limita a imagens com mais de uma semana, preservando as recentes de que o
# rollback depende. Ainda e global, entao so remove o que ja estava orfao ha
# dias, nunca algo que um vizinho acabou de construir.
echo "Limpando camadas orfas com mais de 7 dias..."
docker image prune -f --filter "until=168h" >/dev/null 2>&1 || true

echo "Mantendo a release atual e as 4 anteriores mais recentes..."
mkdir -p "$APP_ROOT/releases"
find "$APP_ROOT/releases" -mindepth 1 -maxdepth 1 -type d ! -name "$RELEASE" -printf '%T@ %p\n' | \
  sort -rn | \
  tail -n +5 | \
  cut -d' ' -f2- | \
  xargs -r rm -rf

echo "Release $RELEASE no ar."
