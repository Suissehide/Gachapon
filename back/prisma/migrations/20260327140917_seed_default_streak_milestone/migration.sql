-- Insert the default streak milestone (day=0) if it doesn't already exist.
-- day=0 is the fixed daily reward used for all non-milestone streak days.
WITH new_reward AS (
  INSERT INTO "rewards" ("id", "tokens", "dust", "xp", "createdAt")
  SELECT gen_random_uuid(), 2, 3, 5, NOW()
  WHERE NOT EXISTS (SELECT 1 FROM "streak_milestones" WHERE "day" = 0)
  RETURNING "id"
)
INSERT INTO "streak_milestones" ("id", "day", "isMilestone", "isActive", "rewardId")
SELECT gen_random_uuid(), 0, false, true, new_reward.id
FROM new_reward;
