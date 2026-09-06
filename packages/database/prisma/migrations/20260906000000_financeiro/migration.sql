-- Controle financeiro: cobranca, pagamento e recibo.
--
-- Ate aqui o unico registro de dinheiro era `ProcedureSession.priceCents`, um
-- campo opcional preenchido no atendimento. Ele respondia "quanto foi cobrado"
-- e nada mais: nao dizia se a paciente pagou, como pagou, nem deixava emitir
-- recibo. E, por ser opcional, um procedimento salvo sem valor sumia do
-- faturamento sem aviso.

CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'HEALTH_PLAN', 'OTHER');
CREATE TYPE "ChargeStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'CANCELLED');

-- Preco de tabela do procedimento: vira a sugestao ao lancar, para a medica
-- nao redigitar o mesmo valor a cada atendimento.
ALTER TABLE "Procedure" ADD COLUMN "priceCents" INTEGER;

CREATE TABLE "Charge" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "sessionId" TEXT,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "status" "ChargeStatus" NOT NULL DEFAULT 'PENDING',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Charge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientCpf" TEXT,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Charge_sessionId_key" ON "Charge"("sessionId");
CREATE INDEX "Charge_tenantId_issuedAt_idx" ON "Charge"("tenantId", "issuedAt");
CREATE INDEX "Charge_tenantId_status_idx" ON "Charge"("tenantId", "status");
CREATE INDEX "Payment_tenantId_paidAt_idx" ON "Payment"("tenantId", "paidAt");
CREATE INDEX "Receipt_tenantId_issuedAt_idx" ON "Receipt"("tenantId", "issuedAt");
-- A numeracao do recibo e sequencial por ano e nao pode repetir: e o que a
-- Receita espera de um talao.
CREATE UNIQUE INDEX "Receipt_tenantId_year_number_key" ON "Receipt"("tenantId", "year", "number");

ALTER TABLE "Charge" ADD CONSTRAINT "Charge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ProcedureSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "Charge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "Charge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Traz para o novo modelo o que ja existe em ProcedureSession: cada sessao com
-- valor lancado vira uma cobranca. Sem isto o financeiro nasceria vazio e o
-- historico da clinica ficaria so no dashboard.
--
-- Elas entram como PENDING porque nao ha registro de pagamento no modelo
-- antigo: dizer que foi pago seria inventar um dado que ninguem confirmou.
INSERT INTO "Charge" ("id", "tenantId", "patientId", "sessionId", "description", "amountCents", "status", "issuedAt", "createdAt", "updatedAt")
SELECT
  'chg_' || s."id",
  s."tenantId",
  s."patientId",
  s."id",
  COALESCE(p."title", 'Procedimento'),
  s."priceCents",
  'PENDING',
  s."performedAt",
  s."createdAt",
  s."updatedAt"
FROM "ProcedureSession" s
LEFT JOIN "Procedure" p ON p."id" = s."procedureId"
WHERE s."priceCents" IS NOT NULL AND s."priceCents" > 0;
