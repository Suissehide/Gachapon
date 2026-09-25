import bcrypt from 'bcrypt'

import type { PrismaClient } from '../../src/generated/client'

const SALT_ROUNDS = 10

// Mot de passe commun pour le dev : Password123!
const DEV_PASSWORD = 'Password123!'

// Clé API fixe recréée à chaque seed — doit rester identique à celle du
// script npm `prisma:seed` (back/package.json) qui enchaîne l'import des cartes
const IMPORT_CARDS_API_KEY =
  'gp_0b598bdc94b6247e86cad4646fe11a110ba530c9079bdaba940971106ca1abd0'

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

// Prod : SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD définis → un seul SUPER_ADMIN
// avec ces identifiants, ni comptes de démo, ni équipe, ni clé API (le mot de
// passe et la clé ci-dessus sont publics dans le dépôt). La clé d'import se
// crée ensuite depuis l'UI, une fois connecté.
export async function seedUsers(tx: Tx) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL
  const adminPassword = process.env.SEED_ADMIN_PASSWORD

  if (adminEmail || adminPassword) {
    return { admin: await seedProdAdmin(tx, adminEmail, adminPassword) }
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NODE_ENV=production : SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD sont requis (refus de créer les comptes de démo)',
    )
  }

  return seedDevUsers(tx)
}

async function seedProdAdmin(
  tx: Tx,
  email: string | undefined,
  password: string | undefined,
) {
  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD vont ensemble')
  }
  if (password.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD doit faire au moins 12 caractères')
  }

  const admin = await tx.user.create({
    data: {
      username: process.env.SEED_ADMIN_USERNAME ?? 'admin',
      email,
      passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
      emailVerifiedAt: new Date(),
      role: 'SUPER_ADMIN',
    },
  })

  console.log(`  SUPER_ADMIN "${admin.username}" créé (${admin.email})`)
  return admin
}

async function seedDevUsers(tx: Tx) {
  const hash = await bcrypt.hash(DEV_PASSWORD, SALT_ROUNDS)

  // Super admin
  const admin = await tx.user.create({
    data: {
      username: 'admin',
      email: 'admin@gachapon.dev',
      passwordHash: hash,
      emailVerifiedAt: new Date(),
      role: 'SUPER_ADMIN',
      tokens: 9999,
      dust: 99999,
      level: 99,
      xp: 999999,
      skillPoints: 99,
    },
  })

  await tx.apiKey.create({
    data: {
      key: IMPORT_CARDS_API_KEY,
      name: 'local-import-cards',
      userId: admin.id,
    },
  })
  console.log(`  Clé API "local-import-cards" créée pour admin`)

  // Owner de l'équipe commune
  const owner = await tx.user.create({
    data: {
      username: 'captain',
      email: 'captain@gachapon.dev',
      passwordHash: hash,
      emailVerifiedAt: new Date(),
      tokens: 50,
      dust: 1200,
      level: 5,
      xp: 4200,
      skillPoints: 5,
    },
  })

  // Membres réguliers
  const alice = await tx.user.create({
    data: {
      username: 'alice',
      email: 'alice@gachapon.dev',
      passwordHash: hash,
      emailVerifiedAt: new Date(),
      tokens: 20,
      dust: 300,
      level: 2,
      xp: 800,
      skillPoints: 2,
    },
  })

  const bob = await tx.user.create({
    data: {
      username: 'bob',
      email: 'bob@gachapon.dev',
      passwordHash: hash,
      emailVerifiedAt: new Date(),
      tokens: 10,
      dust: 150,
      level: 1,
      xp: 200,
      skillPoints: 1,
    },
  })

  console.log(`  4 utilisateurs créés (admin, captain, alice, bob)`)

  // Équipe commune
  const team = await tx.team.create({
    data: {
      name: 'Les Pionniers',
      slug: 'les-pionniers',
      description: "L'équipe fondatrice du Gachapon.",
      ownerId: owner.id,
    },
  })

  await tx.teamMember.createMany({
    data: [
      { teamId: team.id, userId: owner.id, role: 'OWNER' },
      { teamId: team.id, userId: alice.id, role: 'MEMBER' },
      { teamId: team.id, userId: bob.id, role: 'MEMBER' },
    ],
  })

  console.log(
    `  Équipe "${team.name}" créée avec 3 membres (captain, alice, bob)`,
  )
  console.log(`  Identifiants dev : login=<username> password=${DEV_PASSWORD}`)

  return { admin, owner, alice, bob }
}
