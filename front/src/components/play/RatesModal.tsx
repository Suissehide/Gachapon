import { Gem } from 'lucide-react'

import { RARITY_FR } from '../../constants/achievements.constant.ts'
import { useDropRates, useTokenBalance } from '../../queries/useGacha.ts'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'

type Props = {
  open: boolean
  onClose: () => void
}

export function RatesModal({ open, onClose }: Props) {
  const { data } = useDropRates()
  const { data: balance } = useTokenBalance()
  const rates = data?.rates ?? []

  return (
    <Popup open={open} onOpenChange={(o) => !o && onClose()}>
      <PopupContent>
        <PopupHeader>
          <PopupTitle icon={<Gem className="h-4 w-4 text-secondary" />}>
            Taux de drop
          </PopupTitle>
        </PopupHeader>
        <PopupBody>
          <div className="flex flex-col gap-2.5">
            {rates.map((rate) => (
              <div key={rate.rarity} className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    background: `var(--rarity-${rate.rarity.toLowerCase()})`,
                  }}
                />
                <span className="w-[100px] text-sm font-semibold">
                  {RARITY_FR[rate.rarity]}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${rate.pct}%`,
                      background: `var(--rarity-${rate.rarity.toLowerCase()})`,
                    }}
                  />
                </span>
                <b className="w-[52px] text-right font-display text-[15px] tabular-nums">
                  {rate.pct}%
                </b>
              </div>
            ))}
          </div>
          {balance != null && balance.pityThreshold > 0 && (
            <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-text-light">
              Légendaire garanti tous les {balance.pityThreshold} tirages
            </p>
          )}
          <p className="mt-1.5 text-center text-[10px] text-text-light/60">
            Taux de base, hors bonus de l'arbre de compétences.
          </p>
        </PopupBody>
      </PopupContent>
    </Popup>
  )
}
