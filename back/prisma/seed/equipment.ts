import type { PrismaClient } from '../../src/generated/client'

type Slot = 'WEAPON' | 'ARMOR' | 'ACCESSORY'
type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

// Chaque rareté existe en version flat ET en version % (bonus de base unique).
// Les % sont volontairement plus rares (dropWeight ≈ moitié du flat de même
// rareté) : meilleures sur le long terme, ce sont les objets de farm.
//
// Calibration des % (placeholders à re-simuler) : le croisement flat/% vise
// ~300 de stat brute pour ATK/DEF (fin de progression d'une bonne carte) —
// barème C2/U3/R5/E8/L12. La SPD part d'une base ~100, donc barème réduit
// C1/U1.5/R2.5/E4/L5 pour garder le même point de croisement relatif.
const EQUIPMENT: Array<{
  name: string
  slot: Slot
  rarity: Rarity
  bonuses: Record<string, number>
  dropWeight: number
}> = [
  // WEAPONS — ATK
  { name: 'Épée rouillée', slot: 'WEAPON', rarity: 'COMMON', bonuses: { atkFlat: 5 }, dropWeight: 50 },
  { name: 'Hache de bûcheron', slot: 'WEAPON', rarity: 'COMMON', bonuses: { atkFlat: 6 }, dropWeight: 50 },
  { name: 'Gourdin ferré', slot: 'WEAPON', rarity: 'COMMON', bonuses: { atkPct: 2 }, dropWeight: 25 },
  { name: 'Épée d\'argent', slot: 'WEAPON', rarity: 'UNCOMMON', bonuses: { atkFlat: 8 }, dropWeight: 25 },
  { name: 'Sabre gravé', slot: 'WEAPON', rarity: 'UNCOMMON', bonuses: { atkPct: 3 }, dropWeight: 12 },
  { name: 'Hallebarde', slot: 'WEAPON', rarity: 'RARE', bonuses: { atkFlat: 15 }, dropWeight: 10 },
  { name: 'Katana du duelliste', slot: 'WEAPON', rarity: 'RARE', bonuses: { atkPct: 5 }, dropWeight: 5 },
  { name: 'Lame fantôme', slot: 'WEAPON', rarity: 'EPIC', bonuses: { atkFlat: 25 }, dropWeight: 4 },
  { name: 'Griffes du chaos', slot: 'WEAPON', rarity: 'EPIC', bonuses: { atkPct: 8 }, dropWeight: 2 },
  { name: 'Excalibur', slot: 'WEAPON', rarity: 'LEGENDARY', bonuses: { atkFlat: 40 }, dropWeight: 1 },
  { name: 'Lame de l\'éclipse', slot: 'WEAPON', rarity: 'LEGENDARY', bonuses: { atkPct: 12 }, dropWeight: 0.5 },
  // ARMORS — DEF / PV
  { name: 'Cotte de mailles', slot: 'ARMOR', rarity: 'COMMON', bonuses: { defFlat: 3 }, dropWeight: 50 },
  { name: 'Plastron de cuir', slot: 'ARMOR', rarity: 'COMMON', bonuses: { hpFlat: 25 }, dropWeight: 50 },
  { name: 'Tunique de lin', slot: 'ARMOR', rarity: 'COMMON', bonuses: { hpPct: 2 }, dropWeight: 25 },
  { name: 'Armure d\'écailles', slot: 'ARMOR', rarity: 'UNCOMMON', bonuses: { defFlat: 5 }, dropWeight: 25 },
  { name: 'Gambison renforcé', slot: 'ARMOR', rarity: 'UNCOMMON', bonuses: { hpFlat: 40 }, dropWeight: 25 },
  { name: 'Écu ciselé', slot: 'ARMOR', rarity: 'UNCOMMON', bonuses: { defPct: 3 }, dropWeight: 12 },
  { name: 'Plastron du gardien', slot: 'ARMOR', rarity: 'RARE', bonuses: { defFlat: 10 }, dropWeight: 10 },
  { name: 'Égide sculptée', slot: 'ARMOR', rarity: 'RARE', bonuses: { defPct: 5 }, dropWeight: 5 },
  { name: 'Cuirasse vitale', slot: 'ARMOR', rarity: 'RARE', bonuses: { hpPct: 5 }, dropWeight: 5 },
  { name: 'Armure dracogène', slot: 'ARMOR', rarity: 'EPIC', bonuses: { defFlat: 16 }, dropWeight: 4 },
  { name: 'Rempart des titans', slot: 'ARMOR', rarity: 'EPIC', bonuses: { hpPct: 8 }, dropWeight: 2 },
  { name: 'Armure céleste', slot: 'ARMOR', rarity: 'LEGENDARY', bonuses: { defFlat: 25 }, dropWeight: 1 },
  { name: 'Égide du colosse', slot: 'ARMOR', rarity: 'LEGENDARY', bonuses: { defPct: 12 }, dropWeight: 0.5 },
  { name: 'Cœur du monde', slot: 'ARMOR', rarity: 'LEGENDARY', bonuses: { hpPct: 12 }, dropWeight: 0.5 },
  // ACCESSORIES — SPD / PV
  { name: 'Pendentif simple', slot: 'ACCESSORY', rarity: 'COMMON', bonuses: { spdFlat: 3 }, dropWeight: 50 },
  { name: 'Anneau de cuivre', slot: 'ACCESSORY', rarity: 'COMMON', bonuses: { hpPct: 2 }, dropWeight: 25 },
  { name: 'Amulette des vents', slot: 'ACCESSORY', rarity: 'UNCOMMON', bonuses: { spdFlat: 5 }, dropWeight: 25 },
  { name: 'Plume d\'hirondelle', slot: 'ACCESSORY', rarity: 'UNCOMMON', bonuses: { spdPct: 1.5 }, dropWeight: 12 },
  { name: 'Anneau d\'argent', slot: 'ACCESSORY', rarity: 'RARE', bonuses: { spdFlat: 8 }, dropWeight: 10 },
  { name: 'Sablier fêlé', slot: 'ACCESSORY', rarity: 'RARE', bonuses: { spdPct: 2.5 }, dropWeight: 5 },
  { name: 'Talisman runique', slot: 'ACCESSORY', rarity: 'EPIC', bonuses: { spdFlat: 12 }, dropWeight: 4 },
  { name: 'Ailes d\'Icare', slot: 'ACCESSORY', rarity: 'EPIC', bonuses: { spdPct: 4 }, dropWeight: 2 },
  { name: 'Œil du dragon', slot: 'ACCESSORY', rarity: 'LEGENDARY', bonuses: { spdFlat: 18 }, dropWeight: 1 },
  { name: 'Souffle du zéphyr', slot: 'ACCESSORY', rarity: 'LEGENDARY', bonuses: { spdPct: 5 }, dropWeight: 0.5 },
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
