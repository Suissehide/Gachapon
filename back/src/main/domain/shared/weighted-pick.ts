/**
 * Tirage pondéré par `dropWeight`, à hasard injecté. Partagé par la
 * génération des commandes et l'alchimie (même loi qu'un tirage gacha,
 * sans les bonus de chance).
 */
export function weightedPick<T extends { dropWeight: number }>(
  items: T[],
  rng: () => number,
): T {
  const total = items.reduce((s, c) => s + c.dropWeight, 0)
  let roll = rng() * total
  for (const c of items) {
    roll -= c.dropWeight
    if (roll < 0 || (roll === 0 && c.dropWeight > 0)) {
      return c
    }
  }
  // biome-ignore lint/style/noNonNullAssertion: appelé avec une liste non vide
  return items.findLast((c) => c.dropWeight > 0) ?? items[items.length - 1]!
}
