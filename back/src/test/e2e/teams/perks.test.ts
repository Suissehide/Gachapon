import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

/**
 * E2E : les routes de l'arbre de bonus (task 6, refonte équipe).
 *
 * `TeamProgressionDomain.spendPerkPoint` / `.resetPerks` possèdent déjà
 * TOUTES les règles (les quatre refus, la permission chef/officier vs.
 * chef seul, la transaction sérialisable) — ce fichier ne teste donc pas le
 * domaine mais que les routes les exposent fidèlement : bon code HTTP,
 * message exact, et que le corps de réponse (pas la valeur de retour du
 * domaine) porte bien les champs attendus une fois passé par le schéma Zod.
 *
 * `/auth/register` est limité à 5 comptes / 15 min par instance Fastify :
 * seuls les trois acteurs qui doivent authentifier une requête (chef,
 * officier, membre simple) sont enregistrés. L'équipe elle-même est créée
 * directement en base, sur le modèle de `makeTeam` dans
 * `team-perk-forge.test.ts` / `progression.test.ts`.
 */
describe('Routes des bonus d\'équipe', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any

  let cookiesLeader: string
  let cookiesOfficer: string
  let cookiesMember: string
  let leaderId: string
  let officerId: string
  let memberId: string
  let teamId: string

  let lootMaxRank: number
  let raidMaxRank: number
  let lootUnlockLevel: number
  let forgeUnlockLevel: number

  const suffix = Date.now()
  const password = 'Password123!'

  async function registerAndLogin(tag: string) {
    const email = `tperk${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `tperk${tag}${suffix}`, email, password },
    })
    expect(reg.statusCode).toBe(201)
    await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    const user = await prisma.user.findUnique({ where: { email } })
    return {
      userId: user.id as string,
      cookies: login.headers['set-cookie'] as string,
    }
  }

  /** Fixe l'état exact avant chaque cas : niveau, points, et rangs. */
  async function setTeamState(
    level: number,
    perkPoints: number,
    ranks: Partial<Record<'loot' | 'raid' | 'xp' | 'forge', number>> = {},
  ) {
    await prisma.team.update({
      where: { id: teamId },
      data: { level, xp: 0, perkPoints },
    })
    await prisma.teamPerk.deleteMany({ where: { teamId } })
    for (const [key, rank] of Object.entries(ranks)) {
      await prisma.teamPerk.create({ data: { teamId, key, rank } })
    }
  }

  function spend(cookies: string, key: string) {
    return app.inject({
      method: 'POST',
      url: `/teams/${teamId}/perks`,
      headers: { cookie: cookies },
      payload: { key },
    })
  }

  function reset(cookies: string) {
    return app.inject({
      method: 'POST',
      url: `/teams/${teamId}/perks/reset`,
      headers: { cookie: cookies },
    })
  }

  beforeAll(async () => {
    app = await buildTestApp()
    const container = (app as any).iocContainer
    prisma = container.postgresOrm.prisma
    configService = container.configService

    const cfg = await configService.getMany(
      'teamPerk.loot.maxRank',
      'teamPerk.raid.maxRank',
      'teamPerk.loot.unlockLevel',
      'teamPerk.forge.unlockLevel',
    )
    lootMaxRank = cfg['teamPerk.loot.maxRank']
    raidMaxRank = cfg['teamPerk.raid.maxRank']
    lootUnlockLevel = cfg['teamPerk.loot.unlockLevel']
    forgeUnlockLevel = cfg['teamPerk.forge.unlockLevel']
    // Le cas « verrouillé par le niveau » n'a de sens que si `forge` se
    // débloque STRICTEMENT après le niveau 1 auquel `loot` (et l'équipe à sa
    // création) sont déjà. Une dérive de config qui l'alignerait rendrait ce
    // test caduc en silence — on préfère le faire échouer bruyamment.
    expect(forgeUnlockLevel).toBeGreaterThan(1)
    expect(lootUnlockLevel).toBeLessThanOrEqual(1)

    const leader = await registerAndLogin('Leader')
    const officer = await registerAndLogin('Officer')
    const member = await registerAndLogin('Member')
    leaderId = leader.userId
    officerId = officer.userId
    memberId = member.userId
    cookiesLeader = leader.cookies
    cookiesOfficer = officer.cookies
    cookiesMember = member.cookies

    const team = await prisma.team.create({
      data: {
        name: `TeamPerks${suffix}`,
        slug: `team-perks-${suffix}`,
        ownerId: leaderId,
      },
    })
    teamId = team.id

    await prisma.teamMember.createMany({
      data: [
        { teamId, userId: leaderId, role: 'OWNER' },
        { teamId, userId: officerId, role: 'ADMIN' },
        { teamId, userId: memberId, role: 'MEMBER' },
      ],
    })
  })

  afterAll(async () => {
    await app.close()
  })

  it('un membre simple ne peut pas investir de point -> 403', async () => {
    await setTeamState(999, 1)
    const res = await spend(cookiesMember, 'loot')
    expect(res.statusCode).toBe(403)
    expect(res.json().message).toBe(
      'Seuls le chef et les officiers peuvent investir les points.',
    )
  })

  it('sans point disponible -> 409', async () => {
    await setTeamState(999, 0)
    const res = await spend(cookiesLeader, 'loot')
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Aucun point de bonus disponible.')
  })

  it('un bonus verrouillé par le niveau -> 409, message citant le niveau', async () => {
    await setTeamState(1, 1)
    const res = await spend(cookiesLeader, 'forge')
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe(
      `Ce bonus se débloque au niveau ${forgeUnlockLevel}.`,
    )
  })

  it('un bonus déjà au rang maximum -> 409', async () => {
    await setTeamState(999, 1, { loot: lootMaxRank })
    const res = await spend(cookiesLeader, 'loot')
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Ce bonus est déjà au rang maximum.')
  })

  // Le plafond est PAR bonus : `raid` s'arrête plus bas que les trois autres.
  // Rebrancher `spendPerkPoint` sur un plafond commun laisserait passer cette
  // dépense, et l'équipe achèterait des attaques que l'équilibrage refuse.
  it('le plafond de `raid` est le sien, plus bas que celui des autres bonus', async () => {
    expect(raidMaxRank).toBeLessThan(lootMaxRank)

    await setTeamState(999, 20, { raid: raidMaxRank })
    const refused = await spend(cookiesLeader, 'raid')
    expect(refused.statusCode).toBe(409)
    expect(refused.json().message).toBe('Ce bonus est déjà au rang maximum.')

    // Au MÊME rang, `loot` a encore de la place : la borne n'est pas globale.
    await setTeamState(999, 20, { loot: raidMaxRank })
    const accepted = await spend(cookiesLeader, 'loot')
    expect(accepted.statusCode).toBe(200)
    const loot = accepted
      .json()
      .perks.find((perk: any) => perk.key === 'loot')
    expect(loot.rank).toBe(raidMaxRank + 1)
    expect(loot.maxRank).toBe(lootMaxRank)
  })

  it('une dépense valide -> 200, rang +1, perkPoints -1, visible sur la réponse HTTP', async () => {
    await setTeamState(999, 1, { loot: 1 })
    const res = await spend(cookiesLeader, 'loot')
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.teamId).toBe(teamId)
    expect(body.perkPoints).toBe(0)
    const loot = body.perks.find((p: any) => p.key === 'loot')
    expect(loot.rank).toBe(2)
    expect(loot.unlocked).toBe(true)
    // Le plafond voyage sur CHAQUE bonus : le front dessine `rang/maxRank`
    // et il n'y a plus de valeur globale d'où le tirer.
    expect(loot.maxRank).toBe(lootMaxRank)
    expect(body.perks.find((p: any) => p.key === 'raid').maxRank).toBe(
      raidMaxRank,
    )

    // Rendu par le domaine (pas relu en base) : c'est ce que le schéma Zod
    // de réponse doit laisser passer intact, champ par champ.
    expect(body).toHaveProperty('level')
    expect(body).toHaveProperty('xp')
    expect(body).toHaveProperty('xpToNext')
  })

  it('deux dépenses SIMULTANÉES du dernier point : une seule réussit', async () => {
    await setTeamState(999, 1, {})

    // Sans `await` sur la première requête : les deux transactions
    // sérialisables se disputent réellement le même point, plutôt que de se
    // dérouler l'une après l'autre par accident de l'ordre du test.
    const [a, b] = await Promise.all([
      spend(cookiesLeader, 'loot'),
      spend(cookiesOfficer, 'raid'),
    ])

    const results = [a, b]
    const oks = results.filter((r) => r.statusCode === 200)
    const conflicts = results.filter((r) => r.statusCode === 409)

    expect(oks).toHaveLength(1)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.json().message).toBe(
      'Aucun point de bonus disponible.',
    )
    expect(oks[0]?.json().perkPoints).toBe(0)

    const perks = await prisma.teamPerk.findMany({ where: { teamId } })
    const spentRank = perks.reduce(
      (sum: number, p: { rank: number }) => sum + p.rank,
      0,
    )
    expect(spentRank).toBe(1)

    const team = await prisma.team.findUniqueOrThrow({
      where: { id: teamId },
      select: { perkPoints: true },
    })
    expect(team.perkPoints).toBe(0)
  })

  it('reset par un officier -> 403 (chef uniquement)', async () => {
    await setTeamState(999, 0, { loot: 1 })
    const res = await reset(cookiesOfficer)
    expect(res.statusCode).toBe(403)
    expect(res.json().message).toBe(
      'Seul le chef peut réinitialiser les bonus.',
    )
  })

  it('reset par le chef -> tous les rangs à 0 et exactement les points rendus', async () => {
    await setTeamState(999, 3, { loot: 2, raid: 1 })
    const res = await reset(cookiesLeader)
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.perkPoints).toBe(6)
    for (const perk of body.perks) {
      expect(perk.rank).toBe(0)
    }

    const team = await prisma.team.findUniqueOrThrow({
      where: { id: teamId },
      select: { perkPoints: true },
    })
    expect(team.perkPoints).toBe(6)
  })

  it('reset : chaque membre reçoit un team:perk par bonus remis à zéro', async () => {
    // La dépense notifiait, la remise à zéro non : les autres membres
    // gardaient à l'écran des rangs et un quota d'attaques périmés, juste
    // après une opération dont la confirmation leur promet le contraire.
    const wsManager = (app as any).iocContainer.wsManager
    const received: Record<string, any[]> = {
      [leaderId]: [],
      [officerId]: [],
      [memberId]: [],
    }
    const sockets = Object.entries(received).map(([userId, sink]) => {
      const ws = {
        readyState: 1,
        send: (data: string) => sink.push(JSON.parse(data)),
        on: () => {},
      }
      wsManager.register(userId, ws as any)
      return ws
    })
    expect(sockets).toHaveLength(3)

    await setTeamState(999, 0, { loot: 2, raid: 1 })
    const res = await reset(cookiesLeader)
    expect(res.statusCode).toBe(200)

    for (const userId of [leaderId, officerId, memberId]) {
      const perkEvents = received[userId]!.filter(
        (event) => event.type === 'team:perk',
      )
      // Un événement par bonus, tous à rang 0, avec les points rendus.
      expect(perkEvents.map((event) => event.key).sort()).toEqual([
        'forge',
        'loot',
        'raid',
        'xp',
      ])
      for (const event of perkEvents) {
        expect(event.teamId).toBe(teamId)
        expect(event.rank).toBe(0)
        expect(event.perkPoints).toBe(3)
      }
    }
  })
})
