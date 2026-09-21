import { seedSkills } from '../../../prisma/seed/skills'

export type SeededNode = {
  id: string
  branchId: string
  nameFr: string
  nameEn: string
  effectType: string
  maxLevel: number
  levels: { level: number; effect: number }[]
}
export type SeededEdge = {
  fromNodeId: string
  toNodeId: string
  minLevel: number
}

/**
 * Collaborateur enregistreur : le seed ne fait que déclarer des données via
 * quatre méthodes de `tx`. Les rejouer en mémoire donne l'arbre complet sans
 * base, et permet d'assertir sur les données RÉELLES du seed.
 */
export async function collectSkillTree() {
  const branches: { id: string; nameFr: string }[] = []
  const nodes: SeededNode[] = []
  const edges: SeededEdge[] = []
  let seq = 0

  const tx = {
    skillConfig: { upsert: async () => ({}) },
    skillBranch: {
      create: async ({ data }: { data: { nameFr: string } }) => {
        const id = `b${++seq}`
        branches.push({ id, nameFr: data.nameFr })
        return { id }
      },
    },
    skillNode: {
      create: async ({
        data,
      }: {
        data: Omit<SeededNode, 'id' | 'levels'> & {
          levels: { create: { level: number; effect: number }[] }
        }
      }) => {
        const id = `n${++seq}`
        nodes.push({ ...data, id, levels: data.levels.create })
        return { id }
      },
      // Le seed se relit pour compter ce qu'il vient d'écrire (le total de
      // points était écrit en dur et a fini par mentir).
      findMany: async () => nodes.map((n) => ({ ...n })),
    },
    skillEdge: {
      createMany: async ({ data }: { data: SeededEdge[] }) => {
        edges.push(...data)
        return {}
      },
    },
  }

  // biome-ignore lint/suspicious/noExplicitAny: collaborateur de test, pas un client Prisma
  await seedSkills(tx as any)
  return { branches, nodes, edges }
}

/**
 * Effet RÉEL d'un nœud à un rang donné, lu dans le seed.
 *
 * À préférer systématiquement à une constante recopiée : « Vétéran r3 » a été
 * écrit 0.3 en dur dans la simulation de cadence, et y est resté après le
 * passage de la courbe du nœud à 3/7/10/14/17 — le modèle surestimait alors
 * l'XP de combat sans que rien ne le signale.
 */
export async function effectAtRank(
  effectType: string,
  rank: number,
): Promise<number> {
  const { nodes } = await collectSkillTree()
  const node = nodes.find((n) => n.effectType === effectType)
  if (!node) {
    throw new Error(`Aucun nœud de type ${effectType} dans le seed`)
  }
  const lvl = node.levels.find((l) => l.level === rank)
  if (!lvl) {
    throw new Error(`${effectType} n'a pas de rang ${rank} (max ${node.maxLevel})`)
  }
  return lvl.effect
}
