-- Adds an optional cardRarity column to the rewards table.
-- When set, claiming the reward should additionally grant a card of the given rarity.
-- The actual card-grant logic is the consumer's responsibility (see rewards domain).
ALTER TABLE "rewards" ADD COLUMN "cardRarity" "CardRarity";
