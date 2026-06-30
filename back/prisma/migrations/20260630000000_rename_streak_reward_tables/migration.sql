-- Rename tables: rewards -> Rewards, streak_milestones -> StreakMilestones, user_rewards -> UserRewards
ALTER TABLE "rewards" RENAME TO "Rewards";
ALTER TABLE "streak_milestones" RENAME TO "StreakMilestones";
ALTER TABLE "user_rewards" RENAME TO "UserRewards";

-- Rename primary key constraints
ALTER TABLE "Rewards" RENAME CONSTRAINT "rewards_pkey" TO "Rewards_pkey";
ALTER TABLE "StreakMilestones" RENAME CONSTRAINT "streak_milestones_pkey" TO "StreakMilestones_pkey";
ALTER TABLE "UserRewards" RENAME CONSTRAINT "user_rewards_pkey" TO "UserRewards_pkey";

-- Rename foreign key constraints
ALTER TABLE "StreakMilestones" RENAME CONSTRAINT "streak_milestones_rewardId_fkey" TO "StreakMilestones_rewardId_fkey";
ALTER TABLE "UserRewards" RENAME CONSTRAINT "user_rewards_userId_fkey" TO "UserRewards_userId_fkey";
ALTER TABLE "UserRewards" RENAME CONSTRAINT "user_rewards_rewardId_fkey" TO "UserRewards_rewardId_fkey";

-- Rename indexes
ALTER INDEX "streak_milestones_day_key" RENAME TO "StreakMilestones_day_key";
ALTER INDEX "user_rewards_userId_claimedAt_idx" RENAME TO "UserRewards_userId_claimedAt_idx";
ALTER INDEX "user_rewards_sourceId_idx" RENAME TO "UserRewards_sourceId_idx";
ALTER INDEX "user_rewards_userId_source_sourceId_key" RENAME TO "UserRewards_userId_source_sourceId_key";
