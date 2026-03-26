-- DropForeignKey
ALTER TABLE "user_rewards" DROP CONSTRAINT "user_rewards_userId_fkey";

-- AddForeignKey
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
