import { Plus, Shield, ShieldOff, Sparkles, Sword } from 'lucide-react'
import { useState } from 'react'

import type {
  EquipmentInstance,
  EquipmentSlot,
} from '../../api/equipment.api.ts'
import {
  useEquipItem,
  useEquipmentList,
  useUnequipItem,
} from '../../queries/useEquipment.ts'
import { Button } from '../ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'

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
  COMMON: 'text-text-light',
  UNCOMMON: 'text-emerald-600',
  RARE: 'text-violet-600',
  EPIC: 'text-pink-600',
  LEGENDARY: 'text-amber-600',
}

type Props = {
  userCardId: string
  rarityHex: string
}

export function EquipmentSlotsPanel({ userCardId, rarityHex }: Props) {
  const equipment = useEquipmentList()
  const equipItem = useEquipItem()
  const unequipItem = useUnequipItem()
  const [pickerSlot, setPickerSlot] = useState<EquipmentSlot | null>(null)

  const items = equipment.data?.items ?? []
  const equippedOnCard = items.filter((i) => i.equippedOnId === userCardId)
  const bySlot: Partial<Record<EquipmentSlot, EquipmentInstance>> = {}
  for (const item of equippedOnCard) {
    bySlot[item.slot] = item
  }

  const pickerCandidates =
    pickerSlot !== null
      ? items.filter((i) => i.slot === pickerSlot && i.equippedOnId === null)
      : []

  const handlePick = (userEquipmentId: string) => {
    equipItem.mutate(
      { userEquipmentId, targetUserCardId: userCardId },
      { onSuccess: () => setPickerSlot(null) },
    )
  }

  const handleUnequip = (id: string) => unequipItem.mutate(id)

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
                onClick={() => handleUnequip(item.id)}
                disabled={unequipItem.isPending || equipItem.isPending}
                title="Cliquer pour retirer"
                className="group h-auto flex-col gap-1 rounded-[13px] border-[rgba(27,23,38,0.14)] bg-card px-2 py-3.5 text-center hover:border-rose-400 hover:bg-rose-50 hover:text-text"
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
                <ShieldOff className="h-3 w-3 text-rose-500 opacity-0 transition-opacity group-hover:opacity-100" />
              </Button>
            )
          }
          return (
            <Button
              key={slot}
              variant="outline"
              onClick={() => setPickerSlot(slot)}
              disabled={equipItem.isPending}
              style={
                {
                  '--rar-hover': rarityHex,
                } as React.CSSProperties
              }
              className="h-auto flex-col gap-1.5 rounded-[13px] border-[1.5px] border-dashed border-[rgba(27,23,38,0.16)] bg-card px-2 py-3.5 text-[rgba(27,23,38,0.45)] [--rar-hover:#f59e0b] hover:bg-[color-mix(in_oklab,var(--rar-hover)_6%,white)] hover:text-[var(--rar-hover)]"
            >
              <Icon className="h-[18px] w-[18px]" />
              <p className="text-[12px] font-semibold">{SLOT_LABELS[slot]}</p>
              <Plus className="h-3.5 w-3.5 opacity-70" />
            </Button>
          )
        })}
      </div>

      {pickerSlot !== null && (
        <Popup open onOpenChange={(v) => !v && setPickerSlot(null)}>
          <PopupContent size="lg">
            <PopupHeader>
              <PopupTitle
                icon={<Sword className="h-4 w-4" />}
                subtitle="Sélectionne une pièce disponible dans ton inventaire."
              >
                Choisir un(e) {SLOT_LABELS[pickerSlot].toLowerCase()}
              </PopupTitle>
            </PopupHeader>
            <PopupBody className="flex flex-col gap-4">
              {pickerCandidates.length === 0 ? (
                <p className="py-6 text-center text-sm text-text-light">
                  Aucune pièce non équipée disponible pour ce slot.
                </p>
              ) : (
                <div className="grid max-h-[55vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {pickerCandidates.map((item) => (
                    <Button
                      key={item.id}
                      variant="outline"
                      onClick={() => handlePick(item.id)}
                      disabled={equipItem.isPending}
                      className="h-auto flex-col items-stretch justify-start rounded-lg border-border p-3 text-left hover:border-primary hover:bg-primary/5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-text">
                          {item.name}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-wider ${RARITY_TEXT[item.rarity] ?? ''}`}
                        >
                          {item.rarity}
                        </span>
                      </div>
                      <ul className="mt-1 text-xs text-text-light">
                        {Object.entries(item.bonuses).map(([k, v]) => (
                          <li key={k} className="font-mono text-emerald-600">
                            +{v} {formatBonusKey(k)}
                          </li>
                        ))}
                      </ul>
                    </Button>
                  ))}
                </div>
              )}
            </PopupBody>
            <PopupFooter>
              <Button variant="outline" onClick={() => setPickerSlot(null)}>
                Annuler
              </Button>
            </PopupFooter>
          </PopupContent>
        </Popup>
      )}
    </div>
  )
}

function formatBonusKey(key: string): string {
  if (key.endsWith('Flat')) {
    const base = key.replace('Flat', '').toUpperCase()
    return base === 'HP' ? 'PV' : base
  }
  if (key.endsWith('Pct')) {
    const base = key.replace('Pct', '').toUpperCase()
    return `% ${base === 'HP' ? 'PV' : base}`
  }
  return key
}
