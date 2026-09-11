-- L'arbre de bonus d'equipe passe de 17 a 32 rangs, tous ouverts des le
-- premier niveau, et le plafond de niveau descend de 50 a 33.
--
-- Le defaut repare : la capacite de l'arbre (17) etait atteinte au niveau 18,
-- donc les trente niveaux suivants ne donnaient plus rien, et les deblocages
-- tardifs (raid 4, xp 8, forge 16) decidaient de l'ordre a la place du chef —
-- les trois premiers points n'avaient aucun arbitrage. Desormais le plafond
-- vaut exactement la capacite plus un : chaque niveau donne un point
-- depensable, et les quatre bonus sont ouverts des le depart.
--
-- L'effet MAXIMUM de chaque bonus est inchange : deux fois plus de rangs, un
-- effet par rang divise par deux. Seule la granularite change. (`loot` est un
-- POURCENTAGE de vitesse de regeneration, pas des minutes : il divise
-- l'intervalle, voir `effectiveRegenInterval`.)
--
-- `teamLevel.xpBase` redescend de 1050 a 210 parce que le dernier niveau
-- utile a double : a 1050, atteindre le niveau 33 aurait coute cinq fois le
-- trajet qu'on venait de caler. A 210 le parcours complet retrouve son cout,
-- ~690 000 XP, etale sur deux fois plus de paliers.
--
-- Migration de DONNEES : le bootstrap de `GlobalConfig` est create-only, il
-- ne reecrit jamais une cle existante. Chaque garde sur l'ancienne valeur
-- rend l'operation idempotente et laisse survivre un ajustement manuel.

UPDATE "GlobalConfig" SET value = '210'  WHERE key = 'teamLevel.xpBase'          AND value = '1050';
UPDATE "GlobalConfig" SET value = '33'   WHERE key = 'teamLevel.maxLevel'        AND value = '50';

UPDATE "GlobalConfig" SET value = '10'   WHERE key = 'teamPerk.loot.maxRank'     AND value = '5';
UPDATE "GlobalConfig" SET value = '0.25' WHERE key = 'teamPerk.loot.perRank'     AND value = '0.5';

UPDATE "GlobalConfig" SET value = '10'   WHERE key = 'teamPerk.xp.maxRank'       AND value = '5';
UPDATE "GlobalConfig" SET value = '0.4'  WHERE key = 'teamPerk.xp.perRank'       AND value = '0.8';

UPDATE "GlobalConfig" SET value = '10'   WHERE key = 'teamPerk.forge.maxRank'    AND value = '5';
UPDATE "GlobalConfig" SET value = '0.5'  WHERE key = 'teamPerk.forge.perRank'    AND value = '1';

-- Tous ouverts des le niveau 1. `raid` garde ses 2 rangs : son effet est un
-- nombre d'attaques, un entier, qui ne se decoupe pas plus finement.
UPDATE "GlobalConfig" SET value = '1' WHERE key = 'teamPerk.raid.unlockLevel'  AND value = '4';
UPDATE "GlobalConfig" SET value = '1' WHERE key = 'teamPerk.xp.unlockLevel'    AND value = '8';
UPDATE "GlobalConfig" SET value = '1' WHERE key = 'teamPerk.forge.unlockLevel' AND value = '16';

-- Un rang investi au-dela du nouveau plafond retombe dessus. `perkEffect`
-- borne deja l'effet a la lecture, mais laisser la ligne au-dessus ferait
-- afficher « 12/10 » sur le panneau.
UPDATE "TeamPerk" SET rank = 10 WHERE key IN ('loot', 'xp', 'forge') AND rank > 10;
UPDATE "TeamPerk" SET rank = 2  WHERE key = 'raid' AND rank > 2;

-- Meme raison cote niveau : un niveau au-dessus du plafond n'existe plus.
UPDATE "Team" SET level = 33, xp = 0 WHERE level > 33;
