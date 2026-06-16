import { useState } from 'react'

import { useSetFeaturedCardsMutation } from '../../../queries/useProfile'
import { useUserCollection } from '../../../queries/useCollection'
import { useAuthStore } from '../../../stores/auth.store'
import { CardDisplay } from '../../shared/tcg-card/CardDisplay'
import { Button } from '../../ui/button'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../../ui/popup'

type Props = {
  open: boolean
  initialIds: string[]
  onClose: () => void
  onSaved?: () => void
}

const RARITY_ORDER = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'] as const

type OwnedDisplay = {
  id: string
  name: string
  rarity: string
  setName: string
  imageUrl: string | null
  variant: string
}

export function FeaturedCardsEditorModal({ open, initialIds, onClose, onSaved }: Props) {
  const userId = useAuthStore((s) => s.user?.id)
  const { data: collection } = useUserCollection(userId)
  const mutation = useSetFeaturedCardsMutation()
  const [selected, setSelected] = useState<string[]>(initialIds.slice(0, 5))

  const ownedById = new Map<string, OwnedDisplay>()
  for (const uc of collection?.cards ?? []) {
    if (!ownedById.has(uc.card.id)) {
      ownedById.set(uc.card.id, {
        id: uc.card.id,
        name: uc.card.name,
        rarity: uc.card.rarity,
        setName: uc.card.set.name,
        imageUrl: uc.card.imageUrl,
        variant: uc.variant ?? 'NORMAL',
      })
    }
  }
  const owned = Array.from(ownedById.values()).sort(
    (a, b) =>
      RARITY_ORDER.indexOf(a.rarity as (typeof RARITY_ORDER)[number]) -
      RARITY_ORDER.indexOf(b.rarity as (typeof RARITY_ORDER)[number]),
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      }
      if (prev.length >= 5) {
        return prev
      }
      return [...prev, id]
    })
  }

  const save = async () => {
    await mutation.mutateAsync(selected)
    onSaved?.()
    onClose()
  }

  return (
    <Popup open={open} onOpenChange={(o) => !o && onClose()}>
      <PopupContent size="xl">
        <PopupHeader>
          <PopupTitle subtitle={`${selected.length} / 5 sélectionnées · clique pour ajouter / retirer`}>
            Cartes vedettes
          </PopupTitle>
        </PopupHeader>
        <PopupBody className="max-h-[60vh] overflow-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {owned.map((c) => {
              const isSelected = selected.includes(c.id)
              const order = selected.indexOf(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={`relative text-left rounded-xl focus:outline-none focus:ring-2 focus:ring-primary ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  style={{ opacity: !isSelected && selected.length >= 5 ? 0.4 : 1 }}
                  disabled={!isSelected && selected.length >= 5}
                >
                  <CardDisplay
                    rarity={c.rarity}
                    name={c.name}
                    setName={c.setName}
                    imageUrl={c.imageUrl}
                    variant={c.variant}
                    compact
                    interactive={false}
                  />
                  {isSelected && (
                    <span className="absolute top-1 right-1 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center font-mono">
                      {order + 1}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </PopupBody>
        <PopupFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="gradient" onClick={save} disabled={mutation.isPending}>
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
