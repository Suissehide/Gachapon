import { Settings, Shield, Swords } from 'lucide-react'

import type { TeamUnit } from '../../api/combat.api.ts'
import { computePower } from '../../utils/cardStats.ts'
import { Button } from '../ui/button.tsx'
import { MiniCard } from './MiniCard.tsx'

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

/**
 * Bandeau d'équipe persistant, ancré en bas de page. Partagé par la campagne
 * et les tours : les deux se jouent avec la même équipe de combat, et il
 * serait déroutant de la voir dans un écran et pas dans l'autre.
 */
export function TeamDock({
  team,
  onEdit,
}: {
  team: TeamUnit[]
  onEdit: () => void
}) {
  const total = team.reduce((acc, u) => acc + computePower(u.stats), 0)

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 pt-3"
      style={{
        background: 'linear-gradient(180deg, rgba(251,248,243,0), #fbf8f3 38%)',
      }}
    >
      <div className="pointer-events-auto mx-auto flex max-w-5xl items-center gap-4 rounded-[20px] bg-[#1b1726] px-4 py-3 pl-5 text-white shadow-[0_18px_44px_-16px_rgba(27,23,38,0.5)]">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-amber-400" />
          <div>
            <div className="font-display text-base font-extrabold text-white">
              Mon équipe
            </div>
            <div className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-white/60">
              <Swords className="h-3 w-3 text-amber-400" />
              <b className="tabular-nums text-[13px] text-amber-400">
                {fmt(total)}
              </b>
              <span>Puissance</span>
            </div>
          </div>
        </div>

        <div className="mx-auto hidden gap-2 md:flex">
          {team.length === 0 ? (
            <span className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-white/60">
              Aucune carte
            </span>
          ) : (
            team.map((u) => (
              <MiniCard
                key={u.userCardId}
                unit={u}
                width="w-[52px]"
                showName={false}
              />
            ))
          )}
        </div>

        <div className="ml-auto flex gap-2 md:ml-0">
          <Button
            variant="secondary"
            onClick={onEdit}
            className="gap-2 bg-white text-[#1b1726] hover:bg-white/90 hover:text-[#1b1726] border-white/0"
          >
            <Settings className="h-4 w-4" />
            Modifier
          </Button>
        </div>
      </div>
    </div>
  )
}
