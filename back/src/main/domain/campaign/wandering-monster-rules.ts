import { isStageCleared } from './campaign.domain'

// Règles pures du monstre errant (spec docs/superpowers/specs/2026-10-19-monstre-errant-design.md, section « Règles »).

export type WandererLootKind = 'GOLD' | 'DUST' | 'TOKENS' | 'CARD'

export type WandererLoot =
  | { kind: 'GOLD' | 'DUST' | 'TOKENS'; amount: number }
  | { kind: 'CARD'; amount: 1 }

/** Pure : délai d'apparition en minutes entières, tiré uniformément dans [minMinutes, maxMinutes]. */
export function pickSpawnDelayMinutes(
  minMinutes: number,
  maxMinutes: number,
  rng: () => number,
): number {
  const span = maxMinutes - minMinutes + 1
  return minMinutes + Math.floor(rng() * span)
}

/** Pure : un étage déjà battu, tiré uniformément dans le chapitre le plus avancé du joueur ; null si aucun étage n'est battu. */
export function pickMonsterStage<T extends { chapter: number; index: number }>(
  stages: T[],
  progress: { highestChapter: number; highestIndex: number },
  rng: () => number,
): T | null {
  const cleared = stages.filter((stage) => isStageCleared(stage, progress))
  if (cleared.length === 0) {
    return null
  }
  const highestChapter = Math.max(...cleared.map((stage) => stage.chapter))
  const candidates = cleared.filter((stage) => stage.chapter === highestChapter)
  const picked = candidates[Math.floor(rng() * candidates.length)]
  if (picked === undefined) {
    // Ne peut pas arriver : l'indice est tiré dans [0, candidates.length).
    throw new Error('indice hors bornes dans pickMonsterStage')
  }
  return picked
}

/** Pure : un lot parmi les quatre, à poids égaux. */
export function pickLootKind(rng: () => number): WandererLootKind {
  const kinds: WandererLootKind[] = ['GOLD', 'DUST', 'TOKENS', 'CARD']
  const picked = kinds[Math.floor(rng() * kinds.length)]
  if (picked === undefined) {
    // Ne peut pas arriver : l'indice est tiré dans [0, kinds.length).
    throw new Error('indice hors bornes dans pickLootKind')
  }
  return picked
}

/** Pure : montant du lot tiré, à partir du butin de farm de l'étage et des clés `wanderer.*`. */
export function computeLoot(
  kind: WandererLootKind,
  farm: { gold: number; dust: number },
  cfg: { lootMult: number; tokens: number },
): WandererLoot {
  switch (kind) {
    case 'GOLD':
      return { kind, amount: Math.round(farm.gold * cfg.lootMult) }
    case 'DUST':
      return { kind, amount: Math.round(farm.dust * cfg.lootMult) }
    case 'TOKENS':
      return { kind, amount: cfg.tokens }
    case 'CARD':
      return { kind, amount: 1 }
  }
}

/**
 * Le monstre actif d'un joueur : apparu, pas expiré, pas vaincu. Le plus
 * ancien d'abord (expiresAt le plus proche), pour qu'un monstre de la veille
 * qui déborde sur la fenêtre du jour passe avant celui du jour. Partagé par la
 * lecture et le combat, qui doivent viser le même monstre.
 */
export function activeWandererQuery(userId: string, now: Date) {
  return {
    where: {
      userId,
      appearsAt: { lte: now },
      expiresAt: { gt: now },
      defeatedAt: null,
    },
    orderBy: { expiresAt: 'asc' as const },
  }
}
