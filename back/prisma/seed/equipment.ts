import type { PrismaClient } from '../../src/generated/client'

type Slot = 'WEAPON' | 'ARMOR' | 'ACCESSORY'
type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

const EQUIPMENT: Array<{
  name: string
  slot: Slot
  rarity: Rarity
  bonuses: Record<string, number>
  dropWeight: number
}> = [
  // WEAPONS
  { name: 'Épée rouillée', slot: 'WEAPON', rarity: 'COMMON', bonuses: { atkFlat: 5 }, dropWeight: 50 },
  { name: 'Hache de bûcheron', slot: 'WEAPON', rarity: 'COMMON', bonuses: { atkFlat: 6 }, dropWeight: 50 },
  { name: 'Épée d\'argent', slot: 'WEAPON', rarity: 'UNCOMMON', bonuses: { atkFlat: 8, atkPct: 3 }, dropWeight: 25 },
  { name: 'Hallebarde', slot: 'WEAPON', rarity: 'RARE', bonuses: { atkFlat: 15, hpPct: 5 }, dropWeight: 10 },
  { name: 'Lame fantôme', slot: 'WEAPON', rarity: 'EPIC', bonuses: { atkFlat: 25, atkPct: 8, spdFlat: 5 }, dropWeight: 4 },
  { name: 'Excalibur', slot: 'WEAPON', rarity: 'LEGENDARY', bonuses: { atkFlat: 40, atkPct: 15, hpPct: 10, spdFlat: 8 }, dropWeight: 1 },
  // ARMORS
  { name: 'Tunique de lin', slot: 'ARMOR', rarity: 'COMMON', bonuses: { hpPct: 3 }, dropWeight: 50 },
  { name: 'Cotte de mailles', slot: 'ARMOR', rarity: 'COMMON', bonuses: { defFlat: 3, hpPct: 2 }, dropWeight: 50 },
  { name: 'Armure d\'écailles', slot: 'ARMOR', rarity: 'UNCOMMON', bonuses: { defFlat: 5, hpPct: 5 }, dropWeight: 25 },
  { name: 'Plastron du gardien', slot: 'ARMOR', rarity: 'RARE', bonuses: { defFlat: 10, hpPct: 10 }, dropWeight: 10 },
  { name: 'Armure dracogène', slot: 'ARMOR', rarity: 'EPIC', bonuses: { defFlat: 16, hpPct: 15, atkPct: 5 }, dropWeight: 4 },
  { name: 'Armure céleste', slot: 'ARMOR', rarity: 'LEGENDARY', bonuses: { defFlat: 25, hpPct: 25, atkPct: 10, spdFlat: 5 }, dropWeight: 1 },
  // ACCESSORIES
  { name: 'Pendentif simple', slot: 'ACCESSORY', rarity: 'COMMON', bonuses: { spdFlat: 3 }, dropWeight: 50 },
  { name: 'Anneau de cuivre', slot: 'ACCESSORY', rarity: 'COMMON', bonuses: { hpPct: 2, spdFlat: 2 }, dropWeight: 50 },
  { name: 'Amulette des vents', slot: 'ACCESSORY', rarity: 'UNCOMMON', bonuses: { spdFlat: 5, atkPct: 3 }, dropWeight: 25 },
  { name: 'Anneau d\'argent', slot: 'ACCESSORY', rarity: 'RARE', bonuses: { spdFlat: 8, hpPct: 8 }, dropWeight: 10 },
  { name: 'Talisman runique', slot: 'ACCESSORY', rarity: 'EPIC', bonuses: { spdFlat: 12, atkPct: 8, hpPct: 8 }, dropWeight: 4 },
  { name: 'Œil du dragon', slot: 'ACCESSORY', rarity: 'LEGENDARY', bonuses: { spdFlat: 18, atkPct: 15, hpPct: 12, defFlat: 5 }, dropWeight: 1 },
] as const

export async function seedEquipment(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {
  for (const item of EQUIPMENT) {
    await tx.equipment.create({
      data: {
        name: item.name,
        slot: item.slot,
        rarity: item.rarity,
        bonuses: item.bonuses,
        dropWeight: item.dropWeight,
      },
    })
  }
  console.log(`  Equipment pool : ${EQUIPMENT.length} pièces créées`)
}
