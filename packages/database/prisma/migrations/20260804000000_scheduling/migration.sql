-- Sistema de agendamento: duração por procedimento, expediente da clínica,
-- bloqueios de agenda e rastreio de confirmação nos agendamentos.

-- ── Procedure: duração e disponibilidade para agendamento online ────────────
ALTER TABLE "Procedure" ADD COLUMN IF NOT EXISTS "durationMin" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "Procedure" ADD COLUMN IF NOT EXISTS "bufferMin"   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Procedure" ADD COLUMN IF NOT EXISTS "isBookable"  BOOLEAN NOT NULL DEFAULT true;

-- ── Appointment: fim do atendimento e trilha de confirmação ────────────────
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "endsAt"        TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "confirmedAt"   TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "confirmedById" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "cancelledAt"   TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "cancelReason"  TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "notifiedAt"    TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_confirmedById_fkey'
  ) THEN
    ALTER TABLE "Appointment"
      ADD CONSTRAINT "Appointment_confirmedById_fkey"
      FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Appointment_tenantId_scheduledAt_idx" ON "Appointment"("tenantId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "Appointment_tenantId_status_idx"      ON "Appointment"("tenantId", "status");

-- Agendamentos já confirmados com data ganham um fim coerente com a duração
UPDATE "Appointment" a
SET "endsAt" = a."scheduledAt" + make_interval(mins => COALESCE(p."durationMin", 60) + COALESCE(p."bufferMin", 0))
FROM "Procedure" p
WHERE a."procedureId" = p."id"
  AND a."scheduledAt" IS NOT NULL
  AND a."endsAt" IS NULL;

UPDATE "Appointment"
SET "endsAt" = "scheduledAt" + interval '60 minutes'
WHERE "scheduledAt" IS NOT NULL AND "endsAt" IS NULL;

-- ── Expediente semanal ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "BusinessHour" (
  "id"        TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,
  "weekday"   INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime"   TEXT NOT NULL,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Sem DEFAULT: o Prisma gerencia via @updatedAt (a carga inicial abaixo preenche)
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessHour_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BusinessHour_tenantId_weekday_idx" ON "BusinessHour"("tenantId", "weekday");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BusinessHour_tenantId_fkey'
  ) THEN
    ALTER TABLE "BusinessHour"
      ADD CONSTRAINT "BusinessHour_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── Bloqueios de agenda ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ScheduleBlock" (
  "id"        TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,
  "startsAt"  TIMESTAMP(3) NOT NULL,
  "endsAt"    TIMESTAMP(3) NOT NULL,
  "reason"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduleBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ScheduleBlock_tenantId_startsAt_idx" ON "ScheduleBlock"("tenantId", "startsAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScheduleBlock_tenantId_fkey'
  ) THEN
    ALTER TABLE "ScheduleBlock"
      ADD CONSTRAINT "ScheduleBlock_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Expediente padrão para tenants que ainda não têm: seg–sex 9h–18h, sáb 9h–13h
INSERT INTO "BusinessHour" ("id", "tenantId", "weekday", "startTime", "endTime", "isActive", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || t."id" || d."weekday"::text),
  t."id",
  d."weekday",
  d."startTime",
  d."endTime",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Tenant" t
CROSS JOIN (
  VALUES (1, '09:00', '18:00'),
         (2, '09:00', '18:00'),
         (3, '09:00', '18:00'),
         (4, '09:00', '18:00'),
         (5, '09:00', '18:00'),
         (6, '09:00', '13:00')
) AS d("weekday", "startTime", "endTime")
WHERE NOT EXISTS (SELECT 1 FROM "BusinessHour" b WHERE b."tenantId" = t."id");
