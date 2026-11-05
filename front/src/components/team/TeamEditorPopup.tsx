import { useVirtualizer } from '@tanstack/react-virtual'
import { Check, RotateCcw, Save, Sparkles, Swords, X } from 'lucide-react'
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { useTranslation } from 'react-i18next'

import {
  type CardElement,
  ELEMENT_BEATS,
} from '../../constants/card.constant.ts'
import { CAMPAIGN_TEAM_KEY } from '../../constants/combatTeam.constant.ts'
import { currentLocale } from '../../i18n/index.ts'
import { cn, formatNumber } from '../../libs/utils.ts'
import {
  type UserCard,
  useUserCollection,
} from '../../queries/useCollection.ts'
import {
  useClearCombatTeam,
  useCombatTeam,
  useSetCombatTeam,
} from '../../queries/useCombatTeam.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import {
  useEquipmentList,
  useEquipmentSets,
} from '../../queries/useEquipment.ts'
import { useAuthStore } from '../../stores/auth.store.ts'
import {
  aggregateEquipmentBonuses,
  cardPower,
  emptyStatBonuses,
  type StatBonuses,
} from '../../utils/cardStats.ts'
import { TcgCardFace } from '../shared/tcg-card/TcgCardFace.tsx'
import { Button, buttonVariants } from '../ui/button.tsx'
import { EmptyState } from '../ui/emptyState.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'

const MAX_TEAM_SIZE = 3
const SLOT_KEYS = Array.from({ length: MAX_TEAM_SIZE }, (_, i) => `slot-${i}`)

function fmt(n: number): string {
  return formatNumber(n, currentLocale())
}

// Multiplicateur de dégâts de `attacker` sur `target` — même roue que le
// simulateur (`elementMultiplier` côté back).
function elementMult(
  attacker: string | null,
  target: string | null,
  adv: number,
  dis: number,
): number {
  if (!(attacker && target && attacker in ELEMENT_BEATS)) {
    return 1
  }
  if (ELEMENT_BEATS[attacker as CardElement] === target) {
    return adv
  }
  if (ELEMENT_BEATS[target as CardElement] === attacker) {
    return dis
  }
  return 1
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Clé du mode édité — voir constants/combatTeam.constant.ts */
  teamKey: string
  /** Nom du mode montré au joueur : « Campagne », « Tour de Braise »… */
  modeLabel: string
  /** Adversaires du combat en vue, quand on les connaît : l'auto-équipe
   *  favorise alors les cartes qui les contrent. */
  enemies?: { element: string | null }[]
}

export function TeamEditorPopup({
  open,
  onOpenChange,
  teamKey,
  modeLabel,
  enemies,
}: Props) {
  const { t } = useTranslation('team')
  const userId = useAuthStore((s) => s.user?.id)
  const teamQuery = useCombatTeam(teamKey)
  const setTeam = useSetCombatTeam(teamKey)
  const clearTeam = useClearCombatTeam(teamKey)
  const inherited = teamQuery.data?.inherited ?? false
  const isCampaign = teamKey === CAMPAIGN_TEAM_KEY
  const collection = useUserCollection(userId)
  const { data: equipData } = useEquipmentList()
  const { data: setsData } = useEquipmentSets()
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()

  const initialIds = useMemo(
    () => teamQuery.data?.team.map((u) => u.userCardId) ?? [],
    [teamQuery.data],
  )
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Sync local edit state with server whenever the popup opens (or the server
  // team changes while it's open).
  useEffect(() => {
    if (open) {
      setSelectedIds(initialIds)
    }
  }, [open, initialIds])

  const cardsById = useMemo(() => {
    const m = new Map<string, UserCard>()
    for (const uc of collection.data?.cards ?? []) {
      m.set(uc.id, uc)
    }
    return m
  }, [collection.data])

  // Puissance d'une carte, équipement inclus — même valeur que la collection et
  // le panneau de détail. Sert au tri du roster, à l'auto-équipe et au total.
  const equipBonusByCardId = useMemo(() => {
    const items = equipData?.items ?? []
    const map = new Map<string, StatBonuses>()
    for (const uc of collection.data?.cards ?? []) {
      map.set(
        uc.id,
        aggregateEquipmentBonuses(
          items,
          uc.id,
          economy.equip.levelScale,
          setsData?.sets ?? [],
        ),
      )
    }
    return map
  }, [equipData?.items, setsData, collection.data, economy.equip.levelScale])

  const powerById = useMemo(() => {
    const map = new Map<string, number>()
    for (const uc of collection.data?.cards ?? []) {
      map.set(
        uc.id,
        cardPower(
          uc.card,
          uc.level,
          uc.finishes,
          uc.palier,
          equipBonusByCardId.get(uc.id) ?? emptyStatBonuses(),
          economy.card,
        ),
      )
    }
    return map
  }, [collection.data, equipBonusByCardId, economy.card])
  const powerOf = (uc: UserCard) => powerById.get(uc.id) ?? 0

  const roster = collection.data?.cards ?? []
  // Plus fortes d'abord (départage par niveau).
  const sortedRoster = useMemo(
    () =>
      [...roster].sort(
        (a, b) =>
          (powerById.get(b.id) ?? 0) - (powerById.get(a.id) ?? 0) ||
          b.level - a.level,
      ),
    [roster, powerById],
  )

  const isDirty =
    initialIds.length !== selectedIds.length ||
    initialIds.some((id, i) => id !== selectedIds[i])
  // Un mode hérité doit pouvoir se figer AVEC LES MÊMES CARTES : valider sans
  // rien changer, c'est justement l'action qui lui crée sa propre ligne et
  // l'affranchit des futures modifications de la campagne. `isDirty` seul
  // bloquerait ce cas.
  const canSave =
    selectedIds.length >= 1 &&
    selectedIds.length <= MAX_TEAM_SIZE &&
    (isDirty || inherited)

  // Stable : les tuiles sont mémoïsées, un clic ne re-rend que celle qui change.
  const toggle = useCallback((userCardId: string) => {
    setSelectedIds((cur) => {
      if (cur.includes(userCardId)) {
        return cur.filter((id) => id !== userCardId)
      }
      if (cur.length >= MAX_TEAM_SIZE) {
        return cur
      }
      return [...cur, userCardId]
    })
  }, [])
  const removeAt = (slotIndex: number) => {
    setSelectedIds((cur) => cur.filter((_, i) => i !== slotIndex))
  }
  // Puissance pondérée par la roue élémentaire face aux adversaires connus :
  // dégâts infligés en moyenne / dégâts subis en moyenne. Sans adversaires,
  // c'est la puissance brute.
  const autoTeam = () => {
    const { elementAdvantageMult: adv, elementDisadvantageMult: dis } =
      economy.combat
    const score = (uc: UserCard) => {
      if (!enemies?.length) {
        return powerOf(uc)
      }
      let dealt = 0
      let taken = 0
      for (const e of enemies) {
        dealt += elementMult(uc.card.element, e.element, adv, dis)
        taken += elementMult(e.element, uc.card.element, adv, dis)
      }
      return (powerOf(uc) * dealt) / taken
    }
    const auto = sortedRoster
      .map((uc) => ({ id: uc.id, s: score(uc) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, MAX_TEAM_SIZE)
      .map((c) => c.id)
    setSelectedIds(auto)
  }
  const handleSave = () => {
    setTeam.mutate(selectedIds, {
      onSuccess: () => onOpenChange(false),
    })
  }

  const teamCards = selectedIds
    .map((id) => cardsById.get(id))
    .filter((c): c is UserCard => c != null)

  const totalPower = teamCards.reduce((acc, uc) => acc + powerOf(uc), 0)

  return (
    <Popup open={open} onOpenChange={onOpenChange}>
      <PopupContent size="xl" className="bg-[#fbf8f3]">
        <PopupHeader>
          <PopupTitle
            icon={<Sparkles className="h-4 w-4" />}
            // « pour {modeLabel} » ne s'accorde pas sur les six modes (« pour
            // Campagne », « pour Raid d'équipe » manquent leur article, et
            // rien ne permet de deviner le bon genre à la volée). Le séparateur
            // « · », déjà utilisé par le titre juste au-dessus, contourne le
            // problème sans avoir à articuler chaque libellé à la source.
            subtitle={t('combatTeamPopup.subtitle', {
              max: MAX_TEAM_SIZE,
              mode: modeLabel,
            })}
          >
            {t('combatTeamPopup.title', { mode: modeLabel })}
            <span className="ml-2 font-mono text-sm font-bold text-text-light/50">
              {selectedIds.length}/{MAX_TEAM_SIZE}
            </span>
          </PopupTitle>
        </PopupHeader>

        <PopupBody className="flex flex-col gap-5">
          {/* Slots — kept smaller by constraining the row width so the 3 slots
              don't take the full popup width. */}
          <div className="mx-auto grid w-full max-w-[420px] grid-cols-3 gap-3">
            {SLOT_KEYS.map((key, i) => {
              const id = selectedIds[i] ?? null
              const uc = id ? (cardsById.get(id) ?? null) : null
              return (
                <Slot
                  key={key}
                  index={i}
                  card={uc}
                  power={uc ? powerOf(uc) : undefined}
                  onRemove={() => removeAt(i)}
                />
              )
            })}
          </div>

          {/* Power + auto */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-text-light/60">
              {t('combatTeamPopup.totalPower')}
            </span>
            <span className="inline-flex items-center gap-1 font-display text-xl font-extrabold tabular-nums text-text">
              <Swords className="h-4 w-4 text-amber-500" />
              {fmt(totalPower)}
            </span>
            <Button
              type="button"
              variant="gradient"
              size="sm"
              onClick={autoTeam}
              disabled={sortedRoster.length === 0}
              className="ml-auto gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t('combatTeamPopup.autoTeam')}
            </Button>
          </div>

          {/* Roster */}
          <div>
            <p className="mb-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-text-light/60">
              {t('combatTeamPopup.collectionCount', { count: roster.length })}
            </p>
            {roster.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title={t('combatTeamPopup.emptyCollectionTitle')}
              >
                {t('combatTeamPopup.emptyCollectionBody')}
              </EmptyState>
            ) : (
              <RosterGrid
                roster={sortedRoster}
                powerById={powerById}
                selectedIds={selectedIds}
                onToggle={toggle}
              />
            )}
          </div>
        </PopupBody>

        <PopupFooter>
          {!inherited && !isCampaign && (
            <Button
              variant="ghost"
              onClick={() =>
                clearTeam.mutate(undefined, {
                  onSuccess: () => onOpenChange(false),
                })
              }
              disabled={clearTeam.isPending}
              className="mr-auto gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {t('combatTeamPopup.revertToCampaign')}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={setTeam.isPending || clearTeam.isPending}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || setTeam.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {setTeam.isPending
              ? t('combatTeamPopup.saving')
              : t('combatTeamPopup.validate')}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}

// Renders a compact TcgCardFace + level badge overlay in an aspect-2/3 tile.
// `size` controls the tile width; TcgCardFace stretches to fill.
function MiniCardFace({
  card,
  power,
  extra,
}: {
  card: UserCard
  power?: number
  extra?: React.ReactNode
}) {
  return (
    <div className="relative aspect-[2/3] w-full">
      {/* Niveau ET élément confiés à la carte, qui les empile en colonne — le
          niveau puis l'élément dessous. Le badge de niveau était dessiné ici,
          au même endroit que la colonne de la carte. */}
      <TcgCardFace
        rarity={card.card.rarity}
        name={card.card.name}
        setName={card.card.set.name}
        imageUrl={card.card.imageUrl}
        variant={card.displayedFinish}
        isOwned
        compact
        level={card.level}
        element={card.card.element}
        archetype={card.card.archetype}
      />
      {power !== undefined && (
        <span className="pointer-events-none absolute left-1/2 top-1.5 z-20 inline-flex -translate-x-1/2 items-center gap-1 rounded-sm border-[0.5px] border-white bg-[#1b1726]/92 px-1.5 py-[3px] font-display text-[10px] font-extrabold leading-none tabular-nums text-white shadow-[0_2px_6px_rgba(27,23,38,0.45)]">
          <Swords className="h-2.5 w-2.5 text-primary" />
          {fmt(power)}
        </span>
      )}
      {extra}
    </div>
  )
}

function Slot({
  index,
  card,
  power,
  onRemove,
}: {
  index: number
  card: UserCard | null
  power?: number
  onRemove: () => void
}) {
  const { t } = useTranslation('team')
  if (!card) {
    return (
      <div className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[rgba(27,23,38,0.18)] bg-white text-text-light/40">
        <Sparkles className="h-4 w-4" />
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em]">
          {t('combatTeamPopup.slotLabel', { n: index + 1 })}
        </span>
      </div>
    )
  }

  return (
    <MiniCardFace
      card={card}
      power={power}
      extra={
        <Button
          type="button"
          variant="destructive"
          size="icon-sm"
          onClick={onRemove}
          aria-label={t('combatTeamPopup.removeCardAriaLabel')}
          className="absolute right-1.5 top-1.5 z-30 rounded-full shadow-md hover:scale-105"
        >
          <X className="h-3 w-3" />
        </Button>
      }
    />
  )
}

const RosterTile = memo(function RosterTile({
  card,
  power,
  active,
  disabled,
  onToggle,
}: {
  card: UserCard
  power?: number
  active: boolean
  disabled: boolean
  onToggle: (userCardId: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(card.id)}
      disabled={disabled}
      aria-pressed={active}
      // rounded-[8px] matches TcgCardFace compact's outer radius so the amber
      // ring wraps the card cleanly; ring-offset gives the "extend out" look.
      className={cn(
        'group relative rounded-[8px] transition-transform focus:outline-none',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'cursor-pointer hover:-translate-y-0.5',
        active && 'ring-[3px] ring-primary ring-offset-2 ring-offset-[#fbf8f3]',
      )}
    >
      <MiniCardFace
        card={card}
        power={power}
        extra={
          active ? (
            <span
              aria-hidden
              className={cn(
                buttonVariants({ variant: 'default', size: 'icon-sm' }),
                'pointer-events-none absolute right-1.5 top-1.5 z-30 rounded-full shadow-md',
              )}
            >
              <Check className="h-3 w-3" />
            </span>
          ) : undefined
        }
      />
    </button>
  )
})

// Colonnes de la grille : 4, 5 dès `sm`, 6 dès `md` (points de rupture Tailwind).
const COLUMN_QUERIES = [
  ['(min-width: 48rem)', 6],
  ['(min-width: 40rem)', 5],
] as const

function subscribeColumns(onChange: () => void) {
  const lists = COLUMN_QUERIES.map(([q]) => window.matchMedia(q))
  for (const l of lists) {
    l.addEventListener('change', onChange)
  }
  return () => {
    for (const l of lists) {
      l.removeEventListener('change', onChange)
    }
  }
}

function readColumns(): number {
  return COLUMN_QUERIES.find(([q]) => window.matchMedia(q).matches)?.[1] ?? 4
}

/**
 * Grille virtualisée : une collection compte des centaines de cartes, chacune
 * lourde (holo, auras) ; seules les rangées visibles sont montées.
 */
function RosterGrid({
  roster,
  powerById,
  selectedIds,
  onToggle,
}: {
  roster: UserCard[]
  powerById: Map<string, number>
  selectedIds: string[]
  onToggle: (userCardId: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const columns = useSyncExternalStore(subscribeColumns, readColumns)
  const rowCount = Math.ceil(roster.length / columns)
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 180,
    overscan: 2,
  })
  const full = selectedIds.length >= MAX_TEAM_SIZE

  return (
    // p-2 gives room for the active tile's ring-offset (3px ring +
    // 2px offset) so it isn't clipped by the overflow-hidden that
    // overflow-y-auto implicitly forces on the horizontal axis.
    <div ref={scrollRef} className="max-h-[40vh] overflow-y-auto p-2">
      <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((row) => (
          <div
            key={row.key}
            ref={virtualizer.measureElement}
            data-index={row.index}
            className="absolute inset-x-0 top-0 grid gap-4 pb-4"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              transform: `translateY(${row.start}px)`,
            }}
          >
            {roster
              .slice(row.index * columns, (row.index + 1) * columns)
              .map((uc) => {
                const active = selectedIds.includes(uc.id)
                return (
                  <RosterTile
                    key={uc.id}
                    card={uc}
                    power={powerById.get(uc.id)}
                    active={active}
                    disabled={!active && full}
                    onToggle={onToggle}
                  />
                )
              })}
          </div>
        ))}
      </div>
    </div>
  )
}
