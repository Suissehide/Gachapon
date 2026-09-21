import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { serializerCompiler } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { runWithLocale } from '../../main/infra/i18n/locale-context'
import { buildTestApp } from '../helpers/build-test-app'

/**
 * Tâche 5 — les deux vérifications que `Quest` ne pouvait pas couvrir.
 *
 * 1. LE TRI (spec §4.7). Le champ `name` de `localized.extension.ts` est
 *    assemblé en JS APRÈS la requête : Postgres ne le connaît pas et ne sait
 *    pas trier dessus. Un `ORDER BY` doit donc viser `nameFr` ou `nameEn`
 *    selon la locale demandée (`localizedNameOrder()`). Sans ça l'ordre
 *    alphabétique reste figé sur le français quelle que soit la langue.
 *
 * 2. LA SÉRIALISATION D'UN OBJET PRISMA RENDU TEL QUEL. `quests.domain.ts`
 *    matérialise un objet ordinaire (`{ name: q.name, … }`) avant que la
 *    réponse ne soit sérialisée : le champ calculé y est déjà résolu, donc
 *    ce chemin ne prouve rien sur la sérialisation elle-même. `GET /sets`
 *    rend l'objet Prisma DIRECTEMENT — c'est le cas représentatif, et il ne
 *    marche que si le champ calculé est énumérable.
 *
 * `CardSet` sert les deux : c'est le seul des douze modèles dont une route
 * publie les lignes sans les recopier.
 */
describe('localisation du contenu — CardSet (tri et sérialisation)', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  // biome-ignore lint/suspicious/noExplicitAny: le cradle n'est pas typé sur l'instance Fastify
  let prisma: any
  let cookies: string
  let userId: string

  // Deux jeux dont les ordres alphabétiques FR et EN sont EXACTEMENT
  // inverses. Préfixes ASCII (`AAA`/`ZZZ`) à dessein : l'assertion ne doit
  // pas dépendre de la collation Postgres de la base de test.
  const suffix = Date.now()
  const alphaFr = `ZZZ-i18n-un-${suffix}`
  const alphaEn = `AAA-i18n-one-${suffix}`
  const betaFr = `AAA-i18n-deux-${suffix}`
  const betaEn = `ZZZ-i18n-two-${suffix}`
  const holeFr = `MMM-i18n-repli-${suffix}`

  let alphaId: string
  let betaId: string
  let holeId: string

  const email = `i18nsets${suffix}@test.com`
  const username = `i18nsets${suffix}`
  const password = 'Password123!'

  beforeAll(async () => {
    app = await buildTestApp()
    // biome-ignore lint/suspicious/noExplicitAny: idem
    prisma = (app as any).iocContainer.postgresOrm.prisma

    const alpha = await prisma.cardSet.create({
      data: { nameFr: alphaFr, nameEn: alphaEn, isActive: true },
    })
    alphaId = alpha.id
    const beta = await prisma.cardSet.create({
      data: { nameFr: betaFr, nameEn: betaEn, isActive: true },
    })
    betaId = beta.id
    // Trou de traduction : `nameEn` vide, `descriptionFr/En` nuls des deux
    // côtés — les deux seules colonnes de `CardSet` restées nullable.
    const hole = await prisma.cardSet.create({
      data: {
        nameFr: holeFr,
        nameEn: '',
        descriptionFr: null,
        descriptionEn: null,
        isActive: true,
      },
    })
    holeId = hole.id

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
    await prisma.cardSet.deleteMany({
      where: { id: { in: [alphaId, betaId, holeId] } },
    })
    await prisma.user.delete({ where: { id: userId } })
    await app.close()
  })

  /** Les sets servis par `GET /sets`, dans l'ordre rendu par la route. */
  const fetchSets = async (headers: Record<string, string>) => {
    const res = await app.inject({
      method: 'GET',
      url: '/sets',
      headers: { ...headers, cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    return res.json().sets as { id: string; name: string }[]
  }

  it('sert le nom du set dans la langue demandée, objet Prisma rendu tel quel', async () => {
    const byId = (sets: { id: string; name: string }[], id: string) =>
      sets.find((s) => s.id === id)

    const fr = await fetchSets({ 'accept-language': 'fr-FR,fr;q=0.9' })
    expect(byId(fr, alphaId)?.name).toBe(alphaFr)

    const en = await fetchSets({ 'accept-language': 'en' })
    expect(byId(en, alphaId)?.name).toBe(alphaEn)

    // Sans en-tête : DEFAULT_LOCALE, donc l'anglais.
    const none = await fetchSets({})
    expect(byId(none, alphaId)?.name).toBe(alphaEn)
  })

  it('se replie sur le français à travers HTTP quand `nameEn` est vide', async () => {
    const en = await fetchSets({ 'accept-language': 'en' })
    const hole = en.find((s) => s.id === holeId)
    // Jamais une chaîne vide : le repli est asymétrique et voulu.
    expect(hole?.name).toBe(holeFr)
  })

  it('trie les sets selon la langue demandée', async () => {
    // On ne compare pas la liste entière : les autres fichiers e2e laissent
    // leurs propres sets actifs dans la base partagée. Seule compte la
    // position RELATIVE des deux sondes, dont les ordres FR et EN sont
    // inverses par construction.
    const positions = (sets: { id: string }[]) => [
      sets.findIndex((s) => s.id === alphaId),
      sets.findIndex((s) => s.id === betaId),
    ]

    const [frAlpha, frBeta] = positions(
      await fetchSets({ 'accept-language': 'fr-FR,fr;q=0.9' }),
    )
    const [enAlpha, enBeta] = positions(await fetchSets({ 'accept-language': 'en' }))

    expect(frAlpha).toBeGreaterThanOrEqual(0)
    expect(frBeta).toBeGreaterThanOrEqual(0)

    // FR : `AAA-i18n-deux` (beta) avant `ZZZ-i18n-un` (alpha).
    expect(frBeta).toBeLessThan(frAlpha)
    // EN : `AAA-i18n-one` (alpha) avant `ZZZ-i18n-two` (beta) — l'inverse.
    expect(enAlpha).toBeLessThan(enBeta)
  })

  // La « jambe Zod » : les routes de ce dépôt qui rendent une ligne
  // localisée telle quelle (`GET /sets`, `GET /admin/achievements`,
  // `GET /admin/raid/bosses`) n'ont PAS encore de schéma de réponse — c'est
  // la tâche 10 qui doit les en doter. Le test ci-dessus couvre donc le
  // sérialiseur réellement en place (JSON.stringify de Fastify). Celui-ci
  // couvre l'AUTRE sérialiseur, celui que la tâche 10 va brancher, en
  // passant par le `serializerCompiler` exact de `fastify-type-provider-zod`
  // monté dans `fastify-http-server.ts` : un champ calculé doit traverser
  // `z.object({ name: z.string() })` sans être perdu ni vidé.
  it('traverse le sérialiseur Zod des réponses', async () => {
    const responseSchema = z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      isActive: z.boolean(),
    })
    const serialize = serializerCompiler({
      // biome-ignore lint/suspicious/noExplicitAny: le compilateur n'attend qu'un `schema`
      schema: responseSchema,
    } as any)

    const payload = await runWithLocale('FR', async () => {
      const set = await prisma.cardSet.findUniqueOrThrow({
        where: { id: alphaId },
      })
      return JSON.parse(serialize(set))
    })
    expect(payload.name).toBe(alphaFr)
    expect(payload.description).toBeNull()

    const inEnglish = await runWithLocale('EN', async () => {
      const set = await prisma.cardSet.findUniqueOrThrow({
        where: { id: alphaId },
      })
      return JSON.parse(serialize(set))
    })
    expect(inEnglish.name).toBe(alphaEn)

    // Le schéma ne déclare pas les colonnes brutes : Zod les retire, donc
    // aucune réponse ainsi typée ne fuit `nameFr`/`nameEn` au client.
    expect('nameFr' in inEnglish).toBe(false)
  })
})
