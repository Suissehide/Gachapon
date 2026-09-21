import type { PrismaClient } from '../../src/generated/client'
import { buildEquipmentCatalog } from '../../src/main/domain/content/equipment.definitions'

/**
 * Écrit le catalogue d'équipement. Les données elles-mêmes vivent dans
 * `src/main/domain/content/equipment.definitions.ts` : elles sont partagées
 * avec le backfill de traductions, qui est du code de production.
 */
// Type juste : le vrai appelant (prisma/seed.ts) passe le client de
// transaction (tx), structurellement plus étroit que PrismaClient (pas de
// $transaction/$connect). Même expression que l'ancien seed.
export async function seedEquipment(
  prisma: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
): Promise<void> {
  const catalogue = buildEquipmentCatalog()
  for (const row of catalogue) {
    await prisma.equipment.upsert({
      where: {
        // Clé naturelle : une pièce est identifiée par son emplacement, son
        // set, sa rareté ET sa stat principale — c'est cette dernière qui
        // distingue les variantes d'un même emplacement.
        slot_setKey_rarity_mainStat: {
          slot: row.slot,
          setKey: row.setKey,
          rarity: row.rarity,
          mainStat: row.mainStat,
        },
      },
      create: { ...row, bonuses: { ...row.bonuses } },
      update: {
        nameFr: row.nameFr,
        nameEn: row.nameEn,
        bonuses: { ...row.bonuses },
        dropWeight: row.dropWeight,
      },
    })
  }
  console.log(`  Equipment pool : ${catalogue.length} pièces créées`)
}
