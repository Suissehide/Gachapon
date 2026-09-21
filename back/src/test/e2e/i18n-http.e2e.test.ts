import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import type { PostgresPrismaClient } from '../../main/infra/orm/postgres-client'
import { buildTestApp } from '../helpers/build-test-app'

/**
 * Vérifie que le hook `onRequest` posé par `localePlugin` (tâche 4) ouvre le
 * bon contexte de locale pour toute la requête HTTP.
 *
 * `Quest` est le seul modèle bilingue à ce stade (tâche 3). Aucune route
 * publique ne sert les quêtes — `/quests/public` n'existe pas — donc ce test
 * passe par la route authentifiée `/quests` avec le cookie d'un utilisateur
 * créé dans le `beforeAll`, sur le modèle de
 * `src/test/e2e/quests/quests-state.e2e.test.ts` (register → vérification
 * email → login).
 */
describe('locale de la requête HTTP', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: PostgresPrismaClient
  let cookies: string
  let userId: string

  const suffix = Date.now()
  const questKey = `i18n-http-probe-${suffix}`
  const email = `i18nhttp${suffix}@test.com`
  const username = `i18nhttp${suffix}`
  const password = 'Password123!'

  beforeAll(async () => {
    app = await buildTestApp()
    prisma = app.iocContainer.postgresOrm.prisma

    await prisma.quest.create({
      data: {
        key: questKey,
        nameFr: 'Créatures des profondeurs',
        nameEn: 'Deep-sea creatures',
        descriptionFr: 'Sonde de test.',
        descriptionEn: 'Test probe.',
        criterion: { event: 'GACHA_PULL', target: 1 },
      },
    })

    const regRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(regRes.statusCode).toBe(201)

    const user = await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    userId = user.id

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => {
    await prisma.userQuest.deleteMany({ where: { userId } })
    await prisma.quest.delete({ where: { key: questKey } })
    await prisma.user.delete({ where: { id: userId } })
    await app.close()
  })

  const questNames = async (headers: Record<string, string>, url = '/quests') => {
    const res = await app.inject({
      method: 'GET',
      url,
      headers: { ...headers, cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    return res.json().oneshot.map((q: { name: string }) => q.name)
  }

  it('sert l’anglais sans en-tête', async () => {
    expect(await questNames({})).toContain('Deep-sea creatures')
  })

  it('sert le français sur Accept-Language: fr', async () => {
    expect(
      await questNames({ 'accept-language': 'fr-FR,fr;q=0.9' }),
    ).toContain('Créatures des profondeurs')
  })

  it('laisse ?lang primer sur l’en-tête', async () => {
    const names = await questNames(
      { 'accept-language': 'fr-FR,fr;q=0.9' },
      '/quests?lang=en',
    )
    expect(names).toContain('Deep-sea creatures')
  })

  it('ignore un ?lang non géré et retombe sur l’en-tête', async () => {
    const names = await questNames(
      { 'accept-language': 'fr-FR,fr;q=0.9' },
      '/quests?lang=de',
    )
    expect(names).toContain('Créatures des profondeurs')
  })

  // Régression : le parseur de querystring de Fastify renvoie un tableau
  // pour un paramètre répété (`?lang=fr&lang=en` → `{ lang: ['fr', 'en'] }`).
  // Une assertion de type sans garde d'exécution laissait ce tableau
  // atteindre `parseLocale`, qui plantait sur `value.trim` — 500 sur
  // n'importe quelle route, sans authentification. Un `lang` répété doit
  // être traité comme absent : 200, et la langue servie est celle de
  // l'en-tête `Accept-Language`, pas une valeur prise arbitrairement dans
  // le tableau.
  it('ne plante pas sur un ?lang répété — retombe sur l’en-tête', async () => {
    const names = await questNames(
      { 'accept-language': 'fr-FR,fr;q=0.9' },
      '/quests?lang=fr&lang=en',
    )
    expect(names).toContain('Créatures des profondeurs')
  })
})
