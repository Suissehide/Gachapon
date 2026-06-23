import { createFileRoute } from '@tanstack/react-router'
import { Plus, Save, Swords, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

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
import { useCombatTeam, useSetCombatTeam } from '../../queries/useCombatTeam.ts'
import { type UserCard, useUserCollection } from '../../queries/useCollection.ts'
import { useAuthStore } from '../../stores/auth.store.ts'

export const Route = createFileRoute('/_authenticated/combat')({
  component: CombatPage,
})

const MAX_TEAM_SIZE = 3

function CombatPage() {
  const userId = useAuthStore((s) => s.user?.id)
  const teamQuery = useCombatTeam()
  const setTeam = useSetCombatTeam()
  const collection = useUserCollection(userId)

  // The team being edited (local state). Initialise from server.
  const initialIds = useMemo(
    () => teamQuery.data?.team.map((u) => u.userCardId) ?? [],
    [teamQuery.data],
  )
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pickerSlot, setPickerSlot] = useState<number | null>(null)

  useEffect(() => {
    setSelectedIds(initialIds)
  }, [initialIds])

  // Owned cards indexed by their UserCard id.
  const cardsById = useMemo(() => {
    const m = new Map<string, UserCard>()
    for (const uc of collection.data?.cards ?? []) {
      m.set(uc.id, uc)
    }
    return m
  }, [collection.data])

  const isDirty =
    initialIds.length !== selectedIds.length ||
    initialIds.some((id, i) => id !== selectedIds[i])

  const canSave =
    selectedIds.length >= 1 &&
    selectedIds.length <= MAX_TEAM_SIZE &&
    isDirty

  const handlePick = (userCardId: string) => {
    if (pickerSlot === null) return
    // Don't allow duplicates
    if (selectedIds.includes(userCardId)) {
      setPickerSlot(null)
      return
    }
    const next = [...selectedIds]
    next[pickerSlot] = userCardId
    // Compact: remove undefined holes
    setSelectedIds(next.filter(Boolean))
    setPickerSlot(null)
  }

  const handleRemove = (slotIndex: number) => {
    setSelectedIds((cur) => cur.filter((_, i) => i !== slotIndex))
  }

  const handleSave = () => {
    setTeam.mutate(selectedIds)
  }

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          { label: 'Combat' },
        ]}
        title="Mon équipe de combat"
        subtitle="Déploie jusqu'à 3 cartes au combat"
      />

      {/* Slots row */}
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: MAX_TEAM_SIZE }, (_, i) => {
          const id = selectedIds[i] ?? null
          const uc = id ? cardsById.get(id) ?? null : null
          return (
            <SlotCard
              key={i}
              index={i}
              userCard={uc}
              onAdd={() => setPickerSlot(i)}
              onRemove={() => handleRemove(i)}
            />
          )
        })}
      </div>

      {/* Team summary */}
      {selectedIds.length > 0 && (
        <TeamSummary
          team={teamQuery.data?.team ?? []}
          editedIds={selectedIds}
        />
      )}

      {/* Save */}
      <div className="mt-2 flex justify-end">
        <Button
          variant="gradient"
          onClick={handleSave}
          disabled={!canSave || setTeam.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {setTeam.isPending ? 'Enregistrement…' : "Enregistrer l'équipe"}
        </Button>
      </div>

      {/* Picker dialog */}
      {pickerSlot !== null && (
        <Popup
          open
          onOpenChange={(v) => {
            if (!v) setPickerSlot(null)
          }}
        >
          <PopupContent size="xl">
            <PopupHeader>
              <PopupTitle
                icon={<Swords className="h-4 w-4" />}
                subtitle={`Slot ${pickerSlot + 1} · clique sur une carte`}
              >
                Choisir une carte
              </PopupTitle>
            </PopupHeader>
            <PopupBody className="max-h-[60vh] overflow-auto">
              {(collection.data?.cards ?? []).length === 0 ? (
                <p className="py-8 text-center text-sm text-text-light">
                  Tu n'as encore aucune carte dans ta collection.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {(collection.data?.cards ?? []).map((uc) => {
                    const isAlreadySelected = selectedIds.includes(uc.id)
                    return (
                      <button
                        key={uc.id}
                        type="button"
                        onClick={() => handlePick(uc.id)}
                        disabled={isAlreadySelected}
                        className={`relative rounded-xl p-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                          isAlreadySelected
                            ? 'cursor-not-allowed opacity-40'
                            : 'hover:bg-primary/5'
                        }`}
                      >
                        <CardDisplay
                          rarity={uc.card.rarity}
                          name={uc.card.name}
                          setName={uc.card.set.name}
                          imageUrl={uc.card.imageUrl}
                          variant={uc.variant}
                          isOwned
                          interactive={false}
                          compact
                        />
                        <div className="mt-1 text-center text-[11px] text-text-light">
                          Niv. {uc.level} · Palier {uc.palier}
                          {uc.variant !== 'NORMAL' ? ` · ${uc.variant}` : ''}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </PopupBody>
          </PopupContent>
        </Popup>
      )}
    </PageShell>
  )
}

function SlotCard({
  index,
  userCard,
  onAdd,
  onRemove,
}: {
  index: number
  userCard: UserCard | null
  onAdd: () => void
  onRemove: () => void
}) {
  if (!userCard) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="flex aspect-[2/3] w-full items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-primary/40 hover:bg-primary/5"
      >
        <div className="flex flex-col items-center gap-2 text-text-light">
          <Plus className="h-8 w-8" />
          <span className="text-sm font-medium">Slot {index + 1}</span>
          <span className="text-xs">Ajouter une carte</span>
        </div>
      </button>
    )
  }

  return (
    <div className="relative">
      <CardDisplay
        rarity={userCard.card.rarity}
        name={userCard.card.name}
        setName={userCard.card.set.name}
        imageUrl={userCard.card.imageUrl}
        variant={userCard.variant}
        isOwned
        interactive={false}
        compact
      />
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white/80 transition-colors hover:bg-black/80 hover:text-white"
        aria-label="Retirer du slot"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="mt-2 text-center text-xs text-text-light">
        Niv. {userCard.level} · Palier {userCard.palier}
      </div>
    </div>
  )
}

function TeamSummary({
  team,
  editedIds,
}: {
  team: {
    userCardId: string
    stats: { hp: number; atk: number; def: number; spd: number }
  }[]
  editedIds: string[]
}) {
  // Show only the cards currently in the edited list. Stats come from the
  // server-computed team so we don't have to redo formula work in the front.
  const inEdit = team.filter((u) => editedIds.includes(u.userCardId))
  if (inEdit.length === 0) return null

  const totals = inEdit.reduce(
    (acc, u) => ({
      hp: acc.hp + u.stats.hp,
      atk: acc.atk + u.stats.atk,
      def: acc.def + u.stats.def,
      spd: acc.spd + u.stats.spd,
    }),
    { hp: 0, atk: 0, def: 0, spd: 0 },
  )
  const avgSpd = Math.round(totals.spd / inEdit.length)

  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <p className="mb-2 text-xs uppercase tracking-widest text-text-light/60">
        Puissance d'équipe (cartes enregistrées)
      </p>
      <div className="grid grid-cols-4 gap-3 text-center">
        <Stat label="PV totaux" value={totals.hp.toLocaleString('fr-FR')} />
        <Stat label="ATQ totale" value={totals.atk.toLocaleString('fr-FR')} />
        <Stat label="DEF totale" value={totals.def.toLocaleString('fr-FR')} />
        <Stat label="VIT moyenne" value={avgSpd.toLocaleString('fr-FR')} />
      </div>
      <p className="mt-2 text-[11px] text-text-light/50">
        Les stats se rafraîchiront après enregistrement.
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-text-light/60">{label}</p>
      <p className="font-display text-base font-bold tabular-nums text-text">
        {value}
      </p>
    </div>
  )
}
