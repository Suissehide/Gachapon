export function applyPercentDiscount(
  cost: number,
  discountPct: number,
): number {
  const pct = Math.min(100, Math.max(0, discountPct))
  return Math.max(0, Math.round(cost * (1 - pct / 100)))
}
