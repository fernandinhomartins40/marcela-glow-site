# Dra. Marcela Duch — Site e Plataforma

Site institucional e plataforma de gestão da clínica da Dra. Marcela Campanini Duch
(medicina estética, Chapadão do Sul/MS).

## Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Express + Prisma + PostgreSQL
- Docker + Nginx

## Ambiente local

Requer Node.js e npm instalados.

```sh
npm install
npm run dev
```

## Marcela Glow platform

This repository now runs as a monorepo with four deployable surfaces:

- `apps/web`: public website.
- `apps/admin`: independent admin PWA at `/admin/` for the medical CRM.
- `apps/patient`: independent patient PWA at `/paciente/`.
- `apps/api`: Express REST API with JWT auth, RBAC and Prisma/PostgreSQL persistence.

Database domains include patients, appointments, leads, medical records, procedure sessions, prescriptions, attachments, CMS pages/posts, notifications, messages and clinic settings.

Production hardening now includes:

- Revocable JWT sessions stored in PostgreSQL.
- Granular RBAC with module permissions and staff invitations.
- Audit logs for sensitive access and clinical actions.
- Password reset tokens for staff and patients.
- S3-compatible upload flow with presigned upload/download URLs.
- MinIO in Docker for local S3-compatible persistence.
- Web Push subscriptions with VAPID configuration and in-app fallback.
- Digitally signed prescriptions with verification code, QR payload, hash, and optional RSA private key/certificate support.

External credentials to configure for production:

- `S3_*` for S3/R2/MinIO-compatible object storage.
- `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` for Web Push.
- `PRESCRIPTION_SIGNING_PRIVATE_KEY` and `PRESCRIPTION_SIGNING_CERTIFICATE` for certificate-backed prescription signing.
- SMTP/transactional e-mail provider should be connected before hiding development reset/invite tokens.

Seed credentials:

- Admin: `admin@drmarceladuch.com.br` / `Admin@2024!`
- Patient: `paciente@exemplo.com` / `Paciente@2026`

Useful commands:

```sh
npm run build
npm run db:migrate
npm run db:seed
npm run dev --workspace=@marcela/admin
npm run dev --workspace=@marcela/patient
```

Docker:

```sh
docker compose up --build
```

Routes published by Nginx:

- Site: `http://localhost:3095/`
- Admin PWA: `http://localhost:3095/admin/`
- Patient PWA: `http://localhost:3095/paciente/`
- API health: `http://localhost:3095/api/health`

## Deploy

O deploy é feito por Docker na VPS, com Nginx servindo o site, os PWAs e a API
sob o mesmo domínio. Veja `docker-compose.yml` e `nginx/`.
