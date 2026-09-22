import type { PrismaClient } from '../../src/generated/client'
import { buildTowerFloors } from '../../src/main/domain/content/tower.definitions'

// Type juste : le vrai appelant (prisma/seed.ts) passe le client de
// transaction (tx), structurellement plus étroit que PrismaClient (pas de
// $transaction/$connect) — même motif que seedCampaign/seedEquipment/seedSkills.
type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

/**
 * Écrit les 40 étages de tour. Les données elles-mêmes vivent dans
 * `src/main/domain/content/tower.definitions.ts` : elles sont partagées avec
 * le backfill de traductions, qui est du code de production.
 */
export async function seedTowerFloors(tx: Tx): Promise<void> {
  for (const etage of buildTowerFloors()) {
    await tx.towerFloor.upsert({
      where: { element_index: { element: etage.element, index: etage.index } },
      create: etage,
      update: {
        labelFr: etage.labelFr,
        labelEn: etage.labelEn,
        enemyTeam: etage.enemyTeam,
        lootTable: etage.lootTable,
        order: etage.order,
      },
    })
  }
}
