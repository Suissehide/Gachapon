// Carte « Paris entre coéquipiers » — la sœur droite de la section.
// Reprend `docs/design_handoff_duels/reference/equipe-duels.css`
// (`.dz-ticket`, `.dz-bet`, `.dz-cond`, `.dz-stake`, `.dz-odds`,
// `.dz-win-track`).
//
// Contrairement au duel, plusieurs paris coexistent : la carte empile les
// tickets. Chaque ticket est un MARCHÉ à deux camps — celui qui l'a ouvert
// tient le « oui », les autres renchérissent du camp qu'ils veulent — et sa
// cote bouge à chaque mise, tant que la cible n'a pas entamé sa fenêtre.
//
// La barre de progression n'est pas un contrôle : une fois la fenêtre
// entamée, plus rien ne se pose sur ce marché.
import { ChevronRight, Sparkles, Target } from 'lucide-react'

import type { BetSide, BetView } from '../../../api/wagers.api.ts'
import { fmtMultiplier } from '../../../libs/duel.ts'
import { RARITY_LABEL_FR } from '../../../libs/rarity.ts'
import { cn } from '../../../libs/utils.ts'
import { Button } from '../../ui/button.tsx'
import { LockedPill, WagerCard, WagerCardHead, WagerEmpty } from './parts.tsx'

const fr = (n: number) => n.toLocaleString('fr-FR')

/** Un camp du marché : son pot, sa cote, et le bouton pour le rejoindre. */
function SideBlock({
  label,
  pool,
  odds,
  mine,
  tone,
  onJoin,
}: {
  label: string
  pool: number
  odds: number
  mine: boolean
  tone: 'yes' | 'no'
  onJoin: (() => void) | null
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-[14px] border px-3 py-2.5',
        mine
          ? 'border-primary/40 bg-primary/8'
          : 'border-foreground/10 bg-card',
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            'font-mono text-[10px] font-bold tracking-[0.1em]',
            tone === 'yes' ? 'text-wager-bet-ink' : 'text-destructive',
          )}
        >
          {label}
        </span>
        <span className="font-display text-base font-extrabold tabular-nums text-text">
          <span className="text-[11px] text-foreground/40">×</span>
          {fmtMultiplier(odds)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-foreground/55">
          <Sparkles className="h-3 w-3 text-dust" />
          {fr(pool)}
        </span>
        {mine ? (
          <span className="font-mono text-[9px] tracking-[0.12em] text-primary-dark">
            TON CAMP
          </span>
        ) : onJoin !== null ? (
          <Button
            type="button"
            variant="mono"
            size="mono"
            onClick={onJoin}
            className="px-2.5 py-1"
          >
            RENCHÉRIR
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function BetTicket({
  bet,
  onJoin,
}: {
  bet: BetView
  onJoin: (bet: BetView, side: BetSide) => void
}) {
  const rarityLabel = RARITY_LABEL_FR[bet.minRarity] ?? bet.minRarity
  const seenPct = Math.min(
    100,
    Math.round((bet.pullsSeen / Math.max(1, bet.pullWindow)) * 100),
  )
  // On ne renchérit ni sur ses propres tirages, ni après avoir déjà misé, ni
  // une fois le marché clos. Le serveur refuse les trois ; ici on évite juste
  // de proposer un bouton qui échouerait.
  const canJoin = bet.open && bet.mySide === null && bet.myRole !== 'TARGET'

  return (
    <li className="rounded-[18px] border-[1.5px] border-foreground/10 bg-surface-2 px-[18px] pb-3.5 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex min-w-0 items-center gap-1 text-[14.5px] font-bold text-text">
          <span className="truncate">{bet.bettor.username}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-foreground/35" />
          <span className="truncate">{bet.target.username}</span>
        </span>
        <span className="shrink-0 rounded-full border border-wager-bet-border bg-wager-bet-soft px-2 py-0.5 font-mono text-[10px] font-bold text-wager-bet-ink">
          ≥ {rarityLabel.toUpperCase()}
        </span>
        {!bet.open && (
          <span className="shrink-0 rounded-full border border-foreground/10 bg-card px-2 py-0.5 font-mono text-[10px] font-bold text-foreground/45">
            MISES CLOSES
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <SideBlock
          label="OUI"
          pool={bet.poolYes}
          odds={bet.oddsYes}
          mine={bet.mySide === 'YES'}
          tone="yes"
          onJoin={canJoin ? () => onJoin(bet, 'YES') : null}
        />
        <SideBlock
          label="NON"
          pool={bet.poolNo}
          odds={bet.oddsNo}
          mine={bet.mySide === 'NO'}
          tone="no"
          onJoin={canJoin ? () => onJoin(bet, 'NO') : null}
        />
      </div>

      {bet.mySide !== null && (
        <p className="mt-2 font-mono text-[10px] tracking-[0.06em] text-foreground/45">
          Ta mise {fr(bet.myStake)} · gain si{' '}
          {bet.mySide === 'YES' ? 'oui' : 'non'}{' '}
          {fr(
            Math.round(
              bet.myStake * (bet.mySide === 'YES' ? bet.oddsYes : bet.oddsNo),
            ),
          )}
          {bet.open && ' — la cote bouge encore à chaque mise'}
        </p>
      )}

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
  onJoin,
}: {
  bets: BetView[]
  canBet: boolean
  lockedReason: string
  onBet: () => void
  onJoin: (bet: BetView, side: BetSide) => void
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
            <BetTicket key={bet.id} bet={bet} onJoin={onJoin} />
          ))}
        </ul>
      )}
    </WagerCard>
  )
}
