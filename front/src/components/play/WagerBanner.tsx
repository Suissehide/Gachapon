import { Link } from '@tanstack/react-router'
import { Swords } from 'lucide-react'

import { useMyDuel } from '../../queries/useMyDuel.ts'
import { DuelResultPopup, useSettledDuel } from '../team/DuelResultPopup.tsx'
import { Button } from '../ui/button.tsx'

/**
 * Rappel du duel en cours, en haut de la page de tirage : c'est ici que le
 * joueur consomme les tirages comptés, donc ici que le score et le nombre
 * de tirages restants valent quelque chose.
 *
 * Rien à dire = rien à l'écran (pas de squelette qui apparaîtrait puis
 * disparaîtrait, ce qui décalerait la page deux fois). La fenêtre de
 * résultat, elle, reste montée même sans duel actif : au règlement le duel
 * quitte la liste des duels en cours, et c'est précisément à ce
 * moment-là qu'il faut l'annoncer.
 */
export function WagerBanner() {
  const { duel, teamId, teamIds, settledDuels } = useMyDuel()
  const settled = useSettledDuel(teamIds, settledDuels)

  const result =
    settled.duel === null ? null : (
      <DuelResultPopup
        duel={settled.duel}
        transferredCount={settled.transferredCount}
        onClose={settled.close}
      />
    )

  if (duel === null || teamId === undefined) {
    return result
  }

  const iAmChallenger = duel.myRole === 'CHALLENGER'
  const me = iAmChallenger ? duel.challenger : duel.opponent
  const them = iAmChallenger ? duel.opponent : duel.challenger
  const myScore = iAmChallenger ? duel.challengerScore : duel.opponentScore
  const theirScore = iAmChallenger ? duel.opponentScore : duel.challengerScore
  const myPulls = iAmChallenger ? duel.challengerPulls : duel.opponentPulls
  const left = Math.max(0, duel.pullCount - myPulls)

  return (
    <>
      <div className="relative z-1 mx-auto mt-4 w-full max-w-5xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-card px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Swords className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
                Duel en cours
              </div>
              <div className="truncate font-display text-base font-bold text-text">
                {me.username} {myScore.toLocaleString('fr-FR')}
                <span className="mx-1.5 text-text-light">–</span>
                {them.username} {theirScore.toLocaleString('fr-FR')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-text-light">
              {left === 0
                ? "Tes tirages comptés sont faits, on attend l'adversaire"
                : `Il te reste ${left} tirage${left > 1 ? 's' : ''} compté${left > 1 ? 's' : ''}`}
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link to="/team/$id" params={{ id: teamId }}>
                Voir le duel
              </Link>
            </Button>
          </div>
        </div>
      </div>
      {result}
    </>
  )
}
