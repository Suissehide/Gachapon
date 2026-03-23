import type { PrismaClient } from '../../src/generated/client'

const CARDS = [
  // COMMON — dropWeight 40 chacune
  { name: 'Gobelin', rarity: 'COMMON', dropWeight: 40 },
  { name: 'Rat', rarity: 'COMMON', dropWeight: 40 },
  { name: 'Champignon', rarity: 'COMMON', dropWeight: 40 },
  { name: 'Squelette', rarity: 'COMMON', dropWeight: 40 },
  { name: 'Slime', rarity: 'COMMON', dropWeight: 40 },
  { name: 'Chauve-Souris', rarity: 'COMMON', dropWeight: 40 },
  { name: 'Lézard', rarity: 'COMMON', dropWeight: 40 },
  { name: 'Crabe', rarity: 'COMMON', dropWeight: 40 },
  { name: 'Guêpe', rarity: 'COMMON', dropWeight: 40 },
  { name: 'Escargot', rarity: 'COMMON', dropWeight: 40 },
  // UNCOMMON — dropWeight 20 chacune
  { name: 'Chevalier', rarity: 'UNCOMMON', dropWeight: 20 },
  { name: 'Mage', rarity: 'UNCOMMON', dropWeight: 20 },
  { name: 'Archer', rarity: 'UNCOMMON', dropWeight: 20 },
  { name: 'Druide', rarity: 'UNCOMMON', dropWeight: 20 },
  { name: 'Paladin', rarity: 'UNCOMMON', dropWeight: 20 },
  // RARE — dropWeight 8 chacune
  { name: 'Dragon Vert', rarity: 'RARE', dropWeight: 8 },
  { name: 'Phénix', rarity: 'RARE', dropWeight: 8 },
  { name: 'Liche', rarity: 'RARE', dropWeight: 8 },
  // EPIC — dropWeight 3 chacune
  { name: 'Dragon Rouge', rarity: 'EPIC', dropWeight: 3 },
  { name: 'Titan de Fer', rarity: 'EPIC', dropWeight: 3 },
  // LEGENDARY — dropWeight 1
  { name: 'Azéros, Dieu-Guerrier', rarity: 'LEGENDARY', dropWeight: 1 },
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
    const slug = card.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    await tx.card.create({
      data: {
        setId: set.id,
        name: card.name,
        imageUrl: `/placeholder/${slug}.jpg`,
        rarity: card.rarity,
        dropWeight: card.dropWeight,
      },
    })
  }

  console.log(`  CardSet "${set.name}" + ${CARDS.length} cartes créées`)
}
