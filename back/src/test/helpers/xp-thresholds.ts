import { xpForLevel } from '../../main/domain/shared/xp'

/**
 * Seuils d'XP DÉRIVÉS de la config, jamais codés en dur.
 *
 * Les tests qui suivent ne mesurent pas la courbe d'XP mais ce qu'un passage
 * de niveau déclenche : le refill d'énergie, les points de compétence, les
 * récompenses de palier. Y écrire « xp: 99 » parce que le niveau 2 coûtait
 * 100 était un couplage accidentel — le durcissement de la courbe (×5, le
 * 2026-09-15) a fait tomber quatre suites d'un coup, sans qu'aucun
 * comportement testé n'ait changé.
 */
export async function xpThresholds(configService: {
  getMany: (
    ...keys: string[]
  ) => Promise<Record<string, number>>
}) {
  const c = await configService.getMany('xp.base', 'xp.slope')
  const base = c['xp.base'] as number
  const slope = c['xp.slope'] as number
  return {
    /** XP totale cumulée pour atteindre exactement `level`. */
    forLevel: (level: number) => xpForLevel(level, base, slope),
    /** 1 XP sous `level` : le moindre gain suffit alors à monter. */
    justBelow: (level: number) => xpForLevel(level, base, slope) - 1,
  }
}
