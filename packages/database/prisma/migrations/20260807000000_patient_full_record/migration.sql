-- Ficha completa da paciente.
--
-- O cadastro tinha apenas nome, e-mail, telefone, nascimento e um campo de
-- observações em texto livre. Alergias, medicações em uso e comorbidades
-- ficavam soltas nesse texto ou repetidas a cada atendimento no `history` do
-- prontuário — ou seja, não eram dado da paciente e não davam para consultar na
-- hora de prescrever. Aqui viram colunas próprias, junto de identificação,
-- endereço, contato de emergência e convênio.

-- ── Enums ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Gender') THEN
    CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'NON_BINARY', 'UNDISCLOSED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MaritalStatus') THEN
    CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'STABLE_UNION');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BloodType') THEN
    CREATE TYPE "BloodType" AS ENUM (
      'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
      'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'
    );
  END IF;
END $$;

-- ── Identificação ──
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "cpf"           TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "rg"            TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "socialName"    TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "gender"        "Gender";
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "maritalStatus" "MaritalStatus";
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "occupation"    TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "nationality"   TEXT;

-- ── Endereço ──
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "zipCode"      TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "street"       TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "streetNumber" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "complement"   TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "district"     TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "city"         TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "state"        TEXT;

-- ── Contato de emergência ──
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "emergencyName"     TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "emergencyPhone"    TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "emergencyRelation" TEXT;

-- ── Dados clínicos de base ──
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "allergies"       TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "medications"     TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "conditions"      TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "surgeries"       TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "bloodType"       "BloodType";
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "isPregnant"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "isBreastfeeding" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "skinType"        TEXT;

-- ── Administrativo ──
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "insuranceName"   TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "insuranceNumber" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "referralSource"  TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "referredBy"      TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "lgpdConsentAt"   TIMESTAMP(3);
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "imageConsentAt"  TIMESTAMP(3);

-- CPF identifica a paciente dentro da clínica. Índice único parcial: várias
-- pacientes sem CPF convivem (NULL não colide), mas o mesmo CPF não se repete.
CREATE UNIQUE INDEX IF NOT EXISTS "Patient_cpf_tenantId_key"
  ON "Patient"("cpf", "tenantId");

-- A busca da recepção é por nome
CREATE INDEX IF NOT EXISTS "Patient_tenantId_name_idx"
  ON "Patient"("tenantId", "name");
