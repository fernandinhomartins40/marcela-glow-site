-- Chegada da paciente na clinica.
--
-- O agendamento sabia se estava marcado, confirmado ou cancelado, mas nao se a
-- pessoa ja estava ali. A recepcao nao tinha onde registrar "chegou", e a
-- medica nao tinha como saber quem estava na sala de espera sem perguntar.
--
-- E uma data, nao um status novo: chegar nao substitui estar confirmado, se
-- soma a ele. Um status WAITING obrigaria a escolher entre as duas informacoes.
ALTER TABLE "Appointment" ADD COLUMN "arrivedAt" TIMESTAMP(3);

-- A fila da recepcao pergunta "quem chegou hoje e ainda nao foi atendido".
CREATE INDEX "Appointment_tenantId_arrivedAt_idx" ON "Appointment"("tenantId", "arrivedAt");
