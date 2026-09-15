-- Refonte de l'arbre de competences : 126 -> 109 points, soit EXACTEMENT ce
-- qu'un joueur niveau 100 possede. L'arbre en coutait 126 : les 17 points
-- manquants ne creaient aucun arbitrage reel, ils forcaient toujours le
-- sacrifice des memes noeuds, les plus chers et les moins rentables.
--
-- 1. Fortune : « Tirage gratuit » devient « Voeu exauce ». Le meme effectType
--    FREE_PULL_CHANCE vivait dans DEUX branches et `getSkillEffects` en
--    ADDITIONNAIT les effets : 10 + 14 = 24 % de tirages gratuits.
-- 2. Collection : branche delaissee, elle s'ouvrait sur des remises (effet
--    invisible au premier point). Ses racines deviennent ses noeuds les plus
--    desirables, et ses valeurs montent.
-- 3. Opulence plafonne a +2 au lieu de +3 : elle doublait le cap d'achat de
--    packs d'energie, seul garde-fou de la boucle poussiere -> energie.
-- 4. Six courbes perdent des paliers INTERMEDIAIRES, maxima inchanges.
--
-- RESET GLOBAL : des noeuds changent d'effet et de maxLevel sous les joueurs.
-- Les points investis sont rembourses et l'arbre remis a zero, a charge de
-- chacun de reinvestir. Ecreter en silence ferait perdre des points sans
-- explication.
--
-- Les INSERT passent par un CROSS JOIN sur le noeud cible plutot que par un
-- sous-select scalaire : sur une base VIERGE (shadow database de Prisma, ou
-- premier deploiement) l'arbre n'existe pas encore, le scalaire vaudrait NULL
-- et l'INSERT violerait la contrainte NOT NULL. Le CROSS JOIN n'insere alors
-- simplement rien, et le seed fera le travail.
--
-- Migration de DONNEES : le seed recree l'arbre mais part d'un deleteMany qui
-- emporte cartes, combats et progression. Idempotente (les UPDATE convergent,
-- et UserSkill vide ne rembourse plus rien).

-- 1. Remboursement, puis remise a zero de l'arbre investi.
UPDATE "User" u SET "skillPoints" = u."skillPoints" + s.total
FROM (SELECT "userId", SUM(level) AS total FROM "UserSkill" GROUP BY "userId") s
WHERE s."userId" = u.id;
DELETE FROM "UserSkill";

-- 2. Noeuds : nom, effet, plafond et position alignes sur le seed.
-- Le noeud de Fortune change de NOM : on le retrouve d'abord par son ancien
-- effectType, sinon les UPDATE par nom ci-dessous ne le verraient pas.
UPDATE "SkillNode" n SET name='Vœu exaucé'
FROM "SkillBranch" b
WHERE b.id=n."branchId" AND b.name='Fortune' AND n."effectType"='FREE_PULL_CHANCE';
UPDATE "SkillNode" SET name='Régénération', description='Réduit le délai de régénération des jetons', icon='Timer',
  "maxLevel"=5, "effectType"='REGEN'::"SkillEffectType", "posX"=-72, "posY"=-168
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Régénération');
UPDATE "SkillNode" SET name='Stockage', description='Augmente le stockage max de jetons', icon='Database',
  "maxLevel"=6, "effectType"='TOKEN_VAULT'::"SkillEffectType", "posX"=72, "posY"=-168
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Stockage');
UPDATE "SkillNode" SET name='Multi-jetons', description='Chance de recevoir plusieurs jetons à la fois', icon='Layers',
  "maxLevel"=5, "effectType"='MULTI_TOKEN_CHANCE'::"SkillEffectType", "posX"=-72, "posY"=-336
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Multi-jetons');
UPDATE "SkillNode" SET name='Tirage gratuit', description='Chance de tirer sans consommer de jeton', icon='Gift',
  "maxLevel"=5, "effectType"='FREE_PULL_CHANCE'::"SkillEffectType", "posX"=72, "posY"=-336
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Tirage gratuit');
UPDATE "SkillNode" SET name='Trop-plein', description='Les jetons régénérés au-delà du plafond reviennent en poussière', icon='Droplets',
  "maxLevel"=3, "effectType"='TOKEN_OVERFLOW_DUST'::"SkillEffectType", "posX"=0, "posY"=-504
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Trop-plein');
UPDATE "SkillNode" SET name='Ferveur', description='Bonus d''XP par tirage', icon='BookOpen',
  "maxLevel"=4, "effectType"='PULL_XP_BONUS'::"SkillEffectType", "posX"=-144, "posY"=-504
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Ferveur');
UPDATE "SkillNode" SET name='Chance', description='Multiplie les chances de tirer une carte Rare ou mieux (jusqu''à ×1,12)', icon='Star',
  "maxLevel"=5, "effectType"='LUCK'::"SkillEffectType", "posX"=216, "posY"=-48
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Chance');
UPDATE "SkillNode" SET name='Boule d''or', description='Chance d''obtenir une boule en or', icon='Trophy',
  "maxLevel"=4, "effectType"='GOLDEN_BALL_CHANCE'::"SkillEffectType", "posX"=408, "posY"=-120
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Boule d''or');
UPDATE "SkillNode" SET name='Vœu exaucé', description='Chance qu''un tirage donne une carte souhaitée de même rareté', icon='Star',
  "maxLevel"=4, "effectType"='WISHLIST_PULL_CHANCE'::"SkillEffectType", "posX"=408, "posY"=24
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Vœu exaucé');
UPDATE "SkillNode" SET name='Opulence', description='Relève la limite journalière d''achat de packs d''énergie (3 → 6)', icon='PackagePlus',
  "maxLevel"=2, "effectType"='ENERGY_PACK_CAP'::"SkillEffectType", "posX"=600, "posY"=-48
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Opulence');
UPDATE "SkillNode" SET name='Destin', description='Abaisse le seuil de pitié', icon='Compass',
  "maxLevel"=5, "effectType"='PITY_BOOST'::"SkillEffectType", "posX"=600, "posY"=-192
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Destin');
UPDATE "SkillNode" SET name='Prisme', description='Augmente les chances de variantes Brillant/Holo', icon='Diamond',
  "maxLevel"=5, "effectType"='VARIANT_LUCK'::"SkillEffectType", "posX"=600, "posY"=120
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Prisme');
UPDATE "SkillNode" SET name='Recyclage', description='Plus de poussière lors du recyclage de doublons', icon='RefreshCw',
  "maxLevel"=5, "effectType"='DUST_HARVEST'::"SkillEffectType", "posX"=72, "posY"=168
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Recyclage');
UPDATE "SkillNode" SET name='Réduction', description='Réduit les prix en poussière de la boutique', icon='BadgePercent',
  "maxLevel"=5, "effectType"='SHOP_DISCOUNT'::"SkillEffectType", "posX"=144, "posY"=336
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Réduction');
UPDATE "SkillNode" SET name='Artisan', description='Réduit le coût en poussière d''amélioration des cartes', icon='Hammer',
  "maxLevel"=5, "effectType"='UPGRADE_DUST_DISCOUNT'::"SkillEffectType", "posX"=0, "posY"=336
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Artisan');
UPDATE "SkillNode" SET name='Marchandeur', description='Réduit les prix en or de la boutique', icon='ShoppingBag',
  "maxLevel"=3, "effectType"='GOLD_SHOP_DISCOUNT'::"SkillEffectType", "posX"=72, "posY"=504
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Marchandeur');
UPDATE "SkillNode" SET name='Apogée de Collection', description='Plus de cartes rares dans ta boutique du jour', icon='Gem',
  "maxLevel"=4, "effectType"='DAILY_SHOP_LUCK'::"SkillEffectType", "posX"=-144, "posY"=336
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Apogée de Collection');
UPDATE "SkillNode" SET name='Négociant', description='Réduit le délai du vœu (wishlist)', icon='Handshake',
  "maxLevel"=3, "effectType"='WISHLIST_COOLDOWN'::"SkillEffectType", "posX"=-144, "posY"=504
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Négociant');
UPDATE "SkillNode" SET name='Étal élargi', description='Cartes supplémentaires à la boutique du jour', icon='Store',
  "maxLevel"=2, "effectType"='DAILY_SHOP_SLOT'::"SkillEffectType", "posX"=-144, "posY"=168
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Étal élargi');
UPDATE "SkillNode" SET name='Endurance', description='Augmente le stock maximum d''énergie', icon='BatteryCharging',
  "maxLevel"=5, "effectType"='PC_VAULT'::"SkillEffectType", "posX"=-216, "posY"=-96
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Endurance');
UPDATE "SkillNode" SET name='Récupération', description='Réduit le délai de régénération de l''énergie', icon='Timer',
  "maxLevel"=4, "effectType"='PC_REGEN'::"SkillEffectType", "posX"=-216, "posY"=96
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Récupération');
UPDATE "SkillNode" SET name='Butin doré', description='Bonus de gold sur les victoires', icon='Coins',
  "maxLevel"=4, "effectType"='GOLD_BONUS'::"SkillEffectType", "posX"=-408, "posY"=-144
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Butin doré');
UPDATE "SkillNode" SET name='Logistique', description='Réduit le coût du farm', icon='Truck',
  "maxLevel"=1, "effectType"='SWEEP_COST'::"SkillEffectType", "posX"=-408, "posY"=0
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Logistique');
UPDATE "SkillNode" SET name='Vétéran', description='Bonus d''XP combat', icon='Medal',
  "maxLevel"=5, "effectType"='COMBAT_XP_BONUS'::"SkillEffectType", "posX"=-408, "posY"=144
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Vétéran');
UPDATE "SkillNode" SET name='Apogée de Combat', description='Bonus de chance d''équipement en combat', icon='Swords',
  "maxLevel"=4, "effectType"='DROP_BONUS'::"SkillEffectType", "posX"=-600, "posY"=0
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Apogée de Combat');
UPDATE "SkillNode" SET name='Forgeron', description='Réduit le coût en or d''amélioration des équipements', icon='Anvil',
  "maxLevel"=3, "effectType"='EQUIP_UPGRADE_DISCOUNT'::"SkillEffectType", "posX"=-792, "posY"=0
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Forgeron');
UPDATE "SkillNode" SET name='Ferrailleur', description='Plus d''or au recyclage des équipements', icon='Recycle',
  "maxLevel"=3, "effectType"='SALVAGE_BONUS'::"SkillEffectType", "posX"=-600, "posY"=144
WHERE id=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Ferrailleur');

-- 3. Courbes : rebaties a l'identique du seed.
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Régénération');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,5),(2,9),(3,12),(4,15),(5,20)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Régénération') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Stockage');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,4),(2,8),(3,12),(4,16),(5,19),(6,22)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Stockage') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Multi-jetons');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,2),(2,4),(3,6),(4,9),(5,12)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Multi-jetons') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Tirage gratuit');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,1),(2,2),(3,4),(4,6),(5,10)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Tirage gratuit') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Trop-plein');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,10),(2,20),(3,30)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Trop-plein') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Ferveur');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,3),(2,6),(3,9),(4,12)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Ferveur') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Chance');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,2),(2,4),(3,6),(4,9),(5,12)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Chance') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Boule d''or');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,2),(2,4),(3,6),(4,8)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Boule d''or') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Vœu exaucé');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,10),(2,20),(3,30),(4,40)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Vœu exaucé') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Opulence');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,1),(2,2)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Opulence') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Destin');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,5),(2,10),(3,20),(4,30),(5,40)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Destin') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Prisme');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,4),(2,7),(3,10),(4,12),(5,14)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Prisme') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Recyclage');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,8),(2,14),(3,20),(4,25),(5,30)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Recyclage') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Réduction');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,8),(2,13),(3,18),(4,22),(5,25)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Réduction') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Artisan');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,8),(2,15),(3,21),(4,26),(5,30)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Artisan') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Marchandeur');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,10),(2,18),(3,25)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Marchandeur') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Apogée de Collection');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,10),(2,20),(3,35),(4,50)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Apogée de Collection') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Négociant');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,1),(2,2),(3,3)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Négociant') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Étal élargi');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,1),(2,2)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Étal élargi') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Endurance');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,5),(2,10),(3,15),(4,20),(5,25)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Endurance') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Récupération');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,60),(2,120),(3,180),(4,210)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Récupération') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Butin doré');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,3),(2,6),(3,10),(4,13)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Butin doré') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Logistique');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,1)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Logistique') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Vétéran');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,3),(2,7),(3,10),(4,14),(5,17)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Vétéran') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Apogée de Combat');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,12),(2,22),(3,31),(4,40)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Apogée de Combat') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Forgeron');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,5),(2,10),(3,15)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Forgeron') AS src(id);
DELETE FROM "SkillNodeLevel" WHERE "nodeId"=(SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Ferrailleur');
INSERT INTO "SkillNodeLevel" ("nodeId", level, effect)
SELECT src.id, l.lvl, l.eff FROM (VALUES (1,10),(2,20),(3,30)) AS l(lvl,eff)
CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Ferrailleur') AS src(id);

-- 4. Aretes : la topologie de Collection change, on rebatit tout le graphe.
DELETE FROM "SkillEdge";
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-top', 't-bottom' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Régénération') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Multi-jetons') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-top', 't-bottom' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Stockage') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Tirage gratuit') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-top', 't-left' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Multi-jetons') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Trop-plein') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-top', 't-right' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Tirage gratuit') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Trop-plein') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-top', 't-bottom' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Multi-jetons') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Flux' AND n.name='Ferveur') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-right', 't-left' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Chance') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Boule d''or') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-right', 't-left' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Chance') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Vœu exaucé') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-right', 't-left' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Boule d''or') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Opulence') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-right', 't-left' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Vœu exaucé') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Opulence') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-right', 't-left' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Boule d''or') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Destin') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-right', 't-left' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Vœu exaucé') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Fortune' AND n.name='Prisme') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-bottom', 't-top' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Étal élargi') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Apogée de Collection') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-bottom', 't-top' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Apogée de Collection') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Négociant') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-bottom', 't-right' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Recyclage') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Artisan') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-bottom', 't-left' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Recyclage') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Réduction') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-bottom', 't-left' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Artisan') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Marchandeur') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-bottom', 't-right' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Réduction') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Collection' AND n.name='Marchandeur') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-left', 't-right' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Endurance') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Butin doré') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-left', 't-right' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Endurance') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Logistique') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-left', 't-right' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Récupération') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Vétéran') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-left', 't-right' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Butin doré') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Apogée de Combat') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-left', 't-right' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Vétéran') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Apogée de Combat') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-left', 't-right' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Apogée de Combat') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Forgeron') AS t(id);
INSERT INTO "SkillEdge" ("fromNodeId","toNodeId","minLevel","sourceHandle","targetHandle")
SELECT f.id, t.id, 1, 's-left', 't-right' FROM (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Vétéran') AS f(id) CROSS JOIN (SELECT n.id FROM "SkillNode" n JOIN "SkillBranch" b ON b.id=n."branchId" WHERE b.name='Combat' AND n.name='Ferrailleur') AS t(id);
