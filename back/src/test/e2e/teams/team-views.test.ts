import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import {
  RAID_ROTATION,
  raidElementForWeek,
  raidWeekKey,
} from '../../../main/domain/raid/raid-rules'
import {
  hueFromName,
  xpForTeamLevel,
} from '../../../main/domain/team-progression/team-progression-rules'
import { buildTestApp } from '../../helpers/build-test-app'

/**
 * E2E : les trois écrans de la refonte Équipe (liste, fiche, historique).
 *
 * TOUTES les assertions portent sur `res.json()`, jamais sur la valeur de
 * retour du domaine. C'est le seul filet qui attrape le piège de
 * `fastify-type-provider-zod` : un champ absent du schéma de réponse est
 * retiré du corps SANS erreur ni avertissement, et un test qui lirait le
 * domaine resterait vert avec une API amputée.
 *
 * L'état est fabriqué directement en base (`/auth/register` est limité à 5
 * comptes par 15 minutes et par instance Fastify) : seuls les deux acteurs
 * qui doivent authentifier une requête sont enregistrés.
 */

const DAY_MS = 86_400_000

/**
 * Un élément de la rotation de raid — l'historique renvoie l'élément du boss
 * et le schéma de réponse le pin sur cette énumération-là — mais NI celui de
 * la semaine en cours (les deux suites de `e2e/raids` écrasent ce boss-là),
 * NI WATER (`e2e/admin/admin-raid` le renomme). Les raids créés ici pointent
 * ce boss explicitement : son élément n'a aucun autre effet.
 */
const BOSS_ELEMENT = RAID_ROTATION.filter(
  (element) => element !== raidElementForWeek(raidWeekKey(new Date())) && element !== 'WATER',
)[0] as string

describe('Vues de la section Équipe', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any

  let cookiesMe: string
  let cookiesJoiner: string
  let meId: string
  let joinerId: string

  let mainTeamId: string
  let overTeamId: string
  let fullTeamId: string
  let bossId: string

  let adminId: string
  let veteranId: string
  let recruitId: string

  let maxMembers: number
  let recruitDays: number
  let historyLimit: number
  let attacksPerDay: number
  let previousAttacksPerDay: number
  let previousHistoryLimit: number

  const suffix = Date.now()
  const password = 'Password123!'
  const weekKey = raidWeekKey(new Date())
  const MAIN_TEAM_NAME = `Vue Principale ${suffix}`
  const MAIN_LEVEL = 7
  const MAIN_XP = 100
  const MAIN_PERK_POINTS = 3
  const MAIN_MOTTO = 'On tape le boss le lundi.'
  const OVER_HUE = 265
  const RAID_MAX_HP = 1000
  const RAID_HP = 570

  async function registerAndLogin(tag: string) {
    const email = `tview${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `tview${tag}${suffix}`, email, password },
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

  async function createBareUser(tag: string, level = 1): Promise<string> {
    const user = await prisma.user.create({
      data: {
        username: `tview${tag}${suffix}`,
        email: `tview${tag}${suffix}@test.com`,
        emailVerifiedAt: new Date(),
        level,
      },
    })
    return user.id as string
  }

  /** Équipe créée en base : le domaine plafonne à 3 équipes par joueur, or
   *  les cas de ce fichier en demandent trois pour `me` — et ce plafond-là
   *  n'est pas le sujet. */
  async function createTeam(
    name: string,
    ownerId: string,
    extra: Record<string, unknown> = {},
  ): Promise<string> {
    const team = await prisma.team.create({
      data: {
        name,
        slug: name.toLowerCase().replaceAll(' ', '-'),
        ownerId,
        members: { create: { userId: ownerId, role: 'OWNER' } },
        ...extra,
      },
    })
    return team.id as string
  }

  async function fillTeam(teamId: string, tag: string, count: number) {
    const users = Array.from({ length: count }, (_, i) => ({
      username: `${tag}${i}${suffix}`,
      email: `${tag}${i}${suffix}@test.com`,
      emailVerifiedAt: new Date(),
    }))
    await prisma.user.createMany({ data: users })
    const created = await prisma.user.findMany({
      where: { email: { in: users.map((u) => u.email) } },
      select: { id: true },
    })
    await prisma.teamMember.createMany({
      data: created.map((u: { id: string }) => ({
        teamId,
        userId: u.id,
        role: 'MEMBER',
      })),
    })
  }

  function get(url: string, cookies: string) {
    return app.inject({ method: 'GET', url, headers: { cookie: cookies } })
  }

  beforeAll(async () => {
    app = await buildTestApp()
    const container = (app as any).iocContainer
    prisma = container.postgresOrm.prisma
    configService = container.configService

    previousAttacksPerDay = await configService.get('raid.attacksPerDay')
    previousHistoryLimit = await configService.get('teamRaid.historyLimit')
    await configService.set('raid.attacksPerDay', 2)
    await configService.set('teamRaid.historyLimit', 6)

    const cfg = await configService.getMany(
      'team.maxMembers',
      'team.recruitDays',
      'teamRaid.historyLimit',
      'raid.attacksPerDay',
    )
    maxMembers = cfg['team.maxMembers']
    recruitDays = cfg['team.recruitDays']
    historyLimit = cfg['teamRaid.historyLimit']
    attacksPerDay = cfg['raid.attacksPerDay']

    const me = await registerAndLogin('Me')
    meId = me.userId
    cookiesMe = me.cookies
    const joiner = await registerAndLogin('Join')
    joinerId = joiner.userId
    cookiesJoiner = joiner.cookies

    const boss = await prisma.raidBoss.upsert({
      where: { element: BOSS_ELEMENT },
      create: {
        element: BOSS_ELEMENT,
        name: 'Gardien du Test',
        spec: { baseHp: 1, baseAtk: 1, baseDef: 0, baseSpd: 1, level: 1 },
      },
      update: { name: 'Gardien du Test' },
    })
    bossId = boss.id

    // ── Équipe principale : 4 membres, un raid en cours, un historique ──
    mainTeamId = await createTeam(MAIN_TEAM_NAME, meId, {
      level: MAIN_LEVEL,
      xp: MAIN_XP,
      perkPoints: MAIN_PERK_POINTS,
      motto: MAIN_MOTTO,
      // `hue` reste NULLE : c'est le cas que la sortie doit résoudre.
      perks: { create: { key: 'loot', rank: 2 } },
    })
    await prisma.teamMember.update({
      where: { teamId_userId: { teamId: mainTeamId, userId: meId } },
      data: { joinedAt: new Date(Date.now() - 30 * DAY_MS) },
    })

    adminId = await createBareUser('Admin', 42)
    veteranId = await createBareUser('Vet', 31)
    recruitId = await createBareUser('Rec', 12)
    await prisma.teamMember.createMany({
      data: [
        {
          teamId: mainTeamId,
          userId: adminId,
          role: 'ADMIN',
          joinedAt: new Date(Date.now() - DAY_MS),
        },
        {
          teamId: mainTeamId,
          userId: veteranId,
          role: 'MEMBER',
          joinedAt: new Date(Date.now() - 30 * DAY_MS),
        },
        {
          teamId: mainTeamId,
          userId: recruitId,
          role: 'MEMBER',
          joinedAt: new Date(Date.now() - DAY_MS),
        },
      ],
    })
    await prisma.user.update({
      where: { id: veteranId },
      data: { lastLoginAt: new Date(Date.now() - 2 * DAY_MS) },
    })

    const raid = await prisma.teamRaid.create({
      data: {
        teamId: mainTeamId,
        weekKey,
        bossId,
        maxHp: RAID_MAX_HP,
        hp: RAID_HP,
        memberCountAtStart: 4,
      },
    })
    await prisma.raidAttack.createMany({
      data: [
        { raidId: raid.id, userId: meId, damage: 500, seed: 's1', userCardIds: [] },
        { raidId: raid.id, userId: veteranId, damage: 200, seed: 's2', userCardIds: [] },
        { raidId: raid.id, userId: veteranId, damage: 100, seed: 's3', userCardIds: [] },
      ],
    })

    await prisma.teamMemberWeekly.createMany({
      data: [
        { teamId: mainTeamId, userId: meId, weekKey, points: 10 },
        { teamId: mainTeamId, userId: adminId, weekKey, points: 50 },
        { teamId: mainTeamId, userId: veteranId, weekKey, points: 20 },
        { teamId: mainTeamId, userId: recruitId, weekKey, points: 0 },
      ],
    })

    // Sept semaines révolues, dont deux gagnées. La semaine en cours ne doit
    // JAMAIS apparaître dans l'historique : elle a sa propre carte, vivante.
    await prisma.teamRaid.createMany({
      data: Array.from({ length: 7 }, (_, i) => {
        const past = new Date(Date.now() - (i + 1) * 7 * DAY_MS)
        return {
          teamId: mainTeamId,
          weekKey: raidWeekKey(past),
          bossId,
          maxHp: RAID_MAX_HP,
          hp: i < 2 ? 0 : 250,
          memberCountAtStart: 4,
          killedAt: i < 2 ? past : null,
        }
      }),
    })

    // ── Équipe AU-DESSUS du plafond : elle doit rester lisible ──────────
    overTeamId = await createTeam(`Vue Surchargee ${suffix}`, meId, {
      hue: OVER_HUE,
    })
    await fillTeam(overTeamId, 'over', maxMembers + 2)

    // ── Équipe pleine PILE au plafond : l'adhésion y est refusée ────────
    fullTeamId = await createTeam(`Vue Pleine ${suffix}`, meId)
    await fillTeam(fullTeamId, 'full', maxMembers - 1)
  })

  afterAll(async () => {
    await configService.set('raid.attacksPerDay', previousAttacksPerDay)
    await configService.set('teamRaid.historyLimit', previousHistoryLimit)
    await app.close()
  })

  // ── GET /teams ─────────────────────────────────────────────────────────

  it('GET /teams porte level, hue, memberCount, maxMembers et le raid en cours', async () => {
    const res = await get('/teams', cookiesMe)
    expect(res.statusCode).toBe(200)
    const body = res.json()

    const main = body.teams.find((t: any) => t.id === mainTeamId)
    expect(main).toBeDefined()
    expect(main.level).toBe(MAIN_LEVEL)
    expect(main.hue).toBe(hueFromName(MAIN_TEAM_NAME))
    expect(main.memberCount).toBe(4)
    expect(main.maxMembers).toBe(maxMembers)
    expect(main.raid).toEqual({ bossName: 'Gardien du Test', pct: 43 })
    // La carte affiche le rôle du lecteur à côté de l'effectif : `ownerId`
    // seul ne distinguerait pas un officier d'un simple membre.
    expect(main.myRole).toBe('OWNER')
    expect(main.myRoleLabel).toBe('Chef')
  })

  it('GET /teams : le rôle du lecteur suit son grade, pas seulement la propriété', async () => {
    // Officier de l'équipe surchargée, propriétaire de la principale : deux
    // libellés différents pour le même lecteur, dans la même réponse.
    await prisma.teamMember.update({
      where: { teamId_userId: { teamId: overTeamId, userId: meId } },
      data: { role: 'ADMIN', joinedAt: new Date(Date.now() - 30 * DAY_MS) },
    })
    const body = (await get('/teams', cookiesMe)).json()
    const over = body.teams.find((t: any) => t.id === overTeamId)
    expect(over.myRole).toBe('ADMIN')
    expect(over.myRoleLabel).toBe('Officier')
    expect(
      body.teams.find((t: any) => t.id === mainTeamId).myRoleLabel,
    ).toBe('Chef')

    await prisma.teamMember.update({
      where: { teamId_userId: { teamId: overTeamId, userId: meId } },
      data: { role: 'OWNER' },
    })
  })

  it("GET /teams : raid null quand l'équipe n'a pas ouvert le raid de la semaine", async () => {
    const body = (await get('/teams', cookiesMe)).json()
    const over = body.teams.find((t: any) => t.id === overTeamId)
    expect(over.raid).toBeNull()
    expect(over.memberCount).toBe(maxMembers + 3)
    expect(over.hue).toBe(OVER_HUE)
  })

  // ── GET /teams/:id ─────────────────────────────────────────────────────

  it('GET /teams/:id porte level, xp, xpNext, motto, hue, perkPoints, perks, weekPts, rankGlobal, maxMembers, raidsWon', async () => {
    const res = await get(`/teams/${mainTeamId}`, cookiesMe)
    expect(res.statusCode).toBe(200)
    const body = res.json()

    const cfg = await configService.getMany(
      'teamLevel.xpBase',
      'teamLevel.xpExp',
    )
    expect(body.level).toBe(MAIN_LEVEL)
    expect(body.xp).toBe(MAIN_XP)
    expect(body.xpNext).toBe(
      xpForTeamLevel(
        MAIN_LEVEL,
        cfg['teamLevel.xpBase'],
        cfg['teamLevel.xpExp'],
      ),
    )
    expect(body.motto).toBe(MAIN_MOTTO)
    expect(body.perkPoints).toBe(MAIN_PERK_POINTS)
    // Le front dimensionne ses pastilles de rang dessus : sans ce champ il
    // coderait 5 en dur, alors que c'est un tunable.
    expect(body.maxRank).toBe(
      (await configService.getMany('teamPerk.maxRank'))['teamPerk.maxRank'],
    )
    expect(body.weekPts).toBe(80)
    expect(body.maxMembers).toBe(maxMembers)
    expect(body.memberCount).toBe(4)
    expect(body.raidsWon).toBe(2)
    expect(typeof body.rankGlobal).toBe('number')
    expect(body.rankGlobal).toBeGreaterThanOrEqual(1)
    // Les champs hérités restent servis : la fiche s'en sert encore.
    expect(body.id).toBe(mainTeamId)
    expect(body.name).toBe(MAIN_TEAM_NAME)
    expect(body.ownerId).toBe(meId)
    expect(Array.isArray(body.members)).toBe(true)
    expect(body.members).toHaveLength(4)
  })

  it('GET /teams/:id : hue TOUJOURS renseignée, même quand la colonne est nulle', async () => {
    const nullHue = (await get(`/teams/${mainTeamId}`, cookiesMe)).json()
    const row = await prisma.team.findUnique({ where: { id: mainTeamId } })
    expect(row.hue).toBeNull()
    expect(nullHue.hue).toBe(hueFromName(MAIN_TEAM_NAME))
    expect(Number.isInteger(nullHue.hue)).toBe(true)

    const setHue = (await get(`/teams/${overTeamId}`, cookiesMe)).json()
    expect(setHue.hue).toBe(OVER_HUE)
  })

  it('GET /teams/:id : les 4 bonus sont présents, y compris à rang 0', async () => {
    const body = (await get(`/teams/${mainTeamId}`, cookiesMe)).json()
    expect(body.perks).toHaveLength(4)
    expect(body.perks.map((p: any) => p.key).sort()).toEqual([
      'forge',
      'loot',
      'raid',
      'xp',
    ])
    expect(body.perks.find((p: any) => p.key === 'loot').rank).toBe(2)
    for (const key of ['raid', 'xp', 'forge']) {
      const perk = body.perks.find((p: any) => p.key === key)
      expect(perk.rank).toBe(0)
      expect(typeof perk.effect).toBe('number')
      expect(typeof perk.unlockLevel).toBe('number')
      expect(typeof perk.unlocked).toBe('boolean')
    }
  })

  // ── GET /teams/:id/members ─────────────────────────────────────────────

  it('GET /teams/:id/members : trié par dégâts décroissants, avec dégâts, points, attaques et niveau', async () => {
    const res = await get(`/teams/${mainTeamId}/members`, cookiesMe)
    expect(res.statusCode).toBe(200)
    const body = res.json()

    expect(body.weekKey).toBe(weekKey)
    expect(body.attacksPerDay).toBe(attacksPerDay)
    expect(body.members.map((m: any) => m.userId)).toEqual([
      meId,
      veteranId,
      adminId,
      recruitId,
    ])
    expect(body.members.map((m: any) => m.rank)).toEqual([1, 2, 3, 4])

    const [mine, veteran, admin] = body.members
    expect(mine.raidDamage).toBe(500)
    expect(mine.raidAttacksLeft).toBe(attacksPerDay - 1)
    expect(mine.weekPoints).toBe(10)
    expect(mine.isMe).toBe(true)
    expect(mine.user.username).toBe(`tviewMe${suffix}`)

    expect(veteran.raidDamage).toBe(300)
    expect(veteran.raidAttacksLeft).toBe(attacksPerDay - 2)
    expect(veteran.weekPoints).toBe(20)
    expect(veteran.level).toBe(31)
    expect(veteran.isMe).toBe(false)
    expect(veteran.lastSeenAt).not.toBeNull()

    // Aucune attaque : dégâts à 0 et quota intact, jamais un trou.
    expect(admin.raidDamage).toBe(0)
    expect(admin.raidAttacksLeft).toBe(attacksPerDay)
    expect(admin.lastSeenAt).toBeNull()
  })

  it('GET /teams/:id/members : roleLabel — Chef, Officier, Membre, et Recrue en dessous du seuil', async () => {
    const body = (await get(`/teams/${mainTeamId}/members`, cookiesMe)).json()
    const labelOf = (userId: string) =>
      body.members.find((m: any) => m.userId === userId).roleLabel

    expect(recruitDays).toBe(7)
    expect(labelOf(meId)).toBe('Chef')
    expect(labelOf(adminId)).toBe('Officier')
    // Entré il y a 30 jours : membre installé.
    expect(labelOf(veteranId)).toBe('Membre')
    // Entré il y a 1 jour, donc sous les 7 jours de `team.recruitDays`.
    expect(labelOf(recruitId)).toBe('Recrue')
  })

  // ── GET /teams/:id/raids ───────────────────────────────────────────────

  it('GET /teams/:id/raids : semaines révolues, plus récentes en tête, semaine en cours exclue', async () => {
    const res = await get(`/teams/${mainTeamId}/raids`, cookiesMe)
    expect(res.statusCode).toBe(200)
    const body = res.json()

    expect(body.raids).toHaveLength(historyLimit)
    const keys = body.raids.map((r: any) => r.weekKey)
    expect(keys).not.toContain(weekKey)
    expect([...keys].sort().reverse()).toEqual(keys)
    expect(keys[0]).toBe(raidWeekKey(new Date(Date.now() - 7 * DAY_MS)))

    const [last] = body.raids
    expect(last.bossName).toBe('Gardien du Test')
    expect(last.bossElement).toBe(BOSS_ELEMENT)
    expect(last.maxHp).toBe(RAID_MAX_HP)
    expect(last.damage).toBe(RAID_MAX_HP)
    expect(last.pct).toBe(100)
    expect(last.killedAt).not.toBeNull()

    const unfinished = body.raids.find((r: any) => r.pct < 100)
    expect(unfinished.damage).toBe(RAID_MAX_HP - 250)
    expect(unfinished.pct).toBe(75)
    expect(unfinished.killedAt).toBeNull()
  })

  // ── Plafond de membres ─────────────────────────────────────────────────

  it("rejoindre une équipe pleine au plafond est refusé (invitation et acceptation)", async () => {
    const count = await prisma.teamMember.count({
      where: { teamId: fullTeamId },
    })
    expect(count).toBe(maxMembers)

    const invite = await app.inject({
      method: 'POST',
      url: `/teams/${fullTeamId}/invite`,
      headers: { cookie: cookiesMe },
      payload: { username: `tviewJoin${suffix}` },
    })
    expect(invite.statusCode).toBe(403)
    expect(invite.json().message).toContain(String(maxMembers))

    // Invitation émise AVANT que l'équipe se remplisse : le refus doit
    // tomber à l'acceptation, pas seulement à l'émission.
    const pending = await prisma.invitation.create({
      data: {
        teamId: fullTeamId,
        invitedById: meId,
        invitedUserId: joinerId,
        expiresAt: new Date(Date.now() + DAY_MS),
      },
    })
    const accept = await app.inject({
      method: 'POST',
      url: `/invitations/${pending.token}/accept`,
      headers: { cookie: cookiesJoiner },
    })
    expect(accept.statusCode).toBe(403)
    expect(accept.json().message).toContain(String(maxMembers))
    expect(
      await prisma.teamMember.count({
        where: { teamId: fullTeamId, userId: joinerId },
      }),
    ).toBe(0)
  })

  it('une équipe DÉJÀ au-dessus du plafond reste lisible et fonctionnelle', async () => {
    const memberCount = await prisma.teamMember.count({
      where: { teamId: overTeamId },
    })
    expect(memberCount).toBeGreaterThan(maxMembers)

    const detail = await get(`/teams/${overTeamId}`, cookiesMe)
    expect(detail.statusCode).toBe(200)
    expect(detail.json().memberCount).toBe(memberCount)
    expect(detail.json().maxMembers).toBe(maxMembers)

    const members = await get(`/teams/${overTeamId}/members`, cookiesMe)
    expect(members.statusCode).toBe(200)
    expect(members.json().members).toHaveLength(memberCount)

    const history = await get(`/teams/${overTeamId}/raids`, cookiesMe)
    expect(history.statusCode).toBe(200)
    expect(history.json().raids).toEqual([])

    const list = await get('/teams', cookiesMe)
    expect(
      list.json().teams.some((t: any) => t.id === overTeamId),
    ).toBe(true)
  })

  // ── Accès ──────────────────────────────────────────────────────────────

  it("un invité en attente garde l'aperçu mais n'obtient ni le roster ni l'historique", async () => {
    const invitation = await prisma.invitation.create({
      data: {
        teamId: mainTeamId,
        invitedById: meId,
        invitedUserId: joinerId,
        expiresAt: new Date(Date.now() + DAY_MS),
      },
    })

    try {
      // L'aperçu reste ouvert : c'est ce sur quoi on décide d'accepter.
      const preview = await get(`/teams/${mainTeamId}`, cookiesJoiner)
      expect(preview.statusCode).toBe(200)
      expect(preview.json().name).toBe(MAIN_TEAM_NAME)

      // Le roster ne l'est pas : niveau, points, dégâts et dernière
      // connexion de chaque membre ne se gagnent pas avec une invitation.
      expect(
        (await get(`/teams/${mainTeamId}/members`, cookiesJoiner)).statusCode,
      ).toBe(403)
      expect(
        (await get(`/teams/${mainTeamId}/raids`, cookiesJoiner)).statusCode,
      ).toBe(403)
    } finally {
      // Dans un `finally` : sans ça, une assertion qui tombe laisse le cas
      // suivant face à un invité en attente et le fait échouer pour la
      // mauvaise raison.
      await prisma.invitation.delete({ where: { id: invitation.id } })
    }
  })

  it('rangGlobal : deux chargements rapprochés ne font qu\'UNE passe de classement', async () => {
    const container = (app as any).iocContainer
    const repo = container.leaderboardRepository
    const original = repo.getTeamsForRanking.bind(repo)
    let passes = 0
    repo.getTeamsForRanking = () => {
      passes += 1
      return original()
    }
    // Départ à froid : sans ça, le mémo d'un test précédent rendrait le
    // comptage muet.
    await container.redisClient.del('leaderboard:teams:ranking')

    try {
      const first = await get(`/teams/${mainTeamId}`, cookiesMe)
      const second = await get(`/teams/${mainTeamId}`, cookiesMe)
      const third = await get(`/teams/${overTeamId}`, cookiesMe)
      expect(first.statusCode).toBe(200)
      expect(first.json().rankGlobal).toBe(second.json().rankGlobal)
      expect(typeof third.json().rankGlobal).toBe('number')
      // Trois chargements de page, une seule passe de calcul.
      expect(passes).toBe(1)
    } finally {
      repo.getTeamsForRanking = original
    }
  })

  it('les trois vues refusent un non-membre', async () => {
    for (const url of [
      `/teams/${mainTeamId}`,
      `/teams/${mainTeamId}/members`,
      `/teams/${mainTeamId}/raids`,
    ]) {
      const res = await get(url, cookiesJoiner)
      expect(res.statusCode).toBe(403)
    }
  })
})
