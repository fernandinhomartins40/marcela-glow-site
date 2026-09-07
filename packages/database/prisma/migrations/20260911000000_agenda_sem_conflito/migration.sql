-- Desfaz os agendamentos sobrepostos que o seed antigo criou.
--
-- A API sempre recusou duas pacientes no mesmo horario — em todos os seus
-- caminhos. Mas o seed grava direto no Prisma, sem passar por ela, e calculava a
-- hora por `8 + (n % 9)`: offsets diferentes caiam na mesma hora, e a checagem
-- que existia so evitava repetir a *mesma* paciente, nao duas distintas.
--
-- O seed ja foi corrigido, mas isso vale para bancos novos. Aqui o estrago
-- existente e desfeito: de cada grupo de consultas que se cruzam no tempo, a
-- primeira fica e as demais sao canceladas.
--
-- Cancelar e nao apagar de proposito: a consulta aconteceu no sistema, alguem
-- pode te-la visto, e o historico da paciente nao deve perder o registro. Alem
-- disso `CANCELLED` libera o horario na agenda, que e o efeito desejado.
UPDATE "Appointment" a
SET "status" = 'CANCELLED',
    "cancelledAt" = NOW(),
    "cancelReason" = 'Cancelado automaticamente: horário sobreposto a outra consulta.'
WHERE a."status" IN ('PENDING', 'CONFIRMED')
  AND a."scheduledAt" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "Appointment" b
    WHERE b."tenantId" = a."tenantId"
      AND b."status" IN ('PENDING', 'CONFIRMED')
      AND b."scheduledAt" IS NOT NULL
      AND b."id" <> a."id"
      -- A que fica e a mais antiga; empate de horario decide pelo id.
      AND (b."scheduledAt" < a."scheduledAt"
           OR (b."scheduledAt" = a."scheduledAt" AND b."id" < a."id"))
      -- Os intervalos se cruzam, contando a duracao de cada uma.
      AND b."scheduledAt" < COALESCE(a."endsAt", a."scheduledAt" + INTERVAL '1 hour')
      AND a."scheduledAt" < COALESCE(b."endsAt", b."scheduledAt" + INTERVAL '1 hour')
  );
