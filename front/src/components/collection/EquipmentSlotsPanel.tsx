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
  COMMON: 'text-slate-300',
  UNCOMMON: 'text-emerald-300',
  RARE: 'text-sky-300',
  EPIC: 'text-fuchsia-300',
  LEGENDARY: 'text-amber-300',
}

type Props = {
  userCardId: string
}

export function EquipmentSlotsPanel({ userCardId }: Props) {
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
    <div className="border-t border-white/6 px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-white/40">
        Équipement
      </p>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {SLOT_ORDER.map((slot) => {
          const item = bySlot[slot]
          const Icon = SLOT_ICONS[slot]
          if (item) {
            return (
              <button
                key={slot}
                type="button"
                onClick={() => handleUnequip(item.id)}
                disabled={unequipItem.isPending || equipItem.isPending}
                className="group flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-white/3 p-2 text-center transition-colors hover:border-rose-400/40 hover:bg-rose-500/5"
                title="Cliquer pour retirer"
              >
                <Icon className="h-3.5 w-3.5 text-white/60" />
                <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-white/90">
                  {item.name}
                </p>
                <p
                  className={`text-[9px] uppercase tracking-wider ${RARITY_TEXT[item.rarity] ?? 'text-white/40'}`}
                >
                  {item.rarity}
                </p>
                <ShieldOff className="h-2.5 w-2.5 text-rose-300 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )
          }
          return (
            <button
              key={slot}
              type="button"
              onClick={() => setPickerSlot(slot)}
              disabled={equipItem.isPending}
              className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-white/15 bg-transparent p-2 transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <Icon className="h-3.5 w-3.5 text-white/40" />
              <p className="text-[10px] text-white/40">{SLOT_LABELS[slot]}</p>
              <Plus className="h-2.5 w-2.5 text-white/40" />
            </button>
          )
        })}
      </div>

      {pickerSlot !== null && (
        <Popup open onOpenChange={(v) => !v && setPickerSlot(null)}>
          <PopupContent>
            <PopupHeader>
              <PopupTitle icon={<Sword className="h-4 w-4" />}>
                Choisir un(e) {SLOT_LABELS[pickerSlot].toLowerCase()}
              </PopupTitle>
            </PopupHeader>
            <PopupBody>
              {pickerCandidates.length === 0 ? (
                <p className="py-6 text-center text-sm text-text-light">
                  Aucune pièce non équipée disponible pour ce slot.
                </p>
              ) : (
                <div className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                  {pickerCandidates.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handlePick(item.id)}
                      disabled={equipItem.isPending}
                      className="rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
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
                          <li key={k} className="font-mono text-emerald-300">
                            +{v} {formatBonusKey(k)}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPickerSlot(null)}
                >
                  Annuler
                </Button>
              </div>
            </PopupBody>
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
