# ──────────────────────────────────────────────────────────────────────────────
# Build stage
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

# Copy root manifest files needed by npm workspaces
COPY package.json turbo.json ./

# Copy workspace manifests (layer-cache friendly)
COPY apps/api/package.json ./apps/api/package.json
COPY packages/database/package.json ./packages/database/package.json

# Install all workspace dependencies
RUN npm install

# Copy source after deps to maximise cache hits
COPY apps/api/ ./apps/api/
COPY packages/database/ ./packages/database/

# Generate Prisma client
RUN cd packages/database && npx prisma generate

# Compile TypeScript → JavaScript
RUN cd apps/api && npx tsc

# ──────────────────────────────────────────────────────────────────────────────
# Production runner stage
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache dumb-init openssl

ENV NODE_ENV=production

# Production node_modules (only what's needed at runtime)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
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
      'const prisma = globalForPrisma.__marcelaPrisma || new prismaClient.PrismaClient({ log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"] });' \
      'if (process.env.NODE_ENV !== "production") globalForPrisma.__marcelaPrisma = prisma;' \
      'module.exports = { ...prismaClient, prisma };' \
      > ./node_modules/@marcela/database/index.js

# Entrypoint script
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 apiuser && \
    chown -R apiuser:nodejs /app

USER apiuser

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
