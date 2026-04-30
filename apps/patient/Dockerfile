FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_TENANT_SLUG=marcela-duch
ARG VITE_BASE_PATH=/paciente/
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TENANT_SLUG=$VITE_TENANT_SLUG
ENV VITE_BASE_PATH=$VITE_BASE_PATH

COPY package.json ./
COPY turbo.json ./
COPY apps/patient/package.json ./apps/patient/package.json

RUN npm install --workspace=@marcela/patient

COPY apps/patient/ ./apps/patient/

RUN cd apps/patient && npm run build

FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/apps/patient/dist /usr/share/nginx/html
COPY apps/patient/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
