/**
 * Valeur de chaque ultime en stats d'équipe (voir src/test/helpers/ultimate-power.ts).
 * Usage : npx tsx scripts/ultimate-bench.ts [ARCHETYPE,ARCHETYPE…]
 * SCALE=ARCHETYPE:1.5,… multiplie la magnitude de l'ultime, pour calibrer
 * avant d'éditer ultimates.ts.
 */
import { ULTIMATES } from '../src/main/domain/combat/ultimates'
import type { CardArchetype } from '../src/main/types/domain/combat/archetype.types'
import { ultimateValuePct } from '../src/test/helpers/ultimate-power'

for (const pair of process.env.SCALE?.split(',') ?? []) {
  const [key, factor] = pair.split(':')
  const def = ULTIMATES[key as CardArchetype]
  const compute = def.compute.bind(def)
  def.compute = (palier) => ({
    valuePct: compute(palier).valuePct * Number(factor),
  })
}

const keys = (process.argv[2]?.split(',') ??
  Object.keys(ULTIMATES)) as CardArchetype[]
console.log('archétype     mixte  défensive  moyenne')
for (const key of keys) {
  const m = ultimateValuePct(key, 'mixte')
  const d = ultimateValuePct(key, 'defensive')
  console.log(
    `${key.padEnd(12)} ${m.toFixed(1).padStart(5)} %  ${d.toFixed(1).padStart(6)} %  ${((m + d) / 2).toFixed(1).padStart(5)} %`,
  )
}
