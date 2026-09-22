# ──────────────────────────────────────────────────────────────────────────────
# Build stage
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

# Copy root manifest files needed by npm workspaces
# O package-lock.json vai junto: sem ele o `npm ci` nao roda, e o `npm install`
# resolvia versoes livremente — a imagem de hoje podia diferir da de ontem a
# partir do mesmo commit.
COPY package.json package-lock.json turbo.json ./

# Copy workspace manifests (layer-cache friendly)
COPY apps/api/package.json ./apps/api/package.json
COPY packages/database/package.json ./packages/database/package.json

# Install all workspace dependencies
RUN npm ci

# Copy source after deps to maximise cache hits
COPY apps/api/ ./apps/api/
COPY packages/database/ ./packages/database/

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Compile TypeScript → JavaScript
RUN cd apps/api && npx tsc

# ──────────────────────────────────────────────────────────────────────────────
# Production dependencies stage
#
# Antes o runner copiava o node_modules do builder inteiro, com TypeScript,
# Vitest e todo o devDependency do workspace dentro da imagem de producao.
# Aqui se instala so o que roda, na mesma versao do lock.
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS prod-deps

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/database/package.json ./packages/database/package.json

RUN npm ci --omit=dev

# ──────────────────────────────────────────────────────────────────────────────
# Production runner stage
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache dumb-init openssl

ENV NODE_ENV=production

# Production node_modules (only what's needed at runtime)
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/scripts ./scripts
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/packages/database/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Replace the workspace symlink with a runtime CommonJS package.
RUN rm -rf ./node_modules/@marcela/database && \
    mkdir -p ./node_modules/@marcela/database && \
    printf '%s\n' \
      '{"name":"@marcela/database","main":"index.js"}' \
      > ./node_modules/@marcela/database/package.json && \
    printf '%s\n' \
      '"use strict";' \
      'const prismaClient = require("@prisma/client");' \
      'const globalForPrisma = globalThis;' \
      'const base = globalForPrisma.__marcelaPrisma || new prismaClient.PrismaClient({ log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"] });' \
      'if (process.env.NODE_ENV !== "production") globalForPrisma.__marcelaPrisma = base;' \
      'const omitir = { passwordHash: { needs: {}, compute: () => undefined } };' \
      'const prisma = base.$extends({ result: { user: omitir, patient: omitir } });' \
      'module.exports = { ...prismaClient, prisma, prismaAuth: base };' \
      > ./node_modules/@marcela/database/index.js

# Entrypoint script
#
# O sed remove CR: com o arquivo em CRLF o shebang vira "#!/bin/sh\r", o
# container responde "no such file or directory" e a API não sobe — junto com
# ela, o `prisma migrate deploy` que roda aqui. O .gitattributes já força LF,
# mas isto garante a imagem mesmo num checkout mal configurado.
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser && \
    chown -R apiuser:nodejs /app

USER apiuser

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
