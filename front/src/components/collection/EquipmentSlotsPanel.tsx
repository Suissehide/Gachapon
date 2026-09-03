import {
  Circle,
  Footprints,
  Gem,
  Hand,
  Link,
  Plus,
  Shield,
  Sword,
} from 'lucide-react'
import { useState } from 'react'

import type {
  EquipmentInstance,
  EquipmentSlot,
} from '../../api/equipment.api.ts'
import { cn } from '../../libs/utils.ts'
import {
  useActiveSetsForCard,
  useEquipmentList,
} from '../../queries/useEquipment.ts'
import { Button } from '../ui/button.tsx'
import { EquipmentSlotPopup } from './EquipmentSlotPopup.tsx'

const SLOT_ORDER: EquipmentSlot[] = [
  'WEAPON',
  'ARMOR',
  'RING',
  'AMULET',
  'GLOVES',
  'BOOTS',
  'BELT',
]
// Exportés : réutilisés par l'écran de tour (routes/_authenticated/tower.tsx)
// pour afficher le slot alimenté par chaque tour, sans en recopier une
// troisième version — equipment.tsx en garde malheureusement déjà une copie
// séparée (dette existante, hors périmètre de la tour).
export const SLOT_LABELS: Record<EquipmentSlot, string> = {
  WEAPON: 'Arme',
  ARMOR: 'Armure',
  RING: 'Anneau',
  AMULET: 'Amulette',
  GLOVES: 'Gants',
  BOOTS: 'Bottes',
  BELT: 'Ceinture',
}
export const SLOT_ICONS: Record<EquipmentSlot, typeof Sword> = {
  WEAPON: Sword,
  ARMOR: Shield,
  RING: Circle,
  AMULET: Gem,
  GLOVES: Hand,
  BOOTS: Footprints,
  BELT: Link,
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
  const activeSets = useActiveSetsForCard(userCardId)
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

      {activeSets.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {activeSets.map((s) => (
            <span
              key={s.key}
              title={
                s.active
                  ? `Bonus de set actif (${s.pieces} pièces)`
                  : `${s.pieces - s.count} pièce(s) de plus pour activer le set`
              }
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                s.active
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-[rgba(27,23,38,0.14)] text-text-light',
              )}
            >
              {/* Le dénominateur est la taille DU set, plus un 4 fixe : un
                  set de 2 affichait « 2/4 » alors qu'il était déjà complet. */}
              {s.label} {s.count}/{s.pieces}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
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
                className="h-auto flex-col gap-1 rounded-[13px] border-[rgba(27,23,38,0.14)] bg-card px-1.5 py-3 text-center hover:border-[var(--rar-hover)] hover:bg-[color-mix(in_oklab,var(--rar-hover)_6%,white)] hover:text-text"
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
              className="h-auto flex-col gap-1.5 rounded-[13px] border-[1.5px] border-dashed border-[rgba(27,23,38,0.16)] bg-card px-1.5 py-3 text-[rgba(27,23,38,0.45)] hover:bg-[color-mix(in_oklab,var(--rar-hover)_6%,white)] hover:text-[var(--rar-hover)]"
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
