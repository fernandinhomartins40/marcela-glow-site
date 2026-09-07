-- Comunicacao entre o consultorio e a recepcao, e o percurso da paciente.
--
-- A agenda sabia que a consulta existia e, desde a migracao anterior, que a
-- paciente havia chegado. Nao sabia o resto do percurso: quando entrou no
-- consultorio e quando saiu. Sem a saida a recepcao nao tem como saber que o
-- atendimento acabou — e e nesse momento que a cobranca acontece.
ALTER TABLE "Appointment" ADD COLUMN "calledAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN "releasedAt" TIMESTAMP(3);

-- Os recados que hoje sao dados por voz, campainha ou bilhete.
--
-- A medica nao sai do atendimento para avisar que a proxima pode entrar, e a
-- secretaria nao abre a porta do consultorio para perguntar se da para encaixar
-- alguem. Vira registro, com hora e autor.
CREATE TYPE "ClinicAlertKind" AS ENUM (
  'CALL_PATIENT',
  'CALL_STAFF',
  'PATIENT_RELEASED',
  'NEED_DOCTOR',
  'NOTE'
);

CREATE TABLE "ClinicAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "ClinicAlertKind" NOT NULL,
    -- Opcional: "venha ao consultorio" nao e sobre paciente nenhuma.
    "appointmentId" TEXT,
    "body" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Nulo e aviso ainda piscando na tela de quem precisa ver.
    "seenAt" TIMESTAMP(3),
    "seenById" TEXT,
    CONSTRAINT "ClinicAlert_pkey" PRIMARY KEY ("id")
);

-- A consulta pergunta sempre "o que ainda nao foi visto hoje".
CREATE INDEX "ClinicAlert_tenantId_seenAt_createdAt_idx" ON "ClinicAlert"("tenantId", "seenAt", "createdAt");

ALTER TABLE "ClinicAlert" ADD CONSTRAINT "ClinicAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicAlert" ADD CONSTRAINT "ClinicAlert_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicAlert" ADD CONSTRAINT "ClinicAlert_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicAlert" ADD CONSTRAINT "ClinicAlert_seenById_fkey" FOREIGN KEY ("seenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
