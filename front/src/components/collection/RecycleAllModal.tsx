import { RefreshCw, Sparkles } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'

import type {
  BulkRecycleMaxRarity,
  UserCard,
} from '../../api/collection.api.ts'
import { RARITY_COLOR_VAR } from '../../libs/rarity.ts'
import { useRecycleAll } from '../../queries/useCollection.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import { Button } from '../ui/button.tsx'
import { Select } from '../ui/input.tsx'
import { Label } from '../ui/label.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'
import { RARITY_LABELS, RARITY_ORDER } from './CollectionCard.tsx'
import { RarityDot } from './CollectionFilters.tsx'

interface RecycleAllModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userCards: UserCard[]
}

const THRESHOLD_OPTIONS: {
  value: BulkRecycleMaxRarity
  label: string
  icon: ReactNode
}[] = (['COMMON', 'UNCOMMON', 'RARE', 'EPIC'] as const).map((r) => ({
  value: r,
  label: RARITY_LABELS[r],
  icon: <RarityDot color={RARITY_COLOR_VAR[r]} />,
}))

export function RecycleAllModal({
  open,
  onOpenChange,
  userCards,
}: RecycleAllModalProps) {
  const [maxRarity, setMaxRarity] = useState<BulkRecycleMaxRarity>('COMMON')
  const { mutate: recycleAll, isPending } = useRecycleAll()
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()

  const preview = useMemo(() => {
    const allowed: readonly string[] = RARITY_ORDER.slice(
      0,
      RARITY_ORDER.indexOf(maxRarity) + 1,
    )
    let copies = 0
    let dust = 0
    for (const uc of userCards) {
      if (uc.variant !== 'NORMAL' || uc.quantity <= 1) {
        continue
      }
      if (!allowed.includes(uc.card.rarity)) {
        continue
      }
      copies += uc.quantity - 1
      dust += (uc.quantity - 1) * (economy.recycle[uc.card.rarity] ?? 0)
    }
    return { copies, dust }
  }, [userCards, maxRarity, economy])

  const handleRecycleAll = () => {
    recycleAll(maxRarity, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Popup open={open} onOpenChange={onOpenChange}>
      <PopupContent>
        <PopupHeader>
          <PopupTitle icon={<RefreshCw className="h-4 w-4" />}>
            Tout recycler
          </PopupTitle>
        </PopupHeader>

        <PopupBody className="space-y-5">
          <p className="text-sm text-text-light">
            Recycle d'un coup tous les doublons (variante normale) jusqu'à la
            rareté choisie. Un exemplaire de chaque carte est conservé, les
            brillantes et holographiques ne sont pas touchées.
          </p>

          <div className="space-y-2">
            <Label className="text-xs text-text-light">Jusqu'à la rareté</Label>
            <Select
              id="recycle-max-rarity"
              options={THRESHOLD_OPTIONS}
              value={maxRarity}
              onValueChange={(v) => setMaxRarity(v as BulkRecycleMaxRarity)}
              clearable={false}
            />
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-[11px] uppercase tracking-widest text-text-light/60 mb-1">
              Tu obtiendras
            </p>
            <p className="text-3xl font-black text-primary tabular-nums">
              {preview.dust.toLocaleString('fr-FR')}
              <Sparkles className="ml-1.5 inline h-6 w-6 text-primary" />
            </p>
            <p className="mt-1 text-[11px] text-text-light/50">
              {preview.copies} doublon{preview.copies > 1 ? 's' : ''} recyclé
              {preview.copies > 1 ? 's' : ''} · hors bonus multiplicateur
            </p>
          </div>
        </PopupBody>

        <PopupFooter className="flex justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleRecycleAll}
            disabled={isPending || preview.copies === 0}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {isPending
              ? 'Recyclage…'
              : `Recycler ${preview.copies} doublon${preview.copies > 1 ? 's' : ''}`}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
