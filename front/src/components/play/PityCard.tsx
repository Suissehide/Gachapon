import { Gem } from 'lucide-react'

import { useTokenBalance } from '../../queries/useGacha.ts'

export function PityCard() {
  const { data: balance } = useTokenBalance()

  const current = balance?.pityCurrent ?? 0
  const threshold = balance?.pityThreshold ?? 0
  // Le moteur force le légendaire quand le compteur LU AVANT le tirage a déjà
  // atteint le seuil (`isPityForced = currentPity >= pityThreshold`, voir
  // `gacha.domain.ts`), et ce compteur avance d'un par tirage non légendaire :
  // depuis un compteur persisté P, le tirage n° k voit P + k - 1, donc le
  // tirage garanti est le n° `seuil - P + 1`. Compter `seuil - P` annoncerait
  // le légendaire un tirage trop tôt — c'est la même arithmétique que le
  // `P + N - 1 >= T` du calcul de cote des paris (`bet.domain.ts`).
  const remaining = Math.max(1, threshold - current + 1)
  const pct = threshold > 0 ? Math.min(100, (current / threshold) * 100) : 0

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-light">
          <Gem className="h-3.5 w-3.5 text-secondary" />
          Garantie
        </span>
        <span className="text-[13px] text-text-light">
          {threshold === 0 ? (
            '—'
          ) : remaining === 1 ? (
            <b className="font-display text-[15px] text-secondary">
              Légendaire au prochain tirage !
            </b>
          ) : (
            <>
              Légendaire dans{' '}
              <b className="font-display text-[17px] tabular-nums text-secondary">
                {remaining}
              </b>{' '}
              tirages
            </>
          )}
        </span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${pct}%`,
            background:
              'linear-gradient(90deg, var(--secondary), var(--rarity-legendary))',
          }}
        />
      </div>
    </div>
  )
}
