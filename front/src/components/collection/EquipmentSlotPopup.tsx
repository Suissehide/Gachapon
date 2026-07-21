import {
  ArrowUpCircle,
  Check,
  Coins,
  Shield,
  Sparkles,
  Sword,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type {
  EquipmentInstance,
  EquipmentSlot,
  SubstatKey,
} from '../../api/equipment.api.ts'
import { TOAST_SEVERITY } from '../../constants/ui.constant.ts'
import { useToast } from '../../hooks/useToast.ts'
import { RARITY_COLOR_VAR, RARITY_LABEL_FR } from '../../libs/rarity.ts'
import { cn } from '../../libs/utils.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import {
  useEquipItem,
  useEquipmentList,
  useSalvageItems,
  useUnequipItem,
  useUpgradeItem,
} from '../../queries/useEquipment.ts'
import { useAuthStore } from '../../stores/auth.store.ts'
import {
  equipGoldCostNextLevel,
  formatBonusKey,
} from '../../utils/cardStats.ts'
import { Button } from '../ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'
import { RarityDot } from './CollectionFilters.tsx'

const RARITY_DESC = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON']

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

function formatBonusValue(value: number): string {
  return (Math.round(value * 10) / 10).toLocaleString('fr-FR')
}

function sortItems(
  a: EquipmentInstance,
  b: EquipmentInstance,
  userCardId: string,
): number {
  const aHere = a.equippedOnId === userCardId ? 0 : 1
  const bHere = b.equippedOnId === userCardId ? 0 : 1
  if (aHere !== bHere) {
    return aHere - bHere
  }
  const rarityDiff =
    RARITY_DESC.indexOf(a.rarity) - RARITY_DESC.indexOf(b.rarity)
  if (rarityDiff !== 0) {
    return rarityDiff
  }
  if (b.level !== a.level) {
    return b.level - a.level
  }
  return a.name.localeCompare(b.name)
}

function toggleSet(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  return next
}

function SelectionHint({ selectMode }: { selectMode: boolean }) {
  return (
    <p className="hidden items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-light sm:flex">
      {selectMode
        ? 'Coche les objets non équipés à détruire.'
        : 'Sélectionne un objet pour voir le détail.'}
    </p>
  )
}

function ConfirmSalvagePopup({
  checkedCount,
  salvageGold,
  busy,
  onConfirm,
  onCancel,
}: {
  checkedCount: number
  salvageGold: number
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Popup open onOpenChange={(v) => !v && onCancel()}>
      <PopupContent>
        <PopupHeader>
          <PopupTitle icon={<Trash2 className="h-4 w-4" />}>
            Confirmer la destruction
          </PopupTitle>
        </PopupHeader>
        <PopupBody className="space-y-4">
          <p className="text-sm text-text-light">
            Tu vas détruire définitivement {checkedCount} objet
            {checkedCount > 1 ? 's' : ''}. Cette action est irréversible.
          </p>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="mb-1 text-[11px] uppercase tracking-widest text-text-light/60">
              Tu obtiendras
            </p>
            <p className="text-3xl font-black text-primary tabular-nums">
              {salvageGold.toLocaleString('fr-FR')}
              <Coins className="ml-1.5 inline h-6 w-6 text-primary" />
            </p>
          </div>
        </PopupBody>
        <PopupFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onConfirm}>
            Détruire
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}

type Props = {
  slot: EquipmentSlot
  userCardId: string
  onClose: () => void
}

function ItemRow({
  item,
  userCardId,
  selectedId,
  selectMode,
  checked,
  maxSubstats,
  onSelect,
  onToggle,
}: {
  item: EquipmentInstance
  userCardId: string
  selectedId: string | null
  selectMode: boolean
  checked: Set<string>
  maxSubstats: number
  onSelect: (id: string) => void
  onToggle: (id: string) => void
}) {
  const isEquippedHere = item.equippedOnId === userCardId
  const isEquippedElsewhere = item.equippedOnId !== null && !isEquippedHere
  const checkable = selectMode && item.equippedOnId === null
  return (
    <button
      type="button"
      onClick={() => {
        if (selectMode) {
          if (checkable) {
            onToggle(item.id)
          }
        } else {
          onSelect(item.id)
        }
      }}
      className={cn(
        'flex items-center gap-2.5 rounded-lg border border-border bg-card p-2.5 text-left transition-colors',
        !selectMode && selectedId === item.id && 'border-primary bg-primary/5',
        selectMode &&
          item.equippedOnId !== null &&
          'cursor-not-allowed opacity-40',
      )}
    >
      {checkable && (
        <span
          aria-hidden="true"
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border bg-input transition-colors',
            checked.has(item.id) && 'border-primary bg-primary/10',
          )}
        >
          {checked.has(item.id) && <Check className="h-4 w-4 text-primary" />}
        </span>
      )}
      <RarityDot color={RARITY_COLOR_VAR[item.rarity]} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">{item.name}</p>
        <p className="text-[11px] text-text-light">
          Nv. {item.level} · {item.substats.length}/{maxSubstats} sous-stats
        </p>
      </div>
      {isEquippedHere && (
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          Équipé
        </span>
      )}
      {isEquippedElsewhere && (
        <span className="max-w-[90px] shrink-0 truncate rounded-full bg-border/40 px-2 py-0.5 text-[10px] text-text-light">
          Sur {item.equippedOnCardName}
        </span>
      )}
    </button>
  )
}

export function EquipmentSlotPopup({ slot, userCardId, onClose }: Props) {
  const { data } = useEquipmentList()
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const gold = useAuthStore((s) => s.user?.gold ?? 0)
  const { toast } = useToast()

  const equipItem = useEquipItem()
  const unequipItem = useUnequipItem()
  const upgradeItem = useUpgradeItem()
  const salvageItems = useSalvageItems()
  const busy =
    equipItem.isPending ||
    unequipItem.isPending ||
    upgradeItem.isPending ||
    salvageItems.isPending

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [highlightKey, setHighlightKey] = useState<SubstatKey | null>(null)

  const items = useMemo(
    () =>
      (data?.items ?? [])
        .filter((i) => i.slot === slot)
        .sort((a, b) => sortItems(a, b, userCardId)),
    [data, slot, userCardId],
  )

  const selected = items.find((i) => i.id === selectedId) ?? null
  const checkedItems = items.filter((i) => checked.has(i.id))
  const salvageGold = checkedItems.reduce(
    (sum, i) => sum + (economy.equip.salvageGold[i.rarity] ?? 0),
    0,
  )

  const toggleChecked = (id: string) => {
    setChecked((prev) => toggleSet(prev, id))
  }

  const handleSelect = (id: string) => {
    setHighlightKey(null)
    setSelectedId(id)
  }

  const handleToggleSelectMode = () => {
    setSelectMode((v) => !v)
    setChecked(new Set())
  }

  const onUpgradeSuccess = (res: {
    milestone: {
      type: 'added' | 'improved'
      key: SubstatKey
      rolledValue: number
      newValue: number
    } | null
  }) => {
    if (!res.milestone) {
      return
    }
    setHighlightKey(res.milestone.key)
    const milestoneTitle =
      res.milestone.type === 'added'
        ? 'Nouvelle sous-stat !'
        : 'Sous-stat améliorée !'
    toast({
      title: milestoneTitle,
      message: `+${formatBonusValue(res.milestone.rolledValue)} ${formatBonusKey(res.milestone.key)}`,
      severity: TOAST_SEVERITY.SUCCESS,
    })
  }

  const handleUpgrade = (item: EquipmentInstance) => {
    setHighlightKey(null)
    upgradeItem.mutate(item.id, { onSuccess: onUpgradeSuccess })
  }

  const onSalvageSuccess = (res: {
    goldEarned: number
    destroyedCount: number
  }) => {
    const plural = res.destroyedCount > 1 ? 's' : ''
    toast({
      title: 'Objets détruits',
      message: `+${res.goldEarned.toLocaleString('fr-FR')} or (${res.destroyedCount} objet${plural})`,
      severity: TOAST_SEVERITY.SUCCESS,
    })
    setConfirmOpen(false)
    setSelectMode(false)
    // Deselect if the selected item was just salvaged
    if (selectedId !== null && checked.has(selectedId)) {
      setSelectedId(null)
    }
    setChecked(new Set())
  }

  const handleSalvage = () => {
    salvageItems.mutate([...checked], { onSuccess: onSalvageSuccess })
  }

  const handleEquipSelected = () => {
    if (selected) {
      equipItem.mutate({
        userEquipmentId: selected.id,
        targetUserCardId: userCardId,
      })
    }
  }

  const handleUnequipSelected = () => {
    if (selected) {
      unequipItem.mutate(selected.id)
    }
  }

  const handleUpgradeSelected = () => {
    if (selected) {
      handleUpgrade(selected)
    }
  }

  const SlotIcon = SLOT_ICONS[slot]

  return (
    <>
      <Popup open onOpenChange={(v) => !v && onClose()}>
        <PopupContent size="lg">
          <PopupHeader>
            <PopupTitle
              icon={<SlotIcon className="h-4 w-4" />}
              subtitle="Équipe, améliore ou détruis les objets de ce slot."
            >
              {SLOT_LABELS[slot]}
            </PopupTitle>
          </PopupHeader>

          <PopupBody>
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm text-text-light">
                <Coins className="h-4 w-4 text-amber-500" />
                <span className="font-semibold tabular-nums text-text">
                  {gold.toLocaleString('fr-FR')}
                </span>
                or
              </p>
              <Button
                variant={selectMode ? 'secondary' : 'ghost'}
                size="sm"
                onClick={handleToggleSelectMode}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                {selectMode ? 'Annuler la sélection' : 'Détruire des objets'}
              </Button>
            </div>

            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-light">
                Aucun objet pour ce slot dans ton inventaire.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      userCardId={userCardId}
                      selectedId={selectedId}
                      selectMode={selectMode}
                      checked={checked}
                      maxSubstats={economy.equip.maxSubstats}
                      onSelect={handleSelect}
                      onToggle={toggleChecked}
                    />
                  ))}
                </div>

                {selected && !selectMode ? (
                  <ItemDetail
                    item={selected}
                    userCardId={userCardId}
                    gold={gold}
                    busy={busy}
                    highlightKey={highlightKey}
                    onEquip={handleEquipSelected}
                    onUnequip={handleUnequipSelected}
                    onUpgrade={handleUpgradeSelected}
                  />
                ) : (
                  <SelectionHint selectMode={selectMode} />
                )}
              </div>
            )}
          </PopupBody>

          <PopupFooter className="flex justify-between">
            {selectMode ? (
              <>
                <p className="self-center text-sm text-text-light">
                  {checked.size} objet{checked.size > 1 ? 's' : ''} sélectionné
                  {checked.size > 1 ? 's' : ''}
                </p>
                <Button
                  variant="destructive"
                  disabled={checked.size === 0 || busy}
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Détruire (+{salvageGold.toLocaleString('fr-FR')} or)
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={onClose} className="ml-auto">
                Fermer
              </Button>
            )}
          </PopupFooter>
        </PopupContent>
      </Popup>

      {confirmOpen && (
        <ConfirmSalvagePopup
          checkedCount={checked.size}
          salvageGold={salvageGold}
          busy={busy}
          onConfirm={handleSalvage}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  )
}

function ItemDetail({
  item,
  userCardId,
  gold,
  busy,
  highlightKey,
  onEquip,
  onUnequip,
  onUpgrade,
}: {
  item: EquipmentInstance
  userCardId: string
  gold: number
  busy: boolean
  highlightKey: SubstatKey | null
  onEquip: () => void
  onUnequip: () => void
  onUpgrade: () => void
}) {
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const isEquippedHere = item.equippedOnId === userCardId
  const isEquippedElsewhere = item.equippedOnId !== null && !isEquippedHere
  const isMaxLevel = item.level >= economy.equip.maxLevel
  const cost = isMaxLevel
    ? 0
    : equipGoldCostNextLevel(item.level, item.rarity, economy)
  const scale = 1 + economy.equip.levelScale * (item.level - 1)
  const nextIsMilestone =
    !isMaxLevel && (item.level + 1) % economy.equip.substatMilestone === 0
  const emptySlots = Math.max(
    0,
    economy.equip.maxSubstats - item.substats.length,
  )

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5">
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-text">{item.name}</p>
          <span className="text-xs font-bold text-text">Nv. {item.level}</span>
        </div>
        <p
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: RARITY_COLOR_VAR[item.rarity] }}
        >
          {RARITY_LABEL_FR[item.rarity]}
        </p>
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-text-light/60">
          Bonus de base
        </p>
        <ul className="text-xs">
          {Object.entries(item.bonuses).map(([k, v]) => (
            <li key={k} className="font-mono text-emerald-600">
              +{formatBonusValue(v * scale)} {formatBonusKey(k)}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-1 text-[10px] uppercase tracking-widest text-text-light/60">
          Sous-stats ({item.substats.length}/{economy.equip.maxSubstats})
        </p>
        <ul className="flex flex-col gap-1 text-xs">
          {item.substats.map((s) => (
            <li
              key={s.key}
              className={cn(
                'rounded px-1.5 py-0.5 font-mono text-violet-600',
                highlightKey === s.key && 'bg-primary/15',
              )}
            >
              +{formatBonusValue(s.value)} {formatBonusKey(s.key)}
            </li>
          ))}
          {Array.from({ length: emptySlots }, (_, i) => {
            // Keys are stable: item substats are fixed-length & ordered by backend
            const slotIndex = item.substats.length + i
            return (
              <li
                key={`empty-slot-${slotIndex}`}
                className="rounded border border-dashed border-border px-1.5 py-0.5 text-text-light/40"
              >
                Emplacement vide
              </li>
            )
          })}
        </ul>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        {isEquippedHere ? (
          <Button variant="outline" disabled={busy} onClick={onUnequip}>
            Déséquiper
          </Button>
        ) : (
          <>
            <Button disabled={busy} onClick={onEquip}>
              {isEquippedElsewhere ? 'Équiper ici' : 'Équiper'}
            </Button>
            {isEquippedElsewhere && (
              <Button variant="outline" disabled={busy} onClick={onUnequip}>
                Déséquiper
              </Button>
            )}
          </>
        )}
        <Button
          variant="secondary"
          disabled={busy || isMaxLevel || gold < cost}
          onClick={onUpgrade}
          title={
            nextIsMilestone ? 'Prochain niveau : sous-stat bonus !' : undefined
          }
        >
          <ArrowUpCircle className="mr-1.5 h-4 w-4" />
          {isMaxLevel
            ? 'Niveau max'
            : `Améliorer (${cost.toLocaleString('fr-FR')} or)`}
          {nextIsMilestone && <Sparkles className="ml-1.5 h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  )
}
