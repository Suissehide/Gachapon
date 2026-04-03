import { afterAll, beforeAll, describe, expect, it } from '@jest/globals'
import { buildTestApp } from '../../helpers/build-test-app'

describe('Skills routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let cookies: string

  const suffix = Date.now()
  const email = `skills${suffix}@test.com`
  const password = 'Password123!'
  const username = `skillsuser${suffix}`

  beforeAll(async () => {
    app = await buildTestApp()

    const { postgresOrm } = (app as any).iocContainer
    const prisma = postgresOrm.prisma

    // Seed skill tree data (globalSetup truncates all tables)
    await prisma.skillConfig.upsert({
      where: { id: 1 },
      create: { id: 1, resetCostPerPoint: 50 },
      update: {},
    })

    const flux = await prisma.skillBranch.create({
      data: { name: 'Flux', description: 'Tokens & Énergie', icon: 'Zap', color: '#6c47ff', order: 1 },
    })
    const fortune = await prisma.skillBranch.create({
      data: { name: 'Fortune', description: 'Gacha & Chance', icon: 'Sparkles', color: '#f59e0b', order: 2 },
    })
    const collection = await prisma.skillBranch.create({
      data: { name: 'Collection', description: 'Dust & Boutique', icon: 'Gem', color: '#10b981', order: 3 },
    })

    const regen = await prisma.skillNode.create({
      data: {
        branchId: flux.id, name: 'Regen', description: 'Réduit le délai de régénération des tokens',
        icon: 'Timer', maxLevel: 3, effectType: 'REGEN', posX: -200, posY: -80,
        levels: { create: [{ level: 1, effect: 2 }, { level: 2, effect: 4 }, { level: 3, effect: 6 }] },
      },
    })
    const multiToken = await prisma.skillNode.create({
      data: {
        branchId: flux.id, name: 'Multi-token', description: 'Chance multi-token',
        icon: 'Layers', maxLevel: 3, effectType: 'MULTI_TOKEN_CHANCE', posX: -380, posY: 0,
        levels: { create: [{ level: 1, effect: 0.05 }, { level: 2, effect: 0.1 }, { level: 3, effect: 0.2 }] },
      },
    })
    await prisma.skillEdge.create({
      data: { fromNodeId: regen.id, toNodeId: multiToken.id, minLevel: 1 },
    })

    const luck = await prisma.skillNode.create({
      data: {
        branchId: fortune.id, name: 'Luck', description: 'Augmente les taux de drop',
        icon: 'Star', maxLevel: 3, effectType: 'LUCK', posX: 0, posY: -200,
        levels: { create: [{ level: 1, effect: 0.1 }, { level: 2, effect: 0.25 }, { level: 3, effect: 0.5 }] },
      },
    })
    const bouleDor = await prisma.skillNode.create({
      data: {
        branchId: fortune.id, name: "Boule d'or", description: "Chance d'obtenir une boule en or",
        icon: 'Trophy', maxLevel: 3, effectType: 'GOLDEN_BALL_CHANCE', posX: -120, posY: -380,
        levels: { create: [{ level: 1, effect: 0.03 }, { level: 2, effect: 0.07 }, { level: 3, effect: 0.15 }] },
      },
    })
    await prisma.skillEdge.create({
      data: { fromNodeId: luck.id, toNodeId: bouleDor.id, minLevel: 1 },
    })

    const dustPlus = await prisma.skillNode.create({
      data: {
        branchId: collection.id, name: 'Dust+', description: 'Plus de dust lors du recyclage',
        icon: 'Wind', maxLevel: 3, effectType: 'DUST_HARVEST', posX: 200, posY: -80,
        levels: { create: [{ level: 1, effect: 0.1 }, { level: 2, effect: 0.25 }, { level: 3, effect: 0.5 }] },
      },
    })
    const reduction = await prisma.skillNode.create({
      data: {
        branchId: collection.id, name: 'Réduction', description: 'Réduit les prix en boutique',
        icon: 'BadgePercent', maxLevel: 3, effectType: 'SHOP_DISCOUNT', posX: 380, posY: 0,
        levels: { create: [{ level: 1, effect: 0.05 }, { level: 2, effect: 0.1 }, { level: 3, effect: 0.2 }] },
      },
    })
    await prisma.skillEdge.create({
      data: { fromNodeId: dustPlus.id, toNodeId: reduction.id, minLevel: 1 },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { username, email, password },
    })
    expect(res.statusCode).toBe(201)

    await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date(), skillPoints: 10, dust: 99999 },
    })

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

  it('GET /skills — retourne les branches avec skillPoints', async () => {
    const res = await app.inject({ method: 'GET', url: '/skills', headers: { cookie: cookies } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.branches)).toBe(true)
    expect(body.branches.length).toBe(3)
    expect(body.skillPoints).toBe(10)
    expect(body.totalInvested).toBe(0)
  })

  it('POST /skills/:nodeId/invest — investit un point dans un nœud racine', async () => {
    const treeRes = await app.inject({ method: 'GET', url: '/skills', headers: { cookie: cookies } })
    const tree = treeRes.json()
    const rootNode = tree.branches
      .flatMap((b: any) => b.nodes)
      .find((n: any) => n.edgesTo.length === 0)
    expect(rootNode).toBeDefined()

    const res = await app.inject({
      method: 'POST',
      url: `/skills/${rootNode.id}/invest`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.nodeId).toBe(rootNode.id)
    expect(body.newLevel).toBe(1)
    expect(body.skillPoints).toBe(9)
  })

  it('POST /skills/:nodeId/invest — 403 si prérequis non remplis', async () => {
    const treeRes = await app.inject({ method: 'GET', url: '/skills', headers: { cookie: cookies } })
    const tree = treeRes.json()
    const investedNodeIds = new Set((tree.userSkills as any[]).map((s: any) => s.nodeId))
    const allNodes: any[] = tree.branches.flatMap((b: any) => b.nodes)
    // Find a node whose prerequisites are NOT yet met (at least one parent not invested)
    const lockedNode = allNodes.find((n: any) =>
      n.edgesTo.length > 0 &&
      n.edgesTo.some((e: any) => !investedNodeIds.has(e.fromNodeId))
    )
    expect(lockedNode).toBeDefined()

    const res = await app.inject({
      method: 'POST',
      url: `/skills/${lockedNode.id}/invest`,
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(403)
  })

  it('POST /skills/reset — remet les points à zéro contre du dust', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/skills/reset',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.skillPoints).toBe(10)
    expect(body.dustSpent).toBeGreaterThan(0)
  })

  it('POST /skills/reset — 400 si aucun point investi', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/skills/reset',
      headers: { cookie: cookies },
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET /skills — sans cookie → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/skills' })
    expect(res.statusCode).toBe(401)
  })
})
