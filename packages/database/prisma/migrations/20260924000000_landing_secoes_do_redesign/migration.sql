-- Seções da landing que o redesign de 23/09/2026 trouxe e que não tinham
-- configuração no painel. ADD VALUE não remove nem reordena nada: o conteúdo
-- já gravado nas outras seções continua como está.
ALTER TYPE "LandingSection" ADD VALUE IF NOT EXISTS 'TRUST';
ALTER TYPE "LandingSection" ADD VALUE IF NOT EXISTS 'CARE';
ALTER TYPE "LandingSection" ADD VALUE IF NOT EXISTS 'VALUES';
