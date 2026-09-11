import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'
import {
  raidElementForWeek,
  raidWeekKey,
} from '../../../main/domain/raid/raid-rules'
import { applyTeamXp } from '../../../main/domain/team-progression/team-progression-rules'

/**
 * Boss sans défense et sans risque pour l'attaquant : les dégâts infligés
 * par une seule attaque sont donc à la fois positifs et prévisibles dans
 * leur ordre de grandeur — c'est tout ce dont ce fichier a besoin, il ne
 * teste ni le combat ni les paliers de récompense du raid.
 */
const WEAK_BOSS_SPEC = {
  baseHp: 100,
  baseAtk: 1,
  baseDef: 0,
  baseSpd: 50,
  level: 1,
  palier: 1,
  attackPattern: 'BASIC',
  passiveKey: null,
  element: 'FIRE',
  appearance: 'monsters/bosses/BOSS-010',
  mitigationScale: 1,
}

describe("progression d'équipe : les quatre sources de points", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any

  let cookiesP: string
  let cookiesOpp: string
  let cookiesLone: string
  let userIdP: string
  let userIdOpp: string
  let userIdLone: string
  let team1Id: string
  let team2Id: string
  let raidCardId: string
  let raidUserCardId: string

  let pullSetId: string
  let hotSetId: string
  let mixedSetId: string
  let baselineActiveSetIds: string[]

  let basePerPull: number

  const suffix = Date.now()
  const password = 'Password123!'
  const weekKey = raidWeekKey(new Date())

  // `/auth/register` est limité à 5 comptes par 15 minutes et par instance
  // Fastify : on n'en dépense que 3 (P, Opp, Lone — les seuls qui doivent
  // s'authentifier eux-mêmes). Les deux propriétaires des équipes de
  // contrôle n'ont besoin d'aucune session, ils sont créés directement en
  // base, sur le modèle de `createBareUser` dans bets.test.ts.
  async function registerAndLogin(tag: string) {
    const email = `prog${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `prog${tag}${suffix}`, email, password },
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

  async function createBareUser(tag: string): Promise<string> {
    const user = await prisma.user.create({
      data: {
        username: `prog${tag}${suffix}`,
        email: `prog${tag}${suffix}@test.com`,
        emailVerifiedAt: new Date(),
      },
    })
    return user.id as string
  }

  // Déactive tous les CardSet, puis n'active que celui donné — même motif
  // que duels.test.ts / bets.test.ts : le catalogue est un état PARTAGÉ
  // entre fichiers e2e (la base n'est tronquée qu'une fois par run), d'où
  // le snapshot/restore en beforeAll/afterAll.
  async function activateOnly(setId: string) {
    await prisma.cardSet.updateMany({ data: { isActive: false } })
    await prisma.cardSet.update({
      where: { id: setId },
      data: { isActive: true },
    })
  }

  async function setTokens(userId: string, tokens: number) {
    await prisma.user.update({
      where: { id: userId },
      data: { tokens, lastTokenAt: new Date() },
    })
  }

  function weeklyPoints(teamId: string, userId: string): Promise<number> {
    return prisma.teamMemberWeekly
      .findUnique({
        where: { teamId_userId_weekKey: { teamId, userId, weekKey } },
      })
      .then((row: { points: number } | null) => row?.points ?? 0)
  }

  function teamProgress(
    teamId: string,
  ): Promise<{ level: number; xp: number; perkPoints: number }> {
    return prisma.team.findUniqueOrThrow({
      where: { id: teamId },
      select: { level: true, xp: true, perkPoints: true },
    })
  }

  // Les crédits de points sont `void ... .catch(...)` (fire-and-forget) :
  // la réponse HTTP de l'action qui les déclenche revient avant que
  // l'écriture n'ait forcément fini. On sonde donc la ligne plutôt que de
  // supposer une complétion synchrone — même motif que `waitForDuelStatus`
  // / `waitForBetStatus` dans les suites de wagers.
  async function waitFor<T>(
    read: () => Promise<T>,
    predicate: (value: T) => boolean,
    timeoutMs = 5000,
  ): Promise<T> {
    const start = Date.now()
    let last: T
    do {
      last = await read()
      if (predicate(last)) {
        return last
      }
      await new Promise((r) => setTimeout(r, 25))
    } while (Date.now() - start < timeoutMs)
    throw new Error(
      `Timeout: la condition attendue n'a jamais été remplie (dernière valeur : ${JSON.stringify(last)})`,
    )
  }

  beforeAll(async () => {
    app = await buildTestApp()
    const container = (app as any).iocContainer
    prisma = container.postgresOrm.prisma
    configService = container.configService

    basePerPull = (
      await configService.getMany('teamPoints.perPull')
    )['teamPoints.perPull']

    const p = await registerAndLogin('P')
    const opp = await registerAndLogin('Opp')
    const lone = await registerAndLogin('Lone')
    userIdP = p.userId
    userIdOpp = opp.userId
    userIdLone = lone.userId
    cookiesP = p.cookies
    cookiesOpp = opp.cookies
    cookiesLone = lone.cookies

    // Deux propriétaires de pure façade : ils ne se connectent jamais, ils
    // n'existent que pour satisfaire la FK `Team.ownerId`. Les équipes
    // elles-mêmes sont créées directement en base — leur création n'est pas
    // ce que ce fichier teste.
    const owner1 = await createBareUser('Owner1')
    const owner2 = await createBareUser('Owner2')

    const team1 = await prisma.team.create({
      data: {
        name: `ProgTeam1${suffix}`,
        slug: `prog-team1-${suffix}`,
        ownerId: owner1,
      },
    })
    const team2 = await prisma.team.create({
      data: {
        name: `ProgTeam2${suffix}`,
        slug: `prog-team2-${suffix}`,
        ownerId: owner2,
      },
    })
    team1Id = team1.id
    team2Id = team2.id

    // P appartient aux DEUX équipes (le cas qui distingue un fan-out réel
    // d'un fan-out à une seule équipe qui passerait par accident) ; Opp
    // n'appartient qu'à team1, où se jouent le duel et les paris.
    await prisma.teamMember.createMany({
      data: [
        { teamId: team1Id, userId: userIdP, role: 'MEMBER' },
        { teamId: team2Id, userId: userIdP, role: 'MEMBER' },
        { teamId: team1Id, userId: userIdOpp, role: 'MEMBER' },
      ],
    })

    // Snapshot du catalogue actif AVANT toute manipulation — cette suite
    // partage la base avec les autres fichiers e2e.
    const active = await prisma.cardSet.findMany({
      where: { isActive: true },
      select: { id: true },
    })
    baselineActiveSetIds = active.map((s: { id: string }) => s.id)

    // pullSet : 100 % COMMON, sert aux tirages dont la rareté n'a pas
    // d'importance (fan-out, joueur sans équipe, tirages perdants d'un
    // pari). hotSet : 100 % RARE, garantit un tirage qui score au duel et
    // qui qualifie un pari « au moins RARE » dès le premier tirage.
    // mixedSet : COMMON 90 / RARE 10, sert à figer une cote de pari > 1 au
    // placement (une cote à 1 ferait échouer `place` avant même le test).
    const pullSet = await prisma.cardSet.create({
      data: { name: `ProgPullSet${suffix}`, isActive: false },
    })
    pullSetId = pullSet.id
    await prisma.card.create({
      data: {
        name: `ProgPullCard${suffix}`,
        rarity: 'COMMON',
        dropWeight: 1,
        setId: pullSetId,
      },
    })

    const hotSet = await prisma.cardSet.create({
      data: { name: `ProgHotSet${suffix}`, isActive: false },
    })
    hotSetId = hotSet.id
    await prisma.card.create({
      data: {
        name: `ProgHotCard${suffix}`,
        rarity: 'RARE',
        dropWeight: 1,
        setId: hotSetId,
      },
    })

    const mixedSet = await prisma.cardSet.create({
      data: { name: `ProgMixedSet${suffix}`, isActive: false },
    })
    mixedSetId = mixedSet.id
    await prisma.card.createMany({
      data: [
        {
          name: `ProgMixedCommon${suffix}`,
          rarity: 'COMMON',
          dropWeight: 90,
          setId: mixedSetId,
        },
        {
          name: `ProgMixedRare${suffix}`,
          rarity: 'RARE',
          dropWeight: 10,
          setId: mixedSetId,
        },
      ],
    })

    // Fixture de combat pour le raid : un set INACTIF (le combat n'exige
    // pas que la carte utilisée appartienne à un catalogue en cours, elle
    // n'a donc jamais à entrer dans le ballet activateOnly ci-dessus) et un
    // boss sans défense pour que les dégâts d'une seule attaque dépassent
    // largement `teamPoints.damagePerPoint` (300 par défaut).
    const raidCardSet = await prisma.cardSet.create({
      data: { name: `ProgRaidSet${suffix}`, isActive: false },
    })
    const raidCard = await prisma.card.create({
      data: {
        name: `ProgRaidCard${suffix}`,
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
    const raidUserCard = await prisma.userCard.create({
      data: {
        userId: userIdP,
        cardId: raidCardId,
        variant: 'NORMAL',
        quantity: 1,
        level: 60,
        palier: 6,
      },
    })
    raidUserCardId = raidUserCard.id

    const element = raidElementForWeek(weekKey)
    await prisma.raidBoss.upsert({
      where: { element },
      create: {
        element,
        name: 'Boss de progression',
        spec: { ...WEAK_BOSS_SPEC, element },
      },
      update: {
        name: 'Boss de progression',
        spec: { ...WEAK_BOSS_SPEC, element },
      },
    })
  })

  afterAll(async () => {
    await prisma.cardSet.updateMany({ data: { isActive: false } })
    if (baselineActiveSetIds.length > 0) {
      await prisma.cardSet.updateMany({
        where: { id: { in: baselineActiveSetIds } },
        data: { isActive: true },
      })
    }
    // `teamPoints.perPull` est modifié par le dernier test (franchissement
    // de seuil) : remise à l'état trouvé, cette clé est GLOBALE et partagée
    // avec le reste de la suite e2e.
    await configService.set('teamPoints.perPull', basePerPull)
    await app.close()
  })

  it('un tirage crédite CHACUNE des équipes du joueur, du même montant', async () => {
    await activateOnly(pullSetId)
    await setTokens(userIdP, 10)

    const before1 = await weeklyPoints(team1Id, userIdP)
    const before2 = await weeklyPoints(team2Id, userIdP)

    const res = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookiesP },
    })
    expect(res.statusCode).toBe(201)

    const after1 = await waitFor(
      () => weeklyPoints(team1Id, userIdP),
      (v) => v > before1,
    )
    const after2 = await waitFor(
      () => weeklyPoints(team2Id, userIdP),
      (v) => v > before2,
    )

    // Le tirage vaut le MÊME montant plein dans chacune des deux équipes :
    // ce n'est pas un pot à partager. Une équipe seule aurait laissé passer
    // un fan-out cassé qui ne crédite que la première équipe trouvée.
    expect(after1 - before1).toBe(basePerPull)
    expect(after2 - before2).toBe(basePerPull)
  })

  it('un joueur sans équipe tire sans erreur et sans écriture de points', async () => {
    await activateOnly(pullSetId)
    await setTokens(userIdLone, 10)

    const res = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookiesLone },
    })
    expect(res.statusCode).toBe(201)

    // Pas de ligne du tout pour ce joueur, dans aucune équipe : `award`
    // résout une liste vide et sort sans rien écrire.
    const rows = await prisma.teamMemberWeekly.findMany({
      where: { userId: userIdLone },
    })
    expect(rows).toHaveLength(0)
  })

  it("une attaque de raid crédite l'équipe ATTAQUÉE, et elle seule", async () => {
    const before1 = await weeklyPoints(team1Id, userIdP)
    const before2 = await weeklyPoints(team2Id, userIdP)

    const res = await app.inject({
      method: 'POST',
      url: `/teams/${team1Id}/raid/attack`,
      headers: { cookie: cookiesP },
      payload: { userCardIds: [raidUserCardId] },
    })
    expect(res.statusCode).toBe(200)
    const damage = res.json().damage as number
    expect(damage).toBeGreaterThan(0)

    const damagePerPoint = (
      await configService.getMany('teamPoints.damagePerPoint')
    )['teamPoints.damagePerPoint']
    const expectedGain = Math.floor(damage / damagePerPoint)
    // Un boss sans défense doit produire assez de dégâts pour qu'au moins un
    // point tombe — sinon ce test ne distinguerait pas « crédité de 0 » de
    // « jamais appelé ».
    expect(expectedGain).toBeGreaterThan(0)

    const after1 = await waitFor(
      () => weeklyPoints(team1Id, userIdP),
      (v) => v >= before1 + expectedGain,
    )
    expect(after1 - before1).toBe(expectedGain)

    // team2 : le joueur y est membre, mais son raid n'a pas été attaqué.
    // On laisse une petite marge de temps pour qu'un branchement cassé
    // (qui créditerait toutes les équipes du joueur) ait l'occasion de
    // s'exprimer avant l'assertion.
    await new Promise((r) => setTimeout(r, 150))
    const after2 = await weeklyPoints(team2Id, userIdP)
    expect(after2).toBe(before2)
  })

  it('un duel gagné crédite le vainqueur ; le perdant ne reçoit rien', async () => {
    const before1 = await weeklyPoints(team1Id, userIdP)
    const before2 = await weeklyPoints(team2Id, userIdP)
    const beforeOpp = await weeklyPoints(team1Id, userIdOpp)

    const propose = await app.inject({
      method: 'POST',
      url: `/teams/${team1Id}/duels`,
      headers: { cookie: cookiesP },
      payload: { opponentId: userIdOpp },
    })
    expect(propose.statusCode).toBe(201)
    const duelId = propose.json().id as string

    const accept = await app.inject({
      method: 'POST',
      url: `/teams/${team1Id}/duels/${duelId}/accept`,
      headers: { cookie: cookiesOpp },
    })
    expect(accept.statusCode).toBe(200)

    // On force l'échéance dans le passé : l'adversaire (Opp) ne tire jamais
    // pour ce duel, donc seul le forfait à l'échéance peut trancher —
    // exactement le chemin qu'utilisent déjà duels.test.ts pour les
    // PENDING périmés, appliqué ici à un duel ACTIVE.
    await prisma.duel.update({
      where: { id: duelId },
      data: { deadlineAt: new Date(Date.now() - 1000) },
    })

    // P (le challenger) tire une carte qui score : ce tirage déclenche à la
    // fois le crédit PULL habituel (les deux équipes de P) et, via le
    // règlement fire-and-forget déjà câblé sur `/pulls`, le crédit DUEL_WON
    // (team1 seulement, puisque c'est l'équipe du duel).
    await activateOnly(hotSetId)
    await setTokens(userIdP, 5)
    const pull = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookiesP },
    })
    expect(pull.statusCode).toBe(201)

    const duelWon = (
      await configService.getMany('teamPoints.duelWon')
    )['teamPoints.duelWon']
    const expected1 = before1 + basePerPull + duelWon
    const expected2 = before2 + basePerPull

    await waitFor(
      () => prisma.duel.findUnique({ where: { id: duelId } }),
      (row: any) => row?.status === 'SETTLED',
    )
    const after1 = await waitFor(
      () => weeklyPoints(team1Id, userIdP),
      (v) => v >= expected1,
    )
    const after2 = await waitFor(
      () => weeklyPoints(team2Id, userIdP),
      (v) => v >= expected2,
    )
    expect(after1).toBe(expected1)
    expect(after2).toBe(expected2)

    const settled = await prisma.duel.findUnique({ where: { id: duelId } })
    expect(settled.winnerId).toBe(userIdP)

    // Le perdant (Opp), qui n'a jamais tiré pour ce duel, n'a rien gagné.
    await new Promise((r) => setTimeout(r, 150))
    const afterOpp = await weeklyPoints(team1Id, userIdOpp)
    expect(afterOpp).toBe(beforeOpp)
  })

  describe('paris', () => {
    async function placeBet(stake = 200) {
      await activateOnly(mixedSetId)
      await prisma.user.update({
        where: { id: userIdP },
        data: { dust: 5000 },
      })
      const res = await app.inject({
        method: 'POST',
        url: `/teams/${team1Id}/bets`,
        headers: { cookie: cookiesP },
        payload: { targetId: userIdOpp, minRarity: 'RARE', stake },
      })
      expect(res.statusCode).toBe(201)
      return res.json().id as string
    }

    it('un pari WON crédite le parieur', async () => {
      const before1 = await weeklyPoints(team1Id, userIdP)
      const betId = await placeBet()

      // Catalogue garanti RARE : le premier tirage d'Opp gagne le pari.
      await activateOnly(hotSetId)
      await setTokens(userIdOpp, 5)
      const pull = await app.inject({
        method: 'POST',
        url: '/pulls',
        headers: { cookie: cookiesOpp },
      })
      expect(pull.statusCode).toBe(201)

      await waitFor(
        () => prisma.bet.findUnique({ where: { id: betId } }),
        (row: any) => row?.status === 'WON',
      )

      const betWon = (
        await configService.getMany('teamPoints.betWon')
      )['teamPoints.betWon']
      const after1 = await waitFor(
        () => weeklyPoints(team1Id, userIdP),
        (v) => v >= before1 + betWon,
      )
      expect(after1).toBe(before1 + betWon)
    })

    it('un pari LOST ne crédite rien au parieur', async () => {
      const before1 = await weeklyPoints(team1Id, userIdP)
      const betId = await placeBet()

      const pullWindow = (
        await configService.getMany('bet.pullWindow')
      )['bet.pullWindow']

      // Catalogue garanti COMMON : aucun des `pullWindow` tirages d'Opp ne
      // qualifie, le pari se solde LOST.
      await activateOnly(pullSetId)
      await setTokens(userIdOpp, pullWindow + 2)
      for (let i = 0; i < pullWindow; i++) {
        const pull = await app.inject({
          method: 'POST',
          url: '/pulls',
          headers: { cookie: cookiesOpp },
        })
        expect(pull.statusCode).toBe(201)
      }

      await waitFor(
        () => prisma.bet.findUnique({ where: { id: betId } }),
        (row: any) => row?.status === 'LOST',
      )

      await new Promise((r) => setTimeout(r, 150))
      const after1 = await weeklyPoints(team1Id, userIdP)
      expect(after1).toBe(before1)
    })

    it("un pari EXPIRED ne crédite rien au parieur", async () => {
      const before1 = await weeklyPoints(team1Id, userIdP)
      const betId = await placeBet()

      // Opp ne tire jamais pour ce pari : à l'échéance forcée dans le
      // passé, `betVerdict` rembourse (EXPIRED) plutôt que de faire perdre.
      await prisma.bet.update({
        where: { id: betId },
        data: { deadlineAt: new Date(Date.now() - 1000) },
      })

      // Le passage EXPIRED est paresseux : c'est la lecture de la vue
      // d'équipe qui le déclenche, comme pour les PENDING périmés des
      // duels.
      const view = await app.inject({
        method: 'GET',
        url: `/teams/${team1Id}/wagers`,
        headers: { cookie: cookiesP },
      })
      expect(view.statusCode).toBe(200)

      await waitFor(
        () => prisma.bet.findUnique({ where: { id: betId } }),
        (row: any) => row?.status === 'EXPIRED',
      )

      await new Promise((r) => setTimeout(r, 150))
      const after1 = await weeklyPoints(team1Id, userIdP)
      expect(after1).toBe(before1)
    })
  })

  it("franchir un seuil d'XP fait monter l'équipe de niveau et crée un point de bonus", async () => {
    // Aucun endpoint n'expose encore la progression (tâche 7) : on lit la
    // ligne Team directement, et on prédit son état futur avec la même
    // fonction pure que le domaine (`applyTeamXp`), jamais avec des
    // constantes recopiées à la main.
    const cfg = await configService.getMany(
      'teamLevel.xpBase',
      'teamLevel.xpExp',
      'teamLevel.maxLevel',
    )
    const before = await teamProgress(team1Id)

    // Pondération temporairement énorme : un seul tirage doit suffire à
    // franchir au moins un seuil, quel que soit l'XP déjà accumulé par
    // team1 dans les tests précédents.
    const boostedPerPull = 5000
    await configService.set('teamPoints.perPull', boostedPerPull)

    const expected = applyTeamXp(
      { level: before.level, xp: before.xp },
      boostedPerPull,
      {
        xpBase: cfg['teamLevel.xpBase'],
        xpExp: cfg['teamLevel.xpExp'],
        maxLevel: cfg['teamLevel.maxLevel'],
      },
    )
    expect(expected.perkPointsGained).toBeGreaterThan(0)

    await activateOnly(pullSetId)
    await setTokens(userIdP, 5)
    const res = await app.inject({
      method: 'POST',
      url: '/pulls',
      headers: { cookie: cookiesP },
    })
    expect(res.statusCode).toBe(201)

    const after = await waitFor(
      () => teamProgress(team1Id),
      (v) => v.level >= expected.level && v.xp !== before.xp,
    )
    expect(after.level).toBe(expected.level)
    expect(after.xp).toBe(expected.xp)
    expect(after.perkPoints).toBe(before.perkPoints + expected.perkPointsGained)

    await configService.set('teamPoints.perPull', basePerPull)
  })

  it("une equipe a tous ses rangs investis monte de niveau SANS gagner de point mort", async () => {
    // Le plafond de niveau (50) donne 49 points, les quatre bonus n'en
    // prennent que 17 (loot 5 + raid 2 + xp 5 + forge 5) : au-dela, un point
    // credite serait indepensable, et le panneau afficherait une pastille et
    // un bouton que rien ne peut consommer. Retirer le plafonnement de
    // `#awardToTeam` fait tomber ce test sur `after2.perkPoints`.
    //
    // Chaque bonus est rempli a SON plafond, pas a un plafond commun : c'est
    // ce qui verifie que la capacite est bien une somme. Remettre un plafond
    // unique fait croire a une place libre sur `raid` et recredite un point.
    const cfg = await configService.getMany(
      'teamPerk.loot.maxRank',
      'teamPerk.raid.maxRank',
      'teamPerk.xp.maxRank',
      'teamPerk.forge.maxRank',
      'teamLevel.xpBase',
      'teamLevel.xpExp',
      'teamLevel.maxLevel',
    )

    // team2 : les quatre bonus au rang maximum, plus une seule place libre.
    await prisma.teamPerk.deleteMany({ where: { teamId: team2Id } })
    for (const key of ['loot', 'raid', 'xp', 'forge'] as const) {
      await prisma.teamPerk.create({
        data: { teamId: team2Id, key, rank: cfg[`teamPerk.${key}.maxRank`] },
      })
    }
    // Les points EN MAIN sont remis a zero, et ce n'est pas cosmetique : ils
    // comptent dans la capacite restante. Tant que team2 en detenait trois ou
    // plus, la capacite etait saturee par eux seuls et le test passait meme
    // avec une capacite fausse — verifie en remplacant la somme par un
    // plafond commun (4 x 5 = 20), qui ne tuait alors aucun test.
    await prisma.team.update({
      where: { id: team2Id },
      data: { perkPoints: 0 },
    })

    const before1 = await teamProgress(team1Id)
    const before2 = await teamProgress(team2Id)

    const boostedPerPull = 5000
    await configService.set('teamPoints.perPull', boostedPerPull)
    try {
      const expected2 = applyTeamXp(
        { level: before2.level, xp: before2.xp },
        boostedPerPull,
        {
          xpBase: cfg['teamLevel.xpBase'],
          xpExp: cfg['teamLevel.xpExp'],
          maxLevel: cfg['teamLevel.maxLevel'],
        },
      )
      // Sans le plafonnement, ce sont AUTANT de points qui seraient credites.
      expect(expected2.perkPointsGained).toBeGreaterThan(0)

      await activateOnly(pullSetId)
      await setTokens(userIdP, 5)
      const res = await app.inject({
        method: 'POST',
        url: '/pulls',
        headers: { cookie: cookiesP },
      })
      expect(res.statusCode).toBe(201)

      const after2 = await waitFor(
        () => teamProgress(team2Id),
        (v) => v.level >= expected2.level,
      )
      // Le NIVEAU monte : c'est l'anciennete de l'equipe, elle est
      // deliberement conservee au-dela du vingtieme point.
      expect(after2.level).toBe(expected2.level)
      // Les POINTS, eux, ne bougent pas : il n'y a plus rien a remplir.
      expect(after2.perkPoints).toBe(before2.perkPoints)

      // Temoin dans le meme tirage : team1 n'a rien investi et recoit bien
      // ses points, sinon ce test passerait aussi avec un credit casse.
      const after1 = await waitFor(
        () => teamProgress(team1Id),
        (v) => v.level > before1.level,
      )
      expect(after1.perkPoints).toBeGreaterThan(before1.perkPoints)
    } finally {
      await configService.set('teamPoints.perPull', basePerPull)
      await prisma.teamPerk.deleteMany({ where: { teamId: team2Id } })
    }
  })
})
