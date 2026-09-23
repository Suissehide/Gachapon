import { useCallback, useRef } from 'react'

import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../queries/useEconomyConfig.ts'
import { useLevelUpStore } from '../stores/levelUp.store.ts'
import { computeLevel } from '../utils/level.ts'
import { levelUpReward } from '../utils/levelRewards.ts'

/** État du joueur avant le gain, tel que le renvoient combats et balayages. */
export type XpGain = {
  xpBefore: number
  levelBefore: number
  xp: number
}

/**
 * Déclenche `LevelUpOverlay` quand un gain d'XP fait franchir un niveau.
 *
 * Chaque source d'XP (tirage, combat de campagne, combat de tour, balayages,
 * récompenses réclamées) doit appeler ce déclencheur : l'overlay est monté une
 * fois dans `_authenticated.tsx` mais rien ne l'ouvre tout seul, et c'est
 * précisément ce qui a laissé la tour et les balayages sans célébration.
 *
 * L'appel se fait au moment où le résultat devient visible — après l'animation
 * de combat, pas à la réponse du serveur — pour ne pas jouer la célébration
 * par-dessus la scène.
 */
export function useLevelUpCelebration() {
  const triggerLevelUp = useLevelUpStore((s) => s.triggerLevelUp)
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  // La config d'économie passe par une ref pour que le déclencheur garde la
  // MÊME identité d'un rendu à l'autre : les appelants le mettent dans les
  // dépendances d'un `useEffect`, et un simple refetch de `/economy/config`
  // (au retour de focus, par exemple) rejouerait sinon toute l'animation.
  const economyRef = useRef(economy)
  economyRef.current = economy

  return useCallback(
    (gain: XpGain) => {
      const xpCfg = economyRef.current.xp
      const newLevel = computeLevel(gain.xpBefore + gain.xp, xpCfg)
      if (newLevel > gain.levelBefore) {
        triggerLevelUp(
          newLevel,
          levelUpReward(gain.levelBefore, newLevel, xpCfg),
        )
      }
    },
    [triggerLevelUp],
  )
}
