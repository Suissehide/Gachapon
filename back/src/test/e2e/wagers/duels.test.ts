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
  let basePullCount: number

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
    basePullCount = (await configService.getMany('duel.pullCount'))[
      'duel.pullCount'
    ]

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
    // `duel.pullCount` est une config GLOBALE partagee avec les autres
    // fichiers e2e : sans cette remise en etat, la valeur 9 posee plus bas
    // survit au fichier et fait echouer economy-config.e2e.test.ts, qui
    // verifie que /economy/config expose bien le defaut.
    await configService.set('duel.pullCount', basePullCount)
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

  // Deactive tous les CardSet puis n'active que celui donne. ATTENTION :
  // globalSetup ne tronque la base qu'une fois par run, pas par fichier —
  // les fichiers e2e partagent la meme base et peuvent tourner dans le
  // meme process. Ce catalogue est donc un etat partage : voir le
  // snapshot/restore dans le describe('reglement du duel') plus bas, sur
  // le modele de gacha/pull.test.ts.
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
    // deja engage. Un domaine qui n'appellerait findOpenDuelForUserInTx que
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

  it('deux propositions simultanees sur les memes joueurs : une seule ligne creee', async () => {
    // Lues hors transaction, les deux verifications « un seul duel ouvert »
    // voient toutes deux « aucun duel » et les deux insertions passent : le
    // joueur se retrouve avec deux duels actifs, et un seul tirage tombant
    // dans les deux fenetres lui est saisi DEUX fois.
    const fire = () =>
      app.inject({
        method: 'POST',
        url: `/teams/${teamId}/duels`,
        headers: { cookie: cookiesA },
        payload: { opponentId: userIdB },
      })
    const [first, second] = await Promise.all([fire(), fire()])
    const codes = [first.statusCode, second.statusCode].sort()
    expect(codes).toEqual([201, 409])

    const open = await prisma.duel.findMany({
      where: {
        teamId,
        status: { in: ['PENDING', 'ACTIVE'] },
        OR: [{ challengerId: userIdA }, { opponentId: userIdA }],
      },
    })
    expect(open).toHaveLength(1)

    // On libere A et B pour la suite du fichier.
    await prisma.duel.update({
      where: { id: open[0].id },
      data: { status: 'CANCELLED' },
    })
  })

  it("accept, decline et cancel re-verifient le statut A L'ECRITURE, pas seulement a la lecture", async () => {
    // Les trois commandes lisent le duel, verifient qu'il est PENDING, puis
    // ecrivent — trois instructions non serialisees. On force ici
    // l'entrelacement naturel (le defieur annule pendant que l'adversaire
    // accepte) en faisant passer la ligne a CANCELLED juste APRES la
    // lecture. Sans le `where: { status: 'PENDING' }` de l'ecriture, un duel
    // annule repasserait ACTIVE — verrouillant les cartes des deux joueurs
    // et saisissant celles du perdant.
    const { wagerRepository } = (app as any).iocContainer
    const originalFind = wagerRepository.findDuelById.bind(wagerRepository)

    const cases = [
      { action: 'accept', cookie: () => cookiesB },
      { action: 'decline', cookie: () => cookiesB },
      { action: 'cancel', cookie: () => cookiesA },
    ]
    for (const testCase of cases) {
      const propose = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/duels`,
        headers: { cookie: cookiesA },
        payload: { opponentId: userIdB },
      })
      expect(propose.statusCode).toBe(201)
      const duelId = propose.json().id as string

      let flipped = false
      wagerRepository.findDuelById = async (id: string) => {
        const duel = await originalFind(id)
        if (id === duelId && !flipped) {
          flipped = true
          await prisma.duel.update({
            where: { id },
            data: { status: 'CANCELLED' },
          })
        }
        return duel
      }
      try {
        const res = await app.inject({
          method: 'POST',
          url: `/teams/${teamId}/duels/${duelId}/${testCase.action}`,
          headers: { cookie: testCase.cookie() },
        })
        expect(res.statusCode).toBe(409)
        const row = await prisma.duel.findUnique({ where: { id: duelId } })
        expect(row.status).toBe('CANCELLED')
        expect(row.acceptedAt).toBeNull()
      } finally {
        wagerRepository.findDuelById = originalFind
      }
    }
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
    let baselineActiveSetIds: string[]

    // Snapshot des CardSet actifs AVANT toute manipulation du catalogue par
    // ce describe, et restauration a la fin — cette suite ne possede pas sa
    // propre base isolee (voir le commentaire d'activateOnly plus haut), il
    // faut donc rendre le catalogue exactement comme on l'a trouve.
    beforeAll(async () => {
      const active = await prisma.cardSet.findMany({
        where: { isActive: true },
        select: { id: true },
      })
      baselineActiveSetIds = active.map((s: { id: string }) => s.id)
    })

    afterAll(async () => {
      await prisma.cardSet.updateMany({ data: { isActive: false } })
      if (baselineActiveSetIds.length > 0) {
        await prisma.cardSet.updateMany({
          where: { id: { in: baselineActiveSetIds } },
          data: { isActive: true },
        })
      }
    })

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
          // Un CHEMIN de stockage, comme le seed en pose : la route doit le
          // convertir en URL publique avant de servir. Sans image ici, le
          // champ vaudrait null et la conversion ne serait jamais verifiee.
          imageUrl: `staging/cards/duel-${suffix}.png`,
          // Meme raison : un element nul ne prouverait pas que le champ
          // traverse le schema Zod jusqu'a la carte agrandie.
          element: 'WATER',
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

      // Le MEME compte est servi par la vue d'equipe : l'historique regle
      // affiche « +9 cartes », et l'evenement WebSocket `duel:settled` ne
      // porte ce nombre qu'au moment du reglement — au rechargement de la
      // page, il n'existe plus nulle part ailleurs.
      //
      // L'assertion porte sur `res.json()` et pas sur la valeur rendue par
      // le domaine : `fastify-type-provider-zod` retire silencieusement du
      // JSON toute cle absente du schema, donc un champ ajoute au domaine
      // mais oublie dans `duelViewSchema` passerait inapercu ici.
      const wagersView = await app.inject({
        method: 'GET',
        url: `/teams/${teamId}/wagers`,
        headers: { cookie: cookiesA },
      })
      expect(wagersView.statusCode).toBe(200)
      const settledDuel3 = wagersView
        .json()
        .settledDuels.find((d: any) => d.id === duel3Id)
      expect(settledDuel3).toBeDefined()
      expect(settledDuel3.transferredCount).toBe(9)

      // Le detail derriere le compte : QUELLES cartes, servi a la demande
      // par le bouton « voir les cartes » de l'historique.
      const detail = await app.inject({
        method: 'GET',
        url: `/teams/${teamId}/duels/${duel3Id}/transfers`,
        headers: { cookie: cookiesA },
      })
      expect(detail.statusCode).toBe(200)
      const transferRows = detail.json().transfers
      expect(transferRows).toHaveLength(9)
      for (const t of transferRows) {
        expect(t.card.id).toBe(commonCard.id)
        expect(t.card.name).toBe(commonCard.name)
        expect(t.card.rarity).toBe('COMMON')
        // L'URL est RESOLUE, pas le chemin brut de la colonne : servir la
        // valeur stockee telle quelle donnait un <img> mort. Le domaine rend
        // un `imageKey`, la route en fait une URL absolue.
        expect(t.card.imageUrl).not.toBe(commonCard.imageUrl)
        expect(t.card.imageUrl).toMatch(/^https?:\/\/.+\/staging\/cards\//)
        expect(t.card).not.toHaveProperty('imageKey')
        // Dessine la pastille d'element sur la carte agrandie.
        expect(t.card.element).toBe('WATER')
        // A est le vainqueur : les neuf cartes sont venues CHEZ LUI.
        expect(t.toMe).toBe(true)
        // Les identifiants bruts ne sortent pas : le domaine les a reduits
        // au seul `toMe`, et le schema ne les laisserait pas passer.
        expect(t.fromUserId).toBeUndefined()
        expect(t.toUserId).toBeUndefined()
      }

      // Meme duel lu par le PERDANT : les memes cartes, mais sorties de chez
      // lui. `toMe` est relatif au lecteur, pas au duel.
      const loserView = await app.inject({
        method: 'GET',
        url: `/teams/${teamId}/duels/${duel3Id}/transfers`,
        headers: { cookie: cookiesB },
      })
      expect(loserView.statusCode).toBe(200)
      expect(
        loserView.json().transfers.every((t: any) => t.toMe === false),
      ).toBe(true)

      // Un non-membre n'obtient rien, meme avec un identifiant de duel valide.
      const outsider = await app.inject({
        method: 'GET',
        url: `/teams/${teamId}/duels/${duel3Id}/transfers`,
        headers: { cookie: cookiesC },
      })
      expect(outsider.statusCode).toBe(403)
    })

    it('idempotence : reactiver artificiellement duel3 (deja SETTLED) et rejouer le reglement ne transfere rien de plus', async () => {
      const { duelDomain } = (app as any).iocContainer

      const transfersBefore = await prisma.duelTransfer.count({
        where: { duelId: duel3Id },
      })
      const aCardBefore = await prisma.userCard.findUnique({
        where: {
          userId_cardId_variant: {
            userId: userIdA,
            cardId: commonCardId,
            variant: 'NORMAL',
          },
        },
      })

      // On force le statut a redevenir ACTIVE SANS toucher settledAt ni
      // winnerId : `listActiveDuelsForUser` (filtre sur ACTIVE) ne fait
      // donc plus barrage, et `settleForUser` entre reellement dans
      // `#settle`. Si c'est le garde-fou en tete de `#settle` (relecture
      // du statut) ou l'absence de propriétaire cote perdant dans
      // `#transferPull` qui sauve l'idempotence, on le verifie ici pour de
      // vrai plutot que de compter sur le filtre du repository pour ne
      // jamais rentrer dans la transaction.
      await prisma.duel.update({
        where: { id: duel3Id },
        data: { status: 'ACTIVE' },
      })

      await duelDomain.settleForUser(userIdA)
      await duelDomain.settleForUser(userIdB)

      const transfersAfter = await prisma.duelTransfer.count({
        where: { duelId: duel3Id },
      })
      expect(transfersAfter).toBe(transfersBefore)

      const aCardAfter = await prisma.userCard.findUnique({
        where: {
          userId_cardId_variant: {
            userId: userIdA,
            cardId: commonCardId,
            variant: 'NORMAL',
          },
        },
      })
      expect(aCardAfter?.quantity).toBe(aCardBefore?.quantity)

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

    it("equipement : la piece portee sur la derniere copie du perdant est detachee (ligne conservee, equippedOnId a null)", async () => {
      // Carte dediee, jamais tiree avant dans ce fichier : garantit que D
      // part de zero exemplaire, donc que le transfert de ses tirages fait
      // tomber la quantite a 0 (branche "derniere copie") de facon fiable,
      // sans copies residuelles d'un test precedent qui fausseraient le
      // compte.
      const equipSet = await prisma.cardSet.create({
        data: { name: `DuelEquipSet${suffix}`, isActive: false },
      })
      const equipCard = await prisma.card.create({
        data: {
          name: `DuelEquipCard${suffix}`,
          rarity: 'COMMON',
          dropWeight: 10,
          setId: equipSet.id,
        },
      })

      const propose = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/duels`,
        headers: { cookie: cookiesD },
        payload: { opponentId: userIdE },
      })
      expect(propose.statusCode).toBe(201)
      const equipDuelId = propose.json().id as string
      const pullCount = propose.json().pullCount as number

      const accept = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/duels/${equipDuelId}/accept`,
        headers: { cookie: cookiesE },
      })
      expect(accept.statusCode).toBe(200)

      await prisma.user.updateMany({
        where: { id: { in: [userIdD, userIdE] } },
        data: { tokens: 20, lastTokenAt: new Date() },
      })

      // D (perdant prevu) ne tire que la carte dediee : toutes ses pulls
      // tombent sur la meme ligne UserCard.
      await activateOnly(equipSet.id)
      for (let i = 0; i < pullCount; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/pulls',
          headers: { cookie: cookiesD },
        })
        expect(res.statusCode).toBe(201)
      }

      const dCard = await prisma.userCard.findUniqueOrThrow({
        where: {
          userId_cardId_variant: {
            userId: userIdD,
            cardId: equipCard.id,
            variant: 'NORMAL',
          },
        },
      })
      expect(dCard.quantity).toBe(pullCount)

      // On equipe une piece directement en base sur cette carte (pas
      // besoin de passer par le flux d'equipement pour ce test) : c'est
      // elle qui doit se retrouver detachee, pas supprimee, au reglement.
      const equipment = await prisma.equipment.create({
        data: {
          name: `DuelEquipPiece${suffix}`,
          slot: 'WEAPON',
          setKey: 'FUREUR',
          rarity: 'COMMON',
          mainStat: 'attack',
          bonuses: {},
        },
      })
      const userEquipment = await prisma.userEquipment.create({
        data: {
          userId: userIdD,
          equipmentId: equipment.id,
          equippedOnId: dCard.id,
        },
      })

      // Et la meme carte est dans l'equipe de combat de D : perdre un duel
      // ne doit pas y laisser une reference morte, que la lecture d'equipe
      // filtre ensuite en silence.
      await prisma.user.update({
        where: { id: userIdD },
        data: { combatTeam: [dCard.id] },
      })

      // E ne tire que du LEGENDARY : score largement superieur, D perd et
      // sa derniere copie de la carte equipee est transferee (et
      // supprimee).
      await activateOnly(legendarySetId)
      for (let i = 0; i < pullCount; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/pulls',
          headers: { cookie: cookiesE },
        })
        expect(res.statusCode).toBe(201)
      }

      const settled = await waitForDuelStatus(equipDuelId, 'SETTLED')
      expect(settled.winnerId).toBe(userIdE)

      const dCardAfter = await prisma.userCard.findUnique({
        where: {
          userId_cardId_variant: {
            userId: userIdD,
            cardId: equipCard.id,
            variant: 'NORMAL',
          },
        },
      })
      expect(dCardAfter).toBeNull()

      // Les deux moities comptent : la ligne existe toujours (pas
      // supprimee en cascade avec la carte — onDelete: SetNull sur
      // equippedOnId, pas Cascade), ET equippedOnId est passe a null (le
      // detachement a bien eu lieu).
      const equipmentAfter = await prisma.userEquipment.findUnique({
        where: { id: userEquipment.id },
      })
      expect(equipmentAfter).not.toBeNull()
      expect(equipmentAfter?.equippedOnId).toBeNull()

      // L'identifiant a quitte l'equipe de combat du perdant, dans la meme
      // transaction que la suppression : pas de reference morte.
      const dAfter = await prisma.user.findUnique({ where: { id: userIdD } })
      expect(dAfter.combatTeam).not.toContain(dCard.id)
      expect(dAfter.combatTeam).toHaveLength(0)
    })
  })

  // Tache 7 : verrou des cartes engagees. Reutilise B (challenger, defieur)
  // et A (adversaire perdant) plutot que d'enregistrer de nouveaux comptes :
  // /auth/register est plafonne a 5 inscriptions / 15 min (voir
  // register.router.ts), et A-E epuisent deja ce quota dans ce fichier. B
  // termine chaque describe precedent sans la moindre UserCard residuelle
  // (perdant de duel3, puis perdant par forfait de l'echeance depassee) :
  // c'est le seul candidat propre pour verifier des comptes exacts sur le
  // recyclage de masse. A porte des doublons residuels (legendaryCard,
  // commonCardId) mais ca n'affecte pas ce describe : A n'y joue que le
  // role du perdant, dont on n'inspecte jamais la collection.
  describe('verrou des cartes engagees', () => {
    let engagedSetId: string
    let engagedCardId: string
    let extraSetId: string
    let extraCardId: string
    let loserSetId: string
    let lockDuelId: string

    beforeAll(async () => {
      await configService.set('duel.pullCount', 2)

      const engagedSet = await prisma.cardSet.create({
        data: { name: `LockEngagedSet${suffix}`, isActive: false },
      })
      const engagedCard = await prisma.card.create({
        data: {
          name: `LockEngagedCard${suffix}`,
          // UNCOMMON, pas LEGENDARY, et c'est structurel : seules RARE, EPIC
          // et LEGENDARY sont eligibles aux variantes (pickVariant), avec
          // 5 % de brillante et 2 % d'holo sur une legendaire. Les
          // assertions ci-dessous lisent la ligne UserCard en variant
          // NORMAL, donc une legendaire faisait echouer ce describe environ
          // une fois sur sept. UNCOMMON rend la variante deterministe sans
          // rien changer au verdict : 3 points contre 1 pour le COMMON du
          // perdant, B gagne toujours.
          rarity: 'UNCOMMON',
          dropWeight: 10,
          setId: engagedSet.id,
        },
      })
      engagedSetId = engagedSet.id
      engagedCardId = engagedCard.id

      const extraSet = await prisma.cardSet.create({
        data: { name: `LockExtraSet${suffix}`, isActive: false },
      })
      const extraCard = await prisma.card.create({
        data: {
          name: `LockExtraCard${suffix}`,
          rarity: 'COMMON',
          dropWeight: 10,
          setId: extraSet.id,
        },
      })
      extraSetId = extraSet.id
      extraCardId = extraCard.id

      const loserSet = await prisma.cardSet.create({
        data: { name: `LockLoserSet${suffix}`, isActive: false },
      })
      await prisma.card.create({
        data: {
          name: `LockLoserCard${suffix}`,
          rarity: 'COMMON',
          dropWeight: 10,
          setId: loserSet.id,
        },
      })
      loserSetId = loserSet.id
    })

    it('B defie A, A accepte -> ACTIVE', async () => {
      const propose = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/duels`,
        headers: { cookie: cookiesB },
        payload: { opponentId: userIdA },
      })
      expect(propose.statusCode).toBe(201)
      lockDuelId = propose.json().id
      expect(propose.json().pullCount).toBe(2)

      const accept = await app.inject({
        method: 'POST',
        url: `/teams/${teamId}/duels/${lockDuelId}/accept`,
        headers: { cookie: cookiesA },
      })
      expect(accept.statusCode).toBe(200)
      expect(accept.json().status).toBe('ACTIVE')
    })

    it('B tire ses 2 tirages comptes, tous sur la carte engagee', async () => {
      await prisma.user.update({
        where: { id: userIdB },
        data: { tokens: 10, lastTokenAt: new Date() },
      })
      await activateOnly(engagedSetId)
      for (let i = 0; i < 2; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/pulls',
          headers: { cookie: cookiesB },
        })
        expect(res.statusCode).toBe(201)
      }
      const card = await prisma.userCard.findUniqueOrThrow({
        where: {
          userId_cardId_variant: {
            userId: userIdB,
            cardId: engagedCardId,
            variant: 'NORMAL',
          },
        },
      })
      expect(card.quantity).toBe(2)
    })

    it('GET /teams/:id/wagers : B voit sa carte engagee dans engagedCardIds', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/teams/${teamId}/wagers`,
        headers: { cookie: cookiesB },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().engagedCardIds).toContain(engagedCardId)
    })

    it('POST /collection/recycle sur la carte engagee -> 409, quantite inchangee en base', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/collection/recycle',
        headers: { cookie: cookiesB },
        payload: { cardId: engagedCardId, quantity: 1, variant: 'NORMAL' },
      })
      expect(res.statusCode).toBe(409)

      const card = await prisma.userCard.findUniqueOrThrow({
        where: {
          userId_cardId_variant: {
            userId: userIdB,
            cardId: engagedCardId,
            variant: 'NORMAL',
          },
        },
      })
      expect(card.quantity).toBe(2)
    })

    it('une carte NON comptee du meme joueur (au-dela du pullCount) se recycle normalement -> 200', async () => {
      // 3e tirage de B, au-dela de pullCount=2 : findPullsSinceInTx ne
      // retient que les 2 premiers, donc cette carte n'est jamais engagee.
      await activateOnly(extraSetId)
      const pull = await app.inject({
        method: 'POST',
        url: '/pulls',
        headers: { cookie: cookiesB },
      })
      expect(pull.statusCode).toBe(201)

      const recycle = await app.inject({
        method: 'POST',
        url: '/collection/recycle',
        headers: { cookie: cookiesB },
        payload: { cardId: extraCardId, quantity: 1, variant: 'NORMAL' },
      })
      expect(recycle.statusCode).toBe(200)

      const card = await prisma.userCard.findUnique({
        where: {
          userId_cardId_variant: {
            userId: userIdB,
            cardId: extraCardId,
            variant: 'NORMAL',
          },
        },
      })
      expect(card).toBeNull()
    })

    it('POST /collection/recycle-all : la carte engagee est ignoree, le lot aboutit quand meme, skippedEngaged la compte', async () => {
      const dupSet = await prisma.cardSet.create({
        data: { name: `LockDupSet${suffix}`, isActive: false },
      })
      const dupCard = await prisma.card.create({
        data: {
          name: `LockDupCard${suffix}`,
          rarity: 'COMMON',
          dropWeight: 10,
          setId: dupSet.id,
        },
      })

      // Cree directement en base (hors tirage) : une duplication non
      // engagee, quantite > 1, pour verifier qu'un recyclage de masse
      // legitime n'est pas bloque par la presence d'une carte engagee. B
      // n'a aucune autre UserCard a ce stade (voir le commentaire du
      // describe), donc ce candidat est le seul non-engage vu par l'appel.
      await prisma.userCard.create({
        data: {
          userId: userIdB,
          cardId: dupCard.id,
          variant: 'NORMAL',
          quantity: 3,
        },
      })

      const res = await app.inject({
        method: 'POST',
        url: '/collection/recycle-all',
        headers: { cookie: cookiesB },
        payload: { maxRarity: 'LEGENDARY' },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      // skippedEngaged compte des COPIES retenues (quantity - 1), même base
      // que cardsRecycled — pas des lignes. La carte engagee a quantite 2
      // (2 tirages comptes), donc 1 copie retenue, pas 1 ligne.
      expect(body.skippedEngaged).toBe(1)
      expect(body.cardsRecycled).toBe(2)

      const engaged = await prisma.userCard.findUniqueOrThrow({
        where: {
          userId_cardId_variant: {
            userId: userIdB,
            cardId: engagedCardId,
            variant: 'NORMAL',
          },
        },
      })
      expect(engaged.quantity).toBe(2)

      const dup = await prisma.userCard.findUniqueOrThrow({
        where: {
          userId_cardId_variant: {
            userId: userIdB,
            cardId: dupCard.id,
            variant: 'NORMAL',
          },
        },
      })
      expect(dup.quantity).toBe(1)
    })

    it('reglement du duel (B gagne) : engagedCardIds redevient vide, la carte anciennement engagee se recycle -> 200', async () => {
      await prisma.user.update({
        where: { id: userIdA },
        data: { tokens: 10, lastTokenAt: new Date() },
      })
      await activateOnly(loserSetId)
      for (let i = 0; i < 2; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/pulls',
          headers: { cookie: cookiesA },
        })
        expect(res.statusCode).toBe(201)
      }

      const settled = await waitForDuelStatus(lockDuelId, 'SETTLED')
      expect(settled.winnerId).toBe(userIdB)

      const wagers = await app.inject({
        method: 'GET',
        url: `/teams/${teamId}/wagers`,
        headers: { cookie: cookiesB },
      })
      expect(wagers.statusCode).toBe(200)
      expect(wagers.json().engagedCardIds).toEqual([])

      const recycle = await app.inject({
        method: 'POST',
        url: '/collection/recycle',
        headers: { cookie: cookiesB },
        payload: { cardId: engagedCardId, quantity: 1, variant: 'NORMAL' },
      })
      expect(recycle.statusCode).toBe(200)
    })
  })

  // Suppression d'equipe. Place ICI, dans le meme fichier, et pas dans un
  // fichier a part : `activateOnly` bascule le catalogue GLOBAL, et jest
  // execute les fichiers e2e en parallele par defaut — un troisieme fichier
  // de paris/duels retournerait le catalogue sous les deux autres.
  describe("suppression d'equipe", () => {
    let delTeamId: string
    let delSetId: string
    let delCommonCardId: string
    let delRareOnlySetId: string
    let delCommonOnlySetId: string
    let delLoserCardId: string
    let delBaselineActiveSetIds: string[]

    beforeAll(async () => {
      const active = await prisma.cardSet.findMany({
        where: { isActive: true },
        select: { id: true },
      })
      delBaselineActiveSetIds = active.map((set: { id: string }) => set.id)

      // Catalogue mixte : la cote doit exister ET ne pas tomber au plancher
      // de 1,00, sinon le placement est refuse (voir BetDomain#place).
      const set = await prisma.cardSet.create({
        data: { name: `DuelDelSet${suffix}`, isActive: false },
      })
      delSetId = set.id
      await prisma.card.createMany({
        data: [
          {
            name: `DuelDelCommon${suffix}`,
            rarity: 'COMMON',
            dropWeight: 90,
            setId: delSetId,
          },
          {
            name: `DuelDelRare${suffix}`,
            rarity: 'RARE',
            dropWeight: 10,
            setId: delSetId,
          },
        ],
      })
      delCommonCardId = (
        await prisma.card.findFirstOrThrow({
          where: { setId: delSetId, rarity: 'COMMON' },
        })
      ).id

      // Deux catalogues purs pour rendre le duel deterministe : A ne tire
      // que de la RARE, B que de la COMMUNE, donc A gagne aux points.
      const rareOnly = await prisma.cardSet.create({
        data: { name: `DuelDelRareOnly${suffix}`, isActive: false },
      })
      delRareOnlySetId = rareOnly.id
      await prisma.card.create({
        data: {
          name: `DuelDelRareOnlyCard${suffix}`,
          rarity: 'RARE',
          dropWeight: 10,
          setId: delRareOnlySetId,
        },
      })
      const commonOnly = await prisma.cardSet.create({
        data: { name: `DuelDelCommonOnly${suffix}`, isActive: false },
      })
      delCommonOnlySetId = commonOnly.id
      // Carte NEUVE, jamais tiree ailleurs dans ce fichier : c'est elle qui
      // doit changer de main au reglement, et personne d'autre ne doit en
      // posseder d'exemplaire.
      delLoserCardId = (
        await prisma.card.create({
          data: {
            name: `DuelDelLoserCard${suffix}`,
            rarity: 'COMMON',
            dropWeight: 10,
            setId: delCommonOnlySetId,
          },
        })
      ).id

      await activateOnly(delSetId)
    })

    // Une equipe NEUVE par test : chacun la detruit, et le plafond de trois
    // equipes par joueur interdit de les accumuler.
    async function newDeletableTeam(tag: string): Promise<string> {
      const team = await app.inject({
        method: 'POST',
        url: '/teams',
        headers: { cookie: cookiesA },
        payload: { name: `DuelDelTeam${tag}${suffix}` },
      })
      expect(team.statusCode).toBe(201)
      const id = team.json().id as string
      await prisma.teamMember.create({
        data: { teamId: id, userId: userIdB, role: 'MEMBER' },
      })
      return id
    }

    function dustOf(userId: string): Promise<number> {
      return prisma.user
        .findUnique({ where: { id: userId } })
        .then((u: { dust: number }) => u.dust)
    }

    afterAll(async () => {
      await prisma.cardSet.updateMany({ data: { isActive: false } })
      if (delBaselineActiveSetIds.length > 0) {
        await prisma.cardSet.updateMany({
          where: { id: { in: delBaselineActiveSetIds } },
          data: { isActive: true },
        })
      }
    })

    it("DELETE /teams/:id : REFUSE tant qu'un pari ou un duel court encore", async () => {
      // Rembourser la mise a la fermeture etait une option gratuite
      // deplacee : le proprietaire parie sur un complice, un tirage
      // qualifiant paie immediatement, et si la fenetre tourne mal la cible
      // cesse de tirer et le proprietaire supprime l'equipe pour recuperer
      // sa mise. Repetable, puisque le plafond porte sur les equipes
      // SIMULTANEES. On ne rend donc rien : on refuse.
      await activateOnly(delSetId)
      delTeamId = await newDeletableTeam('A')
      await prisma.user.update({ where: { id: userIdA }, data: { dust: 5000 } })

      const stake = 300
      const placed = await app.inject({
        method: 'POST',
        url: `/teams/${delTeamId}/bets`,
        headers: { cookie: cookiesA },
        payload: { targetId: userIdB, minRarity: 'RARE', stake },
      })
      expect(placed.statusCode).toBe(201)
      const betId = placed.json().id as string
      expect(await dustOf(userIdA)).toBe(5000 - stake)

      // Un duel PENDING en plus : le refus doit aussi le voir.
      const propose = await app.inject({
        method: 'POST',
        url: `/teams/${delTeamId}/duels`,
        headers: { cookie: cookiesA },
        payload: { opponentId: userIdB },
      })
      expect(propose.statusCode).toBe(201)
      const duelId = propose.json().id as string

      const refused = await app.inject({
        method: 'DELETE',
        url: `/teams/${delTeamId}`,
        headers: { cookie: cookiesA },
      })
      expect(refused.statusCode).toBe(409)
      // Le message ENUMERE ce qui bloque (sa fin explique pourquoi et
      // parle de duel dans tous les cas : on assert l'enumeration).
      expect(refused.json().message).toContain('1 pari et 1 duel en cours')

      // Rien n'a bouge : ni l'equipe, ni les lignes, ni la poussiere. En
      // particulier la mise n'est PAS revenue.
      expect(await dustOf(userIdA)).toBe(5000 - stake)
      expect(
        await prisma.team.findUnique({ where: { id: delTeamId } }),
      ).not.toBeNull()
      expect(
        (await prisma.bet.findUnique({ where: { id: betId } })).status,
      ).toBe('ACTIVE')
      expect(
        (await prisma.duel.findUnique({ where: { id: duelId } })).status,
      ).toBe('PENDING')

      // Le duel se resout : le pari seul doit continuer de bloquer.
      const cancel = await app.inject({
        method: 'POST',
        url: `/teams/${delTeamId}/duels/${duelId}/cancel`,
        headers: { cookie: cookiesA },
      })
      expect(cancel.statusCode).toBe(200)
      const stillRefused = await app.inject({
        method: 'DELETE',
        url: `/teams/${delTeamId}`,
        headers: { cookie: cookiesA },
      })
      expect(stillRefused.statusCode).toBe(409)
      expect(stillRefused.json().message).toContain('1 pari en cours')
      expect(stillRefused.json().message).not.toContain('duel en cours')

      // Le pari atteint son echeance sans que la cible ait tire : la passe
      // de reglement le rend EXPIRED et rembourse par le chemin NORMAL,
      // puis la suppression passe.
      await prisma.bet.update({
        where: { id: betId },
        data: { deadlineAt: new Date(Date.now() - 60 * 1000) },
      })
      const deleted = await app.inject({
        method: 'DELETE',
        url: `/teams/${delTeamId}`,
        headers: { cookie: cookiesA },
      })
      expect(deleted.statusCode).toBe(204)
      expect(await dustOf(userIdA)).toBe(5000)
      expect(
        await prisma.team.findUnique({ where: { id: delTeamId } }),
      ).toBeNull()
    })

    it("DELETE /teams/:id : un pari echu dont la cible a tire sans finir est PERDU, pas rembourse", async () => {
      // Le reglement est paresseux : ce pari-la dort en ACTIVE tant que
      // personne ne le regarde, alors que son verdict est deja fixe. Sans
      // passe de reglement avant la fermeture, le proprietaire recuperait sa
      // mise en supprimant l'equipe — l'option gratuite que betVerdict ferme,
      // rouverte a l'echelle de l'equipe et repetable puisque creer une
      // equipe est gratuit.
      await activateOnly(delSetId)
      const teamForLostBet = await newDeletableTeam('B')
      await prisma.user.update({ where: { id: userIdA }, data: { dust: 5000 } })

      const stake = 400
      // Recule de QUELQUES SECONDES, pas de deux heures : la fenetre prend
      // les dix premiers tirages posterieurs a `createdAt`, et deux heures
      // avaleraient tous les tirages que B a faits plus haut dans ce
      // fichier — le test ne passerait que par chance sur leur rarete.
      const createdAt = new Date(Date.now() - 30 * 1000)
      const bet = await prisma.bet.create({
        data: {
          teamId: teamForLostBet,
          bettorId: userIdA,
          targetId: userIdB,
          minRarity: 'RARE',
          pullWindow: 10,
          probability: 0.6513215599,
          entries: { create: { userId: userIdA, side: 'YES', stake } },
          createdAt,
          // Echeance depassee, fenetre ENTAMEE mais incomplete.
          deadlineAt: new Date(Date.now() - 10 * 1000),
        },
      })
      // La mise a bien ete debitee au placement : on reproduit ce solde.
      await prisma.user.update({
        where: { id: userIdA },
        data: { dust: 5000 - stake },
      })
      for (let i = 0; i < 2; i++) {
        await prisma.gachaPull.create({
          data: {
            userId: userIdB,
            cardId: delCommonCardId,
            variant: 'NORMAL',
            pulledAt: new Date(createdAt.getTime() + (i + 1) * 1000),
          },
        })
      }
      expect(
        (await prisma.bet.findUnique({ where: { id: bet.id } })).status,
      ).toBe('ACTIVE')

      const res = await app.inject({
        method: 'DELETE',
        url: `/teams/${teamForLostBet}`,
        headers: { cookie: cookiesA },
      })
      expect(res.statusCode).toBe(204)

      // Perdu : la mise reste a la maison, le solde ne bouge pas.
      expect(await dustOf(userIdA)).toBe(5000 - stake)
      expect(
        await prisma.team.findUnique({ where: { id: teamForLostBet } }),
      ).toBeNull()
    })

    it("DELETE /teams/:id : un duel echu est REGLE, les cartes du perdant changent de main", async () => {
      // Duel dont l'issue est deja figee par l'echeance : l'annuler priverait
      // le vainqueur des cartes qui lui sont dues — et le proprietaire qui
      // supprime est souvent l'un des deux duellistes.
      const teamForDuel = await newDeletableTeam('C')

      const propose = await app.inject({
        method: 'POST',
        url: `/teams/${teamForDuel}/duels`,
        headers: { cookie: cookiesA },
        payload: { opponentId: userIdB },
      })
      expect(propose.statusCode).toBe(201)
      const duelId = propose.json().id as string
      const accept = await app.inject({
        method: 'POST',
        url: `/teams/${teamForDuel}/duels/${duelId}/accept`,
        headers: { cookie: cookiesB },
      })
      expect(accept.statusCode).toBe(200)

      await prisma.user.updateMany({
        where: { id: { in: [userIdA, userIdB] } },
        data: { tokens: 20, lastTokenAt: new Date() },
      })

      // B (perdant prevu) tire UNE commune neuve, A deux rares : aucun des
      // deux ne remplit la fenetre, le duel reste donc ACTIVE.
      await activateOnly(delCommonOnlySetId)
      const bPull = await app.inject({
        method: 'POST',
        url: '/pulls',
        headers: { cookie: cookiesB },
      })
      expect(bPull.statusCode).toBe(201)

      await activateOnly(delRareOnlySetId)
      for (let i = 0; i < 2; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/pulls',
          headers: { cookie: cookiesA },
        })
        expect(res.statusCode).toBe(201)
      }
      expect(
        (await prisma.duel.findUnique({ where: { id: duelId } })).status,
      ).toBe('ACTIVE')

      // B possede bien la carte comptee, A ne l'a pas.
      const bBefore = await prisma.userCard.findUnique({
        where: {
          userId_cardId_variant: {
            userId: userIdB,
            cardId: delLoserCardId,
            variant: 'NORMAL',
          },
        },
      })
      expect(bBefore.quantity).toBe(1)
      expect(
        await prisma.userCard.findUnique({
          where: {
            userId_cardId_variant: {
              userId: userIdA,
              cardId: delLoserCardId,
              variant: 'NORMAL',
            },
          },
        }),
      ).toBeNull()

      // Echeance depassee : le verdict est desormais fixe (16 demi-points
      // contre 2), il ne manque qu'un declencheur.
      await prisma.duel.update({
        where: { id: duelId },
        data: { deadlineAt: new Date(Date.now() - 60 * 1000) },
      })

      const res = await app.inject({
        method: 'DELETE',
        url: `/teams/${teamForDuel}`,
        headers: { cookie: cookiesA },
      })
      expect(res.statusCode).toBe(204)

      // La carte a change de main AVANT la fermeture : le duel a ete regle,
      // pas annule.
      expect(
        await prisma.userCard.findUnique({
          where: {
            userId_cardId_variant: {
              userId: userIdB,
              cardId: delLoserCardId,
              variant: 'NORMAL',
            },
          },
        }),
      ).toBeNull()
      const aAfter = await prisma.userCard.findUnique({
        where: {
          userId_cardId_variant: {
            userId: userIdA,
            cardId: delLoserCardId,
            variant: 'NORMAL',
          },
        },
      })
      expect(aAfter).not.toBeNull()
      expect(aAfter.quantity).toBe(1)
      expect(
        await prisma.team.findUnique({ where: { id: teamForDuel } }),
      ).toBeNull()
    })

    it('DELETE /teams/:id : sans aucun enjeu, la suppression passe normalement', async () => {
      // Garde-fou du refus : sans ce cas, un refus qui bloquerait TOUTES les
      // suppressions passerait inapercu, les trois tests precedents ne
      // supprimant qu'apres avoir resolu quelque chose.
      const plainTeam = await newDeletableTeam('D')
      expect(
        await prisma.bet.count({ where: { teamId: plainTeam } }),
      ).toBe(0)
      expect(
        await prisma.duel.count({ where: { teamId: plainTeam } }),
      ).toBe(0)

      const res = await app.inject({
        method: 'DELETE',
        url: `/teams/${plainTeam}`,
        headers: { cookie: cookiesA },
      })
      expect(res.statusCode).toBe(204)
      expect(
        await prisma.team.findUnique({ where: { id: plainTeam } }),
      ).toBeNull()
    })
  })
})
