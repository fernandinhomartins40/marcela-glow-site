-- Plano de tratamento: a jornada da paciente por procedimento.
--
-- Ate aqui `ProcedureSession` era uma lista solta de procedimentos realizados.
-- Ela respondia "o que ja foi feito" e nada mais: nem a medica sabia quantas
-- sessoes ainda faltavam, nem a paciente via a propria evolucao. Procedimento
-- estetico raramente e evento unico — bioestimulador pede tres aplicacoes,
-- microagulhamento cinco, e o numero muda de pessoa para pessoa.

CREATE TYPE "TreatmentPlanStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- O procedimento passa a declarar a forma: quantas sessoes costuma levar, com
-- que intervalo, e que campos precisa registrar por paciente.
ALTER TABLE "Procedure" ADD COLUMN "defaultSessions" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Procedure" ADD COLUMN "intervalDays" INTEGER;
ALTER TABLE "Procedure" ADD COLUMN "fieldSchema" JSONB;
ALTER TABLE "Procedure" ADD COLUMN "careBefore" TEXT;
ALTER TABLE "Procedure" ADD COLUMN "careAfter" TEXT;

CREATE TABLE "TreatmentPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "procedureId" TEXT,
    -- Copia do nome do procedimento: o cadastro pode ser renomeado depois, e o
    -- historico da paciente nao deve mudar por causa disso.
    "title" TEXT NOT NULL,
    "status" "TreatmentPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalSessions" INTEGER NOT NULL DEFAULT 1,
    "intervalDays" INTEGER,
    -- Os valores dos campos que o procedimento declarou.
    "details" JSONB,
    "careBefore" TEXT,
    "careAfter" TEXT,
    -- Nunca aparece no portal da paciente.
    "internalNotes" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TreatmentPlan_pkey" PRIMARY KEY ("id")
);

-- A sessao passa a saber a que plano pertence e que numero da serie ela e.
ALTER TABLE "ProcedureSession" ADD COLUMN "planId" TEXT;
ALTER TABLE "ProcedureSession" ADD COLUMN "sessionNumber" INTEGER;

CREATE INDEX "TreatmentPlan_tenantId_status_idx" ON "TreatmentPlan"("tenantId", "status");
CREATE INDEX "TreatmentPlan_patientId_idx" ON "TreatmentPlan"("patientId");

ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProcedureSession" ADD CONSTRAINT "ProcedureSession_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- As sessoes que ja existem viram planos, agrupadas por paciente e
-- procedimento. Sem isto a jornada nasceria vazia para quem ja e paciente, e o
-- historico ficaria invisivel no portal.
--
-- `totalSessions` recebe a quantidade ja realizada e o status vira COMPLETED:
-- dizer que faltam sessoes seria inventar um plano que ninguem definiu.
INSERT INTO "TreatmentPlan" ("id", "tenantId", "patientId", "procedureId", "title", "status", "totalSessions", "startedAt", "completedAt", "createdAt", "updatedAt")
SELECT
  'plan_' || MIN(s."id"),
  s."tenantId",
  s."patientId",
  s."procedureId",
  COALESCE(MAX(p."title"), 'Procedimento'),
  'COMPLETED',
  COUNT(*),
  MIN(s."performedAt"),
  MAX(s."performedAt"),
  MIN(s."createdAt"),
  CURRENT_TIMESTAMP
FROM "ProcedureSession" s
LEFT JOIN "Procedure" p ON p."id" = s."procedureId"
GROUP BY s."tenantId", s."patientId", s."procedureId";

-- Liga cada sessao ao seu plano e numera na ordem em que aconteceram.
UPDATE "ProcedureSession" s
SET "planId" = t."id",
    "sessionNumber" = t."n"
FROM (
  SELECT
    s2."id" AS "sessionId",
    tp."id",
    ROW_NUMBER() OVER (PARTITION BY tp."id" ORDER BY s2."performedAt") AS "n"
  FROM "ProcedureSession" s2
  JOIN "TreatmentPlan" tp
    ON tp."tenantId" = s2."tenantId"
   AND tp."patientId" = s2."patientId"
   AND tp."procedureId" IS NOT DISTINCT FROM s2."procedureId"
) t
WHERE s."id" = t."sessionId";
