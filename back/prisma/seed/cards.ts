import type { PrismaClient } from '../../src/generated/client'

const CARDS = [
  // COMMON — dropWeight 40 chacune
  { name: 'Gobelin', rarity: 'COMMON', dropWeight: 40, imageKey: 'gobelin.png' },
  { name: 'Rat', rarity: 'COMMON', dropWeight: 40, imageKey: 'rat.png' },
  { name: 'Champignon', rarity: 'COMMON', dropWeight: 40, imageKey: 'champignon.png' },
  { name: 'Squelette', rarity: 'COMMON', dropWeight: 40, imageKey: 'squelette.png' },
  { name: 'Slime', rarity: 'COMMON', dropWeight: 40, imageKey: 'slime.png' },
  { name: 'Chauve-Souris', rarity: 'COMMON', dropWeight: 40, imageKey: 'chauve-souris.png' },
  { name: 'Lézard', rarity: 'COMMON', dropWeight: 40, imageKey: 'lezard.png' },
  { name: 'Crabe', rarity: 'COMMON', dropWeight: 40, imageKey: 'crabe.png' },
  { name: 'Guêpe', rarity: 'COMMON', dropWeight: 40, imageKey: 'guepe.png' },
  { name: 'Escargot', rarity: 'COMMON', dropWeight: 40, imageKey: 'escargot.png' },
  // UNCOMMON — dropWeight 20 chacune
  { name: 'Chevalier', rarity: 'UNCOMMON', dropWeight: 20, imageKey: 'chevalier.png' },
  { name: 'Mage', rarity: 'UNCOMMON', dropWeight: 20, imageKey: 'mage.png' },
  { name: 'Archer', rarity: 'UNCOMMON', dropWeight: 20, imageKey: 'archer.png' },
  { name: 'Druide', rarity: 'UNCOMMON', dropWeight: 20, imageKey: 'druide.png' },
  { name: 'Paladin', rarity: 'UNCOMMON', dropWeight: 20, imageKey: 'paladin.png' },
  // RARE — dropWeight 8 chacune
  { name: 'Dragon Vert', rarity: 'RARE', dropWeight: 8, imageKey: 'dragon-vert.png' },
  { name: 'Phénix', rarity: 'RARE', dropWeight: 8, imageKey: 'phenix.png' },
  { name: 'Liche', rarity: 'RARE', dropWeight: 8, imageKey: 'liche.png' },
  // EPIC — dropWeight 3 chacune
  { name: 'Dragon Rouge', rarity: 'EPIC', dropWeight: 3, imageKey: 'dragon--rouge.png' },
  { name: 'Titan de Fer', rarity: 'EPIC', dropWeight: 3, imageKey: 'titan-de-fer.png' },
  // LEGENDARY — dropWeight 1
  { name: 'Azéros, Dieu-Guerrier', rarity: 'LEGENDARY', dropWeight: 1, imageKey: 'azeros-dieu-guerrier.png' },
] as const

export async function seedCards(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {
  const baseUrl = `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET}/cards`

  const set = await tx.cardSet.create({
    data: {
      name: 'Alpha Warriors',
      description:
        'Le premier set du Gachapon. 21 guerriers à collectionner, dont des variantes rares.',
      isActive: true,
    },
  })

  for (const card of CARDS) {
    await tx.card.create({
      data: {
        setId: set.id,
        name: card.name,
        imageUrl: `${baseUrl}/${card.imageKey}`,
        rarity: card.rarity,
        dropWeight: card.dropWeight,
      },
    })
  }

  console.log(`  CardSet "${set.name}" + ${CARDS.length} cartes créées`)
}
