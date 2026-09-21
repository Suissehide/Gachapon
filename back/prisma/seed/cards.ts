import type { PrismaClient } from '../../src/generated/client'
import {
  CARDS,
  HUMAN_CARD_SET,
  IMAGE_PREFIX,
} from '../../src/main/domain/content/cards.definitions'

/**
 * Écrit le set « Humains » et ses 38 cartes. Les données elles-mêmes vivent
 * dans `src/main/domain/content/cards.definitions.ts` : elles sont partagées
 * avec le backfill de traductions, qui est du code de production.
 */
export async function seedCards(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {
  const set = await tx.cardSet.create({
    data: { ...HUMAN_CARD_SET, isActive: true },
  })

  for (const card of CARDS) {
    await tx.card.create({
      data: {
        setId: set.id,
        nameFr: card.nameFr,
        nameEn: card.nameEn,
        imageUrl: `${IMAGE_PREFIX}/${card.id}.png`,
        rarity: card.rarity,
        dropWeight: card.dropWeight,
        baseHp: card.baseHp,
        baseAtk: card.baseAtk,
        baseDef: card.baseDef,
        baseSpd: card.baseSpd,
        passiveKey: card.passiveKey ?? null,
        element: card.element ?? null,
      },
    })
  }

  console.log(`  CardSet "${set.nameFr}" + ${CARDS.length} cartes créées`)
}
