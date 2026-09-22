import {
  ArrowUpCircle,
  Check,
  Circle,
  Coins,
  Footprints,
  Gem,
  Hand,
  Layers,
  Link,
  Shield,
  Sparkles,
  Sword,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type {
  EquipmentInstance,
  EquipmentMilestone,
  EquipmentSlot,
  Substat,
  SubstatKey,
} from '../../api/equipment.api.ts'
import { TOAST_SEVERITY } from '../../constants/ui.constant.ts'
import { useToast } from '../../hooks/useToast.ts'
import { currentLocale } from '../../i18n/index.ts'
import { RARITY_COLOR_VAR, RARITY_LABEL_FR } from '../../libs/rarity.ts'
import { cn, formatNumber } from '../../libs/utils.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import {
  useActiveSetsForCard,
  useEquipItem,
  useEquipmentList,
  useEquipmentSets,
  useSalvageItems,
  useSetColorByKey,
  useUnequipItem,
  useUpgradeItem,
} from '../../queries/useEquipment.ts'
import { useSkillTree } from '../../queries/useSkills.ts'
import { useAuthStore } from '../../stores/auth.store.ts'
import {
  formatBonusKey,
  scaledBaseBonus,
  statColorVar,
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
  RING: 'Anneau',
  AMULET: 'Amulette',
  GLOVES: 'Gants',
  BOOTS: 'Bottes',
  BELT: 'Ceinture',
}
const SLOT_ICONS: Record<EquipmentSlot, typeof Sword> = {
  WEAPON: Sword,
  ARMOR: Shield,
  RING: Circle,
  AMULET: Gem,
  GLOVES: Hand,
  BOOTS: Footprints,
  BELT: Link,
}

// Toute valeur de stat est entière depuis l'arrondi à la source : ce
// formateur n'a plus qu'à grouper les milliers.
function formatBonusValue(value: number): string {
  return formatNumber(Math.round(value), currentLocale())
}

function upgradeHintTitle(
  nextIsMilestone: boolean,
  maxSubstats: number,
  substatsCount: number,
): string | undefined {
  if (!nextIsMilestone) {
    return undefined
  }
  return substatsCount >= maxSubstats
    ? 'Prochain niveau : sous-stat améliorée !'
    : 'Prochain niveau : sous-stat bonus !'
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

function batchSalvageMessage(count: number): string {
  const plural = count > 1 ? 's' : ''
  return `Tu vas détruire définitivement ${count} objet${plural}. Cette action est irréversible.`
}

/**
 * Confirmation d'un recyclage — la même pour les deux chemins qui y mènent :
 * la destruction en lot depuis la liste, et la vente d'UNE pièce depuis le
 * panneau de détail. Seuls les mots changent, l'or annoncé se calcule
 * toujours par `salvagePreviewGold`.
 */
function ConfirmSalvagePopup({
  icon,
  title,
  message,
  confirmLabel,
  salvageGold,
  busy,
  onConfirm,
  onCancel,
}: {
  icon: React.ReactNode
  title: string
  message: string
  confirmLabel: string
  salvageGold: number
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const locale = currentLocale()
  return (
    <Popup open onOpenChange={(v) => !v && onCancel()}>
      <PopupContent>
        <PopupHeader>
          <PopupTitle icon={icon}>{title}</PopupTitle>
        </PopupHeader>
        <PopupBody className="space-y-4">
          <p className="text-sm text-text-light">{message}</p>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="mb-1 text-[11px] uppercase tracking-widest text-text-light/60">
              Tu obtiendras
            </p>
            <p className="text-3xl font-black text-primary tabular-nums">
              {formatNumber(salvageGold, locale)}
              <Coins className="ml-1.5 inline h-6 w-6 text-primary" />
            </p>
          </div>
        </PopupBody>
        <PopupFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onConfirm}>
            {confirmLabel}
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
  onSelect,
  onToggle,
}: {
  item: EquipmentInstance
  userCardId: string
  selectedId: string | null
  selectMode: boolean
  checked: Set<string>
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
        !selectMode &&
          selectedId !== item.id &&
          'cursor-pointer hover:border-primary/40 hover:bg-primary/5',
        checkable &&
          'cursor-pointer hover:border-primary/40 hover:bg-primary/5',
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
        {/* Le set n'est plus répété ici : il nomme la section qui contient la
            ligne, et son en-tête reste collé en haut pendant le défilement.
            La place sert à écrire la rareté, qui n'était qu'une pastille. */}
        <p className="flex items-center gap-1.5 text-[11px] text-text-light">
          <span className="shrink-0">Nv. {item.level}</span>
          <span aria-hidden="true" className="shrink-0 opacity-50">
            ·
          </span>
          <span
            className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{
              color: `color-mix(in oklab, ${RARITY_COLOR_VAR[item.rarity]} 72%, var(--text-light))`,
            }}
          >
            {RARITY_LABEL_FR[item.rarity]}
          </span>
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

type SetGroup = {
  key: string
  label: string
  color: string
  /** Pièces de ce set déjà portées par la carte. */
  count: number
  /** Pièces que le set demande pour activer son bonus. */
  pieces: number
  items: EquipmentInstance[]
}

/**
 * Découpe la liste d'un slot en sections, une par set. Les sets dont la carte
 * porte déjà des pièces passent devant — c'est l'arbitrage du joueur au
 * moment d'équiper : « laquelle me rapproche d'un palier ? » — puis les
 * autres par ordre alphabétique.
 *
 * L'ordre À L'INTÉRIEUR d'une section est celui reçu (`sortItems` : équipé
 * ici, puis rareté, niveau, nom), donc la pièce portée reste en tête de sa
 * section.
 */
function groupBySet(
  items: EquipmentInstance[],
  colorByKey: Map<string, string>,
  metaByKey: Map<string, { count: number; pieces: number }>,
): SetGroup[] {
  const groups = new Map<string, SetGroup>()
  for (const item of items) {
    let group = groups.get(item.setKey)
    if (group === undefined) {
      const meta = metaByKey.get(item.setKey)
      group = {
        key: item.setKey,
        label: item.setLabel,
        color: colorByKey.get(item.setKey) ?? 'var(--stat-def)',
        count: meta?.count ?? 0,
        pieces: meta?.pieces ?? 0,
        items: [],
      }
      groups.set(item.setKey, group)
    }
    group.items.push(item)
  }
  return [...groups.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'),
  )
}

/**
 * Sections de set d'un slot, prêtes à rendre. Isolé en hook parce que
 * l'avancement de la carte se lit sur CHAQUE set (pas seulement ceux qu'elle
 * porte) : la taille vient des définitions publiques, le compte de la carte.
 */
function useSetGroups(
  items: EquipmentInstance[],
  userCardId: string,
): SetGroup[] {
  const { data: setsData } = useEquipmentSets()
  const activeSets = useActiveSetsForCard(userCardId)
  const colorByKey = useSetColorByKey()
  const metaByKey = useMemo(() => {
    const counts = new Map(activeSets.map((s) => [s.key, s.count]))
    const meta = new Map<string, { count: number; pieces: number }>()
    for (const def of setsData?.sets ?? []) {
      meta.set(def.key, { count: counts.get(def.key) ?? 0, pieces: def.pieces })
    }
    return meta
  }, [activeSets, setsData])
  return useMemo(
    () => groupBySet(items, colorByKey, metaByKey),
    [items, colorByKey, metaByKey],
  )
}

/**
 * En-tête d'une section de set : même vocabulaire visuel que `SetLine` du
 * panneau de détail (icône `Layers`, libellé à la couleur du set, avancement
 * sur la carte). Collé en haut de la zone défilante tant que sa section est
 * visible, pour que le set de la ligne survolée reste lisible.
 */
function SetGroupHeader({ group }: { group: SetGroup }) {
  const active = group.pieces > 0 && group.count >= group.pieces
  return (
    <div
      className="sticky top-0 z-10 flex items-center gap-1.5 bg-background py-1"
      style={{ '--sc': group.color } as React.CSSProperties}
    >
      <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--sc)]" />
      <span className="truncate font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sc)]">
        {group.label}
      </span>
      {group.pieces > 0 && (
        <span
          className={cn(
            'ml-auto shrink-0 whitespace-nowrap font-mono text-[10px] tabular-nums',
            active ? 'text-[var(--sc)]' : 'text-text-light',
          )}
        >
          {group.count}/{group.pieces} sur la carte
        </span>
      )}
    </div>
  )
}

function SlotItemList({
  groups,
  userCardId,
  shownId,
  selectMode,
  checked,
  onSelect,
  onToggle,
}: {
  groups: SetGroup[]
  userCardId: string
  shownId: string | null
  selectMode: boolean
  checked: Set<string>
  onSelect: (id: string) => void
  onToggle: (id: string) => void
}) {
  return (
    <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto pr-1">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-2">
          <SetGroupHeader group={group} />
          {group.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              userCardId={userCardId}
              selectedId={shownId}
              selectMode={selectMode}
              checked={checked}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </section>
      ))}
    </div>
  )
}

/**
 * Or annoncé pour le recyclage — même règle que le serveur
 * (`salvageGoldWithBonus`) : bonus Ferrailleur appliqué pièce par pièce puis
 * arrondi, pour que le total affiché soit celui crédité.
 */
function salvagePreviewGold(
  items: { rarity: string }[],
  salvageGoldByRarity: Record<string, number>,
  salvageBonusPct = 0,
): number {
  return items.reduce(
    (sum, i) =>
      sum +
      Math.round(
        (salvageGoldByRarity[i.rarity] ?? 0) * (1 + salvageBonusPct / 100),
      ),
    0,
  )
}

/**
 * Pièce montrée dans le panneau de détail : celle qu'on vient de cliquer,
 * sinon celle portée sur ce slot. La fenêtre s'ouvrait sur « Sélectionne un
 * objet pour voir le détail » alors que l'objet dont on veut les stats en
 * premier est connu. Dérivé à chaque rendu plutôt que posé dans un effet :
 * `items` arrive de façon asynchrone, et le premier clic sur une autre ligne
 * reprend la main pour de bon.
 */
function shownItemId(
  items: EquipmentInstance[],
  userCardId: string,
  selectedId: string | null,
): string | null {
  if (selectedId !== null && items.some((i) => i.id === selectedId)) {
    return selectedId
  }
  return items.find((i) => i.equippedOnId === userCardId)?.id ?? null
}

export function EquipmentSlotPopup({ slot, userCardId, onClose }: Props) {
  const { data } = useEquipmentList()
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const { data: skillState } = useSkillTree()
  const gold = useAuthStore((s) => s.user?.gold ?? 0)
  const { toast } = useToast()
  const locale = currentLocale()

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
  const [highlight, setHighlight] = useState<SubstatKey | null>(null)

  const items = useMemo(
    () =>
      (data?.items ?? [])
        .filter((i) => i.slot === slot)
        .sort((a, b) => sortItems(a, b, userCardId)),
    [data, slot, userCardId],
  )

  const groups = useSetGroups(items, userCardId)

  const shownId = shownItemId(items, userCardId, selectedId)
  const selected = items.find((i) => i.id === shownId) ?? null
  const checkedItems = items.filter((i) => checked.has(i.id))
  const salvageGold = salvagePreviewGold(
    checkedItems,
    economy.equip.salvageGold,
    skillState?.effects?.salvageBonus,
  )

  const toggleChecked = (id: string) => {
    setChecked((prev) => toggleSet(prev, id))
  }

  const handleSelect = (id: string) => {
    setHighlight(null)
    setSelectedId(id)
  }

  const handleToggleSelectMode = () => {
    setSelectMode((v) => !v)
    setChecked(new Set())
  }

  const onUpgradeSuccess = (res: { milestone: EquipmentMilestone | null }) => {
    if (!res.milestone) {
      return
    }
    setHighlight(res.milestone.key)
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
    setHighlight(null)
    upgradeItem.mutate(item.id, { onSuccess: onUpgradeSuccess })
  }

  const onSalvageSuccess = (res: {
    goldEarned: number
    destroyedCount: number
  }) => {
    const plural = res.destroyedCount > 1 ? 's' : ''
    toast({
      title: 'Objets détruits',
      message: `+${formatNumber(res.goldEarned, locale)} or (${res.destroyedCount} objet${plural})`,
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
      // Épingle la sélection : sans ça, déséquiper la pièce affichée par
      // défaut la ferait disparaître du panneau de détail au lieu de
      // montrer son nouvel état.
      setSelectedId(selected.id)
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
                  {formatNumber(gold, locale)}
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
                <SlotItemList
                  groups={groups}
                  userCardId={userCardId}
                  shownId={shownId}
                  selectMode={selectMode}
                  checked={checked}
                  onSelect={handleSelect}
                  onToggle={toggleChecked}
                />

                {selected && !selectMode ? (
                  <ItemDetail
                    item={selected}
                    userCardId={userCardId}
                    gold={gold}
                    busy={busy}
                    highlight={highlight}
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
                  Détruire (+{formatNumber(salvageGold, locale)} or)
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
          icon={<Trash2 className="h-4 w-4" />}
          title="Confirmer la destruction"
          message={batchSalvageMessage(checked.size)}
          confirmLabel="Détruire"
          salvageGold={salvageGold}
          busy={busy}
          onConfirm={handleSalvage}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  )
}

function SubstatSection({
  substats,
  maxSubstats,
  highlight,
}: {
  substats: Substat[]
  maxSubstats: number
  highlight: SubstatKey | null
}) {
  const emptySlots = Math.max(0, maxSubstats - substats.length)
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-widest text-text-light/60">
        Sous-stats
      </p>
      {/* Une teinte PAR STAT (`statColorVar`), comme la fiche de pièce et
          l'apport total : le violet uniforme d'avant ne disait rien de la
          stat et contredisait les mêmes lignes ailleurs dans la fenêtre. */}
      <ul className="flex flex-col gap-1 text-xs">
        {substats.map((s) => (
          <li
            key={s.key}
            className={cn(
              'flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono',
              highlight === s.key && 'bg-primary/15',
            )}
            style={
              {
                '--sc': statColorVar(s.key),
                color: 'color-mix(in oklab, var(--sc) 75%, var(--text))',
              } as React.CSSProperties
            }
          >
            <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-[var(--sc)]" />
            +{formatBonusValue(s.value)} {formatBonusKey(s.key)}
          </li>
        ))}
        {Array.from({ length: emptySlots }, (_, i) => {
          // Keys are stable: item substats are fixed-length & ordered by backend
          const slotIndex = substats.length + i
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
  )
}

/**
 * Set de la pièce, avec l'avancement DE CETTE CARTE — c'est l'arbitrage du
 * joueur au moment d'équiper : « est-ce que cette pièce me rapproche d'un
 * palier ? ». Le compte vient de `useActiveSetsForCard` (même source que les
 * pastilles de `EquipmentSlotsPanel`, cachées par la fenêtre), la taille et
 * le bonus de `GET /equipment/sets` — rien n'est écrit en dur.
 */
function SetLine({
  item,
  userCardId,
}: {
  item: EquipmentInstance
  userCardId: string
}) {
  const { data: setsData } = useEquipmentSets()
  const activeSets = useActiveSetsForCard(userCardId)
  const def = setsData?.sets.find((s) => s.key === item.setKey)
  const count = activeSets.find((s) => s.key === item.setKey)?.count ?? 0
  const pieces = def?.pieces ?? 0
  const active = pieces > 0 && count >= pieces
  // Un set ne porte qu'une stat — même convention que `SetBonusGuide`.
  const statKey = Object.keys(def?.bonus.bonuses ?? {})[0] ?? ''

  return (
    <div
      className="rounded-lg border px-2.5 py-2"
      style={
        {
          '--sc': statColorVar(statKey),
          background: 'color-mix(in oklab, var(--sc) 8%, var(--card))',
          borderColor: 'color-mix(in oklab, var(--sc) 28%, transparent)',
        } as React.CSSProperties
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--sc)]" />
          <span className="truncate text-xs font-bold text-text">
            {item.setLabel}
          </span>
        </span>
        {pieces > 0 && (
          <span
            className={cn(
              'shrink-0 font-mono text-[10px] font-bold tabular-nums',
              active ? 'text-[var(--sc)]' : 'text-text-light',
            )}
          >
            {count}/{pieces} sur la carte
          </span>
        )}
      </div>
      {def && (
        <p className="mt-0.5 font-mono text-[10px] text-text-light">
          {def.bonus.label} {active ? '· actif' : `· à ${pieces} pièces`}
        </p>
      )}
    </div>
  )
}

/**
 * Vente d'UNE pièce depuis le panneau de détail, sans repasser par la
 * sélection multiple de la liste. Porte sa propre confirmation et sa propre
 * mutation : le panneau de détail n'a rien à savoir du recyclage.
 *
 * Une pièce portée ne peut pas être recyclée — le serveur la refuse
 * (« Impossible de détruire un objet équipé ») — d'où le bouton désactivé,
 * avec la raison écrite en dessous : un bouton désactivé n'affiche pas son
 * `title`.
 */
function SellItemButton({
  item,
  busy,
}: {
  item: EquipmentInstance
  busy: boolean
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const { data: skillState } = useSkillTree()
  const { toast } = useToast()
  const locale = currentLocale()
  const salvageItems = useSalvageItems()
  const equipped = item.equippedOnId !== null
  const gold = salvagePreviewGold(
    [item],
    economy.equip.salvageGold,
    skillState?.effects?.salvageBonus,
  )

  const handleConfirm = () => {
    salvageItems.mutate([item.id], {
      onSuccess: (res) => {
        toast({
          title: 'Objet vendu',
          message: `+${formatNumber(res.goldEarned, locale)} or`,
          severity: TOAST_SEVERITY.SUCCESS,
        })
        setConfirmOpen(false)
      },
    })
  }

  return (
    <>
      <Button
        variant="destructive"
        disabled={busy || equipped || salvageItems.isPending}
        onClick={() => setConfirmOpen(true)}
      >
        <Coins className="mr-1.5 h-4 w-4" />
        Vendre (+{formatNumber(gold, locale)} or)
      </Button>
      {equipped && (
        <p className="text-center text-[10px] text-text-light">
          Déséquipe la pièce pour la vendre.
        </p>
      )}
      {confirmOpen && (
        <ConfirmSalvagePopup
          icon={<Coins className="h-4 w-4" />}
          title="Vendre cette pièce ?"
          message={`« ${item.name} » sera définitivement détruite. Cette action est irréversible.`}
          confirmLabel="Vendre"
          salvageGold={gold}
          busy={salvageItems.isPending}
          onConfirm={handleConfirm}
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
  highlight,
  onEquip,
  onUnequip,
  onUpgrade,
}: {
  item: EquipmentInstance
  userCardId: string
  gold: number
  busy: boolean
  highlight: SubstatKey | null
  onEquip: () => void
  onUnequip: () => void
  onUpgrade: () => void
}) {
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const locale = currentLocale()
  const isEquippedHere = item.equippedOnId === userCardId
  const isEquippedElsewhere = item.equippedOnId !== null && !isEquippedHere
  // Coût d'amélioration : renvoyé PAR LE SERVEUR, remise du bonus d'équipe
  // forge déjà appliquée (`nextUpgradeCost`, null au niveau maximum).
  // Jamais recalculé ici — `useEconomyConfig` ne porte aucune donnée de
  // bonus d'équipe, un recalcul afficherait le prix plein pendant que le
  // serveur facture le prix remisé.
  const isMaxLevel = item.nextUpgradeCost === null
  const cost = item.nextUpgradeCost ?? 0
  const nextIsMilestone =
    !isMaxLevel && (item.level + 1) % economy.equip.substatMilestone === 0
  const maxSubstats = economy.equip.maxSubstats
  const upgradeTitle = upgradeHintTitle(
    nextIsMilestone,
    maxSubstats,
    item.substats.length,
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
        {/* Même règle que les sous-stats ci-dessous : la couleur porte la
            stat, pas le rôle de la ligne. */}
        <ul className="text-xs">
          {Object.entries(item.bonuses).map(([k, v], idx) => (
            <li
              key={k}
              className="flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono"
              style={
                {
                  '--sc': statColorVar(k),
                  color: 'color-mix(in oklab, var(--sc) 75%, var(--text))',
                } as React.CSSProperties
              }
            >
              <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-[var(--sc)]" />
              +
              {formatBonusValue(
                scaledBaseBonus(
                  v,
                  item.level,
                  economy.equip.levelScale,
                  idx === 0 ? item.baseBoost : 0,
                ),
              )}{' '}
              {formatBonusKey(k)}
            </li>
          ))}
        </ul>
      </div>

      <SetLine item={item} userCardId={userCardId} />

      <SubstatSection
        substats={item.substats}
        maxSubstats={maxSubstats}
        highlight={highlight}
      />

      <div className="mt-auto flex flex-col gap-2">
        {isEquippedHere ? (
          <Button variant="outline" disabled={busy} onClick={onUnequip}>
            Déséquiper
          </Button>
        ) : (
          <>
            <Button disabled={busy} onClick={onEquip}>
              {isEquippedElsewhere ? 'Remplacer' : 'Équiper'}
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
          title={upgradeTitle}
        >
          <ArrowUpCircle className="mr-1.5 h-4 w-4" />
          {isMaxLevel
            ? 'Niveau max'
            : `Améliorer (${formatNumber(cost, locale)} or)`}
          {nextIsMilestone && <Sparkles className="ml-1.5 h-3.5 w-3.5" />}
        </Button>
        <SellItemButton item={item} busy={busy} />
      </div>
    </div>
  )
}
