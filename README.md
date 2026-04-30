# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/3937a908-f443-4f21-9095-356e78d0158d

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/3937a908-f443-4f21-9095-356e78d0158d) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

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

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/3937a908-f443-4f21-9095-356e78d0158d) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
