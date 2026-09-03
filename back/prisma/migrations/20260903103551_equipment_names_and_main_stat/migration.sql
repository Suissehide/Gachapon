-- Noms propres et nouveau barème de stat principale pour le catalogue déjà
-- en base.
--
-- Écrite à la main (comme les deux migrations de renommage de slots) : Prisma
-- ne modélise que le schéma, pas les données, et le seed complet est
-- destructeur. Ces UPDATE ciblent la seule table Equipment et ne touchent ni
-- aux joueurs, ni à leurs pièces (UserEquipment garde son niveau et ses
-- sous-stats).
--
-- 1) Le nom devient un nom d'objet : « Arme de Percée (rare) » nommait la
--    ligne du tableau et répétait une rareté déjà affichée en pastille.
-- 2) La stat principale passe à ~2x la somme des quatre sous-stats maximales.
--    Elle leur était inférieure (40 contre 60 en attaque, 18 contre 36 en
--    vitesse), ce qui rendait l'identité de la pièce illisible.


-- 1) Noms — 28 combinaisons (set × emplacement), toutes raretés confondues.
UPDATE "Equipment" SET name = 'Hache du Courroux' WHERE "setKey" = 'FUREUR' AND slot = 'WEAPON';
UPDATE "Equipment" SET name = 'Cuirasse Ardente' WHERE "setKey" = 'FUREUR' AND slot = 'ARMOR';
UPDATE "Equipment" SET name = 'Anneau du Brasier' WHERE "setKey" = 'FUREUR' AND slot = 'RING';
UPDATE "Equipment" SET name = 'Amulette de Rage' WHERE "setKey" = 'FUREUR' AND slot = 'AMULET';
UPDATE "Equipment" SET name = 'Poings Incandescents' WHERE "setKey" = 'FUREUR' AND slot = 'GLOVES';
UPDATE "Equipment" SET name = 'Grèves du Fracas' WHERE "setKey" = 'FUREUR' AND slot = 'BOOTS';
UPDATE "Equipment" SET name = 'Ceinturon du Berserk' WHERE "setKey" = 'FUREUR' AND slot = 'BELT';
UPDATE "Equipment" SET name = 'Lame du Guetteur' WHERE "setKey" = 'PRECISION' AND slot = 'WEAPON';
UPDATE "Equipment" SET name = 'Plastron du Tireur' WHERE "setKey" = 'PRECISION' AND slot = 'ARMOR';
UPDATE "Equipment" SET name = 'Anneau de l''Œil Juste' WHERE "setKey" = 'PRECISION' AND slot = 'RING';
UPDATE "Equipment" SET name = 'Amulette du Viseur' WHERE "setKey" = 'PRECISION' AND slot = 'AMULET';
UPDATE "Equipment" SET name = 'Gants du Duelliste' WHERE "setKey" = 'PRECISION' AND slot = 'GLOVES';
UPDATE "Equipment" SET name = 'Bottes du Traqueur' WHERE "setKey" = 'PRECISION' AND slot = 'BOOTS';
UPDATE "Equipment" SET name = 'Ceinture d''Aplomb' WHERE "setKey" = 'PRECISION' AND slot = 'BELT';
UPDATE "Equipment" SET name = 'Estoc Brise-Écaille' WHERE "setKey" = 'PERCEE' AND slot = 'WEAPON';
UPDATE "Equipment" SET name = 'Harnois Perforant' WHERE "setKey" = 'PERCEE' AND slot = 'ARMOR';
UPDATE "Equipment" SET name = 'Anneau de la Faille' WHERE "setKey" = 'PERCEE' AND slot = 'RING';
UPDATE "Equipment" SET name = 'Amulette de la Vrille' WHERE "setKey" = 'PERCEE' AND slot = 'AMULET';
UPDATE "Equipment" SET name = 'Gants du Perce-Armure' WHERE "setKey" = 'PERCEE' AND slot = 'GLOVES';
UPDATE "Equipment" SET name = 'Bottes de la Charge' WHERE "setKey" = 'PERCEE' AND slot = 'BOOTS';
UPDATE "Equipment" SET name = 'Ceinture du Bélier' WHERE "setKey" = 'PERCEE' AND slot = 'BELT';
UPDATE "Equipment" SET name = 'Croc Assoiffé' WHERE "setKey" = 'SANGSUE' AND slot = 'WEAPON';
UPDATE "Equipment" SET name = 'Carapace Vorace' WHERE "setKey" = 'SANGSUE' AND slot = 'ARMOR';
UPDATE "Equipment" SET name = 'Anneau de Sangsue' WHERE "setKey" = 'SANGSUE' AND slot = 'RING';
UPDATE "Equipment" SET name = 'Amulette du Calice' WHERE "setKey" = 'SANGSUE' AND slot = 'AMULET';
UPDATE "Equipment" SET name = 'Serres Avides' WHERE "setKey" = 'SANGSUE' AND slot = 'GLOVES';
UPDATE "Equipment" SET name = 'Bottes du Suaire' WHERE "setKey" = 'SANGSUE' AND slot = 'BOOTS';
UPDATE "Equipment" SET name = 'Ceinture du Festin' WHERE "setKey" = 'SANGSUE' AND slot = 'BELT';

-- 2) Stat principale — 35 combinaisons (emplacement × rareté).
UPDATE "Equipment" SET bonuses = '{"atkFlat": 18}'::jsonb WHERE slot = 'WEAPON' AND rarity = 'COMMON';
UPDATE "Equipment" SET bonuses = '{"atkFlat": 28}'::jsonb WHERE slot = 'WEAPON' AND rarity = 'UNCOMMON';
UPDATE "Equipment" SET bonuses = '{"atkFlat": 45}'::jsonb WHERE slot = 'WEAPON' AND rarity = 'RARE';
UPDATE "Equipment" SET bonuses = '{"atkFlat": 72}'::jsonb WHERE slot = 'WEAPON' AND rarity = 'EPIC';
UPDATE "Equipment" SET bonuses = '{"atkFlat": 115}'::jsonb WHERE slot = 'WEAPON' AND rarity = 'LEGENDARY';
UPDATE "Equipment" SET bonuses = '{"defFlat": 18}'::jsonb WHERE slot = 'ARMOR' AND rarity = 'COMMON';
UPDATE "Equipment" SET bonuses = '{"defFlat": 28}'::jsonb WHERE slot = 'ARMOR' AND rarity = 'UNCOMMON';
UPDATE "Equipment" SET bonuses = '{"defFlat": 45}'::jsonb WHERE slot = 'ARMOR' AND rarity = 'RARE';
UPDATE "Equipment" SET bonuses = '{"defFlat": 72}'::jsonb WHERE slot = 'ARMOR' AND rarity = 'EPIC';
UPDATE "Equipment" SET bonuses = '{"defFlat": 115}'::jsonb WHERE slot = 'ARMOR' AND rarity = 'LEGENDARY';
UPDATE "Equipment" SET bonuses = '{"spdFlat": 10}'::jsonb WHERE slot = 'RING' AND rarity = 'COMMON';
UPDATE "Equipment" SET bonuses = '{"spdFlat": 16}'::jsonb WHERE slot = 'RING' AND rarity = 'UNCOMMON';
UPDATE "Equipment" SET bonuses = '{"spdFlat": 26}'::jsonb WHERE slot = 'RING' AND rarity = 'RARE';
UPDATE "Equipment" SET bonuses = '{"spdFlat": 40}'::jsonb WHERE slot = 'RING' AND rarity = 'EPIC';
UPDATE "Equipment" SET bonuses = '{"spdFlat": 62}'::jsonb WHERE slot = 'RING' AND rarity = 'LEGENDARY';
UPDATE "Equipment" SET bonuses = '{"hpFlat": 80}'::jsonb WHERE slot = 'AMULET' AND rarity = 'COMMON';
UPDATE "Equipment" SET bonuses = '{"hpFlat": 130}'::jsonb WHERE slot = 'AMULET' AND rarity = 'UNCOMMON';
UPDATE "Equipment" SET bonuses = '{"hpFlat": 210}'::jsonb WHERE slot = 'AMULET' AND rarity = 'RARE';
UPDATE "Equipment" SET bonuses = '{"hpFlat": 340}'::jsonb WHERE slot = 'AMULET' AND rarity = 'EPIC';
UPDATE "Equipment" SET bonuses = '{"hpFlat": 540}'::jsonb WHERE slot = 'AMULET' AND rarity = 'LEGENDARY';
UPDATE "Equipment" SET bonuses = '{"critDmgPct": 12}'::jsonb WHERE slot = 'GLOVES' AND rarity = 'COMMON';
UPDATE "Equipment" SET bonuses = '{"critDmgPct": 19}'::jsonb WHERE slot = 'GLOVES' AND rarity = 'UNCOMMON';
UPDATE "Equipment" SET bonuses = '{"critDmgPct": 30}'::jsonb WHERE slot = 'GLOVES' AND rarity = 'RARE';
UPDATE "Equipment" SET bonuses = '{"critDmgPct": 46}'::jsonb WHERE slot = 'GLOVES' AND rarity = 'EPIC';
UPDATE "Equipment" SET bonuses = '{"critDmgPct": 70}'::jsonb WHERE slot = 'GLOVES' AND rarity = 'LEGENDARY';
UPDATE "Equipment" SET bonuses = '{"critRatePct": 6}'::jsonb WHERE slot = 'BOOTS' AND rarity = 'COMMON';
UPDATE "Equipment" SET bonuses = '{"critRatePct": 9}'::jsonb WHERE slot = 'BOOTS' AND rarity = 'UNCOMMON';
UPDATE "Equipment" SET bonuses = '{"critRatePct": 14}'::jsonb WHERE slot = 'BOOTS' AND rarity = 'RARE';
UPDATE "Equipment" SET bonuses = '{"critRatePct": 21}'::jsonb WHERE slot = 'BOOTS' AND rarity = 'EPIC';
UPDATE "Equipment" SET bonuses = '{"critRatePct": 32}'::jsonb WHERE slot = 'BOOTS' AND rarity = 'LEGENDARY';
UPDATE "Equipment" SET bonuses = '{"armorPenPct": 7}'::jsonb WHERE slot = 'BELT' AND rarity = 'COMMON';
UPDATE "Equipment" SET bonuses = '{"armorPenPct": 11}'::jsonb WHERE slot = 'BELT' AND rarity = 'UNCOMMON';
UPDATE "Equipment" SET bonuses = '{"armorPenPct": 17}'::jsonb WHERE slot = 'BELT' AND rarity = 'RARE';
UPDATE "Equipment" SET bonuses = '{"armorPenPct": 26}'::jsonb WHERE slot = 'BELT' AND rarity = 'EPIC';
UPDATE "Equipment" SET bonuses = '{"armorPenPct": 40}'::jsonb WHERE slot = 'BELT' AND rarity = 'LEGENDARY';
