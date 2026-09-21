// back/src/test/e2e/admin-i18n.e2e.test.ts
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../helpers/build-test-app'

describe('administration bilingue', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookie: string
  const suffix = Date.now()
  const email = `i18nadmin${suffix}@test.com`

  beforeAll(async () => {
    app = await buildTestApp()
    // Aucun helper d'authentification admin n'existe dans ce dépôt : motif
    // repris de src/test/e2e/admin/admin-achievements.test.ts (lignes 17-25) —
    // inscription, passage en SUPER_ADMIN via Prisma, connexion.
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `i18nadmin${suffix}`, email, password: 'Password123!' },
    })
    await app.iocContainer.postgresOrm.prisma.user.update({
      where: { email },
      data: { role: 'SUPER_ADMIN', emailVerifiedAt: new Date() },
    })
    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'Password123!' },
    })
    cookie = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('crée un set avec ses deux langues', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/sets',
      headers: { cookie },
      payload: {
        nameFr: 'Bêtes légendaires',
        nameEn: 'Legendary beasts',
        descriptionFr: 'Les créatures les plus rares.',
        descriptionEn: 'The rarest creatures.',
      },
    })
    expect(res.statusCode).toBe(201)
  })

  it('refuse une création sans la langue anglaise', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/admin/sets',
      headers: { cookie },
      payload: { nameFr: 'Sans anglais' },
    })
    expect(res.statusCode).toBe(400)
  })

  it("corrige une seule langue sans écraser l'autre lors d'une mise à jour partielle", async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/admin/sets',
      headers: { cookie },
      payload: { nameFr: 'Titre original FR', nameEn: 'Original title EN' },
    })
    expect(created.statusCode).toBe(201)
    const setId = created.json().id as string

    const patched = await app.inject({
      method: 'PATCH',
      url: `/admin/sets/${setId}`,
      headers: { cookie },
      payload: { nameFr: 'Titre corrigé FR' },
    })
    expect(patched.statusCode).toBe(200)

    const row = await app.iocContainer.postgresOrm.prisma.cardSet.findUniqueOrThrow(
      { where: { id: setId } },
    )
    expect(row.nameFr).toBe('Titre corrigé FR')
    // L'anglais n'a PAS été envoyé dans le PATCH : il ne doit pas être écrasé
    // par `undefined`. C'est exactement la perte de données que l'ancien
    // pont d'écriture mono-langue évitait — cette assertion vérifie que sa
    // suppression (tâche 10) n'a pas réintroduit le problème.
    expect(row.nameEn).toBe('Original title EN')
  })

  it('liste les traductions manquantes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/translations/missing',
      headers: { cookie },
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json().entries)).toBe(true)
  })
})
