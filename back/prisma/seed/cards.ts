import type { PrismaClient } from '../../src/generated/client'

const STATS_BY_RARITY: Record<
  'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY',
  { baseHp: number; baseAtk: number; baseDef: number; baseSpd: number }
> = {
  COMMON: { baseHp: 100, baseAtk: 10, baseDef: 5, baseSpd: 90 },
  UNCOMMON: { baseHp: 140, baseAtk: 14, baseDef: 7, baseSpd: 95 },
  RARE: { baseHp: 200, baseAtk: 20, baseDef: 10, baseSpd: 100 },
  EPIC: { baseHp: 320, baseAtk: 32, baseDef: 16, baseSpd: 105 },
  LEGENDARY: { baseHp: 500, baseAtk: 50, baseDef: 25, baseSpd: 110 },
}

const PASSIVE_BY_CARD: Record<string, string | null> = {
  // EPIC cards
  'Dragon Rouge': 'EXECUTION',
  'Titan de Fer': 'AEGIS',
  // LEGENDARY cards
  'Azéros, Dieu-Guerrier': 'REBIRTH',
}

const CARDS = [
  // COMMON — dropWeight 136 chacune
  { name: 'Gobelin', rarity: 'COMMON', dropWeight: 136, imageKey: 'gobelin.png' },
  { name: 'Rat', rarity: 'COMMON', dropWeight: 136, imageKey: 'rat.png' },
  { name: 'Champignon', rarity: 'COMMON', dropWeight: 136, imageKey: 'champignon.png' },
  { name: 'Squelette', rarity: 'COMMON', dropWeight: 136, imageKey: 'squelette.png' },
  { name: 'Slime', rarity: 'COMMON', dropWeight: 136, imageKey: 'slime.png' },
  { name: 'Chauve-Souris', rarity: 'COMMON', dropWeight: 136, imageKey: 'chauve-souris.png' },
  { name: 'Lézard', rarity: 'COMMON', dropWeight: 136, imageKey: 'lezard.png' },
  { name: 'Crabe', rarity: 'COMMON', dropWeight: 136, imageKey: 'crabe.png' },
  { name: 'Guêpe', rarity: 'COMMON', dropWeight: 136, imageKey: 'guepe.png' },
  { name: 'Escargot', rarity: 'COMMON', dropWeight: 136, imageKey: 'escargot.png' },
  // UNCOMMON — dropWeight 84 chacune
  { name: 'Chevalier', rarity: 'UNCOMMON', dropWeight: 84, imageKey: 'chevalier.png' },
  { name: 'Mage', rarity: 'UNCOMMON', dropWeight: 84, imageKey: 'mage.png' },
  { name: 'Archer', rarity: 'UNCOMMON', dropWeight: 84, imageKey: 'archer.png' },
  { name: 'Druide', rarity: 'UNCOMMON', dropWeight: 84, imageKey: 'druide.png' },
  { name: 'Paladin', rarity: 'UNCOMMON', dropWeight: 84, imageKey: 'paladin.png' },
  // RARE — dropWeight 53 chacune
  { name: 'Dragon Vert', rarity: 'RARE', dropWeight: 53, imageKey: 'dragon-vert.png' },
  { name: 'Phénix', rarity: 'RARE', dropWeight: 53, imageKey: 'phenix.png' },
  { name: 'Liche', rarity: 'RARE', dropWeight: 53, imageKey: 'liche.png' },
  // EPIC — dropWeight 25 chacune
  { name: 'Dragon Rouge', rarity: 'EPIC', dropWeight: 25, imageKey: 'dragon--rouge.png' },
  { name: 'Titan de Fer', rarity: 'EPIC', dropWeight: 25, imageKey: 'titan-de-fer.png' },
  // LEGENDARY — dropWeight 10
  { name: 'Azéros, Dieu-Guerrier', rarity: 'LEGENDARY', dropWeight: 10, imageKey: 'azeros-dieu-guerrier.png' },
] as const

export async function seedCards(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {
  const set = await tx.cardSet.create({
    data: {
      name: 'Alpha Warriors',
      description:
        'Le premier set du Gachapon. 21 guerriers à collectionner, dont des variantes rares.',
      isActive: true,
    },
  })

  for (const card of CARDS) {
    const stats = STATS_BY_RARITY[card.rarity]
    await tx.card.create({
      data: {
        setId: set.id,
        name: card.name,
        imageUrl: `cards/${card.imageKey}`,
        rarity: card.rarity,
        dropWeight: card.dropWeight,
        baseHp: stats.baseHp,
        baseAtk: stats.baseAtk,
        baseDef: stats.baseDef,
        baseSpd: stats.baseSpd,
        passiveKey: PASSIVE_BY_CARD[card.name] ?? null,
      },
    })
  }

  console.log(`  CardSet "${set.name}" + ${CARDS.length} cartes créées`)
}
