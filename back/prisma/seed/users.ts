import bcrypt from 'bcrypt'

import type { PrismaClient } from '../../src/generated/client'

const SALT_ROUNDS = 10

// Mot de passe commun pour le dev : Password123!
const DEV_PASSWORD = 'Password123!'

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
      role: 'SUPER_ADMIN',
      tokens: 9999,
      dust: 99999,
      level: 99,
      xp: 999999,
    },
  })

  // Owner de l'équipe commune
  const owner = await tx.user.create({
    data: {
      username: 'captain',
      email: 'captain@gachapon.dev',
      passwordHash: hash,
      tokens: 50,
      dust: 1200,
      level: 5,
      xp: 4200,
    },
  })

  // Membres réguliers
  const alice = await tx.user.create({
    data: {
      username: 'alice',
      email: 'alice@gachapon.dev',
      passwordHash: hash,
      tokens: 20,
      dust: 300,
      level: 2,
      xp: 800,
    },
  })

  const bob = await tx.user.create({
    data: {
      username: 'bob',
      email: 'bob@gachapon.dev',
      passwordHash: hash,
      tokens: 10,
      dust: 150,
      level: 1,
      xp: 200,
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
