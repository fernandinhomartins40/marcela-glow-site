-- Liga prontuário, documentos e procedimentos ao atendimento que os originou.
-- O vínculo é opcional: retorno por telefone e encaixe também geram registro
-- clínico sem passar pela agenda.

ALTER TABLE "MedicalRecord"    ADD COLUMN IF NOT EXISTS "appointmentId" TEXT;
ALTER TABLE "Prescription"     ADD COLUMN IF NOT EXISTS "appointmentId" TEXT;
ALTER TABLE "ProcedureSession" ADD COLUMN IF NOT EXISTS "appointmentId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MedicalRecord_appointmentId_fkey') THEN
    ALTER TABLE "MedicalRecord"
      ADD CONSTRAINT "MedicalRecord_appointmentId_fkey"
      FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Prescription_appointmentId_fkey') THEN
    ALTER TABLE "Prescription"
      ADD CONSTRAINT "Prescription_appointmentId_fkey"
      FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProcedureSession_appointmentId_fkey') THEN
    ALTER TABLE "ProcedureSession"
      ADD CONSTRAINT "ProcedureSession_appointmentId_fkey"
      FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "MedicalRecord_appointmentId_idx"    ON "MedicalRecord"("appointmentId");
CREATE INDEX IF NOT EXISTS "MedicalRecord_patientId_occurredAt_idx" ON "MedicalRecord"("patientId", "occurredAt");
CREATE INDEX IF NOT EXISTS "ProcedureSession_appointmentId_idx" ON "ProcedureSession"("appointmentId");
