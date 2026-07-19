import bcrypt from 'bcrypt'

import type { PrismaClient } from '../../src/generated/client'

const SALT_ROUNDS = 10

// Mot de passe commun pour le dev : Password123!
const DEV_PASSWORD = 'Password123!'

// Clé API fixe recréée à chaque seed — doit rester identique à celle du
// script npm `prisma:seed` (back/package.json) qui enchaîne l'import des cartes
const IMPORT_CARDS_API_KEY =
  'gp_0b598bdc94b6247e86cad4646fe11a110ba530c9079bdaba940971106ca1abd0'

export async function seedUsers(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
) {
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
