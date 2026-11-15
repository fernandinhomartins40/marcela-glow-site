-- Política de privacidade editável pelo painel (página /privacidade do site).
-- ADD VALUE não mexe no conteúdo já gravado das outras seções.
ALTER TYPE "LandingSection" ADD VALUE IF NOT EXISTS 'PRIVACY';
