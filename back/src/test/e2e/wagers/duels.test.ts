import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'

describe('cycle de vie du duel', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: any
  let configService: any
  let cookiesA: string
  let cookiesB: string
  let cookiesC: string
  let cookiesD: string
  let cookiesE: string
  let userIdA: string
  let userIdB: string
  let userIdC: string
  let userIdD: string
  let userIdE: string
  let teamId: string

  const suffix = Date.now()
  const password = 'Password123!'

  async function registerAndLogin(tag: string) {
    const email = `duel${tag}${suffix}@test.com`
    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username: `duel${tag}${suffix}`, email, password },
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

  beforeAll(async () => {
    app = await buildTestApp()
    const container = (app as any).iocContainer
    prisma = container.postgresOrm.prisma
    configService = container.configService

    const a = await registerAndLogin('A')
    const b = await registerAndLogin('B')
    const c = await registerAndLogin('C')
    // D et E : deux membres supplementaires de l'equipe, jamais engages
    // dans un duel A/B. Ils servent a isoler la branche "adversaire deja
    // engage" (D defie B) de la branche "defieur deja engage" (couverte
    // par A/B ailleurs), et a exercer l'expiration paresseuse de
    // listForTeam sans jamais passer par la route accept.
    const d = await registerAndLogin('D')
    const e = await registerAndLogin('E')
    userIdA = a.userId
    userIdB = b.userId
    userIdC = c.userId
    userIdD = d.userId
    userIdE = e.userId
    cookiesA = a.cookies
    cookiesB = b.cookies
    cookiesC = c.cookies
    cookiesD = d.cookies
    cookiesE = e.cookies

    const team = await app.inject({
      method: 'POST',
      url: '/teams',
      headers: { cookie: cookiesA },
      payload: { name: `DuelTeam${suffix}` },
    })
    expect(team.statusCode).toBe(201)
    teamId = team.json().id
    await prisma.teamMember.create({
      data: { teamId, userId: userIdB, role: 'MEMBER' },
    })
    await prisma.teamMember.create({
      data: { teamId, userId: userIdD, role: 'MEMBER' },
    })
    await prisma.teamMember.create({
      data: { teamId, userId: userIdE, role: 'MEMBER' },
    })
  })

  afterAll(async () => {
    await app.close()
  })

  // Le declenchement au tirage (POST /pulls) est fire-and-forget (`void
  // duelDomain.settleForUser(...).catch(...)`) : la reponse HTTP du dernier
  // tirage revient avant que le reglement asynchrone n'ait forcement fini.
  // On sonde donc la ligne Duel jusqu'a ce qu'elle passe SETTLED plutot que
  // de supposer une completion synchrone.
  async function waitForDuelStatus(
    duelId: string,
    status: string,
    timeoutMs = 5000,
  ) {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const row = await prisma.duel.findUnique({ where: { id: duelId } })
      if (row?.status === status) {
        return row
      }
      await new Promise((r) => setTimeout(r, 25))
    }
    throw new Error(
      `Timeout: le duel ${duelId} n'a pas atteint le statut ${status}`,
    )
  }

  // Deactive tous les CardSet puis n'active que celui donne — cette suite
  // possede sa propre base tronquee (globalSetup), donc aucun autre fichier
  // e2e ne tourne en meme temps : pas besoin de restaurer un etat anterieur.
  async function activateOnly(setId: string) {
    await prisma.cardSet.updateMany({ data: { isActive: false } })
    await prisma.cardSet.update({
      where: { id: setId },
      data: { isActive: true },
    })
  }

  it('GET /teams/:id/wagers exige une session', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/wagers`,
    })
    expect(res.statusCode).toBe(401)
  })

  it('GET /teams/:id/wagers refuse un non-membre', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/wagers`,
      headers: { cookie: cookiesC },
    })
    expect(res.statusCode).toBe(403)
  })

  it("POST /teams/:id/duels refuse un non-membre, sans creer de duel", async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesC },
      payload: { opponentId: userIdA },
    })
    expect(res.statusCode).toBe(403)
    const duels = await prisma.duel.findMany({ where: { teamId } })
    expect(duels).toHaveLength(0)
  })

  it('POST /teams/:id/duels : A ne peut pas se defier lui-meme', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesA },
      payload: { opponentId: userIdA },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /teams/:id/duels : A ne peut pas defier C, hors equipe', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesA },
      payload: { opponentId: userIdC },
    })
    expect([400, 403]).toContain(res.statusCode)
  })

  let duel1Id: string

  it('POST /teams/:id/duels : A defie B -> 201 PENDING, pullCount fige', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesA },
      payload: { opponentId: userIdB },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.status).toBe('PENDING')
    expect(body.challenger.id).toBe(userIdA)
    expect(body.opponent.id).toBe(userIdB)
    expect(body.myRole).toBe('CHALLENGER')
    duel1Id = body.id

    const row = await prisma.duel.findUnique({ where: { id: duel1Id } })
    expect(row.status).toBe('PENDING')
    expect(row.pullCount).toBe(5)
  })

  it('POST /teams/:id/duels : A a deja un duel ouvert -> 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesA },
      payload: { opponentId: userIdB },
    })
    expect(res.statusCode).toBe(409)
    const duels = await prisma.duel.findMany({ where: { teamId } })
    expect(duels).toHaveLength(1)
  })

  it("POST /teams/:id/duels : D (libre) defie B (deja engage comme adversaire) -> 409 cote adversaire, pas cote defieur", async () => {
    // D n'a jamais eu de duel : si le 409 tombe, ce n'est pas parce que D
    // (le defieur) est deja engage — c'est forcement la branche qui
    // verifie que l'ADVERSAIRE (B, deja opponent de duel1 PENDING) est
    // deja engage. Un domaine qui n'appellerait findOpenDuelForUser que
    // sur le defieur laisserait passer cette requete en 201.
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesD },
      payload: { opponentId: userIdB },
    })
    expect(res.statusCode).toBe(409)
    const body = res.json()
    // Le message cote defieur est fige ("Tu as deja..."), le message cote
    // adversaire nomme la victime — ca distingue les deux branches plutot
    // que de se contenter du code 409.
    expect(body.message).not.toBe('Tu as déjà un duel en cours')
    expect(body.message).toContain(`duelB${suffix}`)

    // Aucun effet de bord : ni pour D, ni un duel supplementaire sur l'equipe.
    const duelsForD = await prisma.duel.findMany({
      where: { OR: [{ challengerId: userIdD }, { opponentId: userIdD }] },
    })
    expect(duelsForD).toHaveLength(0)
    const duels = await prisma.duel.findMany({ where: { teamId } })
    expect(duels).toHaveLength(1)
  })

  it('POST accept : le defieur (A) ne peut pas accepter son propre duel', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${duel1Id}/accept`,
      headers: { cookie: cookiesA },
    })
    expect(res.statusCode).toBe(403)
    const row = await prisma.duel.findUnique({ where: { id: duel1Id } })
    expect(row.status).toBe('PENDING')
  })

  it('POST decline : B refuse le duel -> DECLINED, libere A et B', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${duel1Id}/decline`,
      headers: { cookie: cookiesB },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('DECLINED')
    const row = await prisma.duel.findUnique({ where: { id: duel1Id } })
    expect(row.status).toBe('DECLINED')
  })

  let duel2Id: string

  it('POST /teams/:id/duels : nouveau duel A vs B, puis annule par A -> CANCELLED', async () => {
    const propose = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesA },
      payload: { opponentId: userIdB },
    })
    expect(propose.statusCode).toBe(201)
    duel2Id = propose.json().id

    const cancelByB = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${duel2Id}/cancel`,
      headers: { cookie: cookiesB },
    })
    expect(cancelByB.statusCode).toBe(403)

    const cancel = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${duel2Id}/cancel`,
      headers: { cookie: cookiesA },
    })
    expect(cancel.statusCode).toBe(200)
    expect(cancel.json().status).toBe('CANCELLED')
    const row = await prisma.duel.findUnique({ where: { id: duel2Id } })
    expect(row.status).toBe('CANCELLED')
  })

  it("une acceptation apres le delai d'acceptation expire le duel -> 409, statut EXPIRED", async () => {
    const propose = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesA },
      payload: { opponentId: userIdB },
    })
    expect(propose.statusCode).toBe(201)
    const expiredDuelId = propose.json().id as string

    await prisma.duel.update({
      where: { id: expiredDuelId },
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    })

    const accept = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${expiredDuelId}/accept`,
      headers: { cookie: cookiesB },
    })
    expect(accept.statusCode).toBe(409)
    const row = await prisma.duel.findUnique({ where: { id: expiredDuelId } })
    expect(row.status).toBe('EXPIRED')
  })

  let duel3Id: string

  it('POST accept : B accepte -> ACTIVE, acceptedAt et deadlineAt poses', async () => {
    await configService.set('duel.pullCount', 9)

    const propose = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesA },
      payload: { opponentId: userIdB },
    })
    expect(propose.statusCode).toBe(201)
    duel3Id = propose.json().id
    expect(propose.json().pullCount).toBe(9)

    const accept = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${duel3Id}/accept`,
      headers: { cookie: cookiesB },
    })
    expect(accept.statusCode).toBe(200)
    const body = accept.json()
    expect(body.status).toBe('ACTIVE')
    expect(body.acceptedAt).not.toBeNull()
    expect(body.deadlineAt).not.toBeNull()

    const row = await prisma.duel.findUnique({ where: { id: duel3Id } })
    expect(row.status).toBe('ACTIVE')
    expect(row.acceptedAt).not.toBeNull()
    expect(row.deadlineAt).not.toBeNull()
    expect(row.pullCount).toBe(9)

    // Le pullCount d'un duel deja resolu (duel1, avant le changement de
    // config) reste fige a l'ancienne valeur.
    const oldRow = await prisma.duel.findUnique({ where: { id: duel1Id } })
    expect(oldRow.pullCount).toBe(5)
  })

  it('POST accept : une seconde acceptation echoue -> 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels/${duel3Id}/accept`,
      headers: { cookie: cookiesB },
    })
    expect(res.statusCode).toBe(409)
    const row = await prisma.duel.findUnique({ where: { id: duel3Id } })
    expect(row.status).toBe('ACTIVE')
  })

  it('GET /teams/:id/wagers par A : le duel actif apparait, myRole CHALLENGER', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/wagers`,
      headers: { cookie: cookiesA },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    const found = body.duels.find((d: any) => d.id === duel3Id)
    expect(found).toBeDefined()
    expect(found.status).toBe('ACTIVE')
    expect(found.myRole).toBe('CHALLENGER')
    expect(found.pullCount).toBe(9)
    expect(found.challengerScore).toBe(0)
    expect(found.opponentScore).toBe(0)
  })

  it("GET /teams/:id/wagers expire lui-meme un PENDING perime, sans passer par accept", async () => {
    // D et E n'ont jamais ete engages dans un duel : ce nouveau duel entre
    // eux n'a pas besoin qu'A/B se liberent.
    const propose = await app.inject({
      method: 'POST',
      url: `/teams/${teamId}/duels`,
      headers: { cookie: cookiesD },
      payload: { opponentId: userIdE },
    })
    expect(propose.statusCode).toBe(201)
    const staleDuelId = propose.json().id as string
    expect(propose.json().status).toBe('PENDING')

    await prisma.duel.update({
      where: { id: staleDuelId },
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    })

    // Lecture seule : ni accept ni decline ni cancel n'est appele ici.
    // C'est le scan paresseux de listForTeam, et lui seul, qui doit
    // expirer ce PENDING.
    const res = await app.inject({
      method: 'GET',
      url: `/teams/${teamId}/wagers`,
      headers: { cookie: cookiesA },
    })
    expect(res.statusCode).toBe(200)

    const row = await prisma.duel.findUnique({ where: { id: staleDuelId } })
    expect(row.status).toBe('EXPIRED')

    const inView = res.json().duels.find((d: any) => d.id === staleDuelId)
    expect(inView).toBeDefined()
    expect(inView.status).toBe('EXPIRED')
  })

  describe('reglement du duel', () => {
    let legendarySetId: string
    let commonSetId: string
    let commonCardId: string

    it('duel3 (A vs B, 9 tirages) : A rafle du LEGENDARY, B du COMMON -> reglement automatique au dernier tirage, cartes transferees, B garde sa poussiere', async () => {
      const legendarySet = await prisma.cardSet.create({
        data: { name: `DuelLegendarySet${suffix}`, isActive: false },
      })
      const legendaryCard = await prisma.card.create({
        data: {
          name: `DuelLegendaryCard${suffix}`,
          rarity: 'LEGENDARY',
          dropWeight: 10,
          setId: legendarySet.id,
        },
      })
      const commonSet = await prisma.cardSet.create({
        data: { name: `DuelCommonSet${suffix}`, isActive: false },
      })
      const commonCard = await prisma.card.create({
        data: {
          name: `DuelCommonCard${suffix}`,
          rarity: 'COMMON',
          dropWeight: 10,
          setId: commonSet.id,
        },
      })
      legendarySetId = legendarySet.id
      commonSetId = commonSet.id
      commonCardId = commonCard.id

      await prisma.user.update({
        where: { id: userIdA },
        data: { tokens: 20, lastTokenAt: new Date() },
      })
      await prisma.user.update({
        where: { id: userIdB },
        data: { tokens: 20, lastTokenAt: new Date() },
      })

      // A ne pioche que dans un catalogue 100% LEGENDARY : 9 tirages, 9
      // LEGENDARY, score largement superieur a celui de B.
      await activateOnly(legendarySet.id)
      for (let i = 0; i < 9; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/pulls',
          headers: { cookie: cookiesA },
        })
        expect(res.statusCode).toBe(201)
      }

      // B ne pioche que dans un catalogue 100% COMMON, meme carte a chaque
      // fois (le COMMON n'est jamais eligible aux variantes brillante/holo,
      // donc toujours NORMAL) : 9 tirages, une seule ligne UserCard a
      // quantite 9 avant transfert.
      await activateOnly(commonSet.id)
      for (let i = 0; i < 9; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/pulls',
          headers: { cookie: cookiesB },
        })
        expect(res.statusCode).toBe(201)
      }

      // La poussiere de B est deja creditee de facon synchrone (dans la
      // transaction du dernier /pulls) ; le reglement, lui, est asynchrone
      // (fire-and-forget) et ne doit rien y changer.
      const bDustBeforeSettle = (
        await prisma.user.findUnique({ where: { id: userIdB } })
      ).dust

      const settled = await waitForDuelStatus(duel3Id, 'SETTLED')
      expect(settled.winnerId).toBe(userIdA)
      expect(settled.settledAt).not.toBeNull()

      const bDustAfterSettle = (
        await prisma.user.findUnique({ where: { id: userIdB } })
      ).dust
      expect(bDustAfterSettle).toBe(bDustBeforeSettle)

      // Les 9 cartes de B (le perdant) sont chez A (le vainqueur), et B n'en
      // a plus une seule (derniere copie supprimee).
      const aCommonCard = await prisma.userCard.findUnique({
        where: {
          userId_cardId_variant: {
            userId: userIdA,
            cardId: commonCard.id,
            variant: 'NORMAL',
          },
        },
      })
      expect(aCommonCard).not.toBeNull()
      expect(aCommonCard?.quantity).toBe(9)

      const bCommonCard = await prisma.userCard.findUnique({
        where: {
          userId_cardId_variant: {
            userId: userIdB,
            cardId: commonCard.id,
            variant: 'NORMAL',
          },
        },
      })
      expect(bCommonCard).toBeNull()

      // Une ligne DuelTransfer par carte transferee.
      const transfers = await prisma.duelTransfer.findMany({
        where: { duelId: duel3Id },
      })
      expect(transfers).toHaveLength(9)
      for (const t of transfers) {
        expect(t.cardId).toBe(commonCard.id)
        expect(t.fromUserId).toBe(userIdB)
        expect(t.toUserId).toBe(userIdA)
      }
    })

    it('idempotence : rejouer settleForUser sur duel3 (deja SETTLED) ne transfere rien de plus', async () => {
      const { duelDomain } = (app as any).iocContainer
      const before = await prisma.duelTransfer.count({
        where: { duelId: duel3Id },
      })

      await duelDomain.settleForUser(userIdA)
      await duelDomain.settleForUser(userIdB)

      const after = await prisma.duelTransfer.count({
        where: { duelId: duel3Id },
      })
      expect(after).toBe(before)

      const row = await prisma.duel.findUnique({ where: { id: duel3Id } })
      expect(row.status).toBe('SETTLED')
    })

    it('egalite : D et E tirent toujours la meme carte -> SETTLED, winnerId null, aucun DuelTransfer', async () => {
      await configService.set('duel.pullCount', 2)

      const propose = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/duels`,
        headers: { cookie: cookiesD },
        payload: { opponentId: userIdE },
      })
      expect(propose.statusCode).toBe(201)
      const tieDuelId = propose.json().id as string
      expect(propose.json().pullCount).toBe(2)

      const accept = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/duels/${tieDuelId}/accept`,
        headers: { cookie: cookiesE },
      })
      expect(accept.statusCode).toBe(200)

      await prisma.user.updateMany({
        where: { id: { in: [userIdD, userIdE] } },
        data: { tokens: 10, lastTokenAt: new Date() },
      })

      // Un seul catalogue actif (COMMON) : D et E tirent forcement la meme
      // carte a chaque fois, donc un score identique -> egalite.
      await activateOnly(commonSetId)
      for (let i = 0; i < 2; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/pulls',
          headers: { cookie: cookiesD },
        })
        expect(res.statusCode).toBe(201)
      }
      for (let i = 0; i < 2; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/pulls',
          headers: { cookie: cookiesE },
        })
        expect(res.statusCode).toBe(201)
      }

      const settled = await waitForDuelStatus(tieDuelId, 'SETTLED')
      expect(settled.winnerId).toBeNull()
      expect(settled.challengerScore).toBe(settled.opponentScore)

      const transfers = await prisma.duelTransfer.count({
        where: { duelId: tieDuelId },
      })
      expect(transfers).toBe(0)
    })

    it("echeance depassee, tirages manquants d'un cote : GET /teams/:id/wagers regle sur le score partiel", async () => {
      // A et B sont libres depuis le reglement de duel3.
      const propose = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/duels`,
        headers: { cookie: cookiesA },
        payload: { opponentId: userIdB },
      })
      expect(propose.statusCode).toBe(201)
      const deadlineDuelId = propose.json().id as string
      expect(propose.json().pullCount).toBe(2)

      const accept = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/duels/${deadlineDuelId}/accept`,
        headers: { cookie: cookiesB },
      })
      expect(accept.statusCode).toBe(200)

      // L'echeance est encore loin : ce tirage d'A ne doit PAS regler le
      // duel (verdict encore indecidable), seulement mettre a jour son
      // compteur de tirages.
      await activateOnly(legendarySetId)
      await prisma.user.update({
        where: { id: userIdA },
        data: { tokens: 10, lastTokenAt: new Date() },
      })
      const pullA = await app.inject({
        method: 'POST',
        url: '/pulls',
        headers: { cookie: cookiesA },
      })
      expect(pullA.statusCode).toBe(201)
      // Laisse le reglement fire-and-forget declenche par ce tirage se
      // terminer (verdict null attendu, sans effet observable a sonder).
      await new Promise((r) => setTimeout(r, 100))

      let row = await prisma.duel.findUnique({ where: { id: deadlineDuelId } })
      expect(row?.status).toBe('ACTIVE')
      expect(row?.challengerPulls).toBe(1)

      // On force l'echeance dans le passe : B n'a jamais tire.
      await prisma.duel.update({
        where: { id: deadlineDuelId },
        data: { deadlineAt: new Date(Date.now() - 1000) },
      })

      const wagers = await app.inject({
        method: 'GET',
        url: `/teams/${teamId}/wagers`,
        headers: { cookie: cookiesA },
      })
      expect(wagers.statusCode).toBe(200)

      row = await prisma.duel.findUnique({ where: { id: deadlineDuelId } })
      expect(row?.status).toBe('SETTLED')
      expect(row?.winnerId).toBe(userIdA)
      expect(row?.challengerPulls).toBe(1)
      expect(row?.opponentPulls).toBe(0)

      const inView = wagers
        .json()
        .settledDuels.find((d: any) => d.id === deadlineDuelId)
      expect(inView).toBeDefined()
      expect(inView.status).toBe('SETTLED')
      expect(inView.winnerId).toBe(userIdA)
    })
  })
})
