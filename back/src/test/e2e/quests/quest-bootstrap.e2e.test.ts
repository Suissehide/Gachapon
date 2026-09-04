import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { QUEST_DEFINITIONS } from '../../../main/domain/quests/quest-definitions'
import { buildTestApp } from '../../helpers/build-test-app'

/**
 * `QuestsDomain.bootstrap()` est le seul chemin capable d'ajouter une quête à
 * une base déjà peuplée : `prisma/seed.ts` vide toutes les tables avant
 * d'écrire, il ne peut pas servir en production.
 *
 * Le bootstrap n'est délibérément PAS branché dans `buildTestApp` : il
 * remplirait le pool hebdo de 11 quêtes et `quest-progress.test.ts`, qui
 * suppose sa quête de test seule dans le pool, deviendrait aléatoire. Il est
 * donc appelé explicitement ici, puis nettoyé.
 */
describe('Bootstrap des quêtes e2e', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  // biome-ignore lint/suspicious/noExplicitAny: accès au cradle IoC comme les autres e2e
  let ioc: any
  const keys = QUEST_DEFINITIONS.map((q) => q.key)

  beforeAll(async () => {
    app = await buildTestApp()
    // biome-ignore lint/suspicious/noExplicitAny: idem
    ioc = (app as any).iocContainer
    await ioc.postgresOrm.prisma.quest.deleteMany({ where: { key: { in: keys } } })
  })

  afterAll(async () => {
    // Rendre la base à l'état où les autres suites l'attendent : un pool de
    // quêtes vide.
    const quests = await ioc.postgresOrm.prisma.quest.findMany({
      where: { key: { in: keys } },
      select: { rewardId: true },
    })
    await ioc.postgresOrm.prisma.quest.deleteMany({ where: { key: { in: keys } } })
    const rewardIds = quests
      .map((q: { rewardId: string | null }) => q.rewardId)
      .filter((id: string | null): id is string => id !== null)
    if (rewardIds.length > 0) {
      await ioc.postgresOrm.prisma.reward.deleteMany({
        where: { id: { in: rewardIds } },
      })
    }
  })

  it('crée toutes les quêtes définies sur une table vide', async () => {
    await ioc.questsDomain.bootstrap()

    const rows = await ioc.postgresOrm.prisma.quest.findMany({
      where: { key: { in: keys } },
      select: { key: true },
    })
    expect(rows.map((r: { key: string }) => r.key).sort()).toEqual([...keys].sort())
  })

  it('attache sa récompense à chaque quête créée', async () => {
    await ioc.questsDomain.bootstrap()

    const forgeron = await ioc.postgresOrm.prisma.quest.findUnique({
      where: { key: 'weekly_equip_levels_12' },
      include: { reward: true },
    })
    expect(forgeron.period).toBe('WEEKLY')
    expect(forgeron.criterion).toEqual({
      event: 'EQUIPMENT_UPGRADED',
      target: 12,
    })
    expect({
      tokens: forgeron.reward.tokens,
      dust: forgeron.reward.dust,
      xp: forgeron.reward.xp,
    }).toEqual({ tokens: 5, dust: 80, xp: 150 })
  })

  it('est idempotent — un second appel ne duplique rien', async () => {
    await ioc.questsDomain.bootstrap()
    await ioc.questsDomain.bootstrap()

    const count = await ioc.postgresOrm.prisma.quest.count({
      where: { key: { in: keys } },
    })
    expect(count).toBe(QUEST_DEFINITIONS.length)
  })

  // Create-only : une quête retouchée en base (renommée, désactivée, cible
  // ajustée à chaud) ne doit pas être écrasée au prochain redémarrage.
  it("n'écrase jamais une quête déjà en base", async () => {
    await ioc.questsDomain.bootstrap()
    await ioc.postgresOrm.prisma.quest.update({
      where: { key: 'weekly_equip_drops_12' },
      data: { name: 'Nom retouché à la main', isActive: false },
    })

    await ioc.questsDomain.bootstrap()

    const row = await ioc.postgresOrm.prisma.quest.findUnique({
      where: { key: 'weekly_equip_drops_12' },
    })
    expect(row.name).toBe('Nom retouché à la main')
    expect(row.isActive).toBe(false)
  })
})
