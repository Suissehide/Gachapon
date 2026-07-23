import { Plus, Shield, Sparkles, Sword } from 'lucide-react'
import { useState } from 'react'

import type {
  EquipmentInstance,
  EquipmentSlot,
} from '../../api/equipment.api.ts'
import { useEquipmentList } from '../../queries/useEquipment.ts'
import { Button } from '../ui/button.tsx'
import { EquipmentSlotPopup } from './EquipmentSlotPopup.tsx'

const SLOT_ORDER: EquipmentSlot[] = ['WEAPON', 'ARMOR', 'ACCESSORY']
const SLOT_LABELS: Record<EquipmentSlot, string> = {
  WEAPON: 'Arme',
  ARMOR: 'Armure',
  ACCESSORY: 'Accessoire',
}
const SLOT_ICONS: Record<EquipmentSlot, typeof Sword> = {
  WEAPON: Sword,
  ARMOR: Shield,
  ACCESSORY: Sparkles,
}
const RARITY_TEXT: Record<string, string> = {
  COMMON: 'text-rarity-common',
  UNCOMMON: 'text-rarity-uncommon',
  RARE: 'text-rarity-rare',
  EPIC: 'text-rarity-epic',
  LEGENDARY: 'text-rarity-legendary',
}

type Props = {
  userCardId: string
  rarityHex: string
}

export function EquipmentSlotsPanel({ userCardId, rarityHex }: Props) {
  const equipment = useEquipmentList()
  const [pickerSlot, setPickerSlot] = useState<EquipmentSlot | null>(null)

  const items = equipment.data?.items ?? []
  const equippedOnCard = items.filter((i) => i.equippedOnId === userCardId)
  const bySlot: Partial<Record<EquipmentSlot, EquipmentInstance>> = {}
  for (const item of equippedOnCard) {
    bySlot[item.slot] = item
  }

  return (
    <div className="mt-5">
      <p className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[rgba(27,23,38,0.45)]">
        Équipement
      </p>

      <div className="grid grid-cols-3 gap-2.5">
        {SLOT_ORDER.map((slot) => {
          const item = bySlot[slot]
          const Icon = SLOT_ICONS[slot]
          if (item) {
            return (
              <Button
                key={slot}
                variant="outline"
                onClick={() => setPickerSlot(slot)}
                title="Gérer l'équipement"
                style={{ '--rar-hover': rarityHex } as React.CSSProperties}
                className="h-auto flex-col gap-1 rounded-[13px] border-[rgba(27,23,38,0.14)] bg-card px-2 py-3.5 text-center hover:border-[var(--rar-hover)] hover:bg-[color-mix(in_oklab,var(--rar-hover)_6%,white)] hover:text-text"
              >
                <Icon className="h-4 w-4 text-text-light" />
                <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-text">
                  {item.name}
                </p>
                <p
                  className={`text-[9px] font-bold uppercase tracking-wider ${RARITY_TEXT[item.rarity] ?? 'text-text-light'}`}
                >
                  {item.rarity}
                </p>
                <p className="text-[9px] font-semibold text-text-light">
                  Nv. {item.level}
                </p>
              </Button>
            )
          }
          return (
            <Button
              key={slot}
              variant="outline"
              onClick={() => setPickerSlot(slot)}
              style={{ '--rar-hover': rarityHex } as React.CSSProperties}
              className="h-auto flex-col gap-1.5 rounded-[13px] border-[1.5px] border-dashed border-[rgba(27,23,38,0.16)] bg-card px-2 py-3.5 text-[rgba(27,23,38,0.45)] hover:bg-[color-mix(in_oklab,var(--rar-hover)_6%,white)] hover:text-[var(--rar-hover)]"
            >
              <Icon className="h-[18px] w-[18px]" />
              <p className="text-[12px] font-semibold">{SLOT_LABELS[slot]}</p>
              <Plus className="h-3.5 w-3.5 opacity-70" />
            </Button>
          )
        })}
      </div>

      {pickerSlot !== null && (
        <EquipmentSlotPopup
          slot={pickerSlot}
          userCardId={userCardId}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </div>
  )
}
