import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'

import { buildTestApp } from '../../helpers/build-test-app'
import { setCombatTeam } from '../../helpers/combat-team-fixture'

describe('Combat teams per mode routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string
  let userCard1Id: string
  let userCard2Id: string

  const suffix = Date.now()
  const email = `perMode${suffix}@test.com`
  const password = 'Password123!'
  const username = `perModeuser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()
    const { postgresOrm } = (app as any).iocContainer

    const set = await postgresOrm.prisma.cardSet.create({
      data: { name: `PerModeSet${suffix}`, isActive: false },
    })
    const card1 = await postgresOrm.prisma.card.create({
      data: {
        name: `PerModeCard1${suffix}`,
        rarity: 'RARE',
        dropWeight: 10,
        setId: set.id,
        baseHp: 200,
        baseAtk: 20,
        baseDef: 10,
        baseSpd: 100,
      },
    })
    const card2 = await postgresOrm.prisma.card.create({
      data: {
        name: `PerModeCard2${suffix}`,
        rarity: 'EPIC',
        dropWeight: 5,
        setId: set.id,
        baseHp: 320,
        baseAtk: 32,
        baseDef: 16,
        baseSpd: 105,
        passiveKey: 'BANNER',
      },
    })

    const reg = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(reg.statusCode).toBe(201)
    const user = await postgresOrm.prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })

    const uc1 = await postgresOrm.prisma.userCard.create({
      data: {
        userId: user.id,
        cardId: card1.id,
        variant: 'NORMAL',
        quantity: 1,
        level: 1,
        palier: 1,
      },
    })
    const uc2 = await postgresOrm.prisma.userCard.create({
      data: {
        userId: user.id,
        cardId: card2.id,
        variant: 'HOLOGRAPHIC',
        quantity: 1,
        level: 5,
        palier: 2,
      },
    })
    userCard1Id = uc1.id
    userCard2Id = uc2.id

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    cookies = loginRes.headers['set-cookie'] as string
  })

  afterAll(async () => {
    await app.close()
  })

  it('un mode jamais édité hérite de l’équipe de campagne', async () => {
    await setCombatTeam(app, cookies, 'campaign', [userCard1Id])

    const res = await app.inject({
      method: 'GET',
      url: '/combat/teams/tower:FIRE',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.inherited).toBe(true)
    expect(body.team.map((u: { userCardId: string }) => u.userCardId)).toEqual([
      userCard1Id,
    ])
  })

  it('éditer une tour ne touche pas les autres modes', async () => {
    // Équipe de campagne posée ici, pas empruntée au test précédent : ce
    // test doit rester vrai même joué seul.
    await setCombatTeam(app, cookies, 'campaign', [userCard1Id])
    await setCombatTeam(app, cookies, 'tower:FIRE', [userCard2Id])

    const fire = await app.inject({
      method: 'GET',
      url: '/combat/teams/tower:FIRE',
      headers: { cookie: cookies },
    })
    expect(fire.json().inherited).toBe(false)
    expect(
      fire.json().team.map((u: { userCardId: string }) => u.userCardId),
    ).toEqual([userCard2Id])

    const water = await app.inject({
      method: 'GET',
      url: '/combat/teams/tower:WATER',
      headers: { cookie: cookies },
    })
    expect(water.json().inherited).toBe(true)
    expect(
      water.json().team.map((u: { userCardId: string }) => u.userCardId),
    ).toEqual([userCard1Id])
  })

  it('modifier la campagne change les modes hérités, pas les spécialisés', async () => {
    await setCombatTeam(app, cookies, 'campaign', [userCard2Id])

    const water = await app.inject({
      method: 'GET',
      url: '/combat/teams/tower:WATER',
      headers: { cookie: cookies },
    })
    expect(
      water.json().team.map((u: { userCardId: string }) => u.userCardId),
    ).toEqual([userCard2Id])

    await setCombatTeam(app, cookies, 'tower:FIRE', [userCard1Id])
    await setCombatTeam(app, cookies, 'campaign', [userCard2Id])
    const fire = await app.inject({
      method: 'GET',
      url: '/combat/teams/tower:FIRE',
      headers: { cookie: cookies },
    })
    expect(
      fire.json().team.map((u: { userCardId: string }) => u.userCardId),
    ).toEqual([userCard1Id])
  })

  it('DELETE refait hériter le mode', async () => {
    // État posé ici, pas hérité d'un test précédent : la campagne et
    // tower:FIRE reçoivent des équipes DIFFÉRENTES, pour distinguer sans
    // ambiguïté « hérite de la campagne » de « garde son ancienne équipe ».
    await setCombatTeam(app, cookies, 'campaign', [userCard2Id])
    await setCombatTeam(app, cookies, 'tower:FIRE', [userCard1Id])

    const before = await app.inject({
      method: 'GET',
      url: '/combat/teams/tower:FIRE',
      headers: { cookie: cookies },
    })
    expect(before.json().inherited).toBe(false)
    expect(
      before.json().team.map((u: { userCardId: string }) => u.userCardId),
    ).toEqual([userCard1Id])

    const del = await app.inject({
      method: 'DELETE',
      url: '/combat/teams/tower:FIRE',
      headers: { cookie: cookies },
    })
    expect(del.statusCode).toBe(204)

    const after = await app.inject({
      method: 'GET',
      url: '/combat/teams/tower:FIRE',
      headers: { cookie: cookies },
    })
    expect(after.json().inherited).toBe(true)
    // Pas seulement `inherited === true` : on vérifie que la ligne effacée
    // est bien celle de tower:FIRE, en confirmant que l'équipe rendue est
    // EXACTEMENT celle de la campagne — une suppression qui aurait aussi
    // effacé la mauvaise ligne (ou une route qui rendrait 204 sans agir)
    // serait détectée ici.
    expect(
      after.json().team.map((u: { userCardId: string }) => u.userCardId),
    ).toEqual([userCard2Id])
  })

  it('DELETE sur la campagne est refusé — elle est la racine du repli', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/combat/teams/campaign',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(400)
  })

  it('refuse une clé de mode inconnue', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/combat/teams/tower:LIGHT',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(400)
  })

  it('la forme percent-encodée (celle envoyée par le front) rend la même équipe que la forme brute', async () => {
    // Le front appelle encodeURIComponent('tower:FIRE'), donc
    // /combat/teams/tower%3AFIRE — jamais la forme brute avec le ':' nu.
    // Rien ne garantit que Fastify continue de redécoder %3A avant
    // validation ; ce test attaque littéralement le chemin que le client
    // emprunte, pas une approximation.
    await setCombatTeam(app, cookies, 'campaign', [userCard2Id])
    await setCombatTeam(app, cookies, 'tower:FIRE', [userCard1Id])

    const raw = await app.inject({
      method: 'GET',
      url: '/combat/teams/tower:FIRE',
      headers: { cookie: cookies },
    })
    const percentEncoded = await app.inject({
      method: 'GET',
      url: '/combat/teams/tower%3AFIRE',
      headers: { cookie: cookies },
    })

    expect(raw.statusCode).toBe(200)
    expect(percentEncoded.statusCode).toBe(200)
    expect(percentEncoded.json()).toEqual(raw.json())
    expect(
      percentEncoded
        .json()
        .team.map((u: { userCardId: string }) => u.userCardId),
    ).toEqual([userCard1Id])
  })

  it('GET /combat/teams rend les six modes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/combat/teams',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    expect(Object.keys(res.json().teams).sort()).toEqual(
      [
        'campaign',
        'raid',
        'tower:EARTH',
        'tower:FIRE',
        'tower:NATURE',
        'tower:WATER',
      ].sort(),
    )
  })
})
