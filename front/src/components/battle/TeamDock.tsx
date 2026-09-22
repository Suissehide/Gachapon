import { Settings, Shield, Swords } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { TeamUnit } from '../../api/combat.api.ts'
import { currentLocale } from '../../i18n/index.ts'
import { formatNumber } from '../../libs/utils.ts'
import { computePower } from '../../utils/cardStats.ts'
import { Button } from '../ui/button.tsx'
import { MiniCard } from './MiniCard.tsx'

function fmt(n: number): string {
  return formatNumber(n, currentLocale())
}

/**
 * Bandeau d'équipe persistant, ancré en bas de page. Chaque mode a sa propre
 * équipe ; le bandeau dit LAQUELLE, et signale le cas où le mode n'en a pas
 * encore et joue celle de la campagne.
 */
export function TeamDock({
  team,
  onEdit,
  modeLabel,
}: {
  team: TeamUnit[]
  onEdit: () => void
  modeLabel: string
}) {
  const total = team.reduce((acc, u) => acc + computePower(u.stats), 0)

  // Le bandeau est `fixed` : il ne pousse rien, donc il recouvre la fin du
  // contenu si la page ne lui réserve pas sa place (l'étage 10 des tours
  // passait sous la barre). Plutôt que de demander à chaque page de s'en
  // souvenir, le bandeau mesure sa propre hauteur — elle dépend de la largeur
  // d'écran, les cartes n'apparaissant qu'à partir de `md` — et pose une cale
  // de la même hauteur dans le flux, là où il est monté.
  const barRef = useRef<HTMLDivElement>(null)
  const [reservedHeight, setReservedHeight] = useState(0)

  useEffect(() => {
    const el = barRef.current
    if (!el) {
      return
    }
    const observer = new ResizeObserver(() =>
      setReservedHeight(el.offsetHeight),
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div
        aria-hidden
        className="shrink-0"
        style={{ height: reservedHeight }}
      />
      <div
        ref={barRef}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 pt-3"
        style={{
          background:
            'linear-gradient(180deg, rgba(251,248,243,0), #fbf8f3 38%)',
        }}
      >
        <div className="pointer-events-auto mx-auto flex max-w-5xl items-center gap-4 rounded-[20px] bg-[#1b1726] px-4 py-3 pl-5 text-white shadow-[0_18px_44px_-16px_rgba(27,23,38,0.5)]">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-amber-400" />
            <div>
              <div className="font-display text-base font-extrabold text-white">
                {modeLabel}
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
    </>
  )
}
