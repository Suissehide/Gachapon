import { describe, expect, it } from '@jest/globals'

import { collectSkillTree } from '../helpers/skill-tree-seed'

describe('seed de l’arbre de compétences', () => {
  // 109 = exactement ce qu'un joueur niveau 100 possède (1 par niveau + 2 par
  // palier franchi). L'arbre en coûtait 126 : les 17 points manquants ne
  // créaient pas d'arbitrage, ils forçaient toujours le sacrifice des mêmes
  // nœuds — les plus chers et les moins rentables.
  it('déclare 4 branches, 27 nœuds et 109 points investissables', async () => {
    const { branches, nodes } = await collectSkillTree()
    expect(branches).toHaveLength(4)
    expect(nodes).toHaveLength(27)
    expect(nodes.reduce((sum, n) => sum + n.maxLevel, 0)).toBe(109)
  })

  it('ne place jamais deux nœuds du même effectType dans TOUT l’arbre', async () => {
    // L'invariant que la refonte installe. Le violer recrée le bug d'origine :
    // un nœud plus profond qui rend PLUS au point que sa porte rend les
    // paliers 2+ de la porte invendables, donc l'ordre de montée piégeux.
    //
    // La portée est l'ARBRE ENTIER, pas la branche : borné à la branche, cet
    // invariant a laissé passer deux « Tirage gratuit » (Flux 10 %, Fortune
    // 14 %) dont `getSkillEffects` ADDITIONNAIT les effets, soit 24 % de
    // tirages gratuits pour un effet censé plafonner bien plus bas.
    const { nodes } = await collectSkillTree()
    const types = nodes.map((n) => n.effectType)
    const doublons = [...new Set(types)].filter(
      (t) => types.filter((x) => x === t).length > 1,
    )
    expect(doublons).toEqual([])
  })

  it('donne à chaque nœud une courbe strictement croissante et complète', async () => {
    const { nodes } = await collectSkillTree()
    for (const node of nodes) {
      expect(node.levels).toHaveLength(node.maxLevel)
      const niveaux = node.levels.map((l) => l.level)
      expect(niveaux).toEqual(
        Array.from({ length: node.maxLevel }, (_, i) => i + 1),
      )
      for (let i = 1; i < node.levels.length; i++) {
        expect(node.levels[i]!.effect).toBeGreaterThan(
          node.levels[i - 1]!.effect,
        )
      }
    }
  })

  it('ne référence dans ses arêtes que des nœuds déclarés', async () => {
    const { nodes, edges } = await collectSkillTree()
    const ids = new Set(nodes.map((n) => n.id))
    for (const edge of edges) {
      expect(ids.has(edge.fromNodeId)).toBe(true)
      expect(ids.has(edge.toNodeId)).toBe(true)
    }
  })

  it('laisse tout nœud atteignable depuis une racine de branche', async () => {
    const { nodes, edges } = await collectSkillTree()
    const cibles = new Set(edges.map((e) => e.toNodeId))
    const racines = nodes.filter((n) => !cibles.has(n.id))
    const vus = new Set(racines.map((n) => n.id))
    let bouge = true
    while (bouge) {
      bouge = false
      for (const e of edges) {
        if (vus.has(e.fromNodeId) && !vus.has(e.toNodeId)) {
          vus.add(e.toNodeId)
          bouge = true
        }
      }
    }
    expect(nodes.filter((n) => !vus.has(n.id))).toEqual([])
  })

  // « Vœu exaucé » ne change JAMAIS les cotes de rareté : il décide seulement
  // QUELLE carte de la rareté tirée on reçoit. À 40 %, il divisait par deux le
  // nombre de tirages nécessaires à une ascension ciblée — cinq fois l'effet de
  // « Boule d'or », son voisin direct de branche à nombre de niveaux égal.
  // L'aligner sur ce voisin est le calibrage, pas un chiffre rond arbitraire.
  it('aligne « Vœu exaucé » sur la courbe de « Boule d’or »', async () => {
    const { nodes } = await collectSkillTree()
    const voeu = nodes.find((n) => n.effectType === 'WISHLIST_PULL_CHANCE')
    const bouleDOr = nodes.find((n) => n.effectType === 'GOLDEN_BALL_CHANCE')
    expect(voeu).toBeDefined()
    expect(bouleDOr).toBeDefined()
    expect(voeu?.branchId).toBe(bouleDOr?.branchId)
    expect(voeu?.levels).toEqual(bouleDOr?.levels)
  })

  it('plafonne « Vœu exaucé » à 8 % de redirection', async () => {
    const { nodes } = await collectSkillTree()
    const voeu = nodes.find((n) => n.effectType === 'WISHLIST_PULL_CHANCE')
    const max = Math.max(...(voeu?.levels ?? []).map((l) => l.effect))
    expect(max).toBe(8)
  })
})
