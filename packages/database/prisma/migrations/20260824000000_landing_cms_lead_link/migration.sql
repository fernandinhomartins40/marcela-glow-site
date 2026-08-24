-- Vínculo lead → paciente, e conteúdo editável da landing.
--
-- 1) `Lead` não tinha nenhuma relação com `Patient`. Quando um contato virava
--    paciente, a mesma pessoa passava a existir em dois registros sem ligação:
--    a origem se perdia, e não havia como saber de qual campanha uma paciente
--    tinha vindo nem evitar o cadastro duplicado.
--
-- 2) O texto da landing (Hero, Sobre, Tecnologia, Rodapé) estava fixo no código
--    React. Trocar uma frase exigia build e deploy. `LandingContent` guarda o
--    conteúdo por seção e `LandingImage` as imagens já recortadas no formato
--    que cada seção usa.

-- ── 1. Lead ganha o vínculo ──
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "patientId" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Lead_patientId_fkey'
  ) THEN
    ALTER TABLE "Lead"
      ADD CONSTRAINT "Lead_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Lead_tenantId_status_idx" ON "Lead"("tenantId", "status");

-- ── 2. Conteúdo da landing ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LandingSection') THEN
    CREATE TYPE "LandingSection" AS ENUM (
      'HERO', 'ABOUT', 'PROCEDURES', 'TECHNOLOGY',
      'TESTIMONIALS', 'APPOINTMENT', 'FOOTER', 'SEO'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "LandingContent" (
  "id"          TEXT NOT NULL,
  "section"     "LandingSection" NOT NULL,
  "content"     JSONB NOT NULL,
  "isVisible"   BOOLEAN NOT NULL DEFAULT true,
  "position"    INTEGER NOT NULL DEFAULT 0,
  "tenantId"    TEXT NOT NULL,
  "updatedById" TEXT,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandingContent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LandingContent_section_tenantId_key"
  ON "LandingContent"("section", "tenantId");

CREATE TABLE IF NOT EXISTS "LandingImage" (
  "id"         TEXT NOT NULL,
  "slot"       TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "width"      INTEGER NOT NULL,
  "height"     INTEGER NOT NULL,
  "sizeBytes"  INTEGER NOT NULL,
  "mimeType"   TEXT NOT NULL,
  "alt"        TEXT NOT NULL,
  "tenantId"   TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LandingImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LandingImage_slot_tenantId_key"
  ON "LandingImage"("slot", "tenantId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandingContent_tenantId_fkey') THEN
    ALTER TABLE "LandingContent"
      ADD CONSTRAINT "LandingContent_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LandingImage_tenantId_fkey') THEN
    ALTER TABLE "LandingImage"
      ADD CONSTRAINT "LandingImage_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
