/**
 * Valeur de chaque passif en stats d'équipe (voir src/test/helpers/passive-power.ts).
 * Usage : npx tsx scripts/passive-bench.ts [CLE,CLE…]
 * SCALE=CLE:1.5,… multiplie la valeur du passif, pour calibrer avant d'éditer passives.ts.
 */
import { PASSIVES } from '../src/main/domain/combat/passives'
import { passiveValuePct } from '../src/test/helpers/passive-power'

for (const pair of process.env.SCALE?.split(',') ?? []) {
  const [key, factor] = pair.split(':')
  const def = PASSIVES[key as keyof typeof PASSIVES]
  const compute = def.compute.bind(def)
  def.compute = (palier) => ({
    valuePct: compute(palier).valuePct * Number(factor),
  })
}

const keys = (process.argv[2]?.split(',') ??
  Object.keys(PASSIVES)) as (keyof typeof PASSIVES)[]
console.log('passif        mixte  défensive  moyenne')
for (const key of keys) {
  const m = passiveValuePct(key, 'mixte')
  const d = passiveValuePct(key, 'defensive')
  console.log(
    `${key.padEnd(12)} ${m.toFixed(1).padStart(5)} %  ${d.toFixed(1).padStart(6)} %  ${((m + d) / 2).toFixed(1).padStart(5)} %  ${PASSIVES[key].rarityHint}`,
  )
}
