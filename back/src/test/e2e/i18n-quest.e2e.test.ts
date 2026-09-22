import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { z } from 'zod/v4'

import { runWithLocale } from '../../main/infra/i18n/locale-context'
import type { PostgresPrismaClient } from '../../main/infra/orm/postgres-client'
import type { IocContainer } from '../../main/types/application/ioc'
import { buildTestApp } from '../helpers/build-test-app'

describe('localisation du contenu — Quest', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: PostgresPrismaClient

  beforeAll(async () => {
    app = await buildTestApp()
    prisma = app.iocContainer.postgresOrm.prisma

    await prisma.quest.createMany({
      data: [
        {
          key: 'i18n-probe',
          nameFr: 'Première capsule',
          nameEn: 'First capsule',
          descriptionFr: 'Ouvre une capsule.',
          descriptionEn: 'Open one capsule.',
          criterion: { event: 'GACHA_PULL', target: 1 },
        },
        {
          key: 'i18n-hole',
          nameFr: 'Quête sans anglais',
          nameEn: '',
          descriptionFr: 'Description française.',
          descriptionEn: '',
          criterion: { event: 'GACHA_PULL', target: 1 },
        },
      ],
    })
  })

  afterAll(async () => {
    await prisma.quest.deleteMany({
      where: { key: { in: ['i18n-probe', 'i18n-hole'] } },
    })
    await app.close()
  })

  // Le champ `name`/`description` de l'extension est un accesseur PARESSEUX
  // (calculé à la première lecture, voir localized.extension.ts) : il doit
  // donc être lu à l'intérieur du même contexte asynchrone que celui posé par
  // `runWithLocale`, exactement comme en production le hook `onRequest`
  // (tâche 4, `enterLocale`) englobe toute la suite de la requête — handler
  // ET sérialisation de la réponse. Lire `quest.name` après le `await` qui
  // fait sortir de `runWithLocale(...)` retomberait sur `DEFAULT_LOCALE`, un
  // détail d'AsyncLocalStorage (`run()` ne couvre que les continuations
  // *initiées* depuis son callback) et non un défaut du mécanisme lui-même —
  // vérifié isolément (hors Prisma) avant d'ajuster ce test.
  it('sert le nom dans la locale du contexte', async () => {
    const inFrench = await runWithLocale('FR', async () => {
      const quest = await prisma.quest.findUniqueOrThrow({
        where: { key: 'i18n-probe' },
      })
      return { name: quest.name, description: quest.description }
    })
    expect(inFrench.name).toBe('Première capsule')
    expect(inFrench.description).toBe('Ouvre une capsule.')

    const inEnglish = await runWithLocale('EN', async () => {
      const quest = await prisma.quest.findUniqueOrThrow({
        where: { key: 'i18n-probe' },
      })
      return { name: quest.name, description: quest.description }
    })
    expect(inEnglish.name).toBe('First capsule')
    expect(inEnglish.description).toBe('Open one capsule.')
  })

  it('se replie sur l’autre langue quand la traduction est vide', async () => {
    const read = await runWithLocale('EN', async () => {
      const quest = await prisma.quest.findUniqueOrThrow({
        where: { key: 'i18n-hole' },
      })
      return { name: quest.name, description: quest.description }
    })
    expect(read.name).toBe('Quête sans anglais')
    expect(read.description).toBe('Description française.')
  })

  it('survit à la sérialisation JSON et à l’étalement', async () => {
    const { spread, json } = await runWithLocale('EN', async () => {
      const quest = await prisma.quest.findUniqueOrThrow({
        where: { key: 'i18n-probe' },
      })
      // Le champ calculé doit être énumérable : sans cela toute réponse
      // construite par étalement (`{ ...quest }`) perdrait `name`.
      return {
        spread: { ...quest },
        json: JSON.parse(JSON.stringify(quest)),
      }
    })
    expect(json.name).toBe('First capsule')
    expect(spread.name).toBe('First capsule')
  })

  // Contrat de l'extension Prisma, pas un bug : un champ calculé du
  // `result` de `Prisma.defineExtension` est un accesseur qui s'exécute à
  // la PREMIÈRE lecture et fige sa valeur sur cet objet précis — il ne
  // relit pas `getCurrentLocale()` aux lectures suivantes. Prouvé ici
  // isolément (un seul objet, deux locales) pour qu'aucune tâche future ne
  // suppose l'inverse — c'est exactement ce qui a rendu obligatoire le
  // clé-age par locale du cache process-level de `QuestsDomain` (voir
  // `quests.domain.ts`, section suivante de ce fichier).
  it('mémorise la valeur au premier accès — ne se recalcule pas si la locale change ensuite', async () => {
    const quest = await prisma.quest.findUniqueOrThrow({
      where: { key: 'i18n-probe' },
    })

    const firstRead = runWithLocale('FR', () => quest.name)
    expect(firstRead).toBe('Première capsule')

    // Même objet, locale différente : la valeur ne bouge pas.
    const secondRead = runWithLocale('EN', () => quest.name)
    expect(secondRead).toBe('Première capsule')

    // Contrôle : un objet FRAÎCHEMENT lu sous EN donne bien l'anglais — ce
    // n'est donc pas la locale qui est ignorée globalement, seulement la
    // mémorisation par objet qui empêche un second calcul.
    const freshQuest = await prisma.quest.findUniqueOrThrow({
      where: { key: 'i18n-probe' },
    })
    const controlRead = runWithLocale('EN', () => freshQuest.name)
    expect(controlRead).toBe('First capsule')
  })

  // Jambe Zod du trépied (extension Prisma / AsyncLocalStorage / Zod) :
  // aucun des trois tests précédents ne l'exerçait, ils lisent `.name`
  // directement. `fastify-type-provider-zod` sérialise les réponses via un
  // `z.object(...).parse(...)` — ce test le reproduit sans passer par
  // Fastify, pour prouver que le champ calculé traverse bien un schéma Zod
  // comme une string ordinaire (c'est le même parcours que les tâches 5 et
  // 6 emprunteront pour Card, CardSet, etc.).
  it('traverse un schéma Zod comme une string ordinaire', async () => {
    const questResponseSchema = z.object({
      key: z.string(),
      name: z.string(),
      description: z.string(),
    })

    const parsed = await runWithLocale('FR', async () => {
      const quest = await prisma.quest.findUniqueOrThrow({
        where: { key: 'i18n-probe' },
      })
      return questResponseSchema.parse(quest)
    })

    expect(parsed.name).toBe('Première capsule')
    expect(parsed.description).toBe('Ouvre une capsule.')
  })
})

// ---------------------------------------------------------------------------
// Cache de QuestsDomain — clé par locale
// ---------------------------------------------------------------------------
//
// `QuestsDomain` est un singleton Awilix : son cache process-level (TTL
// 60 s, voir la doc de module de `quests.domain.ts`) survit entre requêtes
// et entre utilisateurs. Comme les objets Quest qu'il met en cache
// mémorisent `.name`/`.description` à la première lecture (voir le test
// ci-dessus), une clé de cache qui ignore la locale figerait la langue du
// premier appelant pour tous les autres pendant jusqu'à 60 s — une fuite de
// locale entre joueurs. La clé doit donc être `${locale}:${periodKey}`, pas
// `periodKey` seul.
//
// Tant que la tâche 4 (hook `onRequest` posant la locale par requête) n'est
// pas là, ce test appelle directement `QuestsDomain.getStateForUser` dans
// deux `runWithLocale` différents plutôt que de passer par `GET /quests`
// avec un en-tête `Accept-Language`.
describe('cache de QuestsDomain — clé par locale', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let ioc: IocContainer
  let userId: string
  const suffix = Date.now()
  const questKey = `i18n-cache-probe-${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    ioc = app.iocContainer

    await ioc.postgresOrm.prisma.quest.create({
      data: {
        key: questKey,
        nameFr: 'Nom français du cache',
        nameEn: 'Cache English name',
        descriptionFr: 'Description française du cache.',
        descriptionEn: 'Cache English description.',
        criterion: { event: 'GACHA_PULL', target: 1 },
        period: 'ONESHOT',
        isActive: true,
      },
    })

    const email = `i18ncache${suffix}@test.com`
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `i18ncache${suffix}`, email, password: 'Password123!' },
    })
    expect(res.statusCode).toBe(201)
    const user = await ioc.postgresOrm.prisma.user.findUniqueOrThrow({
      where: { email },
    })
    userId = user.id
  })

  afterAll(async () => {
    await ioc.postgresOrm.prisma.userQuest.deleteMany({ where: { userId } })
    await ioc.postgresOrm.prisma.quest.deleteMany({ where: { key: questKey } })
    await app.close()
  })

  it("la deuxième lecture sous une autre locale n'hérite pas de la langue mise en cache par la première", async () => {
    const stateFr = await runWithLocale('FR', () =>
      ioc.questsDomain.getStateForUser(userId),
    )
    const itemFr = stateFr.oneshot.find(
      (q: { key: string }) => q.key === questKey,
    )
    expect(itemFr?.name).toBe('Nom français du cache')

    const stateEn = await runWithLocale('EN', () =>
      ioc.questsDomain.getStateForUser(userId),
    )
    const itemEn = stateEn.oneshot.find(
      (q: { key: string }) => q.key === questKey,
    )
    // Avant le clé-age du cache par locale, cet appel aurait renvoyé « Nom
    // français du cache » : servi depuis le cache process-level chargé par
    // l'appel FR ci-dessus, ses objets Quest mémorisés à « FR » pour les
    // 60 s suivantes.
    expect(itemEn?.name).toBe('Cache English name')
  })
})
