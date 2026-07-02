import { Check, Save, Sparkles, X, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { cn } from '../../libs/utils.ts'
import { getRarityTone } from '../shared/tcg-card/config.ts'
import { TcgCardFace } from '../shared/tcg-card/TcgCardFace.tsx'
import { useCombatTeam, useSetCombatTeam } from '../../queries/useCombatTeam.ts'
import { type UserCard, useUserCollection } from '../../queries/useCollection.ts'
import { useAuthStore } from '../../stores/auth.store.ts'
import { Button, buttonVariants } from '../ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'

const MAX_TEAM_SIZE = 3

function computePower(stats: {
  hp: number
  atk: number
  def: number
  spd: number
}): number {
  return Math.round(stats.hp / 4 + stats.atk * 1.5 + stats.def + stats.spd)
}
function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TeamEditorPopup({ open, onOpenChange }: Props) {
  const userId = useAuthStore((s) => s.user?.id)
  const teamQuery = useCombatTeam()
  const setTeam = useSetCombatTeam()
  const collection = useUserCollection(userId)

  const initialIds = useMemo(
    () => teamQuery.data?.team.map((u) => u.userCardId) ?? [],
    [teamQuery.data],
  )
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Sync local edit state with server whenever the popup opens (or the server
  // team changes while it's open).
  useEffect(() => {
    if (open) setSelectedIds(initialIds)
  }, [open, initialIds])

  const cardsById = useMemo(() => {
    const m = new Map<string, UserCard>()
    for (const uc of collection.data?.cards ?? []) {
      m.set(uc.id, uc)
    }
    return m
  }, [collection.data])

  const roster = collection.data?.cards ?? []
  const sortedRoster = useMemo(
    () =>
      [...roster].sort((a, b) => {
        const rarityOrder = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON']
        const rA = rarityOrder.indexOf(a.card.rarity)
        const rB = rarityOrder.indexOf(b.card.rarity)
        if (rA !== rB) return rA - rB
        return b.level - a.level
      }),
    [roster],
  )

  const isDirty =
    initialIds.length !== selectedIds.length ||
    initialIds.some((id, i) => id !== selectedIds[i])
  const canSave =
    selectedIds.length >= 1 &&
    selectedIds.length <= MAX_TEAM_SIZE &&
    isDirty

  const toggle = (userCardId: string) => {
    setSelectedIds((cur) => {
      if (cur.includes(userCardId)) {
        return cur.filter((id) => id !== userCardId)
      }
      if (cur.length >= MAX_TEAM_SIZE) return cur
      return [...cur, userCardId]
    })
  }
  const removeAt = (slotIndex: number) => {
    setSelectedIds((cur) => cur.filter((_, i) => i !== slotIndex))
  }
  const autoTeam = () => {
    const auto = sortedRoster.slice(0, MAX_TEAM_SIZE).map((c) => c.id)
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

  const totalPower = teamCards.reduce(
    (acc, uc) =>
      acc +
      computePower({
        hp: uc.card.baseHp,
        atk: uc.card.baseAtk,
        def: uc.card.baseDef,
        spd: uc.card.baseSpd,
      }),
    0,
  )

  return (
    <Popup open={open} onOpenChange={onOpenChange}>
      <PopupContent size="xl" className="bg-[#fbf8f3]">
        <PopupHeader>
          <PopupTitle
            icon={<Sparkles className="h-4 w-4" />}
            subtitle={`Choisis jusqu'à ${MAX_TEAM_SIZE} cartes pour ton équipe`}
          >
            Mon équipe
            <span className="ml-2 font-mono text-sm font-bold text-text-light/50">
              {selectedIds.length}/{MAX_TEAM_SIZE}
            </span>
          </PopupTitle>
        </PopupHeader>

        <PopupBody className="flex flex-col gap-5">
          {/* Slots — kept smaller by constraining the row width so the 3 slots
              don't take the full popup width. */}
          <div className="mx-auto grid w-full max-w-[420px] grid-cols-3 gap-3">
            {Array.from({ length: MAX_TEAM_SIZE }).map((_, i) => {
              const id = selectedIds[i] ?? null
              const uc = id ? cardsById.get(id) ?? null : null
              return (
                <Slot
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed slot index
                  key={i}
                  index={i}
                  card={uc}
                  onRemove={() => removeAt(i)}
                />
              )
            })}
          </div>

          {/* Power + auto */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-text-light/60">
              Puissance totale
            </span>
            <span className="inline-flex items-center gap-1 font-display text-xl font-extrabold tabular-nums text-text">
              <Zap className="h-4 w-4 text-amber-500" />
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
              Auto-équipe
            </Button>
          </div>

          {/* Roster */}
          <div>
            <p className="mb-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-text-light/60">
              Ma collection · {roster.length}{' '}
              {roster.length > 1 ? 'cartes' : 'carte'}
            </p>
            {roster.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-8 text-center">
                <p className="font-display text-sm font-bold text-text">
                  Ta collection est vide.
                </p>
                <p className="mt-1 text-xs text-text-light">
                  Fais quelques tirages pour obtenir tes premières cartes.
                </p>
              </div>
            ) : (
              // p-2 gives room for the active tile's ring-offset (3px ring +
              // 2px offset) so it isn't clipped by the overflow-hidden that
              // overflow-y-auto implicitly forces on the horizontal axis.
              <div className="max-h-[40vh] overflow-y-auto p-2">
                <div className="grid grid-cols-4 gap-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7">
                  {sortedRoster.map((uc) => (
                    <RosterTile
                      key={uc.id}
                      card={uc}
                      active={selectedIds.includes(uc.id)}
                      disabled={
                        !selectedIds.includes(uc.id) &&
                        selectedIds.length >= MAX_TEAM_SIZE
                      }
                      onClick={() => toggle(uc.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopupBody>

        <PopupFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={setTeam.isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || setTeam.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {setTeam.isPending ? 'Enregistrement…' : "Valider l'équipe"}
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
  extra,
}: {
  card: UserCard
  extra?: React.ReactNode
}) {
  const tone = getRarityTone(card.card.rarity)
  return (
    <div className="relative aspect-[2/3] w-full">
      <TcgCardFace
        rarity={card.card.rarity}
        name={card.card.name}
        setName={card.card.set.name}
        imageUrl={card.card.imageUrl}
        variant={card.variant}
        isOwned
        compact
      />
      <div className="pointer-events-none absolute left-1.5 top-1.5 z-20">
        <div
          className="flex h-5 min-w-[20px] items-center justify-center rounded-[5px] border-[0.5px] border-white px-1 font-display text-[10px] font-extrabold leading-none text-white shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
          style={{ background: tone.hex }}
        >
          {card.level}
        </div>
      </div>
      {extra}
    </div>
  )
}

function Slot({
  index,
  card,
  onRemove,
}: {
  index: number
  card: UserCard | null
  onRemove: () => void
}) {
  if (!card) {
    return (
      <div className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[rgba(27,23,38,0.18)] bg-white text-text-light/40">
        <Sparkles className="h-4 w-4" />
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em]">
          Slot {index + 1}
        </span>
      </div>
    )
  }

  return (
    <MiniCardFace
      card={card}
      extra={
        <Button
          type="button"
          variant="destructive"
          size="icon-sm"
          onClick={onRemove}
          aria-label="Retirer la carte"
          className="absolute right-1.5 top-1.5 z-30 rounded-full shadow-md hover:scale-105"
        >
          <X className="h-3 w-3" />
        </Button>
      }
    />
  )
}

function RosterTile({
  card,
  active,
  disabled,
  onClick,
}: {
  card: UserCard
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      // rounded-[8px] matches TcgCardFace compact's outer radius so the amber
      // ring wraps the card cleanly; ring-offset gives the "extend out" look.
      className={cn(
        'group relative rounded-[8px] transition-transform focus:outline-none',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'hover:-translate-y-0.5',
        active &&
          'ring-[3px] ring-primary ring-offset-2 ring-offset-[#fbf8f3]',
      )}
    >
      <MiniCardFace
        card={card}
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
}
