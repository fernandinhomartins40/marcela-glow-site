-- Prontuário clínico: catálogos reutilizáveis, prescrição estruturada por item
-- e rastreio do nível de assinatura conforme a Lei 14.063/2020.

-- ── Enums ──────────────────────────────────────────────────────────────────
ALTER TYPE "RecordType" ADD VALUE IF NOT EXISTS 'ANAMNESIS';
ALTER TYPE "RecordType" ADD VALUE IF NOT EXISTS 'ASSESSMENT';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CatalogKind') THEN
    CREATE TYPE "CatalogKind" AS ENUM ('MEDICATION', 'EXAM', 'GUIDANCE', 'RECORD_TEMPLATE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MedicationControl') THEN
    CREATE TYPE "MedicationControl" AS ENUM ('COMMON', 'ANTIMICROBIAL', 'CONTROLLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentKind') THEN
    CREATE TYPE "DocumentKind" AS ENUM ('PRESCRIPTION', 'EXAM_REQUEST', 'GUIDANCE', 'CERTIFICATE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SignatureLevel') THEN
    CREATE TYPE "SignatureLevel" AS ENUM ('INTERNAL', 'ADVANCED', 'QUALIFIED');
  END IF;
END $$;

-- ── Catálogo clínico ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CatalogItem" (
  "id"          TEXT NOT NULL,
  "kind"        "CatalogKind" NOT NULL,
  "name"        TEXT NOT NULL,
  "subtitle"    TEXT,
  "body"        TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "usageCount"  INTEGER NOT NULL DEFAULT 0,
  "strength"    TEXT,
  "form"        TEXT,
  "route"       TEXT,
  "defaultDose" TEXT,
  "defaultQty"  TEXT,
  "control"     "MedicationControl" DEFAULT 'COMMON',
  "tussCode"    TEXT,
  "preparation" TEXT,
  "tenantId"    TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CatalogItem_tenantId_kind_isActive_idx" ON "CatalogItem"("tenantId", "kind", "isActive");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CatalogItem_tenantId_fkey') THEN
    ALTER TABLE "CatalogItem"
      ADD CONSTRAINT "CatalogItem_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Prescrição: tipo de documento, validade e nível de assinatura ──────────
ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS "kind" "DocumentKind" NOT NULL DEFAULT 'PRESCRIPTION';
ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS "signatureLevel" "SignatureLevel" NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMP(3);
ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS "viewedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Prescription_tenantId_kind_status_idx" ON "Prescription"("tenantId", "kind", "status");
CREATE INDEX IF NOT EXISTS "Prescription_patientId_createdAt_idx" ON "Prescription"("patientId", "createdAt");

-- Documentos já assinados antes desta migração usaram a chave do servidor
UPDATE "Prescription" SET "signatureLevel" = 'INTERNAL' WHERE "signedAt" IS NOT NULL;

-- ── Itens da prescrição ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PrescriptionItem" (
  "id"             TEXT NOT NULL,
  "prescriptionId" TEXT NOT NULL,
  "catalogItemId"  TEXT,
  "name"           TEXT NOT NULL,
  "strength"       TEXT,
  "form"           TEXT,
  "route"          TEXT,
  "dose"           TEXT,
  "quantity"       TEXT,
  "notes"          TEXT,
  "control"        "MedicationControl" NOT NULL DEFAULT 'COMMON',
  "displayOrder"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PrescriptionItem_prescriptionId_idx" ON "PrescriptionItem"("prescriptionId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PrescriptionItem_prescriptionId_fkey') THEN
    ALTER TABLE "PrescriptionItem"
      ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey"
      FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PrescriptionItem_catalogItemId_fkey') THEN
    ALTER TABLE "PrescriptionItem"
      ADD CONSTRAINT "PrescriptionItem_catalogItemId_fkey"
      FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Prontuário: campos clínicos ────────────────────────────────────────────
ALTER TABLE "MedicalRecord" ADD COLUMN IF NOT EXISTS "occurredAt" TIMESTAMP(3);
ALTER TABLE "MedicalRecord" ADD COLUMN IF NOT EXISTS "complaint"  TEXT;
ALTER TABLE "MedicalRecord" ADD COLUMN IF NOT EXISTS "plan"       TEXT;
ALTER TABLE "MedicalRecord" ADD COLUMN IF NOT EXISTS "history"    TEXT;
ALTER TABLE "MedicalRecord" ADD COLUMN IF NOT EXISTS "lockedAt"   TIMESTAMP(3);

UPDATE "MedicalRecord" SET "occurredAt" = "createdAt" WHERE "occurredAt" IS NULL;
