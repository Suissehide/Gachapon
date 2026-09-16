-- Le set « Precision » donne du TAUX DE CRITIQUE, pas de la justesse de tir :
-- son nom promettait une stat qui n'existe pas dans le jeu (il n'y a pas de
-- chance de rater), et il faisait doublon avec le passif CRIT, libelle
-- « Precision » lui aussi. Il devient « Affut » (AFFUT) : le set qui guette
-- l'ouverture. Les 7 noms de pieces (Lame du Guetteur, Bottes du Traqueur,
-- Anneau de l'Oeil Juste, ...) restent valides tels quels.
--
-- Renommage de la VALEUR d'enum plutot que retrait + ajout : les pieces du
-- catalogue et celles deja possedees par les joueurs portent 'PRECISION' en
-- base, et une recreation du type les perdrait. RENAME VALUE conserve les
-- lignes et ne recree pas le type.

ALTER TYPE "EquipmentSet" RENAME VALUE 'PRECISION' TO 'AFFUT';

-- La cle de config suit le nom du set. Le bootstrap de GlobalConfig est
-- create-only : sans ce renommage, il creerait une ligne neuve a la valeur
-- par defaut et laisserait l'ancienne orpheline, perdant tout reglage.
UPDATE "GlobalConfig"
SET key = 'set.affutCritRatePct', "updatedAt" = NOW()
WHERE key = 'set.precisionCritRatePct';
