import { Link } from '@tanstack/react-router'
import { Swords, Target } from 'lucide-react'

import type { BetView } from '../../api/wagers.api.ts'
import { duelSides, pullsLeftLabel } from '../../libs/duel.ts'
import { RARITY_LABEL_FR } from '../../libs/rarity.ts'

const fr = (n: number) => n.toLocaleString('fr-FR')

import { plural } from '../../libs/utils.ts'
import { useMyDuel } from '../../queries/useMyDuel.ts'
import { useWagers } from '../../queries/useWagers.ts'
import { Button } from '../ui/button.tsx'

/**
 * Paris ACTIVE posés sur MOI, toutes équipes confondues. Rappelle chaque
 * `useWagers(teamId)` déjà interrogé par `useMyDuel` pour les mêmes
 * identifiants : la clé de requête (`['wagers', teamId]`) est identique,
 * donc React Query partage le cache et l'abonnement — aucune requête réseau
 * de plus qu'avant. `useMyDuel` porte déjà l'abonnement WebSocket
 * (`useWagersLive`) sur ces trois emplacements, `bet:placed` et
 * `bet:settled` compris, donc rien à rebrancher ici.
 */
function useBetsOnMe(teamIds: string[]): BetView[] {
  const slot0 = useWagers(teamIds[0])
  const slot1 = useWagers(teamIds[1])
  const slot2 = useWagers(teamIds[2])
  return [slot0, slot1, slot2].flatMap(
    (slot) => slot.data?.bets.filter((bet) => bet.myRole === 'TARGET') ?? [],
  )
}

/**
 * Rappel du duel en cours et des paris posés sur moi, en haut de la page de
 * tirage : c'est ici que le joueur consomme les tirages comptés ou observés,
 * donc ici que le score, les tirages restants et le regard des autres sur
 * son tirage valent quelque chose — c'est ce qui rend le pari social.
 *
 * Rien à dire = rien à l'écran (pas de squelette qui apparaîtrait puis
 * disparaîtrait, ce qui décalerait la page).
 *
 * Le résultat du duel N'EST PLUS annoncé ici. `duel:settled` part au dernier
 * tirage compté, c'est-à-dire pendant que l'animation de révélation tourne
 * encore : la fenêtre s'ouvrait par-dessus et gâchait le tirage qu'elle
 * venait justement de récompenser. Le verdict passe désormais par la pastille
 * de notification, que le joueur ouvre quand il a fini.
 */
export function WagerBanner() {
  const { duel, teamId, teamIds } = useMyDuel()
  const betsOnMe = useBetsOnMe(teamIds)

  const betBanner =
    betsOnMe.length === 0 ? null : (
      <div className="relative z-1 mx-auto mt-4 w-full max-w-5xl px-4">
        <div className="flex flex-col gap-2 rounded-2xl border border-primary/30 bg-card px-4 py-3">
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
            <Target className="h-3.5 w-3.5 shrink-0 text-primary" />
            {betsOnMe.length > 1
              ? `${betsOnMe.length} paris posés sur toi`
              : 'Un pari posé sur toi'}
          </div>
          <ul className="flex flex-col gap-1">
            {betsOnMe.map((bet) => (
              <li
                key={bet.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm text-text"
              >
                {/* Le RAPPORT DE FORCES, pas une mise : un pari est un
                    marché, et savoir que l'équipe mise surtout contre toi
                    n'est pas la même information qu'une cote. */}
                <span className="truncate">
                  {fr(bet.poolYes)} misent que tu sors au moins{' '}
                  {RARITY_LABEL_FR[bet.minRarity] ?? bet.minRarity}
                  {bet.poolNo > 0 && `, ${fr(bet.poolNo)} que non`}
                </span>
                <span className="font-mono text-xs text-text-light">
                  {pullsLeftLabel(bet.pullsSeen, bet.pullWindow)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )

  if (duel === null || teamId === undefined) {
    return betBanner
  }

  const { me, them, myScore, theirScore, myPulls } = duelSides(duel)
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
                : `Il te reste ${left} tirage${plural(left)} compté${plural(left)}`}
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link to="/team/$id" params={{ id: teamId }}>
                Voir le duel
              </Link>
            </Button>
          </div>
        </div>
      </div>
      {betBanner}
    </>
  )
}
