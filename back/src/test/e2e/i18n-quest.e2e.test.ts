import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { runWithLocale } from '../../main/infra/i18n/locale-context'
import { buildTestApp } from '../helpers/build-test-app'

describe('localisation du contenu — Quest', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  // biome-ignore lint/suspicious/noExplicitAny: le cradle n'est pas typé sur l'instance Fastify
  let prisma: any

  beforeAll(async () => {
    app = await buildTestApp()
    // biome-ignore lint/suspicious/noExplicitAny: idem
    prisma = (app as any).iocContainer.postgresOrm.prisma

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
})
