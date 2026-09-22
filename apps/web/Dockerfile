# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Copy root package files
COPY package.json package-lock.json ./
COPY turbo.json ./

# Copy workspace package files
COPY apps/web/package.json ./apps/web/package.json

# Install dependencies
RUN npm ci --workspace=@marcela/web

# Copy web source
COPY apps/web/ ./apps/web/

# Build
RUN cd apps/web && npm run build

# Production stage with nginx for static files
FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Nginx config for SPA
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
