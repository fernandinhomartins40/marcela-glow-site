-- Ativacao do acesso ao portal so depois de o link do e-mail ser aberto.
CREATE TABLE "PatientActivationToken" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientActivationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientActivationToken_tokenHash_key" ON "PatientActivationToken"("tokenHash");
CREATE INDEX "PatientActivationToken_tenantId_email_idx" ON "PatientActivationToken"("tenantId", "email");

ALTER TABLE "PatientActivationToken" ADD CONSTRAINT "PatientActivationToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
