-- Push nativo dos apps (FCM). As inscricoes existentes sao todas de navegador
-- e ficam como WEBPUSH pelo padrao; nada e reescrito.
CREATE TYPE "PushProvider" AS ENUM ('WEBPUSH', 'FCM');

ALTER TABLE "PushSubscription"
  ADD COLUMN "provider" "PushProvider" NOT NULL DEFAULT 'WEBPUSH',
  ADD COLUMN "platform" TEXT;
