-- Ralentissement de l'XP joueur : un joueur actif atteignait le niveau 30 en
-- un jour.
--
-- Cause mesuree : `levelup.refillEnergy` remet l'energie au max a CHAQUE
-- montee de niveau, ce qui fait passer la journee de 31 a 213 combats (boucle
-- XP -> niveau -> energie -> combats -> XP). Le refill est CONSERVE par choix
-- de design ; la courbe le compense donc frontalement (x5), et l'XP de premier
-- passage -- qui offrait a elle seule ~72 800 XP one-shot, soit 3,5 fois le
-- cout du niveau 30 -- est divisee par 3.
--
-- Migration de DONNEES : aucun changement de schema. Elle est necessaire parce
-- que le bootstrap de `GlobalConfig` est create-only et que le deploiement ne
-- relance jamais le seed, donc ni les reglages ni les tables de butin deja en
-- base ne bougeraient d'eux-memes.
--
-- `User.xp` est multiplie par 5 EN MEME TEMPS que la courbe : `xpForLevel` est
-- lineaire en base et en pente, donc le niveau de chaque joueur est preserve
-- au point pres. Sans ce rescale les niveaux redescendraient, et comme
-- `skillPointsGained` compare au niveau STOCKE, les joueurs regagneraient en
-- remontant les points de competence deja depenses.
--
-- Tout est conditionne a l'ancienne valeur de `xp.base` : seule operation non
-- idempotente du lot, le rescale ne doit jamais s'appliquer deux fois. Sur une
-- base vierge (GlobalConfig vide) le bloc ne fait rien, et le bootstrap
-- inserera directement 500/220.
DO $$
DECLARE
  ancienne_base text;
BEGIN
  SELECT value INTO ancienne_base FROM "GlobalConfig" WHERE key = 'xp.base';

  IF ancienne_base = '100' THEN
    UPDATE "GlobalConfig" SET value = '500' WHERE key = 'xp.base';
    UPDATE "GlobalConfig" SET value = '220' WHERE key = 'xp.slope';

    UPDATE "User" SET xp = xp * 5;

    -- Butin de premier passage. Les deux ratios different : les etages
    -- normaux suivent FIRST_CLEAR_XP_BASE (22 -> 7), les boss leur propre
    -- base geometrique (200 -> 65). Le farm n'est pas touche.
    UPDATE "CampaignStage"
    SET "lootTable" = jsonb_set(
      "lootTable",
      '{firstClear,xp}',
      to_jsonb(ROUND(("lootTable" -> 'firstClear' ->> 'xp')::numeric * 7 / 22))
    )
    WHERE "isBoss" = false
      AND "lootTable" -> 'firstClear' ->> 'xp' IS NOT NULL;

    UPDATE "CampaignStage"
    SET "lootTable" = jsonb_set(
      "lootTable",
      '{firstClear,xp}',
      to_jsonb(ROUND(("lootTable" -> 'firstClear' ->> 'xp')::numeric * 65 / 200))
    )
    WHERE "isBoss" = true
      AND "lootTable" -> 'firstClear' ->> 'xp' IS NOT NULL;

    UPDATE "TowerFloor"
    SET "lootTable" = jsonb_set(
      "lootTable",
      '{firstClear,xp}',
      to_jsonb(ROUND(("lootTable" -> 'firstClear' ->> 'xp')::numeric * 20 / 60))
    )
    WHERE "lootTable" -> 'firstClear' ->> 'xp' IS NOT NULL;
  END IF;
END $$;

-- Note : appliquer le ratio a une valeur DEJA arrondie peut s'ecarter d'au
-- plus 1 XP de ce que produirait le seed. `seedCampaign` et `seedTowerFloors`
-- font un upsert qui met `lootTable` a jour, donc un `npm run db:seed`
-- realigne exactement les deux mondes.
