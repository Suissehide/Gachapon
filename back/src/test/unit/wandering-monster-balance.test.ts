import {
  WANDERER_TARGET,
  wandererWinRate,
} from '../../../prisma/seed/balance-calibration'
import {
  CHAPTER_COUNT,
  STAGES_PER_CHAPTER,
} from '../../main/domain/content/campaign.definitions'

// Le monstre errant solo doit tenir sa cible de victoire sur chaque étage
// normal. La bande par étage est large (un monstre AOE_3 bascule pour
// quelques % d'échelle, et le chapitre 1 change d'équipement par à-coups)
// mais elle attrape ce qui compte : un étage devenu imbattable ou gratuit —
// une échelle par chapitre laissait des têtes Lumière ou Ténèbres à 0 %.
describe('monstre errant solo — tient sa cible de victoire', () => {
  it('chaque étage normal reste à ±22 pts de la cible, la moyenne à ±5 pts', () => {
    const ecarts: number[] = []
    for (let chapter = 1; chapter <= CHAPTER_COUNT; chapter++) {
      for (let index = 1; index < STAGES_PER_CHAPTER; index++) {
        const solo = wandererWinRate({ chapter, index, runs: 100 })
        ecarts.push(Math.abs(solo - WANDERER_TARGET))
      }
    }
    expect(Math.max(...ecarts)).toBeLessThanOrEqual(0.22)
    const moyenne = ecarts.reduce((a, b) => a + b, 0) / ecarts.length
    expect(moyenne).toBeLessThanOrEqual(0.05)
  })
})
