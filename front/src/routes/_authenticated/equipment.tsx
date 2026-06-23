import { createFileRoute } from '@tanstack/react-router'
import {
  CircleHelp,
  Shield,
  ShieldOff,
  Sparkles,
  Sword,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type {
  EquipmentInstance,
  EquipmentRarity,
  EquipmentSlot,
} from '../../api/equipment.api'
import { PageHeader } from '../../components/shared/PageHeader.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import { CardDisplay } from '../../components/shared/tcg-card/CardDisplay.tsx'
import { Button } from '../../components/ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupHeader,
  PopupTitle,
} from '../../components/ui/popup.tsx'
import { SegmentedControl } from '../../components/ui/segmentedControl.tsx'
import { useUserCollection } from '../../queries/useCollection.ts'
import {
  useEquipItem,
  useEquipmentList,
  useUnequipItem,
} from '../../queries/useEquipment.ts'
import { useAuthStore } from '../../stores/auth.store.ts'

export const Route = createFileRoute('/_authenticated/equipment')({
  component: EquipmentPage,
})

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
const RARITY_COLORS: Record<EquipmentRarity, string> = {
  COMMON: 'border-slate-400/30 bg-slate-400/10 text-slate-300',
  UNCOMMON: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  RARE: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
  EPIC: 'border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300',
  LEGENDARY: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
}
const RARITY_LABELS: Record<EquipmentRarity, string> = {
  COMMON: 'Commune',
  UNCOMMON: 'Peu commune',
  RARE: 'Rare',
  EPIC: 'Épique',
  LEGENDARY: 'Légendaire',
}

function EquipmentPage() {
  const user = useAuthStore((s) => s.user)
  const equipment = useEquipmentList()
  const collection = useUserCollection(user?.id)
  const equipItem = useEquipItem()
  const unequipItem = useUnequipItem()

  const [slotFilter, setSlotFilter] = useState<EquipmentSlot | 'ALL'>('ALL')
  const [rarityFilter, setRarityFilter] = useState<EquipmentRarity | 'ALL'>(
    'ALL',
  )
  const [pickerFor, setPickerFor] = useState<EquipmentInstance | null>(null)

  const items = equipment.data?.items ?? []
  const filtered = useMemo(
    () =>
      items.filter((i) => {
        if (slotFilter !== 'ALL' && i.slot !== slotFilter) { return false }
        if (rarityFilter !== 'ALL' && i.rarity !== rarityFilter) { return false }
        return true
      }),
    [items, slotFilter, rarityFilter],
  )

  const handleEquipOn = (targetUserCardId: string) => {
    if (!pickerFor) { return }
    equipItem.mutate(
      { userEquipmentId: pickerFor.id, targetUserCardId },
      { onSuccess: () => setPickerFor(null) },
    )
  }

  const handleUnequip = (id: string) => unequipItem.mutate(id)

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          { label: 'Équipement' },
        ]}
        title="Mon équipement"
        subtitle="Pièces collectées via les combats"
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <SegmentedControl
          value={slotFilter}
          onChange={setSlotFilter}
          options={[
            { value: 'ALL', label: 'Tout' },
            { value: 'WEAPON', label: 'Armes' },
            { value: 'ARMOR', label: 'Armures' },
            { value: 'ACCESSORY', label: 'Accessoires' },
          ]}
        />
        <SegmentedControl
          value={rarityFilter}
          onChange={setRarityFilter}
          options={[
            { value: 'ALL', label: 'Tout' },
            { value: 'COMMON', label: 'Co' },
            { value: 'UNCOMMON', label: 'Pc' },
            { value: 'RARE', label: 'R' },
            { value: 'EPIC', label: 'E' },
            { value: 'LEGENDARY', label: 'L' },
          ]}
        />
      </div>

      {items.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-text-light">
          <CircleHelp className="mx-auto mb-2 h-8 w-8" />
          Aucune pièce d'équipement collectée pour l'instant.
          <br />
          Combats et boss en laissent tomber !
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <EquipmentCard
              key={item.id}
              item={item}
              onEquipClick={() => setPickerFor(item)}
              onUnequipClick={() => handleUnequip(item.id)}
              isPending={equipItem.isPending || unequipItem.isPending}
            />
          ))}
        </div>
      )}

      {pickerFor && (
        <Popup open onOpenChange={(v) => !v && setPickerFor(null)}>
          <PopupContent>
            <PopupHeader>
              <PopupTitle icon={<Sword className="h-4 w-4" />}>
                Équiper "{pickerFor.name}" sur…
              </PopupTitle>
            </PopupHeader>
            <PopupBody>
              <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
                {(collection.data?.cards ?? []).map((uc) => (
                  <button
                    key={uc.id}
                    type="button"
                    onClick={() => handleEquipOn(uc.id)}
                    disabled={equipItem.isPending}
                    className="rounded-lg border border-border p-2 transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <CardDisplay
                      rarity={uc.card.rarity}
                      name={uc.card.name}
                      setName={uc.card.set.name}
                      imageUrl={uc.card.imageUrl}
                      variant={uc.variant}
                      isOwned
                      compact
                    />
                    <p className="mt-1 text-center text-[10px] text-text-light">
                      Niv. {uc.level} · P{uc.palier}
                    </p>
                  </button>
                ))}
              </div>
            </PopupBody>
          </PopupContent>
        </Popup>
      )}
    </PageShell>
  )
}

function EquipmentCard({
  item,
  onEquipClick,
  onUnequipClick,
  isPending,
}: {
  item: EquipmentInstance
  onEquipClick: () => void
  onUnequipClick: () => void
  isPending: boolean
}) {
  const Icon = SLOT_ICONS[item.slot]
  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-text-light" />
          <p className="font-semibold text-text">{item.name}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${RARITY_COLORS[item.rarity]}`}
        >
          {RARITY_LABELS[item.rarity]}
        </span>
      </div>

      <p className="mt-1 text-xs text-text-light/60">{SLOT_LABELS[item.slot]}</p>

      <ul className="mt-2 space-y-0.5 text-xs">
        {Object.entries(item.bonuses).map(([key, value]) => (
          <li key={key} className="text-text-light">
            <span className="font-mono text-emerald-300">+{value}</span>{' '}
            <span className="text-text-light/70">{formatBonusKey(key)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3">
        {item.equippedOnId ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-amber-300">
              <Zap className="mr-0.5 inline h-3 w-3" />
              Sur {item.equippedOnCardName ?? '…'}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={onUnequipClick}
              disabled={isPending}
            >
              <ShieldOff className="mr-1 h-3 w-3" />
              Retirer
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={onEquipClick}
            disabled={isPending}
            className="w-full"
          >
            Équiper
          </Button>
        )}
      </div>
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
