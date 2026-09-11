import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import {
  attacksRemaining,
  raidElementForWeek,
  raidWeekKey,
} from '../../../main/domain/raid/raid-rules'
import { perkEffect } from '../../../main/domain/team-progression/team-progression-rules'
import { buildTestApp } from '../../helpers/build-test-app'

/**
 * E2E : le bonus d'équipe `raid` (task 5, refonte équipe) s'ajoute en ENTIER
 * au quota quotidien d'attaques — `raid.attacksPerDay + effect`, jamais un
 * recalcul depuis le rang. Observé sur `GET /teams/:id/raid`, champ
 * `me.attacksPerDay`, exposé par `raid.domain.ts#buildView`.
 *
 * Second cas (revue du coordinateur) : ce bonus est scopé à L'ÉQUIPE dont
 * le boss est affiché, pas au meilleur rang du joueur toutes équipes
 * confondues — contrairement à `loot`/`xp`/`forge`. Un joueur membre de
 * deux équipes, rang maximum dans l'une, ne doit voir AUCUN bonus sur le raid de
 * l'autre.
 *
 * Troisième cas : les deux tests au-dessus n'exercent que `#buildView`
 * (lecture, `GET /teams/:id/raid`), jamais `attack` (écriture,
 * `POST /teams/:id/raid/attack`) — qui a SON PROPRE calcul de `perDay`, site
 * distinct. Sans ce troisième test, une régression sur le site d'attaque ne
 * tue aucun test nommé.
 */
describe('Bonus équipe `raid` — attaques par jour', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any
  let baseAttacksPerDay: number
  let raidPct: number
  let maxRank: number
  let raidCardId: string

  const suffix = Date.now()
  const password = 'Password123!'

  async function registerAndLogin(tag: string) {
    const email = `teamperkraid${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `tpraid${tag}${suffix}`, email, password },
    })
    expect(reg.statusCode).toBe(201)
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    return {
      userId: user.id as string,
      cookies: login.headers['set-cookie'] as string,
    }
  }

  async function makeTeam(ownerTag: string, memberUserId: string) {
    const owner = await prisma.user.create({
      data: {
        username: `tpraidowner${ownerTag}${suffix}`,
        email: `tpraidowner${ownerTag}${suffix}@test.com`,
        emailVerifiedAt: new Date(),
      },
    })
    const team = await prisma.team.create({
      data: {
        name: `TeamPerkRaid${ownerTag}${suffix}`,
        slug: `team-perk-raid-${ownerTag}-${suffix}`,
        ownerId: owner.id,
      },
    })
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: memberUserId, role: 'MEMBER' },
    })
    return team.id as string
  }

  beforeAll(async () => {
    app = await buildTestApp()
    const container = (app as any).iocContainer
    prisma = container.postgresOrm.prisma
    configService = container.configService

    const cfg = await configService.getMany(
      'raid.attacksPerDay',
      'teamPerk.raid.perRank',
      'teamPerk.raid.maxRank',
    )
    baseAttacksPerDay = cfg['raid.attacksPerDay']
    // Le rang testé est LE PLAFOND de `raid`, lu en config, jamais 5 écrit
    // ici : ce plafond a déjà baissé une fois (5 -> 2) et le test doit suivre
    // le jeu, pas une valeur figée dans son passé.
    maxRank = cfg['teamPerk.raid.maxRank']
    // Importé depuis les règles pures, jamais réimplémenté ici : un
    // changement du plancher (`Math.floor`) ferait dériver ce test du jeu
    // réel sans que le test ne le détecte.
    raidPct = perkEffect('raid', maxRank, cfg['teamPerk.raid.perRank'], maxRank)

    const weekKey = raidWeekKey(new Date())
    const element = raidElementForWeek(weekKey)
    await prisma.raidBoss.upsert({
      where: { element },
      create: {
        element,
        name: 'Boss bonus raid',
        spec: {
          baseHp: 100,
          baseAtk: 1,
          baseDef: 0,
          baseSpd: 50,
          level: 1,
          palier: 1,
          attackPattern: 'BASIC',
          passiveKey: null,
          element,
          appearance: 'monsters/bosses/BOSS-010',
          mitigationScale: 1,
        },
      },
      update: {},
    })

    // Carte à stats énormes pour le test d'attaque : le boss ci-dessus est
    // sans défense, une seule attaque suffit à infliger des dégâts positifs.
    const raidCardSet = await prisma.cardSet.create({
      data: { name: `TpRaidAttackSet${suffix}`, isActive: false },
    })
    const raidCard = await prisma.card.create({
      data: {
        name: `TpRaidAttackCard${suffix}`,
        rarity: 'LEGENDARY',
        dropWeight: 1,
        setId: raidCardSet.id,
        baseHp: 5000,
        baseAtk: 800,
        baseDef: 100,
        baseSpd: 200,
      },
    })
    raidCardId = raidCard.id
  })

  afterAll(async () => {
    await app.close()
  })

  it("au rang maximum : ajoute l'effet ENTIER du bonus au quota de base", async () => {
    expect(raidPct).toBeGreaterThan(0)

    const baseline = await registerAndLogin('Base')
    const bonused = await registerAndLogin('Bonus')

    // team1 (baseline) : le joueur en est membre mais SANS bonus investi —
    // rang 0 par défaut (aucune ligne TeamPerk). team2 (bonus) : rang maximum sur
    // `raid`.
    const team1Id = await makeTeam('Base', baseline.userId)
    const team2Id = await makeTeam('Bonus', bonused.userId)
    await prisma.teamPerk.create({
      data: { teamId: team2Id, key: 'raid', rank: maxRank },
    })

    const baselineRes = await app.inject({
      method: 'GET',
      url: `/teams/${team1Id}/raid`,
      headers: { cookie: baseline.cookies },
    })
    expect(baselineRes.statusCode).toBe(200)
    expect(baselineRes.json().me.attacksPerDay).toBe(baseAttacksPerDay)

    const bonusedRes = await app.inject({
      method: 'GET',
      url: `/teams/${team2Id}/raid`,
      headers: { cookie: bonused.cookies },
    })
    expect(bonusedRes.statusCode).toBe(200)
    expect(bonusedRes.json().me.attacksPerDay).toBe(
      baseAttacksPerDay + raidPct,
    )
  })

  it("un rang investi dans une équipe ne fuit pas vers le raid d'une autre équipe du même joueur", async () => {
    expect(raidPct).toBeGreaterThan(0)

    // UN SEUL joueur, membre des deux équipes : teamRich a le bonus au rang maximum,
    // teamPoor n'a jamais reçu de point. `effectsForUser` (user-scopé)
    // ferait fuir le bonus de teamRich vers teamPoor ; la lecture correcte
    // (`raidAttacksBonusForTeam`, scopée à l'équipe affichée) ne doit rien
    // laisser passer.
    const player = await registerAndLogin('Leak')
    const teamPoorId = await makeTeam('Poor', player.userId)
    const teamRichId = await makeTeam('Rich', player.userId)
    await prisma.teamPerk.create({
      data: { teamId: teamRichId, key: 'raid', rank: maxRank },
    })

    const poorRes = await app.inject({
      method: 'GET',
      url: `/teams/${teamPoorId}/raid`,
      headers: { cookie: player.cookies },
    })
    expect(poorRes.statusCode).toBe(200)
    expect(poorRes.json().me.attacksPerDay).toBe(baseAttacksPerDay)

    const richRes = await app.inject({
      method: 'GET',
      url: `/teams/${teamRichId}/raid`,
      headers: { cookie: player.cookies },
    })
    expect(richRes.statusCode).toBe(200)
    expect(richRes.json().me.attacksPerDay).toBe(baseAttacksPerDay + raidPct)
  })

  it("POST /teams/:id/raid/attack (site distinct de #buildView) : le quota consommé reflète le bonus de l'équipe attaquée", async () => {
    expect(raidPct).toBeGreaterThan(0)

    const player = await registerAndLogin('Attack')
    const teamNoBonusId = await makeTeam('AttackNo', player.userId)
    const teamBonusId = await makeTeam('AttackYes', player.userId)
    await prisma.teamPerk.create({
      data: { teamId: teamBonusId, key: 'raid', rank: maxRank },
    })

    const userCard = await prisma.userCard.create({
      data: {
        userId: player.userId,
        cardId: raidCardId,
        variant: 'NORMAL',
        quantity: 1,
        level: 60,
        palier: 6,
      },
    })

    const noBonusRes = await app.inject({
      method: 'POST',
      url: `/teams/${teamNoBonusId}/raid/attack`,
      headers: { cookie: player.cookies },
      payload: { userCardIds: [userCard.id] },
    })
    expect(noBonusRes.statusCode).toBe(200)
    expect(noBonusRes.json().attacksRemainingToday).toBe(
      attacksRemaining(1, baseAttacksPerDay),
    )

    const bonusRes = await app.inject({
      method: 'POST',
      url: `/teams/${teamBonusId}/raid/attack`,
      headers: { cookie: player.cookies },
      payload: { userCardIds: [userCard.id] },
    })
    expect(bonusRes.statusCode).toBe(200)
    // `used` compte les attaques du JOUEUR sur la journée, tous raids
    // confondus (pas par équipe) — la première attaque, sur teamNoBonusId,
    // compte déjà : deux attaques consommées au moment de celle-ci.
    expect(bonusRes.json().attacksRemainingToday).toBe(
      attacksRemaining(2, baseAttacksPerDay + raidPct),
    )
  })
})
