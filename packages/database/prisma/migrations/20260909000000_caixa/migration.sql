-- Caixa da recepcao: quem opera, quem supervisiona, e o fechamento do dia.
--
-- Ate aqui o financeiro era protegido por `PATIENT_WRITE` — a mesma permissao
-- de editar cadastro. Quem podia corrigir um telefone podia lancar pagamento, e
-- quem cuidava do dinheiro precisava de acesso ao prontuario para isso. Em
-- consultorio o dinheiro entra pela recepcao e a medica acompanha; as duas
-- permissoes novas separam operar de supervisionar.

ALTER TYPE "Permission" ADD VALUE 'FINANCE_OPERATE';
ALTER TYPE "Permission" ADD VALUE 'FINANCE_MANAGE';

CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'APPROVED');

-- O sistema ja sabia quanto foi recebido. Faltava a outra metade da
-- conferencia: quanto a secretaria conta na gaveta ao fim do dia. A diferenca
-- entre as duas e o que revela furo, troco errado ou lancamento esquecido.
CREATE TABLE "CashSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    -- O dia do caixa, a meia-noite no fuso da clinica.
    "date" TIMESTAMP(3) NOT NULL,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    -- Troco deixado na gaveta na abertura.
    "openingCents" INTEGER NOT NULL DEFAULT 0,
    -- Contado pela secretaria; esperado pelo sistema; a diferenca entre os dois.
    -- Congelados no fechamento: lancamento retroativo nao reescreve conferencia
    -- que ja foi feita.
    "countedCashCents" INTEGER,
    "expectedCashCents" INTEGER,
    "differenceCents" INTEGER,
    "totalReceivedCents" INTEGER,
    "notes" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

-- Um caixa por dia: o fechamento e do expediente, nao do turno.
CREATE UNIQUE INDEX "CashSession_tenantId_date_key" ON "CashSession"("tenantId", "date");
CREATE INDEX "CashSession_tenantId_status_idx" ON "CashSession"("tenantId", "status");

ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
