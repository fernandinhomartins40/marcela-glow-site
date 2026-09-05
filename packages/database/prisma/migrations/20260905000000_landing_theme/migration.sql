-- Paleta de cores da landing, editavel pelo painel.
--
-- Entra no enum que ja existe porque tem o mesmo ciclo de vida das secoes de
-- texto: uma linha por tenant em LandingContent, editada pela mesma rota e
-- restaurada ao padrao pelo mesmo DELETE. Sem valor gravado o site usa os
-- tokens do proprio CSS, entao nao ha nada para popular aqui.
ALTER TYPE "LandingSection" ADD VALUE IF NOT EXISTS 'THEME';
