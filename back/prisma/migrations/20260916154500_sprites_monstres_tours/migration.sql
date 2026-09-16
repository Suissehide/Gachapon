-- Sprites des monstres de tour.
--
-- `prisma/seed/tower.ts` ecrivait `appearance: null` pour les 120 ennemis des
-- 40 etages de tour, la ou `seed/campaign.ts` seede bien les siens : le front
-- resolvait donc `imageUrl` a null et affichait `not-found.png` partout, en
-- preparation comme en combat. Aucun test ne couvrait ce champ cote tour,
-- d'ou le silence (corrige dans src/test/unit/tower-seed.test.ts).
--
-- Migration de DONNEES parce que le deploiement ne rejoue jamais le seed :
-- `start:migrate:production` = `prisma migrate deploy && node lib/main/index.js`
-- (package.json). Meme raison que 20260908191242_seed_raid_content.
--
-- Les valeurs ci-dessous sont GENEREES depuis `buildTowerFloors()` : une tour
-- ne puise que dans les familles de son element (Braise = kobolds,
-- elementaires, minotaures, wyvernes ; Monolithe = basilics, seule famille
-- TERRE), avec la rotation `(etage + slot) % familles` de la campagne.
--
-- Chirurgical : seul `appearance` est reecrit, les stats et le butin deja en
-- base ne sont pas touches. Le garde sur `IS NULL` rend l'operation idempotente
-- et laisse survivre un reglage manuel, comme 20260915164430_nerf_butin_combat.

UPDATE "TowerFloor" f
SET "enemyTeam" = jsonb_set(
      jsonb_set(
        jsonb_set(f."enemyTeam", '{0,appearance}', to_jsonb(v.s0)),
        '{1,appearance}', to_jsonb(v.s1)),
      '{2,appearance}', to_jsonb(v.s2))
FROM (VALUES
  ('FIRE', 1, 'monsters/elementals/ELEM-001', 'monsters/minotaurs/MINO-001', 'monsters/wyverns/WYVN-001'),
  ('FIRE', 2, 'monsters/minotaurs/MINO-002', 'monsters/wyverns/WYVN-002', 'monsters/kobolds/KOBO-001'),
  ('FIRE', 3, 'monsters/wyverns/WYVN-003', 'monsters/kobolds/KOBO-002', 'monsters/elementals/ELEM-002'),
  ('FIRE', 4, 'monsters/kobolds/KOBO-003', 'monsters/elementals/ELEM-003', 'monsters/minotaurs/MINO-003'),
  ('FIRE', 5, 'monsters/elementals/ELEM-004', 'monsters/minotaurs/MINO-004', 'monsters/wyverns/WYVN-004'),
  ('FIRE', 6, 'monsters/minotaurs/MINO-005', 'monsters/wyverns/WYVN-005', 'monsters/kobolds/KOBO-004'),
  ('FIRE', 7, 'monsters/wyverns/WYVN-006', 'monsters/kobolds/KOBO-005', 'monsters/elementals/ELEM-005'),
  ('FIRE', 8, 'monsters/kobolds/KOBO-006', 'monsters/elementals/ELEM-006', 'monsters/minotaurs/MINO-006'),
  ('FIRE', 9, 'monsters/elementals/ELEM-007', 'monsters/minotaurs/MINO-007', 'monsters/wyverns/WYVN-007'),
  ('FIRE', 10, 'monsters/minotaurs/MINO-008', 'monsters/wyverns/WYVN-008', 'monsters/kobolds/KOBO-001'),
  ('WATER', 1, 'monsters/hydras/HYDRA-001', 'monsters/krakens/KRAK-001', 'monsters/slimes/SLIME-001'),
  ('WATER', 2, 'monsters/krakens/KRAK-002', 'monsters/slimes/SLIME-002', 'monsters/hydras/HYDRA-002'),
  ('WATER', 3, 'monsters/slimes/SLIME-003', 'monsters/hydras/HYDRA-003', 'monsters/krakens/KRAK-003'),
  ('WATER', 4, 'monsters/hydras/HYDRA-004', 'monsters/krakens/KRAK-004', 'monsters/slimes/SLIME-004'),
  ('WATER', 5, 'monsters/krakens/KRAK-005', 'monsters/slimes/SLIME-005', 'monsters/hydras/HYDRA-005'),
  ('WATER', 6, 'monsters/slimes/SLIME-006', 'monsters/hydras/HYDRA-001', 'monsters/krakens/KRAK-006'),
  ('WATER', 7, 'monsters/hydras/HYDRA-002', 'monsters/krakens/KRAK-007', 'monsters/slimes/SLIME-007'),
  ('WATER', 8, 'monsters/krakens/KRAK-008', 'monsters/slimes/SLIME-008', 'monsters/hydras/HYDRA-003'),
  ('WATER', 9, 'monsters/slimes/SLIME-009', 'monsters/hydras/HYDRA-004', 'monsters/krakens/KRAK-009'),
  ('WATER', 10, 'monsters/hydras/HYDRA-005', 'monsters/krakens/KRAK-010', 'monsters/slimes/SLIME-001'),
  ('NATURE', 1, 'monsters/wolves/WOLF-001', 'monsters/mimics/MIMC-001', 'monsters/mushrooms/MYCO-001'),
  ('NATURE', 2, 'monsters/mimics/MIMC-002', 'monsters/mushrooms/MYCO-002', 'monsters/wolves/WOLF-002'),
  ('NATURE', 3, 'monsters/mushrooms/MYCO-003', 'monsters/wolves/WOLF-003', 'monsters/mimics/MIMC-003'),
  ('NATURE', 4, 'monsters/wolves/WOLF-004', 'monsters/mimics/MIMC-001', 'monsters/mushrooms/MYCO-001'),
  ('NATURE', 5, 'monsters/mimics/MIMC-002', 'monsters/mushrooms/MYCO-002', 'monsters/wolves/WOLF-005'),
  ('NATURE', 6, 'monsters/mushrooms/MYCO-003', 'monsters/wolves/WOLF-006', 'monsters/mimics/MIMC-003'),
  ('NATURE', 7, 'monsters/wolves/WOLF-007', 'monsters/mimics/MIMC-001', 'monsters/mushrooms/MYCO-001'),
  ('NATURE', 8, 'monsters/mimics/MIMC-002', 'monsters/mushrooms/MYCO-002', 'monsters/wolves/WOLF-008'),
  ('NATURE', 9, 'monsters/mushrooms/MYCO-003', 'monsters/wolves/WOLF-009', 'monsters/mimics/MIMC-003'),
  ('NATURE', 10, 'monsters/wolves/WOLF-010', 'monsters/mimics/MIMC-001', 'monsters/mushrooms/MYCO-001'),
  ('EARTH', 1, 'monsters/basilisks/BSLK-001', 'monsters/basilisks/BSLK-002', 'monsters/basilisks/BSLK-003'),
  ('EARTH', 2, 'monsters/basilisks/BSLK-004', 'monsters/basilisks/BSLK-005', 'monsters/basilisks/BSLK-006'),
  ('EARTH', 3, 'monsters/basilisks/BSLK-007', 'monsters/basilisks/BSLK-001', 'monsters/basilisks/BSLK-002'),
  ('EARTH', 4, 'monsters/basilisks/BSLK-003', 'monsters/basilisks/BSLK-004', 'monsters/basilisks/BSLK-005'),
  ('EARTH', 5, 'monsters/basilisks/BSLK-006', 'monsters/basilisks/BSLK-007', 'monsters/basilisks/BSLK-001'),
  ('EARTH', 6, 'monsters/basilisks/BSLK-002', 'monsters/basilisks/BSLK-003', 'monsters/basilisks/BSLK-004'),
  ('EARTH', 7, 'monsters/basilisks/BSLK-005', 'monsters/basilisks/BSLK-006', 'monsters/basilisks/BSLK-007'),
  ('EARTH', 8, 'monsters/basilisks/BSLK-001', 'monsters/basilisks/BSLK-002', 'monsters/basilisks/BSLK-003'),
  ('EARTH', 9, 'monsters/basilisks/BSLK-004', 'monsters/basilisks/BSLK-005', 'monsters/basilisks/BSLK-006'),
  ('EARTH', 10, 'monsters/basilisks/BSLK-007', 'monsters/basilisks/BSLK-001', 'monsters/basilisks/BSLK-002')

) AS v(element, idx, s0, s1, s2)
WHERE f."element" = v.element::"CardElement"
  AND f."index" = v.idx
  AND f."enemyTeam" -> 0 ->> 'appearance' IS NULL;
