import { useEffect, useState } from 'react'

import type { DuelView } from '../api/wagers.api.ts'
import { wsClient } from '../lib/ws.ts'

type SettledSignal = { duelId: string; transferredCount: number }

/**
 * Écoute `duel:settled` et ne retient que les duels où JE suis partie.
 *
 * L'événement part vers toute l'équipe (voir `DuelDomain#settle`), mais il ne
 * dit pas quel rôle j'y tenais : c'est la vue rafraîchie par `useWagersLive`
 * qui le dit, via `myRole`. On mémorise donc l'identifiant reçu, puis on
 * attend que le duel apparaisse dans `settledDuels` pour décider d'ouvrir —
 * un spectateur ne verra jamais la fenêtre s'ouvrir.
 *
 * `teamIds` est joint en chaîne pour servir de dépendance stable : un tableau
 * recréé à chaque rendu réabonnerait le WebSocket en boucle.
 */
export function useSettledDuel(
  teamIds: string[],
  settledDuels: DuelView[] | undefined,
) {
  const [signal, setSignal] = useState<SettledSignal | null>(null)
  const teamKey = teamIds.join(',')

  useEffect(() => {
    const ids = new Set(teamKey.split(',').filter(Boolean))
    if (ids.size === 0) {
      return
    }
    return wsClient.on((event) => {
      if (event.type !== 'duel:settled' || !ids.has(event.teamId)) {
        return
      }
      setSignal({
        duelId: event.duelId,
        transferredCount: event.transferredCount,
      })
    })
  }, [teamKey])

  const matched =
    signal === null
      ? null
      : (settledDuels?.find((d) => d.id === signal.duelId) ?? null)

  return {
    duel: matched !== null && matched.myRole !== 'SPECTATOR' ? matched : null,
    transferredCount: signal?.transferredCount ?? 0,
    close: () => setSignal(null),
  }
}
