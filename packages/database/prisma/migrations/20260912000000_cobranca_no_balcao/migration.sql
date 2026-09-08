-- Cobranca no balcao: preco do plano e cobranca de pacote.
--
-- A recepcao so via "Receber" quando ja existia cobranca lancada, e a cobranca
-- so nascia quando a medica registrava o procedimento — depois do atendimento.
-- Na pratica a paciente chegava, saia, e nunca havia o que cobrar no balcao.
--
-- Faltavam duas informacoes: quanto custa uma sessao deste plano, e se uma
-- cobranca ja quitou o pacote inteiro.

-- Quanto custa UMA sessao. O total do pacote e este valor vezes `totalSessions`
-- — guardar so o unitario evita os dois numeros discordarem quando a medica
-- muda a quantidade de sessoes no meio do tratamento.
ALTER TABLE "TreatmentPlan" ADD COLUMN "sessionPriceCents" INTEGER;

-- A qual plano a cobranca pertence, e se ela cobre o pacote inteiro.
ALTER TABLE "Charge" ADD COLUMN "planId" TEXT;
ALTER TABLE "Charge" ADD COLUMN "coversPlan" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Charge" ADD CONSTRAINT "Charge_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "TreatmentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A pergunta do balcao e sempre "o que esta paciente deve deste plano".
CREATE INDEX "Charge_planId_status_idx" ON "Charge"("planId", "status");

-- Planos que ja existem herdam o preco de tabela do procedimento. Sem isto a
-- recepcao teria que digitar o valor de cada tratamento em andamento.
UPDATE "TreatmentPlan" tp
SET "sessionPriceCents" = p."priceCents"
FROM "Procedure" p
WHERE tp."procedureId" = p."id"
  AND tp."sessionPriceCents" IS NULL
  AND p."priceCents" IS NOT NULL;
