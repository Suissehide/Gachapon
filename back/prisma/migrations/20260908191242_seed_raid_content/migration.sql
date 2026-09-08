-- Contenu du raid d'équipe : les 4 boss, les 4 paliers et leurs Reward.
--
-- La migration de structure (20260908164603_raid_equipe) crée des tables
-- vides. prisma/seed.ts est destructeur (il vide cards/users/rewards/config)
-- et ne peut pas tourner sur une base de prod déjà vivante — sans ce
-- contenu, le premier `GET /teams/:id/raid` déployé jette (aucun boss pour
-- l'élément de la semaine) et la page d'équipe part en erreur pour tout le
-- monde. Valeurs recopiées telles quelles depuis prisma/seed/raid.ts (ne
-- pas retaper à la main si ce fichier change sans repasser par ici).
--
-- Insertions idempotentes : ré-exécutable sans effet sur une base déjà
-- peuplée (ON CONFLICT sur "element" pour les boss, NOT EXISTS sur "pct"
-- pour les paliers/Reward). Contenu uniquement, aucune structure de table
-- touchée.

-- Boss (un par élément, clé unique sur "element").
INSERT INTO "RaidBoss" (id, element, name, spec, "updatedAt")
VALUES
  (
    gen_random_uuid(),
    'FIRE',
    'Ignis, le Brasier',
    '{"baseHp":338,"baseAtk":744,"baseDef":204,"baseSpd":102,"level":1,"palier":1,"attackPattern":"AOE_3","passiveKey":null,"element":"FIRE","appearance":"monsters/bosses/BOSS-010","mitigationScale":12}'::jsonb,
    now()
  ),
  (
    gen_random_uuid(),
    'WATER',
    'Nérée, la Marée',
    '{"baseHp":338,"baseAtk":744,"baseDef":204,"baseSpd":102,"level":1,"palier":1,"attackPattern":"AOE_3","passiveKey":null,"element":"WATER","appearance":"monsters/bosses/BOSS-011","mitigationScale":12}'::jsonb,
    now()
  ),
  (
    gen_random_uuid(),
    'NATURE',
    'Sylva, la Ronce',
    '{"baseHp":338,"baseAtk":744,"baseDef":204,"baseSpd":102,"level":1,"palier":1,"attackPattern":"AOE_3","passiveKey":null,"element":"NATURE","appearance":"monsters/bosses/BOSS-012","mitigationScale":12}'::jsonb,
    now()
  ),
  (
    gen_random_uuid(),
    'EARTH',
    'Gorm, le Roc',
    '{"baseHp":338,"baseAtk":744,"baseDef":204,"baseSpd":102,"level":1,"palier":1,"attackPattern":"AOE_3","passiveKey":null,"element":"EARTH","appearance":"monsters/bosses/BOSS-013","mitigationScale":12}'::jsonb,
    now()
  )
ON CONFLICT (element) DO NOTHING;

-- Paliers de récompense (25/50/75/100 %) + leur Reward associée. Chaque
-- bloc ne crée la Reward et le RaidTier que si le palier n'existe pas
-- encore (clé unique sur "pct") : pas de Reward orpheline créée en double
-- si la migration est rejouée.
DO $$
DECLARE
  reward_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "RaidTier" WHERE pct = 25) THEN
    INSERT INTO "Rewards" (id, tokens, dust, xp, gold, "cardRarity", label, "createdAt")
    VALUES (gen_random_uuid(), 5, 50, 0, 200, NULL, 'Raid d''équipe — palier 25 %', now())
    RETURNING id INTO reward_id;

    INSERT INTO "RaidTier" (id, pct, "rewardId")
    VALUES (gen_random_uuid(), 25, reward_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "RaidTier" WHERE pct = 50) THEN
    INSERT INTO "Rewards" (id, tokens, dust, xp, gold, "cardRarity", label, "createdAt")
    VALUES (gen_random_uuid(), 10, 100, 0, 400, NULL, 'Raid d''équipe — palier 50 %', now())
    RETURNING id INTO reward_id;

    INSERT INTO "RaidTier" (id, pct, "rewardId")
    VALUES (gen_random_uuid(), 50, reward_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "RaidTier" WHERE pct = 75) THEN
    INSERT INTO "Rewards" (id, tokens, dust, xp, gold, "cardRarity", label, "createdAt")
    VALUES (gen_random_uuid(), 15, 150, 0, 600, NULL, 'Raid d''équipe — palier 75 %', now())
    RETURNING id INTO reward_id;

    INSERT INTO "RaidTier" (id, pct, "rewardId")
    VALUES (gen_random_uuid(), 75, reward_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "RaidTier" WHERE pct = 100) THEN
    INSERT INTO "Rewards" (id, tokens, dust, xp, gold, "cardRarity", label, "createdAt")
    VALUES (gen_random_uuid(), 25, 300, 0, 1000, 'EPIC', 'Raid d''équipe — palier 100 %', now())
    RETURNING id INTO reward_id;

    INSERT INTO "RaidTier" (id, pct, "rewardId")
    VALUES (gen_random_uuid(), 100, reward_id);
  END IF;
END $$;
