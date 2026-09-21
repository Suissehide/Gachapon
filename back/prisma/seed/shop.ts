import type { PrismaClient } from '../../src/generated/client'
import { SHOP_ITEMS } from '../../src/main/domain/content/shop.definitions'

/**
 * Écrit les articles de boutique. Les données elles-mêmes vivent dans
 * `src/main/domain/content/shop.definitions.ts` : elles sont partagées avec
 * le backfill de traductions, qui est du code de production.
 */
export async function seedShop(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {
  for (const item of SHOP_ITEMS) {
    await tx.shopItem.create({ data: item })
  }

  console.log(`  ${SHOP_ITEMS.length} articles boutique créés`)
}
