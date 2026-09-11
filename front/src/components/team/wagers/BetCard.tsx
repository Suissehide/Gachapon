// Carte « Paris entre coéquipiers » — la sœur droite de la section.
// Reprend `docs/design_handoff_duels/reference/equipe-duels.css`
// (`.dz-ticket`, `.dz-bet`, `.dz-cond`, `.dz-stake`, `.dz-odds`,
// `.dz-win-track`).
//
// Contrairement au duel, plusieurs paris coexistent : la carte empile les
// tickets. Un ticket est en lecture seule — une fois la fenêtre ouverte, la
// mise n'est plus modifiable, donc la barre de progression n'est pas un
// contrôle.
import { ChevronRight, Sparkles, Target } from 'lucide-react'

import type { BetView } from '../../../api/wagers.api.ts'
import { fmtMultiplier } from '../../../libs/duel.ts'
import { RARITY_LABEL_FR } from '../../../libs/rarity.ts'
import { Button } from '../../ui/button.tsx'
import { LockedPill, WagerCard, WagerCardHead, WagerEmpty } from './parts.tsx'

const fr = (n: number) => n.toLocaleString('fr-FR')

/**
 * Gain affiché sur un ticket : `mise × cote`, arrondi. C'est un gain
 * POTENTIEL et un plafond, pas une promesse — la cote figée sert de borne
 * haute au règlement, qui peut payer moins si la cible a amélioré ses
 * chances entre-temps (voir `BetView.multiplier`).
 */
function potentialPayout(bet: BetView): number {
  return Math.round(bet.stake * bet.multiplier)
}

function BetTicket({ bet }: { bet: BetView }) {
  const rarityLabel = RARITY_LABEL_FR[bet.minRarity] ?? bet.minRarity
  const seenPct = Math.min(
    100,
    Math.round((bet.pullsSeen / Math.max(1, bet.pullWindow)) * 100),
  )

  return (
    <li className="rounded-[18px] border-[1.5px] border-foreground/10 bg-surface-2 px-[18px] pb-3.5 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex min-w-0 items-center gap-1 text-[14.5px] font-bold text-text">
              <span className="truncate">{bet.bettor.username}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-foreground/35" />
              <span className="truncate">{bet.target.username}</span>
            </span>
            <span className="shrink-0 rounded-full border border-wager-bet-border bg-wager-bet-soft px-2 py-0.5 font-mono text-[10px] font-bold text-wager-bet-ink">
              ≥ {rarityLabel.toUpperCase()}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-foreground/55">
            <span>
              Mise{' '}
              <strong className="font-display text-sm font-extrabold text-text">
                {fr(bet.stake)}
              </strong>{' '}
              poussière
            </span>
            <span className="inline-flex items-center gap-1">
              Gain{' '}
              <strong className="inline-flex items-center gap-1 font-display text-sm font-extrabold text-dust">
                <Sparkles className="h-3.5 w-3.5" />
                {fr(potentialPayout(bet))}
              </strong>
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="font-display text-xl font-extrabold tabular-nums text-text">
            <span className="text-sm text-foreground/40">×</span>
            {fmtMultiplier(bet.multiplier)}
          </div>
          <div className="font-mono text-[9px] tracking-[0.14em] text-foreground/45">
            COTE
          </div>
        </div>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-md bg-foreground/9">
        <div
          className="h-full rounded-md bg-linear-to-r from-wager-bet to-wager-window-to"
          style={{ width: `${seenPct}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between gap-3 font-mono text-[10px] tracking-[0.1em] text-foreground/45">
        <span>FENÊTRE DE PARI</span>
        <span>
          {bet.pullsSeen} / {bet.pullWindow} TIRAGES VUS
        </span>
      </div>
    </li>
  )
}

export function BetCard({
  bets,
  canBet,
  lockedReason,
  onBet,
}: {
  bets: BetView[]
  canBet: boolean
  lockedReason: string
  onBet: () => void
}) {
  return (
    <WagerCard>
      <WagerCardHead
        label="Pari sur un tirage"
        title="Paris entre coéquipiers"
        note="Mise de la poussière sur la prochaine série de tirages d’un coéquipier. La cote suit la rareté visée."
        action={
          canBet ? (
            <Button variant="amber" size="action" onClick={onBet}>
              <Target className="h-4 w-4" />
              Parier
            </Button>
          ) : (
            <LockedPill icon={Target}>{lockedReason}</LockedPill>
          )
        }
      />

      {bets.length === 0 ? (
        <WagerEmpty icon={Target}>
          Aucun pari ouvert. Choisis un coéquipier, une rareté à atteindre, et
          ta mise.
        </WagerEmpty>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {bets.map((bet) => (
            <BetTicket key={bet.id} bet={bet} />
          ))}
        </ul>
      )}
    </WagerCard>
  )
}
