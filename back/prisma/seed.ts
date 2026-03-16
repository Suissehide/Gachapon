import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/client'
import { config } from 'dotenv'

// Load .env then .env.local (local overrides)
config()
config({ path: '.env.local' })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const CARDS = [
  // COMMON — dropWeight 40 chacune
  { name: 'Gobelin',    rarity: 'COMMON',    dropWeight: 40, variant: null },
  { name: 'Rat',        rarity: 'COMMON',    dropWeight: 40, variant: null },
  { name: 'Champignon', rarity: 'COMMON',    dropWeight: 40, variant: null },
  { name: 'Squelette',  rarity: 'COMMON',    dropWeight: 40, variant: null },
  { name: 'Slime',      rarity: 'COMMON',    dropWeight: 40, variant: null },
  { name: 'Chauve-Souris', rarity: 'COMMON', dropWeight: 40, variant: null },
  { name: 'Lézard',     rarity: 'COMMON',    dropWeight: 40, variant: null },
  { name: 'Crabe',      rarity: 'COMMON',    dropWeight: 40, variant: null },
  { name: 'Guêpe',      rarity: 'COMMON',    dropWeight: 40, variant: null },
  { name: 'Escargot',   rarity: 'COMMON',    dropWeight: 40, variant: null },
  // UNCOMMON — dropWeight 20 chacune
  { name: 'Chevalier',  rarity: 'UNCOMMON',  dropWeight: 20, variant: null },
  { name: 'Mage',       rarity: 'UNCOMMON',  dropWeight: 20, variant: null },
  { name: 'Archer',     rarity: 'UNCOMMON',  dropWeight: 20, variant: null },
  { name: 'Druide',     rarity: 'UNCOMMON',  dropWeight: 20, variant: null },
  { name: 'Paladin',    rarity: 'UNCOMMON',  dropWeight: 20, variant: null },
  // RARE — dropWeight 8 chacune
  { name: 'Dragon Vert', rarity: 'RARE',     dropWeight: 8,  variant: null },
  { name: 'Phénix',      rarity: 'RARE',     dropWeight: 8,  variant: null },
  { name: 'Liche',       rarity: 'RARE',     dropWeight: 8,  variant: null },
  // EPIC — dropWeight 3 chacune
  { name: 'Dragon Rouge', rarity: 'EPIC',    dropWeight: 3,  variant: null },
  { name: 'Titan de Fer', rarity: 'EPIC',    dropWeight: 3,  variant: null },
  // LEGENDARY — dropWeight 1
  { name: 'Azéros, Dieu-Guerrier', rarity: 'LEGENDARY', dropWeight: 1, variant: null },
  // Variants RARE (BRILLIANT = 15% du poids RARE, HOLOGRAPHIC = 5%)
  { name: 'Dragon Vert Brillant',  rarity: 'RARE', dropWeight: 1.2, variant: 'BRILLIANT' },
  { name: 'Phénix Holographique',  rarity: 'RARE', dropWeight: 0.4, variant: 'HOLOGRAPHIC' },
  // Variant LEGENDARY
  { name: 'Azéros Holographique',  rarity: 'LEGENDARY', dropWeight: 0.05, variant: 'HOLOGRAPHIC' },
] as const

async function main() {
  console.log('Seeding database…')

  // Nettoyage (ordre respectant les FK)
  await prisma.gachaPull.deleteMany()
  await prisma.userCard.deleteMany()
  await prisma.card.deleteMany()
  await prisma.cardSet.deleteMany()

  const set = await prisma.cardSet.create({
    data: {
      name: 'Alpha Warriors',
      description: 'Le premier set du Gachapon. 21 guerriers à collectionner, dont des variantes rares.',
      isActive: true,
    },
  })
  console.log(`Created CardSet: ${set.name} (${set.id})`)

  for (const card of CARDS) {
    const slug = card.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    await prisma.card.create({
      data: {
        setId: set.id,
        name: card.name,
        imageUrl: `/placeholder/${slug}.jpg`,
        rarity: card.rarity,
        variant: card.variant ?? null,
        dropWeight: card.dropWeight,
      },
    })
  }
  console.log(`Created ${CARDS.length} cards.`)
  console.log('Seed done.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
